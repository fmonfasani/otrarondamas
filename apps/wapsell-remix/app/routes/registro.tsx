import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { AuthShell } from '~/components/auth/AuthShell';
import { PasswordField } from '~/components/auth/PasswordField';
import { buyerApi, getBuyer } from '~/services/buyer-session.server';

export const meta: MetaFunction = () => [{ title: 'Creá tu cuenta · Wapsell' }];

/**
 * ADR-IDN-008 — «Creá tu cuenta»: the universal buyer account, reached from the Wapsell entry.
 * Google first, email second (a verification link follows). At the bottom, quieter, the way to
 * sell: «¿Querés vender en Wapsell?» → /vender.
 */
const ERRORS: Record<string, string> = {
  google: 'No pudimos continuar con Google. Probá de nuevo o usá tu email.',
  enlace: 'El enlace venció o ya se usó. Registrate de nuevo y te mandamos otro.',
};

export async function loader({ request }: LoaderFunctionArgs) {
  if (await getBuyer(request)) return redirect('/cuenta');
  const code = new URL(request.url).searchParams.get('error') ?? '';
  return json({ google: process.env.GOOGLE_LOGIN_ENABLED === '1', error: ERRORS[code] ?? null });
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const field = (k: string) => String(form.get(k) ?? '').trim();
  const nombre = field('nombre');
  const email = field('email').toLowerCase();
  const password = String(form.get('password') ?? '');
  const values = { nombre, email };
  if (nombre.length < 2) return json({ error: 'Escribí tu nombre.', values }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Revisá el email.', values }, { status: 400 });
  if (password.length < 8) return json({ error: 'La contraseña tiene que tener al menos 8 caracteres.', values }, { status: 400 });
  const result = await buyerApi<{ email: string; mailEnviado: boolean }>('/registro', {
    method: 'POST',
    body: { nombre, email, password },
  });
  if (!result.ok) return json({ error: result.message, values }, { status: result.status });
  return json({ sent: result.data });
}

export default function BuyerSignup() {
  const { google, error: loadError } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== 'idle';

  if (result && 'sent' in result) {
    return (
      <AuthShell>
        <div className="ws-intro">
          <p className="ws-intro__eyebrow">CUENTA CREADA</p>
          <h1 className="ws-intro__title">Revisá tu email.</h1>
          <p className="ws-intro__lead">
            Te mandamos a <b>{result.sent.email}</b> un enlace para confirmar tu cuenta (vale 3 días). Si no lo ves, mirá
            en Spam.
          </p>
        </div>
        {!result.sent.mailEnviado && (
          <p className="ws-alert" role="alert">
            No pudimos enviar el email ahora. Probá registrarte de nuevo en unos minutos.
          </p>
        )}
        <Link className="ws-button ws-button--primary" to="/es/auth/login">
          Ir a ingresar
        </Link>
      </AuthShell>
    );
  }

  const values = result && 'values' in result ? result.values : null;
  const error = result && 'error' in result ? String(result.error) : loadError;

  return (
    <AuthShell>
      <div className="ws-intro">
        <p className="ws-intro__eyebrow">WAPSELL</p>
        <h1 className="ws-intro__title">
          Comprá en tu negocio
          <br />
          más cercano.
        </h1>
        <p className="ws-intro__lead">Una sola cuenta para comprar en todos los negocios de Wapsell.</p>
      </div>

      {google && (
        <>
          <a className="ws-button ws-button--outline" href="/registro/google">
            Continuar con Google
          </a>
          <p className="ws-or" aria-hidden="true">
            o con tu email
          </p>
        </>
      )}

      <Form method="post" className="ws-form">
        <label className="ws-field">
          <span className="ws-field__label">Tu nombre</span>
          <span className="ws-field__control">
            <input name="nombre" required minLength={2} autoComplete="name" placeholder="Lucía Pérez" defaultValue={values?.nombre} />
          </span>
        </label>
        <label className="ws-field">
          <span className="ws-field__label">Correo electrónico</span>
          <span className="ws-field__control">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="lucia@ejemplo.com"
              defaultValue={values?.email}
            />
          </span>
        </label>
        <PasswordField name="password" label="Contraseña (mínimo 8 caracteres)" />
        {error && (
          <p className="ws-alert" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="ws-button ws-button--primary" disabled={busy}>
          {busy ? 'Creando…' : 'Crear mi cuenta'}
          <img src="/brand/arrow-right.svg" alt="" width={16} height={16} />
        </button>
      </Form>

      <p className="ws-switch-account">
        ¿Ya tenés una cuenta? <Link to="/es/auth/login">Ingresar</Link>
      </p>
      <p className="ws-sell-link">
        ¿Querés vender en Wapsell? <Link to="/vender">Registrá tu negocio →</Link>
      </p>
    </AuthShell>
  );
}
