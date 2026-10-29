import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterSidebar, { type FilterState } from '../FilterSidebar';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('FilterSidebar', () => {
  const mockCategories = [
    { id: '1', nombre: 'Electronics', count: 10 },
    { id: '2', nombre: 'Clothing', count: 25 },
  ];

  const mockFilters: FilterState = {
    categories: [],
    minPrice: 0,
    maxPrice: 1000,
    showOutOfStock: false,
    ratings: [],
  };

  it('renders filter sidebar', () => {
    const onChange = vi.fn();
    render(
      <FilterSidebar
        categories={mockCategories}
        minPrice={0}
        maxPrice={1000}
        filters={mockFilters}
        onFilterChange={onChange}
      />
    );

    expect(screen.getByText('tienda.filters')).toBeInTheDocument();
  });

  it('displays active filter count', () => {
    const onChange = vi.fn();
    const activeFilters: FilterState = {
      categories: ['1'],
      minPrice: 100,
      maxPrice: 500,
      showOutOfStock: true,
      ratings: [4, 5],
    };

    render(
      <FilterSidebar
        categories={mockCategories}
        minPrice={0}
        maxPrice={1000}
        filters={activeFilters}
        onFilterChange={onChange}
      />
    );

    // Should show filter count badge (4 active filters)
    const badge = screen.getByText('4');
    expect(badge).toBeInTheDocument();
  });

  it('calls onChange when clear all is clicked', () => {
    const onChange = vi.fn();
    const activeFilters: FilterState = {
      categories: ['1'],
      minPrice: 100,
      maxPrice: 500,
      showOutOfStock: true,
      ratings: [],
    };

    render(
      <FilterSidebar
        categories={mockCategories}
        minPrice={0}
        maxPrice={1000}
        filters={activeFilters}
        onFilterChange={onChange}
      />
    );

    const clearButton = screen.getByText('common.clearAll');
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith({
      categories: [],
      minPrice: 0,
      maxPrice: 1000,
      showOutOfStock: false,
      ratings: [],
    });
  });

  it('toggles mobile filter panel', () => {
    const onChange = vi.fn();
    const { container } = render(
      <FilterSidebar
        categories={mockCategories}
        minPrice={0}
        maxPrice={1000}
        filters={mockFilters}
        onFilterChange={onChange}
      />
    );

    const toggleButton = screen.getByRole('button', { name: 'tienda.filters' });
    fireEvent.click(toggleButton);

    // Panel should be visible after toggle
    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('block');
  });
});
