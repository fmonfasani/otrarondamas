import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import { monitorEventLoopDelay, type IntervalHistogram } from 'node:perf_hooks';
import { PrismaService } from '../prisma/prisma.service';
import { percentile, routeSummary, type RouteSample } from './performance-math';

/** Rendimiento (Owner, 2026-11-26): 30 days of minutes. */
export const KEEP_DAYS = 30;
const MINUTE_MS = 60_000;
/** Enough samples to read the percentiles of a busy minute without keeping every request. */
const MAX_SAMPLES = 20_000;

export type LiveNumbers = {
  requests: number;
  errors4xx: number;
  errors5xx: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  online: number;
};

/**
 * Rendimiento — measures how the platform answers, minute by minute, and keeps it 30 days
 * (PerformanceMinute): every HTTP request (route pattern, never ids or data), the API process
 * (CPU, memory, event loop), the server (load, memory, disk), the database (ping, connections)
 * and the chat (messages, the team's reply time, people online, push).
 *
 * Platform-wide and anonymous: it never records who asked nor which business; it uses the
 * system database client on purpose (ADR-DAT-019 allowlist).
 */
@Injectable()
export class PerformanceCollector implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PerformanceCollector.name);
  private samples: RouteSample[] = [];
  private seen = 0;
  private errors4xx = 0;
  private errors5xx = 0;
  private pushOk = 0;
  private pushFailed = 0;
  private minuteStart = Date.now();
  private cpuMark = process.cpuUsage();
  private loop: IntervalHistogram | null = null;
  private timer: NodeJS.Timeout | null = null;
  private onlineGauge: () => number = () => 0;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.PERFORMANCE_METRICS === 'off') return;
    this.loop = monitorEventLoopDelay({ resolution: 20 });
    this.loop.enable();
    // On the minute, so rows line up with the clock.
    const wait = MINUTE_MS - (Date.now() % MINUTE_MS);
    this.minuteStart = Date.now() - (Date.now() % MINUTE_MS);
    this.timer = setTimeout(() => {
      void this.flush();
      this.timer = setInterval(() => void this.flush(), MINUTE_MS);
      this.timer.unref();
    }, wait);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.loop?.disable();
  }

  /** One HTTP request: its route pattern (`/messaging/conversations/:id`), status and time. */
  record(route: string, status: number, ms: number) {
    this.seen += 1;
    if (status >= 500) this.errors5xx += 1;
    else if (status >= 400) this.errors4xx += 1;
    const sample = { route, ms, error: status >= 500 };
    if (this.samples.length < MAX_SAMPLES) this.samples.push(sample);
    else {
      // Reservoir: every request has the same chance to be kept in a very busy minute.
      const at = randomInt(this.seen);
      if (at < MAX_SAMPLES) this.samples[at] = sample;
    }
  }

  /** A push notification went out (or failed). */
  push(ok: boolean) {
    if (ok) this.pushOk += 1;
    else this.pushFailed += 1;
  }

  /** How many people have a Wapsell screen open (the chat's realtime connections). */
  useOnline(gauge: () => number) {
    this.onlineGauge = gauge;
  }

  /** The minute so far, for the live view. */
  live(): LiveNumbers {
    const times = this.samples.map((s) => s.ms).sort((a, b) => a - b);
    return {
      requests: this.seen,
      errors4xx: this.errors4xx,
      errors5xx: this.errors5xx,
      p50Ms: percentile(times, 0.5),
      p95Ms: percentile(times, 0.95),
      p99Ms: percentile(times, 0.99),
      maxMs: times.at(-1) ?? 0,
      online: this.onlineGauge(),
    };
  }

  /** The server and the process right now (also part of each minute). */
  async system() {
    const elapsedMs = Math.max(1, Date.now() - this.minuteStart);
    const cpu = process.cpuUsage(this.cpuMark);
    const memory = await availableMemory();
    const disk = await fs.statfs('/').catch(() => null);
    return {
      cpuPct: round(((cpu.user + cpu.system) / 1000 / elapsedMs) * 100),
      rssMb: round(process.memoryUsage().rss / 1024 / 1024),
      loopP99Ms: round((this.loop?.percentile(99) ?? 0) / 1e6),
      load1: round(os.loadavg()[0]),
      cores: os.cpus().length,
      memPct: round(((memory.total - memory.available) / memory.total) * 100),
      memTotalGb: round(memory.total / 1024 ** 3),
      diskPct: disk ? round(((disk.blocks - disk.bavail) / disk.blocks) * 100) : 0,
      diskTotalGb: disk ? round((disk.blocks * disk.bsize) / 1024 ** 3) : 0,
    };
  }

  /** The database: how long a trivial question takes, and how many connections are open. */
  async database() {
    const started = performance.now();
    await this.prisma.$queryRaw`SELECT 1`;
    const pingMs = round(performance.now() - started);
    const [row] = await this.prisma.$queryRaw<Array<{ conns: number }>>`
      SELECT count(*)::int AS conns FROM pg_stat_activity WHERE datname = current_database()`;
    return { dbPingMs: pingMs, dbConns: Number(row?.conns ?? 0) };
  }

  /**
   * The chat in a window: messages written by people (not system notices nor automatic
   * answers), and how long the team took to answer a customer — from the first unanswered
   * customer message to the team's reply.
   */
  async chat(from: Date, to: Date) {
    const [counts] = await this.prisma.$queryRaw<Array<{ messages: number }>>`
      SELECT count(*)::int AS messages FROM "Message"
      WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        AND type <> 'SYSTEM' AND NOT automatic`;
    const [reply] = await this.prisma.$queryRaw<Array<{ p50: number | null; p95: number | null }>>`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY waited) AS p50,
             percentile_cont(0.95) WITHIN GROUP (ORDER BY waited) AS p95
      FROM (
        SELECT extract(epoch FROM (r."createdAt" - q.asked)) * 1000 AS waited
        FROM "Message" r
        JOIN LATERAL (
          SELECT min(c."createdAt") AS asked FROM "Message" c
          WHERE c."conversationId" = r."conversationId" AND c."businessId" = r."businessId"
            AND c."authorCustomerId" IS NOT NULL AND c."deletedAt" IS NULL
            AND c."createdAt" < r."createdAt"
            AND c."createdAt" > COALESCE((
              SELECT max(s."createdAt") FROM "Message" s
              WHERE s."conversationId" = r."conversationId" AND s."businessId" = r."businessId"
                AND s."authorUserId" IS NOT NULL AND s.type <> 'SYSTEM' AND NOT s.automatic
                AND s."createdAt" < r."createdAt"
            ), '-infinity'::timestamp)
        ) q ON q.asked IS NOT NULL
        WHERE r."createdAt" >= ${from} AND r."createdAt" < ${to}
          AND r."authorUserId" IS NOT NULL AND r.type <> 'SYSTEM' AND NOT r.automatic
      ) answered`;
    return {
      messages: Number(counts?.messages ?? 0),
      replyP50Ms: reply?.p50 == null ? null : round(Number(reply.p50)),
      replyP95Ms: reply?.p95 == null ? null : round(Number(reply.p95)),
    };
  }

  /** Closes the minute: saves its row, starts the next one, and forgets rows over 30 days. */
  async flush(now = Date.now()) {
    const at = new Date(this.minuteStart);
    const end = new Date(now - (now % MINUTE_MS));
    const samples = this.samples;
    const counts = {
      seen: this.seen,
      e4: this.errors4xx,
      e5: this.errors5xx,
      ok: this.pushOk,
      ko: this.pushFailed,
    };
    const live = this.live();
    try {
      const [system, database, chat] = await Promise.all([
        this.system(),
        this.database(),
        this.chat(at, end),
      ]);
      const times = samples.map((s) => s.ms).sort((a, b) => a - b);
      await this.prisma.performanceMinute.upsert({
        where: { at },
        create: {
          at,
          requests: counts.seen,
          errors4xx: counts.e4,
          errors5xx: counts.e5,
          p50Ms: percentile(times, 0.5),
          p95Ms: percentile(times, 0.95),
          p99Ms: percentile(times, 0.99),
          maxMs: times.at(-1) ?? 0,
          cpuPct: system.cpuPct,
          rssMb: system.rssMb,
          loopP99Ms: system.loopP99Ms,
          load1: system.load1,
          memPct: system.memPct,
          diskPct: system.diskPct,
          dbPingMs: database.dbPingMs,
          dbConns: database.dbConns,
          messages: chat.messages,
          replyP50Ms: chat.replyP50Ms,
          replyP95Ms: chat.replyP95Ms,
          online: live.online,
          pushOk: counts.ok,
          pushFailed: counts.ko,
          routes: routeSummary(samples, 15),
        },
        update: {},
      });
      if (end.getUTCMinutes() === 0) {
        await this.prisma.performanceMinute.deleteMany({
          where: { at: { lt: new Date(now - KEEP_DAYS * 24 * 60 * MINUTE_MS) } },
        });
      }
    } catch (error) {
      this.logger.warn(`No se pudo guardar el minuto de rendimiento: ${(error as Error).message}`);
    } finally {
      this.samples = [];
      this.seen = 0;
      this.errors4xx = 0;
      this.errors5xx = 0;
      this.pushOk = 0;
      this.pushFailed = 0;
      this.minuteStart = end.getTime();
      this.cpuMark = process.cpuUsage();
      this.loop?.reset();
    }
  }
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Memory the server can still give (MemAvailable, not just «free»: the cache is usable). */
async function availableMemory(): Promise<{ total: number; available: number }> {
  try {
    const info = await fs.readFile('/proc/meminfo', 'utf8');
    const kb = (name: string) =>
      Number(new RegExp(`^${name}:\\s+(\\d+)`, 'm').exec(info)?.[1] ?? 0) * 1024;
    const total = kb('MemTotal');
    const available = kb('MemAvailable');
    if (total > 0 && available > 0) return { total, available };
  } catch {
    // Not Linux (local development): the operating system's numbers.
  }
  return { total: os.totalmem(), available: os.freemem() };
}
