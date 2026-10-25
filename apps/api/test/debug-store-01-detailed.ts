import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  const prisma = moduleFixture.get<PrismaService>(PrismaService);

  // Use the same company as TIENDA_EMPRESA_ID
  const tiendaEmpresaId = process.env.TIENDA_EMPRESA_ID || '22dc5550-be63-44bd-bad7-8b7da0b2c6ca';

  console.log('Test TIENDA_EMPRESA_ID:', tiendaEmpresaId);

  // Ensure empresa exists
  let companyA = await prisma.empresa.findUnique({ where: { id: tiendaEmpresaId } });
  if (!companyA) {
    companyA = await prisma.empresa.create({
      data: {
        id: tiendaEmpresaId,
        nombre: 'STORE-01 Test Company',
        slug: 'store-01-test',
        configuracion: {},
      },
    });
  }

  console.log('Company found/created:', companyA.id);

  // Create hierarchy
  const familia = await prisma.familia.create({
    data: {
      empresaId: companyA.id,
      nombre: `STORE-01-Familia-${Date.now()}`,
      prefijo: 'SFA',
    },
  });

  const subfamilia = await prisma.subfamilia.create({
    data: {
      empresaId: companyA.id,
      familiaId: familia.id,
      nombre: `STORE-01-Subfamilia-${Date.now()}`,
      prefijo: 'SFB',
    },
  });

  const tipo = await prisma.tipo.create({
    data: {
      empresaId: companyA.id,
      subfamiliaId: subfamilia.id,
      nombre: `STORE-01-Tipo-${Date.now()}`,
      prefijo: 'STP',
    },
  });

  const subtipo = await prisma.subtipo.create({
    data: {
      empresaId: companyA.id,
      tipoId: tipo.id,
      nombre: `STORE-01-Subtipo-${Date.now()}`,
      prefijo: 'STS',
    },
  });

  // Create two products (one with stock, one without)
  const product1 = await prisma.producto.create({
    data: {
      empresaId: companyA.id,
      familiaId: familia.id,
      subfamiliaId: subfamilia.id,
      tipoId: tipo.id,
      subtipoId: subtipo.id,
      nombre: 'STORE-01 Product 1 (stock)',
      codigoInterno: 'S01-P1',
      costo: 10,
      precioMinorista: 100,
      unidadBase: 'UNIDAD',
      activo: true,
    },
  });

  const product2 = await prisma.producto.create({
    data: {
      empresaId: companyA.id,
      familiaId: familia.id,
      subfamiliaId: subfamilia.id,
      tipoId: tipo.id,
      subtipoId: subtipo.id,
      nombre: 'STORE-01 Product 2 (no stock)',
      codigoInterno: 'S01-P2',
      costo: 10,
      precioMinorista: 50,
      unidadBase: 'UNIDAD',
      activo: true,
    },
  });

  // Create lote for product1 only
  await prisma.lote.create({
    data: {
      empresaId: companyA.id,
      productoId: product1.id,
      numeroLote: 'S01-LOTE-1',
      cantidad: 5,
      vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Products created:');
  console.log('  P1 (with stock):', product1.id, 'activo:', product1.activo);
  console.log('  P2 (no stock):', product2.id, 'activo:', product2.activo);

  // Test POST /tienda/pedidos with product1 (should succeed)
  console.log('\n=== Test 1: POST /tienda/pedidos with product1 (has stock) ===');
  const order1 = {
    nombre: 'Comprador Store',
    email: `store-01-${Date.now()}@test.com`,
    items: [{ productoId: product1.id, cantidad: 1 }],
  };

  const res1 = await request(app.getHttpServer()).post('/tienda/pedidos').send(order1);

  console.log('Status:', res1.status);
  console.log('Body:', JSON.stringify(res1.body, null, 2));

  // Test POST /tienda/pedidos with product2 (should fail - no stock)
  console.log('\n=== Test 2: POST /tienda/pedidos with product2 (no stock) ===');
  const order2 = {
    nombre: 'Comprador Store',
    email: `store-01-2-${Date.now()}@test.com`,
    items: [{ productoId: product2.id, cantidad: 1 }],
  };

  const res2 = await request(app.getHttpServer()).post('/tienda/pedidos').send(order2);

  console.log('Status:', res2.status);
  console.log('Body:', JSON.stringify(res2.body, null, 2));

  // Cleanup
  console.log('\n=== Cleanup ===');
  await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: companyA.id } } });
  await prisma.pedido.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.movimientoStock.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.lote.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.producto.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.subtipo.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.tipo.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.subfamilia.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.familia.deleteMany({ where: { empresaId: companyA.id } });
  console.log('Cleanup complete');

  await app.close();
}

main().catch(console.error);
