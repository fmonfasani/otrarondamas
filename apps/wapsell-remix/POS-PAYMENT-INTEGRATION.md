# POS Payment Integration Guide

## Overview

The POS payment system provides a complete workflow for creating sales with payment processing. It handles:

- **Payment Validation**: Cash, card, QR, and mixed payment methods
- **Sale Creation**: Creates sales with idempotency protection against duplicate submissions
- **Receipt Generation**: Automatic receipt data for printing or email
- **Error Handling**: Comprehensive error responses with proper HTTP status codes
- **Audit Logging**: Transaction logging for compliance and debugging

## Architecture

### Services

```
┌─────────────────────────────────────────────────┐
│  Frontend (React Component)                      │
│  ├─ usePOSPayment() - Payment state hook        │
│  └─ useCompleteSale() - Sale submission hook    │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  Remix Action: /api/pos/complete-sale           │
│  ├─ Request validation                          │
│  ├─ Authorization checks                        │
│  └─ Error handling                              │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  POS Payment Service (pos.payment.server.ts)    │
│  ├─ validatePayment()                           │
│  ├─ processCompleteSale()                       │
│  ├─ buildReceiptData()                          │
│  └─ Idempotency cache                           │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  POS Core Service (pos.server.ts)               │
│  ├─ createSale() - API call to /ventas         │
│  ├─ quoteSale() - Calculate totals              │
│  ├─ updateStock() - Inventory adjustment        │
│  └─ getInventory() - Fetch stock                │
└─────────────────────────────────────────────────┘
```

## Payment Methods

### Cash Payment

User tenders cash for the purchase.

```typescript
const payment: PaymentInput = {
  method: 'CASH',
  amount: 100.00,        // Sale total
  amountReceived: 150.00 // Cash tendered
};
// Change: 50.00 (calculated automatically)
```

### Card Payment

Debit or credit card (no data storage - PCI compliant).

```typescript
const payment: PaymentInput = {
  method: 'CARD',
  amount: 100.00,
  cardNumber: '4111111111111111',
  cardholderName: 'John Doe',
  expiryMonth: 12,
  expiryYear: 2025,
  cvv: '123',
  installments: 1 // Optional, max 12
};
```

**Security**: Card details are validated but never stored. The payment processor handles the actual charge.

### QR Payment (Mercado Pago)

Digital payment via QR code.

```typescript
const payment: PaymentInput = {
  method: 'QR',
  amount: 100.00,
  qrReference: 'MP-ABC123XYZ789',
  provider: 'MERCADO_PAGO'
};
```

### Mixed Payment

Combination of cash and card.

```typescript
const payment: PaymentInput = {
  method: 'MIXED',
  cashAmount: 60.00,
  cardAmount: 40.00,
  amountReceived: 70.00, // For cash change
  // Card details if cardAmount > 0
  cardNumber: '4111111111111111',
  cardholderName: 'John Doe',
  expiryMonth: 12,
  expiryYear: 2025,
  cvv: '123'
};
// Change from cash: 10.00 (70 - 60)
```

## Usage

### Frontend: React Component

```tsx
import { usePOSPayment, useCompleteSale } from '~/hooks/usePOSPayment';
import { v4 as uuidv4 } from 'uuid';

function CheckoutForm() {
  const { state, errors, updatePayment, validatePayment, buildPaymentData } = usePOSPayment();
  const { submit, isLoading, error } = useCompleteSale({
    onSuccess: (response) => {
      console.log('Sale created:', response);
      // Print receipt, reset cart, etc.
    },
    onError: (error) => {
      console.error('Sale failed:', error);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePayment()) {
      return; // Show errors
    }

    const result = await submit({
      items: cartItems,
      payment: buildPaymentData()!,
      canal: 'presencial',
      idempotencyKey: uuidv4() // Prevent duplicates on retry
    });

    if (result) {
      // Handle success
      console.log('Receipt:', result.receiptData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Payment method selector */}
      <select 
        value={state.method || ''} 
        onChange={(e) => updatePayment({ method: e.target.value as any })}
      >
        <option value="">Select payment method</option>
        <option value="CASH">Cash</option>
        <option value="CARD">Card</option>
        <option value="QR">QR Code</option>
        <option value="MIXED">Mixed</option>
      </select>

      {/* Method-specific fields */}
      {state.method === 'CASH' && (
        <div>
          <input
            type="number"
            placeholder="Amount received"
            value={state.amountReceived || ''}
            onChange={(e) => updatePayment({ amountReceived: parseFloat(e.target.value) })}
          />
          {errors.amountReceived && <span className="error">{errors.amountReceived}</span>}
        </div>
      )}

      {/* ... other method-specific fields ... */}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Complete Sale'}
      </button>

      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

### Server-Side: API Endpoint

The `/api/pos/complete-sale` endpoint handles the complete workflow:

```bash
POST /api/pos/complete-sale
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "items": [
    {
      "productoId": "product-123",
      "cantidad": 2,
      "precioUnitario": "50.00",
      "descuentoUnitario": "0.00"
    }
  ],
  "payment": {
    "method": "CASH",
    "amount": 100.00,
    "amountReceived": 150.00
  },
  "canal": "presencial",
  "clienteId": "customer-456", // Optional
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000" // Optional
}
```

**Response (201 Created)**:

```json
{
  "success": true,
  "sale": {
    "id": "sale-789",
    "numeroComprobanteInterno": "CMP-2024-0001",
    "montoTotal": "100.00",
    "descuentoTotal": "0.00",
    "items": [
      {
        "id": "item-1",
        "productoId": "product-123",
        "nombreProducto": "Product Name",
        "cantidad": 2,
        "precioUnitario": "50.00",
        "subtotal": "100.00"
      }
    ]
  },
  "payment": {
    "method": "CASH",
    "amountPaid": 150.00,
    "change": 50.00
  },
  "receiptData": {
    "saleId": "sale-789",
    "receiptNumber": "CMP-2024-0001",
    "timestamp": "2024-01-15T10:30:00Z",
    "items": [...],
    "subtotal": 100.00,
    "discount": 0.00,
    "tax": 0.00,
    "total": 100.00,
    "paymentMethod": "CASH",
    "amountPaid": 150.00,
    "change": 50.00
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Handling

### Status Codes

- **201 Created**: Sale created successfully
- **400 Bad Request**: Missing or malformed fields
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Insufficient permissions
- **409 Conflict**: 
  - Stock insufficient for items
  - Duplicate sale (idempotency key collision)
- **422 Unprocessable Entity**: 
  - Payment validation failed
  - Prices mismatch
  - Invalid data format
- **500 Server Error**: API or database error
- **504 Gateway Timeout**: Request timeout (sale may or may not have been created)

### Error Response Format

```json
{
  "error": "conflict|validation|server_error|timeout|unknown",
  "message": "Human-readable error message",
  "details": "Additional technical details (optional)"
}
```

### Example: Insufficient Stock

```json
{
  "error": "conflict",
  "message": "Sale could not be created. Stock may be insufficient or idempotency key is duplicate.",
  "details": "Stock is insufficient for product 'Laptop': requested 5, available 2"
}
```

### Example: Invalid Payment

```json
{
  "error": "validation",
  "message": "Invalid sale or payment data",
  "details": "Card has expired"
}
```

## Idempotency

Protect against duplicate sales when the user retries a request.

### How it Works

1. Client generates a UUID (idempotency key)
2. Client submits sale with the key
3. Server checks cache for the key
4. If found: return the cached sale ID (no duplicate created)
5. If not found: create sale and cache the key for 24 hours

### Expiry

- **TTL**: 24 hours after first submission
- **Location**: In-memory cache (upgrade to Redis in production)

### Example

```typescript
// First request
const idempotencyKey = uuidv4();
const response1 = await fetch('/api/pos/complete-sale', {
  method: 'POST',
  body: JSON.stringify({
    items: [...],
    payment: {...},
    idempotencyKey
  })
});
// Returns: { success: true, sale: { id: "sale-123" } }

// Network error, retry with same key
const response2 = await fetch('/api/pos/complete-sale', {
  method: 'POST',
  body: JSON.stringify({
    items: [...],
    payment: {...},
    idempotencyKey // Same key
  })
});
// Returns: 409 Conflict (duplicate detected)
// Client knows sale was already created
```

## Receipt Generation

The response includes `receiptData` for printing or emailing.

### Text Receipt (Thermal Printer)

```typescript
import { generateTextReceipt } from '~/utils/receipt.generator';

const textReceipt = generateTextReceipt(response.receiptData, {
  businessName: 'Otra Ronda Más',
  businessAddress: '123 Main St, City',
  businessTaxId: 'CUIT-30-12345678-9',
  receiptNumber: response.sale.numeroComprobanteInterno,
  locale: 'es'
});

// Print to thermal printer
console.log(textReceipt);
```

### HTML Receipt (Email/Web)

```typescript
import { generateHTMLReceipt } from '~/utils/receipt.generator';

const htmlReceipt = generateHTMLReceipt(response.receiptData, {
  businessName: 'Otra Ronda Más',
  businessAddress: '123 Main St, City',
  businessTaxId: 'CUIT-30-12345678-9',
  receiptNumber: response.sale.numeroComprobanteInterno,
  locale: 'es'
});

// Send via email or display in browser
window.print();
```

## Inventory Synchronization

The sales endpoint automatically decrements inventory for each item.

### Rollback on Failure

If inventory update fails after sale creation, the sale is **not** rolled back (idempotency). Instead:

1. Sale is created in database
2. Inventory update fails
3. API returns 500 error
4. Client should notify user to retry or contact support
5. Manual inventory adjustment is required

### Manual Stock Adjustment

```typescript
// If inventory becomes out of sync
const response = await fetch('/api/pos/inventory/{productoId}/ajuste', {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${jwt}` },
  body: JSON.stringify({
    ajuste: -5, // Negative to decrease
    razon: 'Manual correction for sale #CMP-2024-0001'
  })
});
```

## Logging and Monitoring

All sales are logged for audit trails:

```typescript
{
  event: 'SALE_CREATED',
  saleId: 'sale-789',
  userId: 'user-123',
  tenantId: 'company-456',
  totalAmount: 100.00,
  paymentMethod: 'CASH',
  itemCount: 2,
  timestamp: '2024-01-15T10:30:00Z'
}
```

**No sensitive data** is logged:
- Card numbers are never logged
- CVV is never logged
- Passwords are never logged

## Testing

### Unit Tests

```bash
npm test -- pos.payment.test.ts
```

### Integration Tests

```bash
npm test -- pos.integration.spec.ts
```

### Manual Testing

1. Create a sale with cash payment
2. Verify receipt data is returned
3. Verify stock is decremented
4. Retry with same idempotency key, expect 409 Conflict
5. Test card payment (use test card numbers)
6. Test mixed payment
7. Test insufficient stock error

## Troubleshooting

### "Insufficient stock" error (409)

**Cause**: The requested quantity exceeds available stock.

**Solution**: 
- Check inventory levels
- Reduce quantity and retry
- Or contact store admin to adjust stock

### "Stock may be insufficient or idempotency key is duplicate" (409)

**Cause**: Either:
1. Stock became unavailable after quote
2. Same idempotency key submitted within 24 hours

**Solution**:
- Check sale history to see if sale was created
- If duplicate, retrieve the existing sale
- If stock issue, reduce quantity

### "Request timed out" (504)

**Cause**: API did not respond in time.

**Solution**:
1. Check if sale was actually created (check sales log)
2. If unsure, do not retry with same key yet
3. Wait a few seconds, then retry with same key
4. If still failing, contact support

### Card payment rejected (422)

**Cause**: Card details invalid (expired, format error, etc.)

**Solution**:
- Verify card details
- Try a different card
- Contact card issuer if persistent

## Production Deployment

### Before Going Live

1. **Test all payment methods** in staging
2. **Set up Redis** for idempotency cache (upgrade from in-memory)
3. **Configure payment processor** (if using external service)
4. **Set up audit logging** to CloudWatch/Datadog
5. **Review PCI compliance** checklist
6. **Set up error alerting** for 5xx errors

### Scaling Considerations

- In-memory idempotency cache only works with single-instance setup
- Upgrade to Redis for multi-instance deployment
- Monitor cache memory usage (TTL: 24 hours)
- Consider database storage for idempotency in high-volume scenarios

## Future Enhancements

- [ ] Redis-backed idempotency cache
- [ ] External payment processor integration (Stripe, Square, PayPal)
- [ ] Refund/return workflow
- [ ] Multiple currency support
- [ ] Discounts at sale level (not just item level)
- [ ] Tax rate calculation per jurisdiction
- [ ] Email receipt delivery
- [ ] Digital receipt with QR code
