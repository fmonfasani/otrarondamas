import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './auth.types';

interface UsuarioParaSesion {
  id: string;
  nombre: string;
  email: string;
  empresaId: string;
  fotoUrl: string | null;
  googleId: string | null;
  createdAt: Date;
  empresa: { nombre: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    // Mensaje idéntico para email inexistente y password incorrecta:
    // no revelar cuál de los dos fue el motivo del rechazo.
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: { usuarioPermisos: { include: { permiso: true } }, empresa: true },
    });

    // passwordHash es null para usuarios que solo se registraron por
    // Google (ver auth.google.service.ts) — no tienen contraseña local,
    // así que el login por password se rechaza igual que credenciales
    // inválidas (mismo mensaje, no se revela el motivo).
    if (!usuario || !usuario.activo || !usuario.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.emitirSesion(
      usuario,
      usuario.usuarioPermisos.map((up) => up.permiso.nombre),
    );
  }

  /**
   * Arma el JWT + el objeto `usuario` de respuesta, compartido por el
   * login con password y el callback de Google (auth.google.service.ts)
   * — misma forma de sesión sin importar cómo se autenticó. El JWT en sí
   * solo lleva los campos de autorización (ver JwtPayload); el objeto
   * `usuario` de la respuesta lleva también los de perfil, mismo shape
   * que devuelve GET /auth/me, para que el frontend no necesite una
   * segunda llamada después de loguearse para tener el perfil completo.
   */
  async emitirSesion(usuario: UsuarioParaSesion, permisos: string[]) {
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      empresaId: usuario.empresaId,
      permisos,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        empresaId: usuario.empresaId,
        empresaNombre: usuario.empresa.nombre,
        permisos,
        fotoUrl: usuario.fotoUrl,
        metodoLogin: (usuario.googleId ? 'google' : 'password') as 'google' | 'password',
        createdAt: usuario.createdAt.toISOString(),
      },
    };
  }
}
