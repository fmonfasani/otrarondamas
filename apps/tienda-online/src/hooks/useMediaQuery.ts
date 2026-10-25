import { useEffect, useState } from 'react';

/**
 * useMediaQuery - Hook for responsive media queries
 * Returns boolean indicating whether the media query matches
 *
 * @param query - Media query string (e.g., "(max-width: 640px)")
 * @returns boolean - Whether the media query matches
 *
 * @example
 * const isMobile = useMediaQuery("(max-width: 640px)")
 *
 * Breakpoints:
 * - xs: 320px
 * - sm: 640px
 * - md: 1024px
 * - lg: 1280px
 * - xl: 1536px
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Create media query list
    const mediaQueryList = window.matchMedia(query);

    // Set initial state
    setMatches(mediaQueryList.matches);

    // Handler for media query changes
    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Add listener
    mediaQueryList.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
};

/**
 * Predefined breakpoint queries
 */
export const mediaQueries = {
  xs: '(max-width: 320px)',
  sm: '(max-width: 640px)',
  md: '(max-width: 1024px)',
  lg: '(max-width: 1280px)',
  xl: '(max-width: 1536px)',
} as const;
