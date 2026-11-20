import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formBody, ok, sessionCookie, stubApi } from './helpers/route';
import { action as orderAction } from '../app/routes/_business.panel.pedidos_.$id';
import {
  CANCELLABLE_ORDER_STATES,
  MOVABLE_STATES,
  ORDER_MOVES,
  moveMessage,
  orderAbilities,
  stockNote,
} from '../app/utils/orders';

describe('order moves (#168, OR-B4-049)', () => {
  it('mirrors the matrix: who confirms, who cancels, who prepares and delivers', () => {
    expect(orderAbilities('OWNER')).toEqual({ confirm: true, cancel: true, fulfill: true });
    expect(orderAbilities('VENDEDOR')).toEqual({ confirm: true, cancel: false, fulfill: true });
    expect(orderAbilities('GESTOR_DE_STOCK')).toEqual({ confirm: false, cancel: false, fulfill: true });
    expect(orderAbilities('')).toEqual({ confirm: false, cancel: false, fulfill: false });
  });

  it('offers the next steps of each state; the stock leaves on the way out or at pickup', () => {
    const labels = (state: keyof typeof ORDER_MOVES) => (ORDER_MOVES[state] ?? []).map((m) => `${m.to}:${m.label}`);
    expect(labels('CONFIRMADO')).toEqual([
      'EN_PREPARACION:Empezar a preparar',
      'LISTO:Marcar listo',
      'EN_CAMINO:Salió a entregar',
      'ENTREGADO:Lo retiró el cliente',
    ]);
    expect(labels('EN_CAMINO')).toEqual(['ENTREGADO:Entregado', 'ENTREGA_FALLIDA:No se pudo entregar']);
    expect(labels('ENTREGA_FALLIDA')).toEqual(['EN_CAMINO:Volver a enviar', 'ENTREGADO:Lo retiró el cliente']);
    expect(ORDER_MOVES.ENTREGADO).toBeUndefined();
    expect([...MOVABLE_STATES].sort()).toEqual(['ENTREGADO', 'ENTREGA_FALLIDA', 'EN_CAMINO', 'EN_PREPARACION', 'LISTO']);
    expect(CANCELLABLE_ORDER_STATES.has('LISTO')).toBe(true);
    expect(CANCELLABLE_ORDER_STATES.has('EN_CAMINO')).toBe(false);
  });

  it('says where the stock stands and what each move did', () => {
    expect(stockNote('CONFIRMADO')).toMatch(/^Su stock está reservado/);
    expect(stockNote('EN_CAMINO')).toBe('Su stock ya salió del local.');
    expect(stockNote('ENTREGA_FALLIDA')).toBe('La mercadería volvió al stock y sigue reservada para este pedido.');
    expect(stockNote('CANCELADO')).toBeNull();
    expect(moveMessage('EN_CAMINO')).toBe('El pedido salió a entregar: descontamos su stock.');
  });
});

describe('order detail moves', () => {
  let api: ReturnType<typeof stubApi>;
  const post = async (pairs: Array<[string, string]>) =>
    (await orderAction({
      request: new Request('http://app.test/panel/pedidos/o-1', {
        method: 'POST',
        body: formBody(pairs),
        headers: { Cookie: await sessionCookie() },
      }),
      params: { lang: 'es', id: 'o-1' },
      context: {},
    })) as Response;
  beforeEach(() => {
    api = stubApi('GESTOR_DE_STOCK');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('moves the order with PATCH /estado and tells what happened to its stock', async () => {
    api.mockResolvedValueOnce(ok({ id: 'o-1', estado: 'EN_CAMINO' }));
    const response = await post([['intent', 'move'], ['estado', 'EN_CAMINO']]);
    await expect(response.json()).resolves.toEqual({ ok: true, message: 'El pedido salió a entregar: descontamos su stock.' });
    expect(api.mock.calls[0][0]).toBe('http://api.test/pedidos/o-1/estado');
    expect(api.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ estado: 'EN_CAMINO' }) });
  });

  it('refuses a state the panel does not offer, without calling the API', async () => {
    const response = await post([['intent', 'move'], ['estado', 'CANCELADO']]);
    expect(response.status).toBe(400);
    expect(api).not.toHaveBeenCalled();
  });
});
