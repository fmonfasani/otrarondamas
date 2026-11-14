import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Mi perfil — each person's own name and password. Always the session's Usuario: there is
 * no id in the request.
 */
@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(usuarioId: string, nombre: string) {
    const name = nombre.trim();
    if (name.length < 2)
      throw new BadRequestException('El nombre tiene que tener al menos 2 letras.');
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { empresaId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    await this.prisma.$transaction([
      this.prisma.usuario.update({ where: { id: usuarioId }, data: { nombre: name } }),
      // The canonical User (team lists, messaging) carries the same name.
      this.prisma.user.updateMany({ where: { usuarioId }, data: { nombre: name } }),
      this.prisma.auditLog.create({
        data: {
          empresaId: usuario.empresaId,
          usuarioId,
          accion: 'UPDATE',
          entidadAfectada: 'Usuario.perfil',
          entidadId: usuarioId,
          valoresPosteriores: { nombre: name },
        },
      }),
    ]);
    return { nombre: name };
  }

  /**
   * Change the password knowing the current one. Pending reset links stop working, so an
   * old "forgot password" email cannot undo the change.
   */
  async changePassword(usuarioId: string, current: string, next: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { passwordHash: true, empresaId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (!usuario.passwordHash) {
      throw new BadRequestException('Tu cuenta entra con Google: no tiene contraseña de Wapsell.');
    }
    if (!(await bcrypt.compare(current, usuario.passwordHash))) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }
    if (next.length < 8)
      throw new BadRequestException('La contraseña nueva tiene que tener al menos 8 caracteres.');
    if (next === current)
      throw new BadRequestException('La contraseña nueva tiene que ser distinta de la actual.');
    const passwordHash = await bcrypt.hash(next, 10);
    await this.prisma.$transaction([
      this.prisma.usuario.update({ where: { id: usuarioId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.updateMany({
        where: { usuarioId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          empresaId: usuario.empresaId,
          usuarioId,
          accion: 'UPDATE',
          entidadAfectada: 'Usuario.password',
          entidadId: usuarioId,
        },
      }),
    ]);
    return { ok: true };
  }
}
