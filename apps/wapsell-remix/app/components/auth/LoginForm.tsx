import { useState } from 'react';
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  useParams,
  useSearchParams,
} from '@remix-run/react';

interface ActionData {
  error?: string;
  email?: string;
}

/**
 * Entry of Wapsell (ADR-IDN-008, Figma Page 3 · 07): Google first, email second, and
 * «¿Querés vender en Wapsell?» to /vender. Wired to POST /auth/login.
 */
export function LoginForm() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const { lang = 'es' } = useParams();
  const [showPassword, setShowPassword] = useState(false);
  const isSubmitting = navigation.state === 'submitting';
  const loaded = useLoaderData<{ google?: boolean } | undefined>();
  const [search] = useSearchParams();
  const googleError = search.get('error') === 'google';

  return (
    <>
      <div className="ws-intro">
        <p className="ws-intro__eyebrow">WAPSELL</p>
        <h1 className="ws-intro__title">
          Ingresá a
          <br />
          Wapsell.
        </h1>
        <p className="ws-intro__lead">Para comprar en tus negocios favoritos o atender el tuyo.</p>
      </div>

      {loaded?.google && (
        <>
          <a className="ws-button ws-button--outline" href="/auth/google">
            Continuar con Google
          </a>
          {googleError && (
            <p className="ws-alert" role="alert">
              No pudimos ingresar con Google. Probá de nuevo o ingresá con tu email.
            </p>
          )}
          <p className="ws-or" aria-hidden="true">
            o con tu email
          </p>
        </>
      )}

      <Form method="post" className="ws-form" noValidate={false}>
        <label className="ws-field">
          <span className="ws-field__label">Correo electrónico</span>
          <span className="ws-field__control">
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="lucia@ejemplo.com"
              defaultValue={actionData?.email}
            />
          </span>
        </label>

        <label className="ws-field">
          <span className="ws-field__label">Contraseña</span>
          <span className="ws-field__control">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
            />
            <button
              type="button"
              className="ws-field__toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
            >
              <img src="/brand/eye.svg" alt="" width={20} height={20} />
            </button>
          </span>
        </label>

        <div className="ws-preferences">
          <label className="ws-checkbox">
            <input type="checkbox" name="remember" value="1" defaultChecked />
            <span className="ws-checkbox__control" aria-hidden="true">
              <img src="/brand/check.svg" alt="" width={12} height={12} />
            </span>
            Recordarme
          </label>
          <Link className="ws-link" to={`/${lang}/auth/recuperar`}>
            Olvidé mi contraseña
          </Link>
        </div>

        {actionData?.error && (
          <p className="ws-alert" role="alert">
            {actionData.error}
          </p>
        )}

        <button type="submit" className="ws-button ws-button--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
          <img src="/brand/arrow-right.svg" alt="" width={16} height={16} />
        </button>
      </Form>

      <p className="ws-switch-account">
        ¿No tenés cuenta? <Link to="/registro">Registrate</Link>
      </p>
    </>
  );
}
