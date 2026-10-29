/**
 * SearchResults - Display and manage search results
 * Shows product count, sorting, and product grid
 */

import React from 'react';
import { ProductoTienda } from '@wapsell/types';
import { ProductGrid } from './ProductGrid';
import { SortDropdown } from './SortDropdown';

export interface SearchResultsProps {
  query: string;
  products: ProductoTienda[];
  totalCount?: number;
  loading?: boolean;
  sortBy?: 'relevance' | 'price-asc' | 'price-desc' | 'newest' | 'popular' | 'rating';
  onSortChange?: (sort: string) => void;
  onAddToCart: (product: ProductoTienda) => void;
  onViewDetails?: (product: ProductoTienda) => void;
  onClearSearch?: () => void;
}

export const SearchResults = React.forwardRef<HTMLDivElement, SearchResultsProps>(
  (
    {
      query,
      products,
      totalCount,
      loading = false,
      sortBy = 'relevance',
      onSortChange,
      onAddToCart,
      onViewDetails,
      onClearSearch,
    },
    ref
  ) => {
    const displayTotal = totalCount ?? products.length;

    const sortOptions = [
      { value: 'relevance', label: 'Relevancia' },
      { value: 'price-asc', label: 'Menor precio' },
      { value: 'price-desc', label: 'Mayor precio' },
      { value: 'newest', label: 'Más nuevos' },
      { value: 'popular', label: 'Populares' },
      { value: 'rating', label: 'Mejor calificados' },
    ];

    return (
      <div ref={ref} className="w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Resultados de búsqueda
              </h1>
              {query && (
                <p className="text-gray-600 mt-1">
                  "{query}"
                </p>
              )}
            </div>
            {query && onClearSearch && (
              <button
                onClick={onClearSearch}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>

          {/* Results Count and Sort */}
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              {loading ? (
                <span>Buscando productos...</span>
              ) : displayTotal === 0 ? (
                <span>Sin resultados</span>
              ) : (
                <>
                  Mostrando <span className="font-semibold">{products.length}</span> de{' '}
                  <span className="font-semibold">{displayTotal}</span> producto
                  {displayTotal !== 1 ? 's' : ''}
                </>
              )}
            </p>

            {/* Sort Dropdown */}
            {!loading && displayTotal > 0 && onSortChange && (
              <SortDropdown
                value={sortBy}
                onChange={onSortChange}
                options={sortOptions}
              />
            )}
          </div>
        </div>

        {/* Products Grid */}
        {displayTotal > 0 ? (
          <ProductGrid
            products={products}
            onAddToCart={onAddToCart}
            onViewDetails={onViewDetails}
            loading={loading}
          />
        ) : !loading ? (
          /* Empty State */
          <div className="py-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No se encontraron productos
            </h2>
            <p className="text-gray-600 mb-6">
              {query
                ? `No hay productos que coincidan con tu búsqueda "${query}"`
                : 'Intenta con otros términos de búsqueda'}
            </p>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Algunas sugerencias:</p>
              <ul className="list-disc list-inside inline-block">
                <li>Revisa la ortografía</li>
                <li>Intenta términos más generales</li>
                <li>Usa menos palabras</li>
              </ul>
            </div>
          </div>
        ) : null}

        {/* Pagination or Load More */}
        {displayTotal > products.length && (
          <div className="mt-8 flex justify-center">
            <button className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium">
              Cargar más resultados
            </button>
          </div>
        )}
      </div>
    );
  }
);

SearchResults.displayName = 'SearchResults';
