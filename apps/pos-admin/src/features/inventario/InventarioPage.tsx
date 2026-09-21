import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Package } from 'lucide-react';
import type { StockConsolidado, Lote, MovimientoStock } from '@otrarondamas/shared-types';
import { Card, CardHeader, CardBody, Input } from '../../components';
import { api, ApiError } from '../../lib/api';

/**
 * Fase 1 del roadmap de inventario (INV-CONS-01/02/03/04): solo lectura.
 * Sin ajustes ni alta de lotes todavía — eso es Fase 2/3, sobre esta
 * misma pantalla.
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

  async function expandirProducto(productoId: string) {
    if (expandido === productoId) {
      setExpandido(null);
      return;
    }
    setExpandido(productoId);
    if (lotesPorProducto[productoId] && movimientosPorProducto[productoId]) {
      return; // ya cargado, no repetir el fetch
    }
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
  }

  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-bold">Inventario</h1>

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
                                    <ul className="space-y-1 text-xs">
                                      {(lotesPorProducto[item.productoId] ?? []).map((lote) => (
                                        <li key={lote.id} className="flex justify-between gap-2">
                                          <span className="font-mono text-gray-600">
                                            {lote.numeroLote}
                                          </span>
                                          <span className="text-gray-500">
                                            vence{' '}
                                            {new Date(lote.vencimiento).toLocaleDateString('es-AR')}
                                          </span>
                                          <span className="font-mono font-semibold">
                                            {lote.cantidad}
                                          </span>
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
