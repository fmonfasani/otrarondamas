import { redirect, type LoaderFunctionArgs } from '@remix-run/node';

/**
 * ADR-IDN-008 — the business sign-up moved to «Vendé en Wapsell» (/vender, two steps).
 * Old links and bookmarks keep working, query included (?google=…, ?error=…).
 */
export function loader({ request }: LoaderFunctionArgs) {
  return redirect(`/vender${new URL(request.url).search}`, 301);
}
