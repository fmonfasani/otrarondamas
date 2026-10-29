# Dashboard Components Integration Guide

## Quick Start

### Import Dashboard Components

```tsx
// Import individual components
import {
  StatCard,
  ChartWrapper,
  DateRangePicker,
  FilterBar,
  SalesOverviewCard,
  InventoryAlertCard,
  TopCustomersCard,
  SimpleBarChart,
  SimpleLineChart,
} from '~/components/dashboard';

// Import types
import { DateRange, BarChartData, TopCustomer } from '~/components/dashboard';
```

### Create Your First Dashboard

```tsx
// routes/$lang.dashboard.tsx
import { LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import {
  DateRangePicker,
  FilterBar,
  SalesOverviewCard,
  InventoryAlertCard,
  TopCustomersCard,
  SimpleBarChart,
  SimpleLineChart,
  type DateRange,
} from '~/components/dashboard';
import { useState } from 'react';

export const loader: LoaderFunction = async ({ request }) => {
  // Fetch data from API endpoints
  const salesData = await fetch('/api/sales').then(r => r.json());
  const inventoryData = await fetch('/api/inventory').then(r => r.json());
  const customersData = await fetch('/api/customers').then(r => r.json());

  return { salesData, inventoryData, customersData };
};

export default function Dashboard() {
  const { salesData, inventoryData, customersData } = useLoaderData();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  return (
    <main className="bg-gray-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Bienvenido al panel de control</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <FilterBar
            categories={[
              { value: 'presencial', label: 'Presencial', count: 45 },
              { value: 'online', label: 'Online', count: 32 },
            ]}
            statuses={[
              { value: 'confirmada', label: 'Confirmada', count: 85 },
              { value: 'pendiente', label: 'Pendiente', count: 10 },
            ]}
          />
        </div>

        {/* Sales Overview */}
        <SalesOverviewCard
          metrics={salesData.metrics}
          loading={!salesData}
        />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SimpleBarChart
            title="Órdenes por Día"
            data={salesData.dailyOrders}
            loading={!salesData}
          />
          <SimpleLineChart
            title="Ingresos por Canal"
            datasets={salesData.revenueByChannel}
            loading={!salesData}
          />
        </div>

        {/* Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InventoryAlertCard
            lowStockItems={inventoryData.lowStock}
            expiringItems={inventoryData.expiring}
            loading={!inventoryData}
          />
          <TopCustomersCard
            customers={customersData.topCustomers}
            loading={!customersData}
          />
        </div>
      </div>
    </main>
  );
}
```

---

## API Integration Examples

### Fetching Sales Data

```tsx
// api/sales.ts
interface SalesMetrics {
  today: number;
  week: number;
  month: number;
}

interface BarChartData {
  name: string;
  value: number;
}

export async function getSalesMetrics(
  empresaId: string,
  dateRange: { from: string; to: string }
): Promise<SalesMetrics> {
  const response = await fetch(`/api/sales/metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empresaId, dateRange }),
  });
  return response.json();
}

export async function getDailyOrders(
  empresaId: string,
  dateRange: { from: string; to: string }
): Promise<BarChartData[]> {
  const response = await fetch(`/api/sales/daily-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empresaId, dateRange }),
  });
  return response.json();
}
```

### Fetching Inventory Data

```tsx
// api/inventory.ts
import {
  AlertasInventario,
  AlertaStockBajo,
  AlertaLotePorVencer,
} from '@otrarondamas/shared-types';

export async function getInventoryAlerts(
  empresaId: string
): Promise<AlertasInventario> {
  const response = await fetch(`/api/inventario/alertas`, {
    method: 'GET',
    headers: {
      'X-Empresa-Id': empresaId,
    },
  });
  return response.json();
}
```

### Fetching Customer Data

```tsx
// api/customers.ts
import { Cliente } from '@otrarondamas/shared-types';

interface TopCustomerData {
  id: string;
  name: string;
  email?: string;
  totalSales: number;
  ordersCount: number;
  lastOrderDate?: string;
}

export async function getTopCustomers(
  empresaId: string,
  limit: number = 8
): Promise<TopCustomerData[]> {
  const response = await fetch(`/api/clientes/top`, {
    method: 'GET',
    headers: {
      'X-Empresa-Id': empresaId,
      'X-Limit': limit.toString(),
    },
  });
  return response.json();
}
```

---

## Component Customization

### Changing Colors

```tsx
// Default colors for cards
<StatCard
  label="Ventas"
  value={5000}
  color="blue"  // 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
/>

// Custom class override
<StatCard
  label="Ventas"
  value={5000}
  className="border-2 border-blue-500"
/>
```

### Styling Charts

```tsx
// SimpleBarChart with custom styling
<SimpleBarChart
  title="Ventas por Día"
  data={data}
  className="bg-gradient-to-br from-blue-50 to-blue-100"
  height={400}  // Custom height
  showValue={true}  // Show values on bars
/>
```

### Custom Date Ranges

```tsx
<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
  minDate="2024-01-01"
  maxDate={new Date().toISOString().split('T')[0]}
  label="Período de análisis"
/>
```

---

## Responsive Breakpoints

All components automatically adjust to screen size:

### Mobile (< 640px)
- Single column layout
- Full-width inputs
- Stacked charts
- Simplified headers

### Tablet (640px - 1024px)
- 2-column grid
- Side-by-side filters
- 2 charts per row
- Optimized spacing

### Desktop (1024px+)
- 3-4 column grid
- Full filter bar
- Multiple widgets side-by-side
- Expanded charts

---

## Accessibility Features

### Screen Reader Support

All components include ARIA labels:

```tsx
<section aria-labelledby="dashboard-heading">
  <h1 id="dashboard-heading">Dashboard</h1>
  
  <SalesOverviewCard
    ariaLabel="Resumen de ventas"
    metrics={{ today: 1000, week: 7000, month: 30000 }}
  />
</section>
```

### Keyboard Navigation

- Tab through all interactive elements
- Enter/Space to activate buttons
- Arrow keys in date pickers
- Escape to close modals

### Color Contrast

All text meets WCAG AA standards:
- Text on cards: 4.5:1 contrast ratio
- Interactive elements: Enhanced focus indicators
- Icons + color: No color-only information

---

## Performance Optimization

### Data Fetching

```tsx
// Use Remix loaders for server-side data fetching
export const loader: LoaderFunction = async ({ request }) => {
  // Fetch all dashboard data in parallel
  const [sales, inventory, customers] = await Promise.all([
    fetch('/api/sales').then(r => r.json()),
    fetch('/api/inventory').then(r => r.json()),
    fetch('/api/customers').then(r => r.json()),
  ]);

  return { sales, inventory, customers };
};
```

### Loading States

```tsx
// Show loading skeleton while data fetches
<SalesOverviewCard
  metrics={salesData || { today: 0, week: 0, month: 0 }}
  loading={!salesData}
/>

// Or use React Query for client-side caching
import { useQuery } from '@tanstack/react-query';

const { data: sales, isLoading } = useQuery({
  queryKey: ['sales', dateRange],
  queryFn: () => getSalesMetrics(dateRange),
});
```

### Memoization

```tsx
import { useMemo } from 'react';

export function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>(...);

  // Memoize expensive calculations
  const chartData = useMemo(
    () => transformSalesData(rawData, dateRange),
    [rawData, dateRange]
  );

  return <SimpleBarChart data={chartData} />;
}
```

---

## Error Handling

### Component Error Boundaries

```tsx
import { ErrorBoundary } from '~/components/ErrorBoundary';

export function Dashboard() {
  return (
    <ErrorBoundary>
      <SalesOverviewCard metrics={data} />
    </ErrorBoundary>
  );
}
```

### API Error Handling

```tsx
export const loader: LoaderFunction = async ({ request }) => {
  try {
    const sales = await fetch('/api/sales').then(r => r.json());
    return { sales, error: null };
  } catch (error) {
    return {
      sales: null,
      error: 'Failed to load sales data',
    };
  }
};

export default function Dashboard() {
  const { sales, error } = useLoaderData();

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return <SalesOverviewCard metrics={sales} />;
}
```

---

## Internationalization (i18n)

### Spanish Labels (Default)

All components use Spanish labels by default:
- "Ventas Hoy" → "Sales Today"
- "Rango de fechas" → "Date Range"
- "Filtros" → "Filters"

### Custom Labels

```tsx
<SalesOverviewCard
  metrics={data}
  label="Daily Sales"  // Override if needed
/>

<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
  label="Select Period"  // Custom label
/>
```

---

## Testing

### Component Testing

```tsx
import { render, screen } from '@testing-library/react';
import { StatCard } from '~/components/dashboard';

describe('Dashboard Components', () => {
  test('StatCard displays currency correctly', () => {
    render(
      <StatCard
        label="Sales"
        value={1000}
        format="currency"
        color="blue"
      />
    );

    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText(/\$1.000/)).toBeInTheDocument();
  });

  test('ChartWrapper shows loading state', () => {
    render(
      <ChartWrapper title="Test" loading={true}>
        <div>Chart</div>
      </ChartWrapper>
    );

    expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
  });
});
```

### Integration Testing

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '~/routes/dashboard';

describe('Dashboard Integration', () => {
  test('loads and displays all widgets', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Ventas Hoy')).toBeInTheDocument();
      expect(screen.getByText('Alertas de Inventario')).toBeInTheDocument();
    });
  });
});
```

---

## Troubleshooting

### Chart Not Rendering

**Problem**: Chart appears blank
**Solution**:
```tsx
// Ensure data is formatted correctly
const data: BarChartData[] = [
  { name: 'Day 1', value: 100 },
  { name: 'Day 2', value: 200 },
];

<SimpleBarChart data={data} />
```

### Styles Not Applied

**Problem**: Tailwind classes not visible
**Solution**:
1. Ensure `tailwind.config.ts` includes dashboard path
2. Verify `@tailwind` directives in CSS
3. Check className syntax

### Type Errors

**Problem**: TypeScript errors on imports
**Solution**:
```tsx
// Use correct import path
import { StatCard } from '~/components/dashboard';

// Ensure types are exported
import { DateRange, type StatCardProps } from '~/components/dashboard';
```

---

## Production Checklist

- [ ] All components render without errors
- [ ] Responsive design tested on mobile/tablet/desktop
- [ ] Accessibility tested with screen readers
- [ ] API endpoints configured
- [ ] Error boundaries in place
- [ ] Loading states handled
- [ ] Performance optimized (lazy loading if needed)
- [ ] Internationalization set up
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] Documentation updated
- [ ] Ready for deployment

---

## Support & Resources

- **Component Docs**: `apps/wapsell-remix/app/components/dashboard/README.md`
- **Example Implementation**: `DashboardExample.tsx`
- **Type Definitions**: Each component file
- **Tailwind CSS**: `tailwind.config.ts`
- **Remix Docs**: https://remix.run/docs

---

*Last Updated: 2026-10-29*
*Compatible with: Remix 2.15.0, React 18.3.1, TypeScript 5.7.2*
