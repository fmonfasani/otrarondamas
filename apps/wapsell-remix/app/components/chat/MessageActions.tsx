import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Ban, ChevronDown, Forward, Pencil, Reply, X } from 'lucide-react';
import { QUICK_REACTIONS, quotedText, type QuotedMessage, type ReactionChip } from '~/utils/messaging';

/**
 * E4 — what can be done with one message, like WhatsApp: react, reply quoting it, copy, edit
 * (15 minutes), delete for everyone (2 days) and, in the panel, star and forward. The menu opens
 * with the ⌄ on the bubble, a right click, or a long press on the phone. Styles in chat.css.
 */

export interface MessageAction {
  key: string;
  label: string;
  icon: ReactNode;
  run: () => void;
  danger?: boolean;
}

const LONG_PRESS_MS = 450;

/** Long press (touch) and right click (mouse) open the message's menu. */
export function usePressToOpen(open: () => void): HTMLAttributes<HTMLDivElement> {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => cancel, []);
  return {
    onPointerDown: (event) => {
      if (event.pointerType !== 'touch') return;
      start.current = { x: event.clientX, y: event.clientY };
      cancel();
      timer.current = setTimeout(() => {
        timer.current = null;
        navigator.vibrate?.(15);
        open();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (event) => {
      const from = start.current;
      if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > 10) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onContextMenu: (event) => {
      // A link or a photo keeps the browser's own menu (open, save…).
      if ((event.target as HTMLElement).closest('a, img')) return;
      event.preventDefault();
      cancel();
      open();
    },
  };
}

/** The ⌄ on the bubble's corner (shown on hover or focus). */
export function MenuButton({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button type="button" className="chat-bubble__menu" aria-label="Opciones del mensaje" aria-haspopup="dialog" onClick={onClick}>
      <ChevronDown size={18} aria-hidden="true" />
    </button>
  );
}

/**
 * The message's menu: a row of quick reactions and the actions. A sheet from the bottom on the
 * phone, a small card in the middle on a computer. «Eliminar» asks first.
 */
export function MessageMenu({
  preview,
  myReaction,
  onReact,
  actions,
  confirmDelete,
  onClose,
}: Readonly<{
  preview: string;
  /** The viewer's current reaction (choosing it again takes it back). */
  myReaction: string | null;
  onReact: ((emoji: string | null) => void) | null;
  actions: MessageAction[];
  /** «Eliminar» runs this after «¿Eliminar para todos?». */
  confirmDelete: (() => void) | null;
  onClose: () => void;
}>) {
  const [confirming, setConfirming] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // The card takes the focus (keyboard and screen readers start there), without marking a reaction.
    panel.current?.focus();
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  const act = (run: () => void) => {
    run();
    onClose();
  };
  return (
    <div
      className="chat-sheet"
      role="presentation"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div
        ref={panel}
        className="chat-sheet__panel"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Opciones del mensaje"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="chat-sheet__preview">{preview}</p>
        {confirming && confirmDelete ? (
          <div className="chat-sheet__confirm">
            <b>¿Eliminar para todos?</b>
            <span>El mensaje se borra para vos y para la otra persona. Queda «Se eliminó este mensaje».</span>
            <div className="chat-sheet__confirm-actions">
              <button type="button" className="chat-sheet__btn" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
              <button type="button" className="chat-sheet__btn chat-sheet__btn--danger" onClick={() => act(confirmDelete)}>
                Eliminar
              </button>
            </div>
          </div>
        ) : (
          <>
            {onReact ? (
              <div className="chat-sheet__reactions" role="group" aria-label="Reaccionar">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={emoji === myReaction ? 'is-mine' : undefined}
                    aria-pressed={emoji === myReaction}
                    aria-label={emoji === myReaction ? `Quitar ${emoji}` : `Reaccionar ${emoji}`}
                    onClick={() => act(() => onReact(emoji === myReaction ? null : emoji))}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
            <ul className="chat-sheet__actions">
              {actions.map((a) => (
                <li key={a.key}>
                  <button type="button" className={a.danger ? 'is-danger' : undefined} onClick={() => act(a.run)}>
                    {a.icon}
                    {a.label}
                  </button>
                </li>
              ))}
              {confirmDelete ? (
                <li>
                  <button type="button" className="is-danger" onClick={() => setConfirming(true)}>
                    <Ban size={18} aria-hidden="true" />
                    Eliminar para todos
                  </button>
                </li>
              ) : null}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

/** «Reenviado», above a forwarded message. */
export function ForwardedTag() {
  return (
    <span className="chat-forwarded">
      <Forward size={13} aria-hidden="true" /> Reenviado
    </span>
  );
}

/** The quoted message above a reply; a click takes you to it. */
export function QuoteLine({ who, quote, mine, onOpen }: Readonly<{ who: string; quote: QuotedMessage; mine: boolean; onOpen: () => void }>) {
  return (
    <button type="button" className={`chat-quote${mine ? ' is-mine' : ''}`} onClick={onOpen}>
      <b>{who}</b>
      <span>{quotedText(quote)}</span>
    </button>
  );
}

/** The reactions under a bubble: tap yours to take it back, another to react the same. */
export function ReactionChips({
  reactions,
  onPick,
  titleOf,
}: Readonly<{
  reactions: ReactionChip[];
  onPick: ((emoji: string | null) => void) | null;
  titleOf?: (chip: ReactionChip) => string;
}>) {
  if (reactions.length === 0) return null;
  return (
    <span className="chat-reactions">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          className={r.mia ? 'is-mine' : undefined}
          title={titleOf?.(r)}
          aria-label={`${r.emoji} ${r.cantidad}${r.mia ? ', tu reacción' : ''}`}
          disabled={!onPick}
          onClick={() => onPick?.(r.mia ? null : r.emoji)}
        >
          {r.emoji}
          {r.cantidad > 1 ? <small>{r.cantidad}</small> : null}
        </button>
      ))}
    </span>
  );
}

/** «Se eliminó este mensaje» / «Eliminaste este mensaje». */
export function DeletedText({ mine }: Readonly<{ mine: boolean }>) {
  return (
    <span className="chat-bubble__deleted">
      <Ban size={14} aria-hidden="true" /> {mine ? 'Eliminaste este mensaje' : 'Se eliminó este mensaje'}
    </span>
  );
}

/** Above the box: «Respondiendo a …» or «Editando», with ✕ to drop it. */
export function ComposerContext({
  kind,
  who,
  text,
  onClose,
}: Readonly<{ kind: 'reply' | 'edit'; who: string; text: string; onClose: () => void }>) {
  return (
    <div className={`chat-context chat-context--${kind}`}>
      {kind === 'reply' ? <Reply size={18} aria-hidden="true" /> : <Pencil size={18} aria-hidden="true" />}
      <span className="chat-context__body">
        <b>{kind === 'reply' ? `Respondiendo a ${who}` : 'Editando mensaje'}</b>
        <span>{text}</span>
      </span>
      <button type="button" className="chat-context__close" aria-label={kind === 'reply' ? 'No responder' : 'Cancelar edición'} onClick={onClose}>
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Takes the screen to a message and makes it blink. False when it is not loaded yet. */
export function jumpToMessage(id: string): boolean {
  const el = typeof document === 'undefined' ? null : document.getElementById(`msg-${id}`);
  if (!el) return false;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('is-flash');
  // Restart the animation when the same message is asked twice.
  void el.offsetWidth;
  el.classList.add('is-flash');
  setTimeout(() => el.classList.remove('is-flash'), 1600);
  return true;
}

/**
 * Goes to a message that may be in an older page: asks for older pages until it appears
 * (at most `maxPages`), then jumps. Returns the id still being looked for.
 */
export function useJumpTo({
  canLoadOlder,
  loading,
  loadOlder,
  loadedCount,
  maxPages = 10,
}: Readonly<{ canLoadOlder: boolean; loading: boolean; loadOlder: () => void; loadedCount: number; maxPages?: number }>) {
  const [target, setTarget] = useState<string | null>(null);
  const pages = useRef(0);
  useEffect(() => {
    if (!target || loading) return;
    if (jumpToMessage(target)) {
      setTarget(null);
      return;
    }
    if (canLoadOlder && pages.current < maxPages) {
      pages.current += 1;
      loadOlder();
    } else {
      setTarget(null);
    }
    // loadedCount: look again after each page arrives.
  }, [target, loading, loadedCount, canLoadOlder]);
  return (id: string) => {
    pages.current = 0;
    if (!jumpToMessage(id)) setTarget(id);
  };
}
