import { ApiError, apiRequest, getApiBaseUrl } from './api.server';
import type { ServerCart } from '~/utils/store';
import type { DeliveryChoice, DeliveryQuoteAnswer, SavedAddress } from '~/utils/envios';
import { EMPTY_LISTING, type StoreListing, type StoreProductDetail, type Suggestions } from '~/utils/store-browse';
import type { OrderCardData } from '~/utils/order-card';
import type { QuotedMessage, ReactionChip } from '~/utils/messaging';

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

/** Marketplace — Wapsell's explorer (public, cached a minute by the API). */
export const fetchExplorer = () => publicGet<import('~/utils/explorer').Explorer>('/explorar');

/** Marketplace, step 3 — Wapsell's search across every store (params already filtered). */
export const fetchExplorerSearch = (params: URLSearchParams) =>
  publicGet<import('~/utils/explorer').ExplorerSearchResult>(`/explorar/buscar?${params.toString()}`);

export const fetchExplorerSuggestions = (q: string) =>
  publicGet<import('~/utils/explorer').ExplorerSuggestions>(`/explorar/sugerencias?q=${encodeURIComponent(q)}`);

/** The store's public name; null when no Business has that slug. */
export const fetchStore = (slug: string) =>
  publicGet<{
    nombre: string;
    slug: string;
    pagosOnline?: boolean;
    /** Ajustes del negocio: what customers can see; empty strings when not set. */
    contacto?: { telefono: string; direccion: string; horario: string; descripcion: string };
    /** OR-B4-054: how customers can receive orders here. */
    entrega?: { envio: boolean; retiro: boolean };
    /** Where the store's map opens (rounded for a store that shows only its zone). */
    centro?: { lat: number; lng: number } | null;
  }>(storePath(slug));

/** OR-B4-054 — what a delivery to that point costs in this store, or why there is none. */
export const fetchDeliveryQuote = (slug: string, lat: number, lng: number) =>
  publicGet<DeliveryQuoteAnswer>(storePath(slug, `/envio?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`));

/** The customer's saved addresses (in their Wapsell account). */
export const customerAddresses = (jwt: string, slug: string) =>
  apiRequest<{ direcciones: SavedAddress[]; puedeGuardar: boolean }>(jwt, storePath(slug, '/mis-direcciones'));

export const saveCustomerAddress = (jwt: string, slug: string, address: Omit<SavedAddress, 'id'>) =>
  apiRequest<SavedAddress>(jwt, storePath(slug, '/mis-direcciones'), { method: 'POST', body: JSON.stringify(address) });

export const removeCustomerAddress = (jwt: string, slug: string, id: string) =>
  apiRequest(jwt, storePath(slug, `/mis-direcciones/${encodeURIComponent(id)}`), { method: 'DELETE' });

/**
 * OR-B4-047 — one page of the store listing, with the categories, brands and price range the
 * customer can still pick from. `query` comes from listingQuery() (already cleaned).
 */
export async function fetchStoreCatalog(slug: string, query: URLSearchParams) {
  const qs = query.toString();
  return (await publicGet<StoreListing>(storePath(slug, `/catalogo${qs ? `?${qs}` : ''}`))) ?? EMPTY_LISTING;
}

/** A few products and categories while the customer types. */
export async function fetchSuggestions(slug: string, q: string): Promise<Suggestions> {
  return (
    (await publicGet<Suggestions>(storePath(slug, `/sugerencias?q=${encodeURIComponent(q)}`))) ?? {
      productos: [],
      categorias: [],
    }
  );
}

/** The product page; null when the product is not published in this store. */
export const fetchStoreProduct = (slug: string, productoId: string) =>
  publicGet<StoreProductDetail>(storePath(slug, `/productos/${encodeURIComponent(productoId)}`));

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

export async function placeCustomerOrder(
  jwt: string,
  slug: string,
  items: Array<{ productoId: string; cantidad: number }>,
  entrega?: DeliveryChoice,
) {
  // OR-B4-053: `sumado` — it went into the order still waiting for confirmation.
  const order = await apiRequest<{ id: string; numero: number | null; sumado?: boolean }>(jwt, storePath(slug, '/mis-pedidos'), {
    method: 'POST',
    body: JSON.stringify({ items, ...(entrega ? { entrega } : {}) }),
  });
  // The order is placed; failing to empty the saved cart must not report it as failed.
  await replaceServerCart(jwt, []).catch(() => undefined);
  return order;
}

export type CustomerOrder = {
  id: string;
  /** OR-B4-053: N° per business. */
  numero?: number | null;
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
  /** E2 — ticks of the customer's own message: ✓ saved, ✓✓ reached the store, blue ✓✓ read. */
  estado?: 'enviado' | 'entregado' | 'leido';
  /** OR-B4-037: product cards (and photos) the team shared; OR-B4-053: the order card. */
  adjuntos?: Array<{
    tipo: string;
    id: string;
    productoId?: string;
    nombre: string;
    precio?: string;
    precioFinal?: string;
    mimeType?: string;
    tamano?: number;
    // E5: a voice note's length; a link's preview (tipo 'enlace').
    duracion?: number | null;
    url?: string;
    titulo?: string;
    descripcion?: string | null;
    sitio?: string;
    imagen?: boolean;
    // The order card (tipo 'pedido'): read with orderCardOf.
    pedidoId?: OrderCardData['pedidoId'];
    numero?: OrderCardData['numero'];
    estado?: OrderCardData['estado'];
    total?: OrderCardData['total'];
    items?: OrderCardData['items'];
  }>;
  /** OR-B4-053: posted by the system (the order moved, a return), not typed by someone. */
  aviso?: boolean;
  /** E6b: the greeting or the away message the store sent by itself. */
  automatico?: boolean;
  /** E4: deleted, edited, editable (their own typed text), forwarded, the quote and reactions. */
  eliminado?: boolean;
  editado?: boolean;
  editable?: boolean;
  reenviado?: boolean;
  respuesta?: QuotedMessage;
  reacciones?: ReactionChip[];
};

/** OR-B4-037 — the customer adds a product shared in the chat to their saved cart. */
export async function addToServerCart(jwt: string, productoId: string, cantidad = 1) {
  const cart = await loadServerCart(jwt);
  await apiRequest(jwt, `/cart/${cart.id}/items`, { method: 'POST', body: JSON.stringify({ productoId, cantidad }) });
}
export type CustomerChat = {
  conversationId: string | null;
  messages: ChatMessage[];
  /** E2b — someone of the store's team in this chat has a screen open. */
  tiendaEnLinea?: boolean;
  /** Paquete 1 F2: a full page; older messages can be loaded. */
  hayMas?: boolean;
  /** E6b: the store's profile, and whether it is open now (null: no hours loaded). */
  perfil?: { descripcion: string; horario: string; direccion: string; telefono: string; abiertoAhora: boolean | null } | null;
};

/** E6b «+ Productos» — the customer sends a product of the store to ask about it. */
export const sendCustomerProduct = (jwt: string, slug: string, clientMessageId: string, productoId: string) =>
  apiRequest(jwt, storePath(slug, '/chat/productos'), {
    method: 'POST',
    body: JSON.stringify({ clientMessageId, productoId }),
  });

/** The signed-in customer's conversation with the store (empty until they write). */
/** Paquete 1 F2: the newest page, or the one before message `antes` (its id). */
export const fetchCustomerChat = (jwt: string, slug: string, antes?: string | null) =>
  apiRequest<CustomerChat>(jwt, storePath(slug, `/chat${antes ? `?antes=${encodeURIComponent(antes)}` : ''}`));

export const sendCustomerMessage = (
  jwt: string,
  slug: string,
  clientMessageId: string,
  content: string,
  replyToMessageId?: string | null,
) =>
  apiRequest<{ conversationId: string; message: ChatMessage }>(jwt, storePath(slug, '/chat/mensajes'), {
    method: 'POST',
    body: JSON.stringify({ clientMessageId, content, ...(replyToMessageId ? { replyToMessageId } : {}) }),
  });

/** E4 — the customer edits their message (15 minutes) or deletes it for everyone (2 days). */
export const editCustomerMessage = (jwt: string, slug: string, messageId: string, content: string) =>
  apiRequest(jwt, storePath(slug, `/chat/mensajes/${encodeURIComponent(messageId)}`), {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });

export const deleteCustomerMessage = (jwt: string, slug: string, messageId: string) =>
  apiRequest(jwt, storePath(slug, `/chat/mensajes/${encodeURIComponent(messageId)}`), { method: 'DELETE' });

/** E4 — the customer's reaction (null takes it back). */
export const reactAsCustomer = (jwt: string, slug: string, messageId: string, emoji: string | null) =>
  apiRequest(jwt, storePath(slug, `/chat/mensajes/${encodeURIComponent(messageId)}/reaccion`), {
    method: emoji ? 'PUT' : 'DELETE',
    ...(emoji ? { body: JSON.stringify({ emoji }) } : {}),
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
