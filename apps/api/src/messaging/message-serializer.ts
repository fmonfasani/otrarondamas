/**
 * Public wire representation of a Message.
 *
 * Single source of truth for how a message is serialized, so HTTP (React) and
 * Socket.IO consume exactly the same shape. Before this module the controller
 * spread the Prisma entity and patched `sequence` ad hoc at each call site,
 * which had two consequences:
 *
 *   1. Any field added to the Prisma model leaked to the API automatically,
 *      including `deletedByUserId` and the `authorMembershipBusinessId` /
 *      `authorCustomerBusinessId` tenancy columns.
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

  return wire;
}

export function toMessageWireList(messages: SerializableMessage[]): MessageWire[] {
  return messages.map(toMessageWire);
}
