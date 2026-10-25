import { useEffect, RefObject } from 'react';

/**
 * useClickOutside - Hook to detect clicks outside an element
 * Triggers callback when user clicks outside the referenced element
 *
 * @param ref - Reference to the DOM element to monitor
 * @param callback - Function to call when click happens outside
 *
 * @example
 * const modalRef = useRef(null);
 * useClickOutside(modalRef, () => setOpen(false));
 * return <div ref={modalRef}>Modal content</div>
 */
export const useClickOutside = <T extends HTMLElement>(
  ref: RefObject<T>,
  callback: () => void,
): void => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if ref exists and click is outside the element
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    // Add listener to document
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
};
