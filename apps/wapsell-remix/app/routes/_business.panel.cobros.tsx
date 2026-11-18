import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation, useSearchParams } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest } from '~/services/api.server';
import { formatDateTime } from '~/utils/format';

export const meta: MetaFunction = () => [{ title: 'Cobros · Wapsell' }];

interface MercadoPagoStatus {
  available: boolean;
  connected: boolean;
  mercadoPagoUserId: string | null;
  liveMode: boolean | null;
  connectedAt: string | null;
}

/** Outcome of Mercado Pago's redirect (?mp=…), as the API reports it. */
export const CALLBACK_NOTICES: Record<string, { ok: boolean; text: string }> = {
  conectado: { ok: true, text: 'Listo: tu cuenta de Mercado Pago quedó conectada. Lo que cobres en la tienda entra ahí.' },
  cancelado: { ok: false, text: 'Cancelaste la autorización en Mercado Pago. No se conectó nada.' },
  'otra-cuenta': { ok: false, text: 'Esa cuenta de Mercado Pago ya está conectada a otro negocio de Wapsell.' },
  error: { ok: false, text: 'No pudimos conectar la cuenta. Probá de nuevo; si sigue fallando, avisanos.' },
};

/**
 * Cobros — the Business's Mercado Pago account (OR-B4-032), Owner only (OR-B4-033).
 * Connecting sends the Owner to Mercado Pago to authorize Wapsell; Wapsell never sees
 * their Mercado Pago password and keeps the tokens encrypted.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  try {
    return json({ status: await apiRequest<MercadoPagoStatus>(token, '/cobros/mercadopago'), denied: false, error: null as string | null });
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return json({ status: null, denied: true, error: null });
    if (error instanceof ApiError) return json({ status: null, denied: false, error: error.message });
    throw error;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const intent = (await request.formData()).get('intent');
  try {
    if (intent === 'connect') {
      const { url } = await apiRequest<{ url: string }>(token, '/cobros/mercadopago/conectar', { method: 'POST' });
      return redirect(url);
    }
    if (intent === 'disconnect') {
      await apiRequest(token, '/cobros/mercadopago', { method: 'DELETE' });
      return json({ ok: true, message: 'Desconectaste Mercado Pago. La tienda ya no ofrece pagar online.' });
    }
    return json({ ok: false, message: 'Acción desconocida.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) return json({ ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}

export default function Cobros() {
  const { status, denied, error } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  // The ?mp= outcome of Mercado Pago's redirect is stale once the Owner did something else here.
  const notice = result ? undefined : CALLBACK_NOTICES[params.get('mp') ?? ''];
  const busy = navigation.state !== 'idle';

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">PAGOS ONLINE</p>
          <h1 className="ws-page__title">Cobros</h1>
          <p className="ws-page__lead">Conectá la cuenta de Mercado Pago donde querés recibir lo que pagan tus clientes.</p>
        </div>
      </div>

      {notice ? <output className={notice.ok ? 'ws-notice' : 'ws-alert'}>{notice.text}</output> : null}
      {result?.message ? <output className={result.ok ? 'ws-notice' : 'ws-alert'}>{result.message}</output> : null}
      {denied ? <p className="ws-alert">Solo el Owner del negocio puede ver y conectar la cuenta de cobro.</p> : null}
      {error ? <p className="ws-alert">{error}</p> : null}

      {status ? (
        <section className="ws-card" aria-labelledby="mp-title">
          <h2 id="mp-title" className="ws-card__title">Mercado Pago</h2>
          {status.connected ? (
            <>
              <p>
                <span className="ws-chip ws-chip--success">Conectada</span>{' '}
                Cuenta de Mercado Pago n.º {status.mercadoPagoUserId}
                {status.liveMode === false ? ' (de prueba)' : ''}
                {status.connectedAt ? ` · desde ${formatDateTime(status.connectedAt)}` : ''}
              </p>
              <Form method="post" onSubmit={(event) => {
                if (!window.confirm('¿Desconectar Mercado Pago? Tus clientes no van a poder pagar online hasta que la vuelvas a conectar.')) event.preventDefault();
              }}>
                <input type="hidden" name="intent" value="disconnect" />
                <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={busy}>Desconectar</button>
              </Form>
            </>
          ) : status.available ? (
            <>
              <p>Te vamos a llevar a Mercado Pago para que autorices a Wapsell. No vemos tu contraseña.</p>
              <Form method="post">
                <input type="hidden" name="intent" value="connect" />
                <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={busy}>
                  {busy ? 'Abriendo Mercado Pago…' : 'Conectar Mercado Pago'}
                </button>
              </Form>
            </>
          ) : (
            <p className="ws-alert">Los cobros con Mercado Pago todavía no están habilitados en Wapsell. Te avisamos cuando estén.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
