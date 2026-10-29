import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { RolesGuard } from '../guards/roles.guard';

export const ROLES_KEY = 'roles';

/**
 * @Roles(...) Decorator
 * Restricts endpoint access to users with specific roles
 *
 * Role values: OWNER, SELLER, ADMIN, CUSTOMER
 *
 * Usage:
 * @Roles('OWNER', 'ADMIN')
 * @Get('admin-route')
 */
export function Roles(...roles: string[]) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(RolesGuard),
  );
}
