# P11-1: Payment Gateway Architecture

## Overview

Payment Gateway for Wapsell provides a unified multi-provider abstraction layer for handling payments via:
- **PRIMARY**: Stripe (card, wallet payments)
- **FALLBACK**: MercadoPago (card, bank transfer, QR)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Payment Controller                     │
│  (REST endpoints, authorization, tenant validation)     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   Payment Service                        │
│  (Business logic, provider routing, multi-tenant)       │
└─────────────────────────────────────────────────────────┘
           ↙               ↓               ↘
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Stripe       │ │ MercadoPago  │ │ Prisma ORM   │
    │ Provider     │ │ Provider     │ │ Data Layer   │
    └──────────────┘ └──────────────┘ └──────────────┘
           ↓               ↓
   ┌───────────────────────────────┐
   │  External Payment Providers   │
   └───────────────────────────────┘
```

## Data Models

### Payment
Represents a payment transaction linked to a Venta (order).

**Fields**:
- `id`: Unique payment identifier (CUID)
- `empresaId`: Company ownership (tenant)
- `ventaId`: Associated order (FK → Venta)
- `monto`: Amount in currency units
- `moneda`: Currency code (ARS, USD, BRL)
- `proveedor`: Provider name (STRIPE | MERCADOPAGO)
- `providerPaymentId`: External provider payment ID
- `estado`: Payment status (PENDING | COMPLETED | FAILED | CANCELLED)
- `metodo`: Payment method (CARD | BANK_TRANSFER | QR | WALLET)
- `ultimosDigitos`: Last 4 digits of card (PCI-compliant, never full number)
- `createdAt`, `updatedAt`: Timestamps

**Indices**:
- `(empresaId, estado)` - Fast filtering by status
- `(ventaId)` - Reverse lookup from order
- `(empresaId, createdAt)` - Historical queries

### PaymentIntent
Intermediate record for payment creation flow (similar to Stripe's PaymentIntent pattern).

**Fields**:
- `id`: Intent ID (CUID)
- `empresaId`: Tenant
- `paymentId`: FK → Payment
- `clientSecret`: Client-safe secret for frontend
- `providerIntentId`: External provider intent ID
- `metadata`: JSON metadata (ventaId, clienteId, custom data)
- `expiresAt`: Intent expiration (15 minutes)

**Usage**:
1. Frontend creates intent via POST /pagos/intents → receives clientSecret
2. Frontend collects payment method (Stripe Elements, MP Wallet)
3. Frontend confirms payment via POST /pagos/confirm with clientSecret

### PaymentWebhook
Audit trail for all webhook events received from providers.

**Fields**:
- `id`: Webhook record ID
- `empresaId`: Tenant
- `tipo`: Event type (payment.success | payment.failed | refund.completed)
- `providerEventId`: Unique external event ID (prevents duplicates)
- `payload`: Raw JSON payload for debugging
- `processed`: Boolean flag (idempotency)
- `processedAt`: Timestamp when processed

**Idempotency**: `providerEventId` is unique → duplicate webhooks are ignored.

### Refund
Full or partial refund record.

**Fields**:
- `id`: Refund ID
- `empresaId`: Tenant
- `paymentId`: FK → Payment
- `monto`: Refund amount
- `razon`: Reason code (CUSTOMER_REQUEST | MISTAKE | FRAUD_SUSPECTED | OTHER)
- `estado`: Refund status (PENDING | COMPLETED | FAILED)
- `providerRefundId`: External refund ID

## REST Endpoints

### Payment Intent Management

#### POST /pagos/intents
Create a payment intent (Stripe or MercadoPago).

**Request**:
```json
{
  "ventaId": "venta_123",
  "monto": 10000,        // cents
  "moneda": "ARS",
  "metadata": {
    "productIds": ["p1", "p2"],
    "customData": "..."
  }
}
```

**Response**:
```json
{
  "paymentId": "pay_xyz",
  "clientSecret": "pi_test_..._secret_...",
  "monto": 100.0,
  "moneda": "ARS",
  "proveedor": "STRIPE"
}
```

**Validations**:
- Venta must exist and belong to requesting empresa ✓
- Amount must match venta.total ✓
- Only one PENDING payment allowed per venta ✓
- Requires `ventas.crear` permission ✓

---

#### POST /pagos/confirm
Confirm payment (charge the customer).

**Request**:
```json
{
  "clientSecret": "pi_test_..._secret_...",
  "stripeToken": "tok_visa",
  "metodo": "CARD",
  "ultimosDigitos": "4242"
}
```

**Response**:
```json
{
  "paymentId": "pay_xyz",
  "estado": "COMPLETED",
  "monto": 100.0
}
```

**Flow**:
1. Validate clientSecret exists and not expired (15 min TTL)
2. Route to appropriate provider (Stripe/MP)
3. Provider confirms payment
4. Update Payment record to COMPLETED
5. Return confirmation

**Error Handling**:
- Expired intent: BadRequestException (15 min TTL)
- Invalid secret: NotFoundException
- Payment failure: Update estado to FAILED

---

#### GET /pagos/:id
Get payment details.

**Response**:
```json
{
  "id": "pay_xyz",
  "empresaId": "emp_123",
  "ventaId": "venta_123",
  "monto": 100.0,
  "moneda": "ARS",
  "proveedor": "STRIPE",
  "estado": "COMPLETED",
  "metodo": "CARD",
  "ultimosDigitos": "4242",
  "createdAt": "2024-10-25T...",
  "refunds": [...]
}
```

---

#### GET /pagos
List payments (paginated, filtered by empresa).

**Query Params**:
- `skip`: Offset (default 0)
- `take`: Limit (default 20, max 100)
- `estado`: Filter by status (optional)

**Response**:
```json
{
  "data": [{ ...payment... }],
  "pagination": {
    "skip": 0,
    "take": 20,
    "total": 45
  }
}
```

---

### Refund Management

#### POST /pagos/:id/refund
Initiate refund.

**Request**:
```json
{
  "monto": 5000,  // cents
  "razon": "CUSTOMER_REQUEST",
  "notas": "Customer requested partial refund"
}
```

**Response**:
```json
{
  "refundId": "refund_abc",
  "estado": "COMPLETED",
  "monto": 50.0,
  "providerRefundId": "re_stripe_xyz"
}
```

**Validations**:
- Payment must be COMPLETED ✓
- Refund amount ≤ payment amount ✓
- Requires `ventas.reembolsar` permission ✓

---

#### GET /pagos/:id/refund
Get all refunds for a payment.

**Response**:
```json
[
  {
    "id": "refund_abc",
    "monto": 50.0,
    "razon": "CUSTOMER_REQUEST",
    "estado": "COMPLETED",
    "providerRefundId": "re_stripe_xyz",
    "createdAt": "2024-10-25T..."
  }
]
```

---

### Webhook Endpoints

#### POST /pagos/webhooks/stripe?empresaId=emp_123
Stripe webhook receiver.

**Headers**:
```
stripe-signature: t=1234567890,v1=...
```

**Payload** (varies):
```json
{
  "id": "evt_stripe",
  "type": "payment_intent.succeeded",
  "data": { "object": { "id": "pi_..." } }
}
```

**Processing**:
1. Extract `stripe-signature` header
2. Verify signature against `STRIPE_WEBHOOK_SECRET` (HMAC-SHA256)
3. Route event type to handler (payment.success, payment.failed, etc.)
4. Create PaymentWebhook record (audit trail)
5. Update Payment status if applicable
6. Mark webhook as processed

---

#### POST /pagos/webhooks/mercadopago?empresaId=emp_123
MercadoPago webhook receiver.

**Headers**:
```
x-signature: ts=1234567890,v1=...
```

**Payload**:
```json
{
  "id": "evt_mp",
  "action": "payment.success",
  "data": { "id": "mp_payment_..." }
}
```

**Processing**: Same as Stripe (uses `x-signature` header instead).

---

### Analytics

#### GET /pagos/analytics/daily
Daily revenue by date.

**Response**:
```json
[
  { "date": "2024-10-25", "monto": 5000.0 },
  { "date": "2024-10-24", "monto": 3500.0 }
]
```

---

#### GET /pagos/analytics/by-method
Payment breakdown by method.

**Response**:
```json
[
  { "metodo": "CARD", "count": 45, "monto": 50000.0 },
  { "metodo": "BANK_TRANSFER", "count": 12, "monto": 15000.0 },
  { "metodo": "QR", "count": 8, "monto": 5500.0 }
]
```

---

### Retry & Cancellation

#### POST /pagos/:id/retry
Retry a failed payment.

**Requires**: `ventas.editar` permission  
**Validations**: Payment.estado must be FAILED

---

#### POST /pagos/:id/cancel
Cancel a pending payment.

**Requires**: `ventas.eliminar` permission  
**Validations**: Payment.estado must be PENDING

---

## Provider Comparison

| Feature | Stripe | MercadoPago |
|---------|--------|-------------|
| **Payment Methods** | Card, Wallet | Card, Bank Transfer, QR |
| **Countries** | Global | LatAm (AR, BR, MX, etc.) |
| **Fees** | 2.9% + $0.30 | 2.49% (variable by country) |
| **Settlement** | 1 day | 1-2 days |
| **Fraud Tools** | SCA, 3D Secure | Built-in validation |
| **Webhook Format** | REST events | Webhooks + polling |
| **Testing** | test_ key prefix | Free test account |

**Fallback Strategy**:
```
User creates payment intent
  → Try Stripe.createPaymentIntent()
    ✓ Success → Return clientSecret
    ✗ Timeout/Error → Log & fallback
      → Try MercadoPago.createPaymentIntent()
        ✓ Success → Return clientSecret
        ✗ Both fail → Throw error to frontend
```

---

## Security

### PCI-DSS Compliance

1. **NO Card Storage**: Never log or store full card numbers
2. **Tokenization**: Only store last 4 digits + token from provider
3. **HTTPS Only**: All endpoints require SSL/TLS
4. **Secrets in Env**: STRIPE_SECRET_KEY, MERCADOPAGO_ACCESS_TOKEN never in code

### Webhook Signature Verification

**HMAC-SHA256 Verification**:

```typescript
// Stripe
signature = HMAC-SHA256(payload, STRIPE_WEBHOOK_SECRET)

// MercadoPago
signature = HMAC-SHA256(payload, MERCADOPAGO_WEBHOOK_SECRET)
```

Both verified before processing.

### Multi-Tenant Isolation

**Every endpoint enforces**:
1. `empresaId` from authenticated user's context
2. Verify payment.empresaId matches requesting empresa
3. Reject cross-tenant access with UnauthorizedException

**Example**:
```typescript
if (payment.empresaId !== requestingEmpresaId) {
  throw new UnauthorizedException('Cannot access this payment');
}
```

### Idempotency

- Payment intents: One PENDING per venta
- Webhooks: providerEventId prevents duplicate processing
- Refunds: Can retry, handled gracefully

---

## Environment Configuration

### .env.example

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_4eC39HqLyjWDarhtT657
STRIPE_PUBLISHABLE_KEY=pk_test_51234567890
STRIPE_WEBHOOK_SECRET=whsec_test_1234567890

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR_1234567890
MERCADOPAGO_PUBLIC_KEY=APP_USR_1234567890
MERCADOPAGO_WEBHOOK_TOKEN=webhook_token_secret

# Payment Config
PAYMENT_CURRENCY=ARS
PAYMENT_PROVIDER=STRIPE
PAYMENT_INTENT_TTL_MINUTES=15
```

---

## Testing

### Unit Tests

```bash
npm run test -- payment.service.spec.ts
```

### Integration Tests

```bash
npm run test:integration -- p11-1-payment.integration-spec.ts
```

**Coverage**:
- ✅ Stripe intent creation
- ✅ MercadoPago intent creation
- ✅ Payment confirmation (both providers)
- ✅ Refund processing
- ✅ Webhook signature verification
- ✅ Multi-tenant isolation
- ✅ Authorization checks
- ✅ Provider fallback logic
- ✅ Edge cases (zero amount, expired intent, etc.)

---

## Error Codes

| Code | Meaning | Recovery |
|------|---------|----------|
| **BadRequestException** | Invalid input (amount mismatch, expired intent) | Retry with correct data |
| **UnauthorizedException** | Cross-tenant access attempt | Verify empresaId |
| **NotFoundException** | Payment/intent not found | Check paymentId exists |
| **PaymentException** | Provider error (declined card, etc.) | Retry with different method |

---

## Webhook Event Types

### Stripe Events

- `payment_intent.succeeded` → Update Payment.estado = COMPLETED
- `payment_intent.payment_failed` → Update Payment.estado = FAILED
- `charge.refunded` → Update Refund.estado = COMPLETED

### MercadoPago Events

- `payment.success` → Update Payment.estado = COMPLETED
- `payment.failure` → Update Payment.estado = FAILED
- `refund.completed` → Update Refund.estado = COMPLETED

---

## Future Enhancements

- [ ] 3D Secure / SCA support
- [ ] Recurring payments / subscriptions
- [ ] Tokenized payments (save card for future)
- [ ] Multi-currency conversion
- [ ] Fraud detection integration
- [ ] Payment routing optimization (lowest fee by region)
- [ ] Payout management (settle to bank accounts)
- [ ] Advanced analytics (customer LTV, churn, etc.)

---

## Support

For issues or questions:
1. Check logs in PaymentWebhook table
2. Review provider dashboards (Stripe/MP)
3. Contact payment@wapsell.dev
