import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { useState } from 'react';
import { AuthShell } from '~/components/auth/AuthShell';
import { commitSession, getSession } from '~/services/auth.server';
import { ApiError, getApiBaseUrl } from '~/services/api.server';
import { authPublicPost } from '~/services/mfa.server';

export const meta: MetaFunction = () => [{ title: 'Vendé en Wapsell' }];

/**
 * ADR-IDN-008 — «Vendé en Wapsell»: a Business with you as its Owner, in two short steps.
 *   1. You: nombre, apellido and email — or Google, which skips this step.
 *   2. Your business: name, CUIT (optional, ADR-IDN-004), address and rubro → subrubro (ADR-IDN-009).
 * With email a welcome email brings the link to create the password; with Google the next step
 * is MFA, then the panel with its first steps.
 */

type Catalog = { rubros: Record<string, string[]>; provincias: string[] };
type Persona = { nombre: string; apellido: string; email: string };
type Google = { ticket: string; nombre: string; email: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUSINESS_FIELDS = ['nombreNegocio', 'cuit', 'direccion', 'ciudad', 'provincia', 'codigoPostal', 'rubro', 'subrubro'] as const;
type BusinessValues = Partial<Record<(typeof BUSINESS_FIELDS)[number], string>>;

const post = <T,>(path: string, body: unknown) => authPublicPost<T>(`/registro${path}`, body);

async function catalog(): Promise<Catalog> {
  const response = await fetch(`${getApiBaseUrl()}/auth/registro/catalogo`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Response('No pudimos cargar el formulario. Probá en unos minutos.', { status: 503 });
  return (await response.json()) as Catalog;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  if (session.get('jwt')) return redirect('/panel');
  const url = new URL(request.url);
  const ticket = url.searchParams.get('google');
  let google: Google | null = null;
  if (ticket) {
    try {
      google = { ticket, ...(await post<{ nombre: string; email: string }>('/google/datos', { ticket })) };
    } catch {
      return redirect('/vender?error=google');
    }
  }
  return json({
    catalog: await catalog(),
    google,
    googleEnabled: process.env.GOOGLE_LOGIN_ENABLED === '1',
    googleError: url.searchParams.get('error') === 'google',
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const field = (k: string) => String(form.get(k) ?? '').trim();
  const persona: Persona = { nombre: field('nombre'), apellido: field('apellido'), email: field('email').toLowerCase() };

  if (field('intent') === 'paso1') {
    if (persona.nombre.length < 2) return json({ step: 1, error: 'Escribí tu nombre.', persona }, { status: 400 });
    if (persona.apellido.length < 2) return json({ step: 1, error: 'Escribí tu apellido.', persona }, { status: 400 });
    if (!EMAIL.test(persona.email)) return json({ step: 1, error: 'Revisá el email.', persona }, { status: 400 });
    return json({ step: 2, persona });
  }

  const values = Object.fromEntries(BUSINESS_FIELDS.map((k) => [k, field(k)])) as BusinessValues;
  const fail = (error: string, status = 400) => json({ step: 2, error, persona, values }, { status });
  if ((values.nombreNegocio ?? '').length < 2) return fail('Escribí el nombre de tu negocio.');
  const profile = { ...values, cuit: values.cuit || undefined };

  try {
    const ticket = field('ticket');
    if (ticket) {
      const done = await post<{ mfa: 'activar'; ticket: string }>('/google', { ticket, ...profile });
      const session = await getSession(request.headers.get('Cookie'));
      session.set('mfaTicket', done.ticket);
      session.set('mfaStep', 'activar');
      session.set('mfaRemember', true);
      session.set('mfaRedirect', '/panel?bienvenida=1');
      session.unset('mfaEnroll');
      return redirect('/es/auth/activar-mfa', { headers: { 'Set-Cookie': await commitSession(session) } });
    }
    if (persona.nombre.length < 2 || persona.apellido.length < 2 || !EMAIL.test(persona.email)) {
      return json({ step: 1, error: 'Revisá tus datos.', persona }, { status: 400 });
    }
    const done = await post<{ negocio: string; email: string; mailEnviado: boolean }>('', { ...persona, ...profile });
    return json({ created: done });
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message, error.status);
    throw error;
  }
}

function Field({
  label,
  name,
  defaultValue,
  required = true,
  type = 'text',
  autoComplete,
  placeholder,
  inputMode,
  hint,
}: Readonly<{
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  inputMode?: 'numeric' | 'text' | 'email';
  hint?: string;
}>) {
  return (
    <label className="ws-field">
      <span className="ws-field__label">{label}</span>
      <span className="ws-field__control">
        <input
          type={type}
          name={name}
          required={required}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          placeholder={placeholder}
          inputMode={inputMode}
        />
      </span>
      {hint ? <span className="ws-field__hint">{hint}</span> : null}
    </label>
  );
}

function Select({
  label,
  name,
  options,
  value,
  onChange,
  disabled,
}: Readonly<{
  label: string;
  name: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}>) {
  return (
    <label className="ws-field">
      <span className="ws-field__label">{label}</span>
      <span className="ws-field__control">
        <select name={name} required value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
          <option value="">Elegí…</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function Steps({ step }: Readonly<{ step: 1 | 2 }>) {
  return (
    <div className="ws-steps" aria-label={`Paso ${step} de 2`}>
      <span className="ws-steps__bar ws-steps__bar--on" />
      <span className={`ws-steps__bar${step === 2 ? ' ws-steps__bar--on' : ''}`} />
    </div>
  );
}

export default function SellPage() {
  const { catalog: cat, google, googleEnabled, googleError } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== 'idle';

  if (result && 'created' in result) {
    return (
      <AuthShell>
        <div className="ws-intro">
          <p className="ws-intro__eyebrow">NEGOCIO CREADO</p>
          <h1 className="ws-intro__title">Revisá tu email.</h1>
          <p className="ws-intro__lead">
            Creamos <b>{result.created.negocio}</b>. Te mandamos a <b>{result.created.email}</b> un enlace para crear tu
            contraseña (vale 7 días). Si no lo ves, mirá en Spam.
          </p>
        </div>
        {!result.created.mailEnviado && (
          <p className="ws-alert" role="alert">
            No pudimos enviar el email ahora. Probá con «Olvidé mi contraseña» desde el ingreso.
          </p>
        )}
        <Link className="ws-button ws-button--primary" to="/es/auth/login">
          Ir a ingresar
        </Link>
      </AuthShell>
    );
  }

  const step: 1 | 2 = google ? 2 : result && 'step' in result && result.step === 2 ? 2 : 1;
  const persona = (result && 'persona' in result ? result.persona : null) as Persona | null;
  const values = (result && 'values' in result ? result.values : {}) as BusinessValues;
  const error =
    result && 'error' in result
      ? String(result.error)
      : googleError
        ? 'El registro con Google venció o no se pudo completar. Probá de nuevo.'
        : null;

  return (
    <AuthShell>
      {step === 1 ? (
        <>
          <div className="ws-intro">
            <p className="ws-intro__eyebrow">PASO 1 DE 2 · VOS</p>
            <h1 className="ws-intro__title">Contanos quién sos.</h1>
            <p className="ws-intro__lead">Vas a ser el Owner del negocio. Después sumás a tu equipo.</p>
          </div>
          <Steps step={1} />
          {googleEnabled && (
            <>
              <a className="ws-button ws-button--outline" href="/auth/google">
                Continuar con Google
              </a>
              <p className="ws-or" aria-hidden="true">
                o completá tus datos
              </p>
            </>
          )}
          <Form method="post" className="ws-form">
            <input type="hidden" name="intent" value="paso1" />
            <div className="ws-row">
              <Field label="Nombre" name="nombre" autoComplete="given-name" placeholder="Lucía" defaultValue={persona?.nombre} />
              <Field label="Apellido" name="apellido" autoComplete="family-name" placeholder="Pérez" defaultValue={persona?.apellido} />
            </div>
            <Field
              label="Correo electrónico"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="lucia@ejemplo.com"
              defaultValue={persona?.email}
            />
            {error && (
              <p className="ws-alert" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="ws-button ws-button--primary" disabled={busy}>
              Siguiente
              <img src="/brand/arrow-right.svg" alt="" width={16} height={16} />
            </button>
          </Form>
        </>
      ) : (
        <BusinessStep
          catalog={cat}
          google={google}
          persona={persona}
          values={values}
          error={error}
          busy={busy}
        />
      )}
      <p className="ws-switch-account">
        ¿Ya tenés una cuenta? <Link to="/es/auth/login">Ingresar</Link>
      </p>
    </AuthShell>
  );
}

function BusinessStep({
  catalog: cat,
  google,
  persona,
  values,
  error,
  busy,
}: Readonly<{
  catalog: Catalog;
  google: Google | null;
  persona: Persona | null;
  values: BusinessValues;
  error: string | null;
  busy: boolean;
}>) {
  const [rubro, setRubro] = useState(values.rubro ?? '');
  const [subrubro, setSubrubro] = useState(values.subrubro ?? '');
  const [provincia, setProvincia] = useState(values.provincia ?? '');
  const subrubros = cat.rubros[rubro] ?? [];

  return (
    <>
      <div className="ws-intro">
        <p className="ws-intro__eyebrow">PASO 2 DE 2 · TU NEGOCIO</p>
        <h1 className="ws-intro__title">Contanos de tu negocio.</h1>
        <p className="ws-intro__lead">
          {google ? `Vas a entrar con ${google.email}. ` : ''}
          Podés empezar sin CUIT: lo cargás cuando quieras para facturar y cobrar sin topes.
        </p>
      </div>
      <Steps step={2} />
      <Form method="post" className="ws-form">
        <input type="hidden" name="intent" value="crear" />
        {google ? (
          <input type="hidden" name="ticket" value={google.ticket} />
        ) : (
          <>
            <input type="hidden" name="nombre" value={persona?.nombre ?? ''} />
            <input type="hidden" name="apellido" value={persona?.apellido ?? ''} />
            <input type="hidden" name="email" value={persona?.email ?? ''} />
          </>
        )}
        <Field label="Nombre del negocio" name="nombreNegocio" autoComplete="organization" placeholder="Mi almacén" defaultValue={values.nombreNegocio} />
        <Field
          label="CUIT (opcional)"
          name="cuit"
          required={false}
          inputMode="numeric"
          placeholder="XX-XXXXXXXX-X"
          defaultValue={values.cuit}
          hint="Sin CUIT empezás con catálogo, chat y pedidos, con topes y sin factura."
        />
        <div className="ws-row">
          <Select
            label="Rubro"
            name="rubro"
            options={Object.keys(cat.rubros)}
            value={rubro}
            onChange={(v) => {
              setRubro(v);
              setSubrubro('');
            }}
          />
          <Select label="Subrubro" name="subrubro" options={subrubros} value={subrubro} onChange={setSubrubro} disabled={!rubro} />
        </div>
        <Field label="Dirección" name="direccion" autoComplete="street-address" placeholder="Av. Rivadavia 4500" defaultValue={values.direccion} />
        <div className="ws-row">
          <Field label="Ciudad" name="ciudad" autoComplete="address-level2" placeholder="Rosario" defaultValue={values.ciudad} />
          <Field label="Código postal" name="codigoPostal" autoComplete="postal-code" placeholder="2000" defaultValue={values.codigoPostal} />
        </div>
        <Select label="Provincia" name="provincia" options={cat.provincias} value={provincia} onChange={setProvincia} />
        {error && (
          <p className="ws-alert" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="ws-button ws-button--primary" disabled={busy}>
          {busy ? 'Creando…' : 'Crear mi negocio'}
          <img src="/brand/arrow-right.svg" alt="" width={16} height={16} />
        </button>
      </Form>
    </>
  );
}
