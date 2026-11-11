import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { CAPABILITY_KEY } from '../decorators/authorize.decorator';
import type { AuthenticatedUser } from '../auth.types';
import { shadowCompare } from '../../authorization/authorization-engine';
import { readCanonicalRequirement } from '../../authorization/canonical-permission.decorator';

/**
 * Granular permission authorization (RF-02 / section 3.2 of the SDD).
 * It must always be applied AFTER JwtAuthGuard, because it depends on
 * request.user already populated by the JWT strategy.
 *
 * Permissions are loaded from the current UsuarioPermiso relation for every
 * permission-protected request. JWT permission claims are informational only:
 * revoking a database assignment takes effect on the next request, without
 * waiting for the token to expire.
 *
 * D-06 note: the 'owner authorization' mechanism for specific exceptions
 * (PIN or other) is separate from this guard.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * #161 stage 3 (AUTH-10), shadow mode: an endpoint without a legacy permission is allowed
   * to any authenticated staff user today. The canonical engine evaluates its declaration
   * (or the lack of one) and logs divergences. No database query: the role comes from the
   * JWT, which is enough for a parity log. Never throws, never changes the outcome.
   */
  private shadowAuthenticatedOnly(context: ExecutionContext): void {
    try {
      if (context.getType() !== 'http') return;
      // @Authorize endpoints are evaluated by the AuthorizationGuard.
      const capability = this.reflector.getAllAndOverride<string | undefined>(CAPABILITY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (capability) return;
      const request = context.switchToHttp().getRequest();
      const user = request?.user as AuthenticatedUser | undefined;
      if (!user || user.type !== 'usuario') return; // public routes and customers
      shadowCompare({
        source: 'Authenticated',
        code: '',
        principalId: user.id,
        legacyRole: user.rol,
        active: true,
        legacyAllowed: true,
        declared: readCanonicalRequirement(context),
        request,
      });
    } catch {
      // shadow mode must never affect the request
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      this.shadowAuthenticatedOnly(context);
      return true; // Endpoint without @RequirePermission: only requires authentication.
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedException('Sesión no autenticada');
    }
    if (user.type !== 'usuario') {
      throw new ForbiddenException('Este permiso requiere una identidad de usuario interno');
    }

    const currentUser = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      select: {
        activo: true,
        rol: true,
        UsuarioPermiso: {
          select: { Permiso: { select: { nombre: true } } },
        },
      },
    });

    if (!currentUser || !currentUser.activo) {
      throw new UnauthorizedException('La cuenta ya no está activa');
    }

    const currentPermissions = (currentUser.UsuarioPermiso ?? []).map(
      (assignment) => assignment.Permiso.nombre,
    );
    const allowed = currentPermissions.includes(requiredPermission);

    // #161 stage 2: canonical engine in shadow mode — logs divergences, never decides.
    shadowCompare({
      source: 'RequirePermission',
      code: requiredPermission,
      principalId: user.id,
      legacyRole: currentUser.rol,
      active: true,
      legacyAllowed: allowed,
      declared: readCanonicalRequirement(context),
      request,
    });

    if (!allowed) {
      throw new ForbiddenException(`Requiere el permiso '${requiredPermission}'`);
    }

    return true;
  }
}
