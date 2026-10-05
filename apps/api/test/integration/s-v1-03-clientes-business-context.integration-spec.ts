import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BusinessContextService } from '../../src/business-context/business-context.service';
import { ClientesController } from '../../src/clientes/clientes.controller';
import { ClientesService } from '../../src/clientes/clientes.service';
import type { CreateClienteDto } from '../../src/clientes/dto/create-cliente.dto';
import { MembershipService } from '../../src/membership/membership.service';
import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { AuthenticatedUser } from '../../src/auth/auth.types';

// S-V1-03 — Primera integración de BusinessContext en una superficie real
// (CLIENTES). Todo contra BD descartable; sin mocks de Prisma.
//
// Se ejercita el ClientesController REAL (mismo constructor que producción)
// con el BusinessContextService REAL sobre MembershipService REAL. Los
// guards no se ejecutan acá — esa es la responsabilidad del spec HTTP
// s-v1-03-clientes-http.integration-spec.ts, que corre contra el stack
// compilado.
//
// Cadena probada en cada llamada:
//   AuthenticatedUser → BusinessContextService → User → Membership ACTIVE
//   → businessId → resolveEmpresaId() → ClientesService
//   → EmpresaScopedPrismaService.forEmpresa() → empresaScopeExtension
describe('S-V1-03 — BusinessContext en Clientes (integración, BD real)', () => {
  let prisma: PrismaService;
  let prismaFactory: EmpresaScopedPrismaService;
  let clientesService: ClientesService;
  let businessContext: BusinessContextService;
  let controller: ClientesController;
  let suffix: number;

  let empresaA: { id: string };
  let empresaB: { id: string };
  let usuarioA: { id: string };
  let usuarioB: { id: string };
  let usuarioSinMembership: { id: string };
  let usuarioSinMembresias: { id: string };
  let usuarioSuspendido: { id: string };
  let clienteA: { id: string };
  let clienteB: { id: string };

  // Sesión con la forma LEGACY del JWT. `empresaId` viene del token y es
  // knowledge del cliente HTTP, no una autoridad: T8 lo prueba.
  const sesionDe = (usuarioId: string, empresaIdDelToken: string): AuthenticatedUser => ({
    id: usuarioId,
    email: `s-v1-03-${usuarioId}@example.test`,
    nombre: 'S V1-03',
    empresaId: empresaIdDelToken,
    permisos: ['clientes.gestionar'],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    prismaFactory = new EmpresaScopedPrismaService(prisma);
    clientesService = new ClientesService(prismaFactory);
    businessContext = new BusinessContextService(new MembershipService(prisma), prisma);
    controller = new ClientesController(clientesService, businessContext);
    suffix = Date.now();

    empresaA = await prisma.empresa.create({
      data: { nombre: `S-V1-03 A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    empresaB = await prisma.empresa.create({
      data: { nombre: `S-V1-03 B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    const mkUsuario = (empresaId: string, tag: string) =>
      prisma.usuario.create({
        data: {
          empresaId,
          nombre: `S-V1-03 ${tag} ${suffix}`,
          email: `s-v1-03-${tag}-${suffix}@example.test`,
          activo: true,
          rol: 'OWNER',
        },
        select: { id: true },
      });

    usuarioA = await mkUsuario(empresaA.id, 'a');
    usuarioB = await mkUsuario(empresaB.id, 'b');
    usuarioSinMembership = await mkUsuario(empresaA.id, 'sinmemb');
    usuarioSinMembresias = await mkUsuario(empresaA.id, 'sinnmemb');
    usuarioSuspendido = await mkUsuario(empresaA.id, 'susp');

    // User + Membership ACTIVE explícitos (no se depende del backfill):
    // el slice prueba la resolución, no el script de migración.
    const mkUserConMembership = async (usuarioId: string, businessId: string, status: string) => {
      const user = await prisma.user.create({
        data: {
          email: `s-v1-03-user-${suffix}-${usuarioId}@example.test`,
          nombre: `S V1-03 ${usuarioId}`,
          usuarioId,
        },
        select: { id: true },
      });
      await prisma.membership.create({
        data: { userId: user.id, businessId, role: 'OWNER', status },
      });
      return user;
    };

    await mkUserConMembership(usuarioA.id, empresaA.id, 'ACTIVE');
    await mkUserConMembership(usuarioB.id, empresaB.id, 'ACTIVE');
    await mkUserConMembership(usuarioSuspendido.id, empresaA.id, 'SUSPENDED');

    // User canónico SIN ninguna Membership: existe identidad, no
    // pertenencia → fail-closed por Membership (distinto del caso
    // anterior, donde ni siquiera hay User).
    await prisma.user.create({
      data: {
        email: `s-v1-03-user-sinnmemb-${suffix}@example.test`,
        nombre: 'S V1-03 sin membresias',
        usuarioId: usuarioSinMembresias.id,
      },
      select: { id: true },
    });

    // Un Cliente por Empresa, creados por la infraestructura legacy.
    clienteA = await prismaFactory
      .forEmpresa(empresaA.id)
      .cliente.create({ data: { nombre: `S-V1-03 Cliente A ${suffix}` }, select: { id: true } });
    clienteB = await prismaFactory
      .forEmpresa(empresaB.id)
      .cliente.create({ data: { nombre: `S-V1-03 Cliente B ${suffix}` }, select: { id: true } });
  });

  afterAll(async () => {
    const empresas = [empresaA.id, empresaB.id];
    await prisma.cliente.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: empresas } } });
    await prisma.user.deleteMany({ where: { email: { contains: `${suffix}` } } });
    await prisma.usuario.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.empresa.deleteMany({ where: { id: { in: empresas } } });
    await prisma.$disconnect();
  });

  it('T1: User + Membership ACTIVE → Clientes usa la Empresa correcta', async () => {
    const spy = jest.spyOn(prismaFactory, 'forEmpresa');
    const listados = await controller.listar(sesionDe(usuarioA.id, empresaA.id));

    expect(listados.map((c) => c.id)).toContain(clienteA.id);
    expect(listados.every((c) => c.empresaId === empresaA.id)).toBe(true);
    expect(listados.some((c) => c.id === clienteB.id)).toBe(false);
    expect(spy).toHaveBeenCalledWith(empresaA.id);
    // El empresaId entregado al dominio es el derivado del contexto,
    // no el que venía en la sesión.
    const ctx = await businessContext.resolveForAuthenticatedUser(
      sesionDe(usuarioA.id, empresaA.id),
    );
    expect(ctx.businessId).toBe(empresaA.id);
    expect(await businessContext.resolveEmpresaId(ctx.businessId)).toBe(empresaA.id);
    spy.mockRestore();
  });

  it('T2: User sin Membership → fail-closed explícito', async () => {
    // (a) User canónico sin ninguna Membership → sin contexto activo.
    await expect(controller.listar(sesionDe(usuarioSinMembresias.id, empresaA.id))).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      controller.crear({ nombre: 'x' }, sesionDe(usuarioSinMembresias.id, empresaA.id)),
    ).rejects.toThrow(ForbiddenException);
    // Tampoco alcanza el Cliente de A por id directo.
    await expect(
      controller.obtener(clienteA.id, sesionDe(usuarioSinMembresias.id, empresaA.id)),
    ).rejects.toThrow(ForbiddenException);

    // (b) Usuario sin User vinculado (backfill pendiente) → también falla
    //     cerrado, antes de tocar el dominio.
    await expect(controller.listar(sesionDe(usuarioSinMembership.id, empresaA.id))).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      controller.crear({ nombre: 'x' }, sesionDe(usuarioSinMembership.id, empresaA.id)),
    ).rejects.toThrow();

    // Ninguno de los dos intentos alcanzó a escribir nada.
    const nombres = await prisma.cliente.findMany({
      where: { empresaId: { in: [empresaA.id, empresaB.id] } },
      select: { nombre: true },
    });
    expect(nombres.filter((n) => n.nombre === 'x')).toEqual([]);
  });

  it('T3: User A no puede resolver ni usar el Business de User B', async () => {
    // A resuelve SU contexto (Business A), nunca el de B.
    const ctxA = await businessContext.resolveForAuthenticatedUser(
      sesionDe(usuarioA.id, empresaA.id),
    );
    expect(ctxA.businessId).toBe(empresaA.id);

    // Y la superficie de A no puede alcanzar el Cliente de B, ni por
    // listado ni por id directo.
    await expect(
      controller.obtener(clienteB.id, sesionDe(usuarioA.id, empresaA.id)),
    ).rejects.toThrow(NotFoundException);
    // Simétrico para B.
    const ctxB = await businessContext.resolveForAuthenticatedUser(
      sesionDe(usuarioB.id, empresaB.id),
    );
    expect(ctxB.businessId).toBe(empresaB.id);
    expect((await controller.listar(sesionDe(usuarioB.id, empresaB.id))).map((c) => c.id)).toEqual([
      clienteB.id,
    ]);
    // I-SV3-05: la Membership de B pertenece al User de B — A no puede
    // producir contexto a partir de ella aunque la fila exista en la BD.
    const ctxA2 = await businessContext.resolveForAuthenticatedUser(
      sesionDe(usuarioA.id, empresaA.id),
    );
    expect(ctxA2.membershipId).not.toBe(ctxB.membershipId);
    expect(ctxA2.userId).not.toBe(ctxB.userId);
    await expect(
      controller.obtener(clienteA.id, sesionDe(usuarioB.id, empresaB.id)),
    ).rejects.toThrow(NotFoundException);
  });

  it('T4: Membership SUSPENDED → acceso rechazado', async () => {
    await expect(controller.listar(sesionDe(usuarioSuspendido.id, empresaA.id))).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      controller.obtener(clienteA.id, sesionDe(usuarioSuspendido.id, empresaA.id)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('T5: businessId resuelve correctamente a Empresa.id', async () => {
    const ctx = await businessContext.resolveForAuthenticatedUser(
      sesionDe(usuarioA.id, empresaA.id),
    );
    const empresaId = await businessContext.resolveEmpresaId(ctx.businessId);
    expect(ctx.businessId).toBe(empresaA.id);
    expect(empresaId).toBe(ctx.businessId);
    const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });
    expect(empresa.id).toBe(empresaA.id);
  });

  it('T6: Cliente de Empresa B no aparece para Empresa A (persistencia/query)', async () => {
    // Ambas filas existen realmente, cada una bajo su empresa.
    const todas = await prisma.cliente.findMany({
      where: { id: { in: [clienteA.id, clienteB.id] } },
      select: { id: true, empresaId: true },
      orderBy: { id: 'asc' },
    });
    expect(todas).toHaveLength(2);
    expect(todas.find((c) => c.id === clienteA.id)?.empresaId).toBe(empresaA.id);
    expect(todas.find((c) => c.id === clienteB.id)?.empresaId).toBe(empresaB.id);

    // Evidencia a nivel de query: el scope de A no devuelve la fila de B.
    const desdeA = await prismaFactory.forEmpresa(empresaA.id).cliente.findMany({
      where: { id: { in: [clienteA.id, clienteB.id] } },
      select: { id: true },
    });
    expect(desdeA.map((c) => c.id)).toEqual([clienteA.id]);

    // Y por la superficie de dominio.
    const listados = await controller.listar(sesionDe(usuarioA.id, empresaA.id));
    expect(listados.map((c) => c.id)).toContain(clienteA.id);
    expect(listados.every((c) => c.empresaId === empresaA.id)).toBe(true);
    expect(listados.some((c) => c.id === clienteB.id)).toBe(false);
  });

  it('T7: Crear Cliente persiste bajo la Empresa correcta', async () => {
    const creado = await controller.crear(
      { nombre: `S-V1-03 Nuevo A ${suffix}`, email: `s-v1-03-nuevo-a-${suffix}@example.test` },
      sesionDe(usuarioA.id, empresaA.id),
    );

    expect(creado.empresaId).toBe(empresaA.id);
    // Lectura directa (sin scope) para probar la fila real en la BD.
    const fila = await prisma.cliente.findUniqueOrThrow({
      where: { id: creado.id },
      select: { id: true, empresaId: true, nombre: true },
    });
    expect(fila.empresaId).toBe(empresaA.id);
    // No se coló nada en B.
    const enB = await prismaFactory.forEmpresa(empresaB.id).cliente.findUnique({
      where: { id: creado.id },
    });
    expect(enB).toBeNull();
  });

  it('T8: un empresaId arbitrario del caller no cambia el tenant efectivo', async () => {
    // (a) La sesión declara empresaB, pero la Membership del actor es de
    //     empresaA: gana la Membership.
    const listados = await controller.listar(sesionDe(usuarioA.id, empresaB.id));
    expect(listados.map((c) => c.id)).toContain(clienteA.id);
    expect(listados.every((c) => c.empresaId === empresaA.id)).toBe(true);
    expect(listados.some((c) => c.id === clienteB.id)).toBe(false);
    await expect(
      controller.obtener(clienteB.id, sesionDe(usuarioA.id, empresaB.id)),
    ).rejects.toThrow(NotFoundException);

    // (b) El DTO intenta inyectar empresaId: la fila sigue yendo a A.
    const dtoConEmpresa = {
      nombre: `S-V1-03 Inyectado ${suffix}`,
      empresaId: empresaB.id,
    } as unknown as CreateClienteDto;
    const creado = await controller.crear(dtoConEmpresa, sesionDe(usuarioA.id, empresaA.id));
    const fila = await prisma.cliente.findUniqueOrThrow({
      where: { id: creado.id },
      select: { empresaId: true },
    });
    expect(fila.empresaId).toBe(empresaA.id);
  });

  it('T9: EmpresaScopedPrismaService sigue siendo el aislamiento final', async () => {
    const spy = jest.spyOn(prismaFactory, 'forEmpresa');

    await controller.listar(sesionDe(usuarioA.id, empresaA.id));
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.every(([id]) => typeof id === 'string')).toBe(true);
    // Todos los usos de esta superficie fueron con el empresaId de A.
    expect(new Set(spy.mock.calls.map(([id]) => id))).toEqual(new Set([empresaA.id]));

    // Y el enforcement sigue negando el acceso directo a la fila ajena.
    expect(
      await prismaFactory
        .forEmpresa(empresaA.id)
        .cliente.findUnique({ where: { id: clienteB.id } }),
    ).toBeNull();
    await expect(
      prismaFactory
        .forEmpresa(empresaA.id)
        .cliente.findUniqueOrThrow({ where: { id: clienteB.id } }),
    ).rejects.toThrow();
    spy.mockRestore();
  });

  it('I-SV3-07: ClientesService mantiene su firma legacy para ventas/tienda', async () => {
    // ventas.service.ts y tienda.service.ts siguen llamando
    // clientesService.obtener(empresaId, id) / calcularNivel(empresaId, id)
    // con un empresaId legacy: esa vía no se tocó en esta slice.
    const nivel = await clientesService.calcularNivel(empresaA.id, clienteA.id);
    expect(['NUEVO', 'FRECUENTE', 'VIP']).toContain(nivel);
    const obtenido = await clientesService.obtener(empresaA.id, clienteA.id);
    expect(obtenido.id).toBe(clienteA.id);
    await expect(clientesService.obtener(empresaB.id, clienteA.id)).rejects.toThrow(
      NotFoundException,
    );
  });
});
