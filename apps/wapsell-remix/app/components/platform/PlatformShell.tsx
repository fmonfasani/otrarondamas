import type { ReactNode } from 'react';
import { Form, NavLink, useParams } from '@remix-run/react';

const SECTIONS: Array<[string, string]> = [
  ['', 'Resumen'],
  ['/salud', 'Salud'],
  ['/rendimiento', 'Rendimiento'],
  ['/actividad', 'Actividad'],
  ['/uso', 'Uso de funciones'],
  ['/negocios', 'Negocios'],
  ['/auditoria', 'Auditoría'],
];

/** Frame of Wapsell platform administration (OR-B4-020, OR-B4-038): read-only for now. */
export function PlatformShell({
  title,
  subtitle,
  children,
}: Readonly<{ title: string; subtitle?: string; children: ReactNode }>) {
  const { lang = 'es' } = useParams();
  const base = `/${lang}/platform-admin`;
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex whitespace-nowrap rounded-xl px-4 py-3 ${isActive ? 'bg-[#fbf0e9] font-semibold text-[#b85c4a]' : 'text-[#615c55] hover:bg-[#f7f6f2]'}`;
  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#211f1b]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-[#e9e5dd] bg-white p-6 lg:flex lg:flex-col">
          <a href={base} className="text-2xl font-bold tracking-tight">
            wapsell<span className="text-[#d97757]">.</span>
          </a>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#99938b]">
            Plataforma
          </p>
          <nav className="mt-10 space-y-2 text-sm" aria-label="Plataforma">
            {SECTIONS.map(([path, name]) => (
              <NavLink key={path} to={`${base}${path}`} end={path === ''} className={link}>
                {name}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-xl bg-[#f7f6f2] p-4">
            <p className="text-xs font-semibold text-[#615c55]">Solo lectura</p>
            <p className="mt-1 text-xs text-[#99938b]">
              Totales por negocio, sin datos de sus clientes. Abrir o crear un negocio queda
              registrado en Auditoría.
            </p>
          </div>
        </aside>
        <section className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e9e5dd] bg-white px-5 py-4 sm:px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#99938b]">
                Wapsell · Plataforma
              </p>
              <h1 className="mt-1 text-lg font-semibold">{title}</h1>
              {subtitle ? <p className="text-sm text-[#77736d]">{subtitle}</p> : null}
            </div>
            <nav
              className="order-last -mx-1 flex w-full gap-1 overflow-x-auto text-sm lg:hidden"
              aria-label="Plataforma"
            >
              {SECTIONS.map(([path, name]) => (
                <NavLink key={path} to={`${base}${path}`} end={path === ''} className={link}>
                  {name}
                </NavLink>
              ))}
            </nav>
            <Form method="post" action="/logout" className="hidden sm:block">
              <button
                type="submit"
                className="rounded-full border border-[#e2ded6] px-4 py-2 text-xs font-medium text-[#615c55]"
              >
                Cerrar sesión
              </button>
            </Form>
          </header>
          <div className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function MetricCard({
  label,
  value,
  detail,
}: Readonly<{ label: string; value: string; detail?: string }>) {
  return (
    <article className="rounded-2xl border border-[#e8e4dc] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#77736d]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#211f1b]">{value}</p>
      {detail ? <p className="mt-2 text-xs text-[#96918a]">{detail}</p> : null}
    </article>
  );
}
