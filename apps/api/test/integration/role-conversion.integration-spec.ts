import { randomUUID } from 'crypto';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  applyAsistenteLocalConversion,
  countAsistenteLocal,
  revertAsistenteLocalConversion,
  type RoleConversionManifest,
} from '../../src/authorization/role-conversion';

// OR-B4-027 / AUTH-12 (#160): ASISTENTE_LOCAL → VENDEDOR is reversible and touches only
// the rows it lists in its manifest.
describe('Role conversion ASISTENTE_LOCAL → VENDEDOR (#160)', () => {
  const tag = randomUUID().slice(0, 8);
  let prisma: PrismaService;
  let empresaId: string;
  let ownerId: string;
  let asistenteId: string;
  let vendedorId: string;
  let canonicalUserId: string;
  let membershipId: string;
  let invitacionId: string;
  let applied: RoleConversionManifest | undefined;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    empresaId = (
      await prisma.empresa.create({
        data: { nombre: `Roles ${tag}`, slug: `roles-${tag}`, configuracion: {} },
        select: { id: true },
      })
    ).id;
    const usuario = (email: string, rol: 'OWNER' | 'ASISTENTE_LOCAL' | 'VENDEDOR') =>
      prisma.usuario.create({
        data: { empresaId, nombre: rol, email: `${email}-${tag}@example.test`, rol },
        select: { id: true },
      });
    ownerId = (await usuario('owner', 'OWNER')).id;
    asistenteId = (await usuario('asistente', 'ASISTENTE_LOCAL')).id;
    vendedorId = (await usuario('vendedor', 'VENDEDOR')).id;
    canonicalUserId = (
      await prisma.user.create({
        data: {
          email: `asistente-user-${tag}@example.test`,
          nombre: 'Asistente',
          usuarioId: asistenteId,
        },
        select: { id: true },
      })
    ).id;
    membershipId = (
      await prisma.membership.create({
        data: {
          userId: canonicalUserId,
          businessId: empresaId,
          role: 'ASISTENTE_LOCAL',
          status: 'ACTIVE',
        },
        select: { id: true },
      })
    ).id;
    invitacionId = (
      await prisma.invitacion.create({
        data: {
          empresaId,
          email: `invited-${tag}@example.test`,
          rol: 'ASISTENTE_LOCAL',
          token: `roles-${randomUUID()}`,
          invitadoPorId: ownerId,
          expiraEn: new Date(Date.now() + 60 * 60 * 1000),
        },
        select: { id: true },
      })
    ).id;
  });

  afterAll(async () => {
    // Leave the shared test database as it was, even if an assertion failed midway.
    if (applied) await revertAsistenteLocalConversion(prisma, applied).catch(() => undefined);
    if (empresaId) {
      await prisma.invitacion.deleteMany({ where: { empresaId } });
      await prisma.membership.deleteMany({ where: { businessId: empresaId } });
      await prisma.user.deleteMany({ where: { id: canonicalUserId } });
      await prisma.usuario.deleteMany({ where: { empresaId } });
      await prisma.empresa.deleteMany({ where: { id: empresaId } });
    }
    await prisma?.$disconnect();
  });

  const roles = async () => ({
    asistente: (await prisma.usuario.findUniqueOrThrow({ where: { id: asistenteId } })).rol,
    vendedor: (await prisma.usuario.findUniqueOrThrow({ where: { id: vendedorId } })).rol,
    owner: (await prisma.usuario.findUniqueOrThrow({ where: { id: ownerId } })).rol,
    membership: (await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } })).role,
    invitacion: (await prisma.invitacion.findUniqueOrThrow({ where: { id: invitacionId } })).rol,
  });

  it('converts Usuario, Membership and Invitacion and records exactly what it changed', async () => {
    const before = await countAsistenteLocal(prisma);
    expect(before.usuarios).toBeGreaterThanOrEqual(1);

    applied = await applyAsistenteLocalConversion(prisma);

    expect(applied.usuarioIds).toContain(asistenteId);
    expect(applied.usuarioIds).not.toContain(vendedorId);
    expect(applied.usuarioIds).not.toContain(ownerId);
    expect(applied.membershipIds).toContain(membershipId);
    expect(applied.invitacionIds).toContain(invitacionId);
    expect(await countAsistenteLocal(prisma)).toEqual({
      usuarios: 0,
      memberships: 0,
      invitaciones: 0,
    });
    expect(await roles()).toEqual({
      asistente: 'VENDEDOR',
      vendedor: 'VENDEDOR',
      owner: 'OWNER',
      membership: 'VENDEDOR',
      invitacion: 'VENDEDOR',
    });
  });

  it('reverts only the listed rows that are still VENDEDOR', async () => {
    if (!applied) throw new Error('apply did not run');
    // Someone promoted the converted Usuario meanwhile: revert must not undo that.
    await prisma.usuario.update({ where: { id: asistenteId }, data: { rol: 'ADMIN' } });

    const result = await revertAsistenteLocalConversion(prisma, applied);
    applied = undefined;

    expect(result.skipped.usuarios).toBe(1);
    expect(await roles()).toEqual({
      asistente: 'ADMIN',
      vendedor: 'VENDEDOR', // was VENDEDOR before the conversion: untouched
      owner: 'OWNER',
      membership: 'ASISTENTE_LOCAL',
      invitacion: 'ASISTENTE_LOCAL',
    });
  });

  it('rejects a manifest for another conversion', async () => {
    await expect(
      revertAsistenteLocalConversion(prisma, {
        from: 'OWNER',
        to: 'VENDEDOR',
      } as unknown as RoleConversionManifest),
    ).rejects.toThrow('no corresponde');
  });
});
