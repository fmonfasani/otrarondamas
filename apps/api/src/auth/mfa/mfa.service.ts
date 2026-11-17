import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  decryptSecret,
  encryptSecret,
  tokenKeyFrom,
} from '../../payments/mercadopago/mercadopago-crypto';
import { recordAudit, type AuditAction } from '../../auditoria/audit-catalog';
import { MfaPolicyService } from './mfa-policy.service';
import { hashRecoveryCode, matchStep, newRecoveryCodes, newSecret, otpauthUrl } from './totp';

const TICKET_TTL = '10m';
const DEVICE_TTL_DAYS = 30;
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

type Ticket = { sub: string; typ: 'mfa-ticket' };
type DeviceToken = { sub: string; typ: 'mfa-device'; fv: string };

/**
 * OR-B4-044 — second factor with an authenticator app (TOTP), required for Owners, Admins and
 * Wapsell administrators, optional for everyone else.
 *
 * - After the password, the API hands a short-lived ticket (10 minutes) instead of a session;
 *   the ticket only allows enrolling or verifying the second factor.
 * - The secret is encrypted with MFA_SECRET_KEY (AES-256-GCM); 10 single-use recovery codes are
 *   stored as hashes; a code (TOTP step) is never accepted twice; 5 failures lock 15 minutes.
 * - «Recordar este dispositivo»: a signed 30-day token bound to the factor, so resetting or
 *   re-enrolling the factor invalidates every remembered device.
 * - Activation, use of a recovery code, lockouts, deactivation and resets go to the audit trail.
 */
@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly policy: MfaPolicyService,
  ) {}

  private key(): Buffer {
    const configured = tokenKeyFrom(process.env.MFA_SECRET_KEY);
    if (configured) return configured;
    // Without MFA_SECRET_KEY (development, tests) a key is derived from JWT_SECRET.
    if (process.env.NODE_ENV === 'production') {
      this.logger.warn('MFA_SECRET_KEY is not set: deriving the MFA key from JWT_SECRET');
    }
    return createHash('sha256')
      .update(`wapsell-mfa:${process.env.JWT_SECRET ?? ''}`)
      .digest();
  }

  // ---------------------------------------------------------------- tickets and devices

  issueTicket(usuarioId: string): Promise<string> {
    return this.jwt.signAsync({ sub: usuarioId, typ: 'mfa-ticket' } satisfies Ticket, {
      expiresIn: TICKET_TTL,
    });
  }

  async readTicket(ticket: string): Promise<string> {
    try {
      const payload = await this.jwt.verifyAsync<Ticket>(ticket);
      if (payload.typ !== 'mfa-ticket' || !payload.sub) throw new Error('not a ticket');
      return payload.sub;
    } catch {
      throw new UnauthorizedException('La verificación venció. Volvé a ingresar tu contraseña.');
    }
  }

  private factorVersion(factor: { id: string; confirmedAt: Date | null }) {
    return `${factor.id}:${factor.confirmedAt?.getTime() ?? 0}`;
  }

  /** «Recordar este dispositivo»: 30 days, bound to the current factor. */
  async rememberDevice(usuarioId: string): Promise<string> {
    const factor = await this.prisma.mfaFactor.findUniqueOrThrow({ where: { usuarioId } });
    return this.jwt.signAsync(
      { sub: usuarioId, typ: 'mfa-device', fv: this.factorVersion(factor) } satisfies DeviceToken,
      { expiresIn: `${DEVICE_TTL_DAYS}d` },
    );
  }

  /** True when `token` is a remembered device of this account's current factor. */
  async deviceIsRemembered(usuarioId: string, token: string | undefined): Promise<boolean> {
    if (!token) return false;
    try {
      const payload = await this.jwt.verifyAsync<DeviceToken>(token);
      if (payload.typ !== 'mfa-device' || payload.sub !== usuarioId) return false;
      const factor = await this.prisma.mfaFactor.findUnique({ where: { usuarioId } });
      return Boolean(factor?.confirmedAt) && payload.fv === this.factorVersion(factor!);
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------- state

  async isActive(usuarioId: string): Promise<boolean> {
    const factor = await this.prisma.mfaFactor.findUnique({
      where: { usuarioId },
      select: { confirmedAt: true },
    });
    return Boolean(factor?.confirmedAt);
  }

  /** Required by the account's role or platform access (not counting a factor turned on by choice). */
  private requiredByRole(usuarioId: string): Promise<boolean> {
    return this.policy.requiredByRole(usuarioId);
  }

  async status(usuarioId: string) {
    const factor = await this.prisma.mfaFactor.findUnique({ where: { usuarioId } });
    const codes = Array.isArray(factor?.recoveryHashes) ? factor.recoveryHashes.length : 0;
    return {
      activo: Boolean(factor?.confirmedAt),
      activadoEl: factor?.confirmedAt ?? null,
      obligatorio: await this.requiredByRole(usuarioId),
      codigosRestantes: factor?.confirmedAt ? codes : 0,
    };
  }

  // ---------------------------------------------------------------- enrolment

  /** A new secret to scan. Replaces an unfinished enrolment; refused when one is already active. */
  async startEnrollment(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
      select: { email: true },
    });
    const existing = await this.prisma.mfaFactor.findUnique({ where: { usuarioId } });
    if (existing?.confirmedAt)
      throw new ConflictException('La verificación en dos pasos ya está activa.');
    const secret = newSecret();
    const secretEnc = encryptSecret(secret, this.key());
    await this.prisma.mfaFactor.upsert({
      where: { usuarioId },
      create: { usuarioId, secretEnc },
      update: { secretEnc, lastStep: 0, failedAttempts: 0, lockedUntil: null, recoveryHashes: [] },
    });
    return { clave: secret, enlace: otpauthUrl(secret, usuario.email) };
  }

  /** Confirms the enrolment with a code from the app; returns the recovery codes, shown only now. */
  async confirmEnrollment(usuarioId: string, code: string, now = new Date()) {
    const factor = await this.prisma.mfaFactor.findUnique({ where: { usuarioId } });
    if (!factor) throw new NotFoundException('Primero escaneá el código QR.');
    if (factor.confirmedAt)
      throw new ConflictException('La verificación en dos pasos ya está activa.');
    this.assertNotLocked(factor.lockedUntil, now);
    const step = matchStep(
      decryptSecret(factor.secretEnc, this.key()),
      code,
      factor.lastStep,
      now.getTime(),
    );
    if (step === null) return this.fail(usuarioId, factor.failedAttempts, now);
    const codes = newRecoveryCodes();
    await this.prisma.mfaFactor.update({
      where: { usuarioId },
      data: { confirmedAt: now, lastStep: step, recoveryHashes: codes.map(hashRecoveryCode) },
    });
    this.policy.forget(usuarioId);
    await this.audit(usuarioId, usuarioId, 'MFA_ACTIVADO');
    return { codigosRecuperacion: codes };
  }

  // ---------------------------------------------------------------- verification

  /**
   * Checks a code from the app or a recovery code. Locks after 5 failures in a row (15 minutes).
   * `remember` returns a 30-day device token.
   */
  async verify(
    usuarioId: string,
    input: { codigo?: string; codigoRecuperacion?: string },
    remember: boolean,
    now = new Date(),
  ) {
    const factor = await this.prisma.mfaFactor.findUnique({ where: { usuarioId } });
    if (!factor?.confirmedAt)
      throw new ConflictException('La verificación en dos pasos no está activa.');
    this.assertNotLocked(factor.lockedUntil, now);
    const hashes = Array.isArray(factor.recoveryHashes) ? (factor.recoveryHashes as string[]) : [];
    if (input.codigoRecuperacion) {
      const hash = hashRecoveryCode(input.codigoRecuperacion);
      if (!hashes.includes(hash)) return this.fail(usuarioId, factor.failedAttempts, now);
      await this.prisma.mfaFactor.update({
        where: { usuarioId },
        data: {
          recoveryHashes: hashes.filter((h) => h !== hash),
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
      await this.audit(usuarioId, usuarioId, 'MFA_CODIGO_RECUPERACION', {
        restantes: hashes.length - 1,
      });
    } else {
      const step = matchStep(
        decryptSecret(factor.secretEnc, this.key()),
        input.codigo ?? '',
        factor.lastStep,
        now.getTime(),
      );
      if (step === null) return this.fail(usuarioId, factor.failedAttempts, now);
      await this.prisma.mfaFactor.update({
        where: { usuarioId },
        data: { lastStep: step, failedAttempts: 0, lockedUntil: null },
      });
    }
    return { dispositivo: remember ? await this.rememberDevice(usuarioId) : null };
  }

  private assertNotLocked(lockedUntil: Date | null, now: Date) {
    if (lockedUntil && lockedUntil > now) {
      throw new HttpException(
        'Demasiados intentos. Esperá 15 minutos y probá de nuevo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async fail(usuarioId: string, previous: number, now: Date): Promise<never> {
    const failures = previous + 1;
    const lock = failures >= MAX_FAILURES;
    await this.prisma.mfaFactor.update({
      where: { usuarioId },
      data: {
        failedAttempts: lock ? 0 : failures,
        lockedUntil: lock ? new Date(now.getTime() + LOCK_MS) : null,
      },
    });
    if (lock) await this.audit(usuarioId, usuarioId, 'MFA_BLOQUEADO', { intentos: MAX_FAILURES });
    throw new UnauthorizedException('El código no es correcto.');
  }

  // ---------------------------------------------------------------- management

  async regenerateRecoveryCodes(usuarioId: string, code: string) {
    await this.verify(usuarioId, { codigo: code }, false);
    const codes = newRecoveryCodes();
    await this.prisma.mfaFactor.update({
      where: { usuarioId },
      data: { recoveryHashes: codes.map(hashRecoveryCode) },
    });
    await this.audit(usuarioId, usuarioId, 'MFA_CODIGOS_NUEVOS');
    return { codigosRecuperacion: codes };
  }

  /** Turning it off is only for those who turned it on by choice. */
  async disable(usuarioId: string, code: string) {
    if (await this.requiredByRole(usuarioId)) {
      throw new ForbiddenException('Para tu rol la verificación en dos pasos es obligatoria.');
    }
    await this.verify(usuarioId, { codigo: code }, false);
    await this.prisma.mfaFactor.delete({ where: { usuarioId } });
    this.policy.forget(usuarioId);
    await this.audit(usuarioId, usuarioId, 'MFA_DESACTIVADO');
  }

  /**
   * The Owner resets the second factor of someone in their Business who lost the phone; that
   * person enrols again at the next sign-in. Never on another Owner, never on oneself.
   */
  async resetForTeammate(actorUsuarioId: string, targetUsuarioId: string, companyId: string) {
    if (actorUsuarioId === targetUsuarioId) {
      throw new ForbiddenException('No podés resetear tu propia verificación.');
    }
    const deleted = await this.prisma.mfaFactor.deleteMany({
      where: { usuarioId: targetUsuarioId },
    });
    this.policy.forget(targetUsuarioId);
    await this.audit(
      actorUsuarioId,
      targetUsuarioId,
      'MFA_RESETEADO',
      { habia: deleted.count > 0 },
      companyId,
    );
    return { reseteado: deleted.count > 0 };
  }

  private async audit(
    actorId: string,
    targetId: string,
    accion: AuditAction,
    extra: Record<string, unknown> = {},
    companyId?: string,
  ) {
    const target = await this.prisma.usuario.findUnique({
      where: { id: targetId },
      select: { empresaId: true, nombre: true, email: true },
    });
    if (!target) return;
    await recordAudit(this.prisma, companyId ?? target.empresaId, actorId, {
      accion,
      entidad: 'Usuario',
      entidadId: targetId,
      despues: { nombre: target.nombre, email: target.email, ...extra },
    });
  }
}
