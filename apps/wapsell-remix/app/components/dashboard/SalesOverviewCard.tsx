/**
 * SalesOverviewCard - Sales metrics widget
 * Shows today, week, and month sales with comparison
 */

import React, { useMemo } from 'react';
import { StatCard } from './StatCard';

export interface SalesMetrics {
  today: number;
  week: number;
  month: number;
}

export interface SalesOverviewCardProps {
  metrics: SalesMetrics;
  currency?: 'ARS' | 'USD';
  loading?: boolean;
  ariaLabel?: string;
}

export const SalesOverviewCard = React.forwardRef<HTMLDivElement, SalesOverviewCardProps>(
  (
    {
      metrics,
      currency = 'ARS',
      loading = false,
      ariaLabel = 'Resumen de ventas',
    },
    ref
  ) => {
    // Calculate trends
    const trends = useMemo(() => {
      // Assuming average daily sales = month total / 30
      const avgDailyMonth = metrics.month / 30;
      const dailyTrend = ((metrics.today - avgDailyMonth) / avgDailyMonth) * 100;

      // Assuming average weekly sales = month total / 4.29
      const avgWeeklyMonth = metrics.month / 4.29;
      const weeklyTrend = ((metrics.week - avgWeeklyMonth) / avgWeeklyMonth) * 100;

      // Month trend (would come from previous month in real scenario)
      const monthTrend = 5; // Placeholder

      return {
        daily: {
          value: Math.round(dailyTrend),
          direction: dailyTrend >= 0 ? 'up' : 'down',
        },
        weekly: {
          value: Math.round(Math.abs(weeklyTrend)),
          direction: weeklyTrend >= 0 ? 'up' : 'down',
        },
        monthly: {
          value: monthTrend,
          direction: 'up' as const,
        },
      };
    }, [metrics]);

    return (
      <div
        ref={ref}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        aria-label={ariaLabel}
      >
        <StatCard
          label="Ventas Hoy"
          value={metrics.today}
          format="currency"
          color="blue"
          trend={trends.daily}
          loading={loading}
          icon={
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
            </svg>
          }
          ariaLabel="Ventas del día actual"
        />

        <StatCard
          label="Ventas Semanal"
          value={metrics.week}
          format="currency"
          color="green"
          trend={trends.weekly}
          loading={loading}
          icon={
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042L5.960 9H9a2 2 0 110 4H6.278l-.768 3.072A1.5 1.5 0 015.5 19H4a1 1 0 100 2h1.5a3.5 3.5 0 003.357-4.5H13a2 2 0 110-4H9.642l.56-2.243A2 2 0 0111.5 5H4a1 1 0 000 2h7.5a1 1 0 100-2H4a1 1 0 000-2h1.22L3.305 3.222A1 1 0 003 1z" />
            </svg>
          }
          ariaLabel="Ventas de esta semana"
        />

        <StatCard
          label="Ventas Mensual"
          value={metrics.month}
          format="currency"
          color="purple"
          trend={trends.monthly}
          loading={loading}
          icon={
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          }
          ariaLabel="Ventas del mes actual"
        />
      </div>
    );
  }
);

SalesOverviewCard.displayName = 'SalesOverviewCard';
