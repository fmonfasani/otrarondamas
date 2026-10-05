import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

type Jerarquia = {
  empresaId: string;
  familiaId: string;
  subfamiliaId: string;
  tipoId: string;
  subtipoId: string;
};

describe('B3 relation isolation — Producto.tipo ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let suffix: number;
  let secuencia = 0;
  let jerA: Jerarquia;
  let jerB: Jerarquia;

  // Cada test pide su propio codigoInterno: ningún test depende de filas de otro
  // ni puede colisionar con el @@unique([empresaId, codigoInterno]) (P2002).
  const codigoUnico = (id: string) => `B3TP-${id}-${suffix}-${++secuencia}`;

  const productoData = (jer: Jerarquia, tipoId: string, codigoInterno: string) => ({
    empresaId: jer.empresaId,
    nombre: `B3 TP ${codigoInterno}`,
    codigoInterno,
    familiaId: jer.familiaId,
    subfamiliaId: jer.subfamiliaId,
    tipoId,
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
      data: { nombre: `B3 TP ${etiqueta} ${s}`, configuracion: {} },
      select: { id: true },
    });
    const familia = await prisma.familia.create({
      data: { empresaId: empresa.id, nombre: `B3 TP Familia ${etiqueta} ${s}`, prefijo: `F${etiqueta}Q` },
      select: { id: true },
    });
    const subfamilia = await prisma.subfamilia.create({
      data: { empresaId: empresa.id, familiaId: familia.id, nombre: `B3 TP Sub ${etiqueta} ${s}`, prefijo: `S${etiqueta}Q` },
      select: { id: true },
    });
    const tipo = await prisma.tipo.create({
      data: { empresaId: empresa.id, subfamiliaId: subfamilia.id, nombre: `B3 TP Tipo ${etiqueta} ${s}`, prefijo: `T${etiqueta}Q` },
      select: { id: true },
    });
    const subtipo = await prisma.subtipo.create({
      data: { empresaId: empresa.id, tipoId: tipo.id, nombre: `B3 TP Subtipo ${etiqueta} ${s}`, prefijo: `X${etiqueta}Q` },
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

  it('TP-01: same-Business Tipo reference persists', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const created = await db.producto.create({
      data: productoData(jerA, jerA.tipoId, codigoUnico('01')),
      select: { empresaId: true, tipoId: true },
    });

    expect(created.empresaId).toBe(jerA.empresaId);
    expect(created.tipoId).toBe(jerA.tipoId);
  });

  it('TP-02: cross-Business Tipo create rejects with P2025 and no persistence', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const codigo = codigoUnico('02');

    expect(
      await codigoDeRechazo(db.producto.create({ data: productoData(jerA, jerB.tipoId, codigo) })),
    ).toBe('P2025');

    expect(await prisma.producto.count({ where: { codigoInterno: codigo } })).toBe(0);
  });

  it('TP-03: cross-Business Tipo update rejects with P2025 and preserves the relation', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const producto = await prisma.producto.create({
      data: productoData(jerA, jerA.tipoId, codigoUnico('03')),
      select: { id: true },
    });

    expect(
      await codigoDeRechazo(
        db.producto.update({ where: { id: producto.id }, data: { tipoId: jerB.tipoId } }),
      ),
    ).toBe('P2025');

    const persisted = await prisma.producto.findUnique({
      where: { id: producto.id },
      select: { tipoId: true },
    });
    expect(persisted?.tipoId).toBe(jerA.tipoId);
  });

  it('TP-04: same-Business Tipo reference commits inside an interactive transaction', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const codigo = codigoUnico('04');

    await db.$transaction(async (tx) => {
      await tx.producto.create({ data: productoData(jerA, jerA.tipoId, codigo) });
    });

    expect(await prisma.producto.count({ where: { codigoInterno: codigo } })).toBe(1);
  });

  it('TP-05: rejected cross-Business create rolls back the valid Producto of the same transaction', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const valido = codigoUnico('05-OK');
    const invalido = codigoUnico('05-BAD');

    expect(
      await codigoDeRechazo(
        db.$transaction(async (tx) => {
          await tx.producto.create({ data: productoData(jerA, jerA.tipoId, valido) });
          await tx.producto.create({ data: productoData(jerA, jerB.tipoId, invalido) });
        }),
      ),
    ).toBe('P2025');

    expect(await prisma.producto.count({ where: { codigoInterno: { in: [valido, invalido] } } })).toBe(0);
  });

  it('TP-06: nonexistent Tipo fails closed with P2025 and no persistence', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const codigo = codigoUnico('06');

    expect(
      await codigoDeRechazo(
        db.producto.create({ data: productoData(jerA, `no-existe-${suffix}`, codigo) }),
      ),
    ).toBe('P2025');

    expect(await prisma.producto.count({ where: { codigoInterno: codigo } })).toBe(0);
  });

  it('TP-07: mixed createMany rejects with P2025 without partial persistence', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const valido = codigoUnico('07-OK');
    const invalido = codigoUnico('07-BAD');

    expect(
      await codigoDeRechazo(
        db.producto.createMany({
          data: [
            productoData(jerA, jerA.tipoId, valido),
            productoData(jerA, jerB.tipoId, invalido),
          ],
        }),
      ),
    ).toBe('P2025');

    expect(await prisma.producto.count({ where: { codigoInterno: { in: [valido, invalido] } } })).toBe(0);
  });

  it('TP-08: control — duplicate codigoInterno is P2002, distinguishable from the ownership rejection P2025', async () => {
    const db = scopedPrisma.forEmpresa(jerA.empresaId);
    const codigo = codigoUnico('08');
    await db.producto.create({ data: productoData(jerA, jerA.tipoId, codigo) });

    expect(
      await codigoDeRechazo(db.producto.create({ data: productoData(jerA, jerA.tipoId, codigo) })),
    ).toBe('P2002');
    expect(
      await codigoDeRechazo(db.producto.create({ data: productoData(jerA, jerB.tipoId, codigoUnico('08-X')) })),
    ).toBe('P2025');
  });
});
