import { Injectable, UnauthorizedException } from '@nestjs/common';
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
}
