import { LoaderFunction, json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Suspense } from 'react';
import { requireAuth } from '~/services/auth.server';
import { getDashboardKPIs, DashboardAPIError } from '~/services/dashboard.client';
import { DashboardStats } from '~/components/dashboard/DashboardStats';
import { RecentOrders } from '~/components/dashboard/RecentOrders';
import { useTranslation } from '~/hooks/useTranslation';

interface DashboardLoaderData {
  kpis: {
    sales: number;
    revenue: number;
    orders: number;
    customers: number;
  };
  orders?: {
    id: string;
    customer: string;
    amount: number;
    date: string;
    status: 'pending' | 'processing' | 'completed' | 'cancelled';
  }[];
  error?: string;
}

/**
 * Dashboard loader — fetches KPIs and trend data from NestJS API
 *
 * Auth: requires JWT token from session
 * Errors:
 * - 401 (Unauthorized): redirects to /login
 * - 403 (Forbidden): redirects to /forbidden
 * - 500+ (Server error): returns error state for error boundary
 * - Timeout: retries once, then returns error state
 */
export const loader: LoaderFunction = async ({ request }): Promise<DashboardLoaderData> => {
  const token = await requireAuth(request);

  try {
    // Fetch KPIs with default 30-day period
    const kpisData = await getDashboardKPIs(token, '30d');

    // Map API response to component format
    return json({
      kpis: {
        sales: kpisData.kpis.totalOrders.value, // order count
        revenue: kpisData.kpis.totalRevenue.value,
        orders: kpisData.kpis.totalOrders.value,
        customers: kpisData.kpis.totalCustomers.value,
      },
      orders: [], // TODO: fetch from recent-orders endpoint when available
    });
  } catch (error) {
    if (error instanceof DashboardAPIError) {
      // 401 Unauthorized — token expired or invalid
      if (error.statusCode === 401) {
        throw redirect('/login');
      }

      // 403 Forbidden — insufficient permissions
      if (error.statusCode === 403) {
        throw redirect('/forbidden');
      }

      // 5xx Server error — return error state for component to handle
      if (error.statusCode >= 500) {
        console.error('[dashboard] API server error:', error.message);
        return json(
          {
            kpis: {
              sales: 0,
              revenue: 0,
              orders: 0,
              customers: 0,
            },
            error: 'Failed to load dashboard data. Please try again later.',
          },
          { status: 200 } // Still return 200 so component can render error UI
        );
      }

      // Other API errors (4xx except 401/403)
      console.error('[dashboard] API error:', error.message);
      return json(
        {
          kpis: {
            sales: 0,
            revenue: 0,
            orders: 0,
            customers: 0,
          },
          error: error.message,
        },
        { status: 200 }
      );
    }

    // Unexpected error — log and show error state
    console.error('[dashboard] Unexpected error:', error);
    return json(
      {
        kpis: {
          sales: 0,
          revenue: 0,
          orders: 0,
          customers: 0,
        },
        error: 'An unexpected error occurred. Please try again later.',
      },
      { status: 200 }
    );
  }
};

export default function DashboardPage() {
  const { kpis, orders, error } = useLoaderData<DashboardLoaderData>();
  const { t } = useTranslation();

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600 mt-2">{t('dashboard.welcome')}</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
          <p className="text-xs text-red-700 mt-1">
            {t('dashboard.error_retry')}
          </p>
        </div>
      )}

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardStats
          sales={kpis.sales}
          revenue={kpis.revenue}
          orders={kpis.orders}
          customers={kpis.customers}
        />
      </Suspense>

      {orders && orders.length > 0 && (
        <Suspense fallback={<RecentOrdersSkeleton />}>
          <RecentOrders orders={orders} />
        </Suspense>
      )}
    </div>
  );
}

/**
 * Skeleton loader for dashboard stats
 */
function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg bg-gray-100 h-32 animate-pulse" />
      ))}
    </div>
  );
}

/**
 * Skeleton loader for recent orders
 */
function RecentOrdersSkeleton() {
  return (
    <div className="rounded-lg bg-gray-100 h-64 animate-pulse" />
  );
}
