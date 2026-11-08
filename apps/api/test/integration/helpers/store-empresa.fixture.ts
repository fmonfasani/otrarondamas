import type { PrismaService } from '../../../src/prisma/prisma.service';

export interface OwnStoreEmpresa {
  id: string;
  release: () => Promise<void>;
}

/**
 * Store suites clean up by empresaId, so they must never target a real store:
 * each suite gets its own Empresa and TIENDA_EMPRESA_ID points at it until release().
 */
export async function createOwnStoreEmpresa(
  prisma: PrismaService,
  tag: string,
): Promise<OwnStoreEmpresa> {
  const previous = process.env.TIENDA_EMPRESA_ID;
  const { id } = await prisma.empresa.create({
    data: { nombre: `${tag} ${Date.now()}`, slug: `${tag}-${Date.now()}`, configuracion: {} },
    select: { id: true },
  });
  process.env.TIENDA_EMPRESA_ID = id;
  return {
    id,
    release: async () => {
      await prisma.empresa.delete({ where: { id } });
      if (previous === undefined) delete process.env.TIENDA_EMPRESA_ID;
      else process.env.TIENDA_EMPRESA_ID = previous;
    },
  };
}
