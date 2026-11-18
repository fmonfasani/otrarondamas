import { redirect, type LoaderFunctionArgs } from '@remix-run/node';

/**
 * ADR-IDN-010 — the panel moved from /:lang/dashboard/* to /panel/*. Old links, bookmarks and
 * installed apps keep working: same section, same query.
 */
export function loader({ request, params }: LoaderFunctionArgs) {
  const rest = (params['*'] ?? '').replace(/^\/+/, '');
  return redirect(`/panel${rest ? `/${rest}` : ''}${new URL(request.url).search}`, 301);
}
