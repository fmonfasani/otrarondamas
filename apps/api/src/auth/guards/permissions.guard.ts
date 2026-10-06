import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { AuthenticatedUser } from '../auth.types';

/**
 * Granular permission authorization (RF-02 / section 3.2 of the SDD).
 * It must always be applied AFTER JwtAuthGuard, because it depends on
 * request.user already populated by the JWT strategy.
 *
 * D-06 note: this covers permission-based access control for an
 * authenticated user. The 'owner authorization' mechanism for specific
 * exceptions (PIN or other) is a separate piece, not yet implemented
 * (see Autorizacion in the schema and the pending TODO(D-06)).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true; // Endpoint without @RequirePermission: only requires authentication.
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user || !user.permisos.includes(requiredPermission)) {
      throw new ForbiddenException(`Requiere el permiso '${requiredPermission}'`);
    }

    return true;
  }
}
