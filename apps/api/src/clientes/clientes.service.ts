import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

// Fase 3 del roadmap de Fidelización: umbrales de compras confirmadas
// para cada nivel, configurables por env var (mismo patrón que
// INVENTARIO_ALERTA_VENCIMIENTO_DIAS en inventario.service.ts) — no
// hardcodeados, para poder ajustarlos sin una migración si el dueño
// decide cambiarlos más adelante. Confirmados con el dueño: Nuevo 0-2,
// Frecuente 3-9, VIP 10+.
export type NivelFidelidad = 'NUEVO' | 'FRECUENTE' | 'VIP';

/**
 * Fase 1 del roadmap de Fidelización: CRUD mínimo de Cliente — base
 * bloqueante para todo lo demás (niveles de fidelidad, reglas de
 * descuento). El permiso `clientes.gestionar` ya existía en el seed
 * desde el scaffolding inicial, sin uso real hasta este módulo.
 *
 * Sin tocar CuentaCorriente/Deuda (RF-10, cuenta corriente) — eso es
 * otro módulo aparte, este solo cubre los datos básicos del cliente
 * (nombre, email, teléfono, dirección).
 */
@Injectable()
export class ClientesService {
  constructor(private readonly prismaFactory: EmpresaScopedPrismaService) {}

  async listar(empresaId: string, search?: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const where: Prisma.ClienteWhereInput = {
      /* eslint-disable indent -- falso positivo conocido de la regla
         `indent` base con un ternario que devuelve un objeto anidado
         (mismo patrón que catalogo.controller.ts) */
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      /* eslint-enable indent */
    };
    const clientes = await db.cliente.findMany({
      where,
      orderBy: { nombre: 'asc' },
      ...(search ? { take: 50 } : {}),
    });
    // Fase 3: un nivel por cada cliente listado. N+1 consultas
    // aceptable acá — search ya limita a 50 resultados, y sin search es
    // el mismo criterio que stockConsolidado() (no hay paginación
    // todavía en ningún listado del proyecto).
    return Promise.all(
      clientes.map(async (c) => ({ ...c, nivel: await this.calcularNivel(empresaId, c.id) })),
    );
  }

  async obtener(empresaId: string, id: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const cliente = await db.cliente.findUnique({ where: { id } });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }
    const nivel = await this.calcularNivel(empresaId, id);
    return { ...cliente, nivel };
  }

  /**
   * Fase 3 del roadmap de Fidelización: nivel calculado al vuelo a
   * partir del historial real — nunca se persiste un campo `nivel`
   * desnormalizado que pueda desactualizarse (mismo criterio que
   * InventarioService.stockConsolidado(), que tampoco persiste un
   * total). Cuenta Venta (estado 'CONFIRMADA', ver ventas.service.ts —
   * hoy es el único estado que existe, no hay anulación implementada
   * todavía) + Pedido (estado 'CONFIRMADO') asociados a este cliente.
   */
  async calcularNivel(empresaId: string, clienteId: string): Promise<NivelFidelidad> {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const [ventasConfirmadas, pedidosConfirmados] = await Promise.all([
      db.venta.count({ where: { clienteId, estado: 'CONFIRMADA' } }),
      db.pedido.count({ where: { clienteId, estado: 'CONFIRMADO' } }),
    ]);
    const totalCompras = ventasConfirmadas + pedidosConfirmados;

    const umbralVip = Number(process.env.FIDELIZACION_UMBRAL_VIP ?? 10);
    const umbralFrecuente = Number(process.env.FIDELIZACION_UMBRAL_FRECUENTE ?? 3);

    if (totalCompras >= umbralVip) {
      return 'VIP';
    }
    if (totalCompras >= umbralFrecuente) {
      return 'FRECUENTE';
    }
    return 'NUEVO';
  }

  async crear(empresaId: string, dto: CreateClienteDto) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    if (dto.email) {
      await this.verificarEmailLibre(empresaId, dto.email);
    }
    // Prisma.ClienteUncheckedCreateInput explícito: sin esta anotación,
    // a través del tipo genérico que devuelve empresaScopeExtension,
    // TypeScript no logra resolver el Exact<XOR<...>> que Prisma exige
    // para `create` (mismo patrón que Proveedor/Producto).
    const data: Prisma.ClienteUncheckedCreateInput = { ...dto, empresaId };
    return db.cliente.create({ data });
  }

  async actualizar(empresaId: string, id: string, dto: UpdateClienteDto) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const existente = await db.cliente.findUnique({ where: { id } });
    if (!existente) {
      throw new NotFoundException('Cliente no encontrado');
    }
    if (dto.email && dto.email !== existente.email) {
      await this.verificarEmailLibre(empresaId, dto.email, id);
    }
    return db.cliente.update({ where: { id }, data: dto });
  }

  /**
   * Cliente.email es @@unique([empresaId, email]) — se verifica acá,
   * antes del create/update, para devolver un 400 explícito ("ya
   * existe un cliente con ese email") en vez de dejar que Postgres
   * rechace con un error de constraint menos claro para quien usa el
   * panel.
   */
  private async verificarEmailLibre(empresaId: string, email: string, excluirId?: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const existente = await db.cliente.findFirst({ where: { email } });
    if (existente && existente.id !== excluirId) {
      throw new BadRequestException(`Ya existe un cliente con el email ${email}`);
    }
  }
}
