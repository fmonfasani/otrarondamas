import type { ChildProcess } from 'node:child_process';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createBusinessWithOwner } from '../../src/platform-admin/create-business';
import { spawnApi } from './helpers/api-server.fixture';
import { waitPort } from './helpers/store-catalog.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';

/**
 * ADR-IDN-014 — the internal Wapsell business holds the platform administrator. The database
 * refuses to delete it or its accounts; it has no public store, is not in the buyer directory,
 * and its accounts are told apart by /auth/me. It cannot be deleted, so the suite reuses it
 * when it already exists (one per database).
 */
describe('P17-4 — negocio interno de Wapsell', () => {
  const PORT = '3373';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  const email = 'p17-4-admin@example.test';
  let empresaId: string;
  let usuarioId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    const existing = await prisma.empresa.findFirst({ where: { interno: true } });
    const created = await prisma.$transaction(async (tx) => {
      const result = await createBusinessWithOwner(tx, {
        nombre: existing?.nombre ?? 'Wapsell (plataforma)',
        slug: existing?.slug ?? 'wapsell',
        ownerNombre: 'Administración',
        ownerEmail: email,
      });
      await tx.empresa.update({ where: { id: result.empresaId }, data: { interno: true } });
      return result;
    });
    empresaId = created.empresaId;
    usuarioId = created.usuarioId;
    server = spawnApi({ PORT });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    await prisma.$disconnect();
  });

  it('the database refuses to delete, empty or un-mark it', async () => {
    await expect(prisma.empresa.delete({ where: { id: empresaId } })).rejects.toThrow(
      /no se puede borrar/,
    );
    await expect(prisma.usuario.delete({ where: { id: usuarioId } })).rejects.toThrow(
      /no se pueden borrar/,
    );
    await expect(
      prisma.empresa.update({ where: { id: empresaId }, data: { interno: false } }),
    ).rejects.toThrow(/dejar de ser interno/);
    await expect(prisma.$executeRawUnsafe('TRUNCATE "Empresa" CASCADE')).rejects.toThrow(
      /no se puede vaciar/,
    );
    expect(await prisma.empresa.count({ where: { id: empresaId, interno: true } })).toBe(1);
  });

  it('has no public store and is not in the buyer directory', async () => {
    const slug = (await prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } })).slug;
    await request(BASE).get(`/${slug}/tienda`).expect(404);
    const directory = await request(BASE).get('/auth/comprador/negocios').expect(200);
    expect(directory.body.map((b: { slug: string }) => b.slug)).not.toContain(slug);
  });

  it('its accounts are marked as internal in /auth/me', async () => {
    // A session that already passed the second factor, as /auth/login issues it.
    const token = signStaffToken({
      sub: usuarioId,
      email,
      nombre: 'Administración',
      empresaId,
      permisos: [],
    });
    const me = await request(BASE)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.body).toMatchObject({ email, empresaInterna: true });
  });
});
