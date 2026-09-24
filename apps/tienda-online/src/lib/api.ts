import type {
  ProductoTienda,
  CrearPedidoRequest,
  PedidoCreado,
  SeguimientoPedido,
  JerarquiaTienda,
} from '@otrarondamas/shared-types';

// Mismo patrón que pos-admin/src/lib/api.ts — en dev, Vite expone las
// env vars prefijadas VITE_ vía import.meta.env. Sin .env, cae al
// puerto por defecto de la API en desarrollo local.
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

// RF-17: los endpoints de cliente autenticado necesitan enviar el token.
// `requestAuth` es como `request` pero inyecta el Bearer token guardado
// en localStorage. Se importa con el token como argumento para no
// acoplar api.ts a localStorage directamente (más fácil de testear y
// de reusar desde contextos distintos).
async function requestAuth<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  return request<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

// A diferencia de pos-admin, la mayor parte de esta app habla con
// endpoints @Public() de la API (ver tienda.controller.ts). Los
// endpoints de cliente autenticado (RF-17) usan requestAuth().
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
  catalogo: (search?: string, familiaId?: string, subfamiliaId?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (familiaId) params.set('familiaId', familiaId);
    if (subfamiliaId) params.set('subfamiliaId', subfamiliaId);
    const qs = params.toString();
    return request<ProductoTienda[]>(`/tienda/productos${qs ? `?${qs}` : ''}`);
  },
  // Spec de diseño de Tienda Online: chips de Familia/Subfamilia para
  // navegar el catálogo sin depender solo del buscador de texto.
  jerarquia: () => request<JerarquiaTienda>('/tienda/jerarquia'),
  crearPedido: (dto: CrearPedidoRequest) =>
    request<PedidoCreado>('/tienda/pedidos', { method: 'POST', body: JSON.stringify(dto) }),
  seguimiento: (pedidoId: string) => request<SeguimientoPedido>(`/tienda/pedidos/${pedidoId}`),
};

// RF-17: endpoints del lado Cliente (autenticado o público de auth)
export const apiAuth = {
  registro: (dto: { nombre: string; email: string; password: string }) =>
    request<{ accessToken: string; cliente: ClienteSession }>(
      '/auth/cliente/registro',
      { method: 'POST', body: JSON.stringify(dto) },
    ),

  login: (dto: { email: string; password: string }) =>
    request<{ accessToken: string; cliente: ClienteSession }>(
      '/auth/cliente/login',
      { method: 'POST', body: JSON.stringify(dto) },
    ),

  me: (token: string) =>
    requestAuth<ClienteSession>('/auth/cliente/me', token),

  activarInvitacionMayorista: (dto: {
    token: string;
    nombre: string;
    password: string;
  }) =>
    request<{ accessToken: string; cliente: ClienteSession }>(
      '/invitaciones/mayorista/activar',
      { method: 'POST', body: JSON.stringify(dto) },
    ),

  miLegajo: (token: string) =>
    requestAuth<LegajoCliente>('/legajo/cliente/mi-legajo', token),

  actualizarLegajo: (
    token: string,
    dto: Partial<{ cuit: string; razonSocial: string; condicionIva: string }>,
  ) =>
    requestAuth<LegajoCliente>('/legajo/cliente/mi-legajo', token, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  estadoLegajo: (token: string) =>
    requestAuth<{ estadoLegajo: string; completo: boolean; faltantes: string[] }>(
      '/legajo/cliente/mi-legajo/estado',
      token,
    ),
};

// Tipos locales para los responses de auth del cliente
export interface ClienteSession {
  id: string;
  nombre: string;
  email: string;
  empresaId: string;
  empresaNombre: string;
  esMayorista: boolean;
  estadoLegajo: 'PENDIENTE' | 'APROBADO' | null;
  metodoLogin: 'google' | 'password';
  createdAt: string;
}

export interface LegajoCliente {
  id: string;
  clienteId: string;
  cuit: string | null;
  razonSocial: string | null;
  condicionIva: string | null;
  tipoFactura: string | null;
}
