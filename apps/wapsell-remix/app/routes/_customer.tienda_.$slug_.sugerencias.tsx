import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { fetchSuggestions } from '~/services/store.server';
import type { Suggestions } from '~/utils/store-browse';

const NONE: Suggestions = { productos: [], categorias: [] };

/**
 * OR-B4-047 — suggestions while the customer types in the store's search box (JSON). From two
 * letters; a failure simply suggests nothing, the search itself still works. The answer carries the
 * text it answers, so the box never shows suggestions of what was typed before.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 100);
  if (q.length < 2) return json({ ...NONE, q });
  try {
    return json({ ...(await fetchSuggestions(params.slug ?? '', q)), q });
  } catch {
    return json({ ...NONE, q });
  }
}
