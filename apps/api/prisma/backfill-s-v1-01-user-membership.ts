import { PrismaClient } from '@prisma/client';

// S-V1-01 — Backfill idempotente Usuario → User + Membership.
//
// Reglas (contrato aprobado, decisiones D1/D2/D3):
// - Por cada Usuario: encontrar o crear su User (vínculo explícito por
//   `usuarioId`; fallback por email SOLO si no existe User con ese
//   usuarioId — nunca fusionar dos Usuarios distintos en un mismo User).
// - Por cada par (User, Usuario.empresaId): encontrar o crear su
//   Membership con role = Usuario.rol y status = ACTIVE (o SUSPENDED si
//   Usuario.activo = false — único mapeo de validez documentado).
// - NUNCA modifica Usuario, Empresa, permisos, sesiones ni JWT.
// - Re-ejecutable: segunda corrida no crea duplicados (upsert por claves
//   únicas + reporte de lo ya existente).
// - Colisiones (mismo email reclamado por distinto usuarioId): se
//   REPORTAN y se omiten, sin fusionar personas. Exit code 1 si hubo
//   alguna; 0 si todo quedó reconciliado.
//
// Uso: npx ts-node prisma/backfill-s-v1-01-user-membership.ts
// (ver package.json de apps/api). Solo escribe en las tablas nuevas
// "User" y "Membership": reversible borrando esas filas/tablas.

export interface BackfillReporte {
  usuariosVistos: number;
  usersCreados: number;
  usersExistentes: number;
  membershipsCreadas: number;
  membershipsExistentes: number;
  conflictos: Array<{ usuarioId: string; email: string; motivo: string }>;
}

export async function runBackfill(prisma: PrismaClient): Promise<BackfillReporte> {
  const reporte: BackfillReporte = {
    usuariosVistos: 0,
    usersCreados: 0,
    usersExistentes: 0,
    membershipsCreadas: 0,
    membershipsExistentes: 0,
    conflictos: [],
  };

  const usuarios = await prisma.usuario.findMany({
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

  for (const u of usuarios) {
    reporte.usuariosVistos += 1;

    // 1) User por vínculo explícito.
    let user = await prisma.user.findUnique({ where: { usuarioId: u.id } });

    if (!user) {
      // Fallback por email: solo válido si ese email no pertenece ya a
      // OTRO usuarioId (fusionar personas está prohibido).
      const porEmail = await prisma.user.findUnique({ where: { email: u.email } });
      if (porEmail) {
        if (porEmail.usuarioId && porEmail.usuarioId !== u.id) {
          reporte.conflictos.push({
            usuarioId: u.id,
            email: u.email,
            motivo: `email ya vinculado a otro usuarioId (${porEmail.usuarioId}); se omite sin fusionar`,
          });
          continue;
        }
        // Mismo email sin vínculo (caso teórico: User creado sin
        // usuarioId). Adoptarlo SOLO si está libre.
        if (!porEmail.usuarioId) {
          user = await prisma.user.update({
            where: { id: porEmail.id },
            data: { usuarioId: u.id },
          });
        } else {
          reporte.usersExistentes += 1;
          user = porEmail;
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
      reporte.usersCreados += 1;
    } else {
      // Existente por vínculo explícito o adoptado por email libre.
      reporte.usersExistentes += 1;
    }

    // 2) Membership por par (user, empresa). El status deriva del único
    // flag de validez del legacy: Usuario.activo.
    const status = u.activo ? 'ACTIVE' : 'SUSPENDED';
    const existente = await prisma.membership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId: u.empresaId } },
    });
    if (existente) {
      reporte.membershipsExistentes += 1;
    } else {
      await prisma.membership.create({
        data: { userId: user.id, businessId: u.empresaId, role: u.rol, status },
      });
      reporte.membershipsCreadas += 1;
    }
  }

  return reporte;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const reporte = await runBackfill(prisma);
    console.log(JSON.stringify(reporte, null, 2));
    if (reporte.conflictos.length > 0) {
      console.error(
        `Backfill incompleto: ${reporte.conflictos.length} conflicto(s) reportados arriba.`,
      );
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Solo ejecuta al invocarse directo con ts-node, no al importarse desde tests.
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
