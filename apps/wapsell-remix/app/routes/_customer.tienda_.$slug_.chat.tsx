import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, Bell, BellRing, Camera, Copy, FileText, ImageIcon, Package, Pencil, Plus, Reply, SendHorizontal, ShoppingBag } from 'lucide-react';
import {
  EmojiButton,
  MessageMedia,
  MicButton,
  MicDenied,
  RecorderBar,
  insertAtCursor,
  usePhotoViewer,
  useVoiceRecorder,
} from '~/components/chat/Media';
import { StoreHeader } from '~/components/store/StoreHeader';
import { ApiError } from '~/services/api.server';
import { getStoreCustomer, signOutCookie } from '~/services/customer-session.server';
import {
  addToServerCart,
  deleteCustomerMessage,
  editCustomerMessage,
  fetchCustomerChat,
  fetchStore,
  reactAsCustomer,
  sendCustomerMessage,
  type CustomerChat,
} from '~/services/store.server';
import { formatMoney } from '~/utils/format';
import { storeMark } from '~/utils/store';
import {
  CHAT_PHOTO_OR_VIDEO_ACCEPT,
  bubbleRuns,
  canStillDelete,
  canStillEdit,
  fileTooBig,
  groupByDay,
  isFileName,
  mediaOf,
  messageTime,
  shortText,
} from '~/utils/messaging';
import { NoticeLine, OrderCard } from '~/components/chat/OrderCard';
import {
  Bubble,
  BubbleMeta,
  ChatAvatar,
  ChatEmpty,
  DayDivider,
  NewBelow,
  TypingBubble,
  growTextarea,
  useTouchScreen,
} from '~/components/chat/ChatParts';
import { orderCardOf } from '~/utils/order-card';
import {
  ComposerContext,
  DeletedText,
  ForwardedTag,
  MenuButton,
  MessageMenu,
  QuoteLine,
  ReactionChips,
  useJumpTo,
  usePressToOpen,
  type MessageAction,
} from '~/components/chat/MessageActions';
import { useLiveSource, useLiveUpdates, useTabVisible, useTypingNotifier } from '~/hooks/useLiveUpdates';
import { useStickToBottom } from '~/hooks/useStickToBottom';
import { playChime, titleWithCount } from '~/utils/alerts';
import { keepSlidOut, useWhenBackOnline } from '~/hooks/useRetry';
import { ensurePushSubscription, storePushSettings } from '~/utils/push';

/**
 * Chat of the store customer with the Business — /tienda/:slug/chat (STORE-V1-04).
 * The first message opens a conversation with the Owner (OR-B4-031), who answers from
 * Mensajes in the panel. Answers and «escribiendo…» appear at once through the page's own
 * stream (E1, chat/eventos); the token stays on the server. Without the stream, every 5 s.
 * Paquete 2: it looks like the panel's chat, and fills the phone's screen like WhatsApp.
 */

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? `Mensajes | ${data.store.nombre}` : 'Tienda no encontrada' },
];

const MAX_LENGTH = 2000;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? '';
  const store = await fetchStore(slug).catch(() => {
    throw new Response('No pudimos cargar la tienda.', { status: 503 });
  });
  if (!store) throw new Response('Tienda no encontrada', { status: 404 });
  const customer = await getStoreCustomer(request, slug);
  if (!customer) throw redirect(`/tienda/${slug}/cuenta?volver=chat`);
  try {
    const chat = await fetchCustomerChat(customer.jwt, slug, new URL(request.url).searchParams.get('antes'));
    return json({ store, customer: { nombre: customer.nombre }, chat, error: null as string | null });
  } catch (error) {
    if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
      throw redirect(`/tienda/${slug}/cuenta?volver=chat`, { headers: { 'Set-Cookie': await signOutCookie(request) } });
    }
    return json({
      store,
      customer: { nombre: customer.nombre },
      chat: { conversationId: null, messages: [] } as CustomerChat,
      error: 'No pudimos cargar tus mensajes. Probá de nuevo en unos minutos.',
    });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const slug = params.slug ?? '';
  const customer = await getStoreCustomer(request, slug);
  if (!customer) throw redirect(`/tienda/${slug}/cuenta?volver=chat`);
  const form = await request.formData();
  if (form.get('intent') === 'cart-add') {
    try {
      await addToServerCart(customer.jwt, String(form.get('productoId') ?? ''));
      return json({ ok: true, message: '', added: String(form.get('productoId') ?? '') });
    } catch (error) {
      if (error instanceof ApiError) return json({ ok: false, message: error.message, added: '' }, { status: error.status });
      throw error;
    }
  }
  // E4: react, edit or delete one message of the chat.
  const intent = String(form.get('intent') ?? 'send');
  const messageId = String(form.get('messageId') ?? '');
  if (intent === 'react' || intent === 'delete') {
    try {
      if (intent === 'react') await reactAsCustomer(customer.jwt, slug, messageId, String(form.get('emoji') ?? '') || null);
      else await deleteCustomerMessage(customer.jwt, slug, messageId);
      return json({ ok: true, message: '', added: '' });
    } catch (error) {
      if (error instanceof ApiError) return json({ ok: false, message: error.message, added: '' }, { status: error.status });
      throw error;
    }
  }
  const content = String(form.get('content') ?? '').trim();
  const clientMessageId = String(form.get('clientMessageId') ?? '');
  if (!content) return json({ ok: false, message: 'Escribí un mensaje.', added: '' }, { status: 400 });
  if (content.length > MAX_LENGTH) {
    return json({ ok: false, message: `El mensaje puede tener hasta ${MAX_LENGTH} caracteres.`, added: '' }, { status: 400 });
  }
  if (intent === 'edit') {
    try {
      await editCustomerMessage(customer.jwt, slug, messageId, content);
      return json({ ok: true, message: '', added: '' });
    } catch (error) {
      if (error instanceof ApiError) return json({ ok: false, message: error.message, added: '' }, { status: error.status });
      throw error;
    }
  }
  if (!clientMessageId) return json({ ok: false, message: 'No pudimos enviar el mensaje.', added: '' }, { status: 400 });
  try {
    await sendCustomerMessage(customer.jwt, slug, clientMessageId, content, String(form.get('replyToMessageId') ?? '') || null);
    return json({ ok: true, message: '', added: '' });
  } catch (error) {
    if (error instanceof ApiError) return json({ ok: false, message: error.message, added: '' }, { status: error.status });
    if (error instanceof Response) throw error;
    // Paquete 1 F3: the API did not answer — keep the text for «Reintentar».
    return json({ ok: false, message: 'No se pudo enviar. Revisá tu conexión y reintentá.', added: '' }, { status: 503 });
  }
}

type FilePick = 'foto' | 'camara' | 'archivo';

/** What each «+» option lets the customer pick (the API takes JPG, PNG, WebP, PDF and, E5, video). */
const FILE_PICKS: Record<FilePick, string> = {
  foto: CHAT_PHOTO_OR_VIDEO_ACCEPT,
  camara: CHAT_PHOTO_OR_VIDEO_ACCEPT,
  archivo: 'application/pdf',
};

export default function CustomerChat() {
  const { store, customer, chat: newest, error } = useLoaderData<typeof loader>();
  // Paquete 1 F2: older pages the customer asked for, above the newest page (which stays live).
  const olderPage = useFetcher<typeof loader>();
  const [older, setOlder] = useState<typeof newest.messages>([]);
  const [olderMore, setOlderMore] = useState<boolean | null>(null);
  const wall = useRef<HTMLDivElement>(null);
  const keepScroll = useRef<number | null>(null);
  useEffect(() => {
    const page = olderPage.data?.chat;
    if (olderPage.state !== 'idle' || !page) return;
    const el = wall.current;
    keepScroll.current = el ? el.scrollHeight - el.scrollTop : null;
    setOlder((current) => {
      const known = new Set(current.map((m) => m.id));
      return [...page.messages.filter((m) => !known.has(m.id)), ...current];
    });
    setOlderMore(Boolean(page.hayMas));
  }, [olderPage.state, olderPage.data]);
  useEffect(() => {
    // Stay on the same message while older ones appear above it.
    const el = wall.current;
    if (el && keepScroll.current !== null) el.scrollTop = el.scrollHeight - keepScroll.current;
    keepScroll.current = null;
  }, [older]);
  // A message that slides out of the newest page (a new one came in) stays with the older ones.
  const previousNewest = useRef(newest.messages);
  useEffect(() => {
    const before = previousNewest.current;
    previousNewest.current = newest.messages;
    if (older.length === 0 || newest.messages.length === 0) return;
    setOlder((current) => keepSlidOut(current, before, newest.messages));
  }, [newest.messages, older.length]);
  const chat = useMemo(() => {
    const known = new Set(newest.messages.map((m) => m.id));
    return { ...newest, messages: [...older.filter((m) => !known.has(m.id)), ...newest.messages] };
  }, [newest, older]);
  const canLoadOlder = (olderMore ?? newest.hayMas) === true;
  const loadOlder = () => {
    const oldest = chat.messages[0]?.id;
    if (oldest && olderPage.state === 'idle') olderPage.load(`/tienda/${store.slug}/chat?antes=${encodeURIComponent(oldest)}`);
  };
  const send = useFetcher<typeof action>();
  const cart = useFetcher<typeof action>();
  const upload = useFetcher<{ ok: boolean; message: string }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState('');
  const [clientMessageId, setClientMessageId] = useState(() => newMessageId());
  const sending = send.state !== 'idle';
  // E4: an edit goes out through `send` too, but it is not a new bubble.
  const pending = sending && send.formData?.get('intent') !== 'edit' ? String(send.formData?.get('content') ?? '').trim() : '';
  const act = useFetcher<typeof action>();
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [menuFor, setMenuFor] = useState<ChatMessage | null>(null);
  const jumpTo = useJumpTo({
    canLoadOlder: (olderMore ?? newest.hayMas) === true,
    loading: olderPage.state !== 'idle',
    loadOlder: () => {
      const oldest = chat.messages[0]?.id;
      if (oldest) olderPage.load(`/tienda/${store.slug}/chat?antes=${encodeURIComponent(oldest)}`);
    },
    loadedCount: chat.messages.length,
  });
  const whoWrote = (m: { mine?: boolean; mia?: boolean }) => (m.mine ?? m.mia ? 'Vos' : store.nombre);
  const react = (messageId: string, emoji: string | null) =>
    act.submit({ intent: 'react', messageId, emoji: emoji ?? '' }, { method: 'post' });
  const startEdit = (message: ChatMessage) => {
    setReplyTo(null);
    setEditing(message);
    setDraft(message.content ?? '');
    requestAnimationFrame(() => {
      const box = boxRef.current;
      if (!box) return;
      growTextarea(box);
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    });
  };
  const stopEdit = () => {
    setEditing(null);
    setDraft('');
    growTextarea(boxRef.current, true);
  };
  const startReply = (message: ChatMessage) => {
    if (editing) stopEdit();
    setReplyTo(message);
    boxRef.current?.focus();
  };
  const touch = useTouchScreen();
  // E5: a file over its limit is said before uploading it.
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const uploadAction = `/tienda/${store.slug}/chat/adjuntar`;
  // E5: the voice note goes like a file, marked as coming from the microphone.
  const voice = useVoiceRecorder(({ file, seconds }) => {
    const form = new FormData();
    form.append('archivo', file, file.name);
    form.append('voz', '1');
    form.append('duracion', String(seconds));
    upload.submit(form, { method: 'post', encType: 'multipart/form-data', action: uploadAction });
  });
  const fileUrl = (id: string) => `/tienda/${store.slug}/chat/adjunto/${id}`;
  // E5: the chat's photos, to go through them full screen.
  const photos = useMemo(
    () =>
      chat.messages.flatMap((m) =>
        m.eliminado ? [] : mediaOf(m).filter((a) => a.tipo === 'imagen').map((a) => ({ id: a.id, nombre: 'nombre' in a ? a.nombre : 'foto' })),
      ),
    [chat.messages],
  );
  const { openPhoto, viewer } = usePhotoViewer(photos, fileUrl);
  const addEmoji = (emoji: string) => {
    const box = boxRef.current;
    if (!box) return;
    setDraft(insertAtCursor(box, emoji));
    growTextarea(box);
  };

  // E1: the store's answers and «escribiendo…» at once — also with the tab in the background
  // (E2), so the title can count them; reading happens only when the customer looks.
  const live = useLiveSource(`/tienda/${store.slug}/chat/eventos`);
  const { typing } = useLiveUpdates(live, { paused: sending, whenHidden: true });
  const storeTyping = Object.keys(typing).length > 0;
  const notifyTyping = useTypingNotifier(`/tienda/${store.slug}/chat/escribiendo`, null);

  // E2: read while in front; count, title and chime while in the background.
  const visible = useTabVisible();
  const fromStore = chat.messages.filter((m) => !m.mine);
  const newestFromStore = fromStore[fromStore.length - 1]?.id ?? null;
  const markedRead = useRef<string | null>(null);
  useEffect(() => {
    if (!visible || !newestFromStore || markedRead.current === newestFromStore) return;
    markedRead.current = newestFromStore;
    fetch(`/tienda/${store.slug}/chat/leido`, { method: 'POST', credentials: 'same-origin' }).catch(() => {
      // Best-effort: the next look marks it.
    });
  }, [visible, newestFromStore, store.slug]);
  const seenFromStore = useRef(fromStore.length);
  const unseenBefore = useRef(0);
  useEffect(() => {
    if (visible) {
      seenFromStore.current = fromStore.length;
      unseenBefore.current = 0;
      document.title = titleWithCount(document.title, 0);
      return;
    }
    const unseen = Math.max(0, fromStore.length - seenFromStore.current);
    if (unseen > unseenBefore.current) playChime();
    unseenBefore.current = unseen;
    document.title = titleWithCount(document.title, unseen);
  }, [visible, fromStore.length]);

  // Sent: clear the box and take a new retry key (a failed send keeps both, so retrying
  // the same message cannot duplicate it).
  useEffect(() => {
    if (send.state === 'idle' && send.data?.ok) {
      setDraft('');
      setClientMessageId(newMessageId());
      setReplyTo(null);
      setEditing(null);
      growTextarea(boxRef.current, true);
    }
  }, [send.state, send.data]);

  // Paquete 2 A6: follow the newest message while at the bottom; «↓ N nuevos» while reading above.
  const items = useMemo(() => chat.messages.map((m) => ({ id: m.id, mine: Boolean(m.mine) })), [chat.messages]);
  const { unseen, away, toBottom } = useStickToBottom(wall, items, { extraBelow: storeTyping || Boolean(pending) });

  const submit = () => {
    if (!draft.trim() || sending) return;
    if (editing) {
      send.submit({ intent: 'edit', messageId: editing.id, content: draft }, { method: 'post' });
      return;
    }
    send.submit({ content: draft, clientMessageId, replyToMessageId: replyTo?.id ?? '' }, { method: 'post' });
  };
  // Paquete 1 F3: a message that did not go out goes by itself when the connection is back.
  useWhenBackOnline(send.state === 'idle' && send.data?.ok === false && Boolean(draft.trim()), submit);
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' && (editing || replyTo)) {
      if (editing) stopEdit();
      setReplyTo(null);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };
  const pick = (kind: FilePick) => {
    setMenuOpen(false);
    const input = fileRef.current;
    if (!input) return;
    input.accept = FILE_PICKS[kind];
    if (kind === 'camara') input.setAttribute('capture', 'environment');
    else input.removeAttribute('capture');
    input.click();
  };

  let status = 'Te responden por acá';
  let statusClass = '';
  if (storeTyping) {
    status = 'escribiendo…';
    statusClass = ' is-typing';
  } else if (chat.tiendaEnLinea) {
    status = 'en línea';
    statusClass = ' is-online';
  }

  return (
    <main className="store-shell store-shell--chat">
      <StoreHeader store={store} customerName={customer.nombre}>
        <Link className="cart-trigger" to={`/tienda/${store.slug}?carrito=1`}>Mi pedido</Link>
      </StoreHeader>
      <section className="chat-screen store-chat-screen" aria-label={`Mensajes con ${store.nombre}`}>
        <header className="chat-head">
          <Link className="chat-head__back chat-only-mobile" to={`/tienda/${store.slug}`} aria-label="Volver a la tienda">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <ChatAvatar name={store.nombre} letters={storeMark(store.nombre)} tone="store" online={Boolean(chat.tiendaEnLinea)} />
          <span className="chat-head__who">
            <h1>{store.nombre}</h1>
            <span className={`chat-head__status${statusClass}`}>{status}</span>
          </span>
          <span className="chat-head__actions">
            <ReplyAlerts slug={store.slug} />
            <Link className="chat-head__action chat-only-mobile" to={`/tienda/${store.slug}?carrito=1`} aria-label="Mi pedido">
              <ShoppingBag size={15} aria-hidden="true" />
            </Link>
          </span>
        </header>

        <div className="chat-wall-wrap">
          <div className="chat-wall" ref={wall} aria-live="polite">
            {error ? <output className="form-error">{error}</output> : null}
            {canLoadOlder ? (
              <button type="button" className="chat-older" onClick={loadOlder} disabled={olderPage.state !== 'idle'}>
                {olderPage.state === 'idle' ? 'Ver mensajes anteriores' : 'Cargando…'}
              </button>
            ) : null}
            {!error && chat.messages.length === 0 && !pending ? (
              <ChatEmpty title={`Escribile a ${store.nombre}`}>
                Consultá por productos, envíos o tu pedido. Te responden por acá.
              </ChatEmpty>
            ) : null}
            {groupByDay(chat.messages).map((day) => {
              const runs = bubbleRuns(day.items, (m) => {
                if (m.aviso) return null;
                return m.mine ? 'me' : 'store';
              });
              return (
                <div key={day.key} className="chat-day-group">
                  <DayDivider label={day.label} />
                  {day.items.map((message, index) => {
                    // OR-B4-053: the order as one live card; the system's other notices as short lines.
                    const orderCard = message.aviso ? orderCardOf(message) : null;
                    if (orderCard) {
                      return <OrderCard key={message.id} card={orderCard} time={messageTime(message.createdAt)} href={`/tienda/${store.slug}/cuenta`} />;
                    }
                    if (message.aviso) {
                      return <NoticeLine key={message.id} text={message.content ?? ''} time={messageTime(message.createdAt)} />;
                    }
                    return (
                      <CustomerBubble
                        key={message.id}
                        message={message}
                        run={runs[index]}
                        slug={store.slug}
                        cart={cart}
                        quoteWho={message.respuesta ? whoWrote(message.respuesta) : ''}
                        onOpenMenu={() => setMenuFor(message)}
                        onReact={(emoji) => react(message.id, emoji)}
                        onQuote={jumpTo}
                        onOpenPhoto={openPhoto}
                      />
                    );
                  })}
                </div>
              );
            })}
            {pending ? (
              <Bubble mine run={{ cont: false, tail: true }} text={pending} pending meta={<BubbleMeta time="" estado="pendiente" />} />
            ) : null}
            {storeTyping ? <TypingBubble label={`${store.nombre} está escribiendo…`} /> : null}
          </div>
          <NewBelow count={unseen} away={away} onClick={() => toBottom(true)} />
        </div>

        {send.data && !send.data.ok && send.state === 'idle' ? (
          <output className="chat-error">
            {send.data.message}{' '}
            <button type="button" className="chat-retry" onClick={submit}>
              Reintentar
            </button>
          </output>
        ) : null}
        {cart.data && !cart.data.ok ? <output className="chat-error">{cart.data.message}</output> : null}
        {act.state === 'idle' && act.data && !act.data.ok ? <output className="chat-error">{act.data.message}</output> : null}
        {menuFor ? (
          <MessageMenu
            preview={menuFor.eliminado ? '' : shortText(menuFor.content) || 'Foto o archivo'}
            myReaction={menuFor.reacciones?.find((r) => r.mia)?.emoji ?? null}
            onReact={menuFor.eliminado ? null : (emoji) => react(menuFor.id, emoji)}
            actions={customerActions(menuFor, { reply: startReply, edit: startEdit })}
            confirmDelete={
              menuFor.mine && !menuFor.eliminado && canStillDelete(menuFor.createdAt)
                ? () => act.submit({ intent: 'delete', messageId: menuFor.id }, { method: 'post' })
                : null
            }
            onClose={() => setMenuFor(null)}
          />
        ) : null}
        {replyTo ? (
          <ComposerContext kind="reply" who={whoWrote(replyTo)} text={shortText(replyTo.content) || 'Archivo'} onClose={() => setReplyTo(null)} />
        ) : null}
        {editing ? <ComposerContext kind="edit" who="" text={shortText(editing.content)} onClose={stopEdit} /> : null}
        {upload.state === 'idle' && upload.data && !upload.data.ok ? <output className="chat-error">{upload.data.message}</output> : null}
        {fileProblem ? <output className="chat-error">{fileProblem}</output> : null}
        {voice.state === 'denied' ? <MicDenied /> : null}
        {upload.state !== 'idle' ? <output className="chat-sending">Enviando…</output> : null}
        {voice.state === 'recording' ? (
          <RecorderBar seconds={voice.seconds} onCancel={() => voice.stop(false)} onSend={() => voice.stop(true)} />
        ) : (
        <send.Form
          method="post"
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="chat-plus">
            <button
              type="button"
              className={`chat-round chat-plus__button${menuOpen ? ' is-open' : ''}`}
              aria-label="Adjuntar"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Plus size={22} aria-hidden="true" />
            </button>
            {menuOpen ? (
              <div className="chat-menu" role="menu">
                <button type="button" role="menuitem" disabled={upload.state !== 'idle'} onClick={() => pick('foto')}>
                  <span className="chat-menu__icon chat-menu__icon--photo">
                    <ImageIcon size={16} aria-hidden="true" />
                  </span>
                  {upload.state === 'idle' ? 'Foto o video' : 'Enviando…'}
                </button>
                {touch ? (
                  <button type="button" role="menuitem" disabled={upload.state !== 'idle'} onClick={() => pick('camara')}>
                    <span className="chat-menu__icon chat-menu__icon--camera">
                      <Camera size={16} aria-hidden="true" />
                    </span>
                    Cámara
                  </button>
                ) : null}
                <button type="button" role="menuitem" disabled={upload.state !== 'idle'} onClick={() => pick('archivo')}>
                  <span className="chat-menu__icon chat-menu__icon--file">
                    <FileText size={16} aria-hidden="true" />
                  </span>
                  Documento PDF
                </button>
              </div>
            ) : null}
          </div>
          <EmojiButton onPick={addEmoji} />
          <label className="sr-only" htmlFor="chat-content">Tu mensaje</label>
          <textarea
            ref={boxRef}
            id="chat-content"
            name="content"
            rows={1}
            maxLength={MAX_LENGTH}
            placeholder="Escribí un mensaje"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              growTextarea(event.currentTarget);
              notifyTyping();
            }}
            onKeyDown={onKeyDown}
          />
          {!draft.trim() && !editing && voice.supported ? (
            <MicButton onClick={() => void voice.start()} disabled={upload.state !== 'idle'} />
          ) : (
            <button type="submit" className="chat-round chat-send" aria-label="Enviar" disabled={sending || !draft.trim()}>
              <SendHorizontal size={20} aria-hidden="true" />
            </button>
          )}
        </send.Form>
        )}
        {viewer}
        <upload.Form method="post" encType="multipart/form-data" action={`/tienda/${store.slug}/chat/adjuntar`} hidden>
          <input
            ref={fileRef}
            type="file"
            name="archivo"
            aria-label="Foto, video o PDF"
            accept={FILE_PICKS.foto}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              const problem = file ? fileTooBig(file) : null;
              setFileProblem(problem);
              if (file && !problem) upload.submit(event.currentTarget.form);
              event.currentTarget.value = '';
            }}
          />
        </upload.Form>
      </section>
    </main>
  );
}

type ChatMessage = CustomerChat['messages'][number];
type CartFetcher = ReturnType<typeof useFetcher<typeof action>>;

/** One message of the customer or the store: text, photos, files or product cards. */
function CustomerBubble({
  message,
  run,
  slug,
  cart,
  quoteWho,
  onOpenMenu,
  onReact,
  onQuote,
  onOpenPhoto,
}: Readonly<{
  message: ChatMessage;
  run: { cont: boolean; tail: boolean };
  slug: string;
  cart: CartFetcher;
  quoteWho: string;
  onOpenMenu: () => void;
  onReact: (emoji: string | null) => void;
  onQuote: (messageId: string) => void;
  onOpenPhoto: (id: string) => void;
}>) {
  const files = mediaOf(message);
  const products = (message.adjuntos ?? []).filter((a) => a.tipo === 'producto' && a.productoId);
  // E4: «Se eliminó este mensaje» — what it said is gone.
  const deleted = Boolean(message.eliminado) || (message.content == null && files.length === 0 && products.length === 0);
  let text: string | null = message.content ?? null;
  if (products.length > 0 || deleted) text = null;
  else if (isFileName(message.content, files)) text = null;
  const press = usePressToOpen(onOpenMenu);
  const meta = (
    <BubbleMeta
      time={messageTime(message.createdAt)}
      dateTime={message.createdAt}
      edited={Boolean(message.editado)}
      estado={message.mine && !deleted ? message.estado : null}
    />
  );
  const top =
    message.reenviado || (message.respuesta && !deleted) ? (
      <>
        {message.reenviado ? <ForwardedTag /> : null}
        {message.respuesta && !deleted ? (
          <QuoteLine who={quoteWho} quote={message.respuesta} mine={message.respuesta.mia} onOpen={() => onQuote(message.respuesta!.id)} />
        ) : null}
      </>
    ) : null;
  return (
    <Bubble
      id={message.id}
      mine={Boolean(message.mine)}
      run={run}
      text={text}
      meta={meta}
      deleted={deleted}
      top={top}
      press={press}
      menu={<MenuButton onClick={onOpenMenu} />}
      reactions={
        message.reacciones?.length && !deleted ? <ReactionChips reactions={message.reacciones} onPick={onReact} /> : null
      }
    >
      {deleted ? null : (
        <MessageMedia
          items={files}
          fileUrl={(id) => `/tienda/${slug}/chat/adjunto/${id}`}
          mine={Boolean(message.mine)}
          onOpenPhoto={onOpenPhoto}
        />
      )}
      {products.map((a) => (
        <span key={a.id} className="chat-product">
          <span className="chat-product__name">
            <Package size={16} aria-hidden="true" /> {a.nombre}
          </span>
          {a.precioFinal ? (
            <span className="chat-product__price">
              <s>{formatMoney(a.precio ?? '0')}</s> <b>{formatMoney(a.precioFinal)}</b>
            </span>
          ) : (
            <span className="chat-product__price">{formatMoney(a.precio ?? '0')}</span>
          )}
          {cart.state === 'idle' && cart.data?.ok && cart.data.added === a.productoId ? (
            <Link to={`/tienda/${slug}?carrito=1`}>Agregado · Ver mi pedido</Link>
          ) : (
            <cart.Form method="post">
              <input type="hidden" name="intent" value="cart-add" />
              <input type="hidden" name="productoId" value={a.productoId} />
              <button type="submit" className="submit-order" disabled={cart.state !== 'idle'}>
                Agregar a mi pedido
              </button>
            </cart.Form>
          )}
        </span>
      ))}
      {deleted ? <DeletedText mine={Boolean(message.mine)} /> : null}
    </Bubble>
  );
}

/** E4 — what the customer can do with a message: reply, copy, and edit their own text (15 min). */
function customerActions(
  message: ChatMessage,
  { reply, edit }: { reply: (m: ChatMessage) => void; edit: (m: ChatMessage) => void },
): MessageAction[] {
  if (message.eliminado) return [];
  const actions: MessageAction[] = [{ key: 'reply', label: 'Responder', icon: <Reply size={18} aria-hidden="true" />, run: () => reply(message) }];
  if (message.content) {
    actions.push({
      key: 'copy',
      label: 'Copiar',
      icon: <Copy size={18} aria-hidden="true" />,
      run: () => {
        navigator.clipboard?.writeText(message.content ?? '').catch(() => {
          // Nothing to do: the browser did not let us copy.
        });
      },
    });
  }
  if (message.editable && canStillEdit(message.createdAt)) {
    actions.push({ key: 'edit', label: 'Editar', icon: <Pencil size={18} aria-hidden="true" />, run: () => edit(message) });
  }
  return actions;
}

function newMessageId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(performance.now() * 1000)}`;
}

/**
 * Paquete 1 F1 — «Avisarme cuando me respondan»: with the customer's OK, the store's answers
 * (and «Confirmamos tu pedido») reach this browser with the store closed. Once allowed, it
 * re-subscribes by itself; it hides where the browser cannot do push.
 */
function ReplyAlerts({ slug }: Readonly<{ slug: string }>) {
  const [state, setState] = useState<'unknown' | 'ask' | 'on' | 'blocked'>('unknown');
  useEffect(() => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'granted') {
      ensurePushSubscription(storePushSettings(slug))
        .then((ok) => setState(ok ? 'on' : 'unknown'))
        .catch(() => setState('unknown'));
    } else {
      setState(Notification.permission === 'denied' ? 'blocked' : 'ask');
    }
  }, [slug]);
  if (state === 'unknown' || state === 'blocked') return null;
  if (state === 'on') {
    return (
      <span className="chat-head__action store-alerts is-on" aria-live="polite" title="Te avisamos cuando te respondan">
        <BellRing size={15} aria-hidden="true" /> <span className="chat-only-wide">Avisos activos</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      className="chat-head__action store-alerts"
      title="Avisarme cuando me respondan"
      onClick={async () => {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return setState(permission === 'denied' ? 'blocked' : 'ask');
        setState((await ensurePushSubscription(storePushSettings(slug))) ? 'on' : 'unknown');
      }}
    >
      <Bell size={15} aria-hidden="true" /> <span className="chat-only-wide">Avisarme</span>
    </button>
  );
}
