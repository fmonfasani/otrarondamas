import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoryFilter } from './CategoryFilter';

/**
 * CategoryFilter Test Suite
 *
 * Tests:
 * 1. Renders with categories
 * 2. Calls onChange with selected category
 * 3. Displays selected category
 * 4. Handles empty categories gracefully
 */

describe('CategoryFilter', () => {
  const defaultProps = {
    categories: ['Electronics', 'Books', 'Clothing'],
    onChange: vi.fn(),
  };

  it('should render dropdown with categories', () => {
    render(<CategoryFilter {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: /category filter/i });
    expect(trigger).toBeInTheDocument();
  });

  it('should call onChange when category is selected', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CategoryFilter
        categories={defaultProps.categories}
        onChange={onChange}
      />
    );

    const trigger = screen.getByRole('button', { name: /category filter/i });
    fireEvent.click(trigger);

    // Open dropdown
    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    const electronicsOption = screen.getByText('Electronics');
    fireEvent.click(electronicsOption);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('Electronics');
    });
  });

  it('should display selected category', () => {
    const { rerender } = render(
      <CategoryFilter
        categories={defaultProps.categories}
        selectedCategory="Books"
        onChange={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button', { name: /category filter/i });
    expect(trigger).toHaveTextContent('Books');
  });

  it('should handle empty categories gracefully', () => {
    render(
      <CategoryFilter
        categories={[]}
        onChange={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button', { name: /category filter/i });
    fireEvent.click(trigger);

    // Should show "No categories available" message
    expect(screen.getByText('No categories available')).toBeInTheDocument();
  });
});
