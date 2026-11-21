import { Prisma } from '@prisma/client';

/**
 * Multi-company isolation (INV-01, section 5 of the SDD) implemented as a
 * Prisma Client Extension — not as a middleware that "trusts" each service
 * to filter by empresaId by hand.
 *
 * Models with a direct empresaId or businessId are scoped here. Models that inherit scope
 * through relations must still be queried through an already-scoped parent. A reference to
 * another business's row is refused by the database itself: every reference between business
 * tables carries the business in its key (ADR-DAT-020, Fase 2 PR 4), which replaced the
 * relation-ownership registry this extension used to consult.
 */
export const MODELS_WITH_COMPANY_ID = [
  'Usuario',
  'Producto',
  'Familia',
  'Subfamilia',
  'Tipo',
  'Subtipo',
  'ProductoProveedor',
  'Presentacion',
  'Lote',
  'Cliente',
  'DevolucionCliente',
  'Reembolso',
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
  'AnalyticsEvent',
  'AnalyticsAggregation',
  'AnalyticsDashboard',
  'NotificationPreference',
  'NotificationDigest',
  'UserEmpresa',
  'PhoneNumber',
  'SMSAlert',
  'EmailTemplate',
  'EmailLog',
  'EmailPreference',
  'EmailCampaign',
  'Payment',
  'PaymentIntent',
  'PaymentWebhook',
  'Refund',
  'Notificacion',
  'AuditLog',
  'Autorizacion',
  'PagoProveedor',
  'DevolucionProveedor',
  'ReglaFidelizacion',
  'Invitacion',
  // ADR-DAT-020 (INIT-019 PR 4): lines that now carry their business.
  'VentaItem',
  'PedidoItem',
  'DevolucionClienteItem',
  // INIT-019 PR 4, module 2: purchase and supplier return lines.
  'CompraItem',
  'DevolucionProveedorItem',
  // OR-B4-046 rule 12: product photos, born with their business (ADR-DAT-020).
  'ProductoFoto',
  // OR-B4-015 (#166): stock locations, born with their business (ADR-DAT-020).
  'Ubicacion',
  // OR-B4-046 §4.4 (stage C3): offers and their products, born with their business.
  'Oferta',
  'OfertaProducto',
  // INIT-019 PR 4, module 4a: cash openings, counts, closings, movements and payment applications.
  'AperturaCaja',
  'ArqueoCaja',
  'CierreCaja',
  'MovimientoCaja',
  'AplicacionPago',
] as const;

/**
 * Shared catalog models. These may have a nullable tenant field for future
 * overrides, but the current authorization design explicitly treats them as
 * global (D-005); they must not be filtered to one company.
 */
export const GLOBAL_MODELS = ['RoleTemplate'] as const;

export const MODELS_WITH_BUSINESS_ID = [
  'Cart',
  'CartItem',
  'Conversation',
  'ConversationAssociation',
  'ConversationParticipant',
  'Membership',
  'Message',
  'MessageReadReceipt',
  'MessagingReadPreference',
] as const;

type ModelWithCompanyId = (typeof MODELS_WITH_COMPANY_ID)[number];
type ModelWithBusinessId = (typeof MODELS_WITH_BUSINESS_ID)[number];
export type TenantField = 'empresaId' | 'businessId';

function isModelWithCompanyId(model: string | undefined): model is ModelWithCompanyId {
  return !!model && (MODELS_WITH_COMPANY_ID as readonly string[]).includes(model);
}

function isModelWithBusinessId(model: string | undefined): model is ModelWithBusinessId {
  return !!model && (MODELS_WITH_BUSINESS_ID as readonly string[]).includes(model);
}

function tenantFieldForModel(model: string | undefined): TenantField | undefined {
  if (isModelWithCompanyId(model)) return 'empresaId';
  if (isModelWithBusinessId(model)) return 'businessId';
  return undefined;
}

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

type DelegateWithTenantId = {
  findUnique(args: {
    where: Record<string, unknown>;
    select: Record<string, true>;
  }): Promise<Record<string, string | null> | null>;
};

/** Forces update payloads to retain the authenticated tenant ownership. */
export function enforceTenantOnUpdateData(
  data: Record<string, unknown> | Array<Record<string, unknown>> | undefined,
  tenantField: TenantField,
  tenantId: string,
): Record<string, unknown> | Array<Record<string, unknown>> | undefined {
  if (Array.isArray(data)) {
    return data.map((row) => ({ ...row, [tenantField]: tenantId }));
  }
  if (data) {
    return { ...data, [tenantField]: tenantId };
  }
  return data;
}

/**
 * Checks ownership independently of the caller's Prisma select projection.
 * Missing rows are left to the original query so findUniqueOrThrow keeps its
 * native not-found behavior.
 */
export async function isUniqueReadOwnedByTenant(
  client: unknown,
  model: string,
  where: Record<string, unknown>,
  tenantId: string,
): Promise<boolean> {
  const tenantField = tenantFieldForModel(model);
  if (!tenantField) {
    throw new Error(`companyScopeExtension: modelo '${model}' no tiene tenant verificable.`);
  }
  const delegate = (client as Record<string, DelegateWithTenantId>)[
    model.charAt(0).toLowerCase() + model.slice(1)
  ];
  const owner = await delegate.findUnique({ where, select: { [tenantField]: true } });
  return !owner || owner[tenantField] === tenantId;
}

/**
 * Creates a Prisma extension bound to a concrete company. It is instantiated
 * per request, never as a global singleton.
 */
export function companyScopeExtension(companyId: string) {
  if (!companyId) {
    throw new Error('companyScopeExtension requiere un identificador de tenant autenticado.');
  }

  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'company-scope',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantField = tenantFieldForModel(model);
            if (!tenantField) {
              return query(args);
            }

            const a = args as {
              where?: Record<string, unknown>;
              data?: Record<string, unknown> | Array<Record<string, unknown>>;
            };

            if (operation === 'create') {
              a.data = { ...(a.data as Record<string, unknown>), [tenantField]: companyId };
              return query(a);
            }

            if (operation === 'createMany') {
              const rows = Array.isArray(a.data) ? a.data : a.data ? [a.data] : [];
              a.data = rows.map((row) => ({ ...row, [tenantField]: companyId }));
              return query(a);
            }

            if (OPERATIONS_WITH_WHERE.has(operation)) {
              a.where = { ...(a.where ?? {}), [tenantField]: companyId };

              // A scoped update must not be able to move a record to another
              // tenant by supplying a different tenant ID in its data payload.
              if (operation === 'update' || operation === 'updateMany') {
                a.data = enforceTenantOnUpdateData(a.data, tenantField, companyId);
              }

              return query(a);
            }

            if (OPERATIONS_FIND_UNIQUE.has(operation)) {
              // Prisma 5.22 supports non-unique scalar filters alongside a
              // unique selector in WhereUniqueInput (ExtendedWhereUnique).
              // Enforce tenant scope in SQL, before projection, so callers
              // cannot bypass isolation by omitting the tenant field from
              // select (#125). Works for empresaId and businessId models.
              a.where = { ...(a.where ?? {}), [tenantField]: companyId };
              return query(a);
            }

            // Reject operations whose tenant semantics have not been defined.
            throw new Error(
              `companyScopeExtension: operación '${operation}' sobre '${model}' no tiene manejo de aislamiento por empresa definido. Agregala explícitamente antes de usarla.`,
            );
          },
        },
      },
    }),
  );
}
