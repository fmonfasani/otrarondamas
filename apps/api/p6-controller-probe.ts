import { CartController } from './src/cart/cart.controller';
import { BusinessContextService } from './src/business-context/business-context.service';
import { PrismaService } from './src/prisma/prisma.service';
import { MembershipService } from './src/membership/membership.service';
import type { AuthenticatedUser } from './src/auth/auth.types';

// Probe: can a CUSTOMER identity pass the controller's own context resolution?
async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const s = Date.now();

  const emp = await prisma.empresa.create({
    data: { nombre: `P6 ${s}`, slug: `p6-${s}`, configuracion: {} },
    select: { id: true },
  });
  const cliente = await prisma.cliente.create({
    data: { empresaId: emp.id, nombre: `P6 customer ${s}`, activo: true },
    select: { id: true },
  });

  const businessContext = new BusinessContextService(
    new MembershipService(prisma) as never,
    prisma,
  );
  const controller = new CartController({} as never, businessContext);
  const customer = { id: cliente.id, type: 'cliente' } as unknown as AuthenticatedUser;

  try {
    await controller.getCart(customer);
    console.log('GET /cart: REACHED the service (context resolved)');
  } catch (e) {
    console.log('GET /cart: THREW ->', (e as Error).constructor.name, '|', (e as Error).message);
  }

  // Control: the same identity through the CORRECT resolver.
  try {
    const ctx = await businessContext.resolveForCustomer(customer);
    console.log('resolveForCustomer: OK, businessId =', ctx.businessId === emp.id);
  } catch (e) {
    console.log('resolveForCustomer: THREW ->', (e as Error).message);
  }

  await prisma.cliente.deleteMany({ where: { id: cliente.id } });
  await prisma.empresa.deleteMany({ where: { id: emp.id } });
  await prisma.$disconnect();
}
main().catch((e) => { console.error('PROBE ERROR', e.message); process.exit(1); });
