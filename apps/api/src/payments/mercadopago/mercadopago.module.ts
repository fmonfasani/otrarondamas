import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BusinessContextModule } from '../../business-context/business-context.module';
import { MercadoPagoAccountController } from './mercadopago-account.controller';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MercadoPagoCheckoutService } from './mercadopago-checkout.service';

/** OR-B4-032 — real Mercado Pago: each Business's own account. */
@Module({
  imports: [PrismaModule, BusinessContextModule],
  controllers: [MercadoPagoAccountController],
  providers: [MercadoPagoAccountService, MercadoPagoCheckoutService],
  exports: [MercadoPagoAccountService, MercadoPagoCheckoutService],
})
export class MercadoPagoModule {}
