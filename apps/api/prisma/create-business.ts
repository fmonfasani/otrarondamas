import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Creates (or completes) a Business with its Owner, idempotently:
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
    throw new Error('--password no se usa en producción: el Owner la crea con "Olvidé mi contraseña"');
  }
  if (!Number.isFinite(fondoFijo) || fondoFijo < 0) throw new Error('--fondo-fijo inválido');

  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const empresa =
        (await tx.empresa.findUnique({ where: { slug } })) ??
        (await tx.empresa.create({ data: { nombre, slug, configuracion: {} } }));

      const caja =
        (await tx.caja.findUnique({ where: { empresaId: empresa.id } })) ??
        (await tx.caja.create({ data: { empresaId: empresa.id, fondoFijo } }));

      let usuario = await tx.usuario.findUnique({ where: { email: ownerEmail } });
      if (usuario && usuario.empresaId !== empresa.id) {
        throw new Error('Ese email ya pertenece a otro negocio');
      }
      usuario ??= await tx.usuario.create({
        data: {
          empresaId: empresa.id,
          nombre: ownerNombre,
          email: ownerEmail,
          rol: 'OWNER',
          activo: true,
          estadoLegajo: 'APROBADO',
          passwordHash: password ? await bcrypt.hash(password, 10) : null,
        },
      });

      const user =
        (await tx.user.findUnique({ where: { usuarioId: usuario.id } })) ??
        (await tx.user.create({
          data: { email: ownerEmail, nombre: ownerNombre, usuarioId: usuario.id },
        }));

      const membership =
        (await tx.membership.findUnique({
          where: { userId_businessId: { userId: user.id, businessId: empresa.id } },
        })) ??
        (await tx.membership.create({
          data: { userId: user.id, businessId: empresa.id, role: 'OWNER', status: 'ACTIVE' },
        }));

      await tx.userEmpresa.upsert({
        where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId: empresa.id } },
        update: {},
        create: { usuarioId: usuario.id, empresaId: empresa.id, role: 'owner' },
      });

      return {
        empresaId: empresa.id,
        cajaId: caja.id,
        usuarioId: usuario.id,
        userId: user.id,
        membershipId: membership.id,
        conPassword: Boolean(usuario.passwordHash),
      };
    });
    console.log('Negocio listo:', result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
