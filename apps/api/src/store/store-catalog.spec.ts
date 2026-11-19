import {
  PAGE_SIZE,
  brandFacet,
  browse,
  categoryFacet,
  matchesQuery,
  normalize,
  sortRows,
  suggest,
  type CatalogRow,
} from './store-catalog';

const row = (
  over: Partial<CatalogRow> & Pick<CatalogRow, 'productoId' | 'nombre'>,
): CatalogRow => ({
  marca: null,
  codigoInterno: over.productoId.toUpperCase(),
  familiaId: 'beb',
  subfamiliaId: 'beb-gen',
  unidadBase: 'UNIDAD',
  destacado: false,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  precioCentavos: 100000,
  stockTotal: 5,
  vendidos: 0,
  ...over,
});

const hierarchy = {
  familias: [
    { id: 'beb', nombre: 'Bebidas' },
    { id: 'alm', nombre: 'Almacén' },
    { id: 'lim', nombre: 'Limpieza' },
  ],
  subfamilias: [
    { id: 'beb-gen', familiaId: 'beb', nombre: 'General', general: true },
    { id: 'beb-gas', familiaId: 'beb', nombre: 'Gaseosas', general: false },
    { id: 'alm-gen', familiaId: 'alm', nombre: 'General', general: true },
    { id: 'lim-gen', familiaId: 'lim', nombre: 'General', general: true },
  ],
};

const cafe = row({
  productoId: 'cafe',
  nombre: 'Café molido 500 g',
  marca: 'Don Ernesto',
  familiaId: 'alm',
  subfamiliaId: 'alm-gen',
  precioCentavos: 590000,
  vendidos: 3,
});
const cola = row({
  productoId: 'cola',
  nombre: 'Gaseosa cola 2,25 L',
  marca: 'Burbuja',
  subfamiliaId: 'beb-gas',
  precioCentavos: 260000,
  destacado: true,
  vendidos: 9,
});
const agua = row({
  productoId: 'agua',
  nombre: 'Agua mineral 1,5 L',
  marca: 'Manantial',
  precioCentavos: 95000,
  createdAt: new Date('2026-11-18T00:00:00Z'),
});
const jugo = row({
  productoId: 'jugo',
  nombre: 'Jugo de naranja 1 L',
  marca: 'Burbuja',
  precioCentavos: 160000,
  stockTotal: 0,
  vendidos: 9,
});
const rows = [cafe, cola, agua, jugo];

describe('store catalog (OR-B4-047)', () => {
  it('ignores accents and case', () => {
    expect(normalize('  Café MOLIDO ')).toBe('cafe molido');
    expect(matchesQuery(cafe, 'cafe')).toBe(true);
    expect(matchesQuery(cafe, 'CAFÉ ernesto')).toBe(true);
    expect(matchesQuery(cafe, 'cafe naranja')).toBe(false);
    expect(matchesQuery(cafe, 'CAFE')).toBe(true);
  });

  it('searches the name, the brand and the code', () => {
    expect(matchesQuery(cola, 'burbuja')).toBe(true);
    expect(matchesQuery(cola, 'COLA')).toBe(true);
    expect(matchesQuery(agua, 'agu')).toBe(true);
  });

  it('orders by featured, best sellers, price and newest', () => {
    const ids = (order: Parameters<typeof sortRows>[1]) =>
      sortRows(rows, order).map((r) => r.productoId);
    expect(ids('destacados')).toEqual(['cola', 'agua', 'cafe', 'jugo']);
    // Same units sold: the featured one goes first.
    expect(ids('vendidos')).toEqual(['cola', 'jugo', 'cafe', 'agua']);
    expect(ids('precio-asc')).toEqual(['agua', 'jugo', 'cola', 'cafe']);
    expect(ids('precio-desc')).toEqual(['cafe', 'cola', 'jugo', 'agua']);
    expect(ids('nuevos')[0]).toBe('agua');
  });

  it('counts categories and subcategories, leaving out empty ones and the «General» one', () => {
    expect(categoryFacet(rows, hierarchy.familias, hierarchy.subfamilias)).toEqual([
      { id: 'alm', nombre: 'Almacén', cantidad: 1, subcategorias: [] },
      {
        id: 'beb',
        nombre: 'Bebidas',
        cantidad: 3,
        subcategorias: [{ id: 'beb-gas', nombre: 'Gaseosas', cantidad: 1 }],
      },
    ]);
  });

  it('counts brands, most products first', () => {
    expect(brandFacet(rows)).toEqual([
      { nombre: 'Burbuja', cantidad: 2 },
      { nombre: 'Don Ernesto', cantidad: 1 },
      { nombre: 'Manantial', cantidad: 1 },
    ]);
  });

  it('filters by category, brand, price and stock, and keeps the facets of what can still be picked', () => {
    const result = browse(rows, { cat: 'beb', marcas: ['burbuja'], conStock: true }, hierarchy);
    expect(result.productos.map((r) => r.productoId)).toEqual(['cola']);
    // Categories count the whole catalog (no search); brands and prices count the category.
    expect(result.facetas.categorias.map((c) => c.cantidad)).toEqual([1, 3]);
    expect(result.facetas.marcas).toEqual([
      { nombre: 'Burbuja', cantidad: 2 },
      { nombre: 'Manantial', cantidad: 1 },
    ]);
    expect(result.facetas.precio).toEqual({ min: 950, max: 2600 });
    const cheap = browse(rows, { min: 900, max: 1600 }, hierarchy);
    expect(cheap.productos.map((r) => r.productoId)).toEqual(['agua', 'jugo']);
  });

  it('a search narrows the category counts too', () => {
    const result = browse(rows, { q: 'burbuja' }, hierarchy);
    expect(result.facetas.categorias).toEqual([
      {
        id: 'beb',
        nombre: 'Bebidas',
        cantidad: 2,
        subcategorias: [{ id: 'beb-gas', nombre: 'Gaseosas', cantidad: 1 }],
      },
    ]);
  });

  it('cuts pages of 24 and keeps the page within range', () => {
    const many = Array.from({ length: 30 }, (_, n) =>
      row({ productoId: `p${n}`, nombre: `Producto ${String(n).padStart(2, '0')}` }),
    );
    const first = browse(many, {}, hierarchy);
    expect(first).toMatchObject({ total: 30, pagina: 1, paginas: 2, porPagina: PAGE_SIZE });
    expect(first.productos).toHaveLength(24);
    const second = browse(many, { pagina: 2 }, hierarchy);
    expect(second.productos.map((r) => r.productoId)).toEqual([
      'p24',
      'p25',
      'p26',
      'p27',
      'p28',
      'p29',
    ]);
    expect(browse(many, { pagina: 99 }, hierarchy).pagina).toBe(2);
    expect(browse([], {}, hierarchy)).toMatchObject({
      total: 0,
      pagina: 1,
      paginas: 1,
      facetas: { precio: null },
    });
  });

  it('suggests names that start with the query first, and matching categories', () => {
    const extra = row({ productoId: 'beb-x', nombre: 'Bebida isotónica', marca: 'Sport' });
    const result = suggest([...rows, extra], 'beb', hierarchy.familias);
    expect(result.productos.map((r) => r.productoId)).toEqual(['beb-x']);
    expect(result.categorias).toEqual([{ id: 'beb', nombre: 'Bebidas' }]);
    expect(suggest(rows, 'a', hierarchy.familias)).toEqual({ productos: [], categorias: [] });
    // «na» is inside «naranja» and the brand «Manantial»: none starts with it, so by name.
    expect(suggest(rows, 'na', hierarchy.familias).productos.map((r) => r.productoId)).toEqual([
      'agua',
      'jugo',
    ]);
  });
});
