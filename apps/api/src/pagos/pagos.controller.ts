import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import { LegajoAprobadoGuard } from '../legajo/guards/legajo-aprobado.guard';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * RF-08, alcance acotado: pagos manuales sobre una venta (ver
 * pagos.service.ts). Anidado bajo /ventas/:ventaId porque en este
 * incremento un Pago siempre está asociado a una Venta — no hay
 * endpoint de pagos sobre Deuda/cuenta corriente todavía.
 */
@ApiTags('pagos')
@ApiBearerAuth()
@Controller('ventas/:ventaId/pagos')
@UseGuards(LegajoAprobadoGuard) // RF-17: operación de negocio real, ver caja.controller.ts
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  // Se reutiliza el permiso 'ventas.crear' (no se inventa 'pagos.crear'):
  // el catálogo de permisos del seed no tiene ese permiso, y crear uno
  // nuevo sin que exista una decisión de qué rol lo tiene sería una
  // regla de negocio no autorizada. Registrar el cobro de una venta se
  // trata, en este incremento, como parte de la misma operación de
  // venta.
  @RequierePermiso('ventas.crear')
  @Post()
  create(
    @Param('ventaId') ventaId: string,
    @Body() dto: CreatePagoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pagosService.create(ventaId, dto, user.empresaId, user.id);
  }

  @Get()
  findAll(@Param('ventaId') ventaId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pagosService.findByVenta(ventaId, user.empresaId);
  }
}
