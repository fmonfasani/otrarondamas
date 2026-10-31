import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  NotificationPreference,
  NotificationFrequency,
  DigestPeriod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { BusinessContext } from '../business-context/business-context.types';

export interface UpdateNotificationPreferencesDto {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  orderNotifications?: NotificationFrequency;
  messageNotifications?: NotificationFrequency;
  inventoryNotifications?: NotificationFrequency;
  systemNotifications?: NotificationFrequency;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  digestFrequency?: DigestPeriod;
  digestTime?: string;
}

export interface NotificationPreferenceResponse {
  id: string;
  usuarioId: string;
  empresaId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  orderNotifications: NotificationFrequency;
  messageNotifications: NotificationFrequency;
  inventoryNotifications: NotificationFrequency;
  systemNotifications: NotificationFrequency;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  digestFrequency: DigestPeriod;
  digestTime: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * NotificationPreferencesService
 *
 * Manages user notification settings and preferences for a tenant.
 * Enforces business context scoping: users can only manage preferences for their own business.
 *
 * INVARIANTS:
 * - Each (usuarioId, empresaId) pair has at most one preference record
 * - Quiet hours must be in HH:MM 24-hour format
 * - Digest time must be in HH:MM 24-hour format
 * - Frequency enums are validated by Prisma
 */
@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get notification preferences for a user in a business
   *
   * @param usuarioId - Usuario ID
   * @param empresaId - Empresa/Business ID
   * @param context - Business context for authorization check
   * @returns Notification preference object or throws NotFoundException
   */
  async getUserPreferences(
    usuarioId: string,
    empresaId: string,
    context: BusinessContext,
  ): Promise<NotificationPreferenceResponse> {
    // Authorization: user can only access their own preferences
    if (context.userId !== usuarioId) {
      throw new ForbiddenException('Cannot access notification preferences for another user');
    }

    // Tenant scoping: verify usuario belongs to the requested empresa
    if (context.businessId !== empresaId) {
      throw new ForbiddenException('Cannot access preferences outside your business context');
    }

    const preferences = await this.prisma.notificationPreference.findUnique({
      where: {
        usuarioId_empresaId: {
          usuarioId,
          empresaId,
        },
      },
    });

    if (!preferences) {
      throw new NotFoundException('Notification preferences not found for this user');
    }

    return this.mapToResponse(preferences);
  }

  /**
   * Get or create default preferences for a user
   *
   * @param usuarioId - Usuario ID
   * @param empresaId - Empresa/Business ID
   * @returns Existing or newly created preference object
   */
  async getOrCreatePreferences(
    usuarioId: string,
    empresaId: string,
  ): Promise<NotificationPreferenceResponse> {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: {
        usuarioId_empresaId: {
          usuarioId,
          empresaId,
        },
      },
    });

    if (existing) {
      return this.mapToResponse(existing);
    }

    // Create with defaults
    const created = await this.prisma.notificationPreference.create({
      data: {
        usuarioId,
        empresaId,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        orderNotifications: NotificationFrequency.REAL_TIME,
        messageNotifications: NotificationFrequency.REAL_TIME,
        inventoryNotifications: NotificationFrequency.DAILY,
        systemNotifications: NotificationFrequency.REAL_TIME,
        quietHoursEnabled: false,
        digestFrequency: DigestPeriod.DAILY,
        digestTime: '09:00',
      },
    });

    return this.mapToResponse(created);
  }

  /**
   * Update notification preferences for a user
   *
   * @param usuarioId - Usuario ID
   * @param empresaId - Empresa/Business ID
   * @param updates - Partial preference updates
   * @param context - Business context for authorization
   * @returns Updated preference object
   */
  async updatePreferences(
    usuarioId: string,
    empresaId: string,
    updates: UpdateNotificationPreferencesDto,
    context: BusinessContext,
  ): Promise<NotificationPreferenceResponse> {
    // Authorization checks
    if (context.userId !== usuarioId) {
      throw new ForbiddenException('Cannot update notification preferences for another user');
    }

    if (context.businessId !== empresaId) {
      throw new ForbiddenException('Cannot update preferences outside your business context');
    }

    // Validate time formats if provided
    if (updates.quietHoursStart && !this.isValidTimeFormat(updates.quietHoursStart)) {
      throw new BadRequestException('quietHoursStart must be in HH:MM format (24-hour)');
    }

    if (updates.quietHoursEnd && !this.isValidTimeFormat(updates.quietHoursEnd)) {
      throw new BadRequestException('quietHoursEnd must be in HH:MM format (24-hour)');
    }

    if (updates.digestTime && !this.isValidTimeFormat(updates.digestTime)) {
      throw new BadRequestException('digestTime must be in HH:MM format (24-hour)');
    }

    // Ensure preferences exist or create with defaults
    await this.getOrCreatePreferences(usuarioId, empresaId);

    const updated = await this.prisma.notificationPreference.update({
      where: {
        usuarioId_empresaId: {
          usuarioId,
          empresaId,
        },
      },
      data: updates as  any,
    });

    return this.mapToResponse(updated);
  }

  /**
   * Get preferences by notification type
   *
   * @param usuarioId - Usuario ID
   * @param empresaId - Empresa/Business ID
   * @param type - Notification type (order, message, inventory, system)
   * @returns Frequency setting for the type
   */
  async getPreferenceByType(
    usuarioId: string,
    empresaId: string,
    type: 'order' | 'message' | 'inventory' | 'system',
  ): Promise<NotificationFrequency> {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: {
        usuarioId_empresaId: {
          usuarioId,
          empresaId,
        },
      },
      select: {
        orderNotifications: type === 'order',
        messageNotifications: type === 'message',
        inventoryNotifications: type === 'inventory',
        systemNotifications: type === 'system',
      } as any,
    });

    if (!preferences) {
      // Return default for requested type
      const defaults = {
        order: NotificationFrequency.REAL_TIME,
        message: NotificationFrequency.REAL_TIME,
        inventory: NotificationFrequency.DAILY,
        system: NotificationFrequency.REAL_TIME,
      };
      return defaults[type];
    }

    const typeMap = {
      order: 'orderNotifications',
      message: 'messageNotifications',
      inventory: 'inventoryNotifications',
      system: 'systemNotifications',
    };

    return preferences[typeMap[type]];
  }

  /**
   * Get preferences by channel (push, email, sms)
   *
   * @param usuarioId - Usuario ID
   * @param empresaId - Empresa/Business ID
   * @param channel - Notification channel
   * @returns Whether channel is enabled
   */
  async getPreferenceByChannel(
    usuarioId: string,
    empresaId: string,
    channel: 'push' | 'email' | 'sms',
  ): Promise<boolean> {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: {
        usuarioId_empresaId: {
          usuarioId,
          empresaId,
        },
      },
      select: {
        pushEnabled: channel === 'push',
        emailEnabled: channel === 'email',
        smsEnabled: channel === 'sms',
      } as any,
    });

    if (!preferences) {
      // Return default for channel
      const defaults = {
        push: true,
        email: true,
        sms: false,
      };
      return defaults[channel];
    }

    const channelMap = {
      push: 'pushEnabled',
      email: 'emailEnabled',
      sms: 'smsEnabled',
    };

    return preferences[channelMap[channel]];
  }

  /**
   * Set notification frequency for a specific type
   *
   * @param usuarioId - Usuario ID
   * @param empresaId - Empresa/Business ID
   * @param type - Notification type
   * @param frequency - Frequency setting
   * @param context - Business context
   */
  async setFrequency(
    usuarioId: string,
    empresaId: string,
    type: 'order' | 'message' | 'inventory' | 'system',
    frequency: NotificationFrequency,
    context: BusinessContext,
  ): Promise<NotificationPreferenceResponse> {
    const typeFieldMap = {
      order: 'orderNotifications',
      message: 'messageNotifications',
      inventory: 'inventoryNotifications',
      system: 'systemNotifications',
    };

    const updateData = {
      [typeFieldMap[type]]: frequency,
    };

    return this.updatePreferences(usuarioId, empresaId, updateData as any, context);
  }

  /**
   * Set quiet hours (no notifications during this period)
   *
   * @param usuarioId - Usuario ID
   * @param empresaId - Empresa/Business ID
   * @param startTime - Start time in HH:MM format (e.g., "22:00")
   * @param endTime - End time in HH:MM format (e.g., "08:00")
   * @param context - Business context
   */
  async setQuietHours(
    usuarioId: string,
    empresaId: string,
    startTime: string,
    endTime: string,
    context: BusinessContext,
  ): Promise<NotificationPreferenceResponse> {
    if (!this.isValidTimeFormat(startTime)) {
      throw new BadRequestException('startTime must be in HH:MM format (24-hour)');
    }

    if (!this.isValidTimeFormat(endTime)) {
      throw new BadRequestException('endTime must be in HH:MM format (24-hour)');
    }

    return this.updatePreferences(
      usuarioId,
      empresaId,
      {
        quietHoursEnabled: true,
        quietHoursStart: startTime,
        quietHoursEnd: endTime,
      },
      context,
    );
  }

  /**
   * Disable quiet hours
   */
  async disableQuietHours(
    usuarioId: string,
    empresaId: string,
    context: BusinessContext,
  ): Promise<NotificationPreferenceResponse> {
    return this.updatePreferences(
      usuarioId,
      empresaId,
      {
        quietHoursEnabled: false,
      },
      context,
    );
  }

  /**
   * Check if current time is within quiet hours
   *
   * @param usuarioId - Usuario ID
   * @param empresaId - Empresa/Business ID
   * @returns true if currently in quiet hours, false otherwise
   */
  async isInQuietHours(usuarioId: string, empresaId: string): Promise<boolean> {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: {
        usuarioId_empresaId: {
          usuarioId,
          empresaId,
        },
      },
      select: {
        quietHoursEnabled: true,
        quietHoursStart: true,
        quietHoursEnd: true,
      },
    });

    if (
      !preferences ||
      !preferences.quietHoursEnabled ||
      !preferences.quietHoursStart ||
      !preferences.quietHoursEnd
    ) {
      return false;
    }

    return this.isTimeInRange(
      this.getCurrentTime(),
      preferences.quietHoursStart,
      preferences.quietHoursEnd,
    );
  }

  /**
   * Private helpers
   */

  private mapToResponse(preference: NotificationPreference): NotificationPreferenceResponse {
    return {
      id: preference.id,
      usuarioId: preference.usuarioId,
      empresaId: preference.empresaId,
      pushEnabled: preference.pushEnabled,
      emailEnabled: preference.emailEnabled,
      smsEnabled: preference.smsEnabled,
      orderNotifications: preference.orderNotifications,
      messageNotifications: preference.messageNotifications,
      inventoryNotifications: preference.inventoryNotifications,
      systemNotifications: preference.systemNotifications,
      quietHoursEnabled: preference.quietHoursEnabled,
      quietHoursStart: preference.quietHoursStart,
      quietHoursEnd: preference.quietHoursEnd,
      digestFrequency: preference.digestFrequency,
      digestTime: preference.digestTime,
      createdAt: preference.createdAt,
      updatedAt: preference.updatedAt,
    };
  }

  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  private getCurrentTime(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
    const [currentHours, currentMins] = currentTime.split(':').map(Number);
    const [startHours, startMins] = startTime.split(':').map(Number);
    const [endHours, endMins] = endTime.split(':').map(Number);

    const currentTotalMins = currentHours * 60 + currentMins;
    const startTotalMins = startHours * 60 + startMins;
    const endTotalMins = endHours * 60 + endMins;

    // Handle cases where end time is on next day (e.g., 22:00 to 08:00)
    if (startTotalMins <= endTotalMins) {
      return currentTotalMins >= startTotalMins && currentTotalMins <= endTotalMins;
    } else {
      return currentTotalMins >= startTotalMins || currentTotalMins <= endTotalMins;
    }
  }
}
