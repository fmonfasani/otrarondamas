# Search Module (P14-1)

Full-text search backend implementation for Wapsell using Elasticsearch.

## Quick Start

### 1. Start Elasticsearch (Docker)

```bash
docker run -d --name elasticsearch \
  -e discovery.type=single-node \
  -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
  -e xpack.security.enabled=false \
  -p 9200:9200 \
  docker.elastic.co/elasticsearch/elasticsearch:8.0.0
```

### 2. Configure Environment

Copy `.env.example` to your `.env`:

```bash
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=changeme
```

### 3. Run Tests

```bash
npm run test:integration -- --testPathPattern=p14-1-search
```

## API Endpoints

All endpoints require JWT authentication via `@UseGuards(JwtAuthGuard)`.

### Search Products

```
GET /search/products?q=laptop&familia=electronics&priceMin=500&priceMax=2000&sort=price_asc&page=1&limit=20
```

**Query Parameters:**
- `q` - Search term (optional)
- `familia` - Filter by product family/category ID (optional)
- `priceMin` - Minimum price (optional)
- `priceMax` - Maximum price (optional)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)
- `sort` - Sort order: `relevance`, `price_asc`, `price_desc`, `date_asc`, `date_desc` (default: relevance)

**Response:**
```json
{
  "items": [
    {
      "id": "prod-123",
      "nombre": "Laptop Dell XPS",
      "descripcion": "High performance laptop",
      "precio": 1500.00,
      "stock": 5,
      "familiaName": "Computers",
      "activo": true
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20,
  "hasMore": true,
  "facets": {
    "familias": [
      { "key": "Computers", "count": 15 },
      { "key": "Accessories", "count": 10 }
    ],
    "priceRanges": [
      { "key": "$0 - $50", "count": 8 },
      { "key": "$50 - $100", "count": 12 },
      { "key": "$100 - $500", "count": 30 },
      { "key": "$500+", "count": 25 }
    ]
  }
}
```

### Search Orders

```
GET /search/orders?q=john&estado=completado&dateFrom=2026-10-01&dateTo=2026-10-31&page=1&limit=20
```

**Query Parameters:**
- `q` - Search term (order number or client name) (optional)
- `estado` - Filter by status (optional)
- `dateFrom` - Start date in ISO format (optional)
- `dateTo` - End date in ISO format (optional)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Response:**
```json
{
  "items": [
    {
      "id": "order-456",
      "numero": 12345,
      "clienteNombre": "John Doe",
      "clienteEmail": "john@example.com",
      "estado": "completado",
      "total": 500.00,
      "fecha": "2026-10-15"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20,
  "hasMore": false,
  "facets": {
    "status": [
      { "key": "completado", "count": 6 },
      { "key": "pendiente", "count": 3 },
      { "key": "cancelado", "count": 1 }
    ]
  }
}
```

### Get Facets

```
GET /search/facets/products
GET /search/facets/orders
```

Returns available filter options for the specified index.

### Trigger Reindex (Admin)

```
POST /search/reindex/products
POST /search/reindex/orders
```

Rebuilds the entire index for the specified resource type. This is an async operation that returns immediately.

## File Structure

```
src/search/
├── elasticsearch.client.ts      # Elasticsearch client wrapper
├── elasticsearch.config.ts      # Index schemas and configuration
├── search.service.ts            # Business logic (400+ LOC)
├── search.controller.ts         # REST endpoints
├── search.module.ts             # NestJS module
├── dto/
│   ├── search-query.dto.ts      # Query parameters
│   └── search-result.dto.ts     # Response DTOs
├── README.md                    # This file
├── SEARCH-IMPLEMENTATION.md     # Detailed documentation
└── .env.example                 # Environment variables template
```

## Testing

The implementation includes 25+ integration tests covering:

- ✅ Product search (name, description, prefix matching)
- ✅ Product filtering (familia, price ranges)
- ✅ Sorting (relevance, price, date)
- ✅ Pagination
- ✅ Order search (number, client name, status, date)
- ✅ Facet generation
- ✅ Multi-tenant isolation
- ✅ Performance (<100ms)

Run tests:
```bash
npm run test:integration -- --testPathPattern=p14-1-search --verbose
```

## Security & Multi-tenancy

All searches are automatically scoped to the authenticated user's empresa via the `@ExtractBusinessContext()` decorator. This ensures:

- Users can only search products/orders from their own empresa
- No cross-tenant data leakage
- Facets are filtered to empresa scope

## Performance Baselines

- Product search: <50ms average
- Order search: <100ms average
- Facet generation: <20ms
- Pagination: No additional cost

For large datasets (100M+ documents):
- Increase shard count in index settings
- Monitor index size: `GET /products/_stats`
- Profile slow queries: `GET /products/_search?profile=true`

## Troubleshooting

### Elasticsearch not connecting

Check Elasticsearch health:
```bash
curl http://localhost:9200/_cluster/health
```

### Empty search results

1. Verify empresa context is set correctly
2. Check index contains documents: `GET /products/_count`
3. Re-run reindex: `POST /search/reindex/products`

### Slow queries

1. Check index size: `GET /_cat/indices?v`
2. Monitor shard allocation: `GET /_cat/shards?v`
3. Review slow log: `GET /products/_settings` (check refresh interval)

## Future Enhancements

- [ ] Autocomplete/Type-ahead suggestions
- [ ] Spell correction (Did you mean?)
- [ ] Synonym management
- [ ] Search analytics (popular queries, no-results)
- [ ] Saved searches
- [ ] Advanced filters (stock levels, date ranges)
- [ ] Inventory status faceting

## Integration Notes

- **SearchModule** is imported in `AppModule`
- **ElasticsearchClient** is injectable globally
- **SearchService** exports a public API for sync operations
- All search operations require JWT authentication
- Multi-tenant isolation is enforced at the service layer
