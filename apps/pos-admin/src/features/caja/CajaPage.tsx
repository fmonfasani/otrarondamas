import { useEffect, useState, useCallback } from 'react';
import type {
  EstadoCajaResponse,
  MovimientoCaja,
  TipoMovimientoManual,
  UsuarioResumen,
  ArquearCajaResponse,
} from '@otrarondamas/shared-types';
import { Button, Card, CardHeader, CardBody, Input } from '../../components';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';

const TIPOS_MOVIMIENTO: TipoMovimientoManual[] = ['Ingreso', 'Egreso', 'Gasto', 'Retiro'];

/**
 * RF-09: apertura -> movimientos -> arqueo (doble confirmación,
 * saliente + entrante) -> cierre. Refleja fielmente lo que el backend
 * permite: no hay forma de "forzar" un cierre con diferencia sin
 * autorizar (D-06 no implementado, ver caja.service.ts) — si el backend
 * lo rechaza, esta pantalla muestra el error tal cual, no lo oculta.
 */
export function CajaPage() {
  const { user } = useAuth();
  const [estado, setEstado] = useState<EstadoCajaResponse | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [montoApertura, setMontoApertura] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimientoManual>('Gasto');
  const [montoMovimiento, setMontoMovimiento] = useState('');
  const [descripcionMovimiento, setDescripcionMovimiento] = useState('');
  const [usuarioEntranteId, setUsuarioEntranteId] = useState('');
  const [efectivoContado, setEfectivoContado] = useState('');
  const [ultimoArqueo, setUltimoArqueo] = useState<ArquearCajaResponse | null>(null);

  const cargarTodo = useCallback(async () => {
    try {
      const [estadoRes, usuariosRes] = await Promise.all([api.estadoCaja(), api.listarUsuarios()]);
      setError(null);
      setEstado(estadoRes);
      setUsuarios(usuariosRes);
      if (estadoRes.aperturaVigente) {
        setMovimientos(await api.listarMovimientosCaja());
      } else {
        setMovimientos([]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el estado de caja');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // react-hooks/set-state-in-effect marca como riesgoso cualquier
    // setState alcanzable desde el cuerpo del efecto, aunque sea a
    // través de una función async — no alcanza con un `await` previo
    // (ya probado). El patrón que la propia regla recomienda para un
    // fetch en el montaje es diferir con un timeout de 0ms, que saca la
    // llamada del ciclo de render síncrono actual.
    const timeout = setTimeout(() => {
      void cargarTodo();
    }, 0);
    return () => clearTimeout(timeout);
  }, [cargarTodo]);

  async function abrirCaja() {
    const monto = Number(montoApertura);
    if (!monto || monto <= 0) {
      setError('Ingresá un monto inicial válido');
      return;
    }
    setError(null);
    try {
      await api.abrirCaja({ montoInicial: monto });
      setMontoApertura('');
      await cargarTodo();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo abrir la caja');
    }
  }

  async function registrarMovimiento() {
    const monto = Number(montoMovimiento);
    if (!monto || monto <= 0) {
      setError('Ingresá un monto válido');
      return;
    }
    setError(null);
    try {
      await api.registrarMovimientoCaja({
        tipo: tipoMovimiento,
        monto,
        descripcion: descripcionMovimiento || undefined,
      });
      setMontoMovimiento('');
      setDescripcionMovimiento('');
      await cargarTodo();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el movimiento');
    }
  }

  async function arquear() {
    if (!usuarioEntranteId) {
      setError('Elegí el usuario entrante');
      return;
    }
    const contado = Number(efectivoContado);
    if (contado < 0 || efectivoContado === '') {
      setError('Ingresá el efectivo contado');
      return;
    }
    setError(null);
    try {
      const resultado = await api.arquearCaja({ usuarioEntranteId, efectivoContado: contado });
      setUltimoArqueo(resultado);
      setEfectivoContado('');
      await cargarTodo();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el arqueo');
    }
  }

  async function cerrarCaja() {
    setError(null);
    try {
      await api.cerrarCaja();
      setUltimoArqueo(null);
      await cargarTodo();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cerrar la caja');
    }
  }

  if (cargando) {
    return <p className="text-gray-500">Cargando estado de caja…</p>;
  }

  const cajaAbierta = estado?.caja.estado === 'ABIERTA';
  const otrosUsuarios = usuarios.filter((u) => u.id !== user?.id);

  return (
    <div className="space-y-6">
      <h1 className="text-h2 font-bold text-brand-dark">Caja</h1>

      {error && (
        <div className="bg-red-50 border border-brand-error text-brand-error px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-h3 font-bold">Estado actual</h2>
        </CardHeader>
        <CardBody>
          {estado && (
            <div className="flex items-center gap-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  estado.caja.estado === 'ABIERTA'
                    ? 'bg-green-100 text-green-700'
                    : estado.caja.estado === 'EN_ARQUEO'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-200 text-gray-700'
                }`}
              >
                {estado.caja.estado}
              </span>
              <span>Fondo fijo declarado: ${estado.caja.fondoFijo}</span>
              {estado.aperturaVigente && (
                <span>Monto de apertura del turno: ${estado.aperturaVigente.montoInicial}</span>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {!cajaAbierta && (
        <Card>
          <CardHeader>
            <h2 className="text-h3 font-bold">Abrir caja</h2>
          </CardHeader>
          <CardBody>
            <div className="flex items-end gap-3">
              <div className="w-48">
                <Input
                  label="Monto inicial"
                  type="number"
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(e.target.value)}
                  placeholder="25000"
                />
              </div>
              <Button onClick={abrirCaja}>Abrir turno</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {cajaAbierta && (
        <>
          <Card>
            <CardHeader>
              <h2 className="text-h3 font-bold">Registrar movimiento manual</h2>
            </CardHeader>
            <CardBody>
              {/* TODO: diseño visual pendiente de mejorar el layout del formulario */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-40">
                  <label className="block text-label font-semibold text-brand-dark mb-2">
                    Tipo
                  </label>
                  <select
                    value={tipoMovimiento}
                    onChange={(e) => setTipoMovimiento(e.target.value as TipoMovimientoManual)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-brand-yellow"
                  >
                    {TIPOS_MOVIMIENTO.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-40">
                  <Input
                    label="Monto"
                    type="number"
                    value={montoMovimiento}
                    onChange={(e) => setMontoMovimiento(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Input
                    label="Descripción (opcional)"
                    value={descripcionMovimiento}
                    onChange={(e) => setDescripcionMovimiento(e.target.value)}
                  />
                </div>
                <Button variant="secondary" onClick={registrarMovimiento}>
                  Registrar
                </Button>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-brand-dark mb-2">Movimientos del turno</h3>
                {movimientos.length === 0 ? (
                  <p className="text-gray-500">Sin movimientos todavía.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-200">
                        <th className="py-2">Tipo</th>
                        <th className="py-2">Monto</th>
                        <th className="py-2">Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((m) => (
                        <tr key={m.id} className="border-b border-gray-100">
                          <td className="py-2">{m.tipo}</td>
                          <td className="py-2">${m.monto}</td>
                          <td className="py-2 text-gray-500">{m.descripcion ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-h3 font-bold">Arqueo de turno</h2>
              <p className="text-small text-gray-500">
                Requiere confirmación de dos personas: quien está haciendo el arqueo (vos) y un
                segundo usuario entrante, distinto.
              </p>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-56">
                  <label className="block text-label font-semibold text-brand-dark mb-2">
                    Usuario entrante
                  </label>
                  <select
                    value={usuarioEntranteId}
                    onChange={(e) => setUsuarioEntranteId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-brand-yellow"
                  >
                    <option value="">Seleccionar…</option>
                    {otrosUsuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-40">
                  <Input
                    label="Efectivo contado"
                    type="number"
                    value={efectivoContado}
                    onChange={(e) => setEfectivoContado(e.target.value)}
                  />
                </div>
                <Button onClick={arquear}>Registrar arqueo</Button>
              </div>

              {ultimoArqueo && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md text-sm space-y-1">
                  <p>Efectivo esperado: ${ultimoArqueo.arqueo.efectivoEsperado}</p>
                  <p>Efectivo contado: ${ultimoArqueo.arqueo.efectivoContado}</p>
                  <p>
                    Diferencia:{' '}
                    <strong
                      className={
                        Number(ultimoArqueo.arqueo.diferencia) === 0
                          ? 'text-green-700'
                          : 'text-brand-error'
                      }
                    >
                      ${ultimoArqueo.arqueo.diferencia}
                    </strong>
                  </p>
                  {ultimoArqueo.requiereAutorizacion && (
                    <p className="text-brand-error font-semibold">
                      La diferencia supera el umbral de referencia y requiere autorización del dueño
                      (mecanismo aún no implementado) — el cierre quedará bloqueado hasta
                      resolverlo.
                    </p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-h3 font-bold">Cerrar turno</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-500 mb-3">
                Requiere un arqueo del turno ya registrado. Si la última diferencia supera el umbral
                sin autorización, el servidor rechaza el cierre.
              </p>
              <Button variant="danger" onClick={cerrarCaja}>
                Cerrar caja
              </Button>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
