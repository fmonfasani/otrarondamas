import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { deleteStoreCompanies, waitPort } from './helpers/store-catalog.fixture';

/**
 * Rendimiento (Owner, 2026-11-26) — the platform page that shows how Wapsell answers: only the
 * platform admins (PLATFORM_ADMIN_EMAILS) see it, never a Business's Owner; it has the minute so
 * far, the server and the database, and the saved minutes of the range. Real API and PostgreSQL.
 */
describe('Rendimiento — panel de la plataforma', () => {
  const PORT = '3401';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string };
  const people: Record<string, { usuarioId: string; userId: string; auth: string; email: string }> =
    {};
  const saved: Date[] = [];

  async function person(key: string) {
    const email = `rend-${key}-${suffix}@example.test`;
    const usuario = await prisma.usuario.create({
      data: { empresaId: company.id, nombre: key, email, activo: true, rol: 'OWNER' },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: { email: `user-${email}`, nombre: key, usuarioId: usuario.id },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: company.id, role: 'OWNER', status: 'ACTIVE' },
    });
    people[key] = {
      usuarioId: usuario.id,
      userId: user.id,
      email,
      auth: `Bearer ${signStaffToken({ sub: usuario.id, email, nombre: key, empresaId: company.id, permisos: [] })}`,
    };
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    company = await prisma.empresa.create({
      data: { nombre: `Rend ${suffix}`, slug: `rend-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    await person('plataforma');
    await person('duena');
    // Two saved minutes: one inside the last hour, one from three hours ago.
    const minute = (msAgo: number) =>
      new Date(Math.floor((Date.now() - msAgo) / 60_000) * 60_000 - 7_000);
    for (const [at, p95] of [
      [minute(5 * 60_000), 180],
      [minute(3 * 60 * 60_000), 900],
    ] as const) {
      saved.push(at);
      await prisma.performanceMinute.create({
        data: {
          at,
          requests: 600,
          errors4xx: 3,
          errors5xx: 6,
          p50Ms: 20,
          p95Ms: p95,
          p99Ms: p95 * 2,
          maxMs: 2000,
          cpuPct: 12,
          rssMb: 110,
          loopP99Ms: 15,
          load1: 0.9,
          memPct: 30,
          diskPct: 27,
          dbPingMs: 1.5,
          dbConns: 9,
          messages: 40,
          replyP50Ms: 120_000,
          replyP95Ms: 600_000,
          online: 6,
          pushOk: 5,
          pushFailed: 1,
          routes: [
            {
              ruta: 'POST /messaging/conversations/:id/messages',
              cantidad: 40,
              p95Ms: 210,
              promedioMs: 80,
              errores: 0,
            },
          ],
        },
      });
    }
    server = spawnApi({ PORT, PLATFORM_ADMIN_EMAILS: people.plataforma.email });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await prisma.performanceMinute.deleteMany({ where: { at: { in: saved } } });
    await prisma.membership.deleteMany({ where: { businessId: company.id } });
    const ids = Object.values(people).map((p) => p.usuarioId);
    await prisma.user.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
    await deleteStoreCompanies(prisma, [company.id]);
    await prisma.$disconnect();
  });

  it('is only for the platform admins, never a Business Owner', async () => {
    await request(BASE).get('/platform-admin/performance').expect(401);
    await request(BASE)
      .get('/platform-admin/performance')
      .set('Authorization', people.duena.auth)
      .expect(403);
  });

  it('shows the minute so far, the server and the database', async () => {
    const res = await request(BASE)
      .get('/platform-admin/performance')
      .set('Authorization', people.plataforma.auth)
      .expect(200);
    const now = res.body.ahora;
    expect(now.requests).toBeGreaterThanOrEqual(2);
    expect(now.cores).toBeGreaterThan(0);
    expect(now.memPct).toBeGreaterThan(0);
    expect(now.memPct).toBeLessThanOrEqual(100);
    expect(now.dbPingMs).toBeGreaterThanOrEqual(0);
    expect(now.dbConns).toBeGreaterThan(0);
  });

  it('the last hour: its minutes, totals and slowest routes; older ones in the day', async () => {
    const hour = (
      await request(BASE)
        .get('/platform-admin/performance?rango=1h')
        .set('Authorization', people.plataforma.auth)
        .expect(200)
    ).body;
    const mine = hour.serie.filter((p: { p95Ms: number }) => p.p95Ms === 180);
    expect(mine).toHaveLength(1);
    expect(hour.serie.some((p: { p95Ms: number }) => p.p95Ms === 900)).toBe(false);
    expect(hour.totales.requests).toBeGreaterThanOrEqual(600);
    expect(hour.rutas[0]).toMatchObject({ ruta: 'POST /messaging/conversations/:id/messages' });
    const day = (
      await request(BASE)
        .get('/platform-admin/performance?rango=24h')
        .set('Authorization', people.plataforma.auth)
        .expect(200)
    ).body;
    expect(day.rango).toBe('24h');
    expect(day.serie.some((p: { p95Ms: number }) => p.p95Ms === 900)).toBe(true);
  });
});
