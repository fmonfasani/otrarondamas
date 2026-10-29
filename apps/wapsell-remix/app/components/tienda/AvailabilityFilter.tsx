/**
 * AvailabilityFilter - In-stock toggle filter
 * Filter products by availability status
 */

import React from 'react';

export interface AvailabilityFilterProps {
  showInStockOnly: boolean;
  onToggle: (checked: boolean) => void;
  onlyInStockCount?: number;
}

export const AvailabilityFilter = React.forwardRef<HTMLDivElement, AvailabilityFilterProps>(
  ({ showInStockOnly, onToggle, onlyInStockCount }, ref) => {
    return (
      <div ref={ref} className="space-y-4">
        <h3 className="font-semibold text-gray-900">Disponibilidad</h3>

        <div className="space-y-3">
          {/* In Stock Only */}
          <label className="flex items-center cursor-pointer group">
            <input
              type="checkbox"
              checked={showInStockOnly}
              onChange={(e) => onToggle(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
            <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
              Solo disponibles
              {onlyInStockCount !== undefined && (
                <span className="ml-2 text-xs text-gray-500">({onlyInStockCount})</span>
              )}
            </span>
          </label>

          {/* Information Box */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mt-4">
            <p className="text-xs text-blue-800">
              <svg
                className="w-4 h-4 inline-block mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2z"
                  clipRule="evenodd"
                />
              </svg>
              Los productos sin stock pueden ser preordenados. Contacta con nosotros para más
              información.
            </p>
          </div>

          {/* Show All Option */}
          <button
            onClick={() => onToggle(!showInStockOnly)}
            className={`w-full py-2 px-3 rounded-lg text-sm transition-colors ${
              !showInStockOnly
                ? 'text-blue-600 bg-blue-50 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {!showInStockOnly ? '✓ Mostrar todos' : 'Mostrar todos'}
          </button>
        </div>

        {/* Additional Options */}
        <div className="pt-4 border-t border-gray-200 space-y-3">
          <h4 className="text-xs font-semibold text-gray-600 uppercase">Opciones de entrega</h4>

          <label className="flex items-center cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded cursor-pointer" disabled />
            <span className="ml-3 text-sm text-gray-600 cursor-not-allowed">
              Entrega rápida (próximo día)
            </span>
          </label>

          <label className="flex items-center cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded cursor-pointer" disabled />
            <span className="ml-3 text-sm text-gray-600 cursor-not-allowed">
              Envío gratis disponible
            </span>
          </label>

          <label className="flex items-center cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded cursor-pointer" disabled />
            <span className="ml-3 text-sm text-gray-600 cursor-not-allowed">
              Retiro en local
            </span>
          </label>
        </div>
      </div>
    );
  }
);

AvailabilityFilter.displayName = 'AvailabilityFilter';
