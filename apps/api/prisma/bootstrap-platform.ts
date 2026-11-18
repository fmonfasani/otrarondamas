import { PrismaClient } from '@prisma/client';
import { createBusinessWithOwner } from '../src/platform-admin/create-business.js';

/**
 * ADR-IDN-014 — creates (or completes) the internal Wapsell business «Wapsell (plataforma)» with
 * the platform administrator as its only Owner. Idempotent: re-running only fills what is
 * missing. The database refuses to delete this business or its accounts (migration
 * 20261118060000_negocio_interno), so tenant cleanups never remove the administrator.
 *
 *   npm run platform:bootstrap -- --email admin@wapsell.com [--nombre "Administración Wapsell"]
 *
 * No password: the administrator sets it with «Olvidé mi contraseña» (single-use email link) and
 * enrols MFA at the first sign-in. Then add the same email to PLATFORM_ADMIN_EMAILS.
 * Running it against production is a data change and needs the usual authorization.
 */
const SLUG = 'wapsell';
const NOMBRE = 'Wapsell (plataforma)';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const email = arg('email')?.trim().toLowerCase();
  const ownerNombre = arg('nombre')?.trim() || 'Administración Wapsell';
  if (!email || !email.includes('@')) throw new Error('Falta --email');

  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const internal = await tx.empresa.findFirst({
        where: { interno: true },
        select: { slug: true },
      });
      if (internal && internal.slug !== SLUG) {
        throw new Error(`Ya existe otro negocio interno (${internal.slug}); no se crea uno nuevo.`);
      }
      const created = await createBusinessWithOwner(tx, {
        nombre: NOMBRE,
        slug: SLUG,
        ownerNombre,
        ownerEmail: email,
      });
      await tx.empresa.update({ where: { id: created.empresaId }, data: { interno: true } });
      return created;
    });
    process.stdout.write(
      `Negocio interno listo (empresa ${result.empresaId}, usuario ${result.usuarioId}).\n` +
        'Siguiente: agregá el email a PLATFORM_ADMIN_EMAILS y creá la contraseña con «Olvidé mi contraseña».\n',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
