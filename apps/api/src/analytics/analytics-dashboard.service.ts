/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsDashboard } from '@prisma/client';

/**
 * AnalyticsDashboardService manages dashboard configuration and metrics queries.
 * Dashboards are company-scoped and contain widgets that query aggregated metrics.
 *
 * Scope: All operations automatically filter by empresaId via CompanyScopedPrisma.
 */
@Injectable()
export class AnalyticsDashboardService {
  private readonly logger = new Logger(AnalyticsDashboardService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new analytics dashboard.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createDashboard(
    empresaId: string,
    name: string,
    dashboardConfig: Record<string, any>,
    description?: string,
    createdBy?: string,
  ): Promise<AnalyticsDashboard> {
    try {
      return await this.prisma.analyticsDashboard.create({
        data: {
          id: randomUUID(),
          empresaId,
          name,
          description,
          dashboardConfig,
          createdBy,
          isPublic: false,
        },
      });
    } catch (err) {
      this.logger.error('[AnalyticsDashboardService] Failed to create dashboard:', {
        empresaId,
        name,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Get a dashboard by ID (company-scoped).
   */
  async getDashboard(dashboardId: string, empresaId: string): Promise<AnalyticsDashboard | null> {
    try {
      return await this.prisma.analyticsDashboard.findFirst({
        where: {
          id: dashboardId,
          empresaId,
        },
      });
    } catch (err) {
      this.logger.error('[AnalyticsDashboardService] Failed to get dashboard:', {
        dashboardId,
        empresaId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * List all dashboards for a company.
   */
  async listDashboards(empresaId: string): Promise<AnalyticsDashboard[]> {
    try {
      return await this.prisma.analyticsDashboard.findMany({
        where: { empresaId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.error('[AnalyticsDashboardService] Failed to list dashboards:', {
        empresaId,
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  /**
   * Update a dashboard.
   */
  async updateDashboard(
    dashboardId: string,
    empresaId: string,
    updates: {
      name?: string;
      description?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dashboardConfig?: Record<string, any>;
      isPublic?: boolean;
    },
  ): Promise<AnalyticsDashboard | null> {
    try {
      return await this.prisma.analyticsDashboard
        .updateMany({
          where: {
            id: dashboardId,
            empresaId,
          },
          data: updates,
        })
        .then(async () => this.getDashboard(dashboardId, empresaId));
    } catch (err) {
      this.logger.error('[AnalyticsDashboardService] Failed to update dashboard:', {
        dashboardId,
        empresaId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Delete a dashboard.
   */
  async deleteDashboard(dashboardId: string, empresaId: string): Promise<boolean> {
    try {
      const result = await this.prisma.analyticsDashboard.deleteMany({
        where: {
          id: dashboardId,
          empresaId,
        },
      });
      return result.count > 0;
    } catch (err) {
      this.logger.error('[AnalyticsDashboardService] Failed to delete dashboard:', {
        dashboardId,
        empresaId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Query metrics for a specific dashboard widget.
   * Widget format: { type: 'kpi' | 'chart' | 'table', metric: string, period: string, ... }
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async queryWidgetMetrics(
    empresaId: string,
    widget: Record<string, any>,
  ): Promise<Record<string, any> | null> {
    try {
      const { metric, period, startDate, endDate, eventType, limit } = widget;

      if (!metric || !period) {
        this.logger.warn('[AnalyticsDashboardService] Widget missing metric or period:', widget);
        return null;
      }

      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Query aggregations based on metric
      const aggregations = await this.prisma.analyticsAggregation.findMany({
        where: {
          empresaId,
          period: period.toUpperCase(),
          periodStart: { gte: start },
          periodEnd: { lte: end },
          ...(eventType && { eventType }),
        },
        orderBy: { periodStart: 'asc' },
        take: limit || 100,
      });

      if (aggregations.length === 0) {
        return { metric, period, data: [] };
      }

      // Transform based on metric type
      return this.transformMetricData(metric, aggregations, widget);
    } catch (err) {
      this.logger.error('[AnalyticsDashboardService] Failed to query widget metrics:', {
        empresaId,
        metric: widget.metric,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Transform aggregation data into widget-friendly format.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transformMetricData(
    metric: string,
    aggregations: any[],
    widget: Record<string, any>,
  ): Record<string, any> {
    const type = widget.type || 'chart';

    if (type === 'kpi') {
      // Return single aggregated value
      const total = aggregations.reduce((sum, agg) => sum + agg.count, 0);
      const unique = new Set(
        aggregations.flatMap((agg) => (agg.metadata?.userIds as string[]) || []),
      ).size;

      return {
        metric,
        type: 'kpi',
        value: total,
        uniqueUsers: unique,
        data: aggregations,
      };
    }

    if (type === 'chart') {
      // Return time-series data
      return {
        metric,
        type: 'chart',
        data: aggregations.map((agg) => ({
          period: agg.periodStart.toISOString().split('T')[0],
          count: agg.count,
          uniqueUsers: agg.uniqueUsers,
          avgValue: agg.avgValue,
        })),
      };
    }

    if (type === 'table') {
      // Return grouped/sorted table data
      return {
        metric,
        type: 'table',
        columns: ['eventName', 'count', 'uniqueUsers', 'avgValue'],
        data: aggregations.map((agg) => ({
          eventName: agg.eventName,
          count: agg.count,
          uniqueUsers: agg.uniqueUsers,
          avgValue: agg.avgValue,
        })),
      };
    }

    return { metric, type, data: aggregations };
  }

  /**
   * Get dashboard with all widget metrics computed.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getDashboardWithMetrics(
    dashboardId: string,
    empresaId: string,
  ): Promise<{ dashboard: AnalyticsDashboard; widgets: Record<string, any>[] } | null> {
    try {
      const dashboard = await this.getDashboard(dashboardId, empresaId);
      if (!dashboard) {
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const widgets = ((dashboard.dashboardConfig as Record<string, any>)?.widgets || []) as Array<
        Record<string, any>
      >;
      const widgetResults = await Promise.all(
        widgets.map((widget) => this.queryWidgetMetrics(empresaId, widget)),
      );

      return {
        dashboard,
        widgets: widgetResults.filter((w) => w !== null),
      };
    } catch (err) {
      this.logger.error('[AnalyticsDashboardService] Failed to get dashboard with metrics:', {
        dashboardId,
        empresaId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }
}
