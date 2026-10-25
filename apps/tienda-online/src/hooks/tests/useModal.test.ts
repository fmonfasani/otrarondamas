import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useModal } from '../useModal';

/**
 * Tests for useModal hook
 * Tests modal state management, open, close, and toggle operations
 */
describe('useModal', () => {
  it('should initialize with default false state', () => {
    const { result } = renderHook(() => useModal());

    expect(result.current.isOpen).toBe(false);
  });

  it('should initialize with provided initial state', () => {
    const { result } = renderHook(() => useModal(true));

    expect(result.current.isOpen).toBe(true);
  });

  it('should open modal with open function', () => {
    const { result } = renderHook(() => useModal());

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('should close modal with close function', () => {
    const { result } = renderHook(() => useModal(true));

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should toggle modal state', () => {
    const { result } = renderHook(() => useModal());

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should handle multiple open calls', () => {
    const { result } = renderHook(() => useModal());

    act(() => {
      result.current.open();
      result.current.open();
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('should handle multiple close calls', () => {
    const { result } = renderHook(() => useModal(true));

    act(() => {
      result.current.close();
      result.current.close();
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should support alternating open and close', () => {
    const { result } = renderHook(() => useModal());

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('should return stable function references', () => {
    const { result, rerender } = renderHook(() => useModal());

    const { open: open1, close: close1, toggle: toggle1 } = result.current;

    rerender();

    const { open: open2, close: close2, toggle: toggle2 } = result.current;

    expect(open1).toBe(open2);
    expect(close1).toBe(close2);
    expect(toggle1).toBe(toggle2);
  });

  it('should provide both methods for comprehensive control', () => {
    const { result } = renderHook(() => useModal());

    // Start closed
    expect(result.current.isOpen).toBe(false);

    // Use open
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    // Use close
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);

    // Use toggle
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    // Use toggle again
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });
});
