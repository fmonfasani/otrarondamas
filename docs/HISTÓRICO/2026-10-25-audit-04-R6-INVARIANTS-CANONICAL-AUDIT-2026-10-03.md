# WAPSELL — R6 INVARIANTS CANONICAL AUDIT
**Fecha:** 2026-10-03
**Estado:** AUDIT COMPLETE — RECONCILIATION REQUIRED
**Fase:** R6 — Invariants
**Scope:** baseline R5 + existing Invariants v0.1 + R5 canonical Contracts after OR-B2, OR-B3 and R4.
**Purpose:** determinar qué invariants existentes siguen siendo válidos, cuáles quedaron obsoletos o demasiado abiertos y qué propiedades nuevas pueden derivarse de los contratos reconciliados sin introducir decisiones ni mecanismos técnicos.

> Este documento es una auditoría documental. No aprueba invariants, no crea decisiones, no modifica schema, API, DTOs, permisos técnicos, migraciones, código, tests ni infraestructura.

---

## 1. Fuentes de autoridad

La revisión toma como fuentes, en orden de autoridad:

1. Owner rulings OR-B2 y OR-B3 y sus cierres/propagaciones.
2. R4 canonical reconciliation.
3. R5 Contracts Canonical Audit y bloques R5 de los Contracts.
4. Invariants v0.1 y su audit/reconciliation previo.
5. Baseline R5 de Invariants, únicamente como estado histórico.
6. Workshop/research 001–490 sólo como fuente secundaria/no normativa.

El resultado no eleva contenido histórico de menor autoridad por encima de decisiones cerradas.

---

## 2. Estado del baseline de Invariants

El repositorio contiene tres piezas relevantes:

- `BASELINE/00-R5-INVARIANTS-BASELINE-001-490.md`: baseline amplio, DRAFT / NOT APPROVED.
- `DERIVED/00-INVARIANTS-v0.1.md`: conjunto reducido de invariants derivados.
- `DERIVED/00-INVARIANTS-AUDIT-RECONCILIATION.md`: auditoría previa que ya corrigió dos formulaciones:
  - INV-SALE-002 quedó restringido a consistencia no parcial.
  - INV-FUL-001 quedó restringido a ownership de dominio.

**Conclusión:** no corresponde reemplazar el baseline histórico ni declarar aprobado `00-INVARIANTS-v0.1.md`. La revisión R6 debe actuar como reconciliación aditiva.

---

## 3. Resultado ejecutivo

### 3.1 Invariants que permanecen conceptualmente válidos

Los siguientes siguen respaldados por la autoridad vigente:

- User global.
- Business como frontera de tenancy.
- Membership como relación contextual User ↔ Business.
- Customer distinto de User.
- Customer Business-scoped.
- Inventory Business-owned.
- Inventory Business-scoped.
- No stock negativo.
- Order ≠ Sale.
- Sale confirmada inmutable.
- Consistencia no parcial de efectos aplicables de Sale.
- Cash Business-owned.
- Fulfillment pertenece a Orders.
- Messaging Business-scoped.
- Customer puede participar en Messaging sin User.
- Authorization contextual.
- Messaging no bypassa autorización del dominio subyacente.

Los últimos cuatro son cierres R5 que aún no están formalizados de forma completa en `00-INVARIANTS-v0.1.md`.

### 3.2 Invariants existentes que requieren reconciliación

Hay invariants del baseline R5 que no deben pasar directamente al conjunto canónico porque todavía contienen decisiones abiertas o contradicen cierres posteriores.

| Área | Invariant / propiedad | Disposición R6 |
|---|---|---|
| Authorization | Profile → Roles → Capabilities → Overrides | ELIMINAR COMO NORMATIVO / SUPERSEDED |
| Authorization | Authenticated User + Business + Membership + Role/Permission | CANDIDATE CERRADO CONCEPTUALMENTE |
| Membership | ACTIVE / INACTIVE; INACTIVE no opera | CANDIDATE CERRADO CONCEPTUALMENTE |
| User | Email normalizado globalmente único | CANDIDATE CERRADO CONCEPTUALMENTE |
| Customer/User | Link controlado; email solo no auto-link | CANDIDATE CERRADO CONCEPTUALMENTE |
| Product | Product global + BusinessProduct | CANDIDATE CERRADO CONCEPTUALMENTE |
| Cart | Cart anónimo permitido; Customer antes de Order | CANDIDATE CERRADO CONCEPTUALMENTE |
| Order | Confirmación comercial por acción autorizada `ORDER_CONFIRM` | CANDIDATE CERRADO CONCEPTUALMENTE |
| Sale | Sale nace en confirmación comercial | CANDIDATE CERRADO CONCEPTUALMENTE |
| Inventory | Order confirmado reserva stock | CANDIDATE CERRADO CONCEPTUALMENTE |
| Inventory | Salida física = stock-out movement | CANDIDATE CERRADO CONCEPTUALMENTE |
| Inventory | FEFO con vencimiento / FIFO sin vencimiento | CANDIDATE CERRADO CONCEPTUALMENTE |
| Location | Location genérica; MAIN mínimo; múltiples permitidas | CANDIDATE CERRADO CONCEPTUALMENTE |
| Cash | Operaciones sensibles requieren Permissions específicas | CANDIDATE, detalle técnico OPEN |
| Fulfillment | No requiere Repartidor como Membership Role MVP | CANDIDATE CERRADO CONCEPTUALMENTE |
| Messaging | MVP Messaging propio; no depende de WhatsApp | CANDIDATE CERRADO CONCEPTUALMENTE |
| Messaging | Conversation pertenece exactamente a un Business | CANDIDATE CERRADO CONCEPTUALMENTE |
| Messaging | Customer sin User permitido | CANDIDATE CERRADO CONCEPTUALMENTE |
| AI | AI inactiva en MVP | CANDIDATE / PRODUCT PRINCIPLE |

**Importante:** "CANDIDATE CERRADO CONCEPTUALMENTE" significa que la propiedad está suficientemente respaldada para ser propuesta como invariant; no significa que haya sido aprobada como nuevo ID ni que tenga implementación.

---

## 4. Corrección crítica de autoridad

El baseline R5 contiene:

> `INV-AUTH-004 — Effective authorization composition`

con:

`Profile → Roles → Capabilities → Individual Overrides`

Ese modelo quedó superseded por OR-B2.

La autoridad vigente es:

`Membership → Role → Permission`

con los controles conceptuales:

1. User autenticado.
2. Business objetivo.
3. Membership válida para ese Business.
4. Autorización mediante Role/Permission.

**Disposición:** no propagar INV-AUTH-004 como invariant. Debe conservarse únicamente como evidencia histórica del estado anterior.

No se define aquí:
- catálogo de Permissions;
- relación concreta Role → Permission;
- guards/middleware;
- claims;
- token/session;
- errores;
- MFA mechanism.

---

## 5. Identity & Tenancy

### 5.1 User global

**Disposición:** RETAIN.

El User sigue siendo identidad global y puede tener múltiples Memberships.

### 5.2 Membership contextual

**Disposición:** RETAIN.

Membership relaciona User y Business y el acceso a un Business no se extiende implícitamente a otro.

### 5.3 Membership lifecycle

**Disposición:** CANDIDATE.

Puede derivarse:

> Una Membership INACTIVE no autoriza operaciones Business-scoped.

El mecanismo de activación, revocación, actores y persistencia permanece OPEN.

### 5.4 Global normalized email uniqueness

**Disposición:** CANDIDATE.

Puede derivarse:

> Dos Users no pueden representar simultáneamente la misma identidad global bajo el mismo email normalizado.

No se define aquí el algoritmo de normalización ni la constraint física.

### 5.5 Customer/User

**Disposición:** RETAIN + CANDIDATE.

Customer sigue siendo distinto de User. Puede existir sin User y puede vincularse mediante asociación controlada.

No debe derivarse:

> email igual ⇒ auto-link.

El cierre OR-B3 explícitamente impide esa interpretación.

---

## 6. Authorization

La capa puede formalizar únicamente la frontera conceptual:

> Ninguna operación Business-scoped puede considerarse autorizada sólo por autenticación; debe existir Business objetivo, Membership válida y Role/Permission aplicable.

**Disposición:** CANDIDATE.

La invariancia no debe congelar una secuencia técnica concreta ni una implementación de guardas.

---

## 7. Commerce

### 7.1 Product / BusinessProduct

**Disposición:** CANDIDATE.

La identidad Product es global; la configuración comercial pertenece al contexto Business mediante BusinessProduct.

No se fija aquí la distribución física de campos.

### 7.2 Cart

**Disposición:** CANDIDATE.

Un Cart puede existir sin Customer.

Antes de crear un Order, debe existir Customer.

El Cart no debe mezclar contexto comercial entre Businesses.

### 7.3 Order / Sale

**Disposición:** RETAIN + CANDIDATE.

Se mantiene:

- Order y Sale son conceptos distintos.
- Customer intent no equivale a Business authorization.
- La confirmación comercial requiere la autorización Business correspondiente a `ORDER_CONFIRM`.
- Sale nace en la confirmación comercial.
- Sale confirmada es inmutable.

La matriz completa de estados y efectos de cancelación/reversión/refund sigue OPEN.

### 7.4 Fulfillment

**Disposición:** RETAIN.

Fulfillment pertenece a Orders.

No debe promoverse un Driver/Repartidor a Membership Role MVP. Los invariants históricos de aceptación de Driver, timeout o escalamiento no pueden considerarse cerrados porque el detalle funcional correspondiente permanece OPEN.

---

## 8. Inventory

### 8.1 Ownership and isolation

**Disposición:** RETAIN.

Inventory pertenece al Business y sus operaciones son Business-scoped.

### 8.2 Negative stock

**Disposición:** RETAIN.

El estado válido no puede violar la prohibición de stock negativo.

### 8.3 Reservation

**Disposición:** CANDIDATE.

Puede formalizarse:

> La confirmación de un Order genera la obligación funcional de reservar el stock correspondiente.

El mecanismo físico de reserva, locking y transacción permanece OPEN.

### 8.4 Physical decrement

**Disposición:** CANDIDATE.

La disminución física de stock debe estar representada por un movimiento de salida que corresponda a una salida física real.

No se define aquí cuándo ni cómo se persiste.

### 8.5 FEFO / FIFO

**Disposición:** CANDIDATE.

Cuando la especificación aplicable requiera selección por vencimiento, se aplica FEFO; sin vencimiento, FIFO.

No se deriva un algoritmo técnico de lotes.

### 8.6 Location

**Disposición:** CANDIDATE.

La unidad conceptual es Location:

- MAIN como mínimo;
- múltiples Locations permitidas;
- no se separan conceptualmente Branch y Warehouse.

No se define el modelo físico.

---

## 9. Payments, AR and Cash

### 9.1 Payment

Los invariants históricos de estado, idempotencia, reconciliation y provider lifecycle siguen parcialmente OPEN.

**Disposición:** no formalizar nuevos invariants más allá de trazabilidad ya respaldada.

### 9.2 AR

Business-scoped receivable puede mantenerse.

Credit formula, allocation y lifecycle detallado permanecen OPEN.

### 9.3 Cash

Cash es Business-scoped y conserva lifecycle conceptual.

El cierre R5 permite además una propiedad:

> Las operaciones sensibles de Cash requieren Permissions específicas.

**Disposición:** CANDIDATE.

No se inventan nombres de Permissions, role mappings, thresholds ni approvals.

### 9.4 Payment ↔ Cash

**Disposición:** BLOCKED.

No se formaliza una equivalencia ni una secuencia obligatoria entre Payment, AR collection y Cash hasta disponer del contrato correspondiente.

---

## 10. Messaging

### 10.1 Business boundary

**Disposición:** CANDIDATE.

Una Conversation comercial pertenece exactamente a un Business.

### 10.2 Customer without User

**Disposición:** CANDIDATE.

Un Customer puede participar en Messaging sin User.

La asociación Customer ↔ User es opcional y controlada.

### 10.3 Authorization reuse

**Disposición:** CANDIDATE.

Una acción comercial iniciada desde Messaging no puede obtener privilegios distintos de los que tendría el use case/domain subyacente.

### 10.4 Wapsell-owned MVP Messaging

**Disposición:** CANDIDATE / PRODUCT BOUNDARY.

El MVP no depende de WhatsApp.

No se deriva una prohibición de integraciones futuras.

### 10.5 AI

**Disposición:** CANDIDATE / PRODUCT BOUNDARY.

AI permanece inactiva en MVP.

No se formaliza ejecución autónoma, permisos, modelos, providers ni activation criteria.

---

## 11. Properties that remain blocked

No deben convertirse en invariants cerrados todavía:

1. Exact authorization algorithm.
2. Permission catalogue and Role → Permission matrix.
3. MFA technical mechanism.
4. Business Switch mechanism.
5. Token/session representation.
6. Physical tenant isolation mechanism.
7. Exact Order/Sale state machines.
8. Cancellation/reversal/refund effect matrix.
9. Payment state/reconciliation lifecycle.
10. Payment ↔ Cash effects.
11. AR allocation and credit formula.
12. Cash state machine and adjustment mechanics.
13. Inventory reservation transaction boundaries.
14. Physical Location model.
15. Messaging physical model, realtime, retention and notifications.
16. Return state machine.
17. Refund state machine.
18. Delivery timeout/escalation rules.
19. AI execution model.
20. External channel implementation.

---

## 12. Layer-boundary controls

R6 must not turn the following into invariants:

| Statement | Treatment |
|---|---|
| Prisma model / database constraint | Architecture/implementation |
| JWT claim | Authentication implementation |
| Guard/middleware | Authorization implementation |
| REST/GraphQL endpoint | Contract/API |
| Event name/payload | Event contract |
| Transaction boundary | Architecture/implementation unless explicitly domain-ruled |
| Exact permission identifier | Authorization contract |
| UI visibility | Experience; not authorization |
| Sidebar/navigation structure | Experience |
| WebSocket/SSE/polling | Messaging implementation |
| Redis/broker/queue | Infrastructure |
| Migration script | Transformation/implementation |
| Current code behavior | AS-IS evidence, not TO-BE compliance |

---

## 13. Proposed reconciliation set

The following properties are sufficiently supported to become the next canonical invariant candidates, subject to owner/document review:

### Identity/Tenancy
- Global User identity.
- Business-scoped Membership.
- INACTIVE Membership cannot operate.
- Business isolation.
- Normalized email globally unique.
- Customer distinct from User.
- Controlled Customer/User association.

### Authorization
- Authentication alone does not authorize Business operations.
- Authorization is contextual to Business + Membership + Role/Permission.

### Commerce
- Product global identity vs BusinessProduct commercial context.
- Anonymous Cart allowed.
- Customer required before Order.
- Order ≠ Sale.
- Commercial confirmation requires `ORDER_CONFIRM`.
- Sale born at commercial confirmation.
- Confirmed Sale immutable.
- Corrections do not silently mutate confirmed Sale.

### Inventory
- Business-owned inventory.
- Negative stock prohibited.
- Confirmed Order reserves stock.
- Physical decrement represented by actual stock-out movement.
- FEFO/FIFO.
- Generic Location with MAIN minimum.

### Cash
- Business-scoped Cash.
- Sensitive Cash operations require specific Permissions.

### Messaging
- Conversation exactly one Business.
- Customer may participate without User.
- Messaging does not bypass underlying domain authorization.
- MVP Messaging does not depend on WhatsApp.
- AI inactive in MVP.

### Fulfillment
- Fulfillment belongs to Orders.
- Repartidor is not an MVP Membership Role.

**No new IDs are assigned by this audit.**

---

## 14. Traceability status

| Layer | State |
|---|---|
| Owner rulings OR-B2 / OR-B3 | DOCUMENTED / OWNER-RULED |
| R4 reconciliation | DOCUMENTED |
| R5 Contracts | DRAFT / RECONCILED |
| Existing Invariants v0.1 | DRAFT / NOT APPROVED |
| R6 canonical invariant set | NOT CREATED |
| Tests/Evals | NOT CREATED |
| Schema | NOT MODIFIED |
| Code | NOT MODIFIED |
| Migration | NOT EXECUTED |
| Deploy | NOT EXECUTED |

---

## 15. R6 gate

**R6 audit result: READY FOR CONTROLLED INVARIANT RECONCILIATION, NOT YET READY FOR TEST DERIVATION.**

Before Tests/Evals:

- [ ] assign/reconcile canonical invariant IDs;
- [ ] preserve historical invariant IDs and wording where useful for traceability;
- [ ] explicitly mark superseded historical invariants;
- [ ] propagate only properties supported by OR-B2/OR-B3/R4/R5;
- [ ] keep all OPEN details outside the normative invariant set;
- [ ] re-read the resulting canonical invariant document;
- [ ] then derive Tests/Evals.

No code/schema/migration/test/deploy change is implied.

---

## 16. Conclusion

R6 confirms that the existing invariant work is structurally usable, but the canonical set is behind the current Contracts layer.

The main reconciliation is not to invent a new model. It is to replace stale historical assumptions with the already closed conceptual rules from OR-B2, OR-B3, R4 and R5.

The most important correction is authorization:

`Membership → Role → Permission`

replaces the obsolete historical:

`Profile → Roles → Capabilities → Individual Overrides`

The next controlled action is to reconcile the canonical Invariants document itself, preserving history and without deriving technical implementation details.
