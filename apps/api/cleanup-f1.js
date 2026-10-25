const { PrismaClient } = require('@prisma/client');

async function cleanup() {
  const prisma = new PrismaClient();
  const testCompanyId = '22dc5550-be63-44bd-bad7-8b7da0b2c6ca';
  
  try {
    console.log('Cleaning up F1 test data...');
    
    // Delete in reverse dependency order
    await prisma.movimientoStock.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.lote.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.producto.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.subtipo.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.tipo.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.familia.deleteMany({ where: { empresaId: testCompanyId } });
    
    console.log('Cleanup complete');
  } catch (e) {
    console.error('Cleanup error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
