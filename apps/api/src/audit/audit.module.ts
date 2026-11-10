import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditReportingService } from './audit-reporting.service';
import { AuditController } from './audit.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BusinessContextModule } from '../business-context/business-context.module';

@Module({
  // AuthorizationGuard (controller-level) needs BusinessContextService.
  imports: [PrismaModule, AuthModule, BusinessContextModule],
  controllers: [AuditController],
  providers: [AuditService, AuditReportingService],
  exports: [AuditService, AuditReportingService],
})
export class AuditModule {}
