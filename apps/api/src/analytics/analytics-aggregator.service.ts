/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsAggregation } from '@prisma/client';

/**
 * AnalyticsAggregatorService computes analytics aggregations (daily, weekly, monthly).
 * Handles cohort metrics, funnel analysis, and historical backfill.
 *
 * Scope: All operations automatically filter by empresaId via CompanyScopedPrisma.
 */
@Injectable()
export class AnalyticsAggregatorService {
  private readonly logger = new Logger(AnalyticsAggregatorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Aggregate events for a specific day.
   * Groups by eventType and eventName, counts occurrences and unique users.
   */
  async aggregateDaily(empresaId: string, date: Date): Promise<AnalyticsAggregation[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch events for the day
      const events = await this.prisma.analyticsEvent.findMany({
        where: {
          empresaId,
          timestamp: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (events.length === 0) {
        return [];
      }

      // Group by eventType + eventName
      const grouped = new Map<
        string,
        {
          eventType: string;
          eventName: string;
          userIds: Set<string>;
          count: number;
          values: number[];
        }
      >();

      for (const event of events) {
        const key = `${event.eventType}:${event.eventName}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            eventType: event.eventType,
            eventName: event.eventName,
            userIds: new Set(),
            count: 0,
            values: [],
          });
        }

        const group = grouped.get(key)!;
        group.count += 1;
        if (event.userId) {
          group.userIds.add(event.userId);
        }

        // Extract value from metadata if it's a CONVERSION event
        if (
          event.eventType === 'CONVERSION' &&
          (event.metadata as Record<string, unknown>)?.value
        ) {
          group.values.push(Number((event.metadata as Record<string, unknown>).value));
        }
      }

      // Create aggregation records
      const aggregations: AnalyticsAggregation[] = [];
      for (const group of grouped.values()) {
        const avgValue =
          group.values.length > 0
            ? group.values.reduce((a, b) => a + b, 0) / group.values.length
            : null;

        const aggregation = await this.prisma.analyticsAggregation.create({
          data: {
            id: randomUUID(),
            empresaId,
            period: 'DAILY',
            periodStart: startOfDay,
            periodEnd: endOfDay,
            eventType: group.eventType,
            eventName: group.eventName,
            count: group.count,
            uniqueUsers: group.userIds.size,
            avgValue: avgValue ? Number(avgValue.toFixed(2)) : null,
            metadata: {
              userIds: Array.from(group.userIds),
              computedAt: new Date().toISOString(),
            },
          },
        });
        aggregations.push(aggregation);
      }

      this.logger.debug(`[AnalyticsAggregatorService] Daily aggregation for ${empresaId}:`, {
        date: date.toISOString(),
        recordsCreated: aggregations.length,
      });

      return aggregations;
    } catch (err) {
      this.logger.error('[AnalyticsAggregatorService] Failed to aggregate daily:', {
        empresaId,
        date: date.toISOString(),
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  /**
   * Aggregate events for a specific week.
   * Sums daily aggregations for the 7-day period.
   */
  async aggregateWeekly(empresaId: string, weekStartDate: Date): Promise<AnalyticsAggregation[]> {
    try {
      const startOfWeek = new Date(weekStartDate);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(weekStartDate);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Fetch daily aggregations for the week
      const dailyAggs = await this.prisma.analyticsAggregation.findMany({
        where: {
          empresaId,
          period: 'DAILY',
          periodStart: {
            gte: startOfWeek,
            lte: endOfWeek,
          },
        },
      });

      if (dailyAggs.length === 0) {
        return [];
      }

      // Group by eventType + eventName
      const grouped = new Map<
        string,
        {
          eventType: string;
          eventName: string;
          count: number;
          uniqueUsers: number;
          totalValue: number;
          valueCount: number;
        }
      >();

      for (const agg of dailyAggs) {
        const key = `${agg.eventType}:${agg.eventName}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            eventType: agg.eventType,
            eventName: agg.eventName,
            count: 0,
            uniqueUsers: 0,
            totalValue: 0,
            valueCount: 0,
          });
        }

        const group = grouped.get(key)!;
        group.count += agg.count;
        group.uniqueUsers += agg.uniqueUsers; // Note: this is approximate (may overcount)
        if (agg.avgValue) {
          group.totalValue += Number(agg.avgValue) * agg.count;
          group.valueCount += agg.count;
        }
      }

      // Create weekly aggregation records
      const aggregations: AnalyticsAggregation[] = [];
      for (const group of grouped.values()) {
        const avgValue = group.valueCount > 0 ? group.totalValue / group.valueCount : null;

        const aggregation = await this.prisma.analyticsAggregation.create({
          data: {
            id: randomUUID(),
            empresaId,
            period: 'WEEKLY',
            periodStart: startOfWeek,
            periodEnd: endOfWeek,
            eventType: group.eventType,
            eventName: group.eventName,
            count: group.count,
            uniqueUsers: group.uniqueUsers,
            avgValue: avgValue ? Number(avgValue.toFixed(2)) : null,
            metadata: {
              computedAt: new Date().toISOString(),
              daysIncluded: 7,
            },
          },
        });
        aggregations.push(aggregation);
      }

      this.logger.debug(`[AnalyticsAggregatorService] Weekly aggregation for ${empresaId}:`, {
        weekStart: weekStartDate.toISOString(),
        recordsCreated: aggregations.length,
      });

      return aggregations;
    } catch (err) {
      this.logger.error('[AnalyticsAggregatorService] Failed to aggregate weekly:', {
        empresaId,
        weekStartDate: weekStartDate.toISOString(),
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  /**
   * Aggregate events for a specific month.
   * Sums daily aggregations for the entire month.
   */
  async aggregateMonthly(empresaId: string, monthDate: Date): Promise<AnalyticsAggregation[]> {
    try {
      const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      // Fetch daily aggregations for the month
      const dailyAggs = await this.prisma.analyticsAggregation.findMany({
        where: {
          empresaId,
          period: 'DAILY',
          periodStart: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });

      if (dailyAggs.length === 0) {
        return [];
      }

      // Group by eventType + eventName
      const grouped = new Map<
        string,
        {
          eventType: string;
          eventName: string;
          count: number;
          uniqueUsers: number;
          totalValue: number;
          valueCount: number;
        }
      >();

      for (const agg of dailyAggs) {
        const key = `${agg.eventType}:${agg.eventName}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            eventType: agg.eventType,
            eventName: agg.eventName,
            count: 0,
            uniqueUsers: 0,
            totalValue: 0,
            valueCount: 0,
          });
        }

        const group = grouped.get(key)!;
        group.count += agg.count;
        group.uniqueUsers += agg.uniqueUsers;
        if (agg.avgValue) {
          group.totalValue += Number(agg.avgValue) * agg.count;
          group.valueCount += agg.count;
        }
      }

      // Create monthly aggregation records
      const aggregations: AnalyticsAggregation[] = [];
      for (const group of grouped.values()) {
        const avgValue = group.valueCount > 0 ? group.totalValue / group.valueCount : null;

        const aggregation = await this.prisma.analyticsAggregation.create({
          data: {
            id: randomUUID(),
            empresaId,
            period: 'MONTHLY',
            periodStart: startOfMonth,
            periodEnd: endOfMonth,
            eventType: group.eventType,
            eventName: group.eventName,
            count: group.count,
            uniqueUsers: group.uniqueUsers,
            avgValue: avgValue ? Number(avgValue.toFixed(2)) : null,
            metadata: {
              computedAt: new Date().toISOString(),
              month: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
            },
          },
        });
        aggregations.push(aggregation);
      }

      this.logger.debug(`[AnalyticsAggregatorService] Monthly aggregation for ${empresaId}:`, {
        month: monthDate.toISOString(),
        recordsCreated: aggregations.length,
      });

      return aggregations;
    } catch (err) {
      this.logger.error('[AnalyticsAggregatorService] Failed to aggregate monthly:', {
        empresaId,
        monthDate: monthDate.toISOString(),
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  /**
   * Get aggregations for a company within a date range and period.
   */
  async getAggregations(
    empresaId: string,
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    startDate: Date,
    endDate: Date,
    eventType?: string,
    eventName?: string,
  ): Promise<AnalyticsAggregation[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        empresaId,
        period,
        periodStart: { gte: startDate },
        periodEnd: { lte: endDate },
      };

      if (eventType) {
        where.eventType = eventType;
      }
      if (eventName) {
        where.eventName = eventName;
      }

      return await this.prisma.analyticsAggregation.findMany({
        where,
        orderBy: { periodStart: 'asc' },
      });
    } catch (err) {
      this.logger.error('[AnalyticsAggregatorService] Failed to get aggregations:', {
        empresaId,
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  /**
   * Backfill: re-aggregate events for a date range.
   * Useful when fixing historical data or schema changes.
   */
  async backfillAggregations(empresaId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      const current = new Date(startDate);
      current.setHours(0, 0, 0, 0);
      let recordsCreated = 0;

      while (current <= endDate) {
        const aggs = await this.aggregateDaily(empresaId, current);
        recordsCreated += aggs.length;

        // Move to next day
        current.setDate(current.getDate() + 1);
      }

      this.logger.log(
        '[AnalyticsAggregatorService] Backfill completed: ' +
          JSON.stringify({
            empresaId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            recordsCreated,
          }),
      );

      return recordsCreated;
    } catch (err) {
      this.logger.error('[AnalyticsAggregatorService] Failed backfill:', {
        empresaId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        error: err instanceof Error ? err.message : String(err),
      });
      return 0;
    }
  }
}
