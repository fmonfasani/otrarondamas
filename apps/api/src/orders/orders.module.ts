import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { BusinessContextModule } from '../business-context/business-context.module';

@Module({
  imports: [PrismaModule, InventoryModule, BusinessContextModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
