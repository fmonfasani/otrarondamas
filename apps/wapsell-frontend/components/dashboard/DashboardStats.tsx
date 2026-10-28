'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';

interface KPIData {
  period: string;
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  activeProducts: number;
  revenueChange: number;
  ordersChange: number;
  customersChange: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: string;
}

function StatCard({ title, value, change, icon }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const changeColor =
    change === undefined ? 'text-gray-600' : isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-[#D97757] hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600 text-sm mb-2">{title}</p>
          <p className="text-3xl font-bold text-[#1A1815]">{value}</p>
          {change !== undefined && (
            <p className={`text-sm mt-2 ${changeColor}`}>
              {isPositive ? '+' : ''}
              {change.toFixed(1)}% vs período anterior
            </p>
          )}
        </div>
        {icon && <span className="text-3xl opacity-20">{icon}</span>}
      </div>
    </div>
  );
}

export default function DashboardStats({ period = '30d' }: { period?: string }) {
  const { empresaId } = useAuth();
  const [stats, setStats] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
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

        const res = await fetch(`/api/dashboard/kpis?period=${period}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch stats');
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError(err instanceof Error ? err.message : 'Error loading statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [empresaId, period]);

  if (!empresaId) {
    return (
      <div className="text-center text-gray-600">Selecciona una empresa para ver estadísticas</div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error cargando estadísticas: {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
        No hay datos disponibles
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="stats-grid grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Ingresos"
        value={formatCurrency(stats.totalRevenue)}
        change={stats.revenueChange}
        icon="💰"
      />
      <StatCard title="Pedidos" value={stats.totalOrders} change={stats.ordersChange} icon="📦" />
      <StatCard
        title="Clientes"
        value={stats.totalCustomers}
        change={stats.customersChange}
        icon="👥"
      />
      <StatCard title="Productos Activos" value={stats.activeProducts} icon="🛍️" />
    </div>
  );
}
