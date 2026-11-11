import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Remix flat routes: "_" prefixed segments are pathless layouts, "_index" is an index route,
// "$x" a param. Two files that resolve to the same URL make one of them unreachable (the
// storefront at _customer._index.tsx used to shadow the landing at "/").
const routesDir = fileURLToPath(new URL('../app/routes', import.meta.url));

function urlOf(file: string): string | null {
  const name = file.replace(/\.(tsx|ts)$/, '');
  const segments = name.split('.');
  // A trailing "_" ("pedidos_.$id") only opts out of layout nesting; the URL segment is "pedidos".
  const pathSegments = segments
    .filter((segment) => !segment.startsWith('_'))
    .map((segment) => segment.replace(/_$/, ''));
  const isIndex = segments[segments.length - 1] === '_index';
  return `/${pathSegments.join('/')}${isIndex ? '' : ''}`.replace(/\/$/, '') || '/';
}

describe('route table', () => {
  const files = readdirSync(routesDir).filter((file) => /\.(tsx|ts)$/.test(file));
  // Layout-only files (they render an Outlet) do not own a URL of their own.
  const layouts = new Set(
    files
      .map((file) => file.replace(/\.(tsx|ts)$/, ''))
      .filter((name) => files.some((other) => other.startsWith(`${name}.`) && other !== `${name}.tsx`)),
  );
  const leafRoutes = files.filter((file) => !layouts.has(file.replace(/\.(tsx|ts)$/, '')));

  it('has no two route files resolving to the same URL', () => {
    const byUrl = new Map<string, string[]>();
    for (const file of leafRoutes) {
      const url = urlOf(file);
      if (!url) continue;
      byUrl.set(url, [...(byUrl.get(url) ?? []), file]);
    }
    const collisions = [...byUrl.entries()].filter(([, owners]) => owners.length > 1);
    expect(collisions).toEqual([]);
  });

  it('serves the Wapsell landing at "/" and the storefront at "/tienda"', () => {
    expect(leafRoutes.filter((file) => urlOf(file) === '/')).toEqual(['_index.tsx']);
    expect(leafRoutes.filter((file) => urlOf(file) === '/tienda')).toEqual(['_customer.tienda.tsx']);
  });
});
