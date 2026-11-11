import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AppModule } from '../app.module';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { CANONICAL_PERMISSION_KEY, isPolicyMarker } from './canonical-permission.decorator';
import { isPermission } from './canonical-permissions';

type Ctor = abstract new (...args: never[]) => unknown;

/** Every controller reachable from AppModule (the routes that exist at runtime). */
function loadedControllers(): Ctor[] {
  const seen = new Set<unknown>();
  const controllers = new Set<Ctor>();
  const visit = (entry: unknown) => {
    if (!entry || seen.has(entry)) return;
    seen.add(entry);
    const candidate = entry as Record<string, unknown> & { forwardRef?: () => unknown };
    if (typeof candidate.forwardRef === 'function') return visit(candidate.forwardRef());
    // A module class, or a dynamic module `{ module, imports?, controllers? }`.
    const moduleClass = (candidate.module ?? entry) as object;
    const listOf = (key: 'imports' | 'controllers') => [
      ...((Reflect.getMetadata(key, moduleClass) as unknown[] | undefined) ?? []),
      ...((candidate[key] as unknown[] | undefined) ?? []),
    ];
    for (const controller of listOf('controllers')) controllers.add(controller as Ctor);
    for (const imported of listOf('imports')) visit(imported);
  };
  visit(AppModule);
  return [...controllers];
}

describe('endpoint authorization policy coverage (AUTH-10, #161 stage 3)', () => {
  const routes = loadedControllers().flatMap((controller) => {
    const proto = controller.prototype as Record<string, unknown>;
    return Object.getOwnPropertyNames(proto)
      .filter((name) => name !== 'constructor' && typeof proto[name] === 'function')
      .map((name) => ({ controller, name, handler: proto[name] as object }))
      .filter(({ handler }) => Reflect.getMetadata(METHOD_METADATA, handler) !== undefined)
      .map((route) => ({
        ...route,
        path: `${String(Reflect.getMetadata(PATH_METADATA, controller))} ${String(
          Reflect.getMetadata(PATH_METADATA, route.handler),
        )}`,
      }));
  });

  const declarationOf = (route: (typeof routes)[number]) =>
    Reflect.getMetadata(CANONICAL_PERMISSION_KEY, route.handler) ??
    Reflect.getMetadata(CANONICAL_PERMISSION_KEY, route.controller);
  const isPublic = (route: (typeof routes)[number]) =>
    Reflect.getMetadata(IS_PUBLIC_KEY, route.handler) === true ||
    Reflect.getMetadata(IS_PUBLIC_KEY, route.controller) === true;

  it('finds the routed handlers of the loaded modules', () => {
    expect(routes.length).toBeGreaterThan(100);
  });

  it('gives every non-public route a canonical policy', () => {
    const undeclared = routes
      .filter((route) => !isPublic(route) && declarationOf(route) === undefined)
      .map((route) => `${route.controller.name}.${route.name} (${route.path})`);
    expect(undeclared).toEqual([]);
  });

  it('only declares catalogue permissions, policy markers or body-dependent policies', () => {
    const invalid = routes
      .map((route) => ({ route, declared: declarationOf(route) as unknown }))
      .filter(({ declared }) => declared !== undefined)
      .filter(({ declared }) => {
        if (typeof declared === 'function') return false;
        if (Array.isArray(declared)) return !(declared.length > 0 && declared.every(isPermission));
        return !(isPolicyMarker(declared) || isPermission(String(declared)));
      })
      .map(({ route }) => `${route.controller.name}.${route.name}`);
    expect(invalid).toEqual([]);
  });
});
