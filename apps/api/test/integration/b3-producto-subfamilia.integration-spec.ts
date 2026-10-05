import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

type Jerarquia = {
  empresaId: string;
  familiaId: string;
  subfamiliaId: string;
  tipoId: string;
  subtipoId: string;
};

describe('B3 relation isolation — Producto.subfamilia ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let suffix: number;
  let secuencia = 0;
  let jerA: Jerarquia;
  let jerB: Jerarquia;

  // Cada test pide su propio codigoInterno: ningún test depende de filas de otro
  // ni puede colisionar con el @@unique([empresaId, codigoInterno]) (P2002).
  const codigoUnico = (id: string) => `B3SP-${id}-${suffix}-${++secuencia}`;

  const productoData = (jer: Jerarquia, subfamiliaId: string, codigoInterno: string) => ({
    empresaId: jer.empresaId,
    nombre: `B3 SP ${codigoInterno}`,
    codigoInterno,
    familiaId: jer.familiaId,
    subfamiliaId,
    tipoId: jer.tipoId,
    subtipoId: jer.subtipoId,
    unidadBase: 'UNIDAD' as const,
    costo: 5,
    precioMinorista: 10,
  });

  const codigoDeRechazo = async (operacion: Promise<unknown>): Promise<string> => {
    try {
      await operacion;
      return 'RESOLVED';
    } catch (error) {
      return (error as { code?: string }).code ?? 'NO_CODE';
    }
  };

  const crearJerarquia = async (etiqueta: 'A' | 'B', s: number): Promise<Jerarquia> => {
    const empresa = await prisma.empresa.create({
      data: { nombre: `B3 SP ${etiqueta} ${s}`, configuracion: {} },
      select: { id: true },
    });
    const familia = await prisma.familia.create({
      data: { empresaId: empresa.id, nombre: `B3 SP Familia ${etiqueta} ${s}`, prefijo: `F${etiqueta}P` },
      select: { id: true },
    });
    const subfamilia = await prisma.subfamilia.create({
      data: { empresaId: empresa.id, familiaId: familia.id, nombre: `B3 SP Sub ${etiqueta} ${s}`, prefijo: `S${etiqueta}P` },
      select: { id: true },
    });
    const tipo = await prisma.tipo.create({
      data: { empresaId: empresa.id, subfamiliaId: subfamilia.id, nombre: `B3 SP Tipo ${etiqueta} ${s}`, prefijo: `T${etiqueta}P` },
      select: { id: true },
    });
    const subtipo = await prisma.subtipo.create({
      data: { empresaId: empresa.id, tipoId: tipo.id, nombre: `B3 SP Subtipo ${etiqueta} ${s}`, prefijo: `X${etiqueta}P` },
      select: { id: true },
    });
    return {
      empresaId: empresa.id,
      familiaId: familia.id,
      subfamiliaId: subfamilia.id,
      tipoId: tipo.id,
      subtipoId: subtipo.id,
    };
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new EmpresaScopedPrismaService(prisma);
    suffix = Date.now();
    jerA = await crearJerarquia('A', suffix);
    jerB = await crearJerarquia('B', suffix);
  });

  afterAll(async () => {
    const jerarquias = [jerA, jerB];
    await prisma.producto.deleteMany({ where: { empresaId: { in: jerarquias.map((j) => j.empresaId) } } });
    await prisma.subtipo.deleteMany({ where: { id: { in: jerarquias.map((j) => j.subtipoId) } } });
    await prisma.tipo.deleteMany({ where: { id: { in: jerarquias.map((j) => j.tipoId) } } });
    await prisma.subfamilia.deleteMany({ where: { id: { in: jerarquias.map((j) => j.subfamiliaId) } } });
    await prisma.familia.deleteMany({ where: { id: { in: jerarquias.map((j) => j.familiaId) } } });
    await prisma.empresa.deleteMany({ where: { id: { in: jerarquias.map((j) => j.empresaId) } } });
    await prisma.$disconnect();
  });

  it('SP-01: same-Business Subfamilia reference persists', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const codigo = codigoUnico('01');
    const created = await db.producto.create({
      data: productoData(jerA, jerA.subfamiliaId, codigo),
      select: { empresaId: true, subfamiliaId: true },
    });

    expect(created.empresaId).toBe(jerA.empresaId);
    expect(created.subfamiliaId).toBe(jerA.subfamiliaId);
  });

  it('SP-02: cross-Business Subfamilia create rejects with P2025 and no persistence', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const codigo = codigoUnico('02');

    expect(
      await codigoDeRechazo(db.producto.create({ data: productoData(jerA, jerB.subfamiliaId, codigo) })),
    ).toBe('P2025');

    expect(await prisma.producto.count({ where: { codigoInterno: codigo } })).toBe(0);
  });

  it('SP-03: cross-Business Subfamilia update rejects with P2025 and preserves the relation', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const producto = await prisma.producto.create({
      data: productoData(jerA, jerA.subfamiliaId, codigoUnico('03')),
      select: { id: true },
    });

    expect(
      await codigoDeRechazo(
        db.producto.update({ where: { id: producto.id }, data: { subfamiliaId: jerB.subfamiliaId } }),
      ),
    ).toBe('P2025');

    const persisted = await prisma.producto.findUnique({
      where: { id: producto.id },
      select: { subfamiliaId: true },
    });
    expect(persisted?.subfamiliaId).toBe(jerA.subfamiliaId);
  });

  it('SP-04: rejected cross-Business create rolls back the valid Producto of the same transaction', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const valido = codigoUnico('04-OK');
    const invalido = codigoUnico('04-BAD');

    expect(
      await codigoDeRechazo(
        db.$transaction(async (tx) => {
          await tx.producto.create({ data: productoData(jerA, jerA.subfamiliaId, valido) });
          await tx.producto.create({ data: productoData(jerA, jerB.subfamiliaId, invalido) });
        }),
      ),
    ).toBe('P2025');

    expect(await prisma.producto.count({ where: { codigoInterno: { in: [valido, invalido] } } })).toBe(0);
  });

  it('SP-05: mixed createMany rejects with P2025 without partial persistence', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const valido = codigoUnico('05-OK');
    const invalido = codigoUnico('05-BAD');

    expect(
      await codigoDeRechazo(
        db.producto.createMany({
          data: [
            productoData(jerA, jerA.subfamiliaId, valido),
            productoData(jerA, jerB.subfamiliaId, invalido),
          ],
        }),
      ),
    ).toBe('P2025');

    expect(await prisma.producto.count({ where: { codigoInterno: { in: [valido, invalido] } } })).toBe(0);
  });

  it('SP-06: nonexistent Subfamilia fails closed with P2025 and no persistence', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const codigo = codigoUnico('06');

    expect(
      await codigoDeRechazo(
        db.producto.create({ data: productoData(jerA, `no-existe-${suffix}`, codigo) }),
      ),
    ).toBe('P2025');

    expect(await prisma.producto.count({ where: { codigoInterno: codigo } })).toBe(0);
  });

  it('SP-07: same-Business Subfamilia reference commits inside an interactive transaction', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const codigo = codigoUnico('07');

    await db.$transaction(async (tx) => {
      await tx.producto.create({ data: productoData(jerA, jerA.subfamiliaId, codigo) });
    });

    expect(await prisma.producto.count({ where: { codigoInterno: codigo } })).toBe(1);
  });

  it('SP-08: control — a duplicate codigoInterno is P2002, distinguishable from the ownership rejection', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const codigo = codigoUnico('08');
    await db.producto.create({ data: productoData(jerA, jerA.subfamiliaId, codigo) });

    expect(
      await codigoDeRechazo(db.producto.create({ data: productoData(jerA, jerA.subfamiliaId, codigo) })),
    ).toBe('P2002');
  });
});
