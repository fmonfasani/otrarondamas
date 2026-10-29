/**
 * InventoryAlertCard - Low stock and expiring items widget
 * Displays inventory alerts from @wapsell/types (AlertasInventario)
 */

import React from 'react';
import { AlertaStockBajo, AlertaLotePorVencer } from '@otrarondamas/shared-types';
import { ChartWrapper } from './ChartWrapper';

export interface InventoryAlertCardProps {
  lowStockItems: AlertaStockBajo[];
  expiringItems: AlertaLotePorVencer[];
  maxItems?: number;
  loading?: boolean;
  error?: string | null;
  ariaLabel?: string;
}

export const InventoryAlertCard = React.forwardRef<HTMLDivElement, InventoryAlertCardProps>(
  (
    {
      lowStockItems = [],
      expiringItems = [],
      maxItems = 5,
      loading = false,
      error = null,
      ariaLabel = 'Alertas de inventario',
    },
    ref
  ) => {
    const isEmpty = lowStockItems.length === 0 && expiringItems.length === 0;

    const displayLowStock = lowStockItems.slice(0, maxItems);
    const displayExpiring = expiringItems.slice(0, maxItems);

    const getSeverity = (stock: number, minStock: number) => {
      const ratio = stock / (minStock || 1);
      if (ratio === 0) return 'critical';
      if (ratio <= 0.5) return 'high';
      return 'medium';
    };

    const severityColors = {
      critical: 'bg-red-50 border-l-4 border-l-red-500',
      high: 'bg-orange-50 border-l-4 border-l-orange-500',
      medium: 'bg-yellow-50 border-l-4 border-l-yellow-500',
    };

    const severityIcons = {
      critical: '⚠️',
      high: '⚡',
      medium: '📢',
    };

    return (
      <ChartWrapper
        ref={ref}
        title="Alertas de Inventario"
        subtitle="Stock bajo y productos próximos a vencer"
        loading={loading}
        error={error}
        empty={isEmpty}
        emptyMessage="No hay alertas activas"
        ariaLabel={ariaLabel}
      >
        <div className="space-y-4">
          {/* Low Stock Section */}
          {displayLowStock.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
                Stock Bajo
              </h4>
              <div className="space-y-2">
                {displayLowStock.map((item) => {
                  const severity = getSeverity(item.stockTotal, item.stockMinimo);
                  return (
                    <div
                      key={item.productoId}
                      className={`p-3 rounded ${severityColors[severity]}`}
                      role="alert"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span>{severityIcons[severity]}</span>
                            <p className="text-sm font-medium text-gray-900">
                              {item.nombre}
                            </p>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            Código: {item.codigoInterno}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {item.stockTotal}
                          </p>
                          <p className="text-xs text-gray-600">
                            Mín: {item.stockMinimo}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {lowStockItems.length > maxItems && (
                <p className="text-xs text-gray-500 mt-2">
                  +{lowStockItems.length - maxItems} más
                </p>
              )}
            </div>
          )}

          {/* Expiring Items Section */}
          {displayExpiring.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-orange-500 rounded-full" />
                Próximos a Vencer
              </h4>
              <div className="space-y-2">
                {displayExpiring.map((item) => {
                  const vencementDate = new Date(item.vencimiento);
                  const today = new Date();
                  const daysUntilExpiry = Math.ceil(
                    (vencementDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                  );

                  const isExpired = daysUntilExpiry < 0;
                  const isDanger = !isExpired && daysUntilExpiry <= 7;

                  return (
                    <div
                      key={item.loteId}
                      className={`p-3 rounded border-l-4 ${
                        isExpired
                          ? 'bg-red-50 border-l-red-500'
                          : isDanger
                            ? 'bg-orange-50 border-l-orange-500'
                            : 'bg-yellow-50 border-l-yellow-500'
                      }`}
                      role="alert"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {item.productoNombre}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Lote: {item.numeroLote}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-semibold ${
                            isExpired ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {vencementDate.toLocaleDateString('es-AR')}
                          </p>
                          <p className={`text-xs ${
                            isExpired
                              ? 'text-red-600'
                              : isDanger
                                ? 'text-orange-600'
                                : 'text-gray-600'
                          }`}>
                            {isExpired
                              ? 'Vencido'
                              : `${daysUntilExpiry} días`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {expiringItems.length > maxItems && (
                <p className="text-xs text-gray-500 mt-2">
                  +{expiringItems.length - maxItems} más
                </p>
              )}
            </div>
          )}
        </div>
      </ChartWrapper>
    );
  }
);

InventoryAlertCard.displayName = 'InventoryAlertCard';
