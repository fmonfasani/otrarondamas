import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { CustomersModule } from '../customers/customers.module';
import { BusinessContextModule } from '../business-context/business-context.module';

@Module({
  // InventoryModule: SalesService uses InventoryService.deductStock() (moved
  // there in Phase 4 of the Online Store — the same method used by
  // OrdersService, never two parallel deduction paths).
  // LoyaltyModule/CustomersModule: Phase 5 of the Loyalty roadmap — compute
  // the customer's level and the automatic discount applicable to each
  // item, see sales.service.ts.
  imports: [PrismaModule, InventoryModule, LoyaltyModule, CustomersModule, BusinessContextModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
