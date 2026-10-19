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
    // Only customers can access their cart
    if (user.type !== 'cliente') {
      throw new Error('Solo clientes pueden acceder a su carrito');
    }

    const context = await this.businessContextService.resolveForAuthenticatedUser(user);
    return this.cartService.getOrCreateCart(user.id, context.businessId);
  }

  @Post('items')
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddCartItemDto,
  ) {
    if (user.type !== 'cliente') {
      throw new Error('Solo clientes pueden agregar items al carrito');
    }

    const context = await this.businessContextService.resolveForAuthenticatedUser(user);
    const cart = await this.cartService.getOrCreateCart(user.id, context.businessId);
    return this.cartService.addItem(cart.id, dto.productoId, Number(dto.cantidad), context.businessId);
  }

  @Patch('items/:itemId')
  async updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    if (user.type !== 'cliente') {
      throw new Error('Solo clientes pueden modificar su carrito');
    }

    const context = await this.businessContextService.resolveForAuthenticatedUser(user);
    return this.cartService.updateItemQuantity(itemId, Number(dto.cantidad), context.businessId);
  }

  @Delete('items/:itemId')
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ) {
    if (user.type !== 'cliente') {
      throw new Error('Solo clientes pueden modificar su carrito');
    }

    const context = await this.businessContextService.resolveForAuthenticatedUser(user);
    await this.cartService.removeItem(itemId, context.businessId);
    return { success: true };
  }

  @Delete()
  async clearCart(@CurrentUser() user: AuthenticatedUser) {
    if (user.type !== 'cliente') {
      throw new Error('Solo clientes pueden vaciar su carrito');
    }

    const context = await this.businessContextService.resolveForAuthenticatedUser(user);
    const cart = await this.cartService.getOrCreateCart(user.id, context.businessId);
    await this.cartService.clearCart(cart.id, context.businessId);
    return { success: true };
  }
}
