# TO-BE — Ventas, cobros y cuenta corriente

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

**Fuente en la SPEC General:** SPEC §10.4, §10.5, §10.7

## Propósito

La venta confirmada, cómo se cobra y lo que el cliente queda debiendo.

## Reglas

- Sale confirmada inmutable; se corrige con anulación o devolución, con trazabilidad. `[OR-B2-015]`
- Payment separado de Sale; una Sale puede tener varios Payments. `[R8-PAY-002]`
- Mercado Pago real; cada Business cobra en su propia cuenta; el cliente paga después de la confirmación. `[OR-B4-016, OR-B4-032]`
- Solo el Owner conecta la cuenta de cobro. `[OR-B4-033]`
- Cuenta corriente en el MVP: `Customer → CustomerAccount → Receivable → Payment → Settlement`; saldo derivado de las operaciones. `[OR-B4-021]`

## Permisos

| Acción | Permiso |
|---|---|
| Vender | `SALES_CREATE` |
| Registrar cobros | `PAYMENTS_REGISTER` |
| Conectar cobro online | `PAYMENTS_CONFIGURE` (Owner) |
| Cuenta corriente | `RECEIVABLES_VIEW` / `RECEIVABLES_MANAGE` |

## Estado actual (AS-IS, 2026-11-16)

Ventas del mostrador y cobros: hechos. Mercado Pago real hecho en código; en producción falta cargar la app de MP. **Brecha P1:** cuenta corriente sin cobranza (los modelos existen; la caja cuenta las cobranzas en 0).

## Abierto

- Límites de crédito, intereses y conciliación de la cuenta corriente
- Activar Mercado Pago en producción (configuración de la app)
