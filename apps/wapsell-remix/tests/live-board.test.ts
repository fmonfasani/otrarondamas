import { describe, expect, it } from 'vitest';
import { orderSignal } from '../app/services/realtime.server';
import { boardColumns, countdown, deliveryLabel, sinceLabel, type BoardOrder } from '../app/utils/board';

const order = (id: string, estado: string, extra: Partial<BoardOrder> = {}): BoardOrder => ({
  id,
  numero: 1,
  estado,
  createdAt: '2026-11-28T12:00:00.000Z',
  total: '1000',
  costoEnvio: '0',
  pagado: '1000',
  tipoEntrega: 'RETIRO',
  kmEntrega: null,
  aceptarAntes: null,
  listoEstimado: null,
  cliente: 'Ana',
  items: [],
  ...extra,
});

// Fase 3 (OR-B4-054) — Pedidos en vivo.
describe('live board', () => {
  it('passes «pedido» to the team only, with the order id and whether it is new', () => {
    expect(orderSignal({ orderId: 'o-1', nuevo: true }, 'equipo')).toEqual({ orderId: 'o-1', nuevo: true });
    expect(orderSignal({ orderId: 'o-1' }, 'equipo')).toEqual({ orderId: 'o-1', nuevo: false });
    expect(orderSignal({ orderId: 'o-1', nuevo: true }, 'cliente')).toBeNull();
    expect(orderSignal({ nuevo: true }, 'equipo')).toBeNull();
  });

  it('puts each order in its column and leaves out the finished ones', () => {
    const columns = boardColumns([
      order('a', 'RECIBIDO'),
      order('b', 'CONFIRMADO'),
      order('c', 'EN_PREPARACION'),
      order('d', 'LISTO'),
      order('e', 'EN_CAMINO'),
      order('f', 'ENTREGA_FALLIDA'),
      order('g', 'ENTREGADO'),
      order('h', 'CANCELADO'),
    ]);
    expect(columns.nuevos.map((o) => o.id)).toEqual(['a']);
    expect(columns.preparando.map((o) => o.id)).toEqual(['b', 'c']);
    expect(columns.listos.map((o) => o.id)).toEqual(['d']);
    expect(columns.enCamino.map((o) => o.id)).toEqual(['e', 'f']);
  });

  it('counts down to the deadline, and counts up once it passed', () => {
    const now = Date.parse('2026-11-28T12:00:00.000Z');
    expect(countdown('2026-11-28T12:02:41.000Z', now)).toEqual({ text: '2:41', late: false });
    expect(countdown('2026-11-28T11:57:50.000Z', now)).toEqual({ text: '2:10', late: true });
    expect(countdown(null, now)).toBeNull();
    expect(countdown('not a date', now)).toBeNull();
  });

  it('says delivery or pickup, and how long ago it arrived', () => {
    expect(deliveryLabel({ tipoEntrega: 'ENVIO', kmEntrega: 2.14 })).toBe('Envío · 2,1 km');
    expect(deliveryLabel({ tipoEntrega: 'ENVIO', kmEntrega: null })).toBe('Envío');
    expect(deliveryLabel({ tipoEntrega: 'RETIRO', kmEntrega: null })).toBe('Retiro');
    const created = '2026-11-28T12:00:00.000Z';
    expect(sinceLabel(created, Date.parse(created) + 30_000)).toBe('recién');
    expect(sinceLabel(created, Date.parse(created) + 5 * 60_000)).toBe('hace 5 min');
    expect(sinceLabel(created, Date.parse(created) + 125 * 60_000)).toBe('hace 2 h');
  });
});
