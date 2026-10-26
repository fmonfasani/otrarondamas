import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed: Adding UserEmpresa M:M relationships for multi-tenancy...');

  try {
    // Get all existing usuarios with empresaId
    const usuarios = await prisma.usuario.findMany({
      where: {
        empresaId: {
          not: null
        }
      }
    });

    console.log(`Found ${usuarios.length} usuarios with empresaId`);

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // For each user, create a UserEmpresa entry
    for (const usuario of usuarios) {
      try {
        // Check if UserEmpresa already exists
        const existing = await prisma.userEmpresa.findUnique({
          where: {
            usuarioId_empresaId: {
              usuarioId: usuario.id,
              empresaId: usuario.empresaId
            }
          }
        });

        if (existing) {
          console.log(`  ✓ Skipped: UserEmpresa already exists for Usuario ${usuario.id} (${usuario.email})`);
          skippedCount++;
          continue;
        }

        // Create new UserEmpresa entry
        // Assume all existing users are "owners" of their primary empresa
        const userEmpresa = await prisma.userEmpresa.create({
          data: {
            usuarioId: usuario.id,
            empresaId: usuario.empresaId,
            role: 'owner'
          }
        });

        console.log(`  ✓ Created: UserEmpresa for Usuario ${usuario.id} (${usuario.email}) → Empresa ${usuario.empresaId}`);
        createdCount++;
      } catch (error) {
        console.error(`  ✗ Error for Usuario ${usuario.id}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\nSeed Summary:`);
    console.log(`  Created: ${createdCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log(`  Errors:  ${errorCount}`);

    // Verify integrity
    const totalUserEmpresa = await prisma.userEmpresa.count();
    console.log(`\nTotal UserEmpresa records in database: ${totalUserEmpresa}`);

    // Check for any users without empresaId
    const usersWithoutEmpresa = await prisma.usuario.findMany({
      where: {
        empresaId: null
      }
    });

    if (usersWithoutEmpresa.length > 0) {
      console.warn(`\nWarning: ${usersWithoutEmpresa.length} usuarios found without empresaId (not included in seed)`);
      usersWithoutEmpresa.forEach(u => {
        console.warn(`  - ${u.id} (${u.email})`);
      });
    }

    console.log('\n✓ Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
