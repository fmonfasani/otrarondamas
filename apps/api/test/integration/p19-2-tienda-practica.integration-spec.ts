import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { deleteStoreCompanies, waitPort } from './helpers/store-catalog.fixture';

/**
 * OR-B4-047 — the practical store over the Catálogo: search without accents (name, brand, code),
 * categories with counts, brand / price / stock filters, order (featured, best sellers of 30 days,
 * price, newest), pages of 24, suggestions while typing and the product page. Only published
 * products of the store's own Business ever appear.
 */
describe('P19-2 — tienda práctica', () => {
  const PORT = '3385';
  const BASE = `http://127.0.0.1:${PORT}`;
  const DAY = 24 * 60 * 60 * 1000;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  const shops: Record<string, { id: string; slug: string }> = {};
  const ids: Record<string, string> = {};
  const cats: Record<string, string> = {};

  async function company(tag: string) {
    shops[tag] = await prisma.empresa.create({
      data: { nombre: `P19-2 ${tag} ${suffix}`, slug: `p19-2-${tag}-${suffix}`, configuracion: {} },
      select: { id: true, slug: true },
    });
    return shops[tag];
  }

  /** A category with its «General» chain, and optionally one subcategory. */
  async function category(
    companyId: string,
    nombre: string,
    prefijo: string,
    sub?: [string, string],
  ) {
    const familia = await prisma.familia.create({
      data: { empresaId: companyId, nombre, prefijo },
      select: { id: true },
    });
    const chain = async (subNombre: string, subPrefijo: string) => {
      const subfamilia = await prisma.subfamilia.create({
        data: {
          empresaId: companyId,
          familiaId: familia.id,
          nombre: subNombre,
          prefijo: subPrefijo,
        },
        select: { id: true },
      });
      const tipo = await prisma.tipo.create({
        data: {
          empresaId: companyId,
          subfamiliaId: subfamilia.id,
          nombre: 'General',
          prefijo: 'GEN',
        },
        select: { id: true },
      });
      const subtipo = await prisma.subtipo.create({
        data: { empresaId: companyId, tipoId: tipo.id, nombre: 'General', prefijo: 'GEN' },
        select: { id: true },
      });
      return {
        familiaId: familia.id,
        subfamiliaId: subfamilia.id,
        tipoId: tipo.id,
        subtipoId: subtipo.id,
      };
    };
    return { general: await chain('General', 'GEN'), sub: sub ? await chain(...sub) : undefined };
  }

  async function product(
    companyId: string,
    chain: { familiaId: string; subfamiliaId: string; tipoId: string; subtipoId: string },
    data: {
      key: string;
      nombre: string;
      codigo: string;
      marca?: string;
      precio: number;
      descuento?: number;
      stock?: number;
      destacado?: boolean;
      publicado?: boolean;
      activo?: boolean;
      createdAt?: Date;
    },
  ) {
    const created = await prisma.producto.create({
      data: {
        empresaId: companyId,
        ...chain,
        nombre: data.nombre,
        codigoInterno: `${data.codigo}-${suffix}`,
        marca: data.marca,
        unidadBase: 'UNIDAD',
        costo: 1,
        precioMinorista: data.precio,
        descuentoPorcentaje: data.descuento,
        activo: data.activo ?? true,
        publicado: data.publicado ?? true,
        destacado: data.destacado ?? false,
        descripcion: `Descripción de ${data.nombre}`,
        ...(data.createdAt ? { createdAt: data.createdAt } : {}),
      },
      select: { id: true },
    });
    if (data.stock) {
      await prisma.lote.create({
        data: {
          empresaId: companyId,
          productoId: created.id,
          numeroLote: `L-${data.key}-${suffix}`,
          vencimiento: new Date('2099-01-01'),
          cantidad: data.stock,
        },
      });
    }
    ids[data.key] = created.id;
    return created.id;
  }

  const browse = (query = '', slug = shops.shop.slug) =>
    request(BASE).get(`/${slug}/tienda/catalogo${query ? `?${query}` : ''}`);
  const listed = async (query = '') =>
    (await browse(query).expect(200)).body.productos.map(
      (p: { productoId: string }) => p.productoId,
    );

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    const shop = await company('shop');
    const other = await company('other');
    const paged = await company('paged');

    const bebidas = await category(shop.id, `Bebidas ${suffix}`, 'BEB', [
      `Gaseosas ${suffix}`,
      'GAS',
    ]);
    const almacen = await category(shop.id, `Almacén ${suffix}`, 'ALM');
    cats.bebidas = bebidas.general.familiaId;
    cats.gaseosas = bebidas.sub?.subfamiliaId as string;
    cats.almacen = almacen.general.familiaId;
    await product(shop.id, almacen.general, {
      key: 'cafe',
      nombre: 'Café molido 500 g',
      codigo: 'ALM-0001',
      marca: 'Don Ernesto',
      precio: 5900,
      stock: 10,
    });
    await product(shop.id, bebidas.sub as never, {
      key: 'cola',
      nombre: 'Gaseosa cola 2,25 L',
      codigo: 'BEB-0002',
      marca: 'Burbuja',
      precio: 2600,
      stock: 10,
      destacado: true,
    });
    await product(shop.id, bebidas.general, {
      key: 'agua',
      nombre: 'Agua mineral 1,5 L',
      codigo: 'BEB-0001',
      marca: 'Manantial',
      precio: 950,
      stock: 10,
      createdAt: new Date(Date.now() + 60_000),
    });
    await product(shop.id, bebidas.general, {
      key: 'jugo',
      nombre: 'Jugo de naranja 1 L',
      codigo: 'BEB-0003',
      marca: 'Burbuja',
      precio: 1600,
      descuento: 25,
    });
    await product(shop.id, bebidas.general, {
      key: 'cerveza',
      nombre: 'Cerveza rubia',
      codigo: 'BEB-0004',
      marca: 'Malta',
      precio: 1400,
      stock: 10,
      publicado: false,
    });
    await product(shop.id, bebidas.general, {
      key: 'vieja',
      nombre: 'Gaseosa discontinuada',
      codigo: 'BEB-0005',
      precio: 1000,
      stock: 10,
      activo: false,
      publicado: false,
    });
    const otherCat = await category(other.id, `Almacén ${suffix}`, 'ALM');
    await product(other.id, otherCat.general, {
      key: 'ajeno',
      nombre: 'Café de otro negocio',
      codigo: 'ALM-0001',
      precio: 10,
      stock: 10,
    });
    const pagedCat = await category(paged.id, `Almacén ${suffix}`, 'ALM');
    for (let n = 1; n <= 26; n++) {
      await product(paged.id, pagedCat.general, {
        key: `p${n}`,
        nombre: `Producto ${String(n).padStart(2, '0')}`,
        codigo: `ALM-${String(n).padStart(4, '0')}`,
        precio: 100,
      });
    }

    // Units sold: confirmed counter sales and confirmed store orders of the last 30 days count.
    const seller = await prisma.usuario.create({
      data: {
        empresaId: shop.id,
        nombre: 'Vendedor P19-2',
        email: `p19-2-seller-${suffix}@example.test`,
        activo: true,
        rol: 'VENDEDOR',
      },
      select: { id: true },
    });
    const sale = (
      estado: 'CONFIRMADA' | 'ANULADA',
      productoId: string,
      cantidad: number,
      createdAt = new Date(),
    ) =>
      prisma.venta.create({
        data: {
          empresaId: shop.id,
          usuarioId: seller.id,
          canal: 'mostrador',
          total: 1,
          estado,
          createdAt,
          VentaItem: { create: [{ productoId, cantidad, precioUnitario: 1 }] },
        },
      });
    await sale('CONFIRMADA', ids.agua, 5);
    await sale('ANULADA', ids.cafe, 50);
    await sale('CONFIRMADA', ids.cafe, 100, new Date(Date.now() - 40 * DAY));
    const customer = await prisma.cliente.create({
      data: {
        empresaId: shop.id,
        nombre: 'Clienta P19-2',
        email: `p19-2-buyer-${suffix}@example.test`,
      },
      select: { id: true },
    });
    const order = (
      estado: 'CONFIRMADO' | 'RECIBIDO' | 'CANCELADO',
      productoId: string,
      cantidad: number,
    ) =>
      prisma.pedido.create({
        data: {
          empresaId: shop.id,
          clienteId: customer.id,
          canalOrigen: 'web',
          total: 1,
          estado,
          PedidoItem: { create: [{ productoId, cantidad, precioUnitario: 1 }] },
        },
      });
    await order('CONFIRMADO', ids.jugo, 7);
    await order('RECIBIDO', ids.cafe, 20);
    await order('CANCELADO', ids.cafe, 20);

    server = spawnApi({ PORT, TIENDA_EMPRESA_ID: '' });
    await waitPort(Number(PORT));
  }, 180000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const companies = Object.values(shops).map((s) => s.id);
    await prisma.ventaItem.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.venta.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.usuario.deleteMany({ where: { empresaId: { in: companies } } });
    await deleteStoreCompanies(prisma, companies);
    await prisma.$disconnect();
  });

  it('lists only the published products of the store, featured first, with what can be picked', async () => {
    const res = await browse().expect(200);
    expect(res.body.productos.map((p: { productoId: string }) => p.productoId)).toEqual([
      ids.cola,
      ids.agua,
      ids.cafe,
      ids.jugo,
    ]);
    expect(res.body).toMatchObject({ total: 4, pagina: 1, paginas: 1, porPagina: 24 });
    expect(res.body.facetas.categorias).toEqual([
      { id: cats.almacen, nombre: `Almacén ${suffix}`, cantidad: 1, subcategorias: [] },
      {
        id: cats.bebidas,
        nombre: `Bebidas ${suffix}`,
        cantidad: 3,
        subcategorias: [{ id: cats.gaseosas, nombre: `Gaseosas ${suffix}`, cantidad: 1 }],
      },
    ]);
    expect(res.body.facetas.marcas).toEqual([
      { nombre: 'Burbuja', cantidad: 2 },
      { nombre: 'Don Ernesto', cantidad: 1 },
      { nombre: 'Manantial', cantidad: 1 },
    ]);
    // The juice pays 1.600 less 25 %.
    expect(res.body.facetas.precio).toEqual({ min: 950, max: 5900 });
    const juice = res.body.productos.find((p: { productoId: string }) => p.productoId === ids.jugo);
    expect(juice).toMatchObject({
      precio: '1200.00',
      precioSinDescuento: '1600.00',
      descuentoPorcentaje: 25,
      disponible: false,
    });
    expect(juice).not.toHaveProperty('costo');
    expect(juice).not.toHaveProperty('vendidos');
  });

  it('searches without accents or case, by name, brand and code', async () => {
    expect(await listed('q=cafe')).toEqual([ids.cafe]);
    expect(await listed(`q=${encodeURIComponent('CAFÉ molido')}`)).toEqual([ids.cafe]);
    expect(await listed('q=burbuja')).toEqual([ids.cola, ids.jugo]);
    expect(await listed('q=beb-0001')).toEqual([ids.agua]);
    expect(await listed('q=cerveza')).toEqual([]);
  });

  it('filters by category, subcategory, brands, price and stock', async () => {
    expect(await listed(`cat=${cats.bebidas}`)).toEqual([ids.cola, ids.agua, ids.jugo]);
    expect(await listed(`sub=${cats.gaseosas}`)).toEqual([ids.cola]);
    expect(await listed('marca=Burbuja&marca=Manantial')).toEqual([ids.cola, ids.agua, ids.jugo]);
    expect(await listed('min=1000&max=3000')).toEqual([ids.cola, ids.jugo]);
    expect(await listed('stock=1')).toEqual([ids.cola, ids.agua, ids.cafe]);
  });

  it('orders by best sellers of the last 30 days, price and newest', async () => {
    // Juice: 7 in a confirmed order. Water: 5 in a confirmed sale. Coffee's units are in an
    // annulled sale, an old sale, a received order and a cancelled one: none counts.
    expect(await listed('orden=vendidos')).toEqual([ids.jugo, ids.agua, ids.cola, ids.cafe]);
    expect(await listed('orden=precio-asc')).toEqual([ids.agua, ids.jugo, ids.cola, ids.cafe]);
    expect(await listed('orden=precio-desc')).toEqual([ids.cafe, ids.cola, ids.jugo, ids.agua]);
    expect((await listed('orden=nuevos'))[0]).toBe(ids.agua);
  });

  it('cuts pages of 24', async () => {
    const first = await browse('', shops.paged.slug).expect(200);
    expect(first.body).toMatchObject({ total: 26, pagina: 1, paginas: 2 });
    expect(first.body.productos).toHaveLength(24);
    const second = await browse('pagina=2', shops.paged.slug).expect(200);
    expect(second.body.productos.map((p: { productoId: string }) => p.productoId)).toEqual([
      ids.p25,
      ids.p26,
    ]);
  });

  it('refuses a malformed request', async () => {
    for (const query of ['orden=barato', 'cat=bebidas', 'pagina=0', 'min=-1']) {
      await browse(query).expect(400);
    }
  });

  it('hides what has no stock when the Business chose so, everywhere in the listing', async () => {
    await prisma.empresa.update({
      where: { id: shops.shop.id },
      data: { configuracion: { tienda: { ocultarSinStock: true } } },
    });
    try {
      const res = await browse().expect(200);
      expect(res.body.productos.map((p: { productoId: string }) => p.productoId)).toEqual([
        ids.cola,
        ids.agua,
        ids.cafe,
      ]);
      expect(res.body.facetas.marcas).toContainEqual({ nombre: 'Burbuja', cantidad: 1 });
      // Its page still answers, as «Sin stock»: someone may have the link.
      const page = await request(BASE)
        .get(`/${shops.shop.slug}/tienda/productos/${ids.jugo}`)
        .expect(200);
      expect(page.body.disponible).toBe(false);
    } finally {
      await prisma.empresa.update({ where: { id: shops.shop.id }, data: { configuracion: {} } });
    }
  });

  it('suggests products and categories while typing', async () => {
    const suggest = async (q: string, slug = shops.shop.slug) =>
      (
        await request(BASE)
          .get(`/${slug}/tienda/sugerencias?q=${encodeURIComponent(q)}`)
          .expect(200)
      ).body;
    const coffee = await suggest('caf');
    expect(coffee.productos).toEqual([
      {
        productoId: ids.cafe,
        nombre: 'Café molido 500 g',
        marca: 'Don Ernesto',
        precio: '5900.00',
      },
    ]);
    expect((await suggest('bebid')).categorias).toEqual([
      { id: cats.bebidas, nombre: `Bebidas ${suffix}` },
    ]);
    expect(await suggest('c')).toEqual({ productos: [], categorias: [] });
    expect((await suggest('otro negocio')).productos).toEqual([]);
    expect((await suggest('cerveza')).productos).toEqual([]);
  });

  it('shows the product page of a published product only, and never one of another Business', async () => {
    const page = await request(BASE)
      .get(`/${shops.shop.slug}/tienda/productos/${ids.cola}`)
      .expect(200);
    expect(page.body).toMatchObject({
      productoId: ids.cola,
      nombre: 'Gaseosa cola 2,25 L',
      descripcion: 'Descripción de Gaseosa cola 2,25 L',
      categoria: { id: cats.bebidas },
      subcategoria: { id: cats.gaseosas, nombre: `Gaseosas ${suffix}` },
      precio: '2600.00',
      disponible: true,
      destacado: true,
    });
    expect(page.body).not.toHaveProperty('costo');
    const coffee = await request(BASE)
      .get(`/${shops.shop.slug}/tienda/productos/${ids.cafe}`)
      .expect(200);
    expect(coffee.body.subcategoria).toBeNull();
    for (const id of [ids.cerveza, ids.vieja, ids.ajeno, 'no-existe']) {
      await request(BASE).get(`/${shops.shop.slug}/tienda/productos/${id}`).expect(404);
    }
  });
});
