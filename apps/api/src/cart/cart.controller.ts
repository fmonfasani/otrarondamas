import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { CartService } from './cart.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AllowCustomer } from '../auth/decorators/allow-customer.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import {
  CanonicalPermission,
  CUSTOMER_POLICY,
} from '../authorization/canonical-permission.decorator';

/**
 * Cart API for the online store — OR-B4-029.
 *
 * The cart belongs to the authenticated Customer. The Customer and the Business always
 * come from the customer session (BusinessContextService.resolveForCustomer), never from
 * the request body or an environment variable, and every `/cart/:id…` call first checks
 * that the cart is that Customer's in that Business (404 otherwise, so a cart id of
 * someone else reveals nothing). A staff token is refused by resolveForCustomer.
 *
 * A visitor without a session keeps the cart in the browser; it is saved here when they
 * sign in or register. An anonymous server-side cart (OR-B3-007 / OR-B4-014) needs a
 * schema change and is not implemented.
 */
// Customer-facing surface: lets customer tokens past StaffIdentityGuard; staff tokens are
// then refused by resolveForCustomer.
@AllowCustomer()
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private async owner(user: AuthenticatedUser) {
    const context = await this.businessContext.resolveForCustomer(user);
    return { customerId: context.customerId as string, businessId: context.businessId };
  }

  /** Resolves the session owner and checks the cart is theirs before any operation. */
  private async ownedCart(user: AuthenticatedUser, cartId: string) {
    const owner = await this.owner(user);
    await this.cartService.assertOwnedCart(cartId, owner.customerId, owner.businessId);
    return owner;
  }

  /** POST /cart — the signed-in customer's cart in their Business (created if missing). */
  @CanonicalPermission(CUSTOMER_POLICY)
  @Post()
  @HttpCode(201)
  async createCart(@CurrentUser() user: AuthenticatedUser) {
    const { customerId, businessId } = await this.owner(user);
    return this.cartService.getOrCreateCart(customerId, businessId);
  }

  /** GET /cart/:id — the cart with its items. */
  @CanonicalPermission(CUSTOMER_POLICY)
  @Get(':id')
  async getCart(@CurrentUser() user: AuthenticatedUser, @Param('id') cartId: string) {
    const { businessId } = await this.ownedCart(user, cartId);
    return this.cartService.getCart(cartId, businessId);
  }

  /** POST /cart/:id/items — add a product, or add to its quantity if already there. */
  @CanonicalPermission(CUSTOMER_POLICY)
  @Post(':id/items')
  @HttpCode(201)
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') cartId: string,
    @Body() body: { productoId: string; cantidad: number },
  ) {
    const { businessId } = await this.ownedCart(user, cartId);
    return this.cartService.addItem(cartId, body.productoId, body.cantidad, businessId);
  }

  /** PATCH /cart/:id/items/:itemId — set the exact quantity of an item. */
  @CanonicalPermission(CUSTOMER_POLICY)
  @Patch(':id/items/:itemId')
  async updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') cartId: string,
    @Param('itemId') itemId: string,
    @Body() body: { cantidad: number },
  ) {
    const { businessId } = await this.ownedCart(user, cartId);
    return this.cartService.updateItemQuantity(cartId, itemId, body.cantidad, businessId);
  }

  /** DELETE /cart/:id/items/:itemId — remove one item. */
  @CanonicalPermission(CUSTOMER_POLICY)
  @Delete(':id/items/:itemId')
  @HttpCode(204)
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') cartId: string,
    @Param('itemId') itemId: string,
  ) {
    const { businessId } = await this.ownedCart(user, cartId);
    await this.cartService.removeItem(cartId, itemId, businessId);
  }

  /** DELETE /cart/:id — empty the cart. */
  @CanonicalPermission(CUSTOMER_POLICY)
  @Delete(':id')
  @HttpCode(204)
  async clearCart(@CurrentUser() user: AuthenticatedUser, @Param('id') cartId: string) {
    const { businessId } = await this.ownedCart(user, cartId);
    await this.cartService.clearCart(cartId, businessId);
  }
}
