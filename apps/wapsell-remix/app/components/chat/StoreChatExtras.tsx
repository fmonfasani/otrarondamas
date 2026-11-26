import { useEffect, useRef, useState } from 'react';
import { useFetcher } from '@remix-run/react';
import { Clock3, MapPin, Phone, Search, X } from 'lucide-react';
import type { Suggestions } from '~/utils/store-browse';
import { formatMoney } from '~/utils/format';

/**
 * E6b — the store chat's extras, like WhatsApp Business: the store's profile (description,
 * hours, address, phone, open now) and «+ Productos» (the customer asks about a product).
 */

export type StoreProfileData = {
  descripcion: string;
  horario: string;
  direccion: string;
  telefono: string;
  abiertoAhora?: boolean | null;
};

/** «Abierto ahora» / «Cerrado ahora», only when the store loaded its hours. */
export function openNowLabel(open: boolean | null | undefined): string | null {
  if (open === true) return 'Abierto ahora';
  if (open === false) return 'Cerrado ahora';
  return null;
}

/** The store's profile, in a sheet from the chat's header. Escape or ✕ close it. */
export function StoreProfile({
  name,
  profile,
  onClose,
}: Readonly<{ name: string; profile: StoreProfileData; onClose: () => void }>) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => panel.current?.focus(), []);
  const open = openNowLabel(profile.abiertoAhora);
  const empty = !profile.descripcion && !profile.horario && !profile.direccion && !profile.telefono;
  return (
    <div className="chat-sheet" role="presentation" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div
        ref={panel}
        className="chat-sheet__panel chat-profile"
        role="dialog"
        aria-modal="true"
        aria-label={`Sobre ${name}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="chat-profile__head">
          <b>{name}</b>
          <button type="button" className="chat-profile__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {open ? <span className={`chat-profile__open${profile.abiertoAhora ? ' is-open' : ''}`}>{open}</span> : null}
        {profile.descripcion ? <p className="chat-profile__about">{profile.descripcion}</p> : null}
        <ul className="chat-profile__facts">
          {profile.horario ? (
            <li>
              <Clock3 size={16} aria-hidden="true" /> {profile.horario}
            </li>
          ) : null}
          {profile.direccion ? (
            <li>
              <MapPin size={16} aria-hidden="true" /> {profile.direccion}
            </li>
          ) : null}
          {profile.telefono ? (
            <li>
              <Phone size={16} aria-hidden="true" /> <a href={`tel:${profile.telefono.replace(/[^\d+]/g, '')}`}>{profile.telefono}</a>
            </li>
          ) : null}
        </ul>
        {empty ? <p className="chat-profile__about">La tienda todavía no cargó sus datos.</p> : null}
      </div>
    </div>
  );
}

/**
 * E6b «+ Productos» — the customer looks for a product of the store and sends it to ask about
 * it. Uses the store's own suggestions (published products only).
 */
export function ProductAsk({
  slug,
  onSend,
  onClose,
  sending,
}: Readonly<{ slug: string; onSend: (productoId: string) => void; onClose: () => void; sending: boolean }>) {
  const search = useFetcher<Suggestions>();
  const [q, setQ] = useState('');
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => box.current?.focus(), []);
  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) return;
    const timer = window.setTimeout(() => search.load(`/tienda/${slug}/sugerencias?q=${encodeURIComponent(text)}`), 250);
    return () => window.clearTimeout(timer);
  }, [q, slug]);
  const results = q.trim().length >= 2 && search.data?.q === q.trim() ? search.data.productos : [];
  return (
    <div className="chat-ask" role="region" aria-label="Consultar por un producto">
      <div className="chat-ask__head">
        <b>Consultar por un producto</b>
        <button type="button" className="chat-profile__close" onClick={onClose} aria-label="Cerrar">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <label className="chat-ask__search">
        <Search size={16} aria-hidden="true" />
        <input
          ref={box}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          placeholder="Buscá en la tienda"
          aria-label="Buscá en la tienda"
        />
      </label>
      <ul className="chat-ask__list">
        {results.map((p) => (
          <li key={p.productoId}>
            <span>
              <b>{p.nombre}</b>
              <small>{formatMoney(p.precio)}</small>
            </span>
            <button type="button" className="chat-ask__send" disabled={sending} onClick={() => onSend(p.productoId)}>
              Consultar
            </button>
          </li>
        ))}
        {q.trim().length >= 2 && search.state === 'idle' && search.data?.q === q.trim() && results.length === 0 ? (
          <li className="chat-ask__empty">No encontramos productos con ese nombre.</li>
        ) : null}
      </ul>
    </div>
  );
}
