import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuthService } from '../auth/auth.service';
import { CrearInvitacionDto } from './dto/crear-invitacion.dto';
import { ActivarInvitacionDto } from './dto/activar-invitacion.dto';

// La invitación deja de ser válida a los 7 días — un link viejo o
// filtrado no debe seguir siendo utilizable indefinidamente. Fijo por
// ahora (no configurable por env var): a diferencia de los umbrales de
// fidelización o inventario, esto no es un parámetro de negocio del
// dueño, es una decisión de seguridad razonable sin caso real que pida
// cambiarlo.
const DIAS_EXPIRACION_INVITACION = 7;

/**
 * RF-17 (docs/spec-login-roles.md): alta por invitación, nunca
 * auto-registro público. El Owner crea la invitación desde el panel
 * (con el rol ya elegido); la persona invitada la activa con el token
 * recibido por email — recién ahí se crea el Usuario real, en estado
 * PENDIENTE (legajo sin completar todavía).
 */
@Injectable()
export class InvitacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly authService: AuthService,
  ) {}

  async crear(empresaId: string, invitadoPorId: string, dto: CrearInvitacionDto) {
    const yaExiste = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (yaExiste) {
      throw new BadRequestException(`Ya existe una cuenta con el email ${dto.email}`);
    }

    const invitacionPendiente = await this.prisma.invitacion.findFirst({
      where: { empresaId, email: dto.email, usadaEn: null, expiraEn: { gt: new Date() } },
    });
    if (invitacionPendiente) {
      throw new BadRequestException(`Ya hay una invitación pendiente para ${dto.email}`);
    }

    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + DIAS_EXPIRACION_INVITACION);

    const invitacion = await this.prisma.invitacion.create({
      data: {
        empresaId,
        email: dto.email,
        rol: dto.rol,
        token: crypto.randomBytes(32).toString('hex'),
        invitadoPorId,
        expiraEn,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL no configurado (ver apps/api/.env)');
    }
    const linkActivacion = new URL('/activar-invitacion', frontendUrl);
    linkActivacion.searchParams.set('token', invitacion.token);

    // El envío puede fallar (Resend sin configurar, límite de cuota,
    // etc.) sin que eso impida crear la invitación — se devuelve el
    // link igual en la respuesta para que el dueño pueda copiarlo y
    // mandarlo a mano si el email no salió (ver EmailService).
    const enviado = await this.emailService.enviar(
      dto.email,
      'Te invitaron a Otra Roonda Más',
      `<p>Te invitaron a sumarte a Otra Roonda Más con el rol ${this.nombreRol(dto.rol)}.</p>
       <p><a href="${linkActivacion.toString()}">Activar mi cuenta</a></p>
       <p>Este link vence en ${DIAS_EXPIRACION_INVITACION} días.</p>`,
    );

    return { invitacion, linkActivacion: linkActivacion.toString(), emailEnviado: enviado };
  }

  /**
   * Crea el Usuario real a partir de una invitación válida — la
   * invitación en sí NUNCA tuvo credenciales, esta es la primera vez
   * que la cuenta existe de verdad. Nace en estadoLegajo=PENDIENTE
   * (default del schema): no puede operar hasta que el dueño apruebe
   * su legajo (ver LegajoController.aprobar()).
   */
  async activar(dto: ActivarInvitacionDto) {
    const invitacion = await this.prisma.invitacion.findUnique({ where: { token: dto.token } });
    if (!invitacion) {
      throw new NotFoundException('Invitación no encontrada');
    }
    if (invitacion.usadaEn) {
      throw new BadRequestException('Esta invitación ya fue utilizada');
    }
    if (invitacion.expiraEn < new Date()) {
      throw new BadRequestException(
        'Esta invitación venció — pedile al dueño que te invite de nuevo',
      );
    }
    if (!dto.password) {
      // Sin Google login del lado de Usuario todavía para este flujo
      // (auth.google.service.ts solo cubre el alta automática vía
      // GOOGLE_SIGNUP_EMPRESA_ID, no la activación de una invitación
      // puntual) — por ahora la activación exige password. Vincular
      // Google después de activada la cuenta sigue funcionando igual
      // que hoy (auth.google.service.ts busca por email existente).
      throw new BadRequestException('La contraseña es obligatoria para activar la cuenta');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [usuario] = await this.prisma.$transaction([
      this.prisma.usuario.create({
        data: {
          empresaId: invitacion.empresaId,
          nombre: dto.nombre,
          email: invitacion.email,
          passwordHash,
          rol: invitacion.rol,
          activo: true,
          // Explícito, NO el default del schema (APROBADO — correcto
          // para OWNER y para la migración de cuentas que ya existían
          // antes de este incremento, pero una cuenta activada por
          // invitación SIEMPRE nace sin legajo completo).
          estadoLegajo: 'PENDIENTE',
        },
        include: { usuarioPermisos: { include: { permiso: true } }, empresa: true },
      }),
      this.prisma.invitacion.update({
        where: { id: invitacion.id },
        data: { usadaEn: new Date() },
      }),
    ]);

    return this.authService.emitirSesion(usuario, []);
  }

  private nombreRol(rol: CrearInvitacionDto['rol']): string {
    const nombres: Record<CrearInvitacionDto['rol'], string> = {
      ASISTENTE_LOCAL: 'Asistente de local',
      PROVEEDOR: 'Proveedor',
      REPARTIDOR: 'Repartidor',
    };
    return nombres[rol];
  }
}
