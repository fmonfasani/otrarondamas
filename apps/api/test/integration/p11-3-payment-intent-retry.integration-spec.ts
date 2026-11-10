import { randomUUID } from 'crypto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PaymentService } from '../../src/payments/payment.service';
import type { StripeProviderService } from '../../src/payments/providers/stripe-provider.service';
import type { MercadoPagoProviderService } from '../../src/payments/providers/mercadopago-provider.service';

// POST /pagos/intents keeps one PENDING Payment per Venta. A retry returns the
// intent already issued while it can still be confirmed; once that intent has
// expired (or was never stored) the old Payment is closed as FAILED and a new
// one is issued, so the sale never stays stuck in PENDING.
// Owner decision 2026-11-09.
describe('P11-3: payment intent retry and expiry', () => {
  let prisma: PrismaService;
  let service: PaymentService;
  const tag = randomUUID().slice(0, 8);
  let empresaId: string;
  let usuarioId: string;
  let issued = 0;

  // Deterministic provider: every call issues a new, unique intent.
  const provider = {
    createPaymentIntent: async (monto: number, moneda: string) => {
      issued += 1;
      return {
        id: `pi_${tag}_${issued}`,
        providerIntentId: `pi_${tag}_${issued}`,
        clientSecret: `secret_${tag}_${issued}`,
        monto,
        moneda,
        estado: 'PENDING',
      };
    },
  } as unknown as StripeProviderService & MercadoPagoProviderService;

  const createVenta = () =>
    prisma.venta.create({
      data: { empresaId, usuarioId, canal: 'WEB', total: 100 },
      select: { id: true },
    });

  const requestIntent = (ventaId: string) =>
    service.createPaymentIntent(empresaId, ventaId, {
      ventaId,
      monto: 10000,
      moneda: 'ARS',
    } as any);

  const expireIntentsOf = (paymentId: string) =>
    prisma.paymentIntent.updateMany({
      where: { paymentId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

  const paymentsOf = (ventaId: string) =>
    prisma.payment.findMany({
      where: { ventaId },
      select: { id: true, estado: true },
      orderBy: { createdAt: 'asc' },
    });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new PaymentService(prisma, provider, provider);
    const empresa = await prisma.empresa.create({
      data: { nombre: `P11-3 ${tag}`, slug: `p11-3-${tag}`, configuracion: {} },
      select: { id: true },
    });
    empresaId = empresa.id;
    const usuario = await prisma.usuario.create({
      data: { empresaId, nombre: 'P11-3', email: `p11-3-${tag}@example.test` },
      select: { id: true },
    });
    usuarioId = usuario.id;
  });

  afterAll(async () => {
    if (prisma && empresaId) {
      await prisma.paymentIntent.deleteMany({ where: { empresaId } });
      await prisma.payment.deleteMany({ where: { empresaId } });
      await prisma.venta.deleteMany({ where: { empresaId } });
      await prisma.usuario.deleteMany({ where: { empresaId } });
      await prisma.empresa.deleteMany({ where: { id: empresaId } });
    }
    await prisma?.$disconnect();
  });

  it('a retry while the intent is still valid returns the same payment and clientSecret', async () => {
    const venta = await createVenta();

    const first = await requestIntent(venta.id);
    const retry = await requestIntent(venta.id);

    expect(retry).toEqual(
      expect.objectContaining({ paymentId: first.paymentId, clientSecret: first.clientSecret }),
    );
    expect(await paymentsOf(venta.id)).toEqual([{ id: first.paymentId, estado: 'PENDING' }]);
  });

  it('a retry after the intent expired closes the old payment and issues a new confirmable one', async () => {
    const venta = await createVenta();
    const first = await requestIntent(venta.id);
    await expireIntentsOf(first.paymentId);

    const retry = await requestIntent(venta.id);

    expect(retry.paymentId).not.toBe(first.paymentId);
    expect(retry.clientSecret).toBeDefined();
    expect(retry.clientSecret).not.toBe(first.clientSecret);
    expect(await paymentsOf(venta.id)).toEqual([
      { id: first.paymentId, estado: 'FAILED' },
      { id: retry.paymentId, estado: 'PENDING' },
    ]);
    const intent = await prisma.paymentIntent.findUniqueOrThrow({
      where: { clientSecret: retry.clientSecret as string },
      select: { expiresAt: true },
    });
    expect(intent.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('a PENDING payment without any stored intent is replaced instead of returning no clientSecret', async () => {
    const venta = await createVenta();
    const orphan = await prisma.payment.create({
      data: {
        empresaId,
        ventaId: venta.id,
        monto: 100,
        proveedor: 'STRIPE',
        providerPaymentId: `pi_orphan_${tag}`,
        estado: 'PENDING',
      },
      select: { id: true },
    });

    const retry = await requestIntent(venta.id);

    expect(retry.paymentId).not.toBe(orphan.id);
    expect(retry.clientSecret).toBeDefined();
    expect(await paymentsOf(venta.id)).toEqual([
      { id: orphan.id, estado: 'FAILED' },
      { id: retry.paymentId, estado: 'PENDING' },
    ]);
  });

  // Not covered: concurrent first requests (or retries) for the same Venta can
  // still open two PENDING payments, because nothing in the database enforces
  // one PENDING Payment per Venta. Closing that needs a partial unique index
  // (schema decision); the conditional close above only stops two retries
  // from both closing and reopening the same payment.
});
