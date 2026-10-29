/**
 * DashboardExample - Complete dashboard example
 * Demonstrates how to use all dashboard components together with responsive layout
 *
 * This is a reference implementation showing:
 * - Responsive grid layout (mobile, tablet, desktop)
 * - Date range and filter integration
 * - Chart and widget combination
 * - Accessibility best practices
 */

import React, { useState, useCallback } from 'react';
import { DateRangePicker, DateRange, FilterBar, FilterOption } from './index';
import { SalesOverviewCard } from './SalesOverviewCard';
import { InventoryAlertCard } from './InventoryAlertCard';
import { TopCustomersCard, TopCustomer } from './TopCustomersCard';
import { SimpleBarChart, BarChartData } from './SimpleBarChart';
import { SimpleLineChart, LineChartDataset } from './SimpleLineChart';
import { AlertaStockBajo, AlertaLotePorVencer } from '@otrarondamas/shared-types';

interface DashboardExampleProps {
  onDateRangeChange?: (range: DateRange) => void;
  onFilterChange?: (filters: {
    category?: string;
    status?: string;
    search?: string;
  }) => void;
}

/**
 * Sample data generators for demo purposes
 */
const generateSampleOrdersData = (): BarChartData[] => {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab', 'Dom'];
  return days.map((day) => ({
    name: day,
    value: Math.floor(Math.random() * 100) + 20,
  }));
};

const generateSampleRevenueData = (): LineChartDataset[] => {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab', 'Dom'];
  return [
    {
      label: 'Ventas Presenciales',
      color: '#3B82F6',
      data: days.map((day) => ({
        name: day,
        value: Math.floor(Math.random() * 50000) + 10000,
      })),
    },
    {
      label: 'Ventas Online',
      color: '#10B981',
      data: days.map((day) => ({
        name: day,
        value: Math.floor(Math.random() * 30000) + 5000,
      })),
    },
  ];
};

const generateSampleLowStockItems = (): AlertaStockBajo[] => {
  return [
    {
      productoId: '1',
      nombre: 'Café Premium 500g',
      codigoInterno: 'CAF-001',
      stockTotal: 5,
      stockMinimo: 20,
    },
    {
      productoId: '2',
      nombre: 'Té Verde 250g',
      codigoInterno: 'TÉ-002',
      stockTotal: 0,
      stockMinimo: 10,
    },
    {
      productoId: '3',
      nombre: 'Galletas Integrales',
      codigoInterno: 'GAL-003',
      stockTotal: 8,
      stockMinimo: 15,
    },
  ];
};

const generateSampleExpiringItems = (): AlertaLotePorVencer[] => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const in3days = new Date();
  in3days.setDate(in3days.getDate() + 3);

  return [
    {
      loteId: '1',
      productoId: '1',
      productoNombre: 'Leche Desnatada',
      codigoInterno: 'LEC-001',
      numeroLote: 'LOT-2024-001',
      vencimiento: tomorrow.toISOString().split('T')[0],
      cantidad: '12',
    },
    {
      loteId: '2',
      productoId: '2',
      productoNombre: 'Yogur Natural',
      codigoInterno: 'YOG-002',
      numeroLote: 'LOT-2024-002',
      vencimiento: in3days.toISOString().split('T')[0],
      cantidad: '24',
    },
  ];
};

const generateSampleTopCustomers = (): TopCustomer[] => {
  return [
    {
      id: '1',
      name: 'Juan García Pérez',
      email: 'juan.garcia@example.com',
      totalSales: 125000,
      ordersCount: 45,
      lastOrderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      name: 'María López Rodríguez',
      email: 'maria.lopez@example.com',
      totalSales: 98500,
      ordersCount: 32,
      lastOrderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      name: 'Carlos Martínez Silva',
      email: 'carlos.martinez@example.com',
      totalSales: 87200,
      ordersCount: 28,
      lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      name: 'Ana Fernández Cruz',
      totalSales: 72500,
      ordersCount: 24,
      lastOrderDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

export const DashboardExample: React.FC<DashboardExampleProps> = ({
  onDateRangeChange,
  onFilterChange,
}) => {
  // State management
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const [filters, setFilters] = useState({
    category: '',
    status: '',
    search: '',
  });

  const [isLoading] = useState(false);

  // Callbacks
  const handleDateRangeChange = useCallback(
    (newRange: DateRange) => {
      setDateRange(newRange);
      onDateRangeChange?.(newRange);
    },
    [onDateRangeChange]
  );

  const handleFilterChange = useCallback(
    (newFilters: {
      category?: string;
      status?: string;
      search?: string;
    }) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      onFilterChange?.(newFilters);
    },
    [onFilterChange]
  );

  // Sample data
  const ordersData = generateSampleOrdersData();
  const revenueData = generateSampleRevenueData();
  const lowStockItems = generateSampleLowStockItems();
  const expiringItems = generateSampleExpiringItems();
  const topCustomers = generateSampleTopCustomers();

  const categoryOptions: FilterOption[] = [
    { value: 'presencial', label: 'Ventas Presenciales', count: 45 },
    { value: 'online', label: 'Ventas Online', count: 32 },
    { value: 'mayorista', label: 'Ventas Mayorista', count: 18 },
  ];

  const statusOptions: FilterOption[] = [
    { value: 'confirmada', label: 'Confirmadas', count: 85 },
    { value: 'pendiente', label: 'Pendientes', count: 10 },
    { value: 'anulada', label: 'Anuladas', count: 5 },
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Resumen de ventas, inventario y clientes principales
          </p>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            ariaLabel="Selector de rango de fechas del dashboard"
          />

          <FilterBar
            categories={categoryOptions}
            statuses={statusOptions}
            selectedCategory={filters.category}
            selectedStatus={filters.status}
            searchValue={filters.search}
            onCategoryChange={(value) => handleFilterChange({ category: value })}
            onStatusChange={(value) => handleFilterChange({ status: value })}
            onSearchChange={(value) => handleFilterChange({ search: value })}
            ariaLabel="Filtros del dashboard"
          />
        </div>

        {/* Key Metrics */}
        <section aria-labelledby="sales-heading">
          <h2 id="sales-heading" className="sr-only">
            Métricas de Ventas
          </h2>
          <SalesOverviewCard
            metrics={{
              today: 45250,
              week: 287500,
              month: 1250000,
            }}
            loading={isLoading}
            ariaLabel="Resumen de ventas por período"
          />
        </section>

        {/* Charts Section - Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Orders Chart */}
          <section aria-labelledby="orders-heading">
            <h2 id="orders-heading" className="sr-only">
              Gráfico de Órdenes
            </h2>
            <SimpleBarChart
              title="Órdenes por Día"
              subtitle="Última semana"
              data={ordersData}
              loading={isLoading}
              yAxisLabel="Cantidad"
              xAxisLabel="Día"
              ariaLabel="Gráfico de órdenes por día"
            />
          </section>

          {/* Revenue Chart */}
          <section aria-labelledby="revenue-heading">
            <h2 id="revenue-heading" className="sr-only">
              Gráfico de Ingresos
            </h2>
            <SimpleLineChart
              title="Ingresos por Canal"
              subtitle="Última semana"
              datasets={revenueData}
              loading={isLoading}
              yAxisLabel="Monto ($)"
              xAxisLabel="Día"
              ariaLabel="Gráfico de ingresos por canal"
            />
          </section>
        </div>

        {/* Bottom Section - Inventory & Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Alerts */}
          <section aria-labelledby="inventory-heading">
            <h2 id="inventory-heading" className="sr-only">
              Alertas de Inventario
            </h2>
            <InventoryAlertCard
              lowStockItems={lowStockItems}
              expiringItems={expiringItems}
              loading={isLoading}
              ariaLabel="Alertas de stock bajo y productos próximos a vencer"
            />
          </section>

          {/* Top Customers */}
          <section aria-labelledby="customers-heading">
            <h2 id="customers-heading" className="sr-only">
              Clientes Principales
            </h2>
            <TopCustomersCard
              customers={topCustomers}
              loading={isLoading}
              ariaLabel="Top 8 clientes por volumen de ventas"
            />
          </section>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Use los filtros de rango de fechas para analizar datos de
            períodos específicos. Los gráficos se actualizarán automáticamente.
          </p>
        </div>
      </div>
    </main>
  );
};

DashboardExample.displayName = 'DashboardExample';
