import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

// Phase 3 of the Loyalty roadmap: confirmed purchase thresholds for each
// level, configurable by env var (same pattern as
// INVENTARIO_ALERTA_VENCIMIENTO_DIAS in inventory.service.ts) — not
// hardcoded, so they can be adjusted without a migration if the owner
// decides to change them later. Confirmed with the owner: New 0-2,
// Frequent 3-9, VIP 10+.
export type LoyaltyLevel = 'NUEVO' | 'FRECUENTE' | 'VIP';

/**
 * Phase 1 of the Loyalty roadmap: minimal Cliente CRUD — blocking base
 * for everything else (loyalty levels, discount rules). The
 * `clientes.gestionar` permission already existed in the seed since the
 * initial scaffolding, with no real use until this module.
 *
 * Without touching CuentaCorriente/Deuda (RF-10, current account) — that is
 * another separate module, this one only covers the customer's basic data
 * (name, email, phone, address).
 */
@Injectable()
export class CustomersService {
  constructor(private readonly prismaFactory: CompanyScopedPrismaService) {}

  async list(companyId: string, search?: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const where: Prisma.ClienteWhereInput = {
      /* eslint-disable indent -- known false positive of the base `indent`
         rule with a ternary returning a nested object (same pattern as
         catalog.controller.ts) */
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
    const customers = await db.cliente.findMany({
      where,
      orderBy: { nombre: 'asc' },
      ...(search ? { take: 50 } : {}),
    });
    // Phase 3: one level per listed customer. N+1 queries acceptable here —
    // search already limits to 50 results, and without search it is the same
    // criterion as consolidatedStock() (there is no pagination yet in any
    // listing of the project).
    return Promise.all(
      customers.map(async (c) => ({ ...c, nivel: await this.calculateLevel(companyId, c.id) })),
    );
  }

  async get(companyId: string, id: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const customer = await db.cliente.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }
    const level = await this.calculateLevel(companyId, id);
    return { ...customer, nivel: level };
  }

  /**
   * Phase 3 of the Loyalty roadmap: level computed on the fly from the real
   * history — a denormalized `nivel` field that could go stale is never
   * persisted (same criterion as InventoryService.consolidatedStock(), which
   * does not persist a total either). Counts Venta (estado 'CONFIRMADA', see
   * sales.service.ts — today it is the only state that exists, no
   * cancellation is implemented yet) + Pedido (estado 'CONFIRMADO')
   * associated to this customer.
   */
  async calculateLevel(companyId: string, customerId: string): Promise<LoyaltyLevel> {
    const db = this.prismaFactory.forCompany(companyId);
    const [confirmedSales, confirmedOrders] = await Promise.all([
      db.venta.count({ where: { clienteId: customerId, estado: 'CONFIRMADA' } }),
      db.pedido.count({ where: { clienteId: customerId, estado: 'CONFIRMADO' } }),
    ]);
    const totalPurchases = confirmedSales + confirmedOrders;

    const vipThreshold = Number(process.env.FIDELIZACION_UMBRAL_VIP ?? 10);
    const frequentThreshold = Number(process.env.FIDELIZACION_UMBRAL_FRECUENTE ?? 3);

    if (totalPurchases >= vipThreshold) {
      return 'VIP';
    }
    if (totalPurchases >= frequentThreshold) {
      return 'FRECUENTE';
    }
    return 'NUEVO';
  }

  async create(companyId: string, dto: CreateCustomerDto) {
    const db = this.prismaFactory.forCompany(companyId);
    if (dto.email) {
      await this.verifyEmailAvailable(companyId, dto.email);
    }
    // Explicit Prisma.ClienteUncheckedCreateInput: without this annotation,
    // through the generic type returned by companyScopeExtension, TypeScript
    // cannot resolve the Exact<XOR<...>> that Prisma requires for `create`
    // (same pattern as Proveedor/Producto).
    const data: Prisma.ClienteUncheckedCreateInput = { ...dto, empresaId: companyId };
    return db.cliente.create({ data });
  }

  async update(companyId: string, id: string, dto: UpdateCustomerDto) {
    const db = this.prismaFactory.forCompany(companyId);
    const existing = await db.cliente.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Cliente no encontrado');
    }
    if (dto.email && dto.email !== existing.email) {
      await this.verifyEmailAvailable(companyId, dto.email, id);
    }
    return db.cliente.update({ where: { id }, data: dto });
  }

  /**
   * Cliente.email is @@unique([empresaId, email]) — checked here, before
   * create/update, to return an explicit 400 ('a customer with that email
   * already exists') instead of letting Postgres reject with a less clear
   * constraint error for whoever uses the panel.
   */
  private async verifyEmailAvailable(companyId: string, email: string, excludeId?: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const existing = await db.cliente.findFirst({ where: { email } });
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException(`Ya existe un cliente con el email ${email}`);
    }
  }
}
