/**
 * FilterSidebar - Combined filter panel with responsive layout
 * Includes all filters (category, price, availability, rating)
 * Mobile: Modal/dropdown, Tablet/Desktop: Fixed sidebar
 */

import React, { useState } from 'react';
import { Familia, Subfamilia } from '@wapsell/types';
import { CategoryFilter } from './CategoryFilter';
import { PriceRangeSlider } from './PriceRangeSlider';
import { AvailabilityFilter } from './AvailabilityFilter';
import { RatingFilter } from './RatingFilter';

export interface FilterState {
  familias: string[];
  subfamilias: string[];
  minPrice: number;
  maxPrice: number;
  onlyInStock: boolean;
  minRating: number;
}

export interface FilterSidebarProps {
  familias: Familia[];
  subfamilias: Subfamilia[];
  filters: FilterState;
  minPriceRange: number;
  maxPriceRange: number;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  onReset: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export const FilterSidebar = React.forwardRef<HTMLDivElement, FilterSidebarProps>(
  (
    {
      familias,
      subfamilias,
      filters,
      minPriceRange,
      maxPriceRange,
      onFiltersChange,
      onReset,
      isOpen = true,
      onClose,
      isMobile = false,
    },
    ref
  ) => {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
      new Set(['category', 'price', 'availability', 'rating'])
    );

    const toggleSection = (section: string) => {
      const newExpanded = new Set(expandedSections);
      if (newExpanded.has(section)) {
        newExpanded.delete(section);
      } else {
        newExpanded.add(section);
      }
      setExpandedSections(newExpanded);
    };

    const hasActiveFilters =
      filters.familias.length > 0 ||
      filters.subfamilias.length > 0 ||
      filters.minPrice > minPriceRange ||
      filters.maxPrice < maxPriceRange ||
      filters.onlyInStock ||
      filters.minRating > 0;

    const containerClasses = isMobile
      ? `fixed inset-0 z-50 bg-black/50 ${isOpen ? '' : 'hidden'}`
      : '';

    const sidebarClasses = isMobile
      ? 'fixed right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto'
      : 'bg-white rounded-lg border border-gray-200 p-6';

    return (
      <>
        {/* Mobile Overlay */}
        {isMobile && isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />
        )}

        {/* Sidebar */}
        <div
          ref={ref}
          className={`${containerClasses} ${isMobile ? (isOpen ? 'block' : 'hidden') : ''}`}
        >
          <div className={sidebarClasses}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Filtros</h2>
              {isMobile && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Cerrar filtros"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="w-full mb-6 py-2 px-4 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors font-medium"
              >
                Limpiar todos los filtros
              </button>
            )}

            {/* Filters Container */}
            <div className="space-y-6">
              {/* Category Filter */}
              <div>
                <button
                  onClick={() => toggleSection('category')}
                  className="w-full flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="font-semibold text-gray-900">Categorías</span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      expandedSections.has('category') ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
                {expandedSections.has('category') && (
                  <div className="mt-3">
                    <CategoryFilter
                      familias={familias}
                      subfamilias={subfamilias}
                      selectedFamilias={filters.familias}
                      selectedSubfamilias={filters.subfamilias}
                      onFamiliaChange={(id, checked) => {
                        const newFamilias = checked
                          ? [...filters.familias, id]
                          : filters.familias.filter((f) => f !== id);
                        onFiltersChange({ familias: newFamilias });
                      }}
                      onSubfamiliaChange={(id, checked) => {
                        const newSubfamilias = checked
                          ? [...filters.subfamilias, id]
                          : filters.subfamilias.filter((s) => s !== id);
                        onFiltersChange({ subfamilias: newSubfamilias });
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Price Filter */}
              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={() => toggleSection('price')}
                  className="w-full flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="font-semibold text-gray-900">Precio</span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      expandedSections.has('price') ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
                {expandedSections.has('price') && (
                  <div className="mt-3">
                    <PriceRangeSlider
                      minPrice={minPriceRange}
                      maxPrice={maxPriceRange}
                      selectedMin={filters.minPrice}
                      selectedMax={filters.maxPrice}
                      onMinChange={(value) => onFiltersChange({ minPrice: value })}
                      onMaxChange={(value) => onFiltersChange({ maxPrice: value })}
                    />
                  </div>
                )}
              </div>

              {/* Availability Filter */}
              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={() => toggleSection('availability')}
                  className="w-full flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="font-semibold text-gray-900">Disponibilidad</span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      expandedSections.has('availability') ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
                {expandedSections.has('availability') && (
                  <div className="mt-3">
                    <AvailabilityFilter
                      showInStockOnly={filters.onlyInStock}
                      onToggle={(checked) => onFiltersChange({ onlyInStock: checked })}
                    />
                  </div>
                )}
              </div>

              {/* Rating Filter */}
              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={() => toggleSection('rating')}
                  className="w-full flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="font-semibold text-gray-900">Calificación</span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      expandedSections.has('rating') ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
                {expandedSections.has('rating') && (
                  <div className="mt-3">
                    <RatingFilter
                      minRating={filters.minRating}
                      onMinRatingChange={(value) => onFiltersChange({ minRating: value })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Apply Button (Mobile) */}
            {isMobile && (
              <button
                onClick={onClose}
                className="w-full mt-6 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Aplicar Filtros
              </button>
            )}
          </div>
        </div>
      </>
    );
  }
);

FilterSidebar.displayName = 'FilterSidebar';
