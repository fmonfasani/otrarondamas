import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { PlatformShell } from '~/components/platform/PlatformShell';
import { numberText, platformRequest, type AdoptionReport } from '~/utils/platform';

export const meta: MetaFunction = () => [{ title: 'Uso de funciones · Plataforma · Wapsell' }];

/** OR-B4-040 — how many Businesses use each part of Wapsell. */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  return json({ report: await platformRequest<AdoptionReport>(token, '/adoption') });
}

export default function PlatformAdoption() {
  const { report } = useLoaderData<typeof loader>();
  const groups = [
    {
      title: 'Lo que usaron en los últimos 30 días',
      rows: report.funciones.filter((f) => f.periodo === '30 días'),
    },
    {
      title: 'Lo que tienen configurado',
      rows: report.funciones.filter((f) => f.periodo !== '30 días'),
    },
  ];
  return (
    <PlatformShell
      title="Uso de funciones"
      subtitle={`Qué parte de Wapsell usa cada negocio, sobre ${numberText(report.negocios)} negocios`}
    >
      {groups.map((g) => (
        <section
          key={g.title}
          className="rounded-2xl border border-[#e8e4dc] bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="font-semibold">{g.title}</h2>
          <ul className="mt-5 space-y-5">
            {g.rows.map((f) => (
              <li key={f.clave}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-[#34312c]">{f.nombre}</span>
                  <span className="whitespace-nowrap tabular-nums text-[#615c55]">
                    <strong className="text-[#211f1b]">{f.porcentaje} %</strong> ·{' '}
                    {numberText(f.negocios)} {f.negocios === 1 ? 'negocio' : 'negocios'}
                  </span>
                </div>
                {/* The % is already in the text above; the bar is only visual. */}
                <div className="mt-2 h-2 rounded-full bg-[#f0ede7]" aria-hidden="true" data-uso-bar>
                  <div
                    className="h-2 rounded-full bg-[#d97757]"
                    style={{ width: `${f.porcentaje > 0 ? Math.max(2, f.porcentaje) : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-xs text-[#96918a]">
        Una función baja te dice qué explicar mejor: por ejemplo, si pocos cobran online, conviene
        mostrarles cómo conectar Mercado Pago.
      </p>
    </PlatformShell>
  );
}
