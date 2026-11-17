import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SLUG_PATTERN, createBusinessWithOwner } from '../platform-admin/create-business';
import { recordAudit } from '../auditoria/audit-catalog';
import { PasswordResetService } from './password-reset.service';
import { MfaService } from './mfa/mfa.service';
import type { GoogleProfile } from './google.strategy';

const SIGNUP_TICKET_TTL = '30m';
/** Sign-ups arrive through the web server (no visitor IP here): a platform-wide cap. */
const MAX_PER_HOUR = 20;

type SignupTicket = {
  typ: 'signup-google';
  googleId: string;
  email: string;
  nombre: string;
  fotoUrl: string | null;
};

/** «Otra Ronda Más» → «otra-ronda-mas» (3 to 40 characters). */
export function slugFrom(name: string): string {
  const base = name
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replace(/^-/, '')
    .replace(/-$/, '')
    .slice(0, 34)
    .replace(/-$/, '');
  return base.length >= 3 ? base : `negocio-${base || 'nuevo'}`;
}

/**
 * OR-B4-045 — anyone can register a Business of their own and becomes its Owner:
 * - with email: no password on the form; a welcome email with a single-use link (7 days) proves
 *   the address and lets them create it;
 * - with Google: the identity Google verified, after the Google sign-in found no account.
 * The Owner enrols MFA at the first sign-in (OR-B4-044). Nobody joins an existing Business this
 * way: staff accounts still come from an invitation (RF-17). At most 20 sign-ups per hour overall.
 */
@Injectable()
export class SignupService {
  private recent: number[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordResetService,
    private readonly mfa: MfaService,
  ) {}

  private throttle(now = Date.now()) {
    this.recent = this.recent.filter((t) => now - t < 3_600_000);
    if (this.recent.length >= MAX_PER_HOUR) {
      throw new HttpException(
        'Hay muchos registros en este momento. Probá en un rato.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.recent.push(now);
  }

  /** A free store address from the name: «mi-kiosco», else «mi-kiosco-2», «mi-kiosco-3»… */
  private async freeSlug(name: string): Promise<string> {
    const base = slugFrom(name);
    for (let n = 1; n < 50; n += 1) {
      const slug = n === 1 ? base : `${base}-${n}`;
      if (!SLUG_PATTERN.test(slug)) continue;
      if (!(await this.prisma.empresa.findUnique({ where: { slug }, select: { id: true } })))
        return slug;
    }
    throw new ConflictException(
      'No encontramos una dirección libre para la tienda. Probá otro nombre.',
    );
  }

  private async assertFree(nombreNegocio: string, email: string) {
    const [byName, usuario, user] = await Promise.all([
      this.prisma.empresa.findUnique({ where: { nombre: nombreNegocio }, select: { id: true } }),
      this.prisma.usuario.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      }),
      this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      }),
    ]);
    if (usuario || user) {
      throw new ConflictException(
        'Ya hay una cuenta con ese email. Ingresá o usá «Olvidé mi contraseña».',
      );
    }
    if (byName)
      throw new ConflictException('Ya hay un negocio con ese nombre en Wapsell. Probá con otro.');
  }

  private async create(input: {
    nombreNegocio: string;
    nombre: string;
    email: string;
    googleId?: string;
    fotoUrl?: string | null;
    via: 'email' | 'google';
  }) {
    const nombreNegocio = input.nombreNegocio.trim();
    const nombre = input.nombre.trim();
    const email = input.email.trim().toLowerCase();
    if (nombreNegocio.length < 2) throw new BadRequestException('Escribí el nombre de tu negocio.');
    if (nombre.length < 2) throw new BadRequestException('Escribí tu nombre.');
    await this.assertFree(nombreNegocio, email);
    const slug = await this.freeSlug(nombreNegocio);
    return this.prisma.$transaction(async (tx) => {
      const created = await createBusinessWithOwner(tx, {
        nombre: nombreNegocio,
        slug,
        ownerNombre: nombre,
        ownerEmail: email,
      });
      if (input.googleId) {
        await tx.usuario.update({
          where: { id: created.usuarioId },
          data: { googleId: input.googleId, fotoUrl: input.fotoUrl ?? null },
        });
      }
      await recordAudit(tx, created.empresaId, created.usuarioId, {
        accion: 'NEGOCIO_REGISTRADO',
        entidad: 'Empresa',
        entidadId: created.empresaId,
        despues: { nombre: nombreNegocio, slug, owner: nombre, email, via: input.via },
      });
      return { ...created, slug, nombreNegocio, email };
    });
  }

  /** With email: the welcome email carries the link to create the password. */
  async registerWithEmail(input: { nombreNegocio: string; nombre: string; email: string }) {
    this.throttle();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
      throw new BadRequestException('Revisá el email.');
    }
    const created = await this.create({ ...input, via: 'email' });
    const { sent } = await this.passwords.issueWelcomeLink(
      created.usuarioId,
      created.nombreNegocio,
    );
    return {
      negocio: created.nombreNegocio,
      tienda: created.slug,
      email: created.email,
      mailEnviado: sent,
    };
  }

  // ---------------------------------------------------------------- Google

  /** After a Google sign-in with no account: a 30-minute ticket to register a Business. */
  signupTicket(profile: GoogleProfile): Promise<string> {
    return this.jwt.signAsync(
      {
        typ: 'signup-google',
        googleId: profile.googleId,
        email: profile.email,
        nombre: profile.nombre,
        fotoUrl: profile.fotoUrl,
      } satisfies SignupTicket,
      { expiresIn: SIGNUP_TICKET_TTL },
    );
  }

  private async readTicket(ticket: string): Promise<SignupTicket> {
    try {
      const t = await this.jwt.verifyAsync<SignupTicket>(ticket);
      if (t.typ !== 'signup-google' || !t.googleId || !t.email)
        throw new Error('not a signup ticket');
      return t;
    } catch {
      throw new UnauthorizedException('El registro con Google venció. Volvé a empezar.');
    }
  }

  /** Who is registering (shown on the form): name and email from Google. */
  async googleDetails(ticket: string) {
    const t = await this.readTicket(ticket);
    return { nombre: t.nombre, email: t.email };
  }

  /** With Google: the Business is created and the next step is enrolling MFA. */
  async registerWithGoogle(ticket: string, nombreNegocio: string) {
    this.throttle();
    const t = await this.readTicket(ticket);
    const created = await this.create({
      nombreNegocio,
      nombre: t.nombre || t.email.split('@')[0],
      email: t.email,
      googleId: t.googleId,
      fotoUrl: t.fotoUrl,
      via: 'google',
    });
    return {
      negocio: created.nombreNegocio,
      tienda: created.slug,
      mfa: 'activar' as const,
      ticket: await this.mfa.issueTicket(created.usuarioId),
    };
  }
}
