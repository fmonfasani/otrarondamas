import { useState } from 'react';
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useParams } from '@remix-run/react';
import { AuthShell } from '~/components/auth/AuthShell';
import { INVALID_LINK, resetPassword } from '~/services/password.server';

export const meta: MetaFunction = () => [{ title: 'Nueva contraseña · Wapsell' }];

export const MIN_PASSWORD_LENGTH = 8;

export async function loader({ request }: LoaderFunctionArgs) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  return json({ token });
}

type ActionData = { done: true } | { done: false; error: string };

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (!token) return json<ActionData>({ done: false, error: INVALID_LINK }, { status: 400 });
  if (password.length < MIN_PASSWORD_LENGTH) {
    return json<ActionData>(
      { done: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` },
      { status: 400 },
    );
  }
  if (password !== confirm) {
    return json<ActionData>({ done: false, error: 'Las contraseñas no coinciden.' }, { status: 400 });
  }
  const result = await resetPassword(token, password);
  if ('error' in result) return json<ActionData>({ done: false, error: result.error }, { status: 400 });
  return json<ActionData>({ done: true });
}

function PasswordField({ name, label, autoFocus }: { name: string; label: string; autoFocus?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="ws-field">
      <span className="ws-field__label">{label}</span>
      <span className="ws-field__control">
        <input
          type={visible ? 'text' : 'password'}
          name={name}
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={72}
          autoComplete="new-password"
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="ws-field__toggle"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
        >
          <img src="/brand/eye.svg" alt="" width={20} height={20} />
        </button>
      </span>
    </label>
  );
}

export default function NewPasswordPage() {
  const { token } = useLoaderData<typeof loader>();
  const data = useActionData<typeof action>();
  const navigation = useNavigation();
  const { lang = 'es' } = useParams();
  const isSubmitting = navigation.state === 'submitting';
  const loginHref = `/${lang}/auth/login`;

  // Figma "Nueva contraseña · Éxito" (145:13451 / 145:13493).
  if (data?.done) {
    return (
      <AuthShell>
        <div className="ws-state-symbol ws-state-symbol--success" aria-hidden="true">
          <img src="/brand/circle-check.svg" alt="" width={28} height={28} />
        </div>
        <div className="ws-intro">
          <p className="ws-intro__eyebrow">TODO LISTO PARA VOLVER</p>
          <h1 className="ws-intro__title">
            Nueva contraseña.
            <br />
            Mismas conexiones.
          </h1>
          <p className="ws-intro__lead">
            Tu contraseña se actualizó correctamente. Ya puedes ingresar y retomar tus
            conversaciones.
          </p>
        </div>
        <div className="ws-success-note" role="status">
          <img src="/brand/shield-check.svg" alt="" width={20} height={20} />
          <span>Usa tu nueva contraseña la próxima vez que ingreses.</span>
        </div>
        <Link className="ws-button ws-button--primary" to={loginHref}>
          Volver a ingresar
          <img src="/brand/arrow-right.svg" alt="" width={16} height={16} />
        </Link>
        <p className="ws-security">Por seguridad, no compartas tu contraseña con otras personas.</p>
      </AuthShell>
    );
  }

  // Not in Figma: the form reached from the email link, built with the same components.
  return (
    <AuthShell>
      <div className="ws-state-symbol ws-state-symbol--secondary" aria-hidden="true">
        <img src="/brand/key-round.svg" alt="" width={28} height={28} />
      </div>
      <div className="ws-intro">
        <p className="ws-intro__eyebrow">CREA TU NUEVA CONTRASEÑA</p>
        <h1 className="ws-intro__title">
          Elige una
          <br />
          nueva contraseña.
        </h1>
        <p className="ws-intro__lead">
          Usa al menos {MIN_PASSWORD_LENGTH} caracteres. Después podrás ingresar con ella.
        </p>
      </div>
      {token ? (
        <Form method="post" className="ws-form ws-form--relaxed">
          <input type="hidden" name="token" value={token} />
          <PasswordField name="password" label="Nueva contraseña" autoFocus />
          <PasswordField name="confirm" label="Repite la contraseña" />
          {data && !data.done && (
            <p className="ws-alert" role="alert">
              {data.error}
            </p>
          )}
          <button type="submit" className="ws-button ws-button--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
            <img src="/brand/arrow-right.svg" alt="" width={16} height={16} />
          </button>
        </Form>
      ) : (
        <>
          <p className="ws-alert" role="alert">
            {INVALID_LINK}
          </p>
          <Link className="ws-button ws-button--primary" to={`/${lang}/auth/recuperar`}>
            Pedir un enlace nuevo
            <img src="/brand/arrow-right.svg" alt="" width={16} height={16} />
          </Link>
        </>
      )}
      <Link className="ws-return" to={loginHref}>
        ← Volver a ingresar
      </Link>
    </AuthShell>
  );
}
