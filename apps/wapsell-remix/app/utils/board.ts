/**
 * Fase 3 (OR-B4-054) — Pedidos en vivo: pure helpers for the board. The API checks every move
 * again; these only decide what each card shows.
 */

export interface BoardOrder {
  id: string;
  numero: number | null;
  estado: string;
  createdAt: string;
  total: string;
  costoEnvio: string;
  pagado: string;
  tipoEntrega: string | null;
  kmEntrega: number | null;
  aceptarAntes: string | null;
  listoEstimado: string | null;
  cliente: string | null;
  items: Array<{ producto: string; cantidad: number }>;
}

export interface Board {
  pausadoHasta: string | null;
  pedidos: BoardOrder[];
}

export type ColumnKey = 'nuevos' | 'preparando' | 'listos' | 'enCamino';

export const COLUMNS: ReadonlyArray<{ key: ColumnKey; title: string; states: readonly string[] }> = [
  { key: 'nuevos', title: 'Nuevos', states: ['RECIBIDO'] },
  { key: 'preparando', title: 'Preparando', states: ['CONFIRMADO', 'EN_PREPARACION'] },
  { key: 'listos', title: 'Listos', states: ['LISTO', 'ASIGNADO'] },
  { key: 'enCamino', title: 'En camino', states: ['EN_CAMINO', 'ENTREGA_FALLIDA'] },
];

/** The orders of each column, in arrival order. */
export function boardColumns(orders: readonly BoardOrder[]): Record<ColumnKey, BoardOrder[]> {
  const columns: Record<ColumnKey, BoardOrder[]> = { nuevos: [], preparando: [], listos: [], enCamino: [] };
  for (const order of orders) {
    const column = COLUMNS.find((c) => c.states.includes(order.estado));
    if (column) columns[column.key].push(order);
  }
  return columns;
}

/** «m:ss» to a moment, and whether it already passed (then the time since). */
export function countdown(target: string | null, now: number): { text: string; late: boolean } | null {
  if (!target) return null;
  const left = Date.parse(target) - now;
  if (Number.isNaN(left)) return null;
  const seconds = Math.floor(Math.abs(left) / 1000);
  const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return { text, late: left < 0 };
}

/** «Envío · 2,1 km» or «Retiro». */
export function deliveryLabel(order: Pick<BoardOrder, 'tipoEntrega' | 'kmEntrega'>): string {
  if (order.tipoEntrega !== 'ENVIO') return 'Retiro';
  if (order.kmEntrega == null) return 'Envío';
  return `Envío · ${order.kmEntrega.toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
}

/** «hace 2 min» since the order arrived. */
export function sinceLabel(createdAt: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(createdAt)) / 60_000));
  if (minutes < 1) return 'recién';
  if (minutes < 60) return `hace ${minutes} min`;
  return `hace ${Math.floor(minutes / 60)} h`;
}

export const PREPARATION_OPTIONS = [10, 20, 30] as const;

/** Reasons offered when rejecting; the customer reads it in the chat. */
export const REJECT_REASONS = ['Sin stock de algún producto', 'Estamos por cerrar', 'No llegamos a esa dirección'];
