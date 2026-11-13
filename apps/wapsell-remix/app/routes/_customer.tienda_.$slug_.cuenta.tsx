import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from '@remix-run/react';
import { StoreHeader } from '~/components/store/StoreHeader';
import { ApiError } from '~/services/api.server';
import { getStoreCustomer, signInCookie, signOutCookie, storeAuth } from '~/services/customer-session.server';
import { fetchCustomerOrders, fetchStore, payOrder, type CustomerOrder } from '~/services/store.server';
import { PAYMENT_RETURN, paymentOf } from '~/utils/store';
import { formatDateTime, formatMoney, orderState } from '~/utils/format';

/**
 * Customer account of one Business store — /tienda/:slug/cuenta (STORE-V1-03).
 * Signed out: sign in or create an account (accounts are per Business). Signed in: the
 * customer's orders in this store and sign out.
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
  if (!customer) return json({ store, customer: null, orders: [] as CustomerOrder[], ordersError: null });
  try {
    const orders = await fetchCustomerOrders(customer.jwt, slug);
    return json({ store, customer: { nombre: customer.nombre, email: customer.email }, orders, ordersError: null as string | null });
  } catch (error) {
    if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
      return json(
        { store, customer: null, orders: [] as CustomerOrder[], ordersError: null },
        { headers: { 'Set-Cookie': await signOutCookie(request) } },
      );
    }
    return json({ store, customer: { nombre: customer.nombre, email: customer.email }, orders: [] as CustomerOrder[], ordersError: 'No pudimos cargar tus pedidos.' });
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
  const { store, customer, orders, ordersError } = useLoaderData<typeof loader>();

  return (
    <main className="store-shell">
      <StoreHeader store={store} customerName={customer?.nombre ?? null}>
        <Link className="cart-trigger" to={`/tienda/${store.slug}?carrito=1`}>Mi pedido</Link>
      </StoreHeader>
      <section className="account-section">
        {customer ? (
          <Orders customer={customer} orders={orders} error={ordersError} slug={store.slug} pagosOnline={Boolean(store.pagosOnline)} />
        ) : (
          <SignIn store={store} />
        )}
      </section>
    </main>
  );
}

function SignIn({ store }: Readonly<{ store: { nombre: string; slug: string } }>) {
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const busy = navigation.state !== 'idle';
  const volver = params.get('volver') ?? '';

  return (
    <>
      <div className="account-intro">
        <span className="eyebrow">TU CUENTA EN {store.nombre.toUpperCase()}</span>
        <h1>Ingresá o creá tu cuenta</h1>
        <p>Con tu cuenta confirmás pedidos, tu carrito queda guardado y ves el estado de tus compras.</p>
      </div>
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
    </>
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
                <strong>{formatDateTime(order.createdAt)}</strong>
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
