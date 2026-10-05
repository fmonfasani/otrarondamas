import { FidelizacionService } from '../../src/fidelizacion/fidelizacion.service';
import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 relation isolation — ReglaFidelizacion.familia ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let fidelizacion: FidelizacionService;
  let suffix: number;
  let secuencia = 0;

  let empresaA: { id: string };
  let empresaB: { id: string };
  let familiaA: { id: string };
  let familiaB: { id: string };

  const nombreUnico = (id: string) => `B3RF-${id}-${suffix}-${++secuencia}`;

  const codigoDeRechazo = async (operacion: Promise<unknown>): Promise<string> => {
    try {
      await operacion;
      return 'RESOLVED';
    } catch (error) {
      return (error as { code?: string }).code ?? 'NO_CODE';
    }
  };

  const crearJerarquia = async (etiqueta: 'A' | 'B', s: number, prefijo: string) => {
    const empresa = await prisma.empresa.create({
      data: { nombre: `B3 RFF ${etiqueta} ${s}`, configuracion: {} },
      select: { id: true },
    });
    const familia = await prisma.familia.create({
      data: { empresaId: empresa.id, nombre: `B3 RFF Familia ${etiqueta} ${s}`, prefijo: `${prefijo}F` },
      select: { id: true },
    });
    const subfamilia = await prisma.subfamilia.create({
      data: {
        empresaId: empresa.id,
        familiaId: familia.id,
        nombre: `B3 RFF Sub ${etiqueta} ${s}`,
        prefijo: `${prefijo}S`,
      },
      select: { id: true },
    });
    const tipo = await prisma.tipo.create({
      data: {
        empresaId: empresa.id,
        subfamiliaId: subfamilia.id,
        nombre: `B3 RFF Tipo ${etiqueta} ${s}`,
        prefijo: `${prefijo}T`,
      },
      select: { id: true },
    });
    const subtipo = await prisma.subtipo.create({
      data: {
        empresaId: empresa.id,
        tipoId: tipo.id,
        nombre: `B3 RFF Subtipo ${etiqueta} ${s}`,
        prefijo: `${prefijo}X`,
      },
      select: { id: true },
    });
    return { empresa, familia, subfamilia, tipo, subtipo };
  };

  const reglaData = (empresaId: string, familiaId: string | undefined, nombre: string) => ({
    empresaId,
    nombre,
    nivelRequerido: 'NUEVO' as const,
    descuentoPorcentaje: 10,
    familiaId,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new EmpresaScopedPrismaService(prisma);
    fidelizacion = new FidelizacionService(scopedPrisma);
    suffix = Date.now();
    const jerA = await crearJerarquia('A', suffix, 'E');
    const jerB = await crearJerarquia('B', suffix, 'R');
    empresaA = jerA.empresa;
    empresaB = jerB.empresa;
    familiaA = jerA.familia;
    familiaB = jerB.familia;
  });

  afterAll(async () => {
    const empresas = [empresaA.id, empresaB.id];
    await prisma.reglaFidelizacion.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.empresa.deleteMany({ where: { id: { in: empresas } } });
    await prisma.$disconnect();
  });

  it('RF-F-01: same-Business Familia reference persists', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const nombre = nombreUnico('01');
    const created = await db.reglaFidelizacion.create({
      data: reglaData(empresaA.id, familiaA.id, nombre),
      select: { empresaId: true, familiaId: true },
    });

    expect(created.empresaId).toBe(empresaA.id);
    expect(created.familiaId).toBe(familiaA.id);
  });

  it('RF-F-02: cross-Business Familia create rejects with P2025 and no persistence', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const nombre = nombreUnico('02');

    expect(
      await codigoDeRechazo(
        db.reglaFidelizacion.create({ data: reglaData(empresaA.id, familiaB.id, nombre) }),
      ),
    ).toBe('P2025');

    expect(await prisma.reglaFidelizacion.count({ where: { nombre } })).toBe(0);
  });

  it('RF-F-03: cross-Business Familia update rejects with P2025 and preserves the relation', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const regla = await prisma.reglaFidelizacion.create({
      data: reglaData(empresaA.id, familiaA.id, nombreUnico('03-base')),
      select: { id: true },
    });

    expect(
      await codigoDeRechazo(
        db.reglaFidelizacion.update({ where: { id: regla.id }, data: { familiaId: familiaB.id } }),
      ),
    ).toBe('P2025');

    const persisted = await prisma.reglaFidelizacion.findUnique({
      where: { id: regla.id },
      select: { familiaId: true },
    });
    expect(persisted?.familiaId).toBe(familiaA.id);
  });

  it('RF-F-04: nonexistent Familia fails closed with P2025 and no persistence', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const nombre = nombreUnico('04');

    expect(
      await codigoDeRechazo(
        db.reglaFidelizacion.create({
          data: reglaData(empresaA.id, `no-existe-${suffix}`, nombre),
        }),
      ),
    ).toBe('P2025');

    expect(await prisma.reglaFidelizacion.count({ where: { nombre } })).toBe(0);
  });

  it('RF-F-05: rejected cross-Business create rolls back the valid Regla of the same transaction', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const valido = nombreUnico('05-OK');
    const invalido = nombreUnico('05-BAD');

    expect(
      await codigoDeRechazo(
        db.$transaction(async (tx) => {
          await tx.reglaFidelizacion.create({ data: reglaData(empresaA.id, familiaA.id, valido) });
          await tx.reglaFidelizacion.create({ data: reglaData(empresaA.id, familiaB.id, invalido) });
        }),
      ),
    ).toBe('P2025');

    expect(await prisma.reglaFidelizacion.count({ where: { nombre: { in: [valido, invalido] } } })).toBe(0);
  });

  it('RF-F-06: control — service crear() with cross-Business Familia keeps rejecting without persistence', async () => {
    const nombre = nombreUnico('06');

    await expect(
      fidelizacion.crear(empresaA.id, {
        nombre,
        nivelRequerido: 'NUEVO',
        descuentoPorcentaje: 10,
        familiaId: familiaB.id,
      }),
    ).rejects.toThrow('Familia no encontrada');

    expect(await prisma.reglaFidelizacion.count({ where: { nombre } })).toBe(0);
  });

  it('RF-F-07: control — service actualizar() with cross-Business Familia keeps rejecting and preserves the relation', async () => {
    const regla = await prisma.reglaFidelizacion.create({
      data: reglaData(empresaA.id, familiaA.id, nombreUnico('07-base')),
      select: { id: true },
    });

    await expect(
      fidelizacion.actualizar(empresaA.id, regla.id, { familiaId: familiaB.id }),
    ).rejects.toThrow('Familia no encontrada');

    const persisted = await prisma.reglaFidelizacion.findUnique({
      where: { id: regla.id },
      select: { familiaId: true },
    });
    expect(persisted?.familiaId).toBe(familiaA.id);
  });
});
