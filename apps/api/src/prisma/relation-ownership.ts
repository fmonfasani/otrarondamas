import { Prisma } from '@prisma/client';

/**
 * Relation isolation (B3 / T01-03): a persisted relation cannot link
 * resources from different companies.
 *
 * Prisma does not run the `query` hooks for nested operations separately,
 * but the top-level operation hook does receive the full payload. This
 * module walks that payload and extracts the references to related
 * resources whose ownership must be verified before persisting. The
 * verification against the database is done by company-scope.extension.ts.
 *
 * Declarative and opt-in registry: only the relations listed here are
 * validated. Adding a relation means adding an entry; it does not change
 * the behavior of the rest of the system.
 *
 * Key: model that owns the relation. Value: relation field names (the FK is
 * derived from the schema via DMMF).
 */
export const RELATIONS_WITH_OWNERSHIP: Readonly<Record<string, readonly string[]>> = {
  VentaItem: ['producto', 'reglaFidelizacion'],
  PedidoItem: ['producto', 'reglaFidelizacion'],
  CompraItem: ['producto'],
  DevolucionProveedorItem: ['producto', 'lote'],
  Producto: ['familia', 'subfamilia', 'tipo', 'subtipo'],
  ProductoProveedor: ['producto', 'proveedor'],
  Lote: ['producto'],
  MovimientoStock: ['producto'],
  ReglaFidelizacion: ['subtipo', 'familia', 'subfamilia'],
};

type Data = Record<string, unknown>;

export interface RelationalReference {
  model: string;
  where: Data;
}

const fieldsByModel = new Map<string, Map<string, Prisma.DMMF.Field>>();

function fieldsOf(model: string): Map<string, Prisma.DMMF.Field> {
  let fields = fieldsByModel.get(model);
  if (!fields) {
    const definition = Prisma.dmmf.datamodel.models.find((m) => m.name === model);
    fields = new Map((definition?.fields ?? []).map((f) => [f.name, f]));
    fieldsByModel.set(model, fields);
  }
  return fields;
}

function isObject(value: unknown): value is Data {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

function registeredRelations(model: string): Map<string, Prisma.DMMF.Field> {
  const result = new Map<string, Prisma.DMMF.Field>();
  for (const name of RELATIONS_WITH_OWNERSHIP[model] ?? []) {
    const field = fieldsOf(model).get(name);
    if (
      !field ||
      field.kind !== 'object' ||
      field.relationFromFields?.length !== 1 ||
      field.relationToFields?.length !== 1
    ) {
      throw new Error(
        `relation-ownership: '${model}.${name}' no es una relación con FK simple; no se puede verificar su ownership.`,
      );
    }
    result.set(name, field);
  }
  return result;
}

export function modelHasRelationsWithOwnership(model: string): boolean {
  return (RELATIONS_WITH_OWNERSHIP[model] ?? []).length > 0;
}

function fkValue(model: string, fk: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (isObject(value) && Object.keys(value).length === 1 && 'set' in value) {
    return fkValue(model, fk, value.set);
  }
  throw new Error(
    `relation-ownership: forma de valor no soportada para '${model}.${fk}'; no se puede verificar su ownership.`,
  );
}

function referenceFromFk(field: Prisma.DMMF.Field, value: string): RelationalReference {
  return { model: field.type, where: { [field.relationToFields![0]]: value } };
}

function referencesFromConnect(
  model: string,
  field: Prisma.DMMF.Field,
  operations: unknown,
  refs: RelationalReference[],
): void {
  if (!isObject(operations)) return;
  for (const [operation, payload] of Object.entries(operations)) {
    if (operation !== 'connect') {
      throw new Error(
        `relation-ownership: la operación anidada '${operation}' sobre '${model}.${field.name}' no tiene manejo de ownership definido. Solo se admite 'connect' o el FK escalar.`,
      );
    }
    for (const where of toList(payload)) {
      if (isObject(where)) refs.push({ model: field.type, where });
    }
  }
}

function updateData(child: string, item: unknown): unknown {
  if (isObject(item) && isObject(item.data) && !fieldsOf(child).has('data')) return item.data;
  return item;
}

function visitUnregisteredRelation(
  field: Prisma.DMMF.Field,
  operations: unknown,
  refs: RelationalReference[],
): void {
  if (!isObject(operations)) return;
  const child = field.type;
  for (const [operation, payload] of Object.entries(operations)) {
    switch (operation) {
      case 'create':
        toList(payload).forEach((d) => visitData(child, d, refs));
        break;
      case 'createMany':
        if (isObject(payload)) toList(payload.data).forEach((d) => visitData(child, d, refs));
        break;
      case 'connectOrCreate':
        toList(payload).forEach((i) => isObject(i) && visitData(child, i.create, refs));
        break;
      case 'update':
        toList(payload).forEach((i) => visitData(child, updateData(child, i), refs));
        break;
      case 'updateMany':
        toList(payload).forEach((i) => isObject(i) && visitData(child, i.data, refs));
        break;
      case 'upsert':
        toList(payload).forEach((i) => {
          if (!isObject(i)) return;
          visitData(child, i.create, refs);
          visitData(child, i.update, refs);
        });
        break;
      default:
        break;
    }
  }
}

function visitData(model: string, data: unknown, refs: RelationalReference[]): void {
  if (!isObject(data)) return;
  const fields = fieldsOf(model);
  const registered = registeredRelations(model);
  const relationByFk = new Map<string, Prisma.DMMF.Field>();
  for (const field of registered.values()) {
    relationByFk.set(field.relationFromFields![0], field);
  }

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const field = fields.get(key);
    if (!field) continue;

    const fkRelation = relationByFk.get(key);
    if (fkRelation) {
      const id = fkValue(model, key, value);
      if (id !== null) refs.push(referenceFromFk(fkRelation, id));
      continue;
    }

    if (field.kind !== 'object') continue;

    const isRegistered = registered.get(key);
    if (isRegistered) {
      referencesFromConnect(model, isRegistered, value, refs);
    } else {
      visitUnregisteredRelation(field, value, refs);
    }
  }
}

/**
 * Returns the references to related resources that the operation (including
 * its nested writes) intends to link and that are registered in
 * RELATIONS_WITH_OWNERSHIP. Throws if a registered relation is used in a
 * way whose ownership cannot be verified.
 */
export function collectRelationalReferences(
  model: string,
  operation: string,
  args: unknown,
): RelationalReference[] {
  if (!isObject(args)) return [];
  const refs: RelationalReference[] = [];

  switch (operation) {
    case 'create':
    case 'update':
    case 'updateMany':
      visitData(model, args.data, refs);
      break;
    case 'createMany':
    case 'createManyAndReturn':
      toList(args.data).forEach((d) => visitData(model, d, refs));
      break;
    case 'upsert':
      visitData(model, args.create, refs);
      visitData(model, args.update, refs);
      break;
    default:
      break;
  }

  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.model}:${JSON.stringify(ref.where)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
