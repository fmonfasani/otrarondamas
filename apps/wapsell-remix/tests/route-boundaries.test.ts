import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const routesDirectory = fileURLToPath(new URL('../app/routes/', import.meta.url));
const routeFiles = readdirSync(routesDirectory);
const readRoute = (name: string) => readFileSync(new URL(`../app/routes/${name}`, import.meta.url), 'utf8');

describe('Remix route boundaries', () => {
  it('serves the public storefront through the customer layout at /', () => {
    expect(routeFiles).toContain('_customer.tsx');
    expect(routeFiles).toContain('_customer._index.tsx');
    expect(routeFiles).not.toContain('_index.tsx');
    expect(readRoute('_customer.tsx')).toContain('data-area="customer-experience"');
    expect(readRoute('_customer._index.tsx')).toContain('export async function loader');
  });

  it('keeps the login route public and removes the authenticated duplicate', () => {
    expect(routeFiles).toContain('$lang.auth.login.tsx');
    expect(routeFiles).not.toContain('_business.$lang.auth.login.tsx');
    expect(readRoute('$lang.auth.login.tsx')).toContain('loginWithNestJS');
  });

  it('nests business dashboard routes beneath the authenticated business layout', () => {
    for (const route of [
      '_business.$lang.dashboard._index.tsx',
      '_business.$lang.dashboard.pedidos.tsx',
      '_business.$lang.dashboard.pedidos.$id.tsx',
      '_business.$lang.dashboard.negocios.tsx',
      '_business.$lang.dashboard.productos.tsx',
    ]) expect(routeFiles).toContain(route);
    expect(routeFiles).not.toContain('$lang.dashboard._index.tsx');
    expect(routeFiles).not.toContain('$lang.dashboard.pedidos.tsx');
    expect(readRoute('_business.tsx')).toContain('requireAuth(request)');
    expect(readRoute('_business.tsx')).toContain('data-area="business-operations"');
  });

  it('keeps platform administration inside its privileged layout', () => {
    expect(routeFiles).toContain('_platform.tsx');
    expect(routeFiles).toContain('_platform.$lang.platform-admin._index.tsx');
    expect(routeFiles).not.toContain('$lang.platform-admin.tsx');
    expect(readRoute('_platform.tsx')).toContain('requireAuth(request)');
    expect(readRoute('_platform.tsx')).toContain('data-area="platform-admin"');
  });

  it('does not use browser-exposed VITE variables for server-side API requests', () => {
    for (const route of ['_business.tsx', '_platform.tsx', '_business.$lang.dashboard._index.tsx']) {
      expect(readRoute(route)).not.toContain('VITE_API_URL');
    }
    expect(readFileSync(new URL('../app/services/auth.server.ts', import.meta.url), 'utf8'))
      .not.toContain('VITE_API_URL');
    expect(readFileSync(new URL('../app/services/tenant.server.ts', import.meta.url), 'utf8'))
      .not.toContain('VITE_API_URL');
  });
});
