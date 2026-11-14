import type { ReactNode } from 'react';
import { Form, Link, NavLink, useLocation } from '@remix-run/react';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, Boxes, ChevronDown, CreditCard, House, LogOut, MessagesSquare, Package, Receipt, RotateCcw, ShoppingBag, Truck, UserCog, Users, Wallet } from 'lucide-react';
import { Logo } from '~/components/brand/Logo';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Roles that can use the section (mirrors the API role matrix); absent = every staff role. */
  roles?: readonly string[];
}

const SELLING = ['OWNER', 'ADMIN', 'VENDEDOR'] as const;
const MANAGERS = ['OWNER', 'ADMIN'] as const;

/** AS-IS role names the panel may receive, as canonical roles (OR-B4-027 alias). */
const CANONICAL_ROLE: Record<string, string> = { ASISTENTE_LOCAL: 'VENDEDOR' };

/**
 * Sections of the business panel, only the ones the person's role can use (the API still
 * authorizes every call; this only avoids offering screens that would answer "no access").
 * New sections are added here as they ship.
 */
export function navItems(lang: string, role?: string): NavItem[] {
  const base = `/${lang}/dashboard`;
  const all: NavItem[] = [
    { to: base, label: 'Inicio', icon: House, end: true },
    { to: `${base}/mensajes`, label: 'Mensajes', icon: MessagesSquare },
    { to: `${base}/pedidos`, label: 'Pedidos', icon: ShoppingBag },
    { to: `${base}/ventas`, label: 'Ventas', icon: Receipt, roles: SELLING },
    { to: `${base}/devoluciones`, label: 'Devoluciones', icon: RotateCcw },
    { to: `${base}/clientes`, label: 'Clientes', icon: Users, roles: SELLING },
    { to: `${base}/caja`, label: 'Caja', icon: Wallet, roles: SELLING },
    { to: `${base}/productos`, label: 'Catálogo', icon: Package },
    { to: `${base}/inventario`, label: 'Inventario', icon: Boxes },
    { to: `${base}/compras`, label: 'Compras', icon: Truck, roles: ['OWNER', 'ADMIN', 'GESTOR_DE_STOCK'] },
    { to: `${base}/reportes`, label: 'Reportes', icon: BarChart3, roles: MANAGERS },
    { to: `${base}/equipo`, label: 'Equipo', icon: UserCog, roles: MANAGERS },
    { to: `${base}/cobros`, label: 'Cobros', icon: CreditCard, roles: ['OWNER'] },
  ];
  if (role === undefined) return all;
  const canonical = CANONICAL_ROLE[role] ?? role;
  return all.filter((item) => !item.roles || item.roles.includes(canonical));
}

export interface ShellUser {
  nombre: string;
  empresaNombre: string;
  rol: string;
  /** RF-17: whether to tell the person their dossier blocks them (see dossierStanding). */
  dossier?: 'ok' | 'pending' | 'relogin';
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  ASISTENTE_LOCAL: 'Vendedor',
  GESTOR_DE_STOCK: 'Gestor de stock',
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * Business panel chrome, from the Figma messaging-center mockup (145:12487): a 64px
 * toolbar (logo, "Negocio / Sección", role pill, avatar) and a 64px icon rail. On mobile
 * the rail becomes a bottom tab bar.
 */
export function AppShell({ user, lang, children }: { user: ShellUser; lang: string; children: ReactNode }) {
  const items = navItems(lang, user.rol);
  const { pathname } = useLocation();
  const current =
    [...items].sort((a, b) => b.to.length - a.to.length).find((item) => pathname.startsWith(item.to)) ?? items[0];

  return (
    <div className="ws-panel">
      <header className="ws-panel__toolbar">
        <Logo variant="dark" href={items[0].to} />
        <span className="ws-panel__workspace">
          {user.empresaNombre} / {current.label}
          <ChevronDown size={14} aria-hidden="true" />
        </span>
        <div className="ws-panel__account">
          <span className="ws-chip ws-chip--success">{ROLE_LABELS[user.rol] ?? user.rol}</span>
          <details className="ws-panel__menu">
            <summary className="ws-avatar" aria-label={`Cuenta de ${user.nombre}`}>
              {initials(user.nombre)}
            </summary>
            <div className="ws-panel__menu-list">
              <p>
                <b>{user.nombre}</b>
                <span>{user.empresaNombre}</span>
              </p>
              <Link to={`/${lang}/dashboard/mi-legajo`} className="ws-panel__menu-link">
                Mi legajo
              </Link>
              <Form method="post" action="/logout">
                <button type="submit">
                  <LogOut size={16} aria-hidden="true" /> Cerrar sesión
                </button>
              </Form>
            </div>
          </details>
        </div>
      </header>

      <div className="ws-panel__body">
        <nav className="ws-panel__rail" aria-label="Secciones">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `ws-panel__nav${isActive ? ' is-active' : ''}`}
              title={item.label}
            >
              <item.icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <main className="ws-panel__main">
          <DossierNotice standing={user.dossier ?? 'ok'} lang={lang} onDossierPage={pathname.endsWith('/mi-legajo')} />
          {children}
        </main>
      </div>
    </div>
  );
}

/** Why the panel cannot load data for a person whose dossier is not approved yet. */
function DossierNotice({ standing, lang, onDossierPage }: Readonly<{ standing: string; lang: string; onDossierPage: boolean }>) {
  if (standing === 'pending' && !onDossierPage) {
    return (
      <p className="ws-alert ws-dossier-notice" role="alert">
        Todavía no podés operar: completá tu legajo y esperá que el Owner lo apruebe.{' '}
        <Link className="ws-link" to={`/${lang}/dashboard/mi-legajo`}>Completar mi legajo</Link>
      </p>
    );
  }
  if (standing === 'relogin') {
    return (
      <div className="ws-notice ws-dossier-notice" role="status">
        Tu legajo ya fue aprobado. Cerrá sesión y volvé a ingresar para empezar a operar.{' '}
        <Form method="post" action="/logout" className="ws-dossier-notice__form">
          <button type="submit" className="ws-link">Cerrar sesión</button>
        </Form>
      </div>
    );
  }
  return null;
}
