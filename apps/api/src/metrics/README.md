# P9-2: Business Metrics & KPIs Module

## Overview

The **Metrics Module** provides a comprehensive REST API for business analytics and KPI tracking. It enables merchants to monitor revenue, orders, customer retention, lifetime value, and product performance in real-time.

**Phase**: P9-2 (2-day deliverable)  
**Status**: ✅ Complete (1,788 LOC implementation + 824 LOC tests)

## Architecture

### Core Services

#### 1. **MetricsService** (575 LOC)
Aggregates transactional data to calculate business KPIs:

- **getRevenueMetrics()** - Revenue with daily/weekly/monthly grouping and YoY/MoM comparison
- **getGMVMetrics()** - Gross Merchandise Value (total order value)
- **getOrderMetrics()** - Order count, AOV, fulfillment rate, status breakdown
- **getAOVMetrics()** - Average Order Value with trend analysis
- **getChannelMetrics()** - Revenue and orders by sales channel (WhatsApp, Web, etc.)
- **getProductMetrics()** - Top N products by revenue, unit sales, customer count

#### 2. **CohortAnalysisService** (405 LOC)
Customer cohort analysis for retention and lifetime value:

- **generateRetentionMatrix()** - Cohort-based retention tracking (D1, D7, D30, etc.)
- **getCohortLTV()** - Lifetime Value per customer signup cohort

### Tenant Isolation

All operations are **company-scoped** via `CompanyScopedPrismaService`:
- Every method receives `companyId` from authenticated user context
- All Prisma queries use the company-scoped extension
- Cross-company data leakage is prevented at the ORM layer

### Authorization

- **Permission**: `metrics.read` (required for all endpoints)
- **Authentication**: JWT Bearer token
- **Guard Chain**: JwtAuthGuard → PermissionsGuard → StaffIdentityGuard

## API Endpoints

### Revenue & GMV

```bash
GET /metrics/revenue?startDate=2026-10-01&endDate=2026-10-31&groupBy=daily&compareTo=year_ago
GET /metrics/gmv?startDate=2026-10-01&endDate=2026-10-31
```

**Response**:
```json
{
  "totalRevenue": 50000,
  "transactionCount": 250,
  "averageRevenue": 200,
  "periods": [
    {
      "period": "2026-10-01",
      "revenue": 1500,
      "count": 8,
      "average": 187.5
    }
  ],
  "comparison": {
    "totalRevenue": 48000,
    "percentageChange": 4.17
  }
}
```

### Orders

```bash
GET /metrics/orders?startDate=2026-10-01&endDate=2026-10-31
GET /metrics/aov?startDate=2026-10-01&endDate=2026-10-31&groupBy=weekly
```

**Response** (Orders):
```json
{
  "totalOrders": 320,
  "averageOrderValue": 156.25,
  "totalOrderValue": 50000,
  "confirmedOrders": 280,
  "deliveredOrders": 250,
  "fulfillmentRate": 78.13,
  "ordersByStatus": {
    "RECIBIDO": 40,
    "CONFIRMADO": 30,
    "ENTREGADO": 250
  }
}
```

### Customer Retention (Cohorts)

```bash
GET /metrics/retention?cohortPeriod=monthly&lookbackMonths=12
```

**Response**:
```json
{
  "cohorts": [
    {
      "cohortPeriod": "2025-10",
      "customerCount": 120,
      "firstPurchaseCount": 95
    },
    {
      "cohortPeriod": "2025-11",
      "customerCount": 140,
      "firstPurchaseCount": 105
    }
  ],
  "retention": [
    [100, 85, 72, 68, 65],
    [100, 82, 70, null, null]
  ],
  "churn": [
    [0, 15, 28, 32, 35],
    [0, 18, 30, null, null]
  ],
  "cohortPeriod": "monthly",
  "totalCustomers": 260
}
```

**Interpretation**:
- Row 1 (2025-10 cohort): 100% had first purchase in signup month, 85% purchased again in next month, 72% in month 2, etc.
- Churn is the inverse: 15% churn in month 1, 28% by month 2, etc.

### Lifetime Value (LTV)

```bash
GET /metrics/ltv?cohortStartDate=2026-10-01&cohortEndDate=2026-10-31&lookbackMonths=6
```

**Response**:
```json
{
  "ltv": 450.75,
  "totalRevenue": 54090,
  "customerCount": 120,
  "medianLTV": 420,
  "minLTV": 50,
  "maxLTV": 3200,
  "cohortPeriod": "2026-10-01 to 2026-10-31",
  "ltvByAge": [
    { "ageMonths": 0, "ltv": 250, "activeCustomers": 120 },
    { "ageMonths": 1, "ltv": 180, "activeCustomers": 90 },
    { "ageMonths": 2, "ltv": 140, "activeCustomers": 72 }
  ]
}
```

### Channels & Products

```bash
GET /metrics/channels?startDate=2026-10-01&endDate=2026-10-31
GET /metrics/products?startDate=2026-10-01&endDate=2026-10-31&topN=10
```

**Response** (Channels):
```json
[
  {
    "channel": "whatsapp",
    "revenue": 25000,
    "orderCount": 160,
    "averageOrderValue": 156.25,
    "percentageOfTotal": 50,
    "uniqueCustomers": 85
  },
  {
    "channel": "web",
    "revenue": 20000,
    "orderCount": 120,
    "averageOrderValue": 166.67,
    "percentageOfTotal": 40,
    "uniqueCustomers": 70
  }
]
```

### Dashboard KPIs

```bash
GET /metrics/dashboard?startDate=2026-10-01&endDate=2026-10-31
```

**Response**:
```json
{
  "revenue": 50000,
  "orders": 320,
  "aov": 156.25,
  "activeCustomers": 155,
  "retention": {
    "d7": 85,
    "d30": 72
  },
  "ltv": 112.5,
  "cac": null,
  "topChannel": "whatsapp",
  "topProduct": "Premium Package"
}
```

## Data Model

### Key Entities Used

| Entity | Fields Used | Purpose |
|--------|------------|---------|
| **Venta** | total, descuento, createdAt, estado, clienteId, canal | Revenue aggregation |
| **VentaItem** | cantidad, precioUnitario | Product revenue breakdown |
| **Pedido** | total, estado, createdAt, canalOrigen, clienteId | Order metrics |
| **PedidoItem** | cantidad, prectoUnitario | Order item details |
| **Cliente** | id, createdAt, empresaId | Customer cohorts |
| **Producto** | id, nombre | Product identification |

### Query Scope

All queries use the `CompanyScopedPrismaService.forCompany(companyId)` extension:
```typescript
const db = this.prismaFactory.forCompany(companyId);
const ventas = await db.venta.findMany({...}); // Automatically scoped to companyId
```

## Metric Definitions

### Revenue
**Formula**: `SUM(Venta.total - Venta.descuento) WHERE estado='CONFIRMADA'`  
**Period**: Daily, weekly, or monthly  
**Notes**: Net of discounts; excludes cancelled sales

### GMV (Gross Merchandise Value)
**Formula**: `SUM(Venta.total) WHERE estado='CONFIRMADA'`  
**Notes**: Gross value without discounts; useful for understanding order magnitude

### Order Count & AOV
**Formula**: `COUNT(Pedido.id)` and `SUM(Pedido.total) / COUNT(Pedido.id)`  
**Period**: By date range  
**Notes**: Includes all order statuses; breakdown by status also provided

### Retention Rate (by Cohort)
**Formula**: `COUNT(distinct customers in cohort who purchased in period N) / COUNT(customers in cohort)`  
**Period**: Monthly or weekly cohorts  
**Example**: Cohort signed up in 2026-01, 85% purchased again in 2026-02

### Lifetime Value (LTV)
**Formula**: `SUM(customer revenue) / COUNT(customers in cohort)`  
**Period**: By signup cohort date  
**Notes**: Tracks both mean and median LTV; includes age-based breakdown

### CAC (Customer Acquisition Cost)
**Formula**: `Marketing spend / New customers acquired`  
**Status**: Not calculated (requires external marketing spend data)  
**Note**: Endpoint returns new customer count; spend integration is future scope

## Testing

### Unit Tests
Located in `__tests__/metrics.service.spec.ts` and `cohort-analysis.service.spec.ts`
- Decimal arithmetic validation
- Period bucketing logic
- Cohort matrix generation
- Edge cases (empty data, single records, future periods)

### Integration Tests
File: `/apps/api/test/integration/p9-2-metrics.integration-spec.ts`  
**Coverage**: 30+ test cases

```bash
npm run test:integration p9-2-metrics.integration-spec.ts
```

**Test Coverage**:
- ✅ Revenue aggregation (daily, weekly, monthly)
- ✅ GMV calculations
- ✅ Order metrics and status breakdown
- ✅ AOV with trend analysis
- ✅ Retention cohort matrix (monthly and weekly)
- ✅ LTV by cohort
- ✅ Channel breakdown
- ✅ Product performance (top N)
- ✅ Dashboard KPIs
- ✅ Multi-tenant isolation
- ✅ Error handling (invalid dates, unknown parameters)
- ✅ Authentication/authorization

**Expected Result**: All 30+ tests PASS

## Performance Considerations

### Query Strategy

**Minimize N+1**:
- Revenue/AOV: Single `findMany(Venta)` with aggregation in memory
- Retention: Fetch all customers once, build cohort matrix in-memory (O(n log n))
- Products: `findMany(VentaItem)` with grouping in memory

**Real-Time Acceptable For**:
- Lookback ≤ 90 days
- Single company context
- <500k transactions per company

### Recommended Indexes (Not Yet Added)

```sql
CREATE INDEX venta_company_date ON venta(empresaId, createdAt);
CREATE INDEX pedido_company_date_channel ON pedido(empresaId, createdAt, canalOrigen);
CREATE INDEX cliente_company_date ON cliente(empresaId, createdAt);
CREATE INDEX ventaitem_venta ON ventaitem(ventaId);
CREATE INDEX pedidoitem_pedido ON pedidoitem(pedidoId);
```

### Caching (Future)

For high-traffic deployments, consider:
- Redis cache for monthly/quarterly summaries (invalidate on transaction)
- Pre-aggregated snapshots for historical periods (>1 year old)
- WebSocket real-time updates for dashboard (P7 infrastructure)

## Error Handling

| Error | Cause | Response |
|-------|-------|----------|
| 400 | Invalid ISO 8601 date | Validation error with field details |
| 400 | Unknown `groupBy` or `cohortPeriod` | Enum validation error |
| 401 | Missing/invalid JWT token | Unauthorized |
| 403 | Missing `metrics.read` permission | Forbidden |
| 500 | Database query failure | Internal Server Error with request ID |

## Usage Examples

### Get Monthly Revenue with YoY Comparison

```bash
curl -X GET \
  'https://api.otrarondamas.com/metrics/revenue?startDate=2026-10-01&endDate=2026-12-31&groupBy=monthly&compareTo=year_ago' \
  -H 'Authorization: Bearer <JWT_TOKEN>'
```

### Get Retention Matrix (12 Months)

```bash
curl -X GET \
  'https://api.otrarondamas.com/metrics/retention?cohortPeriod=monthly&lookbackMonths=12' \
  -H 'Authorization: Bearer <JWT_TOKEN>'
```

### Get Top 5 Products

```bash
curl -X GET \
  'https://api.otrarondamas.com/metrics/products?startDate=2026-10-01&endDate=2026-10-31&topN=5' \
  -H 'Authorization: Bearer <JWT_TOKEN>'
```

## Configuration

No environment variables required. Module inherits:
- `DATABASE_URL` (Prisma)
- JWT configuration from AuthModule

## Dependencies

- `@nestjs/common`, `@nestjs/core`
- `@prisma/client`
- `class-validator` (DTO validation)
- `@nestjs/swagger` (API documentation)

## Migration Path

### P9-2 (Current)
- Real-time metrics calculation
- Basic cohort retention
- No data storage (calculated on-demand)

### P9-3 (Future)
- Scheduled aggregation snapshots
- Time-series data storage
- Advanced forecasting (ML)
- Custom metric builder
- Export to CSV/PDF
- WebSocket real-time updates

## Known Limitations

1. **CAC Calculation**: Requires external marketing spend data integration (out of scope)
2. **Timezone Handling**: All dates in UTC; no per-user timezone override (future)
3. **Historical Snapshots**: No time-series store; metrics recalculated on each request
4. **Real-Time Latency**: Queries with large datasets (>500k rows) may be slow
5. **Cohort Definition**: Uses `Cliente.createdAt` (signup date); could allow `first_purchase_date` override

## Support & Troubleshooting

### Cohort Retention Showing 0%
- Ensure test data has actual purchases in the period
- Verify `Cliente.createdAt` and `Venta.createdAt` are in expected ranges

### AOV Calculation Off
- Check for outlier orders (very large/small values skewing the average)
- Verify descuento (discount) values are correctly applied in revenue

### Performance Issues
- Run on smaller date ranges first (<30 days)
- Add indexes recommended above if database grows

## Files

```
src/metrics/
├── metrics.module.ts           (31 LOC)
├── metrics.service.ts          (575 LOC)
├── cohort-analysis.service.ts  (405 LOC)
├── metrics.controller.ts       (343 LOC)
├── dto/
│   ├── queries.ts              (97 LOC)
│   └── responses.ts            (337 LOC)
├── __tests__/
│   ├── metrics.service.spec.ts
│   └── cohort-analysis.service.spec.ts
└── README.md (this file)

test/integration/
└── p9-2-metrics.integration-spec.ts  (824 LOC, 30+ test cases)
```

## Contributing

When adding new metrics:
1. Add calculation to `MetricsService` or `CohortAnalysisService`
2. Create corresponding DTO in `dto/responses.ts`
3. Add query DTO if new parameters needed
4. Add endpoint to `MetricsController`
5. Write integration test cases in `p9-2-metrics.integration-spec.ts`
6. Update this README with formula and examples

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-10-25 | Initial release: Revenue, Orders, AOV, Retention, LTV, Channels, Products |

---

**Module Owner**: P9-2 Implementation Team  
**Last Updated**: 2026-10-25  
**Status**: ✅ Production Ready
