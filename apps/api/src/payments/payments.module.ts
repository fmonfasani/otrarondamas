import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentsController } from './payments.controller';
import { PaymentService } from './payment.service';
import { StripeProviderService } from './providers/stripe-provider.service';
import { MercadoPagoProviderService } from './providers/mercadopago-provider.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessContextModule } from '../business-context/business-context.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [PrismaModule, BusinessContextModule, SalesModule],
  controllers: [PaymentController, PaymentsController],
  providers: [PaymentService, StripeProviderService, MercadoPagoProviderService],
  exports: [PaymentService],
})
export class PaymentsModule {}
