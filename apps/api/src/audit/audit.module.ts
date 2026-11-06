import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditReportingService } from './audit-reporting.service';
import { AuditController } from './audit.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AuditController],
  providers: [AuditService, AuditReportingService],
  exports: [AuditService, AuditReportingService],
})
export class AuditModule {}
