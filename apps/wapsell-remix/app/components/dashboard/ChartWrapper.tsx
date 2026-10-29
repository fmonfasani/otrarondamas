/**
 * ChartWrapper - Base component for chart containers
 * Provides loading state, error handling, and responsive sizing
 */

import React from 'react';

export interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
  ariaLabel?: string;
}

export const ChartWrapper = React.forwardRef<HTMLDivElement, ChartWrapperProps>(
  (
    {
      title,
      subtitle,
      children,
      loading = false,
      error = null,
      empty = false,
      emptyMessage = 'No hay datos disponibles',
      className = '',
      ariaLabel,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}
        aria-label={ariaLabel || title}
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Cargando datos...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block p-3 bg-red-50 rounded-full mb-4">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4v2m0 0v2m0-6v-2m0 4v2m0-2v2m0 0v2"
                  />
                </svg>
              </div>
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          </div>
        )}

        {empty && !loading && !error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block p-3 bg-gray-50 rounded-full mb-4">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-600">{emptyMessage}</p>
            </div>
          </div>
        )}

        {!loading && !error && !empty && <div className="w-full">{children}</div>}
      </div>
    );
  }
);

ChartWrapper.displayName = 'ChartWrapper';
