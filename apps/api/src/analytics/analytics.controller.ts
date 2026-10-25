/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { EventTrackingService } from './event-tracking.service';
import { AnalyticsAggregatorService } from './analytics-aggregator.service';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { TrackEventDto } from './dto/track-event.dto';
import { AggregationQueryDto } from './dto/aggregation-query.dto';

/**
 * AnalyticsController provides REST endpoints for event tracking and analytics.
 * All operations are multi-tenant (company-scoped via JwtAuthGuard + empresaId from token).
 */
@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(
    private readonly eventTrackingService: EventTrackingService,
    private readonly aggregatorService: AnalyticsAggregatorService,
    private readonly dashboardService: AnalyticsDashboardService,
  ) {}

  /**
   * Track an event.
   * POST /analytics/events
   */
  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Track an analytics event' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async trackEvent(@Body() dto: TrackEventDto, @Req() req: any) {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      throw new BadRequestException('empresaId not found in token');
    }

    const event = await this.eventTrackingService.trackEvent(dto, empresaId, req.user?.id);

    return {
      ok: true,
      data: event,
    };
  }

  /**
   * Get events by date range and filters.
   * GET /analytics/events?startDate=...&endDate=...&eventType=...
   */
  @Get('events')
  @ApiOperation({ summary: 'Get events by date range' })
  async getEvents(@Query() query: AggregationQueryDto, @Req() req: any) {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      throw new BadRequestException('empresaId not found in token');
    }

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const events = await this.eventTrackingService.getEventsByDateRange(
      empresaId,
      startDate,
      endDate,
      query.eventType,
    );

    const count = await this.eventTrackingService.getEventCount(empresaId, query.eventType);

    return {
      ok: true,
      data: events,
      count,
    };
  }

  /**
   * Get aggregations by period.
   * GET /analytics/aggregations?period=DAILY&startDate=...&endDate=...
   */
  @Get('aggregations')
  @ApiOperation({ summary: 'Get analytics aggregations' })
  async getAggregations(@Query() query: AggregationQueryDto, @Req() req: any) {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      throw new BadRequestException('empresaId not found in token');
    }

    if (!query.period) {
      throw new BadRequestException('period is required (DAILY, WEEKLY, or MONTHLY)');
    }

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const aggregations = await this.aggregatorService.getAggregations(
      empresaId,
      query.period as 'DAILY' | 'WEEKLY' | 'MONTHLY',
      startDate,
      endDate,
      query.eventType,
      query.eventName,
    );

    return {
      ok: true,
      data: aggregations,
      count: aggregations.length,
    };
  }

  /**
   * Get a dashboard by ID.
   * GET /analytics/dashboards/:id
   */
  @Get('dashboards/:id')
  @ApiOperation({ summary: 'Get a dashboard' })
  async getDashboard(@Param('id') id: string, @Req() req: any) {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      throw new BadRequestException('empresaId not found in token');
    }

    const result = await this.dashboardService.getDashboardWithMetrics(id, empresaId);
    if (!result) {
      return { ok: false, message: 'Dashboard not found' };
    }

    return {
      ok: true,
      data: result.dashboard,
      widgets: result.widgets,
    };
  }

  /**
   * List all dashboards for the company.
   * GET /analytics/dashboards
   */
  @Get('dashboards')
  @ApiOperation({ summary: 'List dashboards' })
  async listDashboards(@Req() req: any) {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      throw new BadRequestException('empresaId not found in token');
    }

    const dashboards = await this.dashboardService.listDashboards(empresaId);
    return {
      ok: true,
      data: dashboards,
      count: dashboards.length,
    };
  }

  /**
   * Create a new dashboard.
   * POST /analytics/dashboards
   */
  @Post('dashboards')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a dashboard' })
  async createDashboard(
    @Body()
    body: {
      name: string;
      description?: string;
      dashboardConfig: Record<string, any>;
    },
    @Req() req: any,
  ) {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      throw new BadRequestException('empresaId not found in token');
    }

    if (!body.name) {
      throw new BadRequestException('name is required');
    }

    const dashboard = await this.dashboardService.createDashboard(
      empresaId,
      body.name,
      body.dashboardConfig || { widgets: [] },
      body.description,
      req.user?.id,
    );

    return {
      ok: true,
      data: dashboard,
    };
  }

  /**
   * Update a dashboard.
   * PUT /analytics/dashboards/:id
   */
  @Put('dashboards/:id')
  @ApiOperation({ summary: 'Update a dashboard' })
  async updateDashboard(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      dashboardConfig?: Record<string, any>;
      isPublic?: boolean;
    },
    @Req() req: any,
  ) {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      throw new BadRequestException('empresaId not found in token');
    }

    const updated = await this.dashboardService.updateDashboard(id, empresaId, body);
    if (!updated) {
      return { ok: false, message: 'Dashboard not found' };
    }

    return {
      ok: true,
      data: updated,
    };
  }

  /**
   * Delete a dashboard.
   * DELETE /analytics/dashboards/:id
   */
  @Delete('dashboards/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a dashboard' })
  async deleteDashboard(@Param('id') id: string, @Req() req: any) {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      throw new BadRequestException('empresaId not found in token');
    }

    const success = await this.dashboardService.deleteDashboard(id, empresaId);
    if (!success) {
      return { ok: false, message: 'Dashboard not found' };
    }

    return { ok: true };
  }

  /**
   * Health check endpoint for analytics module.
   * GET /analytics/health
   */
  @Get('health')
  @ApiOperation({ summary: 'Analytics module health check' })
  async health() {
    const queueSize = this.eventTrackingService.getQueueSize();
    return {
      ok: true,
      eventQueueSize: queueSize,
      timestamp: new Date().toISOString(),
    };
  }
}
