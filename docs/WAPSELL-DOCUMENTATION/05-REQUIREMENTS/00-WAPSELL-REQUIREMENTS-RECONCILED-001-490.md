# WAPSELL — R1 REQUIREMENTS RECONCILED — WORKSHOP 001–490

**Version:** v0.1  
**Fecha:** 2026-10-03  
**Estado:** DRAFT / PROCESS ARTIFACT / NOT APPROVED  
**Fase:** R1 — REQUIREMENTS  
**Fuente primaria:** Owner Workshop 001–490 + Reconciliation 001–490 + Decision Register  
**Propósito:** convertir el relevamiento funcional reconciliado en requisitos funcionales trazables, sin convertir automáticamente cada respuesta en contrato, esquema o implementación.

> Este documento no modifica el Decision Register, las TO-BE Specs, Contracts, Invariants, Architecture, Plan ni código.  
> Los puntos marcados OPEN/BLOCKED no deben implementarse por inferencia.

> **POST-OR-B2 (2026-10-03):** las decisiones `OR-B2-001 … OR-B2-026` (`03-DECISIONS/20-OR-B2-OWNER-DECISIONS-2026-10-03.md`, registradas en `00-DECISION-REGISTER.md` §9) son rulings del Owner de nivel 1 en ISS-08 y prevalecen sobre este documento donde lo contradicen. Las notas `POST-OR-B2` de abajo son aditivas: el texto histórico no se borra.
> Según OR-B2-022, el Workshop 001–490 no es autoridad normativa: sus respuestas son candidatas hasta que el Owner las apruebe. **Ningún REQ de este documento pasa a ser requisito aprobado** por estas notas. Estado del documento: `DRAFT / PROCESS ARTIFACT / NOT APPROVED` (sin cambio).
> Nomenclatura normativa: **Gestor de Stock** (no "Operador de Stock"). Repartidor queda fuera del MVP como Membership Role: `FUTURE / OPEN`.
> `TECHNICAL SPECIFICATION = NOT APPROVED` · `IMPLEMENTATION = NOT AUTHORIZED`.

---

## 1. Reglas de lectura

### 1.1 Evidencia y autoridad

- **CANONICAL DECISION:** decisión existente en Decision Register.
- **WORKSHOP CANDIDATE** (rótulo anterior: "WORKSHOP DECISION"; relabel POST-OR-B2 / OR-B2-022): definición dada por Owner durante el workshop 001–490. Es fuente de discovery y produce requisitos candidatos. No es decisión aprobada ni autoridad normativa.
- **DERIVED REQUIREMENT:** requisito derivado de decisiones existentes o del workshop reconciliado.
- **OPEN DETAIL:** falta definición funcional o técnica.
- **CONFLICT/BLOCKER:** existen dos reglas que no pueden propagarse simultáneamente sin resolver su precedencia.
- **PROPOSAL:** estructura documental o técnica propuesta, no aprobada.

### 1.2 Regla de propagación

La cadena es:

`WORKSHOP → RECONCILIATION → REQUIREMENT → SPECIALIZED SPEC → CONTRACT → INVARIANT → TEST → PLAN → IMPLEMENTATION`

Un requisito de este documento **no autoriza por sí mismo** schema, endpoint, evento técnico, JWT, migración o código.

---

# 2. Identity, Users, Membership y Businesses

## REQ-ID-001 — User global

**Fuente:** D-002 + workshop 002, 041–056.  
Wapsell debe tratar User como identidad global de plataforma.

Un User puede relacionarse con múltiples Businesses y puede tener relaciones/roles distintos según Business.

**Estado:** DERIVED REQUIREMENT.

> **POST-OR-B2 (2026-10-03, OR-B2-005):** Reafirma OR-002-C: un email normalizado globalmente único identifica a un User; no puede haber dos Users con el mismo email normalizado. El algoritmo de normalización es `OPEN IMPLEMENTATION DETAIL`. El estado del REQ no cambia (`DERIVED REQUIREMENT`).

## REQ-ID-002 — Membership contextual

**Fuente:** D-002, D-005, workshop 001, 271–306.

La pertenencia User ↔ Business debe representarse mediante Membership.

La autorización debe evaluarse en el contexto de esa Membership.

**Estado:** DERIVED REQUIREMENT.

> **POST-OR-B2 (2026-10-03, OR-B2-001, OR-B2-002):** El modelo de autorización del MVP es Membership → Role → Permission (OR-B2-001). Un token válido no autoriza por sí mismo: se valida User autenticado + Business objetivo + Membership válido + autorización por Role/Permission (OR-B2-002, que promueve D-006 con 4 validaciones). El mecanismo de token y de enforcement es `OPEN IMPLEMENTATION DETAIL`.

## REQ-ID-003 — Membership ACTIVE/INACTIVE

**Fuente:** workshop 001, 284–285, 304.

Membership puede pasar entre ACTIVA e INACTIVA y una Membership inactiva puede reactivarse.

**Nota:** el lifecycle técnico completo y sus actores todavía requieren Specialized Spec.

**Estado:** WORKSHOP CANDIDATE / REQUIREMENT (rótulo anterior: WORKSHOP DECISION / REQUIREMENT; relabel POST-OR-B2 / OR-B2-022).

> **POST-OR-B2 (2026-10-03, OR-B2-003):** El Owner decidió el lifecycle conceptual ACTIVE / INACTIVE y que una Membership INACTIVE no permite operar sobre el Business. OR-B2-003 no decide la reactivación ni quién cambia el estado: esas cláusulas de este REQ siguen siendo candidatas y su detalle es `OPEN IMPLEMENTATION DETAIL` (Specialized Spec). Cierra el blocker 8 solo a nivel conceptual.

## REQ-ID-004 — Business como frontera

**Fuente:** D-001, D-014, workshop 307–350.

Business es la unidad comercial y de aislamiento. Los recursos Business-scoped no deben cruzar Business sin una operación explícitamente definida.

**Estado:** CANONICAL + WORKSHOP.

> **POST-OR-B2 (2026-10-03, OR-B2-010):** Product es global; los datos comerciales específicos del Business viven en una relación Product → BusinessProduct. La identidad canónica global no arrastra stock ni precio (D-001, D-014). Qué campos son globales y cuáles del Business: `OPEN OWNER DECISION`.

## REQ-ID-005 — Cambio de Business activo

**Fuente:** workshop 288–290.

Un User con Memberships válidas debe poder cambiar el Business operativo sin volver a autenticarse, sujeto a las condiciones de acceso.

**Estado:** WORKSHOP REQUIREMENT.  
**OPEN:** mecanismo técnico de Business Context.

> **POST-OR-B2 (2026-10-03, OR-B2-007):** Un User puede tener múltiples Memberships y puede seleccionar/cambiar el Business activo (conceptual). El mecanismo técnico del Business Switch es `OPEN IMPLEMENTATION DETAIL`. La condición "sin volver a autenticarse" de este REQ no está decidida por OR-B2-007 y sigue siendo candidata. Cierra el blocker 14 solo a nivel conceptual.

## REQ-ID-006 — Roles y capabilities contextualizados

**Fuente:** workshop 273–306 + D-005.

Las capacidades efectivas deben depender del contexto Business/Membership. El catálogo y la precedencia entre Profile, Role y Capability permanecen abiertos.

**BLOCKER:** reconciliar 003/005 con 273.

> **POST-OR-B2 (2026-10-03, OR-B2-001, OR-B2-008, OR-B2-009):** Para el MVP rige Membership → Role → Permission. Profile → Role → Capability → Overrides no se adopta (no se descarta para el futuro): la precedencia entre Profile/Role/Capability/override queda superseded como modelo del MVP, y el término normativo es Permission. Roles del MVP: Owner, Admin, Vendedor, Gestor de Stock. Customer y Supplier no son Membership Roles. Owner y Admin son roles distintos. El catálogo de Permissions y sus asignaciones son `OPEN IMPLEMENTATION DETAIL`.

---

# 3. Contacts y relaciones sociales

## REQ-CON-001 — Contactos privados

**Fuente:** workshop 005, 009, 041–053.

Los Contacts pertenecen al User y no constituyen una agenda global compartida.

Agregar un User como contacto no implica reciprocidad automática.

## REQ-CON-002 — Descubrimiento

**Fuente:** workshop 041–047.

Wapsell debe permitir descubrir Users mediante teléfono/email y mantener username globalmente único.

El perfil público debe ocultar información privada no necesaria para el descubrimiento.

## REQ-CON-003 — Bloqueo contextual

**Fuente:** workshop 019–020, 050, 266–267, 286–287.

El bloqueo puede existir entre User↔User y Business↔User/Customer según el contexto correspondiente.

Un bloqueo de un Business no debe bloquear globalmente al User frente a otros Businesses.

---

# 4. Spaces y navegación

## REQ-UX-001 — Spaces oficiales

**Fuente:** workshop 004, 031.

Spaces funcionales relevados:

- Negocios;
- Mayoristas;
- Contactos;
- Grupos;
- Repartidores.

La navegación concreta por rol/permission permanece parte de la Experience/Specialized Spec.

## REQ-UX-002 — Contexto Business

La experiencia debe reflejar el Business activo y sus permisos antes de exponer operaciones Business-scoped.

---

# 5. Messaging

## REQ-MSG-001 — Messaging como interfaz comercial

**Fuente:** D-003, workshop 025–030, 071–100, 200, 370, 400, 439.

Messaging debe funcionar como interfaz central para conversaciones y como superficie contextual para consultar o ejecutar operaciones comerciales autorizadas.

> **POST-OR-B2 (2026-10-03, OR-B2-019, OR-B2-020):** Messaging es un dominio/módulo funcional de primera clase con UX conversation-centric; "primera clase" no implica módulo visual independiente (cierra C-12). La IA forma parte de la dirección de producto pero no opera en el MVP inicial y no se implementan asistentes IA. Wapsell Messaging MVP no depende de WhatsApp.

## REQ-MSG-002 — Conversaciones 1:1 y Groups

**Fuente:** workshop 007–018.

Las conversaciones normales son 1:1. Groups permiten múltiples participantes.

Un User puede crear Groups. El creador administra el Group.

Un Group puede contener múltiples conversaciones, y sólo sus administradores crean nuevas conversaciones dentro de él.

## REQ-MSG-003 — Participantes Business

**Fuente:** workshop 016, 021–024, 035–040, 059–060.

Una conversación Business puede involucrar múltiples vendedores, Owner/Admin, delivery driver y otros participantes autorizados.

Las conversaciones continúan perteneciendo a sus participantes y no exclusivamente a un Business.

> **POST-OR-B2 (2026-10-03, OR-B2-021, OR-B2-009, OR-B2-008):** La frase "las conversaciones continúan perteneciendo a sus participantes y no exclusivamente a un Business" queda superseded: una Conversation comercial pertenece a un Business; los participantes pueden ser Users/Customers y las acciones y datos comerciales quedan contextualizados al Business (coincide con G65). "Owner/Admin" ya no se lee fusionado: son roles distintos. "Delivery driver" como participante no lo convierte en Membership Role: Repartidor es `FUTURE / OPEN`. Customer participante sin User: `OPEN OWNER DECISION`.

## REQ-MSG-004 — Asignación

Una conversación puede asignarse a un responsable y reasignarse.

Si un vendedor abandona el Business, las conversaciones que correspondan pasan al Owner según la regla relevada.

## REQ-MSG-005 — Tipos de mensaje

**Fuente:** workshop 061–070.

Wapsell debe soportar, según las reglas del producto:

- texto;
- imágenes;
- archivos;
- audio;
- video;
- ubicación;
- contactos;
- productos;
- Orders;
- mensajes interactivos;
- mensajes de sistema.

Debe existir distinción entre mensaje de usuario y mensaje de sistema.

## REQ-MSG-006 — Estado del mensaje

**Fuente:** workshop 065–070.

Deben contemplarse edición con historial, eliminación con indicador, reply/quote, lectura, typing y mute individual.

## REQ-MSG-007 — Acciones ERP desde Messaging

**Fuente:** workshop 025–030, 300–301.

Una acción ejecutada desde Messaging debe verificar la capability requerida y registrar el resultado/evento correspondiente.

---

# 6. Catalog, Products y homologation

## REQ-CAT-001 — Catálogo integrado

**Fuente:** workshop 071–072, 101–130.

Catalog debe estar disponible como módulo y como superficie integrada de Messaging.

## REQ-CAT-002 — Product global + datos Business

**Fuente:** workshop 104–118.

El producto canónico puede ser compartido globalmente, mientras que precio, stock y demás datos comerciales pueden ser específicos del Business.

No debe confundirse identidad canónica con inventario comercial.

> **POST-OR-B2 (2026-10-03, OR-B2-010):** Decidido a nivel conceptual: Product es global y los datos comerciales del Business viven en Product → BusinessProduct. Modelo físico `OPEN IMPLEMENTATION DETAIL`. Qué datos son globales: `OPEN OWNER DECISION`. Cierra C-13 solo conceptualmente.

## REQ-CAT-003 — Variants

**Fuente:** workshop 107, 111–112.

Una Variant debe poder tener stock y precio propios.

## REQ-CAT-004 — Identifiers y homologación

**Fuente:** workshop 120–140.

EAN/GTIN debe poder identificar productos equivalentes. Sin EAN/GTIN, la homologación puede apoyarse en otras características.

Wapsell y Businesses pueden proponer homologaciones.

## BLOCK-CAT-001 — Thresholds de homologación

**Fuente:** workshop 123–124, 140.

Estados relevados:

`PROPOSED → VALIDATED → RELIABLE → CONSOLIDATED`

La condición exacta para cada transición y la regla de auto-confirmación permanecen OPEN.

No implementar thresholds por inferencia.

## REQ-CAT-005 — Homologación como infraestructura comercial

La homologación debe poder utilizarse en:

- catálogo;
- precios;
- carts;
- Orders;
- Purchases;
- Suppliers;
- stock;
- reports.

---

# 7. Cart

## REQ-CART-001 — Cart persistente

**Fuente:** workshop 081–086, 093, 109–110.

El cart pertenece al User en contexto Business, persiste y puede utilizarse fuera de Messaging.

Debe poder crearse desde Messaging y desde catálogo.

> **POST-OR-B2 (2026-10-03, OR-B2-011):** La frase "el cart pertenece al User en contexto Business" queda superseded: el Cart pertenece al Customer cuando existe, con vínculo opcional al User, y debe poder existir Customer sin User. Titular del Cart cuando no hay Customer: `OPEN OWNER DECISION` (no determinable con la información disponible).

## REQ-CART-002 — Manipulación

El Customer puede modificar cantidades y quitar productos.

El vendedor puede crear o modificar carts/orders según permisos y reglas de confirmación.

---

# 8. Orders y Sales

## REQ-ORD-001 — Separación Order/Sale

**Fuente:** D-007, D-008, workshop 079, 099, 371–390.

Order y Sale son conceptos distintos.

Order representa solicitud/proceso/preparación/entrega. Sale representa la operación comercial confirmada.

> **POST-OR-B2 (2026-10-03, OR-B2-012):** Order y Sale son entidades diferentes: Order = intención/proceso comercial; Sale = operación económica confirmada (promueve D-007).

## REQ-ORD-002 — Confirmación Customer

**Fuente:** workshop 087.

El Customer confirma el Order antes de que continúe el flujo correspondiente.

> **POST-OR-B2 (2026-10-03, OR-B2-013):** OR-B2-013 habla de Order "confirmado/aceptado comercialmente" y no dice quién confirma. Este REQ dice "el Customer confirma". Quién confirma el Order es `OPEN OWNER DECISION`; no se resuelve por inferencia.

## REQ-ORD-003 — Stock disponible

**Fuente:** workshop 094, 159–165.

Un Order no puede contener productos que no tengan disponibilidad suficiente conforme a la semántica de stock definida.

## BLOCK-ORD-001 — Reserva vs descuento

**Fuentes:** workshop 077 y 161–165.

Existe tensión entre:

- descontar stock físico al crear Order;
- mantener stock físico y separar available/reserved;
- reservar al confirmar Order.

La reconciliación debe definir una única semántica operacional.

> **POST-OR-B2 (2026-10-03, OR-B2-014):** Resuelto solo para la reserva: el stock se reserva al confirmar el Order. El descuento físico queda sujeto al flujo transaccional de la especificación especializada. No se inventan estados técnicos ni transaction boundaries (`OPEN IMPLEMENTATION DETAIL` / `OPEN OWNER DECISION` para el momento del descuento).

## BLOCK-ORD-002 — Payment required vs AR

**Fuente:** workshop 078 + 181–230.

Existe tensión entre Order sin Payment y operaciones con crédito/AR.

Debe definirse cuándo un Order puede existir con deuda y en qué momento el pago es obligatorio.

## BLOCK-ORD-003 — Order → Sale

**Fuentes:** workshop 079, 099, 381–383.

Debe cerrarse el estado exacto que convierte Order en Sale.

La regla relevada indica conversión automática al estado de entrega correspondiente, pero la matriz completa de estados/precondiciones aún no está formalizada.

> **POST-OR-B2 (2026-10-03, OR-B2-013):** Resuelto conceptualmente: la Sale nace cuando el Order es confirmado/aceptado comercialmente; no se espera a la entrega. La regla relevada de "conversión automática al estado de entrega" queda superseded. La matriz de estados/precondiciones sigue siendo `OPEN IMPLEMENTATION DETAIL`.

## REQ-SALE-001 — Sale confirmada inmutable

**Fuente:** D-008, workshop 383, 471–490.

Una Sale confirmada no se edita ni elimina. Las correcciones se realizan mediante operaciones explícitas.

> **POST-OR-B2 (2026-10-03, OR-B2-015):** Ruling del Owner: una Sale confirmada es inmutable; las correcciones se hacen por cancelación, reversión o refund, con trazabilidad.

## REQ-SALE-002 — Cancellation

**Fuente:** D-008, workshop 091–092, 384–390.

La cancelación debe ser una operación explícita, auditable y capaz de revertir los efectos aplicables.

**BLOCKER:** reconciliar 091/092/389 y construir matriz por actor/estado.

> **POST-OR-B2 (2026-10-03, OR-B2-015):** Cierra la cláusula pendiente de D-008 (C-06) en lo conceptual. La matriz por actor/estado y los mecanismos concretos de cancelación/reversión/refund siguen siendo `OPEN IMPLEMENTATION DETAIL`; el blocker "reconciliar 091/092/389" no queda cerrado por OR-B2.

---

# 9. Inventory

## REQ-INV-001 — Business-scoped inventory

**Fuente:** D-014, workshop 148–180.

Inventory pertenece exclusivamente a Business.

## REQ-INV-002 — Physical / Available / Reserved

**Fuente:** workshop 161–165.

El modelo funcional distingue stock físico, disponible y reservado.

## REQ-INV-003 — No negative stock

**Fuente:** workshop 159.

Stock no debe resultar negativo.

> **POST-OR-B2 (2026-10-03, OR-B2-018):** Ruling del Owner: no se permite stock negativo. D-010 sigue `NON-COMPLIANT/GAP` en el AS-IS (p. ej. AUD-D010-G02, devolución a proveedor con stock negativo): este ruling no declara nada implementado.

## REQ-INV-004 — Traceability

**Fuente:** workshop 151–155, 471–490.

Ajustes, movimientos, transferencias y correcciones deben mantener razón, responsable e historial.

## REQ-INV-005 — Expiration / FEFO

**Fuente:** workshop 146–157.

Debe soportarse:

- lotes;
- vencimientos;
- exclusión de vencidos del disponible;
- FEFO.

> **POST-OR-B2 (2026-10-03, OR-B2-016):** Rotación: producto con vencimiento → FEFO; producto sin vencimiento → FIFO. Resuelve la contradicción con SPEC §22 "FIFO" (C-09). Unidad de rotación (lote o fecha): `OPEN IMPLEMENTATION DETAIL`.

## REQ-INV-006 — Locations / Warehouses

**Fuente:** workshop 148, 320–350.

Business puede tener múltiples branches y warehouses, con stock por ubicación y transferencias internas trazables.

> **POST-OR-B2 (2026-10-03, OR-B2-017):** El MVP contempla Locations/Warehouses de forma mínima, con una ubicación principal/default conceptual. El alcance de este REQ ("múltiples branches y warehouses, stock por ubicación, transferencias internas") no queda aprobado completo: cuántas branches/warehouses tiene el MVP es `OPEN OWNER DECISION`. Sin modelo físico.

---

# 10. Purchases y Suppliers

## REQ-PUR-001 — Purchase dentro de Business

**Fuente:** D-015, workshop 134–150, 231–250.

Purchases pertenecen a Business y se realizan con Supplier.

## REQ-PUR-002 — Purchase Order

Debe soportarse lifecycle de Purchase Order, confirmación del Supplier, modificación antes de confirmación y cancelación bajo las condiciones definidas.

## REQ-PUR-003 — Receiving

**Fuente:** workshop 136–151.

La recepción registra cantidades reales, preserva diferencias contra PO y soporta recepciones parciales.

## REQ-PUR-004 — Accounts Payable

Una diferencia pendiente genera obligación con Supplier y permite pagos posteriores con trazabilidad.

---

# 11. Pricing y Promotions

## REQ-PRICE-001 — Price lists

**Fuente:** workshop 174–180.

Business puede manejar múltiples price lists, incluyendo wholesale.

Debe soportarse precio por cantidad, Customer y período cuando corresponda.

> **POST-OR-B2 (2026-10-03, OR-B2-026):** Pricing forma parte del Commerce TO-BE. Las reglas concretas quedan para la especificación especializada correspondiente. El REQ sigue siendo candidato.

## REQ-PRICE-002 — Business-specific price

El precio comercial puede variar por Business y por Branch según las reglas definidas.

## REQ-PROMO-001 — Promotions

Debe soportarse aplicación automática de promociones y reglas de combinación.

**OPEN:** motor formal de precedencia/combinación.

> **POST-OR-B2 (2026-10-03, OR-B2-026):** Promotions forma parte del Commerce TO-BE. Las reglas concretas (incluido el motor de precedencia/combinación) quedan para la especificación especializada. El REQ sigue siendo candidato.

---

# 12. Accounts Receivable y Credit

## REQ-AR-001 — AR por Business

**Fuente:** D-012, workshop 181–230.

AR pertenece a Business y se asocia a Customer.

## REQ-AR-002 — Partial payments

Debe soportarse pago parcial, múltiples deudas por pago y aplicación automática según antigüedad cuando corresponda.

## REQ-AR-003 — Due/overdue

Debe distinguirse deuda no vencida de deuda vencida y soportar vencimiento, mora y reminders.

## BLOCK-AR-001 — Credit limit

**Fuente:** workshop 183–198, 229.

La regla relevada indica que el límite se controla sobre deuda existente y no automáticamente deuda + nueva compra.

Debe documentarse explícitamente la semántica de available credit antes de Contracts.

---

# 13. Payments y Cash

## REQ-PAY-001 — Payment methods

**Fuente:** D-011, D-013, workshop 211–230.

Business configura sus métodos de pago.

Debe soportarse payment mix.

## REQ-PAY-002 — External payment abstraction

Los gateways externos deben estar detrás de una abstracción y conservar estados e IDs externos.

Mercado Pago es prioridad histórica del Decision Register.

## REQ-PAY-003 — Payment states

Debe distinguirse al menos el estado externo pendiente/rechazado/revertido/confirmado según el flujo correspondiente.

## REQ-CASH-001 — Cash lifecycle

**Fuente:** D-013, workshop 201–220.

Cash sigue conceptualmente:

`Apertura → Operaciones/Movimientos → Arqueo → Cierre`

Debe registrar origen, monto, método, responsable y diferencias de cierre.

## REQ-CASH-002 — Multiple Cash registers

Business puede operar múltiples cajas y cada caja debe tener un responsable durante el turno.

---

# 14. Customers

## REQ-CUST-001 — Customer independiente

**Fuente:** D-002-bis, workshop 251–270.

Customer puede existir sin User y puede vincularse posteriormente.

> **POST-OR-B2 (2026-10-03, OR-B2-004):** Reafirma D-002-bis y OR-002-D: Customer ≠ User, Customer puede existir sin User y el vínculo Customer → User es opcional.

## REQ-CUST-002 — Business relationship

Los datos comerciales de Customer pertenecen al Business.

## REQ-CUST-003 — Historical preservation

Customer con historial no debe eliminarse físicamente.

## REQ-CUST-004 — Addresses

Customer puede tener múltiples direcciones con tipo/uso, incluida dirección alternativa de entrega.

La operación debe congelar la dirección histórica utilizada.

## BLOCK-CUST-001 — Customer ↔ User matching

El Decision Register mantiene abierto el criterio de matching automático por email.

No se debe asumir como regla normativa sin promoción/confirmación correspondiente.

> **POST-OR-B2 (2026-10-03, OR-B2-004):** OR-B2-004 reafirma el vínculo opcional pero no confirma el criterio de matching por email: sigue `OPEN` (D1 de OR-002-D). No se asume como regla.

---

# 15. Profiles, Roles y Capabilities

## REQ-AUTHZ-001 — Atomic capabilities

**Fuente:** workshop 003, 273–306.

Capabilities son unidades atómicas de autorización.

## REQ-AUTHZ-002 — Profiles / Roles

El workshop incorpora:

`Profile → Roles atomizados → Capabilities`

y además overrides individuales.

> **POST-OR-B2 (2026-10-03, OR-B2-001):** "Profile → Roles atomizados → Capabilities" más overrides individuales no se adopta para el MVP; rige Membership → Role → Permission. Se conserva como evidencia del workshop y como posible evolución futura.

## BLOCK-AUTHZ-001 — Precedence

Debe definirse cómo interactúan:

- Profile;
- Role;
- Capability;
- individual override;
- Membership.

No se debe implementar una precedencia por inferencia.

> **POST-OR-B2 (2026-10-03, OR-B2-001):** Para el MVP no hay Profile, Capability ni overrides individuales, por lo que la precedencia entre ellos no aplica al MVP. El blocker 7 se cierra solo a nivel de modelo; precedencia de Permissions y catálogo: `OPEN IMPLEMENTATION DETAIL`.

## REQ-AUTHZ-003 — Permission-gated ERP actions

Toda acción ERP ejecutada desde Messaging debe verificar autorización equivalente a la acción realizada desde el módulo correspondiente.

---

# 16. Business, Branches y SaaS Administration

## REQ-BIZ-001 — Business creation

**Fuente:** workshop 311–318.

El flujo relevado incluye solicitud de creación, aprobación de Wapsell y creación del Business con Owner.

## REQ-BIZ-002 — Business must have Owner

Un Business no puede operar sin Owner.

## REQ-BIZ-003 — Ownership

Debe soportarse ownership transfer y múltiples Owners.

No se puede remover el último Owner.

## REQ-BIZ-004 — Branches

Business puede tener múltiples Branches.

Branch puede tener:

- stock;
- cash;
- horarios;
- delivery zones;
- permisos específicos.

> **POST-OR-B2 (2026-10-03, OR-B2-017):** Ver nota en REQ-INV-006: ubicaciones mínimas en el MVP; cantidad de branches/warehouses `OPEN OWNER DECISION`. Cash, horarios, delivery zones y permisos por Branch siguen siendo candidatos.

## REQ-BIZ-005 — Warehouses

Business puede tener múltiples Warehouses asociados a Branch/Business según la estructura operativa definida.

## REQ-SAAS-001 — SaaS Admin

SaaS Admin puede administrar Businesses y consultar auditoría de Businesses bajo su ámbito.

El detalle de límites, suscripción y gobernanza permanece abierto.

> **POST-OR-B2 (2026-10-03, OR-B2-008):** SaaS Admin no figura entre los Membership Roles del MVP y sigue sin decisión del Owner (C-11, `OPEN OWNER DECISION`).

---

# 17. Fulfillment / Repartidores

## REQ-FUL-001 — Fulfillment dentro de Orders

**Fuente:** D-016, workshop 351–390.

Fulfillment pertenece conceptualmente al dominio Orders.

## REQ-FUL-002 — Delivery / Pickup

Business puede ofrecer pickup y delivery.

El Customer puede seleccionar la modalidad pickup/delivery según disponibilidad.

**Nota:** la asignación concreta de location de pickup debe formalizarse en Specialized Spec.

## REQ-FUL-003 — Driver assignment

Wapsell puede sugerir drivers disponibles; Business selecciona y el driver debe aceptar antes del viaje.

> **POST-OR-B2 (2026-10-03, OR-B2-008):** Repartidor queda fuera del MVP como Membership Role: `FUTURE / OPEN`. Esto no cierra D-016 (Fulfillment, `OPEN OWNER DECISION`) ni promueve este REQ.

## REQ-FUL-004 — Tracking

Customer puede visualizar el progreso de delivery y el driver actualiza estados desde su Space.

## BLOCK-FUL-001 — Delivery confirmation escalation

**Fuente:** workshop 378–380.

Si el driver marca delivered y Customer no confirma, existen contacto posterior y evidencia mediante código/PIN, pero timeout, canal y escalamiento están OPEN.

---

# 18. Returns

## REQ-RET-001 — Return independent operation

**Fuente:** workshop 391–430.

Return es una operación independiente de Sale.

No debe editar la Sale original.

> **POST-OR-B2 (2026-10-03, OR-B2-025):** Returns forma parte del Commerce TO-BE (alcance). La implementación queda para una etapa posterior. Los REQ-RET-* siguen siendo candidatos; estados y aprobación/inspección: abiertos.

## REQ-RET-002 — Physical return

El retorno físico puede generar:

- inspección;
- cuarentena;
- reintegro a stock disponible;
- incidente.

## REQ-RET-003 — Partial return

Puede devolverse parte de una Sale/Order y parte de la cantidad de un Product.

## REQ-RET-004 — Replacement / Exchange

Debe soportarse replacement y exchange vinculados al Return.

## REQ-RET-005 — Return rules

Business puede definir reglas de devolución, incluso diferenciadas por Product y Customer.

## REQ-RET-006 — Notifications

Los eventos de Return deben poder reflejarse en Messaging y Notifications.

---

# 19. Refunds

## REQ-REF-001 — Refund distinto de Payment

Refund y Payment son operaciones distintas.

> **POST-OR-B2 (2026-10-03, OR-B2-025):** Refunds forma parte del Commerce TO-BE (alcance). La implementación queda para una etapa posterior. Los REQ-REF-* siguen siendo candidatos; la state machine completa sigue abierta.

## REQ-REF-002 — Refund linkage

Refund debe relacionarse con:

- Return;
- Sale original;
- Payment original cuando exista.

## REQ-REF-003 — Partial refund

Debe soportarse refund parcial y cálculo del máximo reembolsable.

## REQ-REF-004 — Refund methods

Debe contemplarse refund por Cash y transferencia, con operación alternativa trazable cuando el método original no sea técnicamente posible.

## REQ-REF-005 — Double refund prevention

No debe permitirse un refund que exceda el máximo reembolsable ni duplicar un refund confirmado.

## REQ-REF-006 — Refund financial effects

Refund puede afectar Cash, Payments y AR según el origen y método.

## REQ-REF-007 — Refund audit

Refund confirmado es inmutable; una corrección se representa como nueva operación.

---

# 20. Notifications

## REQ-NOT-001 — Domain events

**Fuente:** workshop 431–450.

Debe existir notificación de eventos relevantes de Returns/Refunds/Replacement y otros eventos definidos por Business.

## REQ-NOT-002 — Customer/internal notifications

Business puede configurar notificaciones Customer e internas, respetando capabilities.

## REQ-NOT-003 — Deduplication

Una misma causa no debe producir notificaciones duplicadas según las reglas funcionales.

## OPEN-NOT-001

Canales, providers, retry policy, batching y retention son decisiones técnicas posteriores.

---

# 21. Audit

## REQ-AUD-001 — Audit transversal

**Fuente:** workshop 471–490.

Debe auditarse, como mínimo:

- cambios de Sale;
- actor;
- timestamp;
- estados anterior/nuevo;
- cancelaciones;
- cambios de precio;
- cambios de stock;
- cambios de crédito;
- operaciones Cash;
- cambios de profiles/permissions;
- ownership;
- lifecycle Business;
- lifecycle Membership;
- acciones SaaS Admin.

## REQ-AUD-002 — Business isolation

Audit debe respetar aislamiento Business.

## REQ-AUD-003 — SaaS cross-Business audit

SaaS Admin puede consultar auditoría de Businesses bajo su administración.

## REQ-AUD-004 — Audit preservation

La eliminación lógica no debe destruir la trazabilidad histórica.

---

# 22. Matriz de trazabilidad del workshop

| Workshop | Área | Tratamiento R1 |
|---|---|---|
| 001–060 | Identity / Contacts / Business | Requirements |
| 061–100 | Messaging / Cart / Orders | Requirements + blockers |
| 101–130 | Catalog / Homologation | Requirements + blocker |
| 131–180 | Purchases / Inventory / Pricing | Requirements + blocker |
| 181–230 | AR / Credit / Cash / Payments | Requirements + blocker |
| 231–250 | Suppliers / Purchase Orders | Requirements |
| 251–306 | Customer / Authorization / Team | Requirements + blockers |
| 307–350 | Business / Branch / Warehouse | Requirements |
| 351–390 | Fulfillment / Orders / Cancellation | Requirements + blockers |
| 391–430 | Returns / Refunds | Requirements |
| 431–470 | Notifications / Refunds | Requirements |
| 471–490 | Audit | Requirements |

---

# 23. Blockers funcionales de R1

Antes de cerrar Specialized Specs, deben resolverse explícitamente:

1. **Stock:** descuento físico vs reserva.
2. **Order/Payment/AR:** cuándo puede existir deuda durante el flujo de Order.
3. **Order → Sale:** estado y precondición exactos.
4. **Cancellation:** actores, estados, confirmación y efectos.
5. **Homologation:** thresholds y auto-confirmación.
6. **Credit:** definición formal de límite y available credit.
7. **Authorization:** Profile → Role → Capability y precedencia de overrides.
8. **Membership:** lifecycle detallado y actores.
9. **Pickup:** relación modalidad/location.
10. **Delivery confirmation:** timeout, canal y escalamiento.
11. **Return:** aprobación/inspección y estados.
12. **Refund:** state machine completa.
13. **Customer ↔ User:** matching automático.
14. **Business Context:** comportamiento funcional de selección/switch.

---

# 24. Próxima capa

La salida de R1 no es código.

La siguiente transformación es:

**R1 Requirements → R2 Specialized Functional Specs**

Orden propuesto de especificación:

1. Identity & Tenancy
2. Authorization / Team
3. Messaging
4. Catalog / Product / Homologation
5. Customer
6. Cart / Orders / Sales
7. Inventory / Locations / Transfers
8. Purchases / Suppliers
9. Pricing / Promotions
10. AR / Credit
11. Payments / Cash
12. Fulfillment / Repartidores
13. Returns / Refunds
14. Notifications
15. Audit
16. Business / SaaS Administration
17. Branding / Experience

El orden es **propuesto**, no aprobado.

---

# 25. Evidencia y estado

| Elemento | Estado |
|---|---|
| Workshop 001–490 | DOCUMENTADO / PERSISTIDO |
| Reconciliation 001–490 | DOCUMENTADO / PERSISTIDO |
| Requirements R1 | ESTE DOCUMENTO — DRAFT |
| Decision Register | NO MODIFICADO POR ESTE ARTEFACTO |
| TO-BE | NO MODIFICADO POR ESTE ARTEFACTO |
| Contracts | NO CERRADOS |
| Invariants | NO CERRADOS |
| Tests/Evals | NO CERRADOS |
| Architecture | NO CERRADA |
| Schema | NO MODIFICADO |
| Código | NO MODIFICADO |
| Migration | NO EJECUTADA |

## Conclusión

R1 transforma el workshop reconciliado en una primera capa de requisitos funcionales trazables.

Los requisitos no deben interpretarse como autorización de implementación.

Los blockers explícitos deben resolverse en la capa funcional correspondiente antes de cerrar Contracts/Invariants.

**Estado R1: REQUIREMENTS BASELINE CREADO — DRAFT / NOT APPROVED.**

---

# 26. Estado POST-OR-B2 (adenda, 2026-10-03)

> Sección aditiva. No reemplaza ninguna sección anterior. Registra el efecto de `OR-B2-001 … OR-B2-026` sobre los blockers funcionales de la §23. No convierte ningún REQ en requisito aprobado y no autoriza implementación.

| # | Blocker (§23) | Estado POST-OR-B2 | OR-B2 |
|---|---|---|---|
| 1 | Stock: descuento físico vs reserva | Reserva decidida al confirmar el Order. Momento/flujo del descuento físico: `OPEN OWNER DECISION` / especificación especializada | 014 |
| 2 | Order/Payment/AR | Sin cambio. Abierto (D-011, C-17) | — |
| 3 | Order → Sale | Resuelto conceptualmente: la Sale nace al confirmar el Order. Matriz de estados: `OPEN IMPLEMENTATION DETAIL`. Quién confirma: `OPEN OWNER DECISION` | 012, 013 |
| 4 | Cancellation | Parcial: inmutabilidad y corrección por cancelación/reversión/refund decididas. Actores, estados y efectos: abiertos | 015 |
| 5 | Homologation | Sin cambio | — |
| 6 | Credit | Sin cambio | — |
| 7 | Authorization | Resuelto a nivel de modelo (Membership → Role → Permission). Catálogo y precedencia de Permissions: `OPEN IMPLEMENTATION DETAIL` | 001, 002, 008, 009 |
| 8 | Membership | Lifecycle conceptual ACTIVE/INACTIVE decidido. Detalle y actores: `OPEN IMPLEMENTATION DETAIL` | 003 |
| 9 | Pickup | Sin cambio | — |
| 10 | Delivery confirmation | Sin cambio | — |
| 11 | Return | Alcance TO-BE decidido. Aprobación/inspección y estados: abiertos | 025 |
| 12 | Refund | Alcance TO-BE decidido. State machine: abierta | 025 |
| 13 | Customer ↔ User | Vínculo opcional reafirmado. Criterio de matching por email: `OPEN` | 004 |
| 14 | Business Context | Concepto de múltiples Memberships y cambio de Business decidido. Mecanismo: `OPEN IMPLEMENTATION DETAIL` | 007 |

Pendiente sin ruling que afecta a este documento: Payment (D-011, C-17), Cash (D-013, C-05), Fulfillment (D-016), SaaS Admin (C-11), cantidad de branches/warehouses, campos globales de Product, titular del Cart sin Customer, Customer participante sin User, y el rótulo "R1/R2" de este documento frente al de `03-DECISIONS` (C-20, `OPEN OWNER DECISION`).

Nomenclatura: **Gestor de Stock** (normativo). Repartidor: `FUTURE / OPEN`.

**Estado del documento: DRAFT / NOT APPROVED (sin cambio). `TECHNICAL SPECIFICATION = NOT APPROVED` · `IMPLEMENTATION = NOT AUTHORIZED`.**
