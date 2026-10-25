import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.usuario.findUnique({
    where: { email: 'owner@otrarondamas.com' },
    select: {
      id: true,
      email: true,
      nombre: true,
      empresaId: true,
      rol: true,
      activo: true,
    },
  });

  if (!owner || !owner.activo) {
    throw new Error('E2E precondition failed: active owner@otrarondamas.com seed user is missing');
  }

  const user = await prisma.user.upsert({
    where: { email: owner.email },
    update: { nombre: owner.nombre, usuarioId: owner.id },
    create: {
      email: owner.email,
      nombre: owner.nombre,
      usuarioId: owner.id,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_businessId: { userId: user.id, businessId: owner.empresaId },
    },
    update: {
      role: owner.rol,
      status: 'ACTIVE',
    },
    create: {
      userId: user.id,
      businessId: owner.empresaId,
      role: owner.rol,
      status: 'ACTIVE',
    },
  });

  await prisma.cliente.upsert({
    where: {
      empresaId_email: {
        empresaId: owner.empresaId,
        email: 'messaging-e2e-customer@otrarondamas.com',
      },
    },
    update: { nombre: 'Cliente E2E Mensajería', activo: true },
    create: {
      empresaId: owner.empresaId,
      nombre: 'Cliente E2E Mensajería',
      email: 'messaging-e2e-customer@otrarondamas.com',
      telefono: '1100000000',
      activo: true,
    },
  });

  console.log('Messaging browser E2E fixtures prepared: owner membership + customer');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
