# Wapsell — Architectural Decision Closure (G1.1)

**Fase:** 04-DECISIONS · **Fecha:** 2026-09-28 · **Estado:** INFORME ANALÍTICO — no decide nada
**Alcance:** D-001, D-002, D-002-bis, D-005, D-006, D-014, D-017 + anomalía de D-009

---

## 1. Executive Summary

**G1 no puede cerrarse hoy.** De las 7 decisiones con impacto arquitectónico analizadas, **ninguna** tiene su `IMPLEMENTATION DETAIL` definido, y **4 de 7** no tienen ni su dependencia satisfecha.

Tres hallazgos gobiernan el resultado:

1. **El eje de aprobación y el de implementación son independientes.** Las 7 están `APPROVED`; las 7 tienen `IMPLEMENTATION DETAIL` en `OPEN`. El registro canónico lo dice sin ambigüedad: *"no migration, schema, naming, ID or physical model is authorised by any entry below"*. Una decisión aprobada **no** autoriza escribir código.

2. **La dependencia de las decisiones fundacionales está solo `PARTIAL`.** `03-DECISION-WORKSHOP/02-DECISION-DEPENDENCIES.md` clasifica D-001 y D-002 como `PARTIAL — direction from DEC-001`, y declara explícitamente que *"The `Empresa` transformation is explicitly NOT decided"* y que *"Concrete data model, `Usuario.email @unique` and the `Usuario`/`Cliente` split are NOT decided"*. La dirección existe; el modelo no.

3. **Se detectó una contradicción documental sobre las dependencias de D-006**, que se reporta sin resolver (ver §4.1 y OR-006).

**5 Owner Rulings** son necesarios para desbloquear la arquitectura. Ninguno se responde acá.

---

## 2. Scope

**Incluido:** análisis de estado, dependencias, impacto, brechas y preguntas para el Owner sobre las 7 decisiones arquitectónicas + la anomalía de D-009.

**Explícitamente excluido:** implementación, diseño de solución, elección entre alternativas, cierre de decisiones, renumeración de IDs, modificación de estados, y cualquier cambio en código, schema, guards, API, frontend o infraestructura. **No se ejecutó ninguna herramienta que escriba archivos de código.**

---

## 3. Sources

| Fuente | Rol en este informe |
|---|---|
| `04-DECISIONS/00-DECISION-REGISTER.md` §4, §4.1, §4.3 | **Autoridad canónica** de estado y texto de decisión |
| `04-DECISIONS/10-OPEN-DECISIONS.md` | Estado de apertura |
| `04-DECISIONS/11-DECISION-CLOSURE-REPORT.md` | Clasificación previa (insumo) |
| `03-DECISION-WORKSHOP/02-DECISION-DEPENDENCIES.md` | **Única fuente de dependencias documentadas** (`Depends On` / `Blocks`, preservado verbatim de Fase 3.5) |
| `WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md` | Texto reconstruido — `DERIVED, non-canonical` |
| `WAPSELL-SPEC-GENERAL-v1.1-REVISADA.md` | Texto revisado — `DERIVED, non-canonical` |
| `WAPSELL-DECISION-REGISTER-D001-D018.md` | `PROPOSED, non-canonical` — resúmenes de una línea |
| `04-DECISIONS/02-MULTITENANCY.md` | DEC-001, única decisión con texto originalmente autorado |
| `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md` | Evidencia de código para D-014 |

Conforme a `00-GOVERNANCE/01-SOURCE-OF-TRUTH.md`, ante divergencia entre v1.0/v1.1 y §4 del registro canónico, **gobierna §4**.

---

## 4. Decision Dependency Graph

Reproducido de `02-DECISION-DEPENDENCIES.md` (fuente única). **No se inventó ninguna relación.**

```text
D-001  (Depends On: NONE — foundational)
  │
  ├──DIRECT──▶ D-002 ──DIRECT──▶ D-005 ──┐
  │              │                        │
  │              └──DIRECT──▶ D-006 ◀─────┘ (INDIRECT desde D-005)
  │
  ├──DIRECT──▶ D-014 ──▶ D-015
  │
  └──INDIRECT─▶ D-017 ──DIRECT──▶ D-018
                  ▲
                  └── D-003 (INDIRECT)

D-009  (Depends On: NONE · Blocks: NONE — transversal de proceso)
D-002-bis  → sin entrada propia en la matriz (ver §7)
```

Cadena de tenancy/identidad/autorización, verbatim de la fuente:

| Decisión | Depends On | Blocks |
|---|---|---|
| D-001 | `NONE` | D-002, D-003, D-004, D-005, D-007, D-011, D-012, D-013, D-014, D-015, D-016, D-017 |
| D-002 | D-001 (`DIRECT`) | D-003, D-005, **D-006**, D-007, D-012 |
| D-005 | D-002 (`DIRECT`) | **D-006** |
| D-006 | D-002 (`DIRECT`), D-005 (`INDIRECT`) | `NONE` |
| D-014 | D-001 (`DIRECT`) | D-015 |
| D-017 | D-001, D-002, D-003 (todas `INDIRECT`) | D-018 |
| D-009 | `NONE` | `NONE` |

### 4.1 CONTRADICCIÓN DETECTADA — no resuelta

**Objeto:** qué bloquea D-006.

| Fuente A | Fuente B |
|---|---|
`02-DECISION-DEPENDENCIES.md:49` → **`D-006 | Blocks: NONE`** | `11-DECISION-CLOSURE-REPORT.md` §2 → *"Estas 6 forman una cadena: D-001 → D-002 → D-005 → D-006"*, y describe D-006 como bloqueante de "guards, middleware, forma del token" |

**Impacto:** si `Blocks: NONE` es correcto, D-006 es una **hoja** del grafo: su resolución no desbloquea ninguna otra decisión, y podría posponerse sin frenar el resto de la cadena. Si la caracterización del Closure Report es correcta, D-006 bloquea toda la capa de enforcement de autorización y es crítico.

**Lectura posible (no una resolución):** ambas podrían ser compatibles si `Blocks` se refiere únicamente a *otras decisiones D-xxx* y no a *artefactos de implementación*. La fuente no define el criterio de la columna, así que esto **no es determinable con la información disponible**.

**Tratamiento:** se reporta como **OR-006**. No se resuelve acá. `11-DECISION-CLOSURE-REPORT.md` no fue modificado.

---

## 5. D-001 — Business = Tenant

### Estado actual

```
Decision Status:        APPROVED — OWNER-VERBATIM
Implementation Detail:  OPEN — migración y modelo físico no definidos
Canonicality:           Texto citable (Owner verbatim)
```

### Qué está decidido

**DECIDIDO** (`00-DECISION-REGISTER.md` §4):
- `Business` = `Tenant`.
- `Empresa` se transforma conceptualmente en `Business`.
- `Business` es la unidad de aislamiento multi-tenant.

**NO DECIDIDO:**
- Cómo se transforma el modelo actual de `Empresa` — `02-DECISION-DEPENDENCIES.md:21`: *"The `Empresa` transformation is explicitly NOT decided (DEC-001:55-57)"*.
- Nombre canónico final de la entidad (`Empresa` / `Business` / `Tenant`) — es la pregunta literal del orden de resolución sugerido, ítem 1.
- Plan de migración, modelo físico, IDs, naming.

### Dependencias

```
Depends on:         NONE (foundational)
Blocks:             D-002, D-003, D-004, D-005, D-007, D-011, D-012, D-013, D-014, D-015, D-016, D-017
Related decisions:  DEC-001 (dirección de producto), D-002-bis
Dependency satisfied?  PARTIAL — dirección desde DEC-001
```

### Impacto

**DOCUMENTADO:** Tenancy, Business, Database, Identity (vía D-002), y los 12 dominios que bloquea.

**INFERIDO:** Backend y API — toda operación que hoy recibe `empresaId` cambiaría de contrato si cambia el nombre o la forma de la entidad raíz. `05-ASIS/03-ASIS-DATA.md` documenta que casi todos los ~42 modelos cuelgan de `empresaId`; la magnitud del impacto es documentada, su forma concreta es inferida.

### Qué falta definir

El nombre canónico y la estrategia de transformación de `Empresa`. Es la raíz del grafo: sin esto, ningún modelo de datos de Wapsell es escribible.

### Pregunta para el Owner

> ¿Cuál es el nombre canónico de la unidad de negocio multi-tenant, y cómo se transforma el modelo actual de `Empresa` hacia ese nombre?

### Consecuencias

Las fuentes no presentan alternativas explícitas de transformación. `02-DECISION-DEPENDENCIES.md:67` enumera tres candidatos de nombre (`Empresa`, `Business`, `Tenant`) sin consecuencias asociadas. **No se inventan alternativas.**

Nota de las fuentes, no consecuencia derivada: CON-008 y TD-002 registran que `Empresa.nombre` es clave `@unique` de un `upsert` con el typo `"Roonda"`. Cualquier transformación de `Empresa` intersecta ese defecto.

### Architecture Blocker

**YES.** Evidencia: `Blocks` con 12 decisiones; `Dependency satisfied? PARTIAL`; transformación *"explicitly NOT decided"*.

### Implementation Blocker

**YES.** Evidencia: `IMPLEMENTATION DETAIL: OPEN — migración y modelo físico no definidos`.

---

## 6. D-002 — User global + Membership

### Estado actual

```
Decision Status:        APPROVED — OWNER-VERBATIM
Implementation Detail:  OPEN — migración Usuario/Cliente, modelo de datos y ciclo de vida
Canonicality:           Texto citable (Owner verbatim)
```

### Qué está decidido

**DECIDIDO:**
- `User` es la identidad global.
- `User ↔ Business` se establece mediante `Membership`, relación **N:N**.
- Un mismo `User` puede pertenecer a múltiples `Business`.
- Roles y permisos se determinan **dentro del** `Membership`.

**NO DECIDIDO** (`02-DECISION-DEPENDENCIES.md:22`, textual): *"Concrete data model, `Usuario.email @unique` and the `Usuario`/`Cliente` split are NOT decided."*

### Dependencias

```
Depends on:         D-001 (DIRECT)
Blocks:             D-003, D-005, D-006, D-007, D-012
Related decisions:  D-002-bis, D-005, D-006
Dependency satisfied?  PARTIAL — dirección desde DEC-001
```

### Impacto

**DOCUMENTADO:** Identity, Membership, Roles, Permissions, Database, Security.

**INFERIDO:** Frontend — el AS-IS documenta dos flujos de login separados (`Usuario` de panel y `Cliente` de tienda); unificar la identidad afecta ambos. La necesidad de cambio es documentada; su alcance en UI es inferido.

### Qué falta definir

Modelo de datos concreto de `Membership`; destino de `Usuario.email @unique` (hoy global, incompatible con multi-Business si el email debe poder repetirse por tenant); reconciliación de las tablas `Usuario` y `Cliente`.

### Pregunta para el Owner

> ¿Cómo se reconcilian las tablas `Usuario` y `Cliente` con una identidad `User` global única, qué ocurre con la unicidad global de `Usuario.email`, y cómo se modela la relación N:N `User ↔ Business`?

### Consecuencias

Las fuentes registran una tensión sin resolver: `Usuario.email` es hoy `@unique` global (`05-ASIS/04-ASIS-IDENTITY.md`) y D-002 exige que un `User` pertenezca a múltiples `Business`. Las fuentes **no** enuncian alternativas de resolución. **No se inventan.**

### Architecture Blocker

**YES.** Bloquea 5 decisiones; su propio modelo de datos está `NOT DECIDED`.

### Implementation Blocker

**YES.** `IMPLEMENTATION DETAIL: OPEN`, incluyendo la migración.

---

## 7. D-002-bis — Customer NO se fusiona con User

### Estado actual

```
Decision Status:        APPROVED — OWNER-VERBATIM (resolución posterior del Owner)
Implementation Detail:  OPEN — lifecycle de Customer, modelado del vínculo con User
Canonicality:           Texto citable (Owner verbatim, sesión del 2026-09-28)
```

### Qué está decidido

**DECIDIDO:**
- `Customer` **NO** se fusiona con `User`.
- `Customer` representa la relación comercial del comprador con un `Business`.
- Puede vincularse **opcionalmente** a un `User`, sin exigir uno.
- Pertenece al contexto de un `Business`.
- Puede incluir compras, pedidos, historial, cuenta corriente/deuda cuando aplique, y condiciones comerciales.

**NO DECIDIDO:** lifecycle de `Customer`; forma del vínculo opcional con `User`.

### Dependencias

```
Depends on:         D-002 (INFERIDO — resuelve una pregunta abierta de D-002)
Blocks:             NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE
Related decisions:  D-002, D-012 (cuenta corriente), D-007 (Order/Sale)
```

**Advertencia de trazabilidad:** D-002-bis **no tiene entrada propia** en `02-DECISION-DEPENDENCIES.md` — esa matriz se preserva verbatim de Fase 3.5 y D-002-bis es posterior. Su relación `Depends on: D-002` es **INFERIDA** por contenido, no documentada. Registrado como issue abierto (§18, ISS-02).

### Impacto

**DOCUMENTADO:** Identity, Commerce, Business.

**INFERIDO:** Database, API, Frontend — la decisión implica mantener dos entidades distintas en lugar de una, lo que afecta el modelo y los contratos. Las fuentes no lo detallan.

### Qué falta definir

Lifecycle de `Customer`; cardinalidad y opcionalidad exactas del vínculo `Customer ↔ User`; qué ocurre con un `Customer` cuyo `User` vinculado se elimina o cambia de `Business`.

### Pregunta para el Owner

> ¿Cuál es el ciclo de vida de `Customer` y cómo se modela su vínculo opcional con `User`, incluyendo el comportamiento cuando el `User` vinculado cambia o deja de existir?

### Consecuencias

`00-DECISION-REGISTER.md` §4.1 registra que `WAPSELL-IDENTITY-AND-TENANCY-SPEC-v0.1-DERIVADA.md` contiene un análisis de *"Customer-as-failure-modes"*. Ese documento es `DERIVED — non-canonical`. **No se extraen conclusiones de él acá** — se señala como material existente para el ruling.

### Architecture Blocker

**PARTIAL.** Resuelve una ambigüedad de identidad (no fusionar), lo que **desbloquea** parte del modelado. Pero deja el lifecycle y el vínculo `OPEN`, así que el modelo de datos de `Customer` no es escribible.

### Implementation Blocker

**YES.** `IMPLEMENTATION DETAIL: OPEN`.

---

## 8. D-005 — Roles y permisos en el Membership

### Estado actual

```
Decision Status:        APPROVED — DERIVED / RECONSTRUCTED
Implementation Detail:  OPEN — catálogo definitivo de roles y permisos, lifecycle, administración
Canonicality:           NO citable como texto aprobado — requiere confirmación del Owner
```

### Qué está decidido

**DECIDIDO (como requisito, no como redacción citable):**
- Roles y permisos **pertenecen al** `Membership`.
- Un `User` puede tener distintos roles y permisos en distintos `Business`.
- El acceso se determina mediante el `Membership` activo y sus autorizaciones.

**NO DECIDIDO** (`02-DECISION-DEPENDENCIES.md:25`): *"Role/permission catalog NOT decided."* — `Dependency satisfied? PARTIAL — principle only`.

### Dependencias

```
Depends on:         D-002 (DIRECT)
Blocks:             D-006
Related decisions:  D-002, D-006, DEC-001
Dependency satisfied?  PARTIAL — solo el principio
```

### Impacto

**DOCUMENTADO:** Roles, Permissions, Membership, Security, Identity.

**INFERIDO:** Backend, API, Database, Frontend. El AS-IS documenta un sistema `Permiso` + `UsuarioPermiso` ligado al `Usuario`, no a un `Membership`; el cambio de sujeto de la autorización afecta el enforcement completo. La incompatibilidad está documentada (CON-013); la forma de la solución no.

### Qué falta definir

El **catálogo** de roles y permisos; su lifecycle; quién los administra y con qué autoridad. `05-ASIS/04-ASIS-IDENTITY.md` documenta el enum actual (`OWNER`, `ASISTENTE_LOCAL`, `PROVEEDOR`, `REPARTIDOR`) y `00-DECISION-REGISTER.md` señala que el catálogo definitivo está sin decidir — DEC-001:55-57 lo declara indeterminado.

### Pregunta para el Owner

> ¿Cuál es el catálogo definitivo de roles y permisos por `Membership`, quién puede administrarlos, y cuál es su ciclo de vida?

### Consecuencias

Las fuentes no enuncian alternativas de catálogo. CON-014 registra una ambigüedad terminológica adyacente (*"Asistente de local"* rol humano vs *"Asistente de IA"* funcionalidad) que afecta cómo se nombra un rol del catálogo. Se señala; no se resuelve.

### Architecture Blocker

**YES.** Bloquea D-006; el catálogo — núcleo de la decisión — está sin decidir.

### Implementation Blocker

**YES.** `IMPLEMENTATION DETAIL: OPEN`.

---

## 9. D-006 — Autorización contextual

### Estado actual

```
Decision Status:        APPROVED — DERIVED / RECONSTRUCTED
Implementation Detail:  OPEN — tipos de token, guards, middleware/interceptors, errores, sesión
Canonicality:           NO citable como texto aprobado
Cláusula en disputa:    OPEN DETAIL — PENDING OWNER RULING (§4.3.2 #2)
```

### Los 4 checks vs los 2 checks — investigación de fuentes

El prompt pide no interpretar, sino determinar. Resultado de la lectura directa:

**Los 4 checks — `WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md`, sección "D-006 — Autorización contextual", texto literal:**

> Todo acceso autenticado debe validarse mediante:
> 1. identidad global User;
> 2. Business objetivo;
> 3. Membership válido;
> 4. roles y permisos necesarios.
>
> Un token válido por sí solo no autoriza una operación sobre un Business.

**Los 2 checks — `WAPSELL-SPEC-GENERAL-v1.1-REVISADA.md:145-151`, texto literal:**

> ## D-006 — Authorization
>
> Todo acceso autenticado debe validarse mediante User y Membership.
>
> Un token válido por sí solo no autoriza acceso a un Business.
>
> **OPEN DETAIL:** tipos de token, guards, middleware/interceptors, errores, sesión y seguridad complementaria.

**Determinación punto por punto:**

| Pregunta del prompt | Respuesta | Evidencia |
|---|---|---|
| ¿Qué son los 4 checks? | `User` global · `Business` objetivo · `Membership` válido · roles y permisos necesarios | `v1.0`, sección D-006 |
| ¿Qué son los 2 checks? | `User` · `Membership` | `v1.1:147` |
| ¿Dónde están definidos? | Dos drafts `DERIVED — non-canonical`. El registro canónico §4 adopta la formulación de 4 checks en su celda de D-006, y simultáneamente registra la divergencia como pendiente en §4.3.2 #2 | `00-DECISION-REGISTER.md` §4, §4.3.2 |
| ¿A qué operaciones aplican? | *"Todo acceso autenticado"* (v1.0) / *"Todo acceso autenticado"* (v1.1). Ninguna fuente enumera operaciones, endpoints ni excepciones | Ambos drafts |
| ¿Qué actor los ejecuta? | **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE.** Ninguna fuente nombra el componente responsable. `IMPLEMENTATION DETAIL` lista *"guards, middleware/interceptors"* como abiertos | `00-DECISION-REGISTER.md` §4 |
| ¿En qué nivel del sistema operan? | **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE.** No se especifica capa (guard global, por-controller, servicio, DB) | — |
| ¿Son obligatorios? | Ambas formulaciones usan *"debe validarse"* — obligatorio en intención. **Cuáles** de los 4 son obligatorios es precisamente la divergencia sin resolver | §4.3.2 #2 |
| ¿Qué queda abierto? | Número de checks (4 vs 2); tipos de token; guards; middleware/interceptors; forma de los errores; manejo de sesión; seguridad complementaria | `00-DECISION-REGISTER.md` §4 y §4.3.2 #2 |

**Diferencia sustantiva entre las dos formulaciones:** v1.0 exige explícitamente validar el **`Business` objetivo** y los **roles/permisos**; v1.1 los omite del enunciado. Si prevaleciera v1.1, la validación de `Business` objetivo y de permisos quedaría fuera del enunciado normativo de D-006 y caería en `OPEN DETAIL`. **No se determina acá cuál corresponde.**

### Qué está decidido

**DECIDIDO (en ambas variantes):** un token válido **por sí solo no autoriza** una operación sobre un `Business`.

**NO DECIDIDO:** todo lo demás — cuántos checks, cuáles, quién los ejecuta, en qué capa, con qué errores.

### Dependencias

```
Depends on:         D-002 (DIRECT), D-005 (INDIRECT)
Blocks:             NONE  ← per 02-DECISION-DEPENDENCIES.md:49 — ver CONTRADICCIÓN §4.1
Related decisions:  D-002, D-005, D-002-bis
Dependency satisfied?  NO
```

### Impacto

**DOCUMENTADO:** Security, Permissions, Roles, Membership, Identity, API, Backend.

**INFERIDO:** Frontend — la forma del token y el manejo de sesión afectan al cliente. Database — si el check de `Membership` requiere consulta, hay implicancia de modelo y performance. Ninguna fuente lo detalla.

### Qué falta definir

La formulación normativa (4 vs 2 checks) y todo el `IMPLEMENTATION DETAIL`.

### Pregunta para el Owner

> Para D-006, ¿la validación normativa comprende cuatro elementos (`User`, `Business` objetivo, `Membership` válido, roles y permisos) como enuncia v1.0, o dos (`User`, `Membership`) como enuncia v1.1, quedando `Business` objetivo y permisos como detalle abierto?

### Consecuencias

Ambas alternativas están explícitas en las fuentes y se documentan sin recomendar:

| Si prevalece | Consecuencia según las fuentes |
|---|---|
| **v1.0 (4 checks)** | La validación de `Business` objetivo y de roles/permisos es **normativa** dentro de D-006. Queda sujeta al catálogo de D-005, que está sin decidir — el acoplamiento se vuelve explícito |
| **v1.1 (2 checks)** | `Business` objetivo y permisos salen del enunciado normativo y pasan a `OPEN DETAIL`. D-006 se vuelve resoluble antes de cerrar el catálogo de D-005, a costa de no fijar normativamente la validación de tenant |

### Architecture Blocker

**YES.** Define la forma del enforcement de autorización; su dependencia (`D-002`, `D-005`) está `NO` satisfecha y su enunciado normativo está en disputa.

### Implementation Blocker

**YES.** `IMPLEMENTATION DETAIL: OPEN` en todos sus componentes.

> **Cumplimiento del §5 del mandato:** no se modificó `permissions.guard.ts`, JWT, roles, permissions, controllers ni database. El estado del código relativo a validación de `type` está documentado en `09-ANNEXES/TECHNICAL-DEBT-REGISTER.md` (TD-007) como hallazgo previo, y **no se re-verificó ni se alteró** en esta fase.

---

## 10. D-014 — Inventory ownership

### Estado actual

```
Decision Status:        APPROVED — OWNER-RULED 2026-09-28 (§4.3.1: v1.0 prevails)
Implementation Detail:  OPEN — ubicaciones y modelo físico
Canonicality:           Ruling vinculante; texto DERIVED / RECONSTRUCTED (no citable verbatim)
```

**Es una de solo dos decisiones con ruling del Owner ya emitido.**

### Qué está decidido

**DECIDIDO — con fuerza normativa por el ruling de §4.3.1:**
- El inventario pertenece **exclusivamente** a cada `Business`.
- **No existe stock global compartido** entre `Business`.
- Compras, ventas, ajustes y movimientos se registran dentro del `Business` correspondiente.
- **No se permite transferencia de stock entre `Business`**, salvo especificación posterior explícita.

El ruling es explícito: la democión de *"transferencias"* a `OPEN DETAIL` que hacía v1.1 fue **RECHAZADA**. La prohibición **no es `OPEN`**: es normativa.

**NO DECIDIDO:** ubicaciones y modelo físico del inventario.

### Dependencias

```
Depends on:         D-001 (DIRECT)
Blocks:             D-015
Related decisions:  D-010 (integridad de stock), D-015
Dependency satisfied?  NO
```

### Impacto

**DOCUMENTADO:** Inventory, Tenancy, Business, Purchasing (bloquea D-015), Database.

**INFERIDO:** Backend, API — el enforcement de la prohibición requiere un punto de control; las fuentes no dicen dónde.

### Qué falta definir

Ubicaciones (múltiples depósitos por `Business`) y modelo físico. La regla de propiedad está cerrada; su representación no.

### Invariante ya derivable

`00-DECISION-REGISTER.md` §4.3.1 lo enuncia textualmente:

> *"Yields a **cross-entity verifiable invariant**: no code path may move stock between Business."*

**Es la única decisión del alcance de este informe que produce una restricción verificable sobre el código sin requerir más rulings.**

Estado de cumplimiento: `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md` clasifica la prohibición como `VERIFIED BY CODE`, satisfecha **por ausencia de la funcionalidad** — no por un control que la impida. **DOCUMENTADO**, no re-verificado en esta fase.

### Pregunta para el Owner

> ¿Cómo se modelan las ubicaciones de inventario dentro de un `Business` (depósito único o múltiple), y debe existir un control activo que impida el movimiento de stock entre `Business`, o basta con no implementar la funcionalidad?

### Consecuencias

Documentadas en §4.3.1: v1.0 (prohibición normativa) **prevalece**; v1.1 (`OPEN DETAIL`) fue **rechazada**. La alternativa ya fue adjudicada por el Owner — **no se reabre**.

### Architecture Blocker

**PARTIAL.** La regla de propiedad está decidida y produce un invariante. Pero `Depends on: D-001` no está satisfecha y el modelo físico está `OPEN`, así que el modelo de datos de inventario no es escribible.

### Implementation Blocker

**YES.** `IMPLEMENTATION DETAIL: OPEN` — ubicaciones y modelo físico.

---

## 11. D-017 — Arquitectura: monolito modular

### Estado actual

```
Decision Status:        APPROVED — DERIVED / RECONSTRUCTED
Implementation Detail:  OPEN — topología física, infraestructura, comunicación, seguridad adicional
Canonicality:           NO citable como texto aprobado
Cláusula en disputa:    OPEN DETAIL — PENDING OWNER RULING (§4.3.2 #8)
```

### Separación exigida por §7 del mandato

| Nivel | Contenido | Fuente |
|---|---|---|
| **REQUISITO DE NEGOCIO** | Priorizar simplicidad, mantenibilidad, separación de dominios y evolución incremental | v1.0, sección D-017 |
| **RESTRICCIÓN** | Debe permitir evolucionar componentes individualmente **sin requerir migración inicial a microservicios**. · *(v1.1 únicamente)* No se establece adopción obligatoria de Kubernetes, GraphQL, colas u otras tecnologías enterprise | v1.0 + v1.1:275 |
| **DECISIÓN ARQUITECTÓNICA** | Wapsell se implementa inicialmente como **monolito modular**, con dominios y responsabilidades separados | Ambos drafts |
| **IMPLEMENTATION DETAIL** | Topología física, infraestructura, mecanismos de comunicación, seguridad adicional | `00-DECISION-REGISTER.md` §4 |

La cláusula de v1.1 sobre tecnologías enterprise es una **restricción negativa** (qué *no* es obligatorio), **no** una decisión de no usarlas nunca. Convertirla en "prohibido usar Kubernetes" sería exactamente la transformación que §7 del mandato prohíbe. **No se hace.**

v1.0 aporta la contraparte: *"Infraestructura, mecanismos de comunicación y capacidades de seguridad adicionales se incorporarán cuando exista un requisito concreto que los justifique"* — criterio de incorporación, no prohibición.

### Qué está decidido

**DECIDIDO:** monolito modular como punto de partida; separación de dominios; evolución sin migración inicial a microservicios.

**NO DECIDIDO:** topología física; infraestructura; comunicación; seguridad adicional; y el estatus normativo de la cláusula sobre tecnologías enterprise (§4.3.2 #8).

### Dependencias

```
Depends on:         D-001 (INDIRECT), D-002 (INDIRECT), D-003 (INDIRECT)
Blocks:             D-018 (DIRECT)
Related decisions:  D-003, D-018
Dependency satisfied?  NO
```

`D-003 → D-017` es `INDIRECT` y está documentada (`02-DECISION-DEPENDENCIES.md:46`, *"Messaging involves users and businesses"*). Relevante porque D-003 tiene `Dependency satisfied? NO` y su alcance funcional fue **explícitamente excluido** por DEC-001:61-65.

### Impacto

**DOCUMENTADO:** Infrastructure, Backend, Database (vía topología), y D-018 (CI/CD).

**INFERIDO:** Frontend, API, Security. CON-002 y CON-026 documentan el conflicto entre el stack simple actual y la propuesta enterprise de SRC-018 (Kubernetes, GraphQL, 2FA, PCI DSS, ELK) — ambos `OPEN`. D-017 da dirección pero no cierra ese conflicto.

### Qué falta definir

Topología física e infraestructura; y si la cláusula de v1.1 sobre tecnologías enterprise es normativa.

### Pregunta para el Owner

> ¿La cláusula *"no se establece actualmente una adopción obligatoria de Kubernetes, GraphQL, colas u otras tecnologías enterprise"* forma parte del enunciado normativo de D-017, o es un comentario no vinculante?

### Consecuencias

| Si prevalece | Consecuencia según las fuentes |
|---|---|
| **Cláusula normativa (v1.1)** | Ninguna tecnología enterprise puede exigirse sin una decisión posterior. Acota CON-002/CON-026 sin cerrarlos |
| **Cláusula no vinculante** | D-017 no se pronuncia sobre tecnologías enterprise. CON-002/CON-026 quedan completamente abiertos |

### Architecture Blocker

**PARTIAL.** El estilo arquitectónico (monolito modular) está decidido y es accionable para organizar dominios. Pero su dependencia está `NO` satisfecha, la topología está `OPEN`, y una cláusula normativa está en disputa.

### Implementation Blocker

**YES.** `IMPLEMENTATION DETAIL: OPEN` en los cuatro componentes.

---

## 12. D-009 — Anomalía autorreferencial

Revisada **exclusivamente** por la anomalía, conforme al §6 del mandato.

### La regla

`WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md`, sección "D-009 — Governance", texto literal:

> La SPEC es la fuente de verdad del producto.
>
> **Ninguna funcionalidad, cambio de alcance, decisión arquitectónica o modificación relevante del comportamiento se considera requisito aprobado sin definición y aprobación documental correspondiente.**
>
> Las propuestas deben distinguirse de los requisitos aprobados.
>
> Toda implementación debe poder trazarse hasta su requisito, decisión o especificación.

### La cláusula que aparentemente la modifica

`WAPSELL-SPEC-GENERAL-v1.1-REVISADA.md:181-189`, texto literal completo:

> ## D-009 — Governance
>
> La SPEC es la fuente de verdad del producto.
>
> Las propuestas deben distinguirse de requisitos aprobados.
>
> Toda implementación debe poder trazarse hasta su requisito, decisión o especificación correspondiente.
>
> **OPEN DETAIL:** workflow documental y mecanismo formal de aprobación.

**La oración sobre aprobación documental obligatoria no aparece en v1.1.** Las otras tres se conservan casi literalmente.

### Documentos que intervienen

| Documento | Rol |
|---|---|
| `WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md` | Contiene la cláusula |
| `WAPSELL-SPEC-GENERAL-v1.1-REVISADA.md` | La omite; declara el mecanismo de aprobación como `OPEN DETAIL` |
| `04-DECISIONS/00-DECISION-REGISTER.md` §4.3.2 #4 | Registra la divergencia y la marca autorreferencial |
| `00-GOVERNANCE/01-SOURCE-OF-TRUTH.md` | Norma superior: *"Approved decisions → Decision Register"* |

### ¿Existe realmente una contradicción?

**Sí, y es de naturaleza particular.** El registro canónico ya la caracterizó (§4.3.2 #4):

> *"⚠️ note: v1.1 demotes to `OPEN` the very clause that governs this register's own approval process. Self-referential; needs resolution."*

La estructura del problema: v1.1 degrada a `OPEN DETAIL` la cláusula que establece cuándo algo cuenta como aprobado. Si esa degradación fuera válida, el criterio para validar degradaciones sería él mismo indefinido. **La anomalía es circular, no una simple divergencia de redacción.**

Matiz que las fuentes permiten observar, sin resolver: el registro §4.3 establece que *"v1.1 is a compression of v1.0: where it is silent, silence is not a retraction"*. Bajo esa regla general, la omisión en v1.1 **no** sería una retractación. Pero §4.3.2 listó esta cláusula explícitamente como divergencia `PENDING OWNER RULING`, es decir, **no** aplicó la regla de compresión acá. Las fuentes no explican por qué se trató como divergencia en lugar de silencio. **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE.**

### ¿Requiere Owner Ruling?

**Sí.** Registrado como **OR-004**. No se corrige, no se elige interpretación, y `D-009` **no** fue modificada.

**Estado de dependencias:** `Depends on: NONE` · `Blocks: NONE` (`02-DECISION-DEPENDENCIES.md:52`). Formalmente D-009 no bloquea ninguna decisión; materialmente gobierna cómo se aprueban todas. Esa tensión es parte de la anomalía.

---

## 13. Decision Matrix

| ID | Estado | Architecture Blocker | Implementation Blocker | Dependencias | Decidido | Pendiente | Owner Ruling |
|---|---|---|---|---|---|---|---|
| **D-001** | `APPROVED — OWNER-VERBATIM` · `IMPL: OPEN` | **YES** | **YES** | Dep: `NONE` · Blocks: 12 decisiones | Business = Tenant; unidad de aislamiento | Nombre canónico; transformación de `Empresa`; migración; modelo físico | **OR-001** |
| **D-002** | `APPROVED — OWNER-VERBATIM` · `IMPL: OPEN` | **YES** | **YES** | Dep: D-001 (`DIRECT`) · Blocks: D-003, D-005, D-006, D-007, D-012 | `User` global; `Membership` N:N; roles en el Membership | Modelo de datos; `Usuario.email @unique`; split `Usuario`/`Cliente` | **OR-002** |
| **D-002-bis** | `APPROVED — OWNER-VERBATIM` · `IMPL: OPEN` | **PARTIAL** | **YES** | Dep: D-002 (**INFERIDO**) · Blocks: `NO DETERMINABLE` | `Customer` no se fusiona con `User`; vínculo opcional | Lifecycle de `Customer`; modelado del vínculo | **OR-003** |
| **D-005** | `APPROVED — DERIVED` · `IMPL: OPEN` | **YES** | **YES** | Dep: D-002 (`DIRECT`) · Blocks: D-006 | Roles/permisos pertenecen al `Membership` | Catálogo de roles y permisos; lifecycle; administración | **OR-002** (encadenado) |
| **D-006** | `APPROVED — DERIVED` · `IMPL: OPEN` · cláusula en disputa | **YES** | **YES** | Dep: D-002 (`DIRECT`), D-005 (`INDIRECT`) · Blocks: `NONE` ⚠️ §4.1 | Un token válido por sí solo no autoriza | 4 vs 2 checks; tokens; guards; middleware; errores; sesión | **OR-005**, **OR-006** |
| **D-014** | `APPROVED — OWNER-RULED` · `IMPL: OPEN` | **PARTIAL** | **YES** | Dep: D-001 (`DIRECT`) · Blocks: D-015 | Stock exclusivo por Business; transferencia inter-Business **prohibida** | Ubicaciones; modelo físico | — (ruling ya emitido) |
| **D-017** | `APPROVED — DERIVED` · `IMPL: OPEN` · cláusula en disputa | **PARTIAL** | **YES** | Dep: D-001, D-002, D-003 (`INDIRECT`) · Blocks: D-018 | Monolito modular; separación de dominios | Topología; infraestructura; comunicación; seguridad; estatus de la cláusula enterprise | **OR-007** |
| **D-009** | `APPROVED — DERIVED` · `IMPL: OPEN` · anomalía | **NO** | **NO** | Dep: `NONE` · Blocks: `NONE` | SPEC es fuente de verdad; trazabilidad exigida | Workflow y mecanismo de aprobación; estatus de la cláusula omitida | **OR-004** |

Cada fila es trazable a `00-DECISION-REGISTER.md` §4 (estado, decidido, pendiente) y `02-DECISION-DEPENDENCIES.md` (dependencias).

---

## 14. Owner Rulings Required

**No se responde ninguna. No se recomienda alternativa. No se cierra ninguna decisión.**

### OR-001 — Nombre canónico y transformación de la unidad de negocio — **CLOSED 2026-09-28**

- **Decision:** D-001
- **Source:** `00-DECISION-REGISTER.md` §4 · `02-DECISION-DEPENDENCIES.md:21,67` · `02-MULTITENANCY.md:53-57`
- **Why it matters:** Raíz del grafo de dependencias: bloquea 12 decisiones. Ningún modelo de datos de Wapsell es escribible sin esto.
- **Question:** ¿Cuál es el nombre canónico de la unidad de negocio multi-tenant, y cómo se transforma el modelo actual de `Empresa` hacia ese nombre?
- **Affected architecture:** Tenancy, Domain Model, Data Model, Identity.
- **Affected implementation:** Schema completo (~42 modelos con `empresaId`), migraciones, contratos de API.

> **CERRADO por ruling del Owner, 2026-09-28.** Registro completo en
> [`13-OR-001-OWNER-RULING-CLOSURE.md`](13-OR-001-OWNER-RULING-CLOSURE.md).
>
> Resumen del ruling: **`Empresa` se RENOMBRA a `Business`** (P1-A), mediante **convivencia
> temporal de ambos modelos** (P2-C), con **continuidad sin downtime** obligatoria sobre Ventas,
> Caja, Catálogo, Compras, Tienda Online, Auth y datos históricos (P3), corrigiendo el nombre
> `"Roonda"` → `"Otra Ronda Más"` (P4), y con autorización para **documentar y posteriormente
> implementar** la migración (P5-B).
>
> **P5-B no autoriza ejecución inmediata:** la estrategia de migración debe especificarse primero.
> `IMPLEMENTATION DETAIL` de D-001 pasa de `OPEN` a **`SPECIFICATION REQUIRED`** — ver el registro
> de cierre §6.

### OR-002 — Modelo de identidad y Membership

- **Decision:** D-002 (y en cascada D-005)
- **Source:** `00-DECISION-REGISTER.md` §4 · `02-DECISION-DEPENDENCIES.md:22,25`
- **Why it matters:** `Usuario.email` es hoy `@unique` global, lo que tensiona con un `User` que pertenece a múltiples `Business`. Bloquea D-005 y D-006.
- **Question:** ¿Cómo se reconcilian `Usuario` y `Cliente` con una identidad `User` global, qué ocurre con la unicidad global de `Usuario.email`, y cómo se modela la relación N:N `User ↔ Business`?
- **Affected architecture:** Identity, Membership, Authorization, Data Model.
- **Affected implementation:** Tablas `Usuario`/`Cliente`, autenticación, emisión de tokens, migración de datos.

### OR-003 — Lifecycle de Customer y vínculo con User

- **Decision:** D-002-bis
- **Source:** `00-DECISION-REGISTER.md` §4 (ficha D-002-bis) · §4.1
- **Why it matters:** La decisión fija que no se fusionan, pero no cómo se relacionan. Afecta Commerce y cuenta corriente.
- **Question:** ¿Cuál es el ciclo de vida de `Customer` y cómo se modela su vínculo opcional con `User`, incluyendo el comportamiento cuando el `User` vinculado cambia o deja de existir?
- **Affected architecture:** Identity, Commerce, Domain Model.
- **Affected implementation:** Modelo de `Customer`, FKs, contratos de tienda y panel.

### OR-004 — Anomalía autorreferencial de D-009

- **Decision:** D-009
- **Source:** `00-DECISION-REGISTER.md` §4.3.2 #4 · `v1.0` sección D-009 · `v1.1:181-189`
- **Why it matters:** v1.1 omite la cláusula que define cuándo algo cuenta como requisito aprobado. Si la omisión es válida, el criterio para validar omisiones queda indefinido. La circularidad afecta la autoridad de todo el registro, incluido este informe.
- **Question:** ¿La cláusula *"ninguna funcionalidad, cambio de alcance, decisión arquitectónica o modificación relevante del comportamiento se considera requisito aprobado sin definición y aprobación documental correspondiente"* forma parte del enunciado normativo de D-009?
- **Affected architecture:** Gobernanza documental (transversal).
- **Affected implementation:** El proceso de aprobación de toda implementación futura.

### OR-005 — Formulación normativa de D-006 (4 vs 2 checks)

- **Decision:** D-006
- **Source:** `00-DECISION-REGISTER.md` §4.3.2 #2 · `v1.0` sección D-006 · `v1.1:145-151`
- **Why it matters:** Determina si la validación de `Business` objetivo y de roles/permisos es normativa o detalle abierto. Define la forma del enforcement de autorización de toda la plataforma.
- **Question:** ¿La validación normativa de D-006 comprende cuatro elementos (`User`, `Business` objetivo, `Membership` válido, roles y permisos) o dos (`User`, `Membership`), quedando los otros dos como detalle abierto?
- **Affected architecture:** Authorization, Security, API Contracts.
- **Affected implementation:** Guards, middleware, forma del token, manejo de sesión y errores.

### OR-006 — Criterio de la columna `Blocks` y estatus de D-006 en el grafo

- **Decision:** D-006 (metadato de dependencias)
- **Source:** `02-DECISION-DEPENDENCIES.md:49` (`Blocks: NONE`) vs `11-DECISION-CLOSURE-REPORT.md` §2 (D-006 como eslabón final de una cadena bloqueante)
- **Why it matters:** Si `Blocks: NONE` es correcto, D-006 es una hoja del grafo y su resolución puede posponerse sin frenar la cadena de tenancy. Si no, bloquea toda la capa de autorización. Cambia el orden de resolución.
- **Question:** ¿La columna `Blocks` de la matriz de dependencias se refiere únicamente a otras decisiones `D-xxx`, o también a artefactos de arquitectura e implementación? Y en consecuencia, ¿D-006 bloquea algo además de su propio dominio?
- **Affected architecture:** Secuenciación de todo el trabajo arquitectónico.
- **Affected implementation:** Orden de implementación de la capa de autorización.

### OR-007 — Estatus normativo de la restricción tecnológica de D-017

- **Decision:** D-017
- **Source:** `00-DECISION-REGISTER.md` §4.3.2 #8 · `v1.1:275` · `v1.0` sección D-017
- **Why it matters:** Define si CON-002 y CON-026 (stack simple vs propuesta enterprise de SRC-018) quedan acotados o completamente abiertos.
- **Question:** ¿La cláusula *"no se establece actualmente una adopción obligatoria de Kubernetes, GraphQL, colas u otras tecnologías enterprise"* forma parte del enunciado normativo de D-017, o es un comentario no vinculante?
- **Affected architecture:** Infrastructure, Backend, arquitectura TO-BE.
- **Affected implementation:** Topología de despliegue, comunicación entre módulos, CI/CD (D-018).

---

## 15. Architecture Ready State

Un área se marca `READY` **solo** si no existe decisión pendiente que afecte materialmente su definición.

| Área | READY / BLOCKED | Motivo |
|---|---|---|
| **Product** | **READY** | DEC-001 tiene texto originalmente autorado y `APPROVED`: Wapsell = plataforma, Business = Tenant, conversación como interfaz central, Otra Ronda Más como primer Business. Es la única área con dirección cerrada |
| **Domain Model** | **BLOCKED** | D-001 `IMPL: OPEN`; nombre canónico de la unidad de negocio sin decidir (OR-001) |
| **Tenancy** | **BLOCKED** | D-001 `Dependency satisfied? PARTIAL`; transformación de `Empresa` *"explicitly NOT decided"* |
| **Identity** | **BLOCKED** | D-002 y D-002-bis con `IMPL: OPEN`; split `Usuario`/`Cliente` y `email @unique` sin decidir (OR-002, OR-003) |
| **Membership** | **BLOCKED** | D-002 `IMPL: OPEN` — modelo de datos de `Membership` sin definir |
| **Authorization** | **BLOCKED** | D-005 sin catálogo de roles/permisos; D-006 con formulación normativa en disputa (OR-005) y dependencias `NO` satisfechas |
| **Commerce** | **BLOCKED** | Depende de D-001 y D-002-bis; D-007/D-008/D-012 fuera de este alcance pero con `IMPL: OPEN` según el registro |
| **Messaging** | **BLOCKED** | D-003 `Dependency satisfied? NO`; alcance funcional **explícitamente excluido** por DEC-001:61-65 |
| **Data Model** | **BLOCKED** | Consecuencia directa de Tenancy + Identity + Membership. El registro es explícito: *"no migration, schema, naming, ID or physical model is authorised"* |
| **API Contracts** | **BLOCKED** | Dependen de Identity y Authorization; D-006 define la forma del enforcement y está en disputa |
| **Frontend Architecture** | **BLOCKED** | Depende de Identity (dos flujos de login hoy) y de D-004 (design system canónico *"NOT decided"*) |
| **Infrastructure** | **BLOCKED** | D-017 `IMPL: OPEN` en topología, infraestructura, comunicación y seguridad; cláusula tecnológica en disputa (OR-007) |

**Resultado: 1 área `READY` (Product), 11 `BLOCKED`.**

---

## 16. G1 Closure Criteria

Criterios **derivados** del análisis, no inventados. Cada uno se apoya en una condición observada en las fuentes.

| # | Criterio | Derivado de | Estado |
|---|---|---|---|
| **C1** | Las 7 decisiones arquitectónicas tienen redacción confirmada por el Owner (no `DERIVED / RECONSTRUCTED`) | §4 del registro: el texto `DERIVED` *"may be used as requirements, not as quotable approved text"* | **NO CUMPLIDO** — 4 de 7 son `DERIVED` (D-005, D-006, D-017, y el texto de D-014) |
| **C2** | Las 7 cláusulas `PENDING OWNER RULING` que afectan a estas decisiones están resueltas | §4.3.2 | **NO CUMPLIDO** — OR-005 (D-006) y OR-007 (D-017) pendientes |
| **C3** | La anomalía autorreferencial de D-009 está resuelta | §4.3.2 #4, *"Self-referential; needs resolution"* | **NO CUMPLIDO** — OR-004 |
| **C4** | La contradicción sobre `Blocks` de D-006 está resuelta | §4.1 de este informe | **NO CUMPLIDO** — OR-006 |
| **C5** | Las decisiones fundacionales tienen `Dependency satisfied? YES`, no `PARTIAL` | `02-DECISION-DEPENDENCIES.md:21-22` | **NO CUMPLIDO** — D-001 y D-002 en `PARTIAL`; D-005, D-006, D-014, D-017 en `NO` |
| **C6** | `IMPLEMENTATION DETAIL` deja de ser `OPEN` en al menos las decisiones que definen el modelo de datos | §4: *"no migration, schema, naming, ID or physical model is authorised"* | **NO CUMPLIDO** — `OPEN` en las 7 |
| **C7** | La numeración `D-xxx` ↔ `DEC-xxx` está resuelta o su equivalencia formalmente aceptada | §2 del registro, `GRF-02 UNRESOLVED` | **NO CUMPLIDO** |

### ¿G1 puede cerrarse ahora?

**NO.** Ninguno de los 7 criterios está cumplido.

**Qué bloquea:**
1. **7 Owner Rulings pendientes** (OR-001…OR-007).
2. **Confirmación de redacción** de las decisiones `DERIVED / RECONSTRUCTED` del alcance.
3. **Dependencias insatisfechas** en la cadena fundacional: D-001 y D-002 en `PARTIAL`; el resto en `NO`.
4. **`IMPLEMENTATION DETAIL` `OPEN`** en las 7 decisiones.

**Qué decisiones faltan:** ninguna decisión *nueva* es necesaria. Lo que falta es **precisión** sobre las ya aprobadas — el nombre canónico (D-001), el modelo de identidad (D-002), el catálogo de roles (D-005), la formulación de autorización (D-006), el modelo físico de inventario (D-014) y la topología (D-017).

**Quién debe resolverlas:** el **Owner**, para las 7 `OR`. Ninguna es resoluble por análisis documental: cada una requiere una elección de producto o arquitectura que las fuentes deliberadamente no tomaron.

**Qué documentación debe actualizarse después de los rulings:**

| Documento | Actualización |
|---|---|
| `04-DECISIONS/00-DECISION-REGISTER.md` §4, §4.3.2 | Promover cláusulas resueltas de `PENDING OWNER RULING` a normativas; elevar `DERIVED` a `OWNER-VERBATIM` donde se confirme redacción |
| `04-DECISIONS/10-OPEN-DECISIONS.md` | Reflejar el nuevo estado de apertura |
| `03-DECISION-WORKSHOP/02-DECISION-DEPENDENCIES.md` | Actualizar `Dependency satisfied?`; agregar entrada para D-002-bis (ISS-02); clarificar el criterio de `Blocks` (OR-006) |
| `03-CONFLICTS/00-CONFLICT-REGISTER.md` | Cerrar los CON-xxx que los rulings resuelvan (CON-009, CON-010, CON-013 dependen de D-001/D-002/D-005) |
| `07-TOBE/` y `06-TRANSFORMATION/` | Salen de `DRAFT` en las áreas desbloqueadas |
| `08-TRACEABILITY/` | Incorporar la trazabilidad decisión → spec de lo resuelto |
| Este documento | Nueva revisión con los rulings incorporados |

---

## 17. Evidence Classification

| Conclusión | Clasificación |
|---|---|
| Estados `APPROVED` / `IMPLEMENTATION DETAIL: OPEN` de las 7 decisiones | **DOCUMENTADO** — `00-DECISION-REGISTER.md` §4 |
| Provenance `OWNER-VERBATIM` / `OWNER-RULED` / `DERIVED` | **DOCUMENTADO** — §4, §4.3.1 |
| Dependencias `Depends On` / `Blocks` | **DOCUMENTADO** — `02-DECISION-DEPENDENCIES.md` |
| Texto de los 4 checks y de los 2 checks de D-006 | **DOCUMENTADO** — lectura literal de v1.0 y v1.1:145-151 |
| Texto de la cláusula omitida de D-009 | **DOCUMENTADO** — lectura literal de v1.0 y v1.1:181-189 |
| Divergencia normativa de D-014 (v1.0 prohíbe / v1.1 degrada) | **DOCUMENTADO** — lectura literal de ambos + §4.3.1 |
| Cláusula tecnológica de D-017 presente solo en v1.1 | **DOCUMENTADO** — v1.1:275 |
| Contradicción sobre `Blocks` de D-006 (§4.1) | **DOCUMENTADO** (ambas fuentes existen) · el criterio de la columna es **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE** |
| Actor y capa que ejecutan los checks de D-006 | **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE** |
| `Blocks` de D-002-bis | **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE** — sin entrada en la matriz |
| Por qué §4.3.2 trató la omisión de D-009 como divergencia y no como silencio | **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE** |
| Prohibición de D-014 satisfecha por ausencia de funcionalidad | **DOCUMENTADO** — `10-AUDIT/01`, `VERIFIED BY CODE` en su origen; **no re-verificado** en esta fase |
| Impactos marcados `INFERIDO` en cada ficha | **NO DETERMINABLE** como decisión — inferencia explícitamente etiquetada, no presentada como fuente |
| Cualquier afirmación sobre el estado del código | **DOCUMENTADO** (heredado de auditorías previas) — esta fase **no ejecutó verificación de código** |

**Sin evidencia `VERIFICADO POR TEST` ni `VERIFICADO POR EJECUCIÓN` en todo el informe:** el repositorio no tiene tests (TD-001), y esta fase no ejecutó nada.

---

## 18. Open Issues

| ID | Issue | Impacto | Estado |
|---|---|---|---|
| **ISS-01** | Contradicción sobre `Blocks` de D-006 entre `02-DECISION-DEPENDENCIES.md:49` y `11-DECISION-CLOSURE-REPORT.md` §2 | Cambia el orden de resolución arquitectónica | Reportado — **OR-006**. No resuelto |
| **ISS-02** | D-002-bis no tiene entrada en `02-DECISION-DEPENDENCIES.md` (matriz preservada verbatim de Fase 3.5, anterior a la decisión) | Sus dependencias son inferidas, no trazables | Reportado. Requiere actualización de la matriz, no de la decisión |
| **ISS-03** | `GRF-02` — numeración `D-001…D-018` ↔ `DEC-002…DEC-019` nunca aplicada | Afecta toda cita futura de decisiones | `UNRESOLVED` en el registro canónico. **No renumerado acá** |
| **ISS-04** | Los puntos 2 (plan de migración) y 4 (destino del repositorio) de los 5 que DEC-001 explícitamente no decidió no tienen una decisión `D-xxx` evidentemente asignada | Podría haber material sin cobertura de decisión | **NO DETERMINABLE** sin una verificación no realizada. Señalado, no afirmado |
| **ISS-05** | 16 de 19 fichas del registro requieren confirmación de redacción del Owner | Ninguna es citable como texto aprobado hasta entonces | `PENDING` — condición de C1 |
| **ISS-06** | D-009 formalmente no bloquea nada (`Blocks: NONE`) pero materialmente gobierna cómo se aprueba todo | Tensión estructural, parte de la anomalía | Reportado — **OR-004** |

---

## Resumen

```text
G1 STATUS:
BLOCKED

DECISIONS ANALYZED:
8  (D-001, D-002, D-002-bis, D-005, D-006, D-014, D-017 + anomalía de D-009)

ARCHITECTURE BLOCKERS:
6  →  YES: D-001, D-002, D-005, D-006
      PARTIAL: D-002-bis, D-014, D-017
      NO: D-009
      (4 YES + 3 PARTIAL; D-009 no bloquea arquitectura)

IMPLEMENTATION BLOCKERS:
7  →  YES en las 7 decisiones arquitectónicas
      (IMPLEMENTATION DETAIL: OPEN sin excepción)
      NO: D-009

OWNER RULINGS REQUIRED:
7  →  OR-001 (nombre canónico / transformación de Empresa)
      OR-002 (modelo de identidad y Membership)
      OR-003 (lifecycle de Customer y vínculo con User)
      OR-004 (anomalía autorreferencial de D-009)
      OR-005 (D-006: 4 vs 2 checks)
      OR-006 (criterio de `Blocks` y estatus de D-006 en el grafo)
      OR-007 (estatus normativo de la restricción tecnológica de D-017)

NEXT VALID STEP:
Sesión de Owner Ruling sobre OR-001…OR-007, en ese orden.
OR-001 es prerrequisito de todo lo demás: es la raíz del grafo
y bloquea 12 decisiones.
Tras los rulings, actualizar la documentación listada en §16 y
emitir una revisión de este informe antes de avanzar a G2.

NO avanzar a implementación, migraciones, refactors ni Wapsell Core.
```
