import { useEffect, useMemo, useRef, useState } from 'react';
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useFetcher, useLoaderData, useNavigation, useParams, useSearchParams } from '@remix-run/react';
import { ArrowLeft, Bell, Camera, Copy, Eye, FileText, Forward, ImageIcon, MessageSquareText, Minus, Package, Pencil, Plus, Reply, Search, SendHorizontal, ShoppingBag, SquarePen, Star, StarOff, Users, X } from 'lucide-react';
import { initials } from '~/components/panel/AppShell';
import { formatMoney } from '~/utils/format';
import { getCurrentUser, requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import {
  authorOf,
  bubbleRuns,
  canCreateOrder,
  canStillDelete,
  canStillEdit,
  canEditCustomerCart,
  CHAT_FILE_ACCEPT,
  CHAT_FILE_MAX_BYTES,
  fileAttachments,
  fileSize,
  fillQuickReply,
  productCards,
  conversationSubtitle,
  conversationTitle,
  customerOf,
  groupByDay,
  inboxTime,
  isOwnSide,
  matchesSearch,
  messageTime,
  previewText,
  shortText,
  sortByActivity,
  type Contact,
  type Conversation,
  type ConversationCart,
  type Message,
  type QuickReply,
} from '~/utils/messaging';
import type { SearchProduct } from '~/utils/sales';
import { useLiveSource, useLiveUpdates, useSharedLive, useTypingNotifier } from '~/hooks/useLiveUpdates';
import { badgeText } from '~/utils/alerts';
import { ensurePushSubscription } from '~/utils/push';
import { presenceKey, presenceLabel, typingLabel, type PresenceMap, type TypingSignal } from '~/utils/live';
import { NoticeLine, OrderCard } from '~/components/chat/OrderCard';
import { orderCardOf } from '~/utils/order-card';
import { keepSlidOut, newClientMessageId, useWhenBackOnline } from '~/hooks/useRetry';
import { useStickToBottom } from '~/hooks/useStickToBottom';
import {
  Bubble,
  BubbleMeta,
  ChatAvatar,
  ChatEmpty,
  ChatSkeleton,
  DayDivider,
  NewBelow,
  TypingBubble,
  growTextarea,
  useTouchScreen,
} from '~/components/chat/ChatParts';
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

/** E4 — a message found by search, or one of the viewer's ⭐. */
interface FoundMessage {
  id: string;
  conversationId: string;
  content: string | null;
  createdAt: string;
  authorUserId: string | null;
  authorCustomerId: string | null;
}

/** Paquete 1 F2 — messages per page, as the API sends them. */
const MESSAGES_PAGE = 50;

export const meta: MetaFunction = () => [{ title: 'Mensajes · Wapsell' }];

interface Customer {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  nivel?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  ASISTENTE_LOCAL: 'Vendedor',
  GESTOR_DE_STOCK: 'Gestor de stock',
};

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const url = new URL(request.url);
  const selectedId = url.searchParams.get('c');
  const composing = url.searchParams.get('nueva') === '1';
  // E4: messages found by their text, and the viewer's ⭐.
  const query = (url.searchParams.get('q') ?? '').trim();
  const showStarred = url.searchParams.get('destacados') === '1';

  const [conversations, me, quick, found, starred] = await Promise.all([
    settle(apiRequest<Conversation[]>(token, '/messaging/conversations')),
    getCurrentUser(token),
    settle(apiRequest<{ items: QuickReply[] }>(token, '/messaging/conversations/quick-replies')),
    query.length >= 2
      ? settle(apiRequest<FoundMessage[]>(token, `/messaging/conversations/search?q=${encodeURIComponent(query)}`))
      : null,
    showStarred ? settle(apiRequest<FoundMessage[]>(token, '/messaging/conversations/starred')) : null,
  ]);

  let selected: Conversation | null = null;
  let messages: Message[] = [];
  let customer: Customer | null = null;
  let cart: ConversationCart | null = null;
  if (selectedId && conversations) {
    const id = encodeURIComponent(selectedId);
    const [conversation, list] = await Promise.all([
      settle(apiRequest<Conversation>(token, `/messaging/conversations/${id}`)),
      settle(apiRequest<Message[]>(token, `/messaging/conversations/${id}/messages`)),
    ]);
    selected = conversation;
    messages = list ?? [];
    const customerParticipant = conversation ? customerOf(conversation) : undefined;
    const lastIncoming = conversation
      ? [...messages].reverse().find((m) => !authorOf(conversation, m)?.isViewer && !m.deletedAt)
      : undefined;
    await Promise.all([
      customerParticipant?.customerId
        ? settle(apiRequest<Customer>(token, `/clientes/${encodeURIComponent(customerParticipant.customerId)}`)).then(
            (found) => {
              customer = found;
            },
          )
        : null,
      customerParticipant
        ? settle(apiRequest<ConversationCart>(token, `/messaging/conversations/${id}/cart`)).then((found) => {
            cart = found;
          })
        : null,
      // Opening a conversation as a participant marks its latest incoming message read.
      conversation?.viewerAccess.canSend && lastIncoming
        ? settle(apiRequest(token, `/messaging/conversations/${id}/messages/${lastIncoming.id}/read`, { method: 'POST' }))
        : null,
    ]);
  }

  const [contacts, customers] = composing
    ? await Promise.all([
        settle(apiRequest<Contact[]>(token, '/messaging/conversations/contacts')),
        settle(apiRequest<Customer[]>(token, '/clientes')),
      ])
    : [null, null];

  return json({
    conversations: conversations ? sortByActivity(conversations) : null,
    selectedId,
    selected,
    messages,
    customer: customer as Customer | null,
    cart: cart as ConversationCart | null,
    composing,
    contacts: contacts ?? [],
    customers: customers ?? [],
    canEditCart: canEditCustomerCart(String(me?.rol ?? '')),
    quickReplies: quick?.items ?? [],
    found: found ?? [],
    starred: showStarred ? (starred ?? []) : null,
    jump: url.searchParams.get('m'),
  });
}

type ActionData = { ok: boolean; message?: string; orderId?: string };

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = form.get('intent');
  try {
    if (intent === 'send') {
      const conversationId = String(form.get('conversationId') ?? '');
      const content = String(form.get('content') ?? '').trim();
      if (!conversationId || !content) return json<ActionData>({ ok: false, message: 'Escribe un mensaje.' }, { status: 400 });
      // Paquete 1 F3: the screen's key, so «Reintentar» after a lost answer never duplicates.
      const clientMessageId = String(form.get('clientMessageId') ?? '') || crypto.randomUUID();
      // E4: answering one message quotes it above.
      const replyToMessageId = String(form.get('replyToMessageId') ?? '');
      await apiRequest(token, `/messaging/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ clientMessageId, content, ...(replyToMessageId ? { replyToMessageId } : {}) }),
      });
      return json<ActionData>({ ok: true });
    }
    // E4: one message — edit (15 min), delete for everyone (2 days), react, ⭐ and forward.
    if (['edit', 'delete', 'react', 'star', 'forward'].includes(String(intent))) {
      const conversationId = encodeURIComponent(String(form.get('conversationId') ?? ''));
      const messageId = encodeURIComponent(String(form.get('messageId') ?? ''));
      const path = `/messaging/conversations/${conversationId}/messages/${messageId}`;
      if (intent === 'edit') {
        const content = String(form.get('content') ?? '').trim();
        if (!content) return json<ActionData>({ ok: false, message: 'Escribe un mensaje.' }, { status: 400 });
        await apiRequest(token, path, { method: 'PATCH', body: JSON.stringify({ content }) });
      } else if (intent === 'delete') {
        await apiRequest(token, path, { method: 'DELETE' });
      } else if (intent === 'react') {
        const emoji = String(form.get('emoji') ?? '');
        await apiRequest(token, `${path}/reaction`, emoji ? { method: 'PUT', body: JSON.stringify({ emoji }) } : { method: 'DELETE' });
      } else if (intent === 'star') {
        await apiRequest(token, `${path}/star`, { method: form.get('on') === '1' ? 'PUT' : 'DELETE' });
      } else {
        const conversationIds = form.getAll('to').map(String).filter(Boolean);
        if (conversationIds.length === 0) return json<ActionData>({ ok: false, message: 'Elegí a qué chat reenviarlo.' }, { status: 400 });
        await apiRequest(token, `${path}/forward`, {
          method: 'POST',
          body: JSON.stringify({ clientMessageId: String(form.get('clientMessageId') ?? '') || crypto.randomUUID(), conversationIds }),
        });
        return json<ActionData>({ ok: true, message: conversationIds.length === 1 ? 'Mensaje reenviado.' : `Reenviado a ${conversationIds.length} chats.` });
      }
      return json<ActionData>({ ok: true });
    }
    if (intent === 'share-product') {
      const conversationId = String(form.get('conversationId') ?? '');
      const productoId = String(form.get('productoId') ?? '');
      await apiRequest(token, `/messaging/conversations/${encodeURIComponent(conversationId)}/products`, {
        method: 'POST',
        body: JSON.stringify({ clientMessageId: crypto.randomUUID(), productoId }),
      });
      return json<ActionData>({ ok: true, message: 'Producto compartido.' });
    }
    if (intent === 'cart-set') {
      const conversationId = String(form.get('conversationId') ?? '');
      const productoId = String(form.get('productoId') ?? '');
      const cantidad = Math.max(0, Math.round(Number(form.get('cantidad') ?? 0)));
      await apiRequest(token, `/messaging/conversations/${encodeURIComponent(conversationId)}/cart/items`, {
        method: 'PUT',
        body: JSON.stringify({ productoId, cantidad }),
      });
      return json<ActionData>({ ok: true, message: cantidad > 0 ? 'Carrito actualizado.' : 'Producto sacado del carrito.' });
    }
    if (intent === 'order') {
      const conversationId = String(form.get('conversationId') ?? '');
      if (!conversationId) return json<ActionData>({ ok: false, message: 'Elegí una conversación.' }, { status: 400 });
      const order = await apiRequest<{ id: string }>(token, `/messaging/conversations/${encodeURIComponent(conversationId)}/orders`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      return json<ActionData>({ ok: true, message: 'Pedido creado.', orderId: order.id });
    }
    if (intent === 'create') {
      const participantUserIds = form.getAll('userId').map(String).filter(Boolean);
      const customerId = String(form.get('customerId') ?? '');
      const participantCustomerIds = customerId ? [customerId] : [];
      const total = participantUserIds.length + participantCustomerIds.length;
      if (total === 0) return json<ActionData>({ ok: false, message: 'Elige al menos una persona.' }, { status: 400 });
      const created = await apiRequest<{ id: string }>(token, '/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({ type: total === 1 ? 'DIRECT' : 'GROUP', participantUserIds, participantCustomerIds }),
      });
      return redirect(`/panel/mensajes?c=${created.id}`);
    }
    return json<ActionData>({ ok: false, message: 'Acción desconocida.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) return json<ActionData>({ ok: false, message: error.message }, { status: error.status });
    if (error instanceof Response) throw error;
    // Paquete 1 F3: the API did not answer — say so and keep the text for «Reintentar».
    return json<ActionData>({ ok: false, message: 'No se pudo enviar. Revisá la conexión y reintentá.' }, { status: 503 });
  }
}

/**
 * Messaging center, from the Figma "Plataforma · Centro de mensajes" (145:12487): inbox
 * (search, filters, conversation rows), thread with day separators and bubbles, composer,
 * and a context panel with the customer and the participants.
 */
export default function MessagesPage() {
  const data = useLoaderData<typeof loader>();
  const { lang = 'es' } = useParams();
  const [searchParams] = useSearchParams();
  const sender = useFetcher<ActionData>();
  const sending = sender.state !== 'idle';
  const navigation = useNavigation();
  // E1: new messages and «escribiendo…» at once; every 5 s if the stream is down. The panel
  // layout shares its stream; outside it (tests, previews) the page opens its own.
  const shared = useSharedLive();
  const own = useLiveSource(shared ? null : '/panel/mensajes/eventos');
  const { typing, presence } = useLiveUpdates(shared ?? own, { paused: sending || navigation.state !== 'idle' });

  const base = `/panel/mensajes`;
  const query = searchParams.get('q') ?? '';
  const filter = searchParams.get('f') === 'clientes' ? 'clientes' : searchParams.get('f') === 'equipo' ? 'equipo' : 'todas';
  const hrefWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `${base}?${qs}` : base;
  };

  if (!data.conversations) {
    return (
      <div className="ws-page">
        <h1 className="ws-page__title">Mensajes</h1>
        <p className="ws-alert" role="alert">No pudimos cargar tus conversaciones. Puede que tu rol no tenga acceso.</p>
      </div>
    );
  }

  // Paquete 2 A8: while another conversation is on its way, its shape instead of the old one.
  const loadingId =
    navigation.state === 'loading' && navigation.location.pathname === base
      ? new URLSearchParams(navigation.location.search).get('c')
      : null;
  const switching = Boolean(loadingId && loadingId !== data.selectedId);

  const visible = data.conversations
    .filter((c) => (filter === 'clientes' ? Boolean(customerOf(c)) : filter === 'equipo' ? !customerOf(c) : true))
    .filter((c) => matchesSearch(c, query));
  const withCustomers = data.conversations.filter((c) => customerOf(c)).length;
  const showThread = Boolean(data.selectedId) || data.composing || switching;

  return (
    <div className={`ws-inbox${showThread ? ' has-selection' : ''}`}>
      <section className="ws-inbox__list" aria-labelledby="inbox-title">
        <div className="ws-inbox__list-head">
          <h1 id="inbox-title">Bandeja de entrada</h1>
          <AlertsToggle />
          <Link
            className={`ws-icon-button${data.starred ? ' is-active' : ''}`}
            to={hrefWith({ destacados: data.starred ? null : '1' })}
            aria-label="Mensajes destacados"
            aria-pressed={Boolean(data.starred)}
            title="Mensajes destacados"
          >
            <Star size={18} aria-hidden="true" />
          </Link>
          <Link className="ws-icon-button" to={hrefWith({ nueva: '1', c: null })} aria-label="Nueva conversación" title="Nueva conversación">
            <SquarePen size={18} aria-hidden="true" />
          </Link>
        </div>
        <Form method="get" className="ws-inbox__search" role="search">
          {data.selectedId && <input type="hidden" name="c" value={data.selectedId} />}
          {filter !== 'todas' && <input type="hidden" name="f" value={filter} />}
          <Search size={16} aria-hidden="true" />
          <input name="q" defaultValue={query} placeholder="Buscar chats y mensajes" aria-label="Buscar chats y mensajes" />
        </Form>
        <div className="ws-inbox__filters">
          <Link className={`ws-chip ${filter === 'todas' ? 'ws-chip--secondary' : ''}`} to={hrefWith({ f: null })}>
            Todas · {data.conversations.length}
          </Link>
          <Link className={`ws-chip ${filter === 'clientes' ? 'ws-chip--secondary' : ''}`} to={hrefWith({ f: 'clientes' })}>
            Clientes · {withCustomers}
          </Link>
          <Link className={`ws-chip ${filter === 'equipo' ? 'ws-chip--secondary' : ''}`} to={hrefWith({ f: 'equipo' })}>
            Equipo · {data.conversations.length - withCustomers}
          </Link>
        </div>
        {data.starred ? (
          <FoundList
            title="Destacados"
            items={data.starred}
            conversations={data.conversations}
            hrefOf={(m) => hrefWith({ c: m.conversationId, m: m.id, nueva: null })}
            empty="Destaca un mensaje con ⭐ desde su menú para tenerlo a mano acá."
          />
        ) : null}
        {data.starred ? null : visible.length === 0 && data.found.length === 0 ? (
          <ChatEmpty title={data.conversations.length === 0 ? 'Todavía no hay conversaciones' : 'Nada coincide con la búsqueda'}>
            {data.conversations.length === 0 ? 'Cuando un cliente te escriba desde la tienda, aparece acá.' : null}
          </ChatEmpty>
        ) : (
          <ul className="ws-inbox__rows">
            {visible.map((conversation) => {
              const title = conversationTitle(conversation);
              const active = conversation.id === data.selectedId;
              const unread = active ? 0 : (conversation.unreadCount ?? 0);
              return (
                <li key={conversation.id}>
                  <Link
                    className={`ws-conv${active ? ' is-active' : ''}${unread > 0 ? ' is-unread' : ''}`}
                    to={hrefWith({ c: conversation.id, nueva: null })}
                    aria-current={active ? 'true' : undefined}
                  >
                    <span className={`ws-conv__avatar${customerOf(conversation) ? ' ws-conv__avatar--customer' : ''}`}>
                      {conversation.type === 'GROUP' && !customerOf(conversation) ? <Users size={14} aria-hidden="true" /> : initials(title)}
                      {otherIsOnline(conversation, presence) ? <span className="ws-online-dot" aria-label="En línea" /> : null}
                    </span>
                    <span className="ws-conv__summary">
                      <span className="ws-conv__meta">
                        <span className="ws-conv__name">{title}</span>
                        <span className="ws-conv__time">
                          {inboxTime(conversation.lastMessage?.createdAt ?? conversation.createdAt)}
                        </span>
                      </span>
                      <span className="ws-conv__last-row">
                        {typing[conversation.id] ? (
                          <span className="ws-conv__last ws-typing">{typingLabel(conversation, typing[conversation.id])}</span>
                        ) : (
                          <span className="ws-conv__last">{previewText(conversation)}</span>
                        )}
                        {unread > 0 ? (
                          <span className="ws-conv__badge" aria-label={`${unread} sin leer`}>
                            {badgeText(unread)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {!data.starred && data.found.length > 0 ? (
          <FoundList
            title="Mensajes"
            items={data.found}
            conversations={data.conversations}
            hrefOf={(m) => hrefWith({ c: m.conversationId, m: m.id, nueva: null })}
            highlight={query}
          />
        ) : null}
      </section>

      <section className="ws-inbox__chat" aria-label="Conversación">
        {switching ? (
          <ChatSkeleton />
        ) : data.composing ? (
          <NewConversation base={hrefWith({ nueva: null })} contacts={data.contacts} customers={data.customers} />
        ) : data.selected ? (
          <Thread
            key={data.selected.id}
            conversation={data.selected}
            messages={data.messages}
            back={hrefWith({ c: null })}
            sender={sender}
            cart={data.cart}
            lang={lang}
            canEditCart={data.canEditCart}
            quickReplies={data.quickReplies}
            customerName={data.customer?.nombre ?? null}
            typing={typing[data.selected.id] ?? null}
            presence={presence}
            conversations={data.conversations}
            jump={data.jump}
          />
        ) : data.selectedId ? (
          <div className="ws-inbox__placeholder">
            <p className="ws-alert" role="alert">No encontramos esa conversación o no tienes acceso.</p>
            <Link className="ws-link" to={hrefWith({ c: null })}>Volver a la bandeja</Link>
          </div>
        ) : (
          <div className="ws-inbox__placeholder chat-screen">
            <ChatEmpty title="Elige una conversación">O empieza una nueva con alguien de tu equipo o un cliente.</ChatEmpty>
          </div>
        )}
      </section>

      {data.selected && <ContextPanel conversation={data.selected} customer={data.customer} lang={lang} />}
    </div>
  );
}

function Thread({
  conversation,
  messages,
  back,
  sender,
  cart,
  lang,
  canEditCart,
  quickReplies,
  customerName,
  typing,
  presence,
  conversations,
  jump,
}: Readonly<{
  conversation: Conversation;
  messages: Message[];
  back: string;
  sender: ReturnType<typeof useFetcher<ActionData>>;
  cart: ConversationCart | null;
  lang: string;
  canEditCart: boolean;
  quickReplies: QuickReply[];
  customerName: string | null;
  typing: TypingSignal | null;
  presence: PresenceMap;
  conversations: Conversation[];
  jump: string | null;
}>) {
  const threadRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Paquete 1 F2: older pages asked for, above the newest page (which the loader keeps live).
  const olderPage = useFetcher<{ messages: Message[] }>();
  const [older, setOlder] = useState<Message[]>([]);
  const [olderMore, setOlderMore] = useState<boolean | null>(null);
  const keepScroll = useRef<number | null>(null);
  useEffect(() => {
    const page = olderPage.data?.messages;
    if (olderPage.state !== 'idle' || !page) return;
    const el = threadRef.current;
    keepScroll.current = el ? el.scrollHeight - el.scrollTop : null;
    setOlder((current) => {
      const known = new Set(current.map((m) => m.id));
      return [...page.filter((m) => !known.has(m.id)), ...current];
    });
    setOlderMore(page.length === MESSAGES_PAGE);
  }, [olderPage.state, olderPage.data]);
  useEffect(() => {
    // Stay on the same message while older ones appear above it.
    const el = threadRef.current;
    if (el && keepScroll.current !== null) el.scrollTop = el.scrollHeight - keepScroll.current;
    keepScroll.current = null;
  }, [older]);
  // A message that slides out of the newest page (a new one came in) stays with the older ones.
  const previousNewest = useRef(messages);
  useEffect(() => {
    const before = previousNewest.current;
    previousNewest.current = messages;
    if (older.length === 0 || messages.length === 0) return;
    setOlder((current) => keepSlidOut(current, before, messages));
  }, [messages, older.length]);
  const allMessages = useMemo(() => {
    const known = new Set(messages.map((m) => m.id));
    return [...older.filter((m) => !known.has(m.id)), ...messages];
  }, [older, messages]);
  const canLoadOlder = olderMore ?? messages.length === MESSAGES_PAGE;
  const loadOlder = () => {
    const oldest = allMessages[0]?.sequence;
    if (oldest && olderPage.state === 'idle') {
      olderPage.load(`/panel/mensajes/anteriores?c=${encodeURIComponent(conversation.id)}&antes=${oldest}`);
    }
  };

  // E4: what the viewer is doing with one message.
  const act = useFetcher<ActionData>();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [menuFor, setMenuFor] = useState<Message | null>(null);
  const [forwarding, setForwarding] = useState<Message | null>(null);
  const jumpTo = useJumpTo({
    canLoadOlder: Boolean(canLoadOlder),
    loading: olderPage.state !== 'idle',
    loadOlder,
    loadedCount: allMessages.length,
  });
  // A search result or a ⭐ opens the chat on that message.
  useEffect(() => {
    if (jump) jumpTo(jump);
  }, [jump]);

  useEffect(() => {
    if (sender.state === 'idle' && sender.data?.ok) {
      formRef.current?.reset();
      setReplyTo(null);
      setEditing(null);
    }
  }, [sender.state, sender.data]);

  const pending =
    sender.state !== 'idle' && sender.formData?.get('intent') === 'send' ? String(sender.formData?.get('content') ?? '').trim() : '';
  const canSend = conversation.viewerAccess.canSend;
  // E4: a deleted message stays in place as «Se eliminó este mensaje».
  const visibleMessages = allMessages;
  const nameOf = (who: { userId?: string | null; customerId?: string | null; authorUserId?: string | null; authorCustomerId?: string | null }) => {
    const author = authorOf(conversation, {
      id: '',
      content: null,
      createdAt: '',
      authorUserId: who.authorUserId ?? who.userId ?? null,
      authorCustomerId: who.authorCustomerId ?? who.customerId ?? null,
    });
    if (author?.isViewer) return 'Vos';
    return author?.name ?? 'Ex participante';
  };
  const react = (message: Message, emoji: string | null) =>
    act.submit({ intent: 'react', conversationId: conversation.id, messageId: message.id, emoji: emoji ?? '' }, { method: 'post' });
  const startEdit = (message: Message) => {
    setReplyTo(null);
    setEditing(message);
    const box = formRef.current?.querySelector('textarea');
    if (box) {
      box.value = message.content ?? '';
      box.dispatchEvent(new Event('input', { bubbles: true }));
      growTextarea(box);
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    }
  };
  const stopEdit = () => {
    setEditing(null);
    const box = formRef.current?.querySelector('textarea');
    if (box) {
      box.value = '';
      box.dispatchEvent(new Event('input', { bubbles: true }));
      growTextarea(box, true);
    }
  };
  const startReply = (message: Message) => {
    if (editing) stopEdit();
    setReplyTo(message);
    formRef.current?.querySelector('textarea')?.focus();
  };
  const actionsOf = (message: Message): MessageAction[] => {
    if (message.eliminado || message.deletedAt) return [];
    const mine = Boolean(authorOf(conversation, message)?.isViewer);
    const cardsOrOrder = (message.adjuntos ?? []).some((a) => a.tipo === 'producto' || a.tipo === 'pedido');
    const list: MessageAction[] = [];
    if (canSend) list.push({ key: 'reply', label: 'Responder', icon: <Reply size={18} aria-hidden="true" />, run: () => startReply(message) });
    if (message.content) {
      list.push({
        key: 'copy',
        label: 'Copiar',
        icon: <Copy size={18} aria-hidden="true" />,
        run: () => {
          navigator.clipboard?.writeText(message.content ?? '').catch(() => {
            // The browser did not let us copy.
          });
        },
      });
    }
    if (!cardsOrOrder && message.type !== 'VOICE') {
      list.push({ key: 'forward', label: 'Reenviar', icon: <Forward size={18} aria-hidden="true" />, run: () => setForwarding(message) });
    }
    list.push(
      message.destacado
        ? {
            key: 'star',
            label: 'Quitar destacado',
            icon: <StarOff size={18} aria-hidden="true" />,
            run: () => act.submit({ intent: 'star', conversationId: conversation.id, messageId: message.id, on: '0' }, { method: 'post' }),
          }
        : {
            key: 'star',
            label: 'Destacar',
            icon: <Star size={18} aria-hidden="true" />,
            run: () => act.submit({ intent: 'star', conversationId: conversation.id, messageId: message.id, on: '1' }, { method: 'post' }),
          },
    );
    if (canSend && mine && message.type === 'TEXT' && !message.reenviado && canStillEdit(message.createdAt)) {
      list.push({ key: 'edit', label: 'Editar', icon: <Pencil size={18} aria-hidden="true" />, run: () => startEdit(message) });
    }
    return list;
  };
  // Paquete 2 A6: follow the newest while at the bottom; «↓ N nuevos» while reading above.
  const items = useMemo(
    () => visibleMessages.map((m) => ({ id: m.id, mine: Boolean(authorOf(conversation, m)?.isViewer) })),
    [visibleMessages, conversation],
  );
  const { unseen, away, toBottom } = useStickToBottom(threadRef, items, { extraBelow: Boolean(typing) || Boolean(pending) });
  const title = conversationTitle(conversation);
  const customer = customerOf(conversation);
  const online = otherIsOnline(conversation, presence);

  return (
    <>
      <header className="chat-head ws-chat__head">
        <Link className="chat-head__back ws-chat__back" to={back} aria-label="Volver a la bandeja">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <ChatAvatar name={title} tone={customer ? 'customer' : 'neutral'} online={online} />
        <span className="chat-head__who">
          <b>{title}</b>
          {typing ? (
            <span className="chat-head__status is-typing">{typingLabel(conversation, typing)}</span>
          ) : (
            <span className={`chat-head__status${online ? ' is-online' : ''}`}>
              {contactStatus(conversation, presence) || conversationSubtitle(conversation)}
            </span>
          )}
        </span>
      </header>

      <div className="chat-wall-wrap">
      <div className="chat-wall" ref={threadRef} aria-live="polite">
        {canLoadOlder ? (
          <button type="button" className="chat-older" onClick={loadOlder} disabled={olderPage.state !== 'idle'}>
            {olderPage.state !== 'idle' ? 'Cargando…' : 'Ver mensajes anteriores'}
          </button>
        ) : null}
        {visibleMessages.length === 0 && !pending ? (
          <ChatEmpty title="Todavía no hay mensajes">Escribe el primero.</ChatEmpty>
        ) : null}
        {groupByDay(visibleMessages).map((group) => {
          // A3: runs of the same author; a notice or the order card breaks them.
          const runs = bubbleRuns(group.items, (m) => (m.aviso ? null : (m.authorUserId ?? m.authorCustomerId ?? null)));
          return (
          <div key={group.key} className="chat-day-group">
            <DayDivider label={group.label} />
            {group.items.map((message, index) => {
              // OR-B4-053: the order as one live card; the system's other notices as short lines.
              const orderCard = message.aviso ? orderCardOf(message) : null;
              if (orderCard) {
                return <OrderCard key={message.id} card={orderCard} time={messageTime(message.createdAt)} href={`/panel/pedidos/${orderCard.pedidoId}`} />;
              }
              if (message.aviso) {
                return <NoticeLine key={message.id} text={message.content ?? ''} time={messageTime(message.createdAt)} />;
              }
              return (
                <PanelBubble
                  key={message.id}
                  conversation={conversation}
                  message={message}
                  run={runs[index]}
                  quoteWho={message.respuesta ? nameOf({ userId: message.respuesta.autorUserId, customerId: message.respuesta.autorCustomerId }) : ''}
                  nameOf={nameOf}
                  onOpenMenu={() => setMenuFor(message)}
                  onReact={canSend ? (emoji) => react(message, emoji) : null}
                  onQuote={jumpTo}
                />
              );
            })}
          </div>
          );
        })}
        {pending ? (
          <Bubble mine run={{ cont: false, tail: true }} text={pending} pending meta={<BubbleMeta time="" estado="pendiente" />} />
        ) : null}
        {typing ? <TypingBubble label={typingLabel(conversation, typing)} /> : null}
      </div>
      <NewBelow count={unseen} away={away} onClick={() => toBottom(true)} />
      </div>

      {sender.data && !sender.data.ok && sender.state === 'idle' && (
        <p className="chat-error" role="alert">
          {sender.data.message}{' '}
          <button type="button" className="chat-retry" onClick={() => formRef.current?.requestSubmit()}>
            Reintentar
          </button>
        </p>
      )}

      {act.state === 'idle' && act.data && !act.data.ok ? (
        <p className="chat-error" role="alert">
          {act.data.message}
        </p>
      ) : null}
      {menuFor ? (
        <MessageMenu
          preview={menuFor.eliminado ? '' : shortText(menuFor.content) || 'Foto o archivo'}
          myReaction={menuFor.reacciones?.find((r) => r.mia)?.emoji ?? null}
          onReact={canSend && !menuFor.eliminado ? (emoji) => react(menuFor, emoji) : null}
          actions={actionsOf(menuFor)}
          confirmDelete={
            canSend && !menuFor.eliminado && authorOf(conversation, menuFor)?.isViewer && canStillDelete(menuFor.createdAt)
              ? () => act.submit({ intent: 'delete', conversationId: conversation.id, messageId: menuFor.id }, { method: 'post' })
              : null
          }
          onClose={() => setMenuFor(null)}
        />
      ) : null}
      {forwarding ? (
        <ForwardDialog from={conversation.id} message={forwarding} conversations={conversations} onClose={() => setForwarding(null)} />
      ) : null}
      {canSend && replyTo ? (
        <ComposerContext
          kind="reply"
          who={nameOf(replyTo)}
          text={shortText(replyTo.content) || 'Foto o archivo'}
          onClose={() => setReplyTo(null)}
        />
      ) : null}
      {canSend && editing ? <ComposerContext kind="edit" who="" text={shortText(editing.content)} onClose={stopEdit} /> : null}

      {canSend ? (
        <Composer
          replyToId={replyTo?.id ?? null}
          editingId={editing?.id ?? null}
          onEscape={() => {
            if (editing) stopEdit();
            setReplyTo(null);
          }}
          conversation={conversation}
          sender={sender}
          formRef={formRef}
          cart={cart && customerOf(conversation) ? cart : null}
          canEditCart={canEditCart}
          quickReplies={quickReplies}
          customerName={customerName}
          lang={lang}
        />
      ) : (
        <p className="ws-composer ws-composer--readonly">
          <Eye size={16} aria-hidden="true" /> Estás viendo esta conversación sin participar en ella. Solo lectura.
        </p>
      )}
    </>
  );
}

/** E2b — the other person of a chat between two (none in groups or when only reading). */
function otherOf(conversation: Conversation) {
  if (conversation.type === 'GROUP' || !conversation.participants.some((p) => p.isViewer)) return undefined;
  return conversation.participants.find((p) => !p.isViewer);
}

/** E2b — «en línea» / «últ. vez …» of the other person, with what arrived since loading. */
function contactStatus(conversation: Conversation, presence: PresenceMap): string {
  const other = otherOf(conversation);
  if (!other) return '';
  return presenceLabel(presence[presenceKey(other)] ?? other);
}

function otherIsOnline(conversation: Conversation, presence: PresenceMap): boolean {
  const other = otherOf(conversation);
  return Boolean(other && (presence[presenceKey(other)] ?? other).online);
}

/**
 * One message in the panel: on the right our side (the viewer, and the team in a chat with a
 * customer); the author's name in groups and when a teammate answered the customer.
 */
function PanelBubble({
  conversation,
  message,
  run,
  quoteWho,
  nameOf,
  onOpenMenu,
  onReact,
  onQuote,
}: Readonly<{
  conversation: Conversation;
  message: Message;
  run: { cont: boolean; tail: boolean };
  quoteWho: string;
  nameOf: (who: { userId: string | null; customerId: string | null }) => string;
  onOpenMenu: () => void;
  onReact: ((emoji: string | null) => void) | null;
  onQuote: (messageId: string) => void;
}>) {
  const own = isOwnSide(conversation, message);
  const author = authorOf(conversation, message);
  const showAuthor = !author?.isViewer && (conversation.type === 'GROUP' || own);
  const deleted = Boolean(message.eliminado || message.deletedAt);
  const cards = deleted ? [] : productCards(message);
  const files = deleted ? [] : fileAttachments(message);
  let text: string | null = message.content ?? '';
  if (deleted || cards.length > 0 || files.some((f) => f.nombre === message.content)) text = null;
  else if (files.length > 0 && !message.content) text = null;
  const press = usePressToOpen(onOpenMenu);
  const meta = (
    <BubbleMeta
      time={messageTime(message.createdAt)}
      dateTime={message.createdAt}
      edited={Boolean(message.editedAt) && !deleted}
      starred={Boolean(message.destacado) && !deleted}
      estado={own && author?.isViewer && !deleted ? (message.estado ?? null) : null}
    />
  );
  const quote = message.respuesta && !deleted ? message.respuesta : null;
  const top =
    message.reenviado || quote ? (
      <>
        {message.reenviado ? <ForwardedTag /> : null}
        {quote ? <QuoteLine who={quoteWho} quote={quote} mine={quote.mia} onOpen={() => onQuote(quote.id)} /> : null}
      </>
    ) : null;
  return (
    <Bubble
      id={message.id}
      mine={own}
      run={run}
      author={showAuthor ? (author?.name ?? 'Ex participante') : null}
      text={text}
      meta={meta}
      deleted={deleted}
      top={top}
      press={press}
      menu={<MenuButton onClick={onOpenMenu} />}
      reactions={
        message.reacciones?.length && !deleted ? (
          <ReactionChips
            reactions={message.reacciones}
            onPick={onReact}
            titleOf={(chip) =>
              (message.reacciones?.find((r) => r.emoji === chip.emoji)?.autores ?? []).map((who) => nameOf(who)).join(', ')
            }
          />
        ) : null
      }
    >
      {deleted ? <DeletedText mine={Boolean(author?.isViewer)} /> : null}
      {cards.map((card) => (
        <span key={card.id} className="chat-product">
          <span className="chat-product__name">
            <Package size={16} aria-hidden="true" /> {card.nombre}
          </span>
          {card.precioFinal ? (
            <span className="chat-product__price">
              <s>{formatMoney(card.precio)}</s> <b>{formatMoney(card.precioFinal)}</b>
            </span>
          ) : (
            <span className="chat-product__price">{formatMoney(card.precio)}</span>
          )}
        </span>
      ))}
      {files.map((file) =>
        file.tipo === 'imagen' ? (
          <a key={file.id} href={`/panel/mensajes/adjunto/${file.id}`} target="_blank" rel="noreferrer" className="chat-photo">
            <img src={`/panel/mensajes/adjunto/${file.id}`} alt={file.nombre} loading="lazy" />
          </a>
        ) : (
          <a key={file.id} href={`/panel/mensajes/adjunto/${file.id}`} className="chat-file">
            <FileText size={18} aria-hidden="true" /> {file.nombre} <small>{fileSize(file.tamano)}</small>
          </a>
        ),
      )}
    </Bubble>
  );
}

/**
 * E2 — browser notifications for new messages while the tab is in the background. Asking
 * needs a click, so it is a button; it disappears once answered.
 */
function AlertsToggle() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  useEffect(() => {
    setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  }, []);
  if (permission !== 'default') return null;
  return (
    <button
      type="button"
      className="ws-link ws-alerts-toggle"
      onClick={() => {
        Notification.requestPermission()
          .then((answer) => {
            setPermission(answer);
            // E3: with permission, new messages also arrive with Wapsell closed (push).
            if (answer === 'granted') void ensurePushSubscription();
          })
          .catch(() => setPermission('denied'));
      }}
    >
      <Bell size={14} aria-hidden="true" /> Activar avisos
    </button>
  );
}

type ComposerPanel = 'productos' | 'carrito' | 'respuestas' | null;

/**
 * The conversation's composer, kept simple: «+» on the left with every messaging tool
 * (products, the customer's cart and checkout, photo or PDF, quick replies — audio later),
 * the text in the middle and the arrow to send on the right. A tool opens in a small panel
 * just above it.
 */
function Composer({
  replyToId,
  editingId,
  onEscape,
  conversation,
  sender,
  formRef,
  cart,
  canEditCart,
  quickReplies,
  customerName,
  lang,
}: Readonly<{
  conversation: Conversation;
  sender: ReturnType<typeof useFetcher<ActionData>>;
  formRef: React.RefObject<HTMLFormElement>;
  cart: ConversationCart | null;
  canEditCart: boolean;
  quickReplies: QuickReply[];
  customerName: string | null;
  lang: string;
  /** E4: the message being answered (quoted above) or edited. */
  replyToId: string | null;
  editingId: string | null;
  onEscape: () => void;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<ComposerPanel>(null);
  const notifyTyping = useTypingNotifier('/panel/mensajes/escribiendo', conversation.id);
  const fileRef = useRef<HTMLInputElement>(null);
  // Paquete 1 F3: one key per message, kept until it is saved (a retry reuses it).
  const [clientMessageId, setClientMessageId] = useState(newClientMessageId);
  useEffect(() => {
    if (sender.state === 'idle' && sender.data?.ok) setClientMessageId(newClientMessageId());
  }, [sender.state, sender.data]);
  useWhenBackOnline(sender.state === 'idle' && sender.data?.ok === false, () => formRef.current?.requestSubmit());
  const upload = useFetcher<{ ok: boolean; message: string }>();
  const [tooBig, setTooBig] = useState(false);
  const [hasText, setHasText] = useState(false);
  const touch = useTouchScreen();
  useEffect(() => {
    if (sender.state === 'idle' && sender.data?.ok) {
      setHasText(false);
      growTextarea(formRef.current?.querySelector('textarea') ?? null, true);
    }
  }, [sender.state, sender.data, formRef]);
  const pick = (kind: 'foto' | 'camara' | 'archivo') => {
    setMenuOpen(false);
    const input = fileRef.current;
    if (!input) return;
    input.accept = kind === 'archivo' ? 'application/pdf' : CHAT_FILE_ACCEPT.split(',').filter((t) => t.startsWith('image/')).join(',');
    if (kind === 'camara') input.setAttribute('capture', 'environment');
    else input.removeAttribute('capture');
    input.click();
  };
  const units = cart?.items.reduce((sum, item) => sum + item.cantidad, 0) ?? 0;
  const open = (next: ComposerPanel) => {
    setPanel(next);
    setMenuOpen(false);
  };
  const insert = (text: string) => {
    const box = formRef.current?.querySelector('textarea');
    if (!box) return;
    box.value = box.value.trim() ? `${box.value.trim()} ${text}` : text;
    setHasText(true);
    growTextarea(box);
    box.focus();
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  return (
    <div className="ws-composer-wrap">
      {panel ? (
        <div className="ws-tool" role="region" aria-label={PANEL_TITLES[panel]}>
          <div className="ws-tool__head">
            <b>{PANEL_TITLES[panel]}</b>
            <button type="button" className="ws-icon-button" aria-label="Cerrar" onClick={() => setPanel(null)}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          {panel === 'productos' ? (
            <ProductPicker conversation={conversation} lang={lang} canEditCart={canEditCart && Boolean(cart)} cart={cart} />
          ) : panel === 'carrito' && cart ? (
            <OrderBar conversation={conversation} cart={cart} lang={lang} canEdit={canEditCart} />
          ) : panel === 'respuestas' ? (
            <ul className="ws-tool__list">
              {quickReplies.map((r, i) => (
                <li key={`${r.titulo}-${i}`}>
                  <button
                    type="button"
                    onClick={() => {
                      insert(fillQuickReply(r.texto, customerName));
                      setPanel(null);
                    }}
                  >
                    <b>{r.titulo}</b>
                    <span>{fillQuickReply(r.texto, customerName)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {tooBig ? <output className="chat-error">El archivo puede pesar hasta 10 MB.</output> : null}
      {upload.state === 'idle' && upload.data && !upload.data.ok ? (
        <output className="chat-error">{upload.data.message}</output>
      ) : null}
      <upload.Form method="post" encType="multipart/form-data" action={`/panel/mensajes/adjuntar`} hidden>
        <input type="hidden" name="conversationId" value={conversation.id} />
        <input
          ref={fileRef}
          type="file"
          name="archivo"
          accept={CHAT_FILE_ACCEPT}
          aria-label="Foto o PDF"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            setTooBig(Boolean(file && file.size > CHAT_FILE_MAX_BYTES));
            if (file && file.size <= CHAT_FILE_MAX_BYTES) upload.submit(event.currentTarget.form);
            event.currentTarget.value = '';
          }}
        />
      </upload.Form>

      <sender.Form method="post" className="chat-composer" ref={formRef}>
        <input type="hidden" name="intent" value={editingId ? 'edit' : 'send'} />
        <input type="hidden" name="conversationId" value={conversation.id} />
        <input type="hidden" name="clientMessageId" value={clientMessageId} />
        {editingId ? <input type="hidden" name="messageId" value={editingId} /> : null}
        {replyToId && !editingId ? <input type="hidden" name="replyToMessageId" value={replyToId} /> : null}
        <div className="chat-plus">
          <button
            type="button"
            className={`chat-round chat-plus__button${menuOpen ? ' is-open' : ''}`}
            aria-label="Más opciones"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Plus size={22} aria-hidden="true" />
            {units > 0 ? <span className="chat-plus__badge" aria-label={`${units} en el carrito`}>{units}</span> : null}
          </button>
          {menuOpen ? (
            <div className="chat-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => open('productos')}>
                <span className="chat-menu__icon chat-menu__icon--product"><Search size={16} aria-hidden="true" /></span>
                Mostrar un producto
              </button>
              {cart ? (
                <button type="button" role="menuitem" onClick={() => open('carrito')}>
                  <span className="chat-menu__icon chat-menu__icon--cart"><ShoppingBag size={16} aria-hidden="true" /></span>
                  Carrito y crear pedido{units > 0 ? ` · ${units}` : ''}
                </button>
              ) : null}
              <button type="button" role="menuitem" disabled={upload.state !== 'idle'} onClick={() => pick('foto')}>
                <span className="chat-menu__icon chat-menu__icon--photo"><ImageIcon size={16} aria-hidden="true" /></span>
                {upload.state === 'idle' ? 'Foto' : 'Enviando…'}
              </button>
              {touch ? (
                <button type="button" role="menuitem" disabled={upload.state !== 'idle'} onClick={() => pick('camara')}>
                  <span className="chat-menu__icon chat-menu__icon--camera"><Camera size={16} aria-hidden="true" /></span>
                  Cámara
                </button>
              ) : null}
              <button type="button" role="menuitem" disabled={upload.state !== 'idle'} onClick={() => pick('archivo')}>
                <span className="chat-menu__icon chat-menu__icon--file"><FileText size={16} aria-hidden="true" /></span>
                Documento PDF
              </button>
              {quickReplies.length > 0 ? (
                <button type="button" role="menuitem" onClick={() => open('respuestas')}>
                  <span className="chat-menu__icon chat-menu__icon--quick"><MessageSquareText size={16} aria-hidden="true" /></span>
                  Respuestas rápidas
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <textarea
          name="content"
          rows={1}
          required
          placeholder="Escribe un mensaje"
          aria-label="Mensaje"
          onInput={(event) => {
            setHasText(Boolean(event.currentTarget.value.trim()));
            growTextarea(event.currentTarget);
            notifyTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && (replyToId || editingId)) {
              onEscape();
              return;
            }
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button className="chat-round chat-send" type="submit" aria-label="Enviar" disabled={sender.state !== 'idle' || !hasText}>
          <SendHorizontal size={20} aria-hidden="true" />
        </button>
      </sender.Form>
    </div>
  );
}

const PANEL_TITLES: Record<Exclude<ComposerPanel, null>, string> = {
  productos: 'Productos',
  carrito: 'Carrito del cliente',
  respuestas: 'Respuestas rápidas',
};

/**
 * The customer's cart (built by them in the store or by the team) and, for whoever may
 * create orders, the checkout: «Crear pedido».
 */
function OrderBar({
  conversation,
  cart,
  canEdit,
}: Readonly<{ conversation: Conversation; cart: ConversationCart; lang: string; canEdit: boolean }>) {
  const order = useFetcher<ActionData>();
  const edit = useFetcher<ActionData>();
  const busy = order.state !== 'idle';
  const created = order.state === 'idle' && order.data?.ok ? order.data.orderId : undefined;
  const units = cart.items.reduce((sum, item) => sum + item.cantidad, 0);
  return (
    <div className="ws-orderbar">
      <div className="ws-orderbar__summary">
        <ShoppingBag size={16} aria-hidden="true" />
        {cart.items.length === 0 ? (
          <span>
            El carrito del cliente está vacío. Lo arma desde la tienda{canEdit ? ' o lo cargás vos desde «Buscar y mostrar un producto»' : ''}.
          </span>
        ) : (
          <div>
            <p>
              {units} {units === 1 ? 'unidad' : 'unidades'} · <b>{formatMoney(cart.total)}</b>
            </p>
            <ul>
              {cart.items.map((item) => (
                <li key={item.productoId}>
                  {item.cantidad} × {item.nombre} <small>{formatMoney(item.precio)}</small>
                  {canEdit ? (
                    <span className="ws-orderbar__qty">
                      {[item.cantidad - 1, item.cantidad + 1].map((cantidad, i) => (
                        <edit.Form key={cantidad} method="post">
                          <input type="hidden" name="intent" value="cart-set" />
                          <input type="hidden" name="conversationId" value={conversation.id} />
                          <input type="hidden" name="productoId" value={item.productoId} />
                          <input type="hidden" name="cantidad" value={cantidad} />
                          <button
                            type="submit"
                            className="ws-icon-button"
                            disabled={edit.state !== 'idle'}
                            aria-label={i === 0 ? `Uno menos de ${item.nombre}` : `Uno más de ${item.nombre}`}
                          >
                            {i === 0 ? <Minus size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                          </button>
                        </edit.Form>
                      ))}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {created ? (
        <Link className="ws-link" to={`/panel/pedidos/${created}`}>Pedido creado · Ver pedido</Link>
      ) : null}
      {canCreateOrder(conversation) && cart.items.length > 0 ? (
        <order.Form method="post">
          <input type="hidden" name="intent" value="order" />
          <input type="hidden" name="conversationId" value={conversation.id} />
          <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={busy}>
            {busy ? 'Creando…' : 'Crear pedido'}
          </button>
        </order.Form>
      ) : null}
      {order.state === 'idle' && order.data && !order.data.ok ? (
        <output className="ws-alert ws-orderbar__error">{order.data.message}</output>
      ) : null}
    </div>
  );
}

/**
 * OR-B4-037 — find a product of the catalogue and share it as a card, or (Owner, Admin,
 * Vendedor, in a conversation with a customer) put it in the customer's cart.
 */
function ProductPicker({
  conversation,
  canEditCart,
  cart,
}: Readonly<{ conversation: Conversation; lang: string; canEditCart: boolean; cart: ConversationCart | null }>) {
  const search = useFetcher<{ q: string; products: SearchProduct[] }>();
  const act = useFetcher<ActionData>();
  const inCart = (productoId: string) => cart?.items.find((i) => i.productoId === productoId)?.cantidad ?? 0;
  return (
    <div className="ws-picker">
      <search.Form method="get" action={`/panel/mensajes/productos`} className="ws-picker__search" role="search">
        <input name="q" placeholder="Buscar en el catálogo" aria-label="Buscar en el catálogo" minLength={2} required autoFocus />
        <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={search.state !== 'idle'}>
          Buscar
        </button>
      </search.Form>
      {search.data && search.data.products.length === 0 ? <p className="ws-meta">No hay productos con «{search.data.q}».</p> : null}
      {search.data && search.data.products.length > 0 ? (
        <ul className="ws-picker__results">
          {search.data.products.map((p) => (
            <li key={p.id}>
              <span>
                <b>{p.nombre}</b>
                <small>
                  {formatMoney(p.precioMinorista)} · stock {p.stockDisponible}
                </small>
              </span>
              <act.Form method="post">
                <input type="hidden" name="intent" value="share-product" />
                <input type="hidden" name="conversationId" value={conversation.id} />
                <input type="hidden" name="productoId" value={p.id} />
                <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={act.state !== 'idle'}>
                  Compartir
                </button>
              </act.Form>
              {canEditCart ? (
                <act.Form method="post">
                  <input type="hidden" name="intent" value="cart-set" />
                  <input type="hidden" name="conversationId" value={conversation.id} />
                  <input type="hidden" name="productoId" value={p.id} />
                  <input type="hidden" name="cantidad" value={inCart(p.id) + 1} />
                  <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={act.state !== 'idle' || p.stockDisponible <= inCart(p.id)}>
                    Al carrito
                  </button>
                </act.Form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {act.state === 'idle' && act.data ? (
        <output className={act.data.ok ? 'ws-meta' : 'ws-alert'}>{act.data.message}</output>
      ) : null}
    </div>
  );
}

function ContextPanel({ conversation, customer }: { conversation: Conversation; customer: Customer | null; lang: string }) {
  const customerParticipant = customerOf(conversation);
  const staff = conversation.participants.filter((p) => p.kind === 'STAFF');
  return (
    <aside className="ws-inbox__context" aria-label="Contexto de la conversación">
      {customerParticipant ? (
        <>
          <h2>Información del cliente</h2>
          <span className="ws-conv__avatar ws-conv__avatar--customer ws-conv__avatar--lg">{initials(customerParticipant.name)}</span>
          <div className="ws-context__customer">
            <b>{customer?.nombre ?? customerParticipant.name}</b>
            {customer?.email && <span>{customer.email}</span>}
            {customer?.telefono && <span>{customer.telefono}</span>}
          </div>
          {customer?.nivel && (
            <div className="ws-context__group">
              <span>NIVEL</span>
              <span className="ws-chip ws-chip--secondary">{customer.nivel}</span>
            </div>
          )}
          <Link className="ws-link" to={`/panel/pedidos`}>Ver pedidos</Link>
          <div className="ws-divider" />
        </>
      ) : (
        <h2>Participantes</h2>
      )}
      <div className="ws-context__group">
        <span>{customerParticipant ? 'EQUIPO EN LA CONVERSACIÓN' : `${staff.length} PERSONAS`}</span>
        <ul className="ws-context__people">
          {staff.map((p) => (
            <li key={p.id}>
              <span className="ws-conv__avatar">{initials(p.name)}</span>
              <span>
                <b>{p.isViewer ? `${p.name} (vos)` : p.name}</b>
                <small>{[p.role ? (ROLE_LABELS[p.role] ?? p.role) : null, p.isAdmin ? 'Admin del chat' : null].filter(Boolean).join(' · ')}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function NewConversation({ base, contacts, customers }: { base: string; contacts: Contact[]; customers: Customer[] }) {
  const navigation = useNavigation();
  const result = useActionData<typeof action>();
  const team = contacts.filter((c) => !c.isViewer);
  return (
    <div className="ws-new">
      <header className="ws-chat__head">
        <span className="ws-chat__contact">
          <b>Nueva conversación</b>
          <span>Con una persona es directa; con varias, un grupo.</span>
        </span>
        <Link className="ws-icon-button" to={base} aria-label="Cancelar">
          <X size={18} aria-hidden="true" />
        </Link>
      </header>
      <Form method="post" className="ws-form ws-new__form">
        <input type="hidden" name="intent" value="create" />
        {result && !result.ok && <p className="ws-alert" role="alert">{result.message}</p>}
        <fieldset className="ws-new__group">
          <legend>Equipo</legend>
          {team.length === 0 ? (
            <p className="ws-page__lead">Todavía no hay otras personas en tu equipo.</p>
          ) : (
            team.map((contact) => (
              <label key={contact.userId} className="ws-check">
                <input type="checkbox" name="userId" value={contact.userId} />
                <span>
                  <b>{contact.name}</b>
                  <small>{ROLE_LABELS[contact.role] ?? contact.role}</small>
                </span>
              </label>
            ))
          )}
        </fieldset>
        {customers.length > 0 && (
          <label className="ws-field">
            <span className="ws-field__label">Cliente (opcional)</span>
            <span className="ws-field__control">
              <select name="customerId" defaultValue="">
                <option value="">Sin cliente</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </span>
          </label>
        )}
        <button className="ws-button ws-button--primary" disabled={navigation.state !== 'idle'}>Crear conversación</button>
      </Form>
    </div>
  );
}

/**
 * E4 — messages found by search, or the viewer's ⭐: the chat, the text and when. A click opens
 * the chat on that message.
 */
function FoundList({
  title,
  items,
  conversations,
  hrefOf,
  highlight,
  empty,
}: Readonly<{
  title: string;
  items: FoundMessage[];
  conversations: Conversation[];
  hrefOf: (m: FoundMessage) => string;
  highlight?: string;
  empty?: string;
}>) {
  const byId = new Map(conversations.map((c) => [c.id, c]));
  return (
    <section className="ws-found" aria-label={title}>
      <h2 className="ws-found__title">{title}</h2>
      {items.length === 0 ? (
        <p className="ws-found__empty">{empty ?? 'Sin resultados.'}</p>
      ) : (
        <ul className="ws-found__rows">
          {items.map((m) => {
            const conversation = byId.get(m.conversationId);
            return (
              <li key={m.id}>
                <Link className="ws-found__row" to={hrefOf(m)}>
                  <span className="ws-found__meta">
                    <b>{conversation ? conversationTitle(conversation) : 'Conversación'}</b>
                    <time dateTime={m.createdAt}>{inboxTime(m.createdAt)}</time>
                  </span>
                  <span className="ws-found__text">
                    <Highlighted text={shortText(m.content, 140) || 'Foto o archivo'} term={highlight ?? ''} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** The searched words in bold inside a found message. */
function Highlighted({ text, term }: Readonly<{ text: string; term: string }>) {
  const q = term.trim();
  if (q.length < 2) return <>{text}</>;
  const at = text.toLocaleLowerCase('es').indexOf(q.toLocaleLowerCase('es'));
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

/** E4 — «Reenviar»: up to 5 chats of the Business where the viewer takes part. */
function ForwardDialog({
  from,
  message,
  conversations,
  onClose,
}: Readonly<{ from: string; message: Message; conversations: Conversation[]; onClose: () => void }>) {
  const forward = useFetcher<ActionData>();
  const [chosen, setChosen] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [clientMessageId] = useState(newClientMessageId);
  const targets = conversations.filter((c) => c.viewerAccess.canSend && matchesSearch(c, filter));
  const done = forward.state === 'idle' && forward.data?.ok;
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  return (
    <div
      className="chat-sheet"
      role="presentation"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className="chat-sheet__panel chat-forward" role="dialog" aria-modal="true" aria-label="Reenviar mensaje" onClick={(e) => e.stopPropagation()}>
        <div className="chat-forward__head">
          <b>Reenviar a…</b>
          <button type="button" className="ws-icon-button" aria-label="Cerrar" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <p className="chat-sheet__preview">{shortText(message.content) || 'Foto o archivo'}</p>
        {done ? (
          <div className="chat-forward__done">
            <output>{forward.data?.message}</output>
            <button type="button" className="chat-sheet__btn" onClick={onClose}>
              Listo
            </button>
          </div>
        ) : (
          <forward.Form method="post" className="chat-forward__form">
            <input type="hidden" name="intent" value="forward" />
            <input type="hidden" name="conversationId" value={from} />
            <input type="hidden" name="messageId" value={message.id} />
            <input type="hidden" name="clientMessageId" value={clientMessageId} />
            <label className="chat-forward__search">
              <Search size={15} aria-hidden="true" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar chat" aria-label="Buscar chat" />
            </label>
            <ul className="chat-forward__list">
              {targets.map((c) => {
                const on = chosen.includes(c.id);
                return (
                  <li key={c.id}>
                    <label>
                      <input
                        type="checkbox"
                        name="to"
                        value={c.id}
                        checked={on}
                        disabled={!on && chosen.length >= 5}
                        onChange={() => setChosen((list) => (on ? list.filter((id) => id !== c.id) : [...list, c.id]))}
                      />
                      <ChatAvatar name={conversationTitle(c)} tone={customerOf(c) ? 'customer' : 'neutral'} />
                      <span>{conversationTitle(c)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {forward.data && !forward.data.ok ? <output className="chat-error">{forward.data.message}</output> : null}
            <div className="chat-forward__foot">
              <small>{chosen.length === 0 ? 'Elegí hasta 5 chats' : `${chosen.length} de 5`}</small>
              <button type="submit" className="chat-round chat-send" aria-label="Reenviar" disabled={chosen.length === 0 || forward.state !== 'idle'}>
                <SendHorizontal size={20} aria-hidden="true" />
              </button>
            </div>
          </forward.Form>
        )}
      </div>
    </div>
  );
}
