import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { waitPort } from './helpers/store-catalog.fixture';

/**
 * OR-B4-046 §4.3, stage C2 — bulk price update, under PRICING_CHANGE. By category, brand or
 * supplier (ever bought from it), a percent over the price or the cost plus a margin, rounded.
 * The preview changes nothing; applying changes only the products the person saw, and only if
 * their price did not move in between. Each change is a price change in the audit trail with the
 * rule as its reason, it answers a pending suggested price, and nothing of another business moves.
 */
describe('P20-2 — actualización masiva de precios', () => {
  const PORT = '3404';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: string;
  let other: string;
  let familia: string;
  let otherFamilia: string;
  const ids: Record<string, string> = {};
  const people: Record<string, { usuarioId: string; auth: string }> = {};

  async function person(
    companyId: string,
    role: 'OWNER' | 'VENDEDOR',
    key: string,
    legacy: string[],
  ) {
    const email = `p20-2-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: companyId, nombre: `P20-2 ${key}`, email, activo: true, rol: role },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: `P20-2 ${key}`, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: companyId, role, status: 'ACTIVE' },
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
        data: { empresaId: companyId, usuarioId: usuario.id, permisoId: permiso.id },
      });
    }
    people[key] = {
      usuarioId: usuario.id,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: companyId, permisos: [] })}`,
    };
  }

  async function category(companyId: string, name: string) {
    const fam = await prisma.familia.create({
      data: { empresaId: companyId, nombre: `P20-2 ${name} ${suffix}`, prefijo: name.slice(0, 2) },
    });
    const sub = await prisma.subfamilia.create({
      data: { empresaId: companyId, familiaId: fam.id, nombre: 'General', prefijo: 'GEN' },
    });
    const tipo = await prisma.tipo.create({
      data: { empresaId: companyId, subfamiliaId: sub.id, nombre: 'General', prefijo: 'GEN' },
    });
    const subtipo = await prisma.subtipo.create({
      data: { empresaId: companyId, tipoId: tipo.id, nombre: 'General', prefijo: 'GEN' },
    });
    return { familiaId: fam.id, subfamiliaId: sub.id, tipoId: tipo.id, subtipoId: subtipo.id };
  }

  async function product(
    companyId: string,
    chain: Awaited<ReturnType<typeof category>>,
    key: string,
    marca: string,
    costo: number,
    precioMinorista: number,
  ) {
    ids[key] = (
      await prisma.producto.create({
        data: {
          empresaId: companyId,
          nombre: `P20-2 ${key} ${suffix}`,
          codigoInterno: `P202-${key}-${suffix}`,
          ...chain,
          marca,
          unidadBase: 'UNIDAD',
          costo,
          precioMinorista,
        },
      })
    ).id;
  }

  const api = (path: string, who: string, body: object) =>
    request(BASE).post(path).set('Authorization', people[who].auth).send(body);
  const price = async (key: string) =>
    Number((await prisma.producto.findUniqueOrThrow({ where: { id: ids[key] } })).precioMinorista);

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    const business = async (tag: string) =>
      (
        await prisma.empresa.create({
          data: {
            nombre: `P20-2 ${tag} ${suffix}`,
            slug: `p20-2-${tag}-${suffix}`,
            configuracion: {},
          },
        })
      ).id;
    company = await business('a');
    other = await business('b');
    await person(company, 'OWNER', 'owner', ['productos.gestionar']);
    await person(company, 'VENDEDOR', 'seller', []);
    const almacen = await category(company, 'Almacen');
    const frescos = await category(company, 'Frescos');
    familia = almacen.familiaId;
    // Almacén: Yerba and Fideos (brand «Campo»), Arroz (brand «Sur»); Frescos: Queso, without cost.
    await product(company, almacen, 'Yerba', 'Campo', 1000, 1500);
    await product(company, almacen, 'Fideos', 'campo', 400, 640);
    await product(company, almacen, 'Arroz', 'Sur', 500, 777);
    await product(company, frescos, 'Queso', 'Campo', 0, 3000);
    // Fideos was bought from the supplier; it has a pending suggested price (stage C1).
    const supplier = await prisma.proveedor.create({
      data: { empresaId: company, nombre: `P20-2 ${suffix}` },
    });
    ids.supplier = supplier.id;
    const compra = await prisma.compra.create({
      data: {
        empresaId: company,
        proveedorId: supplier.id,
        usuarioId: people.owner.usuarioId,
        estado: 'BORRADOR',
        total: 400,
      },
    });
    await prisma.compraItem.create({
      data: {
        empresaId: company,
        compraId: compra.id,
        productoId: ids.Fideos,
        cantidadPedida: 1,
        costoUnitario: 400,
      },
    });
    await prisma.producto.update({ where: { id: ids.Fideos }, data: { precioSugerido: 700 } });
    // Another business with the same category name and brand.
    const elsewhere = await category(other, 'Almacen');
    otherFamilia = elsewhere.familiaId;
    await product(other, elsewhere, 'Ajena', 'Campo', 1000, 1500);

    server = spawnApi({ PORT, TIENDA_EMPRESA_ID: '' });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    for (const empresaId of [company, other]) {
      const usuarioIds = (
        await prisma.usuario.findMany({ where: { empresaId }, select: { id: true } })
      ).map((u) => u.id);
      await prisma.auditLog.deleteMany({ where: { empresaId } });
      await prisma.compraItem.deleteMany({ where: { empresaId } });
      await prisma.compra.deleteMany({ where: { empresaId } });
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
    }
    await prisma.$disconnect();
  });

  it('previews a percent by category, rounded, and changes nothing', async () => {
    const res = await api('/catalogo/precios/vista-previa', 'owner', {
      familiaId: familia,
      modo: 'porcentaje',
      valor: 10,
      redondeo: 10,
    }).expect(200);
    expect(res.body.regla).toBe('+10 %, redondeado a $ 10');
    expect(
      res.body.productos.map((p: { nombre: string; precioNuevo: number }) => [
        p.nombre.split(' ')[1],
        p.precioNuevo,
      ]),
    ).toEqual([
      ['Arroz', 850], // 854.7
      ['Fideos', 700], // 704
      ['Yerba', 1650],
    ]);
    expect(res.body.cambian).toBe(3);
    expect(await price('Yerba')).toBe(1500);
  });

  it('filters by brand (any case) and by supplier', async () => {
    const byBrand = await api('/catalogo/precios/vista-previa', 'owner', {
      marca: 'CAMPO',
      modo: 'porcentaje',
      valor: 5,
      redondeo: 1,
    }).expect(200);
    const byId = (a: string, b: string) => a.localeCompare(b);
    expect(
      byBrand.body.productos.map((p: { productoId: string }) => p.productoId).sort(byId),
    ).toEqual([ids.Fideos, ids.Queso, ids.Yerba].sort(byId));
    const bySupplier = await api('/catalogo/precios/vista-previa', 'owner', {
      proveedorId: ids.supplier,
      modo: 'porcentaje',
      valor: 5,
      redondeo: 1,
    }).expect(200);
    expect(bySupplier.body.productos.map((p: { productoId: string }) => p.productoId)).toEqual([
      ids.Fideos,
    ]);
  });

  it('a margin over cost leaves a product without cost alone', async () => {
    const res = await api('/catalogo/precios/vista-previa', 'owner', {
      marca: 'Campo',
      modo: 'margen',
      valor: 50,
      redondeo: 1,
    }).expect(200);
    const queso = res.body.productos.find(
      (p: { productoId: string }) => p.productoId === ids.Queso,
    );
    expect(queso).toMatchObject({ precioNuevo: null, cambia: false });
    const yerba = res.body.productos.find(
      (p: { productoId: string }) => p.productoId === ids.Yerba,
    );
    expect(yerba).toMatchObject({ precioNuevo: 1500, cambia: false });
    // Fideos: 400 + 50 % = 600, below today's 640.
    const fideos = res.body.productos.find(
      (p: { productoId: string }) => p.productoId === ids.Fideos,
    );
    expect(fideos).toMatchObject({ precioNuevo: 600, cambia: true });
    expect(res.body.cambian).toBe(1);
  });

  it('only who changes prices previews or applies', async () => {
    const rule = { familiaId: familia, modo: 'porcentaje', valor: 10, redondeo: 1 };
    await api('/catalogo/precios/vista-previa', 'seller', rule).expect(403);
    await api('/catalogo/precios/actualizacion', 'seller', {
      ...rule,
      items: [{ productoId: ids.Yerba, precioActual: 1500 }],
    }).expect(403);
    expect(await price('Yerba')).toBe(1500);
  });

  it('a price that moved since the preview stops the whole update', async () => {
    await prisma.producto.update({ where: { id: ids.Arroz }, data: { precioMinorista: 800 } });
    await api('/catalogo/precios/actualizacion', 'owner', {
      familiaId: familia,
      modo: 'porcentaje',
      valor: 10,
      redondeo: 10,
      items: [
        { productoId: ids.Yerba, precioActual: 1500 },
        { productoId: ids.Arroz, precioActual: 777 },
      ],
    }).expect(409);
    expect(await price('Yerba')).toBe(1500);
    expect(await price('Arroz')).toBe(800);
  });

  it('applies to the products seen, records each change with the rule and answers the suggestion', async () => {
    const res = await api('/catalogo/precios/actualizacion', 'owner', {
      familiaId: familia,
      modo: 'porcentaje',
      valor: 10,
      redondeo: 10,
      items: [
        { productoId: ids.Yerba, precioActual: 1500 },
        { productoId: ids.Fideos, precioActual: 640 },
      ],
    }).expect(200);
    expect(res.body).toEqual({ actualizados: 2, regla: '+10 %, redondeado a $ 10' });
    expect(await price('Yerba')).toBe(1650);
    expect(await price('Fideos')).toBe(700);
    // Arroz was in the category but not confirmed: it stays.
    expect(await price('Arroz')).toBe(800);
    const fideos = await prisma.producto.findUniqueOrThrow({ where: { id: ids.Fideos } });
    expect(fideos.precioSugerido).toBeNull();
    const entries = await prisma.auditLog.findMany({
      where: { empresaId: company, accion: 'PRODUCTO_PRECIO_CAMBIADO', entidadId: ids.Yerba },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].motivo).toBe('Actualización masiva: +10 %, redondeado a $ 10');
    expect(entries[0].valoresAnteriores).toMatchObject({ precioMinorista: 1500 });
    expect(entries[0].valoresPosteriores).toMatchObject({ precioMinorista: 1650 });
  });

  it("never touches another business's products", async () => {
    const res = await api('/catalogo/precios/actualizacion', 'owner', {
      familiaId: otherFamilia,
      modo: 'porcentaje',
      valor: 10,
      redondeo: 1,
      items: [{ productoId: ids.Ajena, precioActual: 1500 }],
    }).expect(409);
    expect(res.body.message).toContain('cambiaron mientras revisabas');
    expect(await price('Ajena')).toBe(1500);
  });
});
