// Capacity test (Owner, 2026-11-26) — fills the ISOLATED load-test database with fake
// businesses, owners and customers. Never points at production: run.sh gives it the
// load-test database only. Writes the ids (no secrets) to $OUT/seed.json.
//
// Runs inside the API builder image (it has @prisma/client generated for this schema).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire('/repo/apps/api/package.json');
const { PrismaClient } = require('@prisma/client');

const BUSINESSES = Number(process.env.LT_BUSINESSES ?? 10);
const CUSTOMERS = Number(process.env.LT_CUSTOMERS ?? 1600);
const OWNERS_PER_BUSINESS = Number(process.env.LT_OWNERS_PER_BUSINESS ?? 2);
const OUT = process.env.OUT ?? '/out';
if (!process.env.SYSTEM_DATABASE_URL?.includes('wapsell-lt-db')) {
  throw new Error('seed.mjs only runs against the load-test database (wapsell-lt-db)');
}

const prisma = new PrismaClient({ datasources: { db: { url: process.env.SYSTEM_DATABASE_URL } } });
const seed = { businesses: [] };
for (let b = 0; b < BUSINESSES; b += 1) {
  const empresa = await prisma.empresa.create({
    data: { nombre: `Prueba de carga ${b + 1}`, slug: `prueba-carga-${b + 1}`, configuracion: {} },
  });
  const owners = [];
  for (let o = 0; o < OWNERS_PER_BUSINESS; o += 1) {
    const email = `dueno-${b}-${o}@carga.test`;
    const rol = o === 0 ? 'OWNER' : 'ADMIN';
    const usuario = await prisma.usuario.create({
      data: { empresaId: empresa.id, nombre: `Equipo ${b}-${o}`, email, activo: true, rol },
    });
    const user = await prisma.user.create({ data: { email: `u-${email}`, nombre: `Equipo ${b}-${o}`, usuarioId: usuario.id } });
    await prisma.membership.create({ data: { userId: user.id, businessId: empresa.id, role: rol, status: 'ACTIVE' } });
    owners.push({ usuarioId: usuario.id, email, nombre: `Equipo ${b}-${o}`, rol });
  }
  const count = Math.ceil(CUSTOMERS / BUSINESSES);
  const data = Array.from({ length: count }, (_, c) => ({
    empresaId: empresa.id,
    nombre: `Cliente ${b}-${c}`,
    email: `cliente-${b}-${c}@carga.test`,
  }));
  await prisma.cliente.createMany({ data });
  const customers = await prisma.cliente.findMany({
    where: { empresaId: empresa.id },
    select: { id: true, email: true, nombre: true },
    orderBy: { email: 'asc' },
  });
  seed.businesses.push({ id: empresa.id, slug: empresa.slug, owners, customers });
}
writeFileSync(`${OUT}/seed.json`, JSON.stringify(seed));
console.log(`seed: ${BUSINESSES} negocios, ${seed.businesses.reduce((a, b) => a + b.customers.length, 0)} clientes`);
await prisma.$disconnect();
