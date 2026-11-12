import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useFetcher, useLoaderData, useRevalidator } from '@remix-run/react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { StoreHeader } from '~/components/store/StoreHeader';
import { ApiError } from '~/services/api.server';
import { getStoreCustomer, signOutCookie } from '~/services/customer-session.server';
import { fetchCustomerChat, fetchStore, sendCustomerMessage } from '~/services/store.server';
import { formatTime } from '~/utils/format';

/**
 * Chat of the store customer with the Business — /tienda/:slug/chat (STORE-V1-04).
 * The first message opens a conversation with the Owner (OR-B4-031), who answers from
 * Mensajes in the panel. New answers appear every 5 seconds while the page is visible
 * (same polling as the panel; realtime needs the token in the browser, an Owner decision).
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
    const chat = await fetchCustomerChat(customer.jwt, slug);
    return json({ store, customer: { nombre: customer.nombre }, chat, error: null as string | null });
  } catch (error) {
    if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
      throw redirect(`/tienda/${slug}/cuenta?volver=chat`, { headers: { 'Set-Cookie': await signOutCookie(request) } });
    }
    return json({
      store,
      customer: { nombre: customer.nombre },
      chat: { conversationId: null, messages: [] },
      error: 'No pudimos cargar tus mensajes. Probá de nuevo en unos minutos.',
    });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const slug = params.slug ?? '';
  const customer = await getStoreCustomer(request, slug);
  if (!customer) throw redirect(`/tienda/${slug}/cuenta?volver=chat`);
  const form = await request.formData();
  const content = String(form.get('content') ?? '').trim();
  const clientMessageId = String(form.get('clientMessageId') ?? '');
  if (!content) return json({ ok: false, message: 'Escribí un mensaje.' }, { status: 400 });
  if (content.length > MAX_LENGTH) return json({ ok: false, message: `El mensaje puede tener hasta ${MAX_LENGTH} caracteres.` }, { status: 400 });
  if (!clientMessageId) return json({ ok: false, message: 'No pudimos enviar el mensaje.' }, { status: 400 });
  try {
    await sendCustomerMessage(customer.jwt, slug, clientMessageId, content);
    return json({ ok: true, message: '' });
  } catch (error) {
    if (error instanceof ApiError) return json({ ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}

export default function CustomerChat() {
  const { store, customer, chat, error } = useLoaderData<typeof loader>();
  const send = useFetcher<typeof action>();
  const revalidator = useRevalidator();
  const [draft, setDraft] = useState('');
  const [clientMessageId, setClientMessageId] = useState(() => newMessageId());
  const end = useRef<HTMLDivElement>(null);
  const sending = send.state !== 'idle';

  // New answers from the store, while the page is visible.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && revalidator.state === 'idle') revalidator.revalidate();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [revalidator]);

  // Sent: clear the box and take a new retry key (a failed send keeps both, so retrying
  // the same message cannot duplicate it).
  useEffect(() => {
    if (send.state === 'idle' && send.data?.ok) {
      setDraft('');
      setClientMessageId(newMessageId());
    }
  }, [send.state, send.data]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [chat.messages.length]);

  const submit = () => {
    if (!draft.trim() || sending) return;
    send.submit({ content: draft, clientMessageId }, { method: 'post' });
  };
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
          <p>Consultá por productos, envíos o tu pedido. Te responden por acá.</p>
        </div>
        <div className="store-chat" aria-live="polite">
          {error ? <output className="form-error">{error}</output> : null}
          {!error && chat.messages.length === 0 ? (
            <p className="store-chat__empty">Todavía no hay mensajes. Escribí tu consulta y el comercio te va a responder acá.</p>
          ) : null}
          {chat.messages.map((message) => (
            <div key={message.id} className={`store-bubble ${message.mine ? 'store-bubble--mine' : ''}`}>
              {message.mine ? null : <span className="store-bubble__from">{store.nombre}</span>}
              <p>{message.content ?? 'Mensaje eliminado'}</p>
              <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
            </div>
          ))}
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
          <label className="sr-only" htmlFor="chat-content">Tu mensaje</label>
          <textarea
            id="chat-content"
            name="content"
            rows={2}
            maxLength={MAX_LENGTH}
            placeholder="Escribí tu mensaje…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <button type="submit" className="submit-order" disabled={sending || !draft.trim()}>
            {sending ? 'Enviando…' : 'Enviar'}
          </button>
        </send.Form>
        {send.data && !send.data.ok ? <output className="form-error">{send.data.message}</output> : null}
      </section>
    </main>
  );
}

function newMessageId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(performance.now() * 1000)}`;
}
