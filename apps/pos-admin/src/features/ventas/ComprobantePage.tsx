import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { Venta } from '@otrarondamas/shared-types';
import { api } from '../../lib/api';
import { formatImporte, formatFecha, formatNumeroVenta } from '../../lib/format';

/**
 * Vista de impresión del comprobante interno.
 * Sin sidebar — layout limpio de 80mm máx.
 * window.print() automático al cargar.
 * Ruta: /ventas/:id/comprobante
 */
export function ComprobantePage() {
  const { id } = useParams<{ id: string }>();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      const v = await api.getVenta(id);
      setVenta(v);
    } catch {
      setError('No se pudo cargar el comprobante');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Imprimir automáticamente cuando la venta esté lista
  useEffect(() => {
    if (venta) {
      const timeout = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timeout);
    }
  }, [venta]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Cargando comprobante…</p>
      </div>
    );
  }

  if (error || !venta) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-brand-error">{error ?? 'Comprobante no disponible'}</p>
      </div>
    );
  }

  const descuento = parseFloat(venta.descuento);
  const saldo = venta.saldo ? parseFloat(venta.saldo) : 0;
  const totalPagado = venta.pagos?.reduce((a, p) => a + parseFloat(p.monto), 0) ?? 0;

  return (
    <>
      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #comprobante, #comprobante * { visibility: visible !important; }
          #comprobante { position: fixed; left: 0; top: 0; width: 80mm; }
          .no-print { display: none !important; }
        }
        body { font-family: monospace; background: white; }
        #comprobante { max-width: 80mm; margin: 0 auto; padding: 8px; font-family: monospace; font-size: 12px; color: #000; }
      `}</style>

      {/* Botón imprimir (oculto en impresión) */}
      <div className="no-print flex justify-center p-4">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-brand-yellow text-brand-dark font-semibold rounded-md hover:bg-amber-400 transition-colors"
        >
          Imprimir
        </button>
      </div>

      {/* Comprobante */}
      <div id="comprobante">
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '14px' }}>OTRA RONDA MÁS</p>
          <p style={{ fontSize: '10px' }}>Comprobante interno</p>
          <p style={{ fontSize: '10px' }}>No válido como factura</p>
        </div>

        <hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        {/* Info */}
        <p>{formatNumeroVenta(venta.numero)}</p>
        <p>{formatFecha(venta.createdAt)}</p>
        <p>Canal: {venta.canal}</p>
        {venta.clienteId && <p>Cliente: {venta.clienteId.substring(0, 12)}…</p>}

        <hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        {/* Líneas */}
        {venta.ventaItems.map((item) => {
          const subtotal = parseFloat(item.precioUnitario) * parseFloat(item.cantidad);
          return (
            <div key={item.id} style={{ marginBottom: '4px' }}>
              <p style={{ fontWeight: 'bold' }}>{item.productoId}</p>
              <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {item.cantidad} × {formatImporte(item.precioUnitario)}
                </span>
                <span>{formatImporte(subtotal)}</span>
              </p>
              {item.descuentoFidelizacionPorcentaje && (
                <p style={{ fontSize: '10px' }}>
                  Desc. fidelidad: −{item.descuentoFidelizacionPorcentaje}%
                </p>
              )}
            </div>
          );
        })}

        <hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        {/* Descuentos y total */}
        {descuento > 0 && (
          <p style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Descuento fidelidad</span>
            <span>−{formatImporte(descuento)}</span>
          </p>
        )}
        <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
          <span>TOTAL</span>
          <span>{formatImporte(venta.total)}</span>
        </p>

        {/* Pagos */}
        {venta.pagos && venta.pagos.length > 0 && (
          <>
            <hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
            {venta.pagos.map((p) => (
              <div key={p.id}>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ textTransform: 'capitalize' }}>{p.medio}</span>
                  <span>{formatImporte(p.monto)}</span>
                </p>
                {p.montoRecibido && parseFloat(p.montoRecibido) > 0 && (
                  <p style={{ fontSize: '10px' }}>
                    Recibido: {formatImporte(p.montoRecibido)}
                    {p.vuelto && parseFloat(p.vuelto) > 0
                      ? ` / Vuelto: ${formatImporte(p.vuelto)}`
                      : ''}
                  </p>
                )}
                {p.referencia && (
                  <p style={{ fontSize: '10px' }}>Ref: {p.referencia}</p>
                )}
              </div>
            ))}
            <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Pagado</span>
              <span>{formatImporte(totalPagado)}</span>
            </p>
            {saldo > 0 && (
              <p
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 'bold',
                }}
              >
                <span>SALDO PENDIENTE</span>
                <span>{formatImporte(saldo)}</span>
              </p>
            )}
          </>
        )}

        <hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
        <p style={{ textAlign: 'center', fontSize: '10px' }}>
          ¡Gracias por tu compra!
        </p>
      </div>
    </>
  );
}
