/**
 * Dashboard Layout Route
 * Parent layout for all authenticated dashboard routes
 * Supports owner/admin-only features with role-based navigation
 */

import { Outlet, Link, useParams, useLoaderData, useLocation } from '@remix-run/react';
import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { createProtectedLoader } from '~/utils/route-guards.server';
import { requireRole } from '~/utils/route-guards.server';

interface DashboardLoaderData {
  tenantContext: any;
  locale: string;
  empresas?: any[];
  userRole?: string;
  isOwnerOrAdmin?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles?: string[];
  badge?: string;
}

const dashboardLoader: LoaderFunction = async ({ request, params }) => {
  const protectedLoader = createProtectedLoader(
    async (context) => {
      try {
        // Check if user is owner or admin
        const isOwner = await requireRole(
          context.tenantContext,
          ['owner', 'admin'],
          context.token
        );

        return {
          empresas: context.tenantContext ? [context.tenantContext] : [],
          userRole: context.tenantContext.role || 'viewer',
          isOwnerOrAdmin: isOwner,
        };
      } catch (error) {
        console.error('[Dashboard Loader] Role check error:', error);
        return {
          empresas: context.tenantContext ? [context.tenantContext] : [],
          userRole: 'viewer',
          isOwnerOrAdmin: false,
        };
      }
    },
    { fallbackLocale: params.lang as string }
  );

  const result = await protectedLoader({ request, params } as any);

  if (result instanceof Response) {
    return result;
  }

  return result;
};

export const loader = dashboardLoader;

/**
 * Navigation configuration with role-based access
 */
function getNavigation(locale: 'es' | 'en', isOwnerOrAdmin: boolean): NavItem[] {
  const baseNav: NavItem[] = [
    {
      label: locale === 'es' ? 'Inicio' : 'Home',
      href: 'index',
      icon: '📊',
    },
    {
      label: locale === 'es' ? 'Pedidos' : 'Orders',
      href: 'pedidos',
      icon: '📦',
    },
    {
      label: locale === 'es' ? 'Productos' : 'Products',
      href: 'productos',
      icon: '🛍️',
    },
    {
      label: locale === 'es' ? 'Negocios' : 'Businesses',
      href: 'negocios',
      icon: '🏢',
    },
  ];

  if (isOwnerOrAdmin) {
    baseNav.push(
      {
        label: locale === 'es' ? 'Analytics' : 'Analytics',
        href: 'analytics',
        icon: '📈',
        roles: ['owner', 'admin'],
      },
      {
        label: locale === 'es' ? 'Usuarios' : 'Users',
        href: 'users',
        icon: '👥',
        roles: ['owner', 'admin'],
      },
      {
        label: locale === 'es' ? 'Configuración' : 'Settings',
        href: 'settings',
        icon: '⚙️',
        roles: ['owner', 'admin'],
      },
      {
        label: locale === 'es' ? 'Auditoría' : 'Audit',
        href: 'audit',
        icon: '📋',
        roles: ['owner', 'admin'],
      }
    );
  }

  return baseNav;
}

/**
 * Sidebar Navigation Component
 */
function DashboardSidebar({
  locale,
  tenantContext,
  navItems,
  currentPath,
}: {
  locale: 'es' | 'en';
  tenantContext: any;
  navItems: NavItem[];
  currentPath: string;
}) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-lg overflow-y-auto">
      {/* Logo Section */}
      <div className="px-6 py-8 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Wapsell</h1>
            <p className="text-xs text-gray-400">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Current Tenant Info */}
      {tenantContext && (
        <div className="px-6 py-4 border-b border-gray-700 bg-gray-800 bg-opacity-50">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            {locale === 'es' ? 'Negocio Actual' : 'Current Business'}
          </p>
          <p className="text-sm font-semibold text-white mt-1">
            {tenantContext.empresaId}
          </p>
          {tenantContext.role && (
            <span className="inline-block mt-2 px-2 py-1 bg-purple-600 text-xs font-medium rounded text-white">
              {tenantContext.role.toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Navigation Items */}
      <nav className="px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = currentPath.includes(item.href);
          return (
            <Link
              key={item.href}
              to={`/${locale}/dashboard/${item.href}`}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {item.badge && (
                <span className="ml-auto px-2 py-1 bg-red-500 text-xs font-bold rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 bg-gray-900">
        <form action={`/${locale}/auth/logout`} method="post" className="w-full">
          <button
            type="submit"
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
          >
            {locale === 'es' ? 'Cerrar Sesión' : 'Logout'}
          </button>
        </form>
      </div>
    </aside>
  );
}

/**
 * Top Navigation Bar Component
 */
function DashboardTopBar({
  locale,
  title,
}: {
  locale: 'es' | 'en';
  title: string;
}) {
  return (
    <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600 mt-1">
          {locale === 'es'
            ? 'Gestiona tu negocio de manera eficiente'
            : 'Manage your business efficiently'}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          title={locale === 'es' ? 'Notificaciones' : 'Notifications'}
        >
          <span className="text-xl">🔔</span>
        </button>
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          title={locale === 'es' ? 'Perfil' : 'Profile'}
        >
          <span className="text-xl">👤</span>
        </button>
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          title={locale === 'es' ? 'Más opciones' : 'More options'}
        >
          <span className="text-xl">⋮</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Breadcrumb Component
 */
function Breadcrumbs({ path, locale }: { path: string; locale: 'es' | 'en' }) {
  const segments = path
    .split('/')
    .filter(Boolean)
    .slice(2); // Skip locale and 'dashboard'

  if (segments.length === 0) return null;

  return (
    <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
      <Link to={`/${locale}/dashboard`} className="hover:text-gray-900 font-medium">
        Dashboard
      </Link>
      {segments.map((segment, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span>/</span>
          <span className="capitalize">{segment}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Main Dashboard Layout Component
 */
export default function DashboardLayout() {
  const { lang } = useParams();
  const { pathname } = useLocation();
  const { tenantContext, isOwnerOrAdmin } = useLoaderData<DashboardLoaderData>();
  const locale = (lang || 'es') as 'es' | 'en';

  const navItems = getNavigation(locale, isOwnerOrAdmin || false);
  const pageTitle = locale === 'es' ? 'Dashboard' : 'Dashboard';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar Navigation */}
      <DashboardSidebar
        locale={locale}
        tenantContext={tenantContext}
        navItems={navItems}
        currentPath={pathname}
      />

      {/* Main Content Area */}
      <main className="ml-64 p-8">
        {/* Top Bar */}
        <DashboardTopBar locale={locale} title={pageTitle} />

        {/* Breadcrumbs */}
        <Breadcrumbs path={pathname} locale={locale} />

        {/* Page Content */}
        <div className="space-y-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
