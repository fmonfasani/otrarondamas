# Tienda Payment & Order Services - Quick Start

## 5-Minute Setup

### 1. Environment Configuration

Add to your `.env.local`:
```env
# Mercado Pago (get from https://www.mercadopago.com)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1234567890123456789012345678901234567890
MERCADOPAGO_WEBHOOK_SECRET=webhook_secret_12345678901234567890

# Resend Email (get from https://resend.com)
RESEND_API_KEY=re_1234567890abcdef1234567890abcdef

# API URLs
VITE_API_URL=http://localhost:3000
```

### 2. Run Database Migration

```bash
# Ensure you're in the API workspace
cd apps/api

# Generate Prisma client
npm run prisma:generate

# Apply migration
npm run prisma:migrate -- --name "Add K3 Tienda models"

# Or if using the prepared migration:
npx prisma migrate deploy
```

### 3. Test the Integration

#### Create an Order
```bash
curl -X POST http://localhost:3000/api/tienda/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "items": [
      {
        "producto_id": "prod-123",
        "product_name": "Sample Product",
        "quantity": 2,
        "price": 99.99
      }
    ],
    "shipping_address": "123 Main Street",
    "shipping_city": "Buenos Aires",
    "shipping_postal_code": "1425",
    "shipping_country": "AR",
    "user_email": "customer@example.com"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "order": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "total": 199.98
  },
  "payment": {
    "preference_id": "mp-pref-id-123",
    "payment_url": "https://www.mercadopago.com/checkout/v1/redirect?pref_id=..."
  }
}
```

#### Get Order Details
```bash
curl -X GET http://localhost:3000/api/tienda/orders/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### List User Orders
```bash
curl -X GET "http://localhost:3000/api/tienda/orders?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Webhook Setup

#### For Mercado Pago Testing

1. Use ngrok to expose localhost:
```bash
ngrok http 3000
```

2. Register webhook in Mercado Pago dashboard:
```
URL: https://your-ngrok-id.ngrok.io/api/webhooks/mercadopago
```

3. Test webhook manually:
```bash
curl -X POST http://localhost:3000/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=TIMESTAMP,v1=SIGNATURE" \
  -d '{
    "id": "payment-id",
    "type": "payment",
    "action": "payment.completed",
    "data": {
      "id": "mp-payment-id-123"
    }
  }'
```

## File Structure

```
apps/wapsell-remix/app/
├── services/
│   ├── mercadopago.server.ts          # MP payment gateway integration
│   ├── mercadopago.test.ts            # MP tests (10 tests)
│   ├── tienda.server.ts               # Order service layer
│   ├── tienda.test.ts                 # Order tests (12 tests)
│   ├── tienda-emails.server.ts        # Email notification service
│   ├── TIENDA-INTEGRATION.md          # Full documentation
│   └── TIENDA-QUICKSTART.md           # This file
├── routes/
│   ├── api.tienda.create-order.ts     # POST /api/tienda/create-order
│   ├── api.tienda.orders.ts           # GET /api/tienda/orders
│   ├── api.tienda.orders.$orderId.ts  # GET /api/tienda/orders/:orderId
│   └── api.webhooks.mercadopago.ts    # POST /api/webhooks/mercadopago
└── utils/
    └── db.server.ts                   # Prisma client singleton

apps/api/prisma/
└── migrations/
    └── 20261029_k3_tienda_order_management/
        └── migration.sql              # Database schema
```

## Common Tasks

### Create Order Programmatically
```typescript
import { createOrder } from '~/services/tienda.server';

const order = await createOrder({
  user_id: 'user-123',
  empresa_id: 'empresa-456',
  items: [
    {
      producto_id: 'prod-1',
      product_name: 'Widget',
      quantity: 2,
      price: 99.99,
      discount: 10,
    },
  ],
  shipping_address: '123 Main St',
  shipping_city: 'Buenos Aires',
  shipping_postal_code: '1425',
  shipping_country: 'AR',
});

console.log(order.id); // "550e8400-..."
```

### Initialize Payment
```typescript
import { initPaymentPreference } from '~/services/mercadopago.server';

const payment = await initPaymentPreference(
  'order-123',
  [
    {
      id: 'prod-1',
      title: 'Widget',
      quantity: 2,
      unit_price: 99.99,
      currency_id: 'ARS',
    },
  ],
  10,    // shipping_cost
  209.98 // total
);

// Redirect user to payment_url
window.location.href = payment.payment_url;
```

### Send Confirmation Email
```typescript
import { sendOrderConfirmationEmail } from '~/services/tienda-emails.server';

await sendOrderConfirmationEmail({
  order: orderWithItems,
  userEmail: 'customer@example.com',
  userName: 'John Doe',
  companyName: 'My Store',
});
```

### Update Order Status After Payment
```typescript
import { updateOrderStatus } from '~/services/tienda.server';

await updateOrderStatus('order-123', 'processing', 'empresa-456');
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Tests
```bash
npm test -- tienda.test.ts
npm test -- mercadopago.test.ts
```

### Watch Mode
```bash
npm test -- --watch
```

## Troubleshooting

### Issue: "Mercado Pago access token not configured"
**Solution:** Add `MERCADOPAGO_ACCESS_TOKEN` to `.env.local`

### Issue: "User not found or does not belong to this empresa"
**Solution:** Verify the user_id matches the authenticated user and belongs to the empresa

### Issue: Webhook not processed
**Solution:** Check webhook signature verification:
1. Ensure `MERCADOPAGO_WEBHOOK_SECRET` is correct
2. Verify webhook headers include `x-signature`
3. Check timestamp is within 5 minutes

### Issue: Idempotency key not working
**Solution:** Ensure you're using the same UUID across requests:
```javascript
const key = crypto.randomUUID(); // Generate once
// Use same key in multiple requests
```

## Security Checklist

- [ ] `MERCADOPAGO_ACCESS_TOKEN` is secret (not in version control)
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` is secret (not in version control)
- [ ] `RESEND_API_KEY` is secret (not in version control)
- [ ] Webhook endpoint is public (no JWT required)
- [ ] Webhook signature always verified
- [ ] Order access checks `usuarioId` and `empresaId`
- [ ] No PII in logs except for support purposes
- [ ] Payment method never stored (MP handles PCI)

## Performance Tips

1. **Use indexes**: Queries use indexed fields (empresaId, status, createdAt)
2. **Pagination**: Always use limit/offset for listing
3. **Caching**: Consider caching order details in Redis
4. **Batch operations**: Use Prisma batch queries for multiple orders
5. **Webhook async**: Process webhooks asynchronously (use Kafka/job queue)

## Next Steps

1. **Implement refunds**: Add refund handling and reverse webhooks
2. **Add Stripe**: Support additional payment gateways
3. **Fulfillment**: Connect with warehouse/logistics systems
4. **Analytics**: Track orders, revenue, customer metrics
5. **Customer support**: Order returns, disputes, support tickets

## Support

For issues or questions:
1. Check `TIENDA-INTEGRATION.md` for detailed documentation
2. Review test files for usage examples
3. Check logs for error messages
4. Verify environment configuration

## References

- [Mercado Pago API](https://developers.mercadopago.com/)
- [Resend Email API](https://resend.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Remix Framework](https://remix.run/docs)
