/**
 * POS Cart & Inventory State Management
 * Client-side cart operations with optimistic UI updates and inventory validation
 */

import type {
  Producto,
  ProductoBusqueda,
  CotizacionResponse,
  CotizacionLinea,
} from '@wapsell/shared-types';

/**
 * Cart Item Type
 * Represents a single product in the cart
 */
export interface CartItem {
  // Unique cart item identifier (different from product ID)
  cartItemId: string;
  // Product data
  productId: string;
  sku: string;
  nombre: string;
  marca?: string | null;
  // Pricing and quantity
  cantidad: number;
  precioUnitario: number;
  // Discounts
  descuentoItem: number; // Manual discount (percentage or amount, 0-100)
  descuentoFidelizacionPorcentaje?: number | null; // Auto loyalty discount
  // Inventory info
  stockDisponible: number;
  unidadBase: 'UNIDAD' | 'KILOGRAMO' | 'LITRO' | 'METRO' | 'PACK' | 'CAJA';
  // Calculated fields
  subtotal: number; // cantidad × precioUnitario
  totalConDescuento: number; // subtotal after all discounts
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Cart State
 */
export interface CartState {
  items: CartItem[];
  // Totals
  subtotalBruto: number; // sum of all subtotals before discounts
  descuentoTotal: number; // sum of all discounts
  total: number; // final amount to pay
  // Inventory alerts
  alertasStock: InventoryAlert[];
  // Metadata
  clienteId?: string;
  canal: 'presencial' | 'mayorista' | 'online';
  idempotencyKey?: string;
}

/**
 * Inventory Alert
 * Warning when stock is insufficient or approaching minimum
 */
export interface InventoryAlert {
  type: 'STOCK_INSUFFICIENT' | 'STOCK_LOW';
  cartItemId: string;
  productId: string;
  nombre: string;
  stockDisponible: number;
  stockSolicitado: number;
  stockMinimo?: number;
}

/**
 * Cart Operations Result
 * Standard result type for cart mutations
 */
export interface CartOperationResult {
  success: boolean;
  cart: CartState;
  error?: string;
  alerts?: InventoryAlert[];
}

/**
 * Cart Service Class
 * Manages cart state and operations
 */
export class CartService {
  private cart: CartState;
  private readonly apiUrl: string;
  private readonly apiTimeout: number;

  constructor(
    initialCart?: CartState,
    apiUrl: string = process.env.VITE_API_URL || 'http://localhost:8600',
    apiTimeout: number = 30000
  ) {
    this.cart = initialCart || this.createEmptyCart();
    this.apiUrl = apiUrl;
    this.apiTimeout = apiTimeout;
  }

  /**
   * Create empty cart
   */
  private createEmptyCart(): CartState {
    return {
      items: [],
      subtotalBruto: 0,
      descuentoTotal: 0,
      total: 0,
      alertasStock: [],
      canal: 'presencial',
    };
  }

  /**
   * Get current cart state
   */
  getCart(): CartState {
    return { ...this.cart };
  }

  /**
   * Generate unique cart item ID
   */
  private generateCartItemId(): string {
    return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate item subtotal
   */
  private calculateSubtotal(quantity: number, price: number): number {
    return Math.round(quantity * price * 100) / 100;
  }

  /**
   * Calculate discount amount
   * @param baseAmount Base amount to discount
   * @param discountPercent Discount percentage (0-100)
   */
  private calculateDiscount(baseAmount: number, discountPercent: number): number {
    if (discountPercent <= 0 || discountPercent > 100) return 0;
    return Math.round((baseAmount * discountPercent) / 100 * 100) / 100;
  }

  /**
   * Recalculate cart totals
   */
  private recalculateTotals(): void {
    let subtotalBruto = 0;
    let descuentoTotal = 0;

    for (const item of this.cart.items) {
      const itemSubtotal = this.calculateSubtotal(item.cantidad, item.precioUnitario);
      subtotalBruto += itemSubtotal;

      // Calculate discounts
      const descuentoItemAmount = this.calculateDiscount(itemSubtotal, item.descuentoItem);
      const descuentoFidelizacion = item.descuentoFidelizacionPorcentaje
        ? this.calculateDiscount(itemSubtotal - descuentoItemAmount, item.descuentoFidelizacionPorcentaje)
        : 0;

      descuentoTotal += descuentoItemAmount + descuentoFidelizacion;
    }

    this.cart.subtotalBruto = Math.round(subtotalBruto * 100) / 100;
    this.cart.descuentoTotal = Math.round(descuentoTotal * 100) / 100;
    this.cart.total = Math.round((subtotalBruto - descuentoTotal) * 100) / 100;

    // Ensure total is never negative
    if (this.cart.total < 0) {
      this.cart.total = 0;
    }
  }

  /**
   * Validate inventory for an item
   */
  private validateInventory(
    product: ProductoBusqueda,
    quantity: number
  ): InventoryAlert | null {
    if (quantity > product.stockDisponible) {
      return {
        type: 'STOCK_INSUFFICIENT',
        cartItemId: '', // Will be set by caller
        productId: product.id,
        nombre: product.nombre,
        stockDisponible: product.stockDisponible,
        stockSolicitado: quantity,
        stockMinimo: product.stockMinimo,
      };
    }

    if (product.stockDisponible <= product.stockMinimo && product.stockMinimo > 0) {
      return {
        type: 'STOCK_LOW',
        cartItemId: '', // Will be set by caller
        productId: product.id,
        nombre: product.nombre,
        stockDisponible: product.stockDisponible,
        stockSolicitado: quantity,
        stockMinimo: product.stockMinimo,
      };
    }

    return null;
  }

  /**
   * Add product to cart
   * @param product Product to add
   * @param quantity Quantity to add
   * @returns Result with updated cart and any alerts
   */
  addToCart(product: ProductoBusqueda, quantity: number): CartOperationResult {
    // Validate inputs
    if (!product || quantity <= 0) {
      return {
        success: false,
        cart: this.cart,
        error: 'Cantidad debe ser mayor a 0',
      };
    }

    // Check if product already exists in cart
    const existingItem = this.cart.items.find(item => item.productId === product.id);

    if (existingItem) {
      // Update quantity instead of adding duplicate
      return this.updateQuantity(existingItem.cartItemId, existingItem.cantidad + quantity);
    }

    // Validate inventory
    const alert = this.validateInventory(product, quantity);

    // Create new cart item
    const cartItemId = this.generateCartItemId();
    const subtotal = this.calculateSubtotal(quantity, parseFloat(product.precioMinorista));

    const newItem: CartItem = {
      cartItemId,
      productId: product.id,
      sku: product.codigoInterno,
      nombre: product.nombre,
      marca: product.marca,
      cantidad: quantity,
      precioUnitario: parseFloat(product.precioMinorista),
      descuentoItem: 0,
      descuentoFidelizacionPorcentaje: null,
      stockDisponible: product.stockDisponible,
      unidadBase: product.unidadBase,
      subtotal,
      totalConDescuento: subtotal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.cart.items.push(newItem);
    this.recalculateTotals();

    // Update alerts
    if (alert) {
      alert.cartItemId = cartItemId;
      this.cart.alertasStock = [
        ...this.cart.alertasStock.filter(a => a.cartItemId !== cartItemId),
        alert,
      ];
    }

    return {
      success: true,
      cart: { ...this.cart },
      alerts: alert ? [alert] : undefined,
    };
  }

  /**
   * Update item quantity
   * @param cartItemId Cart item to update
   * @param newQuantity New quantity
   * @returns Result with updated cart
   */
  updateQuantity(cartItemId: string, newQuantity: number): CartOperationResult {
    const item = this.cart.items.find(i => i.cartItemId === cartItemId);

    if (!item) {
      return {
        success: false,
        cart: this.cart,
        error: 'Producto no encontrado en carrito',
      };
    }

    // Validate quantity
    if (newQuantity <= 0) {
      return this.removeFromCart(cartItemId);
    }

    // Check stock
    if (newQuantity > item.stockDisponible) {
      return {
        success: false,
        cart: this.cart,
        error: `Stock insuficiente. Disponible: ${item.stockDisponible}`,
        alerts: [
          {
            type: 'STOCK_INSUFFICIENT',
            cartItemId,
            productId: item.productId,
            nombre: item.nombre,
            stockDisponible: item.stockDisponible,
            stockSolicitado: newQuantity,
          },
        ],
      };
    }

    // Update quantity and recalculate
    item.cantidad = newQuantity;
    item.subtotal = this.calculateSubtotal(newQuantity, item.precioUnitario);
    item.updatedAt = new Date().toISOString();

    // Recalculate item total with discounts
    const descuentoItemAmount = this.calculateDiscount(item.subtotal, item.descuentoItem);
    const descuentoFidelizacion = item.descuentoFidelizacionPorcentaje
      ? this.calculateDiscount(item.subtotal - descuentoItemAmount, item.descuentoFidelizacionPorcentaje)
      : 0;
    item.totalConDescuento = item.subtotal - descuentoItemAmount - descuentoFidelizacion;

    this.recalculateTotals();

    return {
      success: true,
      cart: { ...this.cart },
    };
  }

  /**
   * Remove item from cart
   * @param cartItemId Cart item to remove
   * @returns Result with updated cart
   */
  removeFromCart(cartItemId: string): CartOperationResult {
    const index = this.cart.items.findIndex(i => i.cartItemId === cartItemId);

    if (index === -1) {
      return {
        success: false,
        cart: this.cart,
        error: 'Producto no encontrado en carrito',
      };
    }

    this.cart.items.splice(index, 1);
    this.cart.alertasStock = this.cart.alertasStock.filter(a => a.cartItemId !== cartItemId);
    this.recalculateTotals();

    return {
      success: true,
      cart: { ...this.cart },
    };
  }

  /**
   * Apply discount to cart item
   * @param cartItemId Cart item to discount
   * @param discountPercent Discount percentage (0-100)
   * @returns Result with updated cart
   */
  applyDiscount(cartItemId: string, discountPercent: number): CartOperationResult {
    const item = this.cart.items.find(i => i.cartItemId === cartItemId);

    if (!item) {
      return {
        success: false,
        cart: this.cart,
        error: 'Producto no encontrado en carrito',
      };
    }

    // Validate discount
    if (discountPercent < 0 || discountPercent > 100) {
      return {
        success: false,
        cart: this.cart,
        error: 'Descuento debe estar entre 0 y 100',
      };
    }

    item.descuentoItem = discountPercent;
    item.updatedAt = new Date().toISOString();

    // Recalculate item total
    const descuentoItemAmount = this.calculateDiscount(item.subtotal, item.descuentoItem);
    const descuentoFidelizacion = item.descuentoFidelizacionPorcentaje
      ? this.calculateDiscount(item.subtotal - descuentoItemAmount, item.descuentoFidelizacionPorcentaje)
      : 0;
    item.totalConDescuento = item.subtotal - descuentoItemAmount - descuentoFidelizacion;

    this.recalculateTotals();

    return {
      success: true,
      cart: { ...this.cart },
    };
  }

  /**
   * Clear entire cart
   * @returns Result with empty cart
   */
  clearCart(): CartOperationResult {
    this.cart = this.createEmptyCart();

    return {
      success: true,
      cart: { ...this.cart },
    };
  }

  /**
   * Set client for the sale
   */
  setClient(clienteId: string): void {
    this.cart.clienteId = clienteId;
  }

  /**
   * Set sales channel
   */
  setChannel(canal: 'presencial' | 'mayorista' | 'online'): void {
    this.cart.canal = canal;
  }

  /**
   * Generate idempotency key for the sale
   */
  generateIdempotencyKey(): string {
    const key = `venta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.cart.idempotencyKey = key;
    return key;
  }

  /**
   * Validate cart before checkout
   */
  validateCart(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.cart.items.length === 0) {
      errors.push('El carrito está vacío');
    }

    // Check for insufficient stock alerts
    const insufficientStock = this.cart.alertasStock.filter(
      a => a.type === 'STOCK_INSUFFICIENT'
    );
    if (insufficientStock.length > 0) {
      errors.push(
        `Stock insuficiente para: ${insufficientStock.map(a => a.nombre).join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get cart summary
   */
  getCartSummary(): {
    itemCount: number;
    uniqueProducts: number;
    subtotal: number;
    descuento: number;
    total: number;
    hasAlerts: boolean;
  } {
    return {
      itemCount: this.cart.items.reduce((sum, item) => sum + item.cantidad, 0),
      uniqueProducts: this.cart.items.length,
      subtotal: this.cart.subtotalBruto,
      descuento: this.cart.descuentoTotal,
      total: this.cart.total,
      hasAlerts: this.cart.alertasStock.length > 0,
    };
  }

  /**
   * Fetch product search from API
   * Used for product lookup/autocomplete in the POS
   */
  async searchProducts(
    query: string,
    empresaId: string,
    token: string
  ): Promise<{ success: boolean; products?: ProductoBusqueda[]; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);

      const response = await fetch(
        `${this.apiUrl}/ventas/productos?search=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal,
        }
      ).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        return {
          success: false,
          error: `Error: ${response.status} ${response.statusText}`,
        };
      }

      const products = await response.json();
      return {
        success: true,
        products,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Quote cart items before checkout
   * Gets final pricing with loyalty discounts applied
   */
  async quotCart(
    token: string,
    clienteId?: string
  ): Promise<{ success: boolean; quotation?: CotizacionResponse; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);

      const requestBody = {
        canal: this.cart.canal,
        clienteId,
        items: this.cart.items.map(item => ({
          productoId: item.productId,
          cantidad: item.cantidad,
          descuentoItem: item.descuentoItem,
        })),
      };

      const response = await fetch(`${this.apiUrl}/ventas/cotizar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        return {
          success: false,
          error: `Quote error: ${response.status} ${response.statusText}`,
        };
      }

      const quotation = await response.json();
      return {
        success: true,
        quotation,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Submit cart as a sale
   * Creates the sale transaction
   */
  async submitCart(
    token: string,
    clienteId?: string
  ): Promise<{ success: boolean; ventaId?: string; error?: string }> {
    try {
      // Validate cart first
      const validation = this.validateCart();
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; '),
        };
      }

      // Generate idempotency key if not set
      if (!this.cart.idempotencyKey) {
        this.generateIdempotencyKey();
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);

      const requestBody = {
        canal: this.cart.canal,
        clienteId,
        items: this.cart.items.map(item => ({
          productoId: item.productId,
          cantidad: item.cantidad,
          descuentoItem: item.descuentoItem,
        })),
        idempotencyKey: this.cart.idempotencyKey,
      };

      const response = await fetch(`${this.apiUrl}/ventas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        return {
          success: false,
          error: `Sale error: ${response.status} ${response.statusText}`,
        };
      }

      const sale = await response.json();
      return {
        success: true,
        ventaId: sale.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

/**
 * Create cart service instance
 * Singleton-like factory for the POS
 */
let cartServiceInstance: CartService | null = null;

export function initCartService(
  initialCart?: CartState,
  apiUrl?: string,
  apiTimeout?: number
): CartService {
  cartServiceInstance = new CartService(initialCart, apiUrl, apiTimeout);
  return cartServiceInstance;
}

export function getCartService(): CartService {
  if (!cartServiceInstance) {
    cartServiceInstance = new CartService();
  }
  return cartServiceInstance;
}

export function resetCartService(): void {
  if (cartServiceInstance) {
    cartServiceInstance.clearCart();
  }
  cartServiceInstance = null;
}
