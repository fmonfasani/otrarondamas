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

  // Ensure empresa exists
  let companyA = await prisma.empresa.findUnique({ where: { id: tiendaEmpresaId } });
  if (!companyA) {
    companyA = await prisma.empresa.create({
      data: {
        id: tiendaEmpresaId,
        nombre: 'Debug Test Company A',
        slug: 'debug-test-a',
        configuracion: {},
      },
    });
  }

  // Create familia/subfamilia/tipo/subtipo
  const familia = await prisma.familia.create({
    data: {
      empresaId: companyA.id,
      nombre: 'Debug Familia',
      prefijo: 'DBG',
    },
  });

  const subfamilia = await prisma.subfamilia.create({
    data: {
      empresaId: companyA.id,
      familiaId: familia.id,
      nombre: 'Debug Subfamilia',
      prefijo: 'DBF',
    },
  });

  const tipo = await prisma.tipo.create({
    data: {
      empresaId: companyA.id,
      subfamiliaId: subfamilia.id,
      nombre: 'Debug Tipo',
      prefijo: 'DBT',
    },
  });

  const subtipo = await prisma.subtipo.create({
    data: {
      empresaId: companyA.id,
      tipoId: tipo.id,
      nombre: 'Debug Subtipo',
      prefijo: 'DBS',
    },
  });

  // Create product
  const producto = await prisma.producto.create({
    data: {
      empresaId: companyA.id,
      familiaId: familia.id,
      subfamiliaId: subfamilia.id,
      tipoId: tipo.id,
      subtipoId: subtipo.id,
      nombre: 'Debug Product',
      codigoInterno: 'DBG-001',
      costo: 10,
      precioMinorista: 100,
      unidadBase: 'UNIDAD',
    },
  });

  // Create lote
  await prisma.lote.create({
    data: {
      empresaId: companyA.id,
      productoId: producto.id,
      numeroLote: 'DBG-LOTE-001',
      cantidad: 10,
      vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Test POST /tienda/pedidos
  const orderBody = {
    nombre: 'Test Buyer',
    email: `debug-${Date.now()}@example.com`,
    items: [{ productoId: producto.id, cantidad: 1 }],
  };

  const res = await request(app.getHttpServer())
    .post('/tienda/pedidos')
    .send(orderBody)
    .set('X-Business-ID', companyA.id);

  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(res.body, null, 2));

  // Cleanup
  await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: companyA.id } } });
  await prisma.pedido.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.movimientoStock.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.lote.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.producto.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.subtipo.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.tipo.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.subfamilia.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.familia.deleteMany({ where: { empresaId: companyA.id } });
  await prisma.empresa.delete({ where: { id: companyA.id } });

  await app.close();
}

main().catch(console.error);
