import type { PrismaService } from '../../../src/prisma/prisma.service';

export interface OwnStoreEmpresa {
  id: string;
  slug: string;
  release: () => Promise<void>;
}

/**
 * Store suites clean up by empresaId, so they must never target a real store: each suite gets
 * its own Empresa and reaches its store by slug (`/:slug/tienda`).
 */
export async function createOwnStoreEmpresa(
  prisma: PrismaService,
  tag: string,
): Promise<OwnStoreEmpresa> {
  const { id, slug } = await prisma.empresa.create({
    data: { nombre: `${tag} ${Date.now()}`, slug: `${tag}-${Date.now()}`, configuracion: {} },
    select: { id: true, slug: true },
  });
  return {
    id,
    slug,
    release: async () => {
      await prisma.empresa.delete({ where: { id } });
    },
  };
}
