/**
 * DATA migration (not schema) for production: reassigns every EXISTING
 * Producto from its old (flat) Categoria to the new hierarchy
 * (Familia/Subfamilia/Tipo/Subtipo), and generates its new SKU — without
 * touching the product's name/price/stock/Lote/VentaItem/anything else.
 *
 * Different from seed.ts: that script assumes an EMPTY database and
 * creates products from scratch (createMany). This script assumes
 * products that ALREADY exist (with real history: sales, batches,
 * orders) and updates them in place (update), preserving their id and
 * all their relations.
 *
 * Requires the 4 hierarchy columns on Producto to still be nullable in
 * the schema at the time this runs (step 1 of the 2-step migration, see
 * prisma/migrations/20260922090000_catalogo_jerarquia_familia_subfamilia_tipo_subtipo/)
 * — only after running this script is the migration applied that makes
 * them NOT NULL and drops Categoria
 * (20260922090002_catalogo_jerarquia_fk_not_null_y_drop_categoria).
 *
 * Usage: npx ts-node prisma/migrate-categoria-a-jerarquia.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface FamilyHierarchy {
  prefijo: string;
  nombre: string;
}

interface SubfamilyHierarchy {
  familiaPrefijo: string;
  nombre: string;
  prefijo: string;
  rubroOriginalCategoria: string;
}

const PREFIX_GEN = 'GEN';
const NAME_GEN = 'Genérico';
const SKU_SEQUENCE_DIGITS = 8;

function buildSku(
  familyPrefix: string,
  subfamilyPrefix: string,
  typePrefix: string,
  subtypePrefix: string,
  sequentialNumber: number,
): string {
  const num = String(sequentialNumber).padStart(SKU_SEQUENCE_DIGITS, '0');
  return `${familyPrefix}-${subfamilyPrefix}-${typePrefix}-${subtypePrefix}-${num}`;
}

async function createFamilySubfamilyGen(companyId: string, oldCategoryName: string) {
  // Path for the 'pilot base categories' without a real mapping (Almacén,
  // Bebidas, General, Kiosco, Snacks) — same pattern as the 'General'
  // Familia of the isolation company in seed.ts: a Familia/Subfamilia is
  // created with the same name as the old Categoria, without trying to
  // map it into the tree of 187 Subfamilias (those categories are empty
  // or almost empty, they are not part of the consolidated real catalog).
  const family = await prisma.familia.upsert({
    where: { empresaId_nombre: { empresaId: companyId, nombre: oldCategoryName } },
    update: {},
    create: { nombre: oldCategoryName, prefijo: PREFIX_GEN, empresaId: companyId },
  });
  const subfamily = await prisma.subfamilia.upsert({
    where: { familiaId_nombre: { familiaId: family.id, nombre: oldCategoryName } },
    update: {},
    create: {
      nombre: oldCategoryName,
      prefijo: PREFIX_GEN,
      empresaId: companyId,
      familiaId: family.id,
    },
  });
  const type = await prisma.tipo.upsert({
    where: { subfamiliaId_nombre: { subfamiliaId: subfamily.id, nombre: NAME_GEN } },
    update: {},
    create: {
      nombre: NAME_GEN,
      prefijo: PREFIX_GEN,
      empresaId: companyId,
      subfamiliaId: subfamily.id,
    },
  });
  const subtype = await prisma.subtipo.upsert({
    where: { tipoId_nombre: { tipoId: type.id, nombre: NAME_GEN } },
    update: {},
    create: { nombre: NAME_GEN, prefijo: PREFIX_GEN, empresaId: companyId, tipoId: type.id },
  });
  return { familia: family, subfamilia: subfamily, tipo: type, subtipo: subtype };
}

async function main() {
  const hierarchyPath = path.join(__dirname, 'seed-data-jerarquia-catalogo.json');
  const hierarchyData: { familias: FamilyHierarchy[]; subfamilias: SubfamilyHierarchy[] } =
    JSON.parse(fs.readFileSync(hierarchyPath, 'utf-8'));

  // All real companies (not only 'Otra Roonda Más') — the script has to
  // cover any company that still has products with a categoriaId,
  // without assuming which one is the main one.
  const companies = await prisma.empresa.findMany();
  console.log(`Empresas encontradas: ${companies.length}`);

  let totalMigrated = 0;
  let totalWithoutCategory = 0;

  for (const company of companies) {
    console.log(`\n=== Empresa: ${company.nombre} (${company.id}) ===`);

    // 1) Familias/Subfamilias/GEN of the real catalog (187 consolidated
    // departments) — same as seed.ts, reuses them via skipDuplicates.
    await prisma.familia.createMany({
      data: hierarchyData.familias.map((f) => ({
        nombre: f.nombre,
        prefijo: f.prefijo,
        empresaId: company.id,
      })),
      skipDuplicates: true,
    });
    const families = await prisma.familia.findMany({ where: { empresaId: company.id } });
    const familyIdByPrefix = new Map(families.map((f) => [f.prefijo, f.id]));

    await prisma.subfamilia.createMany({
      data: hierarchyData.subfamilias.map((s) => ({
        nombre: s.nombre,
        prefijo: s.prefijo,
        empresaId: company.id,
        familiaId: familyIdByPrefix.get(s.familiaPrefijo)!,
      })),
      skipDuplicates: true,
    });
    const subfamilies = await prisma.subfamilia.findMany({
      where: { empresaId: company.id, familiaId: { in: [...familyIdByPrefix.values()] } },
    });
    const subfamilyIdByDepartment = new Map(
      hierarchyData.subfamilias.map((s) => [
        s.rubroOriginalCategoria,
        subfamilies.find(
          (row) =>
            row.nombre === s.nombre && row.familiaId === familyIdByPrefix.get(s.familiaPrefijo),
        )!.id,
      ]),
    );

    await prisma.tipo.createMany({
      data: subfamilies.map((s) => ({
        nombre: NAME_GEN,
        prefijo: PREFIX_GEN,
        empresaId: company.id,
        subfamiliaId: s.id,
      })),
      skipDuplicates: true,
    });
    const types = await prisma.tipo.findMany({
      where: { subfamiliaId: { in: subfamilies.map((s) => s.id) }, nombre: NAME_GEN },
    });
    const typeIdBySubfamilyId = new Map(types.map((t) => [t.subfamiliaId, t.id]));

    await prisma.subtipo.createMany({
      data: types.map((t) => ({
        nombre: NAME_GEN,
        prefijo: PREFIX_GEN,
        empresaId: company.id,
        tipoId: t.id,
      })),
      skipDuplicates: true,
    });
    const subtypes = await prisma.subtipo.findMany({
      where: { tipoId: { in: types.map((t) => t.id) }, nombre: NAME_GEN },
    });
    const subtypeIdByTypeId = new Map(subtypes.map((s) => [s.tipoId, s.id]));

    console.log(
      `  Jerarquía lista: ${families.length} Familias, ${subfamilies.length} Subfamilias.`,
    );

    // 2) EXISTING Productos of this company with categoriaId still set
    // (not yet migrated) — manual join because the Categoria model /
    // Producto.categoriaId still exists at this point of the migration
    // (step 1 of 2, see the comment at the top of the file).
    const products = await prisma.$queryRawUnsafe<
      { id: string; categoriaId: string; categoriaNombre: string }[]
    >(
      `SELECT p.id, p."categoriaId", c.nombre AS "categoriaNombre"
       FROM "Producto" p
       JOIN "Categoria" c ON c.id = p."categoriaId"
       WHERE p."empresaId" = $1 AND p."familiaId" IS NULL`,
      company.id,
    );
    console.log(`  Productos a migrar: ${products.length}`);
    if (products.length === 0) {
      continue;
    }

    // Categories without a mapping in the real catalog (pilot base, empty
    // or almost empty) — resolved by creating a Familia/Subfamilia of
    // their own with that same name; they are neither discarded nor forced
    // into the tree of 187 real departments.
    const namesWithoutMapping = new Set(
      products.map((p) => p.categoriaNombre).filter((n) => !subfamilyIdByDepartment.has(n)),
    );
    const nodesByNameWithoutMapping = new Map<
      string,
      Awaited<ReturnType<typeof createFamilySubfamilyGen>>
    >();
    for (const name of namesWithoutMapping) {
      console.log(`  Categoria sin mapeo al catálogo real: "${name}" — creando Familia propia.`);
      nodesByNameWithoutMapping.set(name, await createFamilySubfamilyGen(company.id, name));
    }

    // 3) SKU sequence: continues from the maximum sequence already used by
    // this company (does not restart at 1 — avoids collisions with SKUs
    // that may already exist from a previous seed.ts run in this same
    // company, although in production there should be none yet).
    const lastProduct = await prisma.producto.findFirst({
      where: { empresaId: company.id },
      orderBy: { codigoInterno: 'desc' },
      select: { codigoInterno: true },
    });
    let sequentialNumber = 1;
    if (lastProduct?.codigoInterno) {
      const match = lastProduct.codigoInterno.match(/-(\d{8})$/);
      if (match) sequentialNumber = parseInt(match[1], 10) + 1;
    }

    let migrated = 0;
    for (const product of products) {
      let subfamilyId = subfamilyIdByDepartment.get(product.categoriaNombre);
      let familyId: string | undefined;
      let typeId: string | undefined;
      let subtypeId: string | undefined;

      if (subfamilyId) {
        const subfamily = subfamilies.find((s) => s.id === subfamilyId)!;
        familyId = subfamily.familiaId;
        typeId = typeIdBySubfamilyId.get(subfamilyId);
        subtypeId = typeId ? subtypeIdByTypeId.get(typeId) : undefined;
      } else {
        const nodes = nodesByNameWithoutMapping.get(product.categoriaNombre)!;
        familyId = nodes.familia.id;
        subfamilyId = nodes.subfamilia.id;
        typeId = nodes.tipo.id;
        subtypeId = nodes.subtipo.id;
      }

      if (!familyId || !subfamilyId || !typeId || !subtypeId) {
        throw new Error(
          `No se pudo resolver la jerarquía completa para producto ${product.id} (categoría "${product.categoriaNombre}")`,
        );
      }

      const familyPrefix = families.find((f) => f.id === familyId)?.prefijo ?? PREFIX_GEN;
      const subfamilyPrefix =
        subfamilies.find((s) => s.id === subfamilyId)?.prefijo ??
        [...nodesByNameWithoutMapping.values()].find((n) => n.subfamilia.id === subfamilyId)
          ?.subfamilia.prefijo ??
        PREFIX_GEN;
      const sku = buildSku(
        familyPrefix,
        subfamilyPrefix,
        PREFIX_GEN,
        PREFIX_GEN,
        sequentialNumber++,
      );

      await prisma.producto.update({
        where: { id: product.id },
        data: {
          familiaId: familyId,
          subfamiliaId: subfamilyId,
          tipoId: typeId,
          subtipoId: subtypeId,
          codigoInterno: sku,
        },
      });
      migrated++;
      if (migrated % 500 === 0) {
        console.log(`    Migrados: ${migrated}/${products.length}`);
      }
    }
    console.log(`  Migrados: ${migrated}/${products.length}`);
    totalMigrated += migrated;
  }

  // 4) Final verification: no product should be left without the 4 levels
  // assigned in any company. $queryRaw (not prisma.producto.count)
  // because the Prisma Client generated at this point of the 2-step
  // migration does not yet type familiaId as nullable consistently for
  // a `{ familiaId: null }` filter.
  const [{ count }] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    'SELECT count(*) AS count FROM "Producto" WHERE "familiaId" IS NULL',
  );
  totalWithoutCategory = Number(count);

  console.log('\n=== RESUMEN ===');
  console.log(`Productos migrados: ${totalMigrated}`);
  console.log(`Productos SIN familiaId tras la migración: ${totalWithoutCategory}`);
  if (totalWithoutCategory > 0) {
    throw new Error(
      `Quedaron ${totalWithoutCategory} productos sin migrar — revisar antes de aplicar la migración NOT NULL.`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
