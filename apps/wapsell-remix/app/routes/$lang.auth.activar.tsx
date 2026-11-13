import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useParams } from '@remix-run/react';
import { AuthShell } from '~/components/auth/AuthShell';
import { MIN_PASSWORD_LENGTH, PasswordField } from '~/components/auth/PasswordField';
import { getApiBaseUrl } from '~/services/api.server';
import { commitSession, getSession } from '~/services/auth.server';

export const meta: MetaFunction = () => [{ title: 'Activar cuenta · Wapsell' }];

/**
 * Accept a team invitation — the link of the invitation email (/es/auth/activar?token=…).
 * The person chooses their name and password; the API creates the account with its
 * Membership and signs them in. Until the Owner approves their dossier (RF-17) they can
 * sign in but not operate.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  return json({ token: new URL(request.url).searchParams.get('token') ?? '' });
}

type ActionData = { error: string };

export async function action({ request, params }: ActionFunctionArgs) {
  const form = await request.formData();
  const token = String(form.get('token') ?? '');
  const nombre = String(form.get('nombre') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  if (!token) return json<ActionData>({ error: 'El enlace de invitación no es válido.' }, { status: 400 });
  if (nombre.length < 2) return json<ActionData>({ error: 'Contanos tu nombre.' }, { status: 400 });
  if (password.length < MIN_PASSWORD_LENGTH) {
    return json<ActionData>({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` }, { status: 400 });
  }
  if (password !== confirm) return json<ActionData>({ error: 'Las contraseñas no coinciden.' }, { status: 400 });

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/invitaciones/activar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token, nombre, password }),
    });
  } catch {
    return json<ActionData>({ error: 'No pudimos conectarnos. Probá de nuevo en unos minutos.' }, { status: 503 });
  }
  const payload = (await response.json().catch(() => ({}))) as { accessToken?: string; message?: string };
  if (!response.ok || !payload.accessToken) {
    const message =
      response.status === 404 ? 'El enlace de invitación no es válido.' : (payload.message ?? 'No pudimos activar la cuenta.');
    return json<ActionData>({ error: message }, { status: response.status || 400 });
  }
  const session = await getSession(request.headers.get('Cookie'));
  session.set('jwt', payload.accessToken);
  return redirect(`/${params.lang ?? 'es'}/dashboard?bienvenida=1`, {
    headers: { 'Set-Cookie': await commitSession(session) },
  });
}

export default function ActivatePage() {
  const { token } = useLoaderData<typeof loader>();
  const data = useActionData<typeof action>();
  const navigation = useNavigation();
  const { lang = 'es' } = useParams();
  const busy = navigation.state === 'submitting';

  return (
    <AuthShell>
      <div className="ws-state-symbol ws-state-symbol--secondary" aria-hidden="true">
        <img src="/brand/key-round.svg" alt="" width={28} height={28} />
      </div>
      <div className="ws-intro">
        <p className="ws-intro__eyebrow">TE INVITARON AL EQUIPO</p>
        <h1 className="ws-intro__title">
          Activá tu
          <br />
          cuenta.
        </h1>
        <p className="ws-intro__lead">Elegí cómo te van a ver tus compañeros y una contraseña para ingresar.</p>
      </div>
      {token ? (
        <Form method="post" className="ws-form ws-form--relaxed">
          <input type="hidden" name="token" value={token} />
          <label className="ws-field">
            <span className="ws-field__label">Tu nombre</span>
            <span className="ws-field__control">
              <input name="nombre" required minLength={2} autoComplete="name" autoFocus />
            </span>
          </label>
          <PasswordField name="password" label="Contraseña" />
          <PasswordField name="confirm" label="Repetí la contraseña" />
          {data?.error && (
            <p className="ws-alert" role="alert">
              {data.error}
            </p>
          )}
          <button type="submit" className="ws-button ws-button--primary" disabled={busy}>
            {busy ? 'Activando…' : 'Activar mi cuenta'}
            <img src="/brand/arrow-right.svg" alt="" width={16} height={16} />
          </button>
        </Form>
      ) : (
        <p className="ws-alert" role="alert">
          El enlace de invitación no es válido. Pedile al Owner que te invite de nuevo.
        </p>
      )}
      <Link className="ws-return" to={`/${lang}/auth/login`}>
        ¿Ya tenés cuenta? Ingresá
      </Link>
    </AuthShell>
  );
}
