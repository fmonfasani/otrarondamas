import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthCustomerController } from './auth.customer.controller';
import { AuthService } from './auth.service';
import { AuthGoogleService } from './auth.google.service';
import { AuthCustomerService } from './auth.customer.service';
import { AuthJwtModule } from './auth-jwt.module';
import { GoogleStrategy } from './google.strategy';
import { PermissionsGuard } from './guards/permissions.guard';
import { AuthorizationGuard } from './guards/authorization.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipModule } from '../membership/membership.module';
import { BusinessContextModule } from '../business-context/business-context.module';
import { EmailModule } from '../email/email.module';
import { PasswordResetService } from './password-reset.service';
import { AccountService } from './account.service';

@Module({
  imports: [
    PrismaModule,
    MembershipModule,
    BusinessContextModule,
    PassportModule,
    AuthJwtModule,
    EmailModule,
  ],
  controllers: [AuthController, AuthCustomerController],
  providers: [
    AuthService,
    PasswordResetService,
    AccountService,
    AuthGoogleService,
    AuthCustomerService,
    GoogleStrategy,
    PermissionsGuard,
    AuthorizationGuard,
  ],
  // AuthService exported: AuthorizationsService (D-06) injects it to
  // reuse verifyCredentials() without duplicating the bcrypt logic.
  exports: [AuthJwtModule, PermissionsGuard, AuthorizationGuard, AuthService, AuthCustomerService],
})
export class AuthModule {}
