import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { spawnApi } from './helpers/api-server.fixture';
import { signStaffToken } from './helpers/staff-token.fixture';
import { waitPort } from './helpers/store-catalog.fixture';
import { seedUsuarioPermissions } from './helpers/usuario-permissions.fixture';

/**
 * S-V1-02 — the Owner invites someone to the team and that person can use the panel.
 * Covers the three defects that blocked it: the invitation failed without FRONTEND_URL
 * (unset in production), the link pointed at a page the panel does not have, and the
 * activated account had no User/Membership, so BusinessContext refused it everywhere.
 */
describe('S-V1-02 — team invitations end to end', () => {
  const PORT = '3382';
  const BASE = `http://127.0.0.1:${PORT}`;
  let prisma: PrismaService;
  let server: ChildProcess;
  let suffix: number;
  let company: { id: string };
  let legacyOwner: { id: string };
  let owner: { id: string };
  const email = () => `s-v1-02-team-${suffix}@example.test`;
  const password = randomUUID();
  let token: string;
  let invitedAuth: string;

  const ownerAuth = () =>
    `Bearer ${signStaffToken({
      sub: legacyOwner.id,
      email: `s-v1-02-owner-${suffix}@example.test`,
      nombre: 'Owner',
      empresaId: company.id,
      permisos: [],
    })}`;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    company = await prisma.empresa.create({
      data: { nombre: `S-V1-02 Team ${suffix}`, slug: `s-v1-02-team-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    legacyOwner = await prisma.usuario.create({
      data: {
        empresaId: company.id,
        nombre: 'Owner',
        email: `s-v1-02-owner-${suffix}@example.test`,
        activo: true,
        rol: 'OWNER',
      },
      select: { id: true },
    });
    owner = await prisma.user.create({
      data: {
        email: `s-v1-02-owner-user-${suffix}@example.test`,
        nombre: 'Owner',
        usuarioId: legacyOwner.id,
      },
      select: { id: true },
    });
    await prisma.membership.create({
      data: { userId: owner.id, businessId: company.id, role: 'OWNER', status: 'ACTIVE' },
    });
    // In shadow mode the legacy permission rows decide invitations and dossier approval.
    await seedUsuarioPermissions(prisma, [legacyOwner.id], ['usuarios.gestionar']);
    // Production has no FRONTEND_URL: the invitation must work without it.
    server = spawnApi({ PORT, FRONTEND_URL: '', WEB_APP_URL: 'https://panel.test' });
    await waitPort(Number(PORT));
  }, 120000);

  afterAll(async () => {
    if (server && !server.killed) server.kill();
    const usuarios = await prisma.usuario.findMany({
      where: { empresaId: company.id },
      select: { id: true },
    });
    const ids = usuarios.map((u) => u.id);
    await prisma.membership.deleteMany({ where: { businessId: company.id } });
    await prisma.user.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.userEmpresa.deleteMany({ where: { empresaId: company.id } });
    await prisma.invitacion.deleteMany({ where: { empresaId: company.id } });
    await prisma.legajo.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.usuarioPermiso.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.usuario.deleteMany({ where: { empresaId: company.id } });
    await prisma.empresa.deleteMany({ where: { id: company.id } });
    await prisma.$disconnect();
  });

  it('invites without FRONTEND_URL and links to the panel’s activation page', async () => {
    const res = await request(BASE)
      .post('/invitaciones')
      .set('Authorization', ownerAuth())
      .send({ email: email(), rol: 'VENDEDOR' })
      .expect(201);
    const link = new URL(res.body.linkActivacion);
    expect(link.origin + link.pathname).toBe('https://panel.test/es/auth/activar');
    token = link.searchParams.get('token') as string;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('lists the pending invitation without its token', async () => {
    const res = await request(BASE)
      .get('/invitaciones')
      .set('Authorization', ownerAuth())
      .expect(200);
    const pending = res.body.find((i: { email: string }) => i.email === email());
    expect(pending).toMatchObject({ rol: 'VENDEDOR', usadaEn: null });
    expect(pending).not.toHaveProperty('token');
  });

  it('activates the account with its User and an ACTIVE Membership', async () => {
    const res = await request(BASE)
      .post('/invitaciones/activar')
      .send({ token, nombre: 'Vale Vendedora', password })
      .expect(200);
    invitedAuth = `Bearer ${res.body.accessToken}`;
    const usuario = await prisma.usuario.findUnique({ where: { email: email() } });
    expect(usuario).toMatchObject({
      rol: 'VENDEDOR',
      estadoLegajo: 'PENDIENTE',
      empresaId: company.id,
    });
    const user = await prisma.user.findUnique({
      where: { usuarioId: usuario?.id },
      include: { Membership: true },
    });
    expect(user?.Membership).toEqual([
      expect.objectContaining({ businessId: company.id, role: 'VENDEDOR', status: 'ACTIVE' }),
    ]);
  });

  it('lets the new person into the panel (BusinessContext resolves)', async () => {
    const res = await request(BASE)
      .get('/messaging/conversations/contacts')
      .set('Authorization', invitedAuth);
    expect(res.status).toBe(200);
    expect(res.body.map((c: { name: string }) => c.name)).toEqual(
      expect.arrayContaining(['Vale Vendedora']),
    );
  });

  it('refuses a used invitation', async () => {
    await request(BASE)
      .post('/invitaciones/activar')
      .send({ token, nombre: 'Otra', password })
      .expect(400);
  });

  it('shows the Owner the team with roles, status and dossier state; never to a Vendedor', async () => {
    const res = await request(BASE)
      .get('/memberships')
      .set('Authorization', ownerAuth())
      .expect(200);
    expect(res.body).toEqual([
      expect.objectContaining({ role: 'OWNER', status: 'ACTIVE', isViewer: true }),
      expect.objectContaining({
        nombre: 'Vale Vendedora',
        email: email(),
        role: 'VENDEDOR',
        status: 'ACTIVE',
        estadoLegajo: 'PENDIENTE',
        isViewer: false,
      }),
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|token/);
    await request(BASE).get('/memberships').set('Authorization', invitedAuth).expect(403);
    await request(BASE).get('/memberships').expect(401);
  });

  it('suspends and reactivates the new Membership', async () => {
    const team = (await request(BASE).get('/memberships').set('Authorization', ownerAuth())).body;
    const vale = team.find((m: { nombre: string }) => m.nombre === 'Vale Vendedora');
    await request(BASE)
      .patch(`/memberships/${vale.membershipId}/suspend`)
      .set('Authorization', ownerAuth())
      .expect(200);
    await request(BASE)
      .get('/messaging/conversations/contacts')
      .set('Authorization', invitedAuth)
      .expect(403);
    await request(BASE)
      .patch(`/memberships/${vale.membershipId}/reactivate`)
      .set('Authorization', ownerAuth())
      .expect(200);
    await request(BASE)
      .get('/messaging/conversations/contacts')
      .set('Authorization', invitedAuth)
      .expect(200);
  });
});
