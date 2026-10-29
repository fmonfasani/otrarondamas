/**
 * FilterBar - Filtering controls for dashboard
 * Provides category, status, and custom filter options
 */

import React from 'react';
import { Input } from '../Input';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterBarProps {
  categories?: FilterOption[];
  statuses?: FilterOption[];
  onCategoryChange?: (value: string) => void;
  onStatusChange?: (value: string) => void;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
  selectedCategory?: string;
  selectedStatus?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  (
    {
      categories = [],
      statuses = [],
      onCategoryChange,
      onStatusChange,
      onSearchChange,
      searchValue = '',
      selectedCategory = '',
      selectedStatus = '',
      disabled = false,
      ariaLabel = 'Filtros de dashboard',
    },
    ref
  ) => {
    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onCategoryChange?.(e.target.value);
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onStatusChange?.(e.target.value);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange?.(e.target.value);
    };

    const handleReset = () => {
      onCategoryChange?.('');
      onStatusChange?.('');
      onSearchChange?.('');
    };

    const isFilterActive = selectedCategory || selectedStatus || searchValue;

    return (
      <div
        ref={ref}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        aria-label={ariaLabel}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Input
              type="search"
              label="Buscar"
              placeholder="Buscar..."
              value={searchValue}
              onChange={handleSearchChange}
              disabled={disabled}
              aria-label="Buscar"
            />
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div>
              <label
                htmlFor="category-filter"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Categoría
              </label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={handleCategoryChange}
                disabled={disabled}
                className="w-full px-4 py-2 border border-gray-300 rounded-xs focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                aria-label="Filtrar por categoría"
              >
                <option value="">Todas</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                    {cat.count !== undefined && ` (${cat.count})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          {statuses.length > 0 && (
            <div>
              <label
                htmlFor="status-filter"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Estado
              </label>
              <select
                id="status-filter"
                value={selectedStatus}
                onChange={handleStatusChange}
                disabled={disabled}
                className="w-full px-4 py-2 border border-gray-300 rounded-xs focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                aria-label="Filtrar por estado"
              >
                <option value="">Todos</option>
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                    {status.count !== undefined && ` (${status.count})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={handleReset}
              disabled={!isFilterActive || disabled}
              className={`w-full px-4 py-2 text-sm font-medium rounded-xs transition-colors ${
                isFilterActive && !disabled
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
              aria-label="Limpiar filtros"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>
    );
  }
);

FilterBar.displayName = 'FilterBar';
