# POS API Integration Guide

## Overview

This directory contains the client-side POS integration for Wapsell Remix. It communicates with the NestJS API (`apps/api`) to manage point-of-sale operations including:

- Sale creation with idempotency and stock validation
- Real-time inventory management
- Product search and catalog queries
- Error handling and offline fallback

## Architecture

```
Client (Remix)                Server (NestJS API)
┌─────────────────────┐      ┌───────────────────┐
│  Route Component    │      │  Controller       │
│  (e.g. $lang.pos)   │      │  (sales.ctrl)     │
└──────────┬──────────┘      └─────────┬─────────┘
           │                          │
           │ Loader / Action          │
           ├─────────────────────────>│
           │                          │
           │  useLoaderData()          │
           │  useFetcher()             │
           │<─ JSON response ──────────┤
           │                          │
           │ Client-side               │
           │ (optimistic updates)      │
           │                          │
           └─ Display updates ────────┘
```

## Services

### `pos.server.ts` — API Client Library

Core functions for communicating with the NestJS API. All functions:
- Validate inputs with Zod schemas
- Handle timeouts (30s default)
- Parse and validate responses
- Return typed results or throw `POSAPIError`

#### Key Functions

**`createSale(saleData, jwt, idempotencyKey?)`**
- Creates a new sale with items
- Idempotency Key prevents duplicate sales on retry
- Returns: Sale object with ID, receipt number, totals
- Errors: 409 (stock oversold), 422 (validation), 500+ (server)

**`getInventory(tenantId, jwt)`**
- Fetches consolidated inventory for a company
- Returns: Array of inventory items with stock levels
- Errors: 500+ (server), timeout (API slow)

**`updateStock(productoId, adjustment, razon, jwt)`**
- Adjusts inventory by a delta (positive or negative)
- Used for manual corrections or returns
- Returns: Updated inventory item
- Errors: 409 (would make stock negative), 422 (validation)

**`searchProducts(query, jwt, limit, offset)`**
- Searches products by name, code, or brand
- Supports pagination
- Returns: Array of matching products with pricing and stock
- Errors: 422 (invalid search term), 500+ (server)

**`quoteSale(items, jwt)`**
- Calculates sale totals without persisting
- Applies all discounts and rules
- Returns: Quote with exact totals
- Errors: 422 (validation), 500+ (server)

### `pos.loaders.server.ts` — Data Loading

Server-side loaders for Remix routes. Each loader:
- Authenticates via JWT
- Checks permissions
- Fetches data from API
- Returns typed data or error JSON

#### Loaders

| Loader | Route | Purpose | Permissions |
|--------|-------|---------|-------------|
| `posTerminalLoader` | `$lang.pos._index` | Load POS terminal (products, inventory) | `ventas.crear` |
| `posInventoryLoader` | `$lang.pos.inventory` | Load inventory view | `inventario.ver` |
| `posSalesLoader` | `$lang.pos.sales` | Load sales history | `ventas.ver` |
| `productSearchLoader` | `api/pos/search` | Real-time product search | (logged-in) |

### `pos.actions.server.ts` — Mutations

Server-side action handlers for form submissions and mutations.

#### Actions

| Action | Method | Purpose | Permissions |
|--------|--------|---------|-------------|
| `createSaleAction` | POST | Create a new sale | `ventas.crear` |
| `updateStockAction` | PATCH | Adjust inventory | `inventario.ajustar` |
| `quoteSaleAction` | POST | Calculate sale total | (logged-in) |

### `utils/pos-client.ts` — Client Utilities

Client-side helpers for:
- Parsing and handling API errors
- Optimistic inventory deduction with rollback
- Offline queue management
- Price formatting and calculations
- Retry logic with exponential backoff

## Integration Patterns

### Creating a Sale

1. **Client** displays product search and cart
2. **Client** calls `quoteSale()` (debounced 300ms) to show totals
3. **User** clicks "Create Sale"
4. **Client** optimistically deducts inventory locally
5. **Client** submits form with `createSaleAction`
6. **Server** validates, checks stock, persists sale
   - On success (201): Update UI, show receipt
   - On conflict (409): Rollback inventory, show "stock insufficient"
   - On timeout (504): Show "Check sales log to confirm"
   - On server error (500+): Rollback, queue for offline sync

```typescript
// Example React component
const [inventory, setInventory] = useState<InventoryItem[]>([]);
const [cart, setCart] = useState<SaleItem[]>([]);
const { state } = useTransition();

const handleCreateSale = async () => {
  // Optimistic deduction
  const { updated, rollback } = optimisticallyDeductInventory(inventory, cart);
  setInventory(updated);

  // Submit
  const formData = new FormData();
  formData.append('canal', 'presencial');
  formData.append('items', JSON.stringify(cart));

  const response = await fetch('/api/pos/sales', {
    method: 'POST',
    body: JSON.stringify({ canal: 'presencial', items: cart }),
  });

  if (!response.ok) {
    // Rollback on error
    setInventory(rollback(inventory));
    const error = parsePOSError(response, await response.json());
    showToast(getPOSErrorMessage(error));
    return;
  }

  const { sale } = await response.json();
  showReceipt(sale);
};
```

### Error Handling

**409 Conflict** — Stock oversold
- User action required: adjust quantities
- Not retryable

**422 Unprocessable** — Validation error
- Client-side data is invalid
- Not retryable (fix data first)

**504/503 Timeout** — API is slow or down
- Request may have succeeded
- Retryable with exponential backoff
- Check sales log to confirm

**500+ Server Error** — API error
- Retryable with backoff
- Queue for offline sync if persistent

### Offline Fallback

When API is unreachable:

1. Queue sale locally: `queueSaleOffline(saleData)`
2. Show message: "Sale queued. Will sync when online."
3. When online: Retry queued sales with idempotency key
4. Clear queue: `clearOfflineQueue()`

## Error Handling Reference

### POSError Type

```typescript
interface POSError {
  type: 'conflict' | 'validation' | 'timeout' | 'server_error' | 'unknown'
  message: string
  details?: string
  statusCode?: number
  retryable: boolean
}
```

### API Response Status Codes

| Status | Meaning | Retryable | Action |
|--------|---------|-----------|--------|
| 201 | Sale created | — | Show receipt |
| 409 | Stock oversold | No | Ask user to adjust qty |
| 422 | Validation error | No | Show validation message |
| 500 | Server error | Yes | Retry with backoff |
| 503 | Service unavailable | Yes | Queue for offline sync |
| 504 | Timeout | Yes | Check sales log |

## Validation Schemas

All inputs are validated with Zod before sending to the API:

**SaleItem**
```typescript
{
  productoId: UUID (required)
  cantidad: number > 0 (required)
  precioUnitario: decimal string (required)
  descuentoUnitario: decimal string (optional, defaults to "0")
}
```

**CreateSaleInput**
```typescript
{
  canal: "presencial" | "mayorista" | "online" (required)
  items: SaleItem[] (required, min 1)
  clienteId: UUID (optional)
  idempotencyKey: UUID (optional, auto-generated if missing)
}
```

## Type Safety

All services export TypeScript types inferred from Zod schemas:

```typescript
import type {
  Sale,
  SaleItem,
  InventoryItem,
  ProductSearchItem,
  CreateSaleInput,
} from '~/services/pos.server';
```

## Environment Variables

```bash
# .env
VITE_API_URL=http://localhost:8600
VITE_API_TIMEOUT=30000  # milliseconds
```

## Integration Checklist

Routes using POS integration should:

- [ ] Import loader: `posTerminalLoader`, `posInventoryLoader`, etc.
- [ ] Import action: `createSaleAction`, `updateStockAction`, etc.
- [ ] Use `useLoaderData()` to access pre-loaded data
- [ ] Use `useTransition()` for form submission state
- [ ] Use `useFetcher()` for real-time product search
- [ ] Call `parsePOSError()` on error responses
- [ ] Implement optimistic UI with `optimisticallyDeductInventory()`
- [ ] Handle 409 (conflict) and 504 (timeout) specially
- [ ] Queue sales for offline sync if needed

## Testing

### Unit Tests

Test Zod schemas:
```typescript
import { CreateSaleSchema } from '~/services/pos.server';

it('validates sale with valid input', () => {
  const valid = CreateSaleSchema.parse({
    canal: 'presencial',
    items: [{ productoId: 'uuid', cantidad: 1, precioUnitario: '100' }],
  });
  expect(valid).toBeDefined();
});
```

### Integration Tests

Test full flow with mock API:
```typescript
it('creates sale and optimistically updates inventory', async () => {
  // Mock API
  // Submit form
  // Assert inventory updated
  // Assert sale returned
});
```

## References

- **NestJS API**: `apps/api/src/sales/`, `apps/api/src/inventory/`
- **Shared Types**: `packages/shared-types/src/`
- **Remix Docs**: https://remix.run/docs
- **Zod Docs**: https://zod.dev
