import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';

const waitPort = (port: number, attempts = 60) =>
  new Promise<void>((resolve, reject) => {
    const probe = (remaining: number) => {
      const socket = net.connect(port, '127.0.0.1');
      socket.on('connect', () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        if (remaining <= 0) reject(new Error(`puerto ${port} sin respuesta`));
        else setTimeout(() => probe(remaining - 1), 1000);
      });
    };
    probe(attempts);
  });

async function main() {
  const PORT = '3392';
  const BASE = `http://127.0.0.1:${PORT}`;
  const suffix = Date.now();

  // Spawn server (exactly like s-v1-store-01 does)
  console.log('=== SPAWNING SERVER ===');

  // Create test companies
  const prisma = new PrismaService();
  await prisma.$connect();

  const companyA = await prisma.empresa.create({
    data: {
      nombre: `S-V1-ST A ${suffix}`,
      slug: `s-v1-store-01-a-${suffix}`,
      configuracion: {},
    },
    select: { id: true, nombre: true },
  });

  console.log('Company A created:', companyA.id);

  // Create hierarchy (exactly like mkHierarchy)
  const familia = await prisma.familia.create({
    data: {
      empresaId: companyA.id,
      nombre: `S-V1-ST Fam A ${suffix}`,
      prefijo: 'FA',
    },
    select: { id: true },
  });

  const subfamilia = await prisma.subfamilia.create({
    data: {
      empresaId: companyA.id,
      familiaId: familia.id,
      nombre: `S-V1-ST Sub A ${suffix}`,
      prefijo: 'SA',
    },
    select: { id: true },
  });

  const tipo = await prisma.tipo.create({
    data: {
      empresaId: companyA.id,
      subfamiliaId: subfamilia.id,
      nombre: `S-V1-ST Tip A ${suffix}`,
      prefijo: 'TA',
    },
    select: { id: true },
  });

  const subtipo = await prisma.subtipo.create({
    data: {
      empresaId: companyA.id,
      tipoId: tipo.id,
      nombre: `S-V1-ST Subt A ${suffix}`,
      prefijo: 'UA',
    },
    select: { id: true },
  });

  // Create productA1 (exactly like mkProduct)
  const productA1 = await prisma.producto.create({
    data: {
      empresaId: companyA.id,
      nombre: `S-V1-ST Prod A1 ${suffix}`,
      codigoInterno: `STORE-A1-${suffix}`,
      familiaId: familia.id,
      subfamiliaId: subfamilia.id,
      tipoId: tipo.id,
      subtipoId: subtipo.id,
      unidadBase: 'UNIDAD',
      costo: '10',
      precioMinorista: '100',
      descuentoPorcentaje: '10',
      activo: true,
    },
    select: { id: true, nombre: true },
  });

  console.log('ProductA1 created:', productA1.id);

  // Create lote EXACTLY like the test does
  const lote = await prisma.lote.create({
    data: {
      empresaId: companyA.id,
      productoId: productA1.id,
      numeroLote: `L-${suffix}`,
      vencimiento: new Date('2099-01-01T00:00:00.000Z'),
      cantidad: '5',
    },
  });

  console.log('Lote created:', lote.id, 'cantidad:', lote.cantidad);

  // Verify lote was created
  const lotesCheck = await prisma.lote.findMany({
    where: { productoId: productA1.id },
  });
  console.log(
    'Lotes for product:',
    lotesCheck.map((l) => ({ id: l.id, cantidad: l.cantidad, vencimiento: l.vencimiento })),
  );

  // Spawn server with TIENDA_EMPRESA_ID = companyA.id
  console.log('\n=== SPAWNING REAL SERVER ON PORT', PORT, '===');
  console.log('Server env TIENDA_EMPRESA_ID:', companyA.id);

  const server: ChildProcess = spawn('node', ['dist/src/main.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT, TIENDA_EMPRESA_ID: companyA.id },
    stdio: 'ignore',
  });

  try {
    await waitPort(Number(PORT));
    console.log('Server started and listening');

    // Now make the exact same request as STORE-03a
    console.log('\n=== TEST STORE-03a: POST /tienda/pedidos ===');
    const orderBody = {
      nombre: 'Comprador Store',
      email: `s-v1-store-03a-${suffix}@example.test`,
      items: [{ productoId: productA1.id, cantidad: 2 }],
    };

    console.log('Request body:', JSON.stringify(orderBody, null, 2));
    console.log('Expected enterprise (from env):', companyA.id);
    console.log('Product in request:', productA1.id);

    const res = await request(BASE).post('/tienda/pedidos').send(orderBody);

    console.log('Response status:', res.status);
    console.log('Response body:', JSON.stringify(res.body, null, 2));

    if (res.status !== 201) {
      console.log('\n❌ TEST FAILED - Expected 201, got', res.status);

      // Debug: Query the server's view of the product
      console.log('\n=== DEBUG: Checking product in DB ===');
      const dbProduct = await prisma.producto.findUnique({
        where: { id: productA1.id },
      });
      console.log('Product in DB:', {
        id: dbProduct?.id,
        empresaId: dbProduct?.empresaId,
        nombre: dbProduct?.nombre,
        activo: dbProduct?.activo,
      });

      const dbLotes = await prisma.lote.findMany({
        where: { productoId: productA1.id },
        select: { id: true, cantidad: true, empresaId: true },
      });
      console.log('Lotes in DB:', dbLotes);
    } else {
      console.log('\n✅ TEST PASSED');
    }
  } finally {
    // Cleanup
    console.log('\n=== CLEANUP ===');
    const companies = [companyA.id];
    await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: { in: companies } } } });
    await prisma.pedido.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.reglaFidelizacion.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.cliente.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.lote.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });

    await prisma.$disconnect();
    server.kill();
    console.log('Cleanup complete');
  }
}

main().catch(console.error);
