import { isNotice, ORDER_CARD_MIME, PRODUCT_CARD_MIME, toMessageWire } from './message-serializer';
import { orderTotal } from '../store/store.service';

// OR-B4-053 — order cards, notices and the price a product card shows.
describe('message serializer — orders in the chat', () => {
  const base = {
    id: 'm-1',
    conversationId: 'c-1',
    clientMessageId: 'x',
    sequence: BigInt(1),
    type: 'TEXT',
    content: 'hola',
    authorUserId: 'owner',
    authorCustomerId: null,
    replyToMessageId: null,
    createdAt: new Date('2026-11-26T12:00:00Z'),
  };
  const attachment = (mimeType: string, metadata: unknown) => ({
    id: 'a-1',
    mimeType,
    filename: 'f',
    sizeBytes: BigInt(0),
    metadata,
  });

  it('marks what the system posted for the Business as a notice, never what people type', () => {
    expect(isNotice({ authorUserId: 'owner', clientMessageId: 'pedido-1-recibido' })).toBe(true);
    expect(isNotice({ authorUserId: 'owner', clientMessageId: 'devolucion-1-APROBADA' })).toBe(
      true,
    );
    expect(isNotice({ authorUserId: 'owner', clientMessageId: 'b3f1-uuid' })).toBe(false);
    expect(isNotice({ authorUserId: null, clientMessageId: 'pedido-1-recibido' })).toBe(false);
    expect(toMessageWire({ ...base, clientMessageId: 'pedido-1-CONFIRMADO' }).aviso).toBe(true);
    expect(toMessageWire(base)).not.toHaveProperty('aviso');
  });

  it('sends the order card with what the service filled in', () => {
    const wire = toMessageWire({
      ...base,
      Attachment: [
        attachment(ORDER_CARD_MIME, {
          pedidoId: 'p-1',
          numero: 12,
          estado: 'CONFIRMADO',
          total: '2555.00',
          items: [{ producto: 'Coca', cantidad: 2 }],
        }),
      ],
    });
    expect(wire.adjuntos).toEqual([
      {
        tipo: 'pedido',
        id: 'a-1',
        pedidoId: 'p-1',
        numero: 12,
        estado: 'CONFIRMADO',
        total: '2555.00',
        items: [{ producto: 'Coca', cantidad: 2 }],
      },
    ]);
  });

  it('adds the final price to a product card only when it is lower than the list price', () => {
    const card = (meta: object) =>
      toMessageWire({ ...base, Attachment: [attachment(PRODUCT_CARD_MIME, meta)] }).adjuntos?.[0];
    expect(
      card({ productoId: 'x', nombre: 'Roles', precio: '1600', precioFinal: '1280.00' }),
    ).toMatchObject({
      precio: '1600',
      precioFinal: '1280.00',
    });
    expect(
      card({ productoId: 'x', nombre: 'Roles', precio: '1600', precioFinal: '1600' }),
    ).not.toHaveProperty('precioFinal');
  });

  it('totals an order: unit price × quantity, less the loyalty %', () => {
    expect(
      orderTotal([
        { precioUnitario: '1280.00', cantidad: 1 },
        { precioUnitario: '100.00', cantidad: 3, descuentoFidelizacionPorcentaje: 10 },
      ]),
    ).toBe(1550);
  });
});
