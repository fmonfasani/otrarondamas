import { describe, expect, it } from 'vitest';
import { offerDays, offerFor, offerPayload, offerWhat, todayAR } from '../app/utils/offers';
import { offerUntil, linesFromServer } from '../app/utils/store';
import { activeFilters, listingQuery, panelFilterCount } from '../app/utils/store-browse';
import { addLine, counterPrice, type SearchProduct } from '../app/utils/sales';

// Offers between two dates (OR-B4-046 §4.4, stage C3): the panel form, how an offer reads, the
// store's mark and filter, the counter's price.
const form = (entries: Array<[string, string]>) => {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
};
const base: Array<[string, string]> = [
  ['nombre', 'Semana de la yerba'],
  ['tipo', 'PORCENTAJE'],
  ['valor', '20'],
  ['desde', '2026-11-21'],
  ['hasta', '2026-11-30'],
];

describe('offer form', () => {
  it('reads a percent for some products, and a price', () => {
    expect(
      offerPayload(
        form([
          ...base,
          ['alcance', 'productos'],
          ['productoId', 'p-1'],
          ['productoId', 'p-1'],
          ['productoId', 'p-2'],
        ]),
        '2026-11-21',
      ),
    ).toEqual({
      ok: true,
      body: {
        nombre: 'Semana de la yerba',
        tipo: 'PORCENTAJE',
        descuentoPorcentaje: 20,
        desde: '2026-11-21',
        hasta: '2026-11-30',
        soloTienda: false,
        productoIds: ['p-1', 'p-2'],
      },
    });
    const price = offerPayload(
      form([
        ['nombre', 'Arroz'],
        ['tipo', 'PRECIO'],
        ['valor', '999,50'],
        ['desde', '2026-11-21'],
        ['hasta', '2026-11-21'],
        ['productoId', 'p-1'],
        ['soloTienda', 'true'],
      ]),
      '2026-11-20',
    );
    expect(price.ok && price.body).toMatchObject({
      tipo: 'PRECIO',
      precioOferta: 999.5,
      soloTienda: true,
      productoIds: ['p-1'],
    });
  });

  it('reads a whole category, only with a percent', () => {
    expect(
      offerPayload(form([...base, ['alcance', 'categoria'], ['familiaId', 'f-1']]), '2026-11-21'),
    ).toMatchObject({
      ok: true,
      body: { familiaId: 'f-1' },
    });
    expect(
      offerPayload(
        form([
          ['nombre', 'Arroz'],
          ['tipo', 'PRECIO'],
          ['valor', '9'],
          ['desde', '2026-11-21'],
          ['hasta', '2026-11-22'],
          ['alcance', 'categoria'],
          ['familiaId', 'f-1'],
        ]),
        '2026-11-21',
      ),
    ).toEqual({
      ok: false,
      message: 'Una oferta para toda una categoría va con porcentaje.',
    });
    expect(
      offerPayload(
        form([
          ...base.map(([k, v]): [string, string] => [k, k === 'nombre' ? 'X' : v]),
          ['productoId', 'p-1'],
        ]),
        '2026-11-21',
      ),
    ).toEqual({
      ok: false,
      message: 'Poné un nombre a la oferta (por ejemplo «Semana de la yerba»).',
    });
  });

  it('refuses what cannot be an offer', () => {
    const today = '2026-11-21';
    expect(
      offerPayload(
        form([...base, ['productoId', 'p-1']].map(([k, v]) => [k, k === 'valor' ? '0' : v])),
        today,
      ),
    ).toEqual({
      ok: false,
      message: 'El descuento va de 1 a 99 %.',
    });
    expect(
      offerPayload(
        form([
          ...base.map(([k, v]): [string, string] => [k, k === 'hasta' ? '2026-11-20' : v]),
          ['productoId', 'p-1'],
        ]),
        today,
      ),
    ).toEqual({
      ok: false,
      message: 'El último día no puede ser antes del primero.',
    });
    expect(offerPayload(form([...base, ['alcance', 'productos']]), today)).toEqual({
      ok: false,
      message: 'Marcá al menos un producto.',
    });
    expect(offerPayload(form([...base, ['alcance', 'categoria'], ['tipo2', 'x']]), today)).toEqual({
      ok: false,
      message: 'Elegí la categoría.',
    });
    expect(offerPayload(form([...base, ['productoId', 'p-1']]), '2026-12-05')).toEqual({
      ok: false,
      message: 'Esos días ya pasaron.',
    });
  });
});

describe('how an offer reads', () => {
  const offer = {
    tipo: 'PORCENTAJE' as const,
    descuentoPorcentaje: 12.5,
    precioOferta: null,
    // 21/11 to 30/11 in Argentina; the end is kept as the next midnight.
    desde: '2026-11-21T03:00:00.000Z',
    hasta: '2026-12-01T03:00:00.000Z',
    categoria: null,
    productos: [{ id: 'p-1', nombre: 'Yerba 1 kg' }],
  };

  it('says what, for what and which days', () => {
    expect(offerWhat(offer)).toBe('12,5 % menos');
    expect(offerWhat({ ...offer, tipo: 'PRECIO', precioOferta: 999 })).toMatch(/^a \$\s?999,00$/);
    expect(offerFor(offer)).toBe('Yerba 1 kg');
    expect(
      offerFor({ ...offer, productos: [...offer.productos, { id: 'p-2', nombre: 'Mate' }] }),
    ).toBe('2 productos');
    expect(offerFor({ ...offer, categoria: { id: 'f', nombre: 'Bebidas' } })).toBe(
      'Toda la categoría Bebidas',
    );
    expect(offerDays(offer)).toBe('del 21/11 al 30/11');
    expect(offerDays({ desde: offer.desde, hasta: '2026-11-22T03:00:00.000Z' })).toBe('el 21/11');
    expect(offerUntil(offer.hasta)).toBe('hasta el 30/11');
    expect(todayAR(new Date('2026-11-21T02:00:00Z'))).toBe('2026-11-20');
  });
});

describe('store and counter', () => {
  it('keeps «En oferta» in the address, as a chip and in the panel count', () => {
    const query = listingQuery(new URL('http://app.test/tienda/a?oferta=1&stock=1&x=y'));
    expect(query.toString()).toBe('stock=1&oferta=1');
    expect(
      activeFilters('/tienda/a', query, { categorias: [], marcas: [], precio: null }).map(
        (c) => c.label,
      ),
    ).toEqual(['Con stock', 'En oferta']);
    expect(panelFilterCount(query)).toBe(2);
  });

  it("reads the cart line at the store's price of today", () => {
    expect(
      linesFromServer({
        id: 'c',
        CartItem: [
          {
            productoId: 'p',
            cantidad: 2,
            Producto: { nombre: 'Yerba', precioMinorista: '1500' },
            precio: '1200.00',
          },
        ],
      }),
    ).toEqual([{ productoId: 'p', nombre: 'Yerba', precio: '1200.00', cantidad: 2 }]);
  });

  it('charges the offer price at the counter', () => {
    const yerba: SearchProduct = {
      id: 'p',
      nombre: 'Yerba',
      codigoInterno: 'Y',
      precioMinorista: '1500',
      precioVenta: '1200.00',
      oferta: { id: 'o', nombre: 'Semana', hasta: '2026-12-01T03:00:00.000Z' },
      unidadBase: null,
      stockDisponible: 5,
    };
    expect(counterPrice(yerba)).toBe('1200.00');
    expect(counterPrice({ ...yerba, precioVenta: undefined })).toBe('1500');
    expect(addLine([], yerba)[0].precio).toBe('1200.00');
  });
});
