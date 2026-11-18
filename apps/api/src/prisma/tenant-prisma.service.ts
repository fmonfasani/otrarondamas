import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * ADR-DAT-019 — the client for everything that runs inside one business. It connects as
 * `wapsell_app` (DATABASE_URL): no DDL, no identity tables and, from INIT-019 step 5,
 * row-level security. PrismaModule does not export it: it is only reachable through
 * CompanyScopedPrismaService.forCompany(), which adds the business filter.
 */
@Injectable()
export class TenantPrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
