import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PerformanceCollector } from './performance.collector';
import { RANGES, mergeRoutes, type RangeKey, type RouteStat } from './performance-math';

/** One point of the charts: the minutes of a bucket joined. */
export type PerformancePoint = {
  at: string;
  requests: number;
  errors5xx: number;
  errors4xx: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  cpuPct: number;
  rssMb: number;
  loopP99Ms: number;
  load1: number;
  memPct: number;
  diskPct: number;
  dbPingMs: number;
  dbConns: number;
  messages: number;
  replyP50Ms: number | null;
  replyP95Ms: number | null;
  online: number;
  pushOk: number;
  pushFailed: number;
};

/**
 * Rendimiento — what the platform page shows: right now (this minute so far, the server and the
 * database), the chart points of a range, its totals, and the slowest routes (of up to the last
 * 24 hours). Platform-wide aggregates only.
 */
@Injectable()
export class PerformanceReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collector: PerformanceCollector,
  ) {}

  async report(range: RangeKey, now = new Date()) {
    const { minutes, bucket } = RANGES[range];
    const since = new Date(now.getTime() - minutes * 60_000);
    const seconds = bucket * 60;
    const points = await this.prisma.$queryRaw<PerformancePoint[]>`
      SELECT to_timestamp(floor(extract(epoch FROM at) / ${seconds}) * ${seconds}) AS at,
             sum(requests)::int AS requests,
             sum("errors5xx")::int AS "errors5xx",
             sum("errors4xx")::int AS "errors4xx",
             round(avg("p50Ms")::numeric, 1)::float AS "p50Ms",
             round(max("p95Ms")::numeric, 1)::float AS "p95Ms",
             round(max("p99Ms")::numeric, 1)::float AS "p99Ms",
             round(avg("cpuPct")::numeric, 1)::float AS "cpuPct",
             round(max("rssMb")::numeric, 1)::float AS "rssMb",
             round(max("loopP99Ms")::numeric, 1)::float AS "loopP99Ms",
             round(max(load1)::numeric, 2)::float AS load1,
             round(avg("memPct")::numeric, 1)::float AS "memPct",
             round(max("diskPct")::numeric, 1)::float AS "diskPct",
             round(avg("dbPingMs")::numeric, 1)::float AS "dbPingMs",
             max("dbConns")::int AS "dbConns",
             sum(messages)::int AS messages,
             round(avg("replyP50Ms")::numeric, 0)::float AS "replyP50Ms",
             round(max("replyP95Ms")::numeric, 0)::float AS "replyP95Ms",
             max(online)::int AS online,
             sum("pushOk")::int AS "pushOk",
             sum("pushFailed")::int AS "pushFailed"
      FROM "PerformanceMinute"
      WHERE at >= ${since}
      GROUP BY 1
      ORDER BY 1`;
    const routeSince = new Date(Math.max(since.getTime(), now.getTime() - 24 * 60 * 60_000));
    const routeRows = await this.prisma.performanceMinute.findMany({
      where: { at: { gte: routeSince } },
      select: { routes: true },
    });
    const [system, database] = await Promise.all([
      this.collector.system(),
      this.collector.database().catch(() => ({ dbPingMs: -1, dbConns: 0 })),
    ]);
    const serie = points.map((p) => ({ ...p, at: new Date(p.at).toISOString() }));
    return {
      rango: range,
      ahora: { ...this.collector.live(), ...system, ...database },
      totales: totalsOf(serie),
      serie,
      rutas: mergeRoutes(
        routeRows.map((r) => (Array.isArray(r.routes) ? (r.routes as unknown as RouteStat[]) : [])),
        15,
      ),
    };
  }
}

/** The whole range in a few numbers: requests, errors, the worst p95, messages, reply time. */
export function totalsOf(points: PerformancePoint[]) {
  const sum = (pick: (p: PerformancePoint) => number) => points.reduce((a, p) => a + pick(p), 0);
  const requests = sum((p) => p.requests);
  const errors5xx = sum((p) => p.errors5xx);
  const replies = points.filter((p) => p.replyP50Ms != null);
  return {
    requests,
    errors5xx,
    errorPct: requests ? Math.round((errors5xx / requests) * 1000) / 10 : 0,
    p95Ms: points.reduce((a, p) => Math.max(a, p.p95Ms), 0),
    messages: sum((p) => p.messages),
    replyP50Ms: replies.length
      ? Math.round(replies.reduce((a, p) => a + (p.replyP50Ms ?? 0), 0) / replies.length)
      : null,
    onlineMax: points.reduce((a, p) => Math.max(a, p.online), 0),
    pushFailed: sum((p) => p.pushFailed),
  };
}
