import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/auth.types';

/**
 * RF-17 (docs/spec-login-roles.md): blocks real business endpoints
 * (sales, cash register, orders, etc.) for an account with a PENDIENTE
 * dossier — a newly invited account can log in and complete/view its own
 * dossier, but cannot operate until the owner approves it.
 *
 * On purpose it is NOT global (unlike JwtAuthGuard/PermissionsGuard):
 * `@UseGuards(JwtAuthGuard, ApprovedDossierGuard)` is added explicitly on
 * each relevant business controller — the own profile/dossier endpoints
 * (GET/PATCH /legajo/mi-legajo) never carry it, so the person can complete
 * their dossier while in Pending status. It must run AFTER JwtAuthGuard
 * (it needs request.user already populated).
 */
@Injectable()
export class ApprovedDossierGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      // JwtAuthGuard did not run before, or the route is public — this guard
      // has nothing to evaluate without an authenticated user.
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
