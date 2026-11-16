import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { MetricCard, PlatformShell } from '~/components/platform/PlatformShell';
import {
  monthBarHeights,
  monthChange,
  monthLabel,
  numberText,
  platformRequest,
  tooltipSide,
  type ActivityMonth,
} from '~/utils/platform';
import { formatMoney } from '~/utils/format';

export const meta: MetaFunction = () => [{ title: 'Actividad · Plataforma · Wapsell' }];

const SPANS = [6, 12] as const;

/** OR-B4-040 — month by month: new and active Businesses, sold, orders and messages. */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const months = new URL(request.url).searchParams.get('meses') === '12' ? 12 : 6;
  const { meses } = await platformRequest<{ meses: ActivityMonth[] }>(
    token,
    `/activity?months=${months}`,
  );
  return json({ meses, months });
}

export default function PlatformActivity() {
  const { meses, months } = useLoaderData<typeof loader>();
  const current = meses[meses.length - 1];
  const previous = meses[meses.length - 2];
  const heights = monthBarHeights(meses.map((m) => m.vendido));
  return (
    <PlatformShell
      title="Actividad y crecimiento"
      subtitle={`Toda la plataforma, mes por mes (hora de Argentina). ${monthLabel(current.mes)} va en curso.`}
    >
      <nav className="flex gap-2 text-sm" aria-label="Período">
        {SPANS.map((n) => (
          <Link
            key={n}
            to={`?meses=${n}`}
            aria-current={n === months ? 'page' : undefined}
            className={`rounded-full border px-4 py-2 ${
              n === months
                ? 'border-[#211f1b] bg-[#211f1b] text-white'
                : 'border-[#e2ded6] bg-white text-[#615c55]'
            }`}
          >
            Últimos {n} meses
          </Link>
        ))}
      </nav>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={`Vendido en ${monthLabel(current.mes)}`}
          value={formatMoney(current.vendido)}
          detail={
            (previous && monthChange(current.vendido, previous.vendido)) ??
            'Mostrador y tienda, sin anuladas'
          }
        />
        <MetricCard
          label="Negocios activos"
          value={numberText(current.negociosActivos)}
          detail={
            (previous && monthChange(current.negociosActivos, previous.negociosActivos)) ??
            'Con ventas, pedidos o mensajes'
          }
        />
        <MetricCard
          label="Negocios nuevos"
          value={numberText(current.negociosNuevos)}
          detail="Dados de alta este mes"
        />
        <MetricCard
          label="Mensajes"
          value={numberText(current.mensajes)}
          detail={
            (previous && monthChange(current.mensajes, previous.mensajes)) ??
            'Entre negocios y clientes'
          }
        />
      </div>
      <section className="rounded-2xl border border-[#e8e4dc] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold">Vendido por mes</h2>
        <p className="text-sm text-[#77736d]">
          Pasá el mouse (o tocá) una barra para ver el monto.
        </p>
        <div
          className="mt-6 flex h-48 items-end gap-2 border-b border-[#e8e4dc]"
          role="group"
          aria-label="Vendido por mes; también en la tabla debajo"
        >
          {meses.map((m, i) => (
            <button
              type="button"
              key={m.mes}
              aria-label={`${monthLabel(m.mes)}: ${formatMoney(m.vendido)}`}
              className="group relative flex h-full flex-1 cursor-default flex-col justify-end focus:outline-none"
            >
              <span
                role="tooltip"
                className={`pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg bg-[#211f1b] px-3 py-2 text-xs text-white shadow group-hover:block group-focus:block ${tooltipSide(i, meses.length)}`}
              >
                <strong className="block">{monthLabel(m.mes)}</strong>
                {formatMoney(m.vendido)} · {numberText(m.ventas + m.pedidos)} operaciones
              </span>
              <span
                className="mx-auto w-full max-w-12 rounded-t bg-[#d97757] group-hover:bg-[#b85c4a]"
                style={{ height: `${heights[i]}%` }}
              />
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2 text-center text-xs text-[#96918a]" aria-hidden="true">
          {meses.map((m) => (
            <span key={m.mes} className="flex-1 truncate">
              {monthLabel(m.mes).split(' ')[0]}
            </span>
          ))}
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#faf9f6] text-xs uppercase tracking-wide text-[#96918a]">
              <tr>
                <th className="px-6 py-3 font-medium">Mes</th>
                <th className="px-4 py-3 text-right font-medium">Negocios nuevos</th>
                <th className="px-4 py-3 text-right font-medium">Negocios activos</th>
                <th className="px-4 py-3 text-right font-medium">Vendido</th>
                <th className="px-4 py-3 text-right font-medium">Ventas mostrador</th>
                <th className="px-4 py-3 text-right font-medium">Pedidos</th>
                <th className="px-6 py-3 text-right font-medium">Mensajes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ede7]">
              {[...meses].reverse().map((m) => (
                <tr key={m.mes}>
                  <td className="px-6 py-3 capitalize">{monthLabel(m.mes)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {numberText(m.negociosNuevos)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {numberText(m.negociosActivos)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(m.vendido)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{numberText(m.ventas)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{numberText(m.pedidos)}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{numberText(m.mensajes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PlatformShell>
  );
}
