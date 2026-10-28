'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import DashboardStats from '@/components/dashboard/DashboardStats';
import DashboardTrends from '@/components/dashboard/DashboardTrends';
import TopProducts from '@/components/dashboard/TopProducts';
import PeriodSelector from '@/components/dashboard/PeriodSelector';
import { useTranslations } from 'next-intl';

function DashboardContent() {
  const { empresa, user } = useAuth();
  const t = useTranslations();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [trendMetric, setTrendMetric] = useState<'revenue' | 'orders'>('revenue');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#1A1815] mb-2">{t('dashboard.title')}</h1>
        <p className="text-gray-600">{t('dashboard.welcome', { name: user?.nombre })}</p>
      </div>

      {/* Period Selector */}
      <div className="mb-8">
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards with Real Data */}
      <DashboardStats period={period} />

      {/* Trends and Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Métrica de Tendencia
            </label>
            <select
              value={trendMetric}
              onChange={(e) => setTrendMetric(e.target.value as 'revenue' | 'orders')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
            >
              <option value="revenue">Ingresos</option>
              <option value="orders">Pedidos</option>
            </select>
          </div>
          <DashboardTrends period={period} metric={trendMetric} />
        </div>

        <TopProducts limit={10} metric="revenue" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-[#1A1815] mb-4">
            {t('dashboard.products.title')}
          </h3>
          <p className="text-gray-600 mb-4">{t('dashboard.products.desc')}</p>
          <a
            href="/productos"
            className="inline-block px-4 py-2 bg-[#D97757] text-white rounded hover:bg-[#C86543] transition-colors"
          >
            {t('dashboard.products.cta')}
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-[#1A1815] mb-4">
            {t('dashboard.orders.title')}
          </h3>
          <p className="text-gray-600 mb-4">{t('dashboard.orders.desc')}</p>
          <a
            href="/pedidos"
            className="inline-block px-4 py-2 bg-[#D97757] text-white rounded hover:bg-[#C86543] transition-colors"
          >
            {t('dashboard.orders.cta')}
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-[#1A1815] mb-4">
            {t('dashboard.settings.title')}
          </h3>
          <p className="text-gray-600 mb-4">{t('dashboard.settings.desc')}</p>
          <a
            href={`/negocios/${empresa?.id}/settings`}
            className="inline-block px-4 py-2 bg-[#D97757] text-white rounded hover:bg-[#C86543] transition-colors"
          >
            {t('dashboard.settings.cta')}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute requireEmpresa={true}>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
