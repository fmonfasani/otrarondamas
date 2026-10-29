/**
 * Route Type Definitions
 * Type-safe route handling across the Wapsell Remix app
 */

/**
 * Supported locales
 */
export type Locale = 'es' | 'en';

/**
 * Route parameters with locale
 */
export interface LocaleParams {
  lang: Locale;
}

/**
 * Dashboard route params
 */
export interface DashboardParams extends LocaleParams {
  section?: string;
  id?: string;
}

/**
 * Protected route params
 */
export interface ProtectedRouteParams extends LocaleParams {
  empresaId?: string;
}

/**
 * Navigation path constants
 */
export const ROUTES = {
  // Public routes
  ROOT: '/',
  LANDING: {
    es: '/es',
    en: '/en',
  },

  // Auth routes
  AUTH: {
    LOGIN: (locale: Locale = 'es') => `/${locale}/auth/login`,
    REGISTER: (locale: Locale = 'es') => `/${locale}/auth/register`,
    ONBOARDING: (locale: Locale = 'es') => `/${locale}/auth/onboarding`,
    LOGOUT: (locale: Locale = 'es') => `/${locale}/logout`,
  },

  // Dashboard routes
  DASHBOARD: {
    HOME: (locale: Locale = 'es') => `/${locale}/dashboard`,
    ORDERS: (locale: Locale = 'es') => `/${locale}/dashboard/pedidos`,
    ORDER_DETAIL: (locale: Locale = 'es', id: string) => `/${locale}/dashboard/pedidos/${id}`,
    PRODUCTS: (locale: Locale = 'es') => `/${locale}/dashboard/productos`,
    BUSINESSES: (locale: Locale = 'es') => `/${locale}/dashboard/negocios`,
  },

  // POS routes
  POS: {
    TERMINAL: (locale: Locale = 'es') => `/${locale}/pos`,
    ORDERS: (locale: Locale = 'es') => `/${locale}/pos/orders`,
  },

  // Store routes
  STORE: {
    HOME: (locale: Locale = 'es') => `/${locale}/tienda`,
    PRODUCTS: (locale: Locale = 'es') => `/${locale}/tienda/productos`,
    CART: (locale: Locale = 'es') => `/${locale}/tienda/carrito`,
  },

  // Admin routes
  ADMIN: {
    HOME: (locale: Locale = 'es') => `/${locale}/admin`,
    USERS: (locale: Locale = 'es') => `/${locale}/admin/usuarios`,
    PERMISSIONS: (locale: Locale = 'es') => `/${locale}/admin/permisos`,
    SETTINGS: (locale: Locale = 'es') => `/${locale}/admin/configuracion`,
    AUDIT: (locale: Locale = 'es') => `/${locale}/admin/auditoria`,
  },

  // API routes
  API: {
    HEALTH: '/api/health',
    STREAM: '/api/stream',
  },
} as const;

/**
 * Get current locale from URL params
 */
export function getCurrentLocale(params?: { lang?: string }): Locale {
  if (!params?.lang) return 'es';
  return params.lang === 'en' ? 'en' : 'es';
}

/**
 * Helper to create locale-aware URLs
 */
export function createUrl(
  path: string,
  locale?: Locale,
  queryParams?: Record<string, string>
): string {
  const finalLocale = locale || 'es';
  let url = path.includes('/') ? path : `/${finalLocale}${path}`;

  if (!url.includes(`/${finalLocale}`)) {
    url = `/${finalLocale}${url}`;
  }

  if (queryParams) {
    const query = new URLSearchParams(queryParams).toString();
    url += `?${query}`;
  }

  return url;
}

/**
 * Locale-aware navigation helpers
 */
export const navigate = {
  home: (locale: Locale = 'es') => ROUTES.LANDING[locale],
  login: (locale: Locale = 'es') => ROUTES.AUTH.LOGIN(locale),
  register: (locale: Locale = 'es') => ROUTES.AUTH.REGISTER(locale),
  onboarding: (locale: Locale = 'es') => ROUTES.AUTH.ONBOARDING(locale),
  dashboard: (locale: Locale = 'es') => ROUTES.DASHBOARD.HOME(locale),
  pos: (locale: Locale = 'es') => ROUTES.POS.TERMINAL(locale),
  store: (locale: Locale = 'es') => ROUTES.STORE.HOME(locale),
  admin: (locale: Locale = 'es') => ROUTES.ADMIN.HOME(locale),
};

/**
 * Determine if a route is public (no auth required)
 */
export function isPublicRoute(pathname: string): boolean {
  const publicPaths = [
    '/',
    '/es',
    '/en',
    '/es/auth',
    '/en/auth',
    '/es/tienda',
    '/en/tienda',
    '/api/health',
  ];

  return publicPaths.some(
    path => pathname === path || pathname.startsWith(path + '/')
  );
}

/**
 * Determine if a route is protected (auth required)
 */
export function isProtectedRoute(pathname: string): boolean {
  const protectedPatterns = [
    '/es/dashboard',
    '/en/dashboard',
    '/es/pos',
    '/en/pos',
    '/es/admin',
    '/en/admin',
  ];

  return protectedPatterns.some(pattern => pathname.startsWith(pattern));
}
