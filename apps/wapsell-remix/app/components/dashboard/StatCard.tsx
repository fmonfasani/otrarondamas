/**
 * StatCard - Reusable stat display component
 * Shows a metric with label, value, and optional trend
 */

import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  format?: 'currency' | 'number' | 'text';
  loading?: boolean;
  ariaLabel?: string;
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  purple: 'bg-purple-50 text-purple-600',
  gray: 'bg-gray-50 text-gray-600',
};

const trendColorMap = {
  up: {
    text: 'text-green-600',
    bg: 'bg-green-50',
    icon: '↑',
  },
  down: {
    text: 'text-red-600',
    bg: 'bg-red-50',
    icon: '↓',
  },
};

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      label,
      value,
      icon,
      color = 'blue',
      trend,
      format = 'text',
      loading = false,
      ariaLabel,
      ...props
    },
    ref
  ) => {
    const formattedValue = React.useMemo(() => {
      if (loading) return '-';

      if (format === 'currency' && typeof value === 'number') {
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
        }).format(value);
      }

      if (format === 'number' && typeof value === 'number') {
        return value.toLocaleString('es-AR');
      }

      return value;
    }, [value, format, loading]);

    return (
      <div
        ref={ref}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        aria-label={ariaLabel || label}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
            <p className={`text-2xl font-bold ${loading ? 'text-gray-400' : 'text-gray-900'}`}>
              {formattedValue}
            </p>

            {trend && !loading && (
              <div
                className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${trendColorMap[trend.direction].text}`}
              >
                <span>{trendColorMap[trend.direction].icon}</span>
                <span>{Math.abs(trend.value)}% vs mes anterior</span>
              </div>
            )}
          </div>

          {icon && (
            <div
              className={`p-3 rounded-lg ${colorMap[color]} flex-shrink-0`}
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';
