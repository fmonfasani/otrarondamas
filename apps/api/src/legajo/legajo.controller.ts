import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { LegajoService } from './legajo.service';
import { ActualizarLegajoDto } from './dto/actualizar-legajo.dto';
import { SubirDocumentoDto } from './dto/subir-documento.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * RF-17 (docs/spec-login-roles.md): legajo propio (self-service, sin
 * @RequierePermiso — cualquier Usuario autenticado, sea cual sea su
 * estado de legajo, puede ver/completar el suyo) + endpoints de
 * aprobación para el dueño (protegidos con usuarios.gestionar, mismo
 * permiso que ya gobierna el alta/gestión de cuentas del panel).
 *
 * A propósito SIN LegajoAprobadoGuard en ningún endpoint de acá — una
 * cuenta Pendiente tiene que poder completar su legajo, es justo el
 * caso que este controller existe para resolver.
 */
@ApiTags('legajo')
@ApiBearerAuth()
@Controller('legajo')
export class LegajoController {
  constructor(
    private readonly legajoService: LegajoService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('mi-legajo')
  miLegajo(@CurrentUser() user: AuthenticatedUser) {
    return this.legajoService.obtenerOCrearDeUsuario(user.id);
  }

  @Patch('mi-legajo')
  actualizarMiLegajo(@Body() dto: ActualizarLegajoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.legajoService.actualizarDeUsuario(user.id, dto);
  }

  // multipart/form-data: el archivo llega en el campo "archivo", el
  // resto del DTO (tipo, vencimiento) como campos de texto del mismo
  // form. FileInterceptor en memoria (sin `dest`) — LegajoService es
  // quien decide dónde y cómo persistir el archivo en disco, nunca
  // Multer directo (necesitamos el nombre generado + la ruta fuera del
  // webroot, ver storageDir()).
  @Post('mi-legajo/documentos')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 10 * 1024 * 1024 } })) // 10MB
  async subirDocumento(
    @Body() dto: SubirDocumentoDto,
    @UploadedFile() archivo: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const legajo = await this.legajoService.obtenerOCrearDeUsuario(user.id);
    return this.legajoService.subirDocumento(legajo.id, dto, archivo);
  }

  @Get('mi-legajo/estado')
  async miEstado(@CurrentUser() user: AuthenticatedUser) {
    const verificacion = await this.legajoService.verificarCompletoDeRol(user.id, user.rol);
    return { estadoLegajo: user.estadoLegajo, ...verificacion };
  }

  /**
   * Bandeja de legajos pendientes — el dueño revisa antes de aprobar.
   * No lista OWNER (nunca tiene legajo pendiente que revisar) ni
   * cuentas ya APROBADAS.
   */
  @RequierePermiso('usuarios.gestionar')
  @Get('pendientes')
  async pendientes(@CurrentUser() user: AuthenticatedUser) {
    const usuarios = await this.prisma.usuario.findMany({
      where: { empresaId: user.empresaId, estadoLegajo: 'PENDIENTE' },
      include: { legajo: { include: { documentos: true } } },
    });
    return usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      legajo: u.legajo,
    }));
  }

  /**
   * Aprobación manual del dueño — la única forma de que una cuenta
   * pase de Pendiente a Aprobada (RF-17: "el sistema NO aprueba nada
   * automáticamente"). Verifica que el legajo esté completo antes de
   * dejar aprobar, para no aprobar a ciegas una cuenta con datos a
   * medio cargar.
   */
  @RequierePermiso('usuarios.gestionar')
  @Patch(':usuarioId/aprobar')
  async aprobar(@Param('usuarioId') usuarioId: string, @CurrentUser() user: AuthenticatedUser) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId: user.empresaId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { completo, faltantes } = await this.legajoService.verificarCompletoDeRol(
      usuarioId,
      usuario.rol,
    );
    if (!completo) {
      return { aprobado: false, faltantes };
    }

    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { estadoLegajo: 'APROBADO' },
    });
    return { aprobado: true, faltantes: [] };
  }

  /**
   * Sirve el archivo de un documento sensible SOLO autenticado y con
   * usuarios.gestionar — nunca una URL pública. Verifica que el
   * documento pertenezca a un Usuario de la MISMA empresa antes de
   * entregarlo (el aislamiento multiempresa de Legajo/DocumentoLegajo
   * se hereda vía Usuario, no tienen empresaId directo, ver
   * empresa-scope.extension.ts).
   */
  @RequierePermiso('usuarios.gestionar')
  @Get('documentos/:documentoId/descargar')
  async descargarDocumento(
    @Param('documentoId') documentoId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const documento = await this.prisma.documentoLegajo.findUnique({
      where: { id: documentoId },
      include: { legajo: { include: { usuario: true } } },
    });
    if (!documento || documento.legajo.usuario?.empresaId !== user.empresaId) {
      throw new NotFoundException('Documento no encontrado');
    }

    const { ruta, nombre } = await this.legajoService.rutaAbsolutaDeDocumento(documentoId);
    res.download(ruta, nombre);
  }
}
