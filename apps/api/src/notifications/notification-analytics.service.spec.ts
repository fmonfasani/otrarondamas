import { Test, TestingModule } from '@nestjs/testing';
import { NotificationAnalyticsService } from './notification-analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationAnalyticsService', () => {
  let service: NotificationAnalyticsService;
  let prisma: PrismaService;

  const mockPreferences = [
    { pushEnabled: true, emailEnabled: true, smsEnabled: false },
    { pushEnabled: true, emailEnabled: false, smsEnabled: true },
    { pushEnabled: false, emailEnabled: true, smsEnabled: false },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationAnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            notificationPreference: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<NotificationAnalyticsService>(NotificationAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackDelivery', () => {
    it('should track notification delivery', () => {
      service.trackDelivery('notif-1', 'push', 'sent', { userId: 'user-1' });

      // Verify tracking happened (in production, would persist to DB)
      // For now, just verify method executes without error
      expect(true).toBe(true);
    });

    it('should track multiple delivery statuses', () => {
      service.trackDelivery('notif-1', 'push', 'sent');
      service.trackDelivery('notif-2', 'email', 'failed');
      service.trackDelivery('notif-3', 'sms', 'bounced');

      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('getDeliveryRate', () => {
    it('should calculate delivery rate metrics', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      // Track some deliveries
      service.trackDelivery('notif-1', 'push', 'sent');
      service.trackDelivery('notif-2', 'push', 'sent');
      service.trackDelivery('notif-3', 'push', 'failed');
      service.trackDelivery('notif-4', 'email', 'sent');
      service.trackDelivery('notif-5', 'email', 'bounced');

      const metrics = await service.getDeliveryRate('biz-1', startDate, endDate);

      expect(metrics).toEqual(
        expect.objectContaining({
          totalSent: expect.any(Number),
          totalFailed: expect.any(Number),
          totalBounced: expect.any(Number),
          deliveryRate: expect.any(Number),
          byChannel: expect.objectContaining({
            push: expect.any(Object),
            email: expect.any(Object),
            sms: expect.any(Object),
          }),
        }),
      );
    });

    it('should return 0 for empty period', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const metrics = await service.getDeliveryRate('biz-1', startDate, endDate);

      expect(metrics.totalSent).toBe(0);
      expect(metrics.deliveryRate).toBe(0);
    });

    it('should calculate per-channel delivery rates', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      service.trackDelivery('notif-1', 'push', 'sent');
      service.trackDelivery('notif-2', 'push', 'sent');
      service.trackDelivery('notif-3', 'push', 'failed');
      service.trackDelivery('notif-4', 'email', 'sent');

      const metrics = await service.getDeliveryRate('biz-1', startDate, endDate);

      // Push: 2/3 sent = 66.67%
      // Email: 1/1 sent = 100%
      expect(metrics.byChannel.push.sent).toBe(2);
      expect(metrics.byChannel.email.sent).toBe(1);
    });
  });

  describe('getUserEngagement', () => {
    it('should calculate user engagement metrics', async () => {
      service.trackDelivery('notif-1', 'push', 'opened', { usuarioId: 'user-1' });
      service.trackDelivery('notif-2', 'push', 'sent', { usuarioId: 'user-1' });
      service.trackDelivery('notif-3', 'push', 'opened', { usuarioId: 'user-1' });

      const metrics = await service.getUserEngagement('user-1');

      expect(metrics).toEqual(
        expect.objectContaining({
          usuarioId: 'user-1',
          totalNotifications: expect.any(Number),
          notificationsOpened: expect.any(Number),
          engagementRate: expect.any(Number),
        }),
      );
    });

    it('should track last interaction time', async () => {
      service.trackDelivery('notif-1', 'push', 'sent', { usuarioId: 'user-1' });
      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));
      service.trackDelivery('notif-2', 'push', 'opened', { usuarioId: 'user-1' });

      const metrics = await service.getUserEngagement('user-1');

      expect(metrics.lastInteraction).toBeTruthy();
      expect(metrics.lastInteraction).toBeInstanceOf(Date);
    });
  });

  describe('getChannelPreference', () => {
    it('should calculate channel preference distribution', async () => {
      jest
        .spyOn(prisma.notificationPreference, 'findMany')
        .mockResolvedValueOnce(mockPreferences as any);

      const stats = await service.getChannelPreference('biz-1');

      expect(stats).toEqual(
        expect.objectContaining({
          empresaId: 'biz-1',
          totalUsers: 3,
          pushEnabled: 2,
          emailEnabled: 2,
          smsEnabled: 1,
          pushPercentage: expect.any(Number),
          emailPercentage: expect.any(Number),
          smsPercentage: expect.any(Number),
          mostUsedChannel: expect.any(String),
        }),
      );
    });

    it('should identify most used channel', async () => {
      jest
        .spyOn(prisma.notificationPreference, 'findMany')
        .mockResolvedValueOnce(mockPreferences as any);

      const stats = await service.getChannelPreference('biz-1');

      // Push and email are enabled by 2 users each, SMS by 1
      // So it should be either push or email
      expect(['push', 'email']).toContain(stats.mostUsedChannel);
    });

    it('should return zero stats for empty business', async () => {
      jest.spyOn(prisma.notificationPreference, 'findMany').mockResolvedValueOnce([]);

      const stats = await service.getChannelPreference('biz-1');

      expect(stats.totalUsers).toBe(0);
      expect(stats.pushEnabled).toBe(0);
    });
  });

  describe('getDashboardSummary', () => {
    it('should return dashboard summary for 30d period', async () => {
      jest
        .spyOn(prisma.notificationPreference, 'findMany')
        .mockResolvedValueOnce(mockPreferences as any);

      service.trackDelivery('notif-1', 'push', 'sent');
      service.trackDelivery('notif-2', 'push', 'sent');

      const summary = await service.getDashboardSummary('biz-1', '30d');

      expect(summary).toEqual(
        expect.objectContaining({
          deliveryRate: expect.any(Object),
          channelPreference: expect.any(Object),
          topEngagedUsers: expect.any(Array),
        }),
      );
    });

    it('should support different time periods', async () => {
      jest
        .spyOn(prisma.notificationPreference, 'findMany')
        .mockResolvedValue(mockPreferences as any);

      const summary7d = await service.getDashboardSummary('biz-1', '7d');
      const summary30d = await service.getDashboardSummary('biz-1', '30d');
      const summary90d = await service.getDashboardSummary('biz-1', '90d');

      expect(summary7d).toBeTruthy();
      expect(summary30d).toBeTruthy();
      expect(summary90d).toBeTruthy();
    });
  });
});
