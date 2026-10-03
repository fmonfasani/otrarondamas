# WAPSELL — R4 CONTRACTS — BASELINE

**Version:** v0.1  
**Fecha:** 2026-10-03  
**Estado:** DRAFT / NOT APPROVED  
**Fase:** R4 — CONTRACTS  
**Fuentes:** R1 Requirements Reconciled 001–490 + R2 Specialized Specs + R3 Architecture + Decision Register + Workshop/Reconciliation 001–490

> Este documento establece la estructura contractual necesaria para Wapsell a nivel funcional y arquitectónico. No autoriza por sí mismo endpoints concretos, DTOs, tablas, Prisma models, JWT claims, event payloads, migraciones, código, deploys ni cambios destructivos.

---

## 1. Objetivo

R4 transforma los requisitos y fronteras arquitectónicas ya relevados en **contratos explícitos** entre módulos, actores y operaciones.

Un contrato define, como mínimo:

- quién puede ejecutar una operación;
- sobre qué Business/Context;
- qué precondiciones deben cumplirse;
- qué resultado observable produce;
- qué efectos de negocio deben preservarse;
- qué hechos deben quedar auditables;
- qué partes permanecen OPEN.

R4 no convierte automáticamente los puntos OPEN de R1–R3 en decisiones.

---

## 2. Regla de autoridad

La cadena vigente es:

`WORKSHOP → RECONCILIATION → REQUIREMENTS → SPECIALIZED SPECS → ARCHITECTURE → CONTRACTS → INVARIANTS → TESTS/EVALS → PLAN → TASKS → IMPLEMENTATION`

Los Contracts de este documento son **baselines contractuales propuestas** derivadas de material previo.

Cuando existe un blocker funcional, el contrato debe expresarlo como `OPEN / BLOCKED` y no inventar una semántica.

---

## 3. Tipos de contrato

### C-UX — Experience Contract
Define qué puede observar/iniciar el usuario desde una Space o superficie.

### C-AUTH — Authorization Contract
Define identidad, Business Context, Membership y capability requeridos.

### C-DOM — Domain Contract
Define operación y reglas funcionales de un dominio.

### C-XDOM — Cross-Domain Contract
Define interacción entre dominios.

### C-EVENT — Event/Observation Contract
Define hechos de negocio observables sin decidir todavía transporte técnico.

### C-AUDIT — Audit Contract
Define trazabilidad mínima.

### C-EXT — External Provider Contract
Define frontera con proveedores externos.

### C-MIG — Migration Contract
Define coexistencia y compatibilidad durante la transformación AS-IS → TO-BE.

---

# 4. Contrato transversal de Business Context

**ID:** C-AUTH-001  
**Estado:** PARTIAL / OPEN DETAILS

Toda operación Business-scoped debe ejecutarse bajo:

`Authenticated User + Target Business + Valid Membership + Effective Authorization`

### Precondiciones

1. User autenticado.
2. Business objetivo identificado.
3. Membership válida para ese Business.
4. Capability/authorization suficiente para la operación.

### Resultado

La operación sólo puede acceder o modificar recursos pertenecientes al Business Context autorizado.

### No decidido

- representación técnica del Context;
- session/token claims;
- mecanismo de tenant isolation;
- middleware/guard/interceptor concreto.

**Fuentes:** D-005, D-006, R3 §6–8.

---

# 5. Identity & Tenancy Contracts

## C-ID-001 — Global User

**Tipo:** C-DOM  
**Estado:** CANONICAL / STABLE

Un User es identidad global de Wapsell.

Un mismo User puede mantener múltiples Memberships y relaciones comerciales distintas.

## C-ID-002 — Membership

**Tipo:** C-DOM / C-AUTH  
**Estado:** PARTIAL

Membership representa la pertenencia User ↔ Business y habilita autorización contextual.

### Debe preservar

- Business objetivo;
- User;
- estado de Membership;
- roles/capabilities efectivos.

### OPEN

Lifecycle técnico completo, actores autorizados para cada transición y representación física.

## C-ID-003 — Business Switching

**Tipo:** C-AUTH  
**Estado:** OPEN TECHNICAL

Un User con Membership válida puede cambiar el Business activo sin reautenticación cuando las condiciones de acceso lo permiten.

El mecanismo técnico permanece OPEN.

---

# 6. Authorization Contracts

## C-AUTH-010 — Effective Authorization

**Estado:** BLOCKED / OWNER DECISION REQUIRED

La autorización debe evaluarse en contexto Business/Membership.

El workshop introduce:

`Profile → Roles atomizados → Capabilities`

y también capabilities individuales/overrides.

### Debe cerrarse antes de contratos ejecutables

- precedencia;
- composición;
- overrides individuales;
- dependencia entre roles;
- comportamiento de perfiles inactivos.

No se define una precedencia por inferencia.

## C-AUTH-011 — Messaging → ERP Authorization

**Estado:** STABLE AT PRINCIPLE LEVEL

Una acción ERP iniciada desde Messaging debe utilizar la autorización requerida por el use case ERP subyacente.

La UI de Messaging no puede sustituir la autorización del dominio.

---

# 7. Messaging Contracts

## C-MSG-001 — Conversation Access

**Estado:** PARTIAL

Un participante autorizado puede acceder a una conversación conforme a las reglas de participación y capability.

Las conversaciones Business pueden involucrar múltiples vendedores y participantes operativos.

## C-MSG-002 — ERP Action From Conversation

**Estado:** STABLE AT ARCHITECTURAL LEVEL

Flujo contractual:

`Message/Interaction → Authorization → Application Use Case → Domain Rule → Persistence/Transaction → Observable Event`

Messaging no debe modificar directamente persistence de otros dominios.

## C-MSG-003 — System Message

**Estado:** FUNCTIONAL BASELINE

Los hechos automáticos del sistema deben distinguirse de mensajes generados por usuarios.

## C-MSG-004 — Message History

**Estado:** PARTIAL

Ediciones y eliminaciones deben conservar trazabilidad observable conforme al workshop.

Retention y modelo técnico permanecen OPEN.

---

# 8. Catalog & Product Contracts

## C-CAT-001 — Canonical Product Identity

**Estado:** PARTIAL

La identidad canónica del Product se diferencia de los datos comerciales Business-specific.

## C-CAT-002 — Variant Commercial Data

**Estado:** FUNCTIONAL

Variant puede tener stock y precio propios.

## C-CAT-003 — Homologation

**Estado:** BLOCKED

Estados relevados:

`PROPOSED → VALIDATED → RELIABLE → CONSOLIDATED`

La transición y auto-confirmación dependen de thresholds aún OPEN.

No se define algoritmo de matching.

---

# 9. Cart Contracts

## C-CART-001 — Persistent Business Cart

**Estado:** FUNCTIONAL BASELINE

Cart pertenece al User en contexto Business y puede utilizarse desde Messaging o Catalog.

## C-CART-002 — Cart → Order

**Estado:** BLOCKED

La transición requiere resolver conjuntamente:

- Customer confirmation;
- payment;
- credit/AR;
- stock reservation;
- Order state.

No se fija una transición técnica mientras esas semantics permanezcan abiertas.

---

# 10. Order & Sale Contracts

## C-ORD-001 — Order

**Estado:** BLOCKED IN PARTS

Order representa solicitud/proceso/preparación/entrega.

Debe conservar:

- Business;
- Customer;
- items;
- ubicación/origen;
- estado;
- historial;
- relación con conversación cuando exista.

## C-ORD-002 — Customer Confirmation

**Estado:** FUNCTIONAL BASELINE

Customer confirma el Order antes de continuar el flujo correspondiente.

## C-ORD-003 — Order → Sale

**Estado:** BLOCKED

El workshop contiene conversión automática al estado de entrega correspondiente, pero el estado exacto y precondiciones completas deben formalizarse.

## C-SALE-001 — Confirmed Sale Immutability

**Estado:** STABLE

Una Sale confirmada no se edita ni elimina.

Correcciones se realizan mediante operaciones explícitas.

## C-SALE-002 — Sale Cancellation

**Estado:** BLOCKED

La cancelación debe:

- ser explícita;
- estar autorizada;
- conservar actor, razón y timestamp;
- revertir los efectos aplicables de forma consistente.

La matriz actor/estado/confirmación de 091/092/389 permanece pendiente.

---

# 11. Inventory Contracts

## C-INV-001 — Business Inventory Boundary

**Estado:** STABLE

Inventory pertenece exclusivamente al Business.

No existe stock global compartido entre Businesses.

## C-INV-002 — Stock Availability

**Estado:** BLOCKED

El modelo funcional distingue:

- physical stock;
- reserved stock;
- available stock.

Debe cerrarse el momento exacto de reserva/descuento.

## C-INV-003 — No Negative Stock

**Estado:** STABLE AS FUNCTIONAL INVARIANT CANDIDATE

Una operación no puede producir stock negativo.

La formulación formal pertenece a R5 Invariants.

## C-INV-004 — Stock Adjustment

**Estado:** FUNCTIONAL

Cada ajuste requiere razón y responsable y conserva trazabilidad.

## C-INV-005 — Receipt Immutability

**Estado:** FUNCTIONAL

Una recepción aprobada no se modifica para corregir diferencias; las correcciones se realizan mediante una operación explícita de ajuste.

---

# 12. Purchase & Supplier Contracts

## C-PUR-001 — Purchase Order

**Estado:** PARTIAL

Debe existir trazabilidad entre:

Supplier → Quote/Agreement → Purchase Order → Confirmation → Receipt → Payable

Los estados exactos de PO permanecen por formalizar.

## C-PUR-002 — Receiving

**Estado:** FUNCTIONAL BASELINE

La recepción registra cantidades reales y preserva diferencias respecto del PO.

Debe soportar recepción parcial.

## C-PUR-003 — Accounts Payable

**Estado:** FUNCTIONAL BASELINE

Una obligación con Supplier puede permanecer pendiente y recibir pagos posteriores con trazabilidad.

---

# 13. Pricing & Promotion Contracts

## C-PRICE-001 — Effective Price

**Estado:** PARTIAL

El precio aplicable debe poder considerar Business, Branch/Location, Price List, Customer, Quantity y vigencia temporal según corresponda.

## C-PRICE-002 — Promotions

**Estado:** BLOCKED

La combinación y precedencia entre promociones aún no están suficientemente definidas.

No implementar precedence por inferencia.

---

# 14. AR & Credit Contracts

## C-AR-001 — Business-Scoped Receivable

**Estado:** FUNCTIONAL BASELINE

AR pertenece al Business y se asocia al Customer correspondiente.

## C-AR-002 — Payment Application

**Estado:** FUNCTIONAL / PARTIAL

Un pago puede aplicarse a una o varias deudas y puede existir aplicación automática por antigüedad.

La semántica completa de aplicación/reversión debe formalizarse.

## C-AR-003 — Credit Limit

**Estado:** BLOCKED

Debe reconciliarse:

- comportamiento del límite ante deuda existente;
- disponibilidad de crédito;
- efecto de una nueva compra;
- suspensión de crédito.

El workshop 198 y 229 no deben combinarse por inferencia.

---

# 15. Payments & Cash Contracts

## C-PAY-001 — External Payment

**Estado:** FUNCTIONAL BASELINE

Los pagos externos deben conservar estado y external provider identifier.

Mercado Pago mantiene prioridad histórica, sin imponer implementación concreta en R4.

## C-PAY-002 — Payment Reversal

**Estado:** FUNCTIONAL BASELINE

Una reversión debe conservar historial y restituir los efectos financieros correspondientes cuando aplique.

## C-CASH-001 — Cash Lifecycle

**Estado:** FUNCTIONAL BASELINE

`Apertura → Operaciones/Movimientos → Arqueo → Cierre`

Cada movimiento debe conservar origen, monto, método y responsable.

## C-CASH-002 — Reconciliation

**Estado:** FUNCTIONAL BASELINE

El cierre compara esperado vs contado y registra diferencias.

---

# 16. Fulfillment Contracts

## C-FUL-001 — Assignment

**Estado:** FUNCTIONAL BASELINE

Business puede seleccionar un driver sugerido o manualmente seleccionado.

El driver debe aceptar antes de iniciar el viaje.

## C-FUL-002 — Delivery Progress

**Estado:** FUNCTIONAL BASELINE

El customer puede observar el progreso de delivery mediante eventos de Order/conversation.

## C-FUL-003 — Delivery Confirmation

**Estado:** BLOCKED

Se debe formalizar qué ocurre cuando:

`Driver = DELIVERED`

pero

`Customer = NOT CONFIRMED`

El workshop establece contacto al Customer y uso posible de código/PIN, pero timeout, canal y escalamiento están OPEN.

## C-FUL-004 — Pickup

**Estado:** PARTIAL

Customer puede elegir pickup según el relevamiento; Business determina la ubicación concreta según la reconciliación.

La redacción final debe cerrarse en la Specialized Spec.

---

# 17. Returns Contracts

## C-RET-001 — Return Independence

**Estado:** FUNCTIONAL BASELINE

Return es una operación independiente de la Sale y no edita la Sale original.

## C-RET-002 — Inspection

**Estado:** FUNCTIONAL BASELINE

La mercadería retornada puede quedar en cuarentena y no estar disponible hasta completar inspección.

## C-RET-003 — Return State Machine

**Estado:** BLOCKED

Deben cerrarse formalmente estados, transiciones, actores y condiciones de aprobación/rechazo.

---

# 18. Refund Contracts

## C-REF-001 — Refund Distinct From Payment

**Estado:** FUNCTIONAL BASELINE

Refund y Payment son operaciones distintas.

## C-REF-002 — Refund Linkage

**Estado:** FUNCTIONAL BASELINE

Refund debe poder vincularse con:

- Return;
- Sale;
- Payment original cuando exista.

## C-REF-003 — Refund Maximum

**Estado:** FUNCTIONAL BASELINE / R5 CANDIDATE

Debe impedirse superar el importe máximo reembolsable, incluyendo el tratamiento de descuentos/promociones y devoluciones parciales.

## C-REF-004 — Refund State Machine

**Estado:** BLOCKED

Deben formalizarse:

`PENDING / CONFIRMED / REJECTED / CANCELLED`

junto con actores, transiciones y efectos financieros.

---

# 19. Notifications Contracts

## C-NOT-001 — Notification Trigger

**Estado:** PARTIAL

Las notificaciones deben originarse en hechos de negocio relevantes y respetar audience/capability policies.

## C-NOT-002 — Deduplication

**Estado:** FUNCTIONAL BASELINE

Las notificaciones duplicadas deben evitarse conforme al evento originante.

Retention, retry, provider y canal permanecen OPEN.

---

# 20. Audit Contracts

## C-AUDIT-001 — Business Auditability

**Estado:** STABLE

Las operaciones relevantes deben ser auditables.

Mínimos:

- actor;
- timestamp;
- Business Context cuando corresponda;
- operación;
- cambio/estado;
- razón cuando aplique.

## C-AUDIT-002 — Audit Isolation

**Estado:** STABLE

Un usuario no debe consultar auditoría de otro Business salvo que tenga autorización correspondiente.

SaaS Admin puede consultar Businesses dentro de su ámbito autorizado.

## C-AUDIT-003 — Immutable Audit

**Estado:** FUNCTIONAL BASELINE

Audit no debe ser alterable por usuarios normales.

---

# 21. Business & SaaS Administration Contracts

## C-BIZ-001 — Business Creation

**Estado:** BLOCKED / GOVERNANCE OPEN

Relevamiento:

1. User solicita creación.
2. Wapsell aprueba.
3. Business se crea.
4. Creator se convierte en Owner.
5. Business no existe sin Owner.

El workflow técnico y criterios de aprobación permanecen OPEN.

## C-BIZ-002 — Business Lifecycle

**Estado:** PARTIAL

Business posee estado propio.

Una Business inactiva/suspendida afecta Memberships y uso de Messaging según reglas relevadas.

## C-BIZ-003 — SaaS Admin

**Estado:** PARTIAL

SaaS Admin puede administrar/auditar Businesses sin necesidad de Membership comercial ordinaria, dentro de su ámbito autorizado.

El boundary exacto de SaaS Admin permanece OPEN.

---

# 22. Brand & Experience Contracts

## C-BRAND-001 — Business Brand

**Estado:** STABLE AT PRODUCT PRINCIPLE

Business puede configurar su Brand sobre el Wapsell Design System.

Customer-facing experience debe presentar principalmente la identidad del Business.

## C-BRAND-002 — Navigation Context

**Estado:** PARTIAL

La navegación depende de:

`User + Business + Membership + Effective Capabilities`

La navegación nunca sustituye authorization.

---

# 23. Cross-Domain Contracts críticos

| ID | Interacción | Estado |
|---|---|---|
| X-001 | Messaging → Orders | PARTIAL |
| X-002 | Messaging → Catalog/Cart | PARTIAL |
| X-003 | Orders → Inventory | BLOCKED stock semantics |
| X-004 | Orders → Payments/AR | BLOCKED |
| X-005 | Orders → Fulfillment | PARTIAL |
| X-006 | Orders → Sales | BLOCKED |
| X-007 | Sales → Cash/Payments/AR | BLOCKED by financial semantics |
| X-008 | Purchases → Inventory | PARTIAL |
| X-009 | Purchases → AP | PARTIAL |
| X-010 | Returns → Inventory | BLOCKED by return lifecycle |
| X-011 | Returns → Refunds | BLOCKED |
| X-012 | Refunds → Cash/Payments/AR | BLOCKED |
| X-013 | Domain events → Notifications | PARTIAL |
| X-014 | All critical mutations → Audit | PARTIAL |
| X-015 | Business Context → all Business-scoped domains | OPEN technical representation |

---

# 24. Event contracts

R4 define **event intent**, no transporte.

Eventos funcionales candidatos:

- MembershipActivated
- MembershipDeactivated
- BusinessCreated
- OrderConfirmed
- OrderPrepared
- OrderReady
- OrderDelivered
- SaleConfirmed
- SaleCancelled
- StockReserved
- StockReleased
- StockAdjusted
- PurchaseReceived
- PaymentConfirmed
- PaymentRejected
- PaymentReversed
- ReturnRequested
- ReturnApproved
- ReturnReceived
- ReturnInspected
- RefundRequested
- RefundConfirmed
- RefundRejected
- RefundCancelled
- MembershipChanged
- PermissionChanged

**Estado:** EVENT NAMES ARE PROPOSED / NOT CONTRACTUALLY FROZEN.

No se define todavía payload, versioning, transport, queue, broker ni delivery guarantee.

---

# 25. External Provider Contracts

## C-EXT-001 — Payment Provider Adapter

**Estado:** DIRECTIONAL

La integración de pagos externos debe aislarse mediante una frontera de provider adapter.

El dominio no debe depender de SDK/provider-specific semantics.

## C-EXT-002 — Authentication Providers

Google/OAuth puede permanecer como provider externo detrás de una frontera de authentication.

No se define en R4 token format ni claims.

## C-EXT-003 — Messaging Provider

Wapsell Messaging MVP no depende de WhatsApp.

No se autoriza agregar una dependencia de WhatsApp como requisito de MVP por este documento.

---

# 26. Migration Contracts

## C-MIG-001 — Incremental Coexistence

**Estado:** CANONICAL DIRECTION

La transformación debe ser incremental, con coexistencia temporal y acotada.

## C-MIG-002 — Legacy Sessions/Tokens

**Estado:** CANONICAL DIRECTION

Durante la transición puede existir compatibilidad temporal con sesiones/tokens legacy.

Al finalizar la transición, las sesiones legacy deben invalidarse y requerirse nuevo login.

El mecanismo exacto permanece técnico/OPEN.

## C-MIG-003 — Empresa → Business

**Estado:** DIRECTIONAL / TECHNICAL OPEN

La transformación aplica también al modelo persistente.

El diseño físico de migración permanece fuera de R4.

---

# 27. Contract blockers que deben cerrarse antes de R5

Los siguientes puntos impiden convertir determinados Contracts en invariants ejecutables:

1. **Stock:** descuento vs reserva y momento exacto.
2. **Order + Payment + AR:** condiciones de existencia/confirmación.
3. **Order → Sale:** estado y precondiciones exactas.
4. **Cancellation:** matriz actor/estado/confirmación.
5. **Homologation:** thresholds y auto-confirmación.
6. **Credit:** fórmula y efecto de nueva compra.
7. **Authorization:** Profile → Role → Capability → Override.
8. **Membership:** lifecycle completo y actores.
9. **Pickup:** selección de modalidad vs ubicación concreta.
10. **Delivery confirmation:** timeout/canal/escalamiento.
11. **Return:** state machine.
12. **Refund:** state machine y efectos.
13. **Customer ↔ User:** matching automático.
14. **Business Context:** representación técnica.
15. **Tenant isolation:** mecanismo técnico.
16. **Event delivery:** garantía y estrategia técnica.

R5 puede formalizar invariants estables mientras estos blockers permanecen explícitos, pero no debe inventar reglas para cerrarlos.

---

# 28. R4 — No decide

R4 no decide:

- schema físico;
- Prisma models;
- API routes;
- DTOs;
- OpenAPI exacto;
- JWT claims;
- session storage;
- RLS;
- middleware/guards concretos;
- event payloads;
- broker/queue;
- retry semantics técnicas;
- cloud topology;
- deployment;
- migration scripts;
- microservices;
- código.

---

# 29. Evidencia

| Elemento | Estado |
|---|---|
| Workshop 001–490 | DOCUMENTADO / PERSISTIDO |
| Reconciliation | DOCUMENTADO / PERSISTIDO |
| R1 Requirements | DOCUMENTADO / DRAFT |
| R2 Specialized Specs | DOCUMENTADO / DRAFT |
| R3 Architecture | DOCUMENTADO / DRAFT |
| R4 Contracts | THIS DOCUMENT / DRAFT |
| Invariants | NOT CREATED |
| Tests/Evals | NOT CREATED |
| Schema | NOT MODIFIED |
| Code | NOT MODIFIED |
| Migration | NOT EXECUTED |
| Deploy | NOT EXECUTED |

**R4 STATUS: CONTRACT BASELINE CREATED — DRAFT / NOT APPROVED.**

## 30. Próxima fase

La siguiente fase es **R5 — INVARIANTS**.

R5 debe tomar únicamente Contracts suficientemente estables y convertir sus reglas de consistencia en invariants verificables. Los blockers funcionales seguirán marcados OPEN y no deben resolverse por inferencia.
