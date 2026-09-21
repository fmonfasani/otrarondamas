import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { RegistrarAjusteDto } from './dto/registrar-ajuste.dto';

// Mismo patrón que ventas.service.ts: el cliente de
// EmpresaScopedPrismaService.forEmpresa() es un tipo dinámico generado
// por Prisma Client Extensions, no calza con Prisma.TransactionClient
// del cliente base — se extrae el tipo real de $transaction de ESE
// cliente en vez de anotar un tipo genérico incompatible.
type EmpresaScopedClient = ReturnType<EmpresaScopedPrismaService['forEmpresa']>;
type EmpresaScopedTx = Parameters<Parameters<EmpresaScopedClient['$transaction']>[0]>[0];

/**
 * Fase 1 (RF-11 / INV-CONS-*): consulta de stock, solo lectura.
 * Fase 2 (INV-AJ-*): ajustes manuales — agrega registrarAjuste().
 * No implementa un segundo mecanismo de descuento automático de stock
 * en ventas — ese ya existe y sigue viviendo en
 * VentasService.descontarStock() (INV-DISP-01/INV-INV-04: reusar, nunca
 * duplicar). Un ajuste manual es una operación distinta y explícita,
 * iniciada por una persona sobre un lote que ella elige — no reemplaza
 * ni imita el descuento automático de una venta.
 */
@Injectable()
export class InventarioService {
  constructor(private readonly prismaFactory: EmpresaScopedPrismaService) {}

  /**
   * Stock consolidado por producto (suma de Lote.cantidad).
   *
   * No usa Prisma `groupBy`: empresaScopeExtension (ver
   * prisma/empresa-scope.extension.ts) solo tiene manejo explícito de
   * aislamiento para un set fijo de operaciones — groupBy no está en esa
   * lista, así que una query con groupBy sobre un modelo con empresaId
   * falla explícito en vez de saltarse el filtro en silencio (comportamiento
   * intencional de ese extension). En vez de ampliar ese archivo
   * compartido — usado por todos los módulos, y su propio comentario
   * documenta por qué cada operación se agrega ahí explícitamente, no
   * por comodidad — esta fase calcula el consolidado en memoria a partir
   * de un findMany de Lote (sí soportado), que a esta escala (miles de
   * productos, pocos lotes cada uno) es una consulta liviana. Si el
   * volumen crece lo suficiente para que esto sea un problema real, ese
   * es el momento de extender empresaScopeExtension con groupBy, con su
   * propia revisión — no antes.
   */
  async stockConsolidado(empresaId: string, search?: string, soloConStockBajo?: boolean) {
    const db = this.prismaFactory.forEmpresa(empresaId);

    const whereProducto: Prisma.ProductoWhereInput = {
      activo: true,
      /* eslint-disable indent -- falso positivo conocido de la regla
         `indent` base con un ternario que devuelve un objeto anidado
         (mismo patrón que catalogo.controller.ts) */
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' } },
              { codigoInterno: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      /* eslint-enable indent */
    };

    const productos = await db.producto.findMany({
      where: whereProducto,
      orderBy: { nombre: 'asc' },
      ...(search ? { take: 50 } : {}),
    });

    const productoIds = productos.map((p) => p.id);
    const lotes = await db.lote.findMany({
      where: { productoId: { in: productoIds } },
      select: { productoId: true, cantidad: true },
    });

    const stockPorProducto = new Map<string, number>();
    for (const lote of lotes) {
      const actual = stockPorProducto.get(lote.productoId) ?? 0;
      stockPorProducto.set(lote.productoId, actual + Number(lote.cantidad));
    }

    const resultado = productos.map((producto) => ({
      productoId: producto.id,
      nombre: producto.nombre,
      codigoInterno: producto.codigoInterno,
      categoriaId: producto.categoriaId,
      unidadBase: producto.unidadBase,
      stockTotal: stockPorProducto.get(producto.id) ?? 0,
      // INV-AL-01: sin Producto.stockMinimo todavía (requiere migración,
      // ver roadmap Fase 4) — stockBajo siempre false por ahora, campo
      // presente en la respuesta para que el frontend no tenga que
      // cambiar de shape cuando se agregue el umbral real.
      stockMinimo: null as number | null,
      stockBajo: false,
    }));

    if (!soloConStockBajo) {
      return resultado;
    }
    // Hoy stockBajo siempre es false (ver comentario arriba) — el filtro
    // ya está implementado para no tener que tocar el controller cuando
    // se agregue stockMinimo real, aunque por ahora siempre devuelve [].
    return resultado.filter((r) => r.stockBajo);
  }

  /**
   * Registra un ajuste manual (INV-AJ-01/02/03) sobre un lote existente.
   * `dto.cantidad` es la variación (positiva suma, negativa resta), no
   * el total resultante.
   *
   * Concurrencia (INV-AJ-03): no se hace un read-then-write del stock
   * actual para decidir si el ajuste negativo es válido — eso sería
   * vulnerable a que dos ajustes concurrentes lean el mismo valor
   * "viejo" y ambos se crean válidos cuando juntos dejarían el lote
   * negativo. En cambio, se ejecuta un UPDATE condicional
   * (updateMany con `cantidad: { gte: -dto.cantidad }` en el WHERE) que
   * la base de datos evalúa atómicamente contra el valor actual en ese
   * instante: si el UPDATE afecta 0 filas, quiere decir que la condición
   * no se cumplió (con los datos ya actualizados por cualquier otra
   * transacción concurrente), y se aborta.
   *
   * Trazabilidad (INV-AJ-02): el MovimientoStock se crea en la MISMA
   * transacción que el UPDATE del lote — nunca uno sin el otro. No hay
   * ningún camino que modifique Lote.cantidad sin dejar el movimiento
   * que lo explica.
   */
  async registrarAjuste(empresaId: string, dto: RegistrarAjusteDto, usuarioId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);

    const lote = await db.lote.findUnique({ where: { id: dto.loteId } });
    if (!lote) {
      throw new NotFoundException('Lote no encontrado');
    }

    return db.$transaction(async (tx) => {
      const resultado = await this.aplicarAjusteAtomico(tx, empresaId, dto.loteId, dto.cantidad);
      if (resultado.count === 0) {
        // La condición `cantidad + dto.cantidad >= 0` no se cumplió
        // (alguien más ajustó/descontó este lote entre el findUnique de
        // arriba y este punto, o el valor ya no alcanza) — no hay nada
        // que "reintentar" automáticamente: es información real para
        // quien está ajustando, no un error transitorio a ocultar.
        throw new BadRequestException(
          'El ajuste dejaría el lote con cantidad negativa (puede haber cambiado por otra operación concurrente) — verificá el stock actual y reintentá.',
        );
      }

      return tx.movimientoStock.create({
        data: {
          empresaId,
          productoId: lote.productoId,
          loteId: dto.loteId,
          tipoMovimiento: dto.cantidad > 0 ? 'Entrada' : 'Salida',
          cantidad: Math.abs(dto.cantidad),
          motivo: `AjusteManual: ${dto.motivo}`,
          usuarioId,
        },
      });
    });
  }

  private async aplicarAjusteAtomico(
    tx: EmpresaScopedTx,
    empresaId: string,
    loteId: string,
    cantidad: number,
  ) {
    // Prisma no soporta `cantidad: { gte: <expresión con el campo> }` en
    // un updateMany tipado — se usa $executeRaw parametrizado (nunca
    // interpolación de string) para el UPDATE condicional atómico.
    // empresaId se incluye en el WHERE explícitamente: $executeRaw NO
    // pasa por empresaScopeExtension (ese extension solo intercepta
    // llamadas al Prisma Client normal, no SQL crudo), así que el
    // aislamiento multiempresa acá es responsabilidad de esta query, no
    // del extension.
    const filas = await tx.$executeRaw(Prisma.sql`
      UPDATE "Lote"
      SET "cantidad" = "cantidad" + ${cantidad}, "updatedAt" = now()
      WHERE "id" = ${loteId} AND "empresaId" = ${empresaId} AND "cantidad" + ${cantidad} >= 0
    `);
    return { count: filas };
  }
}
