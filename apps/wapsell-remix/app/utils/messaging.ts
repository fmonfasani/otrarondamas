/**
 * Wire shapes of GET /messaging/conversations[/:id][/messages] and pure helpers the
 * Mensajes screen uses to present them. No I/O here, so it is unit-tested directly.
 */

import type { OrderCardData } from './order-card';

export interface Participant {
  id: string;
  userId: string | null;
  customerId: string | null;
  kind: 'STAFF' | 'CUSTOMER';
  name: string;
  role: string | null;
  isAdmin: boolean;
  isViewer: boolean;
  /** E2b — has a screen open now. */
  online?: boolean;
  /** E2b — when they last left («últ. vez»). */
  lastSeenAt?: string | null;
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
  /** E2 — messages from others this person has not read (0 when only reading). */
  unreadCount?: number;
  /** E6a — this person's own inbox: pinned on top, archived away, muted until a time. */
  fijado?: boolean;
  archivado?: boolean;
  silenciadoHasta?: string | null;
  /** E6a — the team member in charge (Owner/Admin assign). */
  asignadoA?: { userId: string; nombre: string } | null;
  /** E6a — the customer's labels (only the team sees them). */
  etiquetas?: CustomerLabel[];
}

/** E6a — the colours of a customer label (the API accepts these). */
export const LABEL_COLORS = ['gris', 'rojo', 'naranja', 'amarillo', 'verde', 'celeste', 'azul', 'violeta'] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];
export type CustomerLabel = { id: string; nombre: string; color: LabelColor };

/** E6a — the inbox's filters, like WhatsApp Business. */
export type InboxFilter = 'todas' | 'no-leidos' | 'mios' | 'clientes' | 'equipo';

export function inboxFilterOf(value: string | null): InboxFilter {
  return value === 'no-leidos' || value === 'mios' || value === 'clientes' || value === 'equipo' ? value : 'todas';
}

/**
 * E6a — what the inbox shows: archived chats only in «Archivados», the rest filtered, by label
 * when one is chosen, pinned ones on top (each group keeps its order by activity).
 */
export function inboxView(
  conversations: Conversation[],
  options: { filter: InboxFilter; label?: string | null; archived?: boolean; me?: string | null; open?: string | null },
): Conversation[] {
  const { filter, label, archived = false, me, open } = options;
  const shown = conversations.filter((c) => {
    if (Boolean(c.archivado) !== archived) return false;
    if (label && !(c.etiquetas ?? []).some((l) => l.id === label)) return false;
    switch (filter) {
      // The open chat stays while reading it, even once it has no unread messages.
      case 'no-leidos':
        return (c.unreadCount ?? 0) > 0 || c.id === open;
      case 'mios':
        return Boolean(me) && c.asignadoA?.userId === me;
      case 'clientes':
        return Boolean(customerOf(c));
      case 'equipo':
        return !customerOf(c);
      default:
        return true;
    }
  });
  return archived ? shown : [...shown.filter((c) => c.fijado), ...shown.filter((c) => !c.fijado)];
}

/** E6a — whether a chat is muted now. */
export const isMuted = (c: Pick<Conversation, 'silenciadoHasta'>, now = Date.now()) =>
  Boolean(c.silenciadoHasta && Date.parse(c.silenciadoHasta) > now);

/** E6a — «hasta las 18:30», «hasta el 3/12», «siempre». */
export function mutedLabel(until: string | null | undefined, now = Date.now()): string {
  if (!until) return '';
  const at = Date.parse(until);
  if (at - now > 365 * 24 * 3600 * 1000) return 'Silenciado';
  const date = new Date(at);
  const sameDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  const time = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  if (sameDay.format(date) === sameDay.format(new Date(now))) return `Silenciado hasta las ${time}`;
  const day = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'numeric' }).format(date);
  return `Silenciado hasta el ${day}`;
}

/** OR-B4-037 — what a message carries besides its text: a product card, or a photo or file. */
export type Attachment =
  | { tipo: 'producto'; id: string; productoId: string; nombre: string; precio: string; precioFinal?: string }
  | { tipo: 'imagen' | 'archivo'; id: string; nombre: string; mimeType: string; tamano: number }
  | { tipo: 'audio' | 'video'; id: string; nombre: string; mimeType: string; tamano: number; duracion: number | null }
  | LinkPreview
  | OrderCardData;

/** E5 — a link's preview (title, description, site; `imagen` says it has a photo). */
export type LinkPreview = {
  tipo: 'enlace';
  id: string;
  url: string;
  titulo: string;
  descripcion: string | null;
  sitio: string;
  imagen: boolean;
};

/** E5 — what the chat shows of a message besides its text: photos, videos, voice, files, links. */
export type ChatMedia =
  | { tipo: 'imagen' | 'archivo'; id: string; nombre: string; tamano?: number }
  | { tipo: 'audio' | 'video'; id: string; nombre: string; tamano?: number; duracion: number | null }
  | LinkPreview;

const MEDIA_TYPES = new Set(['imagen', 'archivo', 'audio', 'video', 'enlace']);

/**
 * E5 — the media of a message, in the order the chat shows them (the link preview last). Works
 * for the panel's attachments and for the store's looser shape.
 */
export function mediaOf(m: { adjuntos?: ReadonlyArray<{ tipo: string; id: string }> }): ChatMedia[] {
  const items = (m.adjuntos ?? []).filter((a) => MEDIA_TYPES.has(a.tipo)) as unknown as ChatMedia[];
  return [...items.filter((a) => a.tipo !== 'enlace'), ...items.filter((a) => a.tipo === 'enlace')];
}

/** E5 — whether a message's text only repeats its file's name (then it is not shown as text). */
export const isFileName = (content: string | null, media: ChatMedia[]) =>
  media.some((a) => a.tipo !== 'enlace' && a.nombre === content);

export type ProductCard = Extract<Attachment, { tipo: 'producto' }>;

/** The product cards of a message. */
export const productCards = (m: { adjuntos?: Attachment[] }) =>
  (m.adjuntos ?? []).filter((a): a is ProductCard => a.tipo === 'producto');

/** OR-B4-037 — the photos and files of a message (not product cards). */
export const fileAttachments = (m: { adjuntos?: Attachment[] }) =>
  (m.adjuntos ?? []).filter(
    (a): a is Extract<Attachment, { tipo: 'imagen' | 'archivo' }> => a.tipo === 'imagen' || a.tipo === 'archivo',
  );

/** "1,2 MB" / "350 KB". */
export function fileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toLocaleString('es-AR', { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Same limits as the API and the server (OR-B4-037): photos, PDF and (E5) videos up to 10 MB. */
export const CHAT_FILE_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
export const CHAT_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const CHAT_VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm,video/3gpp';
// The API takes videos up to 64 MB, but the server's front door (nginx) lets 10 MB through
// (Owner, 2026-11-26): the screen says the real limit before uploading.
export const CHAT_VIDEO_MAX_BYTES = 10 * 1024 * 1024;
/** What the upload route reads at most (the largest kind, a video). */
export const CHAT_UPLOAD_MAX_BYTES = CHAT_VIDEO_MAX_BYTES;
export const CHAT_PHOTO_OR_VIDEO_ACCEPT = `image/jpeg,image/png,image/webp,${CHAT_VIDEO_ACCEPT}`;

/** E5 — why a picked file cannot go, before uploading it (the API checks again). */
export function fileTooBig(file: { size: number; type: string }): string | null {
  if (file.type.startsWith('video/')) return file.size > CHAT_VIDEO_MAX_BYTES ? 'El video puede pesar hasta 10 MB.' : null;
  return file.size > CHAT_FILE_MAX_BYTES ? 'El archivo puede pesar hasta 10 MB.' : null;
}

/** E5 — «0:07», «1:25», «12:03»: a voice note's length or how far it went. */
export function voiceTime(seconds: number | null | undefined): string {
  const total = typeof seconds === 'number' && Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** E5 — a message's text cut into plain parts and web links (to make them clickable). */
export function splitLinks(text: string): Array<{ text: string; link: boolean }> {
  const parts: Array<{ text: string; link: boolean }> = [];
  const pattern = /\bhttps?:\/\/[^\s<>"']+/gi;
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    let link = match[0];
    while (/[.,;:!?)\]}]$/.test(link)) link = link.slice(0, -1);
    if (match.index > last) parts.push({ text: text.slice(last, match.index), link: false });
    parts.push({ text: link, link: true });
    last = match.index + link.length;
    pattern.lastIndex = last;
  }
  if (last < text.length) parts.push({ text: text.slice(last), link: false });
  return parts;
}

/** E5 — the emoji picker's groups (the common ones of a sales chat, not the whole list). */
export const EMOJI_GROUPS: ReadonlyArray<{ nombre: string; icono: string; emojis: readonly string[] }> = [
  {
    nombre: 'Caritas',
    icono: '😀',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '🤗', '🤭', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😬', '😴', '😷', '🤒', '🥵', '🥶', '😵', '🤯', '🥳', '😎', '🤓', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😢', '😭', '😱', '😤', '😡', '🤬', '😈'],
  },
  {
    nombre: 'Gestos',
    icono: '👍',
    emojis: ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🤝', '🙏', '👏', '🙌', '👐', '🤲', '👋', '🤙', '💪', '👉', '👈', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🫶', '✍️', '🙋', '🙆', '🙅', '🤷', '🤦'],
  },
  {
    nombre: 'Corazones',
    icono: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✨', '⭐', '🌟', '🔥', '💯', '✅', '❌', '⚠️', '❓', '❗'],
  },
  {
    nombre: 'Compras',
    icono: '🛍️',
    emojis: ['🛍️', '🛒', '🎁', '📦', '🚚', '🏪', '💳', '💵', '💰', '🧾', '🏷️', '📍', '🕐', '📅', '📞', '📱', '💬', '📸', '👕', '👖', '👗', '👟', '👜', '💄', '⌚', '🧴', '🧸', '📚'],
  },
  {
    nombre: 'Comida',
    icono: '🍕',
    emojis: ['☕', '🧉', '🍺', '🍷', '🥤', '🍕', '🍔', '🌭', '🥪', '🌮', '🍟', '🥗', '🍝', '🍣', '🥩', '🍗', '🥐', '🍞', '🧀', '🥚', '🍰', '🎂', '🍩', '🍪', '🍫', '🍦', '🍎', '🍌', '🍓', '🍉'],
  },
  {
    nombre: 'Fiesta',
    icono: '🎉',
    emojis: ['🎉', '🎊', '🥂', '🍾', '🎈', '🎶', '⚽', '🏆', '🇦🇷', '☀️', '🌙', '🌈', '☔', '❄️', '🌸', '🌻', '🍀', '🐶', '🐱', '🦋'],
  },
];

export type QuickReply = { titulo: string; texto: string };

/**
 * OR-B4-037 — a quick reply ready to send: `{cliente}` becomes the customer's first name
 * (or disappears cleanly when the conversation is not with a customer).
 */
export function fillQuickReply(texto: string, customerName?: string | null) {
  const first = customerName?.trim().split(/\s+/)[0] ?? '';
  return texto
    .replace(/\{cliente\}/gi, first)
    .replace(/ +([,.!?;:])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** The quick replies typed in Ajustes: `titulo-<n>` / `texto-<n>` pairs, empty rows skipped. */
export function quickRepliesFrom(form: FormData): { ok: true; items: QuickReply[] } | { ok: false; message: string } {
  const items: QuickReply[] = [];
  for (let n = 0; n < 60; n += 1) {
    const titulo = String(form.get(`titulo-${n}`) ?? '').trim();
    const texto = String(form.get(`texto-${n}`) ?? '').trim();
    if (!titulo && !texto) continue;
    if (!titulo || !texto) return { ok: false, message: 'Cada respuesta necesita un título y un texto.' };
    items.push({ titulo: titulo.slice(0, 60), texto: texto.slice(0, 1000) });
  }
  if (items.length > 50) return { ok: false, message: 'Puede haber hasta 50 respuestas rápidas.' };
  return { ok: true, items };
}

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
  /** E2 — ticks of one's own message: ✓ saved, ✓✓ reached the others, blue ✓✓ read. */
  estado?: MessageTick;
  /** OR-B4-053: posted by the system (an order or return moved), not typed by someone. */
  aviso?: boolean;
  /** E4: «Se eliminó este mensaje» (content and files are gone). */
  eliminado?: boolean;
  reenviado?: boolean;
  respuesta?: QuotedMessage & { autorUserId: string | null; autorCustomerId: string | null };
  reacciones?: Array<ReactionChip & { autores: Array<{ userId: string | null; customerId: string | null }> }>;
  /** E4: the viewer starred it. */
  destacado?: boolean;
  /** E6b: the greeting or the away message the store sent by itself. */
  automatico?: boolean;
}

/** E4 — the quoted message above a reply. */
export interface QuotedMessage {
  id: string;
  mia: boolean;
  tipo: 'texto' | 'imagen' | 'archivo' | 'producto' | 'pedido' | 'audio' | 'video';
  texto: string | null;
  eliminado?: boolean;
}

/** E4 — the reactions with one emoji. */
export interface ReactionChip {
  emoji: string;
  cantidad: number;
  mia: boolean;
}

/** E4 — the quick reactions of the menu (like WhatsApp). */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

/** E4 — like WhatsApp: editing lasts 15 minutes, deleting for everyone 2 days (the API checks too). */
export const EDIT_WINDOW_MS = 15 * 60 * 1000;
export const DELETE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
export const canStillEdit = (createdAt: string, now = Date.now()) => now - Date.parse(createdAt) < EDIT_WINDOW_MS;
export const canStillDelete = (createdAt: string, now = Date.now()) => now - Date.parse(createdAt) < DELETE_WINDOW_MS;

/** E4 — what the quote line says of the quoted message. */
export function quotedText(quote: Pick<QuotedMessage, 'tipo' | 'texto' | 'eliminado'>): string {
  if (quote.eliminado) return 'Se eliminó este mensaje';
  const kind = {
    imagen: '📷 Foto',
    archivo: '📄 Documento',
    producto: '🛍️ Producto',
    pedido: '🧾 Pedido',
    audio: '🎤 Nota de voz',
    video: '🎥 Video',
    texto: '',
  }[quote.tipo];
  const text = (quote.texto ?? '').trim();
  if (!kind) return text || 'Mensaje';
  // A product says which; a photo says its caption (not a file name); a document, just that.
  const caption = (quote.tipo === 'imagen' || quote.tipo === 'video') && !/\.(jpe?g|png|webp|mp4|mov|webm|3gp)$/i.test(text);
  if (text && (quote.tipo === 'producto' || caption)) return `${kind} · ${text}`;
  return kind;
}

/** E4 — the start of a message, for the menu and the «Respondiendo a» bar. */
export function shortText(text: string | null | undefined, max = 90): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export type MessageTick = 'enviado' | 'entregado' | 'leido';

/** E2 — how the ticks read aloud. */
export const TICK_LABELS: Record<MessageTick, string> = {
  enviado: 'Enviado',
  entregado: 'Entregado',
  leido: 'Leído',
};

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

/**
 * Paquete 2 A2 — the day label above each day's messages, like WhatsApp: «Hoy», «Ayer», the
 * weekday within the last week, and the date before that (with the year when it is another).
 */
export function dayLabel(iso: string, now = new Date()): string {
  const key = dayKey(iso);
  const today = dayKey(now.toISOString());
  if (key === today) return 'Hoy';
  if (key === dayKey(new Date(now.getTime() - 86_400_000).toISOString())) return 'Ayer';
  const daysAgo = Math.round((Date.parse(today) - Date.parse(key)) / 86_400_000);
  const date = new Date(iso);
  if (daysAgo > 1 && daysAgo < 7) {
    return new Intl.DateTimeFormat('es-AR', { timeZone: AR_TZ, weekday: 'long' }).format(date);
  }
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: AR_TZ,
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
}

/** Groups messages by Buenos Aires calendar day, each with its label (see dayLabel). */
export function groupByDay<T extends { createdAt: string }>(messages: T[], now = new Date()) {
  const groups: Array<{ key: string; label: string; items: T[] }> = [];
  for (const message of messages) {
    const key = dayKey(message.createdAt);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: dayLabel(message.createdAt, now), items: [] };
      groups.push(group);
    }
    group.items.push(message);
  }
  return groups;
}

/** Paquete 2 A3 — how a bubble sits in a run of messages from the same person. */
export interface BubbleRun {
  /** It follows a message of the same person: tight spacing and no name again. */
  cont: boolean;
  /** The last of the run: it carries the tail. */
  tail: boolean;
}

/**
 * Paquete 2 A3 — consecutive messages of the same author go together (WhatsApp): a run breaks
 * on another author, on a notice (null key) or after a pause of `gapMs`.
 */
export function bubbleRuns<T extends { createdAt: string }>(
  items: T[],
  authorKey: (item: T) => string | null,
  gapMs = 10 * 60_000,
): BubbleRun[] {
  const keys = items.map(authorKey);
  const joins = (a: number, b: number) =>
    keys[a] !== null &&
    keys[a] === keys[b] &&
    Date.parse(items[b].createdAt) - Date.parse(items[a].createdAt) <= gapMs;
  return items.map((_, i) => ({
    cont: i > 0 && joins(i - 1, i),
    tail: !(i < items.length - 1 && joins(i, i + 1)),
  }));
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

/* ------------------------------------------------------------ E6b: automatic messages */

/** A turn «HH:MM»–«HH:MM»; the week goes from Sunday ('0') to Saturday ('6'). */
export type Turn = [string, string];
export type WeekHours = Record<string, Turn[]>;
export type AutoReplies = {
  bienvenida: { activo: boolean; texto: string };
  ausencia: { activo: boolean; texto: string };
  horario: WeekHours;
};

/** Monday first, like a shop's door sign. */
export const WEEK_DAYS: ReadonlyArray<{ key: string; nombre: string }> = [
  { key: '1', nombre: 'Lunes' },
  { key: '2', nombre: 'Martes' },
  { key: '3', nombre: 'Miércoles' },
  { key: '4', nombre: 'Jueves' },
  { key: '5', nombre: 'Viernes' },
  { key: '6', nombre: 'Sábado' },
  { key: '0', nombre: 'Domingo' },
];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * E6b — the Ajustes form as the API takes it: `bienvenida-activo`, `bienvenida-texto`, the same
 * for `ausencia`, and per day `d<day>-<turn>-desde` / `-hasta` (empty: no turn).
 */
export function autoRepliesFrom(form: FormData): { ok: true; value: AutoReplies } | { ok: false; message: string } {
  const horario: WeekHours = {};
  for (const { key, nombre } of WEEK_DAYS) {
    const turns: Turn[] = [];
    for (const turn of [1, 2]) {
      const from = String(form.get(`d${key}-${turn}-desde`) ?? '').trim();
      const to = String(form.get(`d${key}-${turn}-hasta`) ?? '').trim();
      if (!from && !to) continue;
      if (!HHMM.test(from) || !HHMM.test(to)) {
        return { ok: false, message: `${nombre}: completá las dos horas del turno ${turn} (por ejemplo 09:00 y 13:00).` };
      }
      turns.push([from, to]);
    }
    horario[key] = turns;
  }
  return {
    ok: true,
    value: {
      bienvenida: { activo: form.get('bienvenida-activo') === 'on', texto: String(form.get('bienvenida-texto') ?? '').trim() },
      ausencia: { activo: form.get('ausencia-activo') === 'on', texto: String(form.get('ausencia-texto') ?? '').trim() },
      horario,
    },
  };
}

/** E6b — «Lun a vie 9 a 13 y 17 a 21»-like summary of one day: «09:00–13:00 y 17:00–21:00». */
export const turnsText = (turns: Turn[] | undefined) =>
  turns && turns.length > 0 ? turns.map(([a, b]) => `${a}–${b}`).join(' y ') : 'Cerrado';
