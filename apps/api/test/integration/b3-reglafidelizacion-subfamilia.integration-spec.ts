import { LoyaltyService } from '../../src/loyalty/loyalty.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 relation isolation — ReglaFidelizacion.subfamilia ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let loyalty: LoyaltyService;
  let suffix: number;
  let sequence = 0;

  let companyA: { id: string };
  let companyB: { id: string };
  let subfamilyA: { id: string };
  let subfamilyB: { id: string };

  const uniqueName = (id: string) => `B3RS-${id}-${suffix}-${++sequence}`;

  const rejectionCode = async (operation: Promise<unknown>): Promise<string> => {
    try {
      await operation;
      return 'RESOLVED';
    } catch (error) {
      return (error as { code?: string }).code ?? 'NO_CODE';
    }
  };

  const createHierarchy = async (label: 'A' | 'B', s: number, prefix: string) => {
    const company = await prisma.empresa.create({
      data: { nombre: `B3 RSF ${label} ${s}`, configuracion: {} },
      select: { id: true },
    });
    const family = await prisma.familia.create({
      data: {
        empresaId: company.id,
        nombre: `B3 RSF Familia ${label} ${s}`,
        prefijo: `${prefix}F`,
      },
      select: { id: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: {
        empresaId: company.id,
        familiaId: family.id,
        nombre: `B3 RSF Sub ${label} ${s}`,
        prefijo: `${prefix}S`,
      },
      select: { id: true },
    });
    const type = await prisma.tipo.create({
      data: {
        empresaId: company.id,
        subfamiliaId: subfamily.id,
        nombre: `B3 RSF Tipo ${label} ${s}`,
        prefijo: `${prefix}T`,
      },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: {
        empresaId: company.id,
        tipoId: type.id,
        nombre: `B3 RSF Subtipo ${label} ${s}`,
        prefijo: `${prefix}X`,
      },
      select: { id: true },
    });
    return {
      empresa: company,
      familia: family,
      subfamilia: subfamily,
      tipo: type,
      subtipo: subtype,
    };
  };

  const ruleData = (companyId: string, subfamilyId: string | undefined, name: string) => ({
    empresaId: companyId,
    nombre: name,
    nivelRequerido: 'NUEVO' as const,
    descuentoPorcentaje: 10,
    subfamiliaId: subfamilyId,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);
    loyalty = new LoyaltyService(scopedPrisma);
    suffix = Date.now();
    const hierA = await createHierarchy('A', suffix, 'C');
    const hierB = await createHierarchy('B', suffix, 'D');
    companyA = hierA.empresa;
    companyB = hierB.empresa;
    subfamilyA = hierA.subfamilia;
    subfamilyB = hierB.subfamilia;
  });

  afterAll(async () => {
    const companies = [companyA.id, companyB.id];
    await prisma.reglaFidelizacion.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();
  });

  it('RS-F-01: same-Business Subfamilia reference persists', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const name = uniqueName('01');
    const created = await db.reglaFidelizacion.create({
      data: ruleData(companyA.id, subfamilyA.id, name),
      select: { empresaId: true, subfamiliaId: true },
    });

    expect(created.empresaId).toBe(companyA.id);
    expect(created.subfamiliaId).toBe(subfamilyA.id);
  });

  it('RS-F-02: cross-Business Subfamilia create rejects with P2025 and no persistence', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const name = uniqueName('02');

    expect(
      await rejectionCode(
        db.reglaFidelizacion.create({ data: ruleData(companyA.id, subfamilyB.id, name) }),
      ),
    ).toBe('P2025');

    expect(await prisma.reglaFidelizacion.count({ where: { nombre: name } })).toBe(0);
  });

  it('RS-F-03: cross-Business Subfamilia update rejects with P2025 and preserves the relation', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const rule = await prisma.reglaFidelizacion.create({
      data: ruleData(companyA.id, subfamilyA.id, uniqueName('03-base')),
      select: { id: true },
    });

    expect(
      await rejectionCode(
        db.reglaFidelizacion.update({
          where: { id: rule.id },
          data: { subfamiliaId: subfamilyB.id },
        }),
      ),
    ).toBe('P2025');

    const persisted = await prisma.reglaFidelizacion.findUnique({
      where: { id: rule.id },
      select: { subfamiliaId: true },
    });
    expect(persisted?.subfamiliaId).toBe(subfamilyA.id);
  });

  it('RS-F-04: nonexistent Subfamilia fails closed with P2025 and no persistence', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const name = uniqueName('04');

    expect(
      await rejectionCode(
        db.reglaFidelizacion.create({
          data: ruleData(companyA.id, `no-existe-${suffix}`, name),
        }),
      ),
    ).toBe('P2025');

    expect(await prisma.reglaFidelizacion.count({ where: { nombre: name } })).toBe(0);
  });

  it('RS-F-05: rejected cross-Business create rolls back the valid Regla of the same transaction', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const valid = uniqueName('05-OK');
    const invalid = uniqueName('05-BAD');

    expect(
      await rejectionCode(
        db.$transaction(async (tx) => {
          await tx.reglaFidelizacion.create({ data: ruleData(companyA.id, subfamilyA.id, valid) });
          await tx.reglaFidelizacion.create({
            data: ruleData(companyA.id, subfamilyB.id, invalid),
          });
        }),
      ),
    ).toBe('P2025');

    expect(
      await prisma.reglaFidelizacion.count({ where: { nombre: { in: [valid, invalid] } } }),
    ).toBe(0);
  });

  it('RS-F-06: control — service create() with cross-Business Subfamilia keeps rejecting without persistence', async () => {
    const name = uniqueName('06');

    await expect(
      loyalty.create(companyA.id, {
        nombre: name,
        nivelRequerido: 'NUEVO',
        descuentoPorcentaje: 10,
        subfamiliaId: subfamilyB.id,
      }),
    ).rejects.toThrow('Subfamilia no encontrada');

    expect(await prisma.reglaFidelizacion.count({ where: { nombre: name } })).toBe(0);
  });

  it('RS-F-07: control — service update() with cross-Business Subfamilia keeps rejecting and preserves the relation', async () => {
    const rule = await prisma.reglaFidelizacion.create({
      data: ruleData(companyA.id, subfamilyA.id, uniqueName('07-base')),
      select: { id: true },
    });

    await expect(
      loyalty.update(companyA.id, rule.id, { subfamiliaId: subfamilyB.id }),
    ).rejects.toThrow('Subfamilia no encontrada');

    const persisted = await prisma.reglaFidelizacion.findUnique({
      where: { id: rule.id },
      select: { subfamiliaId: true },
    });
    expect(persisted?.subfamiliaId).toBe(subfamilyA.id);
  });
});
