import { randomUUID } from 'crypto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { EmailService } from '../../src/email/email.service';
import { EmailTemplateService } from '../../src/email/templates/email-template.service';
import type { ResendProvider } from '../../src/email/providers/resend.provider';
import type { SendGridProvider } from '../../src/email/providers/sendgrid.provider';
import type { AwsSesProvider } from '../../src/email/providers/aws-ses.provider';

// Recipient email preferences are enforced when sending (owner decision
// 2026-11-09): TRANSACCIONAL mail always goes out; MARKETING and ALERTAS honour
// the recipient's stored preference in that Business. A blocked email is
// logged as IGNORADO; an allowed one reaches the providers (none is configured
// here, so it is logged as FALLIDO).
describe('P8-2: email preferences are enforced when sending', () => {
  let prisma: PrismaService;
  let service: EmailService;
  const tag = randomUUID().slice(0, 8);
  const businessIds: string[] = [];

  const unconfigured = { name: 'NONE', isConfigured: () => false } as unknown as ResendProvider &
    SendGridProvider &
    AwsSesProvider;

  const createBusiness = async (label: string) => {
    const empresa = await prisma.empresa.create({
      data: { nombre: `P8-2 ${label} ${tag}`, slug: `p8-2-${label}-${tag}`, configuracion: {} },
      select: { id: true },
    });
    businessIds.push(empresa.id);
    for (const tipo of ['TRANSACCIONAL', 'MARKETING', 'ALERTAS'] as const) {
      await prisma.emailTemplate.create({
        data: {
          empresaId: empresa.id,
          nombre: `p8-2-${tipo.toLowerCase()}`,
          tipo,
          asunto: `P8-2 ${tipo}`,
          contenidoHtml: '<p>{{nombre}}</p>',
        },
      });
    }
    return empresa.id;
  };

  const setPreference = (
    empresaId: string,
    email: string,
    pref: { suscrito?: boolean; frecuencia?: string; categoriasOptIn?: Record<string, boolean> },
  ) =>
    prisma.emailPreference.create({
      data: { empresaId, email, unsubscribeToken: `p8-2-${randomUUID()}`, ...pref },
    });

  const send = async (empresaId: string, tipo: string, to: string) => {
    const log = await service.sendTransactional(empresaId, `p8-2-${tipo.toLowerCase()}`, to, {
      nombre: 'P8-2',
    });
    return log?.evento as string | undefined;
  };

  let businessA: string;
  let businessB: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new EmailService(prisma, unconfigured, unconfigured, unconfigured);
    businessA = await createBusiness('a');
    businessB = await createBusiness('b');
  });

  afterAll(async () => {
    if (prisma) {
      const where = { empresaId: { in: businessIds } };
      await prisma.emailLog.deleteMany({ where });
      await prisma.emailPreference.deleteMany({ where });
      await prisma.emailTemplate.deleteMany({ where });
      await prisma.empresa.deleteMany({ where: { id: { in: businessIds } } });
      await prisma.$disconnect();
    }
  });

  // Under the API's ESM build, `import * as Handlebars` left compile undefined:
  // every send threw before reaching a provider and every template create
  // answered 400. These two cases pin that the renderer is usable.
  it('renders the template and reaches the providers when the recipient may receive it', async () => {
    const log = await service.sendTransactional(
      businessA,
      'p8-2-transaccional',
      `render-${tag}@example.test`,
      {
        nombre: 'Ana',
      },
    );

    expect(log).toEqual(expect.objectContaining({ evento: 'FALLIDO', contenido: '<p>Ana</p>' }));
  });

  it('accepts a valid template through the template service', async () => {
    const templates = new EmailTemplateService(prisma);

    await expect(
      templates.create(
        businessA,
        `p8-2-created-${tag}`,
        'MARKETING',
        'Hola {{nombre}}',
        '<p>{{nombre}}</p>',
      ),
    ).resolves.toEqual(expect.objectContaining({ nombre: `p8-2-created-${tag}` }));
  });

  it('does not send marketing to a recipient who unsubscribed', async () => {
    const to = `unsubscribed-${tag}@example.test`;
    await setPreference(businessA, to, { suscrito: false });

    expect(await send(businessA, 'MARKETING', to)).toBe('IGNORADO');
    expect(await send(businessA, 'ALERTAS', to)).toBe('IGNORADO');
  });

  it('still sends transactional mail to a recipient who unsubscribed', async () => {
    const to = `unsubscribed-tx-${tag}@example.test`;
    await setPreference(businessA, to, { suscrito: false, frecuencia: 'NUNCA' });

    expect(await send(businessA, 'TRANSACCIONAL', to)).toBe('FALLIDO');
  });

  it('does not send when the frequency is NUNCA', async () => {
    const to = `never-${tag}@example.test`;
    await setPreference(businessA, to, { frecuencia: 'NUNCA' });

    expect(await send(businessA, 'MARKETING', to)).toBe('IGNORADO');
  });

  it('honours a category the recipient turned off, and only that one', async () => {
    const to = `category-${tag}@example.test`;
    await setPreference(businessA, to, { categoriasOptIn: { marketing: false, alertas: true } });

    expect(await send(businessA, 'MARKETING', to)).toBe('IGNORADO');
    expect(await send(businessA, 'ALERTAS', to)).toBe('FALLIDO');
  });

  it('sends to a recipient with no stored preference', async () => {
    expect(await send(businessA, 'MARKETING', `no-pref-${tag}@example.test`)).toBe('FALLIDO');
  });

  it("uses the preference of the sending Business, not another Business's", async () => {
    const to = `two-businesses-${tag}@example.test`;
    await setPreference(businessB, to, { suscrito: false });

    expect(await send(businessA, 'MARKETING', to)).toBe('FALLIDO');
    expect(await send(businessB, 'MARKETING', to)).toBe('IGNORADO');
  });
});
