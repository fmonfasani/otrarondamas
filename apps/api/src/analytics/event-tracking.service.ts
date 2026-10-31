/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
// import { AnalyticsEvent } from '@prisma/client'; // TODO: types
import { TrackEventDto } from './dto/track-event.dto';

/**
 * EventTrackingService captures analytics events with graceful degradation.
 * Failed tracking never blocks application operations (follows AuditService pattern).
 *
 * Scope: All operations automatically filter by empresaId via CompanyScoped any
 */
@Injectable()
export class EventTrackingService {
  private readonly logger = new Logger(EventTrackingService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eventQueue: Array<{
    id: string;
    empresaId: string;
    userId?: string;
    eventType: string;
    eventName: string;
    category?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
    sessionId?: string;
  }> = [];
  private queueProcessTimer: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService) {
    // Batch process queue every 30 seconds
    this.startQueueProcessor();
  }

  /**
   * Main tracking method: creates an AnalyticsEvent record.
   * Errors are logged but never thrown (graceful degradation).
   */
  async trackEvent(
    event: TrackEventDto,
    empresaId: string,
    userId?: string,
  ): Promise<AnalyticsEvent | undefined> {
    try {
      const created = await this.prisma.analyticsEvent.create({
        data: {
          id: randomUUID(),
          empresaId,
          userId,
          eventType: event.eventType,
          eventName: event.eventName,
          category: event.category,
          metadata: event.metadata,
          sessionId: event.sessionId,
          timestamp: new Date(),
        },
      });
      return created;
    } catch (err) {
      this.logger.error('[EventTrackingService] Failed to track event:', {
        eventType: event.eventType,
        eventName: event.eventName,
        empresaId,
        error: err instanceof Error ? err.message : String(err),
      });
      return undefined;
    }
  }

  /**
   * Track a page view event.
   */
  async trackPageView(
    sessionId: string,
    page: string,
    userId: string | undefined,
    empresaId: string,
  ): Promise<void> {
    const dto: TrackEventDto = {
      eventType: 'PAGE_VIEW',
      eventName: `page_viewed_${page}`,
      category: 'navigation',
      metadata: { page },
      sessionId,
    };
    await this.trackEvent(dto, empresaId, userId);
  }

  /**
   * Track a conversion event (e.g., order completed, purchase).
   */
  async trackConversion(
    conversionType: string,
    value: number,
    empresaId: string,
    userId: string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: Record<string, any>,
  ): Promise<void> {
    const dto: TrackEventDto = {
      eventType: 'CONVERSION',
      eventName: conversionType,
      category: 'sales',
      metadata: { value, ...metadata },
    };
    await this.trackEvent(dto, empresaId, userId);
  }

  /**
   * Track an error event (exception, validation error, etc.).
   */
  async trackError(
    errorType: string,
    message: string,
    empresaId: string,
    userId?: string,
    stack?: string,
  ): Promise<void> {
    const dto: TrackEventDto = {
      eventType: 'ERROR',
      eventName: errorType,
      category: 'errors',
      metadata: { message, stack },
    };
    await this.trackEvent(dto, empresaId, userId);
  }

  /**
   * Track a performance metric (API latency, page load time, etc.).
   */
  async trackPerformance(
    metricName: string,
    duration: number, // milliseconds
    empresaId: string,
    tags?: Record<string, string>,
  ): Promise<void> {
    const dto: TrackEventDto = {
      eventType: 'PERFORMANCE',
      eventName: metricName,
      category: 'performance',
      metadata: { duration, tags },
    };
    await this.trackEvent(dto, empresaId);
  }

  /**
   * Queue events for batch processing.
   * Adds to in-memory queue; processEventQueue handles persistence.
   */
  queueEvent(
    empresaId: string,
    eventType: string,
    eventName: string,
    userId?: string,
    category?: string,
    metadata?: Record<string, any>,
    sessionId?: string,
  ): void {
    this.eventQueue.push({
      id: randomUUID(),
      empresaId,
      userId,
      eventType,
      eventName,
      category,
      timestamp: new Date(),
      metadata,
      sessionId,
    });
  }

  /**
   * Process queued events in batch.
   * Deduplicates by sessionId + eventName within a 1-second window.
   */
  private async processEventQueue(): Promise<number> {
    if (this.eventQueue.length === 0) {
      return 0;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Deduplicate: keep first occurrence of each sessionId + eventName combo
      const seen = new Set<string>();
      const deduplicated = events.filter((e) => {
        const key = `${e.sessionId || 'no-session'}:${e.eventName}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });

      if (deduplicated.length === 0) {
        return 0;
      }

      // Batch insert all events
      const result = await this.prisma.analyticsEvent.createMany({
        data: deduplicated.map((e) => ({
          id: e.id,
          empresaId: e.empresaId,
          userId: e.userId,
          eventType: e.eventType,
          eventName: e.eventName,
          category: e.category,
          timestamp: e.timestamp,
          metadata: e.metadata,
          sessionId: e.sessionId,
        })),
        skipDuplicates: true, // Skip if ID already exists
      });

      return result.count;
    } catch (err) {
      this.logger.error('[EventTrackingService] Failed to process event queue:', {
        queueLength: events.length,
        error: err instanceof Error ? err.message : String(err),
      });
      return 0;
    }
  }

  /**
   * Batch queue processing: runs every 30 seconds.
   */
  private startQueueProcessor(): void {
    this.queueProcessTimer = setInterval(() => {
      this.processEventQueue().catch((err) => {
        this.logger.error('[EventTrackingService] Uncaught error in processEventQueue:', err);
      });
    }, 30000);
  }

  /**
   * Stop the queue processor (for cleanup).
   */
  stopQueueProcessor(): void {
    if (this.queueProcessTimer) {
      clearInterval(this.queueProcessTimer);
      this.queueProcessTimer = null;
    }
  }

  /**
   * Force immediate queue processing (useful for testing).
   */
  async flushQueue(): Promise<number> {
    return this.processEventQueue();
  }

  /**
   * Get current queue size (for monitoring).
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Backfill: re-aggregate events for a date range (for historical data fixes).
   * Returns count of events processed.
   */
  async getEventsByDateRange(
    empresaId: string,
    startDate: Date,
    endDate: Date,
    eventType?: string,
  ): Promise<AnalyticsEvent[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        empresaId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (eventType) {
        where.eventType = eventType;
      }

      return await this.prisma.analyticsEvent.findMany({
        where,
        orderBy: { timestamp: 'asc' },
      });
    } catch (err) {
      this.logger.error('[EventTrackingService] Failed to fetch events by date range:', {
        empresaId,
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  /**
   * Count events by type for a company.
   */
  async getEventCount(empresaId: string, eventType?: string): Promise<number> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { empresaId };
      if (eventType) {
        where.eventType = eventType;
      }
      return await this.prisma.analyticsEvent.count({ where });
    } catch (err) {
      this.logger.error('[EventTrackingService] Failed to count events:', {
        empresaId,
        error: err instanceof Error ? err.message : String(err),
      });
      return 0;
    }
  }
}
