import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Truck } from 'lucide-react';
import type {
  Proveedor,
  Compra,
  Producto,
  CreateCompraItemRequest,
  RecibirCompraItemRequest,
  PagoProveedor,
  CreateDevolucionProveedorItemRequest,
} from '@otrarondamas/shared-types';
import { Card, CardHeader, CardBody, Input, Button } from '../../components';
import { api, ApiError } from '../../lib/api';

const ESTADO_LABEL: Record<Compra['estado'], string> = {
  BORRADOR: 'Borrador',
  EMITIDA: 'Emitida',
  RECEPCION_PARCIAL: 'Recepción parcial',
  RECIBIDA: 'Recibida',
};

const ESTADO_COLOR: Record<Compra['estado'], string> = {
  BORRADOR: 'bg-gray-100 text-gray-600',
  EMITIDA: 'bg-blue-100 text-blue-700',
  RECEPCION_PARCIAL: 'bg-amber-100 text-amber-700',
  RECIBIDA: 'bg-green-100 text-green-700',
};

/**
 * RF-12 (proveedores, orden de compra, recepción, pagos, devoluciones).
 * Mutaciones requieren el permiso compras.gestionar — el frontend no
 * oculta los controles según permiso (mismo criterio que CajaPage/
 * InventarioPage), el backend rechaza con 403 si corresponde.
 */
export function ComprasPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [sugerenciasProducto, setSugerenciasProducto] = useState<Producto[]>([]);
  const [busquedaActivaIndex, setBusquedaActivaIndex] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mostrarFormProveedor, setMostrarFormProveedor] = useState(false);
  const [nombreProveedor, setNombreProveedor] = useState('');
  const [emailProveedor, setEmailProveedor] = useState('');
  const [telefonoProveedor, setTelefonoProveedor] = useState('');
  const [creandoProveedor, setCreandoProveedor] = useState(false);

  const [mostrarFormCompra, setMostrarFormCompra] = useState(false);
  const [proveedorIdNuevaCompra, setProveedorIdNuevaCompra] = useState('');
  const [itemsNuevaCompra, setItemsNuevaCompra] = useState<CreateCompraItemRequest[]>([
    { productoId: '', cantidadPedida: 1, costoUnitario: 0 },
  ]);
  const [busquedasItem, setBusquedasItem] = useState<string[]>(['']);
  const [creandoCompra, setCreandoCompra] = useState(false);

  const [expandida, setExpandida] = useState<string | null>(null);
  const [accionando, setAccionando] = useState<string | null>(null);
  const [recepcionEnCurso, setRecepcionEnCurso] = useState<
    Record<string, RecibirCompraItemRequest>
  >({});

  // Pagos a proveedor
  const [pagosCompra, setPagosCompra] = useState<Record<string, PagoProveedor[]>>({});
  const [mostrarPagos, setMostrarPagos] = useState<string | null>(null);
  const [montoPago, setMontoPago] = useState('');
  const [medioPago, setMediaPago] = useState('Transferencia');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [registrandoPago, setRegistrandoPago] = useState(false);

  // Devoluciones a proveedor
  const [mostrarDevolucion, setMostrarDevolucion] = useState<string | null>(null);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [itemsDev, setItemsDev] = useState<CreateDevolucionProveedorItemRequest[]>([
    { productoId: '', cantidad: 1, costoUnitario: 0 },
  ]);
  const [busquedasItemDev, setBusquedasItemDev] = useState<string[]>(['']);
  const [registrandoDevolucion, setRegistrandoDevolucion] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [prov, comp] = await Promise.all([api.listarProveedores(), api.listarCompras()]);
      setProveedores(prov);
      setCompras(comp);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar Compras');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // react-hooks/set-state-in-effect marca como riesgoso cualquier
    // setState alcanzable desde el cuerpo síncrono del efecto — cargar()
    // hace setCargando(true) como primera línea. Promise.resolve() saca
    // la llamada del ciclo de render síncrono actual (mismo patrón ya
    // usado en GoogleCallbackPage/CajaPage).
    void Promise.resolve().then(() => cargar());
  }, [cargar]);

  async function crearProveedor() {
    if (!nombreProveedor.trim()) return;
    setCreandoProveedor(true);
    setError(null);
    try {
      await api.crearProveedor({
        nombre: nombreProveedor.trim(),
        email: emailProveedor.trim() || undefined,
        telefono: telefonoProveedor.trim() || undefined,
      });
      setNombreProveedor('');
      setEmailProveedor('');
      setTelefonoProveedor('');
      setMostrarFormProveedor(false);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el proveedor');
    } finally {
      setCreandoProveedor(false);
    }
  }

  function agregarItemCompra() {
    setItemsNuevaCompra((prev) => [
      ...prev,
      { productoId: '', cantidadPedida: 1, costoUnitario: 0 },
    ]);
    setBusquedasItem((prev) => [...prev, '']);
  }

  function quitarItemCompra(index: number) {
    setItemsNuevaCompra((prev) => prev.filter((_, i) => i !== index));
    setBusquedasItem((prev) => prev.filter((_, i) => i !== index));
  }

  function actualizarItemCompra(
    index: number,
    campo: keyof CreateCompraItemRequest,
    valor: string,
  ) {
    /* eslint-disable indent -- falso positivo conocido de la regla
       `indent` base con un ternario que devuelve un objeto anidado
       (mismo patrón que dto/login.dto.ts y catalogo.controller.ts) */
    setItemsNuevaCompra((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [campo]: campo === 'productoId' ? valor : Number(valor),
            }
          : item,
      ),
    );
    /* eslint-enable indent */
  }

  function seleccionarProductoItem(index: number, producto: Producto) {
    actualizarItemCompra(index, 'productoId', producto.id);
    setBusquedasItem((prev) => prev.map((b, i) => (i === index ? producto.nombre : b)));
    setSugerenciasProducto([]);
    setBusquedaActivaIndex(null);
  }

  async function buscarProducto(busqueda: string, index: number) {
    setBusquedaActivaIndex(index);
    setBusquedasItem((prev) => prev.map((b, i) => (i === index ? busqueda : b)));
    if (!busqueda.trim()) {
      actualizarItemCompra(index, 'productoId', '');
      setSugerenciasProducto([]);
      return;
    }
    try {
      const resultados = await api.buscarProductos(busqueda);
      setSugerenciasProducto(resultados.slice(0, 8));
    } catch {
      setSugerenciasProducto([]);
    }
  }

  // --- Pagos a proveedor -------------------------------------------

  async function abrirPagos(compraId: string) {
    setMostrarPagos(compraId);
    if (!(compraId in pagosCompra)) {
      try {
        const pagos = await api.listarPagosCompra(compraId);
        setPagosCompra((prev) => ({ ...prev, [compraId]: pagos }));
      } catch {
        setPagosCompra((prev) => ({ ...prev, [compraId]: [] }));
      }
    }
  }

  async function registrarPago(compraId: string) {
    const monto = parseFloat(montoPago);
    if (!monto || monto <= 0) {
      setError('Ingresá un monto válido.');
      return;
    }
    setRegistrandoPago(true);
    setError(null);
    try {
      const pago = await api.crearPagoCompra(compraId, {
        monto,
        medioPago,
        referencia: referenciaPago.trim() || undefined,
      });
      setPagosCompra((prev) => ({
        ...prev,
        [compraId]: [pago, ...(prev[compraId] ?? [])],
      }));
      setMontoPago('');
      setReferenciaPago('');
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el pago');
    } finally {
      setRegistrandoPago(false);
    }
  }

  // --- Devoluciones a proveedor ------------------------------------

  function agregarItemDevolucion() {
    setItemsDev((prev) => [...prev, { productoId: '', cantidad: 1, costoUnitario: 0 }]);
    setBusquedasItemDev((prev) => [...prev, '']);
  }

  function quitarItemDevolucion(index: number) {
    setItemsDev((prev) => prev.filter((_, i) => i !== index));
    setBusquedasItemDev((prev) => prev.filter((_, i) => i !== index));
  }

  function actualizarItemDev(
    index: number,
    campo: keyof CreateDevolucionProveedorItemRequest,
    valor: string,
  ) {
    setItemsDev((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [campo]: campo === 'productoId' ? valor : Number(valor) } : item,
      ),
    );
  }

  const [sugerenciasDevolucion, setSugerenciasDevolucion] = useState<Producto[]>([]);
  const [busquedaActivaDevIndex, setBusquedaActivaDevIndex] = useState<number | null>(null);

  function seleccionarProductoDevolucion(index: number, producto: Producto) {
    actualizarItemDev(index, 'productoId', producto.id);
    setBusquedasItemDev((prev) => prev.map((b, i) => (i === index ? producto.nombre : b)));
    setSugerenciasDevolucion([]);
    setBusquedaActivaDevIndex(null);
  }

  async function buscarProductoDevolucion(busqueda: string, index: number) {
    setBusquedaActivaDevIndex(index);
    setBusquedasItemDev((prev) => prev.map((b, i) => (i === index ? busqueda : b)));
    if (!busqueda.trim()) {
      actualizarItemDev(index, 'productoId', '');
      setSugerenciasDevolucion([]);
      return;
    }
    try {
      const resultados = await api.buscarProductos(busqueda);
      setSugerenciasDevolucion(resultados.slice(0, 8));
    } catch {
      setSugerenciasDevolucion([]);
    }
  }

  async function registrarDevolucion(compraId: string) {
    if (!motivoDevolucion.trim()) {
      setError('Ingresá el motivo de la devolución.');
      return;
    }
    const itemsValidos = itemsDev.filter(
      (i) => i.productoId.trim() && i.cantidad > 0 && i.costoUnitario >= 0,
    );
    if (itemsValidos.length === 0) {
      setError('Agregá al menos un producto válido.');
      return;
    }
    setRegistrandoDevolucion(true);
    setError(null);
    try {
      await api.crearDevolucionCompra(compraId, {
        motivo: motivoDevolucion.trim(),
        items: itemsValidos,
      });
      setMostrarDevolucion(null);
      setMotivoDevolucion('');
      setItemsDev([{ productoId: '', cantidad: 1, costoUnitario: 0 }]);
      setBusquedasItemDev(['']);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar la devolución');
    } finally {
      setRegistrandoDevolucion(false);
    }
  }

  async function crearCompra() {
    if (!proveedorIdNuevaCompra) {
      setError('Elegí un proveedor.');
      return;
    }
    const itemsValidos = itemsNuevaCompra.filter(
      (i) => i.productoId.trim() && i.cantidadPedida > 0 && i.costoUnitario > 0,
    );
    if (itemsValidos.length === 0) {
      setError('Agregá al menos un producto válido (con id, cantidad y costo).');
      return;
    }
    setCreandoCompra(true);
    setError(null);
    try {
      await api.crearCompra({ proveedorId: proveedorIdNuevaCompra, items: itemsValidos });
      setProveedorIdNuevaCompra('');
      setItemsNuevaCompra([{ productoId: '', cantidadPedida: 1, costoUnitario: 0 }]);
      setMostrarFormCompra(false);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la compra');
    } finally {
      setCreandoCompra(false);
    }
  }

  async function emitir(compraId: string) {
    setAccionando(compraId);
    setError(null);
    try {
      await api.emitirCompra(compraId);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo emitir la compra');
    } finally {
      setAccionando(null);
    }
  }

  function iniciarRecepcion(compraItemId: string) {
    setRecepcionEnCurso((prev) => ({
      ...prev,
      [compraItemId]: { compraItemId, cantidadRecibida: 0, vencimiento: '', numeroLote: '' },
    }));
  }

  function actualizarRecepcion(
    compraItemId: string,
    campo: keyof RecibirCompraItemRequest,
    valor: string,
  ) {
    setRecepcionEnCurso((prev) => ({
      ...prev,
      [compraItemId]: {
        ...prev[compraItemId],
        [campo]: campo === 'cantidadRecibida' ? Number(valor) : valor,
      },
    }));
  }

  function puedeConfirmarRecepcion(compra: Compra) {
    const enEstadoRecibible = compra.estado === 'EMITIDA' || compra.estado === 'RECEPCION_PARCIAL';
    return enEstadoRecibible && Object.keys(recepcionEnCurso).length > 0;
  }

  async function confirmarRecepcion(compraId: string) {
    const items = Object.values(recepcionEnCurso).filter(
      (item) => item.cantidadRecibida > 0 && item.vencimiento && item.numeroLote.trim(),
    );
    if (items.length === 0) {
      setError('Completá cantidad, vencimiento y número de lote de al menos un ítem a recibir.');
      return;
    }
    setAccionando(compraId);
    setError(null);
    try {
      await api.recibirCompra(compraId, { items });
      setRecepcionEnCurso({});
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar la recepción');
    } finally {
      setAccionando(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-bold">Compras</h1>
      {error && <p className="text-brand-error">{error}</p>}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-h3 font-bold">Proveedores</h2>
          <Button size="sm" onClick={() => setMostrarFormProveedor((v) => !v)}>
            <Plus className="w-4 h-4 inline mr-1" /> Nuevo proveedor
          </Button>
        </CardHeader>
        <CardBody>
          {mostrarFormProveedor && (
            <div className="mb-4 p-4 bg-gray-50 rounded-md space-y-3">
              <Input
                placeholder="Nombre"
                value={nombreProveedor}
                onChange={(e) => setNombreProveedor(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Email (opcional)"
                  value={emailProveedor}
                  onChange={(e) => setEmailProveedor(e.target.value)}
                />
                <Input
                  placeholder="Teléfono (opcional)"
                  value={telefonoProveedor}
                  onChange={(e) => setTelefonoProveedor(e.target.value)}
                />
              </div>
              <Button size="sm" disabled={creandoProveedor} onClick={() => void crearProveedor()}>
                {creandoProveedor ? 'Guardando...' : 'Guardar proveedor'}
              </Button>
            </div>
          )}
          {cargando ? (
            <p className="text-gray-500">Cargando...</p>
          ) : proveedores.length === 0 ? (
            <p className="text-gray-500">Sin proveedores cargados.</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {proveedores.map((prov) => (
                <li key={prov.id} className="border border-gray-200 rounded-md px-3 py-2">
                  <p className="font-semibold">{prov.nombre}</p>
                  <p className="text-gray-500 text-xs">
                    {[prov.email, prov.telefono].filter(Boolean).join(' · ') || 'Sin contacto'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-h3 font-bold">Órdenes de compra</h2>
          <Button size="sm" onClick={() => setMostrarFormCompra((v) => !v)}>
            <Plus className="w-4 h-4 inline mr-1" /> Nueva orden
          </Button>
        </CardHeader>
        <CardBody>
          {mostrarFormCompra && (
            <div className="mb-4 p-4 bg-gray-50 rounded-md space-y-3">
              <select
                value={proveedorIdNuevaCompra}
                onChange={(e) => setProveedorIdNuevaCompra(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Elegí un proveedor...</option>
                {proveedores.map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    {prov.nombre}
                  </option>
                ))}
              </select>

              {itemsNuevaCompra.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={busquedasItem[index] ?? ''}
                        onChange={(e) => void buscarProducto(e.target.value, index)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                      />
                      {busquedaActivaIndex === index && sugerenciasProducto.length > 0 && (
                        <ul className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow text-xs max-h-40 overflow-y-auto">
                          {sugerenciasProducto.map((prod) => (
                            <li key={prod.id}>
                              <button
                                type="button"
                                className="w-full text-left px-2 py-1.5 hover:bg-gray-50"
                                onClick={() => seleccionarProductoItem(index, prod)}
                              >
                                {prod.nombre}
                                {prod.codigoBarras && (
                                  <span className="text-gray-400 ml-1">· {prod.codigoBarras}</span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <input
                      type="number"
                      placeholder="Cantidad"
                      value={item.cantidadPedida || ''}
                      onChange={(e) =>
                        actualizarItemCompra(index, 'cantidadPedida', e.target.value)
                      }
                      className="w-24 px-2 py-1.5 border border-gray-300 rounded text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Costo unit."
                      value={item.costoUnitario || ''}
                      onChange={(e) => actualizarItemCompra(index, 'costoUnitario', e.target.value)}
                      className="w-24 px-2 py-1.5 border border-gray-300 rounded text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => quitarItemCompra(index)}
                      className="text-gray-400 hover:text-brand-error"
                      aria-label="Quitar ítem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {item.productoId && (
                    <p className="text-xs text-gray-400 pl-1 font-mono truncate">
                      id: {item.productoId}
                    </p>
                  )}
                </div>
              ))}
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={agregarItemCompra}
                  className="text-xs text-gray-500 hover:text-brand-dark"
                >
                  + Agregar producto
                </button>
                <Button size="sm" disabled={creandoCompra} onClick={() => void crearCompra()}>
                  {creandoCompra ? 'Guardando...' : 'Crear orden (borrador)'}
                </Button>
              </div>
            </div>
          )}

          {cargando ? (
            <p className="text-gray-500">Cargando...</p>
          ) : compras.length === 0 ? (
            <p className="text-gray-500">Sin órdenes de compra todavía.</p>
          ) : (
            <div className="space-y-2">
              {compras.map((compra) => (
                <div key={compra.id} className="border border-gray-200 rounded-md">
                  <button
                    type="button"
                    onClick={() => setExpandida(expandida === compra.id ? null : compra.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {expandida === compra.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <Truck className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-sm">
                        {compra.proveedor?.nombre ?? compra.proveedorId}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[compra.estado]}`}
                      >
                        {ESTADO_LABEL[compra.estado]}
                      </span>
                    </div>
                    <span className="font-mono text-sm">${Number(compra.total).toFixed(2)}</span>
                  </button>

                  {expandida === compra.id && (
                    <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 space-y-4">
                      {/* Saldo */}
                      <div className="flex gap-6 text-xs text-gray-600">
                        <span>
                          Total:{' '}
                          <strong className="font-mono">${Number(compra.total).toFixed(2)}</strong>
                        </span>
                        <span>
                          Pagado:{' '}
                          <strong className="font-mono text-green-700">
                            ${Number(compra.totalPagado ?? 0).toFixed(2)}
                          </strong>
                        </span>
                        <span>
                          Saldo:{' '}
                          <strong className="font-mono text-amber-700">
                            ${Number(compra.saldo ?? compra.total).toFixed(2)}
                          </strong>
                        </span>
                      </div>

                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="pb-1">Producto</th>
                            <th className="pb-1 text-right">Pedido</th>
                            <th className="pb-1 text-right">Recibido</th>
                            <th className="pb-1 text-right">Costo unit.</th>
                            {compra.estado !== 'BORRADOR' && compra.estado !== 'RECIBIDA' && (
                              <th className="pb-1 text-right">Recibir ahora</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(compra.items ?? []).map((item) => {
                            const pendiente =
                              Number(item.cantidadPedida) - Number(item.cantidadRecibida);
                            const recepcion = recepcionEnCurso[item.id];
                            return (
                              <tr key={item.id} className="border-t border-gray-200">
                                <td className="py-1.5 font-mono">{item.productoId}</td>
                                <td className="py-1.5 text-right">{item.cantidadPedida}</td>
                                <td className="py-1.5 text-right">{item.cantidadRecibida}</td>
                                <td className="py-1.5 text-right">
                                  ${Number(item.costoUnitario).toFixed(2)}
                                </td>
                                {compra.estado !== 'BORRADOR' && compra.estado !== 'RECIBIDA' && (
                                  <td className="py-1.5">
                                    {pendiente <= 0 ? (
                                      <span className="text-gray-400 text-right block">
                                        completo
                                      </span>
                                    ) : recepcion ? (
                                      <div className="flex gap-1 justify-end">
                                        <input
                                          type="number"
                                          placeholder="Cant."
                                          max={pendiente}
                                          value={recepcion.cantidadRecibida || ''}
                                          onChange={(e) =>
                                            actualizarRecepcion(
                                              item.id,
                                              'cantidadRecibida',
                                              e.target.value,
                                            )
                                          }
                                          className="w-16 px-1.5 py-1 border border-gray-300 rounded text-xs"
                                        />
                                        <input
                                          type="date"
                                          value={recepcion.vencimiento}
                                          onChange={(e) =>
                                            actualizarRecepcion(
                                              item.id,
                                              'vencimiento',
                                              e.target.value,
                                            )
                                          }
                                          className="px-1.5 py-1 border border-gray-300 rounded text-xs"
                                        />
                                        <input
                                          type="text"
                                          placeholder="N° lote"
                                          value={recepcion.numeroLote}
                                          onChange={(e) =>
                                            actualizarRecepcion(
                                              item.id,
                                              'numeroLote',
                                              e.target.value,
                                            )
                                          }
                                          className="w-20 px-1.5 py-1 border border-gray-300 rounded text-xs"
                                        />
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => iniciarRecepcion(item.id)}
                                        className="text-brand-yellow hover:underline text-xs float-right"
                                      >
                                        Recibir
                                      </button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div className="flex justify-end gap-2">
                        {compra.estado === 'BORRADOR' && (
                          <Button
                            size="sm"
                            disabled={accionando === compra.id}
                            onClick={() => void emitir(compra.id)}
                          >
                            {accionando === compra.id ? 'Emitiendo...' : 'Emitir orden'}
                          </Button>
                        )}
                        {/* eslint-disable-next-line indent -- falso positivo
                            conocido de la regla `indent` base con un && de dos
                            condiciones cuyo consecuente es JSX multilínea */}
                        {puedeConfirmarRecepcion(compra) && (
                          <Button
                            size="sm"
                            disabled={accionando === compra.id}
                            onClick={() => void confirmarRecepcion(compra.id)}
                          >
                            {accionando === compra.id ? 'Guardando...' : 'Confirmar recepción'}
                          </Button>
                        )}
                      </div>

                      {/* Pagos a proveedor */}
                      <div className="border-t border-gray-200 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-600">Pagos</span>
                          <button
                            type="button"
                            className="text-xs text-brand-yellow hover:underline"
                            onClick={() =>
                              void (mostrarPagos === compra.id
                                ? setMostrarPagos(null)
                                : abrirPagos(compra.id))
                            }
                          >
                            {mostrarPagos === compra.id ? 'Ocultar' : 'Ver / registrar pago'}
                          </button>
                        </div>
                        {mostrarPagos === compra.id && (
                          <div className="space-y-3">
                            {(pagosCompra[compra.id] ?? []).length === 0 ? (
                              <p className="text-xs text-gray-400">Sin pagos registrados.</p>
                            ) : (
                              <ul className="space-y-1 text-xs">
                                {(pagosCompra[compra.id] ?? []).map((pago) => (
                                  <li key={pago.id} className="flex justify-between text-gray-600">
                                    <span>
                                      {new Date(pago.fecha).toLocaleDateString('es-AR')} ·{' '}
                                      {pago.medioPago}
                                      {pago.referencia ? ` (${pago.referencia})` : ''}
                                    </span>
                                    <span className="font-mono font-semibold">
                                      ${Number(pago.monto).toFixed(2)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="flex gap-2 flex-wrap">
                              <input
                                type="number"
                                placeholder="Monto"
                                value={montoPago}
                                onChange={(e) => setMontoPago(e.target.value)}
                                className="w-28 px-2 py-1.5 border border-gray-300 rounded text-xs"
                              />
                              <select
                                value={medioPago}
                                onChange={(e) => setMediaPago(e.target.value)}
                                className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                              >
                                <option>Transferencia</option>
                                <option>Efectivo</option>
                                <option>Cheque</option>
                                <option>Débito</option>
                                <option>Crédito</option>
                              </select>
                              <input
                                type="text"
                                placeholder="Referencia (opcional)"
                                value={referenciaPago}
                                onChange={(e) => setReferenciaPago(e.target.value)}
                                className="flex-1 min-w-[120px] px-2 py-1.5 border border-gray-300 rounded text-xs"
                              />
                              <Button
                                size="sm"
                                disabled={registrandoPago}
                                onClick={() => void registrarPago(compra.id)}
                              >
                                {registrandoPago ? 'Guardando...' : 'Registrar pago'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Devoluciones a proveedor */}
                      {(compra.estado === 'RECEPCION_PARCIAL' || compra.estado === 'RECIBIDA') && (
                        <div className="border-t border-gray-200 pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-600">
                              Devoluciones
                            </span>
                            <button
                              type="button"
                              className="text-xs text-brand-yellow hover:underline"
                              onClick={() =>
                                setMostrarDevolucion(
                                  mostrarDevolucion === compra.id ? null : compra.id,
                                )
                              }
                            >
                              {mostrarDevolucion === compra.id
                                ? 'Cancelar'
                                : 'Registrar devolución'}
                            </button>
                          </div>
                          {mostrarDevolucion === compra.id && (
                            <div className="space-y-3">
                              <input
                                type="text"
                                placeholder="Motivo de la devolución"
                                value={motivoDevolucion}
                                onChange={(e) => setMotivoDevolucion(e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                              />
                              {/* eslint-disable indent -- falso positivo
                                  conocido de la regla `indent` con un &&
                                  de dos condiciones cuyo consecuente
                                  termina en JSX multilínea */}
                              {itemsDev.map((item, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                      <input
                                        type="text"
                                        placeholder="Buscar producto..."
                                        value={busquedasItemDev[idx] ?? ''}
                                        onChange={(e) =>
                                          void buscarProductoDevolucion(e.target.value, idx)
                                        }
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                                      />
                                      {busquedaActivaDevIndex === idx &&
                                        sugerenciasDevolucion.length > 0 && (
                                          <ul className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow text-xs max-h-32 overflow-y-auto">
                                            {sugerenciasDevolucion.map((prod) => (
                                              <li key={prod.id}>
                                                <button
                                                  type="button"
                                                  className="w-full text-left px-2 py-1.5 hover:bg-gray-50"
                                                  onClick={() =>
                                                    seleccionarProductoDevolucion(idx, prod)
                                                  }
                                                >
                                                  {prod.nombre}
                                                </button>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                    </div>
                                    <input
                                      type="number"
                                      placeholder="Cant."
                                      value={item.cantidad || ''}
                                      onChange={(e) =>
                                        actualizarItemDev(idx, 'cantidad', e.target.value)
                                      }
                                      className="w-20 px-2 py-1.5 border border-gray-300 rounded text-xs"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Costo"
                                      value={item.costoUnitario || ''}
                                      onChange={(e) =>
                                        actualizarItemDev(idx, 'costoUnitario', e.target.value)
                                      }
                                      className="w-20 px-2 py-1.5 border border-gray-300 rounded text-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => quitarItemDevolucion(idx)}
                                      className="text-gray-400 hover:text-brand-error"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {/* eslint-enable indent */}
                              <div className="flex justify-between items-center">
                                <button
                                  type="button"
                                  onClick={agregarItemDevolucion}
                                  className="text-xs text-gray-500 hover:text-brand-dark"
                                >
                                  + Agregar producto
                                </button>
                                <Button
                                  size="sm"
                                  disabled={registrandoDevolucion}
                                  onClick={() => void registrarDevolucion(compra.id)}
                                >
                                  {registrandoDevolucion ? 'Guardando...' : 'Confirmar devolución'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
