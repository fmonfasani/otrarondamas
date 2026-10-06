import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  // LoyaltyModule/CustomersModule: Phase 5 of the Loyalty roadmap, extended
  // to the Online Store — compute the store customer's level (always
  // identified by email, never anonymous here) and the applicable automatic
  // discount, see store.service.ts.
  imports: [PrismaModule, InventoryModule, LoyaltyModule, CustomersModule],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}
