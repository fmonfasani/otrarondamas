/**
 * Migración de DATOS (no de schema) para producción: reasigna cada
 * Producto EXISTENTE de su Categoria vieja (plana) a la jerarquía nueva
 * (Familia/Subfamilia/Tipo/Subtipo), y genera su SKU nuevo — sin tocar
 * nombre/precio/stock/Lote/VentaItem/nada más del producto.
 *
 * Distinto de seed.ts: ese script asume una base VACÍA y crea productos
 * desde cero (createMany). Este script asume productos que YA EXISTEN
 * (con historial real: ventas, lotes, pedidos) y los actualiza en el
 * lugar (update), preservando su id y todas sus relaciones.
 *
 * Requiere que las 4 columnas de jerarquía en Producto sigan siendo
 * nullable en el schema al momento de correr esto (paso 1 de la
 * migración de 2 pasos, ver
 * prisma/migrations/20260922090000_catalogo_jerarquia_familia_subfamilia_tipo_subtipo/)
 * — recién después de correr este script se aplica la migración que
 * las vuelve NOT NULL y borra Categoria
 * (20260922090002_catalogo_jerarquia_fk_not_null_y_drop_categoria).
 *
 * Uso: npx ts-node prisma/migrate-categoria-a-jerarquia.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface JerarquiaFamilia {
  prefijo: string;
  nombre: string;
}

interface JerarquiaSubfamilia {
  familiaPrefijo: string;
  nombre: string;
  prefijo: string;
  rubroOriginalCategoria: string;
}

const PREFIJO_GEN = 'GEN';
const NOMBRE_GEN = 'Genérico';
const SKU_CORRELATIVO_DIGITOS = 8;

function construirSku(
  familiaPrefijo: string,
  subfamiliaPrefijo: string,
  tipoPrefijo: string,
  subtipoPrefijo: string,
  correlativo: number,
): string {
  const num = String(correlativo).padStart(SKU_CORRELATIVO_DIGITOS, '0');
  return `${familiaPrefijo}-${subfamiliaPrefijo}-${tipoPrefijo}-${subtipoPrefijo}-${num}`;
}

async function crearFamiliaSubfamiliaGen(empresaId: string, nombreCategoriaVieja: string) {
  // Camino de "categorías base del piloto" sin mapeo real (Almacén,
  // Bebidas, General, Kiosco, Snacks) — mismo patrón que la Familia
  // "General" de la empresa de aislamiento en seed.ts: se crea una
  // Familia/Subfamilia con el mismo nombre de la Categoria vieja, sin
  // intentar mapearla al árbol de 187 Subfamilias (esas categorías
  // están vacías o casi vacías, no forman parte del catálogo real
  // consolidado).
  const familia = await prisma.familia.upsert({
    where: { empresaId_nombre: { empresaId, nombre: nombreCategoriaVieja } },
    update: {},
    create: { nombre: nombreCategoriaVieja, prefijo: PREFIJO_GEN, empresaId },
  });
  const subfamilia = await prisma.subfamilia.upsert({
    where: { familiaId_nombre: { familiaId: familia.id, nombre: nombreCategoriaVieja } },
    update: {},
    create: {
      nombre: nombreCategoriaVieja,
      prefijo: PREFIJO_GEN,
      empresaId,
      familiaId: familia.id,
    },
  });
  const tipo = await prisma.tipo.upsert({
    where: { subfamiliaId_nombre: { subfamiliaId: subfamilia.id, nombre: NOMBRE_GEN } },
    update: {},
    create: { nombre: NOMBRE_GEN, prefijo: PREFIJO_GEN, empresaId, subfamiliaId: subfamilia.id },
  });
  const subtipo = await prisma.subtipo.upsert({
    where: { tipoId_nombre: { tipoId: tipo.id, nombre: NOMBRE_GEN } },
    update: {},
    create: { nombre: NOMBRE_GEN, prefijo: PREFIJO_GEN, empresaId, tipoId: tipo.id },
  });
  return { familia, subfamilia, tipo, subtipo };
}

async function main() {
  const jerarquiaPath = path.join(__dirname, 'seed-data-jerarquia-catalogo.json');
  const jerarquiaData: { familias: JerarquiaFamilia[]; subfamilias: JerarquiaSubfamilia[] } =
    JSON.parse(fs.readFileSync(jerarquiaPath, 'utf-8'));

  // Todas las empresas reales (no solo "Otra Roonda Más") — el script
  // tiene que cubrir cualquier empresa que tenga productos con
  // categoriaId todavía, sin asumir cuál es la principal.
  const empresas = await prisma.empresa.findMany();
  console.log(`Empresas encontradas: ${empresas.length}`);

  let totalMigrados = 0;
  let totalSinCategoria = 0;

  for (const empresa of empresas) {
    console.log(`\n=== Empresa: ${empresa.nombre} (${empresa.id}) ===`);

    // 1) Familias/Subfamilias/GEN del catálogo real (187 rubros
    // consolidados) — igual que seed.ts, reusa vía skipDuplicates.
    await prisma.familia.createMany({
      data: jerarquiaData.familias.map((f) => ({
        nombre: f.nombre,
        prefijo: f.prefijo,
        empresaId: empresa.id,
      })),
      skipDuplicates: true,
    });
    const familias = await prisma.familia.findMany({ where: { empresaId: empresa.id } });
    const familiaIdPorPrefijo = new Map(familias.map((f) => [f.prefijo, f.id]));

    await prisma.subfamilia.createMany({
      data: jerarquiaData.subfamilias.map((s) => ({
        nombre: s.nombre,
        prefijo: s.prefijo,
        empresaId: empresa.id,
        familiaId: familiaIdPorPrefijo.get(s.familiaPrefijo)!,
      })),
      skipDuplicates: true,
    });
    const subfamilias = await prisma.subfamilia.findMany({
      where: { empresaId: empresa.id, familiaId: { in: [...familiaIdPorPrefijo.values()] } },
    });
    const subfamiliaIdPorRubro = new Map(
      jerarquiaData.subfamilias.map((s) => [
        s.rubroOriginalCategoria,
        subfamilias.find(
          (row) => row.nombre === s.nombre && row.familiaId === familiaIdPorPrefijo.get(s.familiaPrefijo),
        )!.id,
      ]),
    );

    await prisma.tipo.createMany({
      data: subfamilias.map((s) => ({
        nombre: NOMBRE_GEN,
        prefijo: PREFIJO_GEN,
        empresaId: empresa.id,
        subfamiliaId: s.id,
      })),
      skipDuplicates: true,
    });
    const tipos = await prisma.tipo.findMany({
      where: { subfamiliaId: { in: subfamilias.map((s) => s.id) }, nombre: NOMBRE_GEN },
    });
    const tipoIdPorSubfamiliaId = new Map(tipos.map((t) => [t.subfamiliaId, t.id]));

    await prisma.subtipo.createMany({
      data: tipos.map((t) => ({
        nombre: NOMBRE_GEN,
        prefijo: PREFIJO_GEN,
        empresaId: empresa.id,
        tipoId: t.id,
      })),
      skipDuplicates: true,
    });
    const subtipos = await prisma.subtipo.findMany({
      where: { tipoId: { in: tipos.map((t) => t.id) }, nombre: NOMBRE_GEN },
    });
    const subtipoIdPorTipoId = new Map(subtipos.map((s) => [s.tipoId, s.id]));

    console.log(
      `  Jerarquía lista: ${familias.length} Familias, ${subfamilias.length} Subfamilias.`,
    );

    // 2) Productos EXISTENTES de esta empresa con categoriaId todavía
    // seteado (todavía no migrados) — join manual porque el modelo
    // Categoria/Producto.categoriaId sigue existiendo en este punto de
    // la migración (paso 1 de 2, ver comentario de arriba del archivo).
    const productos = await prisma.$queryRawUnsafe<
      { id: string; categoriaId: string; categoriaNombre: string }[]
    >(
      `SELECT p.id, p."categoriaId", c.nombre AS "categoriaNombre"
       FROM "Producto" p
       JOIN "Categoria" c ON c.id = p."categoriaId"
       WHERE p."empresaId" = $1 AND p."familiaId" IS NULL`,
      empresa.id,
    );
    console.log(`  Productos a migrar: ${productos.length}`);
    if (productos.length === 0) {
      continue;
    }

    // Categorías sin mapeo en el catálogo real (base del piloto,
    // vacías o casi vacías) — se resuelven creando una Familia/
    // Subfamilia propia con ese mismo nombre, no se descartan ni se
    // fuerzan al árbol de 187 rubros reales.
    const nombresSinMapeo = new Set(
      productos.map((p) => p.categoriaNombre).filter((n) => !subfamiliaIdPorRubro.has(n)),
    );
    const nodosPorNombreSinMapeo = new Map<
      string,
      Awaited<ReturnType<typeof crearFamiliaSubfamiliaGen>>
    >();
    for (const nombre of nombresSinMapeo) {
      console.log(`  Categoria sin mapeo al catálogo real: "${nombre}" — creando Familia propia.`);
      nodosPorNombreSinMapeo.set(nombre, await crearFamiliaSubfamiliaGen(empresa.id, nombre));
    }

    // 3) Correlativo de SKU: continúa desde el máximo correlativo ya
    // usado por esta empresa (no reinicia en 1 — evita colisión con
    // SKUs que ya pudieran existir de una corrida previa de seed.ts en
    // esta misma empresa, aunque en producción no debería haber
    // ninguno todavía).
    const ultimoProducto = await prisma.producto.findFirst({
      where: { empresaId: empresa.id },
      orderBy: { codigoInterno: 'desc' },
      select: { codigoInterno: true },
    });
    let correlativo = 1;
    if (ultimoProducto?.codigoInterno) {
      const match = ultimoProducto.codigoInterno.match(/-(\d{8})$/);
      if (match) correlativo = parseInt(match[1], 10) + 1;
    }

    let migrados = 0;
    for (const producto of productos) {
      let subfamiliaId = subfamiliaIdPorRubro.get(producto.categoriaNombre);
      let familiaId: string | undefined;
      let tipoId: string | undefined;
      let subtipoId: string | undefined;

      if (subfamiliaId) {
        const subfamilia = subfamilias.find((s) => s.id === subfamiliaId)!;
        familiaId = subfamilia.familiaId;
        tipoId = tipoIdPorSubfamiliaId.get(subfamiliaId);
        subtipoId = tipoId ? subtipoIdPorTipoId.get(tipoId) : undefined;
      } else {
        const nodos = nodosPorNombreSinMapeo.get(producto.categoriaNombre)!;
        familiaId = nodos.familia.id;
        subfamiliaId = nodos.subfamilia.id;
        tipoId = nodos.tipo.id;
        subtipoId = nodos.subtipo.id;
      }

      if (!familiaId || !subfamiliaId || !tipoId || !subtipoId) {
        throw new Error(
          `No se pudo resolver la jerarquía completa para producto ${producto.id} (categoría "${producto.categoriaNombre}")`,
        );
      }

      const familiaPrefijo = familias.find((f) => f.id === familiaId)?.prefijo ?? PREFIJO_GEN;
      const subfamiliaPrefijo =
        subfamilias.find((s) => s.id === subfamiliaId)?.prefijo ??
        [...nodosPorNombreSinMapeo.values()].find((n) => n.subfamilia.id === subfamiliaId)
          ?.subfamilia.prefijo ??
        PREFIJO_GEN;
      const sku = construirSku(familiaPrefijo, subfamiliaPrefijo, PREFIJO_GEN, PREFIJO_GEN, correlativo++);

      await prisma.producto.update({
        where: { id: producto.id },
        data: {
          familiaId,
          subfamiliaId,
          tipoId,
          subtipoId,
          codigoInterno: sku,
        },
      });
      migrados++;
      if (migrados % 500 === 0) {
        console.log(`    Migrados: ${migrados}/${productos.length}`);
      }
    }
    console.log(`  Migrados: ${migrados}/${productos.length}`);
    totalMigrados += migrados;
  }

  // 4) Verificación final: no debería quedar ningún producto sin los 4
  // niveles asignados en ninguna empresa. $queryRaw (no
  // prisma.producto.count) porque el Prisma Client generado en este
  // punto de la migración de 2 pasos todavía no tipa familiaId como
  // nullable de forma consistente para un filtro `{ familiaId: null }`.
  const [{ count }] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT count(*) AS count FROM "Producto" WHERE "familiaId" IS NULL`,
  );
  totalSinCategoria = Number(count);

  console.log(`\n=== RESUMEN ===`);
  console.log(`Productos migrados: ${totalMigrados}`);
  console.log(`Productos SIN familiaId tras la migración: ${totalSinCategoria}`);
  if (totalSinCategoria > 0) {
    throw new Error(
      `Quedaron ${totalSinCategoria} productos sin migrar — revisar antes de aplicar la migración NOT NULL.`,
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
