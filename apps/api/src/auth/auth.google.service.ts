import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { GoogleProfile } from './google.strategy';

/** A verified Google identity with no Wapsell account (OR-B4-045 offers to register a Business). */
export class GoogleAccountNotFound extends Error {
  constructor(readonly profile: GoogleProfile) {
    super('No existe una cuenta asociada a este Google');
  }
}

@Injectable()
export class AuthGoogleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Resolves the Google profile to a Usuario and issues the same session
   * as the password login.
   *
   * Current scope (explicit decision, not definitive — see
   * docs/scaffolding-notas.md): the auto-created user receives no
   * permission; someone with `usuarios.gestionar` assigns them by hand
   * afterwards. The role model (customer/supplier/delivery/seller) does
   * not exist yet — when it is defined, this automatic sign-up should be
   * reviewed to assign the right role instead of 'internal user without
   * permissions'.
   *
   * ⚠️ SECURITY TODO (pre-existing, not introduced here, but aggravated
   * by this automatic sign-up — detected in the audit prior to this
   * push): cash-register.controller.ts exposes `estado`, `apertura`,
   * `listarMovimientos`, `arqueo` and `cierre` without @RequirePermission,
   * it only requires being logged in. A user just created by Google
   * (permisos = []) can open/close the real cash register right now.
   * Before, every sign-up went through a human with usuarios.gestionar;
   * with Google login, anyone with a Google account reaches the same
   * point without that filter. Pending fix in cash-register.controller.ts
   * — not touched in this change so as not to mix a cash register
   * permission fix with the login feature (see conversation).
   */
  async loginWithGoogle(profile: GoogleProfile) {
    // Defense in depth: the OAuth strategy enforces this, but this service
    // must not link or create an identity if invoked through another caller.
    if (profile.emailVerified !== true) {
      throw new UnauthorizedException('Google debe confirmar que el email está verificado');
    }

    let user = await this.prisma.usuario.findUnique({
      where: { googleId: profile.googleId },
      include: { UsuarioPermiso: { include: { Permiso: true } }, Empresa: true },
    });

    if (!user) {
      // Does a Usuario with this email already exist (created earlier by
      // someone with a password)? If so, we link the Google account to that
      // user instead of creating a duplicate — same email, same person.
      const existing = await this.prisma.usuario.findUnique({
        where: { email: profile.email },
        include: { UsuarioPermiso: { include: { Permiso: true } }, Empresa: true },
      });

      if (existing) {
        user = await this.prisma.usuario.update({
          where: { id: existing.id },
          data: { googleId: profile.googleId, fotoUrl: profile.fotoUrl },
          include: { UsuarioPermiso: { include: { Permiso: true } }, Empresa: true },
        });
      } else {
        // RF-17: nobody joins an existing Business through Google; staff accounts come from an
        // invitation. OR-B4-045: a verified Google identity without an account may instead
        // register a NEW Business of their own — the callback offers that.
        throw new GoogleAccountNotFound(profile);
      }
    }

    if (!user.activo) {
      throw new InternalServerErrorException('Usuario deshabilitado');
    }

    const permissions = user.UsuarioPermiso.map((up) => up.Permiso.nombre);
    return this.authService.issueSession(user, permissions);
  }
}
