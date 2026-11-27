import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useFetcher, useLoaderData, type ShouldRevalidateFunction } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { CatalogControls } from '~/components/store/CatalogControls';
import { StoreHeader } from '~/components/store/StoreHeader';
import { StoreSearch } from '~/components/store/StoreSearch';
import { CheckoutDelivery, type DeliveryState } from '~/components/store/CheckoutDelivery';
import { mapTiles } from '~/services/map.server';
import { deliveryChoiceFrom, pesos } from '~/utils/envios';
import maplibreStyles from '../styles/maplibre-gl.css?url';
import mapStyles from '../styles/map.css?url';
import checkoutStyles from '../styles/checkout.css?url';
import { ApiError } from '~/services/api.server';
import { getStoreCustomer, signOutCookie } from '~/services/customer-session.server';
import { fetchStore, fetchStoreCatalog, loadServerCart, placeCustomerOrder, replaceServerCart } from '~/services/store.server';
import { formatMoney } from '~/utils/format';
import {
  addToCart,
  cartCount,
  cartTotal,
  linesFromServer,
  mergeCarts,
  offerUntil,
  parseItems,
  readStoredCart,
  setQuantity,
  withCatalogPrices,
  writeStoredCart,
  type CartLine,
  type StoreProduct,
} from '~/utils/store';
import { EMPTY_LISTING, appendPage, linkWith, listingQuery, productHref, storePhotoSrc, type StoreListing } from '~/utils/store-browse';

/**
 * Store of one Business — /tienda/:slug (STORE-V1-03).
 *
 * Anyone browses the catalog and fills a cart; without an account the cart lives in the
 * browser. Signing in saves it to the customer's account (server cart, OR-B4-029) so the
 * business sees it too, and only a signed-in customer confirms an order, which is filed
 * under their account. The Business comes from the slug, never from a configured id.
 *
 * OR-B4-047 — a practical store: search with suggestions, categories with counts, filters, order
 * and «Ver más», all kept in the address so a search can be shared.
 */

export const links = () => [
  { rel: 'stylesheet', href: maplibreStyles },
  { rel: 'stylesheet', href: mapStyles },
  { rel: 'stylesheet', href: checkoutStyles },
];

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? `${data.store.nombre} | Tienda online` : 'Tienda no encontrada' },
  { name: 'description', content: data ? `Explorá el catálogo de ${data.store.nombre} y hacé tu pedido.` : '' },
];

/** Saving the cart changes nothing on the page: no need to reload the catalog. */
export const shouldRevalidate: ShouldRevalidateFunction = ({ formData, defaultShouldRevalidate }) =>
  formData?.get('intent') === 'sync' ? false : defaultShouldRevalidate;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? '';
  const query = listingQuery(new URL(request.url));
  let store: Awaited<ReturnType<typeof fetchStore>>;
  try {
    store = await fetchStore(slug);
  } catch {
    throw new Response('No pudimos cargar la tienda.', { status: 503 });
  }
  if (!store) throw new Response('Tienda no encontrada', { status: 404 });

  const [catalog, customer] = await Promise.all([
    fetchStoreCatalog(slug, query).then(
      (listing) => ({ listing, error: null as string | null }),
      () => ({ listing: EMPTY_LISTING, error: 'No pudimos cargar el catálogo. Intentá nuevamente en unos minutos.' }),
    ),
    getStoreCustomer(request, slug),
  ]);

  let savedCart: CartLine[] = [];
  if (customer) {
    try {
      savedCart = withCatalogPrices(linesFromServer(await loadServerCart(customer.jwt)), catalog.listing.productos);
    } catch (error) {
      // An expired or revoked customer session: continue as a visitor.
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        return json(
          { store, ...catalog, query: query.toString(), customer: null, savedCart, tiles: mapTiles() },
          { headers: { 'Set-Cookie': await signOutCookie(request) } },
        );
      }
    }
  }
  return json({ store, ...catalog, query: query.toString(), customer: customer ? { nombre: customer.nombre } : null, savedCart, tiles: mapTiles() });
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
      // OR-B4-054, fase 2b: delivery or pickup, checked again by the API (it computes the fee).
      const entrega = deliveryChoiceFrom(form.get('entrega'));
      if (entrega === 'invalid') return json({ intent, ok: false, message: 'Revisá la dirección de entrega.' }, { status: 400 });
      // OR-B4-055: the cart closes into a checkout; the customer pays it in Mercado Pago and the
      // store's order is born with the approved payment.
      const placed = await placeCustomerOrder(customer.jwt, slug, items, entrega ?? undefined);
      return json({ intent, ok: true, message: 'Te llevamos a Mercado Pago para pagar…', pagar: placed.pagar });
    }
  } catch (error) {
    if (error instanceof ApiError) return json({ intent, ok: false, message: error.message }, { status: error.status });
    throw error;
  }
  return json({ intent, ok: false, message: 'Acción desconocida.' }, { status: 400 });
}

export default function Store() {
  const { store, listing, error, query: queryString, customer, savedCart, tiles } = useLoaderData<typeof loader>();
  const query = new URLSearchParams(queryString);
  const base = `/tienda/${store.slug}`;
  const { products, nextPage, loadMore, loadingMore, moreError } = useListing(base, listing, query);
  const order = useFetcher<typeof action>();
  const signedIn = Boolean(customer);
  const { cart, setCart, emptiedOnServer } = usePersistentCart(store.slug, signedIn, savedCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  // OR-B4-054: the store says how orders can be received; a store set up before keeps pickup.
  const offers = store.entrega ?? { envio: false, retiro: true };
  const [delivery, setDelivery] = useState<DeliveryState>({ choice: null, fee: 0, ready: false });

  useEffect(() => {
    if (new URL(window.location.href).searchParams.get('carrito') === '1') setCartOpen(true);
  }, []);

  useEffect(() => {
    if (order.data?.intent === 'order' && order.data.ok) {
      setConfirmation(order.data.message);
      emptiedOnServer();
      // OR-B4-055: off to pay; the order reaches the store when Mercado Pago approves it.
      if ('pagar' in order.data && typeof order.data.pagar === 'string') window.location.assign(order.data.pagar);
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
          <span className="product-count">{listing.total === 1 ? '1 producto' : `${listing.total} productos`}</span>
        </div>
        <StoreSearch slug={store.slug} defaultValue={query.get('q') ?? ''} orden={query.get('orden')} />
        <CatalogControls base={base} query={query} listing={listing} />

        <Catalog
          slug={store.slug}
          products={products}
          error={error}
          filtered={queryString !== ''}
          clearHref={base}
          onAdd={(product) => { setCart((lines) => addToCart(lines, product)); setCartOpen(true); }}
        />
        {nextPage ? (
          <div className="load-more">
            <span>Mostrando {products.length} de {listing.total}</span>
            <a
              href={linkWith(base, query, { pagina: String(nextPage) })}
              onClick={(event) => { event.preventDefault(); loadMore(); }}
              aria-disabled={loadingMore}
            >
              {loadingMore ? 'Cargando…' : 'Ver más'}
            </a>
            {moreError ? <output className="form-error">{moreError}</output> : null}
          </div>
        ) : null}
      </section>

      <a className="chat-fab" href={`/tienda/${store.slug}/chat`}>
        <span aria-hidden="true">💬</span> Escribinos
      </a>

      {store.contacto && Object.values(store.contacto).some(Boolean) ? (
        <section className="store-contact" aria-label={`Contacto de ${store.nombre}`}>
          {store.contacto.descripcion ? <p>{store.contacto.descripcion}</p> : null}
          <ul>
            {store.contacto.direccion ? <li><b>Dirección</b> {store.contacto.direccion}</li> : null}
            {store.contacto.horario ? <li><b>Horario</b> {store.contacto.horario}</li> : null}
            {store.contacto.telefono ? <li><b>Teléfono</b> {store.contacto.telefono}</li> : null}
          </ul>
        </section>
      ) : null}

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
                {signedIn ? (
                  <CheckoutDelivery
                    slug={store.slug}
                    offers={offers}
                    center={store.centro ?? null}
                    tiles={tiles}
                    storeAddress={store.contacto?.direccion}
                    onChange={setDelivery}
                  />
                ) : null}
                {delivery.fee > 0 ? (
                  <div className="cart-total cart-total--part"><span>Productos</span><strong>{formatMoney(total)}</strong></div>
                ) : null}
                <div className="cart-total">
                  <span>{delivery.fee > 0 ? 'Total con envío' : 'Total estimado'}</span>
                  <strong>{formatMoney(total + delivery.fee)}</strong>
                </div>
                {signedIn ? (
                  <order.Form method="post" className="checkout-form">
                    <input type="hidden" name="intent" value="order" />
                    <input type="hidden" name="items" value={items} />
                    <input type="hidden" name="entrega" value={delivery.choice ? JSON.stringify(delivery.choice) : ''} />
                    <p className="checkout-as">Pedís como <strong>{customer?.nombre}</strong>. El comercio te contacta con los datos de tu cuenta.</p>
                    {order.data && !order.data.ok ? <output className="form-error">{order.data.message}</output> : null}
                    {store.pagosOnline ? null : (
                      <output className="form-error">Este negocio todavía no cobra online. Escribile por el chat para coordinar tu pedido.</output>
                    )}
                    <button className="submit-order" type="submit" disabled={order.state !== 'idle' || !delivery.ready || !store.pagosOnline}>
                      {order.state === 'idle' ? `Pagar ${formatMoney(total + delivery.fee)} con Mercado Pago` : 'Abriendo Mercado Pago…'}
                    </button>
                    {delivery.fee > 0 ? <small>El envío ({pesos(delivery.fee)}) es todo para el repartidor.</small> : null}
                    <small>El negocio recibe tu pedido cuando Mercado Pago aprueba el pago.</small>
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

/**
 * The products on screen: the page the address asked for, plus the next ones «Ver más» brings
 * (without reloading the store). A new search or filter starts over.
 */
function useListing(base: string, listing: StoreListing, query: URLSearchParams) {
  const more = useFetcher<StoreListing>();
  const [shown, setShown] = useState(listing.productos);
  const [page, setPage] = useState(listing.pagina);
  const [moreError, setMoreError] = useState('');
  useEffect(() => {
    setShown(listing.productos);
    setPage(listing.pagina);
    setMoreError('');
  }, [listing]);
  useEffect(() => {
    if (!more.data) return;
    const next = more.data;
    if (next.error) {
      setMoreError(next.error);
      return;
    }
    setMoreError('');
    setShown((current) => appendPage(current, next.productos));
    setPage(next.pagina);
  }, [more.data]);
  const nextPage = page < listing.paginas ? page + 1 : null;
  const loadMore = () => {
    if (nextPage && more.state === 'idle') more.load(linkWith(`${base}/listado`, query, { pagina: String(nextPage) }));
  };
  return { products: shown, nextPage, loadMore, loadingMore: more.state !== 'idle', moreError };
}

function Catalog({
  slug,
  products,
  error,
  filtered,
  clearHref,
  onAdd,
}: Readonly<{ slug: string; products: StoreProduct[]; error: string | null; filtered: boolean; clearHref: string; onAdd: (product: StoreProduct) => void }>) {
  if (error) return <output className="catalog-state"><span>!</span><p>{error}</p></output>;
  if (products.length === 0) {
    return (
      <div className="catalog-state">
        <span>○</span>
        {filtered ? (
          <p>
            No encontramos productos con esa búsqueda o esos filtros. <Link to={clearHref} preventScrollReset>Ver todo el catálogo</Link>
          </p>
        ) : (
          <p>Esta tienda todavía no publicó productos. Escribinos por el chat y te ayudamos.</p>
        )}
      </div>
    );
  }
  return (
    <div className="product-grid">
      {products.map((product) => (
        <article className="product-card" key={product.productoId}>
          <Link className="product-visual" to={productHref(slug, product.productoId)} aria-label={`Ver ${product.nombre}`}>
            {product.foto ? (
              <img className="product-photo" src={storePhotoSrc(slug, product.productoId, product.foto)} alt="" loading="lazy" />
            ) : (
              <span className="product-initial">{product.nombre.trim().charAt(0).toUpperCase()}</span>
            )}
            {product.oferta ? (
              <span className="discount-tag offer-tag">Oferta -{product.descuentoPorcentaje}%</span>
            ) : product.descuentoPorcentaje ? (
              <span className="discount-tag">-{product.descuentoPorcentaje}%</span>
            ) : null}
            {product.disponible ? null : <span className="unavailable-tag">Sin stock</span>}
            {product.destacado ? <span className="featured-tag">Destacado</span> : null}
          </Link>
          <div className="product-info">
            <span className="product-code">{product.codigoInterno || 'PRODUCTO'}</span>
            <h3><Link to={productHref(slug, product.productoId)}>{product.nombre}</Link></h3>
            <div className="product-bottom">
              <div>
                <strong>{formatMoney(product.precio)}</strong>
                {product.precioSinDescuento ? <del>{formatMoney(product.precioSinDescuento)}</del> : null}
                <small>{product.oferta ? `Oferta ${offerUntil(product.oferta.hasta)}` : product.unidadBase || 'Unidad'}</small>
              </div>
              <button type="button" className="add-button" disabled={!product.disponible} onClick={() => onAdd(product)} aria-label={`Agregar ${product.nombre}`}>+</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
