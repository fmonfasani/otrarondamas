import { LoyaltyService } from '../../src/loyalty/loyalty.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 relation isolation — ReglaFidelizacion.familia ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let loyalty: LoyaltyService;
  let suffix: number;
  let sequence = 0;

  let companyA: { id: string };
  let companyB: { id: string };
  let familyA: { id: string };
  let familyB: { id: string };

  const uniqueName = (id: string) => `B3RF-${id}-${suffix}-${++sequence}`;

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
      data: { nombre: `B3 RFF ${label} ${s}`, slug: `b3-reglafidelizacion-familia-${label.toLowerCase()}-${s}`, configuracion: {} },
      select: { id: true },
    });
    const family = await prisma.familia.create({
      data: {
        empresaId: company.id,
        nombre: `B3 RFF Familia ${label} ${s}`,
        prefijo: `${prefix}F`,
      },
      select: { id: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: {
        empresaId: company.id,
        familiaId: family.id,
        nombre: `B3 RFF Sub ${label} ${s}`,
        prefijo: `${prefix}S`,
      },
      select: { id: true },
    });
    const type = await prisma.tipo.create({
      data: {
        empresaId: company.id,
        subfamiliaId: subfamily.id,
        nombre: `B3 RFF Tipo ${label} ${s}`,
        prefijo: `${prefix}T`,
      },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: {
        empresaId: company.id,
        tipoId: type.id,
        nombre: `B3 RFF Subtipo ${label} ${s}`,
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

  const ruleData = (companyId: string, familyId: string | undefined, name: string) => ({
    empresaId: companyId,
    nombre: name,
    nivelRequerido: 'NUEVO' as const,
    descuentoPorcentaje: 10,
    familiaId: familyId,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);
    loyalty = new LoyaltyService(scopedPrisma);
    suffix = Date.now();
    const hierA = await createHierarchy('A', suffix, 'E');
    const hierB = await createHierarchy('B', suffix, 'R');
    companyA = hierA.empresa;
    companyB = hierB.empresa;
    familyA = hierA.familia;
    familyB = hierB.familia;
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

  it('RF-F-01: same-Business Familia reference persists', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const name = uniqueName('01');
    const created = await db.reglaFidelizacion.create({
      data: ruleData(companyA.id, familyA.id, name),
      select: { empresaId: true, familiaId: true },
    });

    expect(created.empresaId).toBe(companyA.id);
    expect(created.familiaId).toBe(familyA.id);
  });

  it('RF-F-02: cross-Business Familia create rejects with P2025 and no persistence', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const name = uniqueName('02');

    expect(
      await rejectionCode(
        db.reglaFidelizacion.create({ data: ruleData(companyA.id, familyB.id, name) }),
      ),
    ).toBe('P2025');

    expect(await prisma.reglaFidelizacion.count({ where: { nombre: name } })).toBe(0);
  });

  it('RF-F-03: cross-Business Familia update rejects with P2025 and preserves the relation', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const rule = await prisma.reglaFidelizacion.create({
      data: ruleData(companyA.id, familyA.id, uniqueName('03-base')),
      select: { id: true },
    });

    expect(
      await rejectionCode(
        db.reglaFidelizacion.update({ where: { id: rule.id }, data: { familiaId: familyB.id } }),
      ),
    ).toBe('P2025');

    const persisted = await prisma.reglaFidelizacion.findUnique({
      where: { id: rule.id },
      select: { familiaId: true },
    });
    expect(persisted?.familiaId).toBe(familyA.id);
  });

  it('RF-F-04: nonexistent Familia fails closed with P2025 and no persistence', async () => {
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

  it('RF-F-05: rejected cross-Business create rolls back the valid Regla of the same transaction', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const valid = uniqueName('05-OK');
    const invalid = uniqueName('05-BAD');

    expect(
      await rejectionCode(
        db.$transaction(async (tx) => {
          await tx.reglaFidelizacion.create({ data: ruleData(companyA.id, familyA.id, valid) });
          await tx.reglaFidelizacion.create({ data: ruleData(companyA.id, familyB.id, invalid) });
        }),
      ),
    ).toBe('P2025');

    expect(
      await prisma.reglaFidelizacion.count({ where: { nombre: { in: [valid, invalid] } } }),
    ).toBe(0);
  });

  it('RF-F-06: control — service create() with cross-Business Familia keeps rejecting without persistence', async () => {
    const name = uniqueName('06');

    await expect(
      loyalty.create(companyA.id, {
        nombre: name,
        nivelRequerido: 'NUEVO',
        descuentoPorcentaje: 10,
        familiaId: familyB.id,
      }),
    ).rejects.toThrow('Familia no encontrada');

    expect(await prisma.reglaFidelizacion.count({ where: { nombre: name } })).toBe(0);
  });

  it('RF-F-07: control — service update() with cross-Business Familia keeps rejecting and preserves the relation', async () => {
    const rule = await prisma.reglaFidelizacion.create({
      data: ruleData(companyA.id, familyA.id, uniqueName('07-base')),
      select: { id: true },
    });

    await expect(loyalty.update(companyA.id, rule.id, { familiaId: familyB.id })).rejects.toThrow(
      'Familia no encontrada',
    );

    const persisted = await prisma.reglaFidelizacion.findUnique({
      where: { id: rule.id },
      select: { familiaId: true },
    });
    expect(persisted?.familiaId).toBe(familyA.id);
  });
});
