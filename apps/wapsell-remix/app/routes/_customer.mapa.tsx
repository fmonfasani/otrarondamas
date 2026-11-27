import { useMemo, useState } from 'react';
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import { LocateFixed, MapPin } from 'lucide-react';
import { getBuyer } from '~/services/buyer-session.server';
import { mapTiles } from '~/services/map.server';
import { fetchExplorer } from '~/services/store.server';
import { EMPTY_EXPLORER, storeLine } from '~/utils/explorer';
import { ARGENTINA_CENTER, ARGENTINA_ZOOM, byDistance, distanceLabel, type LatLng } from '~/utils/map';
import { WapsellMap } from '~/components/map/WapsellMap';
import { OpenNow } from '~/components/explorer/ExplorerCards';
import explorerStyles from '../styles/explorer.css?url';
import maplibreStyles from '../styles/maplibre-gl.css?url';
import mapStyles from '../styles/map.css?url';

export const links = () => [
  { rel: 'stylesheet', href: explorerStyles },
  { rel: 'stylesheet', href: maplibreStyles },
  { rel: 'stylesheet', href: mapStyles },
];

export const meta: MetaFunction = () => [
  { title: 'Mapa · Wapsell' },
  { name: 'description', content: 'Los negocios de Wapsell en el mapa: encontrá los que están cerca tuyo.' },
];

/**
 * Marketplace, step 4 (Owner, 2026-11-26) — the stores on the map: only those whose Owner
 * confirmed the pin (a zone is a circle, never a door). «Cerca mío» asks the browser for the
 * customer's place only when tapped, never stores it, and orders the list by distance.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const [buyer, explorer] = await Promise.all([getBuyer(request), fetchExplorer().catch(() => null)]);
  const e = explorer ?? EMPTY_EXPLORER;
  return json(
    { negocios: e.negocios.filter((n) => n.ubicacion), rubros: e.rubros, failed: !explorer, buyer: buyer ? { nombre: buyer.nombre } : null, tiles: mapTiles() },
    { headers: { 'Cache-Control': 'private, max-age=30' } },
  );
}

export default function Mapa() {
  const { negocios, rubros, failed, buyer, tiles } = useLoaderData<typeof loader>();
  const [params, setParams] = useSearchParams();
  const rubro = params.get('rubro');
  // OR-B4-054: «?tema=oscuro» previews the dark style the tracking screens will use.
  const theme = params.get('tema') === 'oscuro' ? 'oscuro' : 'claro';
  const [me, setMe] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const shown = useMemo(() => byDistance(negocios.filter((n) => !rubro || n.rubro === rubro), me), [negocios, rubro, me]);
  const center = me ?? (shown[0]?.ubicacion as LatLng | undefined) ?? ARGENTINA_CENTER;
  const zoom = me ? 14 : shown.length > 0 ? 12 : ARGENTINA_ZOOM;

  function nearMe() {
    if (!('geolocation' in navigator)) {
      setProblem('Tu teléfono no comparte la ubicación con el navegador.');
      return;
    }
    setLocating(true);
    setProblem(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setMe({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setProblem('No pudimos saber dónde estás. Revisá el permiso de ubicación del navegador.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const choose = (next: string | null) => {
    const p = new URLSearchParams(params);
    if (next) p.set('rubro', next);
    else p.delete('rubro');
    setParams(p, { replace: true, preventScrollReset: true });
  };

  return (
    <div className="wx">
      <header className="wx-top">
        <Link to="/explorar" className="wx-brand" aria-label="Wapsell, explorar">
          wapsell<span>.</span>
        </Link>
        <Link to={buyer ? '/cuenta' : '/es/auth/login?redirectTo=%2Fmapa'} className="wx-account">
          {buyer ? `Hola, ${buyer.nombre.split(' ')[0]}` : 'Ingresar'}
        </Link>
      </header>

      <div className="wx-tools">
        <button type="button" className="wx-toggle" onClick={nearMe} disabled={locating} aria-pressed={Boolean(me)}>
          <LocateFixed size={15} aria-hidden="true" /> {locating ? 'Buscando dónde estás…' : 'Cerca mío'}
        </button>
        <Link to="/explorar" className="wx-toggle">
          Ver la lista
        </Link>
      </div>
      {rubros.length > 0 ? (
        <nav className="wx-chips" aria-label="Rubros">
          <button type="button" className={!rubro ? 'is-on' : ''} onClick={() => choose(null)} aria-pressed={!rubro}>
            Todos
          </button>
          {rubros.map((r) => (
            <button key={r} type="button" className={rubro === r ? 'is-on' : ''} onClick={() => choose(rubro === r ? null : r)} aria-pressed={rubro === r}>
              {r}
            </button>
          ))}
        </nav>
      ) : null}
      {problem ? (
        <p className="wx-empty" role="alert">
          {problem}
        </p>
      ) : null}
      {failed ? <p className="wx-empty">No pudimos cargar los negocios. Probá en un ratito.</p> : null}

      <div className="wx-map">
        <WapsellMap
          label="Negocios de Wapsell en el mapa"
          className="wx-map__box"
          tiles={tiles}
          theme={theme}
          center={center}
          zoom={zoom}
          me={me}
          pins={shown.map((n) => ({
            id: n.slug,
            label: n.nombre,
            href: `/tienda/${n.slug}`,
            zona: n.ubicacion?.zona,
            detail: [storeLine(n), n.km !== null ? distanceLabel(n.km) : null].filter(Boolean).join(' · '),
            lat: (n.ubicacion as LatLng).lat,
            lng: (n.ubicacion as LatLng).lng,
          }))}
        />
      </div>

      <section className="wx-section" aria-labelledby="wx-near">
        <h2 id="wx-near">
          <MapPin size={18} aria-hidden="true" /> {me ? 'Más cerca tuyo' : 'En el mapa'} · {shown.length}
        </h2>
        {shown.length === 0 ? (
          <p className="wx-empty">Todavía no hay negocios en el mapa{rubro ? ` de ${rubro}` : ''}. Pronto vas a ver acá los de tu barrio.</p>
        ) : (
          <ul className="wx-near">
            {shown.map((n) => (
              <li key={n.slug}>
                <Link to={`/tienda/${n.slug}`}>
                  <span>
                    <b>{n.nombre}</b>
                    <small>
                      {storeLine(n)}
                      {n.ubicacion?.zona ? ' · zona aproximada' : ''}
                    </small>
                  </span>
                  <span className="wx-near__right">
                    {n.km !== null ? <em>{distanceLabel(n.km)}</em> : null}
                    <OpenNow open={n.abiertoAhora} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
