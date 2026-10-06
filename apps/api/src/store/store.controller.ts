import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Public } from '../auth/decorators/public.decorator';

/**
 * RF-06 (Online store), Phases 1-3 of the roadmap. PUBLIC surface —
 * everything here is @Public(), no exception: never add an endpoint here
 * that depends on @CurrentUser()/permissions, that goes in a different
 * controller behind the normal guard (see OrdersController, Phase 4).
 *
 * Consumed by apps/tienda-online, never by pos-admin.
 */
@ApiTags('tienda')
@Controller('tienda')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Public()
  @Get('productos')
  catalog(
    @Query('search') search?: string,
    @Query('familiaId') familyId?: string,
    @Query('subfamiliaId') subfamilyId?: string,
  ) {
    return this.storeService.catalog(search, familyId, subfamilyId);
  }

  // The catalog hierarchy (Familia/Subfamilia) is also public here — the
  // visitor needs the real names to build the filter chips, not just the
  // catalog() with its loose ids. Same shape as GET /catalogo/jerarquia
  // (CatalogHierarchyController, internal panel) but without auth, reusing
  // the same service.
  @Public()
  @Get('jerarquia')
  hierarchy() {
    return this.storeService.hierarchy();
  }

  @Public()
  @Post('pedidos')
  createOrder(@Body() dto: CreateOrderDto) {
    return this.storeService.createOrder(dto);
  }

  @Public()
  @Get('pedidos/:id')
  tracking(@Param('id') id: string) {
    return this.storeService.tracking(id);
  }
}
