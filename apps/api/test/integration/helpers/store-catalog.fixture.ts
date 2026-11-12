import * as net from 'node:net';
import type { PrismaService } from '../../../src/prisma/prisma.service';

/** Resolves once something listens on the local port (the spawned API). */
export const waitPort = (port: number, attempts = 60) =>
  new Promise<void>((resolve, reject) => {
    const probe = (remaining: number) => {
      const socket = net.connect(port, '127.0.0.1');
      socket.on('connect', () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        if (remaining <= 0) reject(new Error(`puerto ${port} sin respuesta`));
        else setTimeout(() => probe(remaining - 1), 1000);
      });
    };
    probe(attempts);
  });

/** One sellable product (full hierarchy + a lot of 5 units) in the given company. */
export async function createStoreProduct(
  prisma: PrismaService,
  companyId: string,
  label: string,
  tag: string,
  suffix: number,
) {
  const family = await prisma.familia.create({
    data: { empresaId: companyId, nombre: `${label} Fam ${tag} ${suffix}`, prefijo: `F${tag}` },
    select: { id: true },
  });
  const subfamily = await prisma.subfamilia.create({
    data: {
      empresaId: companyId,
      familiaId: family.id,
      nombre: `${label} Sub ${tag} ${suffix}`,
      prefijo: `S${tag}`,
    },
    select: { id: true },
  });
  const type = await prisma.tipo.create({
    data: {
      empresaId: companyId,
      subfamiliaId: subfamily.id,
      nombre: `${label} Tipo ${tag} ${suffix}`,
      prefijo: `T${tag}`,
    },
    select: { id: true },
  });
  const subtype = await prisma.subtipo.create({
    data: {
      empresaId: companyId,
      tipoId: type.id,
      nombre: `${label} Subtipo ${tag} ${suffix}`,
      prefijo: `U${tag}`,
    },
    select: { id: true },
  });
  const product = await prisma.producto.create({
    data: {
      empresaId: companyId,
      nombre: `${label} Product ${tag} ${suffix}`,
      codigoInterno: `${label.replace(/\W/g, '')}-${tag}-${suffix}`,
      familiaId: family.id,
      subfamiliaId: subfamily.id,
      tipoId: type.id,
      subtipoId: subtype.id,
      unidadBase: 'UNIDAD',
      costo: 1,
      precioMinorista: 10,
      activo: true,
    },
    select: { id: true, nombre: true },
  });
  await prisma.lote.create({
    data: {
      empresaId: companyId,
      productoId: product.id,
      numeroLote: `L-${tag}-${suffix}`,
      vencimiento: new Date('2099-01-01'),
      cantidad: 5,
    },
  });
  return product;
}

/** Removes everything the store suites create in these companies, then the companies. */
export async function deleteStoreCompanies(prisma: PrismaService, companies: string[]) {
  const scope = { where: { empresaId: { in: companies } } };
  await prisma.pedidoItem.deleteMany({ where: { Pedido: { empresaId: { in: companies } } } });
  await prisma.pedido.deleteMany(scope);
  await prisma.cliente.deleteMany(scope);
  await prisma.movimientoStock.deleteMany(scope);
  await prisma.lote.deleteMany(scope);
  await prisma.producto.deleteMany(scope);
  await prisma.subtipo.deleteMany(scope);
  await prisma.tipo.deleteMany(scope);
  await prisma.subfamilia.deleteMany(scope);
  await prisma.familia.deleteMany(scope);
  await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
}
