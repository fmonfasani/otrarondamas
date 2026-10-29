# POS Cart & Inventory State Management

Complete cart and inventory management system for the Wapsell POS terminal.

## Features

### 1. Cart Operations
- **Add to cart**: Add products with quantity validation
- **Update quantity**: Modify item quantities with stock checking
- **Remove item**: Delete items from cart
- **Apply discount**: Manual percentage discounts per item
- **Clear cart**: Empty entire cart

### 2. Inventory Management
- Real-time stock validation
- Stock insufficient alerts
- Low stock warnings
- Prevents overselling
- Track available quantity per item

### 3. Pricing & Calculations
- Automatic subtotal calculation (qty × price)
- Item-level discounts
- Loyalty discounts (descuentoFidelizacion)
- Total discount aggregation
- Final cart total computation
- Proper decimal rounding (2 decimal places)

### 4. Optimistic UI Support
- Cart state available immediately after mutations
- Alerts returned synchronously
- No need to wait for server confirmation
- Error handling with revert capability

### 5. API Integration
- Product search via `/ventas/productos?search=`
- Price quotation via POST `/ventas/cotizar`
- Sale submission via POST `/ventas`
- Idempotency key support for safe retries

## Core Types

### CartItem
Single product in cart with pricing and stock info:
```typescript
interface CartItem {
  cartItemId: string;           // Unique ID
  productId: string;            // Product reference
  sku: string;                  // Código interno
  nombre: string;
  marca?: string | null;
  cantidad: number;             // Quantity
  precioUnitario: number;       // Price per unit
  descuentoItem: number;        // Manual discount %
  descuentoFidelizacionPorcentaje?: number | null;  // Auto loyalty discount
  stockDisponible: number;      // Available stock
  unidadBase: 'UNIDAD' | 'KILOGRAMO' | ...;
  subtotal: number;             // qty × price
  totalConDescuento: number;    // After all discounts
  createdAt: string;
  updatedAt: string;
}
```

### CartState
Complete cart representation:
```typescript
interface CartState {
  items: CartItem[];
  subtotalBruto: number;        // Before discounts
  descuentoTotal: number;       // Sum of all discounts
  total: number;                // Final amount
  alertasStock: InventoryAlert[];
  clienteId?: string;           // Optional client
  canal: 'presencial' | 'mayorista' | 'online';
  idempotencyKey?: string;
}
```

### InventoryAlert
Stock warnings:
```typescript
interface InventoryAlert {
  type: 'STOCK_INSUFFICIENT' | 'STOCK_LOW';
  cartItemId: string;
  productId: string;
  nombre: string;
  stockDisponible: number;
  stockSolicitado: number;
  stockMinimo?: number;
}
```

### CartOperationResult
Standard response type:
```typescript
interface CartOperationResult {
  success: boolean;
  cart: CartState;
  error?: string;
  alerts?: InventoryAlert[];
}
```

## Usage Examples

### 1. Initialize Cart Service

```typescript
import { initCartService, getCartService } from '~/services/pos.client';

// Initialize (client-side only)
const cart = initCartService();

// Or get existing instance
const cart = getCartService();
```

### 2. Add Product to Cart

```typescript
const product: ProductoBusqueda = {
  id: 'prod_123',
  nombre: 'Cerveza X',
  codigoInterno: 'BEB-CEL-ORO-PLA-00000001',
  precioMinorista: '150.00',
  stockDisponible: 50,
  stockMinimo: 5,
  unidadBase: 'UNIDAD',
  // ... other fields
};

const result = cart.addToCart(product, 3);

if (result.success) {
  // Update UI immediately (optimistic)
  updateCartUI(result.cart);
  
  if (result.alerts?.length) {
    showAlerts(result.alerts);
  }
}
```

### 3. Update Quantity

```typescript
const result = cart.updateQuantity('cart_123', 5);

if (!result.success) {
  showError(result.error);
  revertQuantity(); // Revert optimistic update
} else {
  updateUI(result.cart);
}
```

### 4. Apply Discount

```typescript
// Apply 10% discount to item
const result = cart.applyDiscount('cart_123', 10);

if (result.success) {
  // Subtotal: 1000
  // Discount (10%): -100
  // New total: 900
  updateUI(result.cart);
}
```

### 5. Remove Item

```typescript
const result = cart.removeFromCart('cart_123');

if (result.success) {
  updateUI(result.cart);
}
```

### 6. Get Cart Summary

```typescript
const summary = cart.getCartSummary();

console.log(summary);
// {
//   itemCount: 5,              // Total quantity
//   uniqueProducts: 3,         // Different products
//   subtotal: 1500.00,
//   descuento: 100.00,
//   total: 1400.00,
//   hasAlerts: false
// }
```

### 7. Search Products

```typescript
const result = await cart.searchProducts(
  'cerveza',
  empresaId,
  jwtToken
);

if (result.success && result.products) {
  displayProducts(result.products);
} else {
  showError(result.error);
}
```

### 8. Quote Cart (Before Checkout)

```typescript
// Get final pricing with loyalty discounts applied
const result = await cart.quotCart(jwtToken, clienteId);

if (result.success && result.quotation) {
  // quotation.lineas contains final pricing
  // quotation.total is final amount
  displayQuote(result.quotation);
} else {
  showError(result.error);
}
```

### 9. Submit Sale

```typescript
// Clear idempotency key before new attempt
if (previousAttemptFailed) {
  cart.generateIdempotencyKey();
}

const result = await cart.submitCart(jwtToken, clienteId);

if (result.success) {
  clearCart();
  redirectToPayment(result.ventaId);
} else {
  showError(result.error);
}
```

### 10. Clear Cart

```typescript
const result = cart.clearCart();

// Cart now empty, ready for new sale
updateUI(result.cart);
```

## Remix Integration Pattern

### 1. Loader (Data Fetching)
```typescript
import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { getTenantContext } from '~/utils/tenant-context.server';

export const loader: LoaderFunction = async ({ request }) => {
  const tenantContext = await getTenantContext(request);
  
  // Optionally fetch initial cart from backend
  // or initialize empty cart in client
  
  return json({
    empresaId: tenantContext?.empresaId,
    locale: 'es',
  });
};
```

### 2. Form Action (Server-side Cart Operations)
```typescript
import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { getTenantContext } from '~/utils/tenant-context.server';

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const tenantContext = await getTenantContext(request);
  if (!tenantContext) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const actionType = formData.get('_action');

  // Handle server-side operations if needed
  // Mostly cart operations happen client-side for speed
  
  return json({ success: true });
};
```

### 3. Component (UI Integration)
```typescript
import { useState } from 'react';
import { useTransition } from '@remix-run/react';
import { getCartService } from '~/services/pos.client';
import type { CartState, InventoryAlert } from '~/services/pos.client';

export function POSCart() {
  const [cart, setCart] = useState<CartState>(getCartService().getCart());
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const transition = useTransition();
  
  const cartService = getCartService();

  const handleAddProduct = (product: ProductoBusqueda, qty: number) => {
    // Optimistic UI: update immediately
    const result = cartService.addToCart(product, qty);
    
    if (result.success) {
      setCart(result.cart); // Update state immediately
      if (result.alerts) {
        setAlerts(result.alerts);
      }
    } else {
      // Show error toast
      showError(result.error);
    }
  };

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    const result = cartService.updateQuantity(cartItemId, newQty);
    
    if (result.success) {
      setCart(result.cart);
    } else {
      showError(result.error);
      // Revert UI to previous state
      setCart(cartService.getCart());
    }
  };

  const handleApplyDiscount = (cartItemId: string, percent: number) => {
    const result = cartService.applyDiscount(cartItemId, percent);
    
    if (result.success) {
      setCart(result.cart);
    }
  };

  return (
    <div className="cart">
      {/* Product list */}
      {cart.items.map(item => (
        <CartItemRow
          key={item.cartItemId}
          item={item}
          onUpdateQty={(qty) => handleUpdateQuantity(item.cartItemId, qty)}
          onApplyDiscount={(pct) => handleApplyDiscount(item.cartItemId, pct)}
        />
      ))}

      {/* Alerts */}
      {alerts.map(alert => (
        <Alert key={`${alert.type}_${alert.cartItemId}`}>
          {alert.type === 'STOCK_INSUFFICIENT'
            ? `Stock insuficiente para ${alert.nombre}`
            : `Stock bajo: ${alert.stockDisponible} disponible`}
        </Alert>
      ))}

      {/* Totals */}
      <CartSummary
        subtotal={cart.subtotalBruto}
        discount={cart.descuentoTotal}
        total={cart.total}
      />

      {/* Checkout */}
      <form method="POST">
        <input type="hidden" name="_action" value="checkout" />
        <button
          type="submit"
          disabled={cart.items.length === 0 || transition.state === 'submitting'}
        >
          {transition.state === 'submitting' ? 'Procesando...' : 'Procesar Venta'}
        </button>
      </form>
    </div>
  );
}
```

## API Contract

### Search Products
**Endpoint**: `GET /ventas/productos?search={query}`
**Response**:
```typescript
ProductoBusqueda[]
```

### Quote Cart
**Endpoint**: `POST /ventas/cotizar`
**Request**:
```typescript
{
  canal: 'presencial' | 'mayorista' | 'online';
  clienteId?: string;
  items: {
    productoId: string;
    cantidad: number;
    descuentoItem?: number;
  }[];
}
```
**Response**:
```typescript
{
  lineas: CotizacionLinea[];
  total: string;
}
```

### Create Sale
**Endpoint**: `POST /ventas`
**Request**:
```typescript
{
  canal: 'presencial' | 'mayorista' | 'online';
  clienteId?: string;
  items: {
    productoId: string;
    cantidad: number;
    descuentoItem?: number;
  }[];
  idempotencyKey?: string;
}
```
**Response**:
```typescript
{
  id: string;
  // ... Venta fields
}
```

## Implementation Checklist

- [x] CartItem type definition
- [x] CartState structure
- [x] InventoryAlert types
- [x] CartOperationResult interface
- [x] CartService class with methods:
  - [x] addToCart(product, qty)
  - [x] updateQuantity(cartItemId, qty)
  - [x] removeFromCart(cartItemId)
  - [x] applyDiscount(cartItemId, percent)
  - [x] clearCart()
  - [x] setClient(clienteId)
  - [x] setChannel(canal)
  - [x] generateIdempotencyKey()
  - [x] validateCart()
  - [x] getCartSummary()
  - [x] searchProducts(query, empresaId, token)
  - [x] quotCart(token, clienteId)
  - [x] submitCart(token, clienteId)
- [x] Inventory validation with alerts
- [x] Pricing calculations with rounding
- [x] Optimistic UI support
- [x] API integration methods
- [x] Service initialization functions

## Performance Considerations

1. **Optimistic Updates**: All mutations update local state immediately
2. **Rounding**: All calculations use Math.round() with 2 decimal places
3. **Alerts**: Processed synchronously, no API calls needed
4. **Validation**: Client-side checks before server submission
5. **Idempotency**: Safe retry with idempotency keys

## Error Handling

All operations return `CartOperationResult` with:
- `success`: Whether operation succeeded
- `cart`: Current cart state (always populated)
- `error`: User-friendly error message
- `alerts`: Inventory alerts (if applicable)

## Notes

- Use `initCartService()` on component mount (client-side only)
- Call `resetCartService()` on logout
- All prices are numbers (Decimal from Prisma serialized as string in API)
- Stock quantities are integers
- Discounts are percentages (0-100)
- No tax calculation built-in (can be added to submission phase)
