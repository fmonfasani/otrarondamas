import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { I18nModule } from './i18n/i18n.module';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { CatalogModule } from './catalog/catalog.module';
import { SalesModule } from './sales/sales.module';
import { PaymentsModule } from './payments/payments.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { UsersModule } from './users/users.module';
import { InventoryModule } from './inventory/inventory.module';
import { PurchasesModule } from './purchases/purchases.module';
import { AuthorizationsModule } from './authorizations/authorizations.module';
import { StoreModule } from './store/store.module';
import { OrdersModule } from './orders/orders.module';
import { CustomersModule } from './customers/customers.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { DossierModule } from './dossier/dossier.module';
import { InvitationsModule } from './invitations/invitations.module';
import { HealthModule } from './health/health.module';
import { MembershipModule } from './membership/membership.module';
import { MembershipRevocationModule } from './membership/membership-revocation.module';
import { BusinessContextModule } from './business-context/business-context.module';
import { MessagingModule } from './messaging/messaging.module';
import { DevolucionesModule } from './devoluciones/devoluciones.module';
import { AuditModule } from './audit/audit.module';
// import { RefundQueueModule } from './refunds/refund-queue.module'; // DEFERRED
// import { SMSNotificationsModule } from './sms-notifications/sms-notifications.module'; // DEFERRED
// import { NotificationsModule } from './notifications/notifications.module'; // DEFERRED
// import { SearchModule } from './search/search.module'; // TODO: Fix schema issues
// import { AssetsModule } from './assets/assets.module'; // TODO: Enable after implementation
// import { SeoModule } from './seo/seo.module'; // TODO: Fix service imports
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { StaffIdentityGuard } from './auth/guards/staff-identity.guard';

@Module({
  imports: [
    PrismaModule,
    BusinessModule,
    // P13-1: Internationalization (i18n) - Multi-language support
    I18nModule,
    AuthModule,
    CatalogModule,
    SalesModule,
    PaymentsModule,
    CashRegisterModule,
    UsersModule,
    InventoryModule,
    PurchasesModule,
    AuthorizationsModule,
    StoreModule,
    OrdersModule,
    CustomersModule,
    LoyaltyModule,
    DossierModule,
    InvitationsModule,
    HealthModule,
    // S-V1-01: membership reads (no own controllers).
    MembershipModule,
    // Identity & Membership: Owner-controlled Membership status transitions.
    MembershipRevocationModule,
    // S-V1-02: context resolution + adapter (no controllers).
    BusinessContextModule,
    // M1: Messaging module boundary; domain capabilities are introduced in later milestones.
    MessagingModule,
    // P3-2: Devoluciones (Returns) API
    DevolucionesModule,
    // P3-3: Refund Queue & Async Execution
    // RefundQueueModule, // DEFERRED: schema mismatch - post-MVP
    // P4-3: Audit Log Reporting API
    AuditModule,
    // P8-3: SMS Notifications (OTP, alerts, transactional)
    // SMSNotificationsModule, // DEFERRED: Twilio missing peer deps (scmp) - post-MVP
    // P8-4: Notification Preferences & Digest Implementation
    // NotificationsModule, // DEFERRED: depends on SMSNotificationsModule - post-MVP
    // P14-1: Full-Text Search with Elasticsearch
    // SearchModule, // TODO: Fix Prisma schema issues and service imports
    // P12-1: CDN Infrastructure - Asset Management Service
    // AssetsModule, // TODO: Enable after asset service is fully implemented
    // P15-1: SEO & Metadata - OG tags, JSON-LD, sitemaps
    // SeoModule, // TODO: Fix PrismaService import path
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards, in this order: authentication first (populates
    // request.user from the JWT), then permission authorization
    // (@RequirePermission, reads the already populated request.user). See
    // the comment in jwt-auth.guard.ts on why this has to be global and not
    // a per-controller @UseGuards.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: StaffIdentityGuard },
  ],
})
export class AppModule {}
