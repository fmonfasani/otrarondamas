/** Rendimiento — pure helpers: percentiles, the slowest routes, and buckets for the charts. */

export type RouteSample = { route: string; ms: number; error: boolean };
export type RouteStat = {
  ruta: string;
  cantidad: number;
  p95Ms: number;
  promedioMs: number;
  errores: number;
};

/** The value under which `p` of the sorted values fall (nearest rank); 0 when there are none. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return Math.round(sorted[index] * 10) / 10;
}

/** The routes of a minute, slowest (by p95) first, at most `limit`. */
export function routeSummary(samples: RouteSample[], limit: number): RouteStat[] {
  const byRoute = new Map<string, { times: number[]; errors: number }>();
  for (const s of samples) {
    const entry = byRoute.get(s.route) ?? { times: [], errors: 0 };
    entry.times.push(s.ms);
    if (s.error) entry.errors += 1;
    byRoute.set(s.route, entry);
  }
  return [...byRoute.entries()]
    .map(([ruta, { times, errors }]) => {
      const sorted = [...times].sort((a, b) => a - b);
      return {
        ruta,
        cantidad: sorted.length,
        p95Ms: percentile(sorted, 0.95),
        promedioMs: Math.round((sorted.reduce((a, b) => a + b, 0) / sorted.length) * 10) / 10,
        errores: errors,
      };
    })
    .sort((a, b) => b.p95Ms - a.p95Ms)
    .slice(0, limit);
}

/** Joins the routes of many minutes: counts add up; p95 is the worst minute's, the average weighted. */
export function mergeRoutes(minutes: RouteStat[][], limit: number): RouteStat[] {
  const all = new Map<string, { cantidad: number; total: number; p95: number; errores: number }>();
  for (const minute of minutes) {
    for (const r of minute) {
      const entry = all.get(r.ruta) ?? { cantidad: 0, total: 0, p95: 0, errores: 0 };
      entry.cantidad += r.cantidad;
      entry.total += r.promedioMs * r.cantidad;
      entry.p95 = Math.max(entry.p95, r.p95Ms);
      entry.errores += r.errores;
      all.set(r.ruta, entry);
    }
  }
  return [...all.entries()]
    .map(([ruta, e]) => ({
      ruta,
      cantidad: e.cantidad,
      p95Ms: e.p95,
      promedioMs: e.cantidad ? Math.round((e.total / e.cantidad) * 10) / 10 : 0,
      errores: e.errores,
    }))
    .sort((a, b) => b.p95Ms - a.p95Ms)
    .slice(0, limit);
}

/** The route pattern of a request (ids never: `/messaging/conversations/:id`), or «(otra)». */
export function routeKey(method: string, pattern: string | undefined): string {
  return pattern ? `${method.toUpperCase()} ${pattern}` : `${method.toUpperCase()} (otra)`;
}

/** The time ranges of the page and how many minutes each chart point joins. */
export const RANGES = {
  '1h': { minutes: 60, bucket: 1 },
  '24h': { minutes: 24 * 60, bucket: 10 },
  '7d': { minutes: 7 * 24 * 60, bucket: 60 },
  '30d': { minutes: 30 * 24 * 60, bucket: 6 * 60 },
} as const;
export type RangeKey = keyof typeof RANGES;

export const rangeOf = (value: string | undefined): RangeKey =>
  value && value in RANGES ? (value as RangeKey) : '1h';
