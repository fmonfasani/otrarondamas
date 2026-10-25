import { useEffect, useRef } from 'react';

/**
 * usePrevious - Hook to track the previous value of any dependency
 * Returns the previous value of the input
 *
 * @template T - Type of the value being tracked
 * @param value - The current value to track
 * @returns T | undefined - The previous value, or undefined on first render
 *
 * @example
 * const count = 5;
 * const prevCount = usePrevious(count); // returns 4 on next render
 */
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};
