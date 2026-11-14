import { ApiError, apiRequest, getApiBaseUrl } from './api.server';
import type { ServerCart, StoreProduct } from '~/utils/store';

/** Server-side calls of the per-Business store (/tienda/:slug). */

const storePath = (slug: string, rest = '') => `/${encodeURIComponent(slug)}/tienda${rest}`;

async function publicGet<T>(path: string): Promise<T | null> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new ApiError(response.status, 'No pudimos cargar la tienda.');
  return (await response.json()) as T;
}

/** The store's public name; null when no Business has that slug. */
export const fetchStore = (slug: string) =>
  publicGet<{
    nombre: string;
    slug: string;
    pagosOnline?: boolean;
    /** Ajustes del negocio: what customers can see; empty strings when not set. */
    contacto?: { telefono: string; direccion: string; horario: string; descripcion: string };
  }>(storePath(slug));

export async function fetchCatalog(slug: string, search: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return (await publicGet<StoreProduct[]>(storePath(slug, `/productos${query}`))) ?? [];
}

/** The signed-in customer's cart (created if missing). */
export const loadServerCart = (jwt: string) => apiRequest<ServerCart>(jwt, '/cart', { method: 'POST' });

/** Makes the account's cart hold exactly these items. */
export async function replaceServerCart(jwt: string, items: Array<{ productoId: string; cantidad: number }>) {
  const cart = await loadServerCart(jwt);
  await apiRequest(jwt, `/cart/${cart.id}`, { method: 'DELETE' });
  await Promise.all(
    items.map((item) => apiRequest(jwt, `/cart/${cart.id}/items`, { method: 'POST', body: JSON.stringify(item) })),
  );
}

export async function placeCustomerOrder(jwt: string, slug: string, items: Array<{ productoId: string; cantidad: number }>) {
  const order = await apiRequest<{ id: string }>(jwt, storePath(slug, '/mis-pedidos'), {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  // The order is placed; failing to empty the saved cart must not report it as failed.
  await replaceServerCart(jwt, []).catch(() => undefined);
  return order;
}

export type CustomerOrder = {
  id: string;
  estado: string;
  total: string;
  /** Approved online payments so far (OR-B4-032). */
  pagado?: string;
  createdAt: string;
  items: Array<{ producto: string; cantidad: number }>;
};

/** Mercado Pago checkout for a confirmed order: the URL to send the customer to. */
export const payOrder = (jwt: string, slug: string, orderId: string) =>
  apiRequest<{ url: string }>(jwt, storePath(slug, `/mis-pedidos/${encodeURIComponent(orderId)}/pagar`), { method: 'POST' });

export const fetchCustomerOrders = (jwt: string, slug: string) =>
  apiRequest<CustomerOrder[]>(jwt, storePath(slug, '/mis-pedidos'));

export type ChatMessage = {
  id: string;
  clientMessageId: string;
  content: string | null;
  createdAt: string;
  mine: boolean;
  /** OR-B4-037: product cards (and photos) the team shared. */
  adjuntos?: Array<{ tipo: string; id: string; productoId?: string; nombre: string; precio?: string }>;
};

/** OR-B4-037 — the customer adds a product shared in the chat to their saved cart. */
export async function addToServerCart(jwt: string, productoId: string, cantidad = 1) {
  const cart = await loadServerCart(jwt);
  await apiRequest(jwt, `/cart/${cart.id}/items`, { method: 'POST', body: JSON.stringify({ productoId, cantidad }) });
}
export type CustomerChat = { conversationId: string | null; messages: ChatMessage[] };

/** The signed-in customer's conversation with the store (empty until they write). */
export const fetchCustomerChat = (jwt: string, slug: string) => apiRequest<CustomerChat>(jwt, storePath(slug, '/chat'));

export const sendCustomerMessage = (jwt: string, slug: string, clientMessageId: string, content: string) =>
  apiRequest<{ conversationId: string; message: ChatMessage }>(jwt, storePath(slug, '/chat/mensajes'), {
    method: 'POST',
    body: JSON.stringify({ clientMessageId, content }),
  });

/** OR-B4-035 rule 1 — a sale made to the customer, what is still returnable and its returns. */
export type CustomerPurchase = {
  id: string;
  numero: number | null;
  fecha: string;
  total: string;
  diasParaDevolver: number;
  devolvible: boolean;
  items: Array<{ ventaItemId: string; producto: string; cantidad: number; disponible: number; precio: string }>;
  devoluciones: Array<{
    id: string;
    numero: number | null;
    estado: string;
    reembolso: { estado: string; metodo: string | null; monto: string; resultado: string | null } | null;
    fechaSolicitud: string;
    montoReembolsable: string;
    items: Array<{ producto: string; cantidad: number }>;
  }>;
};

export const fetchCustomerPurchases = (jwt: string, slug: string) =>
  apiRequest<CustomerPurchase[]>(jwt, storePath(slug, '/mis-compras'));

export const requestCustomerReturn = (
  jwt: string,
  slug: string,
  saleId: string,
  body: { items: Array<{ ventaItemId: string; cantidad: number; motivoCodigo: string; motivo?: string }>; motivo_general?: string },
) =>
  apiRequest<{ id: string; numero: number | null }>(jwt, storePath(slug, `/mis-compras/${encodeURIComponent(saleId)}/devolucion`), {
    method: 'POST',
    body: JSON.stringify(body),
  });
