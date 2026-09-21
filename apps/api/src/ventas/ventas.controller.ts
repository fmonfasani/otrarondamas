import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * RF-05: ventas presenciales. Sin DELETE — INV-02 prohíbe eliminar
 * físicamente una venta confirmada; anulaciones/devoluciones son
 * operaciones vinculadas aparte (RF-05, RF-12), no implementadas todavía.
 */
@ApiTags('ventas')
@ApiBearerAuth()
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @RequierePermiso('ventas.crear')
  @Post()
  create(@Body() dto: CreateVentaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ventasService.create(dto, user.empresaId, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.ventasService.findAll(user.empresaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ventasService.findOne(id, user.empresaId);
  }
}
