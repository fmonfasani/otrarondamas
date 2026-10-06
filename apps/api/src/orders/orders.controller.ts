import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { BusinessContextService } from '../business-context/business-context.service';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * PRIVATE surface (pos-admin) — counterpart of store.controller.ts.
 *
 * Unlike Purchases/Cash register (where GET stays open to any logged-in
 * user and only mutations require a permission), here EVERYTHING —
 * including GETs — requires pedidos.gestionar: a Pedido exposes the
 * customer's personal data (name, email, phone) that are not in a
 * purchases listing or the cash register status, so viewing the inbox
 * itself is already the sensitive operation, not just confirming/cancelling.
 */
@ApiTags('pedidos')
@ApiBearerAuth()
@Controller('pedidos')
@UseGuards(ApprovedDossierGuard) // RF-17: real business operation, see cash-register.controller.ts
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private async resolveCompanyIdFromContext(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  @RequirePermission('pedidos.gestionar')
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query('estado') status?: string) {
    return this.ordersService.list(await this.resolveCompanyIdFromContext(user), status);
  }

  @RequirePermission('pedidos.gestionar')
  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.get(id, await this.resolveCompanyIdFromContext(user));
  }

  @RequirePermission('pedidos.gestionar')
  @Patch(':id/estado')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateStatus(
      id,
      await this.resolveCompanyIdFromContext(user),
      dto,
      user.id,
    );
  }
}
