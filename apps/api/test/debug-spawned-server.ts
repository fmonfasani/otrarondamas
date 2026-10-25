import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';

async function waitPort(port: number, attempts = 60) {
  return new Promise<void>((resolve, reject) => {
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
}

async function main() {
  const PORT = '3391';
  const tiendaEmpresaId = '22dc5550-be63-44bd-bad7-8b7da0b2c6ca';
  const BASE = `http://127.0.0.1:${PORT}`;

  // Spawn server with TIENDA_EMPRESA_ID
  console.log('Spawning server on port', PORT, 'with TIENDA_EMPRESA_ID =', tiendaEmpresaId);
  const server: ChildProcess = spawn('node', ['dist/src/main.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT, TIENDA_EMPRESA_ID: tiendaEmpresaId },
    stdio: 'ignore',
  });

  try {
    // Wait for server to start
    await waitPort(Number(PORT));
    console.log('Server started');

    // Create test data
    const prisma = new PrismaService();
    await prisma.$connect();

    const suffix = Date.now();

    // Create empresa
    let empresa = await prisma.empresa.findUnique({ where: { id: tiendaEmpresaId } });
    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: {
          id: tiendaEmpresaId,
          nombre: `Spawned Test ${suffix}`,
          slug: `spawned-${suffix}`,
          configuracion: {},
        },
      });
    }

    // Create hierarchy and product
    const familia = await prisma.familia.create({
      data: {
        empresaId: empresa.id,
        nombre: `Familia ${suffix}`,
        prefijo: 'FAM',
      },
    });

    const subfamilia = await prisma.subfamilia.create({
      data: {
        empresaId: empresa.id,
        familiaId: familia.id,
        nombre: `Subfamilia ${suffix}`,
        prefijo: 'SFA',
      },
    });

    const tipo = await prisma.tipo.create({
      data: {
        empresaId: empresa.id,
        subfamiliaId: subfamilia.id,
        nombre: `Tipo ${suffix}`,
        prefijo: 'TIP',
      },
    });

    const subtipo = await prisma.subtipo.create({
      data: {
        empresaId: empresa.id,
        tipoId: tipo.id,
        nombre: `Subtipo ${suffix}`,
        prefijo: 'SUB',
      },
    });

    const producto = await prisma.producto.create({
      data: {
        empresaId: empresa.id,
        familiaId: familia.id,
        subfamiliaId: subfamilia.id,
        tipoId: tipo.id,
        subtipoId: subtipo.id,
        nombre: `Product ${suffix}`,
        codigoInterno: `P${suffix}`,
        costo: 10,
        precioMinorista: 100,
        unidadBase: 'UNIDAD',
        activo: true,
      },
    });

    // Create lote (stock)
    await prisma.lote.create({
      data: {
        empresaId: empresa.id,
        productoId: producto.id,
        numeroLote: `L${suffix}`,
        cantidad: 5,
        vencimiento: new Date('2099-01-01'),
      },
    });

    console.log('Data created:');
    console.log('  Empresa:', empresa.id);
    console.log('  Producto:', producto.id);

    // Query producto from DB directly to verify
    const dbProduct = await prisma.producto.findUnique({
      where: { id: producto.id },
    });
    console.log('  Producto in DB - activo:', dbProduct?.activo);

    // Now try POST /tienda/pedidos via the SPAWNED server
    console.log('\n=== Requesting POST /tienda/pedidos via spawned server ===');
    const orderBody = {
      nombre: 'Test Buyer',
      email: `test-${suffix}@test.com`,
      items: [{ productoId: producto.id, cantidad: 1 }],
    };

    const res = await request(BASE).post('/tienda/pedidos').send(orderBody).timeout(5000);

    console.log('Status:', res.status);
    console.log('Body:', JSON.stringify(res.body, null, 2));

    // Cleanup
    await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: empresa.id } } });
    await prisma.pedido.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.lote.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.producto.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.subtipo.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.tipo.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.familia.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.$disconnect();

    console.log('Cleanup complete');
  } finally {
    server.kill();
    console.log('Server killed');
  }
}

main().catch(console.error);
