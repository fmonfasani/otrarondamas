import { Module } from '@nestjs/common';
import { MembershipRevocationModule } from '../membership/membership-revocation.module';
import { BusinessContextModule } from '../business-context/business-context.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { MessagingRealtimeEventBus } from './messaging-realtime.event-bus';

/**
 * Messaging M2 — Conversations.
 *
 * Messaging uses the canonical BusinessContext boundary for tenant
 * resolution and the existing Prisma module for persistence. No parallel
 * tenancy or authorization mechanism is introduced here.
 */
@Module({
  imports: [BusinessContextModule, PrismaModule, MembershipRevocationModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingRealtimeEventBus, MessagingGateway],
})
export class MessagingModule {}
