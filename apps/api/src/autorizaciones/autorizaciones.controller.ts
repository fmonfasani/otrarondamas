import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LegajoAprobadoGuard } from '../legajo/guards/legajo-aprobado.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AutorizacionesService } from './autorizaciones.service';
import { SolicitarAutorizacionDto } from './dto/solicitar-autorizacion.dto';

/**
 * D-06. Sin @RequierePermiso acá: cualquier usuario autenticado puede
 * SOLICITAR una autorización (ej. el vendedor bloqueado en el cierre de
 * caja) — la restricción real está en autorizaciones.service.ts, sobre
 * las credenciales que llegan en el body (quién CONCEDE la
 * autorización), no sobre quién la pide.
 */
@ApiTags('autorizaciones')
@ApiBearerAuth()
@Controller('autorizaciones')
@UseGuards(LegajoAprobadoGuard) // RF-17: operación de negocio real, ver caja.controller.ts
export class AutorizacionesController {
  constructor(private readonly autorizacionesService: AutorizacionesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async autorizar(@Body() dto: SolicitarAutorizacionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.autorizacionesService.autorizar(user.empresaId, dto, user.id);
  }
}
