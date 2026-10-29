# Dashboard API Integration

Complete Remix integration for NestJS Dashboard API endpoints with error handling, loading states, and type-safe data fetching.

## Overview

This integration provides:

1. **API Client** (`app/services/dashboard.client.ts`) — Type-safe functions for all dashboard endpoints
2. **Loader Utilities** (`app/services/loaders.server.ts`) — Pre-configured loaders for common dashboard data fetches
3. **Route Guards** (`app/utils/dashboard-guards.server.ts`) — Authentication and authorization checks
4. **Custom Hooks** (`app/hooks/useDashboard.ts`) — React hooks for consuming dashboard data in components
5. **Error Handling** — Centralized error handling with automatic redirects for auth failures
6. **Loading States** — Suspense boundaries and skeleton loaders for better UX

## Architecture

### API Client (`dashboard.client.ts`)

Type-safe async functions with Zod validation for all endpoints:

```typescript
// Fetch dashboard KPIs
const kpis = await getDashboardKPIs(jwt, '30d');

// Fetch revenue/orders trend
const trends = await getTrendChart(jwt, 'revenue', '30d');

// Fetch top 10 products by revenue
const topProducts = await getTopProducts(jwt, 10, 'revenue');

// Fetch online vs retail breakdown
const channels = await getChannelBreakdown(jwt, '30d');

// Fetch sales by city
const geographic = await getGeographicBreakdown(jwt, '30d');
```

#### Error Handling

All client functions throw `DashboardAPIError` with:
- `statusCode`: HTTP status code
- `message`: Human-readable error message
- `originalError`: Underlying error (timeout, parse error, etc.)

```typescript
try {
  const data = await getDashboardKPIs(token, '30d');
} catch (error) {
  if (error instanceof DashboardAPIError) {
    if (error.statusCode === 401) {
      // Handle unauthorized
    } else if (error.statusCode === 408) {
      // Handle timeout — implement retry logic
    }
  }
}
```

#### Timeout Handling

All requests timeout after `VITE_API_TIMEOUT` (default: 30s):

```bash
# .env or .env.local
VITE_API_TIMEOUT=30000  # milliseconds
```

### Loaders (`loaders.server.ts`)

Pre-configured Remix loaders for common data-fetching patterns:

#### `loadCompleteDashboardData(request)`

Fetches KPIs + trends + channel breakdown + geographic breakdown in parallel.

```typescript
// routes/$lang.dashboard._index.tsx
export const loader = async ({ request }) => {
  return loadCompleteDashboardData(request);
};

export default function DashboardPage() {
  const { kpis, trends, channelBreakdown, geographic } = useLoaderData();
  // ...
}
```

#### `loadAnalyticsData(request)`

Fetches trends, top products, and channel breakdown.

```typescript
// routes/$lang.dashboard.analytics.tsx
export const loader = async ({ request }) => {
  return loadAnalyticsData(request);
};
```

#### `loadGeographicData(request)`

Fetches geographic breakdown only.

```typescript
// routes/$lang.dashboard.geographic.tsx
export const loader = async ({ request }) => {
  return loadGeographicData(request);
};
```

#### `loadSettingsData(request)`

Fetches current user and tenant info for settings page.

```typescript
// routes/$lang.settings._index.tsx
export const loader = async ({ request }) => {
  return loadSettingsData(request);
};
```

#### `loadUsersData(request)`

Fetches users list for the current tenant (future endpoint).

```typescript
// routes/$lang.admin.users.tsx
export const loader = async ({ request }) => {
  return loadUsersData(request);
};
```

### Error Handling in Loaders

All loaders automatically:

1. **401 Unauthorized** → Redirect to `/login`
2. **403 Forbidden** → Redirect to `/forbidden`
3. **5xx Server Errors** → Return error state for component error boundary
4. **Timeout (408)** → Return error state (implement retry in component)
5. **Other Errors** → Log and throw 500 response

```typescript
export const loader = async ({ request }) => {
  try {
    return loadCompleteDashboardData(request);
  } catch (error) {
    // Loaders handle DashboardAPIError automatically
    // Just handle Response errors
    if (error instanceof Response) {
      throw error;
    }
  }
};
```

### Route Guards (`dashboard-guards.server.ts`)

Use in loaders to enforce authentication/authorization:

```typescript
export const loader = async ({ request }) => {
  const token = await requireDashboardAccess(request); // 401 if not auth
  // ... proceed with token
};
```

Or verify tenant context:

```typescript
export const loader = async ({ request }) => {
  const { token, tenantId } = await requireTenantContext(request, expectedTenantId);
  // Throws 403 if user doesn't have access to tenantId
};
```

## Implementation Examples

### Example 1: Simple Dashboard Page

```typescript
// routes/$lang.dashboard._index.tsx
import { LoaderFunction, json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { loadCompleteDashboardData } from '~/services/loaders.server';
import { DashboardStats } from '~/components/dashboard/DashboardStats';
import { TrendChart } from '~/components/dashboard/TrendChart';

export const loader: LoaderFunction = async ({ request }) => {
  return loadCompleteDashboardData(request);
};

export default function DashboardPage() {
  const { kpis, trends, error } = useLoaderData();

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardStats {...kpis} />
      <TrendChart data={trends.data} metric={trends.metric} />
    </div>
  );
}
```

### Example 2: Analytics Page with Error Boundary

```typescript
// routes/$lang.dashboard.analytics.tsx
import { LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Suspense } from 'react';
import { loadAnalyticsData } from '~/services/loaders.server';

export const loader: LoaderFunction = async ({ request }) => {
  return loadAnalyticsData(request);
};

function AnalyticsContent() {
  const { trends, topProducts, channelBreakdown } = useLoaderData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <TrendChart data={trends.data} />
      <TopProducts products={topProducts.products} />
      <ChannelBreakdown data={channelBreakdown.data} />
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded">
      <h1 className="text-lg font-bold">Failed to load analytics</h1>
      <p>Please refresh or contact support.</p>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="h-64 bg-gray-200 animate-pulse rounded" />
      <div className="h-64 bg-gray-200 animate-pulse rounded" />
    </div>
  );
}
```

### Example 3: Custom Hook Usage

```typescript
// components/DashboardWidget.tsx
import { useDashboardKPIs, useCurrencyFormatter } from '~/hooks/useDashboard';

export function DashboardWidget() {
  const { kpis, isLoading, error } = useDashboardKPIs();
  const formatCurrency = useCurrencyFormatter('ARS');

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card title="Revenue" value={formatCurrency(kpis.totalRevenue.value)} />
      <Card title="Orders" value={kpis.totalOrders.value.toString()} />
      <Card title="Customers" value={kpis.totalCustomers.value.toString()} />
      <Card title="Products" value={kpis.totalProducts.value.toString()} />
    </div>
  );
}
```

## Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:8600         # NestJS API base URL
VITE_API_TIMEOUT=30000                     # Request timeout in milliseconds

# Session
SESSION_SECRET=your-secret-key             # Session cookie secret
```

## Type Safety

All responses are validated against Zod schemas:

```typescript
// Types are inferred from loaders
type DashboardData = Awaited<ReturnType<typeof loader>>;

// Or imported from client module
import type { DashboardKPI, TrendChart, TopProducts } from '~/services/dashboard.client';
```

## Testing

### Unit Tests (Component)

```typescript
import { render, screen } from '@testing-library/react';
import { DashboardStats } from './DashboardStats';

test('renders KPIs correctly', () => {
  const kpis = {
    totalRevenue: { value: 1000, change: 5 },
    // ...
  };

  render(<DashboardStats {...kpis} />);
  expect(screen.getByText('$1,000')).toBeInTheDocument();
});
```

### Integration Tests (Loader)

```typescript
import { createMemorySessionStorage } from '@remix-run/node';
import { loader } from '~/routes/$lang.dashboard._index';

test('loader fetches dashboard data', async () => {
  const request = new Request('http://localhost/en/dashboard', {
    headers: { Cookie: 'session=...' },
  });

  const result = await loader({ request, params: { lang: 'en' } });
  const data = await result.json();

  expect(data.kpis).toBeDefined();
  expect(data.trends).toBeDefined();
});
```

## Performance Considerations

### Parallel Data Loading

Use `Promise.all()` in loaders to fetch multiple endpoints in parallel:

```typescript
const [kpis, trends, products] = await Promise.all([
  getDashboardKPIs(token),
  getTrendChart(token),
  getTopProducts(token),
]);
```

### Caching

Implement cache headers on loaders:

```typescript
export const loader: LoaderFunction = async ({ request }) => {
  const data = await loadCompleteDashboardData(request);

  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=60', // Cache for 1 minute
    },
  });
};
```

### Streaming (Future)

Use `defer()` for slower endpoints:

```typescript
import { defer } from '@remix-run/node';
import { Suspense } from 'react';
import { Await } from '@remix-run/react';

export const loader = async ({ request }) => {
  const kpis = await getDashboardKPIs(token); // Fast
  const geographic = getGeographicBreakdown(token); // Slower

  return defer({
    kpis,
    geographic,
  });
};

export default function Page() {
  const { kpis, geographic } = useLoaderData();

  return (
    <>
      <DashboardStats {...kpis} />
      <Suspense fallback={<Skeleton />}>
        <Await resolve={geographic}>
          {(data) => <GeographicMap data={data} />}
        </Await>
      </Suspense>
    </>
  );
}
```

## Troubleshooting

### 401 Unauthorized Redirects

If loaders always redirect to `/login`:

1. Check session storage is configured correctly
2. Verify JWT token is stored in session
3. Check `validateJWT()` implementation

### Timeout Errors

If requests frequently timeout:

1. Increase `VITE_API_TIMEOUT` in `.env`
2. Check API server performance
3. Consider splitting large queries into smaller requests

### Missing Data

If some fields are always `null`:

1. Check API endpoint returns all fields
2. Verify Zod schema matches API response
3. Add `.nullable()` to schema if field is optional

## Related Files

- API Controller: `apps/api/src/admin/controllers/dashboard.controller.ts`
- DTO Schemas: `apps/api/src/admin/dto/dashboard-kpi.dto.ts`
- Service Logic: `apps/api/src/admin/services/analytics-dashboard.service.ts`
- Shared Types: `packages/shared-types/src/index.ts`

## Next Steps

1. Add permission checks (`dashboard.view`, `dashboard.manage`) in guards
2. Implement `/users?tenantId=X` endpoint for users loader
3. Add recent orders endpoint and integrate in dashboard
4. Create dashboard customization endpoints
5. Implement caching strategy for KPI data
6. Add real-time updates via WebSocket
