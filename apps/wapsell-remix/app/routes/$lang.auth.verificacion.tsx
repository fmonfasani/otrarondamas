import { useState } from 'react';
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Form, Link, useActionData, useNavigation, useParams } from '@remix-run/react';
import { AuthShell } from '~/components/auth/AuthShell';
import { commitApiSession, getSession, sessionFrom } from '~/services/auth.server';
import { ApiError } from '~/services/api.server';
import { deviceCookie, mfaPublicPost, sixDigits } from '~/services/mfa.server';

export const meta: MetaFunction = () => [{ title: 'Verificación · Wapsell' }];

/** OR-B4-044 — second step of the sign-in: the code from the authenticator app. */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  if (!session.get('mfaTicket') || session.get('mfaStep') !== 'verificar') {
    return redirect(`/${params.lang ?? 'es'}/auth/login`);
  }
  return json({ remember: session.get('mfaRemember') === true });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const lang = params.lang ?? 'es';
  const session = await getSession(request.headers.get('Cookie'));
  const ticket = session.get('mfaTicket');
  if (!ticket) return redirect(`/${lang}/auth/login`);
  const form = await request.formData();
  const recovery = String(form.get('recuperacion') ?? '').trim();
  const code = String(form.get('codigo') ?? '').replaceAll(/\s/g, '');
  const rememberDevice = form.get('recordar') === '1';
  if (!recovery && !sixDigits(code)) {
    return json({ error: 'Escribí los 6 números que muestra la app.' }, { status: 400 });
  }
  try {
    const data = await mfaPublicPost<Record<string, unknown>>('/verificar', {
      ticket,
      ...(recovery ? { codigoRecuperacion: recovery } : { codigo: code }),
      recordar: rememberDevice,
    });
    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      await commitApiSession(request, sessionFrom(data), session.get('mfaRemember') === true),
    );
    if (typeof data.dispositivo === 'string') {
      headers.append('Set-Cookie', await deviceCookie.serialize(data.dispositivo));
    }
    return redirect(session.get('mfaRedirect') ?? `/${lang}/dashboard`, { headers });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 && /venció/.test(error.message)) {
        return redirect(`/${lang}/auth/login`);
      }
      return json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export default function Verification() {
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== 'idle';
  const { lang = 'es' } = useParams();
  const [useRecovery, setUseRecovery] = useState(false);
  return (
    <AuthShell>
      <div className="ws-intro">
        <p className="ws-intro__eyebrow">VERIFICACIÓN EN DOS PASOS</p>
        <h1 className="ws-intro__title">Un paso más.</h1>
        <p className="ws-intro__lead">
          {useRecovery
            ? 'Escribí uno de tus códigos de recuperación. Cada uno sirve una sola vez.'
            : 'Abrí tu app de autenticación y escribí el código de 6 números de Wapsell.'}
        </p>
      </div>
      <Form method="post" className="ws-form">
        {useRecovery ? (
          <label className="ws-field">
            <span className="ws-field__label">Código de recuperación</span>
            <span className="ws-field__control">
              <input
                name="recuperacion"
                required
                autoComplete="off"
                autoCapitalize="none"
                placeholder="abcd-efgh"
                autoFocus
              />
            </span>
          </label>
        ) : (
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
                autoFocus
              />
            </span>
          </label>
        )}
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
          {busy ? 'Verificando…' : 'Verificar'}
        </button>
      </Form>
      <p className="ws-switch-account">
        <button type="button" className="ws-link" onClick={() => setUseRecovery((v) => !v)}>
          {useRecovery
            ? 'Usar el código de la app'
            : '¿No tenés el celular? Usá un código de recuperación'}
        </button>
      </p>
      <p className="ws-switch-account">
        <Link to={`/${lang}/auth/login`}>Volver a ingresar</Link>
      </p>
    </AuthShell>
  );
}
