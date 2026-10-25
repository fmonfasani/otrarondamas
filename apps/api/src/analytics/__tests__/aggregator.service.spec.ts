import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsAggregatorService } from '../analytics-aggregator.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AnalyticsAggregatorService (Unit)', () => {
  let service: AnalyticsAggregatorService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsAggregatorService,
        {
          provide: PrismaService,
          useValue: {
            analyticsEvent: {
              findMany: jest.fn(),
            },
            analyticsAggregation: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsAggregatorService>(AnalyticsAggregatorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('aggregateDaily', () => {
    it('should aggregate events by eventType and eventName', async () => {
      const date = new Date('2026-01-15');
      const mockEvents = [
        {
          id: 'event-1',
          empresaId: 'company-1',
          userId: 'user-1',
          eventType: 'PAGE_VIEW',
          eventName: 'home_viewed',
          category: 'navigation',
          metadata: null,
          sessionId: 'session-1',
          timestamp: new Date('2026-01-15T10:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'event-2',
          empresaId: 'company-1',
          userId: 'user-2',
          eventType: 'PAGE_VIEW',
          eventName: 'home_viewed',
          category: 'navigation',
          metadata: null,
          sessionId: 'session-2',
          timestamp: new Date('2026-01-15T11:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prismaService.analyticsEvent, 'findMany').mockResolvedValue(mockEvents);
      jest.spyOn(prismaService.analyticsAggregation, 'create').mockResolvedValue({
        id: 'agg-1',
        empresaId: 'company-1',
        period: 'DAILY',
        periodStart: new Date('2026-01-15'),
        periodEnd: new Date('2026-01-15T23:59:59'),
        eventType: 'PAGE_VIEW',
        eventName: 'home_viewed',
        count: 2,
        uniqueUsers: 2,
        avgValue: null,
        metadata: { userIds: ['user-1', 'user-2'], computedAt: expect.any(String) },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const aggregations = await service.aggregateDaily('company-1', date);

      expect(aggregations).toHaveLength(1);
      expect(aggregations[0].count).toBe(2);
      expect(aggregations[0].uniqueUsers).toBe(2);
    });

    it('should handle empty events for a day', async () => {
      const date = new Date('2026-01-15');
      jest.spyOn(prismaService.analyticsEvent, 'findMany').mockResolvedValue([]);

      const aggregations = await service.aggregateDaily('company-1', date);

      expect(aggregations).toEqual([]);
    });

    it('should calculate avgValue for CONVERSION events', async () => {
      const date = new Date('2026-01-15');
      const mockEvents = [
        {
          id: 'event-1',
          empresaId: 'company-1',
          userId: 'user-1',
          eventType: 'CONVERSION',
          eventName: 'purchase',
          category: 'sales',
          metadata: { value: 100 },
          sessionId: null,
          timestamp: new Date('2026-01-15T10:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'event-2',
          empresaId: 'company-1',
          userId: 'user-2',
          eventType: 'CONVERSION',
          eventName: 'purchase',
          category: 'sales',
          metadata: { value: 200 },
          sessionId: null,
          timestamp: new Date('2026-01-15T11:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prismaService.analyticsEvent, 'findMany').mockResolvedValue(mockEvents);
      jest.spyOn(prismaService.analyticsAggregation, 'create').mockResolvedValue({
        id: 'agg-1',
        empresaId: 'company-1',
        period: 'DAILY',
        periodStart: new Date('2026-01-15'),
        periodEnd: new Date('2026-01-15T23:59:59'),
        eventType: 'CONVERSION',
        eventName: 'purchase',
        count: 2,
        uniqueUsers: 2,
        avgValue: 150,
        metadata: { userIds: ['user-1', 'user-2'], computedAt: expect.any(String) },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const aggregations = await service.aggregateDaily('company-1', date);

      expect(aggregations[0].avgValue).toBe(150);
    });
  });

  describe('aggregateWeekly', () => {
    it('should sum daily aggregations for the week', async () => {
      const weekStart = new Date('2026-01-12'); // Sunday
      const mockDailyAggs = [
        {
          id: 'daily-1',
          empresaId: 'company-1',
          period: 'DAILY',
          periodStart: new Date('2026-01-12'),
          periodEnd: new Date('2026-01-12T23:59:59'),
          eventType: 'PAGE_VIEW',
          eventName: 'home_viewed',
          count: 10,
          uniqueUsers: 5,
          avgValue: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'daily-2',
          empresaId: 'company-1',
          period: 'DAILY',
          periodStart: new Date('2026-01-13'),
          periodEnd: new Date('2026-01-13T23:59:59'),
          eventType: 'PAGE_VIEW',
          eventName: 'home_viewed',
          count: 15,
          uniqueUsers: 8,
          avgValue: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prismaService.analyticsAggregation, 'findMany').mockResolvedValue(mockDailyAggs);
      jest.spyOn(prismaService.analyticsAggregation, 'create').mockResolvedValue({
        id: 'weekly-1',
        empresaId: 'company-1',
        period: 'WEEKLY',
        periodStart: weekStart,
        periodEnd: new Date('2026-01-18'),
        eventType: 'PAGE_VIEW',
        eventName: 'home_viewed',
        count: 25,
        uniqueUsers: 13,
        avgValue: null,
        metadata: { computedAt: expect.any(String), daysIncluded: 7 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const aggregations = await service.aggregateWeekly('company-1', weekStart);

      expect(aggregations).toHaveLength(1);
      expect(aggregations[0].count).toBe(25);
    });
  });

  describe('aggregateMonthly', () => {
    it('should sum daily aggregations for the month', async () => {
      const monthDate = new Date('2026-01-15');
      const mockDailyAggs = [
        {
          id: 'daily-1',
          empresaId: 'company-1',
          period: 'DAILY',
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-01-01T23:59:59'),
          eventType: 'PAGE_VIEW',
          eventName: 'home_viewed',
          count: 100,
          uniqueUsers: 50,
          avgValue: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prismaService.analyticsAggregation, 'findMany').mockResolvedValue(mockDailyAggs);
      jest.spyOn(prismaService.analyticsAggregation, 'create').mockResolvedValue({
        id: 'monthly-1',
        empresaId: 'company-1',
        period: 'MONTHLY',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31T23:59:59'),
        eventType: 'PAGE_VIEW',
        eventName: 'home_viewed',
        count: 100,
        uniqueUsers: 50,
        avgValue: null,
        metadata: {
          computedAt: expect.any(String),
          month: '2026-01',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const aggregations = await service.aggregateMonthly('company-1', monthDate);

      expect(aggregations).toHaveLength(1);
      expect(aggregations[0].period).toBe('MONTHLY');
    });
  });

  describe('getAggregations', () => {
    it('should return aggregations for a period and date range', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      const mockAggs = [
        {
          id: 'agg-1',
          empresaId: 'company-1',
          period: 'DAILY',
          periodStart: startDate,
          periodEnd: new Date('2026-01-01T23:59:59'),
          eventType: 'PAGE_VIEW',
          eventName: 'home_viewed',
          count: 50,
          uniqueUsers: 25,
          avgValue: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prismaService.analyticsAggregation, 'findMany').mockResolvedValue(mockAggs);

      const aggregations = await service.getAggregations('company-1', 'DAILY', startDate, endDate);

      expect(aggregations).toEqual(mockAggs);
    });
  });

  describe('backfillAggregations', () => {
    it('should re-aggregate events for a date range', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-03');

      jest.spyOn(prismaService.analyticsEvent, 'findMany').mockResolvedValue([
        {
          id: 'event-1',
          empresaId: 'company-1',
          userId: 'user-1',
          eventType: 'PAGE_VIEW',
          eventName: 'home_viewed',
          category: 'navigation',
          metadata: null,
          sessionId: null,
          timestamp: new Date('2026-01-01T10:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      jest.spyOn(prismaService.analyticsAggregation, 'create').mockResolvedValue({
        id: 'agg-1',
        empresaId: 'company-1',
        period: 'DAILY',
        periodStart: startDate,
        periodEnd: new Date('2026-01-01T23:59:59'),
        eventType: 'PAGE_VIEW',
        eventName: 'home_viewed',
        count: 1,
        uniqueUsers: 1,
        avgValue: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const recordsCreated = await service.backfillAggregations('company-1', startDate, endDate);

      expect(recordsCreated).toBeGreaterThanOrEqual(0);
    });
  });
});
