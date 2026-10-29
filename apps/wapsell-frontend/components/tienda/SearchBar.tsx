'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  debounceMs?: number;
  placeholder?: string;
  aria-label?: string;
}

/**
 * Debounced search input component
 * - 300ms debounce by default
 * - Keyboard support (Enter, Escape)
 * - Clear button
 * - Search icon indicator
 * - Accessible with ARIA labels
 */
export default function SearchBar({
  value,
  onChange,
  onSearch,
  debounceMs = 300,
  placeholder,
  'aria-label': ariaLabel,
}: SearchBarProps) {
  const t = useTranslations();
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer
    if (newValue) {
      setIsSearching(true);
      debounceTimer.current = setTimeout(() => {
        onSearch?.(newValue);
        setIsSearching(false);
      }, debounceMs);
    } else {
      setIsSearching(false);
      onSearch?.('');
    }
  };

  const handleClear = () => {
    onChange('');
    setIsSearching(false);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    onSearch?.('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      onSearch?.(value);
      setIsSearching(false);
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        {/* Search Icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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

        {/* Input */}
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('tienda.searchPlaceholder')}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent text-sm transition"
          aria-label={ariaLabel || t('tienda.searchProducts')}
          aria-busy={isSearching}
        />

        {/* Clear Button */}
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            aria-label={t('common.clear')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Loading Indicator */}
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-[#D97757] rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
}
