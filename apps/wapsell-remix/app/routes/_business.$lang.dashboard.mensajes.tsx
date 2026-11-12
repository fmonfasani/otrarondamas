import { useEffect, useRef } from 'react';
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useFetcher, useLoaderData, useNavigation, useParams, useRevalidator, useSearchParams } from '@remix-run/react';
import { ArrowLeft, ArrowUp, Eye, Search, SquarePen, Users, X } from 'lucide-react';
import { initials } from '~/components/panel/AppShell';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import {
  authorOf,
  conversationSubtitle,
  conversationTitle,
  customerOf,
  groupByDay,
  inboxTime,
  isOwnSide,
  matchesSearch,
  messageTime,
  previewText,
  sortByActivity,
  type Contact,
  type Conversation,
  type Message,
} from '~/utils/messaging';

export const meta: MetaFunction = () => [{ title: 'Mensajes · Wapsell' }];

interface Customer {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  nivel?: string | null;
}

/** How often an open Mensajes tab asks the server for new messages. */
export const REFRESH_MS = 5000;

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

  const conversations = await settle(apiRequest<Conversation[]>(token, '/messaging/conversations'));

  let selected: Conversation | null = null;
  let messages: Message[] = [];
  let customer: Customer | null = null;
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
    composing,
    contacts: contacts ?? [],
    customers: customers ?? [],
  });
}

type ActionData = { ok: boolean; message?: string };

export async function action({ request, params }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = form.get('intent');
  try {
    if (intent === 'send') {
      const conversationId = String(form.get('conversationId') ?? '');
      const content = String(form.get('content') ?? '').trim();
      if (!conversationId || !content) return json<ActionData>({ ok: false, message: 'Escribe un mensaje.' }, { status: 400 });
      await apiRequest(token, `/messaging/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ clientMessageId: crypto.randomUUID(), content }),
      });
      return json<ActionData>({ ok: true });
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
      return redirect(`/${params.lang ?? 'es'}/dashboard/mensajes?c=${created.id}`);
    }
    return json<ActionData>({ ok: false, message: 'Acción desconocida.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) return json<ActionData>({ ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}

/** Keeps an open, visible Mensajes tab up to date without a page reload. */
function useAutoRefresh(paused: boolean) {
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (paused || document.visibilityState !== 'visible') return;
      if (revalidator.state === 'idle' && navigation.state === 'idle') revalidator.revalidate();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [paused, revalidator, navigation.state]);
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
  useAutoRefresh(sending);

  const base = `/${lang}/dashboard/mensajes`;
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

  const visible = data.conversations
    .filter((c) => (filter === 'clientes' ? Boolean(customerOf(c)) : filter === 'equipo' ? !customerOf(c) : true))
    .filter((c) => matchesSearch(c, query));
  const withCustomers = data.conversations.filter((c) => customerOf(c)).length;
  const showThread = Boolean(data.selectedId) || data.composing;

  return (
    <div className={`ws-inbox${showThread ? ' has-selection' : ''}`}>
      <section className="ws-inbox__list" aria-labelledby="inbox-title">
        <div className="ws-inbox__list-head">
          <h1 id="inbox-title">Bandeja de entrada</h1>
          <Link className="ws-icon-button" to={hrefWith({ nueva: '1', c: null })} aria-label="Nueva conversación" title="Nueva conversación">
            <SquarePen size={18} aria-hidden="true" />
          </Link>
        </div>
        <Form method="get" className="ws-inbox__search" role="search">
          {data.selectedId && <input type="hidden" name="c" value={data.selectedId} />}
          {filter !== 'todas' && <input type="hidden" name="f" value={filter} />}
          <Search size={16} aria-hidden="true" />
          <input name="q" defaultValue={query} placeholder="Buscar conversaciones" aria-label="Buscar conversaciones" />
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
        {visible.length === 0 ? (
          <div className="ws-empty">
            <b>{data.conversations.length === 0 ? 'Todavía no hay conversaciones.' : 'Nada coincide con la búsqueda.'}</b>
            {data.conversations.length === 0 && 'Empieza una con alguien de tu equipo o un cliente.'}
          </div>
        ) : (
          <ul className="ws-inbox__rows">
            {visible.map((conversation) => {
              const title = conversationTitle(conversation);
              const active = conversation.id === data.selectedId;
              return (
                <li key={conversation.id}>
                  <Link
                    className={`ws-conv${active ? ' is-active' : ''}`}
                    to={hrefWith({ c: conversation.id, nueva: null })}
                    aria-current={active ? 'true' : undefined}
                  >
                    <span className={`ws-conv__avatar${customerOf(conversation) ? ' ws-conv__avatar--customer' : ''}`}>
                      {conversation.type === 'GROUP' && !customerOf(conversation) ? <Users size={14} aria-hidden="true" /> : initials(title)}
                    </span>
                    <span className="ws-conv__summary">
                      <span className="ws-conv__meta">
                        <span className="ws-conv__name">{title}</span>
                        <span className="ws-conv__time">
                          {inboxTime(conversation.lastMessage?.createdAt ?? conversation.createdAt)}
                        </span>
                      </span>
                      <span className="ws-conv__last">{previewText(conversation)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="ws-inbox__chat" aria-label="Conversación">
        {data.composing ? (
          <NewConversation base={hrefWith({ nueva: null })} contacts={data.contacts} customers={data.customers} />
        ) : data.selected ? (
          <Thread
            key={data.selected.id}
            conversation={data.selected}
            messages={data.messages}
            back={hrefWith({ c: null })}
            sender={sender}
          />
        ) : data.selectedId ? (
          <div className="ws-inbox__placeholder">
            <p className="ws-alert" role="alert">No encontramos esa conversación o no tienes acceso.</p>
            <Link className="ws-link" to={hrefWith({ c: null })}>Volver a la bandeja</Link>
          </div>
        ) : (
          <div className="ws-inbox__placeholder">
            <b>Elige una conversación</b>
            <span>O empieza una nueva con alguien de tu equipo o un cliente.</span>
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
}: {
  conversation: Conversation;
  messages: Message[];
  back: string;
  sender: ReturnType<typeof useFetcher<ActionData>>;
}) {
  const threadRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastId = messages[messages.length - 1]?.id;

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  useEffect(() => {
    if (sender.state === 'idle' && sender.data?.ok) formRef.current?.reset();
  }, [sender.state, sender.data]);

  const pending = sender.state !== 'idle' ? String(sender.formData?.get('content') ?? '').trim() : '';
  const canSend = conversation.viewerAccess.canSend;
  const visibleMessages = messages.filter((m) => !m.deletedAt);

  return (
    <>
      <header className="ws-chat__head">
        <Link className="ws-chat__back" to={back} aria-label="Volver a la bandeja">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <span className="ws-chat__contact">
          <b>{conversationTitle(conversation)}</b>
          <span>{conversationSubtitle(conversation)}</span>
        </span>
      </header>

      <div className="ws-thread" ref={threadRef} aria-live="polite">
        {visibleMessages.length === 0 && !pending && <p className="ws-thread__empty">Todavía no hay mensajes. Escribe el primero.</p>}
        {groupByDay(visibleMessages).map((group) => (
          <div key={group.key} className="ws-thread__day-group">
            <span className="ws-thread__day">{group.label}</span>
            {group.items.map((message) => {
              const own = isOwnSide(conversation, message);
              const author = authorOf(conversation, message);
              const showAuthor = !author?.isViewer && (conversation.type === 'GROUP' || own);
              return (
                <div key={message.id} className={`ws-bubble${own ? ' ws-bubble--team' : ''}`}>
                  {showAuthor && <span className="ws-bubble__author">{author?.name ?? 'Ex participante'}</span>}
                  <p>{message.content}</p>
                  <small>
                    {messageTime(message.createdAt)}
                    {message.editedAt ? ' · editado' : ''}
                  </small>
                </div>
              );
            })}
          </div>
        ))}
        {pending && (
          <div className="ws-bubble ws-bubble--team is-pending">
            <p>{pending}</p>
            <small>Enviando…</small>
          </div>
        )}
      </div>

      {sender.data && !sender.data.ok && sender.state === 'idle' && (
        <p className="ws-alert ws-chat__error" role="alert">{sender.data.message}</p>
      )}

      {canSend ? (
        <sender.Form method="post" className="ws-composer" ref={formRef}>
          <input type="hidden" name="intent" value="send" />
          <input type="hidden" name="conversationId" value={conversation.id} />
          <textarea
            name="content"
            rows={2}
            required
            placeholder="Escribe tu respuesta…"
            aria-label="Mensaje"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="ws-composer__tools">
            <span className="ws-composer__hint">Enter envía · Shift+Enter, nueva línea</span>
            <button className="ws-composer__send" type="submit" aria-label="Enviar" disabled={sender.state !== 'idle'}>
              <ArrowUp size={16} aria-hidden="true" />
            </button>
          </div>
        </sender.Form>
      ) : (
        <p className="ws-composer ws-composer--readonly">
          <Eye size={16} aria-hidden="true" /> Estás viendo esta conversación sin participar en ella. Solo lectura.
        </p>
      )}
    </>
  );
}

function ContextPanel({ conversation, customer, lang }: { conversation: Conversation; customer: Customer | null; lang: string }) {
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
          <Link className="ws-link" to={`/${lang}/dashboard/pedidos`}>Ver pedidos</Link>
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
