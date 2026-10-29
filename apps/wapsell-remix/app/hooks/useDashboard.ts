import { useLoaderData, useTransition } from '@remix-run/react';
import { useCallback } from 'react';

/**
 * Hook: use dashboard KPI data from loader
 * Provides access to loaded KPI data and loading/error states
 */
export function useDashboardKPIs() {
  const data = useLoaderData() as any; // Type from specific loader
  const transition = useTransition();

  const isLoading = transition.state === 'loading';

  return {
    kpis: data?.kpis,
    error: data?.error,
    isLoading,
  };
}

/**
 * Hook: use trend chart data from loader
 */
export function useTrendChart() {
  const data = useLoaderData() as any;
  const transition = useTransition();

  const isLoading = transition.state === 'loading';

  return {
    trends: data?.trends,
    error: data?.error,
    isLoading,
  };
}

/**
 * Hook: use top products data from loader
 */
export function useTopProducts() {
  const data = useLoaderData() as any;
  const transition = useTransition();

  const isLoading = transition.state === 'loading';

  return {
    products: data?.topProducts,
    error: data?.error,
    isLoading,
  };
}

/**
 * Hook: use channel breakdown data from loader
 */
export function useChannelBreakdown() {
  const data = useLoaderData() as any;
  const transition = useTransition();

  const isLoading = transition.state === 'loading';

  return {
    channels: data?.channelBreakdown,
    error: data?.error,
    isLoading,
  };
}

/**
 * Hook: use geographic breakdown data from loader
 */
export function useGeographicBreakdown() {
  const data = useLoaderData() as any;
  const transition = useTransition();

  const isLoading = transition.state === 'loading';

  return {
    geographic: data?.geographic,
    error: data?.error,
    isLoading,
  };
}

/**
 * Hook: optimistic updates with useTransition
 * Usage in client components for form submissions
 */
export function useDashboardTransition() {
  const transition = useTransition();

  const isPending = transition.state === 'submitting' || transition.state === 'loading';
  const isLoading = transition.state === 'loading';
  const isSubmitting = transition.state === 'submitting';

  return {
    isPending,
    isLoading,
    isSubmitting,
    formMethod: transition.formMethod,
  };
}

/**
 * Hook: format currency values (ARS by default)
 */
export function useCurrencyFormatter(currency: string = 'ARS') {
  return useCallback((value: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, [currency]);
}

/**
 * Hook: format percentage changes with trend indicator
 */
export function useTrendFormatter() {
  return useCallback((change: number, trend?: 'up' | 'down' | 'stable'): string => {
    const sign = change >= 0 ? '+' : '';
    const emoji = trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';
    return `${emoji} ${sign}${change.toFixed(1)}%`;
  }, []);
}
