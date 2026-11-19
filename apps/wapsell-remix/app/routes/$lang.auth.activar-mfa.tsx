import { useState } from 'react';
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
  type ShouldRevalidateFunction,
} from '@remix-run/react';
import QRCode from 'qrcode';
import { AuthShell } from '~/components/auth/AuthShell';
import { RecoveryCodes } from '~/components/auth/RecoveryCodes';
import { commitApiSession, commitSession, getSession, sessionFrom } from '~/services/auth.server';
import { ApiError } from '~/services/api.server';
import { deviceCookie, mfaPublicPost, sixDigits } from '~/services/mfa.server';

export const meta: MetaFunction = () => [{ title: 'Activar verificación · Wapsell' }];

type Enrolment = { clave: string; enlace: string };

/**
 * Activating opens the session and ends the sign-in ticket. Reloading this page's data after that
 * finds no ticket and sends the person to sign in, and from there to the panel, before anyone can
 * save the recovery codes. The codes stay on screen until «Ya los guardé, entrar».
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  actionResult,
  defaultShouldRevalidate,
}) =>
  actionResult && typeof actionResult === 'object' && 'codes' in actionResult
    ? false
    : defaultShouldRevalidate;

/**
 * OR-B4-044 — first sign-in of an Owner or Admin: enrol the authenticator app. The secret is
 * asked once and kept in the server-side session, so reloading shows the same QR.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const lang = params.lang ?? 'es';
  const session = await getSession(request.headers.get('Cookie'));
  const ticket = session.get('mfaTicket');
  if (!ticket || session.get('mfaStep') !== 'activar') return redirect(`/${lang}/auth/login`);
  let enrolment = session.get('mfaEnroll') as Enrolment | undefined;
  const headers = new Headers();
  if (!enrolment) {
    try {
      enrolment = await mfaPublicPost<Enrolment>('/activar/iniciar', { ticket });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return redirect(`/${lang}/auth/login`);
      throw error;
    }
    session.set('mfaEnroll', enrolment);
    headers.append('Set-Cookie', await commitSession(session));
  }
  const qr = await QRCode.toDataURL(enrolment.enlace, { margin: 1, width: 400 });
  return json({ qr, clave: enrolment.clave.replaceAll(/(.{4})/g, '$1 ').trim() }, { headers });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const lang = params.lang ?? 'es';
  const session = await getSession(request.headers.get('Cookie'));
  const ticket = session.get('mfaTicket');
  if (!ticket) return redirect(`/${lang}/auth/login`);
  const form = await request.formData();
  const code = String(form.get('codigo') ?? '').replaceAll(/\s/g, '');
  if (!sixDigits(code)) {
    return json({ error: 'Escribí los 6 números que muestra la app.' }, { status: 400 });
  }
  try {
    const data = await mfaPublicPost<Record<string, unknown>>('/activar/confirmar', {
      ticket,
      codigo: code,
      recordar: form.get('recordar') === '1',
    });
    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      await commitApiSession(request, sessionFrom(data), session.get('mfaRemember') === true),
    );
    if (typeof data.dispositivo === 'string') {
      headers.append('Set-Cookie', await deviceCookie.serialize(data.dispositivo));
    }
    return json(
      {
        codes: data.codigosRecuperacion as string[],
        next: (session.get('mfaRedirect') as string | undefined) ?? `/panel`,
      },
      { headers },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 && /venció/.test(error.message))
        return redirect(`/${lang}/auth/login`);
      return json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export default function EnrolMfa() {
  const { qr, clave } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== 'idle';
  const { lang = 'es' } = useParams();
  const [showKey, setShowKey] = useState(false);

  if (result && 'codes' in result) {
    return (
      <AuthShell>
        <div className="ws-intro">
          <p className="ws-intro__eyebrow">VERIFICACIÓN ACTIVADA</p>
          <h1 className="ws-intro__title">Guardá tus códigos.</h1>
          <p className="ws-intro__lead">
            Si perdés el celular, cada código te deja entrar una vez. No los vas a volver a ver.
          </p>
        </div>
        <RecoveryCodes codes={result.codes} />
        <Link className="ws-button ws-button--primary" to={result.next}>
          Ya los guardé, entrar
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="ws-intro">
        <p className="ws-intro__eyebrow">VERIFICACIÓN EN DOS PASOS</p>
        <h1 className="ws-intro__title">Protegé tu cuenta.</h1>
        <p className="ws-intro__lead">
          Como Owner o administrador, tu cuenta necesita un segundo paso al ingresar. Se configura
          una sola vez.
        </p>
      </div>
      <ol className="ws-mfa-steps">
        <li>
          Instalá una app de autenticación en tu celular: <b>Google Authenticator</b>,{' '}
          <b>Microsoft Authenticator</b> o <b>Authy</b>.
        </li>
        <li>
          En la app tocá <b>+</b> y escaneá este código.
          <img
            className="ws-mfa-qr"
            src={qr}
            alt="Código QR para la app de autenticación"
            width={200}
            height={200}
          />
          <button type="button" className="ws-link" onClick={() => setShowKey((v) => !v)}>
            {showKey ? 'Ocultar la clave' : '¿No podés escanear? Escribí la clave'}
          </button>
          {showKey && <code className="ws-mfa-key">{clave}</code>}
        </li>
        <li>Escribí el código de 6 números que aparece en la app.</li>
      </ol>
      <Form method="post" className="ws-form">
        <label className="ws-field">
          <span className="ws-field__label">Código de la app</span>
          <span className="ws-field__control">
            <input
              name="codigo"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              placeholder="123 456"
            />
          </span>
        </label>
        <div className="ws-preferences">
          <label className="ws-checkbox">
            <input type="checkbox" name="recordar" value="1" />
            <span className="ws-checkbox__control" aria-hidden="true">
              <img src="/brand/check.svg" alt="" width={12} height={12} />
            </span>
            Recordar este dispositivo 30 días
          </label>
        </div>
        {result && 'error' in result && (
          <p className="ws-alert" role="alert">
            {result.error}
          </p>
        )}
        <button type="submit" className="ws-button ws-button--primary" disabled={busy}>
          {busy ? 'Activando…' : 'Activar y entrar'}
        </button>
      </Form>
      <p className="ws-switch-account">
        <Link to={`/${lang}/auth/login`}>Volver a ingresar</Link>
      </p>
    </AuthShell>
  );
}
