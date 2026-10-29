/**
 * SearchBar - Product search with autocomplete suggestions
 * Supports debounced search with loading state
 */

import React, { useState, useRef, useEffect } from 'react';

export interface SearchSuggestion {
  id: string;
  name: string;
  category?: string;
  price?: string;
}

export interface SearchBarProps {
  onSearch: (query: string) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  suggestions?: SearchSuggestion[];
  loading?: boolean;
  placeholder?: string;
  debounceDelay?: number;
}

export const SearchBar = React.forwardRef<HTMLDivElement, SearchBarProps>(
  (
    {
      onSearch,
      onSuggestionSelect,
      suggestions = [],
      loading = false,
      placeholder = 'Buscar productos...',
      debounceDelay = 300,
    },
    ref
  ) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Debounced search
    useEffect(() => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      if (query.trim()) {
        debounceTimer.current = setTimeout(() => {
          onSearch(query);
          setIsOpen(true);
        }, debounceDelay);
      } else {
        setIsOpen(false);
      }

      return () => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
      };
    }, [query, onSearch, debounceDelay]);

    // Close suggestions on click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          suggestionsRef.current &&
          !suggestionsRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query);
      }
    };

    const handleSuggestionClick = (suggestion: SearchSuggestion) => {
      setQuery(suggestion.name);
      setIsOpen(false);
      onSuggestionSelect?.(suggestion);
    };

    const handleClear = () => {
      setQuery('');
      setIsOpen(false);
    };

    return (
      <div ref={ref} className="relative w-full">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative flex items-center">
            {/* Search Icon */}
            <svg
              className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            {/* Input Field */}
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => query && setIsOpen(true)}
              placeholder={placeholder}
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              autoComplete="off"
            />

            {/* Loading Spinner or Clear Button */}
            <div className="absolute right-4 flex items-center gap-2">
              {loading && (
                <svg
                  className="w-5 h-5 text-blue-600 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}

              {query && !loading && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <svg
                    className="w-5 h-5 text-gray-400"
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
          </div>
        </form>

        {/* Suggestions Dropdown */}
        {isOpen && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <svg
                  className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                </svg>
                Buscando...
              </div>
            ) : suggestions.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900 group-hover:text-blue-600">
                          {suggestion.name}
                        </p>
                        {suggestion.category && (
                          <p className="text-xs text-gray-500">{suggestion.category}</p>
                        )}
                      </div>
                      {suggestion.price && (
                        <p className="font-semibold text-gray-900 ml-4">
                          {suggestion.price}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : query ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No se encontraron resultados para "{query}"
              </div>
            ) : null}

            {/* View All Results Link */}
            {suggestions.length > 0 && (
              <div className="border-t border-gray-100 p-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onSearch(query);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ver todos los resultados
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
