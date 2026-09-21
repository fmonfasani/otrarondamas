import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { GooglePerfil } from './google.strategy';

@Injectable()
export class AuthGoogleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Resuelve el perfil de Google a un Usuario y emite la misma sesión que
   * el login por password.
   *
   * Alcance actual (decisión explícita, no definitiva — ver
   * docs/scaffolding-notas.md): el usuario auto-creado no recibe ningún
   * permiso; alguien con `usuarios.gestionar` se los asigna a mano después.
   * El modelo de roles (cliente/proveedor/repartidor/vendedor) todavía no
   * existe — cuando se defina, este alta automática debería revisarse para
   * asignar el rol correcto en vez de "usuario interno sin permisos".
   *
   * ⚠️ TODO DE SEGURIDAD (preexistente, no introducido acá, pero agravado
   * por este alta automática — detectado en auditoría previa a este push):
   * caja.controller.ts expone `estado`, `apertura`, `listarMovimientos`,
   * `arqueo` y `cierre` sin @RequierePermiso, solo exige estar logueado.
   * Un usuario recién creado por Google (permisos = []) puede abrir/cerrar
   * caja real hoy mismo. Antes, todo alta pasaba por un humano con
   * usuarios.gestionar; con Google login, cualquiera con cuenta de Google
   * llega al mismo punto sin ese filtro. Pendiente de arreglar en
   * caja.controller.ts — no se tocó en este cambio para no mezclar un
   * fix de permisos de caja con la feature de login (ver conversación).
   */
  async loginConGoogle(perfil: GooglePerfil) {
    let usuario = await this.prisma.usuario.findUnique({
      where: { googleId: perfil.googleId },
      include: { usuarioPermisos: { include: { permiso: true } } },
    });

    if (!usuario) {
      // ¿Ya existe un Usuario con este email (creado antes por alguien con
      // password)? Si es así, vinculamos la cuenta de Google a ese usuario
      // en vez de crear un duplicado — mismo email, misma persona.
      const existente = await this.prisma.usuario.findUnique({
        where: { email: perfil.email },
        include: { usuarioPermisos: { include: { permiso: true } } },
      });

      if (existente) {
        usuario = await this.prisma.usuario.update({
          where: { id: existente.id },
          data: { googleId: perfil.googleId, fotoUrl: perfil.fotoUrl },
          include: { usuarioPermisos: { include: { permiso: true } } },
        });
      } else {
        const empresaId = process.env.GOOGLE_SIGNUP_EMPRESA_ID;
        if (!empresaId) {
          // No inventamos a qué empresa asignar un usuario nuevo — sin
          // esta variable, el alta automática está deshabilitada de hecho
          // (falla en vez de asignar una empresa adivinada).
          throw new InternalServerErrorException(
            'GOOGLE_SIGNUP_EMPRESA_ID no configurado: no se puede crear el usuario automáticamente',
          );
        }

        usuario = await this.prisma.usuario.create({
          data: {
            empresaId,
            nombre: perfil.nombre,
            email: perfil.email,
            googleId: perfil.googleId,
            fotoUrl: perfil.fotoUrl,
            passwordHash: null,
            activo: true,
          },
          include: { usuarioPermisos: { include: { permiso: true } } },
        });
      }
    }

    if (!usuario.activo) {
      throw new InternalServerErrorException('Usuario deshabilitado');
    }

    const permisos = usuario.usuarioPermisos.map((up) => up.permiso.nombre);
    return this.authService.emitirSesion(usuario, permisos);
  }
}
