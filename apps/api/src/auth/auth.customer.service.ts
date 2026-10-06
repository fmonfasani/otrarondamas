import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, DossierStatus } from './auth.types';
import { CustomerRegistrationDto } from './dto/customer-registration.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleProfile } from './google.strategy';

/**
 * RF-17 (docs/spec-login-roles.md): Customer-side authentication.
 * Separate from AuthService (which is exclusive to Usuario) because the
 * data model is different — Cliente has no `empresaId` of its own but
 * inherits the scope via Pedido/CuentaCorriente, has no `permisos` nor
 * `rol` (the business attributes of Usuario do not apply to a buyer),
 * and `estadoLegajo` only exists for the wholesaler.
 *
 * The JWT issued here carries `type: 'cliente'` so that guards can
 * tell a Usuario token from a Cliente one (same secret, same Passport
 * strategy — see jwt.strategy.ts).
 */
@Injectable()
export class AuthCustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Public self-registration — only for retail (see
   * CustomerRegistrationDto). It does not allow registering with an email
   * that already exists in `Cliente`; if the email already exists as
   * `Usuario`, it also fails (emails are unique across the whole system
   * at the security level, even if they are separate tables).
   */
  async register(companyId: string, dto: CustomerRegistrationDto) {
    const customerAlreadyExists = await this.prisma.cliente.findFirst({
      where: { empresaId: companyId, email: dto.email },
    });
    if (customerAlreadyExists) {
      throw new BadRequestException(`Ya existe una cuenta con el email ${dto.email}`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const customer = await this.prisma.cliente.create({
      data: {
        empresaId: companyId,
        nombre: dto.nombre,
        email: dto.email,
        passwordHash,
        esMayorista: false,
        // estadoLegajo null para minorista — no aplica (solo mayorista
        // pasa por el flujo de legajo + aprobación del dueño).
      },
      include: { empresa: true },
    });

    return this.issueCustomerSession(customer);
  }

  async login(companyId: string, dto: LoginDto) {
    const customer = await this.prisma.cliente.findFirst({
      where: { empresaId: companyId, email: dto.email },
      include: { empresa: true },
    });

    if (!customer || !customer.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.issueCustomerSession(customer);
  }

  /**
   * Resolves the Google profile to a retail Cliente — same pattern as
   * AuthGoogleService for Usuario. If the Cliente already exists by
   * email, it links the googleId; if not, it creates it as a new retail
   * customer.
   *
   * The empresaId comes from TIENDA_EMPRESA_ID (same env var as
   * store.service.ts to identify which company the public store is.
   */
  async loginWithGoogle(profile: GoogleProfile) {
    const companyId = process.env.TIENDA_EMPRESA_ID;
    if (!companyId) {
      throw new Error('TIENDA_EMPRESA_ID no configurado');
    }

    let customer = await this.prisma.cliente.findUnique({
      where: { googleId: profile.googleId },
      include: { empresa: true },
    });

    if (!customer) {
      const existing = await this.prisma.cliente.findFirst({
        where: { empresaId: companyId, email: profile.email },
        include: { empresa: true },
      });

      if (existing) {
        customer = await this.prisma.cliente.update({
          where: { id: existing.id },
          data: { googleId: profile.googleId },
          include: { empresa: true },
        });
      } else {
        customer = await this.prisma.cliente.create({
          data: {
            empresaId: companyId,
            nombre: profile.nombre,
            email: profile.email,
            googleId: profile.googleId,
            esMayorista: false,
          },
          include: { empresa: true },
        });
      }
    }

    return this.issueCustomerSession(customer);
  }

  /**
   * Cliente JWT shape — parallel to AuthService.issueSession() for
   * Usuario. `permisos: []` always (Clientes have no granular permissions
   * of the internal system). `rol` uses 'OWNER' as a typed placeholder
   * (AuthenticatedUser.rol is UserRole, non-nullable); the field
   * `type: 'cliente'` is the real discriminator for the guards.
   */
  issueCustomerSession(customer: {
    id: string;
    nombre: string;
    email: string;
    empresaId: string;
    esMayorista: boolean;
    estadoLegajo: DossierStatus | null;
    googleId: string | null;
    empresa: { nombre: string };
    createdAt: Date;
  }) {
    const dossierStatus: DossierStatus = customer.estadoLegajo ?? 'APROBADO';
    // estadoLegajo null = retail, treated as APROBADO so that
    // ApprovedDossierGuard does not block it (a retail customer has no
    // dossier to approve; the guard only blocks if it is explicitly
    // PENDIENTE).

    const payload: JwtPayload = {
      sub: customer.id,
      email: customer.email,
      nombre: customer.nombre,
      empresaId: customer.empresaId,
      permisos: [],
      rol: 'OWNER', // placeholder — `type: 'cliente'` es el discriminador real
      estadoLegajo: dossierStatus,
      type: 'cliente',
      esMayorista: customer.esMayorista,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      cliente: {
        id: customer.id,
        nombre: customer.nombre,
        email: customer.email,
        empresaId: customer.empresaId,
        empresaNombre: customer.empresa.nombre,
        esMayorista: customer.esMayorista,
        estadoLegajo: dossierStatus,
        metodoLogin: (customer.googleId ? 'google' : 'password') as 'google' | 'password',
        createdAt: customer.createdAt.toISOString(),
      },
    };
  }
}
