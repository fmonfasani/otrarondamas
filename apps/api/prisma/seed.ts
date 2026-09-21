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

  const categoriaAislamiento = await prisma.categoria.upsert({
    where: { empresaId_nombre: { empresaId: empresaAislamiento.id, nombre: 'General' } },
    update: {},
    create: { nombre: 'General', empresaId: empresaAislamiento.id },
  });

  const productoAislamiento = await prisma.producto.upsert({
    where: { codigoInterno: 'AISLAMIENTO-0001' },
    update: {},
    create: {
      empresaId: empresaAislamiento.id,
      nombre: 'DEMO AISLAMIENTO - Producto de otra empresa',
      codigoInterno: 'AISLAMIENTO-0001',
      codigoBarras: 'AISLAMIENTO-0001',
      categoriaId: categoriaAislamiento.id,
      unidadBase: 'UNIDAD',
      costo: 1,
      precioMinorista: 1,
      activo: true,
    },
  });
  console.log({ productoAislamiento });

  // Categorías base del piloto (independientes del catálogo real
  // importado más abajo — no se intenta mapear una taxonomía a la otra,
  // ver docs/scaffolding-notas.md sección 10).
  const categoriasData = ['Bebidas', 'Snacks', 'Almacén', 'Kiosco'];

  for (const catName of categoriasData) {
    await prisma.categoria.upsert({
      where: { empresaId_nombre: { empresaId: empresa.id, nombre: catName } },
      update: {},
      create: { nombre: catName, empresaId: empresa.id },
    });
  }
  console.log('Categorías base creadas:', categoriasData);

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
  // - Producto.categoria: se usa el "rubro" tal cual viene de la fuente
  //   (ej. "GOLOSINAS / CHOCOLATES") como nombre de Categoria — 187
  //   categorías nuevas, sin intentar mapearlas a las 4 categorías base
  //   del piloto (taxonomías distintas, ver arriba).
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
  if (fs.existsSync(minoristaPath)) {
    const minoristaData: MinoristaRow[] = JSON.parse(fs.readFileSync(minoristaPath, 'utf-8'));
    console.log(`Catálogo Minorista: ${minoristaData.length} filas a importar.`);

    // 1) Categorías: una por rubro distinto, únicas por empresa.
    const rubros = Array.from(
      new Set(minoristaData.map((r) => r.rubro).filter((r): r is string => !!r)),
    );
    await prisma.categoria.createMany({
      data: rubros.map((nombre) => ({ nombre, empresaId: empresa.id })),
      skipDuplicates: true,
    });
    const categoriasCatalogo = await prisma.categoria.findMany({
      where: { empresaId: empresa.id, nombre: { in: rubros } },
    });
    const categoriaIdPorNombre = new Map(categoriasCatalogo.map((c) => [c.nombre, c.id]));
    console.log(
      `Categorías del catálogo Minorista creadas/existentes: ${categoriasCatalogo.length}`,
    );

    // 2) Productos ya existentes (por codigoInterno) — se evita reintentar
    // productos que ya están cargados en una corrida anterior del seed,
    // sin depender de un upsert fila por fila (sería lento para ~4300
    // filas y este script debe poder re-ejecutarse sin duplicar).
    const codigosExistentes = new Set(
      (
        await prisma.producto.findMany({
          where: { codigoInterno: { in: minoristaData.map((r) => r.codigoInterno) } },
          select: { codigoInterno: true },
        })
      ).map((p) => p.codigoInterno),
    );

    const filasNuevas = minoristaData.filter((r) => !codigosExistentes.has(r.codigoInterno));
    console.log(
      `Productos ya existentes (se omiten): ${minoristaData.length - filasNuevas.length}. Nuevos a crear: ${filasNuevas.length}.`,
    );

    const SIN_CATEGORIA_FALLBACK = 'SIN RUBRO (catálogo Minorista)';
    if (minoristaData.some((r) => !r.rubro)) {
      await prisma.categoria.upsert({
        where: { empresaId_nombre: { empresaId: empresa.id, nombre: SIN_CATEGORIA_FALLBACK } },
        update: {},
        create: { nombre: SIN_CATEGORIA_FALLBACK, empresaId: empresa.id },
      });
      const cat = await prisma.categoria.findUniqueOrThrow({
        where: { empresaId_nombre: { empresaId: empresa.id, nombre: SIN_CATEGORIA_FALLBACK } },
      });
      categoriaIdPorNombre.set(SIN_CATEGORIA_FALLBACK, cat.id);
    }

    // 3) Insertar productos en lotes (batch) — createMany no soporta
    // relaciones anidadas, así que primero se crean los Producto y luego
    // los Lote de stock demo asociados, en un segundo paso.
    const BATCH_SIZE = 500;
    let creados = 0;
    for (let i = 0; i < filasNuevas.length; i += BATCH_SIZE) {
      const lote = filasNuevas.slice(i, i + BATCH_SIZE);
      await prisma.producto.createMany({
        data: lote.map((r) => ({
          empresaId: empresa.id,
          nombre: r.nombre,
          codigoInterno: r.codigoInterno,
          codigoBarras: null, // No se inventa (ver LEEME_agente del catálogo fuente)
          marca: null, // La fuente Minorista no trae marca en esta tabla
          categoriaId: categoriaIdPorNombre.get(r.rubro ?? SIN_CATEGORIA_FALLBACK)!,
          unidadBase: UnidadBase.UNIDAD, // Placeholder, ver comentario arriba
          costo: r.precioMinorista, // Placeholder (D-18), ver comentario arriba
          precioMinorista: r.precioMinorista,
          precioMayorista: null, // D-01: no viene en esta fuente, no se inventa
          activo: true,
        })),
        skipDuplicates: true,
      });
      creados += lote.length;
      console.log(`  Productos creados: ${creados}/${filasNuevas.length}`);
    }

    // 4) Lote de stock demo (100 unidades) por cada producto recién
    // creado en esta corrida. No se le crea un Lote nuevo a un producto
    // que ya tenía uno de una corrida anterior.
    if (filasNuevas.length > 0) {
      const productosCreados = await prisma.producto.findMany({
        where: { codigoInterno: { in: filasNuevas.map((r) => r.codigoInterno) } },
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
