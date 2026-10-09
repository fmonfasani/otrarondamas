import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { io } from 'socket.io-client';
import { MessageCircle, Plus, Send, RefreshCw } from 'lucide-react';
import { API_BASE_URL, api, ApiError } from '../../lib/api';
import type { Cliente } from '@otrarondamas/shared-types';

type Participant = {
  userId?: string | null;
  customerId?: string | null;
};
type Conversation = {
  id: string;
  type: 'DIRECT' | 'GROUP';
  updatedAt?: string;
  participants?: Participant[];
};
type Message = {
  id: string;
  content?: string | null;
  authorUserId?: string | null;
  authorCustomerId?: string | null;
  createdAt: string;
  sequence?: string | number;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function MessagingPage() {
  const [customers, setCustomers] = useState<Cliente[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeId, setActiveId] = useState('');
  const activeIdRef = useRef('');
  const [customerId, setCustomerId] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const customerNames = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.nombre])),
    [customers],
  );

  const refreshConversations = useCallback(async (preferredId?: string) => {
    const rows = (await api.listarConversaciones()) as Conversation[];
    setConversations(rows);
    const nextId =
      (preferredId && rows.some((row) => row.id === preferredId) ? preferredId : '') ||
      (activeId && rows.some((row) => row.id === activeId) ? activeId : '') ||
      rows[0]?.id ||
      '';
    activeIdRef.current = nextId;
    setActiveId(nextId);
    return nextId;
  }, [activeId]);

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [customerResult, conversationResult] = await Promise.allSettled([
        api.listarClientes(),
        api.listarConversaciones() as Promise<Conversation[]>,
      ]);
      if (conversationResult.status === 'rejected') throw conversationResult.reason;

      const conversationRows = conversationResult.value;
      setConversations(conversationRows);
      setActiveId((current) => {
        const nextId = current && conversationRows.some((row) => row.id === current)
          ? current
          : conversationRows[0]?.id ?? '';
        activeIdRef.current = nextId;
        return nextId;
      });

      if (customerResult.status === 'fulfilled') {
        setCustomers(customerResult.value);
        setCustomerId((current) => current || customerResult.value[0]?.id || '');
      } else {
        // A customer-list failure should not hide conversations that already exist.
        setCustomers([]);
        setNotice('Las conversaciones se cargaron, pero no se pudieron cargar clientes para iniciar una nueva.');
      }
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar las conversaciones. Verificá la API y tu sesión.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingMessages(true);
    setMessages([]);
    setError('');
    api.listarMensajes(activeId)
      .then((rows) => {
        if (!cancelled) setMessages(rows as Message[]);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'No se pudo cargar el historial.'));
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });
    return () => { cancelled = true; };
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
    if (!token) return;

    const socket = io(`${API_BASE_URL}/messaging`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });
    const onMessageCreated = (message: Message & { conversationId: string }) => {
      if (message.conversationId !== activeId) return;
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message],
      );
      void refreshConversations(activeId).catch(() => undefined);
    };

    socket.on('connect', () => {
      socket.emit(
        'conversation.join',
        { conversationId: activeId },
        (result: { ok?: boolean; message?: string }) => {
          if (result?.ok) {
            setNotice('');
            socket.on('message.created', onMessageCreated);
          } else {
            setError(result?.message ?? 'No se pudo acceder a la conversación en tiempo real.');
          }
        },
      );
    });
    socket.on('connect_error', () => {
      setNotice('Tiempo real no disponible; podés seguir consultando y enviando por HTTP.');
    });

    return () => {
      socket.off('message.created', onMessageCreated);
      socket.disconnect();
    };
  }, [activeId, refreshConversations]);

  async function createConversation() {
    if (!customerId) {
      setError('Primero necesitás un cliente para iniciar una conversación.');
      return;
    }
    setCreating(true);
    setError('');
    setNotice('');
    try {
      const created = (await api.crearConversacion({
        type: 'DIRECT',
        participantCustomerIds: [customerId],
      })) as Conversation;
      if (!created?.id) throw new Error('La API no devolvió el identificador de la conversación creada.');

      // The POST response is the source of truth for the newly created row;
      // do not turn a successful create into a reported failure because a
      // subsequent list refresh is temporarily unavailable.
      activeIdRef.current = created.id;
      setActiveId(created.id);
      setConversations((current) => [
        created,
        ...current.filter((row) => row.id !== created.id),
      ]);
      setNotice('Conversación creada y guardada.');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo crear la conversación.'));
    } finally {
      setCreating(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    const conversationId = activeIdRef.current || activeId;
    if (!conversationId || !content || sending) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      const created = (await api.enviarMensaje(conversationId, {
        clientMessageId: crypto.randomUUID(),
        content,
      })) as Message;

      // HTTP success means the server accepted and persisted the message.
      // Reflect that result immediately; a later history-refresh failure must
      // not incorrectly tell the user that sending failed.
      setDraft('');
      if (activeIdRef.current === conversationId && created?.id) {
        setMessages((current) =>
          current.some((item) => item.id === created.id) ? current : [...current, created],
        );
      }

      try {
        const rows = (await api.listarMensajes(conversationId)) as Message[];
        if (activeIdRef.current === conversationId) setMessages(rows);
      } catch {
        if (activeIdRef.current === conversationId) {
          setError('El mensaje se envió, pero no se pudo actualizar el historial. Actualizá la conversación para verificarlo.');
        }
      }

      try {
        await refreshConversations(activeIdRef.current || conversationId);
      } catch {
        if (activeIdRef.current === conversationId) {
          setNotice('El mensaje se envió; no se pudo actualizar la lista de conversaciones.');
        }
      }
    } catch (err) {
      setError(errorMessage(err, 'No se pudo enviar el mensaje.'));
    } finally {
      setSending(false);
    }
  }

  function conversationLabel(conversation: Conversation) {
    const customer = conversation.participants?.find((participant) => participant.customerId);
    return (customer?.customerId && customerNames.get(customer.customerId)) ||
      (conversation.type === 'GROUP' ? 'Conversación grupal' : 'Conversación directa');
  }

  return (
    <section className="flex h-[calc(100vh-7rem)] min-h-[560px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-800"><MessageCircle className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Mensajería</h1>
            <p className="text-sm text-gray-500">Conversaciones y mensajes persistidos en la API</p>
          </div>
        </div>
        <button type="button" onClick={() => void loadBase()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </header>

      {error && <div role="alert" className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="border-b border-green-200 bg-green-50 px-5 py-3 text-sm text-green-800">{notice}</div>}

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-gray-200 md:border-b-0 md:border-r">
          <form className="space-y-2 border-b border-gray-200 p-4" onSubmit={(event) => { event.preventDefault(); void createConversation(); }}>
            <label htmlFor="messaging-customer" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Nueva conversación</label>
            <select id="messaging-customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" disabled={loading || customers.length === 0}>
              {customers.length === 0 && <option value="">No hay clientes disponibles</option>}
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.nombre}</option>)}
            </select>
            <button type="submit" disabled={creating || loading || !customerId} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50">
              <Plus className="h-4 w-4" /> {creating ? 'Creando…' : 'Crear conversación'}
            </button>
          </form>
          <div className="flex-1 overflow-y-auto">
            {loading ? <p className="p-4 text-sm text-gray-500">Cargando conversaciones…</p> :
              conversations.length === 0 ? <p className="p-4 text-sm text-gray-500">Todavía no hay conversaciones. Elegí un cliente y creá la primera.</p> :
              conversations.map((conversation) => (
                <button key={conversation.id} type="button" onClick={() => { activeIdRef.current = conversation.id; setActiveId(conversation.id); }} className={`block w-full border-b border-gray-100 px-4 py-4 text-left hover:bg-gray-50 ${activeId === conversation.id ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''}`}>
                  <span className="block truncate text-sm font-semibold text-gray-900">{conversationLabel(conversation)}</span>
                  <span className="mt-1 block truncate text-xs text-gray-500">{conversation.id}</span>
                </button>
              ))
            }
          </div>
        </aside>

        <div className="flex min-h-0 flex-col">
          {!activeId ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-gray-500">
              <MessageCircle className="mb-3 h-10 w-10 text-gray-300" />
              <p className="font-medium">Elegí o creá una conversación</p>
              <p className="mt-1 text-sm">Los mensajes aparecerán acá una vez cargados desde el servidor.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-gray-100 px-5 py-3">
                <p className="font-semibold text-gray-900">{conversations.find((row) => row.id === activeId) ? conversationLabel(conversations.find((row) => row.id === activeId)!) : 'Conversación'}</p>
                <p className="text-xs text-gray-500">ID: {activeId}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-5">
                {loadingMessages ? <p className="text-sm text-gray-500">Cargando historial…</p> :
                  messages.length === 0 ? <p className="py-10 text-center text-sm text-gray-500">No hay mensajes todavía. Enviá el primero.</p> :
                  messages.map((message) => (
                    <div key={message.id} className="max-w-[85%] rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                      <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{message.content ?? 'Mensaje eliminado'}</p>
                      <p className="mt-2 text-right text-xs text-gray-400">{new Date(message.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                }
              </div>
              <form onSubmit={sendMessage} className="flex items-end gap-3 border-t border-gray-200 p-4">
                <label htmlFor="messaging-draft" className="sr-only">Escribir mensaje</label>
                <textarea id="messaging-draft" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={sending} maxLength={10000} rows={2} placeholder="Escribí un mensaje…" className="min-h-[44px] flex-1 resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100" />
                <button type="submit" disabled={sending || !draft.trim()} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-gray-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">
                  <Send className="h-4 w-4" /> {sending ? 'Enviando…' : 'Enviar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
