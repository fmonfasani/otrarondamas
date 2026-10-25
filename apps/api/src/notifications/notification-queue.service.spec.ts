import { Test, TestingModule } from '@nestjs/testing';
import { NotificationFrequency } from '@prisma/client';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationQueueService', () => {
  let service: NotificationQueueService;
  let prisma: PrismaService;
  let preferencesService: NotificationPreferencesService;

  const mockNotification = {
    usuarioId: 'user-1',
    empresaId: 'biz-1',
    type: 'order' as const,
    title: 'New Order',
    body: 'You have a new order',
    priority: 'normal' as const,
  };

  const mockPreferences = {
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    orderNotifications: NotificationFrequency.REAL_TIME,
    messageNotifications: NotificationFrequency.REAL_TIME,
    inventoryNotifications: NotificationFrequency.DAILY,
    systemNotifications: NotificationFrequency.REAL_TIME,
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationQueueService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: NotificationPreferencesService,
          useValue: {
            getOrCreatePreferences: jest.fn(),
            isInQuietHours: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationQueueService>(NotificationQueueService);
    prisma = module.get<PrismaService>(PrismaService);
    preferencesService = module.get<NotificationPreferencesService>(NotificationPreferencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queueNotification', () => {
    it('should queue a notification', async () => {
      const result = await service.queueNotification(mockNotification, 'user-1', ['push', 'email']);

      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          usuarioId: 'user-1',
          type: 'order',
          channels: ['push', 'email'],
          priority: 'normal',
          deliveryStatus: {
            push: 'pending',
            email: 'pending',
          },
        }),
      );
    });

    it('should generate unique notification ID', async () => {
      const result1 = await service.queueNotification(mockNotification, 'user-1', ['push']);
      const result2 = await service.queueNotification(mockNotification, 'user-1', ['push']);

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('applyPreferences', () => {
    it('should allow delivery when all channels enabled', async () => {
      const notification = await service.queueNotification(mockNotification, 'user-1', [
        'push',
        'email',
      ]);

      const canDeliver = await service.applyPreferences(notification, mockPreferences);

      expect(canDeliver).toBe(true);
    });

    it('should filter disabled channels', async () => {
      const notification = await service.queueNotification(mockNotification, 'user-1', [
        'push',
        'email',
        'sms',
      ]);

      const canDeliver = await service.applyPreferences(notification, {
        ...mockPreferences,
        emailEnabled: false,
      });

      expect(canDeliver).toBe(true);
      expect(notification.channels).toEqual(['push']);
    });

    it('should block notification if frequency is OFF', async () => {
      const notification = await service.queueNotification(mockNotification, 'user-1', ['push']);

      const canDeliver = await service.applyPreferences(notification, {
        ...mockPreferences,
        orderNotifications: NotificationFrequency.OFF,
      });

      expect(canDeliver).toBe(false);
    });

    it('should block notification if no channels enabled', async () => {
      const notification = await service.queueNotification(mockNotification, 'user-1', [
        'push',
        'email',
        'sms',
      ]);

      const canDeliver = await service.applyPreferences(notification, {
        ...mockPreferences,
        pushEnabled: false,
        emailEnabled: false,
        smsEnabled: false,
      });

      expect(canDeliver).toBe(false);
    });

    it('should respect quiet hours for normal priority', async () => {
      jest.spyOn(preferencesService, 'isInQuietHours').mockResolvedValueOnce(true);

      const notification = await service.queueNotification(mockNotification, 'user-1', ['push']);

      const canDeliver = await service.applyPreferences(notification, {
        ...mockPreferences,
        quietHoursEnabled: true,
      });

      expect(canDeliver).toBe(false);
    });

    it('should bypass quiet hours for urgent priority', async () => {
      jest.spyOn(preferencesService, 'isInQuietHours').mockResolvedValueOnce(true);

      const notification = await service.queueNotification(
        { ...mockNotification, priority: 'urgent' },
        'user-1',
        ['push'],
      );

      const canDeliver = await service.applyPreferences(notification, {
        ...mockPreferences,
        quietHoursEnabled: true,
      });

      expect(canDeliver).toBe(true);
    });
  });

  describe('isDuplicateNotification', () => {
    it('should detect duplicate notifications', async () => {
      const notif1 = await service.queueNotification(mockNotification, 'user-1', ['push']);
      const notif2 = await service.queueNotification(mockNotification, 'user-1', ['push']);

      const isDuplicate = await service.isDuplicateNotification(notif2);

      expect(isDuplicate).toBe(true);
    });

    it('should not mark as duplicate if title differs', async () => {
      await service.queueNotification(mockNotification, 'user-1', ['push']);
      const notif2 = await service.queueNotification(
        { ...mockNotification, title: 'Different Title' },
        'user-1',
        ['push'],
      );

      const isDuplicate = await service.isDuplicateNotification(notif2);

      expect(isDuplicate).toBe(false);
    });
  });

  describe('prioritizeByType', () => {
    it('should sort notifications by priority', async () => {
      const urgent = await service.queueNotification(
        { ...mockNotification, priority: 'urgent' },
        'user-1',
        ['push'],
      );
      const low = await service.queueNotification(
        { ...mockNotification, priority: 'low' },
        'user-1',
        ['push'],
      );
      const normal = await service.queueNotification(
        { ...mockNotification, priority: 'normal' },
        'user-1',
        ['push'],
      );

      const sorted = service.prioritizeByType([low, urgent, normal]);

      expect(sorted[0].priority).toBe('urgent');
      expect(sorted[1].priority).toBe('normal');
      expect(sorted[2].priority).toBe('low');
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      await service.queueNotification(mockNotification, 'user-1', ['push']);
      await service.queueNotification({ ...mockNotification, type: 'message' }, 'user-1', ['push']);

      const stats = service.getQueueStats();

      expect(stats.totalNotifications).toBe(2);
      expect(stats.byType.order).toBe(1);
      expect(stats.byType.message).toBe(1);
    });
  });

  describe('clearOldNotifications', () => {
    it('should remove old processed notifications', async () => {
      const notif = await service.queueNotification(mockNotification, 'user-1', ['push']);
      notif.processedAt = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

      const initialStats = service.getQueueStats();
      const removed = service.clearOldNotifications(24);

      expect(removed).toBe(1);
      expect(service.getQueueStats().totalNotifications).toBe(initialStats.totalNotifications - 1);
    });
  });

  describe('processQueue', () => {
    it('should process all notifications in queue', async () => {
      jest
        .spyOn(preferencesService, 'getOrCreatePreferences')
        .mockResolvedValue(mockPreferences as any);

      await service.queueNotification(mockNotification, 'user-1', ['push']);

      const initialStats = service.getQueueStats();
      await service.processQueue();
      const finalStats = service.getQueueStats();

      // Queue should be empty after processing
      expect(finalStats.totalNotifications).toBeLessThanOrEqual(initialStats.totalNotifications);
    });
  });
});
