import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_CUSTOMER_KEY } from '../decorators/allow-customer.decorator';
import type { AuthenticatedUser } from '../auth.types';

/**
 * SEC-01 — Customer identities are not staff identities.
 *
 * This guard does not introduce a second authorization mechanism. It uses
 * the canonical JWT identity discriminator and endpoint metadata to keep
 * Customer-only endpoints available while rejecting Customer tokens from
 * staff endpoints.
 */
@Injectable()
export class StaffIdentityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowCustomer = this.reflector.getAllAndOverride<boolean>(
      ALLOW_CUSTOMER_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowCustomer) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (user?.type === 'cliente') {
      throw new ForbiddenException('Los clientes no pueden acceder a endpoints internos');
    }

    return true;
  }
}
