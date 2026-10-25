import React, { useCallback, useState } from 'react';
import { Dropdown } from '@otrarondamas/ui-kit';

/**
 * CategoryFilter - Product category filter using Dropdown
 *
 * Provides a dropdown selector for filtering products by category.
 * Integrates with Dropdown compound component from @wapsell/ui-kit.
 *
 * Features:
 * - Multiple category options
 * - onChange callback with selected category
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - WCAG 2.1 AA accessible
 * - Display selected category
 *
 * @example
 * ```tsx
 * const categories = ['Electronics', 'Books', 'Clothing'];
 *
 * <CategoryFilter
 *   categories={categories}
 *   selectedCategory="Electronics"
 *   onChange={(category) => setSelectedCategory(category)}
 * />
 * ```
 */

interface CategoryFilterProps {
  categories: string[];
  selectedCategory?: string;
  onChange: (category: string) => void;
  placeholder?: string;
  align?: 'left' | 'right';
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onChange,
  placeholder = 'Select Category',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback(
    (category: string) => {
      onChange(category);
      setIsOpen(false);
    },
    [onChange],
  );

  const displayText = selectedCategory || placeholder;

  return (
    <Dropdown
      onSelect={handleSelect}
      align={align}
    >
      <Dropdown.Trigger>
        <button
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm font-medium transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Category filter"
        >
          <div className="flex items-center justify-between gap-2">
            <span>{displayText}</span>
            <svg
              className="w-4 h-4 text-gray-500"
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
          </div>
        </button>
      </Dropdown.Trigger>

      <Dropdown.Content align={align}>
        {categories.length > 0 ? (
          <>
            {/* "All Categories" option */}
            <Dropdown.Item
              value=""
              onSelect={() => handleSelect('')}
            >
              <span
                className={
                  selectedCategory === '' || !selectedCategory ? 'font-semibold text-blue-600' : ''
                }
              >
                All Categories
              </span>
            </Dropdown.Item>

            <Dropdown.Divider />

            {/* Category options */}
            {categories.map((category) => (
              <Dropdown.Item
                key={category}
                value={category}
                onSelect={() => handleSelect(category)}
              >
                <span
                  className={selectedCategory === category ? 'font-semibold text-blue-600' : ''}
                >
                  {category}
                </span>
              </Dropdown.Item>
            ))}
          </>
        ) : (
          <div className="px-4 py-2 text-gray-500 text-sm">
            No categories available
          </div>
        )}
      </Dropdown.Content>
    </Dropdown>
  );
};

export default CategoryFilter;
