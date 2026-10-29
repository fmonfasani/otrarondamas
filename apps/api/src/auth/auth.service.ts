import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, UserRole, DossierStatus, EmpresaInJwt } from './auth.types';

interface UserForSession {
  id: string;
  nombre: string;
  email: string;
  empresaId: string;
  fotoUrl: string | null;
  googleId: string | null;
  createdAt: Date;
  Empresa: { nombre: string };
  rol: UserRole;
  estadoLegajo: DossierStatus;
  UserEmpresa?: Array<{ empresaId: string; role: string; Empresa: { nombre: string } }>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user (staff/admin).
   * Creates: User record, Empresa (company), and assigns OWNER role.
   * Uses bcryptjs for password hashing.
   */
  async register(email: string, password: string, nombre: string, companyName: string) {
    // Validate email is not already in use
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Validate password strength
    this.validatePasswordStrength(password);

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the Empresa (company) first
    const empresa = await this.prisma.empresa.create({
      data: {
        nombre: companyName,
        slug: this.generateSlug(companyName),
        configuracion: { theme: 'default', language: 'es' },
      },
    });

    // Create the Usuario with the new empresa
    const user = await this.prisma.usuario.create({
      data: {
        email,
        nombre,
        passwordHash,
        empresaId: empresa.id,
        rol: 'OWNER' as UserRole,
        activo: true,
        estadoLegajo: 'APROBADO' as DossierStatus,
      },
      include: {
        UsuarioPermiso: { include: { Permiso: true } },
        Empresa: true,
        UserEmpresa: { include: { Empresa: true } },
      },
    });

    // Create UserEmpresa link for multi-tenant support
    await this.prisma.userEmpresa.create({
      data: {
        usuarioId: user.id,
        empresaId: empresa.id,
        role: 'owner',
      },
    });

    // Issue session (JWT + user object)
    return this.issueSession(
      user,
      user.UsuarioPermiso.map((up) => up.Permiso.nombre),
    );
  }

  /**
   * Logout: adds the current token to a blacklist.
   * The token remains valid from JWT perspective but can be marked as revoked.
   * For now, this is a placeholder that returns success.
   * In production, implement Redis-based or DB-based token blacklist.
   */
  async logout(token: string): Promise<{ message: string }> {
    // Extract the JWT payload to get expiration
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (!decoded || !decoded.exp) {
        throw new UnauthorizedException('Invalid token');
      }

      // TODO: Implement token blacklist (Redis or DB)
      // For now, simply return success
      // In production: store token in Redis with TTL = exp - now()
      // or store in DB table token_blacklist(token, expires_at)

      return { message: 'Logged out successfully' };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async login(email: string, password: string) {
    const user = await this.verifyCredentials(email, password);
    return this.issueSession(
      user,
      user.UsuarioPermiso.map((up) => up.Permiso.nombre),
    );
  }

  /**
   * Switch to a different empresa for the authenticated user.
   * Validates that the user has access to the requested empresa
   * before issuing a new JWT.
   */
  async switchEmpresa(usuarioId: string, newEmpresaId: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        UsuarioPermiso: { include: { Permiso: true } },
        Empresa: true,
        UserEmpresa: { include: { Empresa: true } },
      },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    // Validate that the user has access to the requested empresa
    const userEmpresa = user.UserEmpresa?.find((ue) => ue.empresaId === newEmpresaId);
    if (!userEmpresa) {
      throw new UnauthorizedException('No tienes acceso a esta empresa');
    }

    // Update user's empresaId to the new one
    const updatedUser = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { empresaId: newEmpresaId },
      include: {
        UsuarioPermiso: { include: { Permiso: true } },
        Empresa: true,
        UserEmpresa: { include: { Empresa: true } },
      },
    });

    return this.issueSession(
      updatedUser,
      updatedUser.UsuarioPermiso.map((up) => up.Permiso.nombre),
    );
  }

  /**
   * Validates email+password without issuing a JWT — reused by login()
   * and by AuthorizationsService.authorize() (D-06): confirming the
   * identity of whoever authorizes a restricted operation is the same
   * problem as logging in, so the bcrypt logic / uniform messages are
   * not duplicated in a second place.
   */
  async verifyCredentials(email: string, password: string) {
    // Identical message for non-existent email and wrong password: do not
    // reveal which of the two was the reason for the rejection.
    const user = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        UsuarioPermiso: { include: { Permiso: true } },
        Empresa: true,
        UserEmpresa: { include: { Empresa: true } },
      },
    });

    // passwordHash is null for users who only registered through Google
    // (see auth.google.service.ts) — they have no local password, so the
    // password login is rejected just like invalid credentials (same
    // message, the reason is not revealed).
    if (!user || !user.activo || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }

  /**
   * Builds the JWT + the response `usuario` object, shared by the
   * password login and the Google callback (auth.google.service.ts) —
   * same session shape no matter how the user authenticated. The JWT
   * itself only carries the authorization fields (see JwtPayload); the
   * response `usuario` object also carries the profile ones, same shape
   * as GET /auth/me returns, so that the frontend does not need a second
   * call after logging in to have the full profile.
   */
  async issueSession(user: UserForSession, permissions: string[]) {
    // Build empresas[] from UserEmpresa relationship
    const empresas: EmpresaInJwt[] = (user.UserEmpresa || []).map((ue) => ({
      id: ue.empresaId,
      nombre: ue.Empresa.nombre,
      role: ue.role,
    }));

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      empresaId: user.empresaId,
      permisos: permissions,
      rol: user.rol,
      estadoLegajo: user.estadoLegajo,
      type: 'usuario',
      empresas,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      empresaId: user.empresaId,
      empresa: {
        id: user.empresaId,
        nombre: user.Empresa.nombre,
        role: empresas.find((e) => e.id === user.empresaId)?.role || 'owner',
      },
      empresas,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        empresaId: user.empresaId,
        empresaNombre: user.Empresa.nombre,
        permisos: permissions,
        fotoUrl: user.fotoUrl,
        metodoLogin: (user.googleId ? 'google' : 'password') as 'google' | 'password',
        createdAt: user.createdAt.toISOString(),
        rol: user.rol,
        estadoLegajo: user.estadoLegajo,
      },
    };
  }

  /**
   * Validate password strength:
   * - At least 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one uppercase letter',
      );
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one lowercase letter',
      );
    }
    if (!/\d/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one number',
      );
    }
  }

  /**
   * Generate a URL-safe slug from a company name.
   * Simple implementation: lowercase, replace spaces/special chars with hyphens.
   */
  private generateSlug(name: string): string {
    const timestamp = Date.now();
    return `${name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20)}-${timestamp}`;
  }
}
