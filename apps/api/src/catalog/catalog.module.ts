import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogHierarchyController } from './catalog-hierarchy.controller';
import { CatalogPricesController } from './catalog-prices.controller';
import { CatalogStructureService } from './catalog-structure.service';
import { ProductPhotosService } from './product-photos.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessContextModule } from '../business-context/business-context.module';

// S-V1-04: imports BusinessContextModule so both controllers can resolve the
// actor's context at the boundary. BusinessContextModule also brings
// MembershipModule + PrismaModule transitively; PrismaModule is still
// imported explicitly because the controllers use it directly.
@Module({
  imports: [PrismaModule, BusinessContextModule],
  controllers: [CatalogController, CatalogHierarchyController, CatalogPricesController],
  providers: [CatalogStructureService, ProductPhotosService],
})
export class CatalogModule {}
