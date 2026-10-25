import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { MetricsService } from './metrics.service';
import { CohortAnalysisService } from './cohort-analysis.service';
import {
  DateRangeQueryDto,
  GetProductsQueryDto,
  GetOrdersQueryDto,
  GetCACQueryDto,
  GetChannelQueryDto,
  GetLTVQueryDto,
} from './dto/queries';
import {
  RevenueMetricDto,
  GMVMetricDto,
  OrderMetricDto,
  AOVMetricDto,
  RetentionMatrixDto,
  ChannelMetricDto,
  TopProductsDto,
  CACMetricDto,
  LTVMetricDto,
  DashboardKPIDto,
} from './dto/responses';

/**
 * P9-2 Business Metrics & KPIs Controller
 *
 * Provides REST endpoints for business analytics:
 * - Revenue & GMV aggregation
 * - Order metrics (count, AOV, fulfillment)
 * - Customer retention cohorts
 * - Customer lifetime value (LTV)
 * - Channel breakdown
 * - Product performance
 * - Dashboard KPIs
 *
 * All endpoints require JWT authentication and 'metrics.read' permission.
 * Company scoping is enforced via @CurrentUser() extraction.
 */
@ApiTags('metrics')
@ApiBearerAuth()
@Controller('metrics')
@UseGuards(AuthGuard('jwt'))
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly cohortService: CohortAnalysisService,
  ) {}

  /**
   * GET /metrics/revenue
   *
   * Retrieves revenue metrics for a date range with optional period breakdown
   * and period-over-period comparison (previous period or year-ago).
   *
   * Query parameters:
   * - startDate (ISO 8601): Start date for the range
   * - endDate (ISO 8601): End date for the range
   * - groupBy (optional, default='daily'): 'daily', 'weekly', or 'monthly'
   * - compareTo (optional, default='none'): 'previous_period', 'year_ago', or 'none'
   */
  @Get('revenue')
  @RequirePermission('metrics.read')
  async getRevenue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DateRangeQueryDto,
  ): Promise<RevenueMetricDto> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.metricsService.getRevenueMetrics(
      user.empresaId,
      startDate,
      endDate,
      query.groupBy,
      query.compareTo as any,
    );
  }

  /**
   * GET /metrics/gmv
   *
   * Gross Merchandise Value (total order value without adjustments).
   */
  @Get('gmv')
  @RequirePermission('metrics.read')
  async getGMV(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DateRangeQueryDto,
  ): Promise<GMVMetricDto> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.metricsService.getGMVMetrics(
      user.empresaId,
      startDate,
      endDate,
      query.groupBy,
    );
  }

  /**
   * GET /metrics/orders
   *
   * Order metrics: count, AOV, fulfillment rate, breakdown by status.
   */
  @Get('orders')
  @RequirePermission('metrics.read')
  async getOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DateRangeQueryDto,
  ): Promise<OrderMetricDto> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.metricsService.getOrderMetrics(
      user.empresaId,
      startDate,
      endDate,
      query.compareTo as any,
    );
  }

  /**
   * GET /metrics/aov
   *
   * Average Order Value (AOV) with trend analysis.
   */
  @Get('aov')
  @RequirePermission('metrics.read')
  async getAOV(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DateRangeQueryDto,
  ): Promise<AOVMetricDto> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.metricsService.getAOVMetrics(
      user.empresaId,
      startDate,
      endDate,
      query.groupBy,
      query.compareTo as any,
    );
  }

  /**
   * GET /metrics/retention
   *
   * Customer retention cohort matrix.
   * Shows retention % by signup cohort and months/weeks since signup.
   *
   * Query parameters:
   * - cohortPeriod (optional, default='monthly'): 'weekly' or 'monthly'
   * - lookbackMonths (optional, default=12): How many months to track
   */
  @Get('retention')
  @RequirePermission('metrics.read')
  async getRetention(
    @CurrentUser() user: AuthenticatedUser,
    @Query('cohortPeriod') cohortPeriod: 'weekly' | 'monthly' = 'monthly',
    @Query('lookbackMonths') lookbackMonths: number = 12,
  ): Promise<RetentionMatrixDto> {
    return this.cohortService.generateRetentionMatrix(
      user.empresaId,
      cohortPeriod,
      lookbackMonths,
    );
  }

  /**
   * GET /metrics/ltv
   *
   * Lifetime Value per customer cohort (by signup date range).
   *
   * Query parameters:
   * - cohortStartDate (ISO 8601): Start of signup period
   * - cohortEndDate (ISO 8601): End of signup period
   * - lookbackMonths (optional, default=12): How far to track revenue
   */
  @Get('ltv')
  @RequirePermission('metrics.read')
  async getLTV(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLTVQueryDto,
  ): Promise<LTVMetricDto> {
    const cohortStartDate = new Date(query.cohortStartDate);
    const cohortEndDate = new Date(query.cohortEndDate);

    return this.cohortService.getCohortLTV(
      user.empresaId,
      cohortStartDate,
      cohortEndDate,
      query.lookbackMonths,
    );
  }

  /**
   * GET /metrics/channels
   *
   * Channel breakdown (e.g., WhatsApp, Web, In-Person).
   * Groups orders and revenue by sales channel.
   */
  @Get('channels')
  @RequirePermission('metrics.read')
  async getChannels(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DateRangeQueryDto,
  ): Promise<ChannelMetricDto[]> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.metricsService.getChannelMetrics(
      user.empresaId,
      startDate,
      endDate,
      query.compareTo as any,
    );
  }

  /**
   * GET /metrics/products
   *
   * Product performance metrics (revenue, units sold, customer count).
   * Returns top N products sorted by revenue.
   *
   * Query parameters:
   * - startDate (ISO 8601): Start date
   * - endDate (ISO 8601): End date
   * - topN (optional, default=10): Maximum products to return (1-100)
   */
  @Get('products')
  @RequirePermission('metrics.read')
  async getProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetProductsQueryDto,
  ): Promise<TopProductsDto> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.metricsService.getProductMetrics(
      user.empresaId,
      startDate,
      endDate,
      query.topN,
    );
  }

  /**
   * GET /metrics/cac
   *
   * Customer Acquisition Cost (CAC) estimation.
   * Note: Accurate CAC requires external marketing spend data.
   * This endpoint provides new customer count and channel breakdown;
   * spend data must be provided externally.
   */
  @Get('cac')
  @RequirePermission('metrics.read')
  async getCAC(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DateRangeQueryDto,
  ): Promise<CACMetricDto> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    // Fetch new customers in date range (those who signed up)
    const db = (this.metricsService as any).prismaFactory.forCompany(user.empresaId);
    const newCustomers = await db.cliente.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Note: Spend data requires external integration (out of scope for P9-2)
    return {
      cac: null,
      newCustomers,
      marketingSpend: null,
      byChannel: [],
      note: 'Marketing spend data not available. CAC calculation requires external data integration.',
    };
  }

  /**
   * GET /metrics/dashboard
   *
   * Summary dashboard with key KPIs for the current period.
   * Useful for dashboard/overview screens.
   */
  @Get('dashboard')
  @RequirePermission('metrics.read')
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DateRangeQueryDto,
  ): Promise<DashboardKPIDto> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    // Fetch all KPIs
    const [revenue, orders, aov, retention] = await Promise.all([
      this.metricsService.getRevenueMetrics(user.empresaId, startDate, endDate),
      this.metricsService.getOrderMetrics(user.empresaId, startDate, endDate),
      this.metricsService.getAOVMetrics(user.empresaId, startDate, endDate),
      this.cohortService.generateRetentionMatrix(user.empresaId, 'monthly', 1),
    ]);

    const channels = await this.metricsService.getChannelMetrics(user.empresaId, startDate, endDate);
    const products = await this.metricsService.getProductMetrics(user.empresaId, startDate, endDate, 1);

    // Calculate retention rates (D7, D30)
    let d7Retention = 0;
    let d30Retention = 0;

    if (retention.retention.length > 0) {
      if (retention.retention[0][0] !== undefined) {
        d7Retention = retention.retention[0][0]; // Offset 0 (within cohort period)
      }
      if (retention.retention[0][1] !== undefined) {
        d30Retention = retention.retention[0][1]; // Offset 1 (one period later)
      }
    }

    return {
      revenue: revenue.totalRevenue,
      orders: orders.totalOrders,
      aov: aov.aov,
      activeCustomers: retention.totalCustomers,
      retention: {
        d7: d7Retention,
        d30: d30Retention,
      },
      ltv: aov.aov * (d30Retention / 100), // Rough proxy: AOV * retention rate
      cac: null, // CAC requires external data
      topChannel: channels[0]?.channel || 'unknown',
      topProduct: products.products[0]?.productName || 'unknown',
    };
  }
}
