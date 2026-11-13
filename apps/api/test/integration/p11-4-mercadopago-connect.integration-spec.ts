import type { ChildProcess } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { waitPort } from './helpers/store-catalog.fixture';

/**
 * P11-4 — a Business connects its own Mercado Pago account (OR-B4-032), Owner only
 * (OR-B4-033). Mercado Pago is a local fake: no real account or money is involved.
 */
describe('P11-4 — Mercado Pago account per Business', () => {
  const PORT = '3386';
  const FAKE_MP_PORT = 3385;
  const BASE = `http://127.0.0.1:${PORT}`;
  const REDIRECT = `${BASE}/cobros/mercadopago/callback`;
  const clientSecret = randomUUID();
  const accessToken = `APP_USR-${randomUUID()}`;
  const refreshToken = `TG-${randomUUID()}`;
  let mpUserId = 900001;
  const tokenRequests: Array<Record<string, string>> = [];
  let fakeMp: Server;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  const businesses: string[] = [];
  const users: string[] = [];
  const usuarios: string[] = [];

  async function businessWith(role: 'OWNER' | 'ADMIN', tag: string, companyId?: string) {
    const empresaId =
      companyId ??
      (
        await prisma.empresa.create({
          data: {
            nombre: `P11-4 ${tag} ${suffix}`,
            slug: `p11-4-${tag}-${suffix}`,
            configuracion: { otro: 'valor' },
          },
          select: { id: true },
        })
      ).id;
    if (!companyId) businesses.push(empresaId);
    const email = `p11-4-${tag}-${role.toLowerCase()}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId, nombre: `${role} ${tag}`, email, activo: true, rol: role },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: `${role} ${tag}`, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: empresaId, role, status: 'ACTIVE' },
    });
    usuarios.push(usuario.id);
    users.push(user.id);
    const auth = `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: role, empresaId, permisos: [] })}`;
    return { empresaId, auth };
  }

  const stateFrom = (url: string) => new URL(url).searchParams.get('state') as string;
  const connectUrl = async (auth: string) =>
    (
      await request(BASE)
        .post('/cobros/mercadopago/conectar')
        .set('Authorization', auth)
        .expect(200)
    ).body.url as string;
  const callback = (query: Record<string, string>) =>
    request(BASE).get('/cobros/mercadopago/callback').query(query).redirects(0);

  let ownerA: { empresaId: string; auth: string };
  let adminA: { empresaId: string; auth: string };
  let ownerB: { empresaId: string; auth: string };

  beforeAll(async () => {
    fakeMp = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        if (req.method === 'POST' && req.url === '/oauth/token') {
          const parsed = JSON.parse(body) as Record<string, string>;
          tokenRequests.push(parsed);
          if (parsed.code === 'bad-code') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ message: 'invalid_grant' }));
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              access_token: accessToken,
              refresh_token: refreshToken,
              public_key: 'APP_USR-public',
              user_id: mpUserId,
              live_mode: true,
              expires_in: 15552000,
            }),
          );
        }
        res.writeHead(404);
        res.end();
      });
    });
    await new Promise<void>((resolve) => fakeMp.listen(FAKE_MP_PORT, '127.0.0.1', resolve));

    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    ownerA = await businessWith('OWNER', 'a');
    adminA = await businessWith('ADMIN', 'a', ownerA.empresaId);
    ownerB = await businessWith('OWNER', 'b');
    server = spawnApi({
      PORT,
      MERCADOPAGO_CLIENT_ID: 'wapsell-app-id',
      MERCADOPAGO_CLIENT_SECRET: clientSecret,
      MERCADOPAGO_OAUTH_REDIRECT_URI: REDIRECT,
      MERCADOPAGO_TOKEN_KEY: randomBytes(32).toString('base64'),
      MERCADOPAGO_API_URL: `http://127.0.0.1:${FAKE_MP_PORT}`,
      MERCADOPAGO_AUTH_URL: 'https://auth.mercadopago.test',
      WEB_APP_URL: 'https://panel.test',
    });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await new Promise<void>((resolve) => fakeMp.close(() => resolve()));
    await prisma.membership.deleteMany({ where: { businessId: { in: businesses } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } });
    await prisma.empresa.deleteMany({ where: { id: { in: businesses } } });
    await prisma.$disconnect();
  });

  it('starts disconnected', async () => {
    const res = await request(BASE)
      .get('/cobros/mercadopago')
      .set('Authorization', ownerA.auth)
      .expect(200);
    expect(res.body).toEqual({
      available: true,
      connected: false,
      mercadoPagoUserId: null,
      liveMode: null,
      connectedAt: null,
    });
  });

  it('is Owner-only: an Admin cannot see, connect or disconnect', async () => {
    await request(BASE).get('/cobros/mercadopago').set('Authorization', adminA.auth).expect(403);
    await request(BASE)
      .post('/cobros/mercadopago/conectar')
      .set('Authorization', adminA.auth)
      .expect(403);
    await request(BASE).delete('/cobros/mercadopago').set('Authorization', adminA.auth).expect(403);
    await request(BASE).get('/cobros/mercadopago').expect(401);
  });

  it('sends the Owner to Mercado Pago with the Wapsell app, the callback and a signed state', async () => {
    const url = new URL(await connectUrl(ownerA.auth));
    expect(url.origin + url.pathname).toBe('https://auth.mercadopago.test/authorization');
    expect(url.searchParams.get('client_id')).toBe('wapsell-app-id');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toMatch(/^[\w-]+\.[\w-]+$/);
  });

  it('ignores a callback with a forged or missing state', async () => {
    const res = await callback({ code: 'any', state: 'forged.state' }).expect(302);
    expect(res.headers.location).toBe('https://panel.test/es/dashboard/cobros?mp=error');
    await callback({ code: 'any' }).expect(302);
    expect(tokenRequests).toHaveLength(0);
  });

  it('reports a cancelled authorization', async () => {
    const res = await callback({ error: 'access_denied', state: 'x' }).expect(302);
    expect(res.headers.location).toBe('https://panel.test/es/dashboard/cobros?mp=cancelado');
  });

  it('reports a code Mercado Pago rejects, without connecting', async () => {
    const res = await callback({
      code: 'bad-code',
      state: stateFrom(await connectUrl(ownerA.auth)),
    }).expect(302);
    expect(res.headers.location).toBe('https://panel.test/es/dashboard/cobros?mp=error');
    const status = await request(BASE)
      .get('/cobros/mercadopago')
      .set('Authorization', ownerA.auth)
      .expect(200);
    expect(status.body.connected).toBe(false);
  });

  it('connects: exchanges the code with the app secret and stores the tokens encrypted', async () => {
    const res = await callback({
      code: 'good-code',
      state: stateFrom(await connectUrl(ownerA.auth)),
    }).expect(302);
    expect(res.headers.location).toBe('https://panel.test/es/dashboard/cobros?mp=conectado');
    expect(tokenRequests.at(-1)).toEqual({
      client_id: 'wapsell-app-id',
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: 'good-code',
      redirect_uri: REDIRECT,
    });

    const stored = await prisma.empresa.findUnique({
      where: { id: ownerA.empresaId },
      select: { configuracion: true },
    });
    const raw = JSON.stringify(stored?.configuracion);
    expect(raw).not.toContain(accessToken);
    expect(raw).not.toContain(refreshToken);
    expect(stored?.configuracion).toMatchObject({
      otro: 'valor',
      mercadoPago: { userId: String(mpUserId), liveMode: true },
    });

    const status = await request(BASE)
      .get('/cobros/mercadopago')
      .set('Authorization', ownerA.auth)
      .expect(200);
    expect(status.body).toMatchObject({
      available: true,
      connected: true,
      mercadoPagoUserId: String(mpUserId),
      liveMode: true,
    });
    expect(JSON.stringify(status.body)).not.toMatch(/APP_USR-|TG-/);
  });

  it('refuses connecting the same Mercado Pago account to a second Business', async () => {
    const res = await callback({
      code: 'good-code',
      state: stateFrom(await connectUrl(ownerB.auth)),
    }).expect(302);
    expect(res.headers.location).toBe('https://panel.test/es/dashboard/cobros?mp=otra-cuenta');
    const status = await request(BASE)
      .get('/cobros/mercadopago')
      .set('Authorization', ownerB.auth)
      .expect(200);
    expect(status.body.connected).toBe(false);
  });

  it('does not let a state from one Business connect another', async () => {
    mpUserId = 900002;
    const stateA = stateFrom(await connectUrl(ownerA.auth));
    await callback({ code: 'good-code', state: stateA }).expect(302);
    const statusB = await request(BASE)
      .get('/cobros/mercadopago')
      .set('Authorization', ownerB.auth)
      .expect(200);
    expect(statusB.body.connected).toBe(false);
  });

  it('refuses the callback when the person who started it is no longer Owner', async () => {
    mpUserId = 900003;
    const state = stateFrom(await connectUrl(ownerB.auth));
    await prisma.membership.updateMany({
      where: { businessId: ownerB.empresaId },
      data: { role: 'ADMIN' },
    });
    const res = await callback({ code: 'good-code', state }).expect(302);
    expect(res.headers.location).toBe('https://panel.test/es/dashboard/cobros?mp=error');
    await prisma.membership.updateMany({
      where: { businessId: ownerB.empresaId },
      data: { role: 'OWNER' },
    });
    const status = await request(BASE)
      .get('/cobros/mercadopago')
      .set('Authorization', ownerB.auth)
      .expect(200);
    expect(status.body.connected).toBe(false);
  });

  it('disconnects, keeping the rest of the configuration', async () => {
    await request(BASE).delete('/cobros/mercadopago').set('Authorization', ownerA.auth).expect(204);
    const status = await request(BASE)
      .get('/cobros/mercadopago')
      .set('Authorization', ownerA.auth)
      .expect(200);
    expect(status.body.connected).toBe(false);
    const stored = await prisma.empresa.findUnique({
      where: { id: ownerA.empresaId },
      select: { configuracion: true },
    });
    expect(stored?.configuracion).toEqual({ otro: 'valor' });
  });
});
