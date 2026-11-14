/** Shapes of /reportes/resumen and the pure helpers of the Reportes screen (OR-B4-036). */

export type ReportSummary = {
  desde: string;
  hasta: string;
  vendido: number;
  devoluciones: number;
  neto: number;
  operaciones: number;
  ticketPromedio: number;
  anterior: { neto: number; operaciones: number; variacion: number | null };
  porDia: Array<{ dia: string; vendido: number; devoluciones: number; neto: number }>;
  porCanal: Array<{ canal: string; operaciones: number; vendido: number }>;
  porMedio: Array<{ medio: string; monto: number }>;
  productos: Array<{ productoId: string; nombre: string; cantidad: number; vendido: number }>;
};

export const PERIODS = [
  { value: 'hoy', label: 'Hoy' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: 'mes', label: 'Este mes' },
  { value: 'mes-pasado', label: 'Mes pasado' },
  { value: '30d', label: 'Últimos 30 días' },
] as const;
export type Period = (typeof PERIODS)[number]['value'];

/** Today as YYYY-MM-DD in Argentina. */
export const todayAR = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

const shift = (day: string, days: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const VALID_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The period asked for in the URL: a preset (`periodo`) or explicit `desde`/`hasta`.
 * Anything unreadable falls back to the last 7 days.
 */
export function periodFrom(params: URLSearchParams, now = new Date()): { desde: string; hasta: string; periodo: Period | 'custom' } {
  const today = todayAR(now);
  const desde = params.get('desde') ?? '';
  const hasta = params.get('hasta') ?? '';
  if (VALID_DAY.test(desde) && VALID_DAY.test(hasta) && desde <= hasta) return { desde, hasta, periodo: 'custom' };
  const periodo = (PERIODS.find((p) => p.value === params.get('periodo'))?.value ?? '7d') as Period;
  const month = today.slice(0, 7);
  switch (periodo) {
    case 'hoy':
      return { desde: today, hasta: today, periodo };
    case 'mes':
      return { desde: `${month}-01`, hasta: today, periodo };
    case 'mes-pasado': {
      const lastDay = shift(`${month}-01`, -1);
      return { desde: `${lastDay.slice(0, 7)}-01`, hasta: lastDay, periodo };
    }
    case '30d':
      return { desde: shift(today, -29), hasta: today, periodo };
    default:
      return { desde: shift(today, -6), hasta: today, periodo: '7d' };
  }
}

/** "+12 %" / "−5 %" against the previous period of the same length; null when there was nothing to compare. */
export function variationText(variation: number | null) {
  if (variation === null) return null;
  const rounded = Math.round(variation);
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)} %`;
}

/** Short day label for the chart axis: "13/11". */
export const dayLabel = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

/** Bar heights as a share (0–100) of the highest day; days with nothing sold stay at 0. */
export function barHeights(days: Array<{ vendido: number }>) {
  const max = Math.max(0, ...days.map((d) => d.vendido));
  return days.map((d) => (max > 0 ? Math.round((Math.max(0, d.vendido) / max) * 100) : 0));
}

const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  QR: 'QR / billetera',
  MERCADOPAGO: 'Mercado Pago',
};
export const methodName = (medio: string) => METHOD_LABELS[medio] ?? medio;
