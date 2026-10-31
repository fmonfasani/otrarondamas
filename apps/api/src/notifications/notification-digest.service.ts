import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DigestPeriod, NotificationDigest, Prisma } from '@prisma/client'; // TODO: types
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import type { BusinessContext } from '../business-context/business-context.types';

export interface DigestSummary {
  orders: number;
  messages: number;
  inventory: number;
  [key: string]: number;
}

export interface DigestContent {
  usuarioId: string;
  empresaId: string;
  period: DigestPeriod;
  startDate: Date;
  endDate: Date;
  summary: DigestSummary;
  items: DigestItem[];
}

export interface DigestItem {
  type: 'order' | 'message' | 'inventory';
  title: string;
  description: string;
  timestamp: Date;
  link?: string;
}

export interface NotificationDigestResponse {
  id: string;
  usuarioId: string;
  empresaId: string;
  period: DigestPeriod;
  startDate: Date;
  endDate: Date;
  summary: any;
  content: string;
  sentAt: Date | null;
  openedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * NotificationDigestService
 *
 * Manages notification digest batching and scheduling.
 * Groups notifications by type and period, generates HTML digest content,
 * and sends via email at preferred times.
 *
 * INVARIANTS:
 * - Each digest covers a specific date range (startDate to endDate)
 * - Summary is stored as JSON with counts by notification type
 * - Digest periods align to calendar boundaries (daily 00:00-23:59, etc.)
 * - Frequency is determined by user preferences in NotificationPreferenceService
 */
@Injectable()
export class NotificationDigestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Create or get existing digest for a user in a period
   *
   * @param usuarioId - Usuario ID
   * @param empresaId - Empresa/Business ID
   * @param period - Digest period (daily, weekly, monthly)
   * @returns Digest object
   */
  async getOrCreateDigest(
    usuarioId: string,
    empresaId: string,
    period: DigestPeriod,
  ): Promise<NotificationDigestResponse> {
    const { startDate, endDate } = this.getPeriodBoundaries(new Date(), period);

    // Try to find existing unsent digest for this period
    const existing = await this.prisma.notificationDigest.findFirst({
      where: {
        usuarioId,
        empresaId,
        period,
        startDate,
        endDate,
        sentAt: null,
      },
    });

    if (existing) {
      return this.mapToResponse(existing);
    }

    // Create new digest
    const created = await this.prisma.notificationDigest.create({
      data: {
        usuarioId,
        empresaId,
        period,
        startDate,
        endDate,
        summary: { orders: 0, messages: 0, inventory: 0 },
        content: '',
      },
    });

    return this.mapToResponse(created);
  }

  /**
   * Batch notifications for a user by type and period
   *
   * Groups pending notifications and updates digest with summary counts.
   *
   * @param usuarioId - Usuario ID
   * @param period - Digest period
   * @returns Updated digest with batched notifications
   */
  async batchNotifications(
    usuarioId: string,
    empresaId: string,
    period: DigestPeriod,
  ): Promise<NotificationDigestResponse> {
    const digest = await this.getOrCreateDigest(usuarioId, empresaId, period);

    // In a full implementation, this would query a Notification table
    // grouped by type within the period. For now, we'll update summary structure.
    // TODO: Integrate with Notification queue when that table is created

    const summary: DigestSummary = {
      orders: 0,
      messages: 0,
      inventory: 0,
    };

    const updated = await this.prisma.notificationDigest.update({
      where: { id: digest.id },
      data: {
        summary: summary as any,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Generate HTML digest content
   *
   * Creates formatted HTML email content for digest distribution.
   *
   * @param usuarioId - Usuario ID
   * @param period - Digest period
   * @returns HTML content string
   */
  async generateDigest(
    usuarioId: string,
    empresaId: string,
    period: DigestPeriod,
  ): Promise<string> {
    const digest = await this.getOrCreateDigest(usuarioId, empresaId, period);
    const summary = digest.summary as DigestSummary;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f5f5f5; padding: 15px; border-radius: 5px; }
    .section { margin-top: 20px; }
    .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
    .item { padding: 10px; border-left: 3px solid #007bff; margin-bottom: 10px; }
    .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Notificaciones Resumidas</h1>
      <p>Periodo: ${this.formatDateRange(digest.startDate, digest.endDate)}</p>
    </div>

    ${
      summary.orders > 0
        ? `
    <div class="section">
      <div class="section-title">Órdenes (${summary.orders})</div>
      <p>Tienes ${summary.orders} nuevas órdenes en este período.</p>
    </div>
    `
        : ''
    }

    ${
      summary.messages > 0
        ? `
    <div class="section">
      <div class="section-title">Mensajes (${summary.messages})</div>
      <p>Tienes ${summary.messages} nuevos mensajes sin leer.</p>
    </div>
    `
        : ''
    }

    ${
      summary.inventory > 0
        ? `
    <div class="section">
      <div class="section-title">Inventario (${summary.inventory})</div>
      <p>Hay ${summary.inventory} alertas de inventario.</p>
    </div>
    `
        : ''
    }

    <div class="footer">
      <p>Este es un resumen automático. Configura tus preferencias de notificaciones en tu perfil.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Update digest with generated content
    await this.prisma.notificationDigest.update({
      where: { id: digest.id },
      data: { content: html },
    });

    return html;
  }

  /**
   * Send digest email to user
   *
   * @param usuarioId - Usuario ID
   * @param period - Digest period
   */
  async sendDigestEmail(
    usuarioId: string,
    empresaId: string,
    period: DigestPeriod,
  ): Promise<NotificationDigestResponse> {
    const digest = await this.getOrCreateDigest(usuarioId, empresaId, period);

    if (!digest.content) {
      await this.generateDigest(usuarioId, empresaId, period);
    }

    // Fetch user email
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario || !usuario.email) {
      throw new BadRequestException('Usuario email not found');
    }

    // Send email
    try {
      await this.emailService.send(
        usuario.email,
        `Resumen de Notificaciones - ${period}`,
        digest.content,
      );

      // Mark as sent
      const updated = await this.prisma.notificationDigest.update({
        where: { id: digest.id },
        data: { sentAt: new Date() },
      });

      return this.mapToResponse(updated);
    } catch (error) {
      throw new BadRequestException(`Failed to send digest email: ${error}`);
    }
  }

  /**
   * Get digest preview for user (without sending)
   *
   * @param usuarioId - Usuario ID
   * @param period - Digest period
   * @returns Preview HTML
   */
  async getDigestPreview(
    usuarioId: string,
    empresaId: string,
    period: DigestPeriod,
  ): Promise<string> {
    return this.generateDigest(usuarioId, empresaId, period);
  }

  /**
   * Mark digest as opened
   *
   * @param digestId - Digest ID
   */
  async markDigestAsOpened(digestId: string): Promise<NotificationDigestResponse> {
    const digest = await this.prisma.notificationDigest.findUnique({
      where: { id: digestId },
    });

    if (!digest) {
      throw new NotFoundException('Digest not found');
    }

    const updated = await this.prisma.notificationDigest.update({
      where: { id: digestId },
      data: { openedAt: new Date() },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Get user's digests for a date range
   *
   * @param usuarioId - Usuario ID
   * @param empresaId - Empresa ID
   * @param startDate - Start date filter
   * @param endDate - End date filter
   * @returns Array of digests
   */
  async getUserDigests(
    usuarioId: string,
    empresaId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<NotificationDigestResponse[]> {
    const where:  any = {
      usuarioId,
      empresaId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as any).gte = startDate;
      if (endDate) (where.createdAt as any).lte = endDate;
    }

    const digests = await this.prisma.notificationDigest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return digests.map((d) => this.mapToResponse(d));
  }

  /**
   * Schedule digest sends (typically called by cron job)
   *
   * For each user with a matching digest frequency, generates and sends digest
   * at their preferred time.
   *
   * @param period - Digest period to send
   */
  async scheduleDigestSends(period: DigestPeriod): Promise<void> {
    // Get all users with this digest frequency
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { digestFrequency: period },
      distinct: ['usuarioId', 'empresaId'],
    });

    for (const pref of preferences) {
      // Check if it's time to send (based on digestTime)
      const shouldSend = this.shouldSendNow(pref.digestTime);

      if (shouldSend) {
        try {
          await this.sendDigestEmail(pref.usuarioId, pref.empresaId, period);
        } catch (error) {
          console.error(`Failed to send digest for user ${pref.usuarioId}:`, error);
        }
      }
    }
  }

  /**
   * Private helpers
   */

  private mapToResponse(digest: NotificationDigest): NotificationDigestResponse {
    return {
      id: digest.id,
      usuarioId: digest.usuarioId,
      empresaId: digest.empresaId,
      period: digest.period,
      startDate: digest.startDate,
      endDate: digest.endDate,
      summary: digest.summary,
      content: digest.content,
      sentAt: digest.sentAt,
      openedAt: digest.openedAt,
      createdAt: digest.createdAt,
      updatedAt: digest.updatedAt,
    };
  }

  private getPeriodBoundaries(
    date: Date,
    period: DigestPeriod,
  ): { startDate: Date; endDate: Date } {
    const d = new Date(date);

    switch (period) {
      case DigestPeriod.DAILY:
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        return { startDate: dayStart, endDate: dayEnd };

      case DigestPeriod.WEEKLY:
        const dayOfWeek = d.getDay();
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - dayOfWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        return { startDate: weekStart, endDate: weekEnd };

      case DigestPeriod.MONTHLY:
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        return { startDate: monthStart, endDate: monthEnd };

      default:
        throw new BadRequestException(`Unknown period: ${period}`);
    }
  }

  private formatDateRange(start: Date, end: Date): string {
    const startStr = start.toLocaleDateString('es-AR');
    const endStr = end.toLocaleDateString('es-AR');
    return `${startStr} - ${endStr}`;
  }

  private shouldSendNow(digestTime: string): boolean {
    const [prefHour, prefMin] = digestTime.split(':').map(Number);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Send if current time is within a 1-hour window of preferred time
    return currentHour === prefHour && currentMin >= prefMin && currentMin < prefMin + 60;
  }
}
