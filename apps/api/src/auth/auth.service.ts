import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './auth.types';

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
      include: { usuarioPermisos: { include: { permiso: true } } },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const permisos = usuario.usuarioPermisos.map((up) => up.permiso.nombre);

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
        permisos,
      },
    };
  }
}
