import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISO_KEY } from '../decorators/requiere-permiso.decorator';
import { AuthenticatedUser } from '../auth.types';

/**
 * Autorización por permiso granular (RF-02 / sección 3.2 del SDD).
 * Debe aplicarse siempre DESPUÉS de JwtAuthGuard, porque depende de
 * request.user ya poblado por la estrategia JWT.
 *
 * Nota D-06: esto cubre el control de acceso por permiso de un usuario
 * autenticado. El mecanismo de "autorización del dueño" para excepciones
 * puntuales (PIN u otro) es una pieza distinta, todavía no implementada
 * (ver Autorizacion en el schema y el TODO(D-06) pendiente).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permisoRequerido = this.reflector.getAllAndOverride<string | undefined>(PERMISO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!permisoRequerido) {
      return true; // Endpoint sin @RequierePermiso: solo exige autenticación.
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user || !user.permisos.includes(permisoRequerido)) {
      throw new ForbiddenException(`Requiere el permiso '${permisoRequerido}'`);
    }

    return true;
  }
}
