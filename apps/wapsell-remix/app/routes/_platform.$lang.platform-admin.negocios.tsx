import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useLoaderData, useParams } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { PlatformShell } from '~/components/platform/PlatformShell';
import { activityLabel, numberText, platformRequest, type BusinessList } from '~/utils/platform';
import { formatMoney } from '~/utils/format';

export const meta: MetaFunction = () => [{ title: 'Negocios · Plataforma · Wapsell' }];

/** Every Business on Wapsell with its size and activity (aggregates only, OR-B4-038). */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const url = new URL(request.url);
  const search = url.searchParams.get('q')?.trim() ?? '';
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const params = new URLSearchParams({ page: String(page), ...(search ? { search } : {}) });
  const list = await platformRequest<BusinessList>(token, `/businesses?${params}`);
  return json({ list, search });
}

export default function PlatformBusinesses() {
  const { list, search } = useLoaderData<typeof loader>();
  const { lang = 'es' } = useParams();
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const pageHref = (page: number) =>
    `?${new URLSearchParams({ page: String(page), ...(search ? { q: search } : {}) })}`;
  return (
    <PlatformShell
      title="Negocios"
      subtitle={`${numberText(list.total)} ${list.total === 1 ? 'negocio' : 'negocios'}${search ? ` con «${search}»` : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Form method="get" role="search" className="flex w-full max-w-xl gap-2">
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar por nombre o tienda"
            aria-label="Buscar negocios"
            className="min-w-0 flex-1 rounded-xl border border-[#e2ded6] bg-white px-4 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#211f1b] px-5 py-2.5 text-sm font-medium text-white"
          >
            Buscar
          </button>
        </Form>
        <Link
          to={`/${lang}/platform-admin/negocios/nuevo`}
          className="rounded-xl bg-[#d97757] px-5 py-2.5 text-sm font-semibold text-[#211f1b]"
        >
          Nuevo negocio
        </Link>
      </div>
      <section className="overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white shadow-sm">
        {list.items.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-[#96918a]">
            No hay negocios{search ? ' con esa búsqueda' : ''}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#faf9f6] text-xs uppercase tracking-wide text-[#96918a]">
                <tr>
                  <th className="px-6 py-3 font-medium">Negocio</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 text-right font-medium">Equipo</th>
                  <th className="px-4 py-3 text-right font-medium">Productos</th>
                  <th className="px-4 py-3 text-right font-medium">Clientes</th>
                  <th className="px-4 py-3 text-right font-medium">Vendido 30 días</th>
                  <th className="px-6 py-3 font-medium">Última actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ede7]">
                {list.items.map((b) => (
                  <tr key={b.id} className="hover:bg-[#fcfbf8]">
                    <td className="px-6 py-4">
                      <Link
                        to={`/${lang}/platform-admin/negocios/${b.id}`}
                        className="font-medium text-[#34312c] underline-offset-2 hover:underline"
                      >
                        {b.nombre}
                      </Link>
                      <span className="block text-xs text-[#96918a]">
                        /tienda/{b.slug} · alta {new Date(b.createdAt).toLocaleDateString('es-AR')}
                        {b.cobraOnline ? ' · cobra online' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#615c55]">
                      {b.owner ? (
                        <>
                          {b.owner.nombre}
                          <span className="block text-xs text-[#96918a]">{b.owner.email}</span>
                        </>
                      ) : (
                        <span className="text-[#b0aaa1]">Sin Owner</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums">{b.equipo}</td>
                    <td className="px-4 py-4 text-right tabular-nums">{numberText(b.productos)}</td>
                    <td className="px-4 py-4 text-right tabular-nums">{numberText(b.clientes)}</td>
                    <td className="px-4 py-4 text-right tabular-nums">
                      {formatMoney(b.vendido30)}
                    </td>
                    <td className="px-6 py-4 text-[#77736d]">{activityLabel(b.ultimaActividad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {pages > 1 ? (
        <nav className="flex items-center gap-3 text-sm" aria-label="Páginas">
          {list.page > 1 ? (
            <Link to={pageHref(list.page - 1)} className="underline">
              Anterior
            </Link>
          ) : null}
          <span className="text-[#77736d]">
            Página {list.page} de {pages}
          </span>
          {list.page < pages ? (
            <Link to={pageHref(list.page + 1)} className="underline">
              Siguiente
            </Link>
          ) : null}
        </nav>
      ) : null}
    </PlatformShell>
  );
}
