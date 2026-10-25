import { Module } from '@nestjs/common';
import { IPaymentProvider } from './payment-provider.interface';
import { MockPaymentProvider } from './mock-payment.provider';

/**
 * PaymentProviderModule: Selects active payment provider implementation.
 *
 * Based on PAYMENT_PROVIDER env var:
 * - 'mock' (default): MockPaymentProvider (testing only)
 * - 'stripe': StripePaymentProvider (Phase 5+)
 * - 'paypal': PayPalPaymentProvider (Phase 5+)
 */
@Module({
  providers: [
    {
      provide: 'IPaymentProvider',
      useFactory: (): IPaymentProvider => {
        const provider = process.env.PAYMENT_PROVIDER || 'mock';

        // Phase 5+: Add real providers here
        // if (provider === 'stripe') {
        //   return new StripePaymentProvider(process.env.STRIPE_API_KEY);
        // }
        // if (provider === 'paypal') {
        //   return new PayPalPaymentProvider(process.env.PAYPAL_API_KEY);
        // }

        // Default: Mock provider (testing)
        return new MockPaymentProvider();
      },
    },
  ],
  exports: ['IPaymentProvider'],
})
export class PaymentProviderModule {}
