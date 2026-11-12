import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useParams, useRouteLoaderData, useSearchParams } from '@remix-run/react';
import { MessagesSquare, Plus, Search, X } from 'lucide-react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { formatDateTime, formatMoney, orderState } from '~/utils/format';
import type { Conversation } from '~/utils/messaging';
import type { loader as businessLoader } from './_business';

export const meta: MetaFunction = () => [{ title: 'Clientes · Wapsell' }];

export interface Customer {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
  nivel?: 'NUEVO' | 'FRECUENTE' | 'VIP';
  createdAt: string;
}
interface Order {
  id: string;
  clienteId: string;
  estado: string;
  total: string;
  createdAt: string;
}

const INPUT_TYPES: Record<string, string> = { email: 'email', telefono: 'tel' };

/** Result of the last action, or the "saved" flag left by a redirect. */
function Notice({ result, saved }: { result?: { ok: boolean; message: string }; saved: boolean }) {
  if (result && !result.ok) return <p className="ws-alert" role="alert">{result.message}</p>;
  if (result) return <output className="ws-success-note">{result.message}</output>;
  if (saved) return <output className="ws-success-note">Cliente guardado.</output>;
  return null;
}

export const LEVELS: Record<string, { label: string; tone: string }> = {
  NUEVO: { label: 'Nuevo', tone: 'muted' },
  FRECUENTE: { label: 'Frecuente', tone: 'secondary' },
  VIP: { label: 'VIP', tone: 'success' },
};

/** Mirrors the matrix: Owner, Admin and Vendedor manage customers; the API decides. */
export function customerAbilities(role: string) {
  return { manage: ['OWNER', 'ADMIN', 'VENDEDOR', 'ASISTENTE_LOCAL'].includes(role) };
}

/** Light shape check (one "@", a dot after it, no spaces); the API validates for real. */
export function looksLikeEmail(value: string): boolean {
  const at = value.indexOf('@');
  return at > 0 && value.indexOf('@', at + 1) === -1 && value.lastIndexOf('.') > at + 1 && !value.endsWith('.') && !/\s/.test(value);
}

/** Body for POST/PATCH /clientes: trimmed, empty optional fields left out (or cleared on edit). */
export function customerBody(form: FormData, editing: boolean): { ok: true; body: Record<string, string> } | { ok: false; message: string } {
  const text = (key: string) => {
    const raw = form.get(key);
    return typeof raw === 'string' ? raw.trim() : '';
  };
  if (!text('nombre')) return { ok: false, message: 'El nombre es obligatorio.' };
  const email = text('email');
  if (email && !looksLikeEmail(email)) return { ok: false, message: 'El email no es válido.' };
  const body: Record<string, string> = { nombre: text('nombre') };
  for (const key of ['email', 'telefono', 'direccion']) {
    // The API validates `email` as an email, so an empty one is never sent.
    if (text(key)) body[key] = text(key);
    else if (editing && key !== 'email') body[key] = '';
  }
  return { ok: true, body };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const selectedId = url.searchParams.get('c');
  const [customers, selected, orders] = await Promise.all([
    settle(apiRequest<Customer[]>(token, query ? `/clientes?search=${encodeURIComponent(query)}` : '/clientes')),
    selectedId ? settle(apiRequest<Customer>(token, `/clientes/${encodeURIComponent(selectedId)}`)) : null,
    selectedId ? settle(apiRequest<Order[]>(token, '/pedidos')) : null,
  ]);
  return json({
    available: customers !== null,
    customers: customers ?? [],
    selected,
    selectedId,
    orders: selectedId ? (orders ?? []).filter((o) => o.clienteId === selectedId).slice(0, 10) : [],
  });
}

type ActionData = { ok: boolean; message: string };

export async function action({ request, params }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const lang = params.lang ?? 'es';
  const fail = (message: string, status = 400) => json<ActionData>({ ok: false, message }, { status });
  try {
    if (intent === 'create' || intent === 'update') {
      const parsed = customerBody(form, intent === 'update');
      if (!parsed.ok) return fail(parsed.message);
      const id = String(form.get('customerId') ?? '');
      const saved =
        intent === 'create'
          ? await apiRequest<Customer>(token, '/clientes', { method: 'POST', body: JSON.stringify(parsed.body) })
          : await apiRequest<Customer>(token, `/clientes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(parsed.body) });
      return redirect(`/${lang}/dashboard/clientes?c=${saved.id}&guardado=1`);
    }
    if (intent === 'message') {
      // Opens the existing direct conversation with this customer, or starts one.
      const customerId = String(form.get('customerId') ?? '');
      const conversations = (await settle(apiRequest<Conversation[]>(token, '/messaging/conversations'))) ?? [];
      const existing = conversations.find(
        (c) => c.viewerAccess.canSend && c.participants.some((p) => p.customerId === customerId) && c.participants.length === 2,
      );
      const id =
        existing?.id ??
        (
          await apiRequest<{ id: string }>(token, '/messaging/conversations', {
            method: 'POST',
            body: JSON.stringify({ type: 'DIRECT', participantUserIds: [], participantCustomerIds: [customerId] }),
          })
        ).id;
      return redirect(`/${lang}/dashboard/mensajes?c=${id}`);
    }
    return fail('Acción desconocida.');
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message, error.status);
    throw error;
  }
}

/** Clientes: list with search, customer card with contact, level, orders and a chat shortcut. */
export default function CustomersPage() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const layout = useRouteLoaderData<typeof businessLoader>('routes/_business');
  const can = customerAbilities(layout?.user.rol ?? '');
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  const { lang = 'es' } = useParams();
  const [searchParams] = useSearchParams();
  const base = `/${lang}/dashboard/clientes`;
  const creating = searchParams.get('nuevo') === '1';
  const saved = searchParams.get('guardado') === '1';
  const query = searchParams.get('q') ?? '';
  const withQuery = (extra: Record<string, string>) => {
    const next = new URLSearchParams(query ? { q: query, ...extra } : extra);
    return next.size ? `${base}?${next}` : base;
  };

  if (!data.available) {
    return (
      <div className="ws-page">
        <h1 className="ws-page__title">Clientes</h1>
        <p className="ws-alert" role="alert">No pudimos cargar los clientes. Puede que tu rol no tenga acceso.</p>
      </div>
    );
  }

  return (
    <div className="ws-page ws-page--wide">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">{layout?.user.empresaNombre.toUpperCase()}</p>
          <h1 className="ws-page__title">Clientes</h1>
          <p className="ws-page__lead">{data.customers.length} {data.customers.length === 1 ? 'cliente' : 'clientes'}{query ? ` para "${query}"` : ''}.</p>
        </div>
        {can.manage && (
          <Link className="ws-button ws-button--primary ws-button--auto" to={withQuery({ nuevo: '1' })}>
            <Plus size={16} aria-hidden="true" /> Nuevo cliente
          </Link>
        )}
      </div>

      <Notice result={result} saved={saved} />

      <div className={`ws-catalog ws-catalog--two${creating || data.selected ? ' has-editor' : ''}`}>
        <section className="ws-card" aria-label="Clientes">
          <Form method="get" className="ws-inbox__search" role="search">
            <Search size={16} aria-hidden="true" />
            <input name="q" defaultValue={query} placeholder="Buscar por nombre o email" aria-label="Buscar clientes" />
          </Form>
          {data.customers.length === 0 ? (
            <div className="ws-empty">
              <b>{query ? 'Nadie coincide con la búsqueda.' : 'Todavía no hay clientes.'}</b>
              {!query && 'Agrégalos a mano o se registran solos al comprar en tu tienda.'}
            </div>
          ) : (
            <div className="ws-table-wrap">
              <table className="ws-table ws-table--customers">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contacto</th>
                    <th>Nivel</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.map((customer) => {
                    const level = LEVELS[customer.nivel ?? 'NUEVO'];
                    return (
                      <tr key={customer.id} className={customer.id === data.selectedId ? 'is-selected' : undefined}>
                        <td>
                          <Link className="ws-catalog__name" to={withQuery({ c: customer.id })}>{customer.nombre}</Link>
                        </td>
                        <td>{[customer.telefono, customer.email].filter(Boolean).join(' · ') || '—'}</td>
                        <td><span className={`ws-chip ws-chip--${level.tone}`}>{level.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {(creating || data.selected) && (
          <aside className="ws-card ws-catalog__editor" aria-labelledby="customer-title">
            <div className="ws-card__head">
              <h2 id="customer-title" className="ws-card__title">{creating ? 'Nuevo cliente' : data.selected?.nombre}</h2>
              <Link className="ws-icon-button" to={withQuery({})} aria-label="Cerrar">
                <X size={18} aria-hidden="true" />
              </Link>
            </div>

            {!creating && data.selected && (
              <>
                <p className="ws-meta">
                  <span className={`ws-chip ws-chip--${LEVELS[data.selected.nivel ?? 'NUEVO'].tone}`}>Cliente {LEVELS[data.selected.nivel ?? 'NUEVO'].label.toLowerCase()}</span>
                  <span>Desde {formatDateTime(data.selected.createdAt)}</span>
                </p>
                <Form method="post">
                  <input type="hidden" name="intent" value="message" />
                  <input type="hidden" name="customerId" value={data.selected.id} />
                  <button className="ws-button ws-button--outline ws-button--auto" disabled={busy}>
                    <MessagesSquare size={16} aria-hidden="true" /> Escribirle
                  </button>
                </Form>
              </>
            )}

            <Form method="post" className="ws-form" key={creating ? 'new' : data.selected?.id}>
              <input type="hidden" name="intent" value={creating ? 'create' : 'update'} />
              {!creating && data.selected && <input type="hidden" name="customerId" value={data.selected.id} />}
              <fieldset disabled={!can.manage} className="ws-form ws-catalog__fields">
                {[
                  ['nombre', 'Nombre', true, data.selected?.nombre],
                  ['telefono', 'Teléfono (opcional)', false, data.selected?.telefono],
                  ['email', 'Email (opcional)', false, data.selected?.email],
                  ['direccion', 'Dirección (opcional)', false, data.selected?.direccion],
                ].map(([name, label, required, value]) => (
                  <label key={String(name)} className="ws-field">
                    <span className="ws-field__label">{label}</span>
                    <span className="ws-field__control">
                      <input
                        name={String(name)}
                        type={INPUT_TYPES[String(name)] ?? 'text'}
                        required={Boolean(required)}
                        defaultValue={creating ? '' : String(value ?? '')}
                      />
                    </span>
                  </label>
                ))}
                {can.manage && <button className="ws-button ws-button--primary" disabled={busy}>{creating ? 'Crear cliente' : 'Guardar cambios'}</button>}
              </fieldset>
            </Form>

            {!creating && (
              <div className="ws-context__group">
                <span>ÚLTIMOS PEDIDOS</span>
                {data.orders.length === 0 ? (
                  <p className="ws-page__lead">Todavía no hizo pedidos.</p>
                ) : (
                  <ul className="ws-batches">
                    {data.orders.map((order) => {
                      const state = orderState(order.estado);
                      return (
                        <li key={order.id}>
                          <span>
                            <Link className="ws-catalog__name" to={`/${lang}/dashboard/pedidos/${order.id}`}>{formatMoney(order.total)}</Link>
                            <small>{formatDateTime(order.createdAt)}</small>
                          </span>
                          <span className={`ws-chip ws-chip--${state.tone}`}>{state.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
