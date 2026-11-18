import { redirect, type LoaderFunctionArgs } from '@remix-run/node';

/** ADR-IDN-010 — the panel moved from /:lang/dashboard to /panel. Old links keep working. */
export function loader({ request }: LoaderFunctionArgs) {
  return redirect(`/panel${new URL(request.url).search}`, 301);
}
