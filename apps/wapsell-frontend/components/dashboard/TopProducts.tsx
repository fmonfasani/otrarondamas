'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';

interface Product {
  id: string;
  nombre: string;
  sku?: string;
  revenue?: number;
  quantity?: number;
}

interface TopProductsDto {
  metric: 'revenue' | 'quantity';
  limit: number;
  products: Product[];
}

export default function TopProducts({
  limit = 10,
  metric = 'revenue',
}: {
  limit?: number;
  metric?: 'revenue' | 'quantity';
}) {
  const { empresaId } = useAuth();
  const [products, setProducts] = useState<TopProductsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!empresaId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const jwt = localStorage.getItem('jwt');

        if (!jwt) {
          setError('No authentication token found');
          return;
        }

        const res = await fetch(`/api/dashboard/top-products?limit=${limit}&metric=${metric}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch top products');
        }

        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err instanceof Error ? err.message : 'Error loading products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [empresaId, limit, metric]);

  if (!empresaId) {
    return (
      <div className="text-center text-gray-600">Selecciona una empresa para ver productos</div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error cargando productos: {error}
      </div>
    );
  }

  if (!products || !products.products || products.products.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
        No hay productos disponibles
      </div>
    );
  }

  const metricLabel = metric === 'revenue' ? 'Ingresos' : 'Cantidad';
  const formatValue = (value?: number) => {
    if (!value) return '0';
    if (metric === 'revenue') {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toString();
  };

  const maxValue = Math.max(
    ...products.products.map((p) => (metric === 'revenue' ? p.revenue || 0 : p.quantity || 0)),
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-[#1A1815] mb-4">
        Top {products.products.length} Productos por {metricLabel}
      </h3>

      <div className="space-y-3">
        {products.products.map((product, idx) => {
          const value = metric === 'revenue' ? product.revenue || 0 : product.quantity || 0;
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

          return (
            <div key={product.id} className="flex items-center gap-4">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#D97757] text-white rounded-full text-sm font-semibold">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-medium text-[#1A1815] truncate">{product.nombre}</p>
                    {product.sku && <p className="text-xs text-gray-500">{product.sku}</p>}
                  </div>
                  <p className="font-semibold text-[#D97757] flex-shrink-0">{formatValue(value)}</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-[#D97757] to-[#E8925B] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
