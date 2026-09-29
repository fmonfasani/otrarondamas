import { useState, useEffect, useCallback } from 'react';
import type { Venta } from '@otrarondamas/shared-types';
import { api } from '../../lib/api';
import { formatImporte, formatFecha, formatNumeroVenta } from '../../lib/format';
import { Button } from '../../components';

interface Props {
  ventaId: string;
  cobrada: boolean;
  onNuevaVenta: () => void;
  onCobrar?: () => void;
}

/**
 * Modal de resultado: resumen final después de cobrar o dejar pendiente.
 * Carga la venta completa con sus ítems y pagos.
 * Enter → "Nueva venta" (cuando está cobrada) / "Cobrar saldo" (cuando hay saldo).
 */
export function ModalResultado({ ventaId, cobrada, onNuevaVenta, onCobrar }: Props) {
  const [venta, setVenta] = useState<Venta | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const v = await api.getVenta(ventaId);
      setVenta(v);
    } catch {
      // Mostrar lo que tengamos
    } finally {
      setCargando(false);
    }
  }, [ventaId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Enter para acción primaria
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!cargando) {
          const saldo = venta?.saldo ? parseFloat(venta.saldo) : 0;
          if (saldo > 0 && onCobrar) {
            onCobrar();
          } else {
            onNuevaVenta();
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cargando, venta, onNuevaVenta, onCobrar]);

  const saldo = venta?.saldo ? parseFloat(venta.saldo) : 0;
  const totalPagado = venta?.pagos
    ? venta.pagos.reduce((a, p) => a + parseFloat(p.monto), 0)
    : 0;
  const descuento = venta ? parseFloat(venta.descuento) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header de estado */}
        <div
          className={`px-6 py-5 text-center rounded-t-lg ${
            cobrada ? 'bg-green-50' : 'bg-amber-50'
          }`}
        >
          <div className="text-4xl mb-2">{cobrada ? '✅' : '⏳'}</div>
          <h2 className={`text-h3 font-bold ${cobrada ? 'text-green-700' : 'text-amber-700'}`}>
            {cobrada ? 'Venta cobrada' : 'Venta pendiente de cobro'}
          </h2>
          {venta && (
            <p className="text-label text-gray-600 mt-1">
              {formatNumeroVenta(venta.numero)} · {formatFecha(venta.createdAt)}
            </p>
          )}
        </div>

        <div className="px-6 py-4 space-y-5">
          {cargando && <p className="text-small text-gray-400 text-center">Cargando…</p>}

          {venta && (
            <>
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Canal</span>
                  <p className="font-semibold text-brand-dark capitalize">{venta.canal}</p>
                </div>
                {venta.clienteId && (
                  <div>
                    <span className="text-gray-500">Cliente</span>
                    <p className="font-semibold text-brand-dark">Identificado</p>
                  </div>
                )}
              </div>

              {/* Advertencias de stock vencido */}
              {(venta.advertenciasStockVencido ?? []).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <p className="text-sm text-amber-700 font-semibold">
                    ⚠ Stock con lote vencido vendido
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Revisar inventario para los productos afectados.
                  </p>
                </div>
              )}

              {/* Ítems */}
              {venta.ventaItems.length > 0 && (
                <div>
                  <h3 className="text-label font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Productos
                  </h3>
                  <div className="space-y-1">
                    {venta.ventaItems.map((item) => {
                      const subtotal =
                        parseFloat(item.precioUnitario) * parseFloat(item.cantidad);
                      return (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm py-1 border-b border-gray-100"
                        >
                          <div>
                            <span className="text-brand-dark">{item.productoId}</span>
                            <span className="text-gray-400 ml-2">× {item.cantidad}</span>
                            {item.descuentoFidelizacionPorcentaje && (
                              <span className="text-xs text-green-600 ml-2">
                                −{item.descuentoFidelizacionPorcentaje}% fidelidad
                              </span>
                            )}
                          </div>
                          <span className="font-semibold">{formatImporte(subtotal)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Totales */}
              <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
                {descuento > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Descuento fidelidad</span>
                    <span>−{formatImporte(descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-brand-dark text-base pt-1 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatImporte(venta.total)}</span>
                </div>
              </div>

              {/* Pagos */}
              {venta.pagos && venta.pagos.length > 0 && (
                <div>
                  <h3 className="text-label font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Pagos
                  </h3>
                  <div className="space-y-1">
                    {venta.pagos.map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between text-sm py-1.5 border-b border-gray-100"
                      >
                        <div>
                          <span className="capitalize font-medium text-brand-dark">{p.medio}</span>
                          {p.referencia && (
                            <span className="text-gray-400 ml-2 text-xs">
                              ref. {p.referencia}
                            </span>
                          )}
                          {p.montoRecibido && parseFloat(p.montoRecibido) > 0 && (
                            <span className="text-gray-500 ml-2 text-xs">
                              Recibido {formatImporte(p.montoRecibido)}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{formatImporte(p.monto)}</span>
                          {p.vuelto && parseFloat(p.vuelto) > 0 && (
                            <span className="text-xs text-green-600 ml-2">
                              Vuelto {formatImporte(p.vuelto)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold text-sm pt-1">
                      <span className="text-gray-600">Total pagado</span>
                      <span className="text-green-700">{formatImporte(totalPagado)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Saldo pendiente */}
              {saldo > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-brand-error">Saldo pendiente</span>
                  <span className="font-bold text-brand-error">{formatImporte(saldo)}</span>
                </div>
              )}
            </>
          )}

          {/* Acciones */}
          <div className="flex flex-col gap-2 pt-2">
            {saldo > 0 && onCobrar && (
              <Button onClick={onCobrar} className="w-full">
                Cobrar saldo (Enter)
              </Button>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  window.open(`/ventas/${ventaId}/comprobante`, '_blank')
                }
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Imprimir ticket
              </button>
              <button
                type="button"
                onClick={() => window.location.assign(`/ventas/${ventaId}`)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Ver venta
              </button>
            </div>

            <Button onClick={onNuevaVenta} variant={saldo > 0 ? 'secondary' : 'primary'} className="w-full">
              {saldo > 0 ? 'Nueva venta' : 'Nueva venta (Enter)'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
