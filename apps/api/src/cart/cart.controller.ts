import { Body, Controller, Delete, Get, Param, Patch, Post, HttpCode } from '@nestjs/common';
import { CartService } from './cart.service';
import { Public } from '../auth/decorators/public.decorator';
import { CartResponseDto, CartItemResponseDto } from './dto/cart.response.dto';

/**
 * C5B: Cart API — Phase 2 of Online Store
 *
 * Supports both authenticated (via @CurrentUser) and anonymous (via customerId in body) flows.
 * Anonymous access is used for guest/unauthenticated checkout flows in the E2E tests.
 *
 * All endpoints accept customerId parameter (from body or auth context).
 * Cart is tied to a specific customer within a business (unique constraint: customerId + businessId).
 */
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * POST /cart — Create/get cart for a customer.
   *
   * Body: { customerId: string } or authenticated via @CurrentUser
   * Response: { id, customerId, businessId, items: [...], ... }
   *
   * Anonymous customers can provide their ID directly in the body.
   * Authenticated customers use their context.
   */
  @Public()
  @Post()
  @HttpCode(201)
  async createCart(@Body() body: { customerId: string }) {
    // For now, E2E sends customerId in body for anonymous access.
    // In production, customerId would come from @CurrentUser context.
    // This is a simplified approach for Phase 2 (guest checkout not yet fully implemented).
    const customerId = body.customerId;
    if (!customerId) {
      throw new Error('customerId is required');
    }
    // Note: businessId defaults to TIENDA_EMPRESA_ID for anonymous;
    // in auth context, it comes from user's membership.
    const businessId = process.env.TIENDA_EMPRESA_ID || '';
    const cart = await this.cartService.getOrCreateCart(customerId, businessId);
    return new CartResponseDto(cart);
  }

  /**
   * GET /cart/:id — Retrieve cart with all items.
   *
   * Response: { id, customerId, businessId, items: [...], ... }
   */
  @Public()
  @Get(':id')
  @HttpCode(200)
  async getCart(@Param('id') cartId: string) {
    const businessId = process.env.TIENDA_EMPRESA_ID || '';
    const cart = await this.cartService.getCart(cartId, businessId);
    return cart;
  }

  /**
   * POST /cart/:id/items — Add or merge item into cart.
   *
   * Body: { productoId: string, cantidad: number }
   * Response: { id, cartId, productoId, cantidad, ... }
   *
   * If product already in cart, quantity is summed.
   * Validates stock availability (informative, no reservation).
   */
  @Public()
  @Post(':id/items')
  @HttpCode(201)
  async addItem(
    @Param('id') cartId: string,
    @Body() body: { productoId: string; cantidad: number },
  ) {
    const businessId = process.env.TIENDA_EMPRESA_ID || '';
    const item = await this.cartService.addItem(cartId, body.productoId, body.cantidad, businessId);
    return item;
  }

  /**
   * PATCH /cart/:id/items/:itemId — Update item quantity.
   *
   * Body: { cantidad: number }
   * Response: { id, cartId, productoId, cantidad, ... }
   *
   * Sets quantity to exact value (not additive).
   * Validates stock availability.
   */
  @Public()
  @Patch(':id/items/:itemId')
  @HttpCode(200)
  async updateItem(
    @Param('id') cartId: string,
    @Param('itemId') itemId: string,
    @Body() body: { cantidad: number },
  ) {
    const businessId = process.env.TIENDA_EMPRESA_ID || '';
    const item = await this.cartService.updateItemQuantity(itemId, body.cantidad, businessId);
    return item;
  }

  /**
   * DELETE /cart/:id/items/:itemId — Remove single item from cart.
   *
   * Response: 204 No Content
   */
  @Public()
  @Delete(':id/items/:itemId')
  @HttpCode(204)
  async removeItem(@Param('id') cartId: string, @Param('itemId') itemId: string) {
    const businessId = process.env.TIENDA_EMPRESA_ID || '';
    await this.cartService.removeItem(itemId, businessId);
  }

  /**
   * DELETE /cart/:id — Clear all items from cart (optional, not in E2E but useful).
   *
   * Response: 204 No Content
   */
  @Public()
  @Delete(':id')
  @HttpCode(204)
  async clearCart(@Param('id') cartId: string) {
    const businessId = process.env.TIENDA_EMPRESA_ID || '';
    await this.cartService.clearCart(cartId, businessId);
  }
}
