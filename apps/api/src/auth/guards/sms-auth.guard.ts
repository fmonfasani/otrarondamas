import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { AuthenticatedUser } from '../auth.types';

/**
 * SMS Authentication Guard.
 *
 * Simpler than AuthorizationGuard: just checks that:
 * 1. Request has a valid JWT token (populated by JwtAuthGuard upstream)
 * 2. User is authenticated (request.user exists)
 * 3. No capability check (SMS endpoints have per-operation authorization)
 *
 * Must be applied AFTER JwtAuthGuard in the middleware stack.
 */
@Injectable()
export class SMSAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedException('Sesión no autenticada');
    }

    return true;
  }
}
