# OR-002 — Preparación del Owner Ruling

**Fase:** 04-DECISIONS · **Fecha:** 2026-09-28 · **Estado:** PREPARADO — no cerrado
**Decisiones gobernadas:** `D-002`, `D-002-bis` · **Conflicto asociado:** `CON-010`
**Precedente:** OR-001 `CLOSED` (ver `13-OR-001-OWNER-RULING-CLOSURE.md`) — **no se reabre**

> Este documento **no decide nada**. Separa lo ya decidido de lo abierto, registra una contradicción documental sin resolverla, y prepara las preguntas del ruling.

---

## A. Estado actual

| Campo | `D-002` | `D-002-bis` |
|---|---|---|
| **Decision Status** | `APPROVED — OWNER-VERBATIM` | `APPROVED — OWNER-VERBATIM` |
| **Canonicality** | Texto citable | Texto citable |
| **Implementation Detail** | **`OPEN`** — *"migración Usuario/Cliente, modelo de datos y ciclo de vida"* | **`OPEN`** — *"lifecycle de Customer, modelado de vínculo con User"* |
| **Criticality** | `BLOCKING` | No consignada |
| **Fecha** | 2026-09-28 | 2026-09-28 |
| **Evidencia** | Owner verbatim; `v1.0-RECONSTRUIDA.md:97-105` | Owner, sesión del 2026-09-28 |
| **Depends On** | `D-001` (`DIRECT`) — **satisfecha en dirección por OR-001** | `D-002` (inferido — sin entrada en la matriz, ISS-02) |
| **Blocks** | `D-005` (`DIRECT`), `D-006` (`DIRECT`), `D-003`, `D-007`, `D-012` (`INDIRECT`) | `NO DETERMINABLE` |

Fuente: `00-DECISION-REGISTER.md:98-99` · `02-DECISION-DEPENDENCIES.md:45` · ficha `D-002-user-membership-reconciliation.md`.

---

## B. Qué está decidido

**La dirección está cerrada, y es más de lo que el análisis G1.1 asumía.** Tres bloques con provenance `OWNER-VERBATIM`:

### B.1 — `D-002`, texto citable

> **`User` es la identidad global.** La relación `User ↔ Business` se establece mediante **`Membership`** (N:N); un mismo `User` puede pertenecer a múltiples `Business`. Roles y permisos se determinan dentro del `Membership`.

Corolarios decididos:
- `User` es la identidad global de la plataforma.
- `Membership` es la entidad de relación, con cardinalidad **N:N**.
- Un `User` puede pertenecer a **múltiples** `Business`.
- Roles y permisos viven **dentro** del `Membership`, no en el `User` global.

### B.2 — `D-002-bis`, texto citable

> **`Customer` NO se fusiona con `User`.** `Customer` representa la relación comercial del comprador/cliente con un `Business`. Puede vincularse opcionalmente a un `User`, sin exigir uno. Pertenece al contexto de un `Business` y puede incluir compras, pedidos, historial, cuenta corriente/deuda cuando aplique, condiciones comerciales y demás datos de Commerce.

Corolarios decididos:
- La fusión `Usuario` + `Cliente` → `User` queda **descartada de forma permanente**.
- `Customer` es una entidad **comercial separada**, con alcance de `Business`.
- El vínculo `Customer → User` es **opcional**: existen compradores con y sin cuenta.
- `Customer` puede portar datos de Commerce.

El mapping de conflictos lo registra así: *"The prior false assumption that `Usuario`+`Cliente` merge into `User` is permanently retired."*

### B.3 — Consecuencia derivada de B.2, ya registrada en la SPEC canónica

`02-CANONICAL-SPEC/01-IDENTITY-AND-TENANCY-SPEC.md:24` marca como **`REFUTED 2026-09-28 — permanently`** la afirmación previa *"`Usuario` y `Cliente` se reconcilian"*, y declara **`CON-010 CLOSED`** en su propio encabezado.

### B.4 — Lo que OR-001 ya aportó a OR-002

Un extremo de `Membership` está definido: **`Business`** (término canónico, renombrado desde `Empresa`, convivencia temporal). El otro extremo (`User`) tiene dirección pero no modelo.

---

## C. Qué permanece abierto

Separado según lo pedido:

### C.1 — Mecanismo de transformación (abierto)

| # | Elemento | Fuente |
|---|---|---|
| C1.1 | Estrategia de migración de los datos existentes de `Usuario` y `Cliente` | Open Question de la ficha D-002 |
| C1.2 | Destino de `Usuario.email @unique` **global** — hoy impide que una persona tenga cuenta en dos `Business` con el mismo email | `05-ASIS/04-ASIS-IDENTITY.md`, `VERIFIED BY CODE` |
| C1.3 | Mecánica de separación `Usuario`/`Cliente` **sin fusión** — la dirección dice que no se fusionan, no cómo se separan | `07-TOBE/01` Open Detail #13 |
| C1.4 | Mapeo de `Permiso`/`UsuarioPermiso` (hoy ligados al `Usuario`) hacia autorización por `Membership` | Open Question de la ficha D-002 |

### C.2 — `IMPLEMENTATION DETAIL` (abierto)

| # | Elemento | Fuente |
|---|---|---|
| C2.1 | **Modelo físico** de `User` y `Membership` | `00-DECISION-REGISTER.md:98`; `07-TOBE/01` Open Detail #1 |
| C2.2 | **Mecanismo de unicidad** de `User` (email global, ID, otro) | `07-TOBE/01` Open Detail #2 |
| C2.3 | **Ciclo de vida de `User`** (activo, inactivo, suspendido) | `07-TOBE/01` Open Detail #3 |
| C2.4 | **Ciclo de vida y estados de `Membership`** (activa, pendiente, invitada, inactiva) | `07-TOBE/01` Open Detail #4 |
| C2.5 | **Vínculo `Customer` ↔ `User`**: modelado y obligatoriedad | `07-TOBE/01` Open Detail #5 — **corresponde a OR-003** |
| C2.6 | **Lifecycle de `Customer`** | `07-TOBE/01` Open Detail #6 — **corresponde a OR-003** |
| C2.7 | Diseño de token: formato, claims, ciclo de vida, revocación | `07-TOBE/01` Open Detail #9 — **corresponde a OR-005 (D-006)** |
| C2.8 | Implicaciones de rendimiento de `User` global con `Membership` N:N | Open Question de la ficha D-002 |

### C.3 — Pendiente de Owner, propio de OR-002

Solo **C.1** (mecanismo) y **C2.1–C2.4** (modelo y ciclos de vida de `User`/`Membership`) pertenecen a OR-002. C2.5–C2.6 son de OR-003; C2.7 es de OR-005.

---

## D. Evidencia documental exacta

### D.1 — Qué dice `D-002`

`00-DECISION-REGISTER.md:98`, celda de decisión (`OWNER-VERBATIM`):

> **User** es la identidad global. La relación User ↔ Business se establece mediante **Membership** (N:N); un mismo User puede pertenecer a múltiples Business. Roles y permisos se determinan dentro del Membership.

`IMPLEMENTATION DETAIL` en la misma fila: `OPEN — migración Usuario/Cliente, modelo de datos y ciclo de vida`.

Ficha del workshop, sección *Reconstructable decision text*, con `DEC-001 DERIVED (partial)` de `02-MULTITENANCY.md:16-19`:

> **User = identidad global.** Una persona tiene una unica identidad en Wapsell, independiente de a cuantos negocios este vinculada.
>
> **Membership = User <-> Business.** Relacion N:N; los roles y permisos viven en el contexto de esa membership, no en el usuario global.

Y a continuación, **textual**:

> **NOT decided.** The concrete data model (`02-MULTITENANCY.md:55-57`), the `Usuario.email @unique` global uniqueness problem, and the `Usuario`/`Cliente` table split.

### D.2 — Qué dice `D-002-bis`

`00-DECISION-REGISTER.md:99`, celda de decisión (`OWNER-VERBATIM`): texto completo transcrito en §B.2.

`IMPLEMENTATION DETAIL`: `OPEN — lifecycle de Customer, modelado de vínculo con User`.

Evidencia declarada: *"Owner, sesión actual"* — resolución posterior al workshop.

### D.3 — Qué dice `CON-010`

**Hay tres afirmaciones en conflicto entre sí.** Registradas como contradicción en §D.4.

**(i) Fila del registro de conflictos** — `03-CONFLICTS/00-CONFLICT-REGISTER.md:72`, última columna:

> `OPEN`

Descripción de la fila: *"El AS-IS tiene `Usuario.email` globalmente único y `Usuario` ligado 1:1 a `Empresa`. El TO-BE requiere una identidad `User` global con relación N:N a `Business` a través de `Membership`. Esto es una **DIRECT_CONTRADICTION / DATA_MODEL_CONFLICT / IDENTITY_CONFLICT / TENANCY_CONFLICT**."*

**(ii) Encabezado del mismo archivo** — `00-CONFLICT-REGISTER.md:23-25`:

> **RESOLVED (3):** CON-001 (DEC-001), CON-009 (D-001), **CON-010 (D-002 + D-002-bis)**.

**(iii) Mapping de resolución** — `10-CONFLICT-RESOLUTION-MAPPING.md:69`:

> **RESOLVED** (2026-09-28) ... `IMPLEMENTATION DETAIL` (Customer lifecycle, link modelling) **stays `OPEN`**.

**(iv) Ficha del workshop D-002**, sección *Reconstructable decision text*:

> **CON-010 remains OPEN.**

### D.4 — CONTRADICCIÓN REGISTRADA — no resuelta

**ID: ISS-07** (continúa la numeración de `12-ARCHITECTURAL-DECISION-CLOSURE.md` §18)

| Fuente | Afirma |
|---|---|
`00-CONFLICT-REGISTER.md:72` (fila) | CON-010 → **`OPEN`** |
`00-CONFLICT-REGISTER.md:23-25` (encabezado) | CON-010 → **`RESOLVED`** |
`10-CONFLICT-RESOLUTION-MAPPING.md:69` | CON-010 → **`RESOLVED`**, con `IMPLEMENTATION DETAIL` `OPEN` |
`03-DECISION-WORKSHOP/D-002-...md` | CON-010 → **`remains OPEN`** |
`02-CANONICAL-SPEC/01-...md:24` | CON-010 → **`CLOSED`** |

**Naturaleza del desacuerdo.** El encabezado de `00-CONFLICT-REGISTER.md` declara que la tabla *"is preserved verbatim"*, lo que explica que la fila conserve `OPEN` mientras el encabezado dice `RESOLVED`: la fila es histórica por diseño. Eso hace el conflicto **aparente** en ese archivo.

Pero la ficha del workshop D-002 afirma `CON-010 remains OPEN` **sin** marcarlo como histórico en ese punto, y la SPEC canónica afirma `CLOSED`. Esas dos **no** se reconcilian por la regla de preservación verbatim.

**Lectura posible, no una resolución:** las fuentes podrían estar hablando de ejes distintos — `RESOLVED` en cuanto a **dirección** (qué se decidió) y `OPEN` en cuanto a **mecanismo** (cómo se implementa), que es exactamente la distinción que el mapping hace explícita al decir *"`IMPLEMENTATION DETAIL` stays `OPEN`"*. Bajo esa lectura las cinco fuentes serían compatibles.

**No se adopta esa lectura como resolución.** `00-GOVERNANCE/03-CONFLICT-RESOLUTION.md` es explícito: *"The agent must not silently choose between contradictory sources."* Se registra como **OR-002-A**, pregunta 1.

**Impacto de la contradicción:** si `CON-010` está `RESOLVED`, OR-002 se reduce al mecanismo. Si está `OPEN`, la dirección misma podría estar en discusión. El alcance del ruling depende de cuál rige.

### D.5 — Relación con `Membership`

**Decidido:** `Membership` es la entidad que relaciona `User ↔ Business`, cardinalidad N:N, y **porta los roles y permisos** (`D-002`, `OWNER-VERBATIM`).

**Abierto:** modelo físico (C2.1), estados y ciclo de vida (C2.4).

**Estado en el código** — `07-TOBE/01` §12, gaps #2 y #4, `VERIFIED BY CODE` en origen:

> `Usuario` acoplado 1:1 a `Empresa` (`empresaId` escalar obligatorio) → **Una persona no puede operar en dos negocios: la pertenencia es fija**

> **Ausencia total** de `Business` / `Tenant` / `Membership` en el código — *"Los tres conceptos **no existen**; doble lectura de código lo confirma"*

### D.6 — Relación con `Customer`

**Decidido** (`D-002-bis`, `OWNER-VERBATIM`): no se fusiona con `User`; es relación comercial con un `Business`; vínculo a `User` **opcional**; puede portar datos de Commerce.

**Abierto:** lifecycle y modelado del vínculo — **ambos pertenecen a OR-003**, no a OR-002.

**Estado en el código** — `07-TOBE/01` §12 gap #10:

> `Cliente` = entidad separada acoplada 1:1 a `Empresa` → **Hoy no hay forma de expresar "comprador sin cuenta" ni "comprador con dos negocios"**

`05-ASIS/03-ASIS-DATA.md` (`VERIFIED BY CODE`): `Cliente` usa `@@unique([empresaId, email])` — unicidad **por empresa**, a diferencia de `Usuario.email` que es global. Los dos modelos de identidad actuales ya difieren en su regla de unicidad.

### D.7 — Dependencias que quedan sobre `D-005` y `D-006`

`D-002` bloquea a ambas de forma `DIRECT` (`02-DECISION-DEPENDENCIES.md:45`).

| Decisión | Qué hereda de D-002 | Qué sigue bloqueado por sí misma |
|---|---|---|
| **`D-005`** (roles/permisos en `Membership`) | El principio *"roles y permisos viven en el `Membership`"* ya está decidido por `D-002` | *"Role/permission catalog NOT decided"* (`02-DECISION-DEPENDENCIES.md:25`). `Dependency satisfied? PARTIAL — principle only`. **Bloqueo propio, no resoluble por OR-002** |
| **`D-006`** (autorización contextual) | La existencia de `Membership` como sujeto de validación | Su formulación normativa está en disputa: **4 vs 2 checks** (`OR-005`). `Dependency satisfied? NO`. Además depende de `D-005` (`INDIRECT`) |

**Conclusión:** cerrar OR-002 **no** desbloquea `D-005` ni `D-006`. Cada una conserva su bloqueo interno — el mismo patrón que se observó al cerrar OR-001 (§4.1 de `13-...`).

Gap #6 de `07-TOBE/01` precisa la brecha de `D-005`:

> `Permiso`/`UsuarioPermiso` granular, **independiente** del `RolUsuario` → `Permission` heredada del `Role` **dentro** de la `Membership` — *"Hoy los permisos no dependen de ningún contexto de negocio"*

---

## E. Dependencias

```text
D-001 ──DIRECT──▶ D-002 ──DIRECT──▶ D-005 ──┐
(CLOSED OR-001)     │                        │
                    │                        ▼
                    └──────DIRECT─────────▶ D-006
                    │                    (OR-005 pendiente)
                    ├──INDIRECT──▶ D-003, D-007, D-012
                    │
                    └── D-002-bis (relación inferida — ISS-02)
```

- `Depends On` de `D-002`: `D-001` (`DIRECT`) — **satisfecha en dirección** tras OR-001.
- `Blocks`: `D-005`, `D-006` (`DIRECT`); `D-003`, `D-007`, `D-012` (`INDIRECT`).
- `Dependency satisfied?` de `D-002`: **`PARTIAL — direction from DEC-001`** (`02-DECISION-DEPENDENCIES.md:22`).

**Nota de trazabilidad (ISS-02, ya registrada):** `D-002-bis` no tiene entrada propia en la matriz de dependencias, que se preserva verbatim de Fase 3.5 y es anterior a esa decisión. Su relación con `D-002` es **INFERIDA** por contenido.

---

## F. Impacto

### F.1 — IMPACTO DOCUMENTADO

De `05-ASIS/03-ASIS-DATA.md` y `05-ASIS/04-ASIS-IDENTITY.md` (`VERIFIED BY CODE` en origen) y de la ficha D-002:

| Elemento | Evidencia |
|---|---|
| `Usuario.email @unique` **global** | *"una misma persona **no puede** tener cuenta de `Usuario` en dos empresas distintas con el mismo email. Esto es lo opuesto de 'User = identidad global reutilizable entre Business' que pide DEC-001"* |
| `Usuario.empresaId` escalar **obligatorio** | *"la relación Usuario↔Empresa es **1:N directa y fija**"* |
| `Cliente` con `@@unique([empresaId, email])` | Unicidad por empresa; soporta minorista/mayorista vía `esMayorista` |
| **No existe tabla `Membership`** | `05-ASIS/03-ASIS-DATA.md`, `05-ASIS/04-ASIS-IDENTITY.md` |
| JWT con campo `type` (`usuario`/`cliente`) | Gap #9: *"Dos identidades para la misma persona según el canal"* |
| Módulos de autenticación y autorización de **todas** las aplicaciones | `Affected Documents` de la ficha |
| `schema.prisma` — modelos `Usuario` y `Cliente` | `Affected Documents` |
| Revisión completa del modelo de identidad/acceso | `CON-010`: *"Requiere una revisión completa del modelo de datos de identidad/acceso y la lógica de autenticación/autorización"* |

Requisitos mínimos de migración, `DEC-001` textual vía la ficha:

> 1. Separar la identidad de la pertenencia... 2. Resolver qué pasa con `Usuario.email @unique` global... 3. Decidir qué pasa con la separación actual `Usuario`/`Cliente` (dos tablas con JWT discriminado) frente a un "User" único de la visión de plataforma.

El punto 3 **ya fue resuelto** por `D-002-bis`: no hay fusión.

### F.2 — IMPACTO INFERIDO

Etiquetado como inferido en la propia ficha D-002 — **no es hecho**:

> Migración de datos compleja, refactorización significativa de la lógica de autenticación y autorización, impacto en todas las funcionalidades de cara al usuario.

### F.3 — Interacción con el ruling de OR-001

`D-002` no estaba en el alcance de OR-001, pero **el ruling de OR-001 le impone requisitos**:

- **Continuidad sin downtime** cubre explícitamente **Auth** y **datos históricos** (P3). Cualquier transformación de identidad hereda ese requisito.
- La **convivencia temporal** (P2-C) fue decidida para `Empresa`/`Business`. **No se ha decidido** si aplica igual a `Usuario`/`User`/`Membership` — es la pregunta 5 de §H.

---

## G. Alternativas explícitamente documentadas

### G.1 — Para la reconciliación `Usuario`/`Cliente`

**NO HAY ALTERNATIVAS EXPLÍCITAMENTE DOCUMENTADAS, Y LA CUESTIÓN YA ESTÁ DECIDIDA.**

La ficha D-002 lista dos opciones, **ambas marcadas `(ALTERNATIVES NOT DOCUMENTED, inferido)`**:
- Fusionar `Usuario` y `Cliente` en una nueva tabla `User`
- Mantener `Usuario` y `Cliente` con una entidad `User` envolvente

**La primera quedó REFUTADA de forma permanente** por `D-002-bis`. La segunda es inferida y no fue adoptada. **No se presentan como alternativas vigentes.**

### G.2 — Para el mecanismo de migración de identidad

**NO HAY ALTERNATIVAS EXPLÍCITAMENTE DOCUMENTADAS.**

Ninguna fuente enumera mecanismos para migrar `Usuario`/`Cliente` hacia `User` + `Membership`. `DEC-001` enumeró *"reescritura, migración incremental, o convivencia temporal"* para el **modelo de datos en general** (punto 2), y el Owner los aplicó a `Empresa`→`Business` en OR-001. **No hay registro de que esa enumeración se haya extendido a la identidad.** No se asume que aplique.

### G.3 — Para `Usuario.email @unique`

**NO HAY ALTERNATIVAS EXPLÍCITAMENTE DOCUMENTADAS.**

`07-TOBE/01` Open Detail #2 enuncia el espacio del problema —*"Mecanismo de unicidad de `User` (email global, ID, otro)"*— pero **no desarrolla ninguna opción**. Las tres palabras no constituyen alternativas evaluadas.

---

## H. Preguntas concretas para el Owner

### OR-002-A — Estado real de `CON-010` — **RESUELTA 2026-09-28**

> Cinco fuentes discrepan sobre el estado de `CON-010`: la fila del registro dice `OPEN`, su encabezado dice `RESOLVED`, el mapping dice `RESOLVED` con `IMPLEMENTATION DETAIL` `OPEN`, la ficha D-002 dice `remains OPEN`, y la SPEC canónica dice `CLOSED`. ¿`CON-010` está resuelto en cuanto a dirección, quedando abierto solo el mecanismo, o la dirección misma sigue en discusión?

Se preguntó primero porque **definía el alcance del resto del ruling**.

> **CERRADA por ruling del Owner, 2026-09-28.** Registro completo en
> [`15-OR-002-A-OWNER-RULING.md`](15-OR-002-A-OWNER-RULING.md), donde OR-002-B…F quedan
> preparadas y separadas (§8 de ese documento).
>
> **`CON-010` = `RESOLVED` en cuanto a la dirección conceptual del modelo de identidad.**
> La autoridad **no** es una fuente documental única: son las decisiones `OWNER-VERBATIM`
> `D-002` y `D-002-bis` del Decision Register.
>
> **Alcance resultante: OR-002 queda limitado al mecanismo de transformación/migración y a los
> detalles de implementación propios de identidad.** La contradicción documental queda registrada
> como **inconsistencia a reconciliar** (ISS-07), y **no reabre** `D-002` ni `D-002-bis`.
>
> En consecuencia, los 8 puntos de §I quedan **confirmados como cerrados**, y las preguntas
> OR-002-B…F siguen vigentes con alcance firme.

### OR-002-B — Mecanismo de transición de la identidad

> El ruling de OR-001 decidió convivencia temporal para `Empresa`→`Business`. ¿La transformación de `Usuario`/`Cliente` hacia `User` + `Membership` sigue el mismo mecanismo de convivencia temporal, u otro?

**No se enumeran opciones** porque ninguna fuente las documenta para identidad (§G.2).

### OR-002-C — Unicidad de `User`

> Hoy `Usuario.email` es `@unique` global, lo que impide que una persona tenga cuenta en dos `Business` con el mismo email, mientras `Cliente` usa `@@unique([empresaId, email])`. ¿Cuál es la regla de unicidad de `User` en el modelo objetivo?

### OR-002-D — Mecánica de separación `Usuario`/`Cliente`

> `D-002-bis` decidió que `Customer` no se fusiona con `User`. ¿Qué ocurre con las filas actuales de las tablas `Usuario` y `Cliente`: cada una deriva en una entidad distinta del modelo objetivo, o hay casos que requieren tratamiento específico — por ejemplo una persona que hoy existe como `Usuario` y como `Cliente` a la vez?

### OR-002-E — Continuidad de Auth durante la transición

> El ruling de OR-001 exige continuidad sin downtime de **Auth** y **datos históricos**. Durante la transición de identidad, ¿las sesiones y tokens ya emitidos deben seguir siendo válidos, o se admite invalidarlos en algún punto?

### OR-002-F — Alcance de la autorización

> ¿OR-002 autoriza documentar y posteriormente implementar la transformación de identidad, con la misma puerta de aprobación previa de la especificación que fijó OR-001 (P5-B)?

**Las seis son neutrales:** no incluyen recomendación, ranking ni opción marcada como preferible.

---

## I. Qué podría cerrarse inmediatamente con decisiones ya existentes

**Sujeto a que OR-002-A confirme que la dirección está resuelta.** Con las decisiones `OWNER-VERBATIM` ya registradas, estos puntos **no requieren un ruling nuevo**:

| # | Punto | Autoridad existente |
|---|---|---|
| I.1 | `User` es la identidad global de la plataforma | `D-002` `OWNER-VERBATIM` |
| I.2 | `Membership` es la relación `User ↔ Business`, cardinalidad **N:N** | `D-002` `OWNER-VERBATIM` |
| I.3 | Un `User` puede pertenecer a múltiples `Business` | `D-002` `OWNER-VERBATIM` |
| I.4 | Roles y permisos viven **dentro** del `Membership`, no en el `User` global | `D-002` `OWNER-VERBATIM` |
| I.5 | `Customer` **no** se fusiona con `User` — descartado de forma permanente | `D-002-bis` `OWNER-VERBATIM` |
| I.6 | `Customer` es la relación comercial del comprador con un `Business` | `D-002-bis` `OWNER-VERBATIM` |
| I.7 | El vínculo `Customer → User` es **opcional** | `D-002-bis` `OWNER-VERBATIM` |
| I.8 | `Business` es el extremo de `Membership` del lado del negocio | `D-001` + OR-001 `CLOSED` |

**En consecuencia, la sección "dirección" de OR-002 ya está decidida.** Igual que en OR-001, la pregunta del ruling se reduce al **mecanismo** — con la diferencia de que acá hay una contradicción documental previa que resolver (OR-002-A).

---

## J. Qué NO puede cerrarse sin un nuevo Owner ruling

| # | Elemento | Por qué requiere ruling |
|---|---|---|
| J.1 | Estado real de `CON-010` | Cinco fuentes discrepan. La gobernanza prohíbe elegir entre fuentes contradictorias → **OR-002-A** |
| J.2 | Mecanismo de transición de identidad | Sin alternativas documentadas; no se puede inferir desde OR-001 → **OR-002-B** |
| J.3 | Regla de unicidad de `User` | `07-TOBE/01` Open Detail #2 enuncia el problema, no opciones → **OR-002-C** |
| J.4 | Destino de las filas de `Usuario` y `Cliente` | Open Question de la ficha D-002, sin respuesta → **OR-002-D** |
| J.5 | Validez de sesiones/tokens durante la transición | Requisito de continuidad de OR-001 sin especificar para identidad → **OR-002-E** |
| J.6 | Alcance de autorización de OR-002 | Debe declararse explícitamente, como en P5-B → **OR-002-F** |
| J.7 | Modelo físico de `User` y `Membership` | `IMPLEMENTATION DETAIL` `OPEN`; el registro declara que *"no migration, schema, naming, ID or physical model is authorised"* |
| J.8 | Ciclos de vida de `User` y `Membership` | Open Details #3 y #4 de `07-TOBE/01` |
| J.9 | Mapeo `Permiso`/`UsuarioPermiso` → autorización por `Membership` | Depende del catálogo de `D-005`, **no resoluble en OR-002** |
| J.10 | Lifecycle y vínculo de `Customer` | **Pertenece a OR-003** — fuera del alcance de OR-002 |
| J.11 | Diseño de token y guards | **Pertenece a OR-005** (`D-006`, 4 vs 2 checks) |

---

## Resumen de preparación

```text
OR-002 STATUS:            PREPARADO — NO CERRADO

DIRECCIÓN:                DECIDIDA (8 puntos OWNER-VERBATIM — §I)
MECANISMO:                ABIERTO (4 elementos — §C.1)
IMPLEMENTATION DETAIL:    ABIERTO (8 elementos — §C.2, de los cuales
                          4 pertenecen a OR-003/OR-005)

CONTRADICCIÓN REGISTRADA: 1 (ISS-07 — estado de CON-010 en 5 fuentes)
                          NO resuelta por criterio propio

PREGUNTAS PARA EL OWNER:  6 (OR-002-A … OR-002-F)
                          OR-002-A precede a las demás: define el alcance

DESBLOQUEO ESPERADO:      D-005 y D-006 NO se desbloquean con OR-002.
                          Cada una conserva su bloqueo propio
                          (catálogo de roles; 4-vs-2 checks).

ALTERNATIVAS DOCUMENTADAS: NINGUNA para el mecanismo de identidad.
                          Las 2 de la ficha D-002 están marcadas
                          "inferido"; una fue REFUTADA por D-002-bis.

PRÓXIMO OWNER RULING:     OR-002 — responder OR-002-A primero.
```

**No se modificó código, Prisma ni datos. No se hizo commit. No se avanzó a OR-003. No se generó la estrategia de migración.**
