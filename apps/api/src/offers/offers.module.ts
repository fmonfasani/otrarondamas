import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessContextModule } from '../business-context/business-context.module';
import { OffersController } from './offers.controller';

/** OR-B4-046 §4.4 (stage C3): the business's offers. Prices read them through current-offers.ts. */
@Module({
  imports: [PrismaModule, BusinessContextModule],
  controllers: [OffersController],
})
export class OffersModule {}
