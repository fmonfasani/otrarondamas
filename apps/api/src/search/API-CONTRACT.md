# P14-1: Search API Contract

## Base URL

```
/search
```

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Endpoints

### 1. Search Products

**Endpoint:** `GET /search/products`

**Description:** Full-text search across products with faceted filtering.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| q | string | No | - | Search term (searches name, description, tags) |
| familia | string | No | - | Filter by product family ID |
| priceMin | number | No | - | Minimum price filter |
| priceMax | number | No | - | Maximum price filter |
| sort | string | No | relevance | Sort order: `relevance`, `price_asc`, `price_desc`, `date_asc`, `date_desc` |
| page | number | No | 1 | Page number (1-indexed) |
| limit | number | No | 20 | Results per page (max 100) |

**Request Example:**

```bash
GET /search/products?q=laptop&familia=electronics&priceMin=500&priceMax=2000&sort=price_asc&page=1&limit=20

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "prod-123",
      "empresaId": "empresa-456",
      "nombre": "Laptop Dell XPS 13",
      "descripcion": "High performance ultrabook with Intel Core i7",
      "precio": 1299.99,
      "stock": 5,
      "familiaId": "familia-001",
      "familiaName": "Computers",
      "imagen": "https://cdn.example.com/products/dell-xps.jpg",
      "tags": ["laptop", "ultrabook", "windows"],
      "activo": true,
      "createdAt": "2026-10-15T10:30:00Z",
      "updatedAt": "2026-10-20T14:45:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "hasMore": true,
  "facets": {
    "familias": [
      { "key": "Computers", "count": 25 },
      { "key": "Accessories", "count": 12 },
      { "key": "Software", "count": 5 }
    ],
    "priceRanges": [
      { "key": "$0 - $50", "count": 8 },
      { "key": "$50 - $100", "count": 12 },
      { "key": "$100 - $500", "count": 15 },
      { "key": "$500+", "count": 7 }
    ]
  }
}
```

**Error Responses:**

```json
400 Bad Request
{
  "statusCode": 400,
  "message": "At least one search criterion (q, familia, priceMin, priceMax) is required"
}
```

```json
401 Unauthorized
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

### 2. Search Orders

**Endpoint:** `GET /search/orders`

**Description:** Search and filter order history.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| q | string | No | - | Search term (order number or client name) |
| estado | string | No | - | Filter by order status (e.g., "completado", "pendiente") |
| dateFrom | string | No | - | Start date (ISO 8601 format: YYYY-MM-DD) |
| dateTo | string | No | - | End date (ISO 8601 format: YYYY-MM-DD) |
| page | number | No | 1 | Page number (1-indexed) |
| limit | number | No | 20 | Results per page (max 100) |

**Request Example:**

```bash
GET /search/orders?q=john&estado=completado&dateFrom=2026-10-01&dateTo=2026-10-31&page=1&limit=20

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "order-789",
      "empresaId": "empresa-456",
      "numero": 12345,
      "fecha": "2026-10-15",
      "total": 599.99,
      "estado": "completado",
      "clienteNombre": "John Doe",
      "clienteEmail": "john@example.com",
      "items": [
        {
          "productoNombre": "Laptop Dell XPS 13",
          "cantidad": 1
        },
        {
          "productoNombre": "USB-C Cable",
          "cantidad": 2
        }
      ],
      "createdAt": "2026-10-15T10:30:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20,
  "hasMore": false,
  "facets": {
    "status": [
      { "key": "completado", "count": 10 },
      { "key": "pendiente", "count": 4 },
      { "key": "cancelado", "count": 1 }
    ]
  }
}
```

**Error Responses:**

```json
400 Bad Request
{
  "statusCode": 400,
  "message": "At least one search criterion (q, estado, dateFrom, dateTo) is required"
}
```

---

### 3. Get Facets

**Endpoint:** `GET /search/facets/:index`

**Description:** Get available filter options for products or orders index.

**Path Parameters:**

| Parameter | Type | Required | Values |
|-----------|------|----------|--------|
| index | string | Yes | `products` or `orders` |

**Request Examples:**

```bash
GET /search/facets/products
GET /search/facets/orders

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK) - Products:**

```json
{
  "familias": [
    { "key": "Computers", "count": 45 },
    { "key": "Accessories", "count": 32 },
    { "key": "Software", "count": 18 }
  ],
  "priceRanges": [
    { "key": "$0 - $50", "count": 25 },
    { "key": "$50 - $100", "count": 30 },
    { "key": "$100 - $500", "count": 28 },
    { "key": "$500+", "count": 12 }
  ]
}
```

**Response (200 OK) - Orders:**

```json
{
  "status": [
    { "key": "completado", "count": 145 },
    { "key": "pendiente", "count": 32 },
    { "key": "cancelado", "count": 8 }
  ]
}
```

**Error Responses:**

```json
400 Bad Request
{
  "statusCode": 400,
  "message": "Invalid index. Must be 'products' or 'orders'"
}
```

---

### 4. Reindex

**Endpoint:** `POST /search/reindex/:index`

**Description:** Rebuild the entire search index for products or orders. This is an asynchronous operation.

**Path Parameters:**

| Parameter | Type | Required | Values |
|-----------|------|----------|--------|
| index | string | Yes | `products` or `orders` |

**Authorization:** Admin access required (future enhancement with `@RequirePermission`)

**Request Examples:**

```bash
POST /search/reindex/products
POST /search/reindex/orders

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Response (202 Accepted):**

```json
{
  "status": "accepted",
  "message": "Reindexing products started for empresa empresa-456"
}
```

**Response (202 Accepted) - Orders:**

```json
{
  "status": "accepted",
  "message": "Reindexing orders started for empresa empresa-456"
}
```

**Error Responses:**

```json
400 Bad Request
{
  "statusCode": 400,
  "message": "Invalid index. Must be 'products' or 'orders'"
}
```

---

## Data Types

### SearchResultDto

```typescript
{
  items: SearchResultItemDto[];      // Array of results
  total: number;                      // Total matching documents (not paginated)
  page: number;                       // Current page (1-indexed)
  limit: number;                      // Results per page
  hasMore: boolean;                   // Indicates if more results exist
  facets?: {                          // Optional facet aggregations
    familias?: FacetDto[];            // Products only
    priceRanges?: FacetDto[];         // Products only
    status?: FacetDto[];              // Orders only
  };
}
```

### SearchResultItemDto (Products)

```typescript
{
  id: string;                         // Product ID
  empresaId: string;                  // Business/Company ID (scoped)
  nombre: string;                     // Product name
  descripcion?: string;               // Product description
  precio: number;                     // Price
  stock: number;                      // Available stock
  familiaId: string;                  // Product family/category ID
  familiaName: string;                // Product family/category name
  imagen?: string;                    // Product image URL
  tags: string[];                     // Product tags
  activo: boolean;                    // Active status
  createdAt: string;                  // ISO 8601 timestamp
  updatedAt: string;                  // ISO 8601 timestamp
}
```

### SearchResultItemDto (Orders)

```typescript
{
  id: string;                         // Order ID
  empresaId: string;                  // Business/Company ID (scoped)
  numero: number;                     // Order number
  fecha: string;                      // Order date (ISO 8601)
  total: number;                      // Order total
  estado: string;                     // Order status
  clienteNombre: string;              // Customer name
  clienteEmail: string;               // Customer email
  items: Array<{                      // Order items
    productoNombre: string;           // Product name
    cantidad: number;                 // Quantity
  }>;
  createdAt: string;                  // ISO 8601 timestamp
}
```

### FacetDto

```typescript
{
  key: string;                        // Facet value/label
  count: number;                      // Number of documents matching this facet
}
```

---

## Authentication & Multi-tenancy

### JWT Token

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

The token must contain:
- `sub`: User ID
- `empresaId`: Company/Business ID (used for multi-tenant scoping)

### Multi-tenant Isolation

All search operations are automatically scoped to the authenticated user's `empresaId`. This means:

- Users can only search products/orders from their own company
- Facets are filtered to company scope
- No cross-company data leakage
- Scoping is transparent to API consumers

---

## Pagination

### Pagination Model

- **1-indexed pages**: Page 1 is the first page
- **hasMore flag**: Indicates if additional results exist
- **Calculate total pages**: `Math.ceil(total / limit)`

### Examples

```javascript
// Get first 20 results
GET /search/products?q=laptop&page=1&limit=20

// Get next 20 results
GET /search/products?q=laptop&page=2&limit=20

// Check if more results exist
if (response.hasMore) {
  // Fetch next page
}
```

---

## Search Syntax

### Full-Text Search

- **Exact match**: `"laptop computer"` (quotes required)
- **Prefix wildcard**: `lapt*` (matches laptop, laptops, etc.)
- **Fuzzy match**: `lapto~` (matches laptop with up to 1 typo)

### Filtering

- **Price range**: `priceMin=500&priceMax=2000`
- **Single filter**: `familia=electronics`
- **Date range**: `dateFrom=2026-10-01&dateTo=2026-10-31`
- **Exact status**: `estado=completado`

### Sorting

Products only:
- `sort=relevance` - Search relevance (default when q is provided)
- `sort=price_asc` - Lowest price first
- `sort=price_desc` - Highest price first
- `sort=date_asc` - Oldest first
- `sort=date_desc` - Newest first (default)

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Request successful |
| 202 | Request accepted (async operation) |
| 400 | Bad request (missing required parameters) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 500 | Server error |

---

## Rate Limiting

Currently no rate limiting is implemented. This may be added in future versions.

---

## Versioning

Current API version: **v1** (implicit)

The API uses URL versioning (e.g., `/v1/search/...`) planned for future versions. Currently, all endpoints are unversioned.

---

## Response Headers

Responses include standard headers:

```
Content-Type: application/json
Content-Length: <bytes>
```

---

## Error Handling

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Description of the error",
  "error": "BadRequest"
}
```

### Common Errors

**Missing required search criterion:**
```json
{
  "statusCode": 400,
  "message": "At least one search criterion (q, familia, priceMin, priceMax) is required"
}
```

**Invalid index in facets/reindex:**
```json
{
  "statusCode": 400,
  "message": "Invalid index. Must be 'products' or 'orders'"
}
```

**Elasticsearch unavailable:**
```json
{
  "statusCode": 500,
  "message": "Search service unavailable. Please try again later."
}
```

---

## Future API Changes (Planned)

- [ ] API versioning (v1, v2, etc.)
- [ ] Rate limiting
- [ ] Autocomplete endpoint
- [ ] Spell correction endpoint
- [ ] Search analytics endpoint
- [ ] Saved searches endpoint
- [ ] Advanced filtering with operators (AND, OR, NOT)
- [ ] Synonym management endpoint
