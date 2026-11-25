import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Prisma } from '@prisma/client';

/**
 * ADR-DAT-020 (INIT-019 PR 4) — every reference between two tables of one business carries the
 * business: (empresaId, clienteId) → Cliente (empresaId, id). The database then rejects a row
 * that points to another business, whichever role writes it.
 *
 * - On delete it restricts (D3): a record with history is deactivated, never deleted. Only the
 *   header → lines references listed in CASCADE delete their lines.
 * - On update it restricts (D5): no record changes business.
 * - composite-references-pending.json lists what PR 4 has not converted yet, module by module.
 *   It only shrinks: a new reference is composite from the start.
 */
const SCHEMA = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
const PENDING: { childrenWithoutBusiness: string[]; references: string[] } = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'prisma', 'composite-references-pending.json'), 'utf8'),
);

/** Header → lines references whose lines go with their header when it is deleted. */
const CASCADE = new Set([
  'CapabilityGrant.RoleGrant',
  'CartItem.Cart',
  // E2: a participant's read position is part of the participant (participants are only
  // soft-deleted in production; the cascade keeps test cleanups simple).
  'ConversationReadState.ConversationParticipant',
  'DevolucionClienteItem.DevolucionCliente',
  'PaymentIntent.payment',
  'Reembolso.DevolucionCliente',
  'RoleGrant.Membership',
]);

/**
 * References that stay single-column on purpose, with the decision that keeps them.
 * D8 (Owner, 2026-11-24): a business's audit log records when Wapsell's platform staff open it
 * (PLATFORM_VIEW), so its actor may be a user of the platform business.
 */
const EXCEPTIONS = new Map([
  ['AuditLog.Usuario', 'D8: platform staff appear in a business audit log'],
]);

type Model = Prisma.DMMF.Model;
type Field = Prisma.DMMF.Field;

const models = Prisma.dmmf.datamodel.models;

function tenantOf(model: Model): string | undefined {
  return model.fields.find(
    (f) =>
      (f.name === 'empresaId' || f.name === 'businessId') && f.kind === 'scalar' && f.isRequired,
  )?.name;
}

const business = new Map(
  models
    .filter((m) => tenantOf(m) || PENDING.childrenWithoutBusiness.includes(m.name))
    .map((m) => [m.name, m]),
);

function references(): Array<{ key: string; model: Model; field: Field; target: Model }> {
  return [...business.values()].flatMap((model) =>
    model.fields
      .filter((f) => f.kind === 'object' && (f.relationFromFields?.length ?? 0) > 0)
      .filter((f) => business.has(f.type))
      .map((field) => ({
        key: `${model.name}.${field.name}`,
        model,
        field,
        target: business.get(field.type) as Model,
      })),
  );
}

/** The two business columns sit at the same position of the foreign key. */
function sharesBusiness(model: Model, field: Field, target: Model): boolean {
  const own = tenantOf(model);
  const theirs = tenantOf(target);
  if (!own || !theirs) return false;
  const at = field.relationFromFields?.indexOf(own) ?? -1;
  return at >= 0 && field.relationToFields?.[at] === theirs;
}

function relationLine(model: Model, field: Field): string {
  const block = SCHEMA.match(new RegExp(`^model ${model.name} \\{\\n([\\s\\S]*?)^\\}`, 'm'))?.[1];
  const line = block?.split('\n').find((l) => new RegExp(`^\\s+${field.name}\\s`).test(l));
  if (!line) throw new Error(`${model.name}.${field.name} not found in schema.prisma`);
  return line;
}

/** What keeps a reference from complying with ADR-DAT-020; empty when it complies. */
function problemsOf({
  key,
  model,
  field,
  target,
}: ReturnType<typeof references>[number]): string[] {
  const problems: string[] = [];
  if (!sharesBusiness(model, field, target)) problems.push(`${key}: does not carry the business`);
  const onDelete = field.relationOnDelete ?? 'default';
  const expected = CASCADE.has(key) ? 'Cascade' : 'Restrict';
  if (onDelete !== expected) problems.push(`${key}: onDelete ${onDelete}, expected ${expected}`);
  if (!/onUpdate:\s*Restrict/.test(relationLine(model, field))) {
    problems.push(`${key}: onUpdate must be Restrict`);
  }
  return problems;
}

describe('composite references between business tables (ADR-DAT-020)', () => {
  const pending = new Set(PENDING.references);
  const all = references();

  it('finds the references it checks', () => {
    expect(all.length).toBeGreaterThan(100);
  });

  it('every reference outside the pending list carries the business, with restricted delete and update', () => {
    expect(
      all.filter(({ key }) => !pending.has(key) && !EXCEPTIONS.has(key)).flatMap(problemsOf),
    ).toEqual([]);
  });

  it('each exception exists and still does not carry the business', () => {
    const byKey = new Map(all.map((r) => [r.key, r]));
    const stale = [...EXCEPTIONS.keys()].filter((key) => {
      const ref = byKey.get(key);
      return !ref || sharesBusiness(ref.model, ref.field, ref.target);
    });
    expect(stale).toEqual([]);
  });

  it('the pending list only shrinks: each entry exists and is still pending', () => {
    const byKey = new Map(all.map((r) => [r.key, r]));
    const stale = PENDING.references.filter((key) => {
      const ref = byKey.get(key);
      return !ref || problemsOf(ref).length === 0;
    });
    expect(stale).toEqual([]);
    expect(PENDING.references).toEqual([...PENDING.references].sort((a, b) => a.localeCompare(b)));
  });

  it('the child tables still waiting for their business column exist and lack it', () => {
    const done = PENDING.childrenWithoutBusiness.filter((name) => {
      const model = models.find((m) => m.name === name);
      return !model || tenantOf(model);
    });
    expect(done).toEqual([]);
  });
});
