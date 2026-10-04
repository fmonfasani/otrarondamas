# OR-B2 — Decisiones del Owner (sesión 2026-10-03)

**Fecha:** 2026-10-03
**Owner:** Federico Monfasani
**Registro de sesión:** `OR-B2-SESSION-2026-10-03`
**Nivel de autoridad (ISS-08):** 1 — OWNER RULING. Series de IDs: `OR-B2-001 … OR-B2-026`.
**Estado:** OWNER-RULED a nivel conceptual. No es una especificación técnica.
**Alcance del cambio:** solo documentación. Sin commit. Sin push.

```text
TECHNICAL SPECIFICATION = NOT APPROVED
IMPLEMENTATION = NOT AUTHORIZED
```

Las decisiones autorizan la definición conceptual. No autorizan modelo físico, schema, migraciones, endpoints, estados técnicos ni transaction boundaries.

---

## 1. Contexto — Block 2

El repositorio estaba en `main`, HEAD = origin/main = `8862a1c`, working tree limpio. Block 1 estaba cerrado y publicado. La auditoría documental de Block 2 había concluido `BLOCKED — OWNER DECISION REQUIRED` por contradicciones entre decisiones, Requirements, SPEC y TO-BE (conflictos C-01…C-22).

El Owner revisó las 26 decisiones propuestas el 2026-10-03 y aceptó todas las recomendaciones. Texto verbatim del Owner:

````text
El Owner acaba de revisar las 26 decisiones propuestas y **ACEPTA TODAS LAS RECOMENDACIONES**.

Estas 26 resoluciones deben tratarse como **nuevas decisiones explícitas del Owner tomadas en esta sesión**, no como si históricamente hubieran estado aprobadas en los documentos anteriores.
````

Estas 26 resoluciones son decisiones nuevas y explícitas del Owner tomadas en esta sesión. No se hacen pasar por D-005, D-006, etc.: donde una decisión confirma o promueve una anterior, se indica en el campo "Tipo / relación" y la fila original no se modifica.

## 2. Cómo leer este registro

| Tipo | Significado |
|---|---|
| NUEVA | No existía decisión previa del Owner sobre el punto. |
| REAFIRMA | El Owner ya había decidido el punto (D-001, D-002, D-002-bis, OR-001, OR-002-x, ISS-08). Se confirma sin cambiarlo. |
| PROMUEVE | Existía una decisión DERIVED/RECONSTRUCTED (D-004…D-018) que ahora pasa a OWNER-RULED, solo en el alcance indicado. |

Vocabulario de estado: `APPROVED` · `OWNER-RULED` · `DERIVED` · `PROPOSED` · `OPEN` · `IMPLEMENTATION DETAIL`. Etiquetas de cierre usadas en el documento de cierre (`21-…`): `RESOLVED BY OWNER` · `PARTIAL` · `DOCUMENTAL` · `OPEN OWNER DECISION` · `OPEN IMPLEMENTATION DETAIL`.

El texto de cada decisión se copia tal cual lo entregó el Owner. Los campos de metadata (tipo, referencias históricas, conflictos, detalles abiertos) son trazabilidad añadida por el redactor, no texto del Owner.

---

## 3. Aclaraciones posteriores del Owner (confirmación de la sesión)

Texto verbatim del Owner, entregado después de las 26 decisiones. Prevalece sobre el texto original de OR-B2-008 en lo que lo contradice (ISS-08: la resolución posterior del mismo nivel prevalece).

````text
### 1. IDs

Aprobado el esquema:

`OR-B2-001 … OR-B2-026`

y:

`OR-B2-SESSION-2026-10-03`

como registro verbatim de la sesión.

### 2. Repartidor

Decisión adicional del Owner:

**Repartidor queda fuera del MVP como Membership Role.**

No se elimina conceptualmente del producto futuro; queda:

`FUTURE / OPEN`

No debe incorporarse al catálogo de Membership Roles del MVP.

### 3. Nomenclatura

La nomenclatura oficial del rol de stock será:

**Gestor de Stock**

No utilizar "Operador de Stock" como nombre normativo.

Por lo tanto, OR-B2-008 debe quedar normalizada conceptualmente como:

```text
Membership Roles MVP:
- Owner
- Admin
- Vendedor
- Gestor de Stock

Customer y Supplier no son Membership Roles.

Repartidor queda fuera del MVP y permanece FUTURE / OPEN.
```

No conviertas Supplier ni Customer en roles de Membership.
````

Efectos normativos:

- Los IDs `OR-B2-001 … OR-B2-026` y `OR-B2-SESSION-2026-10-03` quedan aprobados.
- Nomenclatura oficial: **Gestor de Stock**. "Operador de Stock" (que aparece en el texto verbatim de la decisión 8) no es nombre normativo.
- Membership Roles del MVP: Owner, Admin, Vendedor, Gestor de Stock. Customer y Supplier no son Membership Roles.
- Repartidor queda fuera del MVP como Membership Role. Estado: `FUTURE / OPEN`. No se elimina del producto futuro.

---

## 4. Las 26 decisiones

### A. Authorization / Identity

#### OR-B2-001

Texto verbatim del Owner (decisión 1):

````text
1. Modelo de autorización:

```text
Membership
  ↓
Role
  ↓
Permission
```

No se adopta Profile → Role → Capability → Overrides para el MVP.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-001` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Extiende (no reemplaza) D-005 (DERIVED) |
| Referencias históricas | D-005; REQ-AUTHZ-*; SPEC §3/§7; TO-BE Identity §4 |
| Estado anterior | DERIVED / PROPOSED (D-005) y WORKSHOP (REQ-AUTHZ-*: Profile → Role → Capability → Overrides) |
| Conflictos | C-10 (RESOLVED BY OWNER) |
| Detalle abierto | Catálogo de Permissions y reglas de precedencia: OPEN IMPLEMENTATION DETAIL |
| Implementación | NOT AUTHORIZED |

#### OR-B2-002

Texto verbatim del Owner (decisión 2):

````text
2. Un token válido no autoriza por sí mismo.

Toda operación protegida debe validar conceptualmente:

```text
Authenticated User
+
Target Business
+
Valid Membership
+
Role/Permission authorization
```
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-002` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | PROMUEVE. Promueve D-006 (DERIVED, cláusula pendiente de ruling) a OWNER-RULED |
| Referencias históricas | D-006; SPEC §7; TO-BE Identity §12 |
| Estado anterior | DERIVED, en disputa entre 2 y 4 validaciones |
| Conflictos | C-04 (RESOLVED BY OWNER: 4 validaciones conceptuales); C-02/C-03 (PARTIAL) |
| Detalle abierto | Mecanismo de token y de enforcement: OPEN IMPLEMENTATION DETAIL |
| Implementación | NOT AUTHORIZED |

#### OR-B2-003

Texto verbatim del Owner (decisión 3):

````text
3. Membership tiene lifecycle conceptual:

```text
ACTIVE
INACTIVE
```

Una Membership INACTIVE no permite operar sobre el Business.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-003` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Cierra blocker 8 del Requirements |
| Referencias históricas | REQ-ID-002; REQ-ID-003; BLOCKER 8 |
| Estado anterior | WORKSHOP (blocker abierto) |
| Conflictos | Blocker 8 (no es un C-xx) |
| Detalle abierto | Transiciones, quién desactiva y efectos sobre sesiones: OPEN IMPLEMENTATION DETAIL |
| Implementación | NOT AUTHORIZED |

### B. User / Customer / Transition

#### OR-B2-004

Texto verbatim del Owner (decisión 4):

````text
4. Customer y User son entidades diferentes.

Customer puede existir sin User.

El vínculo Customer → User es opcional.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-004` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | REAFIRMA. Reafirma D-002-bis y OR-002-D |
| Referencias históricas | D-002-bis (OWNER-VERBATIM); OR-002-D; SPEC §5; REQ-CUST-001..004 |
| Estado anterior | OWNER-VERBATIM / OWNER-RULED, con SPEC §5 contradiciéndolo |
| Conflictos | C-01 (RESOLVED BY OWNER); C-14 (PARTIAL, junto con 011) |
| Detalle abierto | Criterio de vinculación Customer→User ("mismo email", D1): OPEN OWNER DECISION no resuelta por esta decisión |
| Implementación | NOT AUTHORIZED |

#### OR-B2-005

Texto verbatim del Owner (decisión 5):

````text
5. Email normalizado globalmente único identifica un User.

No se permite más de un User con el mismo email normalizado.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-005` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | REAFIRMA. Reafirma OR-002-C |
| Referencias históricas | OR-002-C; REQ-ID-001 |
| Estado anterior | OWNER-RULED |
| Conflictos | — (ninguno) |
| Detalle abierto | Algoritmo de normalización del email: OPEN IMPLEMENTATION DETAIL |
| Implementación | NOT AUTHORIZED |

#### OR-B2-006

Texto verbatim del Owner (decisión 6):

````text
6. Empresa → Business y Usuario → User/Membership se realiza mediante transición incremental con coexistencia temporal y acotada.

La coexistencia física, mecanismo de migración, cutover y rollback quedan para especificación técnica posterior.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-006` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | REAFIRMA. Reafirma OR-002-B, OR-001 P2-C y OR-001 P1-A |
| Referencias históricas | OR-002-B; OR-001 (P2-C, P1-A) |
| Estado anterior | OWNER-RULED |
| Conflictos | — (ninguno) |
| Detalle abierto | Coexistencia física, mecanismo de migración, cutover y rollback: OPEN IMPLEMENTATION DETAIL |
| Implementación | NOT AUTHORIZED |

#### OR-B2-007

Texto verbatim del Owner (decisión 7):

````text
7. Un User puede tener múltiples Memberships y puede seleccionar/cambiar el Business activo.

El mecanismo técnico del Business Switch queda abierto.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-007` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Cierra la parte conceptual del blocker 14 |
| Referencias históricas | REQ-ID-005; BLOCKER 14 |
| Estado anterior | WORKSHOP (blocker abierto) |
| Conflictos | Blocker 14 (parcial; no es un C-xx) |
| Detalle abierto | Mecanismo técnico del Business Switch: OPEN IMPLEMENTATION DETAIL |
| Implementación | NOT AUTHORIZED |

### C. Roles

#### OR-B2-008

Texto verbatim del Owner (decisión 8):

````text
8. Roles del MVP:

- Owner
- Admin
- Vendedor
- Operador de Stock

Customer y Supplier no se convierten automáticamente en Membership Roles.
````

> Nota normativa (aclaración posterior del Owner, §3): donde el texto dice "Operador de Stock" rige **Gestor de Stock**. Repartidor queda fuera del MVP (`FUTURE / OPEN`). Customer y Supplier no son Membership Roles. El texto verbatim se conserva sin editar.

| Campo | Valor |
|---|---|
| ID | `OR-B2-008` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Define el catálogo de Membership Roles que no estaba aprobado. Normalizada por el Owner (Gestor de Stock; Repartidor fuera del MVP) |
| Referencias históricas | D-005; catálogo en 13-AUDIT/11; AS-IS enum RolUsuario { OWNER, ASISTENTE_LOCAL, PROVEEDOR, REPARTIDOR } |
| Estado anterior | Sin catálogo aprobado; Customer/Supplier aparecen como roles en fuentes derivadas |
| Conflictos | C-10 (RESOLVED BY OWNER, junto con 001 y 009); C-11 (OPEN OWNER DECISION: Repartidor queda FUTURE / OPEN fuera del MVP; SaaS Admin sigue sin decisión) |
| Detalle abierto | Permisos por rol: OPEN IMPLEMENTATION DETAIL. Repartidor: FUTURE / OPEN. El AS-IS no tiene Admin y PROVEEDOR es un rol de Usuario: brecha AS-IS/TO-BE, no implementada |
| Implementación | NOT AUTHORIZED |

#### OR-B2-009

Texto verbatim del Owner (decisión 9):

````text
9. Owner y Admin son roles distintos.

Owner representa propiedad/control máximo del Business.

Admin representa administración delegada.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-009` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Separa "Owner/Admin" que figuraba fusionado |
| Referencias históricas | REQ-MSG-003; SPEC; G67 (registro G001–G105) |
| Estado anterior | Owner/Admin fusionados en varias fuentes |
| Conflictos | C-10 (RESOLVED BY OWNER); ambigüedad Owner/Admin |
| Detalle abierto | Permisos concretos de Owner y de Admin: OPEN IMPLEMENTATION DETAIL |
| Implementación | NOT AUTHORIZED |

### D. Commerce / Catalog

#### OR-B2-010

Texto verbatim del Owner (decisión 10):

````text
10. Product es global.

Los datos comerciales específicos del Business viven en una relación/oferta Business específica.

Conceptualmente:

```text
Product
  ↓
BusinessProduct
```

El modelo físico queda abierto.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-010` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Resuelve la tensión de REQ-CAT-002 con SPEC §3/§10 y con D-001 |
| Referencias históricas | REQ-CAT-002; SPEC §3/§10 |
| Estado anterior | WORKSHOP con tensión frente a D-001 y REQ-ID-004 |
| Conflictos | C-13 (RESOLVED BY OWNER, a nivel conceptual) |
| Detalle abierto | Qué campos son globales y cuáles del Business: OPEN OWNER DECISION. Modelo físico de BusinessProduct: OPEN IMPLEMENTATION DETAIL. Product global no arrastra stock ni precio (D-001, D-014) |
| Implementación | NOT AUTHORIZED |

#### OR-B2-011

Texto verbatim del Owner (decisión 11):

````text
11. Cart pertenece al Customer cuando existe, con vínculo opcional al User.

Debe poder existir Customer sin User.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-011` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Resuelve REQ-CART-001 |
| Referencias históricas | REQ-CART-001 |
| Estado anterior | WORKSHOP (el Cart pertenecía al User) |
| Conflictos | C-14 (PARTIAL, junto con 004) |
| Detalle abierto | Titular del Cart cuando no existe Customer: NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE (OPEN OWNER DECISION) |
| Implementación | NOT AUTHORIZED |

#### OR-B2-012

Texto verbatim del Owner (decisión 12):

````text
12. Order y Sale son entidades diferentes.

Order representa intención/proceso comercial.

Sale representa operación económica confirmada.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-012` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | PROMUEVE. Promueve D-007 (DERIVED) a OWNER-RULED |
| Referencias históricas | D-007; SPEC §3/§10 |
| Estado anterior | DERIVED |
| Conflictos | C-16 (base; RESOLVED BY OWNER parcialmente junto con 013 y 014) |
| Detalle abierto | Atributos y estados de Order y Sale: OPEN IMPLEMENTATION DETAIL |
| Implementación | NOT AUTHORIZED |

#### OR-B2-013

Texto verbatim del Owner (decisión 13):

````text
13. Sale nace cuando el Order es confirmado/aceptado comercialmente.

No se espera a la entrega para considerar creada la Sale.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-013` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Cierra BLOCK-ORD-003 y la cláusula de D-008 |
| Referencias históricas | BLOCK-ORD-003; D-008; REQ-ORD-002 |
| Estado anterior | BLOCKER abierto |
| Conflictos | C-16 (parcial); C-06 (junto con 012 y 015) |
| Detalle abierto | Quién confirma el Order: OPEN OWNER DECISION (REQ-ORD-002 dice "el Customer confirma"; esta decisión dice "confirmado/aceptado comercialmente") |
| Implementación | NOT AUTHORIZED |

#### OR-B2-014

Texto verbatim del Owner (decisión 14):

````text
14. Stock:

- se reserva al confirmar Order;
- el descuento físico queda sujeto al flujo transaccional que se defina en la especificación especializada.

NO inventar todavía estados técnicos ni transaction boundaries.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-014` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Cierra BLOCK-ORD-001 solo para la reserva. No altera D-010 |
| Referencias históricas | BLOCK-ORD-001; D-010 |
| Estado anterior | BLOCKER abierto |
| Conflictos | C-16 (parcial) |
| Detalle abierto | Momento y flujo del descuento físico: OPEN OWNER DECISION / especificación especializada. Estados técnicos y transaction boundaries: OPEN IMPLEMENTATION DETAIL, NO inventar |
| Implementación | NOT AUTHORIZED |

#### OR-B2-015

Texto verbatim del Owner (decisión 15):

````text
15. Sale confirmada es inmutable.

Correcciones posteriores se realizan mediante mecanismos explícitos como cancelación, reversión o refund, con trazabilidad.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-015` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Cierra la cláusula pendiente de D-008 y REQ-SALE-002 |
| Referencias históricas | D-008 (cláusula pendiente); REQ-SALE-002 |
| Estado anterior | PENDING OWNER RULING / BLOCKER |
| Conflictos | C-06 (RESOLVED BY OWNER) |
| Detalle abierto | Mecanismos concretos de cancelación, reversión y refund: OPEN IMPLEMENTATION DETAIL |
| Implementación | NOT AUTHORIZED |

### E. Inventory

#### OR-B2-016

Texto verbatim del Owner (decisión 16):

````text
16. Rotación:

```text
Producto con vencimiento → FEFO
Producto sin vencimiento → FIFO
```
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-016` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Resuelve la contradicción SPEC §22 (FIFO) vs REQ-INV-005 (FEFO) |
| Referencias históricas | SPEC §22; REQ-INV-005 |
| Estado anterior | Contradictorio |
| Conflictos | C-09 (RESOLVED BY OWNER) |
| Detalle abierto | Unidad de rotación (lote o fecha): OPEN IMPLEMENTATION DETAIL |
| Implementación | NOT AUTHORIZED |

#### OR-B2-017

Texto verbatim del Owner (decisión 17):

````text
17. El MVP contempla Locations/Warehouses de forma mínima.

Debe existir conceptualmente una ubicación principal/default.

No diseñar todavía el modelo físico completo.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-017` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Resuelve el alcance de ubicaciones del MVP |
| Referencias históricas | SPEC §13; TO-BE Inventory §10 ("sin ubicaciones"); REQ-INV-006; REQ-BIZ-004/005 |
| Estado anterior | Contradictorio (SPEC/TO-BE: sin ubicaciones; Requirements: múltiples) |
| Conflictos | C-08 (RESOLVED BY OWNER, alcance mínimo) |
| Detalle abierto | Cantidad de branches/warehouses del MVP: OPEN OWNER DECISION. Modelo físico de Location: OPEN IMPLEMENTATION DETAIL |
| Implementación | NOT AUTHORIZED |

#### OR-B2-018

Texto verbatim del Owner (decisión 18):

````text
18. Stock negativo no permitido.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-018` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Eleva a OWNER-RULED un requisito derivado. No altera D-010 |
| Referencias históricas | D-010; AS-IS |
| Estado anterior | Requisito derivado |
| Conflictos | — (ninguno directo) |
| Detalle abierto | Mecanismo de garantía: OPEN IMPLEMENTATION DETAIL. D-010 sigue NON-COMPLIANT/GAP en el AS-IS (p. ej. AUD-D010-G02); no se declara implementado |
| Implementación | NOT AUTHORIZED |

### F. Messaging / AI

#### OR-B2-019

Texto verbatim del Owner (decisión 19):

````text
19. Messaging es un dominio/módulo funcional de primera clase.

La experiencia UX es conversation-centric.

"Primera clase" no significa necesariamente que deba aparecer como módulo visual independiente.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-019` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Aclara DEC-001 y SPEC §20 sin alterar DEC-001 |
| Referencias históricas | DEC-001; SPEC §20 |
| Estado anterior | Ambiguo ("módulo de primera clase" frente a "ni módulo aparte") |
| Conflictos | C-12 (RESOLVED BY OWNER) |
| Detalle abierto | Forma visual/de navegación del módulo: OPEN IMPLEMENTATION DETAIL |
| Implementación | NOT AUTHORIZED |

#### OR-B2-020

Texto verbatim del Owner (decisión 20):

````text
20. IA:

- forma parte de la dirección de producto;
- no opera en el MVP inicial;
- no se implementan asistentes IA ahora;
- Wapsell Messaging MVP no depende de WhatsApp.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-020` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | REAFIRMA + PROMUEVE. Reafirma DEC-001 y D-003 (WhatsApp OWNER-RULED). Promueve a OWNER-RULED la cláusula "IA inactiva en el MVP inicial" (DERIVED) |
| Referencias históricas | DEC-001; D-003; WhatsApp OWNER-RULED |
| Estado anterior | DERIVED (IA inactiva); WhatsApp OWNER-RULED |
| Conflictos | — (ninguno) |
| Detalle abierto | Condición de activación futura de IA: NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE |
| Implementación | NOT AUTHORIZED |

#### OR-B2-021

Texto verbatim del Owner (decisión 21):

````text
21. Una Conversation comercial pertenece a un Business.

Los participantes pueden ser Users/Customers, pero las acciones y datos comerciales quedan contextualizados al Business.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-021` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Resuelve REQ-MSG-003 en el sentido de G65 |
| Referencias históricas | REQ-MSG-003; G65 (registro G001–G105) |
| Estado anterior | Contradictorio (REQ-MSG-003: "no exclusivamente a un Business") |
| Conflictos | C-15 (RESOLVED BY OWNER, coincide con G65) |
| Detalle abierto | Customer participante sin User: NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE (OPEN OWNER DECISION) |
| Implementación | NOT AUTHORIZED |

### G. Governance

#### OR-B2-022

Texto verbatim del Owner (decisión 22):

````text
22. Workshop 001–490 NO es autoridad normativa.

Es fuente de discovery/relevamiento y puede producir requisitos candidatos.

Una respuesta del Workshop no se convierte automáticamente en decisión aprobada.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-022` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Define el estatus del Workshop 001–490 bajo ISS-08 |
| Referencias históricas | ISS-08 nivel 6; REQ §1.1 ("WORKSHOP DECISION") |
| Estado anterior | Indeterminado |
| Conflictos | C-21 (RESOLVED BY OWNER) |
| Detalle abierto | Ninguno propio. Cada REQ sigue siendo candidato hasta que el Owner lo apruebe |
| Implementación | NOT AUTHORIZED |

#### OR-B2-023

Texto verbatim del Owner (decisión 23):

````text
23. Se aprueba ISS-08 como regla formal de precedencia:

```text
OWNER RULING
>
DECISION REGISTER
>
CANONICAL SPEC
>
TO-BE
>
AUDIT
>
WORKSHOP / PREPARATION
>
HISTORICAL
```

Los documentos derivados no adquieren autoridad simplemente por existir.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-023` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | REAFIRMA. Aprueba formalmente ISS-08, que figuraba OWNER-RULED en R2 y PROPOSED en Source of Truth |
| Referencias históricas | ISS-08 (R2); 00-GOVERNANCE/01-SOURCE-OF-TRUTH |
| Estado anterior | Gobernanza PROPOSED |
| Conflictos | C-22 (PARTIAL) |
| Detalle abierto | Ubicación de Requirements, Specialized Specs, Contracts y AS-IS en la precedencia: OPEN OWNER DECISION. Los 7 documentos de gobernanza siguen PROPOSED |
| Implementación | NOT AUTHORIZED |

#### OR-B2-024

Texto verbatim del Owner (decisión 24):

````text
24. Modular Monolith queda aprobado como dirección arquitectónica.

No quedan aprobados por esto:

- NestJS
- PostgreSQL
- Docker
- VPS
- GraphQL
- Kubernetes
- cualquier otro detalle de stack

La arquitectura técnica se especificará posteriormente.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-024` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | PROMUEVE. Promueve solo la dirección de D-017 (Modular Monolith) |
| Referencias históricas | D-017; SPEC §20; TO-BE §9 |
| Estado anterior | DERIVED / PROPOSED |
| Conflictos | C-07 (PARTIAL); C-03 (PARTIAL) |
| Detalle abierto | Stack: NO aprobado (NestJS, PostgreSQL, Docker, VPS, GraphQL, Kubernetes). Cláusula K8s/GraphQL de D-017: sin ruling |
| Implementación | NOT AUTHORIZED |

### H. Commerce scope

#### OR-B2-025

Texto verbatim del Owner (decisión 25):

````text
25. Returns y Refunds forman parte del Commerce TO-BE.

Su implementación queda para una etapa posterior.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-025` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Fija el alcance TO-BE de Returns/Refunds |
| Referencias históricas | REQ-RET-*; REQ-REF-*; vacío en SPEC |
| Estado anterior | Sin respaldo (solo WORKSHOP) |
| Conflictos | — (hueco del SPEC) |
| Detalle abierto | Implementación y reglas: etapa posterior / especificación especializada |
| Implementación | NOT AUTHORIZED |

#### OR-B2-026

Texto verbatim del Owner (decisión 26):

````text
26. Pricing y Promotions forman parte del Commerce TO-BE.

Las reglas concretas quedan para la especificación especializada correspondiente.
````

| Campo | Valor |
|---|---|
| ID | `OR-B2-026` (sesión `OR-B2-SESSION-2026-10-03`) |
| Estado | OWNER-RULED (conceptual) |
| Tipo / relación | NUEVA. Fija el alcance TO-BE de Pricing/Promotions |
| Referencias históricas | REQ-PRICE-*; REQ-PROMO-*; vacío en SPEC |
| Estado anterior | Sin respaldo (solo WORKSHOP) |
| Conflictos | — (hueco del SPEC) |
| Detalle abierto | Reglas concretas: especificación especializada correspondiente |
| Implementación | NOT AUTHORIZED |

---

## 5. Resumen por tipo

- **NUEVA:** OR-B2-001, OR-B2-003, OR-B2-007, OR-B2-008, OR-B2-009, OR-B2-010, OR-B2-011, OR-B2-013, OR-B2-014, OR-B2-015, OR-B2-016, OR-B2-017, OR-B2-018, OR-B2-019, OR-B2-021, OR-B2-022, OR-B2-025, OR-B2-026
- **PROMUEVE:** OR-B2-002, OR-B2-012, OR-B2-024
- **REAFIRMA:** OR-B2-004, OR-B2-005, OR-B2-006, OR-B2-023
- **REAFIRMA + PROMUEVE:** OR-B2-020

## 6. Qué este registro no hace

- No modifica D-001…D-018, DEC-001, OR-001…OR-002-F, OR-003 ni OR-005. Las filas originales siguen intactas.
- No modifica `04-ASIS/`, `13-AUDIT/`, `15-HISTORY/`, documentos históricos `11-*` a `19-*`, ni `02-DISCOVERY/CONFLICTS/`.
- No promueve el AS-IS al TO-BE y no declara implementado nada. D-010 sigue NON-COMPLIANT/GAP en el AS-IS.
- No aprueba stack: NestJS, PostgreSQL, Docker, VPS, GraphQL, Kubernetes y cualquier otro detalle quedan NO aprobados (OR-B2-024).
- No cierra las decisiones abiertas. Ver `21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md`.

```text
TECHNICAL SPECIFICATION = NOT APPROVED
IMPLEMENTATION = NOT AUTHORIZED
```
