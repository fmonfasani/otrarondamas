import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PermissionsGuard],
  exports: [PermissionsGuard],
})
export class AuthModule {}
