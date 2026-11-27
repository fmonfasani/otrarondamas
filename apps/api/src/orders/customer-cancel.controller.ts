import {
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Optional,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowCustomer } from '../auth/decorators/allow-customer.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CanonicalPermission,
  CUSTOMER_POLICY,
} from '../authorization/canonical-permission.decorator';
import { BusinessContextService } from '../business-context/business-context.service';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { OrderNoticeService } from '../customer-notices/order-notice.service';
import { OrderRefundsService } from '../payments/mercadopago/order-refunds.service';
import { OrdersService } from './orders.service';

export const CUSTOMER_CANCELLATION = 'Lo cancelaste antes de que el negocio lo aceptara';

/**
 * OR-B4-054 decision 7 + OR-B4-055 — the customer may cancel their paid order until the store
 * accepts it; the money goes back by itself (a refund kept in the database). Once accepted, it
 * is the store's: the customer writes to it in the chat.
 */
@ApiTags('store')
@Controller(':businessSlug/tienda')
export class CustomerCancelController {
  constructor(
    private readonly orders: OrdersService,
    private readonly refunds: OrderRefundsService,
    private readonly businessContext: BusinessContextService,
    private readonly prismaFactory: CompanyScopedPrismaService,
    @Optional() private readonly notices?: OrderNoticeService,
  ) {}

  /** POST /:slug/tienda/mis-pedidos/:id/cancelar — the customer's own order, before it is accepted. */
  @AllowCustomer()
  @CanonicalPermission(CUSTOMER_POLICY)
  @Post('mis-pedidos/:id/cancelar')
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
    @Param('id', new ParseUUIDPipe()) orderId: string,
  ) {
    const { businessId } = await this.businessContext.resolveForAnonymous(businessSlug);
    const context = await this.businessContext.resolveForCustomer(user);
    if (context.businessId !== businessId)
      throw new ForbiddenException('Tu cuenta es de otra tienda');
    const order = await this.prismaFactory.forCompany(businessId).pedido.findFirst({
      where: { id: orderId, clienteId: context.customerId as string },
      select: { estado: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.estado !== 'RECIBIDO') {
      throw new ConflictException(
        order.estado === 'CANCELADO'
          ? 'El pedido ya está cancelado.'
          : 'El negocio ya aceptó tu pedido: escribile por el chat si necesitás cambiarlo.',
      );
    }
    const cancelled = await this.orders.cancelOrder(
      orderId,
      businessId,
      null,
      CUSTOMER_CANCELLATION,
    );
    await this.refunds.enqueueForOrder(businessId, orderId, CUSTOMER_CANCELLATION);
    await this.notices?.cancelled(businessId, cancelled, CUSTOMER_CANCELLATION);
    return { id: cancelled.id, estado: cancelled.estado };
  }
}
