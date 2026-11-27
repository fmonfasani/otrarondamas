import { useFetcher } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { WapsellMap } from '~/components/map/WapsellMap';
import { ARGENTINA_CENTER, type LatLng } from '~/utils/map';
import { kmLabel, pesos, type DeliveryChoice, type DeliveryQuoteAnswer, type SavedAddress } from '~/utils/envios';

export type DeliveryState = { choice: DeliveryChoice | null; fee: number; ready: boolean };

type Props = Readonly<{
  slug: string;
  offers: { envio: boolean; retiro: boolean };
  /** Where the map opens: the store's public point. */
  center: LatLng | null;
  tiles: string | null;
  storeAddress?: string;
  onChange: (state: DeliveryState) => void;
}>;

type Place = { direccion: string; indicaciones: string; lat: number; lng: number };
type Addresses = { direcciones: SavedAddress[]; puedeGuardar: boolean };

/**
 * OR-B4-054, fase 2b — «¿Cómo lo recibís?» in the cart, like the checkout mockup: delivery or
 * pickup; for delivery, a saved address («Casa», «Trabajo») or a new one confirmed with a pin
 * on Wapsell's map, and the fee the store computes — all the courier's, shown apart.
 */
export function CheckoutDelivery({ slug, offers, center, tiles, storeAddress, onChange }: Props) {
  const [mode, setMode] = useState<'ENVIO' | 'RETIRO'>(offers.envio ? 'ENVIO' : 'RETIRO');
  const saved = useFetcher<Addresses>();
  const quote = useFetcher<{ answer: DeliveryQuoteAnswer | null; problem: string }>();
  const saver = useFetcher<{ ok: boolean; message: string }>();
  const [place, setPlace] = useState<Place | null>(null);
  const [editing, setEditing] = useState(false);
  const base = `/tienda/${encodeURIComponent(slug)}`;

  useEffect(() => {
    if (mode === 'ENVIO' && saved.state === 'idle' && !saved.data) saved.load(`${base}/direcciones`);
  }, [mode]);

  // With no saved address, the new-address form opens by itself.
  useEffect(() => {
    if (saved.data && saved.data.direcciones.length === 0) setEditing(true);
  }, [saved.data]);

  useEffect(() => {
    if (mode === 'ENVIO' && place) quote.load(`${base}/envio?lat=${place.lat}&lng=${place.lng}`);
  }, [mode, place?.lat, place?.lng]);

  useEffect(() => {
    if (saver.data?.ok) saved.load(`${base}/direcciones`);
  }, [saver.data]);

  const answer = quote.data?.answer?.envio ?? null;
  const fee = answer?.disponible ? answer.costo : 0;
  useEffect(() => {
    if (mode === 'RETIRO') {
      onChange({ choice: { tipo: 'RETIRO' }, fee: 0, ready: true });
      return;
    }
    const ready = Boolean(place && quote.state === 'idle' && answer?.disponible);
    onChange({
      choice: place ? { tipo: 'ENVIO', direccion: place.direccion, lat: place.lat, lng: place.lng, ...(place.indicaciones ? { indicaciones: place.indicaciones } : {}) } : null,
      fee: ready ? fee : 0,
      ready,
    });
  }, [mode, place, quote.state, answer?.disponible, fee]);

  return (
    <section className="checkout-delivery" aria-label="Cómo lo recibís">
      {offers.envio && offers.retiro ? (
        <div className="delivery-toggle" role="group" aria-label="Cómo lo recibís">
          <button type="button" aria-pressed={mode === 'ENVIO'} onClick={() => setMode('ENVIO')}>
            Envío
          </button>
          <button type="button" aria-pressed={mode === 'RETIRO'} onClick={() => setMode('RETIRO')}>
            Retiro en el local
          </button>
        </div>
      ) : null}

      {mode === 'RETIRO' ? (
        <p className="delivery-note">
          <b>Retirás en el local</b>
          {storeAddress ? ` · ${storeAddress}` : ''}. Sin costo de envío.
        </p>
      ) : (
        <>
          {saved.data && saved.data.direcciones.length > 0 ? (
            <div className="delivery-saved" role="group" aria-label="Tus direcciones">
              {saved.data.direcciones.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={!editing && place?.lat === a.lat && place?.lng === a.lng}
                  onClick={() => {
                    setPlace({ direccion: a.direccion, indicaciones: a.indicaciones ?? '', lat: a.lat, lng: a.lng });
                    setEditing(false);
                  }}
                >
                  {a.etiqueta}
                </button>
              ))}
              <button type="button" className="delivery-new" aria-pressed={editing} onClick={() => setEditing(true)}>
                + Nueva dirección
              </button>
            </div>
          ) : null}

          {editing ? (
            <NewAddress
              center={place ?? center ?? null}
              tiles={tiles}
              canSave={Boolean(saved.data?.puedeGuardar)}
              onUse={(next, save) => {
                setPlace(next);
                setEditing(false);
                if (save) {
                  saver.submit({ intent: 'save-address', etiqueta: save, ...next, lat: String(next.lat), lng: String(next.lng) }, { method: 'post', action: `${base}/direcciones` });
                }
              }}
            />
          ) : place ? (
            <div className="delivery-place">
              <span>
                <b>{place.direccion}</b>
                {place.indicaciones ? <small>{place.indicaciones}</small> : null}
              </span>
              <button type="button" className="delivery-change" onClick={() => setEditing(true)}>
                Cambiar
              </button>
            </div>
          ) : (
            <p className="delivery-note">Elegí a dónde te lo llevan.</p>
          )}

          {saver.data && !saver.data.ok ? <output className="form-error">{saver.data.message}</output> : null}
          {place && !editing ? (
            quote.state !== 'idle' ? (
              <p className="delivery-note" aria-live="polite">Calculando el envío…</p>
            ) : answer?.disponible ? (
              <div className="delivery-fee">
                <span>
                  Envío <small>· 100 % para el repartidor</small>
                  <small>
                    {kmLabel(answer.km)} · {pesos(answer.base)} + {answer.kmCobrados} km × {pesos(answer.porKm)}
                  </small>
                </span>
                <strong>{pesos(answer.costo)}</strong>
              </div>
            ) : (
              <output className="form-error">{answer?.motivo ?? quote.data?.problem ?? 'No pudimos calcular el envío.'}</output>
            )
          ) : null}
        </>
      )}
    </section>
  );
}

function NewAddress({
  center,
  tiles,
  canSave,
  onUse,
}: Readonly<{ center: LatLng | null; tiles: string | null; canSave: boolean; onUse: (place: Place, saveAs: string | null) => void }>) {
  const [direccion, setDireccion] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [pin, setPin] = useState<LatLng>(center ?? ARGENTINA_CENTER);
  const [view, setView] = useState<{ at: LatLng; zoom: number }>({ at: center ?? ARGENTINA_CENTER, zoom: center ? 15 : 4 });
  const [guardar, setGuardar] = useState(canSave);
  const [etiqueta, setEtiqueta] = useState('Casa');
  const [problem, setProblem] = useState('');

  function here() {
    if (!('geolocation' in navigator)) return setProblem('Tu teléfono no comparte la ubicación con el navegador.');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const at = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPin(at);
        setView({ at, zoom: 17 });
        setProblem('');
      },
      () => setProblem('No pudimos saber dónde estás. Arrastrá el pin hasta tu puerta.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const usable = direccion.trim().length >= 3;
  return (
    <div className="delivery-form">
      <label className="delivery-field">
        <span>Dirección</span>
        <input value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={200} placeholder="Av. Pellegrini 1234, 4° B" autoComplete="street-address" />
      </label>
      <p className="delivery-hint">Arrastrá el pin hasta tu puerta: el envío se mide desde ahí.</p>
      <WapsellMap
        label="Tu dirección en el mapa"
        className="delivery-map"
        tiles={tiles}
        center={view.at}
        zoom={view.zoom}
        editable={{ ...pin, zona: false }}
        onMove={(at) => {
          setPin(at);
          setView({ at, zoom: Math.max(view.zoom, 16) });
        }}
      />
      <button type="button" className="delivery-change" onClick={here}>
        Usar mi ubicación
      </button>
      {problem ? <output className="form-error">{problem}</output> : null}
      <label className="delivery-field">
        <span>Indicaciones para el repartidor</span>
        <input value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} maxLength={200} placeholder="Timbre 4B, portón negro" />
      </label>
      {canSave ? (
        <div className="delivery-save">
          <label>
            <input type="checkbox" checked={guardar} onChange={(e) => setGuardar(e.target.checked)} /> Guardar en mi cuenta como
          </label>
          <input aria-label="Nombre de la dirección" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} maxLength={40} disabled={!guardar} />
        </div>
      ) : null}
      <button
        type="button"
        className="delivery-use"
        disabled={!usable}
        onClick={() => onUse({ direccion: direccion.trim(), indicaciones: indicaciones.trim(), ...pin }, guardar && etiqueta.trim() ? etiqueta.trim() : null)}
      >
        Usar esta dirección
      </button>
    </div>
  );
}
