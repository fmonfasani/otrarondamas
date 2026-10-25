import { SetMetadata } from '@nestjs/common';

export const CAPABILITY_KEY = 'capabilityRequerida';

/**
 * Marks a handler/controller as restricted to users who hold the given capability
 * (hierarchical check via RoleGrant + CapabilityGrant).
 *
 * It must be combined with JwtAuthGuard + AuthorizationGuard.
 * This decorator alone restricts nothing.
 *
 * Usage:
 *   @Authorize('sales.create')
 *   @Post('sales')
 *   async createSale(...) { }
 *
 * @param capability A capability code, e.g., 'sales.create', 'inventory.adjust'
 *
 * Phase 2 P1-2: Introduced alongside legacy @RequirePermission for gradual migration.
 * Both decorators can coexist during Phase 2 & P1-3.
 * Phase 3+: @RequirePermission will be deprecated and removed.
 */
export const Authorize = (capability: string) => SetMetadata(CAPABILITY_KEY, capability);
