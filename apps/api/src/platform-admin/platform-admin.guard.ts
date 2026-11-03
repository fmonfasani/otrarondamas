import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * Platform access is deliberately independent from business membership roles.
 * Configure PLATFORM_ADMIN_EMAILS as a comma-separated allowlist.
 * Missing configuration denies access (fail closed).
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user || user.type !== 'usuario' || !user.email) {
      throw new ForbiddenException('Se requiere una identidad interna de Wapsell');
    }

    const allowedEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (allowedEmails.length === 0 || !allowedEmails.includes(user.email.toLowerCase())) {
      throw new ForbiddenException('No tienes permisos de administración de la plataforma');
    }

    return true;
  }
}
