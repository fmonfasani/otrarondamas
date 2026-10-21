import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { SalesModule } from '../sales/sales.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessContextModule } from '../business-context/business-context.module';

@Module({
  imports: [PrismaModule, BusinessContextModule, SalesModule],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
