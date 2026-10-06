import { PrismaClient, UnidadBase } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RetailRow {
  codigoInterno: string;
  nombre: string;
  rubro: string | null;
  precioMinorista: number;
}

interface FamilyHierarchy {
  prefijo: string;
  nombre: string;
}

interface SubfamilyHierarchy {
  familiaPrefijo: string;
  nombre: string;
  prefijo: string;
  // Categoria name exactly as it came from the Minorista source (e.g.
  // 'GOLOSINAS / CHOCOLATES') — key to reassign each existing product
  // to its new Subfamilia.
  rubroOriginalCategoria: string;
}

// 'GEN' (generic) node: filler Tipo and Subtipo for when a department
// needs no more detail than Familia/Subfamilia. The 4 levels are
// always mandatory (decision of the catalog definition session, see
// docs — the SKU requires the 4 prefix segments to be present).
const PREFIX_GEN = 'GEN';
const NAME_GEN = 'Genérico';

// SKU sequence length: FAM-SUB-TIP-SUBT-NNNNNNNN (8 digits, global per
// company, does not restart per level combination).
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

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Empresa
  const company = await prisma.empresa.upsert({
    where: { nombre: 'Otra Roonda Más' },
    update: {},
    create: {
      nombre: 'Otra Roonda Más',
      configuracion: {},
    },
  });
  console.log({ empresa: company });

  // Second company, exclusively to verify in development that a user of
  // one company cannot access the data of the other (does not represent
  // a real business requirement).
  const companyIsolation = await prisma.empresa.upsert({
    where: { nombre: 'Empresa Demo Aislamiento' },
    update: {},
    create: {
      nombre: 'Empresa Demo Aislamiento',
      configuracion: {},
    },
  });
  console.log({ empresaAislamiento: companyIsolation });

  // Permissions (simplified for initial seed)
  //
  // KNOWN GAP (see docs/scaffolding-notas.md): if you add a permission
  // here and re-run this seed on a database that already had
  // owner@otrarondamas.com / owner@demo-aislamiento.com created, the
  // new permission stays in the Permiso table but is NOT assigned to
  // those users — usuario.upsert() below only assigns usuarioPermisos
  // in the `create` branch, and `update: {}` does not touch them (on
  // purpose: overwriting permissions on every re-seed would break manual
  // edits made from the panel in production). After adding a permission
  // here, also run `npm run prisma:sync-permisos`
  // (prisma/sync-permisos-owner.ts) to bring the existing owner users
  // up to date.
  const permissions = [
    'caja.gastos',
    'inventario.ajustes',
    'precios.cambiar',
    'ventas.crear',
    'ventas.anular',
    'usuarios.gestionar',
    'clientes.gestionar',
    'productos.gestionar',
    // RF-12 (purchases and suppliers): create/issue purchase orders and
    // confirm receptions. New permission, productos.gestionar was not
    // reused (managing the catalog does not imply being able to commit
    // money with a supplier — they are different business authorizations).
    'compras.gestionar',
    // RF-06 (online store), Phase 4: view/take/confirm/cancel orders from
    // the inbox. New permission, ventas.crear was not reused (managing what
    // comes in through the store is a different responsibility from selling
    // in person, same criterion as compras.gestionar above) — remember to
    // run `npm run prisma:sync-permisos` after this seed.
    'pedidos.gestionar',
    // Phase 4 of the Loyalty roadmap: create/edit automatic discount rules
    // by loyalty level. New permission, clientes.gestionar was not reused —
    // configuring how much discount is automatically given up on every sale
    // is a different business authorization from editing a customer's
    // name/email, same criterion as compras.gestionar/pedidos.gestionar
    // above. Remember to run `npm run prisma:sync-permisos` after this
    // seed.
    'fidelizacion.gestionar',
  ];

  for (const permissionName of permissions) {
    await prisma.permiso.upsert({
      where: { nombre: permissionName },
      update: {},
      create: { nombre: permissionName },
    });
  }

  const allPermissions = await prisma.permiso.findMany();
  const ownerPermissions = allPermissions.map((p) => ({ permisoId: p.id }));

  // Usuarios
  const ownerUser = await prisma.usuario.upsert({
    where: { email: 'owner@otrarondamas.com' },
    update: {},
    create: {
      empresaId: company.id,
      nombre: 'Dueño de Prueba',
      email: 'owner@otrarondamas.com',
      passwordHash: hashedPassword,
      activo: true,
      usuarioPermisos: {
        create: ownerPermissions,
      },
    },
  });
  console.log({ ownerUser });

  const sellerUser = await prisma.usuario.upsert({
    where: { email: 'seller@otrarondamas.com' },
    update: {},
    create: {
      empresaId: company.id,
      nombre: 'Vendedor de Prueba',
      email: 'seller@otrarondamas.com',
      passwordHash: hashedPassword,
      activo: true,
      // RF-17: this user represents the role 'Store assistant' (formerly
      // 'Vendedor') — without this, the field default (OWNER) would leave it
      // misclassified. ownerUser above does not need an explicit `rol`
      // because OWNER is already the schema default.
      rol: 'ASISTENTE_LOCAL',
      usuarioPermisos: {
        create: [
          { permiso: { connect: { nombre: 'ventas.crear' } } },
          { permiso: { connect: { nombre: 'clientes.gestionar' } } },
          { permiso: { connect: { nombre: 'productos.gestionar' } } },
        ],
      },
    },
  });
  console.log({ sellerUser });

  // User and product of the second company, for the multi-company
  // isolation tests (see docs/scaffolding-notas.md section 7).
  const ownerIsolation = await prisma.usuario.upsert({
    where: { email: 'owner@demo-aislamiento.com' },
    update: {},
    create: {
      empresaId: companyIsolation.id,
      nombre: 'Dueño Empresa Aislamiento',
      email: 'owner@demo-aislamiento.com',
      passwordHash: hashedPassword,
      activo: true,
      usuarioPermisos: { create: ownerPermissions },
    },
  });
  console.log({ ownerAislamiento: ownerIsolation });

  const familyIsolation = await prisma.familia.upsert({
    where: { empresaId_nombre: { empresaId: companyIsolation.id, nombre: 'General' } },
    update: {},
    create: { nombre: 'General', prefijo: 'GEN', empresaId: companyIsolation.id },
  });
  const subfamilyIsolation = await prisma.subfamilia.upsert({
    where: { familiaId_nombre: { familiaId: familyIsolation.id, nombre: 'General' } },
    update: {},
    create: {
      nombre: 'General',
      prefijo: 'GEN',
      empresaId: companyIsolation.id,
      familiaId: familyIsolation.id,
    },
  });
  const typeIsolation = await prisma.tipo.upsert({
    where: { subfamiliaId_nombre: { subfamiliaId: subfamilyIsolation.id, nombre: NAME_GEN } },
    update: {},
    create: {
      nombre: NAME_GEN,
      prefijo: PREFIX_GEN,
      empresaId: companyIsolation.id,
      subfamiliaId: subfamilyIsolation.id,
    },
  });
  const subtypeIsolation = await prisma.subtipo.upsert({
    where: { tipoId_nombre: { tipoId: typeIsolation.id, nombre: NAME_GEN } },
    update: {},
    create: {
      nombre: NAME_GEN,
      prefijo: PREFIX_GEN,
      empresaId: companyIsolation.id,
      tipoId: typeIsolation.id,
    },
  });

  const productIsolation = await prisma.producto.upsert({
    where: {
      empresaId_codigoInterno: {
        empresaId: companyIsolation.id,
        codigoInterno: 'GEN-GEN-GEN-GEN-00000001',
      },
    },
    update: {},
    create: {
      empresaId: companyIsolation.id,
      nombre: 'DEMO AISLAMIENTO - Producto de otra empresa',
      codigoInterno: 'GEN-GEN-GEN-GEN-00000001',
      codigoBarras: 'AISLAMIENTO-0001',
      familiaId: familyIsolation.id,
      subfamiliaId: subfamilyIsolation.id,
      tipoId: typeIsolation.id,
      subtipoId: subtypeIsolation.id,
      unidadBase: 'UNIDAD',
      costo: 1,
      precioMinorista: 1,
      activo: true,
    },
  });
  console.log({ productoAislamiento: productIsolation });

  // Caja
  const cashRegister = await prisma.caja.upsert({
    where: { empresaId: company.id }, // Assuming one box per company for simplicity
    update: {},
    create: {
      empresaId: company.id,
      fondoFijo: 25000.0,
      estado: 'CERRADA',
      // No apertura inicial, se hace al iniciar el día
    },
  });
  console.log({ caja: cashRegister });

  // ---------------------------------------------------------------------
  // Real 'Retail list' catalog, consolidated from
  // docs/Catalogos raw/Catalogo_Consolidado_Intermedio_Otra_Roonda_Mas.xlsx
  // (Maestro_intermedio sheet, filtered to source='Lista minorista').
  //
  // Rules followed, as required by the LEEME_agente sheet of that file:
  // - No barcodes are invented: Producto.codigoBarras stays null for this
  //   whole batch (no source row carries a real one).
  // - No deduplication and no inferred equivalences between sources: this
  //   seed uses EXCLUSIVELY the 'Lista minorista' source. Coca-Cola and
  //   DIPA MAX are left out (they lack precio_minorista or the
  //   product-price association is not validated by the source itself) —
  //   they are added in a separate increment when there is a real
  //   import/reconciliation flow (see docs/spec-catalogo-productos.md).
  // - 15 rows with precio_minorista = 0 were excluded (display units,
  //   promotional 'gift' items) because they are not real sellable
  //   products.
  //
  // Documented placeholders (explicit decision, not silently assumed):
  // - Producto.costo: the catalog carries no cost, only precio_minorista.
  //   costo = precioMinorista is used as a placeholder — it does NOT
  //   represent a real margin. Consistent with D-18 of the SDD: estimated
  //   profits are not computed as definitive until the costing method is
  //   defined.
  // - Producto.familia/subfamilia/tipo/subtipo: the 'rubro' is used as it
  //   comes from the source (e.g. 'GOLOSINAS / CHOCOLATES') to locate the
  //   corresponding Subfamilia (mapping defined and reviewed in the
  //   catalog definition session — see
  //   prisma/seed-data-jerarquia-catalogo.json), with Tipo/Subtipo = GEN
  //   (no department of this catalog needs more detail yet).
  // - Producto.unidadBase: the source does not allow deriving the base
  //   unit reliably (bulto_fuente does not specify a standardized unit).
  //   UNIDAD is used by default for the whole batch — it is a known
  //   simplification, not a computed equivalence (D-08 forbids computing
  //   conversions by assumption).
  // - Lote.vencimiento: required field (not nullable) in the current
  //   schema; most of these products are not perishable. 'today + 10
  //   years' is used as a technical placeholder just to be able to create
  //   the Lote — it does not represent a real expiry date.
  // - Lote.cantidad: 100 units per product, demo data explicitly requested
  //   by the owner, not a real stock level.
  // ---------------------------------------------------------------------

  const retailPath = path.join(__dirname, 'seed-data-minorista.json');
  const hierarchyPath = path.join(__dirname, 'seed-data-jerarquia-catalogo.json');
  if (fs.existsSync(retailPath)) {
    const retailData: RetailRow[] = JSON.parse(fs.readFileSync(retailPath, 'utf-8'));
    const hierarchyData: { familias: FamilyHierarchy[]; subfamilias: SubfamilyHierarchy[] } =
      JSON.parse(fs.readFileSync(hierarchyPath, 'utf-8'));
    console.log(`Catálogo Minorista: ${retailData.length} filas a importar.`);

    // 1) Familias (11, fixed — see the definition in the catalog session).
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
    console.log(`Familias creadas/existentes: ${families.length}`);

    // 2) Subfamilias (187, one per real department of the catalog — mapping
    // generated and reviewed by the owner, see session artifact).
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
    // Key = original department name (e.g. 'GOLOSINAS / CHOCOLATES'), exactly
    // as it comes in RetailRow.rubro — it is the only thing the source
    // catalog carries to place each product in the tree.
    const subfamilyIdByDepartment = new Map(
      hierarchyData.subfamilias.map((s) => [
        s.rubroOriginalCategoria,
        subfamilies.find(
          (row) =>
            row.nombre === s.nombre && row.familiaId === familyIdByPrefix.get(s.familiaPrefijo),
        )!.id,
      ]),
    );
    console.log(`Subfamilias creadas/existentes: ${subfamilies.length}`);

    // 3) Tipo/Subtipo node = GEN for each Subfamilia — the 4 levels are
    // always mandatory; none of these 187 departments needs more detail
    // than Familia/Subfamilia yet.
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
    console.log(`Nodos GEN (Tipo/Subtipo) creados/existentes: ${types.length}/${subtypes.length}`);

    const departmentsWithoutMapping = new Set(
      retailData
        .filter((r) => r.rubro && !subfamilyIdByDepartment.has(r.rubro))
        .map((r) => r.rubro),
    );
    if (departmentsWithoutMapping.size > 0) {
      throw new Error(
        `Rubros sin Subfamilia mapeada (revisar seed-data-jerarquia-catalogo.json): ${[...departmentsWithoutMapping].join(', ')}`,
      );
    }
    const rowsWithoutDepartment = retailData.filter((r) => !r.rubro);
    if (rowsWithoutDepartment.length > 0) {
      throw new Error(
        `${rowsWithoutDepartment.length} filas sin rubro — el catálogo Minorista no debería traer filas sin rubro (revisar fuente).`,
      );
    }

    // 4) Deterministic SKU by row position in the source JSON (row 0 →
    // sequence 1, row 1 → sequence 2, …), NOT by a counter that advances
    // on every seed run. That way the SKU of each product is always the
    // same between runs, which allows using codigoInterno (the SKU) itself
    // as the key for 'this row was already imported' without needing a
    // separate field for the source ERP code (that remains pending as a
    // catalog decision — source/supplier-product code — out of scope for
    // this seed). Requires the order of seed-data-minorista.json not to
    // change between runs, which holds: it is a file generated once from
    // the consolidated catalog, never reordered by hand.
    const rowsWithSku = retailData.map((r, idx) => {
      const subfamilyId = subfamilyIdByDepartment.get(r.rubro!)!;
      const subfamily = subfamilies.find((s) => s.id === subfamilyId)!;
      const family = families.find((f) => f.id === subfamily.familiaId)!;
      const typeId = typeIdBySubfamilyId.get(subfamilyId)!;
      const subtypeId = subtypeIdByTypeId.get(typeId)!;
      const sku = buildSku(family.prefijo, subfamily.prefijo, PREFIX_GEN, PREFIX_GEN, idx + 1);
      return {
        row: r,
        sku,
        familiaId: family.id,
        subfamiliaId: subfamilyId,
        tipoId: typeId,
        subtipoId: subtypeId,
      };
    });

    // 5) Already existing products (by the deterministic SKU) — avoids
    // retrying products already loaded in a previous run, without relying
    // on a row-by-row upsert (it would be slow for ~4300 rows and this
    // script must be re-runnable without duplicating).
    const existingSkus = new Set(
      (
        await prisma.producto.findMany({
          where: { empresaId: company.id, codigoInterno: { in: rowsWithSku.map((f) => f.sku) } },
          select: { codigoInterno: true },
        })
      ).map((p) => p.codigoInterno),
    );
    const newRows = rowsWithSku.filter((f) => !existingSkus.has(f.sku));
    console.log(
      `Productos ya existentes (se omiten): ${rowsWithSku.length - newRows.length}. Nuevos a crear: ${newRows.length}.`,
    );

    // 6) Insert products in batches — createMany does not support nested
    // relations, so the Productos are created first and then the demo
    // stock Lotes associated to them, in a second step.
    const BATCH_SIZE = 500;
    let created = 0;
    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, i + BATCH_SIZE);
      await prisma.producto.createMany({
        data: batch.map((f) => ({
          empresaId: company.id,
          nombre: f.row.nombre,
          codigoInterno: f.sku,
          codigoBarras: null, // No se inventa (ver LEEME_agente del catálogo fuente)
          marca: null, // La fuente Minorista no trae marca en esta tabla
          familiaId: f.familiaId,
          subfamiliaId: f.subfamiliaId,
          tipoId: f.tipoId,
          subtipoId: f.subtipoId,
          unidadBase: UnidadBase.UNIDAD, // Placeholder, ver comentario arriba
          costo: f.row.precioMinorista, // Placeholder (D-18), ver comentario arriba
          precioMinorista: f.row.precioMinorista,
          precioMayorista: null, // D-01: no viene en esta fuente, no se inventa
          activo: true,
        })),
        skipDuplicates: true,
      });
      created += batch.length;
      console.log(`  Productos creados: ${created}/${newRows.length}`);
    }

    // 7) Demo stock Lote (100 units) for each product just created in this
    // run. No new Lote is created for a product that already had one from
    // a previous run.
    if (newRows.length > 0) {
      const createdProducts = await prisma.producto.findMany({
        where: { codigoInterno: { in: newRows.map((f) => f.sku) } },
        select: { id: true, codigoInterno: true },
      });
      const expiryPlaceholder = new Date();
      expiryPlaceholder.setFullYear(expiryPlaceholder.getFullYear() + 10);

      let createdBatches = 0;
      for (let i = 0; i < createdProducts.length; i += BATCH_SIZE) {
        const batch = createdProducts.slice(i, i + BATCH_SIZE);
        await prisma.lote.createMany({
          data: batch.map((p) => ({
            empresaId: company.id,
            productoId: p.id,
            numeroLote: `DEMO-${p.codigoInterno}`,
            vencimiento: expiryPlaceholder,
            cantidad: 100,
          })),
          skipDuplicates: true,
        });
        createdBatches += batch.length;
        console.log(`  Lotes de stock demo creados: ${createdBatches}/${createdProducts.length}`);
      }
    }

    console.log('Catálogo Minorista importado.');
  } else {
    console.log(
      `Aviso: no se encontró ${retailPath} — se omite la importación del catálogo Minorista.`,
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
