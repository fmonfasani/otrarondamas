import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FidelizacionService } from './fidelizacion.service';
import { CreateReglaFidelizacionDto } from './dto/create-regla-fidelizacion.dto';
import { UpdateReglaFidelizacionDto } from './dto/update-regla-fidelizacion.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * Fase 4 del roadmap de Fidelización — CRUD de ReglaFidelizacion.
 *
 * A diferencia de Compras/Catálogo (GET abierto a cualquier vendedor
 * logueado), acá TODO requiere fidelizacion.gestionar, incluidos los
 * GET — mismo criterio que pedidos.controller.ts: ver qué reglas de
 * descuento existen es información de política de precios del
 * negocio, no equivalente a ver el catálogo de productos.
 */
@ApiTags('fidelizacion')
@ApiBearerAuth()
@Controller('reglas-fidelizacion')
export class FidelizacionController {
  constructor(private readonly fidelizacionService: FidelizacionService) {}

  @RequierePermiso('fidelizacion.gestionar')
  @Get()
  listar(@CurrentUser() user: AuthenticatedUser) {
    return this.fidelizacionService.listar(user.empresaId);
  }

  @RequierePermiso('fidelizacion.gestionar')
  @Get(':id')
  obtener(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fidelizacionService.obtener(user.empresaId, id);
  }

  @RequierePermiso('fidelizacion.gestionar')
  @Post()
  crear(@Body() dto: CreateReglaFidelizacionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.fidelizacionService.crear(user.empresaId, dto);
  }

  @RequierePermiso('fidelizacion.gestionar')
  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateReglaFidelizacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fidelizacionService.actualizar(user.empresaId, id, dto);
  }
}
