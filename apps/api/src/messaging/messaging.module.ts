import { Module } from '@nestjs/common';
import { BusinessContextModule } from '../business-context/business-context.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

/**
 * Messaging M2 — Conversations.
 *
 * Messaging uses the canonical BusinessContext boundary for tenant
 * resolution and the existing Prisma module for persistence. No parallel
 * tenancy or authorization mechanism is introduced here.
 */
@Module({
  imports: [BusinessContextModule, PrismaModule],
  controllers: [MessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}
