import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PerformanceCollector } from './performance.collector';
import { PerformanceReportService } from './performance-report.service';

/**
 * Rendimiento (Owner, 2026-11-26) — global, so the HTTP timing (main.ts), the chat's realtime
 * gateway and the push alerts can report to the same collector.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [PerformanceCollector, PerformanceReportService],
  exports: [PerformanceCollector, PerformanceReportService],
})
export class PerformanceModule {}
