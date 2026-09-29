import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Gap del seed (ver docs/scaffolding-notas.md): prisma.usuario.upsert()
// solo asigna usuarioPermisos en la rama `create` — si el usuario ya
// existe, `update: {}` no le toca los permisos. Cuando se agrega un
// permiso nuevo al catálogo (array `permissions` de seed.ts) y se
// re-corre el seed sobre una base que ya tenía al dueño creado, ese
// permiso nuevo queda en la tabla Permiso pero nunca asignado.
//
// Este script es el mecanismo separado para ese caso: agrega SOLO los
// permisos que falten a los usuarios "dueño" conocidos (los que en
// seed.ts reciben la lista completa `ownerPermissions`, no la lista
// acotada de sellerUser). Es aditivo puro — nunca hace deleteMany ni
// toca permisos ya asignados, para no pisar una edición manual que el
// dueño real haya hecho desde el panel de usuarios en producción.
//
// Uso: npm run prisma:sync-permisos (ver package.json de apps/api).
async function main() {
  // Mismos emails que en seed.ts para los usuarios que reciben TODOS
  // los permisos del catálogo. sellerUser (seller@otrarondamas.com)
  // queda deliberadamente afuera de esta lista.
  const emailsDueno = ['owner@otrarondamas.com', 'owner@demo-aislamiento.com'];

  const todosLosPermisos = await prisma.permiso.findMany();
  if (todosLosPermisos.length === 0) {
    console.log('No hay permisos en el catálogo — corré el seed primero.');
    return;
  }

  for (const email of emailsDueno) {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { usuarioPermisos: { select: { permisoId: true } } },
    });

    if (!usuario) {
      console.log(`  ${email}: no existe todavía (se lo salta, lo crea el seed).`);
      continue;
    }

    const yaAsignados = new Set(usuario.usuarioPermisos.map((up) => up.permisoId));
    const faltantes = todosLosPermisos.filter((p) => !yaAsignados.has(p.id));

    if (faltantes.length === 0) {
      console.log(`  ${email}: ya tiene los ${todosLosPermisos.length} permisos del catálogo.`);
      continue;
    }

    await prisma.usuarioPermiso.createMany({
      data: faltantes.map((p) => ({ usuarioId: usuario.id, permisoId: p.id })),
      skipDuplicates: true,
    });
    console.log(
      `  ${email}: agregados ${faltantes.length} permisos faltantes (${faltantes.map((p) => p.nombre).join(', ')}).`,
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
