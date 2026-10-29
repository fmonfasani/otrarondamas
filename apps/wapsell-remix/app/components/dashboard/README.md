# Dashboard Components

Complete UI components and widgets for the Wapsell Remix dashboard. Built with Tailwind CSS, fully accessible, and responsive across mobile, tablet, and desktop devices.

## Components Overview

### 1. Shared Components

#### StatCard
Reusable stat display component for showing KPIs with trends.

```tsx
import { StatCard } from './dashboard';

<StatCard
  label="Ventas Hoy"
  value={45250}
  format="currency"
  color="blue"
  icon={<SalesIcon />}
  trend={{ value: 12, direction: 'up' }}
  ariaLabel="Ventas del día actual"
/>
```

**Props:**
- `label` (string): Display label
- `value` (string | number): Metric value
- `icon` (ReactNode): Optional icon element
- `color` ('blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'): Color scheme
- `trend` (object): Optional trend with value and direction ('up' | 'down')
- `format` ('currency' | 'number' | 'text'): Value formatting
- `loading` (boolean): Show loading state
- `ariaLabel` (string): Accessibility label

---

#### ChartWrapper
Base container for charts with loading, error, and empty states.

```tsx
import { ChartWrapper } from './dashboard';

<ChartWrapper
  title="Sales Over Time"
  subtitle="Last 30 days"
  loading={isLoading}
  error={error}
  empty={isEmpty}
  emptyMessage="No data available"
>
  {/* Chart content */}
</ChartWrapper>
```

**Props:**
- `title` (string): Chart title
- `subtitle` (string): Optional subtitle
- `children` (ReactNode): Chart content
- `loading` (boolean): Loading state
- `error` (string | null): Error message
- `empty` (boolean): Empty state flag
- `emptyMessage` (string): Empty state text
- `ariaLabel` (string): Accessibility label

---

#### DateRangePicker
Date range selector with preset ranges (Today, Week, Month, etc.).

```tsx
import { DateRangePicker, DateRange } from './dashboard';

const [dateRange, setDateRange] = useState<DateRange>({
  from: '2024-01-01',
  to: '2024-01-31'
});

<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
  label="Date Range"
/>
```

**Props:**
- `value` (DateRange): Current date range
- `onChange` (function): Change handler
- `label` (string): Field label
- `disabled` (boolean): Disabled state
- `minDate` (string): Minimum date
- `maxDate` (string): Maximum date

**DateRange interface:**
```typescript
interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}
```

---

#### FilterBar
Multi-filter component with search, category, and status filters.

```tsx
import { FilterBar, FilterOption } from './dashboard';

const categories: FilterOption[] = [
  { value: 'cat1', label: 'Category 1', count: 10 },
  { value: 'cat2', label: 'Category 2', count: 5 },
];

<FilterBar
  categories={categories}
  statuses={[...]}
  selectedCategory="cat1"
  onCategoryChange={(value) => console.log(value)}
/>
```

**Props:**
- `categories` (FilterOption[]): Category options
- `statuses` (FilterOption[]): Status options
- `selectedCategory` (string): Selected category
- `selectedStatus` (string): Selected status
- `searchValue` (string): Search query
- `onCategoryChange` (function): Category change handler
- `onStatusChange` (function): Status change handler
- `onSearchChange` (function): Search change handler
- `disabled` (boolean): Disabled state

---

### 2. Dashboard Widgets

#### SalesOverviewCard
Displays sales metrics for today, week, and month with trends.

```tsx
import { SalesOverviewCard } from './dashboard';

<SalesOverviewCard
  metrics={{
    today: 45250,
    week: 287500,
    month: 1250000,
  }}
  currency="ARS"
  loading={false}
/>
```

**Props:**
- `metrics` (SalesMetrics): Sales data object
- `currency` ('ARS' | 'USD'): Currency code
- `loading` (boolean): Loading state
- `ariaLabel` (string): Accessibility label

---

#### InventoryAlertCard
Low stock and expiring items widget using `@wapsell/types` types.

```tsx
import { InventoryAlertCard } from './dashboard';
import { AlertaStockBajo, AlertaLotePorVencer } from '@otrarondamas/shared-types';

<InventoryAlertCard
  lowStockItems={lowStockItems}
  expiringItems={expiringItems}
  maxItems={5}
/>
```

**Props:**
- `lowStockItems` (AlertaStockBajo[]): Low stock items from API
- `expiringItems` (AlertaLotePorVencer[]): Expiring items from API
- `maxItems` (number): Maximum items to show (default: 5)
- `loading` (boolean): Loading state
- `error` (string | null): Error message
- `ariaLabel` (string): Accessibility label

---

#### TopCustomersCard
Best customers widget showing sales volume and order count.

```tsx
import { TopCustomersCard, TopCustomer } from './dashboard';

const customers: TopCustomer[] = [
  {
    id: '1',
    name: 'Juan García',
    email: 'juan@example.com',
    totalSales: 125000,
    ordersCount: 45,
    lastOrderDate: '2024-01-25'
  }
];

<TopCustomersCard
  customers={customers}
  maxItems={8}
/>
```

**Props:**
- `customers` (TopCustomer[]): Customer data array
- `maxItems` (number): Maximum customers to show (default: 8)
- `loading` (boolean): Loading state
- `error` (string | null): Error message
- `ariaLabel` (string): Accessibility label

---

### 3. Chart Components

#### SimpleBarChart
SVG-based bar chart (no external charting library required).

```tsx
import { SimpleBarChart, BarChartData } from './dashboard';

const data: BarChartData[] = [
  { name: 'Monday', value: 85 },
  { name: 'Tuesday', value: 92 },
  { name: 'Wednesday', value: 78 },
];

<SimpleBarChart
  title="Orders by Day"
  data={data}
  yAxisLabel="Count"
  xAxisLabel="Day"
/>
```

**Props:**
- `title` (string): Chart title
- `subtitle` (string): Optional subtitle
- `data` (BarChartData[]): Chart data
- `loading` (boolean): Loading state
- `error` (string | null): Error message
- `yAxisLabel` (string): Y-axis label
- `xAxisLabel` (string): X-axis label
- `height` (number): Chart height (default: 300)
- `showValue` (boolean): Show values on bars (default: true)

---

#### SimpleLineChart
SVG-based line chart with multiple datasets.

```tsx
import { SimpleLineChart, LineChartDataset } from './dashboard';

const datasets: LineChartDataset[] = [
  {
    label: 'In-Store Sales',
    color: '#3B82F6',
    data: [
      { name: 'Mon', value: 1200 },
      { name: 'Tue', value: 1900 },
    ]
  },
  {
    label: 'Online Sales',
    color: '#10B981',
    data: [
      { name: 'Mon', value: 800 },
      { name: 'Tue', value: 1200 },
    ]
  }
];

<SimpleLineChart
  title="Revenue by Channel"
  datasets={datasets}
  yAxisLabel="Amount ($)"
  xAxisLabel="Day"
/>
```

**Props:**
- `title` (string): Chart title
- `subtitle` (string): Optional subtitle
- `datasets` (LineChartDataset[]): Multiple data series
- `loading` (boolean): Loading state
- `error` (string | null): Error message
- `yAxisLabel` (string): Y-axis label
- `xAxisLabel` (string): X-axis label
- `height` (number): Chart height (default: 300)
- `showGrid` (boolean): Show grid lines (default: true)
- `showValue` (boolean): Show data point values (default: true)

---

## Responsive Design

All components follow a mobile-first approach:

- **Mobile (< 640px)**: Single column, stacked layout
- **Tablet (640px - 1024px)**: 2-column grid
- **Desktop (> 1024px)**: 3-4 column grid

Example responsive grid:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard {...} />
  {/* More cards */}
</div>
```

---

## Accessibility Features

All components include:

- **ARIA Labels**: `aria-label` and `aria-labelledby` for screen readers
- **Semantic HTML**: Proper heading hierarchy and semantic elements
- **Keyboard Navigation**: Fully keyboard accessible
- **Color Contrast**: WCAG AA compliant color combinations
- **Loading States**: Clear loading indicators
- **Error States**: Accessible error messages

Example accessible implementation:
```tsx
<section aria-labelledby="sales-heading">
  <h2 id="sales-heading" className="sr-only">Sales Metrics</h2>
  <SalesOverviewCard
    ariaLabel="Sales summary for current period"
  />
</section>
```

---

## Usage Example

Complete dashboard implementation:

```tsx
import {
  DateRangePicker,
  FilterBar,
  SalesOverviewCard,
  InventoryAlertCard,
  TopCustomersCard,
  SimpleBarChart,
  SimpleLineChart,
} from './dashboard';

export function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: '2024-01-01',
    to: '2024-01-31',
  });

  const [filters, setFilters] = useState({
    category: '',
    status: '',
    search: '',
  });

  return (
    <main className="bg-gray-50 py-6 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <h1 className="text-3xl font-bold">Dashboard</h1>

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <FilterBar {...filters} onChange={setFilters} />
        </div>

        {/* Sales Overview */}
        <SalesOverviewCard
          metrics={{ today: 5000, week: 35000, month: 150000 }}
        />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SimpleBarChart title="Orders" data={ordersData} />
          <SimpleLineChart title="Revenue" datasets={revenueData} />
        </div>

        {/* Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InventoryAlertCard
            lowStockItems={lowStockItems}
            expiringItems={expiringItems}
          />
          <TopCustomersCard customers={topCustomers} />
        </div>
      </div>
    </main>
  );
}
```

---

## Colors and Theming

Components use Tailwind CSS color palette:

- **Primary**: Blue (`bg-blue-50`, `text-blue-600`)
- **Success**: Green (`bg-green-50`, `text-green-600`)
- **Warning**: Yellow/Orange (`bg-yellow-50`, `text-yellow-600`)
- **Danger**: Red (`bg-red-50`, `text-red-600`)
- **Secondary**: Purple, Gray

Customize by modifying Tailwind config or overriding className props.

---

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Mobile latest

---

## Performance Considerations

- Charts use SVG (no external library dependencies)
- Memoized components with `React.forwardRef`
- Lazy-loaded data with loading states
- Optimized for mobile networks

---

## Testing

Example test cases:

```tsx
import { render, screen } from '@testing-library/react';
import { StatCard } from './dashboard';

describe('StatCard', () => {
  it('renders with correct label and value', () => {
    render(
      <StatCard label="Sales" value={1000} format="currency" />
    );
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
  });

  it('displays trend correctly', () => {
    render(
      <StatCard
        label="Sales"
        value={1000}
        trend={{ value: 10, direction: 'up' }}
      />
    );
    expect(screen.getByText(/10%/)).toBeInTheDocument();
  });
});
```

---

## Notes

- No external chart libraries (recharts) required
- All components are TypeScript-first
- Fully responsive and mobile-optimized
- WCAG AA accessibility compliance
- Supports Spanish locale out of the box
- Compatible with Remix server-side rendering

---

## Related Files

- Components: `apps/wapsell-remix/app/components/dashboard/*.tsx`
- Shared types: `packages/shared-types/src/index.ts`
- Tailwind config: `tailwind.config.ts`
- Example usage: `DashboardExample.tsx`
