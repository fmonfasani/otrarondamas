import { CustomerNoticesModule } from '../customer-notices/customer-notices.module';
import { MercadoPagoModule } from '../payments/mercadopago/mercadopago.module';
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderDeadlineService } from './order-deadline.service';
import { CustomerCancelController } from './customer-cancel.controller';
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
  controllers: [OrdersController, CustomerCancelController],
  providers: [OrdersService, OrderDeadlineService],
})
export class OrdersModule {}
