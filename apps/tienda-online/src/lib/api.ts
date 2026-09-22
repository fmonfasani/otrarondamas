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

// A diferencia de pos-admin, esta app nunca manda un token — todo acá
// habla con endpoints @Public() de la API (ver tienda.controller.ts).
// No hay sesión que adjuntar.
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
