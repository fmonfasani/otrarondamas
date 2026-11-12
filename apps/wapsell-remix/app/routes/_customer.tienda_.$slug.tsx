import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, useFetcher, useLoaderData, type ShouldRevalidateFunction } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { StoreHeader } from '~/components/store/StoreHeader';
import { ApiError } from '~/services/api.server';
import { getStoreCustomer, signOutCookie } from '~/services/customer-session.server';
import { fetchCatalog, fetchStore, loadServerCart, placeCustomerOrder, replaceServerCart } from '~/services/store.server';
import { formatMoney } from '~/utils/format';
import {
  addToCart,
  cartCount,
  cartTotal,
  linesFromServer,
  mergeCarts,
  parseItems,
  readStoredCart,
  setQuantity,
  withCatalogPrices,
  writeStoredCart,
  type CartLine,
  type StoreProduct,
} from '~/utils/store';

/**
 * Store of one Business — /tienda/:slug (STORE-V1-03).
 *
 * Anyone browses the catalog and fills a cart; without an account the cart lives in the
 * browser. Signing in saves it to the customer's account (server cart, OR-B4-029) so the
 * business sees it too, and only a signed-in customer confirms an order, which is filed
 * under their account. The Business comes from the slug, never from a configured id.
 */

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? `${data.store.nombre} | Tienda online` : 'Tienda no encontrada' },
  { name: 'description', content: data ? `Explorá el catálogo de ${data.store.nombre} y hacé tu pedido.` : '' },
];

/** Saving the cart changes nothing on the page: no need to reload the catalog. */
export const shouldRevalidate: ShouldRevalidateFunction = ({ formData, defaultShouldRevalidate }) =>
  formData?.get('intent') === 'sync' ? false : defaultShouldRevalidate;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? '';
  const search = new URL(request.url).searchParams.get('search') ?? '';
  let store: { nombre: string; slug: string } | null;
  try {
    store = await fetchStore(slug);
  } catch {
    throw new Response('No pudimos cargar la tienda.', { status: 503 });
  }
  if (!store) throw new Response('Tienda no encontrada', { status: 404 });

  const [catalog, customer] = await Promise.all([
    fetchCatalog(slug, search).then(
      (products) => ({ products, error: null as string | null }),
      () => ({ products: [] as StoreProduct[], error: 'No pudimos cargar el catálogo. Intentá nuevamente en unos minutos.' }),
    ),
    getStoreCustomer(request, slug),
  ]);

  let savedCart: CartLine[] = [];
  if (customer) {
    try {
      savedCart = withCatalogPrices(linesFromServer(await loadServerCart(customer.jwt)), catalog.products);
    } catch (error) {
      // An expired or revoked customer session: continue as a visitor.
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        return json(
          { store, ...catalog, search, customer: null, savedCart },
          { headers: { 'Set-Cookie': await signOutCookie(request) } },
        );
      }
    }
  }
  return json({ store, ...catalog, search, customer: customer ? { nombre: customer.nombre } : null, savedCart });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const slug = params.slug ?? '';
  const form = await request.formData();
  const intent = String(form.get('intent'));
  const customer = await getStoreCustomer(request, slug);
  if (!customer) {
    return json({ intent, ok: false, message: 'Ingresá a tu cuenta para confirmar el pedido.' }, { status: 401 });
  }
  const items = parseItems(form.get('items'));
  if (!items) return json({ intent, ok: false, message: 'El carrito no es válido.' }, { status: 400 });
  try {
    if (intent === 'sync') {
      await replaceServerCart(customer.jwt, items);
      return json({ intent, ok: true, message: '' });
    }
    if (intent === 'order') {
      if (!items.length) return json({ intent, ok: false, message: 'Agregá al menos un producto.' }, { status: 400 });
      await placeCustomerOrder(customer.jwt, slug, items);
      return json({ intent, ok: true, message: '¡Pedido recibido! El comercio se va a comunicar para confirmar los detalles.' });
    }
  } catch (error) {
    if (error instanceof ApiError) return json({ intent, ok: false, message: error.message }, { status: error.status });
    throw error;
  }
  return json({ intent, ok: false, message: 'Acción desconocida.' }, { status: 400 });
}

export default function Store() {
  const { store, products, error, search, customer, savedCart } = useLoaderData<typeof loader>();
  const order = useFetcher<typeof action>();
  const signedIn = Boolean(customer);
  const { cart, setCart, emptiedOnServer } = usePersistentCart(store.slug, signedIn, savedCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    if (new URL(window.location.href).searchParams.get('carrito') === '1') setCartOpen(true);
  }, []);

  useEffect(() => {
    if (order.data?.intent === 'order' && order.data.ok) {
      setConfirmation(order.data.message);
      emptiedOnServer();
      setCartOpen(false);
    }
    // Only a new order answer matters here.
  }, [order.data]);

  const stockOf = (productoId: string) => products.find((p) => p.productoId === productoId)?.stockTotal ?? Infinity;
  const total = cartTotal(cart);
  const items = itemsJson(cart);

  return (
    <main className="store-shell">
      <StoreHeader store={store} customerName={customer?.nombre ?? null}>
        <button className="cart-trigger" type="button" onClick={() => setCartOpen(!cartOpen)}>
          Mi pedido <span>{cartCount(cart)}</span>
        </button>
      </StoreHeader>

      {confirmation ? (
        <output className="order-confirmation">
          <strong>Pedido enviado</strong>
          <span>{confirmation}</span>
          <button type="button" onClick={() => setConfirmation('')} aria-label="Cerrar confirmación">×</button>
        </output>
      ) : null}

      <section className="store-hero store-hero--compact">
        <div className="hero-copy">
          <span className="eyebrow">TIENDA ONLINE</span>
          <h1>{store.nombre}</h1>
          <p>Elegí tus productos, armá tu pedido y coordiná la entrega directamente con el comercio.</p>
          <a className="primary-link" href="#catalogo">Ver productos <span>↘</span></a>
        </div>
      </section>

      <section className="catalog-section" id="catalogo">
        <div className="section-heading">
          <div><span className="eyebrow">SELECCIÓN DEL COMERCIO</span><h2>El catálogo</h2></div>
          <span className="product-count">{products.length} productos</span>
        </div>
        <Form method="get" className="search-form">
          <span aria-hidden="true">⌕</span>
          <input type="search" name="search" placeholder="¿Qué estás buscando?" defaultValue={search} aria-label="Buscar productos" />
          <button type="submit">Buscar</button>
        </Form>

        <Catalog products={products} error={error} onAdd={(product) => { setCart((lines) => addToCart(lines, product)); setCartOpen(true); }} />
      </section>

      <a className="chat-fab" href={`/tienda/${store.slug}/chat`}>
        <span aria-hidden="true">💬</span> Escribinos
      </a>

      <footer className="store-footer">
        <span>{store.nombre}</span>
        <span>Tienda online hecha con Wapsell.</span>
      </footer>

      {cartOpen ? (
        <div className="cart-backdrop">
          <button type="button" className="cart-dismiss" aria-label="Cerrar carrito" onClick={() => setCartOpen(false)} />
          <aside className="cart-panel" aria-label="Tu pedido">
            <div className="cart-heading">
              <div><span className="eyebrow">TU COMPRA</span><h2>Mi pedido</h2></div>
              <button type="button" className="close-cart" onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">×</button>
            </div>
            {cart.length === 0 ? <p className="empty-cart">Todavía no agregaste productos.</p> : (
              <>
                <div className="cart-lines">
                  {cart.map((line) => (
                    <div className="cart-line" key={line.productoId}>
                      <div className="line-copy"><strong>{line.nombre}</strong><span>{formatMoney(line.precio)}</span></div>
                      <div className="quantity-control">
                        <button type="button" onClick={() => setCart((lines) => setQuantity(lines, line.productoId, line.cantidad - 1))} aria-label={`Restar ${line.nombre}`}>−</button>
                        <span>{line.cantidad}</span>
                        <button type="button" disabled={line.cantidad >= stockOf(line.productoId)} onClick={() => setCart((lines) => setQuantity(lines, line.productoId, line.cantidad + 1))} aria-label={`Sumar ${line.nombre}`}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-total"><span>Total estimado</span><strong>{formatMoney(total)}</strong></div>
                {signedIn ? (
                  <order.Form method="post" className="checkout-form">
                    <input type="hidden" name="intent" value="order" />
                    <input type="hidden" name="items" value={items} />
                    <p className="checkout-as">Pedís como <strong>{customer?.nombre}</strong>. El comercio te contacta con los datos de tu cuenta.</p>
                    {order.data && !order.data.ok ? <output className="form-error">{order.data.message}</output> : null}
                    <button className="submit-order" type="submit" disabled={order.state !== 'idle'}>
                      {order.state === 'idle' ? `Confirmar pedido · ${formatMoney(total)}` : 'Enviando pedido…'}
                    </button>
                    <small>El pedido queda sujeto a confirmación del comercio.</small>
                  </order.Form>
                ) : (
                  <div className="checkout-form">
                    <p className="checkout-as">Para confirmar el pedido ingresá a tu cuenta o creá una. Tu carrito se guarda.</p>
                    <a className="submit-order submit-order--link" href={`/tienda/${store.slug}/cuenta?volver=carrito`}>Ingresar para confirmar</a>
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
      ) : null}
    </main>
  );
}

/**
 * The cart, saved where it belongs: in the browser for a visitor, in the account once
 * signed in. On sign-in, what was picked as a visitor joins the account's saved cart and
 * the browser copy is dropped. The cart as first loaded is already saved, so that run is
 * skipped; so is the reset after an order (the API already emptied it).
 */
function usePersistentCart(slug: string, signedIn: boolean, savedCart: CartLine[]) {
  const sync = useFetcher();
  const [cart, setCart] = useState<CartLine[]>(savedCart);
  const skipSave = useRef(true);

  useEffect(() => {
    const stored = readStoredCart(slug);
    if (!signedIn) setCart(stored);
    else if (stored.length) {
      setCart(mergeCarts(stored, savedCart));
      writeStoredCart(slug, []);
    }
    // Runs once per store and sign-in state.
  }, [slug, signedIn]);

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    if (!signedIn) {
      writeStoredCart(slug, cart);
      return;
    }
    const timer = window.setTimeout(() => {
      sync.submit({ intent: 'sync', items: itemsJson(cart) }, { method: 'post' });
    }, 500);
    return () => window.clearTimeout(timer);
    // Only cart changes matter here.
  }, [cart, signedIn, slug]);

  const emptiedOnServer = () => {
    skipSave.current = true;
    setCart([]);
  };
  return { cart, setCart, emptiedOnServer };
}

const itemsJson = (lines: CartLine[]) => JSON.stringify(lines.map(({ productoId, cantidad }) => ({ productoId, cantidad })));

function Catalog({ products, error, onAdd }: Readonly<{ products: StoreProduct[]; error: string | null; onAdd: (product: StoreProduct) => void }>) {
  if (error) return <output className="catalog-state"><span>!</span><p>{error}</p></output>;
  if (products.length === 0) {
    return <div className="catalog-state"><span>○</span><p>No encontramos productos para mostrar. Probá con otra búsqueda.</p></div>;
  }
  return (
    <div className="product-grid">
      {products.map((product) => (
        <article className="product-card" key={product.productoId}>
          <div className="product-visual">
            <span className="product-initial">{product.nombre.trim().charAt(0).toUpperCase()}</span>
            {product.descuentoPorcentaje ? <span className="discount-tag">-{product.descuentoPorcentaje}%</span> : null}
            {product.disponible ? null : <span className="unavailable-tag">Sin stock</span>}
          </div>
          <div className="product-info">
            <span className="product-code">{product.codigoInterno || 'PRODUCTO'}</span>
            <h3>{product.nombre}</h3>
            <div className="product-bottom">
              <div>
                <strong>{formatMoney(product.precio)}</strong>
                {product.precioSinDescuento ? <del>{formatMoney(product.precioSinDescuento)}</del> : null}
                <small>{product.unidadBase || 'Unidad'}</small>
              </div>
              <button type="button" className="add-button" disabled={!product.disponible} onClick={() => onAdd(product)} aria-label={`Agregar ${product.nombre}`}>+</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
