import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useRouteLoaderData, useSearchParams } from '@remix-run/react';
import { ArrowLeft, Search } from 'lucide-react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import {
  editableNumber,
  inventoryAbilities,
  openingItemsFrom,
  openingMessage,
  type OpeningSheet,
} from '~/utils/inventory';
import type { loader as businessLoader } from './_business';

export const meta: MetaFunction = () => [{ title: 'Carga inicial · Wapsell' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  const sheet = await settle(
    apiRequest<OpeningSheet>(token, `/inventario/carga-inicial${query ? `?search=${encodeURIComponent(query)}` : ''}`),
  );
  return json({ sheet });
}

type ActionData = { ok: boolean; message: string; at?: number };

/** OR-B4-046 D8: the stock a business already has, entered without inventing a purchase. */
export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const fail = (message: string, status = 400) => json<ActionData>({ ok: false, message }, { status });
  const parsed = openingItemsFrom(form);
  if (!parsed.ok) return fail(parsed.message);
  try {
    const result = await apiRequest<{ productos: number; lotes: number }>(token, '/inventario/carga-inicial', {
      method: 'POST',
      body: JSON.stringify({ items: parsed.items }),
    });
    return json<ActionData>({ ok: true, message: openingMessage(result), at: Date.now() });
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message, error.status);
    throw error;
  }
}

const qty = (value: number) => value.toLocaleString('es-AR', { maximumFractionDigits: 3 });

/** Carga inicial: the opening stock, product by product, with its cost and (when it expires) its date. */
export default function OpeningStockPage() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const layout = useRouteLoaderData<typeof businessLoader>('routes/_business');
  const can = inventoryAbilities(layout?.user.rol ?? '');
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  const [searchParams] = useSearchParams();

  const head = (
    <div className="ws-page__head">
      <div className="ws-page__titles">
        <p className="ws-page__eyebrow">{layout?.user.empresaNombre.toUpperCase()}</p>
        <h1 className="ws-page__title">Carga inicial</h1>
        <p className="ws-page__lead">
          El stock con el que arrancás, sin inventar una compra. Aparecen los productos que todavía no tuvieron ventas, compras,
          ajustes ni conteos; después, su stock se corrige con un conteo físico.
        </p>
      </div>
      <Link className="ws-button ws-button--outline ws-button--auto" to="/panel/inventario">
        <ArrowLeft size={16} aria-hidden="true" /> Inventario
      </Link>
    </div>
  );

  if (!data.sheet) {
    return (
      <div className="ws-page ws-page--wide">
        {head}
        <p className="ws-alert" role="alert">No pudimos cargar los productos. Puede que tu rol no pueda ajustar el stock.</p>
      </div>
    );
  }

  const rows = data.sheet.productos;
  return (
    <div className="ws-page ws-page--wide">
      {head}

      {result && (
        <p className={result.ok ? 'ws-success-note' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>
          {result.message}
        </p>
      )}

      <section className="ws-card" aria-label="Productos para la carga inicial">
        <Form method="get" className="ws-catalog__toolbar" role="search">
          <span className="ws-inbox__search">
            <Search size={16} aria-hidden="true" />
            <input name="q" defaultValue={searchParams.get('q') ?? ''} placeholder="Buscar por nombre o código" aria-label="Buscar productos" />
          </span>
          <button className="ws-button ws-button--outline ws-button--auto">Buscar</button>
        </Form>

        {rows.length === 0 ? (
          <div className="ws-empty">
            <b>No hay productos para la carga inicial.</b>
            {searchParams.get('q')
              ? 'Probá con otra búsqueda.'
              : 'Los productos que ya operaron se corrigen con un conteo físico; los nuevos se cargan en Mercadería.'}
          </div>
        ) : (
          <Form method="post" className="ws-form" key={result?.at ?? 0}>
            <div className="ws-table-wrap">
              <table className="ws-table ws-table--sheet ws-table--opening">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="is-num">En stock</th>
                    <th className="is-num">Cantidad</th>
                    <th>Vence</th>
                    <th>Lote (opcional)</th>
                    <th className="is-num">Costo unitario</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.productoId}>
                      <td className="ws-sheet__wide">
                        <span className="ws-sheet__name">
                          <b>{row.nombre}</b>
                          <small>{row.codigoInterno}</small>
                        </span>
                        <input type="hidden" name="productoId" value={row.productoId} />
                        <input type="hidden" name="nombre" value={row.nombre} />
                        <input type="hidden" name="controla" value={row.controlaVencimiento ? '1' : '0'} />
                      </td>
                      <td className="is-num" data-label="En stock">{qty(row.stockTotal)}</td>
                      <td className="is-num" data-label="Cantidad">
                        <input className="ws-sheet-input" name="cantidad" inputMode="decimal" autoComplete="off" aria-label={`Cantidad de ${row.nombre}`} />
                      </td>
                      <td data-label="Vence">
                        {row.controlaVencimiento ? (
                          <input className="ws-sheet-input" type="date" name="vence" aria-label={`Vencimiento de ${row.nombre}`} />
                        ) : (
                          <>
                            <span className="ws-sheet__none">No vence</span>
                            <input type="hidden" name="vence" value="" />
                          </>
                        )}
                      </td>
                      <td data-label="Lote (opcional)">
                        <input className="ws-sheet-input" name="lote" maxLength={60} autoComplete="off" aria-label={`Lote de ${row.nombre}`} />
                      </td>
                      <td className="is-num" data-label="Costo unitario">
                        <input
                          className="ws-sheet-input"
                          name="costo"
                          inputMode="decimal"
                          autoComplete="off"
                          defaultValue={editableNumber(row.costo)}
                          aria-label={`Costo unitario de ${row.nombre}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.sheet.total > rows.length && (
              <p className="ws-page__lead">Mostrando {rows.length} de {data.sheet.total}. Buscá para encontrar el resto.</p>
            )}
            <div className="ws-sheet__foot">
              <p className="ws-sheet__summary">
                Completá solo los productos que tenés; el resto queda para otra carga. Si un producto que vence tiene lotes con
                distintas fechas, cargá uno ahora y los demás en otra carga.
              </p>
              {can.adjust ? (
                <button className="ws-button ws-button--primary ws-button--auto" disabled={busy}>Cargar stock</button>
              ) : (
                <p className="ws-sheet__summary">Tu rol puede ver el stock, pero no cargarlo.</p>
              )}
            </div>
          </Form>
        )}
      </section>
    </div>
  );
}
