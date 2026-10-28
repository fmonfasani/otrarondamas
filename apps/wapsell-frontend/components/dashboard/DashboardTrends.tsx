'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';

interface TrendData {
  date: string;
  value: number;
}

interface TrendChartDto {
  metric: 'revenue' | 'orders';
  period: string;
  data: TrendData[];
  currentValue: number;
  previousValue: number;
}

export default function DashboardTrends({
  period = '30d',
  metric = 'revenue',
}: {
  period?: string;
  metric?: 'revenue' | 'orders';
}) {
  const { empresaId } = useAuth();
  const [trends, setTrends] = useState<TrendChartDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
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

        const res = await fetch(`/api/dashboard/trends?metric=${metric}&period=${period}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch trends');
        }

        const data = await res.json();
        setTrends(data);
      } catch (err) {
        console.error('Error fetching trends:', err);
        setError(err instanceof Error ? err.message : 'Error loading trends');
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [empresaId, period, metric]);

  if (!empresaId) {
    return <div className="text-center text-gray-600">Selecciona una empresa para ver tendencias</div>;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error cargando tendencias: {error}
      </div>
    );
  }

  if (!trends || !trends.data || trends.data.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
        No hay datos de tendencias disponibles
      </div>
    );
  }

  const metricLabel = metric === 'revenue' ? 'Ingresos' : 'Pedidos';
  const maxValue = Math.max(...trends.data.map((d) => d.value));
  const minValue = Math.min(...trends.data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  const formatValue = (value: number) => {
    if (metric === 'revenue') {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-[#1A1815] mb-4">
        Tendencia de {metricLabel} ({period})
      </h3>

      {/* Simple line chart representation using bars */}
      <div className="mb-6">
        <div className="flex items-end justify-between gap-1 h-64 mb-4">
          {trends.data.map((point, idx) => {
            const height = ((point.value - minValue) / range) * 100 || 5;
            return (
              <div
                key={idx}
                className="flex-1 bg-gradient-to-t from-[#D97757] to-[#E8925B] rounded-t hover:opacity-80 transition-opacity cursor-pointer relative group"
                style={{ height: `${height}%`, minHeight: '4px' }}
              >
                <div className="absolute bottom-full left-0 right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none z-10">
                  <div className="font-semibold">{formatValue(point.value)}</div>
                  <div className="text-xs">{new Date(point.date).toLocaleDateString('es-AR')}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{new Date(trends.data[0].date).toLocaleDateString('es-AR')}</span>
          <span>{new Date(trends.data[Math.floor(trends.data.length / 2)].date).toLocaleDateString('es-AR')}</span>
          <span>{new Date(trends.data[trends.data.length - 1].date).toLocaleDateString('es-AR')}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-gray-600 text-sm">Valor Actual</p>
          <p className="text-2xl font-bold text-[#1A1815]">{formatValue(trends.currentValue)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Promedio</p>
          <p className="text-2xl font-bold text-[#1A1815]">
            {formatValue(trends.data.reduce((sum, d) => sum + d.value, 0) / trends.data.length)}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Cambio vs Período Anterior</p>
          <p className={`text-2xl font-bold ${
            trends.currentValue >= trends.previousValue ? 'text-green-600' : 'text-red-600'
          }`}>
            {((trends.currentValue - trends.previousValue) / (trends.previousValue || 1) * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
