import { Test, TestingModule } from '@nestjs/testing';
import { EventTrackingService } from '../event-tracking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackEventDto } from '../dto/track-event.dto';

describe('EventTrackingService (Unit)', () => {
  let service: EventTrackingService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventTrackingService,
        {
          provide: PrismaService,
          useValue: {
            analyticsEvent: {
              create: jest.fn(),
              createMany: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EventTrackingService>(EventTrackingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    if (service) {
      service.stopQueueProcessor();
    }
  });

  describe('trackEvent', () => {
    it('should create an AnalyticsEvent with valid payload', async () => {
      const dto: TrackEventDto = {
        eventType: 'PAGE_VIEW',
        eventName: 'home_viewed',
        category: 'navigation',
        metadata: { page: '/' },
      };

      const mockEvent = {
        id: 'event-1',
        empresaId: 'company-1',
        userId: 'user-1',
        ...dto,
        timestamp: new Date(),
        sessionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.analyticsEvent, 'create').mockResolvedValue(mockEvent);

      const result = await service.trackEvent(dto, 'company-1', 'user-1');

      expect(result).toEqual(mockEvent);
      expect(prismaService.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            empresaId: 'company-1',
            userId: 'user-1',
            eventType: 'PAGE_VIEW',
            eventName: 'home_viewed',
          }),
        }),
      );
    });

    it('should return undefined and log error on database failure', async () => {
      const dto: TrackEventDto = {
        eventType: 'PAGE_VIEW',
        eventName: 'test',
      };

      jest.spyOn(prismaService.analyticsEvent, 'create').mockRejectedValue(new Error('DB Error'));

      const result = await service.trackEvent(dto, 'company-1');

      expect(result).toBeUndefined();
    });
  });

  describe('trackPageView', () => {
    it('should track a page view event', async () => {
      const mockEvent = {
        id: 'event-1',
        empresaId: 'company-1',
        userId: 'user-1',
        eventType: 'PAGE_VIEW',
        eventName: 'page_viewed_home',
        category: 'navigation',
        metadata: { page: 'home' },
        sessionId: 'session-1',
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.analyticsEvent, 'create').mockResolvedValue(mockEvent);

      await service.trackPageView('session-1', 'home', 'user-1', 'company-1');

      expect(prismaService.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'PAGE_VIEW',
            eventName: 'page_viewed_home',
            sessionId: 'session-1',
          }),
        }),
      );
    });
  });

  describe('trackConversion', () => {
    it('should track a conversion event with value', async () => {
      const mockEvent = {
        id: 'event-1',
        empresaId: 'company-1',
        userId: 'user-1',
        eventType: 'CONVERSION',
        eventName: 'order_completed',
        category: 'sales',
        metadata: { value: 100 },
        sessionId: null,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.analyticsEvent, 'create').mockResolvedValue(mockEvent);

      await service.trackConversion('order_completed', 100, 'company-1', 'user-1');

      expect(prismaService.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'CONVERSION',
            eventName: 'order_completed',
          }),
        }),
      );
    });
  });

  describe('trackError', () => {
    it('should track an error event with stack trace', async () => {
      const mockEvent = {
        id: 'event-1',
        empresaId: 'company-1',
        userId: undefined,
        eventType: 'ERROR',
        eventName: 'validation_error',
        category: 'errors',
        metadata: {
          message: 'Invalid email',
          stack: 'Error: Invalid email\n  at ...',
        },
        sessionId: null,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.analyticsEvent, 'create').mockResolvedValue(mockEvent);

      await service.trackError(
        'validation_error',
        'Invalid email',
        'company-1',
        undefined,
        'Error: Invalid email\n  at ...',
      );

      expect(prismaService.analyticsEvent.create).toHaveBeenCalled();
    });
  });

  describe('trackPerformance', () => {
    it('should track a performance metric', async () => {
      const mockEvent = {
        id: 'event-1',
        empresaId: 'company-1',
        userId: undefined,
        eventType: 'PERFORMANCE',
        eventName: 'api_latency',
        category: 'performance',
        metadata: { duration: 150, tags: { endpoint: '/api/users' } },
        sessionId: null,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.analyticsEvent, 'create').mockResolvedValue(mockEvent);

      await service.trackPerformance('api_latency', 150, 'company-1', { endpoint: '/api/users' });

      expect(prismaService.analyticsEvent.create).toHaveBeenCalled();
    });
  });

  describe('queueEvent', () => {
    it('should add event to in-memory queue', () => {
      service.queueEvent('company-1', 'PAGE_VIEW', 'home_viewed', 'user-1');
      expect(service.getQueueSize()).toBe(1);
    });

    it('should queue multiple events', () => {
      service.queueEvent('company-1', 'PAGE_VIEW', 'home_viewed', 'user-1');
      service.queueEvent('company-1', 'CONVERSION', 'order_completed', 'user-1');
      expect(service.getQueueSize()).toBe(2);
    });
  });

  describe('processEventQueue', () => {
    it('should batch insert queued events', async () => {
      service.queueEvent('company-1', 'PAGE_VIEW', 'home_viewed', 'user-1', 'navigation');
      service.queueEvent('company-1', 'PAGE_VIEW', 'products_viewed', 'user-1', 'navigation');

      jest.spyOn(prismaService.analyticsEvent, 'createMany').mockResolvedValue({ count: 2 });

      const flushed = await service.flushQueue();

      expect(flushed).toBe(2);
      expect(prismaService.analyticsEvent.createMany).toHaveBeenCalled();
    });

    it('should deduplicate events by sessionId + eventName', async () => {
      service.queueEvent(
        'company-1',
        'PAGE_VIEW',
        'home_viewed',
        'user-1',
        undefined,
        undefined,
        'session-1',
      );
      service.queueEvent(
        'company-1',
        'PAGE_VIEW',
        'home_viewed',
        'user-1',
        undefined,
        undefined,
        'session-1',
      );

      jest.spyOn(prismaService.analyticsEvent, 'createMany').mockResolvedValue({ count: 1 });

      const flushed = await service.flushQueue();

      expect(flushed).toBe(1);
    });
  });

  describe('getEventsByDateRange', () => {
    it('should return events within date range', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      const mockEvents = [
        {
          id: 'event-1',
          empresaId: 'company-1',
          eventType: 'PAGE_VIEW',
          eventName: 'home_viewed',
          userId: 'user-1',
          category: 'navigation',
          metadata: null,
          sessionId: null,
          timestamp: new Date('2026-01-15'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prismaService.analyticsEvent, 'findMany').mockResolvedValue(mockEvents);

      const events = await service.getEventsByDateRange('company-1', startDate, endDate);

      expect(events).toEqual(mockEvents);
      expect(prismaService.analyticsEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            empresaId: 'company-1',
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });
  });

  describe('getEventCount', () => {
    it('should return count of events for company', async () => {
      jest.spyOn(prismaService.analyticsEvent, 'count').mockResolvedValue(42);

      const count = await service.getEventCount('company-1');

      expect(count).toBe(42);
    });

    it('should filter by eventType if provided', async () => {
      jest.spyOn(prismaService.analyticsEvent, 'count').mockResolvedValue(10);

      const count = await service.getEventCount('company-1', 'PAGE_VIEW');

      expect(count).toBe(10);
      expect(prismaService.analyticsEvent.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            empresaId: 'company-1',
            eventType: 'PAGE_VIEW',
          }),
        }),
      );
    });
  });
});
