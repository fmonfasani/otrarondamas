import { Module, OnApplicationShutdown } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { EventTrackingService } from './event-tracking.service';
import { AnalyticsAggregatorService } from './analytics-aggregator.service';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * AnalyticsModule provides event tracking, aggregation, and dashboard management.
 * Follows multi-tenant architecture (company-scoped via CompanyScopedPrisma).
 */
@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [EventTrackingService, AnalyticsAggregatorService, AnalyticsDashboardService],
  exports: [EventTrackingService, AnalyticsAggregatorService, AnalyticsDashboardService],
})
export class AnalyticsModule implements OnApplicationShutdown {
  constructor(private eventTrackingService: EventTrackingService) {}

  /**
   * Cleanup: stop the event queue processor when the app shuts down.
   */
  onApplicationShutdown() {
    this.eventTrackingService.stopQueueProcessor();
  }
}
