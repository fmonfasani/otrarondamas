import type {
  LoginRequest,
  LoginResponse,
  PerfilUsuario,
  Producto,
  Venta,
  CreateVentaRequest,
  Pago,
  CreatePagoRequest,
  EstadoCajaResponse,
  AbrirCajaRequest,
  AperturaCaja,
  RegistrarMovimientoRequest,
  MovimientoCaja,
  RegistrarArqueoRequest,
  ArquearCajaResponse,
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

  crearVenta: (dto: CreateVentaRequest) =>
    request<Venta>('/ventas', { method: 'POST', body: JSON.stringify(dto) }),
  getVenta: (id: string) => request<Venta>(`/ventas/${id}`),
  listarVentas: () => request<Venta[]>('/ventas'),

  crearPago: (ventaId: string, dto: CreatePagoRequest) =>
    request<Pago>(`/ventas/${ventaId}/pagos`, { method: 'POST', body: JSON.stringify(dto) }),
  listarPagos: (ventaId: string) => request<Pago[]>(`/ventas/${ventaId}/pagos`),

  estadoCaja: () => request<EstadoCajaResponse>('/caja/estado'),
  abrirCaja: (dto: AbrirCajaRequest) =>
    request<AperturaCaja>('/caja/apertura', { method: 'POST', body: JSON.stringify(dto) }),
  registrarMovimientoCaja: (dto: RegistrarMovimientoRequest) =>
    request<MovimientoCaja>('/caja/movimientos', { method: 'POST', body: JSON.stringify(dto) }),
  listarMovimientosCaja: () => request<MovimientoCaja[]>('/caja/movimientos'),
  arquearCaja: (dto: RegistrarArqueoRequest) =>
    request<ArquearCajaResponse>('/caja/arqueo', { method: 'POST', body: JSON.stringify(dto) }),
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
};
