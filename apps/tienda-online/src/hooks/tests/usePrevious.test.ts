import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePrevious } from '../usePrevious';

/**
 * Tests for usePrevious hook
 * Tests tracking previous values across renders
 */
describe('usePrevious', () => {
  it('should return undefined on first render', () => {
    const { result } = renderHook(() => usePrevious(10));

    expect(result.current).toBeUndefined();
  });

  it('should return previous value on subsequent renders', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => usePrevious(value),
      { initialProps: { value: 10 } }
    );

    expect(result.current).toBeUndefined();

    rerender({ value: 20 });
    expect(result.current).toBe(10);

    rerender({ value: 30 });
    expect(result.current).toBe(20);
  });

  it('should track string values', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => usePrevious(value),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBeUndefined();

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');

    rerender({ value: 'changed' });
    expect(result.current).toBe('updated');
  });

  it('should track object values', () => {
    const obj1 = { id: 1, name: 'first' };
    const obj2 = { id: 2, name: 'second' };
    const obj3 = { id: 3, name: 'third' };

    const { result, rerender } = renderHook(
      ({ value }: { value: typeof obj1 }) => usePrevious(value),
      { initialProps: { value: obj1 } }
    );

    expect(result.current).toBeUndefined();

    rerender({ value: obj2 });
    expect(result.current).toBe(obj1);
    expect(result.current?.id).toBe(1);

    rerender({ value: obj3 });
    expect(result.current).toBe(obj2);
    expect(result.current?.id).toBe(2);
  });

  it('should track boolean values', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: boolean }) => usePrevious(value),
      { initialProps: { value: false } }
    );

    expect(result.current).toBeUndefined();

    rerender({ value: true });
    expect(result.current).toBe(false);

    rerender({ value: false });
    expect(result.current).toBe(true);
  });

  it('should track null and undefined values', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string | null | undefined }) => usePrevious(value),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBeUndefined();

    rerender({ value: null });
    expect(result.current).toBe('initial');

    rerender({ value: undefined });
    expect(result.current).toBe(null);

    rerender({ value: 'back' });
    expect(result.current).toBeUndefined();
  });

  it('should handle multiple updates correctly', () => {
    const values = [1, 2, 3, 4, 5];
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => usePrevious(value),
      { initialProps: { value: values[0] } }
    );

    expect(result.current).toBeUndefined();

    values.slice(1).forEach((value, index) => {
      rerender({ value });
      expect(result.current).toBe(values[index]);
    });
  });
});
