'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface SearchResult {
  id: string;
  nombre: string;
  precio: number;
  imagen?: string;
  sku?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  query?: string;
  onSelectResult?: (result: SearchResult) => void;
  maxResults?: number;
}

/**
 * Search results dropdown component
 * - Shows matching products in a dropdown
 * - Loading state with spinner
 * - "No results" message
 * - Click handler for result selection
 * - Keyboard navigation ready
 */
export default function SearchResults({
  results,
  isLoading = false,
  query = '',
  onSelectResult,
  maxResults = 5,
}: SearchResultsProps) {
  const t = useTranslations();

  if (!query) {
    return null;
  }

  const displayResults = results.slice(0, maxResults);

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
      {isLoading && (
        <div className="p-4 flex items-center justify-center">
          <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-[#D97757] rounded-full mr-2"></div>
          <p className="text-sm text-gray-600">{t('common.searching')}</p>
        </div>
      )}

      {!isLoading && displayResults.length > 0 && (
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {displayResults.map((result) => (
            <button
              key={result.id}
              onClick={() => onSelectResult?.(result)}
              className="w-full px-4 py-3 hover:bg-gray-50 transition text-left flex items-center gap-3 group"
            >
              {result.imagen && (
                <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded overflow-hidden">
                  <Image
                    src={result.imagen}
                    alt={result.nombre}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#D97757]">
                  {result.nombre}
                </p>
                {result.sku && (
                  <p className="text-xs text-gray-500">{result.sku}</p>
                )}
              </div>

              <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                ${result.precio.toFixed(2)}
              </p>
            </button>
          ))}

          {results.length > maxResults && (
            <div className="px-4 py-3 text-center">
              <p className="text-xs text-gray-500">
                {t('common.showing')} {maxResults} {t('common.of')} {results.length}
              </p>
            </div>
          )}
        </div>
      )}

      {!isLoading && displayResults.length === 0 && query && (
        <div className="p-6 text-center">
          <svg
            className="w-8 h-8 text-gray-400 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
          <p className="text-sm text-gray-600">
            {t('tienda.noProductsFound')} "{query}"
          </p>
        </div>
      )}
    </div>
  );
}
