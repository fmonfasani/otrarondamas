import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { getCurrentUser, requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest } from '~/services/api.server';
import { PasswordField } from '~/components/auth/PasswordField';
import { passwordChangeFrom } from '~/utils/settings';

export const meta: MetaFunction = () => [{ title: 'Mi perfil · Wapsell' }];

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  ASISTENTE_LOCAL: 'Vendedor',
  GESTOR_DE_STOCK: 'Gestor de stock',
};

/** Mi perfil — your own name and password; everyone in the team. */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const user = await getCurrentUser(token);
  if (!user) throw new Response('No pudimos cargar tu perfil.', { status: 503 });
  return json({
    nombre: String(user.nombre ?? ''),
    email: String(user.email ?? ''),
    rol: ROLE_LABELS[String(user.rol ?? '')] ?? String(user.rol ?? ''),
    negocio: String(user.empresaNombre ?? ''),
    google: user.metodoLogin === 'google',
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = String(form.get('intent'));
  try {
    if (intent === 'profile') {
      const nombre = String(form.get('nombre') ?? '').trim();
      if (nombre.length < 2) return json({ intent, ok: false, message: 'Tu nombre tiene que tener al menos 2 letras.' }, { status: 400 });
      await apiRequest(token, '/auth/me', { method: 'PATCH', body: JSON.stringify({ nombre }) });
      return json({ intent, ok: true, message: 'Listo, guardamos tu nombre.' });
    }
    if (intent === 'password') {
      const parsed = passwordChangeFrom(form);
      if (!parsed.ok) return json({ intent, ok: false, message: parsed.message }, { status: 400 });
      await apiRequest(token, '/auth/password/change', {
        method: 'POST',
        body: JSON.stringify({ actual: parsed.actual, nueva: parsed.nueva }),
      });
      return json({ intent, ok: true, message: 'Listo, cambiamos tu contraseña. La próxima vez entrá con la nueva.' });
    }
    return json({ intent, ok: false, message: 'Acción desconocida.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) return json({ intent, ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}

export default function Perfil() {
  const me = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== 'idle';
  const notice = (intent: string) =>
    result?.intent === intent ? (
      <p className={result.ok ? 'ws-notice' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>{result.message}</p>
    ) : null;

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">MI CUENTA</p>
          <h1 className="ws-page__title">Mi perfil</h1>
          <p className="ws-page__lead">
            {me.rol} en {me.negocio} · {me.email}
          </p>
        </div>
      </div>
      <div className="ws-columns ws-columns--even">
        <section className="ws-card" aria-labelledby="name-title">
          <h2 id="name-title" className="ws-card__title">Tus datos</h2>
          <Form method="post" className="ws-pos__checkout">
            <input type="hidden" name="intent" value="profile" />
            <label className="ws-field">
              <span className="ws-field__label">Nombre y apellido</span>
              <span className="ws-field__control">
                <input name="nombre" defaultValue={me.nombre} required minLength={2} maxLength={120} autoComplete="name" />
              </span>
            </label>
            <label className="ws-field">
              <span className="ws-field__label">Email</span>
              <span className="ws-field__control"><input value={me.email} readOnly aria-readonly="true" /></span>
              <small className="ws-meta">Con este email entrás. Para cambiarlo, pedíselo al Owner.</small>
            </label>
            {notice('profile')}
            <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={busy}>Guardar</button>
          </Form>
        </section>
        <section className="ws-card" aria-labelledby="password-title">
          <h2 id="password-title" className="ws-card__title">Contraseña</h2>
          {me.google ? (
            <p className="ws-meta">Entrás con tu cuenta de Google, así que no tenés contraseña de Wapsell.</p>
          ) : (
            <Form method="post" className="ws-pos__checkout">
              <input type="hidden" name="intent" value="password" />
              <PasswordField name="actual" label="Contraseña actual" autoComplete="current-password" />
              <PasswordField name="nueva" label="Contraseña nueva (mínimo 8 caracteres)" />
              <PasswordField name="repetida" label="Repetí la contraseña nueva" />
              {notice('password')}
              <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={busy}>Cambiar contraseña</button>
            </Form>
          )}
        </section>
      </div>
    </div>
  );
}
