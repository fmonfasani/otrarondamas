import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/auth.types';

/**
 * RF-17 (docs/spec-login-roles.md): bloquea endpoints de negocio real
 * (ventas, caja, pedidos, etc.) para una cuenta con legajo PENDIENTE —
 * una cuenta recién invitada puede loguearse y completar/consultar su
 * propio legajo, pero no puede operar hasta que el dueño la apruebe.
 *
 * A propósito NO es global (a diferencia de JwtAuthGuard/
 * PermissionsGuard): se agrega explícitamente `@UseGuards(JwtAuthGuard,
 * LegajoAprobadoGuard)` en cada controller de negocio que corresponda —
 * los endpoints de perfil/legajo propio (GET/PATCH /legajo/mi-legajo)
 * nunca lo llevan, para que la persona pueda completar su legajo
 * estando en estado Pendiente. Requiere correr DESPUÉS de JwtAuthGuard
 * (necesita request.user ya poblado).
 */
@Injectable()
export class LegajoAprobadoGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      // JwtAuthGuard no corrió antes, o la ruta es pública — este guard
      // no tiene nada que evaluar sin un usuario autenticado.
      return true;
    }

    if (user.estadoLegajo === 'PENDIENTE') {
      throw new ForbiddenException(
        'Tu legajo todavía no fue aprobado por el dueño — completalo y esperá la aprobación antes de operar.',
      );
    }

    return true;
  }
}
