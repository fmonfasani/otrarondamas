import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';

/**
 * Fase 1 del roadmap de inventario (RF-11 / INV-CONS-*): solo lectura.
 * No implementa un segundo mecanismo de descuento de stock — ese ya
 * existe y sigue viviendo en VentasService.descontarStock() (INV-DISP-01
 * / INV-INV-04 de la SPEC especializada: reusar, nunca duplicar).
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
}
