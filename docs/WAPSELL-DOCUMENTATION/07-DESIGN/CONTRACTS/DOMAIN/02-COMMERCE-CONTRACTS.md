# Wapsell — Contracts / Commerce
**Fase:** Contracts 2.0 — Commerce · **Creado:** 2026-09-29 · **Estado:** DRAFT — NOT APPROVED

> **Purpose:** formalizar como candidatos de contrato las direcciones ya documentadas para Commerce.
> No crea decisiones ni define schema, API concreta, estados no decididos, contratos externos de
> Mercado Pago, invariantes ni tests.
>
> **Autoridad:** D-002-bis, D-007, D-008, D-011, D-012, D-015 y D-016. D-001/D-005/D-006 se
> utilizan únicamente como fronteras transversales.
> D-007…D-016 son DERIVED / RECONSTRUCTED salvo D-010/D-014 OWNER-RULED; aquí solo se formalizan
> sus direcciones ya documentadas.

---

## 1. C-CUST-002 — Customer scoped to Business

**Source:** D-002-bis.

**Contract candidate:** todo Customer pertenece al contexto comercial de un Business.

**Observable obligations**
- Customer no es equivalente a User.
- Customer puede existir sin User.
- Customer puede vincularse opcionalmente a User.
- La información comercial del Customer no debe cruzar el Business al que pertenece.

**Open:** lifecycle, deduplication, linking mechanics, physical identity.

---

## 2. C-CAT-001 — Product/Catalog Business scope

**Source:** D-001 + Commerce TO-BE.

**Contract candidate:** productos y catálogo comercial se resuelven dentro del Business correspondiente.

**Observable obligations**
- Una operación comercial de un Business no debe resolver silenciosamente productos de otro Business.
- El catálogo debe operar bajo el Business context.

**Open:** hierarchy, SKU uniqueness, variants, price lists, physical model.

---

## 3. C-ORD-001 — Order and Sale are distinct

**Source:** D-007.

**Contract candidate:** Order y Sale son conceptos comerciales diferentes.

**Observable obligations**
- Order representa solicitud/intención y su preparación/confirmación.
- Sale representa la operación comercial efectivamente confirmada.
- Una Order puede originar una Sale bajo condiciones definidas posteriormente.
- Una venta presencial/POS puede originar una Sale directamente.
- No toda Order constituye necesariamente una Sale.

**Open:** conversion conditions, exact states, cancellation semantics for Order.

---

## 4. C-SALE-001 — Sale confirmation boundary

**Source:** D-008.

**Contract candidate:** una Sale posee un lifecycle explícito y su confirmación constituye el
punto de aplicación de sus efectos comerciales, operativos y económicos correspondientes.

**Observable obligations**
- Una Sale confirmada no se elimina.
- Su anulación debe registrarse como una operación explícita.
- La anulación debe producir las reversiones/ajustes que correspondan sobre los dominios afectados.
- Los efectos deben ejecutarse consistentemente y sin estados parcialmente aplicados.

**Open:** exact states, authorization, effect matrix, transaction boundary.

---

## 5. C-PAY-001 — External payment provider abstraction

**Source:** D-011.

**Contract candidate:** Wapsell integra proveedores de pago externos mediante una abstracción que
permita incorporar proveedores adicionales sin acoplar el núcleo comercial a uno concreto.

**Observable obligations**
- Mercado Pago es la integración prioritaria.
- Los pagos externos deben conservar trazabilidad de autorización, aprobación, rechazo,
  cancelación y conciliación cuando corresponda.
- El dominio comercial no debe depender de una implementación concreta del proveedor.

**Open:** API, checkout, webhook contract, credentials, idempotency, reconciliation mechanism,
payment state model.

---

## 6. C-AR-001 — Accounts Receivable

**Source:** D-012.

**Contract candidate:** Wapsell puede mantener obligaciones de cobro por Business cuando una venta
no queda completamente cancelada.

**Observable obligations**
- La cuenta por cobrar se asocia al Customer.
- Deben poder consultarse saldos pendientes.
- Deben poder registrarse cobros posteriores.
- Los cobros deben poder aplicarse a las obligaciones correspondientes.
- Debe conservarse trazabilidad de la deuda, cobro y aplicación.
- El saldo del Customer debe poder determinarse según las operaciones registradas.

**Open:** debt lifecycle, allocation rules, credit rules, physical accounting model.

---

## 7. C-PUR-001 — Purchase and Accounts Payable boundary

**Source:** D-015.

**Contract candidate:** Purchase pertenece al Business y representa una adquisición a un Supplier.

**Observable obligations**
- La compra puede registrar productos, cantidades, precios, condiciones de pago y recepción.
- Una obligación pendiente genera una Cuenta por Pagar asociada al Business y Supplier.
- Los pagos posteriores pueden registrarse y aplicarse a obligaciones.
- Debe mantenerse trazabilidad y conciliación de saldos.

**Open:** purchase lifecycle, documents, receiving boundary, payment application and physical model.

---

## 8. C-FUL-001 — Fulfillment belongs to Orders

**Source:** D-016.

**Contract candidate:** fulfillment se ejecuta dentro del contexto del Business y pertenece al
dominio de Orders.

**Observable obligations**
- Un pedido puede atravesar preparación, asignación de entrega y entrega.
- El proceso debe mantener estados explícitos y trazabilidad.
- El Business puede gestionar repartidores, zonas y tarifas de entrega.
- Debe existir seguimiento del pedido.
- Debe registrarse evidencia de entrega.
- Fulfillment no requiere constituir un módulo principal independiente de navegación.

**Open:** exact states, driver model, zones, tariffs, tracking, delivery evidence.

---

## 9. Commerce ↔ Inventory boundary

**Sources:** D-008, D-010, D-014.

Commerce may cause inventory effects through confirmed commercial operations, but the Inventory
contract remains the authority for stock integrity and Business ownership.

This document does not define stock movement types, locking, transactions, quantities or schema.

---

## 10. Commerce ↔ Cash boundary

**Source:** D-008 + D-013.

Sale cancellation may require an adjustment/reversal involving Cash when applicable. Cash lifecycle
and authorization remain governed by the Cash contract layer.

The Payments/Cash boundary remains OPEN where D-013 implementation detail is unresolved.

---

## 11. Commerce ↔ Messaging boundary

**Sources:** D-003, D-007.

Messaging is the commercial interface; Commerce is the commercial engine.

A conversation may provide the interaction context from which an Order or Sale is initiated, but
the exact Conversation/Order contract remains under the Messaging contract layer.

---

## 12. AS-IS → GAP → DECISION → CONTRACT → OPEN DETAIL

| AS-IS / evidence | GAP | Decision | Contract | Open Detail |
|---|---|---|---|---|
| Cliente scoped to Empresa | Business terminology/model differs | D-002-bis / D-001 | C-CUST-002 | migration/linking |
| Product/catalog scoped to Empresa | TO-BE Business context | D-001 | C-CAT-001 | catalog rules |
| Pedido and Venta exist separately AS-IS | Exact TO-BE lifecycle differs | D-007 | C-ORD-001 | conversion/states |
| Venta has AS-IS lifecycle | Effects/cancellation need explicit TO-BE | D-008 | C-SALE-001 | effect matrix |
| Pago exists AS-IS | External provider abstraction absent | D-011 | C-PAY-001 | provider/API |
| CuentaCorriente/Deuda concepts exist | AR lifecycle not formalized | D-012 | C-AR-001 | debt/application |
| Purchase/Supplier exist AS-IS | AP lifecycle not formalized | D-015 | C-PUR-001 | receiving/payment |
| Entrega model exists AS-IS without complete module | Fulfillment direction needs explicit boundary | D-016 | C-FUL-001 | tracking/evidence |

---

## 13. Traceability

| Contract | Decision | TO-BE | Invariant | Test |
|---|---|---|---|---|
| C-CUST-002 | D-002-bis | 02-COMMERCE | NOT CREATED | NOT CREATED |
| C-CAT-001 | D-001 | 02-COMMERCE | NOT CREATED | NOT CREATED |
| C-ORD-001 | D-007 | 02-COMMERCE | NOT CREATED | NOT CREATED |
| C-SALE-001 | D-008 | 02-COMMERCE | NOT CREATED | NOT CREATED |
| C-PAY-001 | D-011 | 02-COMMERCE | NOT CREATED | NOT CREATED |
| C-AR-001 | D-012 | 02-COMMERCE | NOT CREATED | NOT CREATED |
| C-PUR-001 | D-015 | 02-COMMERCE | NOT CREATED | NOT CREATED |
| C-FUL-001 | D-016 | 02-COMMERCE | NOT CREATED | NOT CREATED |

---

## 14. Open Details

1. Customer lifecycle and deduplication.
2. Customer/User linking mechanics.
3. Catalog hierarchy and product lifecycle.
4. Pricing model and price-list behavior.
5. Order lifecycle and exact states.
6. Order → Sale conversion conditions.
7. Sale exact lifecycle states.
8. Sale cancellation authorization.
9. Sale effect matrix across Stock/Cash/Payment/AR.
10. Transaction boundary for Sale confirmation.
11. Payment state model.
12. Mercado Pago integration/API/webhook contract.
13. Payment idempotency and reconciliation.
14. AR debt lifecycle and allocation rules.
15. Purchase lifecycle.
16. Supplier lifecycle.
17. AP payment/application rules.
18. Fulfillment exact states.
19. Driver/zone/tariff model.
20. Tracking and delivery evidence.
21. Customer navigation placement.
22. Payments/Cash boundary.
23. Messaging/Commerce interaction contract.

---

## 15. Evidence

| Direction | Classification |
|---|---|
| Customer separate from User | DOCUMENTED — D-002-bis |
| Order ≠ Sale | DOCUMENTED — D-007 |
| Sale confirmation/effects/cancellation direction | DOCUMENTED — D-008 |
| External payment provider + Mercado Pago priority | DOCUMENTED — D-011 |
| AR by Business / Customer | DOCUMENTED — D-012 |
| Purchases/AP | DOCUMENTED — D-015 |
| Fulfillment under Orders | DOCUMENTED — D-016 |
| Exact physical models | NOT DETERMINABLE |
| Exact states | NOT DETERMINABLE |
| Provider API details | NOT DETERMINABLE |
| Effect transaction mechanisms | NOT DETERMINABLE |

---

## 16. Closure

**Contracts 2.0 — Commerce: drafted.**

No decision, schema, invariant, test or implementation was created.

The next contract group is **Inventory**, with special attention to D-010/D-014 because D-010 has
verified implementation gaps that must not be silently converted into contract compliance.


---

# R5 Canonical Reconciliation — 2026-10-03

> Additive reconciliation against OR-B2/OR-B3 and the reconciled Commerce Specification. Historical contract text above is retained for traceability.

## R5-COMMERCE-001 — Business-authorized Order confirmation

Customer intent or confirmation may participate in the flow, but commercial confirmation is a Business-authorized action governed by permission ORDER_CONFIRM. Customer confirmation does not itself authorize the Business operation.

Order states, detailed transitions and technical enforcement remain OPEN.

## R5-COMMERCE-002 — Sale creation and immutability

A Sale is created at commercial confirmation of the Order; delivery is not the trigger. A confirmed Sale is immutable. Corrections occur through cancellation, reversal or refund mechanisms with traceability.

Exact states, authorization matrix, effects and transaction boundaries remain OPEN.

## R5-COMMERCE-003 — Product / BusinessProduct boundary

The canonical conceptual model is Product (global identity) → BusinessProduct (Business-specific commercial configuration). Business-specific stock and price are not global Product properties.

Exact field allocation and physical schema remain OPEN.

## R5-COMMERCE-004 — Cart boundary

A Cart may exist without a Customer. A Customer is required before an Order is created. Anonymous-cart persistence remains OPEN.

## R5-COMMERCE-005 — Inventory effect boundary

A confirmed Order reserves stock. Physical stock decrement is represented by a registered stock-out movement representing actual physical stock exit. Negative stock is prohibited. FEFO applies with expiry; FIFO without expiry.

The reservation mechanism, movement model, transaction boundaries and enforcement remain OPEN.

## R5-COMMERCE-006 — Fulfillment boundary

Fulfillment remains under Orders in the MVP and is not a top-level independent module. No Repartidor Membership Role is required for the MVP. Detailed fulfillment workflow remains OPEN.
