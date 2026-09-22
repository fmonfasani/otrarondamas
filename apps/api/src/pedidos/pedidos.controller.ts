import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PedidosService } from './pedidos.service';
import { ActualizarEstadoPedidoDto } from './dto/actualizar-estado-pedido.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * Superficie PRIVADA (pos-admin) — contrapartida de tienda.controller.ts.
 *
 * A diferencia de Compras/Caja (donde el GET queda abierto a cualquier
 * usuario logueado y solo las mutaciones piden permiso), acá TODO —
 * incluidos los GET — requiere pedidos.gestionar: un Pedido expone
 * datos personales del cliente (nombre, email, teléfono) que no están
 * en un listado de compras o el estado de caja, así que ver la bandeja
 * en sí ya es la operación sensible, no solo confirmar/cancelar.
 */
@ApiTags('pedidos')
@ApiBearerAuth()
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @RequierePermiso('pedidos.gestionar')
  @Get()
  listar(@CurrentUser() user: AuthenticatedUser, @Query('estado') estado?: string) {
    return this.pedidosService.listar(user.empresaId, estado);
  }

  @RequierePermiso('pedidos.gestionar')
  @Get(':id')
  obtener(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pedidosService.obtener(id, user.empresaId);
  }

  @RequierePermiso('pedidos.gestionar')
  @Patch(':id/estado')
  actualizarEstado(
    @Param('id') id: string,
    @Body() dto: ActualizarEstadoPedidoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pedidosService.actualizarEstado(id, user.empresaId, dto, user.id);
  }
}
