import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRef } from 'react';
import { useClickOutside } from '../useClickOutside';

/**
 * Tests for useClickOutside hook
 * Tests click detection inside and outside referenced element
 */
describe('useClickOutside', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Create a mock element for testing
    mockElement = document.createElement('div');
    mockElement.id = 'test-element';
    document.body.appendChild(mockElement);
  });

  it('should call callback when clicking outside the element', () => {
    const callback = vi.fn();
    const ref = { current: mockElement };

    renderHook(() => useClickOutside(ref, callback));

    // Simulate click outside (on document body)
    const clickEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(clickEvent);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should NOT call callback when clicking inside the element', () => {
    const callback = vi.fn();
    const ref = { current: mockElement };

    renderHook(() => useClickOutside(ref, callback));

    // Simulate click inside the element
    const clickEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    mockElement.dispatchEvent(clickEvent);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle clicks on child elements within reference element', () => {
    const callback = vi.fn();
    const childElement = document.createElement('button');
    mockElement.appendChild(childElement);
    const ref = { current: mockElement };

    renderHook(() => useClickOutside(ref, callback));

    // Simulate click on child element
    const clickEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    childElement.dispatchEvent(clickEvent);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should cleanup event listener on unmount', () => {
    const callback = vi.fn();
    const ref = { current: mockElement };
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useClickOutside(ref, callback));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('should handle multiple clicks outside', () => {
    const callback = vi.fn();
    const ref = { current: mockElement };

    renderHook(() => useClickOutside(ref, callback));

    // Simulate multiple clicks outside
    for (let i = 0; i < 3; i++) {
      const clickEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      document.body.dispatchEvent(clickEvent);
    }

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should handle null ref gracefully', () => {
    const callback = vi.fn();
    const ref = { current: null };

    renderHook(() => useClickOutside(ref as any, callback));

    // Simulate click outside
    const clickEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(clickEvent);

    // Should call callback because ref is null
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle changing callback function', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const ref = { current: mockElement };

    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useClickOutside(ref, cb),
      { initialProps: { cb: callback1 } }
    );

    // First click uses callback1
    const clickEvent1 = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(clickEvent1);

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();

    // Update callback
    rerender({ cb: callback2 });

    // Second click uses callback2
    const clickEvent2 = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(clickEvent2);

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('should distinguish between inside and outside clicks', () => {
    const outsideCallback = vi.fn();
    const ref = { current: mockElement };

    renderHook(() => useClickOutside(ref, outsideCallback));

    // Click inside
    const insideEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    mockElement.dispatchEvent(insideEvent);
    expect(outsideCallback).not.toHaveBeenCalled();

    // Click outside
    const outsideEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    document.documentElement.dispatchEvent(outsideEvent);
    expect(outsideCallback).toHaveBeenCalledTimes(1);
  });
});
