import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';

type PlatformOverview = {
  generatedAt: string;
  metrics: {
    businesses: number;
    users: number;
    customers: number;
    orders: number;
  };
  recentBusinesses: Array<{ id: string; nombre: string; createdAt: string }>;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const apiUrl = process.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Response('VITE_API_URL no está configurada', { status: 503 });
  }

  const response = await fetch(`${apiUrl}/platform-admin/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Response('Acceso restringido al equipo administrador de Wapsell.', {
      status: response.status,
    });
  }

  if (!response.ok) {
    throw new Response('No se pudo cargar la información de la plataforma.', {
      status: response.status,
    });
  }

  return json((await response.json()) as PlatformOverview);
}

const numberFormat = new Intl.NumberFormat('es-AR');

function MetricCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <article className="rounded-2xl border border-[#e8e4dc] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#77736d]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#211f1b]">
        {numberFormat.format(value)}
      </p>
      <p className="mt-2 text-xs text-[#96918a]">{detail}</p>
    </article>
  );
}

export default function PlatformAdminPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#211f1b]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-[#e9e5dd] bg-white p-6 lg:flex lg:flex-col">
          <a href="/" className="text-2xl font-bold tracking-tight">
            wapsell<span className="text-[#d97757]">.</span>
          </a>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#99938b]">
            Platform control
          </p>
          <nav className="mt-10 space-y-2 text-sm">
            <a href="/es/platform-admin" className="flex rounded-xl bg-[#fbf0e9] px-4 py-3 font-semibold text-[#b85c4a]">
              <span>Resumen</span>
            </a>
            <span className="block rounded-xl px-4 py-3 text-[#aaa49b]">Negocios</span>
            <span className="block rounded-xl px-4 py-3 text-[#aaa49b]">Usuarios</span>
            <span className="block rounded-xl px-4 py-3 text-[#aaa49b]">Suscripciones</span>
            <span className="block rounded-xl px-4 py-3 text-[#aaa49b]">Auditoría</span>
          </nav>
          <div className="mt-auto rounded-xl bg-[#f7f6f2] p-4">
            <p className="text-xs font-semibold text-[#615c55]">Wapsell SaaS</p>
            <p className="mt-1 text-xs text-[#99938b]">Administración de plataforma</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-[#e9e5dd] bg-white px-5 py-4 sm:px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#99938b]">Wapsell / Platform</p>
              <h1 className="mt-1 text-lg font-semibold">Administración SaaS</h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#dcebdd] bg-[#f2f8f1] px-3 py-2 text-xs font-medium text-[#47734a]">
              <span className="h-2 w-2 rounded-full bg-[#5b9b62]" />
              Datos conectados a NestJS
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm text-[#888279]">Centro de control de la plataforma</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight">Resumen general</h2>
                <p className="mt-2 text-sm text-[#77736d]">Indicadores obtenidos directamente de la API y PostgreSQL.</p>
              </div>
              <p className="text-xs text-[#99938b]">
                Actualizado {new Date(data.generatedAt).toLocaleString('es-AR')}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Negocios registrados" value={data.metrics.businesses} detail="Registros Business en la plataforma" />
              <MetricCard label="Usuarios internos" value={data.metrics.users} detail="Identidades de equipo registradas" />
              <MetricCard label="Compradores" value={data.metrics.customers} detail="Clientes registrados en comercios" />
              <MetricCard label="Pedidos" value={data.metrics.orders} detail="Pedidos registrados en la plataforma" />
            </div>

            <section className="overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#eeeae3] px-5 py-4 sm:px-6">
                <div>
                  <h3 className="font-semibold">Últimos negocios registrados</h3>
                  <p className="mt-1 text-xs text-[#96918a]">Datos reales de Empresa; sin métricas simuladas.</p>
                </div>
                <span className="rounded-full bg-[#f5f2ec] px-3 py-1 text-xs text-[#77736d]">
                  {data.recentBusinesses.length} registros
                </span>
              </div>
              {data.recentBusinesses.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-[#96918a]">Todavía no hay negocios registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-[#faf9f6] text-xs uppercase tracking-wide text-[#96918a]">
                      <tr>
                        <th className="px-6 py-3 font-medium">Negocio</th>
                        <th className="px-6 py-3 font-medium">Identificador</th>
                        <th className="px-6 py-3 font-medium">Fecha de alta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ede7]">
                      {data.recentBusinesses.map((business) => (
                        <tr key={business.id} className="hover:bg-[#fcfbf8]">
                          <td className="px-6 py-4 font-medium text-[#34312c]">{business.nombre}</td>
                          <td className="px-6 py-4 font-mono text-xs text-[#888279]">{business.id}</td>
                          <td className="px-6 py-4 text-[#77736d]">
                            {new Date(business.createdAt).toLocaleDateString('es-AR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
