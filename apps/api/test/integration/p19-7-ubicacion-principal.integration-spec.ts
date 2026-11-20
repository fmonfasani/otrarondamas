import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * OR-B4-015 / R8-INV-003 (#166), stage B4, and OR-B4-050. Every business has one main location
 * («Principal», created with it) and every lot is in a location: a lot created without one goes to
 * the main location. A lot never points at another business's location. A location that holds lots
 * cannot be deleted; deleting a whole, empty business deletes its locations.
 */
describe('P19-7 — stock: ubicación principal por negocio', () => {
  let prisma: PrismaService;
  let scoped: CompanyScopedPrismaService;
  let suffix: number;
  let company: string;
  let other: string;
  let product: string;

  const business = async (name: string) =>
    (
      await prisma.empresa.create({
        data: {
          nombre: `P19-7 ${name} ${suffix}`,
          slug: `p19-7-${name}-${suffix}`,
          configuracion: {},
        },
      })
    ).id;
  const mainOf = (empresaId: string) =>
    prisma.ubicacion.findFirstOrThrow({ where: { empresaId, principal: true } });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scoped = new CompanyScopedPrismaService(prisma);
    suffix = Date.now();
    company = await business('a');
    other = await business('b');
    const familia = await prisma.familia.create({
      data: { empresaId: company, nombre: `P19-7 F ${suffix}`, prefijo: 'P7' },
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
    product = (
      await prisma.producto.create({
        data: {
          empresaId: company,
          nombre: `P19-7 Yerba ${suffix}`,
          codigoInterno: `P197-${suffix}`,
          familiaId: familia.id,
          subfamiliaId: subfamilia.id,
          tipoId: tipo.id,
          subtipoId: subtipo.id,
          unidadBase: 'UNIDAD',
          costo: 10,
          precioMinorista: 20,
        },
      })
    ).id;
  });

  afterAll(async () => {
    for (const empresaId of [company, other]) {
      await prisma.lote.deleteMany({ where: { empresaId } });
      await prisma.producto.deleteMany({ where: { empresaId } });
      await prisma.subtipo.deleteMany({ where: { empresaId } });
      await prisma.tipo.deleteMany({ where: { empresaId } });
      await prisma.subfamilia.deleteMany({ where: { empresaId } });
      await prisma.familia.deleteMany({ where: { empresaId } });
      // OR-B4-050: the business's locations go with it.
      await prisma.empresa.deleteMany({ where: { id: empresaId } });
    }
    await prisma.$disconnect();
  });

  it('a new business is born with one main location, and only one can be main', async () => {
    const locations = await prisma.ubicacion.findMany({ where: { empresaId: company } });
    expect(locations).toEqual([
      expect.objectContaining({ nombre: 'Principal', principal: true, activo: true }),
    ]);
    await expect(
      prisma.ubicacion.create({ data: { empresaId: company, nombre: 'Otra', principal: true } }),
    ).rejects.toThrow();
    // More locations are allowed (a warehouse, later with transfers).
    const warehouse = await prisma.ubicacion.create({
      data: { empresaId: company, nombre: 'Depósito' },
    });
    expect(warehouse.principal).toBe(false);
  });

  it('a lot created without a location goes to the main one; another location can be given', async () => {
    const main = await mainOf(company);
    const lot = await prisma.lote.create({
      data: {
        empresaId: company,
        productoId: product,
        numeroLote: `P197-A-${suffix}`,
        cantidad: 5,
      },
    });
    expect(lot.ubicacionId).toBe(main.id);

    const warehouse = await prisma.ubicacion.findFirstOrThrow({
      where: { empresaId: company, nombre: 'Depósito' },
    });
    const stored = await prisma.lote.create({
      data: {
        empresaId: company,
        productoId: product,
        numeroLote: `P197-B-${suffix}`,
        cantidad: 3,
        ubicacionId: warehouse.id,
      },
    });
    expect(stored.ubicacionId).toBe(warehouse.id);
  });

  it("a lot can never be in another business's location", async () => {
    const foreign = await mainOf(other);
    await expect(
      prisma.lote.create({
        data: {
          empresaId: company,
          productoId: product,
          numeroLote: `P197-X-${suffix}`,
          cantidad: 1,
          ubicacionId: foreign.id,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('a location that holds lots cannot be deleted; an empty business takes its locations with it', async () => {
    const warehouse = await prisma.ubicacion.findFirstOrThrow({
      where: { empresaId: company, nombre: 'Depósito' },
    });
    await expect(prisma.ubicacion.delete({ where: { id: warehouse.id } })).rejects.toMatchObject({
      code: 'P2003',
    });

    const empty = await business('vacio');
    expect(await prisma.ubicacion.count({ where: { empresaId: empty } })).toBe(1);
    await prisma.empresa.delete({ where: { id: empty } });
    expect(await prisma.ubicacion.count({ where: { empresaId: empty } })).toBe(0);
  });

  it("the business's client only sees its own locations", async () => {
    const seen = await scoped.forCompany(company).ubicacion.findMany();
    expect(seen.map((l) => l.empresaId)).toEqual(seen.map(() => company));
    expect(seen.map((l) => l.nombre).sort()).toEqual(['Depósito', 'Principal']);
  });
});
