import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Tenant Guard
 * Enforces tenant isolation by checking empresaId
 * Verifies that the user's empresaId matches the requested resource's empresaId
 *
 * Usage:
 * @UseGuards(TenantGuard)
 *
 * The guard assumes:
 * 1. request.user.empresaId is set from JWT token
 * 2. request.params or request.body contains empresaId to validate against
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (!user.empresaId) {
      throw new ForbiddenException(
        'User has no tenant (empresaId) assigned',
      );
    }

    // Check if request targets a specific empresaId
    const requestedEmpresaId =
      request.params.empresaId ||
      request.body?.empresaId ||
      request.query.empresaId;

    // If a specific empresa is requested, verify it matches user's tenant
    if (requestedEmpresaId && requestedEmpresaId !== user.empresaId) {
      throw new ForbiddenException(
        'Access denied: You do not have access to this tenant',
      );
    }

    return true;
  }
}
