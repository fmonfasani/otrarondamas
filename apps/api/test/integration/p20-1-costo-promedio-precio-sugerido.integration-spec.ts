import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { InventoryService } from '../../src/inventory/inventory.service';
import { StockEntriesService } from '../../src/inventory/stock-entries.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PurchasesService } from '../../src/purchases/purchases.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { waitPort } from './helpers/store-catalog.fixture';

/**
 * OR-B4-046 stage C1 (ADR-DAT-009, D10). What enters with a cost (a purchase reception, the opening
 * stock) leaves the product's last cost and its moving weighted average cost. When the cost changes,
 * Wapsell suggests the price that keeps the markup; the price never changes on its own. Who changes
 * prices applies the suggestion or keeps the price, and every step is in the audit trail.
 */
describe('P20-1 — costo promedio y precio sugerido', () => {
  const PORT = '3403';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let purchases: PurchasesService;
  let entries: StockEntriesService;
  let server: ChildProcess;
  let suffix: number;
  let company: string;
  let supplier: string;
  let yerba: string;
  let fideos: string;
  const people: Record<string, { usuarioId: string; auth: string }> = {};

  async function person(role: 'OWNER' | 'VENDEDOR', key: string, legacy: string[]) {
    const email = `p20-1-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: company, nombre: `P20-1 ${key}`, email, activo: true, rol: role },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: `P20-1 ${key}`, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: company, role, status: 'ACTIVE' },
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
        data: { usuarioId: usuario.id, permisoId: permiso.id },
      });
    }
    people[key] = {
      usuarioId: usuario.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: company, permisos: [] })}`,
    };
  }

  async function product(name: string, costo: number, precioMinorista: number) {
    const familia = await prisma.familia.create({
      data: { empresaId: company, nombre: `P20-1 F ${name} ${suffix}`, prefijo: name.slice(0, 2) },
    });
    const subfamilia = await prisma.subfamilia.create({
      data: { empresaId: company, familiaId: familia.id, nombre: 'General', prefijo: 'GEN' },
    });
    const tipo = await prisma.tipo.create({
      data: { empresaId: company, subfamiliaId: subfamilia.id, nombre: 'General', prefijo: 'GEN' },
    });
    const subtipo = await prisma.subtipo.create({
      data: { empresaId: company, tipoId: tipo.id, nombre: 'General', prefijo: 'GEN' },
    });
    return (
      await prisma.producto.create({
        data: {
          empresaId: company,
          nombre: `P20-1 ${name} ${suffix}`,
          codigoInterno: `P201-${name}-${suffix}`,
          familiaId: familia.id,
          subfamiliaId: subfamilia.id,
          tipoId: tipo.id,
          subtipoId: subtipo.id,
          unidadBase: 'UNIDAD',
          costo,
          precioMinorista,
        },
      })
    ).id;
  }

  /** Buys and receives `lines` (product, quantity, unit cost) in one reception. */
  async function receive(lines: Array<[string, number, number]>) {
    const owner = people.owner.usuarioId;
    const purchase = await purchases.createPurchase(
      company,
      {
        proveedorId: supplier,
        items: lines.map(([productoId, cantidadPedida, costoUnitario]) => ({
          productoId,
          cantidadPedida,
          costoUnitario,
        })),
      },
      owner,
    );
    await purchases.issuePurchase(company, purchase.id);
    const full = await purchases.getPurchase(company, purchase.id);
    await purchases.receivePurchase(
      company,
      purchase.id,
      {
        // Two lines of one product in one reception need their own lot numbers.
        items: full.CompraItem.map((item, i) => ({
          compraItemId: item.id,
          cantidadRecibida: Number(item.cantidadPedida),
          numeroLote: `P201-${purchase.id.slice(0, 8)}-${i}`,
        })),
      },
      owner,
    );
  }

  const costs = async (id: string) => {
    const p = await prisma.producto.findUniqueOrThrow({ where: { id } });
    return {
      costo: Number(p.costo),
      costoPromedio: p.costoPromedio === null ? null : Number(p.costoPromedio),
      precioMinorista: Number(p.precioMinorista),
      precioSugerido: p.precioSugerido === null ? null : Number(p.precioSugerido),
    };
  };
  const audit = (id: string, accion: string) =>
    prisma.auditLog.findMany({
      where: { empresaId: company, entidadId: id, accion },
      orderBy: { fechaHora: 'asc' },
    });
  const review = (id: string, who: string, aplicar: boolean) =>
    request(BASE)
      .post(`/catalogo/productos/${id}/precio-sugerido`)
      .set('Authorization', people[who].auth)
      .send({ aplicar });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    const scoped = new CompanyScopedPrismaService(prisma);
    purchases = new PurchasesService(scoped);
    entries = new StockEntriesService(scoped, new InventoryService(scoped));
    suffix = Date.now();
    company = (
      await prisma.empresa.create({
        data: { nombre: `P20-1 ${suffix}`, slug: `p20-1-${suffix}`, configuracion: {} },
      })
    ).id;
    await person('OWNER', 'owner', ['productos.gestionar']);
    await person('VENDEDOR', 'seller', []);
    supplier = (
      await prisma.proveedor.create({ data: { empresaId: company, nombre: `P20-1 ${suffix}` } })
    ).id;
    yerba = await product('Yerba', 100, 150);
    fideos = await product('Fideos', 40, 60);
    server = spawnApi({ PORT, TIENDA_EMPRESA_ID: '' });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const empresaId = company;
    const usuarioIds = Object.values(people).map((p) => p.usuarioId);
    await prisma.auditLog.deleteMany({ where: { empresaId } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId } });
    await prisma.recepcionCompra.deleteMany({ where: { empresaId } });
    await prisma.compraItem.deleteMany({ where: { empresaId } });
    await prisma.compra.deleteMany({ where: { empresaId } });
    await prisma.lote.deleteMany({ where: { empresaId } });
    // Stage D1: each reception links the product to its supplier.
    await prisma.productoProveedor.deleteMany({ where: { empresaId } });
    await prisma.proveedor.deleteMany({ where: { empresaId } });
    await prisma.producto.deleteMany({ where: { empresaId } });
    await prisma.subtipo.deleteMany({ where: { empresaId } });
    await prisma.tipo.deleteMany({ where: { empresaId } });
    await prisma.subfamilia.deleteMany({ where: { empresaId } });
    await prisma.familia.deleteMany({ where: { empresaId } });
    await prisma.usuarioPermiso.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.membership.deleteMany({ where: { businessId: empresaId } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { empresaId } });
    await prisma.empresa.deleteMany({ where: { id: empresaId } });
    await prisma.$disconnect();
  });

  it('the opening stock leaves its cost as the last and the average cost', async () => {
    await entries.openingStock(
      company,
      { items: [{ productoId: yerba, cantidad: 10, costoUnitario: 100 }] },
      people.owner.usuarioId,
    );
    // Same cost as before: nothing to review.
    expect(await costs(yerba)).toEqual({
      costo: 100,
      costoPromedio: 100,
      precioMinorista: 150,
      precioSugerido: null,
    });
  });

  it('a reception with a new cost averages it, suggests a price and never changes the price', async () => {
    await receive([[yerba, 10, 120]]);
    // (10 × 100 + 10 × 120) / 20 = 110; the markup of 50 % over 120 is 180.
    expect(await costs(yerba)).toEqual({
      costo: 120,
      costoPromedio: 110,
      precioMinorista: 150,
      precioSugerido: 180,
    });
    // The opening stock left its own entry first; this one is the purchase's.
    const entry = (await audit(yerba, 'PRODUCTO_COSTO_CAMBIADO')).at(-1)!;
    expect(entry.motivo).toBe('Compra');
    expect(entry.valoresAnteriores).toMatchObject({ costo: 100, costoPromedio: 100 });
    expect(entry.valoresPosteriores).toMatchObject({
      costo: 120,
      costoPromedio: 110,
      precioMinorista: 150,
      precioSugerido: 180,
    });
  });

  it('two lines of one product in one reception: the suggestion compares with the cost before both', async () => {
    // No stock of Fideos: the average starts over. 40 → 44 → 50; the markup of 50 % over 50 is 75.
    await receive([
      [fideos, 4, 44],
      [fideos, 6, 50],
    ]);
    expect(await costs(fideos)).toEqual({
      costo: 50,
      costoPromedio: 47.6,
      precioMinorista: 60,
      precioSugerido: 75,
    });
  });

  it('only who changes prices reviews a suggestion', async () => {
    await review(yerba, 'seller', true).expect(403);
    expect((await costs(yerba)).precioMinorista).toBe(150);
  });

  it('applying the suggestion changes the price, recorded as a price change', async () => {
    const res = await review(yerba, 'owner', true).expect(200);
    expect(Number(res.body.precioMinorista)).toBe(180);
    expect(res.body.precioSugerido).toBeNull();
    const [entry] = await audit(yerba, 'PRODUCTO_PRECIO_CAMBIADO');
    expect(entry.valoresAnteriores).toMatchObject({ precioMinorista: 150 });
    expect(entry.valoresPosteriores).toMatchObject({ precioMinorista: 180 });
    // Nothing left to review.
    await review(yerba, 'owner', true).expect(409);
  });

  it('keeping the price drops the suggestion, and that is recorded too', async () => {
    await review(fideos, 'owner', false).expect(200);
    expect(await costs(fideos)).toMatchObject({ precioMinorista: 60, precioSugerido: null });
    const [entry] = await audit(fideos, 'PRODUCTO_PRECIO_SUGERIDO_DESCARTADO');
    expect(entry.valoresAnteriores).toMatchObject({ precioMinorista: 60, precioSugerido: 75 });
  });

  it('setting the price by hand answers a pending suggestion', async () => {
    await receive([[fideos, 2, 55]]);
    expect((await costs(fideos)).precioSugerido).toBe(66);
    await request(BASE)
      .patch(`/catalogo/productos/${fideos}`)
      .set('Authorization', people.owner.auth)
      .send({ precioMinorista: 70 })
      .expect(200);
    expect(await costs(fideos)).toMatchObject({ precioMinorista: 70, precioSugerido: null });
  });
});
