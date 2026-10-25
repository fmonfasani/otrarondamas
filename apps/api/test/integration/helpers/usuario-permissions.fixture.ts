import type { PrismaService } from '../../../src/prisma/prisma.service';

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
    where: { usuario: { empresaId: { in: companyIds } } },
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
    return await assertion();
  } finally {
    await replaceUsuarioPermissions(prisma, usuarioId, restorePermissionNames);
  }
}
