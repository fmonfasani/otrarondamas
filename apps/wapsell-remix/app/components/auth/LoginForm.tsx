import { useState } from 'react';
import { Form, Link, useActionData, useNavigation, useParams } from '@remix-run/react';

interface ActionData {
  error?: string;
  email?: string;
}

/** Figma "Ingresar a Wapsell" form content (145:13234 / 145:13272), wired to POST /auth/login. */
export function LoginForm() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const { lang = 'es' } = useParams();
  const [showPassword, setShowPassword] = useState(false);
  const isSubmitting = navigation.state === 'submitting';

  return (
    <>
      <div className="ws-intro">
        <p className="ws-intro__eyebrow">TU ESPACIO DE TRABAJO</p>
        <h1 className="ws-intro__title">
          Qué bueno
          <br />
          verte de nuevo.
        </h1>
        <p className="ws-intro__lead">Ingresa para continuar tus conversaciones.</p>
      </div>

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
        ¿Aún no tienes una cuenta? <Link to={`/${lang}/auth/register`}>Crear cuenta</Link>
      </p>
    </>
  );
}
