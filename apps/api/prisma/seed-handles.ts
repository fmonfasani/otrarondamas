import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Seeding empresa handles...');

  // Update existing empresas with handles based on their slug
  const empresas = await prisma.empresa.findMany();

  for (const empresa of empresas) {
    if (!empresa.handle) {
      const handle = (empresa.slug || empresa.nombre)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      await prisma.empresa.update({
        where: { id: empresa.id },
        data: { handle },
      });

      console.log(`✅ ${empresa.nombre} → handle: ${handle}`);
    }
  }

  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
