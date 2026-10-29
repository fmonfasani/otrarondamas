/**
 * POS Route Loaders
 * Server-side data loading for POS terminal, inventory, and sales routes.
 *
 * Each loader:
 * 1. Authenticates the user via JWT token
 * 2. Resolves tenant context
 * 3. Fetches data from the NestJS API
 * 4. Handles errors and returns fallback data if needed
 */

import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { getSessionFromRequest } from '~/services/auth.server';
import { getTenantContext } from '~/utils/tenant-context.server';
import { getInventory, listSales, searchProducts, POSAPIError } from '~/services/pos.server';

/**
 * POS Terminal Loader
 *
 * Loads initial data for the POS terminal:
 * - User authentication
 * - Tenant/company context
 * - Cached inventory (if available)
 *
 * Returns 401 if user is not authenticated
 * Returns 403 if user lacks 'ventas.crear' permission
 */
export async function posTerminalLoader({ request, params }: LoaderFunctionArgs) {
  const session = await getSessionFromRequest(request);
  const jwt = session.get('jwt');

  if (!jwt) {
    return json(
      { error: 'Unauthorized', message: 'Session expired' },
      { status: 401 }
    );
  }

  try {
    const tenantContext = await getTenantContext(request);

    if (!tenantContext?.empresaId) {
      return json(
        { error: 'Forbidden', message: 'No active business context' },
        { status: 403 }
      );
    }

    // Check permission
    if (!tenantContext.permisos?.includes('ventas.crear')) {
      return json(
        { error: 'Forbidden', message: 'You do not have permission to create sales' },
        { status: 403 }
      );
    }

    // Optionally pre-load inventory for performance
    let inventory = null;
    try {
      inventory = await getInventory(tenantContext.empresaId, jwt);
    } catch (error) {
      // Inventory load failure is not fatal; POS can work with on-demand product search
      console.error('Failed to pre-load inventory:', error instanceof POSAPIError ? error.message : error);
    }

    return json({
      tenantId: tenantContext.empresaId,
      tenantName: tenantContext.empresaNombre,
      userId: tenantContext.id,
      userName: tenantContext.nombre,
      permissions: tenantContext.permisos || [],
      inventory: inventory ? { items: inventory.items, total: inventory.total } : null,
    });
  } catch (error) {
    console.error('POS Terminal Loader Error:', error);

    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to load POS terminal data',
      },
      { status: 500 }
    );
  }
}

/**
 * POS Inventory Loader
 *
 * Loads current stock levels for a tenant.
 * Used in the inventory management view.
 *
 * Returns 401 if user is not authenticated
 * Returns 403 if user lacks 'inventario.ver' permission
 * Returns empty inventory if API is down (offline mode)
 */
export async function posInventoryLoader({ request, params }: LoaderFunctionArgs) {
  const session = await getSessionFromRequest(request);
  const jwt = session.get('jwt');

  if (!jwt) {
    return json(
      { error: 'Unauthorized', message: 'Session expired' },
      { status: 401 }
    );
  }

  try {
    const tenantContext = await getTenantContext(request);

    if (!tenantContext?.empresaId) {
      return json(
        { error: 'Forbidden', message: 'No active business context' },
        { status: 403 }
      );
    }

    // Check permission
    if (!tenantContext.permisos?.includes('inventario.ver')) {
      return json(
        { error: 'Forbidden', message: 'You do not have permission to view inventory' },
        { status: 403 }
      );
    }

    const inventory = await getInventory(tenantContext.empresaId, jwt);

    return json({
      tenantId: tenantContext.empresaId,
      inventory: {
        items: inventory.items,
        total: inventory.total,
        updatedAt: inventory.actualizadoEn,
      },
      canAdjust: tenantContext.permisos?.includes('inventario.ajustar') || false,
    });
  } catch (error) {
    if (error instanceof POSAPIError && error.isTimeout()) {
      return json(
        {
          error: 'Timeout',
          message: 'Inventory service is slow to respond',
          inventory: { items: [], total: 0, updatedAt: null },
          canAdjust: false,
          offline: true,
        },
        { status: 503 }
      );
    }

    console.error('POS Inventory Loader Error:', error);

    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to load inventory',
        inventory: { items: [], total: 0, updatedAt: null },
        canAdjust: false,
      },
      { status: 500 }
    );
  }
}

/**
 * POS Sales Loader
 *
 * Loads sales history for a tenant (with pagination).
 * Used in the sales log/history view.
 *
 * Returns 401 if user is not authenticated
 * Returns 403 if user lacks 'ventas.ver' permission
 *
 * Query params:
 * - limit: Items per page (default 20, max 100)
 * - offset: Pagination offset (default 0)
 */
export async function posSalesLoader({ request, params }: LoaderFunctionArgs) {
  const session = await getSessionFromRequest(request);
  const jwt = session.get('jwt');

  if (!jwt) {
    return json(
      { error: 'Unauthorized', message: 'Session expired' },
      { status: 401 }
    );
  }

  try {
    const tenantContext = await getTenantContext(request);

    if (!tenantContext?.empresaId) {
      return json(
        { error: 'Forbidden', message: 'No active business context' },
        { status: 403 }
      );
    }

    // Check permission
    if (!tenantContext.permisos?.includes('ventas.ver')) {
      return json(
        { error: 'Forbidden', message: 'You do not have permission to view sales' },
        { status: 403 }
      );
    }

    // Parse pagination params
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

    const salesData = await listSales(tenantContext.empresaId, jwt, limit, offset);

    return json({
      tenantId: tenantContext.empresaId,
      sales: {
        items: salesData.items,
        total: salesData.total,
        limit,
        offset,
        hasMore: offset + limit < salesData.total,
      },
    });
  } catch (error) {
    if (error instanceof POSAPIError && error.isTimeout()) {
      return json(
        {
          error: 'Timeout',
          message: 'Sales service is slow to respond',
          sales: { items: [], total: 0, limit: 0, offset: 0, hasMore: false },
          offline: true,
        },
        { status: 503 }
      );
    }

    console.error('POS Sales Loader Error:', error);

    return json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to load sales',
        sales: { items: [], total: 0, limit: 0, offset: 0, hasMore: false },
      },
      { status: 500 }
    );
  }
}

/**
 * Product Search Loader (for real-time search)
 *
 * Loads products matching a search query.
 * Called from client-side actions via fetcher.
 *
 * Query params:
 * - q: Search query (min 2 characters)
 * - limit: Items per page (default 20, max 100)
 * - offset: Pagination offset (default 0)
 */
export async function productSearchLoader({ request, params }: LoaderFunctionArgs) {
  const session = await getSessionFromRequest(request);
  const jwt = session.get('jwt');

  if (!jwt) {
    return json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (!query || query.length < 2) {
      return json({
        items: [],
        total: 0,
        limit: 0,
        offset: 0,
      });
    }

    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

    const result = await searchProducts(query, jwt, limit, offset);

    return json({
      items: result.items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      query,
    });
  } catch (error) {
    if (error instanceof POSAPIError && error.isTimeout()) {
      return json(
        { error: 'Timeout', items: [], total: 0, limit: 0, offset: 0 },
        { status: 503 }
      );
    }

    console.error('Product Search Loader Error:', error);

    return json(
      { error: 'Failed to search products', items: [], total: 0, limit: 0, offset: 0 },
      { status: 500 }
    );
  }
}
