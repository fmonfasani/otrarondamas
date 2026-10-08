import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthCustomerController } from './auth.customer.controller';
import { AuthService } from './auth.service';
import { AuthGoogleService } from './auth.google.service';
import { AuthCustomerService } from './auth.customer.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { PermissionsGuard } from './guards/permissions.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipModule } from '../membership/membership.module';
import { BusinessContextModule } from '../business-context/business-context.module';

@Module({
  imports: [
    PrismaModule,
    MembershipModule,
    BusinessContextModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '8h' }, // duración de un turno de trabajo; sin mecanismo de refresh todavía
    }),
  ],
  controllers: [AuthController, AuthCustomerController],
  providers: [
    AuthService,
    AuthGoogleService,
    AuthCustomerService,
    JwtStrategy,
    GoogleStrategy,
    PermissionsGuard,
  ],
  // AuthService exported: AuthorizationsService (D-06) injects it to
  // reuse verifyCredentials() without duplicating the bcrypt logic.
  // JwtStrategy is also exported so realtime transports reuse the exact
  // existing JWT payload-to-identity normalization instead of creating a
  // second authentication model.
  exports: [JwtModule, PermissionsGuard, AuthService, AuthCustomerService, JwtStrategy],
})
export class AuthModule {}
