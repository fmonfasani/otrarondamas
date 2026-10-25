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

  const testCompanyId = process.env.TIENDA_EMPRESA_ID || '22dc5550-be63-44bd-bad7-8b7da0b2c6ca';

  // Create test product
  const familia = await prisma.familia.create({
    data: {
      empresaId: testCompanyId,
      nombre: `Debug Fam ${Date.now()}`,
      prefijo: 'DBG',
    },
  });

  const subfamilia = await prisma.subfamilia.create({
    data: {
      empresaId: testCompanyId,
      familiaId: familia.id,
      nombre: `Debug Sub ${Date.now()}`,
      prefijo: 'DBS',
    },
  });

  const tipo = await prisma.tipo.create({
    data: {
      empresaId: testCompanyId,
      subfamiliaId: subfamilia.id,
      nombre: `Debug Tipo ${Date.now()}`,
      prefijo: 'DBT',
    },
  });

  const subtipo = await prisma.subtipo.create({
    data: {
      empresaId: testCompanyId,
      tipoId: tipo.id,
      nombre: `Debug Subt ${Date.now()}`,
      prefijo: 'DBU',
    },
  });

  const producto = await prisma.producto.create({
    data: {
      empresaId: testCompanyId,
      familiaId: familia.id,
      subfamiliaId: subfamilia.id,
      tipoId: tipo.id,
      subtipoId: subtipo.id,
      nombre: 'Debug Product',
      codigoInterno: `DBG-${Date.now()}`,
      precioMinorista: '100.00',
      costo: '50.00',
      unidadBase: 'UNIDAD',
      activo: true,
    },
  });

  await prisma.lote.create({
    data: {
      empresaId: testCompanyId,
      productoId: producto.id,
      numeroLote: `DBG-LOTE-${Date.now()}`,
      cantidad: 100,
      vencimiento: new Date('2099-01-01'),
    },
  });

  const res = await request(app.getHttpServer())
    .post('/store/order')
    .send({
      email: `debug-${Date.now()}@example.com`,
      nombre: 'Debug Customer',
      telefono: '+123456789',
      items: [
        {
          productoId: producto.id,
          cantidad: 5,
        },
      ],
    })
    .set('X-Idempotency-Key', `debug-order-${Date.now()}`);

  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(res.body, null, 2));
  if (res.text) console.log('Text:', res.text);

  // Cleanup
  await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: testCompanyId } } });
  await prisma.pedido.deleteMany({ where: { empresaId: testCompanyId } });
  await prisma.movimientoStock.deleteMany({ where: { empresaId: testCompanyId } });
  await prisma.lote.deleteMany({ where: { empresaId: testCompanyId } });
  await prisma.producto.deleteMany({ where: { empresaId: testCompanyId } });
  await prisma.cliente.deleteMany({ where: { empresaId: testCompanyId } });
  await prisma.subtipo.deleteMany({ where: { empresaId: testCompanyId } });
  await prisma.tipo.deleteMany({ where: { empresaId: testCompanyId } });
  await prisma.subfamilia.deleteMany({ where: { empresaId: testCompanyId } });
  await prisma.familia.deleteMany({ where: { empresaId: testCompanyId } });

  await app.close();
}

main().catch(console.error);
