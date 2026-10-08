import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessContextModule } from '../business-context/business-context.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';

/**
 * Messaging M2 — Conversations.
 *
 * Messaging uses the canonical BusinessContext boundary for tenant
 * resolution and the existing Prisma module for persistence. No parallel
 * tenancy or authorization mechanism is introduced here.
 */
@Module({
  imports: [AuthModule, BusinessContextModule, PrismaModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
