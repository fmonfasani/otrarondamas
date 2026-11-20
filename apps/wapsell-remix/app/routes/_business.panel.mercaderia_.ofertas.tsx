import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useRouteLoaderData } from '@remix-run/react';
import { ArrowLeft, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { formatMoney } from '~/utils/format';
import type { Hierarchy, Product } from '~/utils/catalog';
import {
  OFFER_STATES,
  canManageOffers,
  offerDays,
  offerFor,
  offerPayload,
  offerWhat,
  todayAR,
  type Offer,
} from '~/utils/offers';
import type { loader as businessLoader } from './_business';

export const meta: MetaFunction = () => [{ title: 'Ofertas · Wapsell' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const [offers, hierarchy, products] = await Promise.all([
    settle(apiRequest<Offer[]>(token, '/ofertas')),
    settle(apiRequest<Hierarchy>(token, '/catalogo/jerarquia')),
    settle(apiRequest<Product[]>(token, '/catalogo/productos?activo=true')),
  ]);
  return json({
    available: offers !== null,
    offers: offers ?? [],
    categories: hierarchy?.familias ?? [],
    products: (products ?? []).map((p) => ({ id: p.id, nombre: p.nombre, codigo: p.codigoInterno, precio: p.precioMinorista })),
  });
}

type ActionData = { ok: boolean; message: string; at?: number };

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const fail = (message: string, status = 400) => json<ActionData>({ ok: false, message }, { status });
  try {
    if (intent === 'create') {
      const parsed = offerPayload(form);
      if (!parsed.ok) return fail(parsed.message);
      await apiRequest(token, '/ofertas', { method: 'POST', body: JSON.stringify(parsed.body) });
      return json<ActionData>({ ok: true, message: `Oferta «${parsed.body.nombre}» creada.`, at: Date.now() });
    }
    if (intent === 'end') {
      const id = String(form.get('ofertaId') ?? '');
      await apiRequest(token, `/ofertas/${encodeURIComponent(id)}/terminar`, { method: 'POST' });
      return json<ActionData>({ ok: true, message: 'Oferta terminada: los precios vuelven a ser los de siempre.' });
    }
    return fail('Acción desconocida.');
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message, error.status);
    throw error;
  }
}

/**
 * OR-B4-046 §4.4 (D4), stage C3 — the business's offers: a percent off or an offer price between two
 * days, for some products or a whole category, in every channel or only in the store. Everyone
 * sees them; the Owner and the Admin create and end them.
 */
export default function OffersPage() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const layout = useRouteLoaderData<typeof businessLoader>('routes/_business');
  const canManage = canManageOffers(layout?.user.rol ?? '');
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';

  return (
    <div className="ws-page ws-page--wide">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">{layout?.user.empresaNombre.toUpperCase()}</p>
          <h1 className="ws-page__title">Ofertas</h1>
          <p className="ws-page__lead">
            Un precio especial entre dos fechas, que el cliente ve como «Oferta». Cuando termina, cada producto vuelve solo a su
            precio. Si un producto tiene su propio descuento, se cobra el más bajo de los dos: nunca se suman.
          </p>
        </div>
        <Link className="ws-button ws-button--outline ws-button--auto" to="/panel/mercaderia">
          <ArrowLeft size={16} aria-hidden="true" /> Mercadería
        </Link>
      </div>

      {result && (
        <p className={result.ok ? 'ws-success-note' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>
          {result.message}
        </p>
      )}
      {!data.available && <p className="ws-alert" role="alert">No pudimos cargar las ofertas.</p>}

      {canManage && <NewOffer key={result?.at ?? 0} categories={data.categories} products={data.products} busy={busy} />}

      <section className="ws-card" aria-labelledby="offers-title">
        <h2 id="offers-title" className="ws-card__title">Tus ofertas</h2>
        {data.offers.length === 0 ? (
          <div className="ws-empty">
            <b>Todavía no hay ofertas.</b>
            {canManage ? 'Creá la primera con el formulario de arriba.' : 'Las crea el Owner o un Administrador.'}
          </div>
        ) : (
          <div className="ws-table-wrap">
            <table className="ws-table ws-table--sheet ws-table--offers">
              <thead>
                <tr>
                  <th>Oferta</th>
                  <th>Qué</th>
                  <th>Para</th>
                  <th>Días</th>
                  <th>Dónde</th>
                  <th>Estado</th>
                  {canManage && <th aria-label="Acciones" />}
                </tr>
              </thead>
              <tbody>
                {data.offers.map((offer) => {
                  const state = OFFER_STATES[offer.estado];
                  return (
                    <tr key={offer.id} className={offer.estado === 'terminada' ? 'is-muted' : undefined}>
                      <td className="ws-sheet__wide"><b>{offer.nombre}</b></td>
                      <td data-label="Qué">{offerWhat(offer)}</td>
                      <td data-label="Para">{offerFor(offer)}</td>
                      <td data-label="Días">{offerDays(offer)}</td>
                      <td data-label="Dónde">{offer.soloTienda ? 'Solo tienda online' : 'Tienda, mostrador y chat'}</td>
                      <td data-label="Estado"><span className={`ws-chip ws-chip--${state.tone}`}>{state.label}</span></td>
                      {canManage && (
                        <td className={offer.estado === 'terminada' ? 'is-empty' : 'ws-sheet__wide'}>
                          {offer.estado !== 'terminada' && (
                            <Form method="post">
                              <input type="hidden" name="intent" value="end" />
                              <input type="hidden" name="ofertaId" value={offer.id} />
                              <button className="ws-button ws-button--outline ws-button--auto" disabled={busy}>
                                {offer.estado === 'programada' ? 'Cancelar' : 'Terminar'}
                              </button>
                            </Form>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function NewOffer({
  categories,
  products,
  busy,
}: {
  categories: Array<{ id: string; nombre: string }>;
  products: Array<{ id: string; nombre: string; codigo: string; precio: string }>;
  busy: boolean;
}) {
  const [type, setType] = useState<'PORCENTAJE' | 'PRECIO'>('PORCENTAJE');
  const [scope, setScope] = useState<'productos' | 'categoria'>('productos');
  const [filter, setFilter] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const today = todayAR();
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const matching = q ? products.filter((p) => `${p.nombre} ${p.codigo}`.toLowerCase().includes(q)) : products;
    return matching.slice(0, 100);
  }, [filter, products]);
  const toggle = (id: string) => setPicked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const byCategory = scope === 'categoria' && type === 'PORCENTAJE';

  return (
    <section className="ws-card" aria-labelledby="new-offer">
      <h2 id="new-offer" className="ws-card__title">Nueva oferta</h2>
      <Form method="post" className="ws-offer">
        <input type="hidden" name="intent" value="create" />
        <label className="ws-field">
          <span className="ws-field__label">Nombre</span>
          <span className="ws-field__control"><input name="nombre" required maxLength={80} placeholder="Semana de la yerba" /></span>
        </label>
        <fieldset className="ws-offer__group">
          <legend className="ws-field__label">Qué</legend>
          <label className="ws-check">
            <input type="radio" name="tipo" value="PORCENTAJE" checked={type === 'PORCENTAJE'} onChange={() => setType('PORCENTAJE')} />
            <span><b>Un porcentaje de descuento</b><small>Por ejemplo, 20 % menos sobre el precio de lista.</small></span>
          </label>
          <label className="ws-check">
            <input type="radio" name="tipo" value="PRECIO" checked={type === 'PRECIO'} onChange={() => { setType('PRECIO'); setScope('productos'); }} />
            <span><b>Un precio de oferta</b><small>Cada producto elegido se vende a ese precio.</small></span>
          </label>
        </fieldset>
        <div className="ws-offer__row">
          <label className="ws-field">
            <span className="ws-field__label">{type === 'PRECIO' ? 'Precio de oferta' : 'Descuento'}</span>
            <span className="ws-field__control">
              <input name="valor" inputMode="decimal" required placeholder={type === 'PRECIO' ? '999' : '20'} />
              <span aria-hidden="true">{type === 'PRECIO' ? '$' : '%'}</span>
            </span>
          </label>
          <label className="ws-field">
            <span className="ws-field__label">Primer día</span>
            <span className="ws-field__control"><input name="desde" type="date" required defaultValue={today} min={today} /></span>
          </label>
          <label className="ws-field">
            <span className="ws-field__label">Último día</span>
            <span className="ws-field__control"><input name="hasta" type="date" required min={today} /></span>
          </label>
        </div>
        <fieldset className="ws-offer__group">
          <legend className="ws-field__label">Para qué productos</legend>
          <label className="ws-check">
            <input type="radio" name="alcance" value="productos" checked={!byCategory} onChange={() => setScope('productos')} />
            <span><b>Los que elijo</b></span>
          </label>
          <label className="ws-check">
            <input
              type="radio"
              name="alcance"
              value="categoria"
              checked={byCategory}
              disabled={type === 'PRECIO'}
              onChange={() => setScope('categoria')}
            />
            <span><b>Toda una categoría</b><small>Solo con porcentaje.</small></span>
          </label>
        </fieldset>
        {byCategory ? (
          <label className="ws-field">
            <span className="ws-field__label">Categoría</span>
            <span className="ws-field__control">
              <select name="familiaId" required defaultValue="">
                <option value="" disabled>Elegí una categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </span>
          </label>
        ) : (
          <div className="ws-offer__picker">
            <span className="ws-inbox__search">
              <Search size={16} aria-hidden="true" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar producto" aria-label="Buscar producto" />
            </span>
            <p className="ws-meta">{picked.length === 0 ? 'Ningún producto marcado.' : `${picked.length} ${picked.length === 1 ? 'producto marcado' : 'productos marcados'}.`}</p>
            {picked.filter((id) => !shown.some((p) => p.id === id)).map((id) => (
              <input key={id} type="hidden" name="productoId" value={id} />
            ))}
            <ul className="ws-offer__list">
              {shown.map((p) => (
                <li key={p.id}>
                  <label className="ws-offer__item">
                    <input type="checkbox" name="productoId" value={p.id} checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />
                    <span>{p.nombre}</span>
                    <small>{formatMoney(p.precio)}</small>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
        <label className="ws-check">
          <input type="checkbox" name="soloTienda" value="true" />
          <span><b>Solo en la tienda online</b><small>Si no la marcás, rige también en el mostrador y en el chat.</small></span>
        </label>
        <button className="ws-button ws-button--primary ws-button--auto" disabled={busy}>Crear oferta</button>
      </Form>
    </section>
  );
}
