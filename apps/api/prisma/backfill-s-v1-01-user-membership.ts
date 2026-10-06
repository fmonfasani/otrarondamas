import { PrismaClient } from '@prisma/client';

// S-V1-01 — Idempotent backfill Usuario → User + Membership.
//
// Rules (approved contract, decisions D1/D2/D3):
// - For each Usuario: find or create its User (explicit link via
//   `usuarioId`; email fallback ONLY if no User exists with that
//   usuarioId — never merge two distinct Usuarios into one User).
// - For each (User, Usuario.empresaId) pair: find or create its
//   Membership with role = Usuario.rol and status = ACTIVE (or SUSPENDED
//   if Usuario.activo = false — the only documented validity mapping).
// - NEVER modifies Usuario, Empresa, permissions, sessions or JWT.
// - Re-runnable: a second run creates no duplicates (upsert by unique
//   keys + report of what already existed).
// - Collisions (same email claimed by a different usuarioId): they are
//   REPORTED and skipped, without merging people. Exit code 1 if there
//   was any; 0 if everything was reconciled.
//
// Usage: npx ts-node prisma/backfill-s-v1-01-user-membership.ts
// (see package.json of apps/api). It only writes to the new tables
// "User" and "Membership": reversible by deleting those rows/tables.

export interface BackfillReport {
  usuariosVistos: number;
  usersCreados: number;
  usersExistentes: number;
  membershipsCreadas: number;
  membershipsExistentes: number;
  conflictos: Array<{ usuarioId: string; email: string; motivo: string }>;
}

export async function runBackfill(prisma: PrismaClient): Promise<BackfillReport> {
  const report: BackfillReport = {
    usuariosVistos: 0,
    usersCreados: 0,
    usersExistentes: 0,
    membershipsCreadas: 0,
    membershipsExistentes: 0,
    conflictos: [],
  };

  const users = await prisma.usuario.findMany({
    select: {
      id: true,
      empresaId: true,
      nombre: true,
      email: true,
      passwordHash: true,
      googleId: true,
      fotoUrl: true,
      activo: true,
      rol: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const u of users) {
    report.usuariosVistos += 1;

    // 1) User by explicit link.
    let user = await prisma.user.findUnique({ where: { usuarioId: u.id } });

    if (!user) {
      // Email fallback: only valid if that email does not already belong to
      // ANOTHER usuarioId (merging people is forbidden).
      const byEmail = await prisma.user.findUnique({ where: { email: u.email } });
      if (byEmail) {
        if (byEmail.usuarioId && byEmail.usuarioId !== u.id) {
          report.conflictos.push({
            usuarioId: u.id,
            email: u.email,
            motivo: `email ya vinculado a otro usuarioId (${byEmail.usuarioId}); se omite sin fusionar`,
          });
          continue;
        }
        // Same email without a link (theoretical case: User created without
        // usuarioId). Adopt it ONLY if it is free.
        if (!byEmail.usuarioId) {
          user = await prisma.user.update({
            where: { id: byEmail.id },
            data: { usuarioId: u.id },
          });
        } else {
          report.usersExistentes += 1;
          user = byEmail;
        }
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: u.email,
          nombre: u.nombre,
          passwordHash: u.passwordHash,
          googleId: u.googleId,
          fotoUrl: u.fotoUrl,
          usuarioId: u.id,
        },
      });
      report.usersCreados += 1;
    } else {
      // Existing through explicit link or adopted by free email.
      report.usersExistentes += 1;
    }

    // 2) Membership per (user, empresa) pair. The status derives from the
    // single legacy validity flag: Usuario.activo.
    const status = u.activo ? 'ACTIVE' : 'SUSPENDED';
    const existing = await prisma.membership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId: u.empresaId } },
    });
    if (existing) {
      report.membershipsExistentes += 1;
    } else {
      await prisma.membership.create({
        data: { userId: user.id, businessId: u.empresaId, role: u.rol, status },
      });
      report.membershipsCreadas += 1;
    }
  }

  return report;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const report = await runBackfill(prisma);
    console.log(JSON.stringify(report, null, 2));
    if (report.conflictos.length > 0) {
      console.error(
        `Backfill incompleto: ${report.conflictos.length} conflicto(s) reportados arriba.`,
      );
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Only runs when invoked directly with ts-node, not when imported from tests.
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
