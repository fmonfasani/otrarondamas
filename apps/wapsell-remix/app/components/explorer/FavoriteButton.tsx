import { Link, useFetcher, useLocation } from '@remix-run/react';
import { Heart } from 'lucide-react';
import { loginTo } from '~/utils/explorer';

/**
 * Marketplace, step 3b — the ♥ of a product. It turns on and off at once (the server answers
 * behind); without a buyer session it sends the visitor to sign in and back to the same page.
 */
export function FavoriteButton({ productoId, nombre, on, signedIn }: Readonly<{ productoId: string; nombre: string; on: boolean; signedIn: boolean }>) {
  const fetcher = useFetcher<{ ok: boolean }>();
  const location = useLocation();
  if (!signedIn) {
    return (
      <Link to={loginTo(`${location.pathname}${location.search}`)} className="wx-fav" aria-label={`Guardar ${nombre} en favoritos (ingresá primero)`}>
        <Heart size={18} aria-hidden="true" />
      </Link>
    );
  }
  // While the change travels, show what the buyer asked for.
  const pending = fetcher.formData?.get('favorito');
  const current = pending === undefined || pending === null ? on : pending === '1';
  return (
    <fetcher.Form method="post" action="/favoritos" className="wx-fav-form">
      <input type="hidden" name="productoId" value={productoId} />
      <input type="hidden" name="favorito" value={current ? '0' : '1'} />
      <button type="submit" className={`wx-fav${current ? ' is-on' : ''}`} aria-pressed={current} aria-label={current ? `Quitar ${nombre} de favoritos` : `Guardar ${nombre} en favoritos`}>
        <Heart size={18} aria-hidden="true" fill={current ? 'currentColor' : 'none'} />
      </button>
    </fetcher.Form>
  );
}
