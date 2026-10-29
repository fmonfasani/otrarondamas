/**
 * CategoryFilter - Category selection with checkboxes
 * Supports multi-select filtering by familia/subfamilia
 */

import React, { useState } from 'react';
import { Familia, Subfamilia } from '@wapsell/types';

export interface CategoryFilterProps {
  familias: Familia[];
  subfamilias: Subfamilia[];
  selectedFamilias: string[];
  selectedSubfamilias: string[];
  onFamiliaChange: (familiaId: string, checked: boolean) => void;
  onSubfamiliaChange: (subfamiliaId: string, checked: boolean) => void;
  expandable?: boolean;
}

export const CategoryFilter = React.forwardRef<HTMLDivElement, CategoryFilterProps>(
  (
    {
      familias,
      subfamilias,
      selectedFamilias,
      selectedSubfamilias,
      onFamiliaChange,
      onSubfamiliaChange,
      expandable = true,
    },
    ref
  ) => {
    const [expandedFamilias, setExpandedFamilias] = useState<Set<string>>(
      new Set(selectedFamilias)
    );

    const toggleFamiliaExpansion = (familiaId: string) => {
      const newExpanded = new Set(expandedFamilias);
      if (newExpanded.has(familiaId)) {
        newExpanded.delete(familiaId);
      } else {
        newExpanded.add(familiaId);
      }
      setExpandedFamilias(newExpanded);
    };

    const subfamiliasByFamilia = (familiaId: string) =>
      subfamilias.filter((s) => s.familiaId === familiaId);

    return (
      <div ref={ref} className="space-y-4">
        <h3 className="font-semibold text-gray-900">Categorías</h3>

        <div className="space-y-2">
          {familias.map((familia) => {
            const subfamiliasList = subfamiliasByFamilia(familia.id);
            const isExpanded = expandedFamilias.has(familia.id);
            const isSelected = selectedFamilias.includes(familia.id);

            return (
              <div key={familia.id}>
                {/* Familia Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`familia-${familia.id}`}
                    checked={isSelected}
                    onChange={(e) => onFamiliaChange(familia.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <label
                    htmlFor={`familia-${familia.id}`}
                    className="ml-3 text-sm font-medium text-gray-700 cursor-pointer flex-grow"
                  >
                    {familia.nombre}
                  </label>

                  {/* Expand Button */}
                  {subfamiliasList.length > 0 && expandable && (
                    <button
                      onClick={() => toggleFamiliaExpansion(familia.id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      aria-label={isExpanded ? 'Contraer' : 'Expandir'}
                    >
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
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
                  )}
                </div>

                {/* Subfamilias List */}
                {isExpanded && subfamiliasList.length > 0 && (
                  <div className="ml-6 mt-2 space-y-2 pl-2 border-l border-gray-200">
                    {subfamiliasList.map((subfamilia) => (
                      <div key={subfamilia.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`subfamilia-${subfamilia.id}`}
                          checked={selectedSubfamilias.includes(subfamilia.id)}
                          onChange={(e) => onSubfamiliaChange(subfamilia.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                        <label
                          htmlFor={`subfamilia-${subfamilia.id}`}
                          className="ml-3 text-sm text-gray-600 cursor-pointer"
                        >
                          {subfamilia.nombre}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Active Filters Summary */}
        {(selectedFamilias.length > 0 || selectedSubfamilias.length > 0) && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Filtros activos:</p>
            <div className="flex flex-wrap gap-2">
              {selectedFamilias.map((familiaId) => {
                const familia = familias.find((f) => f.id === familiaId);
                return (
                  familia && (
                    <span
                      key={familiaId}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {familia.nombre}
                      <button
                        onClick={() => onFamiliaChange(familiaId, false)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  )
                );
              })}
              {selectedSubfamilias.map((subfamiliaId) => {
                const subfamilia = subfamilias.find((s) => s.id === subfamiliaId);
                return (
                  subfamilia && (
                    <span
                      key={subfamiliaId}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                    >
                      {subfamilia.nombre}
                      <button
                        onClick={() => onSubfamiliaChange(subfamiliaId, false)}
                        className="hover:text-green-900"
                      >
                        ×
                      </button>
                    </span>
                  )
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

CategoryFilter.displayName = 'CategoryFilter';
