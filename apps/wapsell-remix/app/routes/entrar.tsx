import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { Briefcase, ShoppingBag } from 'lucide-react';
import { AuthShell } from '~/components/auth/AuthShell';
import { ApiError, apiRequest } from '~/services/api.server';
import { getCurrentUser, requireAuth } from '~/services/auth.server';
import { buyerSignInCookie, type BuyerLogin } from '~/services/buyer-session.server';
import { buyerHome } from '~/utils/entrada';

export const meta: MetaFunction = () => [{ title: '¿Cómo querés entrar? · Wapsell' }];

type LinkStatus =
  | { estado: 'unida'; email: string }
  | { estado: 'por-confirmar'; email: string; tieneClave: boolean }
  | { estado: 'sin-cuenta'; email: string }
  | { estado: 'ocupada'; email: string };

/** The last choice, so the next login goes straight there (a preference, not a credential). */
export const CHOICE_COOKIE = 'wapsell_entrada';
const rememberChoice = (value: 'cliente' | 'negocio') =>
  `${CHOICE_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax; Secure; HttpOnly`;


/**
 * Login por rol (Owner, 2026-11-26) — after signing in with the work account: «Comprar en
 * Wapsell» or «Trabajar en <negocio>». The first time, the customer account of the same email is
 * joined (its password, one click if there is none, or an emailed link). The work key opens both;
 * the customer key alone never opens the panel.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const url = new URL(request.url);
  const [me, link] = await Promise.all([
    getCurrentUser(token),
    apiRequest<LinkStatus>(token, '/auth/comprador/vinculo').catch(() => null),
  ]);
  const volver = buyerHome(url.searchParams.get('volver'));
  // «Comprar en Wapsell» from the panel, already joined: straight to the stores.
  if (url.searchParams.get('como') === 'cliente' && link?.estado === 'unida') {
    const login = await apiRequest<BuyerLogin>(token, '/auth/comprador/vinculo/entrar', { method: 'POST' });
    throw redirect(volver, { headers: { 'Set-Cookie': await buyerSignInCookie(request, login) } });
  }
  return json({
    nombre: String(me?.nombre ?? ''),
    negocio: String(me?.empresaNombre ?? 'tu negocio'),
    link,
    volver,
    enviado: url.searchParams.get('enviado') === '1',
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const volver = buyerHome(String(form.get('volver') ?? ''));
  if (intent === 'negocio') return redirect('/panel', { headers: { 'Set-Cookie': rememberChoice('negocio') } });
  try {
    if (intent === 'mail') {
      await apiRequest(token, '/auth/comprador/vinculo/mail', { method: 'POST' });
      return redirect(`/entrar?enviado=1&volver=${encodeURIComponent(volver)}`);
    }
    const path =
      intent === 'clave' ? '/auth/comprador/vinculo/clave' : intent === 'crear' ? '/auth/comprador/vinculo/crear' : '/auth/comprador/vinculo/entrar';
    const body = intent === 'clave' ? JSON.stringify({ password: String(form.get('password') ?? '') }) : undefined;
    const login = await apiRequest<BuyerLogin>(token, path, { method: 'POST', body });
    const headers = new Headers({ 'Set-Cookie': await buyerSignInCookie(request, login) });
    headers.append('Set-Cookie', rememberChoice('cliente'));
    return redirect(volver, { headers });
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, { status: error.status });
    throw error;
  }
}

export default function Entrar() {
  const { nombre, negocio, link, volver, enviado } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== 'idle';
  return (
    <AuthShell>
      <div className="ws-entrar">
        <h1>¿Cómo querés entrar{nombre ? `, ${nombre.split(' ')[0]}` : ''}?</h1>
        {result && 'error' in result ? (
          <p className="ws-alert" role="alert">
            {result.error}
          </p>
        ) : null}

        <section className="ws-entrar__card" aria-labelledby="comprar-title">
          <span className="ws-entrar__icon ws-entrar__icon--cliente" aria-hidden="true">
            <ShoppingBag size={22} />
          </span>
          <div>
            <h2 id="comprar-title">Comprar en Wapsell</h2>
            <p>Las tiendas de Wapsell, tus pedidos y el chat con cada negocio.</p>
            {!link ? (
              <p className="ws-meta">No pudimos revisar tu cuenta de cliente. Probá en un rato.</p>
            ) : link.estado === 'unida' ? (
              <Form method="post">
                <input type="hidden" name="intent" value="comprar" />
                <input type="hidden" name="volver" value={volver} />
                <button className="ws-button ws-button--primary" disabled={busy}>
                  Entrar como cliente
                </button>
              </Form>
            ) : link.estado === 'sin-cuenta' ? (
              <Form method="post">
                <input type="hidden" name="intent" value="crear" />
                <input type="hidden" name="volver" value={volver} />
                <button className="ws-button ws-button--primary" disabled={busy}>
                  Crear mi cuenta de cliente
                </button>
                <small className="ws-meta">Con tu mismo mail ({link.email}). Después entrás con esta misma clave.</small>
              </Form>
            ) : link.estado === 'por-confirmar' ? (
              <div className="ws-entrar__confirm">
                <p className="ws-meta">
                  Ya tenés una cuenta de cliente con {link.email}. Confirmala una sola vez y quedan unidas.
                </p>
                {link.tieneClave ? (
                  <Form method="post" className="ws-entrar__row">
                    <input type="hidden" name="intent" value="clave" />
                    <input type="hidden" name="volver" value={volver} />
                    <label className="sr-only" htmlFor="clave-cliente">
                      Clave de tu cuenta de cliente
                    </label>
                    <input id="clave-cliente" name="password" type="password" required autoComplete="current-password" placeholder="Clave de tu cuenta de cliente" />
                    <button className="ws-button ws-button--primary" disabled={busy}>
                      Unir
                    </button>
                  </Form>
                ) : null}
                {enviado ? (
                  <p className="ws-notice" role="status">
                    Te mandamos un mail a {link.email}. Abrí el enlace desde este mismo navegador.
                  </p>
                ) : (
                  <Form method="post">
                    <input type="hidden" name="intent" value="mail" />
                    <input type="hidden" name="volver" value={volver} />
                    <button className="ws-link" disabled={busy}>
                      {link.tieneClave ? '¿No te acordás? Mandame un enlace por mail' : 'Mandame un enlace por mail para unirlas'}
                    </button>
                  </Form>
                )}
              </div>
            ) : (
              <p className="ws-meta">Ese mail ya está unido a otra cuenta de trabajo. Escribinos para revisarlo.</p>
            )}
          </div>
        </section>

        <section className="ws-entrar__card" aria-labelledby="trabajar-title">
          <span className="ws-entrar__icon" aria-hidden="true">
            <Briefcase size={22} />
          </span>
          <div>
            <h2 id="trabajar-title">Trabajar en {negocio}</h2>
            <p>El panel: pedidos, ventas, caja y mensajes.</p>
            <Form method="post">
              <input type="hidden" name="intent" value="negocio" />
              <button className="ws-button ws-button--outline" disabled={busy}>
                Entrar al panel
              </button>
            </Form>
          </div>
        </section>
        <Form method="post" action="/logout" className="ws-entrar__foot">
          <button className="ws-link">Salir</button>
        </Form>
      </div>
    </AuthShell>
  );
}
