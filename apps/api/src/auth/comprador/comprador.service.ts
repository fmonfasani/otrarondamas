import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { BusinessContextService } from '../../business-context/business-context.service';
import { AuthCustomerService } from '../auth.customer.service';
import { DEFAULT_WEB_APP_URL } from '../password-reset.service';
import type { GoogleProfile } from '../google.strategy';

/**
 * ADR-IDN-001/008/011 — the universal buyer: one Wapsell account to buy in any business.
 *
 * - Sign-up with email and password; the account works once the email is verified (a
 *   single-use link, 3 days). With Google the email is already verified by Google.
 * - The buyer session is a signed token with `typ: 'comprador'`. JwtStrategy refuses every token
 *   that carries `typ`, so it can never be used as a staff or store-customer session.
 * - Entering a business: the business keeps its own Cliente, linked to the buyer (created if
 *   needed, or an existing account with the same email is linked). The store then works with
 *   its usual customer session.
 */
export const BUYER_SESSION_TTL = '30d';
const VERIFY_TTL_MS = 3 * 24 * 3600 * 1000;
const MAX_SIGNUPS_PER_HOUR = 60;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BuyerSession = { sub: string; typ: 'comprador' };
type Buyer = { id: string; nombre: string; email: string };

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export function verifyEmailHtml(nombre: string, link: string): string {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#141413">
  <h1 style="font-size:22px">¡Hola, ${escapeHtml(nombre.split(' ')[0] || nombre)}!</h1>
  <p>Ya casi tenés tu cuenta de Wapsell para comprar en los negocios cerca tuyo.</p>
  <p>Confirmá tu email con este enlace. Sirve una sola vez y vence en 3 días.</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#d97757;color:#141413;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Confirmar mi email</a></p>
  <p style="font-size:12px;color:#6b6a65">Si no creaste una cuenta en Wapsell, ignorá este mail.</p>
</div>`;
}

@Injectable()
export class CompradorService {
  private readonly logger = new Logger(CompradorService.name);
  private recent: number[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
    private readonly businessContext: BusinessContextService,
    private readonly customers: AuthCustomerService,
  ) {}

  private throttle(now = Date.now()) {
    this.recent = this.recent.filter((t) => now - t < 3_600_000);
    if (this.recent.length >= MAX_SIGNUPS_PER_HOUR) {
      throw new HttpException(
        'Hay muchos registros en este momento. Probá en un rato.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.recent.push(now);
  }

  private session(buyer: Buyer) {
    return this.jwt
      .signAsync({ sub: buyer.id, typ: 'comprador' } satisfies BuyerSession, {
        expiresIn: BUYER_SESSION_TTL,
      })
      .then((accessToken) => ({
        accessToken,
        comprador: { id: buyer.id, nombre: buyer.nombre, email: buyer.email },
      }));
  }

  /** The active buyer behind a buyer session token, or 401. */
  async fromSession(token: string): Promise<Buyer> {
    let payload: BuyerSession;
    try {
      payload = await this.jwt.verifyAsync<BuyerSession>(token);
    } catch {
      throw new UnauthorizedException('Tu sesión venció. Ingresá de nuevo.');
    }
    if (payload.typ !== 'comprador' || !payload.sub)
      throw new UnauthorizedException('Sesión inválida.');
    const buyer = await this.prisma.comprador.findUnique({
      where: { id: payload.sub },
      select: { id: true, nombre: true, email: true, activo: true, emailVerificadoAt: true },
    });
    if (!buyer?.activo || !buyer.emailVerificadoAt)
      throw new UnauthorizedException('Sesión inválida.');
    return { id: buyer.id, nombre: buyer.nombre, email: buyer.email };
  }

  private async sendVerification(buyer: Buyer, now = new Date()) {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.compradorToken.updateMany({
        where: { compradorId: buyer.id, tipo: 'VERIFICAR_EMAIL', usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.compradorToken.create({
        data: {
          compradorId: buyer.id,
          tipo: 'VERIFICAR_EMAIL',
          tokenHash: hashToken(token),
          expiresAt: new Date(now.getTime() + VERIFY_TTL_MS),
        },
      }),
    ]);
    const base = (process.env.WEB_APP_URL || DEFAULT_WEB_APP_URL).replace(/\/+$/, '');
    const link = `${base}/registro/verificar?token=${encodeURIComponent(token)}`;
    const sent = await this.email.send(
      buyer.email,
      'Confirmá tu email para comprar en Wapsell',
      verifyEmailHtml(buyer.nombre, link),
    );
    if (!sent) this.logger.error(`Verification email could not be sent (comprador ${buyer.id})`);
    return sent;
  }

  /** Sign-up with email. Nothing tells whether the email belonged to someone (same answer). */
  async register(input: { nombre: string; email: string; password: string }) {
    this.throttle();
    const nombre = input.nombre.trim();
    const email = input.email.trim().toLowerCase();
    if (nombre.length < 2) throw new BadRequestException('Escribí tu nombre.');
    if (!EMAIL.test(email)) throw new BadRequestException('Revisá el email.');
    if (input.password.length < 8)
      throw new BadRequestException('La contraseña tiene que tener al menos 8 caracteres.');

    const existing = await this.prisma.comprador.findUnique({ where: { email } });
    if (existing?.emailVerificadoAt) {
      throw new ConflictException(
        'Ya tenés una cuenta con ese email. Ingresá o usá «Olvidé mi contraseña».',
      );
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    // An unverified account can be claimed again: whoever proves the email keeps it.
    const buyer = existing
      ? await this.prisma.comprador.update({
          where: { id: existing.id },
          data: { nombre, passwordHash },
        })
      : await this.prisma.comprador.create({ data: { nombre, email, passwordHash } });
    const sent = await this.sendVerification(buyer);
    return { email, mailEnviado: sent };
  }

  /** The link of the verification email: confirms the email and opens a session. */
  async verify(token: string, now = new Date()) {
    const record = await this.prisma.compradorToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, tipo: true, usedAt: true, expiresAt: true, Comprador: true },
    });
    if (
      !record ||
      record.tipo !== 'VERIFICAR_EMAIL' ||
      record.usedAt ||
      record.expiresAt < now ||
      !record.Comprador.activo
    ) {
      throw new UnauthorizedException(
        'El enlace venció o ya se usó. Pedí uno nuevo registrándote otra vez.',
      );
    }
    const buyer = await this.prisma.$transaction(async (tx) => {
      await tx.compradorToken.update({ where: { id: record.id }, data: { usedAt: now } });
      return tx.comprador.update({
        where: { id: record.Comprador.id },
        data: { emailVerificadoAt: record.Comprador.emailVerificadoAt ?? now },
      });
    });
    return this.session(buyer);
  }

  /** Email and password of a verified buyer. Same message for every failure. */
  async login(emailRaw: string, password: string) {
    const email = emailRaw.trim().toLowerCase();
    const buyer = await this.prisma.comprador.findUnique({ where: { email } });
    const ok =
      buyer?.activo &&
      buyer.passwordHash &&
      buyer.emailVerificadoAt &&
      (await bcrypt.compare(password, buyer.passwordHash));
    if (!buyer || !ok)
      throw new UnauthorizedException('El email o la contraseña no son correctos.');
    return this.session(buyer);
  }

  /** Google: the email is verified by Google; the account is found by Google id or email, or created. */
  async loginWithGoogle(profile: GoogleProfile) {
    if (profile.emailVerified !== true)
      throw new UnauthorizedException('Google debe confirmar que el email está verificado');
    const email = profile.email.trim().toLowerCase();
    const byGoogle = await this.prisma.comprador.findUnique({
      where: { googleId: profile.googleId },
    });
    if (byGoogle) {
      if (!byGoogle.activo) throw new UnauthorizedException('Cuenta deshabilitada');
      return this.session(byGoogle);
    }
    const byEmail = await this.prisma.comprador.findUnique({ where: { email } });
    if (byEmail && !byEmail.activo) throw new UnauthorizedException('Cuenta deshabilitada');
    const now = new Date();
    const buyer = byEmail
      ? await this.prisma.comprador.update({
          where: { id: byEmail.id },
          data: {
            googleId: profile.googleId,
            fotoUrl: profile.fotoUrl,
            emailVerificadoAt: byEmail.emailVerificadoAt ?? now,
          },
        })
      : await this.prisma.comprador.create({
          data: {
            email,
            nombre: profile.nombre || email.split('@')[0],
            googleId: profile.googleId,
            fotoUrl: profile.fotoUrl,
            emailVerificadoAt: now,
          },
        });
    return this.session(buyer);
  }

  /** Businesses on Wapsell, for «comprá en tu negocio más cercano». Only public store data. */
  async businesses() {
    const rows = await this.prisma.empresa.findMany({
      select: { nombre: true, slug: true, configuracion: true },
      orderBy: { nombre: 'asc' },
      take: 200,
    });
    return rows.map((row) => {
      const perfil =
        ((row.configuracion ?? {}) as { perfil?: Record<string, unknown> }).perfil ?? {};
      const text = (k: string) => (typeof perfil[k] === 'string' ? (perfil[k] as string) : null);
      return {
        nombre: row.nombre,
        slug: row.slug,
        ciudad: text('ciudad'),
        provincia: text('provincia'),
        rubro: text('subrubro') ?? text('rubro'),
      };
    });
  }

  /**
   * Enter one business with the buyer account: that business's Cliente for this buyer — already
   * linked, or an account of that store with the same email (linked now), or a new one.
   */
  async enterBusiness(token: string, businessSlug: string) {
    const buyer = await this.fromSession(token);
    const { businessId } = await this.businessContext.resolveForAnonymous(businessSlug);
    let cliente = await this.prisma.cliente.findFirst({
      where: { empresaId: businessId, compradorId: buyer.id },
      include: { Empresa: true },
    });
    if (!cliente) {
      const sameEmail = await this.prisma.cliente.findFirst({
        where: {
          empresaId: businessId,
          compradorId: null,
          email: { equals: buyer.email, mode: 'insensitive' },
        },
        include: { Empresa: true },
        orderBy: { createdAt: 'asc' },
      });
      cliente = sameEmail
        ? await this.prisma.cliente.update({
            where: { id: sameEmail.id },
            data: { compradorId: buyer.id },
            include: { Empresa: true },
          })
        : await this.prisma.cliente.create({
            data: {
              empresaId: businessId,
              nombre: buyer.nombre,
              email: buyer.email,
              compradorId: buyer.id,
              esMayorista: false,
            },
            include: { Empresa: true },
          });
    }
    if (cliente.activo === false)
      throw new UnauthorizedException('Tu cuenta en este negocio está deshabilitada.');
    return this.customers.issueCustomerSession(cliente);
  }
}
