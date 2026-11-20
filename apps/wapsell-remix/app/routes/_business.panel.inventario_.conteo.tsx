import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useRouteLoaderData, useSearchParams } from '@remix-run/react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import type { Hierarchy } from '~/utils/catalog';
import {
  countDifference,
  countItemsFrom,
  countLinesOf,
  countMessage,
  inventoryAbilities,
  type CountResult,
  type CountSheet,
} from '~/utils/inventory';
import type { loader as businessLoader } from './_business';

export const meta: MetaFunction = () => [{ title: 'Conteo físico · Wapsell' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const familyId = url.searchParams.get('familia') ?? '';
  const params = new URLSearchParams();
  if (query) params.set('search', query);
  if (familyId) params.set('familiaId', familyId);
  const [sheet, hierarchy] = await Promise.all([
    settle(apiRequest<CountSheet>(token, `/inventario/conteo${params.size ? `?${params}` : ''}`)),
    settle(apiRequest<Hierarchy>(token, '/catalogo/jerarquia')),
  ]);
  return json({
    sheet,
    families: (hierarchy?.familias ?? []).map((family) => ({ id: family.id, nombre: family.nombre })),
  });
}

type ActionData = { ok: boolean; message: string };

/** OR-B4-046 D8: the count sets the stock to what was counted; the API refuses it if the stock changed meanwhile. */
export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const fail = (message: string, status = 400) => json<ActionData>({ ok: false, message }, { status });
  const parsed = countItemsFrom(form);
  if (!parsed.ok) return fail(parsed.message);
  const nota = String(form.get('nota') ?? '').trim();
  try {
    const result = await apiRequest<CountResult>(token, '/inventario/conteos', {
      method: 'POST',
      body: JSON.stringify({ ...(nota ? { nota } : {}), items: parsed.items }),
    });
    return json<ActionData>({ ok: true, message: countMessage(result) });
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message, error.status);
    throw error;
  }
}

const qty = (value: number) => value.toLocaleString('es-AR', { maximumFractionDigits: 3 });

function DifferenceChip({ value }: { value: number | null }) {
  if (value === null) return <span className="ws-sheet__none">—</span>;
  if (Number.isNaN(value)) return <span className="ws-chip ws-chip--warning">Revisá</span>;
  if (value === 0) return <span className="ws-chip ws-chip--muted">Igual</span>;
  return (
    <span className={`ws-chip ${value > 0 ? 'ws-chip--success' : 'ws-chip--warning'}`}>
      {value > 0 ? '+' : '−'}
      {qty(Math.abs(value))}
    </span>
  );
}

function summaryText(summary: { counted: number; changed: number; invalid: number }) {
  if (summary.counted === 0) return 'Todavía no contaste nada.';
  if (summary.invalid > 0) return 'Revisá los renglones marcados: lo contado tiene que ser un número, 0 o más.';
  const counted = `${summary.counted} ${summary.counted === 1 ? 'renglón contado' : 'renglones contados'}`;
  if (summary.changed === 0) return `${counted}: todo coincide con el sistema.`;
  return `${counted}, ${summary.changed} con diferencia. Al confirmar, el stock queda como lo contaste.`;
}

/** Conteo físico: count what is on the shelf, see the difference with the system and confirm it. */
export default function StockCountPage() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const layout = useRouteLoaderData<typeof businessLoader>('routes/_business');
  const can = inventoryAbilities(layout?.user.rol ?? '');
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  const [searchParams] = useSearchParams();
  const lines = useMemo(() => countLinesOf(data.sheet?.productos ?? []), [data.sheet]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [dates, setDates] = useState<Record<string, string>>({});

  // A saved count reloads the sheet with the new stock: the next count starts clean.
  useEffect(() => {
    if (result?.ok) {
      setCounts({});
      setDates({});
    }
  }, [result]);

  const head = (
    <div className="ws-page__head">
      <div className="ws-page__titles">
        <p className="ws-page__eyebrow">{layout?.user.empresaNombre.toUpperCase()}</p>
        <h1 className="ws-page__title">Conteo físico</h1>
        <p className="ws-page__lead">
          Contá lo que hay y escribilo. Wapsell te muestra la diferencia con el sistema y, al confirmar, deja el stock como lo
          contaste. Lo que dejes vacío no se toca, así podés contar por partes.
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
        <p className="ws-alert" role="alert">No pudimos cargar la planilla. Puede que tu rol no pueda ajustar el stock.</p>
      </div>
    );
  }

  const summary = lines.reduce(
    (acc, line) => {
      const difference = countDifference(line.sistema, counts[line.key] ?? '');
      if (difference === null || (line.kind === 'nuevo' && difference === 0)) return acc;
      acc.counted += 1;
      if (Number.isNaN(difference)) acc.invalid += 1;
      else if (difference !== 0) acc.changed += 1;
      return acc;
    },
    { counted: 0, changed: 0, invalid: 0 },
  );
  const filtered = Boolean(searchParams.get('q') || searchParams.get('familia'));

  return (
    <div className="ws-page ws-page--wide">
      {head}

      {result && (
        <p className={result.ok ? 'ws-success-note' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>
          {result.message}
        </p>
      )}

      <section className="ws-card" aria-label="Planilla de conteo">
        <Form method="get" className="ws-catalog__toolbar" role="search">
          <span className="ws-inbox__search">
            <Search size={16} aria-hidden="true" />
            <input name="q" defaultValue={searchParams.get('q') ?? ''} placeholder="Buscar por nombre o código" aria-label="Buscar productos" />
          </span>
          {data.families.length > 0 && (
            <select name="familia" className="ws-sheet__select" defaultValue={searchParams.get('familia') ?? ''} aria-label="Categoría">
              <option value="">Todas las categorías</option>
              {data.families.map((family) => (
                <option key={family.id} value={family.id}>{family.nombre}</option>
              ))}
            </select>
          )}
          <button className="ws-button ws-button--outline ws-button--auto">Filtrar</button>
        </Form>

        {lines.length === 0 ? (
          <div className="ws-empty">
            <b>No hay productos para contar.</b>
            {filtered ? 'Probá con otra búsqueda o categoría.' : 'Cargá productos en Mercadería.'}
          </div>
        ) : (
          <Form method="post" className="ws-form">
            <div className="ws-table-wrap">
              <table className="ws-table ws-table--sheet ws-table--count">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Lote</th>
                    <th className="is-num">Sistema</th>
                    <th className="is-num">Contado</th>
                    <th className="is-num">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const difference = countDifference(line.sistema, counts[line.key] ?? '');
                    const what = line.kind === 'producto' ? line.nombre : `${line.nombre}, ${line.label}`;
                    return (
                      <tr key={line.key} className={line.first ? undefined : 'is-lot'}>
                        <td className={`ws-sheet__wide${line.first ? '' : ' is-empty'}`}>
                          {line.first && (
                            <span className="ws-sheet__name">
                              <b>{line.nombre}</b>
                              <small>{line.codigoInterno}</small>
                            </span>
                          )}
                          <input type="hidden" name="fila" value={line.kind} />
                          <input type="hidden" name="productoId" value={line.productoId} />
                          <input type="hidden" name="nombre" value={line.nombre} />
                          <input type="hidden" name="loteId" value={line.loteId} />
                          <input type="hidden" name="sistema" value={String(line.sistema)} />
                        </td>
                        <td className={`ws-sheet__wide${line.kind === 'producto' ? ' is-empty' : ''}`}>
                          {line.kind === 'nuevo' ? (
                            <span className="ws-sheet__lot">
                              <small>Otro lote que encontraste, vence</small>
                              <input
                                className="ws-sheet-input"
                                type="date"
                                name="vence"
                                value={dates[line.key] ?? ''}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setDates((prev) => ({ ...prev, [line.key]: value }));
                                }}
                                aria-label={`Vencimiento de otro lote de ${line.nombre}`}
                              />
                            </span>
                          ) : (
                            <>
                              {line.label || <span className="ws-sheet__none">—</span>}
                              <input type="hidden" name="vence" value="" />
                            </>
                          )}
                        </td>
                        <td className="is-num" data-label="Sistema">
                          {line.kind === 'nuevo' ? <span className="ws-sheet__none">—</span> : qty(line.sistema)}
                        </td>
                        <td className="is-num" data-label="Contado">
                          <input
                            className="ws-sheet-input"
                            name="contado"
                            inputMode="decimal"
                            autoComplete="off"
                            value={counts[line.key] ?? ''}
                            onChange={(event) => {
                              const value = event.target.value;
                              setCounts((prev) => ({ ...prev, [line.key]: value }));
                            }}
                            aria-label={`Contado de ${what}`}
                          />
                        </td>
                        <td className="is-num" data-label="Diferencia">
                          <DifferenceChip value={line.kind === 'nuevo' && difference === 0 ? null : difference} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.sheet.hayMas && <p className="ws-page__lead">Hay más productos: buscá o elegí una categoría para contar el resto.</p>}
            <label className="ws-field">
              <span className="ws-field__label">Nota (opcional)</span>
              <span className="ws-field__control">
                <input name="nota" maxLength={160} placeholder="Por ejemplo: depósito, góndola 3, cierre de mes" />
              </span>
            </label>
            <div className="ws-sheet__foot">
              <p className="ws-sheet__summary" aria-live="polite">{summaryText(summary)}</p>
              {can.adjust ? (
                <button className="ws-button ws-button--primary ws-button--auto" disabled={busy || summary.invalid > 0}>
                  Confirmar conteo
                </button>
              ) : (
                <p className="ws-sheet__summary">Tu rol puede ver el stock, pero no ajustarlo.</p>
              )}
            </div>
          </Form>
        )}
      </section>
    </div>
  );
}
