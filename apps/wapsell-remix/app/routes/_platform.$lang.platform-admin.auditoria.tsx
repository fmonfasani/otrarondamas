import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useParams } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { PlatformShell } from '~/components/platform/PlatformShell';
import { AUDIT_ACTIONS, numberText, platformRequest, type PlatformAudit } from '~/utils/platform';

export const meta: MetaFunction = () => [{ title: 'Auditoría · Plataforma · Wapsell' }];

/** OR-B4-040 — what the Wapsell team did in the platform, newest first. */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const page = Math.max(1, Number(new URL(request.url).searchParams.get('page')) || 1);
  return json({ audit: await platformRequest<PlatformAudit>(token, `/audit?page=${page}`) });
}

export default function PlatformAuditPage() {
  const { audit } = useLoaderData<typeof loader>();
  const { lang = 'es' } = useParams();
  const pages = Math.max(1, Math.ceil(audit.total / audit.pageSize));
  return (
    <PlatformShell
      title="Auditoría de la plataforma"
      subtitle={`${numberText(audit.total)} ${audit.total === 1 ? 'registro' : 'registros'}: quién del equipo de Wapsell abrió o creó cada negocio`}
    >
      <section className="overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white shadow-sm">
        {audit.items.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-[#96918a]">
            Todavía no hay movimientos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#faf9f6] text-xs uppercase tracking-wide text-[#96918a]">
                <tr>
                  <th className="px-6 py-3 font-medium">Cuándo</th>
                  <th className="px-4 py-3 font-medium">Quién</th>
                  <th className="px-4 py-3 font-medium">Qué hizo</th>
                  <th className="px-6 py-3 font-medium">Negocio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ede7]">
                {audit.items.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-6 py-3 text-[#615c55]">
                      {new Date(r.fecha).toLocaleString('es-AR', {
                        timeZone: 'America/Argentina/Buenos_Aires',
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {r.quien ? (
                        <>
                          {r.quien.nombre}
                          <span className="block text-xs text-[#96918a]">{r.quien.email}</span>
                        </>
                      ) : (
                        <span className="text-[#b0aaa1]">Desconocido</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{AUDIT_ACTIONS[r.accion] ?? r.accion}</td>
                    <td className="px-6 py-3">
                      <Link
                        to={`/${lang}/platform-admin/negocios/${r.negocio.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {r.negocio.nombre}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-xs text-[#96918a]">
        Cada negocio también ve en su propia auditoría cuando el equipo de Wapsell lo abrió.
      </p>
      {pages > 1 ? (
        <nav className="flex items-center gap-3 text-sm" aria-label="Páginas">
          {audit.page > 1 ? (
            <Link to={`?page=${audit.page - 1}`} className="underline">
              Anterior
            </Link>
          ) : null}
          <span className="text-[#77736d]">
            Página {audit.page} de {pages}
          </span>
          {audit.page < pages ? (
            <Link to={`?page=${audit.page + 1}`} className="underline">
              Siguiente
            </Link>
          ) : null}
        </nav>
      ) : null}
    </PlatformShell>
  );
}
