import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useLoaderData, useSearchParams } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest } from '~/services/api.server';
import { formatMoney } from '~/utils/format';
import { PERIODS, barHeights, dayLabel, methodName, periodFrom, variationText, type ReportSummary } from '~/utils/reports';

export const meta: MetaFunction = () => [{ title: 'Reportes · Wapsell' }];

/**
 * Reportes (OR-B4-036) — what the Business sold in a period, net of returns: counter sales
 * and store orders paid or delivered, minus refunds. Owner and Admin (REPORTS_VIEW).
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const period = periodFrom(new URL(request.url).searchParams);
  try {
    const report = await apiRequest<ReportSummary>(
      token,
      `/reportes/resumen?desde=${encodeURIComponent(period.desde)}&hasta=${encodeURIComponent(period.hasta)}`,
    );
    return json({ period, report, error: null as string | null });
  } catch (error) {
    if (error instanceof ApiError) {
      const message = error.status === 403 ? 'Los reportes son para el Owner y los administradores del negocio.' : error.message;
      return json({ period, report: null, error: message });
    }
    throw error;
  }
}

function Stat({ label, value, hint }: Readonly<{ label: string; value: string; hint?: string | null }>) {
  return (
    <div className="ws-stat ws-stat--static">
      <span className="ws-stat__value">{value}</span>
      <span className="ws-stat__label">{label}</span>
      {hint ? <span className="ws-stat__hint">{hint}</span> : null}
    </div>
  );
}

export default function Reportes() {
  const { period, report, error } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const current = period.periodo;

  return (
    <div className="ws-page ws-page--wide">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">NEGOCIO</p>
          <h1 className="ws-page__title">Reportes</h1>
          <p className="ws-page__lead">
            Lo vendido en el mostrador y los pedidos de la tienda pagados o entregados, menos las devoluciones.
          </p>
        </div>
      </div>

      <div className="ws-report-filters">
        <nav className="ws-inbox__filters" aria-label="Período">
          {PERIODS.map((p) => (
            <Link key={p.value} className={`ws-chip ${current === p.value ? 'ws-chip--secondary' : ''}`} to={`?periodo=${p.value}`}>
              {p.label}
            </Link>
          ))}
        </nav>
        <Form method="get" className="ws-report-range">
          <label className="ws-field">
            <span className="ws-field__label">Desde</span>
            <span className="ws-field__control"><input type="date" name="desde" defaultValue={params.get('desde') ?? period.desde} required /></span>
          </label>
          <label className="ws-field">
            <span className="ws-field__label">Hasta</span>
            <span className="ws-field__control"><input type="date" name="hasta" defaultValue={params.get('hasta') ?? period.hasta} required /></span>
          </label>
          <button className="ws-button ws-button--outline ws-button--auto" type="submit">Ver</button>
        </Form>
      </div>

      {error && <p className="ws-alert" role="alert">{error}</p>}
      {report && (
        <>
          <div className="ws-stats">
            <Stat
              label="Neto del período"
              value={formatMoney(report.neto)}
              hint={
                variationText(report.anterior.variacion)
                  ? `${variationText(report.anterior.variacion)} contra el período anterior (${formatMoney(report.anterior.neto)})`
                  : 'Sin ventas en el período anterior para comparar'
              }
            />
            <Stat label="Vendido" value={formatMoney(report.vendido)} hint={`${report.operaciones} ${report.operaciones === 1 ? 'operación' : 'operaciones'}`} />
            <Stat label="Devoluciones" value={formatMoney(report.devoluciones)} hint="Reembolsos y créditos de cambios" />
            <Stat label="Ticket promedio" value={formatMoney(report.ticketPromedio)} />
          </div>

          <section className="ws-card" aria-labelledby="days-title">
            <h2 id="days-title" className="ws-card__title">Vendido por día</h2>
            {report.vendido === 0 ? (
              <p className="ws-meta">No hubo ventas en este período.</p>
            ) : (
              <DayChart days={report.porDia} />
            )}
          </section>

          <div className="ws-columns ws-columns--even">
            <section className="ws-card" aria-labelledby="channels-title">
              <h2 id="channels-title" className="ws-card__title">Por canal</h2>
              <table className="ws-table">
                <thead><tr><th>Canal</th><th className="is-num">Operaciones</th><th className="is-num">Vendido</th></tr></thead>
                <tbody>
                  {report.porCanal.length === 0 ? (
                    <tr><td colSpan={3} className="ws-meta">Sin ventas.</td></tr>
                  ) : (
                    report.porCanal.map((c) => (
                      <tr key={c.canal}><td>{c.canal}</td><td className="is-num">{c.operaciones}</td><td className="is-num">{formatMoney(c.vendido)}</td></tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
            <section className="ws-card" aria-labelledby="methods-title">
              <h2 id="methods-title" className="ws-card__title">Cobrado por medio de pago</h2>
              <table className="ws-table">
                <thead><tr><th>Medio</th><th className="is-num">Cobrado</th></tr></thead>
                <tbody>
                  {report.porMedio.length === 0 ? (
                    <tr><td colSpan={2} className="ws-meta">Sin cobros.</td></tr>
                  ) : (
                    report.porMedio.map((m) => (
                      <tr key={m.medio}><td>{methodName(m.medio)}</td><td className="is-num">{formatMoney(m.monto)}</td></tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </div>

          <section className="ws-card" aria-labelledby="products-title">
            <h2 id="products-title" className="ws-card__title">Productos más vendidos</h2>
            <table className="ws-table">
              <thead><tr><th>Producto</th><th className="is-num">Unidades</th><th className="is-num">Vendido</th></tr></thead>
              <tbody>
                {report.productos.length === 0 ? (
                  <tr><td colSpan={3} className="ws-meta">Sin ventas.</td></tr>
                ) : (
                  report.productos.map((p) => (
                    <tr key={p.productoId}><td>{p.nombre}</td><td className="is-num">{p.cantidad}</td><td className="is-num">{formatMoney(p.vendido)}</td></tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

/** One series (sold per day): bars with a tooltip each, and the same numbers as a table. */
function DayChart({ days }: Readonly<{ days: ReportSummary['porDia'] }>) {
  const heights = barHeights(days);
  const step = days.length > 14 ? Math.ceil(days.length / 10) : 1;
  return (
    <>
      <div className="ws-bars" role="img" aria-label="Vendido por día; los valores están en la tabla debajo">
        {days.map((d, i) => (
          <div
            key={d.dia}
            className={`ws-bars__col${i >= days.length - 2 ? ' ws-bars__col--end' : i <= 1 ? ' ws-bars__col--start' : ''}`}
            tabIndex={0} aria-label={`${dayLabel(d.dia)}: ${formatMoney(d.vendido)}`}>
            <span className="ws-bars__tip" role="tooltip">
              <b>{dayLabel(d.dia)}</b> Vendido {formatMoney(d.vendido)}
              {d.devoluciones > 0 ? ` · devoluciones ${formatMoney(d.devoluciones)}` : ''}
            </span>
            <span className="ws-bars__bar" style={{ height: `${heights[i]}%` }} />
            <span className="ws-bars__label" aria-hidden="true">{i % step === 0 ? dayLabel(d.dia) : ''}</span>
          </div>
        ))}
      </div>
      <details className="ws-return-close">
        <summary>Ver como tabla</summary>
        <table className="ws-table">
          <thead><tr><th>Día</th><th className="is-num">Vendido</th><th className="is-num">Devoluciones</th><th className="is-num">Neto</th></tr></thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.dia}>
                <td>{dayLabel(d.dia)}</td>
                <td className="is-num">{formatMoney(d.vendido)}</td>
                <td className="is-num">{formatMoney(d.devoluciones)}</td>
                <td className="is-num">{formatMoney(d.neto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
