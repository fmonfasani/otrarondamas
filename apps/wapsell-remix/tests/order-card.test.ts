import { describe, expect, it } from 'vitest';
import { orderCardOf, orderStateLabel, orderStep, orderSummary, orderTitle } from '~/utils/order-card';

// OR-B4-053 — the order card in the chat.
describe('order card', () => {
  it('finds the order card among a message’s attachments', () => {
    const card = { tipo: 'pedido', id: 'a', pedidoId: 'p', numero: 12, estado: 'RECIBIDO', total: '10.00', items: [] };
    expect(orderCardOf({ adjuntos: [{ tipo: 'producto' }, card] })).toBe(card);
    expect(orderCardOf({ adjuntos: [{ tipo: 'imagen' }] })).toBeNull();
    expect(orderCardOf({})).toBeNull();
  });

  it('places every state on the bar, and takes cancelled or failed orders off it', () => {
    expect(orderStep('RECIBIDO')).toBe(0);
    expect(['CONFIRMADO', 'EN_PREPARACION', 'LISTO', 'ASIGNADO'].map(orderStep)).toEqual([1, 1, 1, 1]);
    expect(orderStep('EN_CAMINO')).toBe(2);
    expect(orderStep('ENTREGADO')).toBe(3);
    expect(orderStep('PARCIALMENTE_ENTREGADO')).toBe(3);
    expect(orderStep('CANCELADO')).toBeNull();
    expect(orderStep('ENTREGA_FALLIDA')).toBeNull();
  });

  it('names the order, its state and its contents', () => {
    expect(orderTitle(12)).toBe('Pedido N° 12');
    expect(orderTitle(null)).toBe('Pedido');
    expect(orderStateLabel('RECIBIDO')).toBe('Recibido, falta confirmar');
    expect(orderStateLabel('CANCELADO')).toBe('Cancelado');
    expect(orderSummary([{ producto: 'A', cantidad: 1 }])).toBe('1 producto');
    expect(
      orderSummary([
        { producto: 'A', cantidad: 2 },
        { producto: 'B', cantidad: 1 },
      ]),
    ).toBe('2 productos · 3 unidades');
  });
});
