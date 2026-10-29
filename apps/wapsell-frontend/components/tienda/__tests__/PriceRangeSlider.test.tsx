import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PriceRangeSlider from '../PriceRangeSlider';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('PriceRangeSlider', () => {
  it('renders min and max price inputs', () => {
    const onChange = vi.fn();
    render(
      <PriceRangeSlider
        minPrice={0}
        maxPrice={1000}
        currentMin={0}
        currentMax={1000}
        onChange={onChange}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('updates min price correctly', () => {
    const onChange = vi.fn();
    render(
      <PriceRangeSlider
        minPrice={0}
        maxPrice={1000}
        currentMin={0}
        currentMax={1000}
        onChange={onChange}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '100' } });

    expect(onChange).toHaveBeenCalledWith(100, 1000);
  });

  it('updates max price correctly', () => {
    const onChange = vi.fn();
    render(
      <PriceRangeSlider
        minPrice={0}
        maxPrice={1000}
        currentMin={0}
        currentMax={1000}
        onChange={onChange}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[1], { target: { value: '500' } });

    expect(onChange).toHaveBeenCalledWith(0, 500);
  });

  it('prevents min from exceeding max', () => {
    const onChange = vi.fn();
    render(
      <PriceRangeSlider
        minPrice={0}
        maxPrice={1000}
        currentMin={0}
        currentMax={500}
        onChange={onChange}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '600' } });

    // Should cap at max
    expect(onChange).toHaveBeenCalledWith(500, 500);
  });

  it('displays price range summary', () => {
    const onChange = vi.fn();
    render(
      <PriceRangeSlider
        minPrice={0}
        maxPrice={1000}
        currentMin={100}
        currentMax={500}
        onChange={onChange}
        currency="$"
      />
    );

    expect(screen.getByText('$100 - $500')).toBeInTheDocument();
  });
});
