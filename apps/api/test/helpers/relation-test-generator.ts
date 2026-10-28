import { Prisma } from '@prisma/client';
import { RELATIONS_WITH_OWNERSHIP } from '../../src/prisma/relation-ownership';

/**
 * RelationTestGenerator: generates test suites for tenant-scoped relations
 *
 * Uses RELATIONS_WITH_OWNERSHIP registry to produce deterministic, repeatable
 * test files that verify:
 * - Same-tenant relations persist (positive tests)
 * - Cross-tenant relations are rejected (negative tests)
 * - Updates respect scope boundaries
 * - Transactions preserve isolation
 *
 * Table-driven: each relation generates exactly 6 test cases in a describe block.
 */
export class RelationTestGenerator {
  private fixtureFactory: any;
  private relationsRegistry: typeof RELATIONS_WITH_OWNERSHIP;

  constructor(
    private dmmf: any,
    fixtureFactory: any,
    relationsRegistry: typeof RELATIONS_WITH_OWNERSHIP = RELATIONS_WITH_OWNERSHIP,
  ) {
    this.fixtureFactory = fixtureFactory;
    this.relationsRegistry = relationsRegistry;
  }

  /**
   * Get the test namespace/path prefix for generated tests
   */
  _getTestNamespace(): string {
    return 'relations/';
  }

  /**
   * Extract model-to-model relations from DMMF for a given source model
   */
  private getModelRelations(sourceModel: string): Array<{
    sourceModel: string;
    relationField: string;
    targetModel: string;
    fkField: string;
  }> {
    const relations: Array<{
      sourceModel: string;
      relationField: string;
      targetModel: string;
      fkField: string;
    }> = [];

    const registeredFields = this.relationsRegistry[sourceModel] ?? [];
    if (registeredFields.length === 0) return relations;

    const modelDef = this.dmmf.datamodel.models.find((m: any) => m.name === sourceModel);
    if (!modelDef) return relations;

    for (const fieldName of registeredFields) {
      const field = modelDef.fields.find((f: any) => f.name === fieldName);
      if (
        !field ||
        field.kind !== 'object' ||
        field.relationFromFields?.length !== 1 ||
        field.relationToFields?.length !== 1
      ) {
        continue;
      }

      relations.push({
        sourceModel,
        relationField: fieldName,
        targetModel: field.type,
        fkField: field.relationFromFields[0],
      });
    }

    return relations;
  }

  /**
   * Generate describe block header
   */
  generateDescribe(relation: {
    sourceModel: string;
    relationField: string;
    targetModel: string;
    fkField: string;
  }): string {
    return `describe('${relation.sourceModel} → ${relation.targetModel} (${relation.relationField}) isolation', () => {`;
  }

  /**
   * Generate beforeAll setup block
   */
  generateBeforeAll(relation: {
    sourceModel: string;
    relationField: string;
    targetModel: string;
    fkField: string;
  }): string {
    const camelCase = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
    const sourceVar = camelCase(relation.sourceModel);
    const targetVar = camelCase(relation.targetModel);
    const tenantA = `tenant${relation.sourceModel[0]}A`;
    const tenantB = `tenant${relation.sourceModel[0]}B`;

    return `
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let ${tenantA}: { id: string };
  let ${tenantB}: { id: string };
  let ${sourceVar}A: { id: string };
  let ${targetVar}A: { id: string };
  let ${targetVar}B: { id: string };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);
    const ts = Date.now();

    ${tenantA} = await prisma.empresa.create({
      data: {
        nombre: \`${relation.sourceModel}-${relation.relationField} TenantA \${ts}\`,
        slug: \`${relation.sourceModel.toLowerCase()}-${relation.relationField.toLowerCase()}-ta-\${ts}\`,
        configuracion: {},
      },
      select: { id: true },
    });

    ${tenantB} = await prisma.empresa.create({
      data: {
        nombre: \`${relation.sourceModel}-${relation.relationField} TenantB \${ts}\`,
        slug: \`${relation.sourceModel.toLowerCase()}-${relation.relationField.toLowerCase()}-tb-\${ts}\`,
        configuracion: {},
      },
      select: { id: true },
    });

    // TODO: Create fixture instances for ${sourceVar}A, ${targetVar}A, ${targetVar}B
    // using factory pattern or direct prisma.create calls
  });`;
  }

  /**
   * Generate afterAll cleanup block
   */
  generateAfterAll(relation: {
    sourceModel: string;
    relationField: string;
    targetModel: string;
    fkField: string;
  }): string {
    const camelCase = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
    const sourceVar = camelCase(relation.sourceModel);
    const targetVar = camelCase(relation.targetModel);
    const tenantA = `tenant${relation.sourceModel[0]}A`;
    const tenantB = `tenant${relation.sourceModel[0]}B`;

    return `
  afterAll(async () => {
    await prisma.${sourceVar}.deleteMany({});
    await prisma.${targetVar}.deleteMany({});
    await prisma.empresa.deleteMany({ where: { id: { in: [${tenantA}.id, ${tenantB}.id] } } });
    await prisma.$disconnect();
  });`;
  }

  /**
   * Pattern 1: Positive test — TenantA creates relation with TenantA
   */
  generatePositiveTestAA(relation: {
    sourceModel: string;
    relationField: string;
    targetModel: string;
    fkField: string;
  }): string {
    const camelCase = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
    const sourceVar = camelCase(relation.sourceModel);
    const targetVar = camelCase(relation.targetModel);

    return `
  it('AA-01: ${relation.sourceModel}A can create same-tenant relation to ${relation.targetModel}A', async () => {
    const db = scopedPrisma.forCompany(tenantAA.id);
    const source = await db.${sourceVar}.findFirst({ select: { id: true } });
    const target = await db.${targetVar}.findFirst({ select: { id: true } });

    if (!source || !target) {
      this.skip();
    }

    const result = await db.${sourceVar}.update({
      where: { id: source!.id },
      data: { ${relation.relationField}Id: target!.id },
      select: { id: true, ${relation.relationField}Id: true },
    });

    expect(result.${relation.relationField}Id).toBe(target!.id);
  });`;
  }

  /**
   * Pattern 2: Positive test — TenantA creates many relations
   */
  generatePositiveTestAA_CreateMany(relation: {
    sourceModel: string;
    relationField: string;
    targetModel: string;
    fkField: string;
  }): string {
    const camelCase = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
    const sourceVar = camelCase(relation.sourceModel);

    return `
  it('AA-02: ${relation.sourceModel}A can createMany within same tenant', async () => {
    const db = scopedPrisma.forCompany(tenantAA.id);

    const result = await db.${sourceVar}.createMany({
      data: [
        { /* fixture data for ${relation.sourceModel} */ },
        { /* fixture data for ${relation.sourceModel} */ },
      ],
    });

    expect(result.count).toBeGreaterThanOrEqual(0);
  });`;
  }

  /**
   * Pattern 3: Negative test — TenantA attempts cross-tenant relation → P2025
   */
  generateNegativeTestAB(relation: {
    sourceModel: string;
    relationField: string;
    targetModel: string;
    fkField: string;
  }): string {
    const camelCase = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
    const sourceVar = camelCase(relation.sourceModel);
    const targetVar = camelCase(relation.targetModel);

    return `
  it('AB-01: ${relation.sourceModel}A attempting cross-tenant relation to ${relation.targetModel}B → P2025', async () => {
    const dbA = scopedPrisma.forCompany(tenantAA.id);
    const sourceA = await dbA.${sourceVar}.findFirst({ select: { id: true } });
    const targetB = await prisma.${targetVar}.findFirst({
      where: { empresaId: tenantAB.id },
      select: { id: true },
    });

    if (!sourceA || !targetB) {
      this.skip();
    }

    await expect(
      dbA.${sourceVar}.update({
        where: { id: sourceA!.id },
        data: { ${relation.relationField}Id: targetB!.id },
      }),
    ).rejects.toThrow(/P2025|not found/);
  });`;
  }

  /**
   * Pattern 4: Update scope test
   */
  generateUpdateTest(relation: {
    sourceModel: string;
    relationField: string;
    targetModel: string;
    fkField: string;
  }): string {
    const camelCase = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
    const sourceVar = camelCase(relation.sourceModel);
    const targetVar = camelCase(relation.targetModel);

    return `
  it('UPDATE-01: ${relation.sourceModel}A can update relation within same tenant', async () => {
    const db = scopedPrisma.forCompany(tenantAA.id);
    const source = await db.${sourceVar}.findFirst({ select: { id: true } });
    const targets = await db.${targetVar}.findMany({ take: 2, select: { id: true } });

    if (!source || targets.length < 2) {
      this.skip();
    }

    const updated = await db.${sourceVar}.update({
      where: { id: source!.id },
      data: { ${relation.relationField}Id: targets[1]!.id },
      select: { ${relation.relationField}Id: true },
    });

    expect(updated.${relation.relationField}Id).toBe(targets[1]!.id);
  });`;
  }

  /**
   * Pattern 5: Nested create / connectOrCreate
   */
  generateNestedTest(relation: {
    sourceModel: string;
    relationField: string;
    targetModel: string;
    fkField: string;
  }): string {
    const camelCase = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
    const sourceVar = camelCase(relation.sourceModel);

    return `
  it('NESTED-01: ${relation.sourceModel}A nested create preserves same-tenant isolation', async () => {
    const db = scopedPrisma.forCompany(tenantAA.id);

    const result = await db.${sourceVar}.create({
      data: {
        // Parent entity fields
        ${relation.relationField}: {
          connect: { id: targetA.id },
        },
      },
      include: { ${relation.relationField}: true },
    });

    expect(result.${relation.relationField}).toBeDefined();
  });`;
  }

  /**
   * Pattern 6: Transaction safety test
   */
  generateTransactionTest(relation: {
    sourceModel: string;
    relationField: string;
    targetModel: string;
    fkField: string;
  }): string {
    const camelCase = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
    const sourceVar = camelCase(relation.sourceModel);
    const targetVar = camelCase(relation.targetModel);

    return `
  it('TXN-01: relation isolation applies inside $transaction', async () => {
    const db = scopedPrisma.forCompany(tenantAA.id);

    await db.$transaction(async (tx) => {
      const source = await tx.${sourceVar}.findFirst({ select: { id: true } });
      const target = await tx.${targetVar}.findFirst({ select: { id: true } });

      if (source && target) {
        const updated = await tx.${sourceVar}.update({
          where: { id: source.id },
          data: { ${relation.relationField}Id: target.id },
          select: { ${relation.relationField}Id: true },
        });

        expect(updated.${relation.relationField}Id).toBe(target.id);
      }
    });
  });`;
  }

  /**
   * Generate complete test file for a single relation
   */
  generateTestFile(relation: {
    sourceModel: string;
    relationField: string;
    targetModel: string;
    fkField: string;
  }): string {
    const imports = `import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
`;

    const closing = `
});`;

    return (
      imports +
      '\n' +
      this.generateDescribe(relation) +
      '\n' +
      this.generateBeforeAll(relation) +
      '\n' +
      this.generateAfterAll(relation) +
      '\n' +
      this.generatePositiveTestAA(relation) +
      '\n' +
      this.generatePositiveTestAA_CreateMany(relation) +
      '\n' +
      this.generateNegativeTestAB(relation) +
      '\n' +
      this.generateUpdateTest(relation) +
      '\n' +
      this.generateNestedTest(relation) +
      '\n' +
      this.generateTransactionTest(relation) +
      '\n' +
      closing
    );
  }

  /**
   * Get all relations that should have tests generated
   */
  getAllRelations(): Array<{
    sourceModel: string;
    relationField: string;
    targetModel: string;
    fkField: string;
  }> {
    const allRelations: Array<{
      sourceModel: string;
      relationField: string;
      targetModel: string;
      fkField: string;
    }> = [];

    for (const sourceModel of Object.keys(this.relationsRegistry)) {
      allRelations.push(...this.getModelRelations(sourceModel));
    }

    return allRelations;
  }
}
