'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Category {
  id: string;
  nombre: string;
  count?: number;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onChange: (categoryIds: string[]) => void;
  collapsibleOnMobile?: boolean;
}

/**
 * Category filter component
 * - Checkbox list of categories
 * - Optional counts next to each category
 * - Collapsible on mobile
 * - Expandable/collapsible section
 */
export default function CategoryFilter({
  categories,
  selectedCategoryIds,
  onChange,
  collapsibleOnMobile = true,
}: CategoryFilterProps) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(!collapsibleOnMobile);

  const handleToggle = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      onChange(selectedCategoryIds.filter((id) => id !== categoryId));
    } else {
      onChange([...selectedCategoryIds, categoryId]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="border-b border-gray-200 pb-6 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-4 md:mb-4"
        aria-expanded={isExpanded}
      >
        <h3 className="font-semibold text-gray-900">{t('tienda.categories')}</h3>
        <svg
          className={`w-5 h-5 text-gray-600 transition md:hidden ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      <div className={`space-y-2 ${isExpanded ? 'block' : 'hidden md:block'}`}>
        {categories.length > 0 && selectedCategoryIds.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-[#D97757] hover:underline mb-3 block"
          >
            {t('common.clearAll')}
          </button>
        )}

        {categories.map((category) => (
          <label
            key={category.id}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={selectedCategoryIds.includes(category.id)}
              onChange={() => handleToggle(category.id)}
              className="w-4 h-4 text-[#D97757] border-gray-300 rounded focus:ring-2 focus:ring-[#D97757]"
              aria-label={`${t('tienda.filter')} ${category.nombre}`}
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">
              {category.nombre}
            </span>
            {category.count !== undefined && (
              <span className="text-xs text-gray-500">({category.count})</span>
            )}
          </label>
        ))}

        {categories.length === 0 && (
          <p className="text-sm text-gray-500">{t('common.noCategories')}</p>
        )}
      </div>
    </div>
  );
}
