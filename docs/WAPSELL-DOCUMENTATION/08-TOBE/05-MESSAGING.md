# Wapsell — Messaging (TO-BE)
**Fase:** 6.6 — TO-BE Messaging · **Creado:** 2026-09-29 · **Estado:** DRAFT — NOT APPROVED

> ## Autoridad y gobierno
>
> - **DEC-001 → APPROVED** y es la autoridad principal para la dirección de producto: la conversación es la interfaz comercial central y los asistentes de IA forman parte del producto.
> - **D-003 → APPROVED — DERIVED / RECONSTRUCTED** según el Decision Register. Define Messaging activo en el MVP inicial como sistema de mensajería propio de Wapsell; los asistentes de IA quedan preparados técnicamente para una incorporación posterior pero permanecen inactivos durante el MVP.
> - **D-003 / WhatsApp → `RESOLVED — OWNER-RULED` (R3, 2026-09-30, nota aditiva).** Decisión del Owner (`04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md` §1, `00-DECISION-REGISTER.md` §8.1): **"Wapsell Messaging MVP no depende de WhatsApp."** No prohíbe integraciones futuras; no se implementa ni se remueve ninguna integración. Los demás detalles de D-003 (modelo Conversation/Message, canales adicionales, activación de IA) siguen `OPEN`; el resto del texto de D-003 sigue `DERIVED / RECONSTRUCTED`.
> - **D-001 y D-002 → APPROVED — OWNER-VERBATIM.** Se utilizan únicamente como frontera de Business, User y Membership.
> - **D-002-bis → APPROVED — OWNER-VERBATIM.** Customer permanece separado de User y puede vincularse opcionalmente a un User.
> - **D-005 y D-006 → APPROVED — DERIVED / RECONSTRUCTED.** Se utilizan únicamente como frontera de autorización. El catálogo concreto de roles/permisos y determinados detalles de validación permanecen OPEN.
> - **D-007 y D-008 → APPROVED — DERIVED / RECONSTRUCTED.** Se utilizan únicamente para describir la frontera conceptual entre conversación, Order y Sale. Sus estados, condiciones de conversión y autorizaciones concretas permanecen OPEN.
> - **D-016 → APPROVED — DERIVED / RECONSTRUCTED.** Se utiliza únicamente para la frontera conceptual entre Messaging, Orders y Fulfillment.
> - `04-MESSAGING-SPEC.md` es **DRAFT — NOT APPROVED** y actualmente es un placeholder. No contiene reglas normativas adicionales.
> - **CON-011 permanece OPEN.** El hecho de documentar el TO-BE conceptual de Messaging no cierra el conflicto.
> - **IMPLEMENTATION DETAIL = OPEN.** Este documento no define schema, entidades físicas, API, transporte realtime, proveedor externo, permisos concretos, estados, infraestructura ni arquitectura de IA.
>
> Este documento es **TO-BE conceptual**. No produce contratos, invariantes, tests, migraciones ni implementación.
>
> **Decisiones creadas: 0. Requisitos inventados: 0. Estados inventados: 0. IDs inventados: 0. Entidades físicas definidas: 0. Permisos definidos: 0. Conflictos resueltos: 0.**

> ### POST-OR-B2 note (2026-10-03) — additive; no normative text of this document was changed
>
> - **Source / Authority:** Owner rulings `OR-B2-001 … OR-B2-026` (sesión `OR-B2-SESSION-2026-10-03`), texto verbatim en `03-DECISIONS/20-OR-B2-OWNER-DECISIONS-2026-10-03.md`; registro en `03-DECISIONS/00-DECISION-REGISTER.md` §9; mapeo a conflictos en `03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md`. Precedencia ISS-08 (aprobada por OR-B2-023): Owner Ruling > Decision Register > SPEC canónica > TO-BE. Entre dos rulings prevalece el posterior.
> - **Cómo leer este documento ahora:** el texto original se conserva como evidencia histórica. Donde abajo se indica "superado", rige el OR-B2 citado **solo en ese alcance**. Los rótulos `DERIVED / RECONSTRUCTED`, `TO-BE PROPOSED` y `OPEN DETAIL` del texto se conservan como procedencia. El AS-IS citado describe el estado verificado en su momento; no se declara nada implementado.
>
> | Sección / tema de este documento | Efecto POST-OR-B2 | Autoridad |
> |---|---|---|
> | Messaging / IA / WhatsApp | Messaging es dominio/módulo funcional de primera clase con UX conversation-centric (no implica módulo visual independiente). La IA forma parte de la dirección de producto, no opera en el MVP inicial y no se implementan asistentes IA ahora (condición de activación futura: no determinable). Wapsell Messaging MVP no depende de WhatsApp. Una `Conversation` comercial pertenece a un `Business`; participantes `User`/`Customer`; acciones y datos contextualizados al `Business`. `Customer` participante sin `User`: `OPEN OWNER DECISION`. | OR-B2-019, 020, 021 |
> | Autoridad — D-003 / WhatsApp (`RESOLVED — OWNER-RULED`, R3) | Reafirmado: Wapsell Messaging MVP no depende de WhatsApp. IA: dirección de producto, inactiva en el MVP inicial. | OR-B2-019, 020 |
> | Fronteras con Customer / User / Order / Sale (D-002-bis, D-007, D-008) | `Customer` ≠ `User`; `Order` ≠ `Sale` (OR-B2-004, 012). Estados y condiciones de conversión: `OPEN`. `Customer` participante sin `User`: `OPEN OWNER DECISION`. | OR-B2-004, 012, 021 |
> | Referencia a repartidores (§Fulfillment) | Sin cambio: `Repartidor` queda fuera del MVP como Membership Role (`FUTURE / OPEN`); D-016 sigue `OPEN`. | Aclaración del Owner |
> | Gobernanza | Workshop 001–490 es fuente de discovery, no autoridad normativa (OR-B2-022). ISS-08 aprobada como regla de precedencia (OR-B2-023); los demás documentos de `00-GOVERNANCE` siguen `PROPOSED`. | OR-B2-022, 023 |
>
> - **Sigue `OPEN`:** ver `03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md` §3 (`OPEN OWNER DECISION`, `OPEN IMPLEMENTATION DETAIL`, `FUTURE / OPEN`).
> - **Estado:** este documento sigue `DRAFT — NOT APPROVED`. La distinción `APPROVED` / `OWNER-RULED` / `DERIVED` / `PROPOSED` / `OPEN` / `IMPLEMENTATION DETAIL` del texto original se conserva; esta nota no convierte ningún detalle técnico en decisión. `TECHNICAL SPECIFICATION = NOT APPROVED`. `IMPLEMENTATION = NOT AUTHORIZED`.

---

## 0. Alcance

Messaging es una capacidad central de Wapsell y constituye la interfaz conversacional desde la que el usuario puede interactuar con el negocio. Su función TO-BE es conectar una interacción conversacional con el motor comercial/operativo de Wapsell sin convertir la conversación en un sustituto de los dominios de Commerce.

La dirección aprobada establece:

1. La conversación es la **interfaz comercial central**.
2. No es un canal secundario ni un módulo independiente de la experiencia comercial.
3. Commerce/ERP actúa como motor operativo detrás de la conversación.
4. Messaging está dentro del MVP inicial.
5. El canal inicial es el **sistema de mensajería propio de Wapsell**.
6. El MVP inicial no depende de WhatsApp como canal.
7. Los asistentes de IA forman parte de la dirección de producto, pero permanecen **inactivos durante el MVP inicial**.

Lo anterior no determina cómo se implementarán técnicamente conversaciones, mensajes, realtime, presencia, notificaciones, attachments, asignación, automatizaciones o asistentes.

---

## 1. Qué decide DEC-001

DEC-001 define Wapsell como plataforma y establece la conversación como interfaz comercial central.

La relación conceptual es:

```
                   WAPSELL
                      |
             +--------+--------+
             |                 |
         Messaging         Commerce / ERP
        interfaz central       motor
             |                 |
             +--------+--------+
                      |
       +--------------+--------------+
       |              |              |
    Customer         Order          Sale
                      |
                 Fulfillment
```

El diagrama es conceptual. No define componentes físicos, servicios ni dependencias técnicas.

DEC-001 también establece:

- Business como unidad de aislamiento.
- User como identidad global.
- Membership como relación User ↔ Business.
- Roles y permisos dentro del Membership.
- Brand como identidad comercial visible del Business.
- Otra Ronda Más como primer Business de Wapsell.

El modelo físico y el plan de migración están explícitamente fuera de DEC-001.

---

## 2. Qué decide D-003

D-003 define la dirección específica de Messaging:

| Aspecto | TO-BE |
|---|---|
| Messaging en MVP | **Activo** |
| Sistema inicial | **Mensajería propia de Wapsell** |
| Dependencia de WhatsApp | **No requerida para el MVP inicial** — `RESOLVED — OWNER-RULED` 2026-09-30: *"Wapsell Messaging MVP no depende de WhatsApp."* (no prohíbe integraciones futuras) |
| Asistentes de IA | Preparados técnicamente para incorporación posterior |
| IA durante MVP inicial | **Inactiva** |
| Funcionalidad concreta del asistente | **OPEN** |
| Canales adicionales | **OPEN** |
| Modelo técnico de mensajería | **OPEN** |

La última fila es importante: la decisión de tener Messaging no equivale a haber decidido su implementación.

---

## 3. Frontera Business / User / Membership / Customer

### 3.1 Business

Messaging opera dentro del contexto de un Business.

No existe una conversación global compartida entre Business en el sentido de dominio comercial. La conversación comercial pertenece al contexto del Business con el que interactúa el comprador.

Esto deriva del aislamiento aprobado por D-001.

No se define aquí el modelo físico de pertenencia.

### 3.2 User

User es una identidad global de Wapsell.

Un participante de una conversación puede estar asociado a un User, pero este documento no establece que toda interacción conversacional requiera una cuenta global.

### 3.3 Membership

Membership representa la relación de acceso entre User y Business.

La existencia de una Membership permite contextualizar las autorizaciones de un usuario cuando actúa dentro de un Business.

No se define aquí:

- catálogo de roles;
- permisos;
- permisos específicos de Messaging;
- reglas de asignación de conversaciones;
- reglas de administración;
- lifecycle de Membership.

### 3.4 Customer

Customer es una relación comercial con el Business y **no se fusiona con User**.

Puede:

- existir sin User;
- vincularse opcionalmente a un User;
- tener información comercial asociada;
- participar en Commerce;
- estar relacionado con pedidos, ventas y cuenta corriente cuando corresponda.

Por lo tanto, Messaging debe poder conceptualizar una interacción comercial sin asumir que el comprador ya tiene una identidad global Wapsell.

La forma física de ese vínculo permanece OPEN.

---

## 4. Conversación como interfaz comercial

La conversación es una superficie de interacción. El resultado comercial pertenece a los dominios correspondientes.

Ejemplo conceptual:

```
Conversación
    |
    +--> consulta de producto
    |
    +--> consulta comercial
    |
    +--> selección / intención de compra
    |
    +--> Order
    |
    +--> confirmación comercial
    |
    +--> Sale
    |
    +--> Payment
    |
    +--> preparación / Fulfillment
```

Este flujo no implica que todos los pasos deban ocurrir dentro de una conversación ni que todos los pedidos deban originarse en Messaging.

D-007 mantiene Order y Sale como conceptos diferentes.

Una interacción conversacional puede originar una Order cuando corresponda, y una Order puede eventualmente originar una Sale bajo las condiciones que se definan en el dominio Commerce.

Una venta presencial/POS también puede originar una Sale directamente, por lo que Messaging no es condición necesaria para toda Sale.

---

## 5. Customer ↔ Conversation

La relación comercial con Customer es una frontera fundamental.

Conceptualmente:

```
Business
   |
   +---- Customer
             |
             +---- optional User
             |
             +---- commercial history
             |
             +---- Orders / Sales when applicable
             |
             +---- Conversation(s)
```

El diagrama no constituye modelo de datos.

Queda abierto:

- si una conversación pertenece a un único Customer durante toda su vida;
- cómo se resuelve un participante anónimo;
- cómo se realiza el vínculo posterior con un User;
- cómo se fusionan o desambiguan identidades comerciales;
- si un Customer puede tener múltiples conversaciones simultáneas;
- reglas de retención y cierre.

No se resuelve ninguno de estos puntos en esta fase.

---

## 6. Participantes

Messaging requiere conceptualmente participantes de una interacción.

La dirección aprobada no define:

- estructura del participante;
- tipos formales de participante;
- cardinalidades;
- identidad física;
- relación con User;
- relación con Customer;
- participación de operadores humanos;
- participación futura de asistentes de IA.

Por lo tanto, `Conversation`, `Message` y `Participant` se mencionan aquí como **conceptos**, no como entidades físicas aprobadas.

---

## 7. Mensajes

Un mensaje es conceptualmente una unidad de comunicación dentro de una conversación.

El repositorio no contiene una decisión aprobada que defina:

- campos;
- tipos;
- estados;
- ordenamiento;
- edición;
- eliminación;
- lectura;
- adjuntos;
- metadata;
- idempotencia;
- entrega;
- recepción;
- persistencia.

Por ello, ningún modelo de mensaje se fija en este documento.

La especificación canónica de Messaging confirma expresamente que el message model, read/unread states, attachments, realtime y notifications permanecen OPEN DETAIL.

---

## 8. Realtime y experiencia conversacional

La experiencia conversacional puede requerir interacción cercana al tiempo real, pero **no existe una decisión aprobada sobre el mecanismo técnico**.

Por tanto, este documento no selecciona:

- WebSocket;
- Server-Sent Events;
- polling;
- Redis;
- pub/sub;
- message broker;
- colas;
- infraestructura adicional.

La capacidad funcional de comunicación en tiempo real, si se requiere, debe definirse posteriormente mediante la especificación correspondiente.

---

## 9. Canales

El MVP inicial utiliza el sistema de mensajería propio de Wapsell.

AS-IS:

- WhatsApp no está implementado.
- No existe integración funcional con proveedores externos de mensajería.
- `Pedido.canalOrigen` puede contener el string descriptivo `WhatsApp`, pero eso no constituye una integración.
- Tampoco existe un dominio de Messaging implementado en `apps/api/src`.

TO-BE:

- Wapsell Messaging es el canal propio inicial.
- Los canales adicionales permanecen OPEN.
- No se crea una dependencia con WhatsApp.
- No se define ningún proveedor externo.

La ausencia de WhatsApp en el MVP no significa que se haya decidido prohibir una futura integración.

---

## 10. Relación con Commerce

Messaging no reemplaza Commerce.

| Capacidad | Responsabilidad conceptual |
|---|---|
| Messaging | Interacción conversacional |
| Customer | Relación comercial |
| Catalog | Productos y oferta |
| Order | Solicitud/intención de compra |
| Sale | Operación comercial confirmada |
| Payment | Pago |
| Inventory | Existencias y movimientos |
| Fulfillment | Preparación y entrega |

La conversación puede presentar información de estos dominios y conducir operaciones comerciales cuando los requisitos de cada dominio lo permitan.

No se define aquí ningún contrato entre estos dominios.

---

## 11. Relación con Order

D-007 establece que Order y Sale son conceptos diferentes.

Desde Messaging:

```
Conversation
    |
    +--> intención de compra
             |
             v
           Order
             |
       condiciones de
       conversión definidas
             |
             v
           Sale
```

Esto es una relación conceptual.

No se definen aquí:

- estados de Order;
- estados de Conversation;
- condiciones de conversión;
- quién puede convertir;
- cuándo se considera confirmada una Order;
- efectos sobre stock;
- efectos sobre caja;
- efectos sobre pagos.

Esos puntos pertenecen a Commerce y sus futuras capas de Contracts/Invariants.

---

## 12. Relación con Sale

D-008 establece que una Sale posee un ciclo de vida explícito y que la confirmación constituye el momento de aplicación de sus efectos comerciales, operativos y económicos correspondientes.

Messaging puede ser el contexto de interacción que conduce a una Sale, pero no redefine el lifecycle de Sale.

En particular:

- Messaging no define cuándo una Sale está confirmada.
- Messaging no define la anulación.
- Messaging no define reversiones.
- Messaging no define efectos sobre Inventory, Cash, Payments o AR.

Esos efectos permanecen bajo las decisiones y especificaciones de sus dominios.

---

## 13. Relación con Fulfillment

D-016 establece Fulfillment como parte del dominio de Orders y no necesariamente como módulo principal de navegación.

Messaging puede servir como superficie para:

- comunicar preparación;
- comunicar disponibilidad;
- comunicar entrega;
- comunicar incidencias;

siempre que las reglas correspondientes sean definidas en el dominio Fulfillment.

No se define aquí:

- tracking;
- zonas;
- tarifas;
- repartidores;
- evidencia de entrega;
- estados de fulfillment;
- notificaciones de entrega.

Todos esos detalles permanecen OPEN según D-016.

---

## 14. Asistentes de IA

### 14.1 Dirección aprobada

Los asistentes de IA forman parte del producto Wapsell.

D-003 establece que durante el MVP inicial:

- la capacidad técnica puede quedar preparada;
- los asistentes permanecen **inactivos**.

### 14.2 Qué NO está decidido

La documentación disponible no determina:

- qué tareas ejecutará un asistente;
- qué información podrá consultar;
- qué acciones podrá ejecutar;
- si podrá crear Orders;
- si podrá modificar Orders;
- si podrá intervenir sobre Sales;
- si podrá acceder a Customer;
- si podrá acceder a datos financieros;
- cuándo se activará;
- qué permisos tendrá;
- cómo se distinguirá de un vendedor humano;
- qué mecanismos de supervisión tendrá;
- qué canales utilizará;
- qué modelo o proveedor utilizará.

No se define ninguno de esos puntos.

### 14.3 Estado del MVP

```
MVP
 |
 +--> Messaging propio Wapsell ........ ACTIVO
 |
 +--> Human interaction ............... PERMITIDO / POR DEFINIR EN DETALLE
 |
 +--> AI assistant .................... PREPARADO / INACTIVO
```

El diagrama es conceptual y no constituye una arquitectura de ejecución.

---

## 15. AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| AS-IS | GAP | DECISION | TO-BE | OPEN DETAIL |
|---|---|---|---|---|
| No existe módulo `conversacion` | Messaging parte sin implementación funcional | DEC-001 + D-003 | Messaging forma parte del MVP | modelo físico y lifecycle |
| No existe módulo `mensaje` | No existe sistema propio de mensajes | D-003 | Sistema propio Wapsell | message model |
| WhatsApp no está implementado | No existe canal conversacional externo | D-003 | MVP no depende de WhatsApp | canales adicionales |
| No existe asistente | AI ausente del AS-IS | DEC-001 + D-003 | IA forma parte de la dirección de producto, inactiva en MVP | alcance funcional |
| `Cliente` existe separado de `Usuario` | El modelo AS-IS no representa User/Membership TO-BE | D-002 + D-002-bis | Customer separado de User, vínculo opcional | identidad y vinculación |
| Commerce existe con ventas/pedidos | Falta superficie conversacional | DEC-001 | Messaging actúa como interfaz sobre Commerce | contratos entre dominios |
| `Pedido.canalOrigen` acepta texto `WhatsApp` sin integración | Canal descriptivo sin sistema detrás | D-003 | No interpretar ese campo como integración | tratamiento futuro de canales |
| No existe dominio Fulfillment funcional | Pedidos y conversación no tienen flujo TO-BE completo | D-016 | Messaging puede interactuar con Fulfillment | eventos, estados y notificaciones |

---

## 16. Open Details de Messaging

Ninguno se resuelve en este documento.

| # | Open Detail | Autoridad / origen |
|---|---|---|
| 1 | Modelo conceptual detallado de Conversation | Messaging SPEC |
| 2 | Lifecycle de Conversation | Messaging SPEC |
| 3 | Modelo de Message | Messaging SPEC |
| 4 | Estados de lectura/no lectura | Messaging SPEC |
| 5 | Attachments | Messaging SPEC |
| 6 | Realtime | Messaging SPEC |
| 7 | Notifications relacionadas con Messaging | Messaging SPEC |
| 8 | Canales adicionales al canal propio Wapsell | D-003 / Messaging SPEC |
| 9 | Identidad del participante anónimo | D-002-bis + ausencia de definición Messaging |
| 10 | Vinculación Customer ↔ User dentro de una conversación | D-002-bis |
| 11 | Reglas de identidad/merge de participantes | No decidido |
| 12 | Asignación de conversaciones a usuarios humanos | No decidido |
| 13 | Permisos específicos de Messaging | D-005 / D-006 |
| 14 | Estados y lifecycle de atención humana | No decidido |
| 15 | Integración conceptual exacta con Order | D-007 + Messaging |
| 16 | Condiciones de conversión Order → Sale desde Messaging | D-007 |
| 17 | Efectos de Sale originada desde Messaging | D-008 |
| 18 | Integración con Fulfillment | D-016 |
| 19 | Notificaciones de Fulfillment dentro de Messaging | D-016 + Messaging |
| 20 | Functional scope de asistentes IA | DEC-001 explícitamente excluye el detalle |
| 21 | Boundary automation ↔ human intervention | DEC-001 / Messaging SPEC |
| 22 | Permisos y operaciones futuras de IA | D-005/D-006 + DEC-001 |
| 23 | Momento de activación de IA | D-003 |
| 24 | Modelo técnico de realtime | Implementation Detail |
| 25 | Retención y ciclo de vida de mensajes | No decidido |
| 26 | Auditoría de mensajes y operaciones conversacionales | No decidido |
| 27 | Integración futura con proveedores externos | No decidido |
| 28 | Reglas de privacidad/seguridad específicas de Messaging | No decidido |

---

## 17. Evidencia

| Conclusión | Clasificación |
|---|---|
| Conversación como interfaz comercial central | **DOCUMENTADO** — DEC-001 |
| Messaging activo en MVP | **DOCUMENTADO** — D-003 / Decision Register |
| Canal inicial propio de Wapsell | **DOCUMENTADO** — D-003 |
| IA incluida como dirección de producto | **DOCUMENTADO** — DEC-001 / D-003 |
| IA inactiva durante MVP | **DOCUMENTADO** — D-003 |
| WhatsApp no implementado AS-IS | **VERIFICADO POR CÓDIGO** |
| No existe módulo `conversacion` / `mensaje` AS-IS | **VERIFICADO POR CÓDIGO** |
| No existe integración funcional de WhatsApp | **VERIFICADO POR CÓDIGO** |
| Customer separado de User | **DOCUMENTADO** — D-002-bis |
| Order y Sale conceptualmente diferentes | **DOCUMENTADO** — D-007 |
| Fulfillment pertenece al dominio de Orders | **DOCUMENTADO** — D-016 |
| Message model, read states, attachments, realtime y notifications | **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE** |
| Functional scope de IA | **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE** |
| Canales adicionales | **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE** |

No se agregan conclusiones derivadas de ausencia de código como si fueran decisiones de producto.

---

## 18. Conflictos relacionados

### CON-011 — Messaging / AI

**Estado: OPEN.**

La documentación TO-BE puede registrar la dirección aprobada de DEC-001/D-003, pero no puede cerrar CON-011 porque permanecen abiertos el modelo de Messaging y, especialmente, el functional scope de los asistentes de IA.

### Conflictos de Commerce

Los conflictos relacionados con Order, Sale, Payments, Cash y Fulfillment permanecen en sus respectivos dominios.

Este documento no los cierra mediante inferencia.

---

## 19. Trazabilidad

| Dirección | Fuente |
|---|---|
| Conversation = interfaz comercial central | DEC-001 |
| Messaging activo en MVP | D-003 |
| Canal propio Wapsell | D-003 |
| IA incluida pero inactiva en MVP | D-003 |
| Business como contexto | D-001 |
| User/Membership | D-002 |
| Customer separado de User | D-002-bis |
| Roles/permisos en Membership | D-005 |
| Authorization contextual | D-006 |
| Order ≠ Sale | D-007 |
| Sale lifecycle | D-008 |
| Fulfillment | D-016 |

La matriz maestra de trazabilidad actualmente registra contratos, invariantes y tests como NOT DOCUMENTED para estas decisiones. Este documento no altera esa situación.

---

## 20. Cierre de fase

**Fase 6.6 — TO-BE Messaging: completada como documentación conceptual.**

Se estableció:

- Messaging como interfaz comercial central.
- Messaging activo en el MVP.
- Sistema de mensajería propio de Wapsell.
- Ausencia de dependencia de WhatsApp para el MVP.
- Customer separado de User.
- Integración conceptual con Commerce, Order, Sale y Fulfillment.
- Asistentes de IA como dirección de producto, preparados para incorporación posterior pero inactivos en MVP.

No se estableció:

- schema;
- entidades físicas;
- estados;
- contratos;
- invariantes;
- tests;
- APIs;
- realtime técnico;
- proveedores;
- permisos concretos;
- functional scope de IA.

**Decisiones creadas: 0. Requisitos inventados: 0. Estados inventados: 0. IDs inventados: 0. Entidades físicas definidas: 0. Conflictos resueltos: 0.**

La siguiente etapa documental debe continuar con el próximo dominio TO-BE definido por el roadmap antes de pasar a Contracts, Invariants, Tests e Implementation.
