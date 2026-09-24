import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LegajoAprobadoGuard } from '../legajo/guards/legajo-aprobado.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { CotizarVentaDto } from './dto/cotizar-venta.dto';
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
@UseGuards(LegajoAprobadoGuard) // RF-17: operación de negocio real, ver caja.controller.ts
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  // Inc-1: búsqueda de productos para la pantalla de Nueva venta (RF-VTA-02).
  // Ruta antes que ':id' para que Express no interprete "productos" como un ID.
  @Get('productos')
  buscarProductos(@Query('search') search: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ventasService.buscarProductos(user.empresaId, search ?? '');
  }

  // Inc-2 (RF-VTA-09, RF-VTA-10): cotización previa sin crear la venta.
  // El frontend la llama 300 ms después del último cambio en el carrito
  // para mostrar el total exacto calculado con Prisma.Decimal en el servidor.
  @RequierePermiso('ventas.crear')
  @Post('cotizacion')
  @HttpCode(HttpStatus.OK)
  cotizar(@Body() dto: CotizarVentaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ventasService.cotizar(dto, user.empresaId);
  }

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
