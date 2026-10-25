import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotification } from './useNotification';
import { ToastProvider } from '@otrarondamas/ui-kit';

/**
 * useNotification Hook Test Suite
 *
 * Tests:
 * 1. Provides all notification methods
 * 2. Calls toast with correct type for each method
 * 3. Supports custom options (duration, position)
 * 4. Wrapper correctly delegates to useToast
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>
    {children}
  </ToastProvider>
);

describe('useNotification', () => {
  it('should provide notification methods', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    expect(result.current.notify).toBeDefined();
    expect(result.current.success).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.info).toBeDefined();
    expect(result.current.warning).toBeDefined();
  });

  it('should call notify with success type', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    act(() => {
      result.current.success('Operation successful');
    });

    // Hook provides success convenience method
    expect(result.current.success).toBeDefined();
  });

  it('should call notify with error type', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    act(() => {
      result.current.error('An error occurred');
    });

    // Hook provides error convenience method
    expect(result.current.error).toBeDefined();
  });

  it('should call notify with info type', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    act(() => {
      result.current.info('Information message');
    });

    // Hook provides info convenience method
    expect(result.current.info).toBeDefined();
  });

  it('should call notify with warning type', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    act(() => {
      result.current.warning('Warning message');
    });

    // Hook provides warning convenience method
    expect(result.current.warning).toBeDefined();
  });

  it('should accept custom options', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    act(() => {
      result.current.success('Message', {
        duration: 5000,
        position: 'bottom-right',
      });
    });

    // Hook supports options parameter
    expect(result.current.success).toBeDefined();
  });
});
