import { Logger } from '@nestjs/common';
import { LEGACY_PERMISSION_MAP } from './canonical-permissions';
import { evaluate, shadowCompare, translateCode } from './authorization-engine';

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
});
