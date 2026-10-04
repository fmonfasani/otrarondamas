# OR-B2 — Owner Decision Closure (conflictos C-01…C-22)

**Fecha:** 2026-10-03
**Owner:** Federico Monfasani
**Estado:** REGISTRO DE CIERRE — NO NORMATIVO. No crea decisiones. Mapea las decisiones `OR-B2-001 … OR-B2-026` (ver `20-OR-B2-OWNER-DECISIONS-2026-10-03.md`) a los conflictos de la auditoría de Block 2 y deja visibles los abiertos.
**Alcance del cambio:** solo documentación. Sin commit. Sin push.

```text
TECHNICAL SPECIFICATION = NOT APPROVED
IMPLEMENTATION = NOT AUTHORIZED
```

Etiquetas: `RESOLVED BY OWNER` · `PARTIAL` · `DOCUMENTAL` · `OPEN OWNER DECISION` · `OPEN IMPLEMENTATION DETAIL`. Además `FUTURE / OPEN` y `NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE`.

`OPEN OWNER DECISION` es una etiqueta añadida por el redactor: el pedido del Owner preveía solo `RESOLVED BY OWNER` y `OPEN IMPLEMENTATION DETAIL`, pero hay conflictos abiertos que no son detalle de implementación y rotularlos así sería falso.

Los conflictos históricos C-01…C-22 provienen de la auditoría documental de Block 2 (2026-10-03). No se eliminan ni se reescriben: la tabla registra su estado posterior a OR-B2.

---

## 1. Mapeo C-01 … C-22

| C | Conflicto (título de la auditoría) | Etiqueta | OR-B2 que lo cubre | Qué queda abierto |
|---|---|---|---|---|
| C-01 | Customer vs User | `RESOLVED BY OWNER` | 004 | Corrección documental de SPEC §5 ("todo converge en User"): `DOCUMENTAL`, ver nota POST-OR-B2 en el SPEC |
| C-02 | Estado de D-005, D-006, D-008, D-011, D-013, D-015, D-016, D-017 | `PARTIAL` | 001, 002, 008, 009, 012–015, 024 tocan D-005, D-006, D-007, D-008 y D-017 | `OPEN OWNER DECISION` para D-011, D-013, D-015 (cláusulas no cubiertas) y D-016. Falta unificar el vocabulario de estado (APPROVED-DER / OPEN / NOT CONSULTED) |
| C-03 | Redacción base de §4 del Registro | `PARTIAL` | 002, 013, 015, 024 | Cláusulas de D-009, D-011, D-013, D-015 y la cláusula K8s/GraphQL de D-017 siguen sin ruling. OR-B2-024 dice que GraphQL/Kubernetes "no quedan aprobados"; si están prohibidos: NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE |
| C-04 | D-006, cantidad de validaciones | `RESOLVED BY OWNER` | 002 (4 validaciones) | Mecanismo del token y enforcement: `OPEN IMPLEMENTATION DETAIL` |
| C-05 | D-013, operaciones sensibles de Cash | `OPEN OWNER DECISION` | Ninguna. OR-B2-002 aplica a toda operación protegida pero no decide Cash | Autorización de operaciones sensibles de caja (D-013) |
| C-06 | D-008, anulación de Sale | `RESOLVED BY OWNER` | 015 (más 012, 013) | Estados y reversa de efectos: `OPEN IMPLEMENTATION DETAIL` |
| C-07 | Stack y K8s/GraphQL | `PARTIAL` | 024 | El stack deja de presentarse como decidido. La cláusula de prohibición de K8s/GraphQL queda sin ruling |
| C-08 | Ubicaciones de inventario | `RESOLVED BY OWNER` (alcance) | 017 | Cuántas branches y warehouses hay en el MVP: `OPEN OWNER DECISION`. Modelo físico de Location: `OPEN IMPLEMENTATION DETAIL` |
| C-09 | FIFO vs FEFO | `RESOLVED BY OWNER` | 016 | Unidad de rotación (lote o fecha de ingreso): `OPEN IMPLEMENTATION DETAIL` |
| C-10 | Modelo de roles | `RESOLVED BY OWNER` | 001, 008, 009 | Catálogo de Permissions y qué puede cada rol: `OPEN IMPLEMENTATION DETAIL` |
| C-11 | Rol de plataforma / SaaS Admin | `OPEN OWNER DECISION` | Ninguna para SaaS Admin. OR-B2-008 solo enumera Membership Roles; la aclaración del Owner deja a Repartidor fuera del MVP | SaaS Admin (REQ-SAAS-001): sin decisión. Repartidor (REQ-FUL-003): `FUTURE / OPEN`, no es Membership Role del MVP |
| C-12 | Messaging "módulo" | `RESOLVED BY OWNER` | 019 | Forma visual/de navegación: `OPEN IMPLEMENTATION DETAIL` |
| C-13 | Producto global vs del Business | `RESOLVED BY OWNER` (conceptual) | 010 | Qué campos son globales y quién gobierna el Product global: `OPEN OWNER DECISION`. Modelo físico de BusinessProduct: `OPEN IMPLEMENTATION DETAIL` |
| C-14 | Titular del Cart y del Order | `RESOLVED BY OWNER` (parcial) | 004, 011 | Titular de un Cart sin Customer y de la Order: NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE (`OPEN OWNER DECISION`) |
| C-15 | Propiedad de la conversación | `RESOLVED BY OWNER` | 021 (coincide con G65) | Participante Customer sin User: NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE (`OPEN OWNER DECISION`) |
| C-16 | Cuándo nace la Sale | `RESOLVED BY OWNER` (parcial) | 012, 013, 014 | Quién confirma el Order: `OPEN OWNER DECISION`. Momento y flujo del descuento físico: `OPEN OWNER DECISION` / especificación especializada. Estados y transaction boundaries: `OPEN IMPLEMENTATION DETAIL` (no inventar) |
| C-17 | Estados de Payment | `OPEN OWNER DECISION` | Ninguna | Vocabulario de estados de Payment (D-011 vs REQ-PAY-003) |
| C-18 | SPEC GENERAL, coherencia interna | `DOCUMENTAL` | — | El SPEC se contradice y quedó desfasado. Es trabajo de consolidación, no decisión. Esta propagación solo añade notas |
| C-19 | Procedencia de Business, User y Membership | `DOCUMENTAL` | — | Corregir las etiquetas de procedencia de SPEC §3. Esta propagación solo añade nota POST-OR-B2 |
| C-20 | Nomenclatura "R1/R2/R3" | `OPEN OWNER DECISION` | Ninguna | Los rótulos R1/R2/R3 tienen dos significados (Registro/R2/R3 vs Requirements). No renombrado en esta propagación |
| C-21 | Decisiones del Owner vs workshop | `RESOLVED BY OWNER` | 022 | Relabel "WORKSHOP DECISION" → "WORKSHOP CANDIDATE" en Requirements (aplicado de forma aditiva) |
| C-22 | Nivel de Requirements en la precedencia | `PARTIAL` | 023 | Ubicación de Requirements, Specialized Specs, Contracts y AS-IS en la precedencia: `OPEN OWNER DECISION`. Los 7 documentos de `00-GOVERNANCE` siguen `PROPOSED` |

Conteo según esta tabla (22 conflictos): `RESOLVED BY OWNER` 12 · `PARTIAL` 4 · `OPEN OWNER DECISION` 4 · `DOCUMENTAL` 2. Dentro de `RESOLVED BY OWNER`, C-08, C-13, C-14, C-15 y C-16 conservan un detalle abierto (columna final).

---

## 2. Decisiones históricas superseded o corregidas

Ninguna se borra. Cada una conserva su texto como evidencia y se anota con "superseded/confirmado por OR-B2-nnn".

| Histórica | Tratamiento | Por |
|---|---|---|
| D-005, D-006, D-007, D-017 (texto DERIVED) | Reafirmadas o promovidas en lo conceptual, en el alcance de §9.3 del Registro. El texto original queda como evidencia | 001, 002, 008, 009, 012, 024 |
| SPEC §5 "todo converge en User" | Superseded | 004 |
| SPEC §13 y TO-BE Inventory §10 "MVP sin ubicaciones" | Superseded | 017 |
| SPEC §22 "FIFO" frente a REQ-INV-005 "FEFO" | Unificado (FEFO con vencimiento, FIFO sin vencimiento). No se borra ninguno | 016 |
| REQ-MSG-003 "no exclusivamente a un Business" | Superseded | 021 |
| REQ-AUTHZ Profile → Role → Capability → Overrides | Superseded como modelo del MVP. No se descarta para etapas posteriores | 001 |
| "Owner/Admin" fusionado (REQ-MSG-003, SPEC, G13/G67/G68/G69) | Superseded en la fusión de roles. Los permisos de cada uno quedan abiertos | 009 |
| Catálogo de roles de `13-AUDIT/11` (Gestor de Stock, Cliente/Comprador y Proveedor como roles; Repartidor independiente) y `09-TRANSFORMATION/*`, `12-DOMAIN-WORK/.../05-OWNER-DECISION-PACK-v0.1.md` | Superseded en lo que contradice OR-B2-008 y la aclaración del Owner. No se editan (históricos). Customer y Supplier no son Membership Roles; Repartidor es `FUTURE / OPEN` | 008 |
| SPEC §20 stack como decisión | Superseded: solo la dirección Modular Monolith está aprobada | 024 |
| REQ §1.1 "WORKSHOP DECISION" | Relabel aditivo a "WORKSHOP CANDIDATE" | 022 |
| Terminología "Operador de Stock" y "Gestor/Operador de Stock" | Fuera del texto verbatim de OR-B2-008 (conservado con nota), solo aparece en `12-DOMAIN-WORK/IDENTITY-TENANCY/05-OWNER-DECISION-PACK-v0.1.md` (histórico, no se edita). Rige Gestor de Stock | 008 (aclaración del Owner) |
| Workshop 001–490, respuesta 002 (roles oficiales iniciales: Owner, Asistente de local, Cliente mayorista, Proveedor, Repartidor, Cliente minorista, Administrador SaaS) | Permanece como candidato de discovery (no normativo). No define el catálogo de Membership Roles del MVP | 008, 022 |

Repartidor y D-016: Repartidor queda fuera del MVP como Membership Role (`FUTURE / OPEN`). Eso no cierra D-016 (gestión de Fulfillment/repartidores por el Business, `OPEN OWNER DECISION`) ni el REQ-FUL-003: siguen abiertos y no se promueven.

Documentos fuera de la lista autorizada que mencionan Repartidor o catálogos anteriores y quedan **pendientes** de nota: `06-SPECIFICATIONS/SPECIALIZED/00-R2-SPECIALIZED-SPECS-BASELINE-001-490.md` (menciona Repartidor). No se editó por no estar en el alcance autorizado.

### Decisiones previas que se mantienen

- DEC-001, D-001, D-002, D-002-bis.
- OR-001, OR-002-A…F, P1-A, P5-B, CON-010 (dirección conceptual), ISS-08 y WhatsApp.
- D-010 y D-014 (§4.3.1 del Registro). D-010 sigue `NON-COMPLIANT/GAP` en el AS-IS.
- OR-B2-004, 005, 006, 020 y 023 las reafirman (020 y 023 con promoción parcial / aprobación formal).

---

## 3. Decisiones que siguen abiertas

### 3.1 OPEN OWNER DECISION

- D-011, D-013, D-015 y D-016 (Payment, Cash, Purchases, Fulfillment), en lo no cubierto por OR-B2.
- C-17: vocabulario de estados de Payment.
- C-05: autorización de operaciones sensibles de Cash.
- C-11: SaaS Admin (¿está en el MVP?).
- C-20: rótulos R1/R2/R3.
- Ubicación de Requirements, Specialized Specs, Contracts y AS-IS en ISS-08 (C-22).
- Cantidad de branches y warehouses del MVP (C-08).
- Campos globales frente a campos del Business en Product/BusinessProduct (C-13).
- Quién confirma/acepta el Order: REQ-ORD-002 dice "el Customer confirma"; OR-B2-013 dice "confirmado/aceptado comercialmente" (C-16).
- Titular del Cart cuando no hay Customer (C-14).
- Customer participante de una Conversation sin User (C-15).
- Momento y flujo del descuento físico de stock (OR-B2-014).
- Cláusula K8s/GraphQL de D-017: ¿prohibidos o solo no aprobados? (C-03, C-07).
- Criterio "mismo email" para vincular Customer ↔ User (D1 de OR-002-D).
- CON-008, CON-011 y GRF-02.
- OR-003 y OR-005: siguen sin definir. Los IDs no se reutilizan.

### 3.2 OPEN IMPLEMENTATION DETAIL

- Modelo físico, schema, tablas y migraciones de Business/User/Membership/Customer/Product/BusinessProduct/Location.
- Mecanismo de transición, coexistencia física, cutover y rollback (OR-B2-006).
- Mecanismo de token y de enforcement de la autorización (OR-B2-002).
- Algoritmo de normalización del email (OR-B2-005).
- Catálogo de Permissions y permisos por rol, incluida la diferencia Owner/Admin (OR-B2-001, 008, 009).
- Transiciones del lifecycle de Membership (OR-B2-003).
- Mecanismo del Business Switch (OR-B2-007).
- Estados técnicos de Order/Sale y transaction boundaries (OR-B2-012…014). No se inventan.
- Mecanismos de cancelación, reversión y refund (OR-B2-015).
- Unidad de rotación FIFO/FEFO: lote o fecha (OR-B2-016).
- Modelo físico de Locations/Warehouses (OR-B2-017).
- Stack técnico: NestJS, PostgreSQL, Docker, VPS, GraphQL, Kubernetes (OR-B2-024).
- Reglas concretas de Pricing/Promotions y de Returns/Refunds (OR-B2-025/026).

### 3.3 FUTURE / OPEN

- Repartidor: fuera del MVP como Membership Role. No se elimina del producto futuro. No entra al catálogo de Membership Roles del MVP.
- Condición de activación futura de IA: NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE.
- Profile → Role → Capability → Overrides: no adoptado para el MVP; no descartado para el futuro.

---

## 4. Revisión de G001–G105 (Messaging Functional Owner Decision Register)

Archivo: `12-DOMAIN-WORK/MESSAGING/00-FUNCTIONAL-OWNER-DECISION-REGISTER-G001-G105.md`. Leído completo antes de propagar a Messaging. **No se modificó.** Cada hallazgo se registra como conflicto o ambigüedad y no se resuelve por inferencia.

Resultado sobre los puntos pedidos:

| OR-B2 | Resultado |
|---|---|
| 008 (roles) | Sin conflicto. G001–G105 no nombra roles distintos de Owner/Admin y "otros roles"; no usa "Operador de Stock" ni "Gestor de Stock" ni Repartidor |
| 009 (Owner ≠ Admin) | Sin incompatibilidad, con una ambigüedad: ver G-N1 |
| 019 (Messaging de primera clase) | Sin conflicto |
| 021 (Conversation pertenece a un Business) | Coincide con G65 ("exactly one Business") y G66. Ver G-N3 y G-N4 para participantes |
| 020 (sin dependencia de WhatsApp) | Sin conflicto: G001–G105 no depende de WhatsApp |

Ningún hallazgo cambia el significado de una OR-B2, así que no se detuvo ninguna propagación.

| ID | Hallazgo | G / OR-B2 implicados | Etiqueta |
|---|---|---|---|
| G-N1 | G13, G67, G68 y G69 tratan a Owner y Admin con los mismos permisos de acceso a conversaciones. OR-B2-009 los declara roles distintos pero no define qué permisos difieren. Las dos lecturas no se contradicen, pero no se puede afirmar que Admin conserve G67 por inferencia | G13, G67, G68, G69 / 009 | `OPEN IMPLEMENTATION DETAIL` |
| G-N2 | "administrator" en G5–G9 y G13 es el administrador del grupo de conversación. "Admin" en G67/G68 y en OR-B2-009 es un Membership Role. Mismo término para dos conceptos | G5–G9, G13, G67, G68 / 009 | `DOCUMENTAL` (terminología) |
| G-N3 | G2 permite que el Customer inicie conversaciones, y G44, G70 y G74 hablan de participantes. OR-B2-004/011/021 permiten Customer sin User. No se determina cómo participa en una Conversation un Customer sin User | G2, G44, G70, G74 / 004, 011, 021 | `OPEN OWNER DECISION` — NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE |
| G-N4 | OR-B2-003: una Membership INACTIVE no opera sobre el Business. G44, G67, G69, G72 y G74 no dicen qué pasa con la participación, el acceso y la identidad histórica de un participante o de un Owner/Admin con Membership INACTIVE | G44, G67, G69, G72, G74 / 003 | `OPEN IMPLEMENTATION DETAIL` — NO DETERMINABLE |
| G-N5 | G51, G58 y G102 asocian Product a una conversación (que es de un Business, G65). OR-B2-010 dice que Product es global y que los datos del Business viven en BusinessProduct. No se define a cuál de los dos apunta la asociación | G51, G58, G102 / 010, 021 | `OPEN IMPLEMENTATION DETAIL`, dependiente de la decisión abierta sobre campos globales |
| G-N6 | G001–G105 se declara "APPROVED — OWNER DECISIONS" y no figura en el Decision Register. OR-B2-023 dice que un documento derivado no gana autoridad por existir, y OR-B2-022 cubre solo el Workshop 001–490. El nivel de este registro en ISS-08 no está definido (extensión de C-22). En esta propagación se usó solo como control de consistencia, nunca como autoridad para el significado de una OR-B2 | Encabezado y §4 de G / 022, 023 | `OPEN OWNER DECISION` |
| G-N7 | La procedencia de G (§4) y `12-DOMAIN-WORK/00-CONTROLLED-DESIGN-PACKAGES/01-ARTIFACT-INVENTORY-AND-PERSISTENCE-MANIFEST.md` citan `00-PREPROCESS/MESSAGING/…`, ruta que ya no existe (el archivo está en `12-DOMAIN-WORK/MESSAGING/`) | G §4 | `DOCUMENTAL` (ruta obsoleta; no se edita evidencia) |
| G-N8 | G10 dice que una conversación de grupo borrada queda completamente inaccesible para los usuarios, y G44 que salir del grupo quita el acceso. G67 dice que Owner/Admin pueden acceder a cualquier conversación del Business. No se define si G67 prevalece. Es interno de G, no de OR-B2 | G10, G44, G67 | `OPEN OWNER DECISION` — interno de G001–G105 |

---

## 5. Qué esta propagación no hizo

- No modificó código, Prisma, schema, migraciones, frontend, Docker ni configuración.
- No modificó `04-ASIS/`, `13-AUDIT/`, `15-HISTORY/`, documentos históricos `11-*` a `19-*` ni `02-DISCOVERY/CONFLICTS/`.
- No reescribió D-001…D-018, DEC-001, OR-001…OR-002-F, OR-003 ni OR-005.
- No modificó G001–G105.
- No promovió AS-IS a TO-BE ni declaró implementado nada.
- No aprobó los documentos de `00-GOVERNANCE` salvo ISS-08 (OR-B2-023). Siguen `PROPOSED`.
- No redactó la SPEC GENERAL consolidada.

```text
TECHNICAL SPECIFICATION = NOT APPROVED
IMPLEMENTATION = NOT AUTHORIZED
```
