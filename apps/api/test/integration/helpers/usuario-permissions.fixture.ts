import type { RolUsuario } from '@prisma/client';
import type { PrismaService } from '../../../src/prisma/prisma.service';
import { authzEngineMode } from '../../../src/authorization/authorization-engine';

/**
 * Integration fixtures must model effective permissions in the database.
 * JWT permission claims are deliberately not synchronized automatically:
 * tests for stale/revoked claims need the database state to remain independent.
 */
export async function seedUsuarioPermissions(
  prisma: PrismaService,
  usuarioIds: string[],
  permissionNames: string[],
): Promise<void> {
  const permissionIds = new Map<string, string>();
  for (const nombre of new Set(permissionNames)) {
    const permission = await prisma.permiso.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
      select: { id: true },
    });
    permissionIds.set(nombre, permission.id);
  }

  const data = usuarioIds.flatMap((usuarioId) =>
    [...permissionIds.values()].map((permisoId) => ({ usuarioId, permisoId })),
  );
  if (data.length > 0) {
    await prisma.usuarioPermiso.createMany({ data, skipDuplicates: true });
  }
}

export async function replaceUsuarioPermissions(
  prisma: PrismaService,
  usuarioId: string,
  permissionNames: string[],
): Promise<void> {
  await prisma.usuarioPermiso.deleteMany({ where: { usuarioId } });
  await seedUsuarioPermissions(prisma, [usuarioId], permissionNames);
}

/** Remove assignments before deleting the related legacy Usuario fixtures. */
export async function deleteUsuarioPermissionsForCompanies(
  prisma: PrismaService,
  companyIds: string[],
): Promise<void> {
  await prisma.usuarioPermiso.deleteMany({
    where: { Usuario: { empresaId: { in: companyIds } } },
  });
}

/**
 * Temporarily revoke a legacy user's permissions for a negative HTTP test.
 * The original fixture assignments are restored even when an assertion fails.
 */
export async function withRevokedUsuarioPermissions<T>(
  prisma: PrismaService,
  usuarioId: string,
  restorePermissionNames: string[],
  assertion: () => Promise<T>,
): Promise<T> {
  await replaceUsuarioPermissions(prisma, usuarioId, []);
  try {
    // With the canonical engine deciding, access comes from the role, not from the
    // assignments: "no access" also means a role without staff permissions.
    return AUTHZ_ENFORCE
      ? await withUsuarioRole(prisma, usuarioId, NO_STAFF_ROLE, assertion)
      : await assertion();
  } finally {
    await replaceUsuarioPermissions(prisma, usuarioId, restorePermissionNames);
  }
}

/**
 * Authorization cut-over (OR-B4-026): B4 runs every suite with the legacy guards deciding
 * (`shadow`) and with the canonical role matrix deciding (`enforce`). The spawned API
 * inherits AUTHZ_ENGINE_MODE from the test process.
 */
// Same resolution as the API (default `enforce` since the cut-over), so the fixtures match
// the spawned server even when the variable is unset.
export const AUTHZ_ENFORCE = authzEngineMode() === 'enforce';

/** OR-B4-006: not a Membership role, so it holds no staff permission in the matrix. */
export const NO_STAFF_ROLE: RolUsuario = 'PROVEEDOR';

/** Temporarily set the legacy Usuario's role in the database; always restored. */
export async function withUsuarioRole<T>(
  prisma: PrismaService,
  usuarioId: string,
  rol: RolUsuario,
  assertion: () => Promise<T>,
): Promise<T> {
  const original = await prisma.usuario.findUniqueOrThrow({
    where: { id: usuarioId },
    select: { rol: true },
  });
  await prisma.usuario.update({ where: { id: usuarioId }, data: { rol } });
  try {
    return await assertion();
  } finally {
    await prisma.usuario.update({ where: { id: usuarioId }, data: { rol: original.rol } });
  }
}
