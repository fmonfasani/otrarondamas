import { redirect, type LoaderFunctionArgs } from '@remix-run/node';

/**
 * The section is called Mercadería since OR-B4-046 (the Catálogo is what the store shows).
 * Old links, bookmarks and the manual keep working, with their filters.
 */
export function loader({ request }: LoaderFunctionArgs) {
  return redirect(`/panel/mercaderia${new URL(request.url).search}`, 301);
}
