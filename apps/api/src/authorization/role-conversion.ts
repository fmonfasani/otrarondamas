import type { PrismaClient } from '@prisma/client';

/**
 * OR-B4-027 / AUTH-12: reversible conversion of the transitional ASISTENTE_LOCAL role to
 * VENDEDOR in Usuario, Membership and Invitacion. `apply` returns a manifest with the
 * exact ids it changed; `revert` restores only those rows, and only while they are still
 * VENDEDOR (rows changed by someone else afterwards are left alone and reported).
 */
export interface RoleConversionManifest {
  from: 'ASISTENTE_LOCAL';
  to: 'VENDEDOR';
  appliedAt: string;
  usuarioIds: string[];
  membershipIds: string[];
  invitacionIds: string[];
}

export interface RoleConversionCounts {
  usuarios: number;
  memberships: number;
  invitaciones: number;
}

type Db = Pick<PrismaClient, 'usuario' | 'membership' | 'invitacion' | '$transaction'>;

const FROM = 'ASISTENTE_LOCAL' as const;
const TO = 'VENDEDOR' as const;

/** Rows that would be converted (dry run). */
export async function countAsistenteLocal(db: Db): Promise<RoleConversionCounts> {
  const [usuarios, memberships, invitaciones] = await Promise.all([
    db.usuario.count({ where: { rol: FROM } }),
    db.membership.count({ where: { role: FROM } }),
    db.invitacion.count({ where: { rol: FROM } }),
  ]);
  return { usuarios, memberships, invitaciones };
}

/** Converts every ASISTENTE_LOCAL row to VENDEDOR in one transaction. */
export async function applyAsistenteLocalConversion(
  db: Db,
  now: Date = new Date(),
): Promise<RoleConversionManifest> {
  return db.$transaction(async (tx) => {
    const ids = async (rows: Promise<{ id: string }[]>) => (await rows).map((row) => row.id);
    const usuarioIds = await ids(
      tx.usuario.findMany({ where: { rol: FROM }, select: { id: true } }),
    );
    const membershipIds = await ids(
      tx.membership.findMany({ where: { role: FROM }, select: { id: true } }),
    );
    const invitacionIds = await ids(
      tx.invitacion.findMany({ where: { rol: FROM }, select: { id: true } }),
    );
    await tx.usuario.updateMany({ where: { id: { in: usuarioIds } }, data: { rol: TO } });
    await tx.membership.updateMany({ where: { id: { in: membershipIds } }, data: { role: TO } });
    await tx.invitacion.updateMany({ where: { id: { in: invitacionIds } }, data: { rol: TO } });
    return {
      from: FROM,
      to: TO,
      appliedAt: now.toISOString(),
      usuarioIds,
      membershipIds,
      invitacionIds,
    };
  });
}

/** Restores the rows listed in a manifest that are still VENDEDOR. */
export async function revertAsistenteLocalConversion(
  db: Db,
  manifest: RoleConversionManifest,
): Promise<{ restored: RoleConversionCounts; skipped: RoleConversionCounts }> {
  if (manifest.from !== FROM || manifest.to !== TO) {
    throw new Error('El manifiesto no corresponde a la conversión ASISTENTE_LOCAL → VENDEDOR');
  }
  return db.$transaction(async (tx) => {
    const usuarios = await tx.usuario.updateMany({
      where: { id: { in: manifest.usuarioIds }, rol: TO },
      data: { rol: FROM },
    });
    const memberships = await tx.membership.updateMany({
      where: { id: { in: manifest.membershipIds }, role: TO },
      data: { role: FROM },
    });
    const invitaciones = await tx.invitacion.updateMany({
      where: { id: { in: manifest.invitacionIds }, rol: TO },
      data: { rol: FROM },
    });
    return {
      restored: {
        usuarios: usuarios.count,
        memberships: memberships.count,
        invitaciones: invitaciones.count,
      },
      skipped: {
        usuarios: manifest.usuarioIds.length - usuarios.count,
        memberships: manifest.membershipIds.length - memberships.count,
        invitaciones: manifest.invitacionIds.length - invitaciones.count,
      },
    };
  });
}
