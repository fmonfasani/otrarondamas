import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import QRCode from 'qrcode';
import { commitSession, getCurrentUser, getSession, requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { RecoveryCodes } from '~/components/auth/RecoveryCodes';
import { formatDateTime } from '~/utils/format';
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

type MfaStatus = {
  activo: boolean;
  activadoEl: string | null;
  obligatorio: boolean;
  codigosRestantes: number;
};

/** Mi perfil — your own name, password and second factor (OR-B4-044); everyone in the team. */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const [user, mfa] = await Promise.all([
    getCurrentUser(token),
    settle(apiRequest<MfaStatus>(token, '/auth/mfa')),
  ]);
  if (!user) throw new Response('No pudimos cargar tu perfil.', { status: 503 });
  return json({
    mfa,
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
      if (nombre.length < 2)
        return json(
          { intent, ok: false, message: 'Tu nombre tiene que tener al menos 2 letras.' },
          { status: 400 },
        );
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
      return json({
        intent,
        ok: true,
        message: 'Listo, cambiamos tu contraseña. La próxima vez entrá con la nueva.',
      });
    }
    // OR-B4-044 — second factor.
    const code = String(form.get('codigo') ?? '').replaceAll(/\s/g, '');
    if (intent === 'mfa-start') {
      const { clave, enlace } = await apiRequest<{ clave: string; enlace: string }>(
        token,
        '/auth/mfa/iniciar',
        { method: 'POST' },
      );
      const qr = await QRCode.toDataURL(enlace, { margin: 1, width: 400 });
      return json({
        intent,
        ok: true,
        message: '',
        qr,
        clave: clave.replaceAll(/(.{4})/g, '$1 ').trim(),
      });
    }
    if (intent === 'mfa-confirm') {
      const data = await apiRequest<{ accessToken: string; codigosRecuperacion: string[] }>(
        token,
        '/auth/mfa/confirmar',
        {
          method: 'POST',
          body: JSON.stringify({ codigo: code }),
        },
      );
      // The new session already passed the second factor (the old one stops working).
      const session = await getSession(request.headers.get('Cookie'));
      session.set('jwt', data.accessToken);
      return json(
        {
          intent,
          ok: true,
          message: 'Listo, la verificación en dos pasos quedó activa.',
          codes: data.codigosRecuperacion,
        },
        { headers: { 'Set-Cookie': await commitSession(session) } },
      );
    }
    if (intent === 'mfa-codes') {
      const data = await apiRequest<{ codigosRecuperacion: string[] }>(token, '/auth/mfa/codigos', {
        method: 'POST',
        body: JSON.stringify({ codigo: code }),
      });
      return json({
        intent,
        ok: true,
        message: 'Estos son tus códigos nuevos; los anteriores ya no sirven.',
        codes: data.codigosRecuperacion,
      });
    }
    if (intent === 'mfa-off') {
      await apiRequest(token, '/auth/mfa/desactivar', {
        method: 'POST',
        body: JSON.stringify({ codigo: code }),
      });
      return json({ intent, ok: true, message: 'Desactivaste la verificación en dos pasos.' });
    }
    return json({ intent, ok: false, message: 'Acción desconocida.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError)
      return json({ intent, ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}

export default function Perfil() {
  const me = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== 'idle';
  const notice = (intent: string) =>
    result?.intent === intent ? (
      <p className={result.ok ? 'ws-notice' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>
        {result.message}
      </p>
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
          <h2 id="name-title" className="ws-card__title">
            Tus datos
          </h2>
          <Form method="post" className="ws-pos__checkout">
            <input type="hidden" name="intent" value="profile" />
            <label className="ws-field">
              <span className="ws-field__label">Nombre y apellido</span>
              <span className="ws-field__control">
                <input
                  name="nombre"
                  defaultValue={me.nombre}
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                />
              </span>
            </label>
            <label className="ws-field">
              <span className="ws-field__label">Email</span>
              <span className="ws-field__control">
                <input value={me.email} readOnly aria-readonly="true" />
              </span>
              <small className="ws-meta">
                Con este email entrás. Para cambiarlo, pedíselo al Owner.
              </small>
            </label>
            {notice('profile')}
            <button
              className="ws-button ws-button--primary ws-button--auto"
              type="submit"
              disabled={busy}
            >
              Guardar
            </button>
          </Form>
        </section>
        <section className="ws-card" aria-labelledby="password-title">
          <h2 id="password-title" className="ws-card__title">
            Contraseña
          </h2>
          {me.google ? (
            <p className="ws-meta">
              Entrás con tu cuenta de Google, así que no tenés contraseña de Wapsell.
            </p>
          ) : (
            <Form method="post" className="ws-pos__checkout">
              <input type="hidden" name="intent" value="password" />
              <PasswordField
                name="actual"
                label="Contraseña actual"
                autoComplete="current-password"
              />
              <PasswordField name="nueva" label="Contraseña nueva (mínimo 8 caracteres)" />
              <PasswordField name="repetida" label="Repetí la contraseña nueva" />
              {notice('password')}
              <button
                className="ws-button ws-button--primary ws-button--auto"
                type="submit"
                disabled={busy}
              >
                Cambiar contraseña
              </button>
            </Form>
          )}
        </section>
        <MfaCard status={me.mfa} result={result} busy={busy} notice={notice} />
      </div>
    </div>
  );
}

type Result =
  | { intent: string; ok: boolean; message: string; qr?: string; clave?: string; codes?: string[] }
  | undefined;

function CodeForm({
  intent,
  label,
  busy,
  danger,
}: Readonly<{ intent: string; label: string; busy: boolean; danger?: boolean }>) {
  return (
    <Form method="post" className="ws-pos__checkout">
      <input type="hidden" name="intent" value={intent} />
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
      <button
        className={`ws-button ${danger ? 'ws-button--outline' : 'ws-button--primary'} ws-button--auto`}
        type="submit"
        disabled={busy}
      >
        {label}
      </button>
    </Form>
  );
}

/** OR-B4-044 — Verificación en dos pasos. */
function MfaCard({
  status,
  result,
  busy,
  notice,
}: Readonly<{
  status: MfaStatus | null;
  result: Result;
  busy: boolean;
  notice: (intent: string) => JSX.Element | null;
}>) {
  const r = result?.intent?.startsWith('mfa-') ? result : undefined;
  return (
    <section className="ws-card" aria-labelledby="mfa-title">
      <h2 id="mfa-title" className="ws-card__title">
        Verificación en dos pasos
      </h2>
      {!status ? (
        <p className="ws-meta">No pudimos ver el estado ahora.</p>
      ) : r?.codes ? (
        <>
          {notice(r.intent)}
          <RecoveryCodes codes={r.codes} />
        </>
      ) : r?.qr ? (
        <>
          <p className="ws-meta">
            Escaneá el código con tu app de autenticación (Google Authenticator, Microsoft
            Authenticator o Authy) y escribí el código que aparece.
          </p>
          <img
            className="ws-mfa-qr"
            src={r.qr}
            alt="Código QR para la app de autenticación"
            width={200}
            height={200}
          />
          <code className="ws-mfa-key">{r.clave}</code>
          <CodeForm intent="mfa-confirm" label="Activar" busy={busy} />
        </>
      ) : status.activo ? (
        <>
          <p className="ws-meta">
            Activa desde {status.activadoEl ? formatDateTime(status.activadoEl) : '—'}. Te quedan{' '}
            {status.codigosRestantes} códigos de recuperación.
            {status.obligatorio ? ' Para tu rol es obligatoria.' : ''}
          </p>
          {notice('mfa-codes')}
          {notice('mfa-off')}
          <details>
            <summary>Generar códigos de recuperación nuevos</summary>
            <CodeForm intent="mfa-codes" label="Generar códigos nuevos" busy={busy} />
          </details>
          {!status.obligatorio && (
            <details>
              <summary>Desactivar</summary>
              <CodeForm intent="mfa-off" label="Desactivar" busy={busy} danger />
            </details>
          )}
        </>
      ) : (
        <>
          <p className="ws-meta">
            Al ingresar, además de la contraseña, te pide un código de una app en tu celular. Es
            opcional para tu rol.
          </p>
          {notice('mfa-off')}
          {notice('mfa-start')}
          {notice('mfa-confirm')}
          <Form method="post">
            <input type="hidden" name="intent" value="mfa-start" />
            <button
              className="ws-button ws-button--primary ws-button--auto"
              type="submit"
              disabled={busy}
            >
              Activar
            </button>
          </Form>
        </>
      )}
    </section>
  );
}
