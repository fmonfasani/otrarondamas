import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TiendaService } from './tienda.service';
import { CrearPedidoDto } from './dto/crear-pedido.dto';
import { Public } from '../auth/decorators/public.decorator';

/**
 * RF-06 (Tienda online), Fases 1-3 del roadmap. Superficie PÚBLICA —
 * todo acá es @Public(), sin excepción: nunca agregar un endpoint acá
 * que dependa de @CurrentUser()/permisos, eso va en un controller
 * distinto detrás del guard normal (ver PedidosController, Fase 4).
 *
 * Consumido por apps/tienda-online, nunca por pos-admin.
 */
@ApiTags('tienda')
@Controller('tienda')
export class TiendaController {
  constructor(private readonly tiendaService: TiendaService) {}

  @Public()
  @Get('productos')
  catalogo(
    @Query('search') search?: string,
    @Query('familiaId') familiaId?: string,
    @Query('subfamiliaId') subfamiliaId?: string,
  ) {
    return this.tiendaService.catalogo(search, familiaId, subfamiliaId);
  }

  // La jerarquía de catálogo (Familia/Subfamilia) es pública también acá
  // — el visitante necesita los nombres reales para armar los chips de
  // filtro, no solo el catalogo() con sus ids sueltos. Mismo shape que
  // GET /catalogo/jerarquia (JerarquiaCatalogoController, panel interno)
  // pero sin auth, reusando el mismo servicio.
  @Public()
  @Get('jerarquia')
  jerarquia() {
    return this.tiendaService.jerarquia();
  }

  @Public()
  @Post('pedidos')
  crearPedido(@Body() dto: CrearPedidoDto) {
    return this.tiendaService.crearPedido(dto);
  }

  @Public()
  @Get('pedidos/:id')
  seguimiento(@Param('id') id: string) {
    return this.tiendaService.seguimiento(id);
  }
}
