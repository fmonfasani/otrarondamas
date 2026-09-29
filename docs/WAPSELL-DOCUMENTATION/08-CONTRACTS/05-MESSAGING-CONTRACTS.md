# Wapsell — Contracts / Messaging
**Fase:** Contracts 5.0 — Messaging · **Creado:** 2026-09-29 · **Estado:** DRAFT — NOT APPROVED

> Este documento formaliza únicamente las fronteras y obligaciones observables ya documentadas para Messaging.
> No convierte los Open Details del TO-BE en decisiones.
> No crea decisiones, estados, schema, APIs, permisos, invariantes, tests ni implementación.

## 1. C-MSG-001 — Messaging active in MVP
**Source:** D-003 + DEC-001.
Messaging forma parte del MVP inicial y constituye la interfaz conversacional comercial central.
- Messaging debe formar parte del producto MVP.
- La conversación puede actuar como superficie de interacción con el motor comercial/operativo.
- Commerce/ERP permanece como motor operativo detrás de la conversación.
**Open:** physical model, lifecycle, API, transport, persistence, realtime and notifications.

## 2. C-MSG-002 — Wapsell-owned messaging channel
**Source:** D-003.
El canal inicial es el sistema de mensajería propio de Wapsell.
- El MVP inicial no requiere WhatsApp como canal.
- No debe existir dependencia arquitectónica del MVP respecto de WhatsApp.
- Los canales adicionales permanecen abiertos para una especificación posterior.
La ausencia de dependencia de WhatsApp no constituye una prohibición de una integración futura.

## 3. C-MSG-003 — Business context
**Source:** D-001 + Messaging TO-BE.
La interacción comercial conversacional opera dentro del contexto de un Business.
- La conversación comercial pertenece conceptualmente al Business con el que interactúa el comprador.
- Debe respetarse el aislamiento comercial entre Business.
- No se define aquí el modelo físico de pertenencia.
**Open:** persistence model and authorization enforcement.

## 4. C-MSG-004 — Customer/User separation
**Source:** D-002-bis + Messaging TO-BE.
Customer y User son conceptos distintos.
- Customer representa la relación comercial con el Business.
- Customer puede existir sin User.
- Customer puede vincularse opcionalmente a un User.
- Messaging no debe asumir que todo comprador requiere previamente una identidad global Wapsell.
**Open:** participant identity, anonymous participation, linking/merge rules and lifecycle.

## 5. C-MSG-005 — Membership authorization boundary
**Source:** D-005 + D-006 + Messaging TO-BE.
Las operaciones de Messaging realizadas por usuarios autenticados deben respetar el contexto Business/Membership y las reglas de autorización aplicables.
Este contrato no define el catálogo de roles ni permisos específicos de Messaging.
**Open:** exact authorization checks, role catalogue, permission catalogue and assignment rules.
Los detalles de implementación de D-006 permanecen abiertos en el Decision Register.

## 6. C-MSG-006 — Conversation as commercial interface
**Source:** DEC-001 + Messaging TO-BE.
La conversación es una superficie de interacción; el resultado comercial pertenece a los dominios correspondientes.
Messaging puede presentar o conducir interacciones relacionadas con Customer, Catalog, Order, Sale, Payment, Inventory y Fulfillment.
Messaging no redefine el lifecycle de esos dominios.

## 7. C-MSG-007 — Order boundary
**Source:** D-007 + Messaging TO-BE.
Order y Sale permanecen conceptualmente separados.
Una interacción conversacional puede originar una Order cuando corresponda. Una Order puede eventualmente originar una Sale bajo las condiciones definidas por Commerce.
- Messaging no convierte por sí mismo toda interacción en Sale.
- Messaging no define las condiciones de conversión Order → Sale.
- Una Sale puede originarse directamente por una venta presencial/POS sin Messaging.
**Open:** Order states, conversion conditions, authorization and domain effects.

## 8. C-MSG-008 — Sale lifecycle boundary
**Source:** D-008 + Messaging TO-BE.
Messaging puede conducir a una Sale, pero no redefine su lifecycle.
Messaging no determina confirmación, anulación, reversiones ni efectos sobre Inventory, Cash, Payments o AR.
Esas reglas pertenecen a Commerce y a los contratos específicos de cada dominio.

## 9. C-MSG-009 — Fulfillment boundary
**Source:** D-016 + Messaging TO-BE.
Fulfillment pertenece al dominio de Orders.
Messaging puede comunicar preparación, disponibilidad, entrega o incidencias cuando las reglas de Fulfillment lo permitan.
Messaging no define tracking, zonas, tarifas, repartidores, evidencia, estados de Fulfillment ni notificaciones de entrega.

## 10. C-MSG-010 — Conceptual conversation participants
**Source:** Messaging TO-BE.
Messaging requiere conceptualmente participantes de una interacción.
Conversation, Message y Participant se mantienen como conceptos y no como entidades físicas aprobadas por este contrato.
No se fija estructura, cardinalidad, identidad física, tipos formales de participante ni participación humana/IA.

## 11. C-MSG-011 — Message model remains open
**Source:** Messaging TO-BE.
Un Message es conceptualmente una unidad de comunicación dentro de una Conversation.
Este contrato no define campos, tipos, estados, ordenamiento, edición, eliminación, lectura, adjuntos, metadata, idempotencia, entrega, recepción ni persistencia.
Cualquier contrato físico o API deberá derivarse de una especificación posterior aprobada.

## 12. C-MSG-012 — Realtime remains implementation-open
**Source:** Messaging TO-BE.
No existe una decisión aprobada sobre el mecanismo técnico de realtime.
No se selecciona WebSocket, Server-Sent Events, polling, Redis, pub/sub, broker, colas ni infraestructura adicional.

## 13. C-MSG-013 — AI inactive during MVP
**Source:** D-003 + DEC-001.
Los asistentes de IA forman parte de la dirección de producto, pero permanecen inactivos durante el MVP inicial.
- La capacidad técnica puede quedar preparada.
- El MVP no depende de un asistente de IA.
- Este contrato no autoriza ejecución autónoma de IA.
**Open:** functional scope, permissions, data access, actions, supervision, activation criteria, models/providers and channels.

## 14. C-MSG-014 — No undocumented channel integration
**Source:** D-003 + Messaging TO-BE.
No debe interpretarse un campo descriptivo como Pedido.canalOrigen = WhatsApp como evidencia de una integración funcional.
El sistema propio de Wapsell es la dirección documentada para el Messaging inicial. La cláusula específica sobre dependencia/no dependencia de WhatsApp permanece **PENDING OWNER RULING** según el Decision Register vigente; no debe utilizarse este Contract para cerrar esa cuestión. Las integraciones con proveedores externos permanecen abiertas.

## 15. Domain boundaries
| Boundary | Responsibility | Status |
|---|---|---|
| Messaging ↔ Customer | Contextualizar interacción comercial | Defined conceptually |
| Messaging ↔ User/Membership | Identidad y autorización | Details OPEN |
| Messaging ↔ Catalog | Presentar/interactuar con oferta | Boundary only |
| Messaging ↔ Order | Originar/interactuar con intención de compra | Boundary defined; details OPEN |
| Messaging ↔ Sale | Conducir interacción; no redefinir lifecycle | Boundary defined |
| Messaging ↔ Payment | Acompañar proceso comercial; no redefine Payment | Exact contract OPEN |
| Messaging ↔ Inventory | Presentar disponibilidad/interactuar con Commerce | Exact contract OPEN |
| Messaging ↔ Fulfillment | Comunicar información de entrega | Boundary defined; details OPEN |
| Messaging ↔ AI | Capability futura, inactiva en MVP | Functional scope OPEN |
| Messaging ↔ external channels | Future extension | OPEN |

## 16. AS-IS → GAP → DECISION → CONTRACT → OPEN DETAIL
| AS-IS / evidence | GAP | Decision | Contract | Open Detail |
|---|---|---|---|---|
| No existe dominio funcional de Messaging | Falta superficie conversacional | DEC-001 + D-003 | C-MSG-001 | physical model/lifecycle |
| WhatsApp no está implementado | No existe canal externo funcional | D-003 | C-MSG-002 | future channels |
| Customer y User están separados en TO-BE | Falta formalización Messaging | D-002-bis | C-MSG-004 | participant/link model |
| No existe modelo de autorización Messaging | Membership boundary | D-005/D-006 | C-MSG-005 | exact permissions/checks |
| Commerce existe AS-IS | Falta interfaz conversacional | DEC-001 | C-MSG-006 | domain contracts |
| Order/Sale son distintos | Riesgo de ocultar frontera | D-007 | C-MSG-007 | conversion conditions |
| Sale lifecycle pertenece a Commerce | Riesgo de acoplamiento | D-008 | C-MSG-008 | exact effects |
| Fulfillment pertenece a Orders | Falta superficie de comunicación | D-016 | C-MSG-009 | tracking/events/notifications |
| No existe modelo físico Conversation/Message | Falta sistema propio | D-003 | C-MSG-010/011 | entities/model/API |
| No existe mecanismo realtime definido | UX puede requerirlo | Messaging TO-BE | C-MSG-012 | transport/infrastructure |
| AI no está activa | Dirección futura requiere preparación | DEC-001/D-003 | C-MSG-013 | AI scope/permissions |
| Pedido.canalOrigen puede mencionar WhatsApp | Riesgo de interpretar texto como integración | D-003 | C-MSG-014 | future channel mapping |

## 17. Traceability
| Contract | Decision / source | TO-BE | Invariant | Test |
|---|---|---|---|---|
| C-MSG-001 | DEC-001 / D-003 | 05-MESSAGING | NOT CREATED | NOT CREATED |
| C-MSG-002 | D-003 | 05-MESSAGING | NOT CREATED | NOT CREATED |
| C-MSG-003 | D-001 | 05-MESSAGING | NOT CREATED | NOT CREATED |
| C-MSG-004 | D-002-bis | 05-MESSAGING | NOT CREATED | NOT CREATED |
| C-MSG-005 | D-005/D-006 | 05-MESSAGING | NOT CREATED | NOT CREATED |
| C-MSG-006 | DEC-001 | 05-MESSAGING | NOT CREATED | NOT CREATED |
| C-MSG-007 | D-007 | 05-MESSAGING + 02-COMMERCE | NOT CREATED | NOT CREATED |
| C-MSG-008 | D-008 | 05-MESSAGING + 02-COMMERCE | NOT CREATED | NOT CREATED |
| C-MSG-009 | D-016 | 05-MESSAGING + 02-COMMERCE | NOT CREATED | NOT CREATED |
| C-MSG-010 | Messaging TO-BE | 05-MESSAGING | NOT CREATED | NOT CREATED |
| C-MSG-011 | Messaging TO-BE | 05-MESSAGING | NOT CREATED | NOT CREATED |
| C-MSG-012 | Messaging TO-BE | 05-MESSAGING | NOT CREATED | NOT CREATED |
| C-MSG-013 | DEC-001/D-003 | 05-MESSAGING | NOT CREATED | NOT CREATED |
| C-MSG-014 | D-003 | 05-MESSAGING | NOT CREATED | NOT CREATED |

## 18. Open Details
1. Conversation physical model.
2. Conversation lifecycle.
3. Message physical model.
4. Message state model.
5. Read/unread semantics.
6. Attachments.
7. Message ordering and delivery semantics.
8. Message idempotency.
9. Message persistence and retention.
10. Realtime transport.
11. Notification mechanism.
12. Anonymous participant identity.
13. Customer ↔ User linking and merge rules.
14. Human conversation assignment.
15. Messaging-specific permissions.
16. Human attention lifecycle.
17. Order creation from Messaging.
18. Order → Sale conversion conditions.
19. Messaging effects related to Sale confirmation/cancellation.
20. Fulfillment integration.
21. Fulfillment notifications in Messaging.
22. AI functional scope.
23. AI permissions and data access.
24. AI activation criteria.
25. External channel integrations.
26. Privacy/security rules specific to Messaging.
27. Conversation/message audit requirements.
28. Exact APIs and event contracts.

## 19. Evidence classification
| Statement | Classification |
|---|---|
| Conversation is the central commercial interface | DOCUMENTED — DEC-001 |
| Messaging is active in MVP | DOCUMENTED — D-003 |
| Initial channel is Wapsell-owned messaging | DOCUMENTED — D-003 |
| D-003 WhatsApp non-dependency clause | **PENDING OWNER RULING — Decision Register §4.3.2** |
| Customer is separate from User | DOCUMENTED — D-002-bis |
| Order and Sale are distinct | DOCUMENTED — D-007 |
| Sale confirmation defines application of effects | DOCUMENTED — D-008 |
| Fulfillment belongs to Orders | DOCUMENTED — D-016 |
| AI is inactive during MVP | DOCUMENTED — D-003 |
| No functional WhatsApp integration AS-IS | **DOCUMENTED / AS-IS audit evidence; primary code verification belongs to the AS-IS/code audit** |
| No functional Conversation/Message domain AS-IS | **DOCUMENTED / AS-IS audit evidence; primary code verification belongs to the AS-IS/code audit** |
| Exact Message model | NOT DETERMINABLE WITH AVAILABLE INFORMATION |
| Exact realtime mechanism | NOT DETERMINABLE WITH AVAILABLE INFORMATION |
| Exact Messaging permissions | NOT DETERMINABLE WITH AVAILABLE INFORMATION |
| AI functional scope | NOT DETERMINABLE WITH AVAILABLE INFORMATION |
| External channel integration contract | NOT DETERMINABLE WITH AVAILABLE INFORMATION |

## 20. Closure
**Contracts 5.0 — Messaging: drafted.**

The contract layer formalizes only the documented Messaging boundaries and preserves unresolved implementation and product details as OPEN.

No decision, invariant, test, schema, migration or implementation change was created.