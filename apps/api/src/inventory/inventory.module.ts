import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessContextModule } from '../business-context/business-context.module';

@Module({
  imports: [PrismaModule, BusinessContextModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  // StoreModule reuses consolidatedStock() for public availability (RF-06)
  // — see store.service.ts.
  exports: [InventoryService],
})
export class InventoryModule {}
