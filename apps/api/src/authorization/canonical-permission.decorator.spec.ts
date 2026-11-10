import * as fs from 'fs';
import * as path from 'path';
import {
  CANONICAL_PERMISSION_KEY,
  CanonicalPermission,
  byBodyValue,
  plusWhenBodyHas,
  readCanonicalRequirement,
  resolveRequirement,
} from './canonical-permission.decorator';
import { evaluate } from './authorization-engine';

describe('@CanonicalPermission (#161 stage 3, #168)', () => {
  describe('resolveRequirement', () => {
    it('normalises static declarations', () => {
      expect(resolveRequirement('ORDER_CANCEL', {})).toEqual(['ORDER_CANCEL']);
      expect(resolveRequirement(['CATALOG_MANAGE', 'PRICING_CHANGE'], {})).toEqual([
        'CATALOG_MANAGE',
        'PRICING_CHANGE',
      ]);
      expect(resolveRequirement('CUSTOMER_POLICY', {})).toBe('CUSTOMER_POLICY');
    });

    it('splits the Order state change into ORDER_CONFIRM / ORDER_CANCEL (#168)', () => {
      const orderStatus = byBodyValue(
        'estado',
        { CONFIRMADO: 'ORDER_CONFIRM', CANCELADO: 'ORDER_CANCEL' },
        'ORDERS_MANAGE',
      );
      expect(orderStatus({ body: { estado: 'CONFIRMADO' } })).toEqual(['ORDER_CONFIRM']);
      expect(orderStatus({ body: { estado: 'CANCELADO' } })).toEqual(['ORDER_CANCEL']);
      expect(orderStatus({ body: { estado: 'otro' } })).toEqual(['ORDERS_MANAGE']);
      expect(orderStatus({ body: { estado: 'constructor' } })).toEqual(['ORDERS_MANAGE']);
      expect(orderStatus({})).toEqual(['ORDERS_MANAGE']);
      expect(orderStatus({ body: 'not-an-object' })).toEqual(['ORDERS_MANAGE']);
    });

    it('adds PRICING_CHANGE only when a product update touches a price', () => {
      const productUpdate = plusWhenBodyHas(
        'CATALOG_MANAGE',
        ['precioMinorista', 'precioMayorista', 'descuentoPorcentaje'],
        'PRICING_CHANGE',
      );
      expect(productUpdate({ body: { nombre: 'x' } })).toEqual(['CATALOG_MANAGE']);
      expect(productUpdate({ body: { precioMinorista: 10 } })).toEqual([
        'CATALOG_MANAGE',
        'PRICING_CHANGE',
      ]);
    });
  });

  describe('readCanonicalRequirement', () => {
    class Controller {
      @CanonicalPermission('ORDERS_VIEW')
      list() {
        return undefined;
      }
      plain() {
        return undefined;
      }
    }

    it('reads the handler declaration and tolerates missing or invalid targets', () => {
      expect(
        readCanonicalRequirement({
          getHandler: () => Controller.prototype.list,
          getClass: () => Controller,
        }),
      ).toBe('ORDERS_VIEW');
      expect(
        readCanonicalRequirement({
          getHandler: () => Controller.prototype.plain,
          getClass: () => Controller,
        }),
      ).toBeUndefined();
      expect(
        readCanonicalRequirement({ getHandler: () => undefined, getClass: () => undefined }),
      ).toBeUndefined();
      expect(
        readCanonicalRequirement({
          getHandler: () => {
            throw new Error('boom');
          },
          getClass: () => Controller,
        }),
      ).toBeUndefined();
      expect(Reflect.getMetadata(CANONICAL_PERMISSION_KEY, Controller.prototype.list)).toBe(
        'ORDERS_VIEW',
      );
    });
  });

  describe('engine with a declaration', () => {
    const active = true;

    it('requires ALL declared permissions', () => {
      const declared = ['CATALOG_MANAGE', 'PRICING_CHANGE'] as const;
      expect(
        evaluate({ code: 'productos.gestionar', legacyRole: 'OWNER', active, declared }).decision,
      ).toBe('ALLOW');
      // A role without PRICING_CHANGE is denied even though it holds CATALOG_MANAGE.
      expect(
        evaluate({ code: 'productos.gestionar', legacyRole: 'ASISTENTE_LOCAL', active, declared }),
      ).toMatchObject({ decision: 'DENY', reason: 'ROLE_LACKS_PERMISSION', ambiguous: false });
    });

    it('uses the declaration instead of the coarse legacy translation', () => {
      const confirm = byBodyValue('estado', { CONFIRMADO: 'ORDER_CONFIRM' }, 'ORDERS_MANAGE');
      const cancel = 'ORDER_CANCEL' as const;
      // Vendedor (ASISTENTE_LOCAL): confirms orders, does not cancel them (OR-B4-024).
      expect(
        evaluate({
          code: 'pedidos.gestionar',
          legacyRole: 'ASISTENTE_LOCAL',
          active,
          declared: confirm,
          request: { body: { estado: 'CONFIRMADO' } },
        }).decision,
      ).toBe('ALLOW');
      expect(
        evaluate({
          code: 'pedidos.gestionar',
          legacyRole: 'ASISTENTE_LOCAL',
          active,
          declared: cancel,
        }).decision,
      ).toBe('DENY');
    });

    it('fails closed on a declaration that is not a catalogue permission', () => {
      expect(
        evaluate({
          code: 'ventas.crear',
          legacyRole: 'OWNER',
          active,
          declared: 'ventas.crear' as never,
        }),
      ).toMatchObject({ decision: 'DENY', reason: 'UNKNOWN_CODE' });
    });
  });

  // Every endpoint with a legacy decorator must declare its canonical permission on an
  // adjacent line, so stage 3 covers the whole legacy surface and new endpoints cannot skip
  // it. (In the Cash controller it goes above: CH-02 pins `@RequirePermission` + `@Post`.)
  it('is declared right after every legacy @RequirePermission / @Authorize', () => {
    const root = path.join(process.cwd(), 'src');
    const legacy = /^\s*@(RequirePermission|Authorize)\('[^']+'\)\s*$/;
    const missing: string[] = [];
    let seen = 0;
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
          const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
          lines.forEach((line, i) => {
            if (!legacy.test(line)) return;
            seen += 1;
            const canonical = /^\s*@CanonicalPermission\(/;
            if (!canonical.test(lines[i + 1] ?? '') && !canonical.test(lines[i - 1] ?? '')) {
              missing.push(`${path.relative(root, full)}:${i + 1}`);
            }
          });
        }
      }
    };
    walk(root);
    expect(seen).toBeGreaterThan(50);
    expect(missing).toEqual([]);
  });
});
