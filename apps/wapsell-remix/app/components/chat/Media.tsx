import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText, Mic, Pause, Play, Send, Smile, Trash2, X } from 'lucide-react';
import { EMOJI_GROUPS, fileSize, splitLinks, voiceTime, type ChatMedia } from '~/utils/messaging';

/**
 * E5 — what a message shows besides its text, one look for the store and the panel: photos
 * (open full screen), videos, voice notes, documents and the preview of a link. Plus the
 * composer's microphone and emoji picker. Styles in styles/chat.css.
 */

/** The photos, videos, voice notes, documents and link previews of one message. */
export function MessageMedia({
  items,
  fileUrl,
  mine,
  onOpenPhoto,
}: Readonly<{
  items: ChatMedia[];
  fileUrl: (id: string) => string;
  mine: boolean;
  onOpenPhoto: (id: string) => void;
}>) {
  return (
    <>
      {items.map((item) => {
        switch (item.tipo) {
          case 'imagen':
            return (
              <button key={item.id} type="button" className="chat-photo" onClick={() => onOpenPhoto(item.id)} aria-label="Ver la foto">
                <img src={fileUrl(item.id)} alt={item.nombre} loading="lazy" />
              </button>
            );
          case 'video':
            return (
              <video key={item.id} className="chat-video" src={fileUrl(item.id)} controls preload="metadata" playsInline>
                <a href={fileUrl(item.id)}>Descargar el video</a>
              </video>
            );
          case 'audio':
            return <VoiceNote key={item.id} src={fileUrl(item.id)} seconds={item.duracion} mine={mine} />;
          case 'enlace':
            return <LinkCard key={item.id} item={item} photo={item.imagen ? fileUrl(item.id) : null} />;
          default:
            return (
              <a key={item.id} href={fileUrl(item.id)} className="chat-file">
                <FileText size={18} aria-hidden="true" /> {item.nombre}
                {item.tamano ? <small>{fileSize(item.tamano)}</small> : null}
              </a>
            );
        }
      })}
    </>
  );
}

/** The text of a message with its web links clickable (they open in a new tab). */
export function Linkified({ text }: Readonly<{ text: string }>) {
  return (
    <>
      {splitLinks(text).map((part, index) =>
        part.link ? (
          <a key={`${index}-${part.text}`} href={part.text} target="_blank" rel="noopener noreferrer nofollow ugc" className="chat-link">
            {part.text}
          </a>
        ) : (
          <Fragment key={`${index}-t`}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}

/** E5 — a link's preview: its photo, site, title and description, opening the page. */
function LinkCard({ item, photo }: Readonly<{ item: Extract<ChatMedia, { tipo: 'enlace' }>; photo: string | null }>) {
  return (
    <a className="chat-linkcard" href={item.url} target="_blank" rel="noopener noreferrer nofollow ugc">
      {photo ? <img src={photo} alt="" loading="lazy" /> : null}
      <span className="chat-linkcard__body">
        <b>{item.titulo}</b>
        {item.descripcion ? <span>{item.descripcion}</span> : null}
        <small>{item.sitio}</small>
      </span>
    </a>
  );
}

const SPEEDS = [1, 1.5, 2] as const;

/** E5 — a voice note: play/pause, the bar to move through it, the time and 1×/1.5×/2×. */
export function VoiceNote({ src, seconds, mine }: Readonly<{ src: string; seconds: number | null; mine: boolean }>) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [length, setLength] = useState(seconds ?? 0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      // Only one voice note at a time, like WhatsApp.
      for (const other of Array.from(document.querySelectorAll('audio'))) if (other !== el) other.pause();
      void el.play().catch(() => setPlaying(false));
    } else el.pause();
  };
  return (
    <span className={`chat-voice${mine ? ' chat-voice--mine' : ''}`}>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setAt(0);
        }}
        onTimeUpdate={(event) => setAt(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          // WebM from the recorder often reports Infinity: the recorded length is kept then.
          const real = event.currentTarget.duration;
          if (Number.isFinite(real) && real > 0) setLength(real);
        }}
      />
      <button type="button" className="chat-voice__play" onClick={toggle} aria-label={playing ? 'Pausar' : 'Escuchar la nota de voz'}>
        {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
      </button>
      <input
        type="range"
        className="chat-voice__bar"
        min={0}
        max={Math.max(length, 1)}
        step={0.1}
        value={Math.min(at, Math.max(length, 1))}
        aria-label="Avance de la nota de voz"
        style={{ '--done': `${length ? Math.min(100, (at / length) * 100) : 0}%` } as React.CSSProperties}
        onChange={(event) => {
          const el = audio.current;
          if (el) el.currentTime = Number(event.currentTarget.value);
          setAt(Number(event.currentTarget.value));
        }}
      />
      <span className="chat-voice__time">{voiceTime(playing || at > 0 ? at : length)}</span>
      <button
        type="button"
        className="chat-voice__speed"
        aria-label={`Velocidad ${speed}×`}
        onClick={() => {
          const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
          setSpeed(next);
          if (audio.current) audio.current.playbackRate = next;
        }}
      >
        {speed}×
      </button>
    </span>
  );
}

/**
 * E5 — a photo of the chat full screen, with the previous and next ones (arrows or keys) and a
 * download. Escape, the ✕ or a tap outside the photo close it.
 */
export function PhotoViewer({
  photos,
  current,
  fileUrl,
  onMove,
  onClose,
}: Readonly<{
  photos: Array<{ id: string; nombre: string }>;
  current: string;
  fileUrl: (id: string) => string;
  onMove: (id: string) => void;
  onClose: () => void;
}>) {
  const index = Math.max(0, photos.findIndex((p) => p.id === current));
  const photo = photos[index];
  const prev = index > 0 ? photos[index - 1] : null;
  const next = index < photos.length - 1 ? photos[index + 1] : null;
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => panel.current?.focus(), []);
  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
    else if (event.key === 'ArrowLeft' && prev) onMove(prev.id);
    else if (event.key === 'ArrowRight' && next) onMove(next.id);
    else return;
    event.preventDefault();
  };
  if (!photo) return null;
  return (
    <div
      ref={panel}
      className="chat-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Foto"
      tabIndex={-1}
      onKeyDown={onKey}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="chat-viewer__bar">
        <span>
          {index + 1} de {photos.length}
        </span>
        <a className="chat-viewer__button" href={fileUrl(photo.id)} download={photo.nombre} aria-label="Descargar">
          <Download size={20} aria-hidden="true" />
        </a>
        <button type="button" className="chat-viewer__button" onClick={onClose} aria-label="Cerrar">
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      <img className="chat-viewer__photo" src={fileUrl(photo.id)} alt={photo.nombre} />
      {prev ? (
        <button type="button" className="chat-viewer__nav chat-viewer__nav--prev" onClick={() => onMove(prev.id)} aria-label="Foto anterior">
          <ChevronLeft size={28} aria-hidden="true" />
        </button>
      ) : null}
      {next ? (
        <button type="button" className="chat-viewer__nav chat-viewer__nav--next" onClick={() => onMove(next.id)} aria-label="Foto siguiente">
          <ChevronRight size={28} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/** E5 — which photo is open full screen, for a chat's list of photos. */
export function usePhotoViewer(photos: Array<{ id: string; nombre: string }>, fileUrl: (id: string) => string) {
  const [open, setOpen] = useState<string | null>(null);
  const viewer =
    open && photos.some((p) => p.id === open) ? (
      <PhotoViewer photos={photos} current={open} fileUrl={fileUrl} onMove={setOpen} onClose={() => setOpen(null)} />
    ) : null;
  return { openPhoto: setOpen, viewer };
}

/** E5 — the emoji picker: a smile next to the text box opens groups of emojis to insert. */
export function EmojiButton({ onPick }: Readonly<{ onPick: (emoji: string) => void }>) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !panel.current?.parentElement?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', close);
    window.addEventListener('mousedown', close);
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('mousedown', close);
    };
  }, [open]);
  return (
    <div className="chat-emoji">
      <button
        type="button"
        className={`chat-round chat-emoji__button${open ? ' is-open' : ''}`}
        aria-label="Emojis"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Smile size={22} aria-hidden="true" />
      </button>
      {open ? (
        <div ref={panel} className="chat-emoji__panel" role="dialog" aria-label="Elegí un emoji">
          <div className="chat-emoji__tabs" role="tablist">
            {EMOJI_GROUPS.map((g, i) => (
              <button
                key={g.nombre}
                type="button"
                role="tab"
                aria-selected={i === group}
                aria-label={g.nombre}
                title={g.nombre}
                onClick={() => setGroup(i)}
              >
                {g.icono}
              </button>
            ))}
          </div>
          <div className="chat-emoji__grid">
            {EMOJI_GROUPS[group].emojis.map((emoji) => (
              <button key={emoji} type="button" onClick={() => onPick(emoji)} aria-label={emoji}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Inserts text where the cursor is in a text box, and leaves the cursor after it. */
export function insertAtCursor(box: HTMLTextAreaElement, text: string): string {
  const start = box.selectionStart ?? box.value.length;
  const end = box.selectionEnd ?? box.value.length;
  const value = `${box.value.slice(0, start)}${text}${box.value.slice(end)}`;
  box.value = value;
  const at = start + text.length;
  box.setSelectionRange(at, at);
  box.focus();
  return value;
}

/** A recorder format this browser has: Opus in WebM or Ogg (Chrome, Firefox), AAC in MP4 (Safari). */
function recorderType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
}

/** E5 — the longest voice note: 15 minutes, then it is sent on its own. */
export const VOICE_MAX_SECONDS = 15 * 60;

export type VoiceRecording = { file: File; seconds: number };

/**
 * E5 — records a voice note with the microphone. `start` asks for the microphone the first
 * time; `stop(true)` hands the recording to `onDone`, `stop(false)` throws it away.
 */
export function useVoiceRecorder(onDone: (recording: VoiceRecording) => void) {
  const [state, setState] = useState<'idle' | 'recording' | 'denied'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [supported, setSupported] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const keep = useRef(false);
  const startedAt = useRef(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && Boolean(recorderType()));
  }, []);

  const stop = useCallback((send: boolean) => {
    keep.current = send;
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }, []);

  useEffect(() => {
    if (state !== 'recording') return;
    const tick = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      setSeconds(elapsed);
      if (elapsed >= VOICE_MAX_SECONDS) stop(true);
    }, 250);
    return () => window.clearInterval(tick);
  }, [state, stop]);

  // Leaving the chat while recording throws the recording away and frees the microphone.
  useEffect(() => () => stop(false), [stop]);

  const start = useCallback(async () => {
    const type = recorderType();
    if (!type || recorder.current?.state === 'recording') return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState('denied');
      return;
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream, { mimeType: type });
    rec.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    rec.onstop = () => {
      for (const track of stream.getTracks()) track.stop();
      const elapsed = (Date.now() - startedAt.current) / 1000;
      recorder.current = null;
      setState('idle');
      setSeconds(0);
      // Under a second is a slip of the finger, not a voice note.
      if (!keep.current || elapsed < 1 || chunks.length === 0) return;
      const base = type.split(';')[0];
      const ext = base === 'audio/mp4' ? 'm4a' : base.split('/')[1];
      const file = new File(chunks, `nota-de-voz.${ext}`, { type: base });
      done.current({ file, seconds: Math.round(elapsed) });
    };
    recorder.current = rec;
    keep.current = false;
    startedAt.current = Date.now();
    setSeconds(0);
    rec.start(1000);
    setState('recording');
  }, []);

  return { supported, state, seconds, start, stop };
}

/** E5 — while recording: throw away, the red dot with the time, and send. */
export function RecorderBar({ seconds, onCancel, onSend }: Readonly<{ seconds: number; onCancel: () => void; onSend: () => void }>) {
  return (
    <div className="chat-recorder" role="status" aria-label="Grabando una nota de voz">
      <button type="button" className="chat-round chat-recorder__cancel" onClick={onCancel} aria-label="Descartar la nota de voz">
        <Trash2 size={20} aria-hidden="true" />
      </button>
      <span className="chat-recorder__dot" aria-hidden="true" />
      <span className="chat-recorder__time">{voiceTime(seconds)}</span>
      <span className="chat-recorder__hint">Grabando…</span>
      <button type="button" className="chat-round chat-send" onClick={onSend} aria-label="Enviar la nota de voz">
        <Send size={20} aria-hidden="true" />
      </button>
    </div>
  );
}

/** E5 — the round microphone button that takes the place of «Enviar» while the box is empty. */
export function MicButton({ onClick, disabled }: Readonly<{ onClick: () => void; disabled?: boolean }>) {
  return (
    <button type="button" className="chat-round chat-send chat-mic" onClick={onClick} disabled={disabled} aria-label="Grabar una nota de voz">
      <Mic size={20} aria-hidden="true" />
    </button>
  );
}

/** E5 — the microphone was refused: how to allow it again. */
export function MicDenied({ children }: Readonly<{ children?: ReactNode }>) {
  return (
    <output className="chat-error">
      No pudimos usar el micrófono. Permitilo desde el candado de la barra de direcciones y probá de nuevo.{children}
    </output>
  );
}
