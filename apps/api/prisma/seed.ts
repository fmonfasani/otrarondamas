import { PrismaClient, UnidadBase } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface MinoristaRow {
  codigoInterno: string;
  nombre: string;
  rubro: string | null;
  precioMinorista: number;
}

interface JerarquiaFamilia {
  prefijo: string;
  nombre: string;
}

interface JerarquiaSubfamilia {
  familiaPrefijo: string;
  nombre: string;
  prefijo: string;
  // Nombre de Categoria tal cual venía de la fuente Minorista (ej.
  // "GOLOSINAS / CHOCOLATES") — clave para reasignar cada producto
  // existente a su Subfamilia nueva.
  rubroOriginalCategoria: string;
}

// Nodo "GEN" (genérico): Tipo y Subtipo de relleno para cuando un rubro no
// necesita más detalle que Familia/Subfamilia. Los 4 niveles son
// obligatorios siempre (decisión de la sesión de definición de catálogo,
// ver docs — el SKU exige los 4 segmentos de prefijo presentes).
const PREFIJO_GEN = 'GEN';
const NOMBRE_GEN = 'Genérico';

// Longitud del correlativo del SKU: FAM-SUB-TIP-SUBT-NNNNNNNN (8 dígitos,
// global por empresa, no reinicia por combinación de niveles).
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

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Empresa
  const empresa = await prisma.empresa.upsert({
    where: { nombre: 'Otra Roonda Más' },
    update: {},
    create: {
      nombre: 'Otra Roonda Más',
      configuracion: {},
    },
  });
  console.log({ empresa });

  // Segunda empresa, exclusivamente para verificar en desarrollo que un
  // usuario de una empresa no accede a datos de la otra (no representa
  // un requisito de negocio real).
  const empresaAislamiento = await prisma.empresa.upsert({
    where: { nombre: 'Empresa Demo Aislamiento' },
    update: {},
    create: {
      nombre: 'Empresa Demo Aislamiento',
      configuracion: {},
    },
  });
  console.log({ empresaAislamiento });

  // Permisos (simplified for initial seed)
  //
  // GAP CONOCIDO (ver docs/scaffolding-notas.md): si agregás un permiso
  // acá y volvés a correr este seed sobre una base que ya tenía a
  // owner@otrarondamas.com / owner@demo-aislamiento.com creados, el
  // permiso nuevo queda en la tabla Permiso pero NO se le asigna a esos
  // usuarios — usuario.upsert() más abajo solo asigna usuarioPermisos en
  // la rama `create`, y `update: {}` no los toca (a propósito: pisar
  // permisos en cada re-seed rompería ediciones manuales hechas desde el
  // panel en producción). Después de agregar un permiso acá, correr
  // también `npm run prisma:sync-permisos` (prisma/sync-permisos-owner.ts)
  // para ponerlo al día en los usuarios dueño existentes.
  const permissions = [
    'caja.gastos',
    'inventario.ajustes',
    'precios.cambiar',
    'ventas.crear',
    'ventas.anular',
    'usuarios.gestionar',
    'clientes.gestionar',
    'productos.gestionar',
    // RF-12 (compras y proveedores): crear/emitir órdenes de compra y
    // confirmar recepciones. Permiso nuevo, no se reusó productos.gestionar
    // (gestionar el catálogo no implica poder comprometer dinero con un
    // proveedor — son autorizaciones de negocio distintas).
    'compras.gestionar',
    // RF-06 (tienda online), Fase 4: ver/tomar/confirmar/cancelar
    // pedidos de la bandeja. Permiso nuevo, no se reusó ventas.crear
    // (gestionar qué entra por la tienda es una responsabilidad
    // distinta de vender presencialmente, mismo criterio que
    // compras.gestionar arriba) — recordar correr
    // `npm run prisma:sync-permisos` después de este seed.
    'pedidos.gestionar',
    // Fase 4 del roadmap de Fidelización: crear/editar reglas de
    // descuento automático por nivel de fidelidad. Permiso nuevo, no se
    // reusó clientes.gestionar — configurar cuánto descuento se resigna
    // automáticamente en cada venta es una autorización de negocio
    // distinta de editar el nombre/email de un cliente, mismo criterio
    // que compras.gestionar/pedidos.gestionar arriba. Recordar correr
    // `npm run prisma:sync-permisos` después de este seed.
    'fidelizacion.gestionar',
  ];

  for (const permName of permissions) {
    await prisma.permiso.upsert({
      where: { nombre: permName },
      update: {},
      create: { nombre: permName },
    });
  }

  const allPermissions = await prisma.permiso.findMany();
  const ownerPermissions = allPermissions.map((p) => ({ permisoId: p.id }));

  // Usuarios
  const ownerUser = await prisma.usuario.upsert({
    where: { email: 'owner@otrarondamas.com' },
    update: {},
    create: {
      empresaId: empresa.id,
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
      empresaId: empresa.id,
      nombre: 'Vendedor de Prueba',
      email: 'seller@otrarondamas.com',
      passwordHash: hashedPassword,
      activo: true,
      // RF-17: este usuario representa el rol "Asistente de local" (antes
      // "Vendedor") — sin esto, el default del campo (OWNER) lo dejaría
      // mal clasificado. ownerUser de arriba no necesita `rol` explícito
      // porque OWNER ya es el default del schema.
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

  // Usuario y producto de la segunda empresa, para las pruebas de
  // aislamiento multiempresa (ver docs/scaffolding-notas.md sección 7).
  const ownerAislamiento = await prisma.usuario.upsert({
    where: { email: 'owner@demo-aislamiento.com' },
    update: {},
    create: {
      empresaId: empresaAislamiento.id,
      nombre: 'Dueño Empresa Aislamiento',
      email: 'owner@demo-aislamiento.com',
      passwordHash: hashedPassword,
      activo: true,
      usuarioPermisos: { create: ownerPermissions },
    },
  });
  console.log({ ownerAislamiento });

  const familiaAislamiento = await prisma.familia.upsert({
    where: { empresaId_nombre: { empresaId: empresaAislamiento.id, nombre: 'General' } },
    update: {},
    create: { nombre: 'General', prefijo: 'GEN', empresaId: empresaAislamiento.id },
  });
  const subfamiliaAislamiento = await prisma.subfamilia.upsert({
    where: { familiaId_nombre: { familiaId: familiaAislamiento.id, nombre: 'General' } },
    update: {},
    create: {
      nombre: 'General',
      prefijo: 'GEN',
      empresaId: empresaAislamiento.id,
      familiaId: familiaAislamiento.id,
    },
  });
  const tipoAislamiento = await prisma.tipo.upsert({
    where: { subfamiliaId_nombre: { subfamiliaId: subfamiliaAislamiento.id, nombre: NOMBRE_GEN } },
    update: {},
    create: {
      nombre: NOMBRE_GEN,
      prefijo: PREFIJO_GEN,
      empresaId: empresaAislamiento.id,
      subfamiliaId: subfamiliaAislamiento.id,
    },
  });
  const subtipoAislamiento = await prisma.subtipo.upsert({
    where: { tipoId_nombre: { tipoId: tipoAislamiento.id, nombre: NOMBRE_GEN } },
    update: {},
    create: {
      nombre: NOMBRE_GEN,
      prefijo: PREFIJO_GEN,
      empresaId: empresaAislamiento.id,
      tipoId: tipoAislamiento.id,
    },
  });

  const productoAislamiento = await prisma.producto.upsert({
    where: {
      empresaId_codigoInterno: {
        empresaId: empresaAislamiento.id,
        codigoInterno: 'GEN-GEN-GEN-GEN-00000001',
      },
    },
    update: {},
    create: {
      empresaId: empresaAislamiento.id,
      nombre: 'DEMO AISLAMIENTO - Producto de otra empresa',
      codigoInterno: 'GEN-GEN-GEN-GEN-00000001',
      codigoBarras: 'AISLAMIENTO-0001',
      familiaId: familiaAislamiento.id,
      subfamiliaId: subfamiliaAislamiento.id,
      tipoId: tipoAislamiento.id,
      subtipoId: subtipoAislamiento.id,
      unidadBase: 'UNIDAD',
      costo: 1,
      precioMinorista: 1,
      activo: true,
    },
  });
  console.log({ productoAislamiento });

  // Caja
  const caja = await prisma.caja.upsert({
    where: { empresaId: empresa.id }, // Assuming one box per company for simplicity
    update: {},
    create: {
      empresaId: empresa.id,
      fondoFijo: 25000.0,
      estado: 'CERRADA',
      // No apertura inicial, se hace al iniciar el día
    },
  });
  console.log({ caja });

  // ---------------------------------------------------------------------
  // Catálogo real "Lista minorista", consolidado desde
  // docs/Catalogos raw/Catalogo_Consolidado_Intermedio_Otra_Roonda_Mas.xlsx
  // (solapa Maestro_intermedio, filtrado a fuente='Lista minorista').
  //
  // Reglas seguidas, tal como exige la solapa LEEME_agente de ese archivo:
  // - No se inventan códigos de barras: Producto.codigoBarras queda null
  //   para todo este lote (ninguna fila de la fuente trae uno real).
  // - No se deduplica ni se infieren equivalencias entre fuentes: este
  //   seed usa EXCLUSIVAMENTE la fuente "Lista minorista". Coca-Cola y
  //   DIPA MAX quedan fuera (les falta precio_minorista o la asociación
  //   producto-precio no está validada por la fuente misma) — se
  //   incorporan en un incremento aparte cuando haya un flujo de
  //   importación/conciliación real (ver docs/spec-catalogo-productos.md).
  // - Se excluyeron 15 filas con precio_minorista = 0 (exhibidores,
  //   artículos promocionales de "regalo") por no ser productos
  //   vendibles reales.
  //
  // Placeholders documentados (decisión explícita, no asumida en
  // silencio):
  // - Producto.costo: el catálogo no trae costo, solo precio_minorista.
  //   Se usa costo = precioMinorista como placeholder — NO representa un
  //   margen real. Coherente con D-18 del SDD: no se calculan ganancias
  //   estimadas como definitivas hasta definir el método de costeo.
  // - Producto.familia/subfamilia/tipo/subtipo: se usa el "rubro" tal
  //   cual viene de la fuente (ej. "GOLOSINAS / CHOCOLATES") para ubicar
  //   la Subfamilia correspondiente (mapeo definido y revisado en la
  //   sesión de definición de catálogo — ver
  //   prisma/seed-data-jerarquia-catalogo.json), con Tipo/Subtipo = GEN
  //   (ningún rubro de este catálogo necesita más detalle todavía).
  // - Producto.unidadBase: la fuente no permite derivar de forma
  //   confiable la unidad base (bulto_fuente no especifica una unidad
  //   estandarizada). Se usa UNIDAD por defecto para todo el lote — es
  //   una simplificación conocida, no una equivalencia calculada (D-08
  //   prohíbe calcular conversiones por suposición).
  // - Lote.vencimiento: campo requerido (no nullable) en el schema
  //   actual; la mayoría de estos productos no son perecederos. Se usa
  //   "hoy + 10 años" como placeholder técnico para poder crear el Lote
  //   en absoluto — no representa una fecha de vencimiento real.
  // - Lote.cantidad: 100 unidades por producto, dato de demo pedido
  //   explícitamente por el dueño, no una existencia real.
  // ---------------------------------------------------------------------

  const minoristaPath = path.join(__dirname, 'seed-data-minorista.json');
  const jerarquiaPath = path.join(__dirname, 'seed-data-jerarquia-catalogo.json');
  if (fs.existsSync(minoristaPath)) {
    const minoristaData: MinoristaRow[] = JSON.parse(fs.readFileSync(minoristaPath, 'utf-8'));
    const jerarquiaData: { familias: JerarquiaFamilia[]; subfamilias: JerarquiaSubfamilia[] } =
      JSON.parse(fs.readFileSync(jerarquiaPath, 'utf-8'));
    console.log(`Catálogo Minorista: ${minoristaData.length} filas a importar.`);

    // 1) Familias (11, fijas — ver definición en la sesión de catálogo).
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
    console.log(`Familias creadas/existentes: ${familias.length}`);

    // 2) Subfamilias (187, una por rubro real del catálogo — mapeo
    // generado y revisado por el dueño, ver artifact de sesión).
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
    // Clave = nombre de rubro original (ej. "GOLOSINAS / CHOCOLATES"), tal
    // cual viene en MinoristaRow.rubro — es lo único que el catálogo
    // fuente trae para ubicar cada producto en el árbol.
    const subfamiliaIdPorRubro = new Map(
      jerarquiaData.subfamilias.map((s) => [
        s.rubroOriginalCategoria,
        subfamilias.find(
          (row) =>
            row.nombre === s.nombre && row.familiaId === familiaIdPorPrefijo.get(s.familiaPrefijo),
        )!.id,
      ]),
    );
    console.log(`Subfamilias creadas/existentes: ${subfamilias.length}`);

    // 3) Nodo Tipo/Subtipo = GEN por cada Subfamilia — los 4 niveles son
    // obligatorios siempre; ninguno de estos 187 rubros necesita más
    // detalle que Familia/Subfamilia todavía.
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
    console.log(`Nodos GEN (Tipo/Subtipo) creados/existentes: ${tipos.length}/${subtipos.length}`);

    const rubrosSinMapeo = new Set(
      minoristaData
        .filter((r) => r.rubro && !subfamiliaIdPorRubro.has(r.rubro))
        .map((r) => r.rubro),
    );
    if (rubrosSinMapeo.size > 0) {
      throw new Error(
        `Rubros sin Subfamilia mapeada (revisar seed-data-jerarquia-catalogo.json): ${[...rubrosSinMapeo].join(', ')}`,
      );
    }
    const filasSinRubro = minoristaData.filter((r) => !r.rubro);
    if (filasSinRubro.length > 0) {
      throw new Error(
        `${filasSinRubro.length} filas sin rubro — el catálogo Minorista no debería traer filas sin rubro (revisar fuente).`,
      );
    }

    // 4) SKU determinístico por posición de fila en el JSON fuente (fila 0
    // → correlativo 1, fila 1 → correlativo 2, …), NO por un contador que
    // avanza en cada corrida del seed. Así el SKU de cada producto es
    // siempre el mismo entre corridas, lo que permite usar el propio
    // codigoInterno (el SKU) como clave de "esta fila ya se importó" sin
    // necesitar un campo aparte para el código del ERP de origen (eso
    // queda pendiente como decisión de catálogo — código de
    // origen/proveedor-producto — fuera de alcance de este seed).
    // Requiere que el orden de seed-data-minorista.json no cambie entre
    // corridas, lo cual se cumple: es un archivo generado una vez desde
    // el catálogo consolidado, no se reordena a mano.
    const filasConSku = minoristaData.map((r, idx) => {
      const subfamiliaId = subfamiliaIdPorRubro.get(r.rubro!)!;
      const subfamilia = subfamilias.find((s) => s.id === subfamiliaId)!;
      const familia = familias.find((f) => f.id === subfamilia.familiaId)!;
      const tipoId = tipoIdPorSubfamiliaId.get(subfamiliaId)!;
      const subtipoId = subtipoIdPorTipoId.get(tipoId)!;
      const sku = construirSku(
        familia.prefijo,
        subfamilia.prefijo,
        PREFIJO_GEN,
        PREFIJO_GEN,
        idx + 1,
      );
      return { row: r, sku, familiaId: familia.id, subfamiliaId, tipoId, subtipoId };
    });

    // 5) Productos ya existentes (por el SKU determinístico) — se evita
    // reintentar productos ya cargados en una corrida anterior, sin
    // depender de un upsert fila por fila (sería lento para ~4300 filas y
    // este script debe poder re-ejecutarse sin duplicar).
    const skusExistentes = new Set(
      (
        await prisma.producto.findMany({
          where: { empresaId: empresa.id, codigoInterno: { in: filasConSku.map((f) => f.sku) } },
          select: { codigoInterno: true },
        })
      ).map((p) => p.codigoInterno),
    );
    const filasNuevas = filasConSku.filter((f) => !skusExistentes.has(f.sku));
    console.log(
      `Productos ya existentes (se omiten): ${filasConSku.length - filasNuevas.length}. Nuevos a crear: ${filasNuevas.length}.`,
    );

    // 6) Insertar productos en lotes (batch) — createMany no soporta
    // relaciones anidadas, así que primero se crean los Producto y luego
    // los Lote de stock demo asociados, en un segundo paso.
    const BATCH_SIZE = 500;
    let creados = 0;
    for (let i = 0; i < filasNuevas.length; i += BATCH_SIZE) {
      const lote = filasNuevas.slice(i, i + BATCH_SIZE);
      await prisma.producto.createMany({
        data: lote.map((f) => ({
          empresaId: empresa.id,
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
      creados += lote.length;
      console.log(`  Productos creados: ${creados}/${filasNuevas.length}`);
    }

    // 7) Lote de stock demo (100 unidades) por cada producto recién
    // creado en esta corrida. No se le crea un Lote nuevo a un producto
    // que ya tenía uno de una corrida anterior.
    if (filasNuevas.length > 0) {
      const productosCreados = await prisma.producto.findMany({
        where: { codigoInterno: { in: filasNuevas.map((f) => f.sku) } },
        select: { id: true, codigoInterno: true },
      });
      const vencimientoPlaceholder = new Date();
      vencimientoPlaceholder.setFullYear(vencimientoPlaceholder.getFullYear() + 10);

      let lotesCreados = 0;
      for (let i = 0; i < productosCreados.length; i += BATCH_SIZE) {
        const lote = productosCreados.slice(i, i + BATCH_SIZE);
        await prisma.lote.createMany({
          data: lote.map((p) => ({
            empresaId: empresa.id,
            productoId: p.id,
            numeroLote: `DEMO-${p.codigoInterno}`,
            vencimiento: vencimientoPlaceholder,
            cantidad: 100,
          })),
          skipDuplicates: true,
        });
        lotesCreados += lote.length;
        console.log(`  Lotes de stock demo creados: ${lotesCreados}/${productosCreados.length}`);
      }
    }

    console.log('Catálogo Minorista importado.');
  } else {
    console.log(
      `Aviso: no se encontró ${minoristaPath} — se omite la importación del catálogo Minorista.`,
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
