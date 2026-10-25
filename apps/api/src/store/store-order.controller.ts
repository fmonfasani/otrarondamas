import { Body, Controller, Get, Headers, Param, Post, HttpCode } from '@nestjs/common';
import { StoreService } from './store.service';
import { Public } from '../auth/decorators/public.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { PedidoResponseDto } from './dto/order.response.dto';

/**
 * C5A/C5B Phase 3: POST /store/order — Order creation with stock deduction and idempotency.
 *
 * Accepts CreateOrderDto (email, nombre, telefono, items) and X-Idempotency-Key header.
 * Creates Pedido atomically with stock deduction.
 * Supports both anonymous checkout and authenticated flows.
 */
@Controller('store')
export class StoreOrderController {
  constructor(private readonly storeService: StoreService) {}

  /**
   * POST /store/order — Create order with automatic customer resolution and stock deduction.
   *
   * Body: { email, nombre, telefono, items: [{productoId, cantidad}] }
   * Header: X-Idempotency-Key (optional, for idempotency)
   *
   * Response (201): Pedido with estado='RECIBIDO', stock deducted atomically
   * Response (400): Validation or stock error (no changes)
   * Response (409): Conflict on duplicate idempotency key with different payload
   *
   * Stock deduction happens within the transaction that creates the order.
   * Idempotency: if X-Idempotency-Key is provided and a pedido already exists with that key,
   * returns the existing pedido without creating a new one or deducting stock again.
   */
  @Public()
  @Post('order')
  @HttpCode(201)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    const businessId = process.env.TIENDA_EMPRESA_ID || '';
    const pedido = await this.storeService.createOrder(
      dto,
      businessId,
      'web',
      idempotencyKey,
      true,
    );
    return new PedidoResponseDto(pedido);
  }

  /**
   * GET /store/tracking/:id — Track order status without authentication.
   *
   * Response (200): Order details with status, total, items
   * Response (404): Order not found or belongs to different business
   */
  @Public()
  @Get('tracking/:id')
  async tracking(@Param('id') orderId: string) {
    const businessId = process.env.TIENDA_EMPRESA_ID || '';
    return this.storeService.tracking(orderId, businessId);
  }
}
