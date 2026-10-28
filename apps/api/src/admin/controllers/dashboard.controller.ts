import { Controller, Get, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../auth/guards/authorization.guard';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AnalyticsDashboardService } from '../services/analytics-dashboard.service';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class DashboardController {
  constructor(private readonly analyticsService: AnalyticsDashboardService) {}

  @Get('kpis')
  @Authorize('dashboard.view')
  async getDashboardKPIs(@CurrentUser() user: any, @Query('period') period: string = '30d') {
    const validPeriods = ['7d', '30d', '90d'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestException('Invalid period. Must be 7d, 30d, or 90d');
    }
    return this.analyticsService.getDashboardKPIs(user.empresaId, period);
  }

  @Get('trends')
  @Authorize('dashboard.view')
  async getTrendChart(
    @CurrentUser() user: any,
    @Query('metric') metric: 'revenue' | 'orders' = 'revenue',
    @Query('period') period: string = '30d',
  ) {
    if (!['revenue', 'orders'].includes(metric)) {
      throw new BadRequestException('Invalid metric. Must be revenue or orders');
    }
    if (!['7d', '30d', '90d'].includes(period)) {
      throw new BadRequestException('Invalid period. Must be 7d, 30d, or 90d');
    }
    return this.analyticsService.getTrendChart(user.empresaId, metric, period);
  }

  @Get('top-products')
  @Authorize('dashboard.view')
  async getTopProducts(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('metric') metric: 'revenue' | 'quantity' = 'revenue',
  ) {
    const limitNum = limit ? parseInt(limit) : 10;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Invalid limit');
    }
    if (!['revenue', 'quantity'].includes(metric)) {
      throw new BadRequestException('Invalid metric. Must be revenue or quantity');
    }
    return this.analyticsService.getTopProducts(user.empresaId, limitNum, metric);
  }

  @Get('channel-breakdown')
  @Authorize('dashboard.view')
  async getChannelBreakdown(@CurrentUser() user: any, @Query('period') period: string = '30d') {
    if (!['7d', '30d', '90d'].includes(period)) {
      throw new BadRequestException('Invalid period. Must be 7d, 30d, or 90d');
    }
    return this.analyticsService.getChannelBreakdown(user.empresaId, period);
  }

  @Get('geographic-breakdown')
  @Authorize('dashboard.view')
  async getGeographicBreakdown(@CurrentUser() user: any, @Query('period') period: string = '30d') {
    if (!['7d', '30d', '90d'].includes(period)) {
      throw new BadRequestException('Invalid period. Must be 7d, 30d, or 90d');
    }
    return this.analyticsService.getGeographicBreakdown(user.empresaId, period);
  }
}
