import { Module } from '@nestjs/common';
import { PublicStoreController } from './public-store.controller';
import { StoreService } from './store.service';
import { AddressesService } from './addresses.service';
import { StoreCatalogService } from './store-catalog.service';
import { ProductPhotosService } from '../catalog/product-photos.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { CustomersModule } from '../customers/customers.module';
import { BusinessContextModule } from '../business-context/business-context.module';
import { MercadoPagoModule } from '../payments/mercadopago/mercadopago.module';
import { DevolucionesCoreModule } from '../devoluciones/devoluciones-core.module';
import { CustomerNoticesModule } from '../customer-notices/customer-notices.module';

@Module({
  // LoyaltyModule/CustomersModule: Phase 5 of the Loyalty roadmap, extended
  // to the Online Store — compute the store customer's level (always
  // identified by email, never anonymous here) and the applicable automatic
  // discount, see store.service.ts.
  imports: [
    PrismaModule,
    InventoryModule,
    LoyaltyModule,
    CustomersModule,
    BusinessContextModule,
    MercadoPagoModule,
    DevolucionesCoreModule,
    CustomerNoticesModule,
  ],
  controllers: [PublicStoreController],
  providers: [StoreService, StoreCatalogService, ProductPhotosService, AddressesService],
  exports: [StoreService, StoreCatalogService],
})
export class StoreModule {}
