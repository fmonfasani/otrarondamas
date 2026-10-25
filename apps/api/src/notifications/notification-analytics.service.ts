import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationDeliveryRecord {
  notificationId: string;
  channel: 'push' | 'email' | 'sms';
  status: 'sent' | 'failed' | 'bounced' | 'opened';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface DeliveryRateMetrics {
  period: string;
  totalSent: number;
  totalFailed: number;
  totalBounced: number;
  deliveryRate: number; // Percentage
  byChannel: Record<string, DeliveryChannelMetrics>;
}

export interface DeliveryChannelMetrics {
  sent: number;
  failed: number;
  bounced: number;
  deliveryRate: number;
}

export interface UserEngagementMetrics {
  usuarioId: string;
  totalNotifications: number;
  notificationsOpened: number;
  engagementRate: number;
  preferredChannel: 'push' | 'email' | 'sms' | null;
  lastInteraction: Date | null;
}

export interface ChannelPreferenceStats {
  empresaId: string;
  totalUsers: number;
  pushEnabled: number;
  emailEnabled: number;
  smsEnabled: number;
  pushPercentage: number;
  emailPercentage: number;
  smsPercentage: number;
  mostUsedChannel: 'push' | 'email' | 'sms';
}

/**
 * NotificationAnalyticsService
 *
 * Tracks notification delivery metrics and user engagement.
 * Provides analytics for delivery rates, channel usage, and user preferences.
 *
 * METRICS TRACKED:
 * - Delivery status per channel
 * - Delivery success rates
 * - User engagement (opens, clicks)
 * - Channel preferences distribution
 * - Bounce and failure rates
 */
@Injectable()
export class NotificationAnalyticsService {
  // In-memory store for demo; use database or analytics platform in production
  private readonly deliveryRecords: NotificationDeliveryRecord[] = [];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Track notification delivery attempt
   *
   * @param notificationId - Unique notification ID
   * @param channel - Delivery channel
   * @param status - Delivery status
   * @param metadata - Additional tracking data
   */
  trackDelivery(
    notificationId: string,
    channel: 'push' | 'email' | 'sms',
    status: 'sent' | 'failed' | 'bounced' | 'opened',
    metadata?: Record<string, any>,
  ): void {
    const record: NotificationDeliveryRecord = {
      notificationId,
      channel,
      status,
      timestamp: new Date(),
      metadata,
    };

    this.deliveryRecords.push(record);

    // In production, persist to database or analytics platform
    // await this.prisma.notificationDeliveryLog.create({ data: record });
  }

  /**
   * Get delivery rate metrics for a period
   *
   * @param empresaId - Business ID
   * @param startDate - Period start
   * @param endDate - Period end
   * @returns Delivery metrics
   */
  async getDeliveryRate(
    empresaId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DeliveryRateMetrics> {
    // Filter records by date range
    const records = this.deliveryRecords.filter(
      (r) => r.timestamp >= startDate && r.timestamp <= endDate,
    );

    // Calculate aggregates
    const totalSent = records.filter((r) => r.status === 'sent').length;
    const totalFailed = records.filter((r) => r.status === 'failed').length;
    const totalBounced = records.filter((r) => r.status === 'bounced').length;
    const totalAttempts = records.length;

    const deliveryRate = totalAttempts > 0 ? ((totalSent / totalAttempts) * 100).toFixed(2) : 0;

    // By channel
    const byChannel: Record<string, DeliveryChannelMetrics> = {};
    for (const channel of ['push', 'email', 'sms'] as const) {
      const channelRecords = records.filter((r) => r.channel === channel);
      const sent = channelRecords.filter((r) => r.status === 'sent').length;
      const failed = channelRecords.filter((r) => r.status === 'failed').length;
      const bounced = channelRecords.filter((r) => r.status === 'bounced').length;
      const attempts = channelRecords.length;

      byChannel[channel] = {
        sent,
        failed,
        bounced,
        deliveryRate: attempts > 0 ? Number(((sent / attempts) * 100).toFixed(2)) : 0,
      };
    }

    return {
      period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      totalSent,
      totalFailed,
      totalBounced,
      deliveryRate: Number(deliveryRate),
      byChannel,
    };
  }

  /**
   * Get user engagement metrics
   *
   * Measures how many notifications a user opens/interacts with.
   *
   * @param usuarioId - User ID
   * @returns Engagement statistics
   */
  async getUserEngagement(usuarioId: string): Promise<UserEngagementMetrics> {
    // In production, query from notification delivery logs
    const records = this.deliveryRecords; // Placeholder

    const userRecords = records.filter((r) => r.metadata?.usuarioId === usuarioId);

    const totalNotifications = userRecords.length;
    const notificationsOpened = userRecords.filter((r) => r.status === 'opened').length;

    const engagementRate =
      totalNotifications > 0 ? ((notificationsOpened / totalNotifications) * 100).toFixed(2) : 0;

    // Find most used channel
    const byChannel = { push: 0, email: 0, sms: 0 };
    for (const record of userRecords) {
      byChannel[record.channel]++;
    }

    const preferredChannel = Object.entries(byChannel).reduce((a, b) =>
      b[1] > a[1] ? b : a,
    )[0] as 'push' | 'email' | 'sms' | null;

    const lastInteraction = userRecords.length
      ? new Date(Math.max(...userRecords.map((r) => r.timestamp.getTime())))
      : null;

    return {
      usuarioId,
      totalNotifications,
      notificationsOpened,
      engagementRate: Number(engagementRate),
      preferredChannel: preferredChannel || null,
      lastInteraction,
    };
  }

  /**
   * Get channel preferences distribution for a business
   *
   * Shows what percentage of users prefer each channel.
   *
   * @param empresaId - Business ID
   * @returns Channel preference statistics
   */
  async getChannelPreference(empresaId: string): Promise<ChannelPreferenceStats> {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { empresaId },
      select: {
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: true,
      },
    });

    const totalUsers = preferences.length;

    if (totalUsers === 0) {
      return {
        empresaId,
        totalUsers: 0,
        pushEnabled: 0,
        emailEnabled: 0,
        smsEnabled: 0,
        pushPercentage: 0,
        emailPercentage: 0,
        smsPercentage: 0,
        mostUsedChannel: 'email',
      };
    }

    const pushCount = preferences.filter((p) => p.pushEnabled).length;
    const emailCount = preferences.filter((p) => p.emailEnabled).length;
    const smsCount = preferences.filter((p) => p.smsEnabled).length;

    const mostUsedChannel = [
      { channel: 'push', count: pushCount },
      { channel: 'email', count: emailCount },
      { channel: 'sms', count: smsCount },
    ].reduce((a, b) => (b.count > a.count ? b : a)).channel as 'push' | 'email' | 'sms';

    return {
      empresaId,
      totalUsers,
      pushEnabled: pushCount,
      emailEnabled: emailCount,
      smsEnabled: smsCount,
      pushPercentage: (pushCount / totalUsers) * 100,
      emailPercentage: (emailCount / totalUsers) * 100,
      smsPercentage: (smsCount / totalUsers) * 100,
      mostUsedChannel,
    };
  }

  /**
   * Get analytics summary for dashboard
   *
   * @param empresaId - Business ID
   * @param period - Time period (last 7 days, 30 days, etc.)
   */
  async getDashboardSummary(
    empresaId: string,
    period: '7d' | '30d' | '90d' = '30d',
  ): Promise<{
    deliveryRate: DeliveryRateMetrics;
    channelPreference: ChannelPreferenceStats;
    topEngagedUsers: UserEngagementMetrics[];
  }> {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
    }

    const deliveryRate = await this.getDeliveryRate(empresaId, startDate, endDate);

    const channelPreference = await this.getChannelPreference(empresaId);

    // Get top engaged users (placeholder)
    const topEngagedUsers: UserEngagementMetrics[] = [];

    return {
      deliveryRate,
      channelPreference,
      topEngagedUsers,
    };
  }
}
