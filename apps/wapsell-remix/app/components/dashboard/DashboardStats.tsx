import { KPICard } from './KPICard';
import { useTranslation } from '~/hooks/useTranslation';

interface StatsProps {
  sales: number;
  revenue: number;
  orders: number;
  customers: number;
}

export function DashboardStats({ sales, revenue, orders, customers }: StatsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title={t('dashboard.sales')}
        value={sales}
        icon="📊"
        color="blue"
        trend={{ value: 12, direction: 'up' }}
      />
      <KPICard
        title={t('dashboard.revenue')}
        value={`$${revenue.toLocaleString()}`}
        icon="💰"
        color="green"
        trend={{ value: 8, direction: 'up' }}
      />
      <KPICard
        title={t('dashboard.orders')}
        value={orders}
        icon="📦"
        color="yellow"
        trend={{ value: 5, direction: 'down' }}
      />
      <KPICard
        title={t('dashboard.customers')}
        value={customers}
        icon="👥"
        color="red"
        trend={{ value: 3, direction: 'up' }}
      />
    </div>
  );
}
