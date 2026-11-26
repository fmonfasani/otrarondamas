import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from '@remix-run/react';
import { StoreHeader } from '~/components/store/StoreHeader';
import { ApiError } from '~/services/api.server';
import { getStoreCustomer, signInCookie, signOutCookie, storeAuth } from '~/services/customer-session.server';
import { getBuyer } from '~/services/buyer-session.server';
import {
  fetchCustomerOrders,
  fetchCustomerPurchases,
  fetchStore,
  payOrder,
  type CustomerOrder,
  type CustomerPurchase,
} from '~/services/store.server';
import { returnState } from '~/utils/returns';
import { PAYMENT_RETURN, paymentOf } from '~/utils/store';
import { formatDateTime, formatMoney, orderState } from '~/utils/format';

/**
 * Customer account of one Business store — /tienda/:slug/cuenta (STORE-V1-03).
 * Signed out (ADR-IDN-007): «Continuar con Google» first, email second, and the way into the
 * business side at the bottom. Accounts are per Business until ADR-IDN-001. Signed in: the
 * customer's orders in this store, their purchases with the returns they asked for
 * (OR-B4-035 rule 1) and sign out.
 */

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? `Mi cuenta | ${data.store.nombre}` : 'Tienda no encontrada' },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? '';
  const store = await fetchStore(slug).catch(() => {
    throw new Response('No pudimos cargar la tienda.', { status: 503 });
  });
  if (!store) throw new Response('Tienda no encontrada', { status: 404 });
  const customer = await getStoreCustomer(request, slug);
  const google = process.env.GOOGLE_LOGIN_ENABLED === '1';
  const buyerName = customer ? null : ((await getBuyer(request))?.nombre ?? null);
  const purchasesOf = (jwt: string) => fetchCustomerPurchases(jwt, slug).catch(() => [] as CustomerPurchase[]);
  if (!customer) return json({ store, google, buyerName, customer: null, orders: [] as CustomerOrder[], purchases: [] as CustomerPurchase[], ordersError: null });
  try {
    const [orders, purchases] = await Promise.all([fetchCustomerOrders(customer.jwt, slug), purchasesOf(customer.jwt)]);
    return json({ store, google, customer: { nombre: customer.nombre, email: customer.email }, orders, purchases, ordersError: null as string | null });
  } catch (error) {
    if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
      return json(
        { store, google, customer: null, orders: [] as CustomerOrder[], purchases: [] as CustomerPurchase[], ordersError: null },
        { headers: { 'Set-Cookie': await signOutCookie(request) } },
      );
    }
    return json({
      store,
      google,
      customer: { nombre: customer.nombre, email: customer.email },
      orders: [] as CustomerOrder[],
      purchases: [] as CustomerPurchase[],
      ordersError: 'No pudimos cargar tus pedidos.',
    });
  }
}

/**
 * Where to go after signing in: back to the cart or the chat when the customer came from
 * there. Only these known places: never a URL taken from the request.
 */
export function afterSignIn(slug: string, volver: string | null) {
  if (volver === 'carrito') return `/tienda/${slug}?carrito=1`;
  if (volver === 'chat') return `/tienda/${slug}/chat`;
  return `/tienda/${slug}/cuenta`;
}

export async function action({ request, params }: ActionFunctionArgs) {
  const slug = params.slug ?? '';
  const form = await request.formData();
  const intent = String(form.get('intent'));
  const text = (name: string) => String(form.get(name) ?? '').trim();

  if (intent === 'logout') {
    return redirect(`/tienda/${slug}`, { headers: { 'Set-Cookie': await signOutCookie(request) } });
  }

  if (intent === 'pay') {
    const customer = await getStoreCustomer(request, slug);
    if (!customer) return redirect(`/tienda/${slug}/cuenta`);
    try {
      const { url } = await payOrder(customer.jwt, slug, text('orderId'));
      return redirect(url);
    } catch (error) {
      if (error instanceof ApiError) return json({ intent, message: error.message }, { status: error.status });
      throw error;
    }
  }

  const email = text('email');
  const password = String(form.get('password') ?? '');
  if (!email || !password) return json({ intent, message: 'Completá tu email y tu contraseña.' }, { status: 400 });

  let result;
  if (intent === 'register') {
    const nombre = text('nombre');
    if (nombre.length < 2) return json({ intent, message: 'Contanos tu nombre.' }, { status: 400 });
    if (password.length < 8) return json({ intent, message: 'La contraseña tiene que tener al menos 8 caracteres.' }, { status: 400 });
    result = await storeAuth(slug, 'registro', { nombre, email, password });
  } else if (intent === 'login') {
    result = await storeAuth(slug, 'login', { email, password });
  } else {
    return json({ intent, message: 'Acción desconocida.' }, { status: 400 });
  }

  if (!result.ok) return json({ intent, message: result.message }, { status: 400 });
  return redirect(afterSignIn(slug, text('volver') || null), {
    headers: { 'Set-Cookie': await signInCookie(request, slug, result) },
  });
}

export default function Account() {
  const data = useLoaderData<typeof loader>();
  const { store, google, customer, orders, purchases, ordersError } = data;
  const buyerName = ('buyerName' in data ? data.buyerName : null) as string | null;

  return (
    <main className="store-shell">
      <StoreHeader store={store} customerName={customer?.nombre ?? null}>
        <Link className="cart-trigger" to={`/tienda/${store.slug}?carrito=1`}>Mi pedido</Link>
      </StoreHeader>
      <section className="account-section">
        {customer ? (
          <>
            <Orders customer={customer} orders={orders} error={ordersError} slug={store.slug} pagosOnline={Boolean(store.pagosOnline)} />
            <Purchases purchases={purchases} slug={store.slug} />
          </>
        ) : (
          <SignIn store={store} google={google} buyerName={buyerName} />
        )}
      </section>
    </main>
  );
}

function SignIn({
  store,
  google,
  buyerName,
}: Readonly<{ store: { nombre: string; slug: string }; google: boolean; buyerName: string | null }>) {
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const busy = navigation.state !== 'idle';
  const volver = params.get('volver') ?? '';
  const back = volver === 'carrito' || volver === 'chat' ? `?volver=${volver}` : '';

  return (
    <>
      <div className="account-intro">
        <span className="eyebrow">TIENDA {store.nombre.toUpperCase()}</span>
        <h1>Ingresá para comprar.</h1>
        <p>Con tu cuenta confirmás pedidos, tu carrito queda guardado y seguís tus compras.</p>
      </div>
      <div className="entry">
        {buyerName ? (
          <a className="entry-google entry-buyer" href={`/tienda/${store.slug}/cuenta/comprador${back}`}>
            Continuar como {buyerName.split(' ')[0]}
          </a>
        ) : null}
        {params.get('error') === 'comprador' ? (
          <output className="form-error">No pudimos entrar con tu cuenta de Wapsell. Probá de nuevo.</output>
        ) : null}
        {params.get('error') === 'google' ? (
          <output className="form-error">No pudimos ingresar con Google. Probá de nuevo o usá tu email.</output>
        ) : null}
        {google ? (
          <>
            <a className="entry-google" href={`/tienda/${store.slug}/cuenta/google${back}`}>
              <GoogleMark />
              Continuar con Google
            </a>
            <p className="entry-divider">o con tu email</p>
          </>
        ) : null}
        <details className="entry-email" open={!google || Boolean(result)}>
          <summary>Continuar con email</summary>
          <div className="account-forms">
            <Form method="post" className="checkout-form account-card" aria-labelledby="login-title">
              <h2 id="login-title">Ya tengo cuenta</h2>
              <input type="hidden" name="intent" value="login" />
              <input type="hidden" name="volver" value={volver} />
              <label>Email<input name="email" type="email" required autoComplete="email" /></label>
              <label>Contraseña<input name="password" type="password" required autoComplete="current-password" /></label>
              {result?.intent === 'login' ? <output className="form-error">{result.message}</output> : null}
              <button className="submit-order" type="submit" disabled={busy}>Ingresar</button>
            </Form>
            <Form method="post" className="checkout-form account-card" aria-labelledby="register-title">
              <h2 id="register-title">Soy nuevo</h2>
              <input type="hidden" name="intent" value="register" />
              <input type="hidden" name="volver" value={volver} />
              <label>Nombre<input name="nombre" required minLength={2} autoComplete="name" /></label>
              <label>Email<input name="email" type="email" required autoComplete="email" /></label>
              <label>Contraseña <span>(mínimo 8 caracteres)</span><input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
              {result?.intent === 'register' ? <output className="form-error">{result.message}</output> : null}
              <button className="submit-order submit-order--dark" type="submit" disabled={busy}>Crear cuenta</button>
            </Form>
          </div>
        </details>
        <nav className="entry-others" aria-label="Otros accesos">
          <a href="/vender">¿Querés vender en Wapsell? <strong>Creá tu negocio →</strong></a>
          <a href="/es/auth/login">¿Trabajás en una tienda? <strong>Ingresá al panel →</strong></a>
          <small>Si todavía no tenés acceso, pedile una invitación al dueño de la tienda.</small>
        </nav>
        <p className="entry-legal">
          Al continuar, aceptás los <a href="/terminos">Términos</a> y la <a href="/privacidad">Política de privacidad</a>.
        </p>
      </div>
    </>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  );
}

function Orders({
  customer,
  orders,
  error,
  slug,
  pagosOnline,
}: Readonly<{
  customer: { nombre: string; email: string };
  orders: CustomerOrder[];
  error: string | null;
  slug: string;
  pagosOnline: boolean;
}>) {
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const returned = PAYMENT_RETURN[params.get('pago') ?? ''];
  return (
    <>
      <div className="account-intro account-intro--row">
        <div>
          <span className="eyebrow">MI CUENTA</span>
          <h1>Hola, {customer.nombre}</h1>
          <p>{customer.email}</p>
        </div>
        <Form method="post">
          <input type="hidden" name="intent" value="logout" />
          <button type="submit" className="account-logout">Cerrar sesión</button>
        </Form>
      </div>
      <h2 className="account-subtitle">Mis pedidos</h2>
      {returned ? <output className={returned.ok ? 'form-success' : 'form-error'}>{returned.text}</output> : null}
      {result?.intent === 'pay' ? <output className="form-error">{result.message}</output> : null}
      {error ? <output className="form-error">{error}</output> : null}
      {!error && orders.length === 0 ? (
        <div className="catalog-state"><span>○</span><p>Todavía no hiciste pedidos. <a href={`/tienda/${slug}#catalogo`}>Ver el catálogo</a></p></div>
      ) : null}
      <ul className="account-orders">
        {orders.map((order) => {
          const state = orderState(order.estado);
          return (
            <li key={order.id} className="account-order">
              <div className="account-order__head">
                <strong>
                  {order.numero ? `Pedido N° ${order.numero} · ` : ''}
                  {formatDateTime(order.createdAt)}
                </strong>
                <span className={`account-chip account-chip--${state.tone}`}>{state.label}</span>
              </div>
              <p>{order.items.map((item) => `${item.cantidad} × ${item.producto}`).join(' · ')}</p>
              <strong className="account-order__total">{formatMoney(order.total)}</strong>
              <OrderPayment order={order} pagosOnline={pagosOnline} busy={navigation.state !== 'idle'} />
            </li>
          );
        })}
      </ul>
    </>
  );
}

function OrderPayment({ order, pagosOnline, busy }: Readonly<{ order: CustomerOrder; pagosOnline: boolean; busy: boolean }>) {
  const payment = paymentOf(order, pagosOnline);
  if (payment.kind === 'paid') return <span className="account-chip account-chip--success account-order__paid">Pagado</span>;
  if (payment.kind === 'wait') return <small className="account-order__hint">Vas a poder pagarlo online cuando el comercio lo confirme.</small>;
  if (payment.kind === 'none') return null;
  return (
    <Form method="post" className="account-order__pay">
      <input type="hidden" name="intent" value="pay" />
      <input type="hidden" name="orderId" value={order.id} />
      <button className="submit-order" type="submit" disabled={busy}>
        Pagar con Mercado Pago · {formatMoney(payment.remaining)}
      </button>
    </Form>
  );
}

/** OR-B4-035 rule 1 — purchases made at the counter to this customer, and their returns. */
function Purchases({ purchases, slug }: Readonly<{ purchases: CustomerPurchase[]; slug: string }>) {
  const [params] = useSearchParams();
  const requested = params.get('devolucion');
  if (purchases.length === 0 && !requested) return null;
  return (
    <>
      <h2 className="account-subtitle">Mis compras</h2>
      {requested ? (
        <output className="form-success">Pediste la devolución #{requested}. Te avisamos por el chat cuando la revisemos.</output>
      ) : null}
      <ul className="account-orders">
        {purchases.map((purchase) => {
          const returnable = purchase.devolvible && purchase.items.some((i) => i.disponible > 0);
          return (
            <li key={purchase.id} className="account-order">
              <div className="account-order__head">
                <strong>{formatDateTime(purchase.fecha)}</strong>
                {purchase.numero ? <span className="account-order__hint">Compra #{purchase.numero}</span> : null}
              </div>
              <p>{purchase.items.map((item) => `${item.cantidad} × ${item.producto}`).join(' · ')}</p>
              <strong className="account-order__total">{formatMoney(purchase.total)}</strong>
              {purchase.devoluciones.map((r) => {
                const state = returnState(r);
                return (
                  <p key={r.id} className="account-return">
                    Devolución {r.numero ? `#${r.numero}` : ''}: {r.items.map((i) => `${i.cantidad} × ${i.producto}`).join(', ')}{' '}
                    <span className={`account-chip account-chip--${state.tone === 'success' ? 'success' : 'muted'}`}>{state.label}</span>
                  </p>
                );
              })}
              {returnable ? (
                <Link className="account-order__return" to={`/tienda/${slug}/cuenta/devolucion/${purchase.id}`}>
                  Pedir devolución · quedan {purchase.diasParaDevolver} {purchase.diasParaDevolver === 1 ? 'día' : 'días'}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
