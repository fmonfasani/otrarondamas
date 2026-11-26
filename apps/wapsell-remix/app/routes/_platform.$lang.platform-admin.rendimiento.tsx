import { useEffect } from 'react';
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useParams, useRevalidator } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { PlatformShell } from '~/components/platform/PlatformShell';
import { LineChart } from '~/components/platform/LineChart';
import { numberText, platformRequest } from '~/utils/platform';
import {
  LIGHTS,
  LIGHT_WORDS,
  RANGE_NAMES,
  perMinute,
  pointLabel,
  rangeKey,
  timeText,
  type Light,
  type PerformanceReport,
} from '~/utils/performance';

export const meta: MetaFunction = () => [{ title: 'Rendimiento · Plataforma · Wapsell' }];

/**
 * Rendimiento (Owner, 2026-11-26) — how Wapsell answers: right now, and the last hour, day,
 * week or month. The chat (messages, the team's reply time, people online, push), the API
 * (how long answers take, errors, slowest routes) and the Hetzner server (processors, memory,
 * disk, database). Only for the platform admins; aggregates only.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const range = rangeKey(new URL(request.url).searchParams.get('rango'));
  const report = await platformRequest<PerformanceReport>(token, `/performance?rango=${range}`);
  return json({ report, range });
}

const TONES: Record<Light, string> = {
  bien: 'bg-[#e6f4ea] text-[#1b5e30]',
  ojo: 'bg-[#fbf5e4] text-[#7a5a12]',
  problema: 'bg-[#fbeee9] text-[#9c3d27]',
};

function Gauge({ label, value, detail, light }: Readonly<{ label: string; value: string; detail?: string; light?: Light }>) {
  return (
    <article className="rounded-2xl border border-[#e8e4dc] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[#77736d]">{label}</p>
        {light ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[light]}`}>{LIGHT_WORDS[light]}</span> : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#211f1b]">{value}</p>
      {detail ? <p className="mt-2 text-xs text-[#96918a]">{detail}</p> : null}
    </article>
  );
}

export default function PlatformPerformance() {
  const { report, range } = useLoaderData<typeof loader>();
  const { lang = 'es' } = useParams();
  const revalidator = useRevalidator();
  // Live: the last hour refreshes itself every 15 seconds.
  useEffect(() => {
    if (range !== '1h') return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && revalidator.state === 'idle') revalidator.revalidate();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [range, revalidator]);

  const now = report.ahora;
  const totals = report.totales;
  const labels = report.serie.map((p) => pointLabel(p.at, range));
  const base = `/${lang}/platform-admin/rendimiento`;

  return (
    <PlatformShell title="Rendimiento" subtitle="Cómo responde Wapsell: el chat, la API y el servidor de Hetzner.">
      <nav className="flex flex-wrap gap-2" aria-label="Rango">
        {(Object.keys(RANGE_NAMES) as Array<keyof typeof RANGE_NAMES>).map((key) => (
          <Link
            key={key}
            to={key === '1h' ? base : `${base}?rango=${key}`}
            aria-current={key === range ? 'true' : undefined}
            className={`rounded-full border px-4 py-2 text-sm ${key === range ? 'border-[#d97757] bg-[#fbf0e9] font-semibold text-[#b85c4a]' : 'border-[#e2ded6] bg-white text-[#615c55]'}`}
          >
            {RANGE_NAMES[key]}
          </Link>
        ))}
        {range === '1h' ? <span className="self-center text-xs text-[#99938b]">Se actualiza solo cada 15 segundos.</span> : null}
      </nav>

      <section aria-labelledby="now-title" className="space-y-3">
        <h2 id="now-title" className="text-base font-semibold">Ahora (este minuto)</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Gauge
            label="Respuestas de la API"
            value={timeText(now.p95Ms)}
            detail={`El 95 % tardó menos que esto · mitad en ${timeText(now.p50Ms)} · ${numberText(now.requests)} pedidos`}
            light={now.requests ? LIGHTS.p95(now.p95Ms) : undefined}
          />
          <Gauge label="Conectados ahora" value={numberText(now.online)} detail="Personas con una pantalla de Wapsell abierta (equipo y clientes)" />
          <Gauge
            label="Procesadores del servidor"
            value={`${now.load1.toLocaleString('es-AR')} de ${now.cores}`}
            detail={`Carga del último minuto (${now.cores} = todos ocupados) · la API usa ${now.cpuPct.toLocaleString('es-AR')} % de uno`}
            light={LIGHTS.load(now.load1, now.cores)}
          />
          <Gauge
            label="Memoria del servidor"
            value={`${Math.round(now.memPct)} %`}
            detail={`De ${now.memTotalGb.toLocaleString('es-AR')} GB · la API usa ${Math.round(now.rssMb)} MB`}
            light={LIGHTS.memory(now.memPct)}
          />
          <Gauge
            label="Base de datos"
            value={timeText(now.dbPingMs)}
            detail={`Lo que tarda en contestar una pregunta mínima · ${now.dbConns} conexiones abiertas`}
            light={now.dbPingMs >= 0 ? LIGHTS.database(now.dbPingMs) : 'problema'}
          />
          <Gauge
            label="Disco del servidor"
            value={`${Math.round(now.diskPct)} %`}
            detail={`Usado de ${Math.round(now.diskTotalGb)} GB`}
            light={LIGHTS.disk(now.diskPct)}
          />
          <Gauge
            label="Corazón de la API"
            value={timeText(now.loopP99Ms)}
            detail="Lo más que estuvo trabada atendiendo algo (event loop). Si sube, todo se demora."
            light={LIGHTS.loop(now.loopP99Ms)}
          />
          <Gauge
            label="Errores del servidor"
            value={numberText(now.errors5xx)}
            detail={`Este minuto · ${numberText(now.errors4xx)} pedidos rechazados (permisos, datos mal cargados)`}
            light={now.errors5xx === 0 ? 'bien' : 'ojo'}
          />
        </div>
      </section>

      <section aria-labelledby="range-title" className="space-y-3">
        <h2 id="range-title" className="text-base font-semibold">{RANGE_NAMES[range]}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Gauge label="Pedidos atendidos" value={numberText(totals.requests)} detail={`${totals.errorPct.toLocaleString('es-AR')} % con error del servidor`} light={LIGHTS.errors(totals.errorPct)} />
          <Gauge label="Peor momento" value={timeText(totals.p95Ms)} detail="El minuto más lento (95 % de las respuestas)" light={totals.requests ? LIGHTS.p95(totals.p95Ms) : undefined} />
          <Gauge label="Mensajes del chat" value={numberText(totals.messages)} detail={`Escritos por personas · pico de ${numberText(totals.onlineMax)} conectados`} />
          <Gauge
            label="Respuesta del negocio"
            value={timeText(totals.replyP50Ms)}
            detail="Lo que tarda el equipo en contestar a un cliente (la mitad, en menos que esto; sin los automáticos)"
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <LineChart
            title="Tiempo de respuesta de la API"
            labels={labels}
            format={timeText}
            series={[
              { name: '95 %', color: '#d97757', values: report.serie.map((p) => p.p95Ms) },
              { name: 'Mitad', color: '#4f7cac', values: report.serie.map((p) => p.p50Ms) },
            ]}
          />
          <LineChart
            title="Pedidos por minuto"
            labels={labels}
            format={(v) => numberText(Math.round(v))}
            series={[
              { name: 'Pedidos', color: '#4f7cac', values: report.serie.map((p) => perMinute(p.requests, range)) },
              { name: 'Errores', color: '#c0392b', values: report.serie.map((p) => perMinute(p.errors5xx, range)) },
            ]}
          />
          <LineChart
            title="Servidor: procesadores y memoria"
            labels={labels}
            format={(v) => `${Math.round(v)} %`}
            series={[
              { name: 'Procesadores', color: '#d97757', values: report.serie.map((p) => Math.round((p.load1 / Math.max(1, now.cores)) * 100)) },
              { name: 'Memoria', color: '#6b8f71', values: report.serie.map((p) => p.memPct) },
            ]}
          />
          <LineChart
            title="Chat: mensajes y conectados"
            labels={labels}
            format={(v) => numberText(Math.round(v))}
            series={[
              { name: 'Mensajes', color: '#4f7cac', values: report.serie.map((p) => p.messages) },
              { name: 'Conectados', color: '#6b8f71', values: report.serie.map((p) => p.online) },
            ]}
          />
          <LineChart
            title="Chat: respuesta del negocio"
            labels={labels}
            format={timeText}
            series={[
              { name: 'Mitad', color: '#4f7cac', values: report.serie.map((p) => p.replyP50Ms) },
              { name: '95 %', color: '#d97757', values: report.serie.map((p) => p.replyP95Ms) },
            ]}
          />
          <LineChart
            title="Base de datos"
            labels={labels}
            format={timeText}
            series={[{ name: 'Pregunta mínima', color: '#6b8f71', values: report.serie.map((p) => p.dbPingMs) }]}
          />
        </div>
      </section>

      <section aria-labelledby="routes-title" className="space-y-3">
        <h2 id="routes-title" className="text-base font-semibold">Lo más lento {range === '1h' ? 'de la última hora' : 'de las últimas 24 horas'}</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#e8e4dc] bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[#efece6] text-xs uppercase tracking-wide text-[#99938b]">
              <tr>
                <th scope="col" className="px-4 py-3">Ruta</th>
                <th scope="col" className="px-4 py-3 text-right">Pedidos</th>
                <th scope="col" className="px-4 py-3 text-right">Promedio</th>
                <th scope="col" className="px-4 py-3 text-right">95 %</th>
                <th scope="col" className="px-4 py-3 text-right">Errores</th>
              </tr>
            </thead>
            <tbody>
              {report.rutas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-[#99938b]">Todavía no hay minutos guardados.</td>
                </tr>
              ) : (
                report.rutas.map((r) => (
                  <tr key={r.ruta} className="border-t border-[#f3f1ec]">
                    <td className="px-4 py-2 font-mono text-xs">{r.ruta}</td>
                    <td className="px-4 py-2 text-right">{numberText(r.cantidad)}</td>
                    <td className="px-4 py-2 text-right">{timeText(r.promedioMs)}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[LIGHTS.p95(r.p95Ms)]}`}>{timeText(r.p95Ms)}</span>
                    </td>
                    <td className="px-4 py-2 text-right">{r.errores ? numberText(r.errores) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#99938b]">
          Se guarda un resumen por minuto durante 30 días. Las rutas aparecen como patrón (sin datos de negocios ni de clientes).
        </p>
      </section>
    </PlatformShell>
  );
}
