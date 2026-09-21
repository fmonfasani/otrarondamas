import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGoogleService } from './auth.google.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { PermissionsGuard } from './guards/permissions.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '8h' }, // duración de un turno de trabajo; sin mecanismo de refresh todavía
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGoogleService, JwtStrategy, GoogleStrategy, PermissionsGuard],
  // AuthService exportado: AutorizacionesService (D-06) lo inyecta para
  // reusar verificarCredenciales() sin duplicar la lógica de bcrypt.
  exports: [JwtModule, PermissionsGuard, AuthService],
})
export class AuthModule {}
