import { Module } from '@nestjs/common';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessContextModule } from '../business-context/business-context.module';

@Module({
  imports: [PrismaModule, BusinessContextModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  // Phase 5 of the roadmap (automatic application in sales/orders) will need
  // to reuse LoyaltyService from SalesModule/StoreModule.
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
