import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessContextModule } from '../business-context/business-context.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, BusinessContextModule, InventoryModule],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
