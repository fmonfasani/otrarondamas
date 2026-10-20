import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CartService } from './cart.service';
import { BusinessContextService } from '../business-context/business-context.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly businessContextService: BusinessContextService,
  ) {}

  @Get()
  async getCart(@CurrentUser() user: AuthenticatedUser) {
    const context = await this.businessContextService.resolveForCustomer(user);
    return this.cartService.getOrCreateCart(context.customerId!, context.businessId);
  }

  @Post('items')
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddCartItemDto,
  ) {
    const context = await this.businessContextService.resolveForCustomer(user);
    const cart = await this.cartService.getOrCreateCart(context.customerId!, context.businessId);
    return this.cartService.addItem(cart.id, dto.productoId, Number(dto.cantidad), context.businessId);
  }

  @Patch('items/:itemId')
  async updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const context = await this.businessContextService.resolveForCustomer(user);
    return this.cartService.updateItemQuantity(itemId, Number(dto.cantidad), context.businessId);
  }

  @Delete('items/:itemId')
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ) {
    const context = await this.businessContextService.resolveForCustomer(user);
    await this.cartService.removeItem(itemId, context.businessId);
    return { success: true };
  }

  @Delete()
  async clearCart(@CurrentUser() user: AuthenticatedUser) {
    const context = await this.businessContextService.resolveForCustomer(user);
    const cart = await this.cartService.getOrCreateCart(context.customerId!, context.businessId);
    await this.cartService.clearCart(cart.id, context.businessId);
    return { success: true };
  }
}
