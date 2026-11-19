import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { fetchStoreCatalog } from '~/services/store.server';
import { EMPTY_LISTING, listingQuery } from '~/utils/store-browse';

/**
 * OR-B4-047 — one more page of the store listing, for «Ver más» (JSON, no page around it). A
 * failure answers an empty page with a message, so the store on screen stays as it is.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    return json(await fetchStoreCatalog(params.slug ?? '', listingQuery(new URL(request.url))));
  } catch {
    return json({ ...EMPTY_LISTING, error: 'No pudimos cargar más productos. Probá de nuevo.' });
  }
}
