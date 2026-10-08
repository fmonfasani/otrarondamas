import { createHmac } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('FS-1a — Customer BusinessContext (HTTP, stack real)', () => {
  const PORT = '3397';
  const BASE = 'http://127.0.0.1:' + PORT;
  let server: ChildProcess;
  let prisma: PrismaService;
  let suffix: number;
  let companyA: { id: string };
  let companyB: { id: string };
  let customerA: { id: string };
  let customerB: { id: string };

  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const tokenFor = (customerId: string, tokenCompanyId: string, type: 'cliente' | 'usuario' = 'cliente') => {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: customerId,
      email: 'fs-1a-' + customerId + '@example.test',
      nombre: 'FS-1a Customer',
      empresaId: tokenCompanyId,
      permisos: [],
      rol: null,
      estadoLegajo: 'APROBADO',
      type,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const signature = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(header + '.' + payload)
      .digest('base64url');
    return header + '.' + payload + '.' + signature;
  };

  const waitPort = (port: number, attempts = 60) =>
    new Promise<void>((resolve, reject) => {
      const probe = (remaining: number) => {
        const socket = net.connect(port, '127.0.0.1');
        socket.on('connect', () => {
          socket.end();
          resolve();
        });
        socket.on('error', () => {
          if (remaining <= 0) reject(new Error('puerto ' + port + ' sin respuesta'));
          else setTimeout(() => probe(remaining - 1), 1000);
        });
      };
      probe(attempts);
    });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    companyA = await prisma.empresa.create({
      data: { nombre: 'FS-1a HTTP A ' + suffix, slug: 'fs-1a-http-a-' + suffix, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: 'FS-1a HTTP B ' + suffix, slug: 'fs-1a-http-b-' + suffix, configuracion: {} },
      select: { id: true },
    });
    customerA = await prisma.cliente.create({
      data: { empresaId: companyA.id, nombre: 'FS-1a Cliente A ' + suffix, email: 'fs-1a-a-' + suffix + '@example.test' },
      select: { id: true },
    });
    customerB = await prisma.cliente.create({
      data: { empresaId: companyB.id, nombre: 'FS-1a Cliente B ' + suffix, email: 'fs-1a-b-' + suffix + '@example.test' },
      select: { id: true },
    });
    server = spawn('node', ['dist/src/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT },
      stdio: 'ignore',
    });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    await prisma.cliente.deleteMany({ where: { id: { in: [customerA.id, customerB.id] } } });
    await prisma.empresa.deleteMany({ where: { id: { in: [companyA.id, companyB.id] } } });
    await prisma.$disconnect();
    if (server && !server.killed) server.kill();
  });

  it('FS1A-H-01: CUSTOMER A con claim empresaId=B → responde perfil de A', async () => {
    const res = await request(BASE)
      .get('/auth/cliente/me')
      .set('Authorization', 'Bearer ' + tokenFor(customerA.id, companyB.id))
      .expect(200);
    expect(res.body).toMatchObject({
      id: customerA.id,
      empresaId: companyA.id,
      empresaNombre: 'FS-1a HTTP A ' + suffix,
    });
    expect(res.body.empresaId).not.toBe(companyB.id);
  });

  it('FS1A-H-02: CUSTOMER B con claim empresaId=A → responde perfil de B', async () => {
    const res = await request(BASE)
      .get('/auth/cliente/me')
      .set('Authorization', 'Bearer ' + tokenFor(customerB.id, companyA.id))
      .expect(200);
    expect(res.body).toMatchObject({
      id: customerB.id,
      empresaId: companyB.id,
      empresaNombre: 'FS-1a HTTP B ' + suffix,
    });
    expect(res.body.empresaId).not.toBe(companyA.id);
  });

  it('FS1A-H-03: CUSTOMER token con id inexistente → 404 fail-closed', async () => {
    await request(BASE)
      .get('/auth/cliente/me')
      .set('Authorization', 'Bearer ' + tokenFor('customer-does-not-exist', companyA.id))
      .expect(404);
  });

});
