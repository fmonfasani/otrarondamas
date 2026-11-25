import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PurchasesService } from '../../src/purchases/purchases.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import {
  createStoreProduct,
  deleteStoreCompanies,
  waitPort,
  deleteMessagingOf,
} from './helpers/store-catalog.fixture';

/**
 * OR-B4-052, stage D1 — the supplier's tax data (a CUIT with its check digit, VAT condition, payment
 * terms), the products each supplier provides (code, last cost, last purchase, the usual supplier)
 * kept by each reception, and the purchase suggestion: the products under their minimum stock by
 * usual supplier, which becomes a draft purchase at that supplier's cost. Purchases roles only.
 */
describe('P21-1 — proveedores y sugerencia de compra', () => {
  const PORT = '3407';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let purchases: PurchasesService;
  let server: ChildProcess;
  let suffix: number;
  let shop: { id: string; slug: string };
  let other: { id: string; slug: string };
  const ids: Record<string, string> = {};
  const people: Record<string, { usuarioId: string; auth: string }> = {};

  async function person(
    role: 'OWNER' | 'VENDEDOR' | 'GESTOR_DE_STOCK',
    key: string,
    legacy: string[],
  ) {
    const email = `p21-1-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: shop.id, nombre: `P21-1 ${key}`, email, activo: true, rol: role },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: `P21-1 ${key}`, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: shop.id, role, status: 'ACTIVE' },
    });
    // In `shadow` the legacy assignment decides the route guards.
    for (const nombre of legacy) {
      const permiso = await prisma.permiso.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
        select: { id: true },
      });
      await prisma.usuarioPermiso.create({
        data: { empresaId: shop.id, usuarioId: usuario.id, permisoId: permiso.id },
      });
    }
    people[key] = {
      usuarioId: usuario.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: shop.id, permisos: [] })}`,
    };
  }

  const api = (method: 'get' | 'post' | 'put' | 'patch', path: string, who: string) =>
    request(BASE)[method](path).set('Authorization', people[who].auth);

  /** Buys and receives `cantidad` of a product from a supplier at `costo`. */
  async function receive(supplier: string, product: string, cantidad: number, costo: number) {
    const purchase = await purchases.createPurchase(
      shop.id,
      {
        proveedorId: supplier,
        items: [{ productoId: product, cantidadPedida: cantidad, costoUnitario: costo }],
      },
      people.owner.usuarioId,
    );
    await purchases.issuePurchase(shop.id, purchase.id);
    const full = await purchases.getPurchase(shop.id, purchase.id);
    await purchases.receivePurchase(
      shop.id,
      purchase.id,
      { items: [{ compraItemId: full.CompraItem[0].id, cantidadRecibida: cantidad }] },
      people.owner.usuarioId,
    );
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    purchases = new PurchasesService(new CompanyScopedPrismaService(prisma));
    suffix = Date.now();
    const business = (tag: string) =>
      prisma.empresa.create({
        data: {
          nombre: `P21-1 ${tag} ${suffix}`,
          slug: `p21-1-${tag}-${suffix}`,
          configuracion: {},
        },
        select: { id: true, slug: true },
      });
    shop = await business('shop');
    other = await business('other');
    await person('OWNER', 'owner', ['compras.gestionar']);
    await person('GESTOR_DE_STOCK', 'stock', ['compras.gestionar']);
    await person('VENDEDOR', 'seller', []);
    // Yerba: minimum 10, 5 on hand (the fixture's lot). Azúcar: minimum 4, 5 on hand. Sal: minimum
    // 8, 5 on hand, never bought.
    for (const [key, tag, min] of [
      ['Yerba', 'Y', 10],
      ['Azucar', 'A', 4],
      ['Sal', 'S', 8],
    ] as const) {
      ids[key] = (await createStoreProduct(prisma, shop.id, 'P21-1', tag, suffix)).id;
      await prisma.producto.update({
        where: { id: ids[key] },
        data: { stockMinimo: min, costo: 100 },
      });
    }
    ids.otherSupplier = (
      await prisma.proveedor.create({
        data: { empresaId: other.id, nombre: `P21-1 Ajeno ${suffix}` },
      })
    ).id;
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const companies = [shop.id, other.id];
    const usuarioIds = Object.values(people).map((p) => p.usuarioId);
    // Messaging rows restrict deleting the members and customers they cite (D6).
    await deleteMessagingOf(prisma, companies);
    await prisma.auditLog.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.recepcionCompra.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.compraItem.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.compra.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.productoProveedor.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.proveedor.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.usuarioPermiso.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: companies } } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await deleteStoreCompanies(prisma, companies);
    await prisma.$disconnect();
  });

  it("keeps the supplier's tax data, and refuses a wrong CUIT or payment term", async () => {
    const created = await api('post', '/proveedores', 'stock')
      .send({
        nombre: 'Molino del Sur',
        cuit: '30-71234567-1',
        condicionIva: 'RESPONSABLE_INSCRIPTO',
        plazoPagoDias: 30,
      })
      .expect(201);
    expect(created.body).toMatchObject({
      cuit: '30712345671',
      condicionIva: 'RESPONSABLE_INSCRIPTO',
      plazoPagoDias: 30,
    });
    ids.molino = created.body.id;
    await api('post', '/proveedores', 'owner')
      .send({ nombre: 'Mal CUIT', cuit: '30-71234567-2' })
      .expect(400);
    await api('post', '/proveedores', 'owner')
      .send({ nombre: 'Mal plazo', plazoPagoDias: 400 })
      .expect(400);
    ids.distri = (
      await api('post', '/proveedores', 'owner')
        .send({ nombre: 'Distribuidora Centro' })
        .expect(201)
    ).body.id;
    // An empty CUIT clears it.
    const cleared = await api('patch', `/proveedores/${ids.molino}`, 'owner')
      .send({ cuit: '' })
      .expect(200);
    expect(cleared.body.cuit).toBeNull();
  });

  it('each reception keeps the last cost; the first supplier of a product is its usual one', async () => {
    await receive(ids.molino, ids.Yerba, 1, 120);
    await receive(ids.distri, ids.Yerba, 1, 110);
    const fromMolino = await api('get', `/proveedores/${ids.molino}/productos`, 'stock').expect(
      200,
    );
    expect(fromMolino.body).toEqual([
      expect.objectContaining({ productoId: ids.Yerba, costoUnitario: 120, habitual: true }),
    ]);
    const fromDistri = await api('get', `/proveedores/${ids.distri}/productos`, 'stock').expect(
      200,
    );
    expect(fromDistri.body[0]).toMatchObject({ costoUnitario: 110, habitual: false });
    expect(fromDistri.body[0].ultimaCompra).not.toBeNull();
  });

  it('marking another usual supplier unmarks the previous one; a product can be linked by hand', async () => {
    await api('put', `/proveedores/${ids.distri}/productos/${ids.Yerba}`, 'stock')
      .send({ habitual: true, codigoProveedor: 'YER-1KG' })
      .expect(200);
    const links = await prisma.productoProveedor.findMany({ where: { productoId: ids.Yerba } });
    expect(links.filter((l) => l.habitual).map((l) => l.proveedorId)).toEqual([ids.distri]);
    await api('put', `/proveedores/${ids.molino}/productos/${ids.Azucar}`, 'owner')
      .send({ costoUnitario: 80, habitual: true })
      .expect(200);
  });

  it('the suggestion groups what is under its minimum by usual supplier, at their cost', async () => {
    // Reads of purchases have no legacy guard (like GET /compras): in `shadow` the canonical
    // policy only logs. Production runs `enforce`, where the Vendedor is refused.
    if (process.env.AUTHZ_ENGINE_MODE === 'enforce') {
      await api('get', '/sugerencia-compra', 'seller').expect(403);
    }
    const res = await api('get', '/sugerencia-compra', 'stock').expect(200);
    const byName = (name: string | null) =>
      res.body.find(
        (g: { proveedor: { nombre: string } | null }) => (g.proveedor?.nombre ?? null) === name,
      );
    // Yerba: 5 + 2 received = 7 on hand, minimum 10 → up to 20: 13, at Distribuidora's 110.
    expect(byName('Distribuidora Centro').productos).toEqual([
      expect.objectContaining({
        productoId: ids.Yerba,
        disponible: 7,
        stockMinimo: 10,
        cantidadSugerida: 13,
        costoUnitario: 110,
        codigoProveedor: 'YER-1KG',
      }),
    ]);
    // Azúcar (5 on hand, minimum 4) is not low. Sal has no usual supplier: it goes last.
    expect(byName('Molino del Sur')).toBeUndefined();
    expect(res.body.at(-1)).toMatchObject({ proveedor: null });
    expect(res.body.at(-1).productos.map((p: { productoId: string }) => p.productoId)).toEqual([
      ids.Sal,
    ]);
  });

  it("the suggestion becomes a draft purchase at the supplier's cost", async () => {
    const draft = await api('post', '/sugerencia-compra/orden', 'stock')
      .send({ proveedorId: ids.distri, items: [{ productoId: ids.Yerba, cantidad: 13 }] })
      .expect(201);
    expect(draft.body.estado).toBe('BORRADOR');
    const line = await prisma.compraItem.findFirstOrThrow({ where: { compraId: draft.body.id } });
    expect(Number(line.cantidadPedida)).toBe(13);
    expect(Number(line.costoUnitario)).toBe(110);
  });

  it("never reaches another business's supplier", async () => {
    await api('get', `/proveedores/${ids.otherSupplier}/productos`, 'owner').expect(404);
    await api('post', '/sugerencia-compra/orden', 'owner')
      .send({ proveedorId: ids.otherSupplier, items: [{ productoId: ids.Yerba, cantidad: 1 }] })
      .expect(404);
  });
});
