import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReglaFidelizacion } from '@prisma/client';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { CreateReglaFidelizacionDto } from './dto/create-regla-fidelizacion.dto';
import { UpdateReglaFidelizacionDto } from './dto/update-regla-fidelizacion.dto';
import type { NivelFidelidad } from '../clientes/clientes.service';

// nivelRequerido es un umbral MÍNIMO de acceso, no un nivel exacto —
// confirmado con el dueño en la sesión de Fase 5: NUEVO < FRECUENTE <
// VIP, un cliente VIP también recibe las reglas configuradas para
// FRECUENTE y NUEVO (el nivel más alto desbloquea los de abajo también).
const RANGO_NIVEL: Record<NivelFidelidad, number> = {
  NUEVO: 0,
  FRECUENTE: 1,
  VIP: 2,
};

interface ItemParaDescuento {
  familiaId: string;
  subfamiliaId: string;
  tipoId: string;
  subtipoId: string;
  marca: string | null;
  cantidad: number;
}

/**
 * Fase 4 del roadmap de Fidelización: CRUD de ReglaFidelizacion —
 * combina un nivel (calculado por ClientesService.calcularNivel(), ver
 * Fase 3) con un descuento y un alcance opcional (categoría, marca,
 * cantidad mínima).
 *
 * Fase 5: aplicación automática en VentasService — ver
 * calcularDescuentoAplicable() más abajo.
 */
@Injectable()
export class FidelizacionService {
  constructor(private readonly prismaFactory: EmpresaScopedPrismaService) {}

  async listar(empresaId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
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

  async obtener(empresaId: string, id: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const regla = await db.reglaFidelizacion.findUnique({
      where: { id },
      include: {
        familia: { select: { nombre: true } },
        subfamilia: { select: { nombre: true } },
        tipo: { select: { nombre: true } },
        subtipo: { select: { nombre: true } },
      },
    });
    if (!regla) {
      throw new NotFoundException('Regla de fidelización no encontrada');
    }
    return regla;
  }

  async crear(empresaId: string, dto: CreateReglaFidelizacionDto) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    await this.verificarNivelesCatalogo(empresaId, dto);
    // Prisma.ReglaFidelizacionUncheckedCreateInput explícito: sin esta
    // anotación, a través del tipo genérico que devuelve
    // empresaScopeExtension, TypeScript no logra resolver el
    // Exact<XOR<...>> que Prisma exige para `create` (mismo patrón que
    // Cliente/Proveedor/Producto).
    const data: Prisma.ReglaFidelizacionUncheckedCreateInput = { ...dto, empresaId };
    return db.reglaFidelizacion.create({ data });
  }

  async actualizar(empresaId: string, id: string, dto: UpdateReglaFidelizacionDto) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const existente = await db.reglaFidelizacion.findUnique({ where: { id } });
    if (!existente) {
      throw new NotFoundException('Regla de fidelización no encontrada');
    }
    await this.verificarNivelesCatalogo(empresaId, dto);
    return db.reglaFidelizacion.update({ where: { id }, data: dto });
  }

  /**
   * A diferencia de Producto (donde los 4 niveles son obligatorios y
   * deben encadenar), acá cada nivel es un filtro de alcance
   * independiente y opcional — se verifica solo que cada uno indicado
   * exista y pertenezca a esta empresa, sin exigir que formen una cadena
   * entre sí (una regla puede apuntar a una Familia entera sin acotar
   * Subfamilia/Tipo/Subtipo).
   */
  private async verificarNivelesCatalogo(
    empresaId: string,
    dto: Pick<CreateReglaFidelizacionDto, 'familiaId' | 'subfamiliaId' | 'tipoId' | 'subtipoId'>,
  ) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    if (dto.familiaId) {
      const familia = await db.familia.findUnique({ where: { id: dto.familiaId } });
      if (!familia) throw new NotFoundException('Familia no encontrada');
    }
    if (dto.subfamiliaId) {
      const subfamilia = await db.subfamilia.findUnique({ where: { id: dto.subfamiliaId } });
      if (!subfamilia) throw new NotFoundException('Subfamilia no encontrada');
    }
    if (dto.tipoId) {
      const tipo = await db.tipo.findUnique({ where: { id: dto.tipoId } });
      if (!tipo) throw new NotFoundException('Tipo no encontrado');
    }
    if (dto.subtipoId) {
      const subtipo = await db.subtipo.findUnique({ where: { id: dto.subtipoId } });
      if (!subtipo) throw new NotFoundException('Subtipo no encontrado');
    }
  }

  /**
   * Fase 5: reglas activas de esta empresa, para pasarle a
   * calcularDescuentoAplicable() UNA sola vez por venta (no una consulta
   * por cada ítem del carrito) — ver ventas.service.ts.
   */
  async listarReglasActivas(empresaId: string): Promise<ReglaFidelizacion[]> {
    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.reglaFidelizacion.findMany({ where: { activo: true } });
  }

  /**
   * Fase 5: para UN ítem del carrito (ya resuelto a su Producto — ver
   * ventas.service.ts) y la lista de reglas activas de la empresa (ver
   * listarReglasActivas()), devuelve cuál da el MAYOR % de descuento, o
   * null si ninguna aplica. Sin I/O — función pura sobre los datos ya
   * cargados, para poder llamarla una vez por ítem sin golpear la base
   * en cada llamada.
   *
   * Reglas de matching (todas confirmadas con el dueño):
   * - nivelRequerido es un umbral MÍNIMO (VIP recibe también lo de
   *   FRECUENTE/NUEVO) — ver RANGO_NIVEL arriba.
   * - Cada nivel de alcance (familia/subfamilia/tipo/subtipo/marca) es
   *   independiente y opcional: si la regla lo define, el ítem debe
   *   matchearlo EXACTO; si la regla lo deja null, ese nivel no filtra
   *   nada (aplica a cualquier valor del ítem en ese nivel).
   * - cantidadMinima se compara contra item.cantidad (del ítem, no del
   *   carrito completo) — ver comentario en schema.prisma.
   * - Si varias reglas matchean, gana la de MAYOR descuentoPorcentaje
   *   (nunca se suman, para no dejar vender con pérdida por acumular
   *   reglas mal configuradas).
   *
   * Sin cliente (nivelCliente === null, ver Venta.clienteId opcional en
   * RF-05 "permitir ventas sin identificar al cliente"), ninguna regla
   * aplica — no hay nivel de fidelidad que evaluar.
   */
  calcularDescuentoAplicable(
    reglasActivas: ReglaFidelizacion[],
    nivelCliente: NivelFidelidad | null,
    item: ItemParaDescuento,
  ): { reglaId: string; descuentoPorcentaje: number } | null {
    if (!nivelCliente) {
      return null;
    }

    let mejor: { reglaId: string; descuentoPorcentaje: number } | null = null;
    for (const regla of reglasActivas) {
      if (RANGO_NIVEL[nivelCliente] < RANGO_NIVEL[regla.nivelRequerido]) {
        continue;
      }
      if (regla.familiaId && regla.familiaId !== item.familiaId) continue;
      if (regla.subfamiliaId && regla.subfamiliaId !== item.subfamiliaId) continue;
      if (regla.tipoId && regla.tipoId !== item.tipoId) continue;
      if (regla.subtipoId && regla.subtipoId !== item.subtipoId) continue;
      if (regla.marca && regla.marca !== item.marca) continue;
      if (regla.cantidadMinima && item.cantidad < regla.cantidadMinima) continue;

      const descuentoPorcentaje = Number(regla.descuentoPorcentaje);
      if (!mejor || descuentoPorcentaje > mejor.descuentoPorcentaje) {
        mejor = { reglaId: regla.id, descuentoPorcentaje };
      }
    }
    return mejor;
  }
}
