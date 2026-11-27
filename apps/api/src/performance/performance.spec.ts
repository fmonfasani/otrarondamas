import { mergeRoutes, percentile, rangeOf, routeKey, routeSummary } from './performance-math';
import { PerformanceCollector } from './performance.collector';
import { totalsOf, type PerformancePoint } from './performance-report.service';

// Rendimiento — how the platform answers, minute by minute (Owner, 2026-11-26).
describe('rendimiento: the numbers', () => {
  it('reads percentiles from sorted times', () => {
    const times = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(times, 0.5)).toBe(50);
    expect(percentile(times, 0.95)).toBe(95);
    expect(percentile(times, 0.99)).toBe(99);
    expect(percentile([], 0.95)).toBe(0);
    expect(percentile([7], 0.5)).toBe(7);
  });

  it('names routes by their pattern, never by ids', () => {
    expect(routeKey('get', '/messaging/conversations/:id/messages')).toBe(
      'GET /messaging/conversations/:id/messages',
    );
    expect(routeKey('post', undefined)).toBe('POST (otra)');
  });

  it('lists the slowest routes of a minute and joins many minutes', () => {
    const minute = routeSummary(
      [
        { route: 'GET /a', ms: 10, error: false },
        { route: 'GET /a', ms: 30, error: false },
        { route: 'POST /b', ms: 400, error: true },
      ],
      10,
    );
    expect(minute).toEqual([
      { ruta: 'POST /b', cantidad: 1, p95Ms: 400, promedioMs: 400, errores: 1 },
      { ruta: 'GET /a', cantidad: 2, p95Ms: 30, promedioMs: 20, errores: 0 },
    ]);
    const joined = mergeRoutes(
      [minute, [{ ruta: 'GET /a', cantidad: 2, p95Ms: 50, promedioMs: 40, errores: 1 }]],
      10,
    );
    expect(joined.find((r) => r.ruta === 'GET /a')).toEqual({
      ruta: 'GET /a',
      cantidad: 4,
      p95Ms: 50,
      promedioMs: 30,
      errores: 1,
    });
  });

  it('knows its ranges, the last hour by default', () => {
    expect(rangeOf('7d')).toBe('7d');
    expect(rangeOf('1 año')).toBe('1h');
    expect(rangeOf(undefined)).toBe('1h');
  });

  it('sums a range: requests, error share, the worst p95, messages and the average reply time', () => {
    const point = (over: Partial<PerformancePoint>): PerformancePoint => ({
      at: '',
      requests: 0,
      errors5xx: 0,
      errors4xx: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      cpuPct: 0,
      rssMb: 0,
      loopP99Ms: 0,
      load1: 0,
      memPct: 0,
      diskPct: 0,
      dbPingMs: 0,
      dbConns: 0,
      messages: 0,
      replyP50Ms: null,
      replyP95Ms: null,
      online: 0,
      pushOk: 0,
      pushFailed: 0,
      ...over,
    });
    expect(
      totalsOf([
        point({
          requests: 900,
          errors5xx: 9,
          p95Ms: 120,
          messages: 4,
          replyP50Ms: 60_000,
          online: 3,
        }),
        point({ requests: 100, errors5xx: 1, p95Ms: 300, messages: 1, online: 5 }),
      ]),
    ).toEqual({
      requests: 1000,
      errors5xx: 10,
      errorPct: 1,
      p95Ms: 300,
      messages: 5,
      replyP50Ms: 60_000,
      onlineMax: 5,
      pushFailed: 0,
    });
  });
});

describe('rendimiento: the minute collector', () => {
  const saved: Array<Record<string, unknown>> = [];
  const prisma = {
    $queryRaw: jest.fn(),
    performanceMinute: {
      upsert: jest.fn(({ create }) => {
        saved.push(create);
        return Promise.resolve(create);
      }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };

  beforeEach(() => {
    saved.length = 0;
    prisma.$queryRaw.mockReset();
    // ping, connections, messages, reply times (in the order the collector asks).
    prisma.$queryRaw.mockImplementation((strings: TemplateStringsArray) => {
      const sql = strings.join('?');
      if (sql.includes('pg_stat_activity')) return Promise.resolve([{ conns: 7 }]);
      if (sql.includes('percentile_cont')) return Promise.resolve([{ p50: 90_000, p95: 300_000 }]);
      if (sql.includes('count(*)')) return Promise.resolve([{ messages: 12 }]);
      return Promise.resolve([{ '?column?': 1 }]);
    });
  });

  it('saves the minute: requests, errors, percentiles, the chat and the slowest routes, then starts over', async () => {
    const collector = new PerformanceCollector(prisma as never);
    collector.useOnline(() => 4);
    for (let i = 1; i <= 100; i += 1) collector.record('GET /messaging/conversations/:id', 200, i);
    collector.record('POST /messaging/conversations/:id/messages', 500, 900);
    collector.record('GET (otra)', 404, 2);
    collector.push(true);
    collector.push(false);
    await collector.flush(Date.now());
    expect(saved).toHaveLength(1);
    const row = saved[0];
    expect(row).toMatchObject({
      requests: 102,
      errors4xx: 1,
      errors5xx: 1,
      p50Ms: 50,
      maxMs: 900,
      dbConns: 7,
      messages: 12,
      replyP50Ms: 90_000,
      replyP95Ms: 300_000,
      online: 4,
      pushOk: 1,
      pushFailed: 1,
    });
    expect((row.routes as Array<{ ruta: string }>)[0].ruta).toBe(
      'POST /messaging/conversations/:id/messages',
    );
    expect(JSON.stringify(row.routes)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
    expect(collector.live().requests).toBe(0);
  });

  it('never breaks the API when the database does not answer', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('down'));
    const collector = new PerformanceCollector(prisma as never);
    collector.record('GET /x', 200, 5);
    await expect(collector.flush(Date.now())).resolves.toBeUndefined();
    expect(collector.live().requests).toBe(0);
  });
});
