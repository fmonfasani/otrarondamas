import { useFetcher } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { WapsellMap } from '~/components/map/WapsellMap';
import { ARGENTINA_CENTER, type GeorefCandidate, type LatLng, type LocationPanel } from '~/utils/map';

type Answer = { intent: string; ok: boolean; message?: string; candidatos?: GeorefCandidate[] };

const dateOf = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Marketplace, step 4 (Owner, 2026-11-26) — «Tu negocio en el mapa», in Ajustes. The Owner
 * searches the address (Georef), sees the pin, drags it to the door if it fell a block away,
 * chooses the exact point or only the zone, and confirms. Until confirmed, the store is not on
 * Wapsell's map. The rest of the team sees it, without changing it.
 */
export function LocationEditor({ data, tiles }: Readonly<{ data: LocationPanel; tiles: string | null }>) {
  const finder = useFetcher<Answer>();
  const saver = useFetcher<Answer>();
  const saved = data.ubicacion;
  const [point, setPoint] = useState<LatLng | null>(saved ? { lat: saved.lat, lng: saved.lng } : null);
  const [zona, setZona] = useState(saved?.zona ?? false);
  const [zoom, setZoom] = useState(saved ? 17 : 4);
  const [center, setCenter] = useState<LatLng>(saved ?? ARGENTINA_CENTER);
  const [direccion, setDireccion] = useState(saved?.direccion || data.sugerida.direccion);
  const [hint, setHint] = useState<string | null>(null);
  const candidates = finder.data?.intent === 'location-find' ? (finder.data.candidatos ?? []) : [];
  const busy = finder.state !== 'idle' || saver.state !== 'idle';

  // A search answered: put the pin on the first place found.
  useEffect(() => {
    if (finder.state !== 'idle' || !finder.data) return;
    const first = finder.data.candidatos?.[0];
    if (finder.data.ok && first) {
      choose(first);
    } else if (finder.data.ok) {
      setHint('No encontramos esa dirección. Probá escribirla de otra forma, o marcá el punto a mano.');
    } else {
      setHint(finder.data.message ?? 'No pudimos buscar la dirección.');
    }
  }, [finder.state, finder.data]);

  function choose(c: GeorefCandidate) {
    setPoint({ lat: c.lat, lng: c.lng });
    setCenter({ lat: c.lat, lng: c.lng });
    setZoom(c.exacta ? 17 : 13);
    setHint(
      c.exacta
        ? '¿Quedó en tu puerta? Si cayó corrido, arrastrá el pin hasta tu local y confirmá.'
        : 'Encontramos la ciudad, no el número: arrastrá el pin hasta tu local y confirmá.',
    );
  }

  function byHand() {
    const at = point ?? ARGENTINA_CENTER;
    setPoint(at);
    setCenter(at);
    setZoom(point ? zoom : 5);
    setHint('Acercá el mapa hasta tu cuadra y arrastrá el pin a tu local.');
  }

  const moved = !saved || !point || saved.lat !== point.lat || saved.lng !== point.lng || saved.zona !== zona;

  return (
    <div className="ws-location">
      {saved ? (
        <p className="ws-meta">
          <b>Confirmada</b> el {dateOf(saved.confirmadaAt)}{saved.zona ? ' · se muestra solo la zona' : ' · se muestra el punto exacto'}.
        </p>
      ) : (
        <p className="ws-meta">Todavía no está en el mapa de Wapsell. Buscá tu dirección y confirmá el pin.</p>
      )}

      {data.puedeEditar ? (
        <finder.Form method="post" className="ws-location__find" onSubmit={() => setHint(null)}>
          <input type="hidden" name="intent" value="location-find" />
          <label className="ws-field">
            <span className="ws-field__label">Dirección</span>
            <span className="ws-field__control">
              <input name="direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} required minLength={3} maxLength={200} placeholder="Av. San Martín 1234" />
            </span>
          </label>
          <label className="ws-field">
            <span className="ws-field__label">Ciudad</span>
            <span className="ws-field__control">
              <input name="ciudad" defaultValue={data.sugerida.ciudad} maxLength={120} placeholder="Rosario" />
            </span>
          </label>
          <label className="ws-field">
            <span className="ws-field__label">Provincia</span>
            <span className="ws-field__control">
              <input name="provincia" defaultValue={data.sugerida.provincia} maxLength={120} placeholder="Santa Fe" />
            </span>
          </label>
          <div className="ws-location__actions">
            <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={busy}>
              {finder.state !== 'idle' ? 'Buscando…' : 'Buscar en el mapa'}
            </button>
            <button className="ws-link" type="button" onClick={byHand}>
              Marcar a mano
            </button>
          </div>
        </finder.Form>
      ) : (
        <p className="ws-meta">Solo el Owner cambia la ubicación.</p>
      )}

      {candidates.length > 1 ? (
        <div className="ws-location__options" role="group" aria-label="Lugares encontrados">
          {candidates.map((c) => (
            <button key={`${c.lat},${c.lng}`} type="button" className="ws-chip" onClick={() => choose(c)}>
              {c.etiqueta}
            </button>
          ))}
        </div>
      ) : null}

      {hint ? (
        <p className="ws-notice" role="status">
          {hint}
        </p>
      ) : null}

      {point || saved ? (
        <WapsellMap
          label="Tu negocio en el mapa"
          className="ws-location__map"
          tiles={tiles}
          center={center}
          zoom={zoom}
          editable={point && data.puedeEditar ? { ...point, zona } : null}
          pins={!data.puedeEditar && saved ? [{ id: 'yo', label: 'Tu negocio', lat: saved.lat, lng: saved.lng, zona: saved.zona }] : []}
          onMove={(p) => {
            setPoint(p);
            setCenter(p);
          }}
        />
      ) : null}

      {data.puedeEditar && point ? (
        <saver.Form method="post" className="ws-location__confirm">
          <input type="hidden" name="lat" value={point.lat} />
          <input type="hidden" name="lng" value={point.lng} />
          <input type="hidden" name="direccion" value={direccion} />
          <fieldset className="ws-location__privacy">
            <legend>¿Qué ven los clientes?</legend>
            <label className="ws-check">
              <input type="radio" name="zona" value="false" checked={!zona} onChange={() => setZona(false)} />
              <span>
                <b>El punto exacto</b>
                <small>Para un local a la calle: te encuentran en la puerta.</small>
              </span>
            </label>
            <label className="ws-check">
              <input type="radio" name="zona" value="true" checked={zona} onChange={() => setZona(true)} />
              <span>
                <b>Solo la zona</b>
                <small>Si vendés desde tu casa: se ve un círculo de unas cuadras, nunca tu dirección.</small>
              </span>
            </label>
          </fieldset>
          {saver.data?.intent?.startsWith('location-') ? (
            <p className={saver.data.ok ? 'ws-notice' : 'ws-alert'} role={saver.data.ok ? 'status' : 'alert'}>
              {saver.data.message}
            </p>
          ) : null}
          <div className="ws-location__actions">
            <button className="ws-button ws-button--primary ws-button--auto" type="submit" name="intent" value="location-save" disabled={busy || !moved}>
              {saved && !moved ? 'Ubicación confirmada' : 'Sí, es acá: confirmar'}
            </button>
            {saved ? (
              <button className="ws-link" type="submit" name="intent" value="location-remove" disabled={busy}>
                Quitar del mapa
              </button>
            ) : null}
          </div>
        </saver.Form>
      ) : null}
    </div>
  );
}
