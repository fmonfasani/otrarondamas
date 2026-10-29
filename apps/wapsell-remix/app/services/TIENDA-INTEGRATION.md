# Tienda Payment & Order Services Integration Guide

## Overview

The Tienda Payment & Order Services provide a complete e-commerce order management system with Mercado Pago payment processing, webhook handling, email notifications, and multi-tenant isolation.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Application                    │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
   ┌────▼─────────────┐    ┌────────▼──────────────┐
   │ Order Creation   │    │ Order Retrieval      │
   │ API              │    │ API                  │
   └────┬─────────────┘    └────────┬──────────────┘
        │                           │
        │                      POST /api/tienda/create-order
        │                      GET  /api/tienda/orders
        │                      GET  /api/tienda/orders/:orderId
        │
   ┌────▼────────────────────────────────────────────┐
   │         Tienda Order Service Layer              │
   │  (tienda.server.ts)                             │
   │  - createOrder()                                │
   │  - getOrder()                                   │
   │  - updateOrderStatus()                          │
   │  - cancelOrder()                                │
   └────┬─────────────────────────────────┬──────────┘
        │                                 │
   ┌────▼──────────────┐    ┌───────────▼────────┐
   │ Mercado Pago      │    │ Database           │
   │ Service           │    │ (Prisma ORM)       │
   │ (mercadopago.     │    │                    │
   │  server.ts)       │    │ Models:            │
   │                   │    │ - TiendaOrder      │
   │ - Init Payment    │    │ - TiendaOrderItem  │
   │ - Verify Sig      │    │ - TiendaPayment    │
   │ - Get Status      │    │ - TiendaWebhookLog │
   │ - Idempotency     │    │                    │
   └────┬──────────────┘    └────────────────────┘
        │
        │ payment_url
        │
   ┌────▼──────────────────────────┐
   │  Mercado Pago Checkout         │
   │  (User pays)                   │
   └────┬──────────────────────────┘
        │
        │ payment.completed webhook
        │
   ┌────▼──────────────────────────────────────┐
   │  Webhook Handler                           │
   │  POST /api/webhooks/mercadopago           │
   │                                            │
   │  - Verify signature                        │
   │  - Check idempotency                       │
   │  - Update order status → "processing"      │
   │  - Send confirmation email                 │
   │  - Trigger fulfillment                     │
   └────────────────────────────────────────────┘
```

## API Endpoints

### 1. Create Order
**Endpoint:** `POST /api/tienda/create-order`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "items": [
    {
      "producto_id": "prod-123",
      "product_name": "Widget Pro",
      "quantity": 2,
      "price": 99.99,
      "discount": 10.00
    }
  ],
  "shipping_address": "123 Main Street",
  "shipping_city": "Buenos Aires",
  "shipping_postal_code": "1425",
  "shipping_country": "AR",
  "notes": "Leave at door",
  "user_email": "customer@example.com",
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "order": {
    "id": "order-uuid",
    "status": "pending",
    "total": 209.98,
    "subtotal": 199.98,
    "shippingCost": 10.00,
    "taxAmount": 0.00,
    "items": [
      {
        "id": "item-uuid",
        "productoId": "prod-123",
        "productName": "Widget Pro",
        "quantity": 2,
        "price": 99.99,
        "discount": 10.00
      }
    ],
    "shippingAddress": "123 Main Street",
    "createdAt": "2024-10-29T12:00:00Z"
  },
  "payment": {
    "preference_id": "mp-pref-id",
    "payment_url": "https://www.mercadopago.com/checkout/v1/redirect?pref_id=mp-pref-id"
  },
  "timestamp": "2024-10-29T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Missing/invalid fields
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: No business context
- `409 Conflict`: Duplicate idempotency key
- `422 Unprocessable`: Validation failed
- `504 Gateway Timeout`: Mercado Pago API timeout

### 2. Get Order
**Endpoint:** `GET /api/tienda/orders/:orderId`

**Authentication:** Required (JWT)

**Response (200):**
```json
{
  "success": true,
  "order": {
    "id": "order-uuid",
    "status": "processing",
    "total": 209.98,
    "subtotal": 199.98,
    "shippingCost": 10.00,
    "taxAmount": 0.00,
    "items": [...],
    "payments": [
      {
        "id": "payment-uuid",
        "paymentId": "mp-payment-id",
        "method": "mercadopago",
        "amount": 209.98,
        "status": "completed",
        "verifiedAt": "2024-10-29T12:05:00Z"
      }
    ],
    "trackingNumber": "MP123456789AR",
    "createdAt": "2024-10-29T12:00:00Z",
    "updatedAt": "2024-10-29T12:05:00Z"
  }
}
```

### 3. List Orders
**Endpoint:** `GET /api/tienda/orders?limit=20&offset=0`

**Authentication:** Required (JWT)

**Query Parameters:**
- `limit` (optional): Number of orders to return (default: 20, max: 100)
- `offset` (optional): Number of orders to skip (default: 0)

**Response (200):**
```json
{
  "success": true,
  "orders": [
    {
      "id": "order-uuid",
      "status": "processing",
      "total": 209.98,
      "subtotal": 199.98,
      "shippingCost": 10.00,
      "taxAmount": 0.00,
      "itemCount": 1,
      "shippingAddress": "123 Main Street",
      "createdAt": "2024-10-29T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

## Webhook Handling

### Mercado Pago Webhook
**Endpoint:** `POST /api/webhooks/mercadopago`

**Public Endpoint** (no authentication required)

**Process:**
1. **Receive webhook** from Mercado Pago
2. **Verify signature** (prevent spoofing)
3. **Check idempotency** (prevent duplicate processing)
4. **Fetch payment status** from Mercado Pago
5. **Update order status**:
   - `approved` → order status = `processing`
   - `rejected` → order status = `pending` (can retry)
   - `cancelled` → order status = `cancelled`
6. **Send confirmation email**
7. **Trigger fulfillment workflow**

**Webhook Events:**
```json
{
  "id": "12345",
  "type": "payment",
  "action": "payment.completed",
  "data": {
    "id": "mp-payment-id"
  }
}
```

**Response (200):**
```json
{
  "status": "processed"
}
```

## Order Status Flow

```
┌─────────┐
│ pending │  (Initial state after order creation)
└────┬────┘
     │ Payment received & verified
     │
┌────▼──────────┐
│ processing    │  (Fulfillment in progress)
└────┬──────────┘
     │ Shipped
     │
┌────▼────────┐
│ shipped     │  (In transit)
└────┬────────┘
     │ Delivered
     │
┌────▼─────────┐
│ delivered    │  (Final state)
└──────────────┘

Alternative flows:
pending → cancelled (user cancellation)
pending → cancelled (payment failed/timeout)
```

## Idempotency

### Implementation
- **UUID-based keys**: Client generates `idempotency_key` (UUID v4)
- **Storage**: In-memory Map (should use Redis for distributed systems)
- **Expiry**: 24 hours
- **Behavior**: Same key returns cached order_id, prevents duplicate orders

### Usage Example
```javascript
const idempotencyKey = crypto.randomUUID();

const response = await fetch('/api/tienda/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [...],
    shipping_address: '...',
    idempotency_key: idempotencyKey,  // Prevents duplicates
  }),
});
```

## Signature Verification

### Mercado Pago Signature Format
```
Header: x-signature
Value: ts=TIMESTAMP,v1=SIGNATURE
```

### Verification Process
1. Extract timestamp and signature from header
2. Validate timestamp (not older than 5 minutes)
3. Create request string: `${payment_id}:${timestamp}:${webhook_secret}`
4. Generate HMAC-SHA256 of request string
5. Compare with received signature

## Database Schema

### TiendaOrder
```prisma
model TiendaOrder {
  id              String
  empresaId       String         // Multi-tenant scoping
  usuarioId       String         // User who placed order
  status          String         // pending|processing|shipped|delivered|cancelled
  
  total           Decimal        // Final total
  subtotal        Decimal        // Before tax/shipping
  shippingCost    Decimal
  taxAmount       Decimal
  
  shippingAddress String
  shippingCity    String?
  shippingPostalCode String?
  shippingCountry String?
  
  paymentMethod   String?        // mercadopago|stripe|bank_transfer
  trackingNumber  String?
  
  notes           String?
  
  createdAt       DateTime
  updatedAt       DateTime
  
  items           TiendaOrderItem[]
  payments        TiendaPayment[]
  webhookLogs     TiendaWebhookLog[]
}
```

### TiendaOrderItem
```prisma
model TiendaOrderItem {
  id              String
  orderId         String         // FK to TiendaOrder
  productoId      String
  productName     String
  quantity        Int
  price           Decimal
  discount        Decimal
  createdAt       DateTime
}
```

### TiendaPayment
```prisma
model TiendaPayment {
  id              String
  orderId         String         // FK to TiendaOrder
  paymentId       String         // MP payment ID (unique)
  method          String         // mercadopago
  amount          Decimal
  status          String         // pending|completed|failed|cancelled
  verifiedAt      DateTime?      // When MP signature verified
  processedAt     DateTime?
  externalData    Json?          // MP response metadata
  createdAt       DateTime
  updatedAt       DateTime
}
```

### TiendaWebhookLog
```prisma
model TiendaWebhookLog {
  id              String
  orderId         String?        // FK to TiendaOrder (null if order not matched)
  eventType       String         // payment.completed|payment.failed
  payload         Json           // Full webhook payload
  signature       String?        // For idempotency
  processed       Boolean        // Whether webhook was processed
  processedAt     DateTime?
  createdAt       DateTime
}
```

## Email Notifications

### Templates

#### Order Confirmation
Sent immediately after order creation.

**Content:**
- Order ID and date
- Item list (product, qty, price, discount, total)
- Subtotal, shipping, tax, total
- Shipping address

#### Payment Successful
Sent when payment is verified.

**Content:**
- Success confirmation
- Order and payment IDs
- Amount paid
- Expected processing timeline

#### Order Shipped
Sent when order status → `shipped`.

**Content:**
- Tracking number
- Tracking URL
- Estimated delivery (5-7 business days)

#### Order Delivered
Sent when order status → `delivered`.

**Content:**
- Delivery confirmation
- Delivery date
- Support contact info

## Security Considerations

### Multi-Tenant Isolation
- All queries filter by `empresaId` and `usuarioId`
- Orders can only be accessed by the owning user
- Webhook events verified with MP signature

### Signature Verification
- Every webhook must have valid MP signature
- Timestamp validation prevents replay attacks
- Invalid signatures return 403 Forbidden

### Idempotency
- Prevents duplicate order creation
- 24-hour expiry prevents stale cache
- Should migrate to Redis for distributed systems

### Payment Security
- NO direct card storage (Mercado Pago handles PCI)
- Payment IDs are unique (payment_id field)
- Payment status verified from MP API

## Error Handling

### Status Codes
- **200 OK**: Request successful
- **201 Created**: Order created
- **400 Bad Request**: Missing/invalid fields
- **401 Unauthorized**: Not authenticated
- **403 Forbidden**: Invalid signature/tenant mismatch
- **404 Not Found**: Order not found
- **405 Method Not Allowed**: Wrong HTTP method
- **409 Conflict**: Duplicate idempotency key
- **422 Unprocessable**: Validation failed
- **500 Internal Server Error**: Server error
- **504 Gateway Timeout**: External service timeout

### Error Response Format
```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": "Additional context (if applicable)"
}
```

## Testing

### Unit Tests
- Order creation validation
- Order status transitions
- Payment signature verification
- Idempotency key management
- Error handling

### Integration Tests
- Create order → Mercado Pago initialization
- Webhook received → Order status updated
- Duplicate webhook → Idempotency prevents double processing
- Payment failed → Order remains pending

### Test Commands
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tienda.test.ts
npm test -- mercadopago.test.ts

# Watch mode
npm test -- --watch
```

## Configuration

### Environment Variables
```env
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=your_access_token
MERCADOPAGO_WEBHOOK_SECRET=your_webhook_secret

# Email Service
RESEND_API_KEY=your_resend_api_key

# Application
VITE_API_URL=http://localhost:3000
NODE_ENV=development
```

### Mercado Pago Setup
1. Create account at https://www.mercadopago.com
2. Get Access Token from settings
3. Register webhook URL: `https://yourdomain.com/api/webhooks/mercadopago`
4. Copy Webhook Secret

### Resend Setup
1. Create account at https://resend.com
2. Get API Key from settings
3. Verify sender email domain

## Monitoring & Logging

### Logs to Monitor
- Order creation success/failure
- Payment initialization success/failure
- Webhook reception and processing
- Payment status verification
- Email sending success/failure

### Key Metrics
- Orders created per hour
- Payment success rate
- Webhook processing latency
- Email delivery rate

### Alerts
- Failed payment initializations
- Invalid webhook signatures
- Database errors
- Email service failures

## Future Enhancements

1. **Distributed Idempotency**: Migrate to Redis for multi-instance deployments
2. **Refunds**: Implement refund handling and reverse webhooks
3. **Multiple Payment Gateways**: Add Stripe, bank transfer options
4. **Order Tracking**: Real-time tracking number updates
5. **Analytics**: Dashboard for order metrics and trends
6. **Fulfillment Integration**: Connect with warehouse/logistics systems
7. **Customer Support**: Order history, support tickets, returns
8. **Mobile App**: Native order management and push notifications
