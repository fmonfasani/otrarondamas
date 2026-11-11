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
import { authzEngineMode, decide, shadowCompare } from '../../authorization/authorization-engine';
import {
  isPolicyMarker,
  readCanonicalRequirement,
} from '../../authorization/canonical-permission.decorator';

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

  /**
   * Cut-over (`enforce`): an endpoint without a legacy permission is decided by its
   * canonical declaration. Public routes, customers, non-HTTP contexts, `@Authorize`
   * endpoints and non-permission policies keep their current guards. Otherwise the role
   * and the active flag are read from the database, not from the JWT.
   */
  private async enforceAuthenticatedOnly(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const capability = this.reflector.getAllAndOverride<string | undefined>(CAPABILITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (capability) return true;
    const request = context.switchToHttp().getRequest();
    const user = request?.user as AuthenticatedUser | undefined;
    if (!user || user.type !== 'usuario') return true;
    const declared = readCanonicalRequirement(context);
    if (isPolicyMarker(declared)) return true;

    const currentUser = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      select: { activo: true, rol: true },
    });
    if (!currentUser || !currentUser.activo) {
      throw new UnauthorizedException('La cuenta ya no está activa');
    }
    const { allowed, evaluation } = decide({
      source: 'Authenticated',
      code: '',
      principalId: user.id,
      legacyRole: currentUser.rol,
      active: true,
      legacyAllowed: true,
      declared,
      request,
    });
    if (!allowed) {
      const required = evaluation?.required.length
        ? evaluation.required.join(', ')
        : 'una política declarada';
      throw new ForbiddenException(`Requiere ${required}`);
    }
    return true;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      if (authzEngineMode() === 'enforce') return this.enforceAuthenticatedOnly(context);
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
    // #161: in `shadow` mode the legacy assignment decides and the engine logs; in
    // `enforce` mode (cut-over, OR-B4-026) the role matrix decides.
    const { allowed } = decide({
      source: 'RequirePermission',
      code: requiredPermission,
      principalId: user.id,
      legacyRole: currentUser.rol,
      active: true,
      legacyAllowed: currentPermissions.includes(requiredPermission),
      declared: readCanonicalRequirement(context),
      request,
    });

    if (!allowed) {
      throw new ForbiddenException(`Requiere el permiso '${requiredPermission}'`);
    }

    return true;
  }
}
