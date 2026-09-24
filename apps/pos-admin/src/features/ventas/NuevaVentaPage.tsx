import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type {
  CanalVenta,
  Cliente,
  CotizacionResponse,
  ProductoBusqueda,
  Venta,
} from '@otrarondamas/shared-types';
import { api, ApiError } from '../../lib/api';
import { useCarrito } from './useCarrito';
import { BuscadorClientes } from './BuscadorClientes';
import { ModalCobro } from './ModalCobro';
import { ModalResultado } from './ModalResultado';
import { formatImporte } from '../../lib/format';
import { Card, CardHeader, CardBody, Button } from '../../components';

/**
 * Flujo: armar carrito → cotizar (debounce) → confirmar (POST /ventas) →
 * cobrar (ModalCobro) → resultado (ModalResultado).
 * El backend recalcula precios; nunca confiamos en los valores del cliente.
 */
export function NuevaVentaPage() {
  const navigate = useNavigate();
  const carrito = useCarrito();
  const [canal] = useState<CanalVenta>('presencial');
  const [cliente, setCliente] = useState<Cliente | null>(null);

  // Cotización
  const [cotizacion, setCotizacion] = useState<CotizacionResponse | null>(null);
  const [cotizando, setCotizando] = useState(false);
  const [errorCotizacion, setErrorCotizacion] = useState<string | null>(null);

  // Estado de caja
  const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);

  // Buscador de productos
  const [queryProducto, setQueryProducto] = useState('');
  const [resultadosProducto, setResultadosProducto] = useState<ProductoBusqueda[]>([]);
  const [buscandoProducto, setBuscandoProducto] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const inputBuscadorRef = useRef<HTMLInputElement>(null);

  // Confirmación
  const [creandoVenta, setCreandoVenta] = useState(false);
  const [errorVenta, setErrorVenta] = useState<string | null>(null);

  // Modales
  const [ventaConfirmada, setVentaConfirmada] = useState<Venta | null>(null);
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
  const [modalResultadoAbierto, setModalResultadoAbierto] = useState(false);
  const [resultadoCobrado, setResultadoCobrado] = useState(false);

  // Confirmación de vaciar
  const [confirmandoVaciar, setConfirmandoVaciar] = useState(false);

  // Cantidades previas para restaurar al perder foco con campo vacío
  const cantidadesRef = useRef<Record<string, string>>({});

  // ------- Carga estado de caja -------
  useEffect(() => {
    api
      .estadoCaja()
      .then((r) => setCajaAbierta(r.caja.estado === 'ABIERTA'))
      .catch(() => setCajaAbierta(false));
  }, []);

  // ------- Foco automático al montar -------
  useEffect(() => {
    inputBuscadorRef.current?.focus();
  }, []);

  // ------- F2 para enfocar buscador, F9 para confirmar -------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        inputBuscadorRef.current?.focus();
      }
      if (e.key === 'F9' && !modalCobroAbierto && !modalResultadoAbierto) {
        e.preventDefault();
        if (puedeConfirmar) void confirmarVenta();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ------- Búsqueda de productos con debounce -------
  useEffect(() => {
    if (queryProducto.trim().length < 2) {
      setResultadosProducto([]);
      return;
    }
    const timeout = setTimeout(() => {
      setBuscandoProducto(true);
      setErrorBusqueda(null);
      api
        .buscarProductosVenta(queryProducto.trim())
        .then(setResultadosProducto)
        .catch(() => setErrorBusqueda('No se pudo buscar productos'))
        .finally(() => setBuscandoProducto(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [queryProducto]);

  // ------- Cotización con debounce -------
  const cotizar = useCallback(() => {
    if (carrito.items.length === 0) {
      setCotizacion(null);
      return;
    }
    setCotizando(true);
    setErrorCotizacion(null);
    api
      .cotizarVenta({
        canal,
        clienteId: cliente?.id,
        items: carrito.items.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })),
      })
      .then(setCotizacion)
      .catch(() => setErrorCotizacion('No se pudo cotizar'))
      .finally(() => setCotizando(false));
  }, [carrito.items, canal, cliente]);

  useEffect(() => {
    if (carrito.items.length === 0) {
      setCotizacion(null);
      return;
    }
    const timeout = setTimeout(cotizar, 300);
    return () => clearTimeout(timeout);
  }, [cotizar]);

  // ------- Advertencia al salir con carrito cargado -------
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (carrito.items.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [carrito.items.length]);

  // ------- Validaciones -------
  const hayLineasConStockExcedido = carrito.items.some(
    (i) => i.cantidad > i.producto.stockDisponible,
  );
  const puedeConfirmar =
    carrito.items.length > 0 && !creandoVenta && !cotizando && !hayLineasConStockExcedido;

  // ------- Confirmar venta -------
  async function confirmarVenta() {
    setErrorVenta(null);
    setCreandoVenta(true);
    try {
      const nuevaVenta = await api.crearVenta({
        canal,
        clienteId: cliente?.id,
        items: carrito.items.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })),
        idempotencyKey: carrito.idempotencyKey,
      });
      setVentaConfirmada(nuevaVenta);
      carrito.vaciar();
      setQueryProducto('');
      setResultadosProducto([]);
      setCliente(null);
      setModalCobroAbierto(true);
    } catch (err) {
      setErrorVenta(err instanceof ApiError ? err.message : 'No se pudo confirmar la venta');
    } finally {
      setCreandoVenta(false);
    }
  }

  function handleVaciar() {
    if (carrito.items.length === 0) return;
    setConfirmandoVaciar(true);
  }

  function confirmarVaciar() {
    carrito.vaciar();
    setCotizacion(null);
    setConfirmandoVaciar(false);
  }

  function agregarProducto(producto: ProductoBusqueda) {
    carrito.agregar(producto);
    setQueryProducto('');
    setResultadosProducto([]);
    inputBuscadorRef.current?.focus();
  }

  function handleCantidadChange(productoId: string, valor: string) {
    cantidadesRef.current[productoId] = valor;
    const n = parseInt(valor, 10);
    if (!isNaN(n)) {
      carrito.actualizarCantidad(productoId, n);
    }
  }

  function handleCantidadBlur(productoId: string) {
    const valor = cantidadesRef.current[productoId] ?? '';
    const n = parseInt(valor, 10);
    if (isNaN(n) || n <= 0) {
      // Restaurar al valor anterior (mínimo 1)
      const itemActual = carrito.items.find((i) => i.producto.id === productoId);
      if (itemActual) {
        cantidadesRef.current[productoId] = String(itemActual.cantidad);
        // forzar re-render sin cambiar el ítem
        carrito.actualizarCantidad(productoId, itemActual.cantidad);
      }
    }
  }

  // Chip de nivel de fidelidad
  function nivelLabel(nivel?: string) {
    if (!nivel) return null;
    const mapa: Record<string, string> = {
      NUEVO: 'Nuevo',
      FRECUENTE: 'Frecuente',
      VIP: 'VIP',
    };
    return mapa[nivel] ?? nivel;
  }

  const totalCotizado = cotizacion ? parseFloat(cotizacion.total) : null;
  const descuentoTotal =
    cotizacion && totalCotizado !== null
      ? carrito.items.reduce(
          (acc, item) => acc + Number(item.producto.precioMinorista) * item.cantidad,
          0,
        ) - totalCotizado
      : null;

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-small text-gray-500">
            <Link to="/ventas" className="hover:underline">Ventas</Link>{' '}
            &rsaquo; Nueva venta
          </p>
          <h1 className="text-h2 font-bold text-brand-dark">Nueva venta</h1>
          <p className="text-label text-gray-500">
            Buscá productos y agregalos al carrito para completar la venta.
          </p>
        </div>
        {/* Chip de caja */}
        {cajaAbierta === null ? null : cajaAbierta ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Caja abierta
          </span>
        ) : (
          <Link
            to="/cash"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Caja cerrada · Abrir &rarr;
          </Link>
        )}
      </div>

      {/* Layout dos columnas */}
      <div className="flex gap-4 items-start">
        {/* Columna izquierda: buscador + carrito */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Buscador */}
          <Card>
            <CardHeader>
              <h2 className="text-h3 font-semibold text-brand-dark">Buscar producto</h2>
            </CardHeader>
            <CardBody>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  ref={inputBuscadorRef}
                  type="text"
                  value={queryProducto}
                  onChange={(e) => setQueryProducto(e.target.value)}
                  placeholder="Nombre, SKU o escaneá (F2)"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:border-brand-yellow text-body"
                />
              </div>

              {buscandoProducto && (
                <p className="mt-2 text-small text-gray-500">Buscando…</p>
              )}
              {errorBusqueda && (
                <p className="mt-2 text-small text-brand-error" role="alert">
                  {errorBusqueda}
                </p>
              )}

              {/* Resultados */}
              {resultadosProducto.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-md divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {resultadosProducto.map((p) => {
                    const sinStock = p.stockDisponible === 0;
                    const stockBajo = p.stockDisponible > 0 && p.stockDisponible <= p.stockMinimo;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={sinStock}
                        onClick={() => agregarProducto(p)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                          sinStock
                            ? 'opacity-50 cursor-not-allowed bg-gray-50'
                            : 'hover:bg-amber-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-brand-dark truncate">{p.nombre}</p>
                          <p className="text-small text-gray-500 flex items-center gap-2 mt-0.5">
                            <code className="font-mono text-xs bg-gray-100 px-1 rounded">
                              {p.codigoInterno}
                            </code>
                            {p.familia && (
                              <span className="text-gray-400">{p.familia.nombre}</span>
                            )}
                            {sinStock && (
                              <span className="text-brand-error font-semibold">Sin stock</span>
                            )}
                            {stockBajo && (
                              <span className="text-amber-600 font-semibold">
                                ⚠ Stock bajo: {p.stockDisponible}
                              </span>
                            )}
                          </p>
                        </div>
                        <p className="ml-4 font-semibold text-brand-dark whitespace-nowrap">
                          {formatImporte(p.precioMinorista)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {queryProducto.trim().length >= 2 &&
                !buscandoProducto &&
                resultadosProducto.length === 0 &&
                !errorBusqueda && (
                  <p className="mt-2 text-small text-gray-500">
                    Sin resultados para &ldquo;{queryProducto}&rdquo;
                  </p>
                )}
            </CardBody>
          </Card>

          {/* Carrito */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-h3 font-semibold text-brand-dark">
                  Carrito{' '}
                  {carrito.items.length > 0 && (
                    <span className="text-gray-500 font-normal">
                      ({carrito.items.length})
                    </span>
                  )}
                </h2>
                {carrito.items.length > 0 && !confirmandoVaciar && (
                  <button
                    type="button"
                    onClick={handleVaciar}
                    className="text-small text-brand-error hover:underline"
                  >
                    Vaciar
                  </button>
                )}
              </div>
              {/* Confirmación de vaciar inline */}
              {confirmandoVaciar && (
                <div className="mt-2 flex items-center gap-3 p-2 bg-red-50 rounded-md">
                  <span className="text-small text-brand-error flex-1">
                    ¿Vaciar el carrito?
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmandoVaciar(false)}
                    className="text-small text-gray-600 hover:underline"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarVaciar}
                    className="text-small text-brand-error font-semibold hover:underline"
                  >
                    Vaciar
                  </button>
                </div>
              )}
            </CardHeader>
            <CardBody className="p-0">
              {carrito.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <svg
                    className="w-12 h-12 text-gray-300 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="text-gray-500 font-semibold">Tu carrito está vacío</p>
                  <p className="text-small text-gray-400 mt-1">
                    Buscá un producto para comenzar la venta.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-2 text-gray-500 font-semibold">Producto</th>
                      <th className="text-right px-4 py-2 text-gray-500 font-semibold">Precio</th>
                      <th className="text-center px-4 py-2 text-gray-500 font-semibold">Cant.</th>
                      <th className="text-right px-4 py-2 text-gray-500 font-semibold">Subtotal</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {carrito.items.map((item) => {
                      const excedido = item.cantidad > item.producto.stockDisponible;
                      const subtotal = Number(item.producto.precioMinorista) * item.cantidad;
                      return (
                        <tr key={item.producto.id} className={excedido ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-brand-dark">{item.producto.nombre}</p>
                            <code className="text-xs font-mono text-gray-400">
                              {item.producto.codigoInterno}
                            </code>
                            {excedido && (
                              <p className="text-xs text-amber-600 mt-0.5">
                                ⚠ Solo hay {item.producto.stockDisponible} disponible
                                {item.producto.stockDisponible !== 1 ? 's' : ''}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                            {formatImporte(item.producto.precioMinorista)}
                          </td>
                          <td className="px-4 py-3">
                            {/* Stepper */}
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  carrito.actualizarCantidad(item.producto.id, item.cantidad - 1)
                                }
                                className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-bold"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={
                                  cantidadesRef.current[item.producto.id] !== undefined &&
                                  cantidadesRef.current[item.producto.id] !== String(item.cantidad)
                                    ? cantidadesRef.current[item.producto.id]
                                    : item.cantidad
                                }
                                onChange={(e) =>
                                  handleCantidadChange(item.producto.id, e.target.value)
                                }
                                onBlur={() => handleCantidadBlur(item.producto.id)}
                                className="w-12 text-center border border-gray-300 rounded-md py-0.5 focus:outline-none focus:border-brand-yellow text-sm"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  carrito.actualizarCantidad(item.producto.id, item.cantidad + 1)
                                }
                                className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-brand-dark whitespace-nowrap">
                            {formatImporte(subtotal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => carrito.quitar(item.producto.id)}
                              className="text-gray-400 hover:text-brand-error transition-colors"
                              title="Quitar"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          {errorVenta && (
            <div
              className="bg-red-50 border border-brand-error text-brand-error px-4 py-3 rounded-md text-sm"
              role="alert"
            >
              {errorVenta}
            </div>
          )}
        </div>

        {/* Columna derecha: resumen + cliente */}
        <div className="w-80 shrink-0 space-y-4 sticky top-4">
          {/* Resumen de venta */}
          <Card>
            <CardHeader>
              <h2 className="text-h3 font-semibold text-brand-dark">Resumen de venta</h2>
            </CardHeader>
            <CardBody>
              {carrito.items.length === 0 ? (
                <p className="text-small text-gray-400 text-center py-2">
                  Agregá productos al carrito
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>
                      {formatImporte(
                        carrito.items.reduce(
                          (a, i) => a + Number(i.producto.precioMinorista) * i.cantidad,
                          0,
                        ),
                      )}
                    </span>
                  </div>
                  {descuentoTotal !== null && descuentoTotal > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Desc. fidelidad</span>
                      <span>−{formatImporte(descuentoTotal)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base text-brand-dark">
                    <span>TOTAL</span>
                    <span>
                      {cotizacion
                        ? formatImporte(cotizacion.total)
                        : formatImporte(
                            carrito.items.reduce(
                              (a, i) => a + Number(i.producto.precioMinorista) * i.cantidad,
                              0,
                            ),
                          )}
                    </span>
                  </div>
                  {cotizando && (
                    <p className="text-xs text-gray-400 text-right">Actualizando…</p>
                  )}
                  {errorCotizacion && (
                    <p className="text-xs text-amber-600">{errorCotizacion}</p>
                  )}
                </div>
              )}

              <div className="mt-4">
                <Button
                  onClick={() => void confirmarVenta()}
                  disabled={!puedeConfirmar}
                  className="w-full"
                >
                  {creandoVenta ? 'Confirmando…' : 'Confirmar venta (F9)'}
                </Button>
                {hayLineasConStockExcedido && (
                  <p className="text-xs text-amber-600 mt-1 text-center">
                    Hay ítems con cantidad mayor al stock disponible
                  </p>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Cliente */}
          <Card>
            <CardHeader>
              <h2 className="text-h3 font-semibold text-brand-dark">Cliente</h2>
            </CardHeader>
            <CardBody>
              <BuscadorClientes clienteSeleccionado={cliente} onSeleccionar={setCliente} />
              {cliente && (
                <div className="mt-2 space-y-0.5">
                  {cliente.nivel && (
                    <p className="text-small text-gray-500">
                      Nivel{' '}
                      <span className="font-semibold text-brand-dark">
                        {nivelLabel(cliente.nivel)}
                      </span>
                    </p>
                  )}
                </div>
              )}
              {!cliente && (
                <p className="text-small text-gray-400 mt-1">
                  Consumidor final (sin identificar)
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Modal de cobro */}
      {ventaConfirmada && modalCobroAbierto && (
        <ModalCobro
          ventaId={ventaConfirmada.id}
          total={ventaConfirmada.total}
          numero={ventaConfirmada.numero}
          onCobrada={() => {
            setModalCobroAbierto(false);
            setResultadoCobrado(true);
            setModalResultadoAbierto(true);
          }}
          onClose={() => {
            setModalCobroAbierto(false);
            setResultadoCobrado(false);
            setModalResultadoAbierto(true);
          }}
        />
      )}

      {/* Modal de resultado */}
      {ventaConfirmada && modalResultadoAbierto && (
        <ModalResultado
          ventaId={ventaConfirmada.id}
          cobrada={resultadoCobrado}
          onNuevaVenta={() => {
            setModalResultadoAbierto(false);
            setVentaConfirmada(null);
            setCotizacion(null);
            navigate('/ventas/nueva');
          }}
          onCobrar={() => {
            setModalResultadoAbierto(false);
            setModalCobroAbierto(true);
          }}
        />
      )}
    </div>
  );
}
