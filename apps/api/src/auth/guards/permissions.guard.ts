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
import type { AuthenticatedUser } from '../auth.types';

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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
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
        usuarioPermisos: {
          select: { permiso: { select: { nombre: true } } },
        },
      },
    });

    if (!currentUser || !currentUser.activo) {
      throw new UnauthorizedException('La cuenta ya no está activa');
    }

    const currentPermissions = currentUser.usuarioPermisos.map(
      (assignment) => assignment.permiso.nombre,
    );
    if (!currentPermissions.includes(requiredPermission)) {
      throw new ForbiddenException(`Requiere el permiso '${requiredPermission}'`);
    }

    return true;
  }
}
