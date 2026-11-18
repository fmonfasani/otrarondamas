import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { AuthShell } from '~/components/auth/AuthShell';
import { buyerApi, buyerSignOutCookie, getBuyer } from '~/services/buyer-session.server';

export const meta: MetaFunction = () => [{ title: 'Mi cuenta · Wapsell' }];

type Business = { nombre: string; slug: string; ciudad: string | null; provincia: string | null; rubro: string | null };

/**
 * ADR-IDN-001/008 — home of the universal buyer: the businesses on Wapsell to buy from. Entering
 * one opens that store with the buyer account (its own customer account, linked).
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const buyer = await getBuyer(request);
  if (!buyer) return redirect('/es/auth/login?redirectTo=%2Fcuenta');
  const me = await buyerApi<{ nombre: string; email: string }>('/me', { jwt: buyer.jwt });
  if (!me.ok) {
    return redirect('/es/auth/login', { headers: { 'Set-Cookie': await buyerSignOutCookie(request) } });
  }
  const list = await buyerApi<Business[]>('/negocios');
  const welcome = new URL(request.url).searchParams.get('bienvenida') === '1';
  return json({ buyer: me.data, businesses: list.ok ? list.data : null, welcome });
}

export async function action({ request }: ActionFunctionArgs) {
  return redirect('/es/auth/login', { headers: { 'Set-Cookie': await buyerSignOutCookie(request) } });
}

export default function BuyerHome() {
  const { buyer, businesses, welcome } = useLoaderData<typeof loader>();
  return (
    <AuthShell>
      <div className="ws-intro">
        <p className="ws-intro__eyebrow">{welcome ? 'CUENTA CONFIRMADA' : 'TU CUENTA'}</p>
        <h1 className="ws-intro__title">Hola, {buyer.nombre.split(' ')[0]}.</h1>
        <p className="ws-intro__lead">Elegí un negocio para comprar. Tu cuenta sirve en todos.</p>
      </div>
      {businesses === null ? (
        <p className="ws-alert" role="alert">
          No pudimos cargar los negocios. Probá en unos minutos.
        </p>
      ) : (
        <ul className="ws-businesses">
          {businesses.map((b) => (
            <li key={b.slug}>
              <a className="ws-business" href={`/tienda/${b.slug}/cuenta/comprador`}>
                <b>{b.nombre}</b>
                <span>{[b.rubro, b.ciudad, b.provincia].filter(Boolean).join(' · ') || 'Tienda en Wapsell'}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <Form method="post" className="ws-switch-account">
        {buyer.email} · <button type="submit" className="ws-link-button">Cerrar sesión</button>
      </Form>
    </AuthShell>
  );
}
