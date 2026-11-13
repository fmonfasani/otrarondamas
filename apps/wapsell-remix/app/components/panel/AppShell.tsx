import type { ReactNode } from 'react';
import { Form, NavLink, useLocation } from '@remix-run/react';
import type { LucideIcon } from 'lucide-react';
import { Boxes, ChevronDown, CreditCard, House, LogOut, MessagesSquare, Package, Receipt, ShoppingBag, Truck, UserCog, Users, Wallet } from 'lucide-react';
import { Logo } from '~/components/brand/Logo';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

/** Sections of the business panel. New sections are added here as they ship. */
export function navItems(lang: string): NavItem[] {
  const base = `/${lang}/dashboard`;
  return [
    { to: base, label: 'Inicio', icon: House, end: true },
    { to: `${base}/mensajes`, label: 'Mensajes', icon: MessagesSquare },
    { to: `${base}/pedidos`, label: 'Pedidos', icon: ShoppingBag },
    { to: `${base}/ventas`, label: 'Ventas', icon: Receipt },
    { to: `${base}/clientes`, label: 'Clientes', icon: Users },
    { to: `${base}/caja`, label: 'Caja', icon: Wallet },
    { to: `${base}/productos`, label: 'Catálogo', icon: Package },
    { to: `${base}/inventario`, label: 'Inventario', icon: Boxes },
    { to: `${base}/compras`, label: 'Compras', icon: Truck },
    { to: `${base}/equipo`, label: 'Equipo', icon: UserCog },
    { to: `${base}/cobros`, label: 'Cobros', icon: CreditCard },
  ];
}

export interface ShellUser {
  nombre: string;
  empresaNombre: string;
  rol: string;
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
  const items = navItems(lang);
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
        <main className="ws-panel__main">{children}</main>
      </div>
    </div>
  );
}
