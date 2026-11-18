import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createBusinessWithOwner } from '../src/platform-admin/create-business.js';
import { systemDatasource } from '../src/prisma/database-urls.js';
import { SCRIPT_BLOCKED_MESSAGE } from '../src/platform-admin/business-creation-gate.js';

/**
 * Creates (or completes) a Business with its Owner, idempotently (same code as Wapsell
 * platform administration, src/platform-admin/create-business.ts):
 * Empresa + Caja + Usuario (OWNER, dossier approved) + User + Membership (OWNER, ACTIVE)
 * + UserEmpresa. Re-running with the same slug/email only fills what is missing.
 *
 *   npm run business:create -- --nombre "Otra Ronda Más" --slug otra-ronda-mas \
 *     --owner-nombre "Nombre Apellido" --owner-email dueno@ejemplo.com [--fondo-fijo 0]
 *
 * No password by default: the Owner sets it with "Olvidé mi contraseña" (an email with a
 * single-use link). --password is meant for local/dev databases only and is refused when
 * NODE_ENV=production. Running it against production is a data change and needs the usual
 * authorization.
 */
function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const nombre = arg('nombre');
  const slug = arg('slug');
  const ownerNombre = arg('owner-nombre');
  const ownerEmail = arg('owner-email')?.trim();
  const password = arg('password');
  const fondoFijo = Number(arg('fondo-fijo') ?? '0');
  if (!nombre || !slug || !ownerNombre || !ownerEmail) {
    throw new Error('Faltan --nombre, --slug, --owner-nombre y --owner-email');
  }
  if (password && process.env.NODE_ENV === 'production') {
    throw new Error(
      '--password no se usa en producción: el Owner la crea con "Olvidé mi contraseña"',
    );
  }
  if (!Number.isFinite(fondoFijo) || fondoFijo < 0) throw new Error('--fondo-fijo inválido');

  // ADR-DAT-019: creating a business crosses businesses, so it uses the system role.
  const prisma = new PrismaClient(systemDatasource());
  try {
    // OR-B4-042: in production a second Business is created from the platform (with MFA), not
    // here. Completing the existing Business (same store address) is still allowed.
    if (process.env.NODE_ENV === 'production') {
      const others = await prisma.empresa.count({ where: { slug: { not: slug } } });
      if (others > 0) throw new Error(SCRIPT_BLOCKED_MESSAGE);
    }
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const result = await prisma.$transaction((tx) =>
      createBusinessWithOwner(tx, {
        nombre,
        slug,
        ownerNombre,
        ownerEmail,
        fondoFijo,
        passwordHash,
      }),
    );
    console.log('Negocio listo:', result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
