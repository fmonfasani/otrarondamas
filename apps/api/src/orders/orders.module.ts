import { CustomerNoticesModule } from '../customer-notices/customer-notices.module';
import { MercadoPagoModule } from '../payments/mercadopago/mercadopago.module';
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { BusinessContextModule } from '../business-context/business-context.module';

@Module({
  imports: [
    PrismaModule,
    InventoryModule,
    BusinessContextModule,
    CustomerNoticesModule,
    MercadoPagoModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
