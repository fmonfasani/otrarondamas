import type {
  LoginRequest,
  LoginResponse,
  AuthenticatedUser,
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
} from '@otrarondamas/shared-types';

// En dev, Vite expone las env vars prefijadas VITE_ vía import.meta.env.
// Sin .env, cae al puerto por defecto de la API en desarrollo local.
const API_BASE_URL =
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
  const token = localStorage.getItem('accessToken');

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
  me: () => request<AuthenticatedUser>('/auth/me'),

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
};
