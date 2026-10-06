import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuthService } from '../auth/auth.service';
import { AuthCustomerService } from '../auth/auth.customer.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { ActivateInvitationDto } from './dto/activate-invitation.dto';
import { CreateWholesaleInvitationDto } from './dto/create-wholesale-invitation.dto';
import { ActivateWholesaleInvitationDto } from './dto/activate-wholesale-invitation.dto';

// The invitation stops being valid after 7 days — an old or leaked link
// must not remain usable indefinitely. Fixed for now (not configurable via
// env var): unlike the loyalty or inventory thresholds, this is not a
// business parameter of the owner, it is a reasonable security decision
// with no real case asking to change it.
const INVITATION_EXPIRATION_DAYS = 7;

/**
 * RF-17 (docs/spec-login-roles.md): sign-up by invitation, never public
 * self-registration. The Owner creates the invitation from the panel (with
 * the role already chosen); the invited person activates it with the token
 * received by email — only then is the real Usuario created, in PENDIENTE
 * status (dossier not yet completed).
 */
@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly authService: AuthService,
    private readonly authCustomerService: AuthCustomerService,
  ) {}

  async create(companyId: string, invitedById: string, dto: CreateInvitationDto) {
    const alreadyExists = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (alreadyExists) {
      throw new BadRequestException(`Ya existe una cuenta con el email ${dto.email}`);
    }

    const invitationPending = await this.prisma.invitacion.findFirst({
      where: {
        empresaId: companyId,
        email: dto.email,
        usadaEn: null,
        expiraEn: { gt: new Date() },
      },
    });
    if (invitationPending) {
      throw new BadRequestException(`Ya hay una invitación pendiente para ${dto.email}`);
    }

    const expiresIn = new Date();
    expiresIn.setDate(expiresIn.getDate() + INVITATION_EXPIRATION_DAYS);

    const invitation = await this.prisma.invitacion.create({
      data: {
        empresaId: companyId,
        email: dto.email,
        rol: dto.rol,
        token: crypto.randomBytes(32).toString('hex'),
        invitadoPorId: invitedById,
        expiraEn: expiresIn,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL no configurado (ver apps/api/.env)');
    }
    const activationLink = new URL('/activar-invitacion', frontendUrl);
    activationLink.searchParams.set('token', invitation.token);

    // Sending may fail (Resend not configured, quota limit, etc.) without
    // that preventing the invitation from being created — the link is still
    // returned in the response so the owner can copy it and send it by hand if
    // the email did not go out (see EmailService).
    const sent = await this.emailService.send(
      dto.email,
      'Te invitaron a Otra Roonda Más',
      `<p>Te invitaron a sumarte a Otra Roonda Más con el rol ${this.roleName(dto.rol)}.</p>
       <p><a href="${activationLink.toString()}">Activar mi cuenta</a></p>
       <p>Este link vence en ${INVITATION_EXPIRATION_DAYS} días.</p>`,
    );

    return {
      invitacion: invitation,
      linkActivacion: activationLink.toString(),
      emailEnviado: sent,
    };
  }

  /**
   * Creates the real Usuario from a valid invitation — the invitation itself
   * NEVER had credentials, this is the first time the account really
   * exists. It is born with estadoLegajo=PENDIENTE (schema default): it
   * cannot operate until the owner approves its dossier (see
   * DossierController.approve()).
   */
  async activate(dto: ActivateInvitationDto) {
    const invitation = await this.prisma.invitacion.findUnique({ where: { token: dto.token } });
    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }
    if (invitation.usadaEn) {
      throw new BadRequestException('Esta invitación ya fue utilizada');
    }
    if (invitation.expiraEn < new Date()) {
      throw new BadRequestException(
        'Esta invitación venció — pedile al dueño que te invite de nuevo',
      );
    }
    if (!dto.password) {
      // No Google login on the Usuario side yet for this flow
      // (auth.google.service.ts only covers automatic sign-up via
      // GOOGLE_SIGNUP_EMPRESA_ID, not the activation of a specific invitation) —
      // for now activation requires a password. Linking Google after the account
      // is activated keeps working the same as today (auth.google.service.ts
      // looks up by existing email).
      throw new BadRequestException('La contraseña es obligatoria para activar la cuenta');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [user] = await this.prisma.$transaction([
      this.prisma.usuario.create({
        data: {
          empresaId: invitation.empresaId,
          nombre: dto.nombre,
          email: invitation.email,
          passwordHash,
          rol: invitation.rol,
          activo: true,
          // Explicit, NOT the schema default (APROBADO — correct for OWNER and for
          // migrating accounts that already existed before this increment, but an
          // account activated by invitation is ALWAYS born without a complete
          // dossier).
          estadoLegajo: 'PENDIENTE',
        },
        include: { usuarioPermisos: { include: { permiso: true } }, empresa: true },
      }),
      this.prisma.invitacion.update({
        where: { id: invitation.id },
        data: { usadaEn: new Date() },
      }),
    ]);

    return this.authService.issueSession(user, []);
  }

  /**
   * Creates an invitation for a wholesale Cliente (B2B). Uses the same
   * `Invitacion` model but with `rol: 'ASISTENTE_LOCAL'` as a placeholder
   * (the only role field the schema accepts; the real account type is
   * determined by the activation endpoint used, not by this field). The
   * token can be used ONLY at the wholesale activation endpoint, not at the
   * Usuario activation endpoint (which creates a Usuario, not a Cliente).
   *
   * Cleaner alternative in the future: add `esMayoristaInvitacion` to the
   * Invitacion schema — pending if the flow grows. For now the context of
   * the activation endpoint is a sufficient discriminator.
   */
  async createWholesale(companyId: string, invitedById: string, dto: CreateWholesaleInvitationDto) {
    // Verify that no Cliente or Usuario already exists with that email
    const customerAlreadyExists = await this.prisma.cliente.findFirst({
      where: { empresaId: companyId, email: dto.email },
    });
    if (customerAlreadyExists) {
      throw new BadRequestException(`Ya existe un cliente con el email ${dto.email}`);
    }

    const invitationPending = await this.prisma.invitacion.findFirst({
      where: {
        empresaId: companyId,
        email: dto.email,
        usadaEn: null,
        expiraEn: { gt: new Date() },
      },
    });
    if (invitationPending) {
      throw new BadRequestException(`Ya hay una invitación pendiente para ${dto.email}`);
    }

    const expiresIn = new Date();
    expiresIn.setDate(expiresIn.getDate() + INVITATION_EXPIRATION_DAYS);

    // 'PROVEEDOR' as a role placeholder — the schema requires a UserRole but
    // for the wholesaler the real discriminator is the activation endpoint.
    const invitation = await this.prisma.invitacion.create({
      data: {
        empresaId: companyId,
        email: dto.email,
        rol: 'PROVEEDOR',
        token: crypto.randomBytes(32).toString('hex'),
        invitadoPorId: invitedById,
        expiraEn: expiresIn,
      },
    });

    const storeUrl = process.env.TIENDA_FRONTEND_URL || process.env.FRONTEND_URL;
    if (!storeUrl) {
      throw new Error('TIENDA_FRONTEND_URL / FRONTEND_URL no configurado');
    }
    const activationLink = new URL('/activar-invitacion-mayorista', storeUrl);
    activationLink.searchParams.set('token', invitation.token);

    const sent = await this.emailService.send(
      dto.email,
      'Te invitaron a Otra Roonda Más como cliente mayorista',
      `<p>Hola${dto.nombreComercial ? ` ${dto.nombreComercial}` : ''}!</p>
       <p>Te invitaron a acceder a la tienda de Otra Roonda Más como cliente mayorista.</p>
       <p><a href="${activationLink.toString()}">Activar mi cuenta</a></p>
       <p>Este link vence en ${INVITATION_EXPIRATION_DAYS} días.</p>`,
    );

    return {
      invitacion: invitation,
      linkActivacion: activationLink.toString(),
      emailEnviado: sent,
    };
  }

  /**
   * Activates the invitation by creating a Cliente with esMayorista=true and
   * estadoLegajo=PENDIENTE — it does not operate until the owner approves the
   * dossier.
   */
  async activateWholesale(dto: ActivateWholesaleInvitationDto) {
    const invitation = await this.prisma.invitacion.findUnique({ where: { token: dto.token } });
    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }
    if (invitation.usadaEn) {
      throw new BadRequestException('Esta invitación ya fue utilizada');
    }
    if (invitation.expiraEn < new Date()) {
      throw new BadRequestException(
        'Esta invitación venció — pedile al dueño que te invite de nuevo',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [customer] = await this.prisma.$transaction([
      this.prisma.cliente.create({
        data: {
          empresaId: invitation.empresaId,
          nombre: dto.nombre,
          email: invitation.email,
          passwordHash,
          esMayorista: true,
          // Explicit PENDIENTE — same as Usuario invitations. Null would be 'retail
          // customer without dossier'; PENDIENTE is 'wholesaler awaiting owner
          // approval' (see spec-login-roles.md).
          estadoLegajo: 'PENDIENTE',
        },
        include: { empresa: true },
      }),
      this.prisma.invitacion.update({
        where: { id: invitation.id },
        data: { usadaEn: new Date() },
      }),
    ]);

    return this.authCustomerService.issueCustomerSession(customer);
  }

  private roleName(role: CreateInvitationDto['rol']): string {
    const names: Record<CreateInvitationDto['rol'], string> = {
      ASISTENTE_LOCAL: 'Asistente de local',
      PROVEEDOR: 'Proveedor',
      REPARTIDOR: 'Repartidor',
    };
    return names[role];
  }
}
