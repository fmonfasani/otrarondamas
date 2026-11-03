import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { getApiBaseUrl } from '~/services/api.server';
import { DashboardStats } from '~/components/dashboard/DashboardStats';
import { RecentOrders } from '~/components/dashboard/RecentOrders';
import { useTranslation } from '~/hooks/useTranslation';

interface KPIData { sales: number; revenue: number; orders: number; customers: number; }
interface Order { id: string; customer: string; amount: number; date: string; status: 'pending' | 'processing' | 'completed' | 'cancelled'; }

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const apiUrl = getApiBaseUrl();
  const response = await fetch(`${apiUrl}/dashboard/kpis`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Response('Dashboard data could not be loaded.', { status: response.status });
  const kpis = (await response.json()) as KPIData;
  const ordersResponse = await fetch(`${apiUrl}/dashboard/recent-orders`, { headers: { Authorization: `Bearer ${token}` } });
  if (!ordersResponse.ok) throw new Response('Recent orders could not be loaded.', { status: ordersResponse.status });
  const orders = (await ordersResponse.json()) as Order[];
  return json({ kpis, orders });
}

export default function DashboardPage() {
  const { kpis, orders } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  return <div className="space-y-8 p-8">
    <div><h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1><p className="mt-2 text-gray-600">{t('dashboard.welcome')}</p></div>
    <DashboardStats sales={kpis.sales} revenue={kpis.revenue} orders={kpis.orders} customers={kpis.customers} />
    {orders.length > 0 ? <RecentOrders orders={orders} /> : null}
  </div>;
}
