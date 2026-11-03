import Link from 'next/link';

type Audience = {
  number: string;
  title: string;
  description: string;
  examples: string;
  accent: string;
};

const audiences: Audience[] = [
  {
    number: '01',
    title: 'Dueños de negocios',
    description:
      'Organizá la operación de tu negocio y conectá las tareas comerciales en un solo lugar.',
    examples: 'Catálogo · Ventas · Pedidos · Equipo',
    accent: 'from-[#D97757]/15 to-[#D97757]/[0.03]',
  },
  {
    number: '02',
    title: 'Red de colaboradores',
    description:
      'Conectá tu trabajo con los negocios: vendedores, proveedores y repartidores.',
    examples: 'Colaboración · Abastecimiento · Entregas',
    accent: 'from-[#6A9BCC]/15 to-[#6A9BCC]/[0.03]',
  },
  {
    number: '03',
    title: 'Clientes',
    description:
      'Encontrá lo que necesitás, consultá y seguí tus compras con una experiencia simple.',
    examples: 'Descubrimiento · Consultas · Compras',
    accent: 'from-[#7C9B83]/15 to-[#7C9B83]/[0.03]',
  },
];

function BrandMark() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D97757] text-lg font-black text-white shadow-sm">
      W
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#FAF9F5] text-[#1A1815]">
      <header className="relative z-10 border-b border-[#1A1815]/[0.07] bg-[#FAF9F5]/95">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Wapsell, inicio" className="flex items-center gap-3">
            <BrandMark />
            <span className="text-[1.45rem] font-extrabold tracking-[-0.06em]">wapsell</span>
          </Link>

          <nav aria-label="Navegación principal" className="hidden items-center gap-8 text-sm font-medium text-[#625C56] md:flex">
            <a href="#plataforma" className="transition-colors hover:text-[#D97757]">La plataforma</a>
            <a href="#ecosistema" className="transition-colors hover:text-[#D97757]">Para quién</a>
            <a href="#como-funciona" className="transition-colors hover:text-[#D97757]">Cómo funciona</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-[#403A35] transition-colors hover:bg-[#1A1815]/[0.05] sm:inline-flex"
            >
              Ingresar
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[#D97757] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_7px_18px_rgba(217,119,87,0.2)] transition hover:-translate-y-0.5 hover:bg-[#C86543]"
            >
              Crear cuenta <ArrowIcon />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="plataforma" className="relative isolate">
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-0 -z-10 h-[520px] w-[520px] rounded-full bg-[#D97757]/[0.09] blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-48 bottom-0 -z-10 h-[420px] w-[420px] rounded-full bg-[#6A9BCC]/[0.08] blur-3xl" />

          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:pt-28">
            <div className="max-w-2xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#D97757]/25 bg-white/70 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.13em] text-[#A95035]">
                <span className="h-2 w-2 rounded-full bg-[#D97757]" />
                Una plataforma. Todo conectado.
              </div>

              <h1 className="max-w-[720px] text-[2.85rem] font-extrabold leading-[1.04] tracking-[-0.065em] sm:text-6xl lg:text-[4.35rem]">
                El comercio funciona mejor cuando <span className="text-[#D97757]">todos están conectados.</span>
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-8 text-[#69625B] sm:text-xl">
                Wapsell conecta negocios, colaboradores y clientes en una misma experiencia comercial. Menos fricción para trabajar, vender y comprar.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/signup"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#D97757] px-7 text-base font-bold text-white shadow-[0_12px_28px_rgba(217,119,87,0.23)] transition hover:-translate-y-0.5 hover:bg-[#C86543]"
                >
                  Empezar con Wapsell <ArrowIcon />
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#D8D1C9] bg-white/70 px-7 text-base font-semibold text-[#403A35] transition hover:border-[#D97757]/50 hover:bg-white"
                >
                  Ya tengo una cuenta
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[#1A1815]/10 pt-7 text-sm text-[#777069]">
                <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#D97757]" /> Para negocios</span>
                <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#6A9BCC]" /> Para colaboradores</span>
                <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#7C9B83]" /> Para clientes</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[570px]">
              <div aria-hidden="true" className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-[#D97757]/15 via-transparent to-[#6A9BCC]/15 blur-xl" />
              <div className="relative overflow-hidden rounded-[1.8rem] border border-[#E7E0D8] bg-white shadow-[0_28px_90px_rgba(54,42,31,0.12)]">
                <div className="flex items-center justify-between border-b border-[#EEE9E3] px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-2.5">
                    <BrandMark />
                    <div>
                      <p className="text-sm font-bold tracking-tight">Tu espacio de trabajo</p>
                      <p className="text-xs text-[#8A837C]">Una vista conectada del negocio</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#F8F2EE] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#A95035]">Vista conceptual</span>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#999189]">Panel principal</p>
                      <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.045em]">Todo en movimiento.</h2>
                    </div>
                    <span className="mb-1 rounded-lg border border-[#EAE5DF] px-2.5 py-1.5 text-[10px] font-semibold text-[#777069]">Tu negocio</span>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-2.5">
                    <div className="rounded-2xl bg-[#FAF5F1] p-3 sm:p-4">
                      <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-xl bg-[#D97757]/15 text-[#B75C3D]">
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16l-1.5 13h-13L4 7Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>
                      </div>
                      <p className="text-[11px] text-[#817970]">Catálogo</p>
                      <p className="mt-1 text-sm font-bold">Productos</p>
                    </div>
                    <div className="rounded-2xl bg-[#F1F6FA] p-3 sm:p-4">
                      <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-xl bg-[#6A9BCC]/15 text-[#4779A5]">
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5" /></svg>
                      </div>
                      <p className="text-[11px] text-[#817970]">Comercial</p>
                      <p className="mt-1 text-sm font-bold">Pedidos</p>
                    </div>
                    <div className="rounded-2xl bg-[#F1F5F0] p-3 sm:p-4">
                      <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-xl bg-[#7C9B83]/15 text-[#54765B]">
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" /><circle cx="10" cy="7" r="3" /><path d="M17 11a3 3 0 1 0-1-5.8M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35" /></svg>
                      </div>
                      <p className="text-[11px] text-[#817970]">Personas</p>
                      <p className="mt-1 text-sm font-bold">Equipo</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-[#EEE9E3] p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">Un flujo, distintas personas</p>
                      <span className="text-[10px] font-semibold text-[#999189]">ECOSISTEMA</span>
                    </div>
                    <div className="mt-5 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center">
                      <div className="rounded-xl bg-[#FAF5F1] px-2 py-3">
                        <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#D97757]/15 text-xs font-bold text-[#A95035]">N</span>
                        <p className="mt-2 text-[11px] font-bold">Negocio</p>
                      </div>
                      <ArrowIcon />
                      <div className="rounded-xl bg-[#F1F6FA] px-2 py-3">
                        <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#6A9BCC]/15 text-xs font-bold text-[#4779A5]">C</span>
                        <p className="mt-2 text-[11px] font-bold">Colaboradores</p>
                      </div>
                      <ArrowIcon />
                      <div className="rounded-xl bg-[#F1F5F0] px-2 py-3">
                        <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#7C9B83]/15 text-xs font-bold text-[#54765B]">CL</span>
                        <p className="mt-2 text-[11px] font-bold">Clientes</p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-center text-[11px] leading-5 text-[#9A938B]">Interfaz ilustrativa. Las funcionalidades se habilitan progresivamente.</p>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-[#E7E0D8] bg-white px-4 py-3 shadow-lg sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#999189]">Una sola plataforma</p>
                <p className="mt-1 text-sm font-bold">Cada persona, su experiencia</p>
              </div>
            </div>
          </div>
        </section>

        <section id="ecosistema" className="border-y border-[#E9E3DC] bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B75C3D]">Un ecosistema comercial</p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-0.055em] sm:text-5xl">Una experiencia pensada para cada persona.</h2>
              <p className="mt-5 text-base leading-7 text-[#716A63] sm:text-lg">Cada participante tiene objetivos distintos. Wapsell busca reunirlos sin obligarlos a trabajar de la misma manera.</p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {audiences.map((audience) => (
                <article key={audience.number} className="group relative overflow-hidden rounded-[1.5rem] border border-[#EAE5DF] bg-[#FAF9F5] p-7 transition duration-300 hover:-translate-y-1 hover:border-[#D97757]/40 hover:shadow-[0_18px_45px_rgba(54,42,31,0.08)] sm:p-8">
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${audience.accent}`} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-[0.14em] text-[#A49C93]">{audience.number}</span>
                    <span className="h-10 w-10 rounded-2xl border border-[#E7E0D8] bg-white" />
                  </div>
                  <h3 className="mt-8 text-xl font-extrabold tracking-[-0.035em]">{audience.title}</h3>
                  <p className="mt-3 min-h-[84px] text-sm leading-6 text-[#716A63]">{audience.description}</p>
                  <div className="mt-6 border-t border-[#E7E0D8] pt-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A49C93]">Enfoque</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-[#514A44]">{audience.examples}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B75C3D]">De la conexión a la operación</p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-0.055em] sm:text-4xl">Un punto de partida común. Experiencias específicas.</h2>
              <p className="mt-5 text-base leading-7 text-[#716A63]">El acceso comienza identificando qué necesitás hacer. Después, cada recorrido tendrá sus propios permisos, herramientas y pasos de incorporación.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E7E0D8] bg-white p-5">
                <span className="text-xs font-bold text-[#D97757]">PASO 01</span>
                <h3 className="mt-4 text-base font-bold">Elegís tu perfil</h3>
                <p className="mt-2 text-sm leading-6 text-[#777069]">Negocio, colaboración o compra.</p>
              </div>
              <div className="rounded-2xl border border-[#E7E0D8] bg-white p-5">
                <span className="text-xs font-bold text-[#D97757]">PASO 02</span>
                <h3 className="mt-4 text-base font-bold">Accedés a tu espacio</h3>
                <p className="mt-2 text-sm leading-6 text-[#777069]">Una experiencia adecuada a tu actividad.</p>
              </div>
              <div className="rounded-2xl border border-[#E7E0D8] bg-white p-5">
                <span className="text-xs font-bold text-[#D97757]">PASO 03</span>
                <h3 className="mt-4 text-base font-bold">Empezás a operar</h3>
                <p className="mt-2 text-sm leading-6 text-[#777069]">Conectás personas y actividad comercial.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="acceso" className="px-5 pb-20 sm:px-8 sm:pb-24">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#1A1815] px-7 py-12 text-white sm:px-12 sm:py-16">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F0A184]">Tu próximo paso empieza acá</p>
                <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-0.05em] sm:text-4xl">Conectá tu actividad con Wapsell.</h2>
                <p className="mt-4 text-sm leading-7 text-white/65 sm:text-base">Creá tu cuenta o ingresá si ya formás parte de la plataforma.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <Link href="/auth/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#D97757] px-6 text-sm font-bold text-white transition hover:bg-[#C86543]">Crear cuenta <ArrowIcon /></Link>
                <Link href="/auth/login" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition hover:bg-white/10">Iniciar sesión</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1A1815]/10 bg-[#F4F1EB]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-[#777069] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-[-0.04em] text-[#1A1815]">
            <BrandMark /> wapsell
          </Link>
          <p className="text-xs">© {new Date().getFullYear()} Wapsell. Plataforma de conexión comercial.</p>
          <div className="flex gap-5 text-xs font-medium">
            <Link href="/auth/login" className="hover:text-[#D97757]">Ingresar</Link>
            <Link href="/auth/signup" className="hover:text-[#D97757]">Crear cuenta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
