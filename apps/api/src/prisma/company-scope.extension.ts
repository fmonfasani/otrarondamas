import { Prisma } from '@prisma/client';
import { collectRelationalReferences, type RelationalReference } from './relation-ownership';

/**
 * Multi-company isolation (INV-01, section 5 of the SDD) implemented as a
 * Prisma Client Extension — not as a middleware that "trusts" each service
 * to filter by empresaId by hand. The SDD explicitly requires the isolation
 * to be protected "from the server logic and the database, not only from
 * the interface".
 *
 * Chosen mechanism (also documented in docs/scaffolding-notas.md): Prisma
 * Client Extension instead of PostgreSQL Row-Level Security. Reason: RLS
 * would require running `SET app.current_empresa_id` on every connection
 * of the pool before each query, which with Prisma's internal pool (which
 * reuses connections between requests) is fragile to guarantee without
 * manually controlling connection assignment. The Client Extension achieves
 * the same result — it is impossible to run a query on a model with
 * empresaId without that filter — without depending on the session state of
 * the physical connection.
 *
 * Covers the models that have the `empresaId` column directly (see the
 * MODELS_WITH_COMPANY_ID list below). Models that inherit the scope through
 * a relation (VentaItem -> Venta, AplicacionPago -> Pago,
 * AperturaCaja/MovimientoCaja/ArqueoCaja/CierreCaja -> Caja, CompraItem ->
 * Compra) are NOT covered by this extension yet — the isolation of those
 * models depends on the code that queries them always going through their
 * parent with empresaId already filtered. This is a real limitation, not a
 * decorative TODO: it remains to decide whether to cover it with a separate
 * extension that does an implicit join, or whether it is enough to always
 * query them nested from their parent.
 *
 * Bounded exception (relation isolation, B3): the relations listed in
 * RELATIONS_WITH_OWNERSHIP (today only VentaItem -> Producto) are verified
 * before persisting, both in nested and direct writes. See
 * relation-ownership.ts. The rest of the relations stay as described above.
 */
const MODELS_WITH_COMPANY_ID = [
  'Usuario',
  // Categoria was removed (replaced by the Family → Subfamily → Type →
  // Subtype hierarchy, see the catalog definition session) — the 5 new
  // models with a direct empresaId are added below, same criterion as any
  // other model with empresaId.
  'Producto',
  'Familia',
  'Subfamilia',
  'Tipo',
  'Subtipo',
  'ProductoProveedor',
  'Presentacion',
  'Lote',
  'Cliente',
  'CuentaCorriente',
  'Deuda',
  'Venta',
  'Pedido',
  'Pago',
  'Caja',
  'Proveedor',
  'Compra',
  'RecepcionCompra',
  'MovimientoStock',
  'Entrega',
  'Notificacion',
  'AuditLog',
  'Autorizacion',
  'PagoProveedor',
  'DevolucionProveedor',
  'ReglaFidelizacion',
  // RF-17 (docs/spec-login-roles.md): Invitacion has a direct empresaId.
  // Legajo/DocumentoLegajo do NOT enter here — they inherit the scope via
  // Usuario/Cliente (same pattern already documented above for
  // VentaItem/AperturaCaja/etc.: the code that queries them always goes
  // through its parent with empresaId already filtered).
  'Invitacion',
] as const;

type ModelWithCompanyId = (typeof MODELS_WITH_COMPANY_ID)[number];

function isModelWithCompanyId(model: string | undefined): model is ModelWithCompanyId {
  return !!model && (MODELS_WITH_COMPANY_ID as readonly string[]).includes(model);
}

// Operations whose top-level `where` admits adding empresaId directly
// without breaking the Prisma types contract. findUnique* does NOT enter
// here: its `where` only accepts individual unique fields or an explicit
// compound unique, and none of the models in this schema defines
// `@@unique([id, empresaId])` — adding empresaId there would break the query
// instead of filtering it. See the separate handling below.
const OPERATIONS_WITH_WHERE = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
]);

const OPERATIONS_FIND_UNIQUE = new Set(['findUnique', 'findUniqueOrThrow']);

type DelegateWithCompanyId = {
  findUnique(args: {
    where: Record<string, unknown>;
    select: { empresaId: true };
  }): Promise<{ empresaId: string } | null>;
};

// Verifies that each related resource belongs to the effective company
// BEFORE persisting. A resource from another company is treated exactly
// like a non-existent one (P2025) so its existence is not revealed. The
// queries use the base client on another connection: they do not see rows
// not yet confirmed by the current transaction, in which case they fail
// closed.
async function verifyRelationalOwnership(
  client: unknown,
  companyId: string,
  references: RelationalReference[],
): Promise<void> {
  for (const { model, where } of references) {
    if (!isModelWithCompanyId(model)) {
      throw new Error(
        `companyScopeExtension: la relación hacia '${model}' no tiene ownership directo por empresa verificable.`,
      );
    }
    const delegate = (client as Record<string, DelegateWithCompanyId>)[
      model.charAt(0).toLowerCase() + model.slice(1)
    ];
    const found = await delegate.findUnique({ where, select: { empresaId: true } });
    if (!found || found.empresaId !== companyId) {
      throw new Prisma.PrismaClientKnownRequestError(`No ${model} found`, {
        code: 'P2025',
        clientVersion: Prisma.prismaVersion.client,
      });
    }
  }
}

/**
 * Creates a Prisma extension bound to a concrete company. It is instantiated
 * per request (see CompanyScopedPrismaService), never as a global singleton,
 * because the empresaId depends on the authenticated user of each request.
 */
export function companyScopeExtension(companyId: string) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'company-scope',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const references = collectRelationalReferences(model, operation, args);
            if (references.length > 0) {
              await verifyRelationalOwnership(client, companyId, references);
            }

            if (!isModelWithCompanyId(model)) {
              return query(args);
            }

            const a = args as {
              where?: Record<string, unknown>;
              data?: Record<string, unknown> | Array<Record<string, unknown>>;
            };

            if (operation === 'create') {
              // Do not trust an empresaId coming from the request body: it is
              // always forced to the authenticated session's one.
              a.data = { ...(a.data as Record<string, unknown>), empresaId: companyId };
              return query(a);
            }

            if (operation === 'createMany') {
              const rows = Array.isArray(a.data) ? a.data : a.data ? [a.data] : [];
              a.data = rows.map((row) => ({ ...row, empresaId: companyId }));
              return query(a);
            }

            if (OPERATIONS_WITH_WHERE.has(operation)) {
              a.where = { ...(a.where ?? {}), empresaId: companyId };
              return query(a);
            }

            if (OPERATIONS_FIND_UNIQUE.has(operation)) {
              // empresaId cannot be injected into the `where` of findUnique
              // without a compound unique backing it (see comment above), so
              // it is verified AFTER running the query: if the record exists
              // but belongs to another company, it is treated as "not found"
              // — the data of another company is never returned.
              const result = await query(a);
              if (
                result &&
                typeof result === 'object' &&
                'empresaId' in result &&
                (result as { empresaId: unknown }).empresaId !== companyId
              ) {
                if (operation === 'findUniqueOrThrow') {
                  throw new Prisma.PrismaClientKnownRequestError(`No ${model} found`, {
                    code: 'P2025',
                    clientVersion: Prisma.prismaVersion.client,
                  });
                }
                return null;
              }
              return result;
            }

            // upsert and any operation not explicitly covered: it is rejected
            // instead of letting it pass without scope, so as not to silently
            // assume it is safe.
            throw new Error(
              `companyScopeExtension: operación '${operation}' sobre '${model}' no tiene manejo de aislamiento por empresa definido. Agregala explícitamente antes de usarla.`,
            );
          },
        },
      },
    }),
  );
}
