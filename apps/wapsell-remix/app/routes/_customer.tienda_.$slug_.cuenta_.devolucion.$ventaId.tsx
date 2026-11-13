import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { StoreHeader } from '~/components/store/StoreHeader';
import { ApiError } from '~/services/api.server';
import { getStoreCustomer } from '~/services/customer-session.server';
import { fetchCustomerPurchases, fetchStore, requestCustomerReturn } from '~/services/store.server';
import { RETURN_REASONS, returnItemsFrom } from '~/utils/returns';
import { formatDateTime, formatMoney } from '~/utils/format';

/**
 * The store customer asks for a return of one of their purchases (OR-B4-035 rule 1):
 * /tienda/:slug/cuenta/devolucion/:ventaId. It reaches the Business «Por autorizar».
 */

export const meta: MetaFunction<typeof loader> = ({ data }) => [{ title: data ? `Pedir devolución | ${data.store.nombre}` : 'Devolución' }];

async function purchaseFor(request: Request, slug: string, saleId: string) {
  const customer = await getStoreCustomer(request, slug);
  if (!customer) throw redirect(`/tienda/${slug}/cuenta`);
  const purchases = await fetchCustomerPurchases(customer.jwt, slug);
  const purchase = purchases.find((p) => p.id === saleId);
  if (!purchase) throw new Response('Compra no encontrada', { status: 404 });
  return { customer, purchase };
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? '';
  const store = await fetchStore(slug);
  if (!store) throw new Response('Tienda no encontrada', { status: 404 });
  const { customer, purchase } = await purchaseFor(request, slug, params.ventaId ?? '');
  return json({ store, customerName: customer.nombre, purchase });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const slug = params.slug ?? '';
  const { customer, purchase } = await purchaseFor(request, slug, params.ventaId ?? '');
  const form = await request.formData();
  const lines = purchase.items.map((i) => ({ ventaItemId: i.ventaItemId, nombre: i.producto, available: i.disponible }));
  const parsed = returnItemsFrom(form, lines);
  if (!parsed.ok) return json({ message: parsed.message }, { status: 400 });
  const comment = String(form.get('motivo_general') ?? '').trim();
  try {
    const created = await requestCustomerReturn(customer.jwt, slug, purchase.id, {
      items: parsed.items,
      ...(comment ? { motivo_general: comment } : {}),
    });
    return redirect(`/tienda/${slug}/cuenta?devolucion=${created.numero ?? ''}`);
  } catch (error) {
    if (error instanceof ApiError) return json({ message: error.message }, { status: error.status });
    throw error;
  }
}

export default function RequestReturn() {
  const { store, customerName, purchase } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const lines = purchase.items.filter((i) => i.disponible > 0);
  return (
    <main className="store-shell">
      <StoreHeader store={store} customerName={customerName}>
        <Link className="cart-trigger" to={`/tienda/${store.slug}/cuenta`}>Mi cuenta</Link>
      </StoreHeader>
      <section className="account-section">
        <div className="account-intro">
          <span className="eyebrow">PEDIR DEVOLUCIÓN</span>
          <h1>Compra del {formatDateTime(purchase.fecha)}</h1>
          <p>
            {purchase.devolvible
              ? `Tenés ${purchase.diasParaDevolver} ${purchase.diasParaDevolver === 1 ? 'día' : 'días'} para pedirla. El comercio la revisa y te avisa por el chat.`
              : 'Pasó el plazo para pedir la devolución de esta compra.'}
          </p>
        </div>
        {purchase.devolvible && lines.length > 0 ? (
          <Form method="post" className="checkout-form account-card account-return-form">
            {lines.map((line) => (
              <fieldset key={line.ventaItemId} className="account-return-line">
                <legend>
                  {line.producto} <span>· {formatMoney(line.precio)} c/u · podés devolver {line.disponible}</span>
                </legend>
                <label>
                  Cantidad
                  <input name={`cantidad-${line.ventaItemId}`} type="number" min={0} max={line.disponible} step={1} defaultValue={0} inputMode="numeric" />
                </label>
                <label>
                  Motivo
                  <select name={`razon-${line.ventaItemId}`} defaultValue="">
                    <option value="" disabled>Elegí el motivo</option>
                    {RETURN_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Comentario <span>(obligatorio si elegís «Otro»)</span>
                  <input name={`motivo-${line.ventaItemId}`} maxLength={500} />
                </label>
              </fieldset>
            ))}
            <label>
              ¿Algo más que quieras contarnos? <span>(opcional)</span>
              <input name="motivo_general" maxLength={1000} />
            </label>
            {result?.message ? <output className="form-error">{result.message}</output> : null}
            <button className="submit-order" type="submit" disabled={navigation.state !== 'idle'}>Pedir devolución</button>
          </Form>
        ) : (
          <p><Link to={`/tienda/${store.slug}/cuenta`}>Volver a mi cuenta</Link></p>
        )}
      </section>
    </main>
  );
}
