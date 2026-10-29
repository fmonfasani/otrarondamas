import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Auth Guard
 * Checks for JWT token presence in request
 * Complements JwtAuthGuard (from auth/guards/jwt-auth.guard.ts)
 *
 * Usage:
 * @UseGuards(AuthGuard)
 * or as decorator:
 * @Auth()
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        'No authentication token provided',
      );
    }

    return true;
  }
}
