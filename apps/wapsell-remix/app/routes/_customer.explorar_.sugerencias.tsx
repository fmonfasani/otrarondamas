import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { fetchExplorerSuggestions } from '~/services/store.server';

/**
 * Marketplace, step 3 — suggestions while the customer types in Wapsell's search box (JSON). From
 * two letters; a failure simply suggests nothing, the search itself still works. The answer
 * carries the text it answers, so the box never shows suggestions of what was typed before.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 100);
  const none = { q, productos: [], negocios: [], marcas: [] };
  if (q.length < 2) return json(none);
  try {
    return json({ ...((await fetchExplorerSuggestions(q)) ?? none), q }, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch {
    return json(none);
  }
}
