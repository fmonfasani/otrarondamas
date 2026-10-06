import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReglaFidelizacion } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { CreateLoyaltyRuleDto } from './dto/create-loyalty-rule.dto';
import { UpdateLoyaltyRuleDto } from './dto/update-loyalty-rule.dto';
import type { LoyaltyLevel } from '../customers/customers.service';

// nivelRequerido is a MINIMUM access threshold, not an exact level —
// confirmed with the owner in the Phase 5 session: NUEVO < FRECUENTE <
// VIP, a VIP customer also receives the rules configured for FRECUENTE and
// NUEVO (the highest level unlocks the lower ones too).
const LEVEL_RANGE: Record<LoyaltyLevel, number> = {
  NUEVO: 0,
  FRECUENTE: 1,
  VIP: 2,
};

interface ItemForDiscount {
  familiaId: string;
  subfamiliaId: string;
  tipoId: string;
  subtipoId: string;
  marca: string | null;
  cantidad: number;
}

/**
 * Phase 4 of the Loyalty roadmap: CRUD of ReglaFidelizacion — combines a
 * level (computed by CustomersService.calculateLevel(), see Phase 3) with a
 * discount and an optional scope (category, brand, minimum quantity).
 *
 * Phase 5: automatic application in SalesService — see
 * calculateApplicableDiscount() below.
 */
@Injectable()
export class LoyaltyService {
  constructor(private readonly prismaFactory: CompanyScopedPrismaService) {}

  async list(companyId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    return db.reglaFidelizacion.findMany({
      include: {
        familia: { select: { nombre: true } },
        subfamilia: { select: { nombre: true } },
        tipo: { select: { nombre: true } },
        subtipo: { select: { nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(companyId: string, id: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const rule = await db.reglaFidelizacion.findUnique({
      where: { id },
      include: {
        familia: { select: { nombre: true } },
        subfamilia: { select: { nombre: true } },
        tipo: { select: { nombre: true } },
        subtipo: { select: { nombre: true } },
      },
    });
    if (!rule) {
      throw new NotFoundException('Regla de fidelización no encontrada');
    }
    return rule;
  }

  async create(companyId: string, dto: CreateLoyaltyRuleDto) {
    const db = this.prismaFactory.forCompany(companyId);
    await this.verifyCatalogLevels(companyId, dto);
    // Explicit Prisma.ReglaFidelizacionUncheckedCreateInput: without this
    // annotation, through the generic type returned by companyScopeExtension,
    // TypeScript cannot resolve the Exact<XOR<...>> that Prisma requires for
    // `create` (same pattern as Cliente/Proveedor/Producto).
    const data: Prisma.ReglaFidelizacionUncheckedCreateInput = { ...dto, empresaId: companyId };
    return db.reglaFidelizacion.create({ data });
  }

  async update(companyId: string, id: string, dto: UpdateLoyaltyRuleDto) {
    const db = this.prismaFactory.forCompany(companyId);
    const existing = await db.reglaFidelizacion.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Regla de fidelización no encontrada');
    }
    await this.verifyCatalogLevels(companyId, dto);
    return db.reglaFidelizacion.update({ where: { id }, data: dto });
  }

  /**
   * Unlike Producto (where the 4 levels are mandatory and must chain), here
   * each level is an independent, optional scope filter — it only verifies
   * that each one given exists and belongs to this company, without
   * requiring them to form a chain (a rule can point to a whole Familia
   * without narrowing Subfamilia/Tipo/Subtipo).
   */
  private async verifyCatalogLevels(
    companyId: string,
    dto: Pick<CreateLoyaltyRuleDto, 'familiaId' | 'subfamiliaId' | 'tipoId' | 'subtipoId'>,
  ) {
    const db = this.prismaFactory.forCompany(companyId);
    if (dto.familiaId) {
      const family = await db.familia.findUnique({ where: { id: dto.familiaId } });
      if (!family) throw new NotFoundException('Familia no encontrada');
    }
    if (dto.subfamiliaId) {
      const subfamily = await db.subfamilia.findUnique({ where: { id: dto.subfamiliaId } });
      if (!subfamily) throw new NotFoundException('Subfamilia no encontrada');
    }
    if (dto.tipoId) {
      const type = await db.tipo.findUnique({ where: { id: dto.tipoId } });
      if (!type) throw new NotFoundException('Tipo no encontrado');
    }
    if (dto.subtipoId) {
      const subtype = await db.subtipo.findUnique({ where: { id: dto.subtipoId } });
      if (!subtype) throw new NotFoundException('Subtipo no encontrado');
    }
  }

  /**
   * Phase 5: active rules of this company, to pass to
   * calculateApplicableDiscount() ONCE per sale (not one query per cart
   * item) — see sales.service.ts.
   */
  async listActiveRules(companyId: string): Promise<ReglaFidelizacion[]> {
    const db = this.prismaFactory.forCompany(companyId);
    return db.reglaFidelizacion.findMany({ where: { activo: true } });
  }

  /**
   * Phase 5: for ONE cart item (already resolved to its Producto — see
   * sales.service.ts) and the list of the company's active rules (see
   * listActiveRules()), returns the one giving the HIGHEST discount %, or
   * null if none applies. No I/O — pure function over already loaded data,
   * so it can be called once per item without hitting the database on each
   * call.
   *
   * Matching rules (all confirmed with the owner):
   * - nivelRequerido is a MINIMUM threshold (VIP also receives what is for
   *   FRECUENTE/NUEVO) — see LEVEL_RANGE above.
   * - Each scope level (familia/subfamilia/tipo/subtipo/marca) is
   *   independent and optional: if the rule defines it, the item must match
   *   it EXACTLY; if the rule leaves it null, that level filters nothing
   *   (applies to any value of the item at that level).
   * - cantidadMinima is compared against item.cantidad (the item's, not the
   *   whole cart's) — see comment in schema.prisma.
   * - If several rules match, the one with the HIGHEST descuentoPorcentaje
   *   wins (they are never summed, so as not to allow selling at a loss by
   *   stacking badly configured rules).
   *
   * Without a customer (customerLevel === null, see optional Venta.clienteId
   * in RF-05 'allow sales without identifying the customer'), no rule
   * applies — there is no loyalty level to evaluate.
   */
  calculateApplicableDiscount(
    activeRules: ReglaFidelizacion[],
    customerLevel: LoyaltyLevel | null,
    item: ItemForDiscount,
  ): { reglaId: string; descuentoPorcentaje: number } | null {
    if (!customerLevel) {
      return null;
    }

    let best: { reglaId: string; descuentoPorcentaje: number } | null = null;
    for (const rule of activeRules) {
      if (LEVEL_RANGE[customerLevel] < LEVEL_RANGE[rule.nivelRequerido]) {
        continue;
      }
      if (rule.familiaId && rule.familiaId !== item.familiaId) continue;
      if (rule.subfamiliaId && rule.subfamiliaId !== item.subfamiliaId) continue;
      if (rule.tipoId && rule.tipoId !== item.tipoId) continue;
      if (rule.subtipoId && rule.subtipoId !== item.subtipoId) continue;
      if (rule.marca && rule.marca !== item.marca) continue;
      if (rule.cantidadMinima && item.cantidad < rule.cantidadMinima) continue;

      const discountPercentage = Number(rule.descuentoPorcentaje);
      if (!best || discountPercentage > best.descuentoPorcentaje) {
        best = { reglaId: rule.id, descuentoPorcentaje: discountPercentage };
      }
    }
    return best;
  }
}
