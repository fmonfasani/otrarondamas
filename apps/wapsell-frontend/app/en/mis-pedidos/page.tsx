'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import OrderStatus from '@/components/OrderStatus';
import EmptyState from '@/components/EmptyState';
import { useTranslations } from 'next-intl';

interface Pedido {
  id: string;
  numero: string;
  total: number;
  estado: string;
  createdAt: string;
  cliente?: { nombre: string };
  items?: Array<{ producto: { nombre: string }; cantidad: number }>;
}

function MisPedidosContent() {
  const { empresa } = useAuth();
  const t = useTranslations();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPedidos = async () => {
      if (!empresa?.id) return;

      try {
        const jwt = localStorage.getItem('jwt');
        const empresaId = localStorage.getItem('empresaId');

        const res = await fetch(`/api/mis-pedidos?empresaId=${empresaId || empresa.id}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (res.ok) {
          const data = await res.json();
          setPedidos(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch pedidos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, [empresa?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#1A1815] mb-2">{t('misPedidos.title')}</h1>
        <p className="text-gray-600">{t('misPedidos.subtitle')}</p>
      </div>

      {pedidos.length === 0 ? (
        <EmptyState
          message={t('misPedidos.empty')}
          action={t('misPedidos.emptyAction')}
          actionLink="/es/productos"
        />
      ) : (
        <div className="space-y-4">
          {pedidos.map((p) => (
            <Link key={p.id} href={`/es/mis-pedidos/${p.id}`}>
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">
                      {t('misPedidos.orderNumber')} #{p.numero}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${p.total.toFixed(2)}</p>
                    <OrderStatus estado={p.estado} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MisPedidosPage() {
  return (
    <ProtectedRoute requireEmpresa={true}>
      <DashboardLayout>
        <MisPedidosContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
