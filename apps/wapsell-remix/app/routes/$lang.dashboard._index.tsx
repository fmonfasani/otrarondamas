import { LoaderFunction, json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { DashboardStats } from '~/components/dashboard/DashboardStats';
import { RecentOrders } from '~/components/dashboard/RecentOrders';
import { useTranslation } from '~/hooks/useTranslation';

interface KPIData {
  sales: number;
  revenue: number;
  orders: number;
  customers: number;
}

interface Order {
  id: string;
  customer: string;
  amount: number;
  date: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
}

export const loader: LoaderFunction = async ({ request }) => {
  const token = await requireAuth(request);

  // Fetch dashboard data from NestJS API
  const apiUrl = process.env.VITE_API_URL;
  if (!apiUrl) {
    // Return mock data if API is not available
    return json({
      kpis: {
        sales: 1250,
        revenue: 45320,
        orders: 89,
        customers: 342,
      },
      orders: [
        {
          id: '1',
          customer: 'John Doe',
          amount: 250,
          date: '2024-01-15',
          status: 'completed' as const,
        },
        {
          id: '2',
          customer: 'Jane Smith',
          amount: 1200,
          date: '2024-01-14',
          status: 'processing' as const,
        },
      ],
    });
  }

  try {
    const response = await fetch(
      `${apiUrl}/dashboard/kpis`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      // Return mock data on API error
      return json({
        kpis: {
          sales: 1250,
          revenue: 45320,
          orders: 89,
          customers: 342,
        },
        orders: [
          {
            id: '1',
            customer: 'John Doe',
            amount: 250,
            date: '2024-01-15',
            status: 'completed' as const,
          },
          {
            id: '2',
            customer: 'Jane Smith',
            amount: 1200,
            date: '2024-01-14',
            status: 'processing' as const,
          },
        ],
      });
    }

    const kpis: KPIData = await response.json();

    // Try to fetch recent orders
    let orders: Order[] = [];
    try {
      const ordersResponse = await fetch(
        `${apiUrl}/dashboard/recent-orders`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (ordersResponse.ok) {
        orders = await ordersResponse.json();
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }

    return json({ kpis, orders });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    // Return mock data on error
    return json({
      kpis: {
        sales: 1250,
        revenue: 45320,
        orders: 89,
        customers: 342,
      },
      orders: [
        {
          id: '1',
          customer: 'John Doe',
          amount: 250,
          date: '2024-01-15',
          status: 'completed' as const,
        },
        {
          id: '2',
          customer: 'Jane Smith',
          amount: 1200,
          date: '2024-01-14',
          status: 'processing' as const,
        },
      ],
    });
  }
};

export default function DashboardPage() {
  const { kpis, orders } = useLoaderData<typeof loader>();
  const { t } = useTranslation();

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600 mt-2">{t('dashboard.welcome')}</p>
      </div>

      <DashboardStats
        sales={kpis.sales}
        revenue={kpis.revenue}
        orders={kpis.orders}
        customers={kpis.customers}
      />

      {orders && orders.length > 0 && (
        <RecentOrders orders={orders} />
      )}
    </div>
  );
}
