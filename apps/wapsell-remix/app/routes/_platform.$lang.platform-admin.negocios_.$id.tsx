import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useParams } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { MetricCard, PlatformShell } from '~/components/platform/PlatformShell';
import { ROLE_NAMES, activityLabel, numberText, platformRequest, type BusinessDetail } from '~/utils/platform';
import { formatMoney } from '~/utils/format';

export const meta: MetaFunction<typeof loader> = ({ data }) => [{ title: `${data?.business.nombre ?? 'Negocio'} · Plataforma · Wapsell` }];

/**
 * One Business seen from the platform: totals only, never its customers (OR-B4-038).
 * Opening it is written to that Business's audit log by the API.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const business = await platformRequest<BusinessDetail>(token, `/businesses/${encodeURIComponent(params.id ?? '')}`);
  return json({ business, origin: new URL(request.url).origin });
}

export default function PlatformBusiness() {
  const { business: b, origin } = useLoaderData<typeof loader>();
  const { lang = 'es' } = useParams();
  const store = `${origin}/tienda/${b.slug}`;
  const sold30 = b.ultimos30.mostrador.total + b.ultimos30.tienda.total;
  return (
    <PlatformShell title={b.nombre} subtitle={`Alta ${new Date(b.createdAt).toLocaleDateString('es-AR')} · ${activityLabel(b.ultimaActividad)}`}>
      <Link to={`/${lang}/platform-admin/negocios`} className="text-sm text-[#77736d] underline">
        ← Negocios
      </Link>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Vendido en 30 días"
          value={formatMoney(sold30)}
          detail={`Mostrador ${formatMoney(b.ultimos30.mostrador.total)} (${b.ultimos30.mostrador.operaciones}) · tienda ${formatMoney(b.ultimos30.tienda.total)} (${b.ultimos30.tienda.operaciones})`}
        />
        <MetricCard label="Equipo" value={numberText(b.equipo)} detail="Miembros activos" />
        <MetricCard label="Productos activos" value={numberText(b.productos)} />
        <MetricCard label="Clientes" value={numberText(b.clientes)} detail={`${numberText(b.pedidos)} pedidos desde el comienzo`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#e8e4dc] bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Negocio</h2>
          <dl className="mt-4 grid grid-cols-[140px_1fr] gap-y-3 text-sm">
            <dt className="text-[#96918a]">Owner</dt>
            <dd>{b.owner ? `${b.owner.nombre} · ${b.owner.email}` : 'Sin Owner activo'}</dd>
            <dt className="text-[#96918a]">Tienda</dt>
            <dd>
              <a href={store} target="_blank" rel="noreferrer" className="underline">{store.replace(/^https?:\/\//, '')}</a>
            </dd>
            <dt className="text-[#96918a]">Teléfono</dt>
            <dd>{b.telefono || '—'}</dd>
            <dt className="text-[#96918a]">Dirección</dt>
            <dd>{b.direccion || '—'}</dd>
            <dt className="text-[#96918a]">Cobros online</dt>
            <dd>{b.cobraOnline ? 'Mercado Pago conectado' : 'No conectado'}</dd>
          </dl>
        </section>
        <section className="rounded-2xl border border-[#e8e4dc] bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Uso</h2>
          <dl className="mt-4 grid grid-cols-[180px_1fr] gap-y-3 text-sm">
            {Object.entries(b.equipoPorRol).map(([role, count]) => (
              <div key={role} className="contents">
                <dt className="text-[#96918a]">{ROLE_NAMES[role] ?? role}</dt>
                <dd className="tabular-nums">{count}</dd>
              </div>
            ))}
            <dt className="text-[#96918a]">Conversaciones</dt>
            <dd className="tabular-nums">{numberText(b.conversaciones)}</dd>
            <dt className="text-[#96918a]">Devoluciones</dt>
            <dd className="tabular-nums">{numberText(b.devoluciones)}</dd>
          </dl>
        </section>
      </div>
      <p className="text-xs text-[#96918a]">
        Solo totales: los datos de los clientes de este negocio no se muestran en la plataforma. Esta consulta queda registrada en la
        auditoría del negocio.
      </p>
    </PlatformShell>
  );
}
