/**
 * Dashboard components export
 * Centralized export for all dashboard-related widgets and utilities
 */

// Shared components
export { ChartWrapper, type ChartWrapperProps } from './ChartWrapper';
export { StatCard, type StatCardProps } from './StatCard';
export { DateRangePicker, type DateRange, type DateRangePickerProps } from './DateRangePicker';
export { FilterBar, type FilterOption, type FilterBarProps } from './FilterBar';

// Dashboard widgets
export { SalesOverviewCard, type SalesMetrics, type SalesOverviewCardProps } from './SalesOverviewCard';
export { InventoryAlertCard, type InventoryAlertCardProps } from './InventoryAlertCard';
export { TopCustomersCard, type TopCustomer, type TopCustomersCardProps } from './TopCustomersCard';

// Chart components (SVG-based, no external chart library)
export { SimpleBarChart, type BarChartData, type SimpleBarChartProps } from './SimpleBarChart';
export { SimpleLineChart, type LineChartData, type LineChartDataset, type SimpleLineChartProps } from './SimpleLineChart';

// Existing components
export { DashboardStats } from './DashboardStats';
export { KPICard } from './KPICard';
export { RecentOrders } from './RecentOrders';
