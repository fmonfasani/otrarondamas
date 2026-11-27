import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
/** Login por rol: the email link that joins the accounts lasts 30 minutes. */
const LINK_TTL_MS = 30 * 60 * 1000;
/** Login por rol: wrong buyer passwords allowed per work account in 15 minutes. */
const LINK_TRIES = 5;
/** A plausible email without a backtracking-prone regular expression. */
export function isEmail(value: string): boolean {
  const at = value.indexOf('@');
  if (at < 1 || at !== value.lastIndexOf('@') || /\s/.test(value)) return false;
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}

type BuyerSession = { sub: string; typ: 'comprador' };
type Buyer = { id: string; nombre: string; email: string };

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** Login por rol — the email that confirms joining the customer account to the work account. */
export function linkEmailHtml(nombre: string, link: string): string {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a19">
  <h2 style="margin:0 0 12px">Uní tus cuentas de Wapsell</h2>
  <p>Hola ${escapeHtml(nombre)}, pediste usar tu cuenta de trabajo también para comprar.</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#d97757;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Unir mis cuentas</a></p>
  <p style="font-size:12px;color:#6b6a65">El enlace vale 30 minutos. Si no lo pediste, ignorá este mail: nada cambia.</p>
</div>`;
}

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

  private linkTries = new Map<string, number[]>();

  /** Login por rol: at most 5 wrong buyer passwords per work account every 15 minutes. */
  private linkThrottle(userId: string, now = Date.now()) {
    const recent = (this.linkTries.get(userId) ?? []).filter((t) => now - t < 15 * 60_000);
    if (recent.length >= LINK_TRIES) {
      throw new HttpException(
        'Probaste muchas veces. Esperá unos minutos o pedí el enlace por mail.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.linkTries.set(userId, recent);
  }

  /** The person behind a work (staff) session: their global User. Never a store customer. */
  private async workPerson(auth: { id: string; type?: string }) {
    if (auth.type && auth.type !== 'usuario') {
      throw new ForbiddenException('Solo con tu cuenta de trabajo.');
    }
    const user = await this.prisma.user.findUnique({
      where: { usuarioId: auth.id },
      select: { id: true, email: true, nombre: true },
    });
    if (!user) throw new ForbiddenException('Solo con tu cuenta de trabajo.');
    return { ...user, email: user.email.trim().toLowerCase() };
  }

  /**
   * Login por rol (Owner, 2026-11-26) — how the work account stands with a customer account:
   * joined, one with the same email to confirm (with its password, or by email when it has
   * none), or none yet (one click creates it).
   */
  async linkStatus(auth: { id: string; type?: string }) {
    const person = await this.workPerson(auth);
    const joined = await this.prisma.comprador.findUnique({ where: { userId: person.id } });
    if (joined?.activo) return { estado: 'unida' as const, email: joined.email };
    const same = await this.prisma.comprador.findUnique({ where: { email: person.email } });
    if (same?.activo && same.emailVerificadoAt && !same.userId) {
      return {
        estado: 'por-confirmar' as const,
        email: same.email,
        tieneClave: Boolean(same.passwordHash),
      };
    }
    if (same?.userId && same.userId !== person.id) {
      return { estado: 'ocupada' as const, email: same.email };
    }
    return { estado: 'sin-cuenta' as const, email: person.email };
  }

  /** Joined already: a buyer session for the same person («Comprar en Wapsell»). */
  async enterAsBuyer(auth: { id: string; type?: string }) {
    const person = await this.workPerson(auth);
    const joined = await this.prisma.comprador.findUnique({ where: { userId: person.id } });
    if (!joined?.activo || !joined.emailVerificadoAt) {
      throw new ConflictException('Primero uní tu cuenta de cliente.');
    }
    return this.session(joined);
  }

  /** Joins with the customer account's password (same email), once. */
  async linkWithPassword(auth: { id: string; type?: string }, password: string) {
    const person = await this.workPerson(auth);
    this.linkThrottle(person.id);
    const buyer = await this.prisma.comprador.findUnique({ where: { email: person.email } });
    const ok =
      buyer?.activo &&
      buyer.emailVerificadoAt &&
      buyer.passwordHash &&
      !buyer.userId &&
      (await bcrypt.compare(password, buyer.passwordHash));
    if (!buyer || !ok)
      throw new UnauthorizedException('La contraseña de tu cuenta de cliente no es correcta.');
    const joined = await this.prisma.comprador.update({
      where: { id: buyer.id },
      data: { userId: person.id },
    });
    this.linkTries.delete(person.id);
    return this.session(joined);
  }

  /**
   * No customer account with this email: one is created and joined. The email is already proven
   * by the work account (its password was set from an emailed link, or Google verified it).
   */
  async linkCreate(auth: { id: string; type?: string }, now = new Date()) {
    const person = await this.workPerson(auth);
    const same = await this.prisma.comprador.findUnique({ where: { email: person.email } });
    if (same?.emailVerificadoAt) {
      throw new ConflictException(
        'Ya tenés una cuenta de cliente con ese mail: confirmala para unirlas.',
      );
    }
    const joined = same
      ? // An unverified sign-up with this email: the proven owner of the email keeps it.
        await this.prisma.comprador.update({
          where: { id: same.id },
          data: {
            userId: person.id,
            emailVerificadoAt: now,
            passwordHash: null,
            nombre: person.nombre,
          },
        })
      : await this.prisma.comprador.create({
          data: {
            email: person.email,
            nombre: person.nombre,
            emailVerificadoAt: now,
            userId: person.id,
          },
        });
    return this.session(joined);
  }

  /** The customer account has no password (Google): the confirmation goes by email. */
  async linkByEmail(auth: { id: string; type?: string }, now = new Date()) {
    const person = await this.workPerson(auth);
    const buyer = await this.prisma.comprador.findUnique({ where: { email: person.email } });
    if (!buyer?.activo || !buyer.emailVerificadoAt || buyer.userId) {
      throw new ConflictException('No hay una cuenta de cliente para unir.');
    }
    this.linkThrottle(person.id);
    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.compradorToken.updateMany({
        where: { compradorId: buyer.id, tipo: 'UNIR_CUENTA', usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.compradorToken.create({
        data: {
          compradorId: buyer.id,
          tipo: 'UNIR_CUENTA',
          tokenHash: hashToken(token),
          expiresAt: new Date(now.getTime() + LINK_TTL_MS),
        },
      }),
    ]);
    const base = (process.env.WEB_APP_URL || DEFAULT_WEB_APP_URL).replace(/\/+$/, '');
    const sent = await this.email.send(
      buyer.email,
      'Uní tus cuentas de Wapsell',
      linkEmailHtml(buyer.nombre, `${base}/entrar/unir?token=${encodeURIComponent(token)}`),
    );
    return { email: buyer.email, mailEnviado: sent };
  }

  /**
   * The emailed link, opened with the work session: both proofs (the work account and the
   * email inbox) belong to the same person, so the accounts join.
   */
  async linkWithToken(auth: { id: string; type?: string }, token: string, now = new Date()) {
    const person = await this.workPerson(auth);
    const record = await this.prisma.compradorToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, tipo: true, usedAt: true, expiresAt: true, Comprador: true },
    });
    if (
      record?.tipo !== 'UNIR_CUENTA' ||
      record.usedAt ||
      record.expiresAt < now ||
      !record.Comprador.activo ||
      record.Comprador.userId ||
      record.Comprador.email.toLowerCase() !== person.email
    ) {
      throw new UnauthorizedException(
        'El enlace venció, ya se usó o es de otra cuenta. Pedí uno nuevo.',
      );
    }
    const joined = await this.prisma.$transaction(async (tx) => {
      await tx.compradorToken.update({ where: { id: record.id }, data: { usedAt: now } });
      return tx.comprador.update({
        where: { id: record.Comprador.id },
        data: { userId: person.id },
      });
    });
    return this.session(joined);
  }

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
    if (!isEmail(email)) throw new BadRequestException('Revisá el email.');
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
      record?.tipo !== 'VERIFICAR_EMAIL' ||
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
      where: { interno: false },
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
