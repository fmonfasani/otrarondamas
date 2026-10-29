import {
  createParamDecorator,
  ExecutionContext,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { TenantGuard } from '../guards/tenant.guard';

/**
 * @Tenant() Parameter Decorator
 * Injects the empresaId from the JWT token
 *
 * Usage:
 * @Get('my-data')
 * getData(@Tenant() empresaId: string) {
 *   // empresaId is the user's tenant ID from JWT
 * }
 */
export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.empresaId;
  },
);

/**
 * @EnforceTenant() Decorator
 * Applies TenantGuard to ensure tenant isolation
 *
 * Usage:
 * @EnforceTenant()
 * @Get('protected-resource/:empresaId')
 */
export function EnforceTenant() {
  return applyDecorators(UseGuards(TenantGuard));
}
