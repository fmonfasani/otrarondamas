import type { Prisma } from '@prisma/client';

export type NewBusiness = {
  nombre: string;
  slug: string;
  ownerNombre: string;
  ownerEmail: string;
  fondoFijo?: number;
  passwordHash?: string | null;
};

/** Store addresses: lowercase letters, numbers and dashes; 3 to 40 characters. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Creates (or completes) a Business with its Owner, idempotently, inside the caller's
 * transaction: Empresa + Caja + Usuario (OWNER, dossier approved) + User + Membership
 * (OWNER, ACTIVE) + UserEmpresa. Shared by the `business:create` script and Wapsell platform
 * administration (OR-B4-039), so both create exactly the same thing.
 */
export async function createBusinessWithOwner(tx: Prisma.TransactionClient, input: NewBusiness) {
  const ownerEmail = input.ownerEmail.trim();
  const empresa =
    (await tx.empresa.findUnique({ where: { slug: input.slug } })) ??
    (await tx.empresa.create({
      data: { nombre: input.nombre, slug: input.slug, configuracion: {} },
    }));

  const caja =
    (await tx.caja.findUnique({ where: { empresaId: empresa.id } })) ??
    (await tx.caja.create({ data: { empresaId: empresa.id, fondoFijo: input.fondoFijo ?? 0 } }));

  let usuario = await tx.usuario.findUnique({ where: { email: ownerEmail } });
  if (usuario && usuario.empresaId !== empresa.id) {
    throw new Error('Ese email ya pertenece a otro negocio');
  }
  usuario ??= await tx.usuario.create({
    data: {
      empresaId: empresa.id,
      nombre: input.ownerNombre,
      email: ownerEmail,
      rol: 'OWNER',
      activo: true,
      estadoLegajo: 'APROBADO',
      passwordHash: input.passwordHash ?? null,
    },
  });

  const user =
    (await tx.user.findUnique({ where: { usuarioId: usuario.id } })) ??
    (await tx.user.create({
      data: { email: ownerEmail, nombre: input.ownerNombre, usuarioId: usuario.id },
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
}
