'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import CategoryFilter from './CategoryFilter';
import PriceRangeSlider from './PriceRangeSlider';
import AvailabilityFilter from './AvailabilityFilter';
import RatingFilter from './RatingFilter';

interface Category {
  id: string;
  nombre: string;
  count?: number;
}

export interface FilterState {
  categories: string[];
  minPrice: number;
  maxPrice: number;
  showOutOfStock: boolean;
  ratings: number[];
}

interface FilterSidebarProps {
  categories: Category[];
  minPrice: number;
  maxPrice: number;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

/**
 * Filter sidebar component
 * - Combines all filter types
 * - Desktop: Always visible
 * - Mobile: Toggle with button
 * - Apply/Clear all actions
 */
export default function FilterSidebar({
  categories,
  minPrice,
  maxPrice,
  filters,
  onFilterChange,
}: FilterSidebarProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);

  const handleCategoryChange = (categoryIds: string[]) => {
    onFilterChange({
      ...filters,
      categories: categoryIds,
    });
  };

  const handlePriceChange = (min: number, max: number) => {
    onFilterChange({
      ...filters,
      minPrice: min,
      maxPrice: max,
    });
  };

  const handleAvailabilityChange = (show: boolean) => {
    onFilterChange({
      ...filters,
      showOutOfStock: show,
    });
  };

  const handleRatingChange = (ratings: number[]) => {
    onFilterChange({
      ...filters,
      ratings,
    });
  };

  const handleClearAll = () => {
    onFilterChange({
      categories: [],
      minPrice,
      maxPrice,
      showOutOfStock: false,
      ratings: [],
    });
  };

  const activeFiltersCount = [
    filters.categories.length,
    filters.ratings.length,
    filters.minPrice !== minPrice || filters.maxPrice !== maxPrice ? 1 : 0,
    filters.showOutOfStock ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="md:hidden mb-4 flex gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center justify-between bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
          aria-expanded={isOpen}
        >
          <span>{t('tienda.filters')}</span>
          {activeFiltersCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D97757] text-white">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-0 z-40 md:relative md:inset-auto bg-white md:bg-transparent rounded-lg md:rounded-none ${
          isOpen ? 'block' : 'hidden md:block'
        }`}
      >
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between border-b border-gray-200 p-4 sticky top-0 bg-white">
          <h2 className="text-lg font-bold">{t('tienda.filters')}</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
            aria-label={t('common.close')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Content */}
        <div className="p-6 md:p-0 max-h-[calc(100vh-120px)] md:max-h-none overflow-y-auto md:overflow-visible md:sticky md:top-4 space-y-6">
          {/* Clear All Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearAll}
              className="w-full px-4 py-2 text-sm font-medium text-[#D97757] border border-[#D97757] rounded-lg hover:bg-orange-50 transition"
            >
              {t('common.clearAll')}
            </button>
          )}

          {/* Category Filter */}
          <CategoryFilter
            categories={categories}
            selectedCategoryIds={filters.categories}
            onChange={handleCategoryChange}
            collapsibleOnMobile={true}
          />

          {/* Price Range Slider */}
          <PriceRangeSlider
            minPrice={minPrice}
            maxPrice={maxPrice}
            currentMin={filters.minPrice}
            currentMax={filters.maxPrice}
            onChange={handlePriceChange}
          />

          {/* Availability Filter */}
          <AvailabilityFilter
            showOutOfStock={filters.showOutOfStock}
            onChange={handleAvailabilityChange}
          />

          {/* Rating Filter */}
          <RatingFilter selectedRatings={filters.ratings} onChange={handleRatingChange} />

          {/* Mobile Apply Button */}
          <div className="md:hidden pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-3 bg-[#D97757] text-white font-semibold rounded-lg hover:bg-[#C86543] transition"
            >
              {t('common.apply')}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        ></div>
      )}
    </>
  );
}
