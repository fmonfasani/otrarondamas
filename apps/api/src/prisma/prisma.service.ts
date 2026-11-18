import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { systemDatasource } from './database-urls';

/**
 * ADR-DAT-019 — the system client, for code that crosses businesses on purpose (login,
 * password recovery, platform administration, webhooks, jobs). It connects as
 * `wapsell_system` (SYSTEM_DATABASE_URL), which is not limited to one business, so only the
 * files listed in system-client-allowlist.json may use it (system-client-allowlist.spec.ts).
 * Code that runs inside one business uses CompanyScopedPrismaService.forCompany() instead.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super(systemDatasource());
  }

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
