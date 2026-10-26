/**
 * Seed UserEmpresa relationships for existing users
 * Ensures backward compatibility: existing users can still access their current empresa
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding UserEmpresa for existing users...');

  // Get all users
  const users = await prisma.usuario.findMany({
    select: { id: true, empresaId: true },
  });

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    // Check if UserEmpresa already exists
    const existing = await prisma.userEmpresa.findUnique({
      where: {
        usuarioId_empresaId: {
          usuarioId: user.id,
          empresaId: user.empresaId,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Create UserEmpresa
    await prisma.userEmpresa.create({
      data: {
        usuarioId: user.id,
        empresaId: user.empresaId,
        role: 'owner', // Existing users get owner role by default
      },
    });

    created++;
    console.log(`Created UserEmpresa for user ${user.id} -> empresa ${user.empresaId}`);
  }

  console.log(`Seed complete: ${created} created, ${skipped} skipped`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
