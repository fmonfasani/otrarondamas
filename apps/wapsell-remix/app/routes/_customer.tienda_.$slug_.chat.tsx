import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { StoreHeader } from '~/components/store/StoreHeader';
import { ApiError } from '~/services/api.server';
import { getStoreCustomer, signOutCookie } from '~/services/customer-session.server';
import { addToServerCart, fetchCustomerChat, fetchStore, sendCustomerMessage, type CustomerChat } from '~/services/store.server';
import { formatMoney, formatTime } from '~/utils/format';
import { NoticeLine, OrderCard } from '~/components/chat/OrderCard';
import { orderCardOf } from '~/utils/order-card';
import { useLiveSource, useLiveUpdates, useTabVisible, useTypingNotifier } from '~/hooks/useLiveUpdates';
import { playChime, titleWithCount } from '~/utils/alerts';
import { keepSlidOut, useWhenBackOnline } from '~/hooks/useRetry';
import { ensurePushSubscription, storePushSettings } from '~/utils/push';

/**
 * Chat of the store customer with the Business — /tienda/:slug/chat (STORE-V1-04).
 * The first message opens a conversation with the Owner (OR-B4-031), who answers from
 * Mensajes in the panel. Answers and «escribiendo…» appear at once through the page's own
 * stream (E1, chat/eventos); the token stays on the server. Without the stream, every 5 s.
 */

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? `Mensajes | ${data.store.nombre}` : 'Tienda no encontrada' },
];

const MAX_LENGTH = 2000;

/** E2 — the ticks of the customer's own messages, read aloud. */
const TICK_WORDS = { enviado: 'Enviado', entregado: 'Entregado', leido: 'Leído' } as const;

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
  const content = String(form.get('content') ?? '').trim();
  const clientMessageId = String(form.get('clientMessageId') ?? '');
  if (!content) return json({ ok: false, message: 'Escribí un mensaje.', added: '' }, { status: 400 });
  if (content.length > MAX_LENGTH) {
    return json({ ok: false, message: `El mensaje puede tener hasta ${MAX_LENGTH} caracteres.`, added: '' }, { status: 400 });
  }
  if (!clientMessageId) return json({ ok: false, message: 'No pudimos enviar el mensaje.', added: '' }, { status: 400 });
  try {
    await sendCustomerMessage(customer.jwt, slug, clientMessageId, content);
    return json({ ok: true, message: '', added: '' });
  } catch (error) {
    if (error instanceof ApiError) return json({ ok: false, message: error.message, added: '' }, { status: error.status });
    if (error instanceof Response) throw error;
    // Paquete 1 F3: the API did not answer — keep the text for «Reintentar».
    return json({ ok: false, message: 'No se pudo enviar. Revisá tu conexión y reintentá.', added: '' }, { status: 503 });
  }
}

export default function CustomerChat() {
  const { store, customer, chat: newest, error } = useLoaderData<typeof loader>();
  // Paquete 1 F2: older pages the customer asked for, above the newest page (which stays live).
  const olderPage = useFetcher<typeof loader>();
  const [older, setOlder] = useState<typeof newest.messages>([]);
  const [olderMore, setOlderMore] = useState<boolean | null>(null);
  useEffect(() => {
    const page = olderPage.data?.chat;
    if (olderPage.state !== 'idle' || !page) return;
    setOlder((current) => {
      const known = new Set(current.map((m) => m.id));
      return [...page.messages.filter((m) => !known.has(m.id)), ...current];
    });
    setOlderMore(Boolean(page.hayMas));
  }, [olderPage.state, olderPage.data]);
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
  const [draft, setDraft] = useState('');
  const [clientMessageId, setClientMessageId] = useState(() => newMessageId());
  const end = useRef<HTMLDivElement>(null);
  const sending = send.state !== 'idle';

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
    }
  }, [send.state, send.data]);

  // Follows the newest message (a page stays at 50, so its length would not change).
  const newestId = newest.messages[newest.messages.length - 1]?.id;
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [newestId, storeTyping]);

  const submit = () => {
    if (!draft.trim() || sending) return;
    send.submit({ content: draft, clientMessageId }, { method: 'post' });
  };
  // Paquete 1 F3: a message that did not go out goes by itself when the connection is back.
  useWhenBackOnline(send.state === 'idle' && send.data?.ok === false && Boolean(draft.trim()), submit);
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <main className="store-shell">
      <StoreHeader store={store} customerName={customer.nombre}>
        <Link className="cart-trigger" to={`/tienda/${store.slug}?carrito=1`}>Mi pedido</Link>
      </StoreHeader>
      <section className="chat-section">
        <div className="account-intro">
          <span className="eyebrow">MENSAJES</span>
          <h1>Hablá con {store.nombre}</h1>
          {chat.tiendaEnLinea ? <span className="store-online">● En línea</span> : null}
          <ReplyAlerts slug={store.slug} />
          <p>Consultá por productos, envíos o tu pedido. Te responden por acá.</p>
        </div>
        <div className="store-chat" aria-live="polite">
          {error ? <output className="form-error">{error}</output> : null}
          {canLoadOlder ? (
            <button type="button" className="chat-older" onClick={loadOlder} disabled={olderPage.state !== 'idle'}>
              {olderPage.state !== 'idle' ? 'Cargando…' : 'Ver mensajes anteriores'}
            </button>
          ) : null}
          {!error && chat.messages.length === 0 ? (
            <p className="store-chat__empty">Todavía no hay mensajes. Escribí tu consulta y el comercio te va a responder acá.</p>
          ) : null}
          {chat.messages.map((message) => {
            // OR-B4-053: the order as one live card; the system's other notices as short lines.
            const orderCard = message.aviso ? orderCardOf(message) : null;
            if (orderCard) {
              return <OrderCard key={message.id} card={orderCard} time={formatTime(message.createdAt)} href={`/tienda/${store.slug}/cuenta`} />;
            }
            if (message.aviso) {
              return <NoticeLine key={message.id} text={message.content ?? ''} time={formatTime(message.createdAt)} />;
            }
            return (
            <div key={message.id} className={`store-bubble ${message.mine ? 'store-bubble--mine' : ''}`}>
              {message.mine ? null : <span className="store-bubble__from">{store.nombre}</span>}
              {message.adjuntos?.some((a) => a.tipo === 'imagen' || a.tipo === 'archivo') ? (
                <>
                  {message.adjuntos
                    .filter((a) => a.tipo === 'imagen' || a.tipo === 'archivo')
                    .map((a) =>
                      a.tipo === 'imagen' ? (
                        <a key={a.id} href={`/tienda/${store.slug}/chat/adjunto/${a.id}`} target="_blank" rel="noreferrer" className="store-chat-photo">
                          <img src={`/tienda/${store.slug}/chat/adjunto/${a.id}`} alt={a.nombre} loading="lazy" />
                        </a>
                      ) : (
                        <a key={a.id} href={`/tienda/${store.slug}/chat/adjunto/${a.id}`} className="store-chat-file">
                          📄 {a.nombre}
                        </a>
                      ),
                    )}
                  {message.content && !message.adjuntos.some((a) => a.nombre === message.content) ? <p>{message.content}</p> : null}
                </>
              ) : message.adjuntos?.some((a) => a.tipo === 'producto') ? (
                message.adjuntos
                  .filter((a) => a.tipo === 'producto' && a.productoId)
                  .map((a) => (
                    <span key={a.id} className="store-product-card">
                      <b>{a.nombre}</b>
                      {a.precioFinal ? (
                        <span className="store-product-card__price">
                          <s>{formatMoney(a.precio ?? '0')}</s> <b>{formatMoney(a.precioFinal)}</b>
                        </span>
                      ) : (
                        <span>{formatMoney(a.precio ?? '0')}</span>
                      )}
                      {cart.state === 'idle' && cart.data?.ok && cart.data.added === a.productoId ? (
                        <Link to={`/tienda/${store.slug}?carrito=1`}>Agregado · Ver mi pedido</Link>
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
                  ))
              ) : (
                <p>{message.content ?? 'Mensaje eliminado'}</p>
              )}
              <time dateTime={message.createdAt}>
                {formatTime(message.createdAt)}
                {message.mine && message.estado ? (
                  <span
                    className={`store-tick store-tick--${message.estado}`}
                    aria-label={TICK_WORDS[message.estado]}
                    title={TICK_WORDS[message.estado]}
                  >
                    {message.estado === 'enviado' ? ' ✓' : ' ✓✓'}
                  </span>
                ) : null}
              </time>
            </div>
            );
          })}
          {storeTyping ? <p className="store-chat__typing">{store.nombre} está escribiendo…</p> : null}
          <div ref={end} />
        </div>
        <send.Form
          method="post"
          className="store-chat__composer"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="store-plus">
            <button
              type="button"
              className={`store-plus__button${menuOpen ? ' is-open' : ''}`}
              aria-label="Más opciones"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              +
            </button>
            {menuOpen ? (
              <div className="store-plus__menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  disabled={upload.state !== 'idle'}
                  onClick={() => {
                    setMenuOpen(false);
                    fileRef.current?.click();
                  }}
                >
                  📎 {upload.state !== 'idle' ? 'Enviando…' : 'Foto o PDF'}
                </button>
              </div>
            ) : null}
          </div>
          <label className="sr-only" htmlFor="chat-content">Tu mensaje</label>
          <textarea
            id="chat-content"
            name="content"
            rows={1}
            maxLength={MAX_LENGTH}
            placeholder="Escribí un mensaje"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              notifyTyping();
            }}
            onKeyDown={onKeyDown}
          />
          <button type="submit" className="store-send" aria-label="Enviar" disabled={sending || !draft.trim()}>
            ↑
          </button>
        </send.Form>
        {send.data && !send.data.ok && send.state === 'idle' ? (
          <output className="form-error">
            {send.data.message}{' '}
            <button type="button" className="chat-retry" onClick={submit}>
              Reintentar
            </button>
          </output>
        ) : null}
        {cart.data && !cart.data.ok ? <output className="form-error">{cart.data.message}</output> : null}
        <upload.Form method="post" encType="multipart/form-data" action={`/tienda/${store.slug}/chat/adjuntar`} hidden>
          <input
            ref={fileRef}
            type="file"
            name="archivo"
            aria-label="Foto o PDF"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) upload.submit(event.currentTarget.form);
              event.currentTarget.value = '';
            }}
          />
        </upload.Form>
        {upload.state === 'idle' && upload.data && !upload.data.ok ? <output className="form-error">{upload.data.message}</output> : null}
      </section>
    </main>
  );
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
  if (state === 'on') return <span className="store-alerts" aria-live="polite">🔔 Te avisamos cuando te respondan</span>;
  return (
    <button
      type="button"
      className="store-alerts"
      onClick={async () => {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return setState(permission === 'denied' ? 'blocked' : 'ask');
        setState((await ensurePushSubscription(storePushSettings(slug))) ? 'on' : 'unknown');
      }}
    >
      🔔 Avisarme cuando me respondan
    </button>
  );
}
