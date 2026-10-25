import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToast } from '../useToast';

/**
 * Tests for useToast hook
 * Tests toast state management, creation, removal, and auto-dismiss
 */
describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty toasts array', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast with addToast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast({ message: 'Success!', type: 'success' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      message: 'Success!',
      type: 'success',
    });
  });

  it('should generate unique IDs for toasts', () => {
    const { result } = renderHook(() => useToast());

    let id1: string;
    let id2: string;

    act(() => {
      id1 = result.current.addToast({ message: 'First', type: 'success' });
      id2 = result.current.addToast({ message: 'Second', type: 'error' });
    });

    expect(id1).not.toBe(id2);
    expect(result.current.toasts[0].id).toBe(id1);
    expect(result.current.toasts[1].id).toBe(id2);
  });

  it('should remove toast by id', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;

    act(() => {
      toastId = result.current.addToast({ message: 'Test', type: 'info' });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.removeToast(toastId!);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should handle different toast types', () => {
    const { result } = renderHook(() => useToast());
    const types = ['success', 'error', 'info', 'warning'] as const;

    act(() => {
      types.forEach((type) => {
        result.current.addToast({ message: `${type} message`, type });
      });
    });

    expect(result.current.toasts).toHaveLength(4);
    types.forEach((type, index) => {
      expect(result.current.toasts[index].type).toBe(type);
    });
  });

  it('should clear all toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast({ message: 'First', type: 'success' });
      result.current.addToast({ message: 'Second', type: 'error' });
      result.current.addToast({ message: 'Third', type: 'info' });
    });

    expect(result.current.toasts).toHaveLength(3);

    act(() => {
      result.current.clearToasts();
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should auto-dismiss toast after duration', async () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast({
        message: 'Auto dismiss',
        type: 'success',
        duration: 2000,
      });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(0);
    });
  });

  it('should not auto-dismiss when duration is 0', async () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast({
        message: 'No auto dismiss',
        type: 'success',
        duration: 0,
      });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.toasts).toHaveLength(1);
  });

  it('should handle multiple toasts with different durations', async () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast({
        message: 'Short',
        type: 'success',
        duration: 1000,
      });
      result.current.addToast({
        message: 'Long',
        type: 'error',
        duration: 5000,
      });
    });

    expect(result.current.toasts).toHaveLength(2);

    // Fast forward to 1.5 seconds
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('Long');
    });

    // Fast forward remaining time
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(0);
    });
  });

  it('should use default duration of 3000ms', async () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast({ message: 'Default', type: 'info' });
    });

    expect(result.current.toasts[0].duration).toBe(3000);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(0);
    });
  });

  it('should preserve toast state across multiple operations', () => {
    const { result } = renderHook(() => useToast());

    let id1: string;
    let id2: string;

    act(() => {
      id1 = result.current.addToast({ message: 'First', type: 'success' });
      id2 = result.current.addToast({ message: 'Second', type: 'error' });
    });

    expect(result.current.toasts).toHaveLength(2);

    act(() => {
      result.current.removeToast(id1!);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].id).toBe(id2);

    act(() => {
      result.current.addToast({ message: 'Third', type: 'info' });
    });

    expect(result.current.toasts).toHaveLength(2);
  });
});
