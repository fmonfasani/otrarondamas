import { LINK_PREVIEW_MIME } from './link-preview';

/**
 * Public wire representation of a Message.
 *
 * Single source of truth for how a message is serialized, so HTTP (React) and
 * Socket.IO consume exactly the same shape. Before this module the controller
 * spread the Prisma entity and patched `sequence` ad hoc at each call site,
 * which had two consequences:
 *
 *   1. Any field added to the Prisma model leaked to the API automatically,
 *      including `deletedByUserId` and, until D6 dropped them, the separate
 *      author tenancy columns.
 *   2. A path that forgot the patch returned a raw `BigInt`, which
 *      `JSON.stringify` cannot serialize ("Do not know how to serialize a
 *      BigInt"). That is the reported defect of a message that is persisted
 *      and then surfaces as an error: the row is committed, the transaction
 *      succeeded, and the failure happens afterwards while writing the
 *      response.
 *
 * `sequence` is exposed as a decimal string, never as a number: it is a
 * PostgreSQL BIGINT and values beyond `Number.MAX_SAFE_INTEGER` would lose
 * precision silently in JavaScript. A string is lossless and still sorts
 * correctly on the client when compared as BigInt.
 */

/** Minimum shape the serializer needs. Keeps it usable from the service, the
 *  controller and the gateway without importing Prisma types. */
export interface SerializableMessage {
  id: string;
  conversationId: string;
  clientMessageId: string;
  sequence: bigint | number | string;
  type: string;
  content: string | null;
  authorUserId: string | null;
  authorCustomerId: string | null;
  replyToMessageId: string | null;
  createdAt: Date | string;
  editedAt?: Date | string | null;
  deletedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  readAt?: Date | string | null;
  reactions?: unknown[];
  /** E2 — ticks of the viewer's own message, when the service computed them. */
  estado?: 'enviado' | 'entregado' | 'leido';
  /** Loaded with the message when the caller included it (`Attachment`). */
  Attachment?: SerializableAttachment[];
  /** E4 — sent with «Reenviar». */
  forwarded?: boolean;
  /** E4 — computed by the service for the viewer. */
  respuesta?: ReplyPreview;
  reacciones?: ReactionGroup[];
  destacado?: boolean;
}

/** E4 — the quoted message, as the line above a reply shows it. */
export interface ReplyPreview {
  id: string;
  autorUserId: string | null;
  autorCustomerId: string | null;
  /** Written by whoever is looking. */
  mia: boolean;
  tipo: 'texto' | 'imagen' | 'archivo' | 'producto' | 'pedido' | 'audio' | 'video';
  /** At most 160 characters; null when it was deleted. */
  texto: string | null;
  eliminado?: true;
}

/** E4 — the reactions with one emoji: how many, whether the viewer's is one, and whose. */
export interface ReactionGroup {
  emoji: string;
  cantidad: number;
  mia: boolean;
  autores: Array<{ userId: string | null; customerId: string | null }>;
}

export interface SerializableAttachment {
  id: string;
  mimeType: string;
  filename: string;
  sizeBytes: bigint | number;
  metadata: unknown;
  deletedAt?: Date | string | null;
  /** E5: a voice note's length in seconds. */
  durationSec?: number | null;
}

/** A product shared in the chat (OR-B4-037): an Attachment with this media type. */
export const PRODUCT_CARD_MIME = 'application/vnd.wapsell.product+json';

/** OR-B4-053 — the order card in the customer's chat: one per order, it follows its state. */
export const ORDER_CARD_MIME = 'application/vnd.wapsell.order+json';

/** E5 — the preview of a link (title, description, photo), kept as an Attachment of the text. */
export { LINK_PREVIEW_MIME };

/** The order as its card shows it; the service fills it live from the order when it reads. */
export type OrderCardWire = {
  tipo: 'pedido';
  id: string;
  pedidoId: string;
  numero: number | null;
  estado: string | null;
  total: string | null;
  items: Array<{ producto: string; cantidad: number }>;
};

export type AttachmentWire =
  | {
      tipo: 'producto';
      id: string;
      productoId: string;
      nombre: string;
      precio: string;
      /** OR-B4-053: what the customer pays today, when it is less than the list price. */
      precioFinal?: string;
    }
  | { tipo: 'imagen' | 'archivo'; id: string; nombre: string; mimeType: string; tamano: number }
  /** E5: a voice note (`duracion` in seconds) or a video, played in the chat. */
  | {
      tipo: 'audio' | 'video';
      id: string;
      nombre: string;
      mimeType: string;
      tamano: number;
      duracion: number | null;
    }
  | LinkPreviewWire
  | OrderCardWire;

/** E5 — a link's preview; `imagen` says the photo can be fetched like any chat file. */
export type LinkPreviewWire = {
  tipo: 'enlace';
  id: string;
  url: string;
  titulo: string;
  descripcion: string | null;
  sitio: string;
  imagen: boolean;
};

/**
 * OR-B4-053 — a notice the system posted for the Business (order and return updates), not
 * something a person typed: the chat shows it as a short centred line, without ticks.
 * Paquete 1 S3: told by its own message type, which no person can send.
 */
export function isNotice(message: { type: string }) {
  return message.type === 'SYSTEM';
}

/** The wire shape. Explicit allowlist: a new Prisma column does not reach the
 *  API until it is added here deliberately. */
export interface MessageWire {
  id: string;
  conversationId: string;
  clientMessageId: string;
  sequence: string;
  type: string;
  content: string | null;
  authorUserId: string | null;
  authorCustomerId: string | null;
  replyToMessageId: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  reactions?: unknown[];
  adjuntos?: AttachmentWire[];
  estado?: 'enviado' | 'entregado' | 'leido';
  /** OR-B4-053: posted by the system (see isNotice). */
  aviso?: boolean;
  /** E4: «Se eliminó este mensaje» (content and attachments are gone). */
  eliminado?: true;
  reenviado?: true;
  respuesta?: ReplyPreview;
  reacciones?: ReactionGroup[];
  destacado?: true;
}

function toAttachmentWire(a: SerializableAttachment): AttachmentWire {
  if (a.mimeType === PRODUCT_CARD_MIME) {
    const meta = (a.metadata ?? {}) as {
      productoId?: string;
      nombre?: string;
      precio?: string;
      precioFinal?: string;
    };
    return {
      tipo: 'producto',
      id: a.id,
      productoId: String(meta.productoId ?? ''),
      nombre: String(meta.nombre ?? a.filename),
      precio: String(meta.precio ?? '0'),
      ...(meta.precioFinal && meta.precioFinal !== meta.precio
        ? { precioFinal: String(meta.precioFinal) }
        : {}),
    };
  }
  if (a.mimeType === ORDER_CARD_MIME) {
    const meta = (a.metadata ?? {}) as Partial<Omit<OrderCardWire, 'tipo' | 'id'>>;
    return {
      tipo: 'pedido',
      id: a.id,
      pedidoId: String(meta.pedidoId ?? ''),
      numero: typeof meta.numero === 'number' ? meta.numero : null,
      estado: meta.estado ?? null,
      total: meta.total ?? null,
      items: Array.isArray(meta.items) ? meta.items : [],
    };
  }
  if (a.mimeType === LINK_PREVIEW_MIME) {
    const meta = (a.metadata ?? {}) as Partial<Omit<LinkPreviewWire, 'tipo' | 'id' | 'imagen'>> & {
      imagenMime?: string;
    };
    return {
      tipo: 'enlace',
      id: a.id,
      url: String(meta.url ?? ''),
      titulo: String(meta.titulo ?? a.filename),
      descripcion: meta.descripcion ?? null,
      sitio: String(meta.sitio ?? ''),
      imagen: Boolean(meta.imagenMime),
    };
  }
  if (a.mimeType.startsWith('audio/') || a.mimeType.startsWith('video/')) {
    return {
      tipo: a.mimeType.startsWith('audio/') ? 'audio' : 'video',
      id: a.id,
      nombre: a.filename,
      mimeType: a.mimeType,
      tamano: Number(a.sizeBytes),
      duracion: a.durationSec ?? null,
    };
  }
  return {
    tipo: a.mimeType.startsWith('image/') ? 'imagen' : 'archivo',
    id: a.id,
    nombre: a.filename,
    mimeType: a.mimeType,
    tamano: Number(a.sizeBytes),
  };
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Converts a persisted message into its public representation.
 *
 * Deliberately total: every branch returns a JSON-safe value, so a caller can
 * never emit a `BigInt` or a `Date` by forgetting a step. `reactions` is only
 * included when the caller loaded it, to avoid implying an empty relation.
 */
export function toMessageWire(message: SerializableMessage): MessageWire {
  const wire: MessageWire = {
    id: message.id,
    conversationId: message.conversationId,
    clientMessageId: message.clientMessageId,
    sequence: String(message.sequence),
    type: message.type,
    content: message.content,
    authorUserId: message.authorUserId,
    authorCustomerId: message.authorCustomerId,
    replyToMessageId: message.replyToMessageId,
    createdAt: toIso(message.createdAt) as string,
    editedAt: toIso(message.editedAt),
    deletedAt: toIso(message.deletedAt),
    deliveredAt: toIso(message.deliveredAt),
    readAt: toIso(message.readAt),
  };

  if (message.reactions !== undefined) {
    wire.reactions = message.reactions;
  }
  if (message.estado !== undefined) {
    wire.estado = message.estado;
  }
  if (isNotice(message)) {
    wire.aviso = true;
  }
  if (message.Attachment !== undefined) {
    wire.adjuntos = message.Attachment.filter((a) => !a.deletedAt).map(toAttachmentWire);
  }
  if (message.deletedAt) {
    // E4: never what a deleted message said or showed, whatever the caller loaded.
    wire.eliminado = true;
    wire.content = null;
    if (wire.adjuntos) wire.adjuntos = [];
  }
  if (message.forwarded) wire.reenviado = true;
  if (message.respuesta) wire.respuesta = message.respuesta;
  if (message.reacciones !== undefined) wire.reacciones = message.reacciones;
  if (message.destacado) wire.destacado = true;

  return wire;
}

export function toMessageWireList(messages: SerializableMessage[]): MessageWire[] {
  return messages.map(toMessageWire);
}
