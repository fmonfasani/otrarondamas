import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessContextModule } from '../business-context/business-context.module';
import { InventoryModule } from '../inventory/inventory.module';
import { SupplierProductsController } from './supplier-products.controller';
import { SupplierProductsService } from './supplier-products.service';

@Module({
  imports: [PrismaModule, BusinessContextModule, InventoryModule],
  // OR-B4-052 (stage D1): the products of each supplier and the purchase suggestion.
  controllers: [PurchasesController, SupplierProductsController],
  providers: [PurchasesService, SupplierProductsService],
})
export class PurchasesModule {}
