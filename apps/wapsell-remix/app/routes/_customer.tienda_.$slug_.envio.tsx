import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { fetchDeliveryQuote } from '~/services/store.server';
import { parsePoint } from '~/utils/map';

/** The fee depends only on the pin: saving an address elsewhere never asks for it again. */
export const shouldRevalidate = () => false;

/**
 * OR-B4-054, fase 2b — the cart asks what a delivery to the pin costs (GET ?lat=&lng=). The
 * store answers with the fee or why there is none; the store's own point never comes back.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const point = parsePoint(url.searchParams.get('lat'), url.searchParams.get('lng'));
  if (!point) return json({ answer: null, problem: 'Ese punto no está en Argentina. Mové el pin a tu dirección.' }, { status: 400 });
  const answer = await fetchDeliveryQuote(params.slug ?? '', point.lat, point.lng).catch(() => null);
  return json(
    { answer, problem: answer ? '' : 'No pudimos calcular el envío. Probá de nuevo en un ratito.' },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  );
}
