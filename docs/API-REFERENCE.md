# REST API Reference

Complete API documentation for Wapsell platform endpoints.

## Table of Contents

1. [Authentication](#authentication)
2. [Response Format](#response-format)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Core Resources](#core-resources)
6. [Webhooks](#webhooks)

## Authentication

All API endpoints require a valid JWT token in the `Authorization` header.

### Obtaining a Token

**Endpoint**: `POST /api/auth/login`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "nombre": "John Doe",
    "empresaId": "company-uuid",
    "roles": ["vendedor", "admin"]
  },
  "expiresIn": 3600
}
```

### Using Token in Requests

All subsequent requests must include the token:

```bash
curl -H "Authorization: Bearer <token>" \
  https://api.wapsell.com/api/productos
```

### Token Refresh

**Endpoint**: `POST /api/auth/refresh`

**Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

### Logout

**Endpoint**: `POST /api/auth/logout`

**Response (200 OK)**:
```json
{
  "message": "Logged out successfully"
}
```

## Response Format

### Success Response

All successful responses follow this format:

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": "uuid",
    "nombre": "Product Name",
    "precio": 99.99,
    "stock": 50
  },
  "timestamp": "2026-10-25T10:30:00Z"
}
```

### Paginated Response

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": [
    { "id": "uuid", "nombre": "Product 1" },
    { "id": "uuid", "nombre": "Product 2" }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  },
  "timestamp": "2026-10-25T10:30:00Z"
}
```

## Error Handling

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "INVALID_FORMAT"
    }
  ],
  "timestamp": "2026-10-25T10:30:00Z",
  "requestId": "req-uuid"
}
```

### Common Error Codes

| HTTP | Error Code | Meaning |
|------|-----------|---------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | User lacks required permissions |
| 404 | NOT_FOUND | Resource does not exist |
| 409 | CONFLICT | Resource already exists or state conflict |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error (contact support) |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable |

### Example Errors

**Invalid Email (400)**:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Must be a valid email",
      "code": "INVALID_EMAIL"
    }
  ]
}
```

**Insufficient Stock (409)**:
```json
{
  "statusCode": 409,
  "message": "Insufficient stock",
  "error": "INSUFFICIENT_STOCK",
  "details": {
    "productId": "prod-uuid",
    "requested": 100,
    "available": 50
  }
}
```

**Rate Limited (429)**:
```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "error": "RATE_LIMITED",
  "retryAfter": 60
}
```

## Rate Limiting

Rate limiting is enforced per IP address and per user.

### Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Standard API | 100 req/s | Per IP |
| Auth endpoints | 10 req/s | Per IP |
| Upload endpoints | 5 req/s | Per IP |
| Search | 50 req/s | Per user |

### Rate Limit Headers

Responses include rate limit information:

```
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 1698000060
```

## Core Resources

### Products

#### List Products

**Endpoint**: `GET /api/productos`

**Query Parameters**:
- `page` (int, default 1): Page number
- `limit` (int, default 20, max 100): Items per page
- `familia` (string): Filter by product family
- `buscar` (string): Search by name
- `activo` (boolean): Filter by active status

**Response (200)**:
```json
{
  "data": [
    {
      "id": "prod-uuid",
      "nombre": "Producto A",
      "descripcion": "Descripción del producto",
      "precio": 99.99,
      "precioOriginal": 129.99,
      "familia": "familia-uuid",
      "stock": 50,
      "activo": true,
      "imagen": "https://cdn.example.com/prod.jpg",
      "createdAt": "2026-10-20T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 250,
    "page": 1,
    "pageSize": 20,
    "totalPages": 13
  }
}
```

#### Create Product

**Endpoint**: `POST /api/productos`

**Body**:
```json
{
  "nombre": "Nuevo Producto",
  "descripcion": "Descripción del producto",
  "precio": 99.99,
  "precioOriginal": 129.99,
  "familiaId": "familia-uuid",
  "stock": 100,
  "sku": "SKU-001",
  "imagen": "base64-or-url"
}
```

**Response (201)**:
```json
{
  "id": "prod-uuid",
  "nombre": "Nuevo Producto",
  "precio": 99.99,
  "stock": 100,
  "createdAt": "2026-10-25T10:00:00Z"
}
```

#### Get Product by ID

**Endpoint**: `GET /api/productos/{id}`

**Response (200)**:
```json
{
  "id": "prod-uuid",
  "nombre": "Producto A",
  "descripcion": "Full description",
  "precio": 99.99,
  "stock": 50,
  "familia": {
    "id": "familia-uuid",
    "nombre": "Family Name"
  },
  "createdBy": "user-uuid",
  "createdAt": "2026-10-20T10:00:00Z",
  "updatedAt": "2026-10-25T10:00:00Z"
}
```

### Sales Orders (Ventas)

#### Create Sales Order

**Endpoint**: `POST /api/ventas`

**Body**:
```json
{
  "clienteId": "cliente-uuid",
  "items": [
    {
      "productoId": "prod-uuid",
      "cantidad": 5,
      "precioUnitario": 99.99
    }
  ],
  "descuento": 10,
  "metodoPago": "efectivo",
  "observaciones": "Special instructions"
}
```

**Response (201)**:
```json
{
  "id": "venta-uuid",
  "numero": "V-001234",
  "cliente": {
    "id": "cliente-uuid",
    "nombre": "Cliente Name"
  },
  "items": [
    {
      "id": "item-uuid",
      "producto": {
        "id": "prod-uuid",
        "nombre": "Producto A"
      },
      "cantidad": 5,
      "precioUnitario": 99.99,
      "subtotal": 499.95
    }
  ],
  "subtotal": 499.95,
  "descuento": 10,
  "total": 489.95,
  "estado": "completada",
  "createdAt": "2026-10-25T10:00:00Z"
}
```

#### List Sales Orders

**Endpoint**: `GET /api/ventas`

**Query Parameters**:
- `page` (int, default 1)
- `limit` (int, default 20)
- `estado` (string): Filter by status (pendiente, completada, cancelada)
- `desde` (date): Start date filter
- `hasta` (date): End date filter
- `clienteId` (string): Filter by client

**Response (200)**:
```json
{
  "data": [
    {
      "id": "venta-uuid",
      "numero": "V-001234",
      "cliente": "Cliente Name",
      "total": 489.95,
      "estado": "completada",
      "createdAt": "2026-10-25T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 500,
    "page": 1,
    "pageSize": 20,
    "totalPages": 25
  }
}
```

#### Get Sales Order by ID

**Endpoint**: `GET /api/ventas/{id}`

**Response (200)**:
Full sales order with all items and details.

#### Update Sales Order

**Endpoint**: `PATCH /api/ventas/{id}`

**Body** (partial update):
```json
{
  "estado": "cancelada",
  "observaciones": "Updated note"
}
```

### Customers (Clientes)

#### Create Customer

**Endpoint**: `POST /api/clientes`

**Body**:
```json
{
  "nombre": "Customer Name",
  "email": "customer@example.com",
  "telefono": "+34 600 123 456",
  "cedula": "12345678A",
  "domicilio": "Calle 123",
  "ciudad": "Madrid",
  "codigoPostal": "28001",
  "activo": true
}
```

**Response (201)**:
```json
{
  "id": "cliente-uuid",
  "nombre": "Customer Name",
  "email": "customer@example.com",
  "telefono": "+34 600 123 456",
  "totalCompras": 0,
  "createdAt": "2026-10-25T10:00:00Z"
}
```

#### List Customers

**Endpoint**: `GET /api/clientes`

**Query Parameters**:
- `page`, `limit`: Pagination
- `buscar`: Search by name/email
- `activo`: Filter by status

### Inventory

#### Get Stock Level

**Endpoint**: `GET /api/inventario/{productId}`

**Response (200)**:
```json
{
  "productId": "prod-uuid",
  "productoNombre": "Producto A",
  "stock": 50,
  "stockMinimo": 10,
  "stockMaximo": 500,
  "movimientos": [
    {
      "id": "mov-uuid",
      "tipo": "entrada",
      "cantidad": 20,
      "razon": "compra",
      "fecha": "2026-10-20T10:00:00Z"
    }
  ]
}
```

#### Update Stock

**Endpoint**: `POST /api/inventario/{productId}/ajuste`

**Body**:
```json
{
  "cantidad": 20,
  "tipo": "entrada",
  "razon": "compra",
  "referencia": "OC-001"
}
```

### Payments

#### Get Payment Methods

**Endpoint**: `GET /api/pagos/metodos`

**Response (200)**:
```json
{
  "data": [
    {
      "id": "metodo-uuid",
      "nombre": "Efectivo",
      "tipo": "cash",
      "activo": true
    },
    {
      "id": "metodo-uuid",
      "nombre": "Tarjeta de Crédito",
      "tipo": "card",
      "activo": true
    },
    {
      "id": "metodo-uuid",
      "nombre": "Stripe",
      "tipo": "stripe",
      "activo": true
    }
  ]
}
```

#### Process Payment

**Endpoint**: `POST /api/pagos/procesar`

**Body**:
```json
{
  "ventaId": "venta-uuid",
  "monto": 489.95,
  "metodoPago": "tarjeta",
  "referencia": "stripe-charge-id"
}
```

**Response (201)**:
```json
{
  "id": "pago-uuid",
  "ventaId": "venta-uuid",
  "monto": 489.95,
  "estado": "procesado",
  "metodoPago": "tarjeta",
  "createdAt": "2026-10-25T10:00:00Z"
}
```

### Analytics & Reporting

#### Sales Summary

**Endpoint**: `GET /api/analytics/ventas`

**Query Parameters**:
- `desde` (date): Start date
- `hasta` (date): End date
- `agruparPor` (string): Group by (dia, semana, mes)

**Response (200)**:
```json
{
  "periodo": {
    "desde": "2026-10-01",
    "hasta": "2026-10-31"
  },
  "resumen": {
    "totalVentas": 15000.50,
    "cantidadOrdenes": 120,
    "ventaPromedio": 125.00,
    "ventaMaxima": 500.00
  },
  "porDia": [
    {
      "fecha": "2026-10-01",
      "total": 500.00,
      "ordenes": 5
    }
  ]
}
```

#### Inventory Status

**Endpoint**: `GET /api/analytics/inventario`

**Response (200)**:
```json
{
  "totalProductos": 250,
  "stockTotal": 5000,
  "porDebajoDeMinimoId": 15,
  "articulosSinStock": 5,
  "rotacionPromedio": 0.85,
  "topProductos": [
    {
      "id": "prod-uuid",
      "nombre": "Top Seller",
      "ventas": 150,
      "ingresos": 15000
    }
  ]
}
```

### Real-time Updates (WebSocket)

#### Connect to WebSocket

```javascript
const socket = io('https://api.wapsell.com', {
  auth: {
    token: 'jwt-token'
  }
});

// Subscribe to sales updates
socket.on('venta:nueva', (data) => {
  console.log('New sale:', data);
});

// Subscribe to stock updates
socket.on('stock:cambio', (data) => {
  console.log('Stock changed:', data);
});

// Subscribe to payment updates
socket.on('pago:completado', (data) => {
  console.log('Payment processed:', data);
});
```

#### Available Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `venta:nueva` | New sales order created | {ventaId, numero, total} |
| `venta:actualizada` | Sales order updated | {ventaId, estado} |
| `stock:cambio` | Inventory updated | {productId, anteriorStock, nuevoStock} |
| `pago:completado` | Payment processed | {pagoId, ventaId, monto} |
| `cliente:nuevo` | New customer added | {clienteId, nombre} |

## Webhooks

### Payment Webhooks

#### Stripe Webhook

**Endpoint**: `POST /api/pagos/webhooks/stripe`

**Headers**:
```
Stripe-Signature: t=timestamp,v1=signature
```

**Payload (payment.success)**:
```json
{
  "id": "evt_uuid",
  "type": "charge.succeeded",
  "data": {
    "object": {
      "id": "ch_uuid",
      "amount": 48995,
      "currency": "eur",
      "metadata": {
        "ventaId": "venta-uuid"
      }
    }
  }
}
```

#### MercadoPago Webhook

**Endpoint**: `POST /api/pagos/webhooks/mercadopago`

**Payload (payment.success)**:
```json
{
  "id": 12345678,
  "type": "payment",
  "data": {
    "id": "mp_uuid"
  },
  "action": "payment.created"
}
```

### Webhook Retries

- Failed webhooks are retried up to 5 times
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Maximum retry window: 24 hours

### Webhook Signature Validation

Always validate webhook signatures to ensure authenticity:

```typescript
import crypto from 'crypto';

function validateStripeSignature(payload, signature, secret) {
  const timestamp = signature.split(',')[0].split('=')[1];
  const hash = signature.split(',')[1].split('=')[1];
  
  const signedContent = `${timestamp}.${payload}`;
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');
  
  return hash === expectedHash;
}
```

## API Versioning

Current API version: **v1**

All endpoints are under `/api/v1` (or `/api` for current version).

### Deprecation Policy

- Deprecated endpoints receive 12-month notice
- Version header: `API-Version: 1`
- Latest version always available at `/api`

## SDK Support

### Official SDKs

- **JavaScript/TypeScript**: `@wapsell/sdk`
- **Python**: `wapsell-python`
- **PHP**: `wapsell-php`

### Example Usage

```typescript
import { WapsellClient } from '@wapsell/sdk';

const client = new WapsellClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.wapsell.com'
});

// Get products
const products = await client.productos.list({
  page: 1,
  limit: 20
});

// Create sales order
const venta = await client.ventas.create({
  clienteId: 'cliente-uuid',
  items: [...]
});
```

## Pagination Best Practices

For large datasets, use cursor-based pagination:

```
GET /api/productos?cursor=abc123&limit=20
```

Response includes `nextCursor` for fetching next page.

## Date/Time Format

All dates use ISO 8601 format with UTC timezone:

```
2026-10-25T10:30:00Z
```

For query parameters, accept both ISO 8601 and simple date:

```
GET /api/ventas?desde=2026-10-01&hasta=2026-10-31
GET /api/ventas?desde=2026-10-01T00:00:00Z&hasta=2026-10-31T23:59:59Z
```

## Frequently Asked Questions

**Q: How long is JWT token valid?**
A: 3600 seconds (1 hour). Use refresh endpoint to get new token.

**Q: What's the maximum request size?**
A: 100MB for uploads, 1MB for JSON payloads.

**Q: Can I get data from multiple companies?**
A: No, API automatically scopes results to authenticated user's company.

**Q: How do I handle pagination for large datasets?**
A: Use `limit` parameter (max 100) and iterate through `page` numbers.

**Q: Is there API documentation in Postman format?**
A: Yes, download OpenAPI schema from `/api-docs` endpoint.
