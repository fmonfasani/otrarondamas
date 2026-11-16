import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useParams } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { MetricCard, PlatformShell } from '~/components/platform/PlatformShell';
import { numberText, platformRequest, type PlatformOverview } from '~/utils/platform';
import { formatDateTime } from '~/utils/format';

export const meta: MetaFunction = () => [{ title: 'Plataforma · Wapsell' }];

/** Platform overview: how many Businesses, team members, customers and orders Wapsell has. */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  return json(await platformRequest<PlatformOverview>(token, '/overview'));
}

export default function PlatformOverviewPage() {
  const data = useLoaderData<typeof loader>();
  const { lang = 'es' } = useParams();
  return (
    <PlatformShell title="Resumen" subtitle={`Actualizado ${formatDateTime(data.generatedAt)}`}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Negocios"
          value={numberText(data.metrics.businesses)}
          detail={`${numberText(data.metrics.newBusinesses)} nuevos en los últimos 30 días`}
        />
        <MetricCard label="Personas en equipos" value={numberText(data.metrics.users)} detail="Miembros activos de algún negocio" />
        <MetricCard label="Clientes de los negocios" value={numberText(data.metrics.customers)} detail="Registrados en todas las tiendas" />
        <MetricCard label="Pedidos" value={numberText(data.metrics.orders)} detail="Desde el comienzo" />
      </div>
      <section className="overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#eeeae3] px-5 py-4 sm:px-6">
          <h2 className="font-semibold">Últimos negocios creados</h2>
          <Link to={`/${lang}/platform-admin/negocios`} className="text-sm font-medium text-[#b85c4a] underline">
            Ver todos
          </Link>
        </div>
        {data.recentBusinesses.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-[#96918a]">Todavía no hay negocios.</p>
        ) : (
          <ul className="divide-y divide-[#f0ede7]">
            {data.recentBusinesses.map((b) => (
              <li key={b.id}>
                <Link to={`/${lang}/platform-admin/negocios/${b.id}`} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-[#fcfbf8]">
                  <span>
                    <b className="font-medium text-[#34312c]">{b.nombre}</b>
                    <span className="block text-xs text-[#96918a]">/tienda/{b.slug}</span>
                  </span>
                  <span className="text-sm text-[#77736d]">{new Date(b.createdAt).toLocaleDateString('es-AR')}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PlatformShell>
  );
}
