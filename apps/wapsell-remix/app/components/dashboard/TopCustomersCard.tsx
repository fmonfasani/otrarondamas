/**
 * TopCustomersCard - Best customers widget
 * Shows top customers by sales volume
 */

import React from 'react';
import { ChartWrapper } from './ChartWrapper';

export interface TopCustomer {
  id: string;
  name: string;
  email?: string;
  totalSales: number;
  ordersCount: number;
  lastOrderDate?: string;
}

export interface TopCustomersCardProps {
  customers: TopCustomer[];
  maxItems?: number;
  loading?: boolean;
  error?: string | null;
  ariaLabel?: string;
}

export const TopCustomersCard = React.forwardRef<HTMLDivElement, TopCustomersCardProps>(
  (
    {
      customers = [],
      maxItems = 8,
      loading = false,
      error = null,
      ariaLabel = 'Clientes principales',
    },
    ref
  ) => {
    const displayCustomers = customers.slice(0, maxItems);
    const isEmpty = customers.length === 0;

    const getRankColor = (index: number) => {
      if (index === 0) return 'bg-yellow-50 border-l-4 border-l-yellow-400';
      if (index === 1) return 'bg-gray-50 border-l-4 border-l-gray-400';
      if (index === 2) return 'bg-orange-50 border-l-4 border-l-orange-400';
      return 'bg-blue-50 border-l-4 border-l-blue-400';
    };

    const getRankIcon = (index: number) => {
      if (index === 0) return '🥇';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      return `#${index + 1}`;
    };

    const maxSales = displayCustomers[0]?.totalSales || 1;

    return (
      <ChartWrapper
        ref={ref}
        title="Clientes Principales"
        subtitle="Mejores clientes por volumen de ventas"
        loading={loading}
        error={error}
        empty={isEmpty}
        emptyMessage="No hay datos de clientes disponibles"
        ariaLabel={ariaLabel}
      >
        <div className="space-y-3">
          {displayCustomers.map((customer, index) => {
            const percentage = (customer.totalSales / maxSales) * 100;

            return (
              <div
                key={customer.id}
                className={`p-4 rounded ${getRankColor(index)}`}
                role="listitem"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-lg font-bold flex-shrink-0">
                      {getRankIcon(index)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {customer.name}
                      </p>
                      {customer.email && (
                        <p className="text-xs text-gray-600 truncate">
                          {customer.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      ${customer.totalSales.toLocaleString('es-AR')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {customer.ordersCount} pedido{customer.ordersCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={Math.round(percentage)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${customer.name} sales progress`}
                  />
                </div>

                {/* Last Order */}
                {customer.lastOrderDate && (
                  <p className="text-xs text-gray-600 mt-2">
                    Último pedido:{' '}
                    {new Date(customer.lastOrderDate).toLocaleDateString('es-AR')}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {customers.length > maxItems && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              +{customers.length - maxItems} clientes más
            </p>
          </div>
        )}
      </ChartWrapper>
    );
  }
);

TopCustomersCard.displayName = 'TopCustomersCard';
