import type {
  LoginRequest,
  LoginResponse,
  PerfilUsuario,
  Producto,
  Venta,
  CreateVentaRequest,
  Pago,
  ProductoBusqueda,
  CotizarVentaRequest,
  CotizacionResponse,
  CreatePagoVentaRequest,
  PagoVentaResponse,
  EstadoCajaResponse,
  AbrirCajaRequest,
  AperturaCaja,
  RegistrarMovimientoRequest,
  MovimientoCaja,
  RegistrarArqueoRequest,
  ArquearCajaResponse,
  AutorizarArqueoRequest,
  ArqueoCaja,
  CierreCaja,
  UsuarioResumen,
  StockConsolidado,
  Lote,
  MovimientoStock,
  RegistrarAjusteRequest,
  Proveedor,
  CreateProveedorRequest,
  UpdateProveedorRequest,
  Compra,
  CreateCompraRequest,
  RecibirCompraRequest,
  RecepcionCompra,
  PagoProveedor,
  CreatePagoProveedorRequest,
  DevolucionProveedor,
  CreateDevolucionProveedorRequest,
  AlertasInventario,
  PedidoListado,
  ActualizarEstadoPedidoRequest,
  UpdateProductoRequest,
  Cliente,
  CreateClienteRequest,
  UpdateClienteRequest,
  ReglaFidelizacion,
  CreateReglaFidelizacionRequest,
  UpdateReglaFidelizacionRequest,
  JerarquiaCatalogo,
} from '@otrarondamas/shared-types';

// En dev, Vite expone las env vars prefijadas VITE_ vía import.meta.env.
// Sin .env, cae al puerto por defecto de la API en desarrollo local.
// Exportada porque el link "Ingresar con Google" navega el navegador
// entero a ${API_BASE_URL}/auth/google — no es un fetch de este cliente,
// así que no puede pasar por request() (ver LoginPage.tsx).
export const API_BASE_URL =
  (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // El token puede estar en localStorage (login con "Recordarme") o en
  // sessionStorage (sin "Recordarme", ver AuthContext.tsx) — nunca en
  // ambos a la vez, pero acá no sabemos cuál eligió el usuario al
  // loguearse, así que se prueban los dos.
  const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(response.status, message ?? 'Error de red');
  }

  return response.json() as Promise<T>;
}

export const api = {
  login: (credentials: LoginRequest) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  me: () => request<PerfilUsuario>('/auth/me'),

  buscarProductos: (search: string) =>
    request<Producto[]>(`/catalogo/productos?search=${encodeURIComponent(search)}`),
  // Inc-1: búsqueda de productos para el POS (GET /ventas/productos?search=)
  // Solo activos con stock; devuelve ProductoBusqueda con familia, stockDisponible, etc.
  buscarProductosVenta: (search: string) =>
    request<ProductoBusqueda[]>(`/ventas/productos?search=${encodeURIComponent(search)}`),
  // Árbol de categorización (Familia→Subfamilia→Tipo→Subtipo), para
  // poblar selectores en cascada — ver JerarquiaCatalogoController.
  jerarquiaCatalogo: () => request<JerarquiaCatalogo>('/catalogo/jerarquia'),
  // Fase 6 de Tienda Online — solo el % de descuento se edita desde acá
  // por ahora (ver PreciosPage.tsx), aunque el endpoint acepta
  // cualquier campo del producto. Requiere productos.gestionar.
  actualizarProducto: (id: string, dto: UpdateProductoRequest) =>
    request<Producto>(`/catalogo/productos/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),

  // Inc-2 (RF-VTA-09): cotización previa del total antes de confirmar
  cotizarVenta: (dto: CotizarVentaRequest) =>
    request<CotizacionResponse>('/ventas/cotizacion', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  crearVenta: (dto: CreateVentaRequest) =>
    request<Venta>('/ventas', { method: 'POST', body: JSON.stringify(dto) }),
  getVenta: (id: string) => request<Venta>(`/ventas/${id}`),
  listarVentas: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: Venta[]; total: number; page: number; pageSize: number }>(
      `/ventas${qs}`,
    );
  },
  getComprobante: (ventaId: string) => request<Venta>(`/ventas/${ventaId}/comprobante`),

  // Inc-3 (RF-VTA-14): pagos mixtos con vuelto
  crearPago: (ventaId: string, dto: CreatePagoVentaRequest) =>
    request<PagoVentaResponse>(`/ventas/${ventaId}/pagos`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  listarPagos: (ventaId: string) => request<Pago[]>(`/ventas/${ventaId}/pagos`),

  estadoCaja: () => request<EstadoCajaResponse>('/caja/estado'),
  abrirCaja: (dto: AbrirCajaRequest) =>
    request<AperturaCaja>('/caja/apertura', { method: 'POST', body: JSON.stringify(dto) }),
  registrarMovimientoCaja: (dto: RegistrarMovimientoRequest) =>
    request<MovimientoCaja>('/caja/movimientos', { method: 'POST', body: JSON.stringify(dto) }),
  listarMovimientosCaja: () => request<MovimientoCaja[]>('/caja/movimientos'),
  arquearCaja: (dto: RegistrarArqueoRequest) =>
    request<ArquearCajaResponse>('/caja/arqueo', { method: 'POST', body: JSON.stringify(dto) }),
  // D-06: credenciales de quien autoriza, no las de la sesión activa.
  autorizarArqueo: (arqueoId: string, dto: AutorizarArqueoRequest) =>
    request<ArqueoCaja>(`/caja/arqueo/${arqueoId}/autorizar`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  cerrarCaja: () => request<CierreCaja>('/caja/cierre', { method: 'POST' }),

  listarUsuarios: () => request<UsuarioResumen[]>('/usuarios'),

  // Inventario — Fase 1 (solo lectura, ver docs/scaffolding-notas.md).
  stockConsolidado: (search?: string) =>
    request<StockConsolidado[]>(
      `/inventario/stock${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    ),
  lotesDeProducto: (productoId: string) =>
    request<Lote[]>(`/inventario/productos/${productoId}/lotes`),
  movimientosDeProducto: (productoId: string) =>
    request<MovimientoStock[]>(`/inventario/productos/${productoId}/movimientos`),
  // Fase 2 — requiere el permiso inventario.ajustes.
  registrarAjuste: (dto: RegistrarAjusteRequest) =>
    request<MovimientoStock>('/inventario/ajustes', { method: 'POST', body: JSON.stringify(dto) }),
  // Fase 4 — solo lectura.
  alertasInventario: () => request<AlertasInventario>('/inventario/alertas'),

  // Compras y proveedores — RF-12 Fase 1. Las mutaciones requieren el
  // permiso compras.gestionar.
  listarProveedores: () => request<Proveedor[]>('/proveedores'),
  crearProveedor: (dto: CreateProveedorRequest) =>
    request<Proveedor>('/proveedores', { method: 'POST', body: JSON.stringify(dto) }),
  actualizarProveedor: (id: string, dto: UpdateProveedorRequest) =>
    request<Proveedor>(`/proveedores/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),

  listarCompras: () => request<Compra[]>('/compras'),
  getCompra: (id: string) => request<Compra>(`/compras/${id}`),
  crearCompra: (dto: CreateCompraRequest) =>
    request<Compra>('/compras', { method: 'POST', body: JSON.stringify(dto) }),
  emitirCompra: (id: string) => request<Compra>(`/compras/${id}/emitir`, { method: 'POST' }),
  recibirCompra: (id: string, dto: RecibirCompraRequest) =>
    request<RecepcionCompra>(`/compras/${id}/recepciones`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  listarPagosCompra: (id: string) => request<PagoProveedor[]>(`/compras/${id}/pagos`),
  crearPagoCompra: (id: string, dto: CreatePagoProveedorRequest) =>
    request<PagoProveedor>(`/compras/${id}/pagos`, { method: 'POST', body: JSON.stringify(dto) }),
  listarDevolucionesCompra: (id: string) =>
    request<DevolucionProveedor[]>(`/compras/${id}/devoluciones`),
  crearDevolucionCompra: (id: string, dto: CreateDevolucionProveedorRequest) =>
    request<DevolucionProveedor>(`/compras/${id}/devoluciones`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  // Pedidos — RF-06 Fase 4. Requiere el permiso pedidos.gestionar en
  // todo, incluido el listado (expone datos personales del cliente).
  listarPedidos: (estado?: string) =>
    request<PedidoListado[]>(`/pedidos${estado ? `?estado=${encodeURIComponent(estado)}` : ''}`),
  actualizarEstadoPedido: (id: string, dto: ActualizarEstadoPedidoRequest) =>
    request<PedidoListado>(`/pedidos/${id}/estado`, { method: 'PATCH', body: JSON.stringify(dto) }),

  // Clientes — Fase 1 del roadmap de Fidelización. GET abierto a
  // cualquier usuario logueado (mismo criterio que Compras/Catálogo);
  // crear/editar requiere clientes.gestionar.
  listarClientes: (search?: string) =>
    request<Cliente[]>(`/clientes${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCliente: (id: string) => request<Cliente>(`/clientes/${id}`),
  crearCliente: (dto: CreateClienteRequest) =>
    request<Cliente>('/clientes', { method: 'POST', body: JSON.stringify(dto) }),
  actualizarCliente: (id: string, dto: UpdateClienteRequest) =>
    request<Cliente>(`/clientes/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),

  // Reglas de fidelización — Fase 4 del roadmap. Requiere
  // fidelizacion.gestionar en todo, incluido el listado (política de
  // precios del negocio, mismo criterio que Pedidos).
  listarReglasFidelizacion: () => request<ReglaFidelizacion[]>('/reglas-fidelizacion'),
  crearReglaFidelizacion: (dto: CreateReglaFidelizacionRequest) =>
    request<ReglaFidelizacion>('/reglas-fidelizacion', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  actualizarReglaFidelizacion: (id: string, dto: UpdateReglaFidelizacionRequest) =>
    request<ReglaFidelizacion>(`/reglas-fidelizacion/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};
