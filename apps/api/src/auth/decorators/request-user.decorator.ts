import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth.types';

/**
 * P8-2: @RequestUser decorator
 *
 * Extracts the authenticated user from the request context.
 * Alias for @CurrentUser() for compatibility.
 *
 * Usage:
 *   @Get('preferences')
 *   async getPreferences(@RequestUser() user: AuthenticatedUser) { ... }
 */
export const RequestUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
