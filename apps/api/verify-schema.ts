import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  try {
    // Contar registros y verificar acceso
    const count = await prisma.pedido.count();
    console.log(`✅ Tabla Pedido accesible. Registros existentes: ${count}`);

    // Crear un test pedido con idempotencyKey
    const testPedido = await prisma.pedido.create({
      data: {
        empresaId: 'test-empresa',
        clienteId: 'test-cliente',
        idempotencyKey: `test-key-${Date.now()}`,
      },
    });
    console.log(`✅ Pedido creado con idempotencyKey: ${testPedido.idempotencyKey}`);

    // Limpiar
    await prisma.pedido.delete({ where: { id: testPedido.id } });
    console.log('✅ Test pedido eliminado');
  } catch (error: any) {
    console.error('❌ Error:', error?.message || String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
