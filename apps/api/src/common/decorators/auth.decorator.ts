import { UseGuards, applyDecorators } from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';

/**
 * @Auth() Decorator
 * Requires user to be authenticated (JWT token present)
 *
 * Usage:
 * @Auth()
 * @Get('protected-route')
 */
export function Auth() {
  return applyDecorators(UseGuards(AuthGuard));
}
