import { Module } from '@nestjs/common';
import { AuthJwtModule } from '../auth/auth-jwt.module';
import { BusinessContextModule } from '../business-context/business-context.module';
import { MembershipRevocationModule } from '../membership/membership-revocation.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { StoreModule } from '../store/store.module';

/**
 * Messaging M2 — Conversations.
 *
 * Messaging uses the canonical BusinessContext boundary for tenant
 * resolution and the existing Prisma module for persistence. No parallel
 * tenancy or authorization mechanism is introduced here.
 *
 * M4-04: imports MembershipRevocationModule to consume the existing
 * membership.status.changed domain event (transport invalidation only —
 * Membership stays the authority, no Membership state is stored here).
 */
@Module({
  imports: [AuthJwtModule, BusinessContextModule, MembershipRevocationModule, PrismaModule, StoreModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
