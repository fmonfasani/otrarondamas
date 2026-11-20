import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Optional,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderNoticeService } from '../customer-notices/order-notice.service';
import { MercadoPagoAccountService } from '../payments/mercadopago/mercadopago-account.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { BusinessContextService } from '../business-context/business-context.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CanonicalPermission,
  ORDER_STATUS_CHANGE,
} from '../authorization/canonical-permission.decorator';

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
    @Optional() private readonly orderNotices?: OrderNoticeService,
    @Optional() private readonly mercadoPago?: MercadoPagoAccountService,
  ) {}

  /** OR-B4-037 — the store takes online payments (same rule as the store's own header). */
  private async takesOnlinePayments(companyId: string) {
    if (!this.mercadoPago) return false;
    const mp = await this.mercadoPago.status(companyId);
    return mp.available && mp.connected && Boolean(process.env.MERCADOPAGO_NOTIFICATION_URL);
  }

  private async resolveCompanyIdFromContext(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  @RequirePermission('pedidos.gestionar')
  @CanonicalPermission('ORDERS_VIEW')
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query('estado') status?: string) {
    return this.ordersService.list(await this.resolveCompanyIdFromContext(user), status);
  }

  @RequirePermission('pedidos.gestionar')
  @CanonicalPermission('ORDERS_VIEW')
  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.get(id, await this.resolveCompanyIdFromContext(user));
  }

  @RequirePermission('pedidos.gestionar')
  @CanonicalPermission(ORDER_STATUS_CHANGE)
  @Patch(':id/estado')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.resolveCompanyIdFromContext(user);
    const order = await this.ordersService.updateStatus(id, companyId, dto, user.id);
    // OR-B4-037: tell the customer in their chat.
    if (order.estado === 'CONFIRMADO') {
      await this.orderNotices?.confirmed(
        companyId,
        order,
        await this.takesOnlinePayments(companyId),
      );
    } else if (order.estado === 'CANCELADO') {
      await this.orderNotices?.cancelled(companyId, order);
    } else {
      // #168: preparation, ready, on the way, delivered, failed delivery.
      await this.orderNotices?.status(companyId, order, order.estado);
    }
    return order;
  }

  /**
   * P2-3: Cancel an order with optional reason.
   *
   * OR-B4-049: allowed before the stock leaves (RECIBIDO, CONFIRMADO, EN_PREPARACION, LISTO) or
   * after a failed delivery; once the order is on its way or delivered, 409 Conflict.
   * It releases the reservation; anything of the order still out of the business comes back once
   * Audit: Full event logging with actor, timestamp, stock status
   * Idempotency: Cancelling twice is safe (no double-reversal)
   * Concurrency: SERIALIZABLE isolation prevents race conditions
   */
  @RequirePermission('pedidos.gestionar')
  @CanonicalPermission('ORDER_CANCEL')
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.resolveCompanyIdFromContext(user);
    const order = await this.ordersService.cancelOrder(id, companyId, user.id, dto.motivo);
    await this.orderNotices?.cancelled(companyId, order, dto.motivo);
    return order;
  }
}
