import {
  escapeHtml,
  isPushService,
  MessagingAlertsService,
  replyEmail,
  unreadEmail,
} from './messaging-alerts.service';

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
    type: 'TEXT',
    deletedAt: null,
    Attachment: [],
  };
  const prisma = {
    message: { findUnique: jest.fn() },
    conversationParticipant: { findMany: jest.fn() },
    pushSubscription: { findMany: jest.fn(), update: jest.fn(), delete: jest.fn() },
    cliente: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    empresa: { findUnique: jest.fn() },
  };
  const subscription = (id: string, userId: string | null, customerId: string | null = null) => ({
    id,
    userId,
    customerId,
    endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
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
    alerts.usePresence((_business, actor) => online.has(actor.userId ?? actor.customerId ?? ''));
    online.clear();
    prisma.message.findUnique.mockResolvedValue(message);
    prisma.conversationParticipant.findMany.mockResolvedValue([
      { userId: 'owner' },
      { userId: 'seller' },
    ]);
    prisma.pushSubscription.findMany.mockImplementation(({ where }) =>
      Promise.resolve(
        [
          subscription('s-owner', 'owner'),
          subscription('s-seller', 'seller'),
          subscription('s-customer', null, 'customer-a'),
        ].filter(
          (s) =>
            (s.userId && where.OR[0].userId.in.includes(s.userId)) ||
            (s.customerId && where.OR[1].customerId.in.includes(s.customerId)),
        ),
      ),
    );
    prisma.empresa.findUnique.mockResolvedValue({ nombre: 'SAP-ONLINE', slug: 'sap-online' });
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
      endpoint: 'https://fcm.googleapis.com/fcm/send/s-owner',
      keys: { p256dh: 'key', auth: 'auth' },
    });
    expect(JSON.parse(payload)).toEqual({
      title: 'María',
      body: 'hola, ¿tienen talle 40?',
      url: '/panel/mensajes?c=conversation-a',
      tag: 'conversation-a',
    });
    expect(options).toEqual({ TTL: 3600 });
    // Only active team members (and the conversation's customers) are recipients.
    expect(prisma.conversationParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { userId: { not: null }, Membership: { status: 'ACTIVE' } },
            { customerId: { not: null } },
          ],
        }),
      }),
    );
  });

  it('pushes the store’s answer to the customer away from the store, never to the team (F1)', async () => {
    prisma.message.findUnique.mockResolvedValue({
      ...message,
      authorCustomerId: null,
      authorUserId: 'owner',
      content: 'Sí, tenemos talle 40',
    });
    prisma.conversationParticipant.findMany.mockResolvedValue([
      { userId: 'owner', customerId: null },
      { userId: null, customerId: 'customer-a' },
    ]);
    prisma.user.findUnique.mockResolvedValue({ nombre: 'Fede' });
    expect(await alerts.pushNewMessage('m-2')).toBe(1);
    const [target, payload] = send.mock.calls[0];
    expect(target.endpoint).toBe('https://fcm.googleapis.com/fcm/send/s-customer');
    expect(JSON.parse(payload)).toEqual({
      title: 'SAP-ONLINE',
      body: 'Sí, tenemos talle 40',
      url: '/tienda/sap-online/chat',
      tag: 'tienda-business-a',
    });
  });

  it('pushes the system’s notices to the customer only, and nothing to whoever is in the store', async () => {
    prisma.message.findUnique.mockResolvedValue({
      ...message,
      authorCustomerId: null,
      authorUserId: 'owner',
      type: 'SYSTEM',
      content: 'Confirmamos tu pedido N° 12.',
    });
    prisma.conversationParticipant.findMany.mockResolvedValue([
      { userId: 'owner', customerId: null },
      { userId: 'seller', customerId: null },
      { userId: null, customerId: 'customer-a' },
    ]);
    expect(await alerts.pushNewMessage('m-3')).toBe(1);
    expect(send.mock.calls[0][0].endpoint).toContain('s-customer');
    send.mockClear();
    online.add('customer-a');
    expect(await alerts.pushNewMessage('m-3')).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('only ever posts to the real push services (S2)', async () => {
    expect(isPushService('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(isPushService('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe(true);
    expect(isPushService('https://web.push.apple.com/QGm')).toBe(true);
    expect(isPushService('https://wns2-bn3p.notify.windows.com/w/?token=x')).toBe(true);
    expect(isPushService('http://fcm.googleapis.com/fcm/send/abc')).toBe(false);
    expect(isPushService('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isPushService('https://wapsell-api:3000/x')).toBe(false);
    expect(isPushService('https://fcm.googleapis.com.evil.test/x')).toBe(false);
    expect(isPushService('https://user:pw@fcm.googleapis.com/x')).toBe(false);
    expect(isPushService('no es una url')).toBe(false);
    // A row that points elsewhere is dropped, never called.
    prisma.pushSubscription.findMany.mockResolvedValue([
      { ...subscription('s-bad', 'owner'), endpoint: 'https://10.0.0.5/push' },
    ]);
    expect(await alerts.pushNewMessage('m-1')).toBe(0);
    expect(send).not.toHaveBeenCalled();
    expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: 's-bad' } });
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
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('tells the customer the store answered, escaping what people wrote (F1)', () => {
    const mail = replyEmail({
      customerName: 'Ana <b>',
      businessName: 'Otra & Más',
      unread: 1,
      preview: '<img src=x onerror=alert(1)>',
      link: 'https://app.wapsell.com/tienda/otra/chat',
    });
    expect(mail.subject).toBe('Otra & Más te respondió');
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('Ana &lt;b&gt;');
    expect(mail.html).toContain('un mensaje');
  });
});
