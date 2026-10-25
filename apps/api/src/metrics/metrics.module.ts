import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from './metrics.service';
import { CohortAnalysisService } from './cohort-analysis.service';
import { MetricsController } from './metrics.controller';

/**
 * P9-2: Business Metrics & KPIs Module
 *
 * Provides REST API endpoints for business analytics:
 * - Revenue and GMV metrics
 * - Order analytics
 * - Customer retention and LTV
 * - Channel and product performance
 *
 * Services:
 * - MetricsService: Revenue, GMV, Orders, AOV, Channels, Products
 * - CohortAnalysisService: Customer retention cohorts, LTV by cohort
 *
 * Controller:
 * - MetricsController: 10+ REST endpoints (GET /metrics/*)
 *
 * All operations are company-scoped via CompanyScopedPrismaService.
 * No schema modifications required.
 */
@Module({
  imports: [PrismaModule],
  providers: [MetricsService, CohortAnalysisService],
  controllers: [MetricsController],
})
export class MetricsModule {}
