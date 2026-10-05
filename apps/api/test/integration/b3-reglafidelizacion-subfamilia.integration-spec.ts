import { FidelizacionService } from '../../src/fidelizacion/fidelizacion.service';
import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 relation isolation — ReglaFidelizacion.subfamilia ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let fidelizacion: FidelizacionService;
  let suffix: number;
  let secuencia = 0;

  let empresaA: { id: string };
  let empresaB: { id: string };
  let subfamiliaA: { id: string };
  let subfamiliaB: { id: string };

  const nombreUnico = (id: string) => `B3RS-${id}-${suffix}-${++secuencia}`;

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
      data: { nombre: `B3 RSF ${etiqueta} ${s}`, configuracion: {} },
      select: { id: true },
    });
    const familia = await prisma.familia.create({
      data: { empresaId: empresa.id, nombre: `B3 RSF Familia ${etiqueta} ${s}`, prefijo: `${prefijo}F` },
      select: { id: true },
    });
    const subfamilia = await prisma.subfamilia.create({
      data: {
        empresaId: empresa.id,
        familiaId: familia.id,
        nombre: `B3 RSF Sub ${etiqueta} ${s}`,
        prefijo: `${prefijo}S`,
      },
      select: { id: true },
    });
    const tipo = await prisma.tipo.create({
      data: {
        empresaId: empresa.id,
        subfamiliaId: subfamilia.id,
        nombre: `B3 RSF Tipo ${etiqueta} ${s}`,
        prefijo: `${prefijo}T`,
      },
      select: { id: true },
    });
    const subtipo = await prisma.subtipo.create({
      data: {
        empresaId: empresa.id,
        tipoId: tipo.id,
        nombre: `B3 RSF Subtipo ${etiqueta} ${s}`,
        prefijo: `${prefijo}X`,
      },
      select: { id: true },
    });
    return { empresa, familia, subfamilia, tipo, subtipo };
  };

  const reglaData = (empresaId: string, subfamiliaId: string | undefined, nombre: string) => ({
    empresaId,
    nombre,
    nivelRequerido: 'NUEVO' as const,
    descuentoPorcentaje: 10,
    subfamiliaId,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new EmpresaScopedPrismaService(prisma);
    fidelizacion = new FidelizacionService(scopedPrisma);
    suffix = Date.now();
    const jerA = await crearJerarquia('A', suffix, 'C');
    const jerB = await crearJerarquia('B', suffix, 'D');
    empresaA = jerA.empresa;
    empresaB = jerB.empresa;
    subfamiliaA = jerA.subfamilia;
    subfamiliaB = jerB.subfamilia;
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

  it('RS-F-01: same-Business Subfamilia reference persists', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const nombre = nombreUnico('01');
    const created = await db.reglaFidelizacion.create({
      data: reglaData(empresaA.id, subfamiliaA.id, nombre),
      select: { empresaId: true, subfamiliaId: true },
    });

    expect(created.empresaId).toBe(empresaA.id);
    expect(created.subfamiliaId).toBe(subfamiliaA.id);
  });

  it('RS-F-02: cross-Business Subfamilia create rejects with P2025 and no persistence', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const nombre = nombreUnico('02');

    expect(
      await codigoDeRechazo(
        db.reglaFidelizacion.create({ data: reglaData(empresaA.id, subfamiliaB.id, nombre) }),
      ),
    ).toBe('P2025');

    expect(await prisma.reglaFidelizacion.count({ where: { nombre } })).toBe(0);
  });

  it('RS-F-03: cross-Business Subfamilia update rejects with P2025 and preserves the relation', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const regla = await prisma.reglaFidelizacion.create({
      data: reglaData(empresaA.id, subfamiliaA.id, nombreUnico('03-base')),
      select: { id: true },
    });

    expect(
      await codigoDeRechazo(
        db.reglaFidelizacion.update({ where: { id: regla.id }, data: { subfamiliaId: subfamiliaB.id } }),
      ),
    ).toBe('P2025');

    const persisted = await prisma.reglaFidelizacion.findUnique({
      where: { id: regla.id },
      select: { subfamiliaId: true },
    });
    expect(persisted?.subfamiliaId).toBe(subfamiliaA.id);
  });

  it('RS-F-04: nonexistent Subfamilia fails closed with P2025 and no persistence', async () => {
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

  it('RS-F-05: rejected cross-Business create rolls back the valid Regla of the same transaction', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const valido = nombreUnico('05-OK');
    const invalido = nombreUnico('05-BAD');

    expect(
      await codigoDeRechazo(
        db.$transaction(async (tx) => {
          await tx.reglaFidelizacion.create({ data: reglaData(empresaA.id, subfamiliaA.id, valido) });
          await tx.reglaFidelizacion.create({ data: reglaData(empresaA.id, subfamiliaB.id, invalido) });
        }),
      ),
    ).toBe('P2025');

    expect(await prisma.reglaFidelizacion.count({ where: { nombre: { in: [valido, invalido] } } })).toBe(0);
  });

  it('RS-F-06: control — service crear() with cross-Business Subfamilia keeps rejecting without persistence', async () => {
    const nombre = nombreUnico('06');

    await expect(
      fidelizacion.crear(empresaA.id, {
        nombre,
        nivelRequerido: 'NUEVO',
        descuentoPorcentaje: 10,
        subfamiliaId: subfamiliaB.id,
      }),
    ).rejects.toThrow('Subfamilia no encontrada');

    expect(await prisma.reglaFidelizacion.count({ where: { nombre } })).toBe(0);
  });

  it('RS-F-07: control — service actualizar() with cross-Business Subfamilia keeps rejecting and preserves the relation', async () => {
    const regla = await prisma.reglaFidelizacion.create({
      data: reglaData(empresaA.id, subfamiliaA.id, nombreUnico('07-base')),
      select: { id: true },
    });

    await expect(
      fidelizacion.actualizar(empresaA.id, regla.id, { subfamiliaId: subfamiliaB.id }),
    ).rejects.toThrow('Subfamilia no encontrada');

    const persisted = await prisma.reglaFidelizacion.findUnique({
      where: { id: regla.id },
      select: { subfamiliaId: true },
    });
    expect(persisted?.subfamiliaId).toBe(subfamiliaA.id);
  });
});
