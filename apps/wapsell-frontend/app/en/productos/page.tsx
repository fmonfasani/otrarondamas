'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import ProductCard from '@/components/ProductCard';
import ProductFilters from '@/components/ProductFilters';
import EmptyState from '@/components/EmptyState';
import { useTranslations } from 'next-intl';

interface Producto {
  id: string;
  nombre: string;
  sku: string;
  precio: number;
  imagen?: string;
  familia?: { id: string; nombre: string };
  stock: number;
}

function ProductosContent() {
  const { empresa } = useAuth();
  const t = useTranslations();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [familiaId, setFamiliaId] = useState('');

  useEffect(() => {
    const fetchProductos = async () => {
      if (!empresa?.id) return;

      try {
        setLoading(true);
        const jwt = localStorage.getItem('jwt');
        const empresaId = localStorage.getItem('empresaId');

        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (familiaId) params.append('familiaId', familiaId);
        params.append('empresaId', empresaId || empresa.id);

        const res = await fetch(`/api/productos?${params}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (res.ok) {
          const data = await res.json();
          setProductos(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch productos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, [search, familiaId, empresa?.id]);

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
        <h1 className="text-4xl font-bold text-[#1A1815] mb-2">{t('productos.title')}</h1>
        <p className="text-gray-600">{t('productos.subtitle')}</p>
      </div>

      <ProductFilters
        search={search}
        setSearch={setSearch}
        familiaId={familiaId}
        setFamiliaId={setFamiliaId}
      />

      {productos.length === 0 ? (
        <EmptyState message={t('productos.empty')} action={t('productos.emptyAction')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {productos.map((p) => (
            <ProductCard key={p.id} producto={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductosPage() {
  return (
    <ProtectedRoute requireEmpresa={true}>
      <DashboardLayout>
        <ProductosContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
