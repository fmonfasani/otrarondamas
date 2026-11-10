import { randomUUID } from 'crypto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PaymentService } from '../../src/payments/payment.service';
import type { StripeProviderService } from '../../src/payments/providers/stripe-provider.service';
import type { MercadoPagoProviderService } from '../../src/payments/providers/mercadopago-provider.service';

// Payment webhooks against a real PostgreSQL database: a webhook acts only on
// records of the Business it was delivered for, and a repeated provider event
// is acknowledged without being processed twice (payments README:
// "providerEventId is unique -> duplicate webhooks are ignored").
describe('P11-2: payment webhooks — Business scope and idempotency', () => {
  let prisma: PrismaService;
  let service: PaymentService;
  const tag = randomUUID().slice(0, 8);
  const businessIds: string[] = [];

  // Webhook handling never calls the providers.
  const unusedProvider = {} as StripeProviderService & MercadoPagoProviderService;

  const createBusiness = async (label: string) => {
    const empresa = await prisma.empresa.create({
      data: { nombre: `P11-2 ${label} ${tag}`, slug: `p11-2-${label}-${tag}`, configuracion: {} },
      select: { id: true },
    });
    businessIds.push(empresa.id);
    const usuario = await prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nombre: `P11-2 ${label}`,
        email: `p11-2-${label}-${tag}@example.test`,
      },
      select: { id: true },
    });
    const venta = await prisma.venta.create({
      data: { empresaId: empresa.id, usuarioId: usuario.id, canal: 'WEB', total: 100 },
      select: { id: true },
    });
    return { empresaId: empresa.id, ventaId: venta.id };
  };

  const createPayment = (
    owner: { empresaId: string; ventaId: string },
    providerPaymentId: string,
    estado = 'PENDING',
  ) =>
    prisma.payment.create({
      data: {
        empresaId: owner.empresaId,
        ventaId: owner.ventaId,
        monto: 100,
        proveedor: 'STRIPE',
        providerPaymentId,
        estado,
      },
      select: { id: true },
    });

  const estadoOf = async (paymentId: string) =>
    (await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, select: { estado: true } }))
      .estado;

  let businessA: { empresaId: string; ventaId: string };
  let businessB: { empresaId: string; ventaId: string };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new PaymentService(prisma, unusedProvider, unusedProvider);
    businessA = await createBusiness('a');
    businessB = await createBusiness('b');
  });

  afterAll(async () => {
    if (prisma) {
      const where = { empresaId: { in: businessIds } };
      await prisma.paymentWebhook.deleteMany({ where });
      await prisma.refund.deleteMany({ where });
      await prisma.payment.deleteMany({ where });
      await prisma.venta.deleteMany({ where });
      await prisma.usuario.deleteMany({ where });
      await prisma.empresa.deleteMany({ where: { id: { in: businessIds } } });
      await prisma.$disconnect();
    }
  });

  describe('Business scope', () => {
    it('payment.success delivered for one Business does not complete a payment of another', async () => {
      const providerPaymentId = `pi_cross_success_${tag}`;
      const paymentOfB = await createPayment(businessB, providerPaymentId);

      await service.handleWebhook(businessA.empresaId, 'payment.success', {
        id: `evt_cross_success_${tag}`,
        paymentId: providerPaymentId,
      });

      expect(await estadoOf(paymentOfB.id)).toBe('PENDING');
    });

    it('payment.failed delivered for one Business does not fail a payment of another', async () => {
      const providerPaymentId = `pi_cross_failed_${tag}`;
      const paymentOfB = await createPayment(businessB, providerPaymentId, 'COMPLETED');

      await service.handleWebhook(businessA.empresaId, 'payment.failed', {
        id: `evt_cross_failed_${tag}`,
        paymentId: providerPaymentId,
      });

      expect(await estadoOf(paymentOfB.id)).toBe('COMPLETED');
    });

    it('refund.completed delivered for one Business does not complete a refund of another', async () => {
      const paymentOfB = await createPayment(businessB, `pi_cross_refund_${tag}`, 'COMPLETED');
      const refundOfB = await prisma.refund.create({
        data: {
          empresaId: businessB.empresaId,
          paymentId: paymentOfB.id,
          monto: 50,
          razon: 'CUSTOMER_REQUEST',
          providerRefundId: `re_cross_${tag}`,
        },
        select: { id: true },
      });

      await service.handleWebhook(businessA.empresaId, 'refund.completed', {
        id: `evt_cross_refund_${tag}`,
        refundId: `re_cross_${tag}`,
      });

      const refund = await prisma.refund.findUniqueOrThrow({
        where: { id: refundOfB.id },
        select: { estado: true },
      });
      expect(refund.estado).toBe('PENDING');
    });

    it('still updates the payment of the Business the webhook was delivered for', async () => {
      const providerPaymentId = `pi_own_${tag}`;
      const paymentOfA = await createPayment(businessA, providerPaymentId);

      await expect(
        service.handleWebhook(businessA.empresaId, 'payment.success', {
          id: `evt_own_${tag}`,
          paymentId: providerPaymentId,
        }),
      ).resolves.toEqual({ success: true });

      expect(await estadoOf(paymentOfA.id)).toBe('COMPLETED');
    });
  });

  describe('idempotency', () => {
    it('acknowledges a repeated event without processing it again', async () => {
      const providerPaymentId = `pi_dup_${tag}`;
      const payment = await createPayment(businessA, providerPaymentId);
      const event = { id: `evt_dup_${tag}`, paymentId: providerPaymentId };

      await expect(
        service.handleWebhook(businessA.empresaId, 'payment.success', event),
      ).resolves.toEqual({ success: true });
      // A later state change must survive the redelivery of the old event.
      await prisma.payment.update({ where: { id: payment.id }, data: { estado: 'CANCELLED' } });

      await expect(
        service.handleWebhook(businessA.empresaId, 'payment.success', event),
      ).resolves.toEqual({ success: true, duplicate: true });

      expect(await estadoOf(payment.id)).toBe('CANCELLED');
      expect(await prisma.paymentWebhook.count({ where: { providerEventId: event.id } })).toBe(1);
    });

    it('two concurrent deliveries of the same event record it once and neither fails', async () => {
      const providerPaymentId = `pi_race_${tag}`;
      const payment = await createPayment(businessA, providerPaymentId);
      const event = { id: `evt_race_${tag}`, paymentId: providerPaymentId };

      const results = await Promise.all([
        service.handleWebhook(businessA.empresaId, 'payment.success', event),
        service.handleWebhook(businessA.empresaId, 'payment.success', event),
      ]);

      expect(results.every((result) => result.success)).toBe(true);
      expect(await prisma.paymentWebhook.count({ where: { providerEventId: event.id } })).toBe(1);
      expect(await estadoOf(payment.id)).toBe('COMPLETED');
    });

    it('retries an event that was recorded but whose processing never finished', async () => {
      const providerPaymentId = `pi_retry_${tag}`;
      const payment = await createPayment(businessA, providerPaymentId);
      const eventId = `evt_retry_${tag}`;
      await prisma.paymentWebhook.create({
        data: {
          empresaId: businessA.empresaId,
          tipo: 'payment.success',
          providerEventId: eventId,
          payload: {},
          processed: false,
        },
      });

      await expect(
        service.handleWebhook(businessA.empresaId, 'payment.success', {
          id: eventId,
          paymentId: providerPaymentId,
        }),
      ).resolves.toEqual({ success: true });

      expect(await estadoOf(payment.id)).toBe('COMPLETED');
      const webhook = await prisma.paymentWebhook.findUniqueOrThrow({
        where: { providerEventId: eventId },
        select: { processed: true },
      });
      expect(webhook.processed).toBe(true);
    });

    it('does not let another Business re-process an event recorded for a different Business', async () => {
      const providerPaymentId = `pi_foreign_retry_${tag}`;
      const paymentOfA = await createPayment(businessA, providerPaymentId);
      const eventId = `evt_foreign_retry_${tag}`;
      await prisma.paymentWebhook.create({
        data: {
          empresaId: businessB.empresaId,
          tipo: 'payment.success',
          providerEventId: eventId,
          payload: {},
          processed: false,
        },
      });

      await expect(
        service.handleWebhook(businessA.empresaId, 'payment.success', {
          id: eventId,
          paymentId: providerPaymentId,
        }),
      ).resolves.toEqual({ success: true, duplicate: true });

      expect(await estadoOf(paymentOfA.id)).toBe('PENDING');
    });
  });
});
