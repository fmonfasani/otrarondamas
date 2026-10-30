import { Module } from '@nestjs/common';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';

/**
 * Common Module
 * Provides shared utilities, guards, middleware, decorators, and DTOs
 * for consistent error handling, validation, and security across the API
 */
@Module({
  providers: [
    // Guards
    AuthGuard,
    RolesGuard,
    TenantGuard,
  ],
  exports: [
    // Export for use in other modules
    AuthGuard,
    RolesGuard,
    TenantGuard,
  ],
})
export class CommonModule {}
