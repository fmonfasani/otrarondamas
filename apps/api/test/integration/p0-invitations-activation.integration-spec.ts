import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../src/prisma/prisma.service';
import { InvitationsService } from '../../src/invitations/invitations.service';
import type { EmailService } from '../../src/email/email.service';
import type { AuthService } from '../../src/auth/auth.service';
import type { AuthCustomerService } from '../../src/auth/auth.customer.service';

// Invitation activation hashes the new account's password with bcryptjs. The
// API is ESM, and `import * as bcrypt` left `bcrypt.hash` undefined, so both
// public activation endpoints threw before creating the account. This pins
// that activation works and stores a hash that verifies against the password.
describe('Invitation activation (real PostgreSQL)', () => {
  let prisma: PrismaService;
  let service: InvitationsService;
  const tag = randomUUID().slice(0, 8);
  let empresaId: string;
  let ownerId: string;

  const issued: unknown[] = [];
  const authService = {
    issueSession: async (user: unknown) => {
      issued.push(user);
      return { session: 'staff' };
    },
  } as unknown as AuthService;
  const authCustomerService = {
    issueCustomerSession: async (customer: unknown) => {
      issued.push(customer);
      return { session: 'customer' };
    },
  } as unknown as AuthCustomerService;

  const createInvitation = (email: string) =>
    prisma.invitacion.create({
      data: {
        empresaId,
        email,
        rol: 'ASISTENTE_LOCAL',
        token: `inv-${randomUUID()}`,
        invitadoPorId: ownerId,
        expiraEn: new Date(Date.now() + 60 * 60 * 1000),
      },
      select: { id: true, token: true },
    });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new InvitationsService(prisma, {} as EmailService, authService, authCustomerService);
    const empresa = await prisma.empresa.create({
      data: { nombre: `Invitations ${tag}`, slug: `invitations-${tag}`, configuracion: {} },
      select: { id: true },
    });
    empresaId = empresa.id;
    const owner = await prisma.usuario.create({
      data: { empresaId, nombre: 'Owner', email: `owner-${tag}@example.test`, rol: 'OWNER' },
      select: { id: true },
    });
    ownerId = owner.id;
  });

  afterAll(async () => {
    if (prisma && empresaId) {
      await prisma.invitacion.deleteMany({ where: { empresaId } });
      await prisma.cliente.deleteMany({ where: { empresaId } });
      // Activation also creates the canonical User + Membership + UserEmpresa (S-V1-02).
      const usuarios = await prisma.usuario.findMany({
        where: { empresaId },
        select: { id: true },
      });
      await prisma.membership.deleteMany({ where: { businessId: empresaId } });
      await prisma.user.deleteMany({ where: { usuarioId: { in: usuarios.map((u) => u.id) } } });
      await prisma.userEmpresa.deleteMany({ where: { empresaId } });
      await prisma.usuario.deleteMany({ where: { empresaId } });
      await prisma.empresa.deleteMany({ where: { id: empresaId } });
    }
    await prisma?.$disconnect();
  });

  it('activates a staff invitation and stores a password hash that verifies', async () => {
    const email = `staff-${tag}@example.test`;
    const invitation = await createInvitation(email);

    await expect(
      service.activate({ token: invitation.token, nombre: 'Staff', password: 'secreto-123' }),
    ).resolves.toEqual({ session: 'staff' });

    const usuario = await prisma.usuario.findFirstOrThrow({
      where: { empresaId, email },
      select: { passwordHash: true, estadoLegajo: true, rol: true },
    });
    expect(await bcrypt.compare('secreto-123', usuario.passwordHash as string)).toBe(true);
    expect(usuario.estadoLegajo).toBe('PENDIENTE');
    // OR-B4-027: a pending ASISTENTE_LOCAL invitation activates as VENDEDOR.
    expect(usuario.rol).toBe('VENDEDOR');
    const used = await prisma.invitacion.findUniqueOrThrow({
      where: { id: invitation.id },
      select: { usadaEn: true },
    });
    expect(used.usadaEn).not.toBeNull();
  });

  it('activates a wholesale invitation and stores a password hash that verifies', async () => {
    const email = `wholesale-${tag}@example.test`;
    const invitation = await createInvitation(email);

    await expect(
      service.activateWholesale({
        token: invitation.token,
        nombre: 'Mayorista',
        password: 'secreto-456',
      }),
    ).resolves.toEqual({ session: 'customer' });

    const cliente = await prisma.cliente.findFirstOrThrow({
      where: { empresaId, email },
      select: { passwordHash: true, esMayorista: true },
    });
    expect(await bcrypt.compare('secreto-456', cliente.passwordHash as string)).toBe(true);
    expect(cliente.esMayorista).toBe(true);
  });
});
