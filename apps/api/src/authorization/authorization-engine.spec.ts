import { Logger } from '@nestjs/common';
import { LEGACY_PERMISSION_MAP } from './canonical-permissions';
import {
  DEFAULT_AUTHZ_ENGINE_MODE,
  authzEngineMode,
  capabilitiesForRole,
  decide,
  evaluate,
  shadowCompare,
  translateCode,
} from './authorization-engine';

describe('canonical authorization engine (#161 stage 2)', () => {
  describe('translateCode', () => {
    it('accepts canonical permissions and legacy codes, and returns undefined for unknown codes', () => {
      expect(translateCode('SALES_CREATE')).toEqual(['SALES_CREATE']);
      expect(translateCode('ventas.crear')).toEqual(['SALES_CREATE']);
      expect(translateCode('customers.request_return')).toBe('CUSTOMER_POLICY');
      expect(translateCode('does.not.exist')).toBeUndefined();
      expect(translateCode('constructor')).toBeUndefined();
    });
  });

  describe('evaluate', () => {
    const active = true;

    it('allows by role through the approved matrix', () => {
      expect(evaluate({ code: 'ventas.crear', legacyRole: 'OWNER', active })).toMatchObject({
        decision: 'ALLOW',
        canonicalRole: 'OWNER',
        reason: 'ROLE_HAS_PERMISSION',
      });
      expect(
        evaluate({ code: 'caja.gastos', legacyRole: 'ASISTENTE_LOCAL', active }),
      ).toMatchObject({
        decision: 'ALLOW',
        canonicalRole: 'VENDEDOR',
      });
    });

    it('denies what the role does not hold', () => {
      expect(
        evaluate({ code: 'precios.cambiar', legacyRole: 'ASISTENTE_LOCAL', active }),
      ).toMatchObject({
        decision: 'DENY',
        reason: 'ROLE_LACKS_PERMISSION',
      });
    });

    it('fails closed for unknown codes, unknown roles, non-Membership roles and inactive principals', () => {
      expect(evaluate({ code: 'nope', legacyRole: 'OWNER', active }).reason).toBe('UNKNOWN_CODE');
      expect(evaluate({ code: 'ventas.crear', legacyRole: 'SUPERUSER', active }).reason).toBe(
        'UNKNOWN_ROLE',
      );
      expect(evaluate({ code: 'ventas.crear', legacyRole: undefined, active }).reason).toBe(
        'UNKNOWN_ROLE',
      );
      expect(evaluate({ code: 'ventas.crear', legacyRole: 'PROVEEDOR', active }).reason).toBe(
        'NOT_A_MEMBERSHIP_ROLE',
      );
      expect(evaluate({ code: 'ventas.crear', legacyRole: 'OWNER', active: false }).reason).toBe(
        'INACTIVE',
      );
      for (const input of [
        { code: 'nope', legacyRole: 'OWNER', active },
        { code: 'ventas.crear', legacyRole: 'SUPERUSER', active },
        { code: 'ventas.crear', legacyRole: 'REPARTIDOR', active },
        { code: 'ventas.crear', legacyRole: 'OWNER', active: false },
      ]) {
        expect(evaluate(input).decision).toBe('DENY');
      }
    });

    it('flags codes that covered several operations as ambiguous (split per endpoint in stage 3)', () => {
      const result = evaluate({ code: 'pedidos.gestionar', legacyRole: 'ASISTENTE_LOCAL', active });
      expect(result).toMatchObject({ decision: 'ALLOW', ambiguous: true });
      expect(result.required).toEqual(['ORDERS_MANAGE', 'ORDER_CONFIRM', 'ORDER_CANCEL']);
    });

    it('does not decide customer-facing policies', () => {
      expect(
        evaluate({ code: 'customers.request_return', legacyRole: null, active }).decision,
      ).toBe('NOT_APPLICABLE');
    });

    it('lets the Owner pass every staff legacy code', () => {
      for (const [code, target] of Object.entries(LEGACY_PERMISSION_MAP)) {
        if (target === 'CUSTOMER_POLICY') continue;
        expect({
          code,
          decision: evaluate({ code, legacyRole: 'OWNER', active }).decision,
        }).toEqual({
          code,
          decision: 'ALLOW',
        });
      }
    });
  });

  describe('shadowCompare', () => {
    let warn: jest.SpyInstance;
    beforeEach(() => {
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => warn.mockRestore());

    const base = { source: 'RequirePermission' as const, principalId: 'u-1', active: true };

    it('logs a structured divergence without personal data', () => {
      shadowCompare({ ...base, code: 'ventas.crear', legacyRole: 'OWNER', legacyAllowed: false });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String(warn.mock.calls[0][0]))).toEqual({
        event: 'authz.shadow.divergence',
        source: 'RequirePermission',
        code: 'ventas.crear',
        principalId: 'u-1',
        legacyRole: 'OWNER',
        canonicalRole: 'OWNER',
        legacy: 'DENY',
        canonical: 'ALLOW',
        reason: 'ROLE_HAS_PERMISSION',
        declared: false,
        required: ['SALES_CREATE'],
        ambiguous: false,
      });
    });

    it('stays silent when the decisions agree or the code is a customer policy', () => {
      shadowCompare({ ...base, code: 'ventas.crear', legacyRole: 'OWNER', legacyAllowed: true });
      shadowCompare({
        ...base,
        code: 'customers.request_return',
        legacyRole: null,
        legacyAllowed: false,
      });
      expect(warn).not.toHaveBeenCalled();
    });

    it('never throws, even if logging fails', () => {
      warn.mockImplementation(() => {
        throw new Error('logger down');
      });
      expect(() =>
        shadowCompare({ ...base, code: 'ventas.crear', legacyRole: 'OWNER', legacyAllowed: false }),
      ).not.toThrow();
    });
  });

  // Cut-over switch (OR-B4-026).
  describe('authzEngineMode / decide', () => {
    let warn: jest.SpyInstance;
    beforeEach(() => {
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => warn.mockRestore());

    const base = { source: 'RequirePermission' as const, principalId: 'u-1', active: true };

    it('defaults to enforce since the cut-over (OR-B4-026) and accepts only shadow / enforce', () => {
      expect(DEFAULT_AUTHZ_ENGINE_MODE).toBe('enforce');
      expect(authzEngineMode({})).toBe('enforce');
      expect(authzEngineMode({ AUTHZ_ENGINE_MODE: ' Shadow ' })).toBe('shadow');
      expect(authzEngineMode({ AUTHZ_ENGINE_MODE: 'enforce' })).toBe('enforce');
      expect(authzEngineMode({ AUTHZ_ENGINE_MODE: 'off' })).toBe('enforce');
    });

    it('returns the legacy outcome in shadow mode and the canonical one in enforce mode', () => {
      const ownerWithoutAssignment = {
        ...base,
        code: 'ventas.crear',
        legacyRole: 'OWNER',
        legacyAllowed: false,
      };
      expect(decide(ownerWithoutAssignment, 'shadow').allowed).toBe(false);
      expect(decide(ownerWithoutAssignment, 'enforce').allowed).toBe(true);

      const vendedorWithPricing = {
        ...base,
        code: 'precios.cambiar',
        legacyRole: 'ASISTENTE_LOCAL',
        legacyAllowed: true,
      };
      expect(decide(vendedorWithPricing, 'shadow').allowed).toBe(true);
      expect(decide(vendedorWithPricing, 'enforce').allowed).toBe(false);
    });

    it('logs the enforce divergence under its own event', () => {
      decide(
        { ...base, code: 'ventas.crear', legacyRole: 'OWNER', legacyAllowed: false },
        'enforce',
      );
      expect(JSON.parse(String(warn.mock.calls[0][0]))).toMatchObject({
        event: 'authz.enforce.divergence',
        legacy: 'DENY',
        canonical: 'ALLOW',
      });
    });

    it('keeps the legacy outcome for policies other guards decide', () => {
      const customer = { ...base, code: 'customers.request_return', legacyRole: null };
      expect(decide({ ...customer, legacyAllowed: true }, 'enforce').allowed).toBe(true);
      expect(decide({ ...customer, legacyAllowed: false }, 'enforce').allowed).toBe(false);
    });

    it('fails closed in enforce mode when the evaluation breaks', () => {
      const broken = {
        ...base,
        code: '',
        legacyRole: 'OWNER',
        legacyAllowed: true,
        declared: () => {
          throw new Error('boom');
        },
      };
      expect(decide(broken, 'enforce').allowed).toBe(false);
      expect(decide(broken, 'shadow').allowed).toBe(true);
    });
  });

  describe('capabilitiesForRole', () => {
    it('lists canonical permissions and the legacy codes the role satisfies', () => {
      const owner = capabilitiesForRole('OWNER');
      expect(owner).toEqual(expect.arrayContaining(['AUDIT_VIEW_ALL', 'audit.leer_otros']));
      const vendedor = capabilitiesForRole('ASISTENTE_LOCAL');
      expect(vendedor).toEqual(
        expect.arrayContaining(['AUDIT_VIEW_OWN', 'audit.leer', 'ventas.crear']),
      );
      expect(vendedor).not.toContain('audit.leer_otros');
      expect(vendedor).not.toContain('precios.cambiar');
      expect(capabilitiesForRole('PROVEEDOR')).toEqual([]);
      expect(capabilitiesForRole(undefined)).toEqual([]);
    });
  });
});
