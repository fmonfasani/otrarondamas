import { json, type ActionFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useNavigation, useParams } from '@remix-run/react';
import { AuthShell } from '~/components/auth/AuthShell';
import { requestPasswordReset } from '~/services/password.server';

export const meta: MetaFunction = () => [{ title: 'Recupera tu acceso · Wapsell' }];

type ActionData =
  | { step: 'request'; error: string; email: string }
  | { step: 'sent'; email: string; resent: boolean; error?: string };

/**
 * Figma "Recuperar contraseña" (145:13301 / 145:13346) and "Correo de recuperación
 * enviado" (145:13378 / 145:13421). Both steps live in this route so the email never
 * travels in the URL.
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '').trim();
  const resend = formData.get('intent') === 'resend';

  if (!email) {
    return json<ActionData>(
      { step: 'request', error: 'Escribe el correo de tu cuenta.', email },
      { status: 400 },
    );
  }
  const result = await requestPasswordReset(email);
  if ('error' in result) {
    return resend
      ? json<ActionData>({ step: 'sent', email, resent: false, error: result.error }, { status: 503 })
      : json<ActionData>({ step: 'request', error: result.error, email }, { status: 400 });
  }
  return json<ActionData>({ step: 'sent', email, resent: resend });
}

export default function RecoverPasswordPage() {
  const data = useActionData<typeof action>();
  const navigation = useNavigation();
  const { lang = 'es' } = useParams();
  const isSubmitting = navigation.state === 'submitting';
  const loginHref = `/${lang}/auth/login`;

  if (data?.step === 'sent') {
    return (
      <AuthShell>
        <div className="ws-state-symbol ws-state-symbol--success" aria-hidden="true">
          <img src="/brand/mail-check.svg" alt="" width={28} height={28} />
        </div>
        <div className="ws-intro">
          <p className="ws-intro__eyebrow">UN PASO MÁS CERCA</p>
          <h1 className="ws-intro__title">Revisa tu correo.</h1>
          <p className="ws-intro__lead">
            Si existe una cuenta asociada a este correo, recibirás un enlace para restablecer tu
            contraseña.
          </p>
        </div>
        <div className="ws-delivery">
          <p className="ws-delivery__label">CORREO INDICADO</p>
          <p className="ws-delivery__email">{data.email}</p>
          <p className="ws-delivery__hint">
            ¿No lo encuentras? Revisa la carpeta de spam o espera unos minutos.
          </p>
        </div>
        <Form method="post" className="ws-form">
          <input type="hidden" name="email" value={data.email} />
          <input type="hidden" name="intent" value="resend" />
          <button type="submit" className="ws-button ws-button--secondary" disabled={isSubmitting}>
            {isSubmitting ? 'Reenviando…' : 'Reenviar enlace'}
          </button>
        </Form>
        {data.resent && (
          <p className="ws-notice" role="status">
            Si corresponde, te enviamos un enlace nuevo.
          </p>
        )}
        {data.error && (
          <p className="ws-alert" role="alert">
            {data.error}
          </p>
        )}
        <p className="ws-change-email">
          ¿El correo no es correcto? <Link to={`/${lang}/auth/recuperar`}>Cambiar correo</Link>
        </p>
        <Link className="ws-return" to={loginHref}>
          ← Volver a ingresar
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="ws-state-symbol ws-state-symbol--secondary" aria-hidden="true">
        <img src="/brand/key-round.svg" alt="" width={28} height={28} />
      </div>
      <div className="ws-intro">
        <p className="ws-intro__eyebrow">VOLVAMOS A CONECTAR</p>
        <h1 className="ws-intro__title">
          Recupera
          <br />
          tu acceso.
        </h1>
        <p className="ws-intro__lead">
          Escribe el correo de tu cuenta. Te enviaremos un enlace para crear una nueva contraseña.
        </p>
      </div>
      <Form method="post" className="ws-form ws-form--relaxed">
        <label className="ws-field">
          <span className="ws-field__label">Correo electrónico</span>
          <span className="ws-field__control">
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="lucia@ejemplo.com"
              defaultValue={data?.email}
            />
          </span>
          <span className="ws-field__hint">Usa el correo con el que te registraste en Wapsell.</span>
        </label>
        {data?.error && (
          <p className="ws-alert" role="alert">
            {data.error}
          </p>
        )}
        <button type="submit" className="ws-button ws-button--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando…' : 'Enviar enlace de recuperación'}
          <img src="/brand/arrow-right.svg" alt="" width={16} height={16} />
        </button>
      </Form>
      <Link className="ws-return" to={loginHref}>
        ← Volver a ingresar
      </Link>
    </AuthShell>
  );
}
