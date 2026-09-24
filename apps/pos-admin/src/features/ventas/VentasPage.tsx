import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Venta } from '@otrarondamas/shared-types';
import { api, ApiError } from '../../lib/api';
import { formatImporte, formatFecha, formatNumeroVenta } from '../../lib/format';
import { Card, CardBody, Button } from '../../components';
import { ModalCobro } from './ModalCobro';

type FiltroEstado = 'todas' | 'pendientes' | 'cobradas';

/**
 * Historial paginado de ventas con filtros por fecha, estado y número.
 * Ruta: /ventas
 */
export function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const today = new Date().toISOString().split('T')[0];
  const [fechaDesde, setFechaDesde] = useState(today);
  const [fechaHasta, setFechaHasta] = useState(today);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas');
  const [busquedaNumero, setBusquedaNumero] = useState('');

  // Modal cobro
  const [ventaACobrar, setVentaACobrar] = useState<Venta | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(PAGE_SIZE),
        fechaDesde,
        fechaHasta,
      };
      if (filtroEstado === 'pendientes') params.conSaldo = 'true';
      if (filtroEstado === 'cobradas') params.saldoCero = 'true';
      if (busquedaNumero.trim()) params.numero = busquedaNumero.trim();

      const resp = await api.listarVentas(params);
      // La API puede responder con un array o con {data, total, page, pageSize}
      if (Array.isArray(resp)) {
        setVentas(resp as unknown as Venta[]);
        setTotal((resp as unknown as Venta[]).length);
      } else {
        setVentas(resp.data);
        setTotal(resp.total);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las ventas');
    } finally {
      setCargando(false);
    }
  }, [page, fechaDesde, fechaHasta, filtroEstado, busquedaNumero]);

  useEffect(() => {
    const timeout = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(timeout);
  }, [cargar]);

  // Calcular chips del día desde los datos cargados
  const ventasHoy = ventas.filter((v) => v.createdAt.startsWith(today));
  const totalVendidoHoy = ventasHoy.reduce((a, v) => a + parseFloat(v.total), 0);
  const pendienteHoy = ventas
    .filter((v) => v.saldo && parseFloat(v.saldo) > 0)
    .reduce((a, v) => a + parseFloat(v.saldo!), 0);

  function estadoChip(v: Venta) {
    if (v.estado === 'ANULADA') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          Anulada
        </span>
      );
    }
    const saldo = v.saldo ? parseFloat(v.saldo) : 0;
    if (saldo <= 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
          Cobrada
        </span>
      );
    }
    const total = parseFloat(v.total);
    if (saldo < total) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          Parcial
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        Pendiente
      </span>
    );
  }

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-bold text-brand-dark">Ventas</h1>
          <p className="text-label text-gray-500">Historial de ventas del período seleccionado.</p>
        </div>
        <Link to="/ventas/nueva">
          <Button>+ Nueva venta</Button>
        </Link>
      </div>

      {/* Chips del día */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardBody className="py-3">
            <p className="text-small text-gray-500">Ventas hoy</p>
            <p className="text-h3 font-bold text-brand-dark">{ventasHoy.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <p className="text-small text-gray-500">Total vendido</p>
            <p className="text-h3 font-bold text-brand-dark">{formatImporte(totalVendidoHoy)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <p className="text-small text-gray-500">Pendiente de cobro</p>
            <p
              className={`text-h3 font-bold ${
                pendienteHoy > 0 ? 'text-amber-600' : 'text-green-700'
              }`}
            >
              {formatImporte(pendienteHoy)}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-label font-semibold text-brand-dark mb-1">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-brand-yellow text-sm"
              />
            </div>
            <div>
              <label className="block text-label font-semibold text-brand-dark mb-1">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-brand-yellow text-sm"
              />
            </div>
            <div>
              <label className="block text-label font-semibold text-brand-dark mb-1">
                Buscar por número
              </label>
              <input
                type="text"
                value={busquedaNumero}
                onChange={(e) => {
                  setBusquedaNumero(e.target.value);
                  setPage(1);
                }}
                placeholder="#00000125"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-brand-yellow text-sm"
              />
            </div>
            <div className="flex gap-2">
              {(['todas', 'pendientes', 'cobradas'] as FiltroEstado[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFiltroEstado(f);
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                    filtroEstado === f
                      ? 'bg-brand-yellow text-brand-dark'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {error && (
        <div className="bg-red-50 border border-brand-error text-brand-error px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Tabla */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 text-gray-500 font-semibold">#</th>
                <th className="px-4 py-3 text-gray-500 font-semibold">Fecha</th>
                <th className="px-4 py-3 text-gray-500 font-semibold">Cliente</th>
                <th className="px-4 py-3 text-right text-gray-500 font-semibold">Total</th>
                <th className="px-4 py-3 text-right text-gray-500 font-semibold">Saldo</th>
                <th className="px-4 py-3 text-gray-500 font-semibold">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Cargando…
                  </td>
                </tr>
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No hay ventas en este período.
                  </td>
                </tr>
              ) : (
                ventas.map((v) => {
                  const saldo = v.saldo ? parseFloat(v.saldo) : 0;
                  return (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          to={`/ventas/${v.id}`}
                          className="font-mono font-semibold text-brand-info hover:underline"
                        >
                          {formatNumeroVenta(v.numero)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatFecha(v.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {v.clienteId ? v.clienteId.substring(0, 8) + '…' : 'Consumidor final'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-dark whitespace-nowrap">
                        {formatImporte(v.total)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={saldo > 0 ? 'text-amber-600 font-semibold' : 'text-gray-400'}>
                          {formatImporte(saldo)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{estadoChip(v)}</td>
                      <td className="px-4 py-3 text-right">
                        {saldo > 0 && v.estado !== 'ANULADA' && (
                          <button
                            type="button"
                            onClick={() => setVentaACobrar(v)}
                            className="px-3 py-1 text-xs font-semibold bg-brand-yellow text-brand-dark rounded-md hover:bg-amber-400 transition-colors"
                          >
                            Cobrar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-small text-gray-500">
              Página {page} de {totalPaginas} ({total} ventas)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page === totalPaginas}
                onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal cobro inline desde listado */}
      {ventaACobrar && (
        <ModalCobro
          ventaId={ventaACobrar.id}
          total={ventaACobrar.total}
          numero={ventaACobrar.numero}
          onCobrada={() => {
            setVentaACobrar(null);
            void cargar();
          }}
          onClose={() => {
            setVentaACobrar(null);
            void cargar();
          }}
        />
      )}
    </div>
  );
}
