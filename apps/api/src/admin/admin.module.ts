import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardController } from './controllers/dashboard.controller';
import { AuditAdminController } from './controllers/audit-admin.controller';
import { AnalyticsDashboardService } from './services/analytics-dashboard.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [DashboardController, AuditAdminController],
  providers: [AnalyticsDashboardService],
  exports: [AnalyticsDashboardService],
})
export class AdminModule {}
