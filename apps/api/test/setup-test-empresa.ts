import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const testCompanyId = '22dc5550-be63-44bd-bad7-8b7da0b2c6ca';

  const existing = await prisma.empresa.findUnique({
    where: { id: testCompanyId },
  });

  if (!existing) {
    console.log('Creating test empresa...');
    await prisma.empresa.create({
      data: {
        id: testCompanyId,
        nombre: 'Test Company for E2E',
        slug: 'test-company-e2e',
        configuracion: {},
      },
    });
    console.log('✓ Test empresa created');
  } else {
    console.log('✓ Test empresa already exists');
  }
}

main().finally(() => prisma.$disconnect());
