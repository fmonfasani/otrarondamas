import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantPrismaService } from './tenant-prisma.service';
import { CompanyScopedPrismaService } from './company-scoped-prisma.service';

/**
 * ADR-DAT-019: two database roles. CompanyScopedPrismaService (inside one business) uses
 * TenantPrismaService (`wapsell_app`), which is deliberately not exported; PrismaService
 * (`wapsell_system`) is only for the files in system-client-allowlist.json.
 */
@Module({
  providers: [PrismaService, TenantPrismaService, CompanyScopedPrismaService],
  exports: [PrismaService, CompanyScopedPrismaService],
})
export class PrismaModule {}
