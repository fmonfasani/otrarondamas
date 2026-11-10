/**
 * Canonical authorization model — stage 1 of the Authorization spec
 * (docs/WAPSELL-DOCUMENTATION/06-SPECIFICATIONS/SPECIALIZED/05-AUTHORIZATION-SPEC.md v0.2,
 * Owner Ruling OR-B4-024; backlog #161).
 *
 * Stage 1 = the approved catalogue, Role → Permission matrix and legacy mapping as typed
 * data, with NO behaviour change: nothing in the request path reads this module yet.
 * Stage 2 wires a single engine (AUTH-08) that resolves Membership.role → this matrix and
 * turns @RequirePermission / @Authorize into adapters through LEGACY_PERMISSION_MAP.
 */

/** Canonical Business permissions (spec §2). */
export const PERMISSIONS = [
  'USERS_VIEW',
  'USERS_MANAGE',
  'CUSTOMERS_VIEW',
  'CUSTOMERS_MANAGE',
  'CATALOG_VIEW',
  'CATALOG_MANAGE',
  'PRICING_CHANGE',
  'ORDERS_VIEW',
  'ORDERS_MANAGE',
  'ORDER_CONFIRM',
  'ORDER_CANCEL',
  'SALES_VIEW',
  'SALES_CREATE',
  'SALES_CANCEL',
  'REFUNDS_MANAGE',
  'INVENTORY_VIEW',
  'INVENTORY_MOVE',
  'INVENTORY_ADJUST',
  'CASH_VIEW',
  'CASH_OPEN',
  'CASH_CLOSE',
  'CASH_EXPENSE',
  'CASH_ADJUST',
  'CASH_WITHDRAW',
  'PAYMENTS_VIEW',
  'PAYMENTS_REGISTER',
  'PAYMENTS_REFUND',
  'RECEIVABLES_VIEW',
  'RECEIVABLES_MANAGE',
  'PURCHASES_MANAGE',
  'MESSAGING_USE',
  'MESSAGING_MANAGE',
  'BRAND_MANAGE',
  'REPORTS_VIEW',
  'AUDIT_VIEW_OWN',
  'AUDIT_VIEW_ALL',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** High-sensitivity permissions (R8-AUTH-001 §5; spec §2 ★). */
export const HIGH_SENSITIVITY: readonly Permission[] = [
  'USERS_MANAGE',
  'PRICING_CHANGE',
  'ORDER_CONFIRM',
  'ORDER_CANCEL',
  'SALES_CANCEL',
  'REFUNDS_MANAGE',
  'INVENTORY_ADJUST',
  'CASH_ADJUST',
  'CASH_WITHDRAW',
  'PAYMENTS_REFUND',
  'BRAND_MANAGE',
  'AUDIT_VIEW_ALL',
];

/**
 * Platform scope (spec §3, OR-B4-020). Never held by a Business Membership: no role in
 * ROLE_PERMISSIONS may contain these.
 */
export const PLATFORM_PERMISSIONS = [
  'PLATFORM_BUSINESSES_VIEW',
  'PLATFORM_BUSINESSES_MANAGE',
  'PLATFORM_SUPPORT_ACCESS',
] as const;
export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

/** Canonical Membership Roles (AUTH-01). */
export const ROLES = ['OWNER', 'ADMIN', 'VENDEDOR', 'GESTOR_DE_STOCK'] as const;
export type Role = (typeof ROLES)[number];

const ALL: readonly Permission[] = PERMISSIONS;

/**
 * Fixed Role → Permission matrix (spec §4, approved by OR-B4-024). No per-Membership
 * grants or denials in the MVP (AUTH-04).
 *
 * Constraints that the matrix alone cannot express (enforced by the engine in stage 2):
 *  - an ADMIN cannot change, suspend or deactivate an OWNER Membership, nor grant OWNER;
 *  - a GESTOR_DE_STOCK's ORDERS_MANAGE covers fulfillment states only.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  OWNER: ALL,
  ADMIN: ALL.filter((p) => p !== 'BRAND_MANAGE'),
  VENDEDOR: [
    'CUSTOMERS_VIEW',
    'CUSTOMERS_MANAGE',
    'CATALOG_VIEW',
    'ORDERS_VIEW',
    'ORDERS_MANAGE',
    'ORDER_CONFIRM',
    'SALES_VIEW',
    'SALES_CREATE',
    'INVENTORY_VIEW',
    'CASH_VIEW',
    'CASH_OPEN',
    'CASH_CLOSE',
    'CASH_EXPENSE',
    'PAYMENTS_VIEW',
    'PAYMENTS_REGISTER',
    'RECEIVABLES_VIEW',
    'MESSAGING_USE',
    'AUDIT_VIEW_OWN',
  ],
  GESTOR_DE_STOCK: [
    'CATALOG_VIEW',
    'CATALOG_MANAGE',
    'ORDERS_VIEW',
    'ORDERS_MANAGE',
    'INVENTORY_VIEW',
    'INVENTORY_MOVE',
    'INVENTORY_ADJUST',
    'PURCHASES_MANAGE',
    'MESSAGING_USE',
    'AUDIT_VIEW_OWN',
  ],
};

/**
 * AS-IS role → canonical role (spec §5.2, OR-B4-006). `null` = not a Membership Role.
 * ASISTENTE_LOCAL → VENDEDOR is transitional and has a deadline (#160).
 */
export const LEGACY_ROLE_MAP: Readonly<Record<string, Role | null>> = {
  OWNER: 'OWNER',
  ASISTENTE_LOCAL: 'VENDEDOR',
  PROVEEDOR: null,
  REPARTIDOR: null,
};

/**
 * Customer-facing policy marker: the code is not a staff permission and maps to no
 * canonical Permission (spec §5.1, `customers.request_return`).
 */
export const CUSTOMER_POLICY = 'CUSTOMER_POLICY' as const;

/**
 * Legacy permission codes (`Permiso.nombre`, `@RequirePermission`, `@Authorize`) →
 * canonical permissions (spec §5.1, AUTH-11). Where one legacy code covered several
 * operations, it maps to all of them; stage 3 assigns the exact one per endpoint.
 */
export const LEGACY_PERMISSION_MAP: Readonly<
  Record<string, readonly Permission[] | typeof CUSTOMER_POLICY>
> = {
  'usuarios.gestionar': ['USERS_MANAGE'],
  'users.manage': ['USERS_MANAGE'],
  'roles.manage': ['USERS_MANAGE'],
  'clientes.gestionar': ['CUSTOMERS_MANAGE'],
  'customers.manage': ['CUSTOMERS_MANAGE'],
  'productos.gestionar': ['CATALOG_MANAGE'],
  'catalog.manage_products': ['CATALOG_MANAGE'],
  'precios.cambiar': ['PRICING_CHANGE'],
  'catalog.change_prices': ['PRICING_CHANGE'],
  'fidelizacion.gestionar': ['PRICING_CHANGE'],
  'loyalty.manage_rules': ['PRICING_CHANGE'],
  'pedidos.gestionar': ['ORDERS_MANAGE', 'ORDER_CONFIRM', 'ORDER_CANCEL'],
  'orders.manage': ['ORDERS_MANAGE', 'ORDER_CONFIRM', 'ORDER_CANCEL'],
  'ventas.crear': ['SALES_CREATE'],
  'sales.create': ['SALES_CREATE'],
  'ventas.ver': ['SALES_VIEW'],
  'sales.view': ['SALES_VIEW'],
  'ventas.anular': ['SALES_CANCEL'],
  'ventas.eliminar': ['SALES_CANCEL'],
  'sales.cancel': ['SALES_CANCEL'],
  'ventas.editar': ['PAYMENTS_REGISTER'],
  'ventas.reembolsar': ['REFUNDS_MANAGE', 'PAYMENTS_REFUND'],
  'payments.process_refunds': ['REFUNDS_MANAGE', 'PAYMENTS_REFUND'],
  'orders.process_returns': ['REFUNDS_MANAGE'],
  'orders.authorize_returns': ['REFUNDS_MANAGE'],
  'customers.request_return': CUSTOMER_POLICY,
  'inventario.ajustes': ['INVENTORY_ADJUST'],
  'inventory.adjust_stock': ['INVENTORY_ADJUST'],
  'caja.gastos': ['CASH_EXPENSE'],
  'cash.register_movement': ['CASH_EXPENSE'],
  'compras.gestionar': ['PURCHASES_MANAGE'],
  'purchases.manage': ['PURCHASES_MANAGE'],
  'payments.manage': ['PAYMENTS_REGISTER'],
  'metrics.read': ['REPORTS_VIEW'],
  'dashboard.view': ['REPORTS_VIEW'],
  'audit.leer': ['AUDIT_VIEW_OWN'],
  'audit.view': ['AUDIT_VIEW_OWN'],
  'audit.leer_otros': ['AUDIT_VIEW_ALL'],
};

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function permissionsForRole(role: Role): ReadonlySet<Permission> {
  return new Set(ROLE_PERMISSIONS[role]);
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Canonical role for an AS-IS `RolUsuario`; undefined when the value is unknown. */
export function canonicalRoleFor(legacyRole: string): Role | null | undefined {
  return Object.prototype.hasOwnProperty.call(LEGACY_ROLE_MAP, legacyRole)
    ? LEGACY_ROLE_MAP[legacyRole]
    : undefined;
}
