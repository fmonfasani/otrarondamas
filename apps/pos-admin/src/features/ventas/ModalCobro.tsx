import { useState, useEffect, useCallback } from 'react';
import type { MedioPago, Pago, Venta } from '@otrarondamas/shared-types';
import { api, ApiError } from '../../lib/api';
import { formatImporte, formatNumeroVenta } from '../../lib/format';
import { Button } from '../../components';

interface Props {
  ventaId: string;
  total: string;
  numero: number | null;
  onCobrada: () => void;
  onClose: () => void;
}

/**
 * Modal de cobro: registra uno o más pagos sobre una venta confirmada.
 * Se abre después de POST /ventas (NuevaVentaPage) o desde VentasPage/VentaDetallePage.
 * F9 registra el pago activo.
 */
export function ModalCobro({ ventaId, total, numero, onCobrada, onClose }: Props) {
  const totalNum = parseFloat(total);

  const [pagosExistentes, setPagosExistentes] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [saldo, setSaldo] = useState(totalNum);

  const [medio, setMedio] = useState<MedioPago>('efectivo');
  const [importe, setImporte] = useState('');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [referencia, setReferencia] = useState('');

  const [registrando, setRegistrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmación de "dejar pendiente"
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);

  // ------- Cargar venta para obtener pagos existentes -------
  const cargarVenta = useCallback(async () => {
    try {
      const v: Venta = await api.getVenta(ventaId);
      const pagos = v.pagos ?? [];
      setPagosExistentes(pagos);
      const pagado = pagos.reduce((a, p) => a + parseFloat(p.monto), 0);
      const nuevoSaldo = totalNum - pagado;
      setSaldo(Math.max(0, nuevoSaldo));
      // Precargar importe con saldo
      setImporte(Math.max(0, nuevoSaldo).toFixed(2));
    } catch {
      // Si falla, empezar con saldo = total
    } finally {
      setCargando(false);
    }
  }, [ventaId, totalNum]);

  useEffect(() => {
    void cargarVenta();
  }, [cargarVenta]);

  // Precargar importe al cambiar saldo
  useEffect(() => {
    setImporte(saldo > 0 ? saldo.toFixed(2) : '');
    setMontoRecibido('');
    setReferencia('');
  }, [saldo, medio]);

  // F9 para registrar pago
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        if (!registrando && puedeRegistrar) void registrarPago();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ------- Montos rápidos para efectivo -------
  function montosRapidos(): number[] {
    const imp = parseFloat(importe) || saldo;
    // 3 múltiplos de $1.000 inmediatamente superiores al importe
    const base = Math.ceil(imp / 1000) * 1000;
    return [base, base + 1000, base + 2000];
  }

  const importeNum = parseFloat(importe) || 0;
  const recibidoNum = parseFloat(montoRecibido) || 0;
  const vuelto = medio === 'efectivo' && recibidoNum > 0 ? recibidoNum - importeNum : 0;
  const faltante = medio === 'efectivo' && recibidoNum > 0 && recibidoNum < importeNum
    ? importeNum - recibidoNum
    : 0;

  const puedeRegistrar =
    importeNum > 0 &&
    (medio !== 'efectivo' || recibidoNum === 0 || recibidoNum >= importeNum);

  async function registrarPago() {
    setError(null);
    setRegistrando(true);
    try {
      const dto =
        medio === 'efectivo'
          ? { medio, monto: importeNum, montoRecibido: recibidoNum > 0 ? recibidoNum : undefined }
          : { medio, monto: importeNum, referencia: referencia.trim() || undefined };

      const resp = await api.crearPago(ventaId, dto);
      const nuevoSaldo = parseFloat(resp.saldo);

      // Agregar pago a la lista
      setPagosExistentes((prev) => [...prev, resp.pago]);
      setSaldo(Math.max(0, nuevoSaldo));

      if (nuevoSaldo <= 0) {
        onCobrada();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el pago');
    } finally {
      setRegistrando(false);
    }
  }

  function handleClose() {
    if (saldo > 0) {
      setConfirmandoCierre(true);
    } else {
      onClose();
    }
  }

  const MEDIOS: { key: MedioPago; label: string }[] = [
    { key: 'efectivo', label: 'Efectivo' },
    { key: 'transferencia', label: 'Transferencia' },
    { key: 'QR', label: 'QR' },
  ];

  const totalPagado = pagosExistentes.reduce((a, p) => a + parseFloat(p.monto), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-h3 font-bold text-brand-dark">
            Cobrar venta {formatNumeroVenta(numero)}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Resumen */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-6 flex-wrap text-sm">
          <div>
            <span className="text-gray-500">Total</span>
            <p className="font-bold text-brand-dark">{formatImporte(total)}</p>
          </div>
          <div>
            <span className="text-gray-500">Pagado</span>
            <p className="font-bold text-green-700">{formatImporte(totalPagado)}</p>
          </div>
          <div>
            <span className="text-gray-500">Saldo</span>
            <p className={`font-bold ${saldo > 0 ? 'text-brand-error' : 'text-green-700'}`}>
              {formatImporte(saldo)}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5">
          {cargando && <p className="text-small text-gray-400">Cargando…</p>}

          {/* Pagos registrados */}
          {pagosExistentes.length > 0 && (
            <div>
              <h3 className="text-label font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Pagos registrados
              </h3>
              <div className="space-y-1">
                {pagosExistentes.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="capitalize font-medium text-brand-dark">{p.medio}</span>
                      {p.referencia && (
                        <span className="text-gray-400 text-xs">
                          ref. {p.referencia.substring(0, 6)}…
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
              </div>
            </div>
          )}

          {/* Nuevo pago */}
          {saldo > 0 && (
            <div>
              <h3 className="text-label font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Nuevo pago
              </h3>

              {/* Tabs de medio */}
              <div className="flex gap-2 mb-4">
                {MEDIOS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMedio(m.key)}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                      medio === m.key
                        ? 'bg-brand-yellow text-brand-dark'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Campo importe */}
              <div className="mb-3">
                <label className="block text-label font-semibold text-brand-dark mb-1">
                  Importe
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-brand-yellow text-body"
                  placeholder={saldo.toFixed(2)}
                />
              </div>

              {/* Efectivo: monto recibido + montos rápidos */}
              {medio === 'efectivo' && (
                <>
                  <div className="mb-3">
                    <label className="block text-label font-semibold text-brand-dark mb-1">
                      Monto recibido
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-brand-yellow text-body"
                      placeholder={importe || saldo.toFixed(2)}
                    />
                  </div>

                  {/* Montos rápidos */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {montosRapidos().map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMontoRecibido(String(m))}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
                      >
                        {formatImporte(m)}
                      </button>
                    ))}
                  </div>

                  {/* Vuelto / Faltante */}
                  {recibidoNum > 0 && vuelto > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                      <span className="text-sm text-green-700 font-semibold">
                        Vuelto: {formatImporte(vuelto)}
                      </span>
                    </div>
                  )}
                  {faltante > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md">
                      <span className="text-sm text-brand-error font-semibold">
                        Falta: {formatImporte(faltante)}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Transferencia / QR: referencia + aviso */}
              {(medio === 'transferencia' || medio === 'QR') && (
                <>
                  <div className="mb-3">
                    <label className="block text-label font-semibold text-brand-dark mb-1">
                      Referencia (opcional)
                    </label>
                    <input
                      type="text"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      placeholder="Número de operación"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-brand-yellow text-body"
                    />
                  </div>
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
                    Registrá el pago solo después de ver el dinero acreditado.
                  </p>
                </>
              )}

              {error && (
                <p className="text-sm text-brand-error mt-2" role="alert">
                  {error}
                </p>
              )}

              <div className="mt-4">
                <Button
                  onClick={() => void registrarPago()}
                  disabled={!puedeRegistrar || registrando}
                  className="w-full"
                >
                  {registrando ? 'Registrando…' : 'Registrar pago (F9)'}
                </Button>
              </div>
            </div>
          )}

          {/* Botón dejar pendiente */}
          {saldo > 0 && (
            <button
              type="button"
              onClick={() => setConfirmandoCierre(true)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 hover:underline py-1"
            >
              Dejar pendiente de cobro
            </button>
          )}
        </div>
      </div>

      {/* Confirmación de cierre con saldo */}
      {confirmandoCierre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="font-bold text-brand-dark mb-2">
              La venta {formatNumeroVenta(numero)} queda pendiente
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              El saldo pendiente de cobro es{' '}
              <strong className="text-brand-error">{formatImporte(saldo)}</strong>. Podés
              retomarla desde Ventas.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setConfirmandoCierre(false)}
                className="flex-1"
              >
                Seguir cobrando
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmandoCierre(false);
                  onClose();
                }}
                className="flex-1"
              >
                Dejar pendiente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
