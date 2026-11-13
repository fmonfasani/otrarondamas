import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useParams } from '@remix-run/react';
import { ArrowLeft } from 'lucide-react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { formatDateTime, formatMoney } from '~/utils/format';
import { RETURN_REASONS, RETURN_WINDOW_DAYS, returnItemsFrom, returnWindow, returnedBySaleItem, type CustomerReturn } from '~/utils/returns';
import { saleNumber } from '~/utils/sales';

export const meta: MetaFunction = () => [{ title: 'Nueva devolución · Wapsell' }];

interface Sale {
  id: string;
  numeroFormateado: string | null;
  createdAt: string;
  estado: string;
  Cliente: { id: string; nombre: string } | null;
  ventaItems: Array<{ id: string; nombre: string; cantidad: string; precioUnitario: string; descuentoFidelizacionPorcentaje: string | null }>;
}

async function saleWithReturns(token: string, saleId: string) {
  const [sale, returns] = await Promise.all([
    apiRequest<Sale>(token, `/ventas/${encodeURIComponent(saleId)}`),
    settle(apiRequest<{ items: CustomerReturn[] }>(token, '/devoluciones?limit=100')),
  ]);
  const returned = returnedBySaleItem(returns?.items ?? [], sale.id);
  const lines = sale.ventaItems.map((item) => {
    const pct = item.descuentoFidelizacionPorcentaje ? Number(item.descuentoFidelizacionPorcentaje) : 0;
    return {
      ventaItemId: item.id,
      nombre: item.nombre,
      sold: Number(item.cantidad),
      available: Number(item.cantidad) - (returned.get(item.id) ?? 0),
      unit: Number(item.precioUnitario) * (1 - pct / 100),
    };
  });
  return { sale, lines };
}

/** Register a return from a sale: what comes back, why, and for which customer (OR-B4-034). */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const saleId = new URL(request.url).searchParams.get('venta');
  if (!saleId) throw new Response('Elegí la venta a devolver desde Ventas.', { status: 400 });
  try {
    const { sale, lines } = await saleWithReturns(token, saleId);
    const customers = sale.Cliente ? [] : ((await settle(apiRequest<Array<{ id: string; nombre: string }>>(token, '/clientes'))) ?? []);
    return json({ sale, lines, customers, window: returnWindow(sale.createdAt) });
  } catch (error) {
    if (error instanceof ApiError) throw new Response(error.message, { status: error.status });
    throw error;
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const saleId = String(form.get('ventaId') ?? '');
  try {
    const { lines } = await saleWithReturns(token, saleId);
    const parsed = returnItemsFrom(form, lines);
    if (!parsed.ok) return json({ message: parsed.message }, { status: 400 });
    const clienteId = String(form.get('clienteId') ?? '') || undefined;
    const motivoGeneral = String(form.get('motivo_general') ?? '').trim();
    const created = await apiRequest<{ id: string }>(token, '/devoluciones', {
      method: 'POST',
      body: JSON.stringify({
        ventaId: saleId,
        items: parsed.items,
        ...(clienteId ? { clienteId } : {}),
        ...(motivoGeneral ? { motivo_general: motivoGeneral } : {}),
      }),
    });
    return redirect(`/${params.lang ?? 'es'}/dashboard/devoluciones/${created.id}?nueva=1`);
  } catch (error) {
    if (error instanceof ApiError) return json({ message: error.message }, { status: error.status });
    throw error;
  }
}

export default function NewReturn() {
  const { sale, lines, customers, window } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const { lang = 'es' } = useParams();
  const returnable = lines.filter((l) => l.available > 0);

  return (
    <div className="ws-page">
      <Link className="ws-back" to={`/${lang}/dashboard/ventas/${sale.id}`}>
        <ArrowLeft size={16} aria-hidden="true" /> Venta {saleNumber(sale)}
      </Link>
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">NUEVA DEVOLUCIÓN</p>
          <h1 className="ws-page__title">{sale.Cliente?.nombre ?? 'Consumidor final'}</h1>
          <p className="ws-page__lead">
            Venta {saleNumber(sale)} del {formatDateTime(sale.createdAt)} ·{' '}
            {window.open ? `quedan ${window.left} ${window.left === 1 ? 'día' : 'días'} para devolverla` : `pasaron más de ${RETURN_WINDOW_DAYS} días`}
          </p>
        </div>
      </div>

      {!window.open ? (
        <p className="ws-alert" role="alert">
          Esta venta tiene {window.days} días: se aceptan devoluciones hasta {RETURN_WINDOW_DAYS} días después de la venta.
        </p>
      ) : returnable.length === 0 ? (
        <p className="ws-alert" role="alert">Todos los productos de esta venta ya se devolvieron.</p>
      ) : (
        <section className="ws-card" aria-labelledby="return-title">
          <h2 id="return-title" className="ws-card__title">¿Qué se devuelve?</h2>
          <Form method="post" className="ws-pos__checkout">
            <input type="hidden" name="ventaId" value={sale.id} />
            <ul className="ws-return-lines">
              {lines.map((line) => (
                <li key={line.ventaItemId}>
                  <span className="ws-pos__line-name">
                    <b>{line.nombre}</b>
                    <small>
                      Vendidos {line.sold} · {formatMoney(line.unit)} c/u
                      {line.available < line.sold ? ` · ya devueltos ${line.sold - line.available}` : ''}
                    </small>
                  </span>
                  {line.available > 0 ? (
                    <>
                      <label className="ws-field ws-return-qty">
                        <span className="ws-field__label">Cantidad</span>
                        <span className="ws-field__control">
                          <input name={`cantidad-${line.ventaItemId}`} type="number" min={0} max={line.available} step={1} defaultValue={0} inputMode="numeric" />
                        </span>
                      </label>
                      <label className="ws-field">
                        <span className="ws-field__label">Motivo</span>
                        <span className="ws-field__control">
                          <select name={`razon-${line.ventaItemId}`} defaultValue="">
                            <option value="" disabled>Elegí el motivo</option>
                            {RETURN_REASONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </span>
                      </label>
                      <label className="ws-field">
                        <span className="ws-field__label">Comentario (obligatorio si es «Otro»)</span>
                        <span className="ws-field__control">
                          <input name={`motivo-${line.ventaItemId}`} placeholder="Ej.: la botella vino pinchada" maxLength={500} />
                        </span>
                      </label>
                    </>
                  ) : (
                    <span className="ws-chip ws-chip--muted">Ya devuelto</span>
                  )}
                </li>
              ))}
            </ul>
            {!sale.Cliente && (
              <label className="ws-field">
                <span className="ws-field__label">Cliente (la venta fue a consumidor final)</span>
                <span className="ws-field__control">
                  <select name="clienteId" required defaultValue="">
                    <option value="" disabled>Elegí el cliente</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </span>
                <small className="ws-meta">Si no está, cargalo primero en Clientes.</small>
              </label>
            )}
            <label className="ws-field">
              <span className="ws-field__label">Comentario general (opcional)</span>
              <span className="ws-field__control">
                <input name="motivo_general" maxLength={1000} />
              </span>
            </label>
            {result?.message && <p className="ws-alert" role="alert">{result.message}</p>}
            <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={navigation.state !== 'idle'}>
              Registrar devolución
            </button>
          </Form>
        </section>
      )}
    </div>
  );
}
