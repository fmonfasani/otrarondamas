# WAPSELL — OWNER WORKSHOP 001–490 — RECONCILIACIÓN

**Fecha:** 2026-10-03  
**Fuente primaria:** `04-DECISIONS/01-OWNER-WORKSHOP-RELEVAMIENTO-001-490.md`  
**Fuentes de contraste:** Decision Register canónico, AS-IS Identity/Tenancy, Requirements & Gap Definition, TO-BE Overview y Technical Specification Baseline.  
**Estado:** RECONCILIATION ARTIFACT — NO PROPAGA AUTOMÁTICAMENTE A SPEC/CONTRACTS/INVARIANTS/CODE.

---

## 1. Propósito

Este documento convierte el workshop 001–490 en un conjunto reconciliado de categorías de trabajo sin inventar decisiones nuevas.

Cada respuesta del workshop queda clasificada conceptualmente como:

- **C1 — YA CANÓNICA:** la decisión ya existe en la capa canónica y el workshop la confirma o detalla.
- **C2 — DECISIÓN FUNCIONAL NUEVA:** el workshop agrega una definición funcional que no estaba cerrada en el corpus canónico.
- **C3 — DETALLE/REGLA DERIVADA:** el workshop concreta una decisión ya existente sin cambiar su dirección.
- **C4 — OPEN / PRECISAR:** la respuesta no permite cerrar el comportamiento necesario para Contracts/Invariants.
- **C5 — TENSIÓN / RECONCILIACIÓN REQUERIDA:** existen dos o más respuestas que no pueden transformarse directamente en una sola regla sin aclaración.
- **C6 — CAMBIO DE TERMINOLOGÍA / MODELO:** el workshop introduce una estructura conceptual que debe reconciliarse con la terminología canónica antes de promoverla.

Importante: **C2 no significa todavía “aprobado en Decision Register”**. Significa “decisión funcional capturada en workshop que debe promoverse mediante el flujo documental”.

---

# 2. Resultado global

## 2.1 Estado

El workshop queda reconciliado en cinco grandes grupos:

| Grupo | Tratamiento |
|---|---|
| C1 — Ya canónica | No duplicar; conservar trazabilidad al Decision Register |
| C2 — Decisión funcional nueva | Promover a Requirements / Specialized Specs y, cuando corresponda, a Decision Register |
| C3 — Detalle derivado | Incorporar en la SPEC correspondiente, sin crear una decisión duplicada |
| C4 — Open | Mantener abierto hasta definición suficiente |
| C5 — Tensión | No implementar; resolver mediante reconciliación explícita |
| C6 — Cambio conceptual | Reconciliar terminología/modelo antes de contratos |

El workshop es suficientemente completo para **cerrar el relevamiento funcional como fuente primaria**, pero no para cerrar todos los contratos técnicos.

---

# 3. Reglas de reconciliación aplicadas

1. Una decisión existente en el Decision Register no se duplica.
2. Una respuesta que sólo concreta una decisión existente se trata como detalle funcional.
3. Una respuesta que introduce una regla observable nueva se trata como requisito funcional nuevo.
4. Una contradicción no se resuelve por inferencia.
5. Una respuesta narrativa prevalece sobre una lectura simplificada de A/B/C cuando ambas se refieren al mismo punto.
6. Una respuesta posterior puede precisar una respuesta anterior, pero si cambia el comportamiento debe registrarse como supersession/reconciliation.
7. El workshop no autoriza schema, endpoint, JWT claims, migrations, infraestructura ni implementación.
8. Ningún punto marcado C4/C5 debe convertirse directamente en Contract o Invariant.
9. Los puntos que afectan dinero, stock, autorización, identidad o estados deben tener definición suficientemente determinista antes de implementación.
10. La trazabilidad original 001–490 se conserva.

---

# 4. Reconciliación por bloques

## 4.1 Identity, Users, Contacts y Business — 001–060

### Estado

La mayor parte del bloque es **C2/C3**.

Las decisiones 001, 002, 003, 005, 021, 041, 042, 051, 055, 057, 060, 271–290, 302–330 concretan Identity, Membership, Business y Authorization.

### Reconciliación canónica

- 001 confirma Membership `ACTIVA ↔ INACTIVA`, con reactivación.
- 002 define el catálogo funcional inicial de roles.
- 003 define capacidades atómicas.
- 271–273 agregan el concepto de Profiles y el encadenamiento:
  **Profile → Roles atomizados → Capabilities**.
- 274–275 permiten overrides individuales.
- 291–299 consolidan Profiles reutilizables, inactivables y roles reutilizables.

### Resultado

**C6 — CAMBIO CONCEPTUAL A RECONCILIAR**

La documentación canónica previa utiliza principalmente:

`Role → Permission`

El workshop introduce:

`Profile → Role → Capability`

No se debe borrar la terminología anterior ni asumir equivalencia automática.

### Acción requerida

Crear una definición funcional de autorización que determine explícitamente:

- qué representa Profile;
- qué representa Role;
- qué representa Capability/Permission;
- precedencia;
- override individual;
- dependencias;
- lifecycle.

Hasta entonces, Contracts de autorización deben permanecer abiertos.

---

## 4.2 Messaging y Conversations — 004–040, 059–100

### Estado

**C2 — DECISIÓN FUNCIONAL NUEVA**, apoyada por la dirección canónica de Messaging.

El workshop define:

- Spaces;
- Contacts;
- Groups;
- conversaciones 1:1;
- conversaciones grupales;
- Business↔Business;
- participantes mixtos;
- asignación;
- entrada de repartidor;
- salida de vendedor;
- transferencia de conversaciones;
- acciones ERP;
- eventos ERP;
- carts;
- Orders;
- continuidad postventa.

### Canonicalización

La regla canónica:

> Messaging = interfaz comercial central.

se conserva.

Las respuestas 006–040 y 059–100 pasan a ser **requisitos funcionales de Messaging**, no nuevas decisiones de arquitectura.

### Punto particular

004 define Spaces:

- Negocios
- Mayoristas
- Contactos
- Grupos
- Repartidores

El concepto de Space debe tratarse como **UX/navigation model**, no como entidad de dominio automáticamente.

---

# 5. Orders / Payments / Sales — 071–100

Este bloque contiene la principal concentración de tensiones.

## 5.1 Order confirmation

076 quedó OPEN inicialmente.

087 posteriormente define:

**Customer confirma Order.**

Por tanto:

**076 → SUPERSEDED / RESOLVED BY 087**

El contrato debe usar 087 como regla posterior.

## 5.2 Stock al crear Order vs reserva

077:
- stock se descuenta al crear Order.

163:
- reserva al confirmar Order.

161–165:
- existe stock físico, disponible y reservado;
- reserva ocurre al confirmar;
- stock físico incluye reservado.

### Estado

**C5 — TENSIÓN REQUIERE RECONCILIACIÓN.**

No puede inferirse si 077 significa:

- descuento físico;
- decremento de disponible;
- reserva;
- comportamiento legacy;
- simplificación conversacional.

### Acción

Definir una única semántica formal:

`physical = available + reserved`

y especificar exactamente qué cambia al:

- crear cart;
- crear Order;
- confirmar Order;
- cancelar Order;
- entregar Order;
- convertir a Sale.

No implementar esta parte desde la lectura literal de 077.

## 5.3 Payment obligatorio vs AR

078:
- Order no existe sin pago.

D-012 / 181–230:
- existe AR;
- existen ventas parcialmente/no canceladas;
- existen condiciones de crédito.

### Estado

**C5 — TENSIÓN REQUIERE RECONCILIACIÓN.**

Posible explicación conceptual, NO decisión:
Order podría exigir un mecanismo de pago autorizado mientras Sale/AR representan otro nivel operativo.

Eso debe definirse en SPEC, no asumirse.

## 5.4 Order → Sale

079:
- depende del Business.

099:
- Delivered Order → Sale automático.

381:
- Delivered Order → Sale automático.

### Resultado

**C5 — REGLA POSTERIOR MÁS ESPECÍFICA**

099 y 381 establecen la regla del flujo de delivery.

Debe especificarse también qué ocurre con:

- pickup;
- POS/in-person Sale;
- cancelación;
- pago pendiente;
- AR.

079 no debe permanecer como regla ambigua dentro del mismo flujo.

## 5.5 Cancelaciones

091:
- Customer puede cancelar antes de delivery.

092:
- Seller cancela con confirmación Customer.

388:
- Customer puede solicitar cancelación desde conversación.

389:
- fue interpretada como cancelación automática.

### Resultado

**C5 — NO CERRADO**

389 no debe promoverse como “cancelación automática” sin una matriz de estados.

Se necesita:

| Actor | Estado | Acción | Requiere confirmación | Resultado |
|---|---|---|---|---|
| Customer | ... | ... | ... | ... |
| Seller | ... | ... | ... | ... |
| Business/Admin | ... | ... | ... | ... |

---

# 6. Catalog / Product / Homologation — 101–140

### Resultado

Principalmente **C2/C3**.

Quedan consolidadas:

- Product global/canónico;
- configuración comercial por Business;
- variantes;
- stock por variante;
- precios;
- categorías;
- homologación;
- EAN/GTIN;
- Supplier SKU;
- historial de compra.

### Homologación

123:
`PROPUESTO → VALIDADO → CONFIABLE → CONSOLIDADO`

124:
Wapsell auto-confirma al cumplir criterios.

129:
auto-link de productos existentes.

140:
productos similares sin EAN/GTIN pueden auto-homologarse.

### Estado

**C5 — REQUIERE ESPECIFICACIÓN**

Los estados están definidos conceptualmente, pero faltan:

- thresholds;
- evidencia mínima;
- algoritmo/criterios;
- tratamiento de falsos positivos;
- rollback/dehomologación;
- diferencia entre “auto-link” y “auto-homologación”.

125 ya establece que SaaS Admin puede deshomologar; esto debe integrarse al lifecycle.

---

# 7. Purchases / Suppliers / Receipts — 131–150

### Resultado

**C2/C3 — FUNCIONALMENTE DEFINIDO EN ALTO NIVEL.**

Quedan definidos:

- Supplier SKU;
- price history;
- quote comparison;
- Purchase Order;
- supplier confirmation/rejection;
- frozen purchase price;
- partial receipts;
- discrepancy;
- lots;
- expiration;
- units;
- supplier communication.

### Recepción

136/137/141/142/143/144/151 definen:

- registrar recibido real;
- conservar diferencia;
- incidencia por faltante;
- diferencia/exceso;
- múltiples recepciones;
- impacto de stock después de control/aprobación;
- recepción aprobada inmutable;
- corrección mediante ajuste.

Esto es suficientemente rico para pasar a una **Purchases/Receiving SPEC**, pero aún requiere estados formales.

---

# 8. Inventory — 148–180

### Resultado

**C2 + C3**, con fuerte dependencia de D-010 y D-014.

Quedan definidos:

- stock por Business;
- locations;
- warehouses;
- lots;
- expiration;
- FEFO;
- FIFO;
- reserved stock;
- available stock;
- no negative stock;
- adjustments;
- transfers;
- concurrency;
- cost history;
- pricing/margin.

### Reconciliación importante

D-014 canónico mantiene:

> no transferencia entre Businesses salvo especificación posterior explícita.

El workshop 150/167 define una **operación inter-Business formal** como:

- Sale en Business A;
- Purchase en Business B.

Esto **no contradice D-014** si se modela como operación comercial formal y no como transferencia de stock informal.

### Resultado

La terminología correcta debe ser:

**NO stock transfer inter-Business**

sino:

**inter-Business commercial operation → Sale + Purchase**

hasta que una SPEC posterior defina lo contrario.

---

# 9. Pricing / Promotions — 171–180

### Resultado

**C2 — FUNCIONALMENTE DEFINIDO.**

Incluye:

- automatic cost;
- FIFO;
- margin;
- target margin;
- price suggestion;
- multiple price lists;
- wholesale;
- quantity tiers;
- customer-specific conditions;
- temporal validity;
- automatic promotions;
- combination rules.

### Open Detail

180 deja pendiente la formalización de:

- prioridad;
- stacking;
- incompatibilidades;
- precedencia;
- cálculo cuando varias promociones afectan el mismo componente.

---

# 10. Accounts Receivable / Credit — 181–230

### Resultado

**C2/C3 — EXTENSO Y CASI LISTO PARA SPECIALIZED SPEC.**

Quedan definidos:

- Customer eligibility;
- AR permission;
- credit limit;
- partial payments;
- multi-debt allocation;
- aging;
- due dates;
- reminders;
- blocked credit;
- customer-specific terms;
- days;
- late fees;
- automatic allocation;
- available credit;
- conversation visibility.

### Tensión

198:

> límite considera deuda existente, no automáticamente deuda + nueva compra.

Mientras 229:

> crédito disponible se calcula automáticamente considerando deuda.

No son necesariamente idénticos, pero afectan la misma frontera.

### Estado

**C5 — REQUIERE DEFINICIÓN FORMAL DE CREDIT AVAILABLE / CREDIT CHECK.**

Debe definirse:

`AvailableCredit = ?`

y:

`CanPurchaseOnCredit = ?`

---

# 11. Cash / Payments — 201–250

### Resultado

**C2/C3 — FUNCIONALMENTE DEFINIDO EN ALTO NIVEL.**

Quedan definidos:

- múltiples cajas;
- apertura;
- responsable;
- movimientos;
- retiro;
- ingreso restringido;
- cierre;
- diferencias;
- payment methods;
- mixed payments;
- bank transfer;
- external payment;
- external ID;
- reversal;
- reconciliation;
- supplier payments.

Esto debe transformarse en:

- Cash SPEC;
- Payment SPEC;
- invariantes de conciliación;
- idempotencia;
- state machines.

---

# 12. Customer — 251–270

### Resultado

**C2/C3 — RECONCILIADO CON D-002-bis.**

El workshop confirma:

- Customer puede existir sin User;
- vínculo posterior opcional;
- User puede ser Customer en múltiples Businesses;
- datos comerciales por Business;
- deactivation en lugar de delete;
- historial preservado;
- direcciones;
- labels;
- blocking contextual;
- relación automática al primer contacto.

### Punto abierto

La decisión canónica anterior mantiene abierto el criterio técnico de matching Customer ↔ User.

Por lo tanto, 269:

> primer contacto crea Customer relation

puede promoverse como regla comercial, pero **no debe confundirse con matching automático Customer↔User**.

---

# 13. Profiles / Roles / Permissions — 271–310

### Resultado

**C6 — CAMBIO CONCEPTUAL REQUIERE RECONCILIACIÓN.**

Workshop:

`Profile → Roles atomizados → Capabilities`

Además:

- múltiples Profiles;
- reusable Profiles;
- inactive Profiles;
- individual capability override;
- role dependencies;
- Team;
- Membership deactivation;
- contextual blocking;
- permissions por Branch.

Esto supera el modelo simple documentado previamente de:

`Role → Permission`

### Acción

No implementar hasta cerrar la **Authorization Specialized Spec**.

---

# 14. Business / SaaS / Branches — 307–350

### Resultado

**C2 — NUEVO DETALLE FUNCIONAL IMPORTANTE.**

Quedan definidos:

- Business configuration;
- Branding;
- public info;
- visibility;
- onboarding con aprobación Wapsell;
- creator → Owner;
- Business state;
- no Business without Owner;
- global identifier;
- slug;
- branches;
- warehouses;
- branch-specific permissions;
- user location access;
- SaaS Admin cross-Business administration.

### SaaS Admin

330 establece explícitamente:

> SaaS Admin puede administrar Business sin Membership.

Esto debe incorporarse a Platform Governance.

### Onboarding

311 establece:

User → formulario → Wapsell approval → Business creado → creator Owner.

Esto reemplaza la interpretación genérica de “self-service directo”.

---

# 15. Branches / Warehouses / Transfers — 320–350

### Resultado

**C2 — FUNCIONALMENTE DEFINIDO.**

Se consolidan:

Business
→ Branch
→ Warehouse

y también:

Business
→ Warehouse directo

Además:

- stock independiente;
- prices por Branch;
- promotions por Branch;
- access restrictions;
- transfers;
- receiving;
- discrepancy;
- availability across locations.

### Pickup

345:
no cross-Branch pickup.

346:
Business assigns pickup location.

359:
Customer can choose pickup as modality.

### Resultado

No existe contradicción necesaria.

La interpretación reconciliada de trabajo es:

> Customer puede elegir **pickup vs delivery**, pero no elige libremente la Branch concreta; Business asigna la pickup location.

Esto debe confirmarse en la Specialized Spec porque es una inferencia de reconciliación, no una nueva decisión del Owner.

---

# 16. Fulfillment / Delivery — 351–390

### Resultado

**C2/C3 — FUNCIONALMENTE DEFINIDO EN ALTO NIVEL.**

Estados relevantes:

`CONFIRMADO → PREPARANDO → LISTO PARA RETIRAR/ENTREGAR → ... → DELIVERED`

Además:

- preparación;
- una sola location;
- no split shipments;
- pickup/delivery;
- zones;
- tariffs;
- driver suggestion;
- manual assignment;
- driver acceptance;
- driver Space;
- customer tracking;
- delivery events.

### Delivery evidence

379/380:
PIN/código visible sólo para Customer.

378:
si Driver declara delivered y Customer no confirma, el sistema debe contactar al Customer.

### Open

Canal, timeout, retry, escalation y fallback siguen OPEN.

No debe inventarse.

---

# 17. Returns / Refunds — 391–470

### Resultado

**C2 — NUEVO BLOQUE FUNCIONAL EXTENSO.**

Se define:

### Return

- independent operation;
- partial return;
- multiple products;
- quantities;
- reason;
- inspection;
- quarantine;
- restock;
- replacement;
- exchange;
- incidents;
- Customer visibility;
- Business rules;
- Product-specific rules;
- Customer-specific rules.

### Refund

- linked to Return;
- linked to original Sale;
- linked to original payment when possible;
- partial;
- cash;
- transfer;
- pending;
- confirmed;
- rejected;
- cancelable before execution;
- max refundable control;
- duplicate refund prevention;
- AR adjustment;
- credit balance;
- shipping;
- taxes/charges;
- discounts/promotions;
- alternative refund method.

### Audit

- user;
- timestamp;
- amount;
- method;
- origin;
- immutable confirmed refund.

Este bloque requiere una **Returns & Refunds Specialized Spec** antes de Contracts.

---

# 18. Notifications — 431–450

### Resultado

**C2 — FUNCIONALMENTE DEFINIDO.**

Eventos definidos:

- return created;
- return approved;
- physical receipt;
- result;
- refund processing;
- replacement;
- conversation event.

Además:

- Customer notifications;
- internal notifications;
- capability filtering;
- seller alert;
- stock inspection alert;
- cash/finance refund alert;
- deduplication;
- event traceability;
- delivery/read state.

### Open

No queda decidido todavía:

- canal técnico;
- delivery provider;
- retry policy;
- retention;
- batching.

Eso pertenece a Architecture/Platform.

---

# 19. Audit — 471–490

### Resultado

**C2 — TRANSVERSAL Y MUY DEFINIDO FUNCIONALMENTE.**

Debe registrar:

- Sale changes;
- actor;
- timestamp;
- old/new state;
- cancellation;
- price changes;
- stock changes;
- credit changes;
- Cash;
- profiles/permissions;
- ownership;
- Business lifecycle;
- Membership lifecycle;
- SaaS administration.

Además:

- Business-scoped audit visibility;
- SaaS Admin cross-Business access;
- immutable audit for normal users;
- logical deletion preserves history.

### Estado

Esto es suficiente para crear un **Audit Requirements**.

El mecanismo técnico permanece abierto.

---

# 20. Matriz de reconciliación de puntos críticos

| ID workshop | Resultado reconciliado | Próxima capa |
|---|---|---|
| 001 | Membership ACTIVE/INACTIVE | Identity Spec |
| 002–003 | Roles + atomic capabilities | Authorization Spec |
| 004 | Spaces UX | Experience/Messaging |
| 006–040 | Conversation behavior | Messaging Spec |
| 061–070 | Message model behavior | Messaging Spec |
| 071–100 | Cart/Order/Payment | Commerce Spec + reconciliation |
| 101–130 | Product/Catalog/Homologation | Catalog Spec |
| 131–150 | Purchases/Receiving | Purchases Spec |
| 151–180 | Inventory/Pricing | Inventory + Pricing Specs |
| 181–230 | AR/Credit/Payments | AR + Payments Specs |
| 231–250 | Suppliers/Purchase Orders | Purchases/Suppliers Spec |
| 251–270 | Customer | Customer/Commerce Spec |
| 271–306 | Authorization/Team | Authorization Spec |
| 307–330 | Business/SaaS | Business/Platform Spec |
| 331–350 | Branch/Stock topology | Operations/Inventory Spec |
| 351–390 | Orders/Fulfillment | Orders/Fulfillment Spec |
| 391–430 | Returns/Refunds | Returns Spec |
| 431–470 | Notifications/Refunds | Notifications + Payments |
| 471–490 | Audit | Audit Spec |

---

# 21. Puntos que NO deben propagarse todavía

Los siguientes permanecen bloqueados hasta reconciliación explícita:

1. stock discount vs reservation;
2. Order payment requirement vs AR;
3. Order→Sale complete state matrix;
4. cancellation matrix;
5. homologation thresholds;
6. credit available/check semantics;
7. Profile/Role/Capability precedence;
8. delivery confirmation timeout/escalation;
9. return approval lifecycle;
10. refund state machine;
11. exact Business Context mechanism;
12. technical tenant isolation;
13. token/session model;
14. physical schema;
15. migration implementation;
16. Contracts;
17. Invariants;
18. code changes.

---

# 22. Reconciliaciones cerradas conceptualmente

Estas sí pueden considerarse reconciliadas a nivel funcional:

### 22.1 Membership

`ACTIVA ↔ INACTIVA`

con reactivación de la Membership existente.

### 22.2 Customer

Customer permanece separado de User.

### 22.3 Business

Business es la frontera comercial/tenant.

### 22.4 Messaging

Messaging es interfaz central y puede ejecutar/mostrar operaciones ERP.

### 22.5 Fulfillment

Fulfillment pertenece conceptualmente a Orders aunque Repartidores sea un Space UX.

### 22.6 Inter-Business

No es transferencia de stock global.

Es una operación comercial formal:

`Business A Sale → Business B Purchase`

### 22.7 Pickup

Customer elige modalidad pickup; Business determina la location concreta.

### 22.8 Returns

Return no edita Sale; es operación independiente.

### 22.9 Refund

Refund y Payment son operaciones diferentes.

### 22.10 Audit

Audit es transversal, Business-scoped, con acceso SaaS Admin donde corresponda.

---

# 23. Decisiones nuevas que deben promoverse

El workshop contiene suficiente material para crear/actualizar requisitos en estas áreas:

1. Messaging functional requirements.
2. Conversation lifecycle.
3. Group lifecycle.
4. Cart lifecycle.
5. Product/Catalog behavior.
6. Product homologation.
7. Pricing.
8. Promotions.
9. Customer lifecycle.
10. Purchase/Receiving.
11. Inventory.
12. Stock reservation.
13. Branch/Warehouse.
14. Transfers.
15. AR/Credit.
16. Cash.
17. Payments.
18. Orders.
19. Fulfillment.
20. Returns.
21. Refunds.
22. Notifications.
23. Audit.
24. Business onboarding.
25. SaaS Administration.
26. Profiles/Roles/Capabilities.

No todas necesitan convertirse en un nuevo Decision ID. Muchas deben convertirse directamente en Requirements o Specialized Specs.

---

# 24. Resultado de R0

## R0 queda

**FUNCIONALMENTE RECONCILIADO CON BLOQUEADORES IDENTIFICADOS.**

Eso significa:

- el workshop 001–490 queda clasificado;
- las decisiones canónicas existentes no se duplican;
- las nuevas reglas funcionales quedan identificadas;
- las tensiones quedan explícitas;
- las áreas que requieren Specialized Specs están delimitadas;
- no se inventan resoluciones para los puntos críticos;
- no se modifica schema;
- no se modifica código;
- no se crean Contracts;
- no se crean Invariants;
- no se declara implementación.

## Siguiente fase

La salida correcta de R0 es:

**RECONCILED WORKSHOP → REQUIREMENTS / SPECIALIZED SPECS**

y no:

**RECONCILED WORKSHOP → CODE**

---

## 25. Evidencia

| Elemento | Estado |
|---|---|
| Workshop 001–490 | DOCUMENTADO / PERSISTIDO |
| Decision Register existente | DOCUMENTADO / CANÓNICO |
| AS-IS | DOCUMENTADO + VERIFICADO POR CÓDIGO según baseline |
| TO-BE | DOCUMENTADO / DRAFT |
| Reconciliación 001–490 | ESTE DOCUMENTO |
| Schema | NO MODIFICADO |
| Código | NO MODIFICADO |
| Contracts | NO CREADOS POR ESTA RECONCILIACIÓN |
| Invariants | NO CREADOS POR ESTA RECONCILIACIÓN |
| Tests | NO CREADOS POR ESTA RECONCILIACIÓN |
| Implementation | NO AUTORIZADA POR ESTE DOCUMENTO |

**Conclusión:** R0 produce una base suficientemente estructurada para comenzar R1 — Requirements y la actualización controlada de las Specialized Specs.
