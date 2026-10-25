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
        if (remaining <= 0) reject(new Error(`Port ${port} did not respond`));
        else setTimeout(() => probe(remaining - 1), 1000);
      });
    };
    probe(attempts);
  });

async function main() {
  const PORT = '3393';
  const BASE = `http://127.0.0.1:${PORT}`;
  const suffix = Date.now();
  let server: ChildProcess;

  try {
    // Create test data FIRST
    const prisma = new PrismaService();
    await prisma.$connect();

    console.log('=== Creating test data ===');

    const companyA = await prisma.empresa.create({
      data: {
        nombre: `Persistent ${suffix}`,
        slug: `persistent-${suffix}`,
        configuracion: {},
      },
    });

    const familia = await prisma.familia.create({
      data: {
        empresaId: companyA.id,
        nombre: `Fam ${suffix}`,
        prefijo: 'FAM',
      },
    });

    const subfamilia = await prisma.subfamilia.create({
      data: {
        empresaId: companyA.id,
        familiaId: familia.id,
        nombre: `SubFam ${suffix}`,
        prefijo: 'SFA',
      },
    });

    const tipo = await prisma.tipo.create({
      data: {
        empresaId: companyA.id,
        subfamiliaId: subfamilia.id,
        nombre: `Tipo ${suffix}`,
        prefijo: 'TIP',
      },
    });

    const subtipo = await prisma.subtipo.create({
      data: {
        empresaId: companyA.id,
        tipoId: tipo.id,
        nombre: `Subtipo ${suffix}`,
        prefijo: 'SUB',
      },
    });

    const productA1 = await prisma.producto.create({
      data: {
        empresaId: companyA.id,
        nombre: `ProdA1 ${suffix}`,
        codigoInterno: `PA1-${suffix}`,
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
    });

    await prisma.lote.create({
      data: {
        empresaId: companyA.id,
        productoId: productA1.id,
        numeroLote: `L-${suffix}`,
        vencimiento: new Date('2099-01-01'),
        cantidad: '5',
      },
    });

    console.log('Company:', companyA.id);
    console.log('Product:', productA1.id);

    // NOW spawn server
    console.log('\n=== Spawning server ===');
    server = spawn('node', ['dist/src/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT, TIENDA_EMPRESA_ID: companyA.id },
      stdio: 'ignore',
    });

    await waitPort(Number(PORT));
    console.log('Server started');

    // Run first request
    console.log('\n=== First request (immediately after server start) ===');
    let res = await request(BASE)
      .post('/tienda/pedidos')
      .send({
        nombre: 'Buyer 1',
        email: `buyer-1-${suffix}@test.com`,
        items: [{ productoId: productA1.id, cantidad: 1 }],
      });
    console.log('Status:', res.status);
    console.log('Error:', res.status !== 201 ? res.body.message : 'OK');

    // Wait a bit
    await new Promise((r) => setTimeout(r, 1000));

    // Run second request
    console.log('\n=== Second request (1 second later) ===');
    res = await request(BASE)
      .post('/tienda/pedidos')
      .send({
        nombre: 'Buyer 2',
        email: `buyer-2-${suffix}@test.com`,
        items: [{ productoId: productA1.id, cantidad: 1 }],
      });
    console.log('Status:', res.status);
    console.log('Error:', res.status !== 201 ? res.body.message : 'OK');

    // Cleanup
    console.log('\n=== Cleanup ===');
    const companies = [companyA.id];
    await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: { in: companies } } } });
    await prisma.pedido.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.lote.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
    await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
    await prisma.$disconnect();

    console.log('Done');
  } finally {
    if (server) server.kill();
  }
}

main().catch(console.error);
