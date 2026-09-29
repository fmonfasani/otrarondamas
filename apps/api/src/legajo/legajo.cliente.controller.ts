import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LegajoService } from './legajo.service';
import { ActualizarLegajoDto } from './dto/actualizar-legajo.dto';
import { SubirDocumentoDto } from './dto/subir-documento.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * RF-17 (docs/spec-login-roles.md): legajo self-service para el Cliente
 * mayorista. Ruta separada de /legajo (que es para Usuario) para no
 * mezclar los dos flujos — el auth es el mismo JWT, pero `user.type`
 * discrimina si el sub es un Usuario.id o un Cliente.id.
 *
 * Los endpoints de self-service (mi-legajo) se llaman con token de
 * Cliente. Los endpoints de gestión del dueño (pendientes, aprobar) se
 * llaman con token de Usuario (el dueño).
 *
 * Sin LegajoAprobadoGuard acá (igual que /legajo) — el mayorista tiene
 * que poder completar su legajo antes de ser aprobado.
 */
@ApiTags('legajo-cliente')
@ApiBearerAuth()
@Controller('legajo/cliente')
export class LegajoClienteController {
  constructor(
    private readonly legajoService: LegajoService,
    private readonly prisma: PrismaService,
  ) {}

  private exigirMayorista(user: AuthenticatedUser) {
    if (user.type !== 'cliente') {
      throw new ForbiddenException('Endpoint solo para clientes');
    }
    if (!user.esMayorista) {
      throw new ForbiddenException(
        'Solo los clientes mayoristas tienen legajo — contactá al dueño si creés que esto es un error.',
      );
    }
  }

  @Get('mi-legajo')
  miLegajo(@CurrentUser() user: AuthenticatedUser) {
    this.exigirMayorista(user);
    return this.legajoService.obtenerOCrearDeCliente(user.id);
  }

  @Patch('mi-legajo')
  actualizarMiLegajo(@Body() dto: ActualizarLegajoDto, @CurrentUser() user: AuthenticatedUser) {
    this.exigirMayorista(user);
    return this.legajoService.actualizarDeCliente(user.id, dto);
  }

  // Cliente mayorista no sube documentos sensibles (solo rellena campos
  // fiscales — ver spec-login-roles.md tabla de legajo por rol). Este
  // endpoint queda preparado para extensión futura sin impacto en el
  // flujo de verificarCompletoDeCliente() (que no requiere documentos).
  @Post('mi-legajo/documentos')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async subirDocumento(
    @Body() dto: SubirDocumentoDto,
    @UploadedFile() archivo: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.exigirMayorista(user);
    const legajo = await this.legajoService.obtenerOCrearDeCliente(user.id);
    return this.legajoService.subirDocumento(legajo.id, dto, archivo);
  }

  @Get('mi-legajo/estado')
  async miEstado(@CurrentUser() user: AuthenticatedUser) {
    this.exigirMayorista(user);
    const verificacion = await this.legajoService.verificarCompletoDeCliente(user.id);
    return { estadoLegajo: user.estadoLegajo, ...verificacion };
  }

  /**
   * Bandeja de clientes mayoristas con legajo pendiente — para el dueño.
   * Lo llama un USUARIO (token type='usuario'), no un cliente.
   */
  @Get('pendientes')
  async pendientes(@CurrentUser() user: AuthenticatedUser) {
    if (user.type !== 'usuario') {
      throw new ForbiddenException('Solo el dueño puede ver los legajos pendientes');
    }
    const clientes = await this.prisma.cliente.findMany({
      where: { empresaId: user.empresaId, esMayorista: true, estadoLegajo: 'PENDIENTE' },
      include: { legajo: true },
    });
    return clientes.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      email: c.email,
      legajo: c.legajo,
    }));
  }

  /**
   * Aprobación del legajo del mayorista por el dueño.
   * El dueño llama este endpoint con su propio token (type='usuario').
   * Verifica que el legajo esté completo (cuit, razonSocial, condicionIva)
   * antes de aprobar.
   */
  @Patch(':clienteId/aprobar')
  async aprobar(@Param('clienteId') clienteId: string, @CurrentUser() user: AuthenticatedUser) {
    if (user.type !== 'usuario') {
      throw new ForbiddenException('Solo el dueño puede aprobar legajos');
    }

    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, empresaId: user.empresaId, esMayorista: true },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente mayorista no encontrado');
    }

    const { completo, faltantes } = await this.legajoService.verificarCompletoDeCliente(clienteId);
    if (!completo) {
      return { aprobado: false, faltantes };
    }

    await this.prisma.cliente.update({
      where: { id: clienteId },
      data: { estadoLegajo: 'APROBADO' },
    });
    return { aprobado: true, faltantes: [] };
  }
}
