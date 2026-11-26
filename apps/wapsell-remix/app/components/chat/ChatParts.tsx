import { useEffect, useState, type HTMLAttributes, type ReactNode } from 'react';
import { ArrowDown, Check, CheckCheck, Clock3, Star } from 'lucide-react';
import { TICK_LABELS, type BubbleRun, type MessageTick } from '~/utils/messaging';
import { Linkified } from './Media';

/**
 * Paquete 2 — the chat's pieces, one look for the store and the panel (A9): bubbles in runs with
 * a tail (A3), day pills (A2), avatars (A4), the typing dots (A5), «↓ nuevos» (A6), and the
 * loading and empty screens (A8). Styles in styles/chat.css.
 */

/** E2 — ✓ saved, ✓✓ reached the others, blue ✓✓ read (like WhatsApp); a clock while sending. */
export function Ticks({ estado }: Readonly<{ estado: MessageTick | 'pendiente' }>) {
  if (estado === 'pendiente') {
    return (
      <span className="chat-tick" title="Enviando" aria-label="Enviando">
        <Clock3 size={12} aria-hidden="true" />
      </span>
    );
  }
  const Icon = estado === 'enviado' ? Check : CheckCheck;
  return (
    <span className={`chat-tick chat-tick--${estado}`} title={TICK_LABELS[estado]} aria-label={TICK_LABELS[estado]}>
      <Icon size={15} aria-hidden="true" />
    </span>
  );
}

/** Time, «editado» and the ticks, in the bubble's bottom corner. */
export function BubbleMeta({
  time,
  dateTime,
  edited,
  estado,
  starred,
}: Readonly<{ time: string; dateTime?: string; edited?: boolean; estado?: MessageTick | 'pendiente' | null; starred?: boolean }>) {
  return (
    <span className="chat-meta">
      {starred ? <Star size={11} className="chat-meta__star" aria-label="Destacado" /> : null}
      {edited ? 'editado · ' : null}
      <time dateTime={dateTime}>{time}</time>
      {estado ? <Ticks estado={estado} /> : null}
    </span>
  );
}

/**
 * One message. Plain text carries the meta inside its paragraph, so the time sits at the end of
 * the last line when it fits (WhatsApp); anything else gets the meta below.
 */
export function Bubble({
  mine,
  run,
  author,
  text,
  meta,
  pending,
  children,
  id,
  top,
  reactions,
  menu,
  press,
  deleted,
}: Readonly<{
  mine: boolean;
  run: BubbleRun;
  author?: string | null;
  /** Plain text: the meta goes at the end of its last line. */
  text?: string | null;
  meta: ReactNode;
  pending?: boolean;
  children?: ReactNode;
  /** E4 — the message id: a quote or a search result jumps here (#msg-…). */
  id?: string;
  /** E4 — «Reenviado» and the quoted message, above the content. */
  top?: ReactNode;
  /** E4 — the reaction chips, hanging from the bottom edge. */
  reactions?: ReactNode;
  /** E4 — the ⌄ that opens the message's menu (shown on hover). */
  menu?: ReactNode;
  /** E4 — long press and right click open the menu. */
  press?: HTMLAttributes<HTMLDivElement>;
  deleted?: boolean;
}>) {
  const classes = [
    'chat-bubble',
    mine ? 'chat-bubble--mine' : 'chat-bubble--theirs',
    run.cont ? 'is-cont' : '',
    run.tail ? 'is-tail' : '',
    pending ? 'is-pending' : '',
    reactions ? 'has-reactions' : '',
    deleted ? 'is-deleted' : '',
  ].filter(Boolean);
  return (
    <div id={id ? `msg-${id}` : undefined} className={classes.join(' ')} {...press}>
      {menu}
      {author && !run.cont ? <span className="chat-bubble__author">{author}</span> : null}
      {top}
      {children}
      {text != null ? (
        <p className="chat-bubble__text">
          <Linkified text={text} />
          {meta}
        </p>
      ) : (
        <div className="chat-bubble__foot">{meta}</div>
      )}
      {reactions}
    </div>
  );
}

/** A2 — the day, centred above its messages. */
export function DayDivider({ label }: Readonly<{ label: string }>) {
  return (
    <div className="chat-day" role="separator" aria-label={label}>
      <span>{label}</span>
    </div>
  );
}

/** A5 — «escribiendo…» as WhatsApp's three dots, with the words for screen readers. */
export function TypingBubble({ label }: Readonly<{ label: string }>) {
  return (
    <div className="chat-typing" role="status">
      <span className="chat-typing__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** A6 — back to the newest message, with how many arrived while reading above. */
export function NewBelow({ count, away, onClick }: Readonly<{ count: number; away: boolean; onClick: () => void }>) {
  if (!away && count === 0) return null;
  const label = count > 0 ? `${count} ${count === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}` : 'Ir al último mensaje';
  return (
    <button type="button" className="chat-new-below" onClick={onClick} aria-label={label} title={label}>
      {count > 0 ? <span className="chat-new-below__count">{count > 99 ? '99+' : count}</span> : null}
      <ArrowDown size={18} aria-hidden="true" />
    </button>
  );
}

/** A4 — initials (or the store's mark) in a circle, with the green dot while online. */
export function ChatAvatar({
  name,
  letters,
  online,
  tone = 'neutral',
}: Readonly<{ name: string; letters?: string; online?: boolean; tone?: 'neutral' | 'customer' | 'store' }>) {
  return (
    <span className={`chat-avatar chat-avatar--${tone}`} aria-hidden="true">
      {letters ?? initialsOf(name)}
      {online ? <span className="chat-avatar__online" /> : null}
    </span>
  );
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** A8 — while a conversation loads: the shape of a chat instead of a blank screen. */
export function ChatSkeleton() {
  return (
    <div className="chat-skeleton" role="status" aria-label="Cargando la conversación">
      <span className="chat-skeleton__bubble chat-skeleton__bubble--theirs" style={{ width: '46%' }} />
      <span className="chat-skeleton__bubble chat-skeleton__bubble--theirs" style={{ width: '32%' }} />
      <span className="chat-skeleton__bubble chat-skeleton__bubble--mine" style={{ width: '54%' }} />
      <span className="chat-skeleton__bubble chat-skeleton__bubble--theirs" style={{ width: '40%' }} />
      <span className="chat-skeleton__bubble chat-skeleton__bubble--mine" style={{ width: '28%' }} />
    </div>
  );
}

/** A8 — an empty chat or inbox: a drawing and two lines instead of a bare sentence. */
export function ChatEmpty({ title, children }: Readonly<{ title: string; children?: ReactNode }>) {
  return (
    <div className="chat-empty">
      <svg viewBox="0 0 120 96" width="120" height="96" aria-hidden="true" focusable="false">
        <rect x="8" y="14" width="70" height="44" rx="14" className="chat-empty__theirs" />
        <path d="M22 58 L16 70 L34 58 Z" className="chat-empty__theirs" />
        <rect x="44" y="40" width="68" height="40" rx="14" className="chat-empty__mine" />
        <path d="M98 80 L106 90 L92 80 Z" className="chat-empty__mine" />
        <circle cx="30" cy="36" r="4" className="chat-empty__dot" />
        <circle cx="43" cy="36" r="4" className="chat-empty__dot" />
        <circle cx="56" cy="36" r="4" className="chat-empty__dot" />
        <rect x="58" y="54" width="40" height="5" rx="2.5" className="chat-empty__line" />
        <rect x="58" y="64" width="26" height="5" rx="2.5" className="chat-empty__line" />
      </svg>
      <b>{title}</b>
      {children ? <span>{children}</span> : null}
    </div>
  );
}

/**
 * A7 — the text box grows with what you write (up to ~6 lines). Browsers with CSS
 * `field-sizing` do it alone; the rest get the height set here. `reset` after sending.
 */
export function growTextarea(box: HTMLTextAreaElement | null, reset = false): void {
  if (!box || typeof CSS === 'undefined' || CSS.supports?.('field-sizing', 'content')) return;
  box.style.height = 'auto';
  if (!reset) box.style.height = `${Math.min(box.scrollHeight, 150)}px`;
}

/** A7 — a phone or tablet: «Cámara» only where there is one to point. */
export function useTouchScreen(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true);
  }, []);
  return touch;
}
