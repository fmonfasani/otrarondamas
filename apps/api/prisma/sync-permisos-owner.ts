import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seed gap (see docs/scaffolding-notas.md): prisma.usuario.upsert()
// only assigns usuarioPermisos in the `create` branch — if the user
// already exists, `update: {}` does not touch its permissions. When a
// new permission is added to the catalog (`permissions` array of
// seed.ts) and the seed is re-run on a database that already had the
// owner created, that new permission stays in the Permiso table but is
// never assigned.
//
// This script is the separate mechanism for that case: it adds ONLY the
// missing permissions to the known 'owner' users (those that in seed.ts
// receive the full `ownerPermissions` list, not the restricted list of
// sellerUser). It is purely additive — it never does deleteMany nor
// touches already assigned permissions, so as not to overwrite a manual
// edit that the real owner may have made from the users panel in
// production.
//
// Usage: npm run prisma:sync-permisos (see package.json of apps/api).
async function main() {
  // Same emails as in seed.ts for the users that receive ALL the catalog
  // permissions. sellerUser (seller@otrarondamas.com) is deliberately left
  // out of this list.
  const ownerEmails = ['owner@otrarondamas.com', 'owner@demo-aislamiento.com'];

  const allPermissions = await prisma.permiso.findMany();
  if (allPermissions.length === 0) {
    console.log('No hay permisos en el catálogo — corré el seed primero.');
    return;
  }

  for (const email of ownerEmails) {
    const user = await prisma.usuario.findUnique({
      where: { email },
      include: { usuarioPermisos: { select: { permisoId: true } } },
    });

    if (!user) {
      console.log(`  ${email}: no existe todavía (se lo salta, lo crea el seed).`);
      continue;
    }

    const alreadyAssigned = new Set(user.usuarioPermisos.map((up) => up.permisoId));
    const missing = allPermissions.filter((p) => !alreadyAssigned.has(p.id));

    if (missing.length === 0) {
      console.log(`  ${email}: ya tiene los ${allPermissions.length} permisos del catálogo.`);
      continue;
    }

    await prisma.usuarioPermiso.createMany({
      data: missing.map((p) => ({ usuarioId: user.id, permisoId: p.id })),
      skipDuplicates: true,
    });
    console.log(
      `  ${email}: agregados ${missing.length} permisos faltantes (${missing.map((p) => p.nombre).join(', ')}).`,
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
