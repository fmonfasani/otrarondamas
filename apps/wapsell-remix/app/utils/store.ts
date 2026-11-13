/** Pure helpers of the per-Business store (/tienda/:slug). */

export type StoreProduct = {
  productoId: string;
  nombre: string;
  codigoInterno?: string | null;
  unidadBase?: string | null;
  precio: string;
  precioSinDescuento?: string | null;
  descuentoPorcentaje?: number | null;
  disponible: boolean;
  stockTotal: number;
};

/** One line of the cart, kept the same in the browser and when read back from the server. */
export type CartLine = { productoId: string; nombre: string; precio: string; cantidad: number };

export type ServerCart = {
  id: string;
  CartItem?: Array<{
    productoId: string;
    cantidad: string | number;
    Producto?: { nombre?: string; precioMinorista?: string | number } | null;
  }>;
};

const MAX_LINES = 50;

/** Lines of the customer's cart on the server. */
export function linesFromServer(cart: ServerCart | null | undefined): CartLine[] {
  return (cart?.CartItem ?? []).map((item) => ({
    productoId: item.productoId,
    nombre: item.Producto?.nombre ?? 'Producto',
    precio: String(item.Producto?.precioMinorista ?? '0'),
    cantidad: Number(item.cantidad),
  }));
}

/**
 * Cart after signing in: what was picked before signing in wins for the same product,
 * and anything else already saved in the account is kept.
 */
export function mergeCarts(browser: CartLine[], server: CartLine[]): CartLine[] {
  const merged = new Map(server.map((line) => [line.productoId, line]));
  for (const line of browser) merged.set(line.productoId, line);
  return [...merged.values()];
}

/** Updates the price/name of saved lines with what the catalog shows now. */
export function withCatalogPrices(lines: CartLine[], products: StoreProduct[]): CartLine[] {
  const byId = new Map(products.map((p) => [p.productoId, p]));
  return lines.map((line) => {
    const product = byId.get(line.productoId);
    return product ? { ...line, nombre: product.nombre, precio: product.precio } : line;
  });
}

export function addToCart(lines: CartLine[], product: StoreProduct): CartLine[] {
  if (!lines.some((line) => line.productoId === product.productoId)) return [...lines, { productoId: product.productoId, nombre: product.nombre, precio: product.precio, cantidad: 1 }];
  return lines.map((line) =>
    line.productoId === product.productoId ? { ...line, cantidad: Math.min(line.cantidad + 1, product.stockTotal) } : line,
  );
}

export function setQuantity(lines: CartLine[], productoId: string, cantidad: number): CartLine[] {
  return lines.map((line) => (line.productoId === productoId ? { ...line, cantidad } : line)).filter((line) => line.cantidad > 0);
}

export const cartTotal = (lines: CartLine[]) => lines.reduce((sum, line) => sum + Number(line.precio) * line.cantidad, 0);
export const cartCount = (lines: CartLine[]) => lines.reduce((sum, line) => sum + line.cantidad, 0);

/**
 * Reads the items a form sent (JSON of {productoId, cantidad}); null when malformed.
 * Prices are never read from the browser: the API takes them from the catalog.
 */
export function parseItems(raw: FormDataEntryValue | null): Array<{ productoId: string; cantidad: number }> | null {
  let value: unknown;
  try {
    value = JSON.parse(typeof raw === 'string' ? raw : '[]');
  } catch {
    return null;
  }
  if (!Array.isArray(value) || value.length > MAX_LINES) return null;
  const items: Array<{ productoId: string; cantidad: number }> = [];
  for (const entry of value) {
    const { productoId, cantidad } = (entry ?? {}) as { productoId?: unknown; cantidad?: unknown };
    if (typeof productoId !== 'string' || !productoId) return null;
    if (typeof cantidad !== 'number' || !Number.isInteger(cantidad) || cantidad < 1) return null;
    items.push({ productoId, cantidad });
  }
  return items;
}

/** Up to two initials for the store's mark ("Otra Ronda Más" → "OR"). */
export function storeMark(nombre: string): string {
  const words = nombre.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

/** Browser storage key of the cart of one store (a visitor without an account). */
export const cartStorageKey = (slug: string) => `wapsell-cart:${slug}`;

export function readStoredCart(slug: string): CartLine[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(cartStorageKey(slug)) ?? '[]');
    return Array.isArray(value) ? (value as CartLine[]).filter((line) => line?.productoId && line.cantidad > 0) : [];
  } catch {
    return [];
  }
}

export function writeStoredCart(slug: string, lines: CartLine[]) {
  try {
    if (lines.length) window.localStorage.setItem(cartStorageKey(slug), JSON.stringify(lines));
    else window.localStorage.removeItem(cartStorageKey(slug));
  } catch {
    // Private mode or blocked storage: the cart just lives in memory.
  }
}

/** Order states after the Business confirmed it: from here it can be paid online (OR-B4-032). */
const PAYABLE_STATES = new Set(['CONFIRMADO', 'EN_PREPARACION', 'LISTO', 'ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'PARCIALMENTE_ENTREGADO']);

/**
 * What the customer can do about paying an order online: pay the rest, wait for the
 * Business to confirm it, or nothing (paid, cancelled, or the store takes no online payments).
 */
export function paymentOf(order: { estado: string; total: string; pagado?: string }, pagosOnline: boolean) {
  const remaining = Math.round((Number(order.total) - Number(order.pagado ?? 0)) * 100) / 100;
  if (remaining <= 0) return { kind: 'paid' as const, remaining: 0 };
  if (!pagosOnline || order.estado === 'CANCELADO') return { kind: 'none' as const, remaining };
  if (PAYABLE_STATES.has(order.estado)) return { kind: 'pay' as const, remaining };
  return { kind: 'wait' as const, remaining };
}

/** Message after coming back from Mercado Pago (?pago=...). The webhook is what records it. */
export const PAYMENT_RETURN: Record<string, { ok: boolean; text: string }> = {
  aprobado: { ok: true, text: '¡Gracias! Mercado Pago aprobó tu pago. Puede tardar unos segundos en verse acá.' },
  pendiente: { ok: true, text: 'Tu pago quedó pendiente en Mercado Pago. Te avisamos acá cuando se acredite.' },
  rechazado: { ok: false, text: 'Mercado Pago no aprobó el pago. Podés intentar de nuevo con otro medio.' },
};
