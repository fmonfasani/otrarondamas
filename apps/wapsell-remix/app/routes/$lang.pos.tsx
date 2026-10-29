/**
 * POS Layout Route
 * Parent layout for Point of Sale terminal and related sub-routes
 * Protected route requiring SELLER or OWNER role
 */

import { Outlet, Link, useParams, useLoaderData, useLocation } from '@remix-run/react';
import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { createProtectedLoader } from '~/utils/route-guards.server';
import { requireRole } from '~/utils/route-guards.server';
import type { Locale } from '~/types/routes';

interface POSLoaderData {
  tenantContext: any;
  locale: string;
  isSellerOrOwner?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const posLayoutLoader: LoaderFunction = async ({ request, params }) => {
  const protectedLoader = createProtectedLoader(
    async (context) => {
      try {
        // Check if user is seller or owner
        const isSellerOrOwner = await requireRole(
          context.tenantContext,
          ['seller', 'owner', 'admin'],
          context.token
        );

        if (!isSellerOrOwner) {
          throw new Response('Forbidden: User must be SELLER or OWNER', {
            status: 403,
          });
        }

        return {
          isSellerOrOwner,
        };
      } catch (error) {
        console.error('[POS Layout Loader] Role check error:', error);
        if (error instanceof Response) {
          return error;
        }
        throw error;
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

export const loader = posLayoutLoader;

/**
 * Navigation configuration for POS
 */
function getPOSNavigation(locale: Locale): NavItem[] {
  return [
    {
      label: locale === 'es' ? 'Terminal' : 'Terminal',
      href: 'index',
      icon: '🛒',
    },
    {
      label: locale === 'es' ? 'Inventario' : 'Inventory',
      href: 'inventory',
      icon: '📦',
    },
    {
      label: locale === 'es' ? 'Historial de Ventas' : 'Sales History',
      href: 'sales',
      icon: '📊',
    },
  ];
}

/**
 * Mobile Header Navigation Component
 */
function POSMobileNav({
  locale,
  navItems,
  currentPath,
}: {
  locale: Locale;
  navItems: NavItem[];
  currentPath: string;
}) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <nav className="flex justify-around">
        {navItems.map((item) => {
          const isActive = currentPath.includes(item.href);
          return (
            <Link
              key={item.href}
              to={`/${locale}/pos/${item.href}`}
              className={`flex flex-col items-center justify-center py-3 px-4 flex-1 text-xs transition ${
                isActive
                  ? 'text-blue-600 border-t-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Desktop Sidebar Navigation Component
 */
function POSSidebar({
  locale,
  tenantContext,
  navItems,
  currentPath,
}: {
  locale: Locale;
  tenantContext: any;
  navItems: NavItem[];
  currentPath: string;
}) {
  return (
    <aside className="hidden md:fixed md:left-0 md:top-0 md:h-screen md:w-64 md:bg-gradient-to-b md:from-gray-900 md:to-gray-800 md:text-white md:shadow-lg md:overflow-y-auto md:z-50">
      {/* Logo Section */}
      <div className="px-6 py-8 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Wapsell</h1>
            <p className="text-xs text-gray-400">
              {locale === 'es' ? 'Terminal POS' : 'POS Terminal'}
            </p>
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
          {tenantContext.name && (
            <p className="text-xs text-gray-300 mt-1">{tenantContext.name}</p>
          )}
        </div>
      )}

      {/* Navigation Items */}
      <nav className="px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = currentPath.includes(`/pos/${item.href}`);
          return (
            <Link
              key={item.href}
              to={`/${locale}/pos/${item.href}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 bg-gray-900">
        <Link
          to={`/${locale}/dashboard`}
          className="w-full px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition text-center block"
        >
          {locale === 'es' ? 'Volver' : 'Back'}
        </Link>
      </div>
    </aside>
  );
}

/**
 * POS Top Bar Component
 */
function POSTopBar({
  locale,
  title,
}: {
  locale: Locale;
  title: string;
}) {
  return (
    <div className="hidden md:flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600 mt-1">
          {locale === 'es'
            ? 'Gestiona tus ventas eficientemente'
            : 'Manage your sales efficiently'}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          title={locale === 'es' ? 'Ayuda' : 'Help'}
        >
          <span className="text-xl">❓</span>
        </button>
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          title={locale === 'es' ? 'Configuración' : 'Settings'}
        >
          <span className="text-xl">⚙️</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Main POS Layout Component
 */
export default function POSLayout() {
  const { lang } = useParams();
  const { pathname } = useLocation();
  const { tenantContext, isSellerOrOwner } = useLoaderData<POSLoaderData>();
  const locale = (lang || 'es') as Locale;

  if (!isSellerOrOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {locale === 'es' ? 'Acceso Denegado' : 'Access Denied'}
          </h1>
          <p className="text-gray-600 mt-2">
            {locale === 'es'
              ? 'Necesitas ser VENDEDOR u OWNER para acceder al POS'
              : 'You must be a SELLER or OWNER to access POS'}
          </p>
          <Link
            to={`/${locale}/dashboard`}
            className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {locale === 'es' ? 'Volver al Dashboard' : 'Back to Dashboard'}
          </Link>
        </div>
      </div>
    );
  }

  const navItems = getPOSNavigation(locale);
  const pageTitle = locale === 'es' ? 'Terminal POS' : 'POS Terminal';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <POSSidebar
        locale={locale}
        tenantContext={tenantContext}
        navItems={navItems}
        currentPath={pathname}
      />

      {/* Main Content Area */}
      <main className="md:ml-64 pb-24 md:pb-8">
        <div className="p-4 md:p-8">
          {/* Desktop Top Bar */}
          <POSTopBar locale={locale} title={pageTitle} />

          {/* Page Content */}
          <div className="space-y-6">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <POSMobileNav
        locale={locale}
        navItems={navItems}
        currentPath={pathname}
      />
    </div>
  );
}
