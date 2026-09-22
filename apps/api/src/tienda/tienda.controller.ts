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
  catalogo(@Query('search') search?: string) {
    return this.tiendaService.catalogo(search);
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
