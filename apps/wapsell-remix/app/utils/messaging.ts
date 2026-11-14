/**
 * Wire shapes of GET /messaging/conversations[/:id][/messages] and pure helpers the
 * Mensajes screen uses to present them. No I/O here, so it is unit-tested directly.
 */

export interface Participant {
  id: string;
  userId: string | null;
  customerId: string | null;
  kind: 'STAFF' | 'CUSTOMER';
  name: string;
  role: string | null;
  isAdmin: boolean;
  isViewer: boolean;
}

export interface MessagePreview {
  id: string;
  content: string | null;
  createdAt: string;
  authorUserId: string | null;
  authorCustomerId: string | null;
}

export interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  createdAt: string;
  updatedAt: string;
  viewerAccess: { canSend: boolean; mode: 'PARTICIPANT' | 'OWNER_READ_ONLY' };
  participants: Participant[];
  lastMessage: MessagePreview | null;
}

/** OR-B4-037 — what a message carries besides its text: a product card, or a photo or file. */
export type Attachment =
  | { tipo: 'producto'; id: string; productoId: string; nombre: string; precio: string }
  | { tipo: 'imagen' | 'archivo'; id: string; nombre: string; mimeType: string; tamano: number };

export type ProductCard = Extract<Attachment, { tipo: 'producto' }>;

/** The product cards of a message. */
export const productCards = (m: { adjuntos?: Attachment[] }) =>
  (m.adjuntos ?? []).filter((a): a is ProductCard => a.tipo === 'producto');

/** OR-B4-037 — who may load the customer's cart from the chat (SALES_CREATE). */
export const canEditCustomerCart = (role: string) => ['OWNER', 'ADMIN', 'VENDEDOR', 'ASISTENTE_LOCAL'].includes(role);

export interface Message extends MessagePreview {
  adjuntos?: Attachment[];
  conversationId: string;
  clientMessageId: string;
  sequence: string;
  type: string;
  editedAt: string | null;
  deletedAt: string | null;
  readAt: string | null;
}

export interface Contact {
  userId: string;
  name: string;
  role: string;
  isViewer: boolean;
}

/** Everyone in the conversation except the person looking at it. */
export function others(conversation: Conversation): Participant[] {
  return conversation.participants.filter((p) => !p.isViewer);
}

export function customerOf(conversation: Conversation): Participant | undefined {
  return conversation.participants.find((p) => p.kind === 'CUSTOMER');
}

/** Inbox title: the customer if there is one, otherwise the other people by first name. */
export function conversationTitle(conversation: Conversation): string {
  const customer = customerOf(conversation);
  if (customer) return customer.name;
  const rest = others(conversation);
  if (rest.length === 0) return 'Solo vos';
  if (rest.length === 1) return rest[0].name;
  return rest.map((p) => p.name.split(/\s+/)[0]).join(', ');
}

export function conversationSubtitle(conversation: Conversation): string {
  const customer = customerOf(conversation);
  const staff = conversation.participants.filter((p) => p.kind === 'STAFF');
  if (customer) {
    const team = staff.map((p) => (p.isViewer ? 'vos' : p.name.split(/\s+/)[0]));
    return `Cliente · Con ${team.join(', ') || 'nadie del equipo'}`;
  }
  return conversation.type === 'GROUP' ? `Equipo · ${conversation.participants.length} personas` : 'Equipo · Directo';
}

export function authorOf(conversation: Conversation, message: MessagePreview): Participant | undefined {
  return conversation.participants.find((p) =>
    message.authorCustomerId ? p.customerId === message.authorCustomerId : p.userId === message.authorUserId,
  );
}

/**
 * Bubbles on the right are "our side": the viewer's own messages, and in a conversation
 * with a customer every team message (the mockup shows the team answering on the right).
 */
export function isOwnSide(conversation: Conversation, message: MessagePreview): boolean {
  const author = authorOf(conversation, message);
  if (author?.isViewer) return true;
  return Boolean(customerOf(conversation)) && !message.authorCustomerId;
}

/** "Lucía: hola" in groups, plain text otherwise, "Vos: …" for the viewer. */
export function previewText(conversation: Conversation): string {
  const last = conversation.lastMessage;
  if (!last) return 'Sin mensajes todavía';
  const text = last.content?.trim() || 'Mensaje';
  const author = authorOf(conversation, last);
  if (author?.isViewer) return `Vos: ${text}`;
  if (conversation.type === 'GROUP' && author) return `${author.name.split(/\s+/)[0]}: ${text}`;
  return text;
}

/** Most recent activity first; conversations without messages sort by creation. */
export function sortByActivity(conversations: Conversation[]): Conversation[] {
  const at = (c: Conversation) => new Date(c.lastMessage?.createdAt ?? c.createdAt).getTime();
  return [...conversations].sort((a, b) => at(b) - at(a));
}

const AR_TZ = 'America/Argentina/Buenos_Aires';

function dayKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: AR_TZ }).format(new Date(iso));
}

/** "10:42" today, "ayer", or "11/11" for older messages. */
export function inboxTime(iso: string, now = new Date()): string {
  const today = dayKey(now.toISOString());
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000).toISOString());
  const day = dayKey(iso);
  if (day === today) return messageTime(iso);
  if (day === yesterday) return 'ayer';
  return new Intl.DateTimeFormat('es-AR', { timeZone: AR_TZ, day: '2-digit', month: '2-digit' }).format(new Date(iso));
}

export function messageTime(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', { timeZone: AR_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(
    new Date(iso),
  );
}

/** Groups messages by calendar day with the mockup's day label ("HOY", "AYER", date). */
export function groupByDay<T extends { createdAt: string }>(messages: T[], now = new Date()) {
  const today = dayKey(now.toISOString());
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000).toISOString());
  const groups: Array<{ key: string; label: string; items: T[] }> = [];
  for (const message of messages) {
    const key = dayKey(message.createdAt);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const label =
        key === today
          ? 'HOY'
          : key === yesterday
            ? 'AYER'
            : new Intl.DateTimeFormat('es-AR', { timeZone: AR_TZ, day: 'numeric', month: 'long' })
                .format(new Date(message.createdAt))
                .toUpperCase();
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(message);
  }
  return groups;
}

export function matchesSearch(conversation: Conversation, query: string): boolean {
  const q = query.trim().toLocaleLowerCase('es');
  if (!q) return true;
  return [conversationTitle(conversation), conversation.lastMessage?.content ?? '', ...conversation.participants.map((p) => p.name)]
    .join(' ')
    .toLocaleLowerCase('es')
    .includes(q);
}

/** GET /messaging/conversations/:id/cart — what "Crear pedido" would order. */
export interface ConversationCart {
  customerId: string | null;
  items: Array<{ productoId: string; nombre: string; cantidad: number; precio: string }>;
  total: string;
}

/**
 * Whether the viewer can turn the customer's cart into an order. Mirrors the API:
 * ORDERS_MANAGE + MESSAGING_MANAGE (Owner and Admin) and being an admin of this chat.
 */
export function canCreateOrder(conversation: Conversation): boolean {
  const viewer = conversation.participants.find((p) => p.isViewer);
  return Boolean(viewer?.isAdmin && (viewer.role === 'OWNER' || viewer.role === 'ADMIN') && customerOf(conversation));
}
