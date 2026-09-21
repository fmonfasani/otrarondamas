import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { InventarioService } from './inventario.service';
import { RegistrarAjusteDto } from './dto/registrar-ajuste.dto';

/**
 * Fase 1 del roadmap de inventario (RF-11 / INV-CONS-*): consulta, solo
 * lectura. Fase 2 (INV-AJ-*): ajustes manuales. Fase 3 (alta de lotes)
 * redefinida — la recepción de una compra (apps/api/src/compras) ya
 * cubre ese caso, no se agregó un endpoint aparte acá. Fase 4
 * (INV-AL-*): alertas de bajo stock y vencimiento.
 */
@ApiTags('inventario')
@ApiBearerAuth()
@Controller('inventario')
export class InventarioController {
  constructor(
    private readonly inventarioService: InventarioService,
    private readonly prismaFactory: EmpresaScopedPrismaService,
  ) {}

  // INV-CONS-01 / INV-CONS-04: stock consolidado por producto, con el
  // mismo contrato de búsqueda/paginación que GET /catalogo/productos
  // (ver catalogo.controller.ts) para no introducir un segundo criterio
  // de filtrado en el mismo frontend.
  @Get('stock')
  async stock(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('soloConStockBajo') soloConStockBajo?: string,
  ) {
    return this.inventarioService.stockConsolidado(
      user.empresaId,
      search,
      soloConStockBajo === 'true',
    );
  }

  // INV-CONS-02: detalle de lotes de un producto — de dónde sale el
  // total que muestra GET /inventario/stock.
  @Get('productos/:id/lotes')
  async lotesDeProducto(@Param('id') productoId: string, @CurrentUser() user: AuthenticatedUser) {
    const db = this.prismaFactory.forEmpresa(user.empresaId);
    const producto = await db.producto.findUnique({ where: { id: productoId } });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }
    return db.lote.findMany({
      where: { productoId },
      orderBy: { vencimiento: 'asc' },
    });
  }

  // INV-CONS-03: historial de MovimientoStock de un producto — ya se
  // generan desde VentasService.descontarStock() en cada venta, este
  // endpoint solo los expone, no crea ninguno nuevo.
  @Get('productos/:id/movimientos')
  async movimientosDeProducto(
    @Param('id') productoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const db = this.prismaFactory.forEmpresa(user.empresaId);
    const producto = await db.producto.findUnique({ where: { id: productoId } });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }
    return db.movimientoStock.findMany({
      where: { productoId },
      orderBy: { createdAt: 'desc' },
      take: 100, // evita traer un historial ilimitado en un solo request
    });
  }

  // INV-AJ-01/02/03/04: ajuste manual sobre un lote concreto. Protegido
  // con el permiso inventario.ajustes, que ya existía en el seed antes
  // de esta fase (ver docs/scaffolding-notas.md sección 16).
  @RequierePermiso('inventario.ajustes')
  @Post('ajustes')
  @HttpCode(HttpStatus.CREATED)
  async registrarAjuste(@Body() dto: RegistrarAjusteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventarioService.registrarAjuste(user.empresaId, dto, user.id);
  }

  // INV-AL-01/02/03: productos con stock bajo y lotes por vencer, en un
  // solo endpoint (ambos alimentan el mismo badge de alertas en el
  // frontend). Solo lectura, sin permiso adicional — mismo criterio que
  // GET /inventario/stock.
  @Get('alertas')
  async alertas(@CurrentUser() user: AuthenticatedUser) {
    return this.inventarioService.alertas(user.empresaId);
  }
}
