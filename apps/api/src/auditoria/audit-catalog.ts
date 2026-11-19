import type { Prisma } from '@prisma/client';

/**
 * Business audit (OR-B4-041): one catalog of what is recorded, with the name people read
 * and the topic used to filter. Older entries keep their original action names (CREATE,
 * VENTA_CREADA, …); they are named here too, so the trail reads the same for old and new.
 */
export const TOPICS = {
  ventas: 'Ventas',
  pedidos: 'Pedidos',
  devoluciones: 'Devoluciones y reembolsos',
  precios: 'Productos y precios',
  stock: 'Stock',
  caja: 'Caja',
  equipo: 'Equipo',
  negocio: 'Ajustes del negocio',
  accesos: 'Accesos',
  plataforma: 'Wapsell',
  otros: 'Otros',
} as const;

export type Topic = keyof typeof TOPICS;

/** New actions written from OR-B4-041 on. */
export type AuditAction =
  | 'PRODUCTO_CREADO'
  | 'PRODUCTO_PRECIO_CAMBIADO'
  | 'PRODUCTO_EDITADO'
  | 'PRODUCTO_ACTIVADO'
  | 'PRODUCTO_DESACTIVADO'
  | 'PRODUCTO_PUBLICADO'
  | 'PRODUCTO_DESPUBLICADO'
  | 'STOCK_AJUSTE'
  | 'STOCK_CARGA_INICIAL'
  | 'STOCK_CONTEO'
  | 'CAJA_ABIERTA'
  | 'CAJA_MOVIMIENTO'
  | 'CAJA_ARQUEO'
  | 'CAJA_ARQUEO_AUTORIZADO'
  | 'CAJA_CERRADA'
  | 'EQUIPO_INVITACION'
  | 'EQUIPO_ALTA'
  | 'EQUIPO_SUSPENDIDO'
  | 'EQUIPO_REACTIVADO'
  | 'LEGAJO_APROBADO'
  | 'AUDITORIA_EXPORTADA'
  | 'MFA_ACTIVADO'
  | 'MFA_DESACTIVADO'
  | 'MFA_RESETEADO'
  | 'MFA_CODIGO_RECUPERACION'
  | 'MFA_CODIGOS_NUEVOS'
  | 'MFA_BLOQUEADO'
  | 'NEGOCIO_REGISTRADO';

const ACTIONS: Record<string, { tema: Topic; nombre: string }> = {
  PRODUCTO_CREADO: { tema: 'precios', nombre: 'Creó un producto' },
  PRODUCTO_PRECIO_CAMBIADO: { tema: 'precios', nombre: 'Cambió un precio' },
  PRODUCTO_EDITADO: { tema: 'precios', nombre: 'Editó un producto' },
  PRODUCTO_ACTIVADO: { tema: 'precios', nombre: 'Activó un producto' },
  PRODUCTO_DESACTIVADO: { tema: 'precios', nombre: 'Desactivó un producto' },
  PRODUCTO_PUBLICADO: { tema: 'precios', nombre: 'Publicó un producto en la tienda' },
  PRODUCTO_DESPUBLICADO: { tema: 'precios', nombre: 'Sacó un producto de la tienda' },
  STOCK_AJUSTE: { tema: 'stock', nombre: 'Ajustó el stock' },
  STOCK_CARGA_INICIAL: { tema: 'stock', nombre: 'Cargó el stock inicial' },
  STOCK_CONTEO: { tema: 'stock', nombre: 'Registró un conteo físico' },
  CAJA_ABIERTA: { tema: 'caja', nombre: 'Abrió la caja' },
  CAJA_MOVIMIENTO: { tema: 'caja', nombre: 'Registró un movimiento de caja' },
  CAJA_ARQUEO: { tema: 'caja', nombre: 'Hizo un arqueo' },
  CAJA_ARQUEO_AUTORIZADO: { tema: 'caja', nombre: 'Autorizó una diferencia de caja' },
  CAJA_CERRADA: { tema: 'caja', nombre: 'Cerró la caja' },
  EQUIPO_INVITACION: { tema: 'equipo', nombre: 'Invitó a alguien al equipo' },
  EQUIPO_ALTA: { tema: 'equipo', nombre: 'Se sumó al equipo' },
  EQUIPO_SUSPENDIDO: { tema: 'equipo', nombre: 'Suspendió a alguien del equipo' },
  EQUIPO_REACTIVADO: { tema: 'equipo', nombre: 'Reactivó a alguien del equipo' },
  LEGAJO_APROBADO: { tema: 'equipo', nombre: 'Aprobó un legajo' },
  AUDITORIA_EXPORTADA: { tema: 'otros', nombre: 'Descargó la auditoría' },
  MFA_ACTIVADO: { tema: 'accesos', nombre: 'Activó la verificación en dos pasos' },
  MFA_DESACTIVADO: { tema: 'accesos', nombre: 'Desactivó la verificación en dos pasos' },
  MFA_RESETEADO: { tema: 'accesos', nombre: 'Reseteó la verificación en dos pasos de alguien' },
  MFA_CODIGO_RECUPERACION: { tema: 'accesos', nombre: 'Entró con un código de recuperación' },
  MFA_CODIGOS_NUEVOS: { tema: 'accesos', nombre: 'Generó códigos de recuperación nuevos' },
  NEGOCIO_REGISTRADO: { tema: 'negocio', nombre: 'Registró el negocio' },
  MFA_BLOQUEADO: { tema: 'accesos', nombre: 'Verificación bloqueada por intentos fallidos' },
  // Older names, still in the data.
  CREAR_VENTA: { tema: 'ventas', nombre: 'Registró una venta' },
  VENTA_CREADA: { tema: 'ventas', nombre: 'Registró una venta' },
  ACTUALIZAR_VENTA: { tema: 'ventas', nombre: 'Modificó una venta' },
  CANCELAR_ORDEN: { tema: 'pedidos', nombre: 'Canceló un pedido' },
  PEDIDO_CANCELADO: { tema: 'pedidos', nombre: 'Canceló un pedido' },
  PAGO: { tema: 'ventas', nombre: 'Registró un pago' },
  REEMBOLSO: { tema: 'devoluciones', nombre: 'Hizo un reembolso' },
  REEMBOLSO_ENQUEUED: { tema: 'devoluciones', nombre: 'Pidió un reembolso online' },
  REEMBOLSO_COMPLETADO: { tema: 'devoluciones', nombre: 'Reembolso online completado' },
  REEMBOLSO_FALLIDO: { tema: 'devoluciones', nombre: 'Reembolso online fallido' },
  REEMBOLSO_ERROR: { tema: 'devoluciones', nombre: 'Error en un reembolso online' },
  REEMBOLSO_RETRY_SCHEDULED: { tema: 'devoluciones', nombre: 'Reintento de reembolso' },
  AUTORIZAR: { tema: 'devoluciones', nombre: 'Autorizó una devolución' },
  RECIBIR: { tema: 'devoluciones', nombre: 'Recibió una devolución' },
  CAMBIO: { tema: 'devoluciones', nombre: 'Hizo un cambio' },
  CANCELAR: { tema: 'devoluciones', nombre: 'Canceló una devolución' },
  LOGIN: { tema: 'accesos', nombre: 'Inició sesión' },
  LOGOUT: { tema: 'accesos', nombre: 'Cerró sesión' },
  PLATFORM_VIEW: { tema: 'plataforma', nombre: 'Wapsell abrió el negocio' },
  PLATFORM_CREATE: { tema: 'plataforma', nombre: 'Wapsell creó el negocio' },
};

/** Generic CREATE/UPDATE are read by what they touched. */
const ENTITY_TOPIC: Record<string, Topic> = {
  Empresa: 'negocio',
  Usuario: 'equipo',
  Venta: 'ventas',
  Pedido: 'pedidos',
  Producto: 'precios',
  DevolucionCliente: 'devoluciones',
};

export function describeAction(accion: string, entidad: string): { tema: Topic; nombre: string } {
  const known = ACTIONS[accion];
  if (known) return known;
  const tema = ENTITY_TOPIC[entidad] ?? 'otros';
  if (accion === 'UPDATE' && entidad === 'Usuario') return { tema, nombre: 'Cambió sus datos' };
  if (accion === 'UPDATE' && entidad === 'Empresa')
    return { tema, nombre: 'Cambió los datos del negocio' };
  if (accion === 'UPDATE') return { tema, nombre: `Modificó ${entidad}` };
  if (accion === 'CREATE') return { tema, nombre: `Creó ${entidad}` };
  return { tema, nombre: accion };
}

/** Prisma condition for «entries of this topic», old and new names alike. */
export function topicWhere(tema: Topic): Prisma.AuditLogWhereInput {
  const actions = Object.entries(ACTIONS)
    .filter(([, a]) => a.tema === tema)
    .map(([name]) => name);
  const entities = Object.entries(ENTITY_TOPIC)
    .filter(([, t]) => t === tema)
    .map(([name]) => name);
  const or: Prisma.AuditLogWhereInput[] = [];
  if (actions.length) or.push({ accion: { in: actions } });
  if (entities.length)
    or.push({ accion: { in: ['CREATE', 'UPDATE'] }, entidadAfectada: { in: entities } });
  return or.length ? { OR: or } : { id: { in: [] } };
}

export const isTopic = (value: unknown): value is Topic =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(TOPICS, value);

/** Never shown, even to the Owner: secrets that could end up in before/after values. */
const SECRET_KEY = /pass(word)?|hash|token|secret|clave|accessToken|refreshToken|apiKey/i;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SECRET_KEY.test(k) ? '••••' : redact(v),
      ]),
    );
  }
  return value;
}

/** Field by field: what changed between before and after (both already redacted). */
export function changesOf(before: unknown, after: unknown) {
  const a = (before && typeof before === 'object' ? before : {}) as Record<string, unknown>;
  const b = (after && typeof after === 'object' ? after : {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return keys
    .filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
    .map((k) => ({ campo: k, antes: a[k] ?? null, despues: b[k] ?? null }));
}

type AuditWriter = {
  auditLog: { create: (args: { data: Prisma.AuditLogUncheckedCreateInput }) => Promise<unknown> };
};

type AuditBatchWriter = {
  auditLog: {
    createMany: (args: { data: Prisma.AuditLogCreateManyInput[] }) => Promise<unknown>;
  };
};

export type AuditEntry = {
  accion: AuditAction;
  entidad: string;
  entidadId?: string | null;
  antes?: unknown;
  despues?: unknown;
  motivo?: string | null;
};

const json = (v: unknown) =>
  v === undefined || v === null
    ? undefined
    : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);

const rowOf = (companyId: string, usuarioId: string | null, entry: AuditEntry) => ({
  empresaId: companyId,
  usuarioId,
  accion: entry.accion,
  entidadAfectada: entry.entidad,
  entidadId: entry.entidadId ?? null,
  valoresAnteriores: json(entry.antes),
  valoresPosteriores: json(entry.despues),
  motivo: entry.motivo ?? null,
});

/** Writes one entry, inside the caller's transaction when it has one. */
export function recordAudit(
  db: AuditWriter,
  companyId: string,
  usuarioId: string | null,
  entry: AuditEntry,
) {
  return db.auditLog.create({ data: rowOf(companyId, usuarioId, entry) });
}

/** Many entries in one statement (a change applied to many records at once). */
export function recordAuditMany(
  db: AuditBatchWriter,
  companyId: string,
  usuarioId: string | null,
  entries: AuditEntry[],
) {
  return db.auditLog.createMany({
    data: entries.map((entry) => rowOf(companyId, usuarioId, entry)),
  });
}
