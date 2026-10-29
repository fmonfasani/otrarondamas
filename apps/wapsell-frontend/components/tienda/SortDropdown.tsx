'use client';

import { useTranslations } from 'next-intl';

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'popularity' | 'rating';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

/**
 * Sort options dropdown
 * - Price: ascending/descending
 * - Popularity
 * - Newest
 * - Rating
 */
export default function SortDropdown({ value, onChange }: SortDropdownProps) {
  const t = useTranslations();

  const options: { value: SortOption; label: string }[] = [
    { value: 'newest', label: t('tienda.sortNewest') },
    { value: 'popularity', label: t('tienda.sortPopularity') },
    { value: 'price_asc', label: t('tienda.sortPriceLow') },
    { value: 'price_desc', label: t('tienda.sortPriceHigh') },
    { value: 'rating', label: t('tienda.sortRating') },
  ];

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="text-sm text-gray-700 font-medium">
        {t('tienda.sortBy')}
      </label>
      <select
        id="sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent text-sm bg-white cursor-pointer hover:border-gray-400 transition"
        aria-label={t('tienda.sortBy')}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
