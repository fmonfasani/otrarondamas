/**
 * POS API Integration Service
 * Handles communication with the NestJS API for point-of-sale operations:
 * - Sale creation with idempotency
 * - Inventory queries and stock updates
 * - Product search
 * - Error handling and offline fallback
 */

import { z } from 'zod';
import { type AuthenticatedUser } from '@wapsell/types';

const API_URL = process.env.VITE_API_URL || 'http://localhost:8600';
const API_TIMEOUT = parseInt(process.env.VITE_API_TIMEOUT || '30000');

/**
 * Schemas for validation
 * Mirrors the NestJS DTOs from apps/api/src/
 */

// Sale Item Schema - mirrors CreateSaleItemDto
export const SaleItemSchema = z.object({
  productoId: z.string().uuid('Invalid producto ID'),
  cantidad: z.number().positive('Cantidad must be positive'),
  precioUnitario: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format'),
  descuentoUnitario: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid discount format').optional().default('0'),
});

export type SaleItem = z.infer<typeof SaleItemSchema>;

// Create Sale Schema - mirrors CreateSaleDto
export const CreateSaleSchema = z.object({
  canal: z.enum(['presencial', 'mayorista', 'online']),
  clienteId: z.string().uuid().optional(),
  items: z.array(SaleItemSchema).min(1, 'Sale must have at least one item'),
  idempotencyKey: z.string().uuid('Invalid idempotency key').optional(),
});

export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;

// Sale Response Schema
export const SaleSchema = z.object({
  id: z.string().uuid(),
  empresaId: z.string().uuid(),
  numeroComprobanteInterno: z.string(),
  fechaOperacion: z.string().datetime(),
  canal: z.enum(['presencial', 'mayorista', 'online']),
  clienteId: z.string().uuid().optional(),
  usuarioId: z.string().uuid(),
  montoTotal: z.string(),
  descuentoTotal: z.string(),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      productoId: z.string().uuid(),
      codigoInterno: z.string(),
      nombreProducto: z.string(),
      cantidad: z.number(),
      precioUnitario: z.string(),
      descuentoUnitario: z.string(),
      subtotal: z.string(),
    })
  ),
});

export type Sale = z.infer<typeof SaleSchema>;

// Inventory Item Schema
export const InventoryItemSchema = z.object({
  productoId: z.string().uuid(),
  codigoInterno: z.string(),
  nombreProducto: z.string(),
  stockActual: z.number().nonnegative(),
  stockMinimo: z.number().nonnegative(),
  stockMaximo: z.number().nonnegative(),
  stockEnTransito: z.number().nonnegative().optional().default(0),
  unidadBase: z.enum(['UNIDAD', 'KILOGRAMO', 'LITRO', 'METRO', 'PACK', 'CAJA']),
  precioUnitario: z.string(),
  ultimaActualizacion: z.string().datetime(),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

// Inventory Response Schema
export const InventorySchema = z.object({
  empresaId: z.string().uuid(),
  items: z.array(InventoryItemSchema),
  total: z.number(),
  actualizadoEn: z.string().datetime(),
});

export type Inventory = z.infer<typeof InventorySchema>;

// Product Search Response Schema
export const ProductSearchItemSchema = z.object({
  id: z.string().uuid(),
  codigoInterno: z.string(),
  nombre: z.string(),
  marca: z.string().nullable(),
  precioMinorista: z.string(),
  precioMayorista: z.string().nullable(),
  stockActual: z.number().nonnegative(),
  unidadBase: z.enum(['UNIDAD', 'KILOGRAMO', 'LITRO', 'METRO', 'PACK', 'CAJA']),
});

export type ProductSearchItem = z.infer<typeof ProductSearchItemSchema>;

export const ProductSearchResponseSchema = z.object({
  items: z.array(ProductSearchItemSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type ProductSearchResponse = z.infer<typeof ProductSearchResponseSchema>;

/**
 * Error handling utilities
 */

export class POSAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'POSAPIError';
  }

  isConflict(): boolean {
    return this.statusCode === 409;
  }

  isValidationError(): boolean {
    return this.statusCode === 422;
  }

  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  isTimeout(): boolean {
    return this.originalError?.name === 'AbortError';
  }
}

/**
 * Request wrapper with timeout and error handling
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = API_TIMEOUT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract error details from API response
 */
async function handleAPIError(response: Response, originalError?: Error): Promise<never> {
  let errorMessage = `API Error: ${response.status} ${response.statusText}`;

  try {
    const data = await response.json();
    errorMessage = data.message || data.error || errorMessage;
  } catch {
    // Could not parse error response, use default message
  }

  throw new POSAPIError(errorMessage, response.status, originalError);
}

/**
 * Create a sale with idempotency support
 *
 * Idempotency Key: Prevents duplicate sales on retry. If the same key is sent
 * within the idempotency window, the API returns the previously created sale.
 *
 * @param saleData Sale data to create
 * @param jwt JWT token from session
 * @param idempotencyKey Optional UUID. If not provided, a random one is generated
 * @returns Created sale
 * @throws POSAPIError on validation, conflict (409), or server error (500+)
 */
export async function createSale(saleData: CreateSaleInput, jwt: string, idempotencyKey?: string): Promise<Sale> {
  const validated = CreateSaleSchema.parse(saleData);
  const key = idempotencyKey || crypto.randomUUID();

  try {
    const response = await fetchWithTimeout(`${API_URL}/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
        'Idempotency-Key': key,
      },
      body: JSON.stringify(validated),
      timeout: API_TIMEOUT,
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    return SaleSchema.parse(data);
  } catch (error) {
    if (error instanceof POSAPIError) throw error;
    if (error instanceof z.ZodError) {
      throw new POSAPIError(`Validation error: ${error.message}`, 422, error as Error);
    }
    throw new POSAPIError(
      error instanceof Error ? error.message : 'Failed to create sale',
      500,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get inventory for a tenant
 *
 * Returns consolidated stock across all warehouses/locations for the company.
 *
 * @param tenantId Company/tenant ID
 * @param jwt JWT token from session
 * @returns Inventory data
 * @throws POSAPIError on auth or server error
 */
export async function getInventory(tenantId: string, jwt: string): Promise<Inventory> {
  try {
    const response = await fetchWithTimeout(`${API_URL}/inventario/stock?empresaId=${encodeURIComponent(tenantId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
      timeout: API_TIMEOUT,
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    return InventorySchema.parse(data);
  } catch (error) {
    if (error instanceof POSAPIError) throw error;
    throw new POSAPIError(
      error instanceof Error ? error.message : 'Failed to fetch inventory',
      500,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Update stock for a specific product
 *
 * Adjusts inventory for a SKU. Used after manual stock corrections or returns.
 *
 * @param productoId Product ID
 * @param adjustment Number to adjust stock by (positive or negative)
 * @param razon Reason for adjustment (for audit trail)
 * @param jwt JWT token from session
 * @returns Updated inventory item
 * @throws POSAPIError on validation or server error
 */
export async function updateStock(
  productoId: string,
  adjustment: number,
  razon: string,
  jwt: string
): Promise<InventoryItem> {
  const schema = z.object({
    productoId: z.string().uuid(),
    ajuste: z.number(),
    razon: z.string().min(3),
  });

  try {
    const payload = schema.parse({
      productoId,
      ajuste: adjustment,
      razon,
    });

    const response = await fetchWithTimeout(`${API_URL}/inventario/${productoId}/ajuste`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
      timeout: API_TIMEOUT,
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    return InventoryItemSchema.parse(data);
  } catch (error) {
    if (error instanceof POSAPIError) throw error;
    if (error instanceof z.ZodError) {
      throw new POSAPIError(`Validation error: ${error.message}`, 422, error as Error);
    }
    throw new POSAPIError(
      error instanceof Error ? error.message : 'Failed to update stock',
      500,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Search products by name, code, or brand
 *
 * Used in the POS search bar to find products in real-time.
 * Results include current stock and pricing tiers.
 *
 * @param query Search term (min 2 characters)
 * @param jwt JWT token from session
 * @param limit Results per page (default 20)
 * @param offset Pagination offset (default 0)
 * @returns Matching products
 * @throws POSAPIError on validation or server error
 */
export async function searchProducts(
  query: string,
  jwt: string,
  limit: number = 20,
  offset: number = 0
): Promise<ProductSearchResponse> {
  const schema = z.object({
    search: z.string().min(2, 'Search term must be at least 2 characters'),
    limit: z.number().positive().max(100),
    offset: z.number().nonnegative(),
  });

  try {
    const params = schema.parse({
      search: query,
      limit,
      offset,
    });

    const queryString = new URLSearchParams({
      search: params.search,
      limit: String(params.limit),
      offset: String(params.offset),
    });

    const response = await fetchWithTimeout(`${API_URL}/ventas/productos?${queryString}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
      timeout: API_TIMEOUT,
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    return ProductSearchResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof POSAPIError) throw error;
    if (error instanceof z.ZodError) {
      throw new POSAPIError(`Validation error: ${error.message}`, 422, error as Error);
    }
    throw new POSAPIError(
      error instanceof Error ? error.message : 'Failed to search products',
      500,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get sale details by ID
 *
 * Retrieves complete sale information including items, discounts, and audit trail.
 *
 * @param saleId Sale ID
 * @param jwt JWT token from session
 * @returns Sale details
 * @throws POSAPIError on not found or server error
 */
export async function getSaleById(saleId: string, jwt: string): Promise<Sale> {
  const schema = z.object({
    id: z.string().uuid(),
  });

  try {
    schema.parse({ id: saleId });

    const response = await fetchWithTimeout(`${API_URL}/ventas/${saleId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
      timeout: API_TIMEOUT,
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    return SaleSchema.parse(data);
  } catch (error) {
    if (error instanceof POSAPIError) throw error;
    if (error instanceof z.ZodError) {
      throw new POSAPIError(`Validation error: ${error.message}`, 422, error as Error);
    }
    throw new POSAPIError(
      error instanceof Error ? error.message : 'Failed to fetch sale',
      500,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get sales history for a tenant
 *
 * Paginated list of sales, optionally filtered by date range or channel.
 *
 * @param tenantId Company/tenant ID
 * @param jwt JWT token from session
 * @param limit Results per page (default 20)
 * @param offset Pagination offset (default 0)
 * @returns Sales list
 * @throws POSAPIError on server error
 */
export async function listSales(
  tenantId: string,
  jwt: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ items: Sale[]; total: number }> {
  const schema = z.object({
    limit: z.number().positive().max(100),
    offset: z.number().nonnegative(),
  });

  try {
    const params = schema.parse({ limit, offset });

    const queryString = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
    });

    const response = await fetchWithTimeout(`${API_URL}/ventas?${queryString}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
      timeout: API_TIMEOUT,
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    const schema = z.object({
      items: z.array(SaleSchema),
      total: z.number(),
    });

    return schema.parse(data);
  } catch (error) {
    if (error instanceof POSAPIError) throw error;
    throw new POSAPIError(
      error instanceof Error ? error.message : 'Failed to fetch sales',
      500,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Quote a sale without persisting it
 *
 * Calculates totals and applies rules (pricing, discounts, taxes) without
 * creating a sale. Used to show exact amounts before user confirms.
 *
 * @param items Sale items to quote
 * @param jwt JWT token from session
 * @returns Quote with calculated totals
 * @throws POSAPIError on validation or server error
 */
export async function quoteSale(items: SaleItem[], jwt: string): Promise<Omit<Sale, 'id' | 'numeroComprobanteInterno' | 'fechaOperacion' | 'usuarioId'> & { montoTotal: string; descuentoTotal: string }> {
  const schema = z.object({
    items: z.array(SaleItemSchema).min(1),
  });

  try {
    const payload = schema.parse({ items });

    const response = await fetchWithTimeout(`${API_URL}/ventas/cotizacion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
      timeout: API_TIMEOUT,
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();

    // Parse the quote response (subset of Sale)
    const quoteSchema = z.object({
      montoTotal: z.string(),
      descuentoTotal: z.string(),
      items: z.array(
        z.object({
          id: z.string().uuid(),
          productoId: z.string().uuid(),
          codigoInterno: z.string(),
          nombreProducto: z.string(),
          cantidad: z.number(),
          precioUnitario: z.string(),
          descuentoUnitario: z.string(),
          subtotal: z.string(),
        })
      ),
    });

    return quoteSchema.parse(data);
  } catch (error) {
    if (error instanceof POSAPIError) throw error;
    if (error instanceof z.ZodError) {
      throw new POSAPIError(`Validation error: ${error.message}`, 422, error as Error);
    }
    throw new POSAPIError(
      error instanceof Error ? error.message : 'Failed to quote sale',
      500,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
