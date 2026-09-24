import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Venta } from '@otrarondamas/shared-types';
import { api, ApiError } from '../../lib/api';
import { formatImporte, formatFecha, formatNumeroVenta } from '../../lib/format';
import { Card, CardHeader, CardBody, Button } from '../../components';
import { ModalCobro } from './ModalCobro';

/**
 * Detalle de una venta: información, productos, totales, pagos.
 * Ruta: /ventas/:id
 */
export function VentaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    setCargando(true);
    setError(null);
    try {
      const v = await api.getVenta(id);
      setVenta(v);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la venta');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Cargando venta…</p>
      </div>
    );
  }

  if (error || !venta) {
    return (
      <div className="space-y-4">
        <Link to="/ventas" className="text-sm text-brand-info hover:underline">
          ← Ventas
        </Link>
        <div className="bg-red-50 border border-brand-error text-brand-error px-4 py-3 rounded-md">
          {error ?? 'Venta no encontrada'}
        </div>
      </div>
    );
  }

  const saldo = venta.saldo ? parseFloat(venta.saldo) : 0;
  const descuento = parseFloat(venta.descuento);
  const totalPagado = venta.pagos?.reduce((a, p) => a + parseFloat(p.monto), 0) ?? 0;

  function estadoChip() {
    if (venta!.estado === 'ANULADA') {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700">
          Anulada
        </span>
      );
    }
    if (saldo <= 0) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
          Cobrada
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
        Pendiente
      </span>
    );
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div>
        <Link to="/ventas" className="text-sm text-gray-500 hover:underline">
          ← Ventas
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-h2 font-bold text-brand-dark">
            Venta {formatNumeroVenta(venta.numero)}
          </h1>
          {estadoChip()}
        </div>
      </div>

      {/* Información */}
      <Card>
        <CardHeader>
          <h2 className="text-h3 font-semibold text-brand-dark">Información</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Fecha</p>
              <p className="font-semibold text-brand-dark">{formatFecha(venta.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-500">Canal</p>
              <p className="font-semibold text-brand-dark capitalize">{venta.canal}</p>
            </div>
            <div>
              <p className="text-gray-500">Cliente</p>
              <p className="font-semibold text-brand-dark">
                {venta.clienteId ? 'Identificado' : 'Consumidor final'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Estado</p>
              <div>{estadoChip()}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Advertencias */}
      {(venta.advertenciasStockVencido ?? []).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
          <p className="text-sm text-amber-700 font-semibold">
            ⚠ Se vendió stock de lotes vencidos
          </p>
          <p className="text-xs text-amber-600 mt-1">Revisá el inventario.</p>
        </div>
      )}

      {/* Productos */}
      <Card>
        <CardHeader>
          <h2 className="text-h3 font-semibold text-brand-dark">Productos</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 text-gray-500 font-semibold">Producto</th>
                <th className="px-4 py-3 text-gray-500 font-semibold">SKU</th>
                <th className="px-4 py-3 text-right text-gray-500 font-semibold">Precio</th>
                <th className="px-4 py-3 text-center text-gray-500 font-semibold">Cant.</th>
                <th className="px-4 py-3 text-right text-gray-500 font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {venta.ventaItems.map((item) => {
                const subtotal = parseFloat(item.precioUnitario) * parseFloat(item.cantidad);
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-brand-dark">
                      {item.productoId}
                      {item.descuentoFidelizacionPorcentaje && (
                        <span className="ml-2 text-xs text-green-600">
                          −{item.descuentoFidelizacionPorcentaje}% fidelidad
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs text-gray-500">{item.productoId}</code>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatImporte(item.precioUnitario)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{item.cantidad}</td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-dark">
                      {formatImporte(subtotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Totales y pagos en dos columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Totales */}
        <Card>
          <CardHeader>
            <h2 className="text-h3 font-semibold text-brand-dark">Totales</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm">
              {descuento > 0 && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatImporte(parseFloat(venta.total) + descuento)}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Descuento fidelidad</span>
                    <span>−{formatImporte(descuento)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold text-brand-dark text-base border-t border-gray-200 pt-2">
                <span>TOTAL</span>
                <span>{formatImporte(venta.total)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Pagos */}
        <Card>
          <CardHeader>
            <h2 className="text-h3 font-semibold text-brand-dark">Pagos</h2>
          </CardHeader>
          <CardBody>
            {!venta.pagos || venta.pagos.length === 0 ? (
              <p className="text-small text-gray-400">Sin pagos registrados.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {venta.pagos.map((p) => (
                  <div key={p.id} className="flex justify-between items-start">
                    <div>
                      <span className="capitalize font-medium text-brand-dark">{p.medio}</span>
                      {p.referencia && (
                        <span className="text-gray-400 ml-2 text-xs">{p.referencia}</span>
                      )}
                      {p.montoRecibido && parseFloat(p.montoRecibido) > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Recibido {formatImporte(p.montoRecibido)}
                          {p.vuelto && parseFloat(p.vuelto) > 0 && (
                            <span className="text-green-600 ml-2">
                              Vuelto {formatImporte(p.vuelto)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold">{formatImporte(p.monto)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                  <span className="text-gray-600">Total pagado</span>
                  <span className="text-green-700">{formatImporte(totalPagado)}</span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Saldo */}
      {saldo > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex justify-between items-center">
          <span className="font-semibold text-brand-error">Saldo pendiente de cobro</span>
          <span className="font-bold text-brand-error text-lg">{formatImporte(saldo)}</span>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3 flex-wrap">
        {saldo > 0 && venta.estado !== 'ANULADA' && (
          <Button onClick={() => setModalCobroAbierto(true)}>
            Cobrar saldo ({formatImporte(saldo)})
          </Button>
        )}
        <button
          type="button"
          onClick={() => window.open(`/ventas/${venta.id}/comprobante`, '_blank')}
          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-gray-700"
        >
          Imprimir ticket
        </button>
      </div>

      {/* Modal de cobro */}
      {modalCobroAbierto && (
        <ModalCobro
          ventaId={venta.id}
          total={venta.total}
          numero={venta.numero}
          onCobrada={() => {
            setModalCobroAbierto(false);
            void cargar();
          }}
          onClose={() => {
            setModalCobroAbierto(false);
            void cargar();
          }}
        />
      )}
    </div>
  );
}
