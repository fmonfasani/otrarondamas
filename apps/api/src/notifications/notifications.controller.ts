import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Query,
  Patch,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import {
  NotificationPreferencesService,
  UpdateNotificationPreferencesDto,
} from './notification-preferences.service';
import { NotificationDigestService } from './notification-digest.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationAnalyticsService } from './notification-analytics.service';
import { BusinessContextService } from '../business-context/business-context.service';
import type { BusinessContext } from '../business-context/business-context.types';
import { DigestPeriod, NotificationFrequency } from '@prisma/client'; // TODO: types

/**
 * NotificationsController
 *
 * REST API for notification preferences and digests.
 *
 * ROUTES:
 * GET  /api/notifications/preferences/:empresaId         - Get my preferences
 * PUT  /api/notifications/preferences/:empresaId         - Update preferences
 * POST /api/notifications/quiet-hours                     - Set quiet hours
 * DELETE /api/notifications/quiet-hours                   - Disable quiet hours
 *
 * GET  /api/notifications/digests/:empresaId            - Get my digests
 * GET  /api/notifications/digests/:id/preview           - Preview digest
 * POST /api/notifications/digests/:id/mark-as-opened    - Mark digest as opened
 *
 * GET  /api/notifications/analytics/:empresaId          - Get delivery metrics
 * GET  /api/notifications/analytics/:empresaId/engagement - Get user engagement
 *
 * GET  /api/notifications/queue/stats                   - Queue statistics
 * POST /api/notifications/queue/process                 - Manually trigger queue processing
 */
@Controller('api/notifications')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class NotificationsController {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
    private readonly digestService: NotificationDigestService,
    private readonly queueService: NotificationQueueService,
    private readonly analyticsService: NotificationAnalyticsService,
    private readonly businessContext: BusinessContextService,
  ) {}

  /**
   * Resolve business context for authenticated user
   */
  private async resolveContext(user: AuthenticatedUser): Promise<BusinessContext> {
    return this.businessContext.resolveForAuthenticatedUser(user);
  }

  // ============================================================================
  // PREFERENCES ENDPOINTS
  // ============================================================================

  /**
   * Get notification preferences for current user in a business
   *
   * GET /api/notifications/preferences/:empresaId
   */
  @Get('preferences/:empresaId')
  async getPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Param('empresaId') empresaId: string,
  ) {
    const context = await this.resolveContext(user);
    const preferences = await this.preferencesService.getUserPreferences(
      user.id,
      empresaId,
      context,
    );

    return {
      success: true,
      data: preferences,
    };
  }

  /**
   * Update notification preferences
   *
   * PUT /api/notifications/preferences/:empresaId
   */
  @Put('preferences/:empresaId')
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Param('empresaId') empresaId: string,
    @Body() updates: UpdateNotificationPreferencesDto,
  ) {
    const context = await this.resolveContext(user);
    const updated = await this.preferencesService.updatePreferences(
      user.id,
      empresaId,
      updates,
      context,
    );

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Set quiet hours
   *
   * POST /api/notifications/quiet-hours
   * Body: { empresaId, startTime: "22:00", endTime: "08:00" }
   */
  @Post('quiet-hours')
  @HttpCode(HttpStatus.OK)
  async setQuietHours(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      empresaId: string;
      startTime: string;
      endTime: string;
    },
  ) {
    const context = await this.resolveContext(user);
    const updated = await this.preferencesService.setQuietHours(
      user.id,
      body.empresaId,
      body.startTime,
      body.endTime,
      context,
    );

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Disable quiet hours
   *
   * DELETE /api/notifications/quiet-hours
   * Query: ?empresaId=...
   */
  @Post('quiet-hours/disable')
  @HttpCode(HttpStatus.OK)
  async disableQuietHours(
    @CurrentUser() user: AuthenticatedUser,
    @Query('empresaId') empresaId: string,
  ) {
    if (!empresaId) {
      throw new BadRequestException('empresaId query parameter is required');
    }

    const context = await this.resolveContext(user);
    const updated = await this.preferencesService.disableQuietHours(user.id, empresaId, context);

    return {
      success: true,
      data: updated,
    };
  }

  // ============================================================================
  // DIGEST ENDPOINTS
  // ============================================================================

  /**
   * Get digests for current user
   *
   * GET /api/notifications/digests/:empresaId
   * Query: ?startDate=...&endDate=...
   */
  @Get('digests/:empresaId')
  async getDigests(
    @CurrentUser() user: AuthenticatedUser,
    @Param('empresaId') empresaId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const digests = await this.digestService.getUserDigests(
      user.id,
      empresaId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      success: true,
      data: digests,
    };
  }

  /**
   * Get digest preview (without sending)
   *
   * GET /api/notifications/digests/:empresaId/preview
   * Query: ?period=daily
   */
  @Get('digests/:empresaId/preview')
  async getDigestPreview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('empresaId') empresaId: string,
    @Query('period') period: DigestPeriod = DigestPeriod.DAILY,
  ) {
    const html = await this.digestService.getDigestPreview(user.id, empresaId, period);

    return {
      success: true,
      data: { html },
    };
  }

  /**
   * Mark digest as opened (for tracking engagement)
   *
   * PATCH /api/notifications/digests/:digestId/opened
   */
  @Patch('digests/:digestId/opened')
  @HttpCode(HttpStatus.OK)
  async markDigestAsOpened(@Param('digestId') digestId: string) {
    const updated = await this.digestService.markDigestAsOpened(digestId);

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Send digest email immediately (admin/test)
   *
   * POST /api/notifications/digests/:empresaId/send
   * Body: { period: "daily" }
   */
  @Post('digests/:empresaId/send')
  @HttpCode(HttpStatus.OK)
  async sendDigestNow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('empresaId') empresaId: string,
    @Body() body: { period: DigestPeriod },
  ) {
    const sent = await this.digestService.sendDigestEmail(user.id, empresaId, body.period);

    return {
      success: true,
      data: sent,
    };
  }

  // ============================================================================
  // ANALYTICS ENDPOINTS
  // ============================================================================

  /**
   * Get delivery rate metrics
   *
   * GET /api/notifications/analytics/:empresaId/delivery-rate
   * Query: ?startDate=...&endDate=...
   */
  @Get('analytics/:empresaId/delivery-rate')
  async getDeliveryRate(
    @Param('empresaId') empresaId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const metrics = await this.analyticsService.getDeliveryRate(empresaId, start, end);

    return {
      success: true,
      data: metrics,
    };
  }

  /**
   * Get user engagement metrics
   *
   * GET /api/notifications/analytics/:empresaId/engagement
   */
  @Get('analytics/:empresaId/engagement')
  async getUserEngagement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('empresaId') empresaId: string,
  ) {
    const metrics = await this.analyticsService.getUserEngagement(user.id);

    return {
      success: true,
      data: metrics,
    };
  }

  /**
   * Get channel preference statistics
   *
   * GET /api/notifications/analytics/:empresaId/channels
   */
  @Get('analytics/:empresaId/channels')
  async getChannelPreferences(@Param('empresaId') empresaId: string) {
    const stats = await this.analyticsService.getChannelPreference(empresaId);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get dashboard summary
   *
   * GET /api/notifications/analytics/:empresaId/dashboard
   * Query: ?period=30d
   */
  @Get('analytics/:empresaId/dashboard')
  async getDashboardSummary(
    @Param('empresaId') empresaId: string,
    @Query('period') period: '7d' | '30d' | '90d' = '30d',
  ) {
    const summary = await this.analyticsService.getDashboardSummary(empresaId, period);

    return {
      success: true,
      data: summary,
    };
  }

  // ============================================================================
  // QUEUE ENDPOINTS
  // ============================================================================

  /**
   * Get notification queue statistics
   *
   * GET /api/notifications/queue/stats
   */
  @Get('queue/stats')
  async getQueueStats() {
    const stats = this.queueService.getQueueStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Manually trigger queue processing (for testing/admin)
   *
   * POST /api/notifications/queue/process
   */
  @Post('queue/process')
  @HttpCode(HttpStatus.OK)
  async processQueue() {
    await this.queueService.processQueue();

    return {
      success: true,
      message: 'Queue processing triggered',
    };
  }
}
