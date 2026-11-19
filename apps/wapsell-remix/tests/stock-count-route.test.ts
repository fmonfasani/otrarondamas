import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, postTo, sessionCookie, stubApi } from './helpers/route';
import { action as countAction, loader as countLoader } from '../app/routes/_business.panel.inventario_.conteo';
import { action as openingAction } from '../app/routes/_business.panel.inventario_.carga-inicial';
import {
  countDifference,
  countItemsFrom,
  countLinesOf,
  countMessage,
  editableNumber,
  openingItemsFrom,
  openingMessage,
  type CountSheetRow,
} from '../app/utils/inventory';

const formOf = (pairs: Array<[string, string]>) => {
  const form = new FormData();
  for (const [k, v] of pairs) form.append(k, v);
  return form;
};

/** One sheet row as the page posts it. */
const row = (fila: string, productoId: string, sistema: string, contado: string, extra: { loteId?: string; vence?: string } = {}) =>
  [
    ['fila', fila],
    ['productoId', productoId],
    ['nombre', `Producto ${productoId}`],
    ['loteId', extra.loteId ?? ''],
    ['vence', extra.vence ?? ''],
    ['sistema', sistema],
    ['contado', contado],
  ] as Array<[string, string]>;

describe('opening stock and count helpers (OR-B4-046 D8)', () => {
  const yerba: CountSheetRow = {
    productoId: 'p-1',
    nombre: 'Yerba',
    codigoInterno: 'ALM-0001',
    unidadBase: 'UNIDAD',
    controlaVencimiento: false,
    stockTotal: 6,
    lotes: [],
  };
  const leche: CountSheetRow = {
    productoId: 'p-2',
    nombre: 'Leche',
    codigoInterno: 'LAC-0001',
    unidadBase: 'UNIDAD',
    controlaVencimiento: true,
    stockTotal: 8,
    lotes: [
      { id: 'l-1', numeroLote: 'A', vencimiento: '2027-01-10T00:00:00.000Z', cantidad: '5' },
      { id: 'l-2', numeroLote: 'B', vencimiento: '2027-02-10T00:00:00.000Z', cantidad: '3' },
    ],
  };

  it('counts a product as a whole, and one that controls expiry lot by lot plus a lot the count finds', () => {
    const lines = countLinesOf([yerba, leche]);
    expect(lines.map((l) => [l.kind, l.key, l.sistema, l.first])).toEqual([
      ['producto', 'p-1', 6, true],
      ['lote', 'l-1', 5, true],
      ['lote', 'l-2', 3, false],
      ['nuevo', 'p-2:nuevo', 0, false],
    ]);
    expect(lines[1].label).toMatch(/^Lote A · /);
  });

  it('shows the difference only for what was counted', () => {
    expect(countDifference(6, '')).toBeNull();
    expect(countDifference(6, '4')).toBe(-2);
    expect(countDifference(0.3, '0,5')).toBe(0.2);
    expect(countDifference(6, '-1')).toBeNaN();
    expect(countDifference(6, 'seis')).toBeNaN();
  });

  it('reads the counted rows, skipping blanks; a found lot needs its date', () => {
    const parsed = countItemsFrom(
      formOf([
        ...row('producto', 'p-1', '6', '4'),
        ...row('lote', 'p-2', '5', '', { loteId: 'l-1' }),
        ...row('lote', 'p-2', '3', '3', { loteId: 'l-2' }),
        ...row('nuevo', 'p-2', '0', '2', { vence: '2027-05-01' }),
      ]),
    );
    expect(parsed).toEqual({
      ok: true,
      items: [
        { productoId: 'p-1', cantidadSistema: 6, cantidadContada: 4 },
        { productoId: 'p-2', loteId: 'l-2', cantidadSistema: 3, cantidadContada: 3 },
        { productoId: 'p-2', vencimiento: '2027-05-01', cantidadSistema: 0, cantidadContada: 2 },
      ],
    });
    expect(countItemsFrom(formOf(row('nuevo', 'p-2', '0', '2')))).toEqual({
      ok: false,
      message: 'Indicá la fecha del otro lote de «Producto p-2».',
    });
    expect(countItemsFrom(formOf(row('nuevo', 'p-2', '0', '0')))).toMatchObject({ ok: false });
    expect(countItemsFrom(formOf(row('producto', 'p-1', '6', '-3')))).toMatchObject({ ok: false });
    expect(countItemsFrom(formOf(row('producto', 'p-1', '6', '')))).toEqual({
      ok: false,
      message: 'Escribí lo que contaste en al menos un renglón.',
    });
  });

  it('reads the opening rows: quantity, date only where the product controls expiry, optional lot and cost', () => {
    const opening = (pairs: Array<[string, string]>) => openingItemsFrom(formOf(pairs));
    const line = (id: string, controla: string, cantidad: string, vence = '', lote = '', costo = '') =>
      [
        ['productoId', id],
        ['nombre', id],
        ['controla', controla],
        ['cantidad', cantidad],
        ['vence', vence],
        ['lote', lote],
        ['costo', costo],
      ] as Array<[string, string]>;
    expect(opening([...line('p-1', '0', '12', '', '', '850,5'), ...line('p-3', '0', '')])).toEqual({
      ok: true,
      items: [{ productoId: 'p-1', cantidad: 12, costoUnitario: 850.5 }],
    });
    expect(opening(line('p-2', '1', '4', '2027-03-01', 'L-7'))).toEqual({
      ok: true,
      items: [{ productoId: 'p-2', cantidad: 4, vencimiento: '2027-03-01', numeroLote: 'L-7' }],
    });
    expect(opening(line('p-2', '1', '4'))).toEqual({ ok: false, message: '«p-2» controla vencimiento: indicá la fecha del lote.' });
    expect(opening(line('p-1', '0', '-1'))).toMatchObject({ ok: false });
    expect(opening(line('p-1', '0', '0'))).toEqual({ ok: false, message: 'Escribí la cantidad de al menos un producto.' });
  });

  it('words the results and writes numbers the way people type them', () => {
    expect(countMessage({ contados: 3, ajustados: 0 })).toBe('Conteo registrado: todo lo que contaste coincide con el sistema.');
    expect(countMessage({ contados: 3, ajustados: 2 })).toBe('Conteo registrado: ajustamos el stock de 2 de 3 renglones contados.');
    expect(openingMessage({ productos: 1, lotes: 1 })).toBe('Cargamos el stock inicial de 1 producto.');
    expect(openingMessage({ productos: 2, lotes: 3 })).toBe('Cargamos el stock inicial de 2 productos (3 lotes).');
    expect(editableNumber('1500.5')).toBe('1500,5');
    expect(editableNumber('12000')).toBe('12000');
  });
});

describe('opening stock and count routes', () => {
  let api: ReturnType<typeof stubApi>;
  beforeEach(() => {
    api = stubApi('GESTOR_DE_STOCK');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('asks the API for the sheet of the search and the category', async () => {
    api.mockImplementation(async (url) =>
      url.includes('/catalogo/jerarquia')
        ? ok({ familias: [{ id: 'f-1', nombre: 'Almacén', prefijo: 'ALM' }], subfamilias: [] })
        : ok({ hayMas: false, productos: [] }),
    );
    const response = (await countLoader({
      request: new Request('http://app.test/panel/inventario/conteo?q=yerba&familia=f-1', {
        headers: { Cookie: await sessionCookie() },
      }),
      params: {},
      context: {},
    })) as Response;
    await expect(response.json()).resolves.toEqual({
      sheet: { hayMas: false, productos: [] },
      families: [{ id: 'f-1', nombre: 'Almacén' }],
    });
    expect(api.mock.calls.map((call) => call[0])).toContain('http://api.test/inventario/conteo?search=yerba&familiaId=f-1');
  });

  it('confirms a count with its note and reports what changed', async () => {
    api.mockResolvedValueOnce(ok({ referenciaId: 'c-1', contados: 2, ajustados: 1, diferencias: [] }));
    const response = await postTo(countAction, 'inventario/conteo', [
      ...row('producto', 'p-1', '6', '4'),
      ...row('producto', 'p-3', '2', '2'),
      ['nota', 'depósito'],
    ]);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message: 'Conteo registrado: ajustamos el stock de 1 de 2 renglones contados.',
    });
    expect(api.mock.calls[0][0]).toBe('http://api.test/inventario/conteos');
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({
      nota: 'depósito',
      items: [
        { productoId: 'p-1', cantidadSistema: 6, cantidadContada: 4 },
        { productoId: 'p-3', cantidadSistema: 2, cantidadContada: 2 },
      ],
    });
  });

  it('shows the API reason when the stock changed while counting', async () => {
    api.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'El stock cambió mientras contabas: «Yerba» (ahora 5).' }), { status: 409 }),
    );
    const response = await postTo(countAction, 'inventario/conteo', row('producto', 'p-1', '6', '4'));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ ok: false, message: expect.stringContaining('cambió mientras contabas') });
  });

  it('enters the opening stock', async () => {
    api.mockResolvedValueOnce(ok({ referenciaId: 'i-1', productos: 1, lotes: 1 }));
    const response = await postTo(openingAction, 'inventario/carga-inicial', [
      ['productoId', 'p-1'],
      ['nombre', 'Yerba'],
      ['controla', '0'],
      ['cantidad', '10'],
      ['vence', ''],
      ['lote', ''],
      ['costo', '900'],
    ]);
    await expect(response.json()).resolves.toMatchObject({ ok: true, message: 'Cargamos el stock inicial de 1 producto.' });
    expect(api.mock.calls[0][0]).toBe('http://api.test/inventario/carga-inicial');
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({
      items: [{ productoId: 'p-1', cantidad: 10, costoUnitario: 900 }],
    });
  });
});
