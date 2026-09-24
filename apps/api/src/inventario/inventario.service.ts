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
 * `descontarStock()` (movido acá desde VentasService en la Fase 4 de
 * Tienda Online, RF-06) es el ÚNICO mecanismo de descuento automático
 * de stock del sistema — lo usan tanto VentasService (venta presencial)
 * como PedidosService (confirmar un pedido online). INV-DISP-01/INV-INV-04:
 * reusar, nunca duplicar esa lógica en un segundo lugar. Un ajuste
 * manual (registrarAjuste) es una operación distinta y explícita,
 * iniciada por una persona sobre un lote que ella elige — no reemplaza
 * ni imita el descuento automático.
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
  async stockConsolidado(
    empresaId: string,
    search?: string,
    soloConStockBajo?: boolean,
    // Fase de diseño de Tienda Online: filtro por Familia/Subfamilia
    // para la navegación por categoría del catálogo público (antes solo
    // existía el buscador de texto libre) — reusado tal cual por el
    // panel interno si algún día necesita lo mismo, sin duplicar esta
    // query. familiaId filtra la Familia entera; subfamiliaId (si se
    // manda junto) acota más dentro de esa Familia.
    familiaId?: string,
    subfamiliaId?: string,
  ) {
    const db = this.prismaFactory.forEmpresa(empresaId);

    const whereProducto: Prisma.ProductoWhereInput = {
      activo: true,
      ...(familiaId ? { familiaId } : {}),
      ...(subfamiliaId ? { subfamiliaId } : {}),
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

    // El límite de 50 no solo protege la búsqueda de texto: filtrar por
    // una Familia entera (ej. "Bebidas") también puede traer cientos de
    // productos sin este tope — mismo motivo, mismo límite.
    const limitar = !!search || !!familiaId || !!subfamiliaId;
    const productos = await db.producto.findMany({
      where: whereProducto,
      orderBy: { nombre: 'asc' },
      ...(limitar ? { take: 50 } : {}),
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

    const resultado = productos.map((producto) => {
      const stockTotal = stockPorProducto.get(producto.id) ?? 0;
      const stockMinimo = Number(producto.stockMinimo);
      return {
        productoId: producto.id,
        nombre: producto.nombre,
        codigoInterno: producto.codigoInterno,
        familiaId: producto.familiaId,
        subfamiliaId: producto.subfamiliaId,
        tipoId: producto.tipoId,
        subtipoId: producto.subtipoId,
        unidadBase: producto.unidadBase,
        stockTotal,
        stockMinimo,
        // INV-AL-01: stockMinimo=0 (default de todo el catálogo
        // existente, ver migración) nunca dispara la alerta — un
        // producto sin umbral configurado explícitamente no se
        // considera "bajo stock", aunque su stockTotal también sea 0.
        stockBajo: stockMinimo > 0 && stockTotal <= stockMinimo,
      };
    });

    if (!soloConStockBajo) {
      return resultado;
    }
    return resultado.filter((r) => r.stockBajo);
  }

  /**
   * INV-AL-01/02/03: productos con stock por debajo de su mínimo
   * configurado, y lotes que vencen dentro de la ventana de anticipación
   * (7 días por defecto — D-09 del SDD lo dejaba como "propuesta
   * inicial, pendiente de confirmación"; se implementa configurable por
   * INVENTARIO_ALERTA_VENCIMIENTO_DIAS en vez de fijarlo en código, para
   * no bloquear la fase completa esperando esa confirmación formal).
   *
   * No reusa stockConsolidado() con soloConStockBajo=true para la parte
   * de stock bajo: ese método no tiene un límite de productos sin
   * `search`, y acá sí interesa explícitamente TODO el catálogo (una
   * alerta que omite productos por paginación no es una alerta
   * confiable).
   */
  async alertas(empresaId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const diasAnticipacion = Number(process.env.INVENTARIO_ALERTA_VENCIMIENTO_DIAS ?? 7);

    const productos = await db.producto.findMany({
      where: { activo: true, stockMinimo: { gt: 0 } },
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

    const stockBajo = productos
      .map((producto) => ({
        productoId: producto.id,
        nombre: producto.nombre,
        codigoInterno: producto.codigoInterno,
        stockTotal: stockPorProducto.get(producto.id) ?? 0,
        stockMinimo: Number(producto.stockMinimo),
      }))
      .filter((p) => p.stockTotal <= p.stockMinimo);

    const limiteVencimiento = new Date();
    limiteVencimiento.setDate(limiteVencimiento.getDate() + diasAnticipacion);
    const lotesPorVencer = await db.lote.findMany({
      where: { vencimiento: { lte: limiteVencimiento }, cantidad: { gt: 0 } },
      include: { producto: { select: { nombre: true, codigoInterno: true } } },
      orderBy: { vencimiento: 'asc' },
    });

    return {
      diasAnticipacion,
      stockBajo,
      lotesPorVencer: lotesPorVencer.map((lote) => ({
        loteId: lote.id,
        productoId: lote.productoId,
        productoNombre: lote.producto.nombre,
        codigoInterno: lote.producto.codigoInterno,
        numeroLote: lote.numeroLote,
        vencimiento: lote.vencimiento,
        cantidad: lote.cantidad,
      })),
    };
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

  /**
   * Descuenta `cantidad` del stock de un producto, tomando de los lotes
   * disponibles en orden FIFO por vencimiento (el lote que vence más
   * pronto se consume primero). Debe correr DENTRO de la transacción del
   * caller (crear la venta/confirmar el pedido) — nunca como paso
   * separado, para que la concurrencia quede protegida por la misma
   * atomicidad (INV-03/INV-06).
   *
   * D-09: no se filtran lotes vencidos de la selección — un lote vencido
   * puede seguir vendiéndose (decisión explícita del dueño, no bloqueo),
   * pero cada MovimientoStock que salga de un lote ya vencido al momento
   * de la operación queda marcado con `loteVencidoAlMomento: true`, para
   * auditoría permanente. Devuelve `true` si algún lote afectado estaba
   * vencido, para que el caller pueda armar una advertencia.
   *
   * `motivo`/`referenciaId` los define el caller: 'Venta' + id de Venta
   * (VentasService) o 'Venta' + id de Pedido (PedidosService, al
   * confirmar un pedido online — sigue siendo una venta real, solo que
   * se originó por ese canal, no se inventa un motivo nuevo).
   *
   * Genera un MovimientoStock tipo "Salida" por cada lote afectado.
   * Rechaza la operación completa (revierte la transacción) si la suma
   * de cantidad disponible en todos los lotes del producto no alcanza —
   * D-09 dejó esto sin cambios: el stock insuficiente se sigue
   * rechazando siempre, no tiene mecanismo de excepción/autorización.
   */
  async descontarStock(
    tx: EmpresaScopedTx,
    empresaId: string,
    productoId: string,
    cantidadRequerida: number,
    motivo: string,
    referenciaId: string,
    usuarioId: string | null,
  ): Promise<boolean> {
    const lotes = await tx.lote.findMany({
      where: { empresaId, productoId, cantidad: { gt: 0 } },
      orderBy: { vencimiento: 'asc' },
    });

    const stockTotal = lotes.reduce((acc, l) => acc + Number(l.cantidad), 0);
    if (stockTotal < cantidadRequerida) {
      throw new BadRequestException(
        `Stock insuficiente para el producto ${productoId}: disponible ${stockTotal}, requerido ${cantidadRequerida}`,
      );
    }

    const ahora = new Date();
    let restante = cantidadRequerida;
    let huboLoteVencido = false;
    for (const lote of lotes) {
      if (restante <= 0) break;
      const cantidadDeEsteLote = Math.min(restante, Number(lote.cantidad));
      const loteVencido = lote.vencimiento <= ahora;
      if (loteVencido) {
        huboLoteVencido = true;
      }

      await tx.lote.update({
        where: { id: lote.id },
        data: { cantidad: { decrement: cantidadDeEsteLote } },
      });

      await tx.movimientoStock.create({
        data: {
          empresaId,
          productoId,
          loteId: lote.id,
          tipoMovimiento: 'Salida',
          cantidad: cantidadDeEsteLote,
          motivo,
          referenciaId,
          usuarioId,
          loteVencidoAlMomento: loteVencido,
        },
      });

      restante -= cantidadDeEsteLote;
    }

    return huboLoteVencido;
  }
}
