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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
      <KPICard
        title={t('dashboard.sales')}
        value={sales}
        icon="📊"
        color="primary"
        trend={{ value: 12, direction: 'up' }}
      />
      <KPICard
        title={t('dashboard.revenue')}
        value={`$${revenue.toLocaleString()}`}
        icon="💰"
        color="success"
        trend={{ value: 8, direction: 'up' }}
      />
      <KPICard
        title={t('dashboard.orders')}
        value={orders}
        icon="📦"
        color="secondary"
        trend={{ value: 5, direction: 'down' }}
      />
      <KPICard
        title={t('dashboard.customers')}
        value={customers}
        icon="👥"
        color="primary"
        trend={{ value: 3, direction: 'up' }}
      />
    </div>
  );
}
