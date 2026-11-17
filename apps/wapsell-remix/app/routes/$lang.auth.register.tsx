import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  useParams,
} from '@remix-run/react';
import { AuthShell } from '~/components/auth/AuthShell';
import { commitSession, getSession } from '~/services/auth.server';
import { ApiError } from '~/services/api.server';
import { authPublicPost } from '~/services/mfa.server';

export const meta: MetaFunction = () => [{ title: 'Crear cuenta · Wapsell' }];

type Google = { ticket: string; nombre: string; email: string };

/**
 * OR-B4-045 — «Crear cuenta»: a new Business with you as its Owner.
 * With email: no password here; a welcome email brings the link to create it.
 * With Google: Google verified the email; you only name your Business, then enrol MFA.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const lang = params.lang ?? 'es';
  const session = await getSession(request.headers.get('Cookie'));
  if (session.get('jwt')) return redirect(`/${lang}/dashboard`);
  const ticket = new URL(request.url).searchParams.get('google');
  let google: Google | null = null;
  if (ticket) {
    try {
      const who = await post<{ nombre: string; email: string }>('/google/datos', { ticket });
      google = { ticket, ...who };
    } catch {
      return redirect(`/${lang}/auth/register?error=google`);
    }
  }
  const googleError = new URL(request.url).searchParams.get('error') === 'google';
  return json({ google, googleError, googleEnabled: process.env.GOOGLE_LOGIN_ENABLED === '1' });
}

/** Public sign-up endpoints: /auth/registro… */
const post = <T,>(path: string, body: unknown) => authPublicPost<T>(`/registro${path}`, body);

export async function action({ request, params }: ActionFunctionArgs) {
  const lang = params.lang ?? 'es';
  const form = await request.formData();
  const field = (k: string) => String(form.get(k) ?? '').trim();
  const nombreNegocio = field('nombreNegocio');
  if (nombreNegocio.length < 2)
    return json({ error: 'Escribí el nombre de tu negocio.' }, { status: 400 });
  try {
    const ticket = field('ticket');
    if (ticket) {
      const done = await post<{ mfa: 'activar'; ticket: string }>('/google', {
        ticket,
        nombreNegocio,
      });
      const session = await getSession(request.headers.get('Cookie'));
      session.set('mfaTicket', done.ticket);
      session.set('mfaStep', 'activar');
      session.set('mfaRemember', true);
      session.set('mfaRedirect', `/${lang}/dashboard`);
      session.unset('mfaEnroll');
      return redirect(`/${lang}/auth/activar-mfa`, {
        headers: { 'Set-Cookie': await commitSession(session) },
      });
    }
    const nombre = field('nombre');
    const email = field('email').toLowerCase();
    if (nombre.length < 2) return json({ error: 'Escribí tu nombre.' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json({ error: 'Revisá el email.' }, { status: 400 });
    const done = await post<{ negocio: string; email: string; mailEnviado: boolean }>('', {
      nombreNegocio,
      nombre,
      email,
    });
    return json({ created: done });
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, { status: error.status });
    throw error;
  }
}

function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  placeholder,
}: Readonly<{
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}>) {
  return (
    <label className="ws-field">
      <span className="ws-field__label">{label}</span>
      <span className="ws-field__control">
        <input
          type={type}
          name={name}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
      </span>
    </label>
  );
}

export default function RegisterPage() {
  const { google, googleError, googleEnabled } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== 'idle';
  const { lang = 'es' } = useParams();
  const created = result && 'created' in result ? result.created : null;
  const error =
    result && 'error' in result
      ? result.error
      : googleError
        ? 'El registro con Google venció o no se pudo completar. Probá de nuevo.'
        : null;

  if (created) {
    return (
      <AuthShell>
        <div className="ws-intro">
          <p className="ws-intro__eyebrow">CUENTA CREADA</p>
          <h1 className="ws-intro__title">Revisá tu email.</h1>
          <p className="ws-intro__lead">
            Creamos <b>{created.negocio}</b>. Te mandamos a <b>{created.email}</b> un enlace para
            crear tu contraseña (vale 7 días). Si no lo ves, mirá en Spam.
          </p>
        </div>
        {!created.mailEnviado && (
          <p className="ws-alert" role="alert">
            No pudimos enviar el email ahora. Probá con «Olvidé mi contraseña» desde el ingreso.
          </p>
        )}
        <Link className="ws-button ws-button--primary" to={`/${lang}/auth/login`}>
          Ir a ingresar
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="ws-intro">
        <p className="ws-intro__eyebrow">TU NEGOCIO EN WAPSELL</p>
        <h1 className="ws-intro__title">
          {google ? (
            <>
              Hola, {google.nombre.split(' ')[0]}.
              <br />
              Falta un dato.
            </>
          ) : (
            <>
              Empezá a vender
              <br />
              conversando.
            </>
          )}
        </h1>
        <p className="ws-intro__lead">
          {google
            ? `Vas a entrar con ${google.email}. ¿Cómo se llama tu negocio?`
            : 'Creá tu negocio y quedás como Owner. Después sumás a tu equipo.'}
        </p>
      </div>

      <Form method="post" className="ws-form">
        <Field
          label="Nombre de tu negocio"
          name="nombreNegocio"
          placeholder="Mi almacén"
          autoComplete="organization"
        />
        {google ? (
          <input type="hidden" name="ticket" value={google.ticket} />
        ) : (
          <>
            <Field label="Tu nombre" name="nombre" placeholder="Lucía Pérez" autoComplete="name" />
            <Field
              label="Correo electrónico"
              name="email"
              type="email"
              placeholder="lucia@ejemplo.com"
              autoComplete="email"
            />
          </>
        )}
        {error && (
          <p className="ws-alert" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="ws-button ws-button--primary" disabled={busy}>
          {busy ? 'Creando…' : 'Crear cuenta'}
          <img src="/brand/arrow-right.svg" alt="" width={16} height={16} />
        </button>
      </Form>

      {!google && googleEnabled && (
        <>
          <p className="ws-or" aria-hidden="true">
            o
          </p>
          <a className="ws-button ws-button--outline" href="/auth/google">
            Crear cuenta con Google
          </a>
        </>
      )}

      <p className="ws-switch-account">
        ¿Ya tenés una cuenta? <Link to={`/${lang}/auth/login`}>Ingresar</Link>
      </p>
    </AuthShell>
  );
}
