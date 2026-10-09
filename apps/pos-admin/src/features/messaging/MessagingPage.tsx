import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { io } from 'socket.io-client';
import { MessageCircle, Plus, Send, RefreshCw, Search, X } from 'lucide-react';
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
type Association = { id: string; entityType: 'CUSTOMER' | 'ORDER' | 'SALE' | 'PRODUCT' | 'PURCHASE'; entityId: string; label?: string; reason?: string | null; active?: boolean };
type ProductOption = { id: string; nombre: string; codigoInterno?: string; precioMinorista?: string | number };
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
  const [associations, setAssociations] = useState<Association[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [associationBusy, setAssociationBusy] = useState('');
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [showAssociationHistory, setShowAssociationHistory] = useState(false);
  const [associationHistory, setAssociationHistory] = useState<Association[]>([]);

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
    setNotice('');
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
        const customerRows = customerResult.value;
        setCustomers(customerRows);
        setCustomerId((current) => current || customerRows[0]?.id || '');
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
      setAssociations([]);
      setProductResults([]);
      return;
    }
    let cancelled = false;
    api.listarAsociacionesConversacion(activeId)
      .then((rows) => {
        if (!cancelled) setAssociations(rows as Association[]);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'No se pudo cargar el contexto comercial.'));
      });
    return () => { cancelled = true; };
  }, [activeId]);

  async function toggleAssociationHistory() {
    if (showAssociationHistory) {
      setShowAssociationHistory(false);
      return;
    }
    if (!activeId) return;
    setError('');
    try {
      setAssociationHistory((await api.listarHistorialAsociacionesConversacion(activeId)) as Association[]);
      setShowAssociationHistory(true);
    } catch (err) {
      setError(errorMessage(err, 'El historial de asociaciones requiere permisos de Owner.'));
    }
  }

  async function searchProducts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = productSearch.trim();
    if (!term) {
      setProductResults([]);
      return;
    }
    setSearchingProducts(true);
    setError('');
    try {
      setProductResults((await api.buscarProductos(term)) as ProductOption[]);
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron buscar productos del negocio.'));
    } finally {
      setSearchingProducts(false);
    }
  }

  async function attachProduct(product: ProductOption) {
    if (!activeId || associationBusy) return;
    setAssociationBusy(product.id);
    setError('');
    try {
      await api.asociarEntidadConversacion(activeId, {
        entityType: 'PRODUCT',
        entityId: product.id,
        reason: 'Producto seleccionado explícitamente desde Messaging',
      });
      setAssociations((await api.listarAsociacionesConversacion(activeId)) as Association[]);
      setNotice(`Producto asociado: ${product.nombre}`);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo asociar el producto a la conversación.'));
    } finally {
      setAssociationBusy('');
    }
  }

  async function createOrderFromConversation() {
    if (!activeId || creatingOrder) return;
    const items = associations
      .filter((association) => association.entityType === 'PRODUCT')
      .map((association) => ({
        productoId: association.entityId,
        cantidad: Math.max(1, Number(cartQuantities[association.entityId] ?? 1)),
      }));
    if (!items.length) {
      setError('Asociá al menos un producto antes de crear el pedido.');
      return;
    }
    if (!associations.some((association) => association.entityType === 'CUSTOMER')) {
      setError('La conversación necesita un Customer asociado para crear un pedido.');
      return;
    }
    setCreatingOrder(true);
    setError('');
    try {
      const order = await api.crearPedidoDesdeConversacion(activeId, { items });
      setAssociations((await api.listarAsociacionesConversacion(activeId)) as Association[]);
      setNotice(`Pedido creado en Commerce: ${order.id} · estado ${order.estado}. La confirmación y el movimiento de stock siguen en Pedidos.`);
      setCartQuantities({});
    } catch (err) {
      setError(errorMessage(err, 'No se pudo crear el pedido desde la conversación.'));
    } finally {
      setCreatingOrder(false);
    }
  }

  async function detachAssociation(association: Association) {
    if (!activeId || associationBusy) return;
    setAssociationBusy(association.id);
    setError('');
    try {
      await api.desactivarAsociacionConversacion(activeId, association.id, 'Asociación retirada desde Messaging');
      setAssociations((current) => current.filter((item) => item.id !== association.id));
      setNotice('Asociación retirada del contexto activo. El historial se conserva.');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo retirar la asociación.'));
    } finally {
      setAssociationBusy('');
    }
  }

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
              <section aria-label="Contexto comercial" className="border-b border-gray-200 bg-white px-5 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">Contexto comercial</h2>
                  <span className="text-xs text-gray-500">{associations.length} asociaciones activas</span>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {associations.length === 0 ? <span className="text-xs text-gray-500">Sin entidades comerciales asociadas.</span> :
                    associations.map((association) => (
                      <div key={association.id} className="flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs">
                        <span className="font-semibold">{association.entityType}</span>
                        <span className="max-w-[220px] truncate">{association.label || association.entityId}</span>
                        <button type="button" aria-label={`Retirar asociación ${association.label || association.entityId}`} disabled={!!associationBusy} onClick={() => void detachAssociation(association)} className="text-gray-500 hover:text-red-600 disabled:opacity-50"><X className="h-3 w-3" /></button>
                      </div>
                    ))
                  }
                </div>
                <div className="mb-2 flex justify-end">
                  <button type="button" onClick={() => void toggleAssociationHistory()} className="text-xs font-semibold text-gray-600 underline hover:text-gray-900">{showAssociationHistory ? 'Ocultar historial' : 'Ver historial de asociaciones'}</button>
                </div>
                {showAssociationHistory && <div className="mb-3 max-h-24 space-y-1 overflow-y-auto rounded border border-gray-200 p-2">
                  {associationHistory.length === 0 ? <p className="text-xs text-gray-500">No hay asociaciones históricas.</p> : associationHistory.map((association) => (
                    <div key={association.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{association.entityType} · {association.label || association.entityId}</span>
                      <span className={association.active ? 'text-green-700' : 'text-gray-500'}>{association.active ? 'Activa' : 'Histórica'}</span>
                    </div>
                  ))}
                </div>}
                <form onSubmit={searchProducts} className="flex gap-2">
                  <label htmlFor="messaging-product-search" className="sr-only">Buscar productos para asociar</label>
                  <input id="messaging-product-search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar producto para asociar…" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs" />
                  <button type="submit" disabled={searchingProducts || !productSearch.trim()} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"><Search className="h-3 w-3" />{searchingProducts ? 'Buscando…' : 'Buscar'}</button>
                </form>
                {associations.some((association) => association.entityType === 'PRODUCT') && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-900">Carrito de la conversación</h3>
                    <span className="text-xs text-gray-600">{associations.filter((association) => association.entityType === 'PRODUCT').length} productos</span>
                  </div>
                  <div className="space-y-2">
                    {associations.filter((association) => association.entityType === 'PRODUCT').map((association) => (
                      <label key={association.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="min-w-0 truncate">{association.label || association.entityId}</span>
                        <input aria-label={`Cantidad para ${association.label || association.entityId}`} type="number" min={1} step={1} value={cartQuantities[association.entityId] ?? 1} onChange={(event) => setCartQuantities((current) => ({ ...current, [association.entityId]: Math.max(1, Number(event.target.value) || 1) }))} className="w-16 rounded border border-gray-300 px-2 py-1" />
                      </label>
                    ))}
                  </div>
                  {!associations.some((association) => association.entityType === 'CUSTOMER') && <p className="mt-2 text-xs text-amber-800">Asociá un Customer para habilitar la creación del pedido.</p>}
                  <button type="button" onClick={() => void createOrderFromConversation()} disabled={creatingOrder || !associations.some((association) => association.entityType === 'CUSTOMER')} className="mt-3 w-full rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50">{creatingOrder ? 'Creando pedido…' : 'Crear pedido en Commerce'}</button>
                </div>}
                {productResults.length > 0 && <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                  {productResults.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2 text-xs">
                      <span className="min-w-0 truncate">{product.nombre}{product.codigoInterno ? ` · ${product.codigoInterno}` : ''}</span>
                      <button type="button" disabled={!!associationBusy || associations.some((item) => item.entityType === 'PRODUCT' && item.entityId === product.id)} onClick={() => void attachProduct(product)} className="shrink-0 rounded border border-gray-300 px-2 py-1 font-semibold hover:bg-white disabled:opacity-50">{associationBusy === product.id ? 'Asociando…' : associations.some((item) => item.entityType === 'PRODUCT' && item.entityId === product.id) ? 'Asociado' : 'Asociar'}</button>
                    </div>
                  ))}
                </div>}
              </section>
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
