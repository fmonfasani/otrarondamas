import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import { LegajoAprobadoGuard } from '../legajo/guards/legajo-aprobado.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ComprasService } from './compras.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { CreateCompraDto } from './dto/create-compra.dto';
import { RecibirCompraDto } from './dto/recibir-compra.dto';
import { CrearPagoProveedorDto } from './dto/crear-pago-proveedor.dto';
import { CrearDevolucionProveedorDto } from './dto/crear-devolucion-proveedor.dto';

/**
 * RF-12, Fase 1: proveedores, orden de compra, recepción. Sin pagos a
 * proveedor, adjuntar facturas ni devoluciones todavía (ver
 * docs/scaffolding-notas.md para el alcance acordado).
 *
 * Permiso: 'compras.gestionar', nuevo en esta fase (ver seed.ts) — no
 * se reusó 'productos.gestionar' porque gestionar el catálogo no
 * implica poder comprometer dinero con un proveedor, son
 * autorizaciones de negocio distintas.
 */
@ApiTags('compras')
@ApiBearerAuth()
@Controller()
@UseGuards(LegajoAprobadoGuard) // RF-17: operación de negocio real, ver caja.controller.ts
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Get('proveedores')
  async listarProveedores(@CurrentUser() user: AuthenticatedUser) {
    return this.comprasService.listarProveedores(user.empresaId);
  }

  @RequierePermiso('compras.gestionar')
  @Post('proveedores')
  async crearProveedor(@Body() dto: CreateProveedorDto, @CurrentUser() user: AuthenticatedUser) {
    return this.comprasService.crearProveedor(user.empresaId, dto);
  }

  @RequierePermiso('compras.gestionar')
  @Patch('proveedores/:id')
  async actualizarProveedor(
    @Param('id') id: string,
    @Body() dto: UpdateProveedorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comprasService.actualizarProveedor(user.empresaId, id, dto);
  }

  @Get('compras')
  async listarCompras(@CurrentUser() user: AuthenticatedUser) {
    return this.comprasService.listarCompras(user.empresaId);
  }

  @Get('compras/:id')
  async getCompra(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.comprasService.getCompra(user.empresaId, id);
  }

  @RequierePermiso('compras.gestionar')
  @Post('compras')
  async crearCompra(@Body() dto: CreateCompraDto, @CurrentUser() user: AuthenticatedUser) {
    return this.comprasService.crearCompra(user.empresaId, dto, user.id);
  }

  @RequierePermiso('compras.gestionar')
  @Post('compras/:id/emitir')
  @HttpCode(HttpStatus.OK)
  async emitirCompra(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.comprasService.emitirCompra(user.empresaId, id);
  }

  @RequierePermiso('compras.gestionar')
  @Post('compras/:id/recepciones')
  @HttpCode(HttpStatus.CREATED)
  async recibirCompra(
    @Param('id') id: string,
    @Body() dto: RecibirCompraDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comprasService.recibirCompra(user.empresaId, id, dto, user.id);
  }

  @Get('compras/:id/pagos')
  async listarPagos(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.comprasService.listarPagos(user.empresaId, id);
  }

  @RequierePermiso('compras.gestionar')
  @Post('compras/:id/pagos')
  @HttpCode(HttpStatus.CREATED)
  async crearPago(
    @Param('id') id: string,
    @Body() dto: CrearPagoProveedorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comprasService.crearPago(user.empresaId, id, dto, user.id);
  }

  @Get('compras/:id/devoluciones')
  async listarDevoluciones(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.comprasService.listarDevoluciones(user.empresaId, id);
  }

  @RequierePermiso('compras.gestionar')
  @Post('compras/:id/devoluciones')
  @HttpCode(HttpStatus.CREATED)
  async crearDevolucion(
    @Param('id') id: string,
    @Body() dto: CrearDevolucionProveedorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comprasService.crearDevolucion(user.empresaId, id, dto, user.id);
  }
}
