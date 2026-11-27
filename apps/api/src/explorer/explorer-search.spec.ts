import {
  didYouMean,
  distance,
  queryScore,
  search,
  searchable,
  sound,
  strictlyFound,
  type SearchRow,
} from './explorer-search';

const found = (q: string, text: string) => queryScore(q, searchable(text)) > 0;

let next = 0;
function row(nombre: string, extra: Partial<SearchRow> = {}): SearchRow {
  next += 1;
  return {
    productoId: `p${next}`,
    nombre,
    marca: null,
    precioCentavos: 100_000,
    vendidos: 0,
    buscados: 0,
    destacado: false,
    createdAt: new Date(2026, 0, next),
    enOferta: false,
    tienda: { slug: 'almacen', rubro: 'Almacén', abiertoAhora: true },
    text: searchable(`${nombre} ${extra.marca ?? ''}`),
    ...extra,
  };
}

describe('Wapsell search — forgiving how people type', () => {
  it('ignores accents, capitals and punctuation', () => {
    expect(found('ALMACEN', 'Almacén Lucía')).toBe(true);
    expect(found('coca cola', 'Coca-Cola 2,25 l')).toBe(true);
  });

  it('finds words written together or apart', () => {
    expect(found('cocacola', 'Coca-Cola 2,25 l')).toBe(true);
    expect(found('coca cola', 'Cocacola Zero')).toBe(true);
  });

  it('finds what sounds alike in Spanish', () => {
    expect(sound('koka')).toBe(sound('coca'));
    expect(found('koka', 'Coca-Cola 2,25 l')).toBe(true);
    expect(found('sapatilla', 'Zapatilla running')).toBe(true);
    expect(found('bino tinto', 'Vino tinto Malbec')).toBe(true);
    expect(found('elado', 'Helado de dulce de leche')).toBe(true);
  });

  it('forgives one or two slips, not in short words', () => {
    expect(distance('fideso', 'fideos', 2)).toBe(1);
    expect(found('fideso', 'Fideos Matarazzo 500 g')).toBe(true);
    expect(found('yerva', 'Yerba Playadito 1 kg')).toBe(true);
    expect(found('mayonesa', 'Mayonessa Hellmanns')).toBe(true);
    expect(found('pan', 'Pon de queso')).toBe(false);
    expect(found('cola', 'Colchón de 2 plazas')).toBe(false);
  });

  it('needs every word typed', () => {
    expect(found('yerba fideos', 'Yerba Playadito 1 kg')).toBe(false);
    expect(found('taladro', 'Cinta métrica 5 m')).toBe(false);
  });

  it('ranks a whole word above a slip', () => {
    expect(queryScore('yerba', searchable('Yerba Playadito'))).toBeGreaterThan(
      queryScore('yerba', searchable('Yerva mate')),
    );
  });
});

describe('Wapsell search — filters, order and pages', () => {
  const rows = [
    row('Yerba Playadito 1 kg', { marca: 'Playadito', precioCentavos: 420_000, vendidos: 3 }),
    row('Yerba Taragüi 1 kg', {
      marca: 'Taragüi',
      precioCentavos: 380_000,
      vendidos: 9,
      enOferta: true,
    }),
    row('Yerba Rosamonte 500 g', {
      marca: 'Rosamonte',
      precioCentavos: 210_000,
      tienda: { slug: 'kiosco', rubro: 'Kiosco', abiertoAhora: false },
    }),
    row('Taladro percutor', { precioCentavos: 8_900_000 }),
  ];

  it('finds by the words and offers the brands and price range left to choose', () => {
    const result = search(rows, { q: 'yerba' });
    expect(result.total).toBe(3);
    expect(result.facetas.marcas.map((m) => m.nombre).sort()).toEqual([
      'Playadito',
      'Rosamonte',
      'Taragüi',
    ]);
    expect(result.facetas.precio).toEqual({ min: 2100, max: 4200 });
  });

  it('relevance puts what sells more first among equal matches', () => {
    expect(search(rows, { q: 'yerba' }).productos[0].nombre).toBe('Yerba Taragüi 1 kg');
  });

  it('narrows by brand (without minding accents), price, offer, open now and rubro', () => {
    expect(search(rows, { q: 'yerba', marcas: ['taragui'] }).total).toBe(1);
    expect(search(rows, { q: 'yerba', max: 3000 }).productos.map((p) => p.nombre)).toEqual([
      'Yerba Rosamonte 500 g',
    ]);
    expect(search(rows, { q: 'yerba', enOferta: true }).total).toBe(1);
    expect(search(rows, { q: 'yerba', abierto: true }).total).toBe(2);
    expect(search(rows, { rubro: 'Kiosco' }).total).toBe(1);
  });

  it('orders by price and by newest', () => {
    expect(search(rows, { q: 'yerba', orden: 'precio-asc' }).productos[0].nombre).toBe(
      'Yerba Rosamonte 500 g',
    );
    expect(search(rows, { orden: 'precio-desc' }).productos[0].nombre).toBe('Taladro percutor');
    expect(search(rows, { orden: 'nuevos' }).productos[0].nombre).toBe('Taladro percutor');
  });

  it('cuts pages of 24 and keeps the page inside the range', () => {
    const many = Array.from({ length: 30 }, (_, i) => row(`Galletitas ${i}`));
    expect(search(many, { q: 'galletitas' }).productos).toHaveLength(24);
    const last = search(many, { q: 'galletitas', pagina: 9 });
    expect([last.pagina, last.paginas, last.productos.length]).toEqual([2, 2, 6]);
  });
});

describe('Wapsell search — «¿Quisiste decir…?»', () => {
  const texts = ['Yerba Playadito 1 kg', 'Fideos Matarazzo', 'Coca-Cola 2,25 l'].map(searchable);

  it('offers the word really in the products when the typed one only sounds alike', () => {
    expect(didYouMean('yerva', texts)).toBe('yerba');
    expect(didYouMean('fideso matarazo', texts)).toBe('fideos matarazzo');
  });

  it('says nothing when every word was found as typed', () => {
    expect(didYouMean('yerba', texts)).toBeNull();
    expect(didYouMean('cocacola', texts)).toBeNull();
  });
});

describe('Wapsell search — «más buscados» (step 3b)', () => {
  it('orders by how many searches find each product, never showing the number', () => {
    const rows = [
      row('Yerba Playadito', { buscados: 2, vendidos: 50 }),
      row('Yerba Taragüi', { buscados: 9 }),
    ];
    const result = search(rows, { q: 'yerba', orden: 'buscados' });
    expect(result.productos.map((p) => p.nombre)).toEqual(['Yerba Taragüi', 'Yerba Playadito']);
  });

  it('a counted word finds the text only as typed (whole, start, inside or written together)', () => {
    const text = searchable('Coca-Cola 2,25 l');
    expect(strictlyFound('coca', text)).toBe(true);
    expect(strictlyFound('cocacola', text)).toBe(true);
    expect(strictlyFound('coca cola', text)).toBe(true);
    expect(strictlyFound('koka', text)).toBe(false);
    expect(strictlyFound('', text)).toBe(false);
  });
});
