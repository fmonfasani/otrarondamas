import { createHmac } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import request from 'supertest';

describe('S-V1-SEC-01 — Customer identity cannot access staff endpoints', () => {
  const PORT = '3392';
  const BASE = `http://127.0.0.1:${PORT}`;
  let server: ChildProcess;

  const customerToken = () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'sec01-customer-test',
        email: 'sec01-customer@example.test',
        nombre: 'SEC-01 Customer',
        empresaId: 'sec01-business-test',
        permisos: [],
        rol: 'OWNER',
        estadoLegajo: 'APROBADO',
        type: 'cliente',
        esMayorista: false,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', process.env.JWT_SECRET as string)
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
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
          if (remaining <= 0) reject(new Error(`puerto ${port} sin respuesta`));
          else setTimeout(() => probe(remaining - 1), 1000);
        });
      };
      probe(attempts);
    });

  beforeAll(async () => {
    server = spawn('node', ['dist/src/main.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT },
      stdio: 'ignore',
    });
    await waitPort(Number(PORT));
  }, 70000);

  afterAll(() => {
    server?.kill('SIGTERM');
  });

  it('rejects a Customer JWT from a staff endpoint', async () => {
    const response = await request(BASE)
      .get('/usuarios')
      .set('Authorization', `Bearer ${customerToken()}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Los clientes no pueden acceder a endpoints internos');
  });

  it('allows the Customer-only profile endpoint to reach its own handler', async () => {
    const response = await request(BASE)
      .get('/auth/cliente/me')
      .set('Authorization', `Bearer ${customerToken()}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Cliente no encontrado');
  });

  it('still requires authentication for staff endpoints without a token', async () => {
    const response = await request(BASE).get('/usuarios');

    expect(response.status).toBe(401);
  });
});
