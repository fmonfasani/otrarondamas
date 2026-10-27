'use client';

export const dynamic = 'force-dynamic';

import { useAuth } from '@/components/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useTranslations } from 'next-intl';

function DashboardContent() {
  const { empresa, user } = useAuth();
  const t = useTranslations();

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#1A1815] mb-2">
          {t('dashboard.title')}
        </h1>
        <p className="text-gray-600">
          {t('dashboard.welcome', { name: user?.nombre })}
        </p>
      </div>

      {/* Business Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-[#D97757]">
          <p className="text-gray-600 text-sm mb-2">{t('dashboard.businessName')}</p>
          <p className="text-2xl font-bold text-[#1A1815]">{empresa?.nombre}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-[#D97757]">
          <p className="text-gray-600 text-sm mb-2">{t('dashboard.plan')}</p>
          <p className="text-2xl font-bold capitalize text-[#D97757]">
            {empresa?.plan}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-[#D97757]">
          <p className="text-gray-600 text-sm mb-2">{t('dashboard.activeUsers')}</p>
          <p className="text-2xl font-bold text-[#1A1815]">
            {empresa?.usuariosActivos}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-[#D97757]">
          <p className="text-gray-600 text-sm mb-2">{t('dashboard.lastActivity')}</p>
          <p className="text-lg font-semibold text-gray-700">
            {empresa?.ultimaActividad}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      <DashboardContent />
    </ProtectedRoute>
  );
}
