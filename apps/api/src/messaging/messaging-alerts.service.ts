import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
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
 * Only team members are alerted, only about conversations they take part in.
 */

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

interface DueAlert {
  participantId: string;
  businessId: string;
  userId: string;
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

  /** This browser of this team member accepted push. A browser re-used by someone else moves to them. */
  async subscribe(
    context: BusinessContext,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<void> {
    if (!context.userId) return;
    await this.prisma.pushSubscription.upsert({
      where: {
        businessId_endpoint: { businessId: context.businessId, endpoint: subscription.endpoint },
      },
      create: {
        businessId: context.businessId,
        userId: context.userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        userId: context.userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async unsubscribe(context: BusinessContext, endpoint: string): Promise<void> {
    if (!context.userId) return;
    await this.prisma.pushSubscription.deleteMany({
      where: { businessId: context.businessId, userId: context.userId, endpoint },
    });
  }

  /**
   * A message was saved: push it to every other team member of the conversation who has no
   * Wapsell screen open. Best-effort; a browser that no longer exists is forgotten.
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
        content: true,
        deletedAt: true,
        Attachment: { where: { deletedAt: null }, select: { mimeType: true, filename: true } },
      },
    });
    if (!message || message.deletedAt) return 0;

    const recipients = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId: message.conversationId,
        businessId: message.businessId,
        leftAt: null,
        removedAt: null,
        userId: { not: null },
        Membership: { status: 'ACTIVE' },
      },
      select: { userId: true },
    });
    const away = recipients
      .map((r) => r.userId as string)
      .filter((userId) => userId !== message.authorUserId)
      .filter((userId) => !this.isOnline(message.businessId, { userId, customerId: null }));
    if (away.length === 0) return 0;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { businessId: message.businessId, userId: { in: away } },
    });
    if (subscriptions.length === 0) return 0;

    const title = await this.authorName(message);
    const payload = JSON.stringify({
      title,
      body: notificationPreview(message),
      url: `/panel/mensajes?c=${message.conversationId}`,
      tag: message.conversationId,
    });
    let delivered = 0;
    for (const subscription of subscriptions) {
      try {
        await this.deliver(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
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
}
