import { escapeHtml, MessagingAlertsService, unreadEmail } from './messaging-alerts.service';

// The Web Push call is replaced: no network, and no real keys needed.
const send = jest.fn();

// E3 — push to team members with Wapsell closed (delivery; the endpoints and the e-mails run
// against the real stack in messaging-alerts.integration-spec.ts).
describe('MessagingAlertsService — push', () => {
  const message = {
    businessId: 'business-a',
    conversationId: 'conversation-a',
    authorUserId: null,
    authorCustomerId: 'customer-a',
    content: 'hola, ¿tienen talle 40?',
    deletedAt: null,
    Attachment: [],
  };
  const prisma = {
    message: { findUnique: jest.fn() },
    conversationParticipant: { findMany: jest.fn() },
    pushSubscription: { findMany: jest.fn(), update: jest.fn(), delete: jest.fn() },
    cliente: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const subscription = (id: string, userId: string) => ({
    id,
    userId,
    endpoint: `https://push.example.test/${id}`,
    p256dh: 'key',
    auth: 'auth',
  });
  let alerts: MessagingAlertsService;
  const online = new Set<string>();

  beforeEach(() => {
    jest.clearAllMocks();
    send.mockReset();
    process.env.VAPID_PUBLIC_KEY = 'public';
    process.env.VAPID_PRIVATE_KEY = 'private';
    alerts = new MessagingAlertsService(prisma as never, { send: jest.fn() } as never);
    jest.spyOn(alerts as unknown as { deliver: typeof send }, 'deliver').mockImplementation(send);
    alerts.usePresence((_business, actor) => online.has(actor.userId ?? ''));
    online.clear();
    prisma.message.findUnique.mockResolvedValue(message);
    prisma.conversationParticipant.findMany.mockResolvedValue([
      { userId: 'owner' },
      { userId: 'seller' },
    ]);
    prisma.pushSubscription.findMany.mockImplementation(({ where }) =>
      Promise.resolve(
        [subscription('s-owner', 'owner'), subscription('s-seller', 'seller')].filter((s) =>
          where.userId.in.includes(s.userId),
        ),
      ),
    );
    prisma.cliente.findFirst.mockResolvedValue({ nombre: 'María' });
    send.mockResolvedValue({ statusCode: 201 });
    prisma.pushSubscription.update.mockResolvedValue({});
    prisma.pushSubscription.delete.mockResolvedValue({});
  });

  afterAll(() => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });

  it('pushes who wrote and a preview to every team member of the chat, and opens the chat on click', async () => {
    expect(await alerts.pushNewMessage('m-1')).toBe(2);
    const [target, payload, options] = send.mock.calls[0];
    expect(target).toEqual({
      endpoint: 'https://push.example.test/s-owner',
      keys: { p256dh: 'key', auth: 'auth' },
    });
    expect(JSON.parse(payload)).toEqual({
      title: 'María',
      body: 'hola, ¿tienen talle 40?',
      url: '/panel/mensajes?c=conversation-a',
      tag: 'conversation-a',
    });
    expect(options).toEqual({ TTL: 3600 });
    expect(prisma.conversationParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { not: null }, Membership: { status: 'ACTIVE' } }),
      }),
    );
  });

  it('skips whoever has Wapsell open and the author', async () => {
    online.add('owner');
    prisma.message.findUnique.mockResolvedValue({
      ...message,
      authorCustomerId: null,
      authorUserId: 'seller',
    });
    prisma.user.findUnique.mockResolvedValue({ nombre: 'Diego' });
    expect(await alerts.pushNewMessage('m-1')).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('forgets a browser the push service says is gone, and keeps the rest', async () => {
    send.mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }));
    expect(await alerts.pushNewMessage('m-1')).toBe(1);
    expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: 's-owner' } });
    expect(prisma.pushSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's-seller' } }),
    );
  });

  it('does nothing without VAPID keys or for a deleted message', async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    expect(await alerts.pushNewMessage('m-1')).toBe(0);
    expect(prisma.message.findUnique).not.toHaveBeenCalled();
    process.env.VAPID_PRIVATE_KEY = 'private';
    prisma.message.findUnique.mockResolvedValue({ ...message, deletedAt: new Date() });
    expect(await alerts.pushNewMessage('m-1')).toBe(0);
  });
});

describe('MessagingAlertsService — the unread e-mail', () => {
  it('escapes everything people wrote', () => {
    const mail = unreadEmail({
      personName: 'Ana',
      customerName: '<script>alert(1)</script>',
      businessName: 'Otra & Más',
      unread: 2,
      preview: '"hola" <b>',
      link: 'https://app.wapsell.com/panel/mensajes?c=x',
      afterMinutes: 10,
    });
    expect(mail.subject).toBe('<script>alert(1)</script> te escribió en Otra & Más');
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('Otra &amp; Más');
    expect(mail.html).toContain('&quot;hola&quot; &lt;b&gt;');
    expect(mail.html).toContain('2 mensajes');
    expect(escapeHtml(`'`)).toBe('&#39;');
  });
});
