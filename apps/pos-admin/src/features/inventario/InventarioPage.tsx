import { useEffect, useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Package,
  SlidersHorizontal,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type {
  StockConsolidado,
  Lote,
  MovimientoStock,
  AlertasInventario,
} from '@otrarondamas/shared-types';
import { Card, CardHeader, CardBody, Input, Button } from '../../components';
import { api, ApiError } from '../../lib/api';

/**
 * Fase 1 (INV-CONS-01/02/03/04): consulta de stock, solo lectura.
 * Fase 2 (INV-AJ-01/02/03/04): ajuste manual por lote. Fase 3 (alta de
 * lotes) redefinida vía Compras (RF-12) — no hay un endpoint aparte
 * acá. Fase 4 (INV-AL-01/02/03): panel de alertas arriba de la tabla.
 *
 * El formulario de ajuste se muestra siempre (mismo criterio que
 * CajaPage con caja.gastos: el frontend no oculta controles según
 * permisos, el backend rechaza con 403 si corresponde y ese error se
 * muestra tal cual) — no introduce un patrón nuevo de ocultamiento por
 * permiso en esta fase.
 */
export function InventarioPage() {
  const [stock, setStock] = useState<StockConsolidado[]>([]);
  const [search, setSearch] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [lotesPorProducto, setLotesPorProducto] = useState<Record<string, Lote[]>>({});
  const [movimientosPorProducto, setMovimientosPorProducto] = useState<
    Record<string, MovimientoStock[]>
  >({});
  const [cargandoDetalle, setCargandoDetalle] = useState<string | null>(null);
  const [loteEnAjuste, setLoteEnAjuste] = useState<string | null>(null);
  const [cantidadAjuste, setCantidadAjuste] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [enviandoAjuste, setEnviandoAjuste] = useState(false);
  const [errorAjuste, setErrorAjuste] = useState<string | null>(null);
  const [alertas, setAlertas] = useState<AlertasInventario | null>(null);

  const cargarStock = useCallback(async (terminoBusqueda: string) => {
    setCargando(true);
    setError(null);
    try {
      const datos = await api.stockConsolidado(terminoBusqueda || undefined);
      setStock(datos);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el inventario');
    } finally {
      setCargando(false);
    }
  }, []);

  // Debounce simple: evita pegarle a la API en cada tecla. Sin search
  // (campo vacío), carga el listado completo sin límite — mismo
  // contrato que GET /catalogo/productos.
  useEffect(() => {
    const timeout = setTimeout(() => {
      void cargarStock(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, cargarStock]);

  // Alertas: independiente del debounce de búsqueda, se carga una sola
  // vez al montar (no depende de `search`). Promise.resolve() saca el
  // setState del ciclo síncrono del efecto — mismo patrón que
  // ComprasPage/GoogleCallbackPage.
  useEffect(() => {
    void Promise.resolve().then(() =>
      api
        .alertasInventario()
        .then(setAlertas)
        .catch(() => {
          // Silencioso: las alertas son un plus informativo, no bloquean
          // el uso normal de la pantalla si fallan.
        }),
    );
  }, []);

  const cargarDetalleProducto = useCallback(async (productoId: string) => {
    setCargandoDetalle(productoId);
    try {
      const [lotes, movimientos] = await Promise.all([
        api.lotesDeProducto(productoId),
        api.movimientosDeProducto(productoId),
      ]);
      setLotesPorProducto((prev) => ({ ...prev, [productoId]: lotes }));
      setMovimientosPorProducto((prev) => ({ ...prev, [productoId]: movimientos }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el detalle');
    } finally {
      setCargandoDetalle(null);
    }
  }, []);

  async function expandirProducto(productoId: string) {
    if (expandido === productoId) {
      setExpandido(null);
      return;
    }
    setExpandido(productoId);
    if (lotesPorProducto[productoId] && movimientosPorProducto[productoId]) {
      return; // ya cargado, no repetir el fetch
    }
    await cargarDetalleProducto(productoId);
  }

  function abrirFormularioAjuste(loteId: string) {
    setLoteEnAjuste(loteId);
    setCantidadAjuste('');
    setMotivoAjuste('');
    setErrorAjuste(null);
  }

  async function enviarAjuste(productoId: string) {
    const cantidad = Number(cantidadAjuste);
    if (!Number.isInteger(cantidad) || cantidad === 0) {
      setErrorAjuste('La cantidad debe ser un número entero distinto de 0.');
      return;
    }
    if (!motivoAjuste.trim()) {
      setErrorAjuste('El motivo es obligatorio.');
      return;
    }
    if (!loteEnAjuste) return;

    setEnviandoAjuste(true);
    setErrorAjuste(null);
    try {
      await api.registrarAjuste({ loteId: loteEnAjuste, cantidad, motivo: motivoAjuste.trim() });
      setLoteEnAjuste(null);
      // Refresca el detalle del producto (nuevo stock del lote + el
      // movimiento recién creado) y el consolidado de la tabla — un
      // ajuste cambia ambos.
      await Promise.all([cargarDetalleProducto(productoId), cargarStock(search)]);
    } catch (err) {
      setErrorAjuste(err instanceof ApiError ? err.message : 'No se pudo registrar el ajuste');
    } finally {
      setEnviandoAjuste(false);
    }
  }

  const hayAlertas = alertas && (alertas.stockBajo.length > 0 || alertas.lotesPorVencer.length > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-bold">Inventario</h1>

      {hayAlertas && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alertas!.stockBajo.length > 0 && (
            <Card className="border-brand-error">
              <CardHeader className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-brand-error" />
                <h2 className="text-h3 font-bold">Stock bajo ({alertas!.stockBajo.length})</h2>
              </CardHeader>
              <CardBody>
                <ul className="space-y-1 text-sm">
                  {alertas!.stockBajo.slice(0, 5).map((item) => (
                    <li key={item.productoId} className="flex justify-between">
                      <span>{item.nombre}</span>
                      <span className="font-mono text-brand-error">
                        {item.stockTotal} / mín. {item.stockMinimo}
                      </span>
                    </li>
                  ))}
                </ul>
                {alertas!.stockBajo.length > 5 && (
                  <p className="text-xs text-gray-400 mt-2">
                    + {alertas!.stockBajo.length - 5} más
                  </p>
                )}
              </CardBody>
            </Card>
          )}
          {alertas!.lotesPorVencer.length > 0 && (
            <Card className="border-amber-500">
              <CardHeader className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h2 className="text-h3 font-bold">
                  Vencen en {alertas!.diasAnticipacion} días ({alertas!.lotesPorVencer.length})
                </h2>
              </CardHeader>
              <CardBody>
                <ul className="space-y-1 text-sm">
                  {alertas!.lotesPorVencer.slice(0, 5).map((lote) => (
                    <li key={lote.loteId} className="flex justify-between">
                      <span>{lote.productoNombre}</span>
                      <span className="font-mono text-amber-700">
                        {new Date(lote.vencimiento).toLocaleDateString('es-AR')}
                      </span>
                    </li>
                  ))}
                </ul>
                {alertas!.lotesPorVencer.length > 5 && (
                  <p className="text-xs text-gray-400 mt-2">
                    + {alertas!.lotesPorVencer.length - 5} más
                  </p>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <Input
            placeholder="Buscar por nombre o código interno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardBody>
          {error && <p className="text-brand-error mb-4">{error}</p>}

          {cargando ? (
            <p className="text-gray-500 text-center py-8">Cargando...</p>
          ) : stock.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {search ? 'Sin resultados para esa búsqueda.' : 'No hay productos cargados.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-2 pr-4 w-8"></th>
                    <th className="py-2 pr-4">Producto</th>
                    <th className="py-2 pr-4">Código</th>
                    <th className="py-2 pr-4 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((item) => (
                    <>
                      <tr
                        key={item.productoId}
                        onClick={() => void expandirProducto(item.productoId)}
                        className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                      >
                        <td className="py-2 pr-4 text-gray-400">
                          {expandido === item.productoId ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="py-2 pr-4 font-semibold">{item.nombre}</td>
                        <td className="py-2 pr-4 text-gray-500 font-mono text-xs">
                          {item.codigoInterno}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {item.stockTotal} {item.unidadBase.toLowerCase()}
                        </td>
                      </tr>
                      {expandido === item.productoId && (
                        <tr key={`${item.productoId}-detalle`}>
                          <td colSpan={4} className="bg-gray-50 px-4 py-4">
                            {cargandoDetalle === item.productoId ? (
                              <p className="text-gray-500 text-sm">Cargando detalle...</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h3 className="text-small font-semibold text-gray-600 mb-2 flex items-center gap-2">
                                    <Package className="w-4 h-4" /> Lotes
                                  </h3>
                                  {(lotesPorProducto[item.productoId] ?? []).length === 0 ? (
                                    <p className="text-gray-400 text-xs">Sin lotes registrados.</p>
                                  ) : (
                                    <ul className="space-y-2 text-xs">
                                      {(lotesPorProducto[item.productoId] ?? []).map((lote) => (
                                        <li key={lote.id}>
                                          <div className="flex justify-between items-center gap-2">
                                            <span className="font-mono text-gray-600">
                                              {lote.numeroLote}
                                            </span>
                                            <span className="text-gray-500">
                                              vence{' '}
                                              {new Date(lote.vencimiento).toLocaleDateString(
                                                'es-AR',
                                              )}
                                            </span>
                                            <span className="font-mono font-semibold">
                                              {lote.cantidad}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => abrirFormularioAjuste(lote.id)}
                                              className="text-gray-400 hover:text-brand-yellow"
                                              aria-label={`Ajustar stock del lote ${lote.numeroLote}`}
                                            >
                                              <SlidersHorizontal className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                          {loteEnAjuste === lote.id && (
                                            <div className="mt-2 p-3 bg-white border border-gray-200 rounded-md space-y-2">
                                              <div className="flex gap-2">
                                                <input
                                                  type="number"
                                                  step="1"
                                                  placeholder="Cantidad (+/-)"
                                                  value={cantidadAjuste}
                                                  onChange={(e) =>
                                                    setCantidadAjuste(e.target.value)
                                                  }
                                                  className="w-28 px-2 py-1 border border-gray-300 rounded text-xs"
                                                />
                                                <input
                                                  type="text"
                                                  placeholder="Motivo"
                                                  value={motivoAjuste}
                                                  onChange={(e) => setMotivoAjuste(e.target.value)}
                                                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                                />
                                              </div>
                                              {errorAjuste && (
                                                <p className="text-brand-error text-xs">
                                                  {errorAjuste}
                                                </p>
                                              )}
                                              <div className="flex gap-2 justify-end">
                                                <button
                                                  type="button"
                                                  onClick={() => setLoteEnAjuste(null)}
                                                  className="text-gray-500 text-xs px-2 py-1"
                                                >
                                                  Cancelar
                                                </button>
                                                <Button
                                                  variant="primary"
                                                  size="sm"
                                                  disabled={enviandoAjuste}
                                                  onClick={() => void enviarAjuste(item.productoId)}
                                                >
                                                  {enviandoAjuste ? 'Guardando...' : 'Confirmar'}
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                                <div>
                                  <h3 className="text-small font-semibold text-gray-600 mb-2">
                                    Movimientos recientes
                                  </h3>
                                  {(movimientosPorProducto[item.productoId] ?? []).length === 0 ? (
                                    <p className="text-gray-400 text-xs">Sin movimientos.</p>
                                  ) : (
                                    <ul className="space-y-1 text-xs">
                                      {(movimientosPorProducto[item.productoId] ?? [])
                                        .slice(0, 10)
                                        .map((mov) => (
                                          <li key={mov.id} className="flex justify-between gap-2">
                                            <span
                                              className={
                                                mov.tipoMovimiento === 'Salida'
                                                  ? 'text-brand-error'
                                                  : 'text-green-700'
                                              }
                                            >
                                              {mov.tipoMovimiento}
                                            </span>
                                            <span className="text-gray-500">{mov.motivo}</span>
                                            <span className="font-mono font-semibold">
                                              {mov.cantidad}
                                            </span>
                                          </li>
                                        ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
