import { Module } from '@nestjs/common';
import { MercadoPagoModule } from '../payments/mercadopago/mercadopago.module';
import { AuthJwtModule } from '../auth/auth-jwt.module';
import { BusinessContextModule } from '../business-context/business-context.module';
import { MembershipRevocationModule } from '../membership/membership-revocation.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingController } from './messaging.controller';
import { CustomerChatController } from './customer-chat.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { StoreModule } from '../store/store.module';
import { CartModule } from '../cart/cart.module';
import { EmailModule } from '../email/email.module';
import { CustomerNoticesModule } from '../customer-notices/customer-notices.module';
import { MessagingAlertsService } from './messaging-alerts.service';
import { MessagingInboxService } from './inbox.service';
import { MessagingInboxController } from './messaging-inbox.controller';

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
 *
 * C3: imports CartModule to integrate persistent shopping carts with order
 * creation (createOrderFromConversation). Cart items are the authoritative
 * source; prices are revalidated before confirmation.
 */
@Module({
  imports: [
    AuthJwtModule,
    BusinessContextModule,
    MembershipRevocationModule,
    PrismaModule,
    StoreModule,
    CartModule,
    // E3: unread-message e-mails.
    EmailModule,
    // OR-B4-053: order and return notices reach the open screens at once.
    CustomerNoticesModule,
    // OR-B4-055: the chat's order is paid with Mercado Pago before it exists.
    MercadoPagoModule,
  ],
  controllers: [MessagingController, CustomerChatController, MessagingInboxController],
  providers: [MessagingService, MessagingGateway, MessagingAlertsService, MessagingInboxService],
})
export class MessagingModule {}
