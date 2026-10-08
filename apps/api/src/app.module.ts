import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
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
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { StaffIdentityGuard } from './auth/guards/staff-identity.guard';

@Module({
  imports: [
    PrismaModule,
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
