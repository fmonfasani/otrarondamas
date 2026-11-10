import * as fs from 'fs';
import * as path from 'path';
import {
  CUSTOMER_POLICY,
  HIGH_SENSITIVITY,
  LEGACY_PERMISSION_MAP,
  LEGACY_ROLE_MAP,
  PERMISSIONS,
  PLATFORM_PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  canonicalRoleFor,
  isPermission,
  permissionsForRole,
  roleHasPermission,
  type Permission,
} from './canonical-permissions';

// Pins the Role → Permission matrix approved by the Owner (Authorization spec v0.2 §4,
// OR-B4-024). Changing a row must be a deliberate, reviewed change to this test.
describe('canonical authorization model (Authorization spec v0.2)', () => {
  const sorted = (xs: Iterable<string>) => [...xs].sort();

  it('has 36 unique canonical permissions', () => {
    expect(PERMISSIONS).toHaveLength(36);
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });

  it('marks only catalogue permissions as high-sensitivity', () => {
    expect(HIGH_SENSITIVITY.every(isPermission)).toBe(true);
  });

  describe('matrix', () => {
    it('gives the Owner every Business permission', () => {
      expect(sorted(permissionsForRole('OWNER'))).toEqual(sorted(PERMISSIONS));
    });

    it('gives the Admin everything except the Brand (Owner-only)', () => {
      expect(roleHasPermission('ADMIN', 'BRAND_MANAGE')).toBe(false);
      expect(sorted(permissionsForRole('ADMIN'))).toEqual(
        sorted(PERMISSIONS.filter((p) => p !== 'BRAND_MANAGE')),
      );
    });

    it('lets the Vendedor confirm orders and register small cash expenses, but not cancel or adjust', () => {
      const vendedor: Permission[] = [
        'ORDER_CONFIRM',
        'CASH_EXPENSE',
        'SALES_CREATE',
        'MESSAGING_USE',
      ];
      const notVendedor: Permission[] = [
        'ORDER_CANCEL',
        'SALES_CANCEL',
        'REFUNDS_MANAGE',
        'CASH_ADJUST',
        'CASH_WITHDRAW',
        'PRICING_CHANGE',
        'USERS_MANAGE',
        'INVENTORY_ADJUST',
        'BRAND_MANAGE',
      ];
      for (const p of vendedor) expect(roleHasPermission('VENDEDOR', p)).toBe(true);
      for (const p of notVendedor) expect(roleHasPermission('VENDEDOR', p)).toBe(false);
    });

    it('lets the Gestor de Stock manage the catalogue and stock, without prices or sales', () => {
      const gestor: Permission[] = [
        'CATALOG_MANAGE',
        'INVENTORY_MOVE',
        'INVENTORY_ADJUST',
        'PURCHASES_MANAGE',
      ];
      const notGestor: Permission[] = [
        'PRICING_CHANGE',
        'ORDER_CONFIRM',
        'SALES_CREATE',
        'CASH_OPEN',
        'USERS_MANAGE',
      ];
      for (const p of gestor) expect(roleHasPermission('GESTOR_DE_STOCK', p)).toBe(true);
      for (const p of notGestor) expect(roleHasPermission('GESTOR_DE_STOCK', p)).toBe(false);
    });

    it('pins the exact rows of the two delegated roles', () => {
      expect(ROLE_PERMISSIONS.VENDEDOR).toHaveLength(18);
      expect(ROLE_PERMISSIONS.GESTOR_DE_STOCK).toHaveLength(10);
    });

    it('only grants catalogue permissions and never a platform permission', () => {
      for (const role of ROLES) {
        for (const p of ROLE_PERMISSIONS[role]) {
          expect(isPermission(p)).toBe(true);
          expect((PLATFORM_PERMISSIONS as readonly string[]).includes(p)).toBe(false);
        }
      }
    });
  });

  describe('legacy roles (OR-B4-006)', () => {
    it('maps ASISTENTE_LOCAL to VENDEDOR and drops PROVEEDOR and REPARTIDOR as Membership Roles', () => {
      expect(canonicalRoleFor('OWNER')).toBe('OWNER');
      expect(canonicalRoleFor('ASISTENTE_LOCAL')).toBe('VENDEDOR');
      expect(canonicalRoleFor('PROVEEDOR')).toBeNull();
      expect(canonicalRoleFor('REPARTIDOR')).toBeNull();
      expect(canonicalRoleFor('UNKNOWN')).toBeUndefined();
    });

    it('covers every value of the AS-IS RolUsuario enum', () => {
      const schema = fs.readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
      const enumBody = /enum RolUsuario \{([^}]*)\}/.exec(schema)?.[1] ?? '';
      const values = enumBody
        .split('\n')
        .map((line) => line.replace(/\/\/.*$/, '').trim())
        .filter(Boolean);
      expect(values.length).toBeGreaterThan(0);
      expect(sorted(values)).toEqual(sorted(Object.keys(LEGACY_ROLE_MAP)));
    });
  });

  describe('legacy permission codes (AUTH-11)', () => {
    it('maps every legacy code to canonical permissions or the customer policy', () => {
      for (const [code, target] of Object.entries(LEGACY_PERMISSION_MAP)) {
        if (target === CUSTOMER_POLICY) continue;
        expect({ code, ok: target.length > 0 && target.every(isPermission) }).toEqual({
          code,
          ok: true,
        });
      }
    });

    // Guards the transition: a new @RequirePermission / @Authorize code without a canonical
    // mapping fails here instead of silently escaping the single engine (AUTH-08/AUTH-10).
    it('has a mapping for every permission code used by a controller decorator', () => {
      const root = path.join(process.cwd(), 'src');
      const codes = new Set<string>();
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
            const source = fs.readFileSync(full, 'utf8');
            for (const m of source.matchAll(/@(?:RequirePermission|Authorize)\('([^']+)'\)/g)) {
              codes.add(m[1]);
            }
          }
        }
      };
      walk(root);
      expect(codes.size).toBeGreaterThan(0);
      const unmapped = [...codes].filter((c) => !(c in LEGACY_PERMISSION_MAP));
      expect(unmapped).toEqual([]);
    });
  });
});
