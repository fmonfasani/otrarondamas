/**
 * Rendimiento (Owner, 2026-11-26) — what GET /platform-admin/performance answers and how the
 * page says it: times in words, and a traffic light (bien / ojo / problema) for each number.
 */

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

export type RouteStat = { ruta: string; cantidad: number; p95Ms: number; promedioMs: number; errores: number };

export type PerformanceReport = {
  rango: RangeKey;
  ahora: {
    requests: number;
    errors4xx: number;
    errors5xx: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    maxMs: number;
    online: number;
    cpuPct: number;
    rssMb: number;
    loopP99Ms: number;
    load1: number;
    cores: number;
    memPct: number;
    memTotalGb: number;
    diskPct: number;
    diskTotalGb: number;
    dbPingMs: number;
    dbConns: number;
  };
  totales: {
    requests: number;
    errors5xx: number;
    errorPct: number;
    p95Ms: number;
    messages: number;
    replyP50Ms: number | null;
    onlineMax: number;
    pushFailed: number;
  };
  serie: PerformancePoint[];
  rutas: RouteStat[];
};

export const RANGE_NAMES = { '1h': 'Última hora', '24h': 'Último día', '7d': 'Última semana', '30d': 'Último mes' } as const;
export type RangeKey = keyof typeof RANGE_NAMES;
export const rangeKey = (value: string | null): RangeKey =>
  value && value in RANGE_NAMES ? (value as RangeKey) : '1h';

/** «8 ms», «1,2 s», «3 min», «1 h 20 min». */
export function timeText(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} s`;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
}

export type Light = 'bien' | 'ojo' | 'problema';

/** Under `ok` is fine, under `warn` is worth a look, over it is a problem. */
const light = (value: number, ok: number, warn: number): Light => (value < ok ? 'bien' : value < warn ? 'ojo' : 'problema');

/** The traffic lights of the page (thresholds a person feels: a tap answered in 0.3 s feels instant). */
export const LIGHTS = {
  /** How long the slowest 5% of answers took. */
  p95: (ms: number) => light(ms, 300, 1000),
  /** The server's load per processor: 1 means every processor busy. */
  load: (load1: number, cores: number) => light(load1 / Math.max(1, cores), 0.7, 1),
  memory: (pct: number) => light(pct, 75, 90),
  disk: (pct: number) => light(pct, 75, 90),
  /** A trivial question to the database. */
  database: (ms: number) => light(ms, 10, 50),
  /** Share of answers that failed on our side (5xx). */
  errors: (pct: number) => light(pct, 0.5, 2),
  /** How long the API's heart (event loop) was blocked at worst. */
  loop: (ms: number) => light(ms, 50, 200),
} as const;

export const LIGHT_WORDS: Record<Light, string> = { bien: 'Bien', ojo: 'Ojo', problema: 'Problema' };

/** «14:05» for the last hour or day, «lun 14:00» for the week, «3/12» for the month. */
export function pointLabel(iso: string, range: RangeKey): string {
  const date = new Date(iso);
  const tz = 'America/Argentina/Buenos_Aires';
  if (range === '30d') return new Intl.DateTimeFormat('es-AR', { timeZone: tz, day: 'numeric', month: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat('es-AR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  if (range === '7d') {
    const day = new Intl.DateTimeFormat('es-AR', { timeZone: tz, weekday: 'short' }).format(date).replace('.', '');
    return `${day} ${time}`;
  }
  return time;
}

/** Requests per minute of a chart point (points join several minutes). */
export const perMinute = (requests: number, range: RangeKey) =>
  Math.round(requests / { '1h': 1, '24h': 10, '7d': 60, '30d': 360 }[range]);
