import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useParams } from '@remix-run/react';
import { getCurrentUser, requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { CONTACT_FIELDS, businessFrom, storeUrl, type Business } from '~/utils/settings';
import { RETURN_WINDOW_DAYS, canManageReturns, windowDaysFrom } from '~/utils/returns';

export const meta: MetaFunction = () => [{ title: 'Ajustes · Wapsell' }];

/**
 * Ajustes — the Business's name and contact details (the Owner edits them; the store shows
 * them), its store address, the return window (Owner/Admin) and where to connect payments.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const [business, returns, user] = await Promise.all([
    apiRequest<Business>(token, '/negocio'),
    settle(apiRequest<{ plazoDias: number }>(token, '/devoluciones/ajustes')),
    getCurrentUser(token),
  ]);
  const role = String(user?.rol ?? '');
  return json({
    business,
    plazoDias: returns?.plazoDias ?? RETURN_WINDOW_DAYS,
    manageReturns: canManageReturns(role),
    owner: role === 'OWNER',
    origin: new URL(request.url).origin,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = String(form.get('intent'));
  try {
    if (intent === 'business') {
      const parsed = businessFrom(form);
      if (!parsed.ok) return json({ intent, ok: false, message: parsed.message }, { status: 400 });
      await apiRequest(token, '/negocio', { method: 'PATCH', body: JSON.stringify(parsed.data) });
      return json({ intent, ok: true, message: 'Listo, guardamos los datos del negocio.' });
    }
    if (intent === 'returns') {
      const days = windowDaysFrom(form.get('plazoDias'));
      if (days === null) return json({ intent, ok: false, message: 'El plazo tiene que ser de 1 a 365 días.' }, { status: 400 });
      await apiRequest(token, '/devoluciones/ajustes', { method: 'PUT', body: JSON.stringify({ plazoDias: days }) });
      return json({ intent, ok: true, message: `Listo: se aceptan devoluciones hasta ${days} días después de la venta.` });
    }
    return json({ intent, ok: false, message: 'Acción desconocida.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) return json({ intent, ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}

export default function Ajustes() {
  const { business, plazoDias, manageReturns, owner, origin } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== 'idle';
  const { lang = 'es' } = useParams();
  const notice = (intent: string) =>
    result?.intent === intent ? (
      <p className={result.ok ? 'ws-notice' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>{result.message}</p>
    ) : null;
  const url = storeUrl(business.slug, origin);

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">NEGOCIO</p>
          <h1 className="ws-page__title">Ajustes</h1>
          <p className="ws-page__lead">Los datos de {business.nombre} y cómo trabaja.</p>
        </div>
      </div>

      <section className="ws-card" aria-labelledby="business-title">
        <h2 id="business-title" className="ws-card__title">Datos del negocio</h2>
        <p className="ws-meta">
          Estos datos se ven en tu tienda. {business.puedeEditar ? '' : 'Solo el Owner los cambia.'}
        </p>
        <p className="ws-meta">
          Tu tienda: <a className="ws-link ws-link--inline" href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\//, '')}</a>
        </p>
        <Form method="post" className="ws-pos__checkout">
          <input type="hidden" name="intent" value="business" />
          <fieldset disabled={!business.puedeEditar} className="ws-settings-fields">
            <label className="ws-field">
              <span className="ws-field__label">Nombre del negocio</span>
              <span className="ws-field__control"><input name="nombre" defaultValue={business.nombre} required minLength={2} maxLength={120} /></span>
            </label>
            {CONTACT_FIELDS.map((f) => (
              <label key={f.name} className="ws-field">
                <span className="ws-field__label">{f.label}</span>
                <span className="ws-field__control">
                  <input name={f.name} defaultValue={business[f.name]} maxLength={f.max} placeholder={f.placeholder} />
                </span>
              </label>
            ))}
          </fieldset>
          {notice('business')}
          {business.puedeEditar && (
            <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={busy}>Guardar datos</button>
          )}
        </Form>
      </section>

      <div className="ws-columns ws-columns--even">
        <section className="ws-card" aria-labelledby="returns-title">
          <h2 id="returns-title" className="ws-card__title">Devoluciones</h2>
          {manageReturns ? (
            <Form method="post" className="ws-pos__checkout">
              <input type="hidden" name="intent" value="returns" />
              <label className="ws-field">
                <span className="ws-field__label">Plazo para devolver (días después de la venta)</span>
                <span className="ws-field__control">
                  <input name="plazoDias" type="number" min={1} max={365} step={1} defaultValue={plazoDias} inputMode="numeric" />
                </span>
                <small className="ws-meta">Fuera de plazo solo el Owner o un administrador la registra, con un motivo.</small>
              </label>
              {notice('returns')}
              <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={busy}>Guardar plazo</button>
            </Form>
          ) : (
            <p className="ws-meta">Se aceptan devoluciones hasta {plazoDias} días después de la venta.</p>
          )}
        </section>
        <section className="ws-card" aria-labelledby="payments-title">
          <h2 id="payments-title" className="ws-card__title">Cobros online</h2>
          <p className="ws-meta">La cuenta de Mercado Pago donde entra la plata de los pedidos de la tienda.</p>
          {owner ? (
            <Link className="ws-button ws-button--outline ws-button--auto" to={`/${lang}/dashboard/cobros`}>Ir a Cobros</Link>
          ) : (
            <p className="ws-meta">La conecta el Owner.</p>
          )}
        </section>
      </div>
    </div>
  );
}
