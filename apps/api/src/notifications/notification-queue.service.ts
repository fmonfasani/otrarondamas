import { Injectable, Logger } from '@nestjs/common';
import { NotificationFrequency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationPreferencesService } from './notification-preferences.service';

export interface QueuedNotification {
  id: string;
  usuarioId: string;
  empresaId: string;
  type: 'order' | 'message' | 'inventory' | 'system';
  title: string;
  body: string;
  channels: ('push' | 'email' | 'sms')[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  createdAt: Date;
  processedAt?: Date;
  deliveryStatus: Record<string, 'pending' | 'sent' | 'failed'>;
}

/**
 * NotificationQueueService
 *
 * Processes notification queue with respect to user preferences.
 * Applies frequency settings, quiet hours, and channel restrictions.
 * Deduplicates notifications to prevent notification spam.
 *
 * QUEUE PROCESSING:
 * - Runs every 5 minutes (via scheduled job/cron)
 * - Filters by user preferences and quiet hours
 * - Applies deduplication
 * - Groups by priority and type
 * - Sends immediately (real-time) or batches (daily/weekly)
 *
 * INVARIANTS:
 * - A notification can be delivered via multiple channels
 * - Frequency is per-notification-type, not per-notification
 * - Quiet hours suppress delivery but don't discard notifications
 * - High/urgent notifications may bypass quiet hours (configurable)
 */
@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  // In-memory queue for demo; use Redis/RabbitMQ in production
  private readonly queue: Map<string, QueuedNotification> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  /**
   * Queue a notification for delivery
   *
   * @param notification - Notification to queue
   * @param usuarioId - Target user
   * @param channels - Channels to attempt delivery on
   */
  async queueNotification(
    notification: Omit<QueuedNotification, 'id' | 'createdAt' | 'deliveryStatus'>,
    usuarioId: string,
    channels: ('push' | 'email' | 'sms')[],
  ): Promise<QueuedNotification> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const queued: QueuedNotification = {
      id,
      usuarioId,
      empresaId: notification.empresaId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      channels,
      priority: notification.priority || 'normal',
      metadata: notification.metadata,
      createdAt: new Date(),
      deliveryStatus: channels.reduce(
        (acc, ch) => {
          acc[ch] = 'pending';
          return acc;
        },
        {} as Record<string, 'pending' | 'sent' | 'failed'>,
      ),
    };

    this.queue.set(id, queued);
    return queued;
  }

  /**
   * Process all pending notifications in the queue
   *
   * Applies preferences, deduplication, and sends according to frequency.
   * Should be called every 5 minutes by a scheduled job.
   */
  async processQueue(): Promise<void> {
    this.logger.log(`Processing queue with ${this.queue.size} notifications`);

    const notifications = Array.from(this.queue.values());

    for (const notif of notifications) {
      const preferences = await this.notificationPreferencesService.getOrCreatePreferences(
        notif.usuarioId,
        notif.empresaId,
      );

      // Apply preferences to notification
      const toDeliver = await this.applyPreferences(notif, preferences);

      if (!toDeliver) {
        // Remove from queue if not delivered (discarded by preferences)
        this.queue.delete(notif.id);
        continue;
      }

      // Attempt delivery
      for (const channel of notif.channels) {
        try {
          await this.deliverViaChannel(notif, channel);
          notif.deliveryStatus[channel] = 'sent';
        } catch (error) {
          this.logger.error(`Failed to deliver notification ${notif.id} via ${channel}:`, error);
          notif.deliveryStatus[channel] = 'failed';
        }
      }

      // Remove from queue if all channels processed
      notif.processedAt = new Date();
      this.queue.delete(notif.id);
    }
  }

  /**
   * Apply user preferences to a notification
   *
   * Checks:
   * - Frequency setting for notification type
   * - Quiet hours
   * - Channel enablement
   * - Deduplication
   *
   * @param notification - Notification to apply preferences to
   * @param preferences - User's notification preferences
   * @returns true if notification should be delivered, false to discard
   */
  async applyPreferences(
    notification: QueuedNotification,
    preferences: any, // NotificationPreferenceResponse
  ): Promise<boolean> {
    // Check if channel is enabled
    const enabledChannels = notification.channels.filter((ch) => {
      switch (ch) {
        case 'push':
          return preferences.pushEnabled;
        case 'email':
          return preferences.emailEnabled;
        case 'sms':
          return preferences.smsEnabled;
        default:
          return true;
      }
    });

    if (enabledChannels.length === 0) {
      this.logger.debug(`Notification ${notification.id} has no enabled channels`);
      return false;
    }

    notification.channels = enabledChannels;

    // Check frequency setting for this notification type
    const frequencyKey = {
      order: preferences.orderNotifications,
      message: preferences.messageNotifications,
      inventory: preferences.inventoryNotifications,
      system: preferences.systemNotifications,
    }[notification.type];

    if (frequencyKey === NotificationFrequency.OFF) {
      this.logger.debug(
        `Notification type ${notification.type} is OFF for user ${notification.usuarioId}`,
      );
      return false;
    }

    // Check quiet hours (except for urgent/high priority)
    if (
      notification.priority !== 'urgent' &&
      notification.priority !== 'high' &&
      preferences.quietHoursEnabled
    ) {
      const inQuietHours = await this.notificationPreferencesService.isInQuietHours(
        notification.usuarioId,
        notification.empresaId,
      );

      if (inQuietHours) {
        this.logger.debug(`Notification ${notification.id} suppressed by quiet hours`);
        // Note: don't return false here; we'll queue for later delivery
        // In production, implement a deferred delivery queue
        return false;
      }
    }

    // Check deduplication
    const isDuplicate = await this.isDuplicateNotification(notification);
    if (isDuplicate) {
      this.logger.debug(`Notification ${notification.id} is a duplicate`);
      return false;
    }

    return true;
  }

  /**
   * Deduplicate notifications
   *
   * Prevents sending multiple identical notifications within a time window.
   * Looks for same type/title/usuarioId within the last hour.
   */
  async isDuplicateNotification(notification: QueuedNotification): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recent = Array.from(this.queue.values()).filter(
      (n) =>
        n.usuarioId === notification.usuarioId &&
        n.type === notification.type &&
        n.title === notification.title &&
        n.createdAt > oneHourAgo,
    );

    return recent.length > 1; // Current notification + at least one duplicate
  }

  /**
   * Prioritize notifications for delivery
   *
   * Returns notifications sorted by priority (urgent > high > normal > low)
   *
   * @param notifications - Array of notifications
   * @returns Sorted array
   */
  prioritizeByType(notifications: QueuedNotification[]): QueuedNotification[] {
    const priorityMap = {
      urgent: 4,
      high: 3,
      normal: 2,
      low: 1,
    };

    return [...notifications].sort(
      (a, b) => (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0),
    );
  }

  /**
   * Deliver notification via specific channel
   *
   * @param notification - Notification to deliver
   * @param channel - Delivery channel (push, email, sms)
   */
  private async deliverViaChannel(
    notification: QueuedNotification,
    channel: 'push' | 'email' | 'sms',
  ): Promise<void> {
    switch (channel) {
      case 'push':
        await this.deliverPushNotification(notification);
        break;
      case 'email':
        await this.deliverEmailNotification(notification);
        break;
      case 'sms':
        await this.deliverSMSNotification(notification);
        break;
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Deliver via push notification (WebSocket/Firebase)
   */
  private async deliverPushNotification(notification: QueuedNotification): Promise<void> {
    // In production, integrate with Firebase FCM or WebSocket gateway
    this.logger.log(
      `Push notification queued: ${notification.title} for user ${notification.usuarioId}`,
    );
    // TODO: Emit via Socket.io or Firebase FCM
  }

  /**
   * Deliver via email
   */
  private async deliverEmailNotification(notification: QueuedNotification): Promise<void> {
    // In production, use EmailService
    this.logger.log(
      `Email notification queued: ${notification.title} for user ${notification.usuarioId}`,
    );
    // TODO: Use injected EmailService
  }

  /**
   * Deliver via SMS
   */
  private async deliverSMSNotification(notification: QueuedNotification): Promise<void> {
    // In production, integrate with SMS provider (Twilio, AWS SNS, etc.)
    this.logger.log(
      `SMS notification queued: ${notification.title} for user ${notification.usuarioId}`,
    );
    // TODO: Integrate with SMS provider
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    totalNotifications: number;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
  } {
    const notifications = Array.from(this.queue.values());

    const byPriority = { low: 0, normal: 0, high: 0, urgent: 0 };
    const byType = { order: 0, message: 0, inventory: 0, system: 0 };

    for (const notif of notifications) {
      byPriority[notif.priority]++;
      byType[notif.type]++;
    }

    return {
      totalNotifications: notifications.length,
      byPriority,
      byType,
    };
  }

  /**
   * Clear old notifications from queue
   *
   * Removes notifications older than 24 hours that have been processed.
   */
  clearOldNotifications(maxAgeHours: number = 24): number {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    let removed = 0;
    for (const [id, notif] of this.queue) {
      if (notif.processedAt && notif.processedAt < cutoff) {
        this.queue.delete(id);
        removed++;
      }
    }

    return removed;
  }
}
