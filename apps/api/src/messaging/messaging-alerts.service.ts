import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import type { BusinessContext } from '../business-context/business-context.types';
import { notificationPreview } from './messaging.service';

/**
 * E3 (messaging like WhatsApp) — alerts that reach a team member with Wapsell closed.
 *
 * - **Push.** A browser that accepted notifications («Activar avisos») gets every new message
 *   at once, like WhatsApp, while that person has no Wapsell screen open (open screens
 *   already chime and notify by themselves, E2). Needs the VAPID keys (VAPID_PUBLIC_KEY,
 *   VAPID_PRIVATE_KEY); without them push is simply off.
 * - **E-mail.** When a customer's message stays unread MESSAGE_ALERT_AFTER_MS (10 min) and
 *   the person has no screen open, one e-mail per run of unread messages (it is sent again
 *   only after they read and new ones pile up).
 *
 * Paquete 1 F1: the customer is alerted too — push when the store answers (or a notice like
 * «Confirmamos tu pedido» arrives) with the store closed, and one e-mail per run of unread
 * answers. Nobody is alerted about a conversation they are not in.
 */

/**
 * Paquete 1 S2 — the push services browsers really use. The server only ever posts to these:
 * a subscription pointing anywhere else (an internal address, say) is refused, so nobody can
 * make Wapsell call a URL of their choosing. PUSH_EXTRA_HOSTS adds hosts (tests).
 */
const PUSH_SERVICE_HOSTS = [
  /^fcm\.googleapis\.com$/, // Chrome, Edge on Android, Opera
  /(^|\.)push\.services\.mozilla\.com$/, // Firefox
  /^web\.push\.apple\.com$/, // Safari
  /\.notify\.windows\.com$/, // Edge on Windows
];

export function isPushService(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const extra = (process.env.PUSH_EXTRA_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const host = url.hostname.toLowerCase();
  return extra.includes(host) || PUSH_SERVICE_HOSTS.some((pattern) => pattern.test(host));
}

/** Who a browser subscription belongs to: a team member or a customer. */
export type PushOwner = { userId: string | null; customerId: string | null };

type IsOnline = (
  businessId: string,
  actor: { userId: string | null; customerId: string | null },
) => boolean;

const minutes = (ms: number) => Math.round(ms / 60_000);

/** How long a customer's message waits unread before the e-mail. */
export function alertAfterMs(): number {
  const configured = Number(process.env.MESSAGE_ALERT_AFTER_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : 10 * 60_000;
}

/** How often the e-mail check runs; 0 turns it off. */
export function alertEveryMs(): number {
  const configured = Number(process.env.MESSAGE_ALERT_EVERY_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : 60_000;
}

const webAppUrl = () =>
  (process.env.WEB_APP_URL || process.env.FRONTEND_URL || 'https://app.wapsell.com').replace(
    /\/+$/,
    '',
  );

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The e-mail about unread customer messages. Every value from people is escaped. */
export function unreadEmail(input: {
  personName: string;
  customerName: string;
  businessName: string;
  unread: number;
  preview: string;
  link: string;
  afterMinutes: number;
}): { subject: string; html: string } {
  const subject = `${input.customerName} te escribió en ${input.businessName}`;
  const count = input.unread === 1 ? 'un mensaje' : `${input.unread} mensajes`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#141413;max-width:520px">
  <p>Hola ${escapeHtml(input.personName)},</p>
  <p><b>${escapeHtml(input.customerName)}</b> te dejó ${count} en <b>${escapeHtml(input.businessName)}</b> y todavía no lo leíste:</p>
  <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #d97757;background:#faf9f5">${escapeHtml(input.preview)}</blockquote>
  <p><a href="${escapeHtml(input.link)}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#d97757;color:#fff;text-decoration:none;font-weight:600">Responder</a></p>
  <p style="color:#77736d;font-size:12px">Te avisamos porque pasaron ${input.afterMinutes} minutos y no tenías Wapsell abierto.</p>
</div>`;
  return { subject, html };
}

/** Paquete 1 F1 — the e-mail to a customer whose answer from the store is still unread. */
export function replyEmail(input: {
  customerName: string;
  businessName: string;
  unread: number;
  preview: string;
  link: string;
}): { subject: string; html: string } {
  const subject = `${input.businessName} te respondió`;
  const count = input.unread === 1 ? 'un mensaje' : `${input.unread} mensajes`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#141413;max-width:520px">
  <p>Hola ${escapeHtml(input.customerName)},</p>
  <p><b>${escapeHtml(input.businessName)}</b> te dejó ${count} que todavía no leíste:</p>
  <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #0a6fd6;background:#f3f8fd">${escapeHtml(input.preview)}</blockquote>
  <p><a href="${escapeHtml(input.link)}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#d97757;color:#fff;text-decoration:none;font-weight:600">Ver el chat</a></p>
  <p style="color:#77736d;font-size:12px">Te avisamos porque le escribiste a ${escapeHtml(input.businessName)} desde su tienda en Wapsell.</p>
</div>`;
  return { subject, html };
}

interface DueAlert {
  participantId: string;
  businessId: string;
  userId: string;
  conversationId: string;
  unread: number;
}

interface DueReply {
  participantId: string;
  businessId: string;
  customerId: string;
  conversationId: string;
  unread: number;
}

@Injectable()
export class MessagingAlertsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingAlertsService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private isOnline: IsOnline = () => false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || 'mailto:no-reply@wapsell.com',
          publicKey,
          privateKey,
        );
      } catch (error) {
        this.logger.error(`push disabled, invalid VAPID keys: ${(error as Error).message}`);
      }
    }
  }

  /** The gateway knows who has a screen open; it registers itself (no circular dependency). */
  usePresence(isOnline: IsOnline): void {
    this.isOnline = isOnline;
  }

  onModuleInit(): void {
    const every = alertEveryMs();
    if (every <= 0) return;
    this.timer = setInterval(() => {
      this.emailUnread().catch((error: unknown) =>
        this.logger.warn(`unread e-mails failed: ${(error as Error)?.message ?? String(error)}`),
      );
    }, every);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // ------------------------------------------------------------------ push

  pushEnabled(): boolean {
    return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  }

  pushSettings() {
    return {
      enabled: this.pushEnabled(),
      publicKey: this.pushEnabled() ? process.env.VAPID_PUBLIC_KEY : null,
    };
  }

  /**
   * This browser accepted push, for a team member or a customer (paquete 1 F1). A browser
   * re-used by someone else moves to them. Only real push services (S2).
   */
  async subscribe(
    owner: PushOwner & { businessId: string },
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<void> {
    if (!owner.userId && !owner.customerId) return;
    if (!isPushService(subscription.endpoint)) {
      throw new BadRequestException('Ese navegador no usa un servicio de avisos conocido');
    }
    const who = {
      userId: owner.userId ?? null,
      customerId: owner.userId ? null : owner.customerId,
    };
    await this.prisma.pushSubscription.upsert({
      where: {
        businessId_endpoint: { businessId: owner.businessId, endpoint: subscription.endpoint },
      },
      create: {
        businessId: owner.businessId,
        ...who,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: { ...who, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    });
  }

  async unsubscribe(owner: PushOwner & { businessId: string }, endpoint: string): Promise<void> {
    if (!owner.userId && !owner.customerId) return;
    await this.prisma.pushSubscription.deleteMany({
      where: {
        businessId: owner.businessId,
        endpoint,
        ...(owner.userId ? { userId: owner.userId } : { customerId: owner.customerId }),
      },
    });
  }

  /**
   * A message was saved: push it to whoever of the conversation is away (no Wapsell screen
   * open). Team members hear from customers and colleagues, never about the system's notices;
   * customers hear from the store, notices included (paquete 1 F1). Best-effort; a browser
   * that no longer exists is forgotten.
   */
  async pushNewMessage(messageId: string): Promise<number> {
    if (!this.pushEnabled()) return 0;
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        businessId: true,
        conversationId: true,
        authorUserId: true,
        authorCustomerId: true,
        type: true,
        content: true,
        deletedAt: true,
        automatic: true,
        Attachment: { where: { deletedAt: null }, select: { mimeType: true, filename: true } },
      },
    });
    if (!message || message.deletedAt) return 0;

    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId: message.conversationId,
        businessId: message.businessId,
        leftAt: null,
        removedAt: null,
        OR: [
          { userId: { not: null }, Membership: { status: 'ACTIVE' } },
          { customerId: { not: null } },
        ],
      },
      select: { userId: true, customerId: true },
    });
    const away = (actor: PushOwner) => !this.isOnline(message.businessId, actor);
    // E6b: nor about what the store sent by itself.
    const staff =
      message.type === 'SYSTEM' || message.automatic
        ? []
        : participants
            .filter((p) => p.userId && p.userId !== message.authorUserId)
            .filter(away)
            .map((p) => p.userId as string);
    // E6a: whoever muted this chat hears nothing from it.
    const muted = await this.mutedIn(message.businessId, message.conversationId, staff);
    const staffAwake = staff.filter((id) => !muted.has(id));
    const customers = message.authorCustomerId
      ? []
      : participants
          .filter((p) => p.customerId)
          .filter(away)
          .map((p) => p.customerId as string);
    if (staffAwake.length === 0 && customers.length === 0) return 0;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: {
        businessId: message.businessId,
        OR: [{ userId: { in: staffAwake } }, { customerId: { in: customers } }],
      },
    });
    if (subscriptions.length === 0) return 0;

    const body = notificationPreview(message);
    const forStaff = subscriptions.some((s) => s.userId)
      ? JSON.stringify({
          title: await this.authorName(message),
          body,
          url: `/panel/mensajes?c=${message.conversationId}`,
          tag: message.conversationId,
        })
      : '';
    const business = subscriptions.some((s) => s.customerId)
      ? await this.prisma.empresa.findUnique({
          where: { id: message.businessId },
          select: { nombre: true, slug: true },
        })
      : null;
    const forCustomer = business
      ? JSON.stringify({
          title: business.nombre,
          body,
          url: `/tienda/${business.slug}/chat`,
          tag: `tienda-${message.businessId}`,
        })
      : '';

    let delivered = 0;
    for (const subscription of subscriptions) {
      // S2: a row saved before the check, or edited by hand, never makes the server call it.
      if (!isPushService(subscription.endpoint)) {
        await this.prisma.pushSubscription
          .delete({ where: { id: subscription.id } })
          .catch(() => undefined);
        continue;
      }
      try {
        await this.deliver(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          subscription.userId ? forStaff : forCustomer,
          { TTL: 60 * 60 },
        );
        delivered += 1;
        await this.prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { lastUsedAt: new Date() },
        });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await this.prisma.pushSubscription
            .delete({ where: { id: subscription.id } })
            .catch(() => undefined);
        } else {
          this.logger.warn(`push failed (${status ?? 'network'}) for a subscription`);
        }
      }
    }
    return delivered;
  }

  /** The Web Push call itself (encrypts and posts to the browser's push service). */
  protected deliver(
    target: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options: { TTL: number },
  ) {
    return webpush.sendNotification(target, payload, options);
  }

  /** E6a — the team members who muted this chat. */
  private async mutedIn(businessId: string, conversationId: string, userIds: string[]) {
    if (userIds.length === 0) return new Set<string>();
    const rows = await this.prisma.conversationPreference.findMany({
      where: {
        businessId,
        conversationId,
        userId: { in: userIds },
        mutedUntil: { gt: new Date() },
      },
      select: { userId: true },
    });
    return new Set(rows.map((r) => r.userId));
  }

  private async authorName(message: {
    businessId: string;
    authorUserId: string | null;
    authorCustomerId: string | null;
  }) {
    if (message.authorCustomerId) {
      const customer = await this.prisma.cliente.findFirst({
        where: { id: message.authorCustomerId, empresaId: message.businessId },
        select: { nombre: true },
      });
      return customer?.nombre ?? 'Un cliente';
    }
    if (message.authorUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: message.authorUserId },
        select: { nombre: true },
      });
      return user?.nombre ?? 'Alguien del equipo';
    }
    return 'Wapsell';
  }

  // ---------------------------------------------------------------- e-mail

  /**
   * One pass of the unread-customer-message e-mails. Returns how many were sent. Safe to
   * call concurrently (a pass already running makes the next one a no-op).
   */
  async emailUnread(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const due = await this.prisma.$queryRaw<DueAlert[]>`
        SELECT p.id AS "participantId", p."businessId", p."userId", p."conversationId",
               count(m.id)::int AS unread
        FROM "ConversationParticipant" p
        JOIN "Conversation" c ON c.id = p."conversationId" AND c."businessId" = p."businessId" AND c."deletedAt" IS NULL
        JOIN "Membership" mb ON mb."userId" = p."userId" AND mb."businessId" = p."businessId" AND mb.status = 'ACTIVE'
        LEFT JOIN "ConversationReadState" s ON s."participantId" = p.id
        JOIN "Message" m ON m."conversationId" = p."conversationId" AND m."businessId" = p."businessId"
        WHERE p."userId" IS NOT NULL AND p."leftAt" IS NULL AND p."removedAt" IS NULL
          AND m."authorCustomerId" IS NOT NULL AND m."deletedAt" IS NULL
          AND m."createdAt" >= p."joinedAt"
          AND m."createdAt" > COALESCE(s."lastReadAt", '-infinity'::timestamp)
          -- E6a: a muted chat sends no e-mail.
          AND NOT EXISTS (
            SELECT 1 FROM "ConversationPreference" cp
            WHERE cp."conversationId" = p."conversationId" AND cp."businessId" = p."businessId"
              AND cp."userId" = p."userId" AND cp."mutedUntil" > ${now}
          )
        GROUP BY p.id, p."businessId", p."userId", p."conversationId", s."lastAlertedAt"
        HAVING min(m."createdAt") <= ${new Date(now.getTime() - alertAfterMs())}
           AND (s."lastAlertedAt" IS NULL OR s."lastAlertedAt" < min(m."createdAt"))
        LIMIT 200`;
      let sent = 0;
      for (const alert of due) {
        // Someone looking at Wapsell already sees the count and hears the chime.
        if (this.isOnline(alert.businessId, { userId: alert.userId, customerId: null })) continue;
        if (await this.emailOne(alert, now)) sent += 1;
      }
      // Paquete 1 F1: customers with the store's answer unread.
      const replies = await this.prisma.$queryRaw<DueReply[]>`
        SELECT p.id AS "participantId", p."businessId", p."customerId", p."conversationId",
               count(m.id)::int AS unread
        FROM "ConversationParticipant" p
        JOIN "Conversation" c ON c.id = p."conversationId" AND c."businessId" = p."businessId" AND c."deletedAt" IS NULL
        LEFT JOIN "ConversationReadState" s ON s."participantId" = p.id
        JOIN "Message" m ON m."conversationId" = p."conversationId" AND m."businessId" = p."businessId"
        WHERE p."customerId" IS NOT NULL AND p."leftAt" IS NULL AND p."removedAt" IS NULL
          AND m."authorUserId" IS NOT NULL AND m."deletedAt" IS NULL
          AND m."createdAt" >= p."joinedAt"
          AND m."createdAt" > COALESCE(s."lastReadAt", '-infinity'::timestamp)
        GROUP BY p.id, p."businessId", p."customerId", p."conversationId", s."lastAlertedAt"
        HAVING min(m."createdAt") <= ${new Date(now.getTime() - alertAfterMs())}
           AND (s."lastAlertedAt" IS NULL OR s."lastAlertedAt" < min(m."createdAt"))
        LIMIT 200`;
      for (const reply of replies) {
        if (this.isOnline(reply.businessId, { userId: null, customerId: reply.customerId })) {
          continue;
        }
        if (await this.emailCustomer(reply, now)) sent += 1;
      }
      return sent;
    } finally {
      this.running = false;
    }
  }

  private async emailOne(alert: DueAlert, now: Date): Promise<boolean> {
    // Marked first: a slow or failing mail provider must never turn into repeated e-mails.
    await this.prisma.$executeRaw`
      INSERT INTO "ConversationReadState" (id, "participantId", "businessId", "lastAlertedAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${alert.participantId}, ${alert.businessId}, ${now}, now())
      ON CONFLICT ("participantId", "businessId") DO UPDATE SET "lastAlertedAt" = EXCLUDED."lastAlertedAt"`;

    const [user, business, newest] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: alert.userId },
        select: { email: true, nombre: true },
      }),
      this.prisma.empresa.findUnique({ where: { id: alert.businessId }, select: { nombre: true } }),
      this.prisma.message.findFirst({
        where: {
          conversationId: alert.conversationId,
          businessId: alert.businessId,
          deletedAt: null,
          authorCustomerId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          content: true,
          authorCustomerId: true,
          Attachment: { where: { deletedAt: null }, select: { mimeType: true, filename: true } },
        },
      }),
    ]);
    if (!user?.email || !newest?.authorCustomerId) return false;
    const customer = await this.prisma.cliente.findFirst({
      where: { id: newest.authorCustomerId, empresaId: alert.businessId },
      select: { nombre: true },
    });
    const mail = unreadEmail({
      personName: user.nombre,
      customerName: customer?.nombre ?? 'Un cliente',
      businessName: business?.nombre ?? 'tu negocio',
      unread: alert.unread,
      preview: notificationPreview(newest),
      link: `${webAppUrl()}/panel/mensajes?c=${alert.conversationId}`,
      afterMinutes: minutes(alertAfterMs()),
    });
    return this.email.send(user.email, mail.subject, mail.html);
  }

  /** Paquete 1 F1 — one e-mail to the customer about the store's unread answers. */
  private async emailCustomer(reply: DueReply, now: Date): Promise<boolean> {
    // Marked first, as for the team: never repeated e-mails.
    await this.prisma.$executeRaw`
      INSERT INTO "ConversationReadState" (id, "participantId", "businessId", "lastAlertedAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${reply.participantId}, ${reply.businessId}, ${now}, now())
      ON CONFLICT ("participantId", "businessId") DO UPDATE SET "lastAlertedAt" = EXCLUDED."lastAlertedAt"`;

    const [customer, business, newest] = await Promise.all([
      this.prisma.cliente.findFirst({
        where: { id: reply.customerId, empresaId: reply.businessId },
        select: { email: true, nombre: true },
      }),
      this.prisma.empresa.findUnique({
        where: { id: reply.businessId },
        select: { nombre: true, slug: true },
      }),
      this.prisma.message.findFirst({
        where: {
          conversationId: reply.conversationId,
          businessId: reply.businessId,
          deletedAt: null,
          authorUserId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          content: true,
          Attachment: { where: { deletedAt: null }, select: { mimeType: true, filename: true } },
        },
      }),
    ]);
    if (!customer?.email || !business || !newest) return false;
    const mail = replyEmail({
      customerName: customer.nombre,
      businessName: business.nombre,
      unread: reply.unread,
      preview: notificationPreview(newest),
      link: `${webAppUrl()}/tienda/${business.slug}/chat`,
    });
    return this.email.send(customer.email, mail.subject, mail.html);
  }
}
