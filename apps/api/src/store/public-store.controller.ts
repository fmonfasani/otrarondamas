import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BusinessContextService } from '../business-context/business-context.service';
import { Public } from '../auth/decorators/public.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { StoreService } from './store.service';

/**
 * STORE-V1-02 — slug-scoped public Store surface.
 * The Business is resolved through the canonical BusinessContext. The
 * controller never accepts a raw tenant id and never creates StoreTenantContext.
 * Legacy /tienda/* routes remain available during TRANSITION.
 */
@ApiTags('tienda')
@Controller(':businessSlug/tienda')
export class PublicStoreController {
  constructor(
    private readonly businessContext: BusinessContextService,
    private readonly storeService: StoreService,
  ) {}

  private async companyId(businessSlug: string): Promise<string> {
    return (await this.businessContext.resolveForAnonymous(businessSlug)).businessId;
  }

  @Public()
  @Get('productos')
  async catalog(
    @Param('businessSlug') businessSlug: string,
    @Query('search') search?: string,
    @Query('familiaId') familyId?: string,
    @Query('subfamiliaId') subfamilyId?: string,
  ) {
    return this.storeService.catalog(search, familyId, subfamilyId, await this.companyId(businessSlug));
  }

  @Public()
  @Get('jerarquia')
  async hierarchy(@Param('businessSlug') businessSlug: string) {
    return this.storeService.hierarchy(await this.companyId(businessSlug));
  }

  @Public()
  @Post('pedidos')
  async createOrder(@Param('businessSlug') businessSlug: string, @Body() dto: CreateOrderDto) {
    return this.storeService.createOrder(dto, await this.companyId(businessSlug));
  }

  @Public()
  @Get('pedidos/:id')
  async tracking(
    @Param('businessSlug') businessSlug: string,
    @Param('id') id: string,
  ) {
    return this.storeService.tracking(id, await this.companyId(businessSlug));
  }
}
