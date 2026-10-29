/**
 * SortDropdown - Product sorting selector
 * Options: price (asc/desc), newest, popular, rating
 */

import React, { useState, useRef, useEffect } from 'react';

export interface SortOption {
  value: string;
  label: string;
}

export interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options?: SortOption[];
  label?: string;
}

export const SortDropdown = React.forwardRef<HTMLDivElement, SortDropdownProps>(
  (
    {
      value,
      onChange,
      options = [
        { value: 'relevance', label: 'Relevancia' },
        { value: 'price-asc', label: 'Menor precio' },
        { value: 'price-desc', label: 'Mayor precio' },
        { value: 'newest', label: 'Más nuevos' },
        { value: 'popular', label: 'Populares' },
        { value: 'rating', label: 'Mejor calificados' },
      ],
      label = 'Ordenar por:',
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find((opt) => opt.value === value);

    const handleSelect = (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
    };

    const getSortIcon = (optionValue: string) => {
      switch (optionValue) {
        case 'price-asc':
          return (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          );
        case 'price-desc':
          return (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          );
        case 'rating':
          return (
            <svg
              className="w-4 h-4 text-yellow-400 fill-yellow-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
          );
        case 'newest':
          return (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          );
        case 'popular':
          return (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          );
        default:
          return (
            <svg
              className="w-4 h-4"
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
          );
      }
    };

    return (
      <div ref={ref} className="relative w-64">
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 text-sm"
        >
          <span className="text-gray-700">
            {label} <span className="font-medium text-gray-900">{selectedOption?.label}</span>
          </span>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${
              isOpen ? 'rotate-180' : ''
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

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-full right-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-50"
          >
            <ul className="py-1">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      onClick={() => handleSelect(option.value)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm ${
                        isSelected
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      {getSortIcon(option.value)}
                      <span>{option.label}</span>
                      {isSelected && (
                        <svg
                          className="w-4 h-4 ml-auto"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }
);

SortDropdown.displayName = 'SortDropdown';
