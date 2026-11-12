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
export const fetchStore = (slug: string) => publicGet<{ nombre: string; slug: string }>(storePath(slug));

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
  createdAt: string;
  items: Array<{ producto: string; cantidad: number }>;
};

export const fetchCustomerOrders = (jwt: string, slug: string) =>
  apiRequest<CustomerOrder[]>(jwt, storePath(slug, '/mis-pedidos'));

export type ChatMessage = { id: string; clientMessageId: string; content: string | null; createdAt: string; mine: boolean };
export type CustomerChat = { conversationId: string | null; messages: ChatMessage[] };

/** The signed-in customer's conversation with the store (empty until they write). */
export const fetchCustomerChat = (jwt: string, slug: string) => apiRequest<CustomerChat>(jwt, storePath(slug, '/chat'));

export const sendCustomerMessage = (jwt: string, slug: string, clientMessageId: string, content: string) =>
  apiRequest<{ conversationId: string; message: ChatMessage }>(jwt, storePath(slug, '/chat/mensajes'), {
    method: 'POST',
    body: JSON.stringify({ clientMessageId, content }),
  });
