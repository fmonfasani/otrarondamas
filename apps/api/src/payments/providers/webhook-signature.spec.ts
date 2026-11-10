import { createHmac } from 'crypto';
import { StripeProviderService } from './stripe-provider.service';
import { MercadoPagoProviderService } from './mercadopago-provider.service';

// The webhook secrets used to fall back to values committed in the repository
// ('whsec_test_mock' / 'webhook_test_mock'), so anyone could sign an event when
// the environment variable was missing. Verification must fail closed instead.
describe('payment webhook signature verification', () => {
  const payload = { id: 'evt_1', paymentId: 'pi_1' };
  const sign = (secret: string) =>
    createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

  const withEnv = <T>(vars: Record<string, string | undefined>, build: () => T): T => {
    const previous = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    try {
      return build();
    } finally {
      for (const [k, v] of Object.entries(previous)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };

  describe('Stripe', () => {
    it('rejects every signature when STRIPE_WEBHOOK_SECRET is not set', async () => {
      const provider = withEnv(
        { STRIPE_WEBHOOK_SECRET: undefined },
        () => new StripeProviderService(),
      );

      await expect(
        provider.verifyWebhookSignature(sign('whsec_test_mock'), payload),
      ).resolves.toEqual({
        valid: false,
      });
      await expect(provider.verifyWebhookSignature(sign(''), payload)).resolves.toEqual({
        valid: false,
      });
    });

    it('accepts the signature made with the configured secret and rejects any other', async () => {
      const provider = withEnv(
        { STRIPE_WEBHOOK_SECRET: 'whsec_configured' },
        () => new StripeProviderService(),
      );

      await expect(
        provider.verifyWebhookSignature(sign('whsec_configured'), payload),
      ).resolves.toEqual({
        valid: true,
        payload,
      });
      await expect(
        provider.verifyWebhookSignature(sign('whsec_other'), payload),
      ).resolves.toMatchObject({
        valid: false,
      });
      await expect(provider.verifyWebhookSignature('short', payload)).resolves.toMatchObject({
        valid: false,
      });
    });
  });

  describe('MercadoPago', () => {
    it('rejects every signature when MERCADOPAGO_WEBHOOK_TOKEN is not set', async () => {
      const provider = withEnv(
        { MERCADOPAGO_WEBHOOK_TOKEN: undefined },
        () => new MercadoPagoProviderService(),
      );

      await expect(
        provider.verifyWebhookSignature(`ts=1,v1=${sign('webhook_test_mock')}`, payload),
      ).resolves.toEqual({ valid: false });
    });

    it('accepts the v1 value made with the configured token and rejects any other', async () => {
      const provider = withEnv(
        { MERCADOPAGO_WEBHOOK_TOKEN: 'mp_configured' },
        () => new MercadoPagoProviderService(),
      );

      await expect(
        provider.verifyWebhookSignature(`ts=1,v1=${sign('mp_configured')}`, payload),
      ).resolves.toEqual({ valid: true, payload });
      await expect(
        provider.verifyWebhookSignature(`ts=1,v1=${sign('mp_other')}`, payload),
      ).resolves.toMatchObject({ valid: false });
      // The old check accepted any header that merely contained the digest.
      await expect(
        provider.verifyWebhookSignature(`junk${sign('mp_configured')}junk`, payload),
      ).resolves.toMatchObject({ valid: false });
    });
  });
});
