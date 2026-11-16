import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/** Lifetime of a recovery link. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
/** Lifetime of the welcome link a new Owner gets to create their password (OR-B4-039). */
export const WELCOME_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Minimum time between two recovery emails for the same account. */
export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;
/** Default web app origin for the link; WEB_APP_URL overrides it. */
export const DEFAULT_WEB_APP_URL = 'https://app.wapsell.com';

export const INVALID_RESET_LINK = 'El enlace no es válido o ya venció. Pide uno nuevo.';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Staff password recovery (Figma "Recuperar contraseña" → "Revisa tu correo" →
 * "Nueva contraseña"). The request never reveals whether an account exists; the link is
 * single-use, expires in one hour and only its hash is stored.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Always resolves the same way, whether the account exists or not. */
  async requestReset(rawEmail: string, now: Date = new Date()): Promise<void> {
    // Same lookup as login (AuthService.verifyCredentials): exact, unique email.
    const email = rawEmail.trim();
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true, nombre: true, email: true, activo: true },
    });
    if (!usuario || !usuario.activo) return;

    const recent = await this.prisma.passwordResetToken.findFirst({
      where: {
        usuarioId: usuario.id,
        createdAt: { gt: new Date(now.getTime() - PASSWORD_RESET_COOLDOWN_MS) },
      },
      select: { id: true },
    });
    if (recent) return;

    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      // Only the newest link works.
      this.prisma.passwordResetToken.updateMany({
        where: { usuarioId: usuario.id, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: hashToken(token),
          // Same clock as the cooldown check above.
          createdAt: now,
          expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
        },
      }),
    ]);

    const base = (process.env.WEB_APP_URL || DEFAULT_WEB_APP_URL).replace(/\/+$/, '');
    const link = `${base}/es/auth/nueva-contrasena?token=${encodeURIComponent(token)}`;
    const sent = await this.email.send(
      usuario.email,
      'Recupera tu acceso a Wapsell',
      resetEmailHtml(usuario.nombre, link),
    );
    if (!sent) {
      this.logger.error(`Password reset email could not be sent (usuario ${usuario.id})`);
    }
  }

  /**
   * OR-B4-039 — a new Owner's single-use link to create their password (7 days), sent by
   * email and also returned so the platform administrator can pass it on if the email
   * does not arrive. Older links of the account stop working.
   */
  async issueWelcomeLink(usuarioId: string, businessName: string, now: Date = new Date()) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
      select: { id: true, nombre: true, email: true },
    });
    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { usuarioId: usuario.id, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: hashToken(token),
          createdAt: now,
          expiresAt: new Date(now.getTime() + WELCOME_LINK_TTL_MS),
        },
      }),
    ]);
    const base = (process.env.WEB_APP_URL || DEFAULT_WEB_APP_URL).replace(/\/+$/, '');
    const link = `${base}/es/auth/nueva-contrasena?token=${encodeURIComponent(token)}`;
    const sent = await this.email.send(
      usuario.email,
      `Tu negocio ${businessName} ya está en Wapsell`,
      welcomeEmailHtml(usuario.nombre, businessName, link),
    );
    if (!sent) this.logger.error(`Welcome email could not be sent (usuario ${usuario.id})`);
    return { link, sent, expiresAt: new Date(now.getTime() + WELCOME_LINK_TTL_MS) };
  }

  /** Sets a new password from a valid link and consumes it. */
  async resetPassword(token: string, password: string, now: Date = new Date()): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        id: true,
        usuarioId: true,
        expiresAt: true,
        usedAt: true,
        Usuario: { select: { activo: true } },
      },
    });
    if (!record || record.usedAt || record.expiresAt <= now || !record.Usuario.activo) {
      throw new BadRequestException(INVALID_RESET_LINK);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.$transaction(async (tx) => {
      // Compare-and-set: two concurrent submissions of the same link cannot both win.
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) throw new BadRequestException(INVALID_RESET_LINK);
      await tx.usuario.update({ where: { id: record.usuarioId }, data: { passwordHash } });
      await tx.passwordResetToken.updateMany({
        where: { usuarioId: record.usuarioId, usedAt: null },
        data: { usedAt: now },
      });
    });
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Brand colours from Figma "Fundamentos de marca y UI". */
export function resetEmailHtml(nombre: string, link: string): string {
  const safeName = escapeHtml(nombre.split(' ')[0] || nombre);
  const safeLink = escapeHtml(link);
  return `<!doctype html><html lang="es"><body style="margin:0;background:#faf9f5;font-family:Inter,Arial,sans-serif;color:#141413">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f5;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffefd;border-radius:14px;padding:32px">
<tr><td style="font-size:11px;font-weight:600;letter-spacing:1px">VOLVAMOS A CONECTAR</td></tr>
<tr><td style="padding-top:16px;font-size:28px;font-weight:700;letter-spacing:-1px">Recupera tu acceso.</td></tr>
<tr><td style="padding-top:16px;font-size:14px;line-height:1.6">Hola ${safeName}, recibimos un pedido para crear una nueva contraseña en Wapsell. El enlace vence en 1 hora y se puede usar una sola vez.</td></tr>
<tr><td style="padding-top:24px"><a href="${safeLink}" style="display:inline-block;background:#d97757;color:#141413;border-radius:999px;padding:14px 24px;font-size:14px;font-weight:600;text-decoration:none">Crear nueva contraseña</a></td></tr>
<tr><td style="padding-top:24px;font-size:12px;line-height:1.6;color:#141413">Si no lo pediste, ignora este correo: tu contraseña no cambia.</td></tr>
</table></td></tr></table></body></html>`;
}

/** OR-B4-039 — welcome email of a new Owner, with the link to create their password. */
export function welcomeEmailHtml(nombre: string, businessName: string, link: string): string {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#141413">
  <h1 style="font-size:22px">¡Hola, ${escapeHtml(nombre)}!</h1>
  <p>Creamos <b>${escapeHtml(businessName)}</b> en Wapsell y vos sos su Owner.</p>
  <p>Para entrar, creá tu contraseña con este enlace. Sirve una sola vez y vence en 7 días.</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#d97757;color:#141413;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Crear mi contraseña</a></p>
  <p style="font-size:12px;color:#6b6a65">Si no esperabas este mail, ignoralo.</p>
</div>`;
}
