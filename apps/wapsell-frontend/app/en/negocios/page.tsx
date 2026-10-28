'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { empresasApi } from '@/lib/api';
import { Empresa } from '@/components/AuthContext';
import { useTranslations } from 'next-intl';

function NegociosContent() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();

  useEffect(() => {
    const loadEmpresas = async () => {
      try {
        setIsLoading(true);
        const data = await empresasApi.getMyEmpresas();
        setEmpresas(Array.isArray(data) ? data : data.empresas || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar empresas');
        console.error('Error loading empresas:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEmpresas();
  }, []);

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'premium':
        return 'bg-yellow-100 text-yellow-800';
      case 'pro':
        return 'bg-blue-100 text-blue-800';
      case 'basico':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D97757]"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1A1815] mb-2">{t('negocios.title')}</h1>
          <p className="text-gray-600">{t('negocios.subtitle')}</p>
        </div>
        <Link
          href="/negocios/crear"
          className="flex items-center gap-2 px-6 py-3 bg-[#D97757] text-white rounded-lg hover:bg-[#C86543] transition-colors font-semibold"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          {t('negocios.createButton')}
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {empresas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6v6m0 0v6m0-6h6m0 0h6m0 0v-6m0 6v6"
            />
          </svg>
          <p className="text-xl text-gray-600 mb-4">{t('negocios.noBusinesses')}</p>
          <Link
            href="/negocios/crear"
            className="inline-block px-6 py-3 bg-[#D97757] text-white rounded-lg hover:bg-[#C86543] transition-colors font-semibold"
          >
            {t('negocios.createFirst')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {empresas.map((empresa) => (
            <div
              key={empresa.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border-t-4 border-[#D97757]"
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-[#1A1815] mb-2">{empresa.nombre}</h3>
                <p className="text-gray-600 text-sm mb-4">{empresa.email}</p>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">{t('negocios.plan')}:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getPlanBadgeColor(
                        empresa.plan,
                      )}`}
                    >
                      {empresa.plan}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">{t('negocios.activeUsers')}:</span>
                    <span className="font-semibold text-[#1A1815]">{empresa.usuariosActivos}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">{t('negocios.lastActivity')}:</span>
                    <span className="text-sm text-gray-700">{empresa.ultimaActividad}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/negocios/${empresa.id}/settings`}
                    className="flex-1 px-4 py-2 bg-gray-100 text-[#1A1815] rounded hover:bg-gray-200 transition-colors text-center font-semibold text-sm"
                  >
                    {t('negocios.edit')}
                  </Link>
                  <button
                    onClick={() => {
                      localStorage.setItem('empresaId', empresa.id);
                      window.location.href = '/dashboard';
                    }}
                    className="flex-1 px-4 py-2 bg-[#D97757] text-white rounded hover:bg-[#C86543] transition-colors text-center font-semibold text-sm"
                  >
                    {t('negocios.access')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Negocios() {
  return (
    <ProtectedRoute requireEmpresa={false}>
      <NegociosContent />
    </ProtectedRoute>
  );
}
