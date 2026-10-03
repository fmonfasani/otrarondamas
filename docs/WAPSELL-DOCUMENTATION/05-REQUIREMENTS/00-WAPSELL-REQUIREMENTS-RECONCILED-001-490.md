# WAPSELL — R1 REQUIREMENTS RECONCILED — WORKSHOP 001–490

**Version:** v0.1  
**Fecha:** 2026-10-03  
**Estado:** DRAFT / PROCESS ARTIFACT / NOT APPROVED  
**Fase:** R1 — REQUIREMENTS  
**Fuente primaria:** Owner Workshop 001–490 + Reconciliation 001–490 + Decision Register  
**Propósito:** convertir el relevamiento funcional reconciliado en requisitos funcionales trazables, sin convertir automáticamente cada respuesta en contrato, esquema o implementación.

> Este documento no modifica el Decision Register, las TO-BE Specs, Contracts, Invariants, Architecture, Plan ni código.  
> Los puntos marcados OPEN/BLOCKED no deben implementarse por inferencia.

---

## 1. Reglas de lectura

### 1.1 Evidencia y autoridad

- **CANONICAL DECISION:** decisión existente en Decision Register.
- **WORKSHOP DECISION:** definición dada por Owner durante el workshop 001–490.
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

## REQ-ID-002 — Membership contextual

**Fuente:** D-002, D-005, workshop 001, 271–306.

La pertenencia User ↔ Business debe representarse mediante Membership.

La autorización debe evaluarse en el contexto de esa Membership.

**Estado:** DERIVED REQUIREMENT.

## REQ-ID-003 — Membership ACTIVE/INACTIVE

**Fuente:** workshop 001, 284–285, 304.

Membership puede pasar entre ACTIVA e INACTIVA y una Membership inactiva puede reactivarse.

**Nota:** el lifecycle técnico completo y sus actores todavía requieren Specialized Spec.

**Estado:** WORKSHOP DECISION / REQUIREMENT.

## REQ-ID-004 — Business como frontera

**Fuente:** D-001, D-014, workshop 307–350.

Business es la unidad comercial y de aislamiento. Los recursos Business-scoped no deben cruzar Business sin una operación explícitamente definida.

**Estado:** CANONICAL + WORKSHOP.

## REQ-ID-005 — Cambio de Business activo

**Fuente:** workshop 288–290.

Un User con Memberships válidas debe poder cambiar el Business operativo sin volver a autenticarse, sujeto a las condiciones de acceso.

**Estado:** WORKSHOP REQUIREMENT.  
**OPEN:** mecanismo técnico de Business Context.

## REQ-ID-006 — Roles y capabilities contextualizados

**Fuente:** workshop 273–306 + D-005.

Las capacidades efectivas deben depender del contexto Business/Membership. El catálogo y la precedencia entre Profile, Role y Capability permanecen abiertos.

**BLOCKER:** reconciliar 003/005 con 273.

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

## REQ-MSG-002 — Conversaciones 1:1 y Groups

**Fuente:** workshop 007–018.

Las conversaciones normales son 1:1. Groups permiten múltiples participantes.

Un User puede crear Groups. El creador administra el Group.

Un Group puede contener múltiples conversaciones, y sólo sus administradores crean nuevas conversaciones dentro de él.

## REQ-MSG-003 — Participantes Business

**Fuente:** workshop 016, 021–024, 035–040, 059–060.

Una conversación Business puede involucrar múltiples vendedores, Owner/Admin, delivery driver y otros participantes autorizados.

Las conversaciones continúan perteneciendo a sus participantes y no exclusivamente a un Business.

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

## REQ-CART-002 — Manipulación

El Customer puede modificar cantidades y quitar productos.

El vendedor puede crear o modificar carts/orders según permisos y reglas de confirmación.

---

# 8. Orders y Sales

## REQ-ORD-001 — Separación Order/Sale

**Fuente:** D-007, D-008, workshop 079, 099, 371–390.

Order y Sale son conceptos distintos.

Order representa solicitud/proceso/preparación/entrega. Sale representa la operación comercial confirmada.

## REQ-ORD-002 — Confirmación Customer

**Fuente:** workshop 087.

El Customer confirma el Order antes de que continúe el flujo correspondiente.

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

## BLOCK-ORD-002 — Payment required vs AR

**Fuente:** workshop 078 + 181–230.

Existe tensión entre Order sin Payment y operaciones con crédito/AR.

Debe definirse cuándo un Order puede existir con deuda y en qué momento el pago es obligatorio.

## BLOCK-ORD-003 — Order → Sale

**Fuentes:** workshop 079, 099, 381–383.

Debe cerrarse el estado exacto que convierte Order en Sale.

La regla relevada indica conversión automática al estado de entrega correspondiente, pero la matriz completa de estados/precondiciones aún no está formalizada.

## REQ-SALE-001 — Sale confirmada inmutable

**Fuente:** D-008, workshop 383, 471–490.

Una Sale confirmada no se edita ni elimina. Las correcciones se realizan mediante operaciones explícitas.

## REQ-SALE-002 — Cancellation

**Fuente:** D-008, workshop 091–092, 384–390.

La cancelación debe ser una operación explícita, auditable y capaz de revertir los efectos aplicables.

**BLOCKER:** reconciliar 091/092/389 y construir matriz por actor/estado.

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

## REQ-INV-006 — Locations / Warehouses

**Fuente:** workshop 148, 320–350.

Business puede tener múltiples branches y warehouses, con stock por ubicación y transferencias internas trazables.

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

## REQ-PRICE-002 — Business-specific price

El precio comercial puede variar por Business y por Branch según las reglas definidas.

## REQ-PROMO-001 — Promotions

Debe soportarse aplicación automática de promociones y reglas de combinación.

**OPEN:** motor formal de precedencia/combinación.

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

---

# 15. Profiles, Roles y Capabilities

## REQ-AUTHZ-001 — Atomic capabilities

**Fuente:** workshop 003, 273–306.

Capabilities son unidades atómicas de autorización.

## REQ-AUTHZ-002 — Profiles / Roles

El workshop incorpora:

`Profile → Roles atomizados → Capabilities`

y además overrides individuales.

## BLOCK-AUTHZ-001 — Precedence

Debe definirse cómo interactúan:

- Profile;
- Role;
- Capability;
- individual override;
- Membership.

No se debe implementar una precedencia por inferencia.

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

## REQ-BIZ-005 — Warehouses

Business puede tener múltiples Warehouses asociados a Branch/Business según la estructura operativa definida.

## REQ-SAAS-001 — SaaS Admin

SaaS Admin puede administrar Businesses y consultar auditoría de Businesses bajo su ámbito.

El detalle de límites, suscripción y gobernanza permanece abierto.

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
