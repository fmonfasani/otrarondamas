import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMediaQuery } from '../useMediaQuery';

/**
 * Tests for useMediaQuery hook
 * Tests different breakpoints and media query changes
 */
describe('useMediaQuery', () => {
  beforeEach(() => {
    // Reset matchMedia mock before each test
    window.matchMedia = vi.fn();
  });

  it('should return false when media query does not match', () => {
    const matchMediaMock = vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;

    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'));

    expect(result.current).toBe(false);
  });

  it('should return true when media query matches', () => {
    const matchMediaMock = vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;

    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'));

    expect(result.current).toBe(true);
  });

  it('should update state when media query changes', () => {
    const listeners: { [key: string]: Function } = {};
    const matchMediaMock = vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn((event: string, handler: Function) => {
        listeners[event] = handler;
      }),
      removeEventListener: vi.fn((event: string) => {
        delete listeners[event];
      }),
    }));
    window.matchMedia = matchMediaMock;

    const { result, rerender } = renderHook(() => useMediaQuery('(max-width: 640px)'));

    expect(result.current).toBe(false);

    // Simulate media query change
    if (listeners['change']) {
      listeners['change']({ matches: true } as MediaQueryListEvent);
    }

    rerender();
    expect(result.current).toBe(true);
  });

  it('should handle multiple different breakpoints', () => {
    const matchMediaMock = vi.fn((query: string) => ({
      matches: query === '(max-width: 320px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;

    const { result: result320 } = renderHook(() => useMediaQuery('(max-width: 320px)'));
    const { result: result640 } = renderHook(() => useMediaQuery('(max-width: 640px)'));

    expect(result320.current).toBe(true);
    expect(result640.current).toBe(false);
  });

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerMock = vi.fn();
    const matchMediaMock = vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerMock,
    }));
    window.matchMedia = matchMediaMock;

    const { unmount } = renderHook(() => useMediaQuery('(max-width: 640px)'));

    unmount();

    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should handle various query strings', () => {
    const queries = [
      '(max-width: 320px)',
      '(min-width: 640px)',
      '(max-width: 1024px) and (orientation: portrait)',
      '(prefers-color-scheme: dark)',
    ];

    const matchMediaMock = vi.fn((query: string) => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;

    queries.forEach((query) => {
      const { result } = renderHook(() => useMediaQuery(query));
      expect(result.current).toBe(true);
      expect(matchMediaMock).toHaveBeenCalledWith(query);
    });
  });
});
