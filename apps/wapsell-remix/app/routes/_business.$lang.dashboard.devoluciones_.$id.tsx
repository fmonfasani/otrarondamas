import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useParams, useSearchParams } from '@remix-run/react';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUser, requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { formatDateTime, formatMoney } from '~/utils/format';
import {
  DESTINATIONS,
  RETURN_STATES,
  canManageReturns,
  destinationsFrom,
  refundDescription,
  returnNumber,
  type CustomerReturn,
} from '~/utils/returns';

export const meta: MetaFunction = () => [{ title: 'Devolución · Wapsell' }];

const CODES: Record<string, string> = { CAJA_CERRADA: 'La caja está cerrada. Abrila en Caja para devolver en efectivo.' };

export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  try {
    const [found, user] = await Promise.all([
      apiRequest<CustomerReturn>(token, `/devoluciones/${encodeURIComponent(params.id ?? '')}`),
      getCurrentUser(token),
    ]);
    const sale = await settle(
      apiRequest<{ Pago: Array<{ medio: string; monto: string; estado: string }> }>(token, `/ventas/${encodeURIComponent(found.ventaId)}`),
    );
    const paid = (sale?.Pago ?? []).filter((p) => p.estado === 'APROBADO').sort((a, b) => Number(b.monto) - Number(a.monto));
    return json({ found, role: String(user?.rol ?? ''), method: paid[0]?.medio ?? null });
  } catch (error) {
    if (error instanceof ApiError) throw new Response(error.message, { status: error.status });
    throw error;
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const id = encodeURIComponent(params.id ?? '');
  const form = await request.formData();
  const intent = String(form.get('intent'));
  try {
    if (intent === 'authorize') {
      await apiRequest(token, `/devoluciones/${id}/authorize`, {
        method: 'PUT',
        body: JSON.stringify({ condition: 'accepted', notes: String(form.get('notes') ?? '').trim() || undefined }),
      });
      return json({ ok: true, message: 'Devolución autorizada.' });
    }
    if (intent === 'receive') {
      const found = await apiRequest<CustomerReturn>(token, `/devoluciones/${id}`);
      const parsed = destinationsFrom(form, found.items);
      if (!parsed.ok) return json({ ok: false, message: parsed.message }, { status: 400 });
      const note = String(form.get('condition_check') ?? '').trim();
      await apiRequest(token, `/devoluciones/${id}/receive`, {
        method: 'PUT',
        body: JSON.stringify({ items: parsed.items, ...(note ? { condition_check: note } : {}) }),
      });
      return json({ ok: true, message: 'Productos recibidos.' });
    }
    if (intent === 'refund') {
      const notes = String(form.get('notes') ?? '').trim();
      await apiRequest(token, `/devoluciones/${id}/process-refund`, { method: 'PUT', body: JSON.stringify(notes ? { notes } : {}) });
      return json({ ok: true, message: 'Reembolso registrado. La devolución terminó.' });
    }
    return json({ ok: false, message: 'Acción desconocida.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) return json({ ok: false, message: CODES[error.message] ?? error.message }, { status: error.status });
    throw error;
  }
}

const STEPS = [
  { key: 'fechaSolicitud', label: 'Registrada' },
  { key: 'fechaAutorizacion', label: 'Autorizada' },
  { key: 'fechaRecibida', label: 'Recibida' },
  { key: 'fechaProcesada', label: 'Reembolsada' },
] as const;

export default function ReturnPage() {
  const { found, role, method } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const { lang = 'es' } = useParams();
  const state = RETURN_STATES[found.estado] ?? { label: found.estado, tone: 'muted', next: '' };
  const manage = canManageReturns(role);
  const busy = navigation.state !== 'idle';

  return (
    <div className="ws-page">
      <Link className="ws-back" to={`/${lang}/dashboard/devoluciones`}>
        <ArrowLeft size={16} aria-hidden="true" /> Devoluciones
      </Link>
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">DEVOLUCIÓN {returnNumber(found)}</p>
          <h1 className="ws-page__title">{found.cliente.nombre}</h1>
          <p className="ws-page__lead">
            De la <Link className="ws-link" to={`/${lang}/dashboard/ventas/${found.ventaId}`}>venta {found.ventaNumero ? `#${found.ventaNumero}` : ''}</Link> del{' '}
            {formatDateTime(found.ventaFecha)}
          </p>
        </div>
        <span className={`ws-chip ws-chip--${state.tone}`}>{state.label}</span>
      </div>

      {params.get('nueva') === '1' && !result && <p className="ws-notice" role="status">Devolución registrada. {state.next}</p>}
      {result && <p className={result.ok ? 'ws-notice' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>{result.message}</p>}

      <ol className="ws-return-steps" aria-label="Pasos de la devolución">
        {STEPS.map((step) => {
          const when = found[step.key];
          return (
            <li key={step.key} className={when ? 'is-done' : ''}>
              <b>{step.label}</b>
              <small>{when ? formatDateTime(when) : 'Pendiente'}</small>
            </li>
          );
        })}
      </ol>

      <div className="ws-columns">
        <section className="ws-card" aria-labelledby="items-title">
          <h2 id="items-title" className="ws-card__title">Productos</h2>
          {found.estado === 'AUTORIZADA' && manage ? (
            <Form method="post" className="ws-pos__checkout">
              <input type="hidden" name="intent" value="receive" />
              <p className="ws-meta">Revisá cada producto y elegí qué pasa con él.</p>
              <ul className="ws-return-lines ws-return-lines--receive">
                {found.items.map((item) => (
                  <li key={item.id}>
                    <span className="ws-pos__line-name">
                      <b>{item.cantidad} × {item.producto}</b>
                      <small>{item.motivo}</small>
                    </span>
                    <fieldset className="ws-pos__methods">
                      <legend className="sr-only">Destino de {item.producto}</legend>
                      {DESTINATIONS.map((d) => (
                        <label key={d.value} className="ws-radio" title={d.help}>
                          <input type="radio" name={`destino-${item.id}`} value={d.value} required />
                          {d.label}
                        </label>
                      ))}
                    </fieldset>
                  </li>
                ))}
              </ul>
              <label className="ws-field">
                <span className="ws-field__label">Observaciones de la revisión (opcional)</span>
                <span className="ws-field__control">
                  <input name="condition_check" maxLength={500} placeholder="Ej.: caja abierta pero producto sano" />
                </span>
              </label>
              <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={busy}>Recibir productos</button>
            </Form>
          ) : (
            <ul className="ws-payments">
              {found.items.map((item) => (
                <li key={item.id}>
                  <span>
                    <span><b>{item.cantidad} × {item.producto}</b> · {formatMoney(item.monto)}</span>
                    <small>{[item.motivo, item.destino].filter(Boolean).join(' · ')}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="ws-meta">A devolver: <b>{formatMoney(found.montoReembolsable)}</b>{found.observaciones ? ` · ${found.observaciones}` : ''}</p>
        </section>

        <aside className="ws-stack">
          <section className="ws-card" aria-labelledby="next-title">
            <h2 id="next-title" className="ws-card__title">{found.estado === 'PROCESADA' ? 'Reembolso' : 'Siguiente paso'}</h2>
            {found.estado === 'PROCESADA' ? (
              <p className="ws-meta">{refundDescription(found, method)}</p>
            ) : (
              <p className="ws-meta">{state.next}</p>
            )}
            {manage && found.estado === 'SOLICITADA' && (
              <Form method="post" className="ws-pos__checkout">
                <input type="hidden" name="intent" value="authorize" />
                <label className="ws-field">
                  <span className="ws-field__label">Nota (opcional)</span>
                  <span className="ws-field__control"><input name="notes" maxLength={500} /></span>
                </label>
                <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={busy}>Autorizar</button>
              </Form>
            )}
            {manage && found.estado === 'RECIBIDA' && (
              <Form method="post" className="ws-pos__checkout">
                <input type="hidden" name="intent" value="refund" />
                <p className="ws-meta">{refundDescription(found, method)}</p>
                <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={busy}>
                  Reembolsar {formatMoney(found.montoReembolsable)}
                </button>
              </Form>
            )}
            {!manage && found.estado !== 'PROCESADA' && <p className="ws-meta">Lo continúa el Owner o un administrador.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
