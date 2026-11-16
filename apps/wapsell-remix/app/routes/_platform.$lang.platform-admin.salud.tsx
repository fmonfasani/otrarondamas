import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useParams } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { MetricCard, PlatformShell } from '~/components/platform/PlatformShell';
import {
  SEVERITY_NAMES,
  filterHealth,
  numberText,
  parseSeverity,
  platformRequest,
  type HealthReport,
  type Severity,
} from '~/utils/platform';

export const meta: MetaFunction = () => [{ title: 'Salud de negocios · Plataforma · Wapsell' }];

/** OR-B4-040 — Businesses that need attention, most urgent first. */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const severity = parseSeverity(new URL(request.url).searchParams.get('nivel'));
  const report = await platformRequest<HealthReport>(token, '/health');
  return json({ report, severity });
}

const TONE: Record<Severity, string> = {
  alta: 'border-[#e8b4a6] bg-[#fbeee9] text-[#9c3d27]',
  media: 'border-[#ecd9a8] bg-[#fbf5e4] text-[#7a5a12]',
  baja: 'border-[#e2ded6] bg-[#f7f6f2] text-[#615c55]',
};
const ICON: Record<Severity, string> = { alta: '!', media: '•', baja: 'i' };

export default function PlatformHealth() {
  const { report, severity } = useLoaderData<typeof loader>();
  const { lang = 'es' } = useParams();
  const items = filterHealth(report.items, severity);
  const filters: Array<[Severity | null, string]> = [
    [null, 'Todas'],
    ['alta', `${SEVERITY_NAMES.alta} (${report.resumen.alta})`],
    ['media', `${SEVERITY_NAMES.media} (${report.resumen.media})`],
    ['baja', `${SEVERITY_NAMES.baja} (${report.resumen.baja})`],
  ];
  return (
    <PlatformShell
      title="Salud de negocios"
      subtitle="Qué negocios necesitan ayuda y qué hacer, lo más urgente primero"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Negocios con algo para revisar"
          value={`${numberText(report.conAlertas)} de ${numberText(report.negocios)}`}
        />
        <MetricCard
          label="Urgentes"
          value={numberText(report.resumen.alta)}
          detail="El Owner no puede entrar o el negocio no tiene Owner"
        />
        <MetricCard
          label="Para atender"
          value={numberText(report.resumen.media)}
          detail="Sin actividad, sin productos, legajos o devoluciones esperando"
        />
      </div>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filtrar por gravedad">
        {filters.map(([value, name]) => (
          <Link
            key={name}
            to={value ? `?nivel=${value}` : '?'}
            aria-current={value === severity ? 'page' : undefined}
            className={`rounded-full border px-4 py-2 ${
              value === severity
                ? 'border-[#211f1b] bg-[#211f1b] text-white'
                : 'border-[#e2ded6] bg-white text-[#615c55]'
            }`}
          >
            {name}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-[#e8e4dc] bg-white px-6 py-10 text-center text-sm text-[#96918a]">
          Ningún negocio necesita atención{severity ? ' de este tipo' : ''}. Todo en orden.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((b) => (
            <li key={b.id} className="rounded-2xl border border-[#e8e4dc] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  to={`/${lang}/platform-admin/negocios/${b.id}`}
                  className="font-semibold text-[#34312c] underline-offset-2 hover:underline"
                >
                  {b.nombre}
                </Link>
                <span className="text-xs text-[#96918a]">/tienda/{b.slug}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {b.alertas.map((a) => (
                  <li
                    key={a.tipo}
                    className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${TONE[a.severidad]}`}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold"
                    >
                      {ICON[a.severidad]}
                    </span>
                    <span className="min-w-0">
                      <span className="font-semibold">{SEVERITY_NAMES[a.severidad]}:</span>{' '}
                      {a.detalle}
                      <span className="block text-[#615c55]">Qué hacer: {a.accion}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </PlatformShell>
  );
}
