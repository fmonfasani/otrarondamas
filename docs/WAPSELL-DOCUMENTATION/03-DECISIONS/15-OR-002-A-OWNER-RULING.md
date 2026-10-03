# OR-002-A — Owner Ruling: estado canónico de `CON-010`

**Fase:** 04-DECISIONS · **Fecha del ruling:** 2026-09-28 · **Estado:** **CLOSED**
**Cuestión:** estado canónico vigente de `CON-010` para efectos de OR-002
**Autoridad:** ruling explícito del Owner (fmonfasani), sesión del 2026-09-28
**Relacionado:** `ISS-07` (contradicción documental) · `14-OR-002-PREPARATION.md` §D.4

> Este ruling resuelve **exclusivamente** OR-002-A. No cierra OR-002. No aborda OR-002-B…F.

---

## 1. Registro de decisión

> Transcripción del ruling del Owner. **No reinterpretado.**

### Estado canónico de `CON-010`

**`RESOLVED` en cuanto a la dirección conceptual del modelo de identidad.**

La dirección aprobada es:

```text
User global
   → Membership N:N
      → Business
```

### `Customer` — tres cláusulas

1. Es una **relación comercial independiente de `User`**.
2. **No se fusiona** con `User`.
3. El vínculo `Customer → User` es **opcional**.

### Autoridad

**No se designa una única fuente documental** entre las seis fuentes contradictorias.

La dirección se considera establecida por las decisiones `OWNER-VERBATIM` **`D-002`** y **`D-002-bis`**, ambas `APPROVED` en el Decision Register.

**La contradicción documental sobre el `STATUS` de `CON-010` debe conservarse como inconsistencia documental y NO debe resolverse silenciosamente.**

### Alcance resultante de OR-002

OR-002 queda limitado al **mecanismo de transformación/migración** y a los **detalles de implementación que correspondan específicamente a identidad**.

La contradicción documental sobre el estado de `CON-010` queda registrada como una **inconsistencia documental que debe reconciliarse**, pero **NO reabre** `D-002` ni `D-002-bis`.

### Rationale

> La contradicción detectada afecta al **estado documental del conflicto**, no al contenido de las decisiones `OWNER-VERBATIM` `D-002` y `D-002-bis`, que ya establecen la dirección conceptual.

### Implementation authorization

**No se autoriza todavía la implementación física.**

OR-002 deberá determinar primero el mecanismo de transición y los detalles necesarios **antes** de modificar schema, código o datos.

---

## 2. Qué resuelve este ruling, y qué no

| Cuestión | Estado tras el ruling |
|---|---|
| Dirección conceptual del modelo de identidad | **RESUELTA** — `User` → `Membership` N:N → `Business`, con `Customer` independiente |
| Autoridad del estado de `CON-010` | **RESUELTA** — reside en `D-002` + `D-002-bis`, no en un documento |
| Alcance de OR-002 | **RESUELTO** — mecanismo e `IMPLEMENTATION DETAIL` de identidad |
| Reapertura de `D-002` / `D-002-bis` | **DESCARTADA** explícitamente |
| Autorización de implementación física | **NO OTORGADA** |
| Contradicción documental (`ISS-07`) | **NO RESUELTA** — queda como inconsistencia a reconciliar |
| OR-002-B…F | **NO ABORDADAS** en este ruling |

### 2.1 Nota sobre la naturaleza de la autoridad establecida

El ruling introduce un criterio que conviene registrar porque es aplicable más allá de este caso: **la autoridad sobre el estado de un conflicto no proviene del documento que lo describe, sino de la decisión que lo resuelve.**

Bajo ese criterio, las seis posiciones documentales en disputa (§D.4 de `14-...`) dejan de competir entre sí: ninguna era la autoridad. La autoridad eran `D-002` y `D-002-bis` todo el tiempo, y los documentos eran registros —algunos actualizados, otros no— de ese hecho.

Esto es consistente con `01-SOURCE-OF-TRUTH.md`, que asigna *"Approved decisions → Decision Register"*. **No se afirma que el ruling derive de esa norma** (que además está `PROPOSED`); se señala la consistencia.

---

## 3. `ISS-07` — inconsistencia documental que DEBE PRESERVARSE

**Mandato del Owner, textual:** *"La contradicción documental sobre el `STATUS` de `CON-010` debe conservarse como inconsistencia documental y NO debe resolverse silenciosamente."*

Esto es más estricto que "pendiente de reconciliar": **la contradicción no debe borrarse.** Ningún documento divergente fue editado, y ninguno debe editarse para alinear su texto sin una decisión explícita del Owner sobre qué se anota y qué se preserva como historia.

`ISS-07` queda por tanto en estado **`PRESERVED — DO NOT SILENTLY RECONCILE`**, no en "por corregir".

Documentos cuyo texto sobre `CON-010` quedará desalineado con el ruling:

| # | Documento | Dice | Desalineación |
|---|---|---|---|
| 1 | `03-CONFLICTS/00-CONFLICT-REGISTER.md` fila `:72` | `OPEN` | Su encabezado declara la tabla *"preserved verbatim"*, así que puede ser correcto **como registro histórico**. Requiere criterio del Owner sobre si se anota |
| 2 | `03-CONFLICTS/00-CONFLICT-REGISTER.md` encabezado `:23-25` | `RESOLVED` | **Alineado** con el ruling en cuanto a dirección |
| 3 | `03-CONFLICTS/10-CONFLICT-RESOLUTION-MAPPING.md:69` | `RESOLVED` + `IMPLEMENTATION DETAIL` `OPEN` | **Alineado** — es la fuente que ya distinguía ambos ejes |
| 4 | `03-DECISION-WORKSHOP/D-002-...md` | `CON-010 remains OPEN` | **Desalineado.** Es registro histórico del workshop, y la propia ficha declara *"must not be cited as normative authority"* |
| 5 | `02-CANONICAL-SPEC/01-...md:24` | `CLOSED` | **Alineado** en dirección; usa `CLOSED` donde el ruling dice `RESOLVED` — diferencia de vocabulario, no de fondo |
| 6 | `GOVERNANCE-RECONCILIATION-REPORT.md:46` | *"only CON-001 resolved"* | **Desalineado.** Informe histórico de una reconciliación previa |

**Reparto tras el ruling: 3 alineados, 2 desalineados como registros históricos, 1 (la fila) pendiente de criterio.**

Ninguno se modificó. La reconciliación de `ISS-07` es una acción documental separada que requiere decisión del Owner sobre **qué** se anota y **qué** se preserva verbatim como historia.

### 3.1 Hallazgo estructural que `ISS-07` deja a la vista

Durante el análisis de OR-002-A se verificó que **los 7 documentos de `00-GOVERNANCE/` están en `Status: PROPOSED`, ninguno `APPROVED`** — incluidos los que definen la jerarquía documental, la política de evidencia y la resolución de conflictos. `00-DOCUMENT-GOVERNANCE.md` lo declara de sí mismo: *"This governance document is PROPOSED until explicitly approved."*

Consecuencia: **no existe una regla de precedencia documental aprobada** que permita resolver una contradicción entre fuentes sin un ruling del Owner. Este ruling suplió esa ausencia para `CON-010`; la ausencia persiste para casos futuros.

**Registrado como `ISS-08`.** No se actúa sobre él: aprobar la gobernanza es una decisión del Owner, fuera del alcance de OR-002.

---

## 4. Estado de `CON-010` — antes y después

| Campo | ANTES | DESPUÉS |
|---|---|---|
| **Estado canónico** | Indeterminado — 6 posiciones en conflicto | **`RESOLVED` en dirección conceptual** |
| **Autoridad del estado** | Disputada entre 6 documentos | **`D-002` + `D-002-bis`** (`OWNER-VERBATIM`), no un documento |
| **Dirección del modelo de identidad** | Cuestionable por la contradicción | **Confirmada:** `User` → `Membership` N:N → `Business`; `Customer` independiente |
| **Alcance de OR-002** | Indeterminado (¿dirección + mecanismo, o solo mecanismo?) | **Solo mecanismo + `IMPLEMENTATION DETAIL` de identidad** |
| **`D-002` / `D-002-bis`** | `APPROVED — OWNER-VERBATIM` | **Sin cambio** — no reabiertas |
| **Contradicción documental** | Detectada, sin tratamiento | **`ISS-07`** — inconsistencia a reconciliar, sin reconciliar |
| **Autorización de implementación** | Ninguna | **Ninguna** — sin cambio; requiere mecanismo definido primero |

---

## 5. Impacto sobre OR-002

### 5.1 Confirmado como cerrado

Los 8 puntos de `14-OR-002-PREPARATION.md` §I estaban marcados *"sujeto a que OR-002-A confirme que la dirección está resuelta"*. **El ruling lo confirma.** Quedan firmes:

| # | Punto | Autoridad |
|---|---|---|
| I.1 | `User` es la identidad global de la plataforma | `D-002` |
| I.2 | `Membership` es la relación `User ↔ Business`, N:N | `D-002` |
| I.3 | Un `User` puede pertenecer a múltiples `Business` | `D-002` |
| I.4 | Roles y permisos viven dentro del `Membership` | `D-002` |
| I.5 | `Customer` **no** se fusiona con `User` | `D-002-bis` |
| I.6 | `Customer` es la relación comercial con un `Business` | `D-002-bis` |
| I.7 | El vínculo `Customer → User` es **opcional** | `D-002-bis` |
| I.8 | `Business` es el extremo del `Membership` del lado del negocio | `D-001` + OR-001 |

El ruling añade una formulación compacta de la dirección, útil como referencia canónica:

```text
User global → Membership N:N → Business
Customer = relación comercial independiente de User
```

### 5.2 Vigente, con alcance ahora firme

| Pregunta | Estado |
|---|---|
| **OR-002-B** — mecanismo de transición de la identidad | **VIGENTE** — es ahora el núcleo de OR-002 |
| **OR-002-C** — regla de unicidad de `User` | **VIGENTE** — `IMPLEMENTATION DETAIL` de identidad |
| **OR-002-D** — destino de las filas de `Usuario` y `Cliente` | **VIGENTE** — mecanismo de migración |
| **OR-002-E** — validez de sesiones y tokens en la transición | **VIGENTE** — mecanismo, con requisito de continuidad de Auth heredado de OR-001 (P3) |
| **OR-002-F** — alcance de autorización | **VIGENTE**, y **parcialmente anticipada** por este ruling: *"No se autoriza todavía la implementación física... antes de modificar schema, código o datos"* |

Sobre **OR-002-F**: el ruling ya fija que la implementación física no está autorizada y que el mecanismo debe determinarse primero. Lo que **no** declara es si, una vez especificado el mecanismo, la autorización sigue el patrón P5-B de OR-001 (documentar + implementar tras aprobación de la especificación). **No se asume que aplique.**

### 5.3 Fuera del alcance de OR-002, confirmado

El ruling limita OR-002 a *"detalles de implementación que correspondan **específicamente** a identidad"*. Eso confirma la separación que ya proponía §C.2 de `14-...`:

| Elemento | Pertenece a |
|---|---|
| Lifecycle de `Customer` | **OR-003** |
| Modelado del vínculo `Customer ↔ User` | **OR-003** |
| Diseño de token, claims, revocación; guards y middleware | **OR-005** (`D-006`, 4 vs 2 checks) |
| Catálogo de roles y permisos | **`D-005`** — bloqueo propio, no resoluble en OR-002 |

### 5.4 Decisiones dependientes

**Sin cambios.** `D-005` y `D-006` no se desbloquean con este ruling: conservan sus bloqueos propios (catálogo de roles sin decidir; formulación normativa en disputa). Es el mismo patrón observado al cerrar OR-001 (§4.1 de `13-...`).

---

## 6. Evidencia utilizada

| Fuente | Uso | Clasificación |
|---|---|---|
| Ruling del Owner, 2026-09-28 | Estado canónico, autoridad, alcance, rationale, autorización | **`OWNER-VERBATIM`** |
| `00-DECISION-REGISTER.md:98-99` | Texto de `D-002` y `D-002-bis`; `IMPLEMENTATION DETAIL` `OPEN` | `DOCUMENTADO` |
| `03-CONFLICTS/00-CONFLICT-REGISTER.md:23-25,72` | Las dos posiciones internas del registro | `DOCUMENTADO` |
| `03-CONFLICTS/10-CONFLICT-RESOLUTION-MAPPING.md:69` | `RESOLVED` + `IMPLEMENTATION DETAIL` `OPEN` | `DOCUMENTADO` |
| `03-DECISION-WORKSHOP/D-002-...md` | `CON-010 remains OPEN`; cláusula de no-autoridad-normativa | `DOCUMENTADO` |
| `02-CANONICAL-SPEC/01-...md:24` | `CON-010 CLOSED`; fusión `REFUTED` | `DOCUMENTADO` |
| `GOVERNANCE-RECONCILIATION-REPORT.md:46` | *"only CON-001 resolved"* (sexta posición) | `DOCUMENTADO` |
| `00-GOVERNANCE/*` (7 archivos) | Verificación de que **ninguno** está `APPROVED` → `ISS-08` | **`VERIFICADO POR CÓDIGO`** (grep sobre el directorio) |
| `13-OR-001-OWNER-RULING-CLOSURE.md` | Requisito de continuidad de Auth (P3); patrón P5-B | `DOCUMENTADO` |

**Sin evidencia `VERIFICADO POR TEST` ni `VERIFICADO POR EJECUCIÓN`:** el repositorio no tiene tests (TD-001) y esta fase no ejecutó nada.

---

## 7. Confirmación de no ejecución

- **NO se modificó código.** `apps/`, `packages/`: sin cambios de contenido.
- **NO se modificó Prisma.** `apps/api/prisma/`: intacto.
- **NO se modificaron datos.** Ninguna operación contra ninguna base de datos.
- **NO se autorizó implementación física.** El ruling lo prohíbe explícitamente.
- **NO se cerró OR-002.** Solo OR-002-A quedó resuelta.
- **NO se avanzó a OR-003.**
- **NO se reconcilió `ISS-07`.** Los 6 documentos divergentes quedan sin editar.
- **NO se hizo commit.**

Escrituras de esta ejecución: este documento (nuevo) y la nota de resolución de OR-002-A en `14-OR-002-PREPARATION.md` §H.

---

## 8. OR-002-B … OR-002-F — preparadas y separadas

**Cada pregunta es independiente. La respuesta de OR-002-A no resuelve ninguna de ellas.** OR-002-A fijó el *alcance* (solo mecanismo e `IMPLEMENTATION DETAIL` de identidad); no aportó contenido a B–F.

Ninguna incluye recomendación, ranking ni opción marcada como preferible. **No se diseña solución técnica.**

---

### OR-002-B — Mecanismo de transición de la identidad

**Pregunta:**

> El ruling de OR-001 decidió convivencia temporal para `Empresa` → `Business`. ¿La transformación de `Usuario`/`Cliente` hacia `User` + `Membership` sigue el mismo mecanismo de convivencia temporal, u otro?

**Por qué requiere ruling:** **NO HAY ALTERNATIVAS EXPLÍCITAMENTE DOCUMENTADAS** para el mecanismo de identidad. Ninguna fuente enumera opciones. `DEC-001` enumeró *"reescritura, migración incremental, o convivencia temporal"* para el **modelo de datos en general**, y el Owner aplicó ese conjunto a `Empresa`→`Business` en OR-001; **no hay registro de que se extienda a identidad**, y no se asume.

**Estado:** `PENDING OWNER RULING`. **No resuelta por OR-002-A.**

---

### OR-002-C — Regla de unicidad de `User`

**Pregunta:**

> Hoy `Usuario.email` es `@unique` global, lo que impide que una persona tenga cuenta en dos `Business` con el mismo email, mientras `Cliente` usa `@@unique([empresaId, email])`. ¿Cuál es la regla de unicidad de `User` en el modelo objetivo?

**Por qué requiere ruling:** `07-TOBE/01` Open Detail #2 enuncia el espacio del problema —*"Mecanismo de unicidad de `User` (email global, ID, otro)"*— **sin desarrollar ninguna opción**. Tres palabras no son alternativas evaluadas.

**Evidencia AS-IS** (`VERIFIED BY CODE` en origen, `05-ASIS/04-ASIS-IDENTITY.md`): *"una misma persona **no puede** tener cuenta de `Usuario` en dos empresas distintas con el mismo email. Esto es lo opuesto de 'User = identidad global reutilizable entre Business' que pide DEC-001."*

**Estado:** `PENDING OWNER RULING`. **No resuelta por OR-002-A.**

---

### OR-002-D — Destino de las filas existentes de `Usuario` y `Cliente`

**Pregunta:**

> `D-002-bis` decidió que `Customer` no se fusiona con `User`. ¿Qué ocurre con las filas actuales de las tablas `Usuario` y `Cliente`: cada una deriva en una entidad distinta del modelo objetivo, o hay casos que requieren tratamiento específico — por ejemplo una persona que hoy existe como `Usuario` y como `Cliente` a la vez?

**Por qué requiere ruling:** es Open Question literal de la ficha `D-002` (*"¿Cuál es la estrategia de migración para los datos de `Usuario` y `Cliente` existentes?"*), sin respuesta en ninguna fuente. `D-002-bis` decide que **no se fusionan** como entidades; no decide qué ocurre con las **filas**.

**Estado:** `PENDING OWNER RULING`. **No resuelta por OR-002-A.**

---

### OR-002-E — Validez de sesiones y tokens durante la transición

**Pregunta:**

> El ruling de OR-001 exige continuidad sin downtime de **Auth** y **datos históricos**. Durante la transición de identidad, ¿las sesiones y tokens ya emitidos deben seguir siendo válidos, o se admite invalidarlos en algún punto?

**Por qué requiere ruling:** OR-001 (P3) impone continuidad de Auth, pero **no especifica** qué significa para sesiones ya emitidas. `07-TOBE/01` §12 gap #9 documenta que el JWT actual lleva un campo `type` (`usuario`/`cliente`) que discrimina dos identidades separadas — un cambio de modelo de identidad afecta a los tokens en circulación.

**Nota de alcance:** el **diseño** del token (formato, claims, revocación) es `IMPLEMENTATION DETAIL` de `D-006` y pertenece a **OR-005**. OR-002-E pregunta solo por la **validez durante la transición**, no por el diseño.

**Estado:** `PENDING OWNER RULING`. **No resuelta por OR-002-A.**

---

### OR-002-F — Alcance de la autorización de OR-002

**Pregunta:**

> ¿OR-002 autoriza documentar y posteriormente implementar la transformación de identidad, con la misma puerta de aprobación previa de la especificación que fijó OR-001 (P5-B)?

**Por qué requiere ruling, aun estando parcialmente anticipada:** OR-002-A ya declaró *"No se autoriza todavía la implementación física... antes de modificar schema, código o datos"*. Eso fija el **estado presente**. Lo que **no** declara es el **régimen futuro**: si una vez especificado el mecanismo la autorización sigue el patrón P5-B de OR-001 (documentar + implementar tras aprobación de la especificación), u otro. **No se asume que P5-B aplique por analogía.**

**Estado:** `PENDING OWNER RULING` — parcialmente anticipada en cuanto al estado presente, abierta en cuanto al régimen posterior.

---

### Resumen de las cinco preguntas

| ID | Cuestión | Alternativas documentadas | Estado |
|---|---|---|---|
| **OR-002-B** | Mecanismo de transición de identidad | **NINGUNA** | `PENDING` |
| **OR-002-C** | Regla de unicidad de `User` | **NINGUNA** (solo enunciado del problema) | `PENDING` |
| **OR-002-D** | Destino de las filas de `Usuario`/`Cliente` | **NINGUNA** | `PENDING` |
| **OR-002-E** | Validez de sesiones/tokens en la transición | **NINGUNA** | `PENDING` |
| **OR-002-F** | Régimen de autorización de OR-002 | Patrón P5-B de OR-001 existe, **no se asume aplicable** | `PENDING` (parcial) |

**OR-002 no se cierra con ninguna de estas preparadas: requieren tus respuestas.**
