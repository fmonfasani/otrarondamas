# B3 — TENANT ISOLATION INVARIANTS
## PARALLEL DERIVATION — CONTROLLED / NON-CANONICAL

**Estado:** **DRAFT / NON-CANONICAL / PENDING B3 CONTRACT RECONCILIATION**
**Fecha:** 2026-10-04
**Tipo:** derivación controlada de invariants. Solo documentación. **No es fuente normativa.**
**Repo evaluado:** `apps/api`, commit base `ac555d6`
**Acción:** sin cambios de código, schema, migraciones ni datos. Sin commits, push ni deploy. Sin modificar Owner Decisions, contratos canónicos ni invariants históricos. No se ejecutó ningún test.

**Clases de evidencia:** `[C]` código · `[D]` documentado · `[T]` test · `[E]` ejecución · `[ND]` no determinable.

> **No se emite ninguna evidencia `[T]` ni `[E]`.** No existen tests de aislamiento en el repositorio `[C]`. Nada de lo afirmado aquí es conductual-verificado: es `[C]` por lectura, `[D]` o `[ND]`.

**Trabajo paralelo:** **B3 — Tenant Isolation Contracts** está siendo derivado por separado. Verificado por listado de `07-DESIGN/CONTRACTS/DOMAIN/` (11 archivos, ninguno de aislamiento de persistencia): **el contrato B3 todavía no existe en el repositorio** `[C]` ausencia. Ningún invariant de este documento debe considerarse canónico antes de reconciliarse contra ese contrato.

**Este documento NO cierra B3 Contracts. NO modifica contratos. NO modifica invariants canónicos. NO implementa. NO ejecuta tests.**

---

# 1. EXECUTIVE SUMMARY

**Veredicto: DRAFT READY FOR B3 CONTRACT RECONCILIATION.**

Se derivaron **41 invariants candidatos** en 9 familias bajo el namespace `INV-B3-*`, verificado libre (`grep -rn "INV-B3-"` → cero coincidencias `[C]`).

**Cobertura de las 12 propiedades de R8-ARCH-002:** las 12 tienen al menos un invariant trazable. Ninguna quedó `BLOCKED BY CONTRACT` en el sentido de no poder derivarse: las propiedades 2 y 3 (Membership) se derivan **por referencia a B1/B2**, no se redefinen aquí, conforme a la cadena de dependencia de §18 del encargo.

**Distribución por estado:**

| Estado | Cantidad |
|---|---|
| DRAFT — estable, derivable a test | 26 |
| DRAFT — PENDING B3 CONTRACT | 11 |
| DRAFT — REFERENCE (propiedad de B1/B2, no de B3) | 4 |

**Los tres hallazgos de esta derivación:**

1. **El AS-IS tiene tres clases de cumplimiento, y la distinción es el eje de toda la derivación.** De los 17 vectores X del audit AS-IS, los contenidos se agrupan en: *por mecanismo* (sobreviven a un refactor), *por orden de llamadas o chequeo explícito* (correctos hoy, se rompen con un cambio local que nada señalaría), y *abiertos*. Varios invariants existen precisamente para convertir la segunda clase en la primera — y eso no es una decisión de implementación, es una propiedad observable: `INV-B3-BYPASS-002` afirma que el aislamiento no puede depender del orden de las llamadas. Es verificable sin prescribir mecanismo.

2. **Una propiedad de R8-ARCH-002 no tiene hoy ningún mecanismo que la soporte, en ninguna capa.** La propiedad 9 (nested/related persistence preserva ownership) y su derivada R11 (FK cross-Business se rechaza): Postgres valida que la FK **exista**, no a qué tenant pertenece; no hay FK compuestas con `empresaId`; la extensión no valida FK `[C]`. El cumplimiento recae enteramente en cada call site, con 3 de 4 cumpliéndolo y 1 incumpliéndolo. `INV-B3-REL-001..005` cubren esto, y el patrón correcto ya aplicado en 3 sitios es su evidencia de viabilidad.

3. **R4 cumple hoy por ausencia de superficie, no por defensa.** No existe ningún canal por el que el cliente influya en el tenant (cero en DTOs, cero en `@Param`/`@Query`/`@Headers`, `whitelist:true`) `[C]`. Cuando B3 introduzca Business Switching (R8-ARCH-003 §9), esa superficie se crea desde cero. `INV-B3-CTX-004` y `INV-B3-CTX-005` están escritos para ser válidos **antes y después** de que exista switching, que es la única forma de que el invariant sirva para algo.

**Owner Decisions:** **ninguna requerida por esta derivación.** La ausencia del contrato técnico B3 no es una decisión Owner faltante — R8-ARCH-002 ya decidió el mecanismo (application-level) y las 12 propiedades. Lo que falta es especificación técnica downstream, explícitamente declarada abierta en §6 de esa decisión.

**Dependencia externa detectada que afecta a B3:** el documento `24-B2-CONTROLLED-INVARIANT-RECONCILIATION` resolvió que `INV-CUST-003` de v0.2 ("Customer data Business-scoped") **no es propiedad de B2** y queda delegada a **B3/Customer** como "External ALIAS — reference, do not own" `[D]`. Esta derivación la recoge en `INV-B3-XTENANT-005`.

---

# 2. SCOPE

**En alcance:** derivación de invariants de aislamiento de tenant a nivel de persistencia, a partir de R8-ARCH-002, los contratos existentes, el B3 AS-IS Audit, los hallazgos G-B3-01..13 y los vectores X-01..17.

**Fuera de alcance:**
- Definir invariants de Business Context, Membership, Role o Permission. Son de B1/B2; se **referencian**, no se duplican (§18 del encargo, §16 de este documento).
- Crear el contrato B3. Se está derivando en paralelo.
- Crear el test suite. Solo candidatos (§18).
- Modificar R5, v0.2, B1, los contratos o cualquier documento histórico.
- Commerce, Inventory, Payments, Cash, Messaging, Brand como dominios.
- Mecanismos de implementación. §13 del encargo es una restricción activa en toda la derivación.

**Límites de inspección propios:** no se ejecutó test, build ni API. No se leyeron línea por línea `pedidos`, `fidelizacion`, `clientes` completos. La clasificación de modelos y los vectores X se toman del B3 AS-IS Audit, cuyas afirmaciones estructurales re-verifiqué por muestreo (§23).

---

# 3. AUTHORITY AND PRECEDENCE

Precedencia aplicada:

`OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > CONTRACTS > INVARIANTS > TESTS/EVALS > AUDIT > HISTORICAL`

**Fuente normativa principal:** `03-DECISIONS/28-R8-ARCH-002-OWNER-DECISION-TENANT-ISOLATION-2026-10-03.md`. No reinterpretada.

**Fuentes de autoridad usadas:**

| Documento | Rol en esta derivación |
|---|---|
| R8-ARCH-002 §3 (12 propiedades), §5 (ADAPTED), §6 (10 abiertos), §7 (invariante de seguridad) | Fuente normativa primaria |
| R8-MASTER (30) y su propagation audit (31) | Confirmación de closure y propagación |
| R8-ID-002 (32) | `User → Membership → Empresa/Business`; Option A incremental; §6 no-autorización |
| R8-ID-003 (33) + contrato (06) | `empresaId` transicional; C-COEX-004 obligaciones de aislamiento durante coexistencia; C-COEX-006 sin limpieza destructiva |
| R8-ARCH-003 contrato (08) | §5 CTX-001..006; §9 switching; §12 interacción con aislamiento |
| R8-AUTH-001 contrato (07) | Referencia de autorización; no fuente de aislamiento |
| Block 1 Contracts Baseline (07) | `C-TEN-001` (:111-130), `C-X-001`, `C-X-003` |
| Identity and Tenancy Contracts (01) | `C-TEN-001` §3 (:67-80): mecanismo de aislamiento declarado OPEN |
| B3 AS-IS Audit (23) | Fuente de evidencia `[C]`: reglas R1-R14, G-B3-01..13, X-01..17, clasificación de modelos |
| B2 Controlled Invariant Reconciliation (24) | Delegación de `INV-CUST-003` a B3; convenciones de alias |

**No es fuente canónica:** el contrato B3 en elaboración (no existe en el repo). Si existiera un archivo de trabajo, se trataría como `[DRAFT / NON-CANONICAL]`.

---

# 4. R8-ARCH-002 PROPERTY INVENTORY

Las 12 propiedades aprobadas (§3 de la decisión), más el invariante de seguridad (§7). Trazadas a las 14 reglas R1-R14 que el B3 AS-IS Audit usó `[D]`.

| Prop | Enunciado aprobado | Regla AS-IS | Estado AS-IS verificado |
|---|---|---|---|
| **P1** | Business Context establecido antes de operaciones Business-scoped | R1 | PARCIAL — se asume del claim, no se establece `[C]` |
| **P2** | El Business activo asociado al User por Membership válida | R2 | **NO CUMPLE** — Membership no existe `[C]` |
| **P3** | Membership INACTIVE no puede operar | R3 | **NO CUMPLE** — solo `Usuario.activo`, al login `[C]` |
| **P4** | Los Business ID del cliente no pueden sobrescribir el contexto | R4 | CUMPLE **por ausencia de superficie** `[C]` |
| **P5** | Create asigna ownership desde el contexto | R5 | CUMPLE en los 26 cubiertos; no en los 2 de G-B3-01 ni en los `create` crudos de invitaciones `[C]` |
| **P6** | Read restringido al contexto | R6 | CUMPLE en los 26; no en 2 + 12 derivados `[C]` |
| **P7** | Update/Delete no cruzan Business | R7, R8 | CUMPLE en los 26 `[C]` |
| **P8** | Unique lookups no exponen otro Business | R9 | CUMPLE **con reserva** — validación post-query `[C]` |
| **P9** | Nested/related persistence preserva ownership | R10, R11 | **NO CUMPLE como mecanismo** `[C]` |
| **P10** | Transactions preservan aislamiento | R12 | CUMPLE por construcción; `[ND]` para ejecución |
| **P11** | Contexto ausente/inválido falla cerrado | R13 | CUMPLE a nivel de operación; PARCIAL a nivel de contexto `[C]` |
| **P12** | Cross-Business cubierto por verificación negativa | — | **NO CUMPLE** — cero tests `[C]` |
| **§7** | Una operación en contexto A no debe leer, crear, modificar ni borrar datos de B, independientemente de los valores del cliente | R1-R14 | Parcial — ver §10 |

---

# 5. EXISTING TENANT INVARIANT INVENTORY

Revisados sin modificar. Fuentes: `INVARIANTS/BASELINE/00-R5-…`, `DERIVED/00-INVARIANTS-v0.1.md`, `DERIVED/04-R6-…AUDIT`, `DERIVED/05-BLOCK-1-…BASELINE`.

| ID existente | Documento | Contenido | Disposición en B3 |
|---|---|---|---|
| `INV-TEN-001` | v0.2, B1 | Business es el límite de tenancy y de aislamiento de datos | **REUTILIZABLE pero DEMASIADO GRUESO.** Es el único invariant de aislamiento existente y cubre las 12 propiedades en una sola frase. Se **extiende** en las 9 familias `INV-B3-*`; el original se preserva como ancla y alias |
| `R5 INV-ID-004` | R5 | Business isolation mandatory | **ALIAS** de `INV-TEN-001`; familia paralela, no se renumera |
| `INV-CONTEXT-001` | v0.2, B1 | Un contexto efectivo; Membership ACTIVE; el ID del cliente no sobrescribe; falla cerrado | **DEMASIADO GRUESO y CROSS-BLOCK.** B2 ya lo dividió en `INV-B2-CTX-001..003` + `AUT-004`. B3 **referencia** su parte de contexto y deriva solo la parte de persistencia |
| `INV-MEM-001` | v0.2, B1 | Membership de A no autoriza B | **REFERENCE — B2 owns.** B3 depende conceptualmente; no lo redefine |
| `INV-MEM-002` | v0.2, B1 | Membership INACTIVE no opera | **REFERENCE — B2 owns** (`INV-B2-MEM-002`) |
| `INV-IDENT-001/002` | v0.2, B1 | User global; email único global | **REFERENCE — B1 owns.** Relevante para B3 solo como explicación de por qué los lookups pre-contexto son globales legítimos |
| `INV-CUST-002` (B1) / `INV-CUST-003` (v0.2) | B1 / v0.2 | Customer de A no aparece por contexto de B | **HEREDADO A B3.** El doc 24 lo resolvió: no es propiedad de B2, queda delegado a B3/Customer como "External ALIAS — reference, do not own" `[D]`. Se recoge en `INV-B3-XTENANT-005` |
| `R5 INV-XDOM-001` | R5 | Autorización antes de mutación de dominio | **REFERENCE — B2 owns** (`INV-B2-AUT-007`) |
| `R5 INV-MIG-001/002/003` | R5 | Coexistencia incremental; corte de sesión legacy; sin pérdida semántica silenciosa | **REFERENCE — B2/LEG owns.** B3 deriva solo `INV-B3-CTX-007` (`empresaId` transicional no deja de ser límite de aislamiento durante la coexistencia) |
| `C-X-001` | Block 1 Contracts | Shared Business Context | Fuente de `INV-B3-CTX-006` |
| `C-X-003` | Block 1 Contracts | Atomicity where required | Fuente de `INV-B3-TX-001` |

**Colisiones de ID detectadas que afectan a B3:**

| # | Colisión | Impacto en B3 | Acción |
|---|---|---|---|
| 1 | `INV-CUST-002`/`003` invertidos entre v0.2 y B1, **y además** a nivel de contrato (`C-CUST-002` es "scoped" en `02-COMMERCE-CONTRACTS.md:15` y "controlled association" en `07-BLOCK-1-…:261`) | B3 hereda la rama "Business-scoped". Citar siempre con el documento | `INV-B3-XTENANT-005` cita explícitamente la fuente y no reusa el número |
| 2 | `INV-TEN-001` existe en v0.2 y B1 con el mismo significado | Ninguno — significado idéntico | Alias, sin renumerar |
| 3 | `R5 INV-ID-004` paralelo a `INV-TEN-001` | Ninguno | Alias |
| 4 | `ARCH-003 CTX-006` ("Business Context consistente con el scope de persistencia y operaciones anidadas") es una cláusula local de contrato que el doc 24 mapea a **B3** | **Directo:** es la cláusula de contrato B1 que delega en B3 | Fuente de `INV-B3-CTX-006` y `INV-B3-REL-001` |
| 5 | `TE-ID-004..007` colisionan entre `00-TESTS-EVALS-v0.2.md:50-70` y B1 TE `:66-104` | B3 **no reusa números TE** | Todos los candidatos de §18 van como `NOT YET DEFINED` |

**Invariants obsoletos:** ninguno en el dominio de aislamiento. `R5 INV-AUTH-004` es obsoleto pero pertenece a B2.

**No se modificó ninguno de estos documentos.**

---

# 6. B3 CANDIDATE INVARIANT FAMILIES

Namespace `INV-B3-*`, verificado libre `[C]`. IDs **de trabajo**, estado DRAFT — NON-CANONICAL.

| Familia | Cubre | Propiedades R8-ARCH-002 | Cantidad |
|---|---|---|---|
| `INV-B3-CTX-*` | Business Context como precondición de persistencia | P1, P2, P3, P4 | 7 |
| `INV-B3-CRE-*` | Ownership en creación | P5 | 4 |
| `INV-B3-READ-*` | Aislamiento de lectura | P6, P8 | 6 |
| `INV-B3-MUT-*` | Aislamiento de mutación | P7 | 4 |
| `INV-B3-REL-*` | Datos relacionados, FK y nested writes | P9 | 5 |
| `INV-B3-TX-*` | Transacciones | P10 | 3 |
| `INV-B3-FAIL-*` | Fail-closed y operaciones no soportadas | P11 | 5 |
| `INV-B3-BYPASS-*` | Acceso directo a persistencia | §7 | 4 |
| `INV-B3-XTENANT-*` | Verificación negativa cross-Business | P12 | 3 |
| **Total** | | | **41** |

---

# 7. CANONICAL/DRAFT B3 INVARIANT SET

**Todos los invariants de esta sección están en estado DRAFT — NON-CANONICAL. Ninguno está implementado. Ninguno tiene evidencia `[T]` ni `[E]`.**

Convenciones: *Source* = `OD` R8-ARCH-002 propiedad · `C-*` contrato · `AS-IS` audit B3. *Status*: `DRAFT-STABLE` (derivable a test con lo que hay) · `PENDING-B3-CONTRACT` (requiere el contrato en elaboración) · `REFERENCE` (propiedad de B1/B2, aquí solo como frontera).

## 7.1 `INV-B3-CTX-*` — Business Context como precondición de persistencia

| ID | Statement | Source | OD | Existing INV | B3 Gap | X Vector | Evidence | Test Candidate | Status |
|---|---|---|---|---|---|---|---|---|---|
| **INV-B3-CTX-001** | **Toda operación de persistencia Business-scoped se ejecuta bajo un Business Context efectivo y determinado antes de la operación.** | OD P1; C-TEN-001; ARCH-003 CTX-001 | §3.1 | INV-CONTEXT-001 (split) | — | — | `[C]` AS-IS: el contexto se asume del claim, no se establece (R1 PARCIAL) | contexto ausente → denegado | **DRAFT-STABLE** |
| **INV-B3-CTX-002** | **El Business Context efectivo es determinado por el servidor.** Ningún valor transportado por el cliente lo determina. | OD P4; ARCH-003 CTX-003 | §3.4 | INV-CONTEXT-001 | G-B3-13 | X-01..17 (transversal) | `[C]` hoy el claim firmado es la única fuente; el cliente lo porta pero no lo elige | ningún canal de cliente altera el tenant efectivo | **DRAFT-STABLE** |
| **INV-B3-CTX-003** | **El Business Context es estable durante toda la operación.** Una operación no puede cambiar de Business a mitad de su ejecución. | OD P1, P10; C-X-001 | §3.1, §3.10 | C-X-001 | — | X-13 | `[C]` cumple por construcción: `forEmpresa` se invoca una vez, fuera del closure | una operación no observa dos tenants | **DRAFT-STABLE** |
| **INV-B3-CTX-004** | **Un identificador de Business provisto por el cliente nunca altera el Business Context efectivo, ni cuando exista un mecanismo de selección de Business.** | OD P4; ARCH-003 §9 | §3.4 | INV-CONTEXT-001 | **G-B3-13** | X-14 (prospectivo) | `[C]` hoy CUMPLE **por ausencia de superficie**: cero `empresaId` en DTOs, `@Param`, `@Query`, `@Headers`; `whitelist:true` | Business ID del cliente ignorado | **DRAFT-STABLE** |
| **INV-B3-CTX-005** | **La selección de un Business distinto re-deriva el contexto completo desde la autoridad del servidor;** no hay arrastre de scope del Business anterior. | OD P4; ARCH-003 §9 | §3.4 | — | G-B3-13 | — | `[C]` no existe switching; `[ND]` el comportamiento futuro | tras cambiar de Business, cero acceso al anterior | **PENDING-B3-CONTRACT** |
| **INV-B3-CTX-006** | **El Business Context usado por la autorización y el usado por la persistencia son el mismo**, incluidas las operaciones relacionadas y anidadas. | ARCH-003 CTX-006, §12; C-X-001 | §3.1 | C-X-001 | — | — | `[C]` hoy ambos derivan del mismo claim | no hay divergencia entre el contexto autorizado y el persistido | **DRAFT-STABLE** |
| **INV-B3-CTX-007** | **Durante la coexistencia legacy, el identificador de tenant transicional sigue siendo un límite de aislamiento efectivo**, aunque deje de ser autoridad de autorización. | C-COEX-004; R8-ID-003 | §3.1 | R5 INV-MIG-001 | — | — | `[D]` C-COEX-004 lo exige explícitamente | el aislamiento no se degrada durante la transición | **DRAFT-STABLE** |

**Frontera con B1/B2 (REFERENCE — no son invariants B3):**

| Propiedad | Owner | ID en su bloque |
|---|---|---|
| El contexto corresponde a una Membership válida (OD P2) | **B1/B2** | `INV-B2-CTX-003`, `INV-MEM-001` |
| Membership INACTIVE no puede operar (OD P3) | **B2** | `INV-B2-MEM-002` |
| Un contexto efectivo por request | **B1/B2** | `INV-B2-CTX-003` |
| Autorización antes de mutación de dominio | **B2** | `INV-B2-AUT-007` |

Estas cuatro se listan como **REFERENCE** y cuentan para la cobertura de P2/P3 sin duplicar la definición (§18 del encargo).

## 7.2 `INV-B3-CRE-*` — Ownership en creación

| ID | Statement | Source | OD | Existing INV | B3 Gap | X Vector | Evidence | Test Candidate | Status |
|---|---|---|---|---|---|---|---|---|---|
| **INV-B3-CRE-001** | **Toda entidad Business-scoped creada queda atribuida al Business Context efectivo**, derivado del contexto y no de la entrada. | OD P5 | §3.5 | INV-TEN-001 | — | — | `[C]` CUMPLE en los 26 cubiertos: `data.empresaId = empresaId`, pisa el body (`:118-124`) | la entidad creada pertenece al Business del contexto | **DRAFT-STABLE** |
| **INV-B3-CRE-002** | **Un valor de ownership presente en la entrada no puede determinar ni alterar la atribución resultante.** | OD P4, P5 | §3.4, §3.5 | — | — | — | `[C]` doble defensa: `whitelist:true` lo descarta y la extensión lo sobrescribe | `empresaId` en el body es ignorado | **DRAFT-STABLE** |
| **INV-B3-CRE-003** | **La creación múltiple atribuye cada entidad al mismo Business Context efectivo**, sin excepción por fila. | OD P5 | §3.5 | — | — | — | `[C]` `createMany` mapea todas las filas forzando `empresaId` (`:125-129`) | ninguna fila de un `createMany` escapa al contexto | **DRAFT-STABLE** |
| **INV-B3-CRE-004** | **La atribución de ownership en creación no depende de la vía de acceso a la persistencia.** Toda creación de entidad Business-scoped queda atribuida al contexto, cualquiera sea el camino usado. | OD P5; §7 | §3.5 | — | **G-B3-01**, G-B3-07 | X-15 | `[C]` **NO CUMPLE universalmente**: los `create` de `Usuario`/`Cliente` en `invitaciones.service.ts:118-131, 227-240` ocurren con cliente crudo, fuera de la garantía; `PagoProveedor`/`DevolucionProveedor` pasan `empresaId` a mano con cast que suprime el error de tipos | una creación por vía alternativa no produce ownership incorrecto | **PENDING-B3-CONTRACT** |

## 7.3 `INV-B3-READ-*` — Aislamiento de lectura

| ID | Statement | Source | OD | Existing INV | B3 Gap | X Vector | Evidence | Test Candidate | Status |
|---|---|---|---|---|---|---|---|---|---|
| **INV-B3-READ-001** | **Una lectura Business-scoped solo puede devolver entidades pertenecientes al Business Context efectivo.** | OD P6 | §3.6 | INV-TEN-001 | — | X-01 | `[C]` CUMPLE en los 26: `where.empresaId` inyectado en las 9 ops | A no lee recursos de B | **DRAFT-STABLE** |
| **INV-B3-READ-002** | **Una lectura por identificador único no puede exponer una entidad de otro Business**, cualquiera sea el índice que la resuelva. | OD P8 | §3.8 | INV-TEN-001 | **G-B3-06** | X-02, X-03 | `[C]` CUMPLE **con reserva**: validación post-query (`:136-159`) → `null`/P2025. Depende de que el resultado contenga el discriminador (`'empresaId' in resultado`, `:146`); ningún `findUnique` usa hoy `select` de nivel superior que lo omita | unique lookup de B desde A → no encontrado | **DRAFT-STABLE** |
| **INV-B3-READ-003** | **El resultado de una lectura aislada no revela la existencia de entidades de otro Business.** La respuesta es indistinguible de la inexistencia. | OD P8; §7 | §3.8 | — | G-B3-06 | X-02 | `[C]` CUMPLE: devuelve `null`, indistinguible de "no existe" | no hay filtración de existencia por el código de respuesta | **DRAFT-STABLE** |
| **INV-B3-READ-004** | **Una restricción de unicidad de alcance global no puede convertirse en un canal de lectura cross-Business.** | OD P8 | §3.8 | — | **G-B3-11** | X-03, X-04 | `[C]` `Venta.idempotencyKey` es `@unique` sin discriminador y se consulta por `findUnique`; **sin fuga** porque X-02 lo corta. Efecto residual distinto: una clave de A impide reusarla en B — colisión de negocio, no fuga | una clave única de B no es observable desde A | **DRAFT-STABLE** |
| **INV-B3-READ-005** | **Una lectura de identidad previa al establecimiento del contexto queda fuera del alcance de este invariant**, y no puede devolver datos Business-scoped más allá de los necesarios para establecer el contexto. | OD P6; §7 | §3.6 | INV-IDENT-001/002 | G-B3-07 | **X-04** | `[C]` legítimo por diseño: `Usuario.email`, `Cliente.googleId`, `Invitacion.token` son únicos globales y el tenant es el **resultado** del lookup, no una restricción previa | un lookup pre-contexto no devuelve datos de negocio de otro Business | **PENDING-B3-CONTRACT** |
| **INV-B3-READ-006** | **Las entidades relacionadas incluidas en una lectura pertenecen al mismo Business que la entidad raíz.** | OD P6, P9 | §3.6, §3.9 | — | G-B3-04 | **X-14** | `[C]` la extensión no inspecciona `include`. **Inocuo dado el schema**: toda relación cuelga de un padre ya validado y Postgres garantiza la integridad de la FK — se vuelve riesgo real **solo si una FK cruzada se persiste primero**, es decir si X-08 ocurre | un `include` no trae entidades de otro Business | **PENDING-B3-CONTRACT** |

## 7.4 `INV-B3-MUT-*` — Aislamiento de mutación

| ID | Statement | Source | OD | Existing INV | B3 Gap | X Vector | Evidence | Test Candidate | Status |
|---|---|---|---|---|---|---|---|---|---|
| **INV-B3-MUT-001** | **Una modificación Business-scoped solo puede afectar entidades del Business Context efectivo.** | OD P7 | §3.7 | INV-TEN-001 | — | X-05 | `[C]` CUMPLE en los 26 | A no modifica recursos de B | **DRAFT-STABLE** |
| **INV-B3-MUT-002** | **Una eliminación Business-scoped solo puede afectar entidades del Business Context efectivo.** | OD P7 | §3.7 | INV-TEN-001 | — | X-07 | `[C]` CUMPLE; además no se encontró ningún `.delete()`/`.deleteMany()` en los services auditados | A no elimina recursos de B | **DRAFT-STABLE** |
| **INV-B3-MUT-003** | **Una mutación masiva no puede afectar ninguna entidad fuera del Business Context efectivo.** | OD P7 | §3.7 | — | — | X-05 | `[C]` CUMPLE: `updateMany`/`deleteMany` reciben el `where` inyectado | ninguna fila fuera del contexto es afectada | **DRAFT-STABLE** |
| **INV-B3-MUT-004** | **La verificación de pertenencia y la mutación no pueden quedar separadas de forma que el resultado dependa del orden de las operaciones.** | OD P7; §7 | §3.7 | — | **G-B3-10** | **X-06** | `[C]` patrón `findFirst`(scoped) → `update`(crudo, por `id`) en 2 queries: `legajo.controller.ts:108+123`, `legajo.cliente.controller.ts:123+135`. Correcto hoy porque el schema no permite que un registro cambie de Empresa | la pertenencia se verifica de forma indivisible respecto de la mutación | **PENDING-B3-CONTRACT** |

## 7.5 `INV-B3-REL-*` — Datos relacionados, FK y nested writes

Familia crítica (§14 del encargo). Derivada **solo** para operaciones que existen realmente en el código `[C]`.

| ID | Statement | Source | OD | Existing INV | B3 Gap | X Vector | Evidence | Test Candidate | Status |
|---|---|---|---|---|---|---|---|---|---|
| **INV-B3-REL-001** | **Una entidad creada como parte de una operación anidada pertenece al mismo Business que su entidad raíz.** | OD P9; ARCH-003 CTX-006 | §3.9 | — | **G-B3-04** | **X-09**, X-11 | `[C]` **NO CUMPLE como mecanismo**: la extensión solo mira `args.data` de nivel superior (`:113-116`); ningún hijo nested tiene el discriminador (`VentaItem`, `PedidoItem`, `DevolucionProveedorItem`) | un nested create no produce entidades de otro Business | **PENDING-B3-CONTRACT** |
| **INV-B3-REL-002** | **Una referencia a otra entidad recibida desde la entrada solo puede resolverse a una entidad del Business Context efectivo.** | OD P9 (derivada R11) | §3.9 | — | **G-B3-05** | **X-08**, X-11 | `[C]` **NO CUMPLE**: `crearDevolucion` (`compras.service.ts:343-398`) persiste `productoId` y `loteId` del DTO sin validar pertenencia, en `DevolucionProveedorItem` (nested, no cubierto) y en `MovimientoStock.create` (cubierto, pero el scope fuerza el propio `empresaId` — **no valida las FK**). **Único punto con dato cruzado efectivamente persistible.** Su docstring (`:323-331`) afirma una validación que el código no hace | una FK de B desde A es rechazada | **DRAFT-STABLE** |
| **INV-B3-REL-003** | **La integridad referencial a nivel de almacenamiento no constituye por sí misma una verificación de pertenencia al Business.** | OD P9; §7 | §3.9 | — | G-B3-05 | X-08 | `[C]` verificado: la FK de Postgres valida que la entidad **exista**, no a qué tenant pertenece; no hay claves compuestas que incluyan el discriminador | una FK válida pero de otro tenant no se acepta | **DRAFT-STABLE** |
| **INV-B3-REL-004** | **Una entidad sin discriminador propio de Business obtiene su pertenencia de una cadena de ownership inequívoca, y su aislamiento no puede depender de que cada acceso la recorra por convención.** | OD P6, P9 | §3.6, §3.9 | — | **G-B3-02** | X-12, X-16 | `[C]` 12 modelos derivados sin cobertura; `UsuarioPermiso` se consulta con el cliente scoped **sin efecto** porque no tiene el discriminador (`autorizaciones.service.ts:69`), contenido por un chequeo explícito en `:62` | un modelo derivado no es accesible fuera de su cadena de ownership | **PENDING-B3-CONTRACT** |
| **INV-B3-REL-005** | **Una entidad cuya pertenencia a un Business no sea determinable de forma inequívoca no puede participar en operaciones Business-scoped hasta que su regla de pertenencia esté definida.** | OD P9; §7 | §3.9 | — | **G-B3-02** | — | `[C]` `Legajo` y `DocumentoLegajo` son los únicos **AMBIGUOUS**: el tenant depende de cuál de dos FK opcionales (`Usuario` \| `Cliente`, ambas `@unique` y opcionales, `schema.prisma:520-523`) esté poblada | — (no derivable a test hasta que la regla exista) | **PENDING-B3-CONTRACT** |

**Nota de método (§14 del encargo):** se derivaron invariants separados **solo** para nested create (`INV-B3-REL-001`) y para FK escalar desde la entrada (`INV-B3-REL-002`), porque son las operaciones que existen en el código. **No se derivó** invariant separado para nested `connect`, nested `update` ni nested `delete`: el audit AS-IS no encontró nested updates en el código auditado (X-10, latente) y no encontró nested connect ni nested delete `[C]`. `INV-B3-REL-001` los cubre por enunciado general sin inventar operaciones.

## 7.6 `INV-B3-TX-*` — Transacciones

| ID | Statement | Source | OD | Existing INV | B3 Gap | X Vector | Evidence | Test Candidate | Status |
|---|---|---|---|---|---|---|---|---|---|
| **INV-B3-TX-001** | **El aislamiento de Business se preserva dentro de los límites de una transacción.** Toda operación de una transacción Business-scoped queda sujeta al mismo aislamiento que fuera de ella. | OD P10; C-X-003 | §3.10 | C-X-003 | — | **X-13** | **`[ND]` para ejecución.** `[C]` por tipos: `ITXClientDenyList` excluye solo `$connect`/`$disconnect`/`$on`/`$transaction`/`$use`/`$extends`, **no** los hooks de query; 3 services derivan su tipo de transacción del cliente extendido y compilan. `[D]` convergente: `tienda.service.ts:230-234` documenta haber evitado `upsert` **dentro** de `tx` porque el fail-closed se dispara. Prisma 5.22.0 | **el aislamiento sigue vigente dentro de una transacción** — test de ejecución obligatorio | **DRAFT-STABLE** |
| **INV-B3-TX-002** | **Una transacción Business-scoped opera bajo exactamente un Business Context.** No puede abarcar dos Business. | OD P10; C-X-001 | §3.10 | C-X-001 | — | X-13 | `[C]` CUMPLE por construcción: las 11 transacciones se abren sobre un cliente ya acotado a un único tenant; **no se encontró ninguna que mezcle dos** | una transacción cross-tenant es imposible o falla | **DRAFT-STABLE** |
| **INV-B3-TX-003** | **Un fallo de aislamiento dentro de una transacción no deja efectos parciales.** | OD P10; C-X-003 | §3.10 | C-X-003 | — | — | `[C]` por atomicidad de la transacción; `[ND]` sin ejecución | un rechazo por aislamiento no persiste efectos | **DRAFT-STABLE** |

**Evidencia de `INV-B3-TX-001` marcada `[ND]` conforme a §15 del encargo.** La evidencia de tipos y documental es convergente y fuerte, pero **no es prueba de ejecución**. Este invariant debe generar un test de ejecución, y es el de mayor prioridad de toda la derivación (§18).

## 7.7 `INV-B3-FAIL-*` — Fail-closed y operaciones no soportadas

| ID | Statement | Source | OD | Existing INV | B3 Gap | X Vector | Evidence | Test Candidate | Status |
|---|---|---|---|---|---|---|---|---|---|
| **INV-B3-FAIL-001** | **La ausencia de Business Context en una operación Business-scoped produce denegación, nunca acceso sin restricción.** | OD P11 | §3.11 | INV-CONTEXT-001 | — | — | `[C]` no se da hoy en rutas autenticadas: el claim siempre lo trae | contexto ausente → denegado, nunca acceso total | **DRAFT-STABLE** |
| **INV-B3-FAIL-002** | **Un Business Context inválido o no autorizado produce denegación**, y no un acceso degradado ni un resultado vacío indistinguible del éxito. | OD P11 | §3.11 | INV-CONTEXT-001 | — | — | `[C]` **PARCIAL**: un identificador firmado inexistente **no se valida**. Efecto esperado — lecturas a cero filas, violación de FK en create — es `[ND]`, por razonamiento, no ejecutado | contexto inválido → denegado explícito | **PENDING-B3-CONTRACT** |
| **INV-B3-FAIL-003** | **Una operación de persistencia que el mecanismo de aislamiento no soporta explícitamente no se ejecuta sobre entidades Business-scoped.** | OD P11 | §3.11 | — | — | — | `[C]` **CUMPLE y es la propiedad más fuerte del AS-IS**: toda operación no enumerada lanza error (`:161-166`). Confirmado por su efecto en el código: cero usos de `.upsert(` y `.groupBy(` en `src`, y un comentario que cita el fail-closed como la razón | `upsert`/`groupBy` sobre modelo cubierto → error, no ejecución silenciosa | **DRAFT-STABLE** |
| **INV-B3-FAIL-004** | **La denegación por aislamiento es explícita y observable**, no un silencio que un llamador pueda confundir con ausencia de datos. | OD P11; §7 | §3.11 | — | — | — | `[C]` parcialmente en tensión con `INV-B3-READ-003` (ver §16, tensión T-1) | una denegación por aislamiento es distinguible de un conjunto vacío legítimo | **PENDING-B3-CONTRACT** |
| **INV-B3-FAIL-005** | **Una vía de persistencia que elude el mecanismo de aislamiento no puede operar sobre entidades Business-scoped sin aplicar la restricción de Business de forma explícita y verificable.** | OD P11; §7 | §3.11 | — | G-B3-08 | **X-17** | `[C]` el único acceso crudo a almacenamiento (`inventario.service.ts:259-271`) **sí** incluye el discriminador en su condición y está parametrizado. **Correcto, y es evidencia de una vía manual bien aislada — no una garantía del mecanismo** | una vía manual sin restricción de Business es rechazada o inexistente | **DRAFT-STABLE** |

## 7.8 `INV-B3-BYPASS-*` — Acceso directo a persistencia

| ID | Statement | Source | OD | Existing INV | B3 Gap | X Vector | Evidence | Test Candidate | Status |
|---|---|---|---|---|---|---|---|---|---|
| **INV-B3-BYPASS-001** | **Ningún acceso a persistencia disponible para la lógica de dominio puede operar sobre entidades Business-scoped sin sujeción al Business Context efectivo.** | OD §7 | §7 | INV-TEN-001 | **G-B3-07** | X-15, X-16 | `[C]` **NO CUMPLE como garantía; CUMPLE como estado de hecho**: el acceso sin scope es inyectable desde cualquier módulo; 46 usos crudos reales; **ninguno produce hoy un cruce** | un acceso de dominio sin contexto no alcanza datos de otro Business | **PENDING-B3-CONTRACT** |
| **INV-B3-BYPASS-002** | **El aislamiento de una operación Business-scoped no puede depender del orden en que se invoquen otras operaciones.** | OD §7 | §7 | — | G-B3-01, G-B3-07, G-B3-10 | **X-06, X-15, X-16, X-17** | `[C]` **4 vectores contenidos exactamente así**: `getCompra` previo (X-15), `findFirst` previo (X-06), chequeo explícito (X-16), discriminador manual (X-17). Correctos hoy; **cada uno se rompe con un cambio local que ninguna herramienta señalaría** | reordenar o quitar una llamada previa no abre un cruce | **DRAFT-STABLE** |
| **INV-B3-BYPASS-003** | **El acceso a persistencia previo al establecimiento del contexto es legítimo y queda explícitamente fuera del alcance de INV-B3-BYPASS-001**, siempre que su resultado no sea una operación Business-scoped. | OD §7 | §7 | INV-IDENT-001 | G-B3-07 | **X-04** | `[C]` 12 llamadas en `auth/*` establecen el contexto en lugar de consumirlo; usar el cliente acotado ahí es imposible por definición (aún no hay tenant) | un lookup de autenticación no se clasifica como bypass | **DRAFT-STABLE** |
| **INV-B3-BYPASS-004** | **La ejecución fuera del ciclo de una petición no puede operar sobre entidades Business-scoped sin un Business Context explícito.** | OD §7, P1 | §7, §3.1 | — | — | — | `[C]` **no existe hoy esa superficie**: cero `@Cron`, `ScheduleModule`, `@Interval`, `setInterval`, `Bull`, `Queue`, `EventEmitter`, `@OnEvent`. Los scripts offline (seed, migración) están fuera del plano de petición y **deben** poder operar sobre varios Business | — (preventivo; no derivable a test hoy) | **DRAFT-STABLE** |

## 7.9 `INV-B3-XTENANT-*` — Verificación negativa cross-Business

| ID | Statement | Source | OD | Existing INV | B3 Gap | X Vector | Evidence | Test Candidate | Status |
|---|---|---|---|---|---|---|---|---|---|
| **INV-B3-XTENANT-001** | **Para cada clase de operación Business-scoped debe existir verificación negativa que demuestre que el acceso cross-Business es denegado.** La ausencia de verificación negativa es incumplimiento, no cumplimiento por defecto. | **OD P12** | §3.12 | — | **G-B3-09** | X-01..17 | `[C]` **NO CUMPLE**: cero tests de aislamiento. Único spec: `health.controller.spec.ts`. **La fixture existe**: el seed crea una segunda Empresa con catálogo propio (10 referencias) y ningún test la consume | existe y pasa verificación negativa por clase de operación | **DRAFT-STABLE** |
| **INV-B3-XTENANT-002** | **La cobertura del mecanismo de aislamiento es verificable, no declarativa.** Todo modelo Business-scoped con ownership directo queda protegido por el mecanismo, y esa correspondencia es comprobable. | OD P5, P6, P7; §7 | §3.5-3.7 | — | **G-B3-01**, G-B3-12 | X-15 | `[C]` 28 modelos con discriminador directo, 26 en la lista del mecanismo; **2 fuera**. El inventario documental del propio mecanismo dice "21" y omite 3 derivados — **el recuento manual no se sostiene** | todo modelo con ownership directo está cubierto (comprobación estructural) | **DRAFT-STABLE** |
| **INV-B3-XTENANT-003** | **Los datos de un Business no son observables ni referenciables desde el contexto de otro Business**, por ninguna vía: lectura, mutación, eliminación o relación. | **OD §7** | §7 | INV-TEN-001 | todos | X-01..17 | `[C]` **PARCIAL**: cumple para lectura, mutación y eliminación en los modelos cubiertos; **no cumple para relación** (X-08) | las 4 vías denegadas desde A hacia B | **DRAFT-STABLE** |

**Invariant heredado de B2 (§5, colisión 1):**

| ID | Statement | Source | Nota |
|---|---|---|---|
| **INV-B3-XTENANT-005** | **Los datos de Customer de un Business no son observables desde el contexto de otro Business.** | v0.2 `INV-CUST-003` / B1 `INV-CUST-002` | **HEREDADO.** El doc 24 determinó que no es propiedad de B2 y lo delegó a B3/Customer como "External ALIAS — reference, do not own" `[D]`. Caso particular de `INV-B3-XTENANT-003`; se conserva con ID propio porque la cadena de alias de CUST está en reconciliación y renumerarla aquí reintroduciría la colisión. **Status: PENDING-B3-CONTRACT** |

*No se asigna `INV-B3-XTENANT-004` para no sugerir una numeración contigua que la reconciliación de CUST podría invalidar.*

---

# 8. PROPERTY → INVARIANT COVERAGE MATRIX

Las 12 propiedades de R8-ARCH-002, como exige §11 del encargo.

| Propiedad | B3 Invariant | Contract | AS-IS Evidence | Test Candidate | Status |
|---|---|---|---|---|---|
| **P1** — Context antes de la operación | CTX-001, CTX-003, CTX-006, BYPASS-004, FAIL-001 | C-TEN-001 (OPEN), ARCH-003 CTX-001 | PARCIAL: se asume del claim `[C]` | contexto ausente → denegado | **DRAFT-STABLE** |
| **P2** — Context ↔ Membership válida | **REFERENCE → B1/B2** (`INV-B2-CTX-003`, `INV-MEM-001`) | ARCH-003 CTX-002 | NO CUMPLE: Membership no existe `[C]` | (owner: B2) | **REFERENCE** |
| **P3** — Membership INACTIVE no opera | **REFERENCE → B2** (`INV-B2-MEM-002`) | ARCH-003 CTX-002 | NO CUMPLE: solo `activo`, al login `[C]` | (owner: B2) | **REFERENCE** |
| **P4** — Client Business ID no sobrescribe | CTX-002, CTX-004, CTX-005, CRE-002 | ARCH-003 CTX-003 | CUMPLE por ausencia de superficie `[C]` | Business ID del cliente ignorado | **DRAFT-STABLE** (CTX-005 pending) |
| **P5** — Create asigna desde Context | CRE-001, CRE-002, CRE-003, CRE-004 | C-TEN-001 (OPEN) | CUMPLE en 26; no en 2 + invitaciones `[C]` | ownership desde el contexto | **DRAFT-STABLE** (CRE-004 pending) |
| **P6** — Read restringido al Context | READ-001, READ-005, READ-006, REL-004 | C-TEN-001 (OPEN) | CUMPLE en 26; no en 2 + 12 derivados `[C]` | A no lee de B | **DRAFT-STABLE** (READ-005/006 pending) |
| **P7** — Update/Delete no cruzan | MUT-001, MUT-002, MUT-003, MUT-004 | C-TEN-001 (OPEN) | CUMPLE en 26 `[C]` | A no modifica ni borra de B | **DRAFT-STABLE** (MUT-004 pending) |
| **P8** — Unique lookups no exponen | READ-002, READ-003, READ-004 | C-TEN-001 (OPEN) | CUMPLE con reserva `[C]` | unique lookup de B desde A → no encontrado | **DRAFT-STABLE** |
| **P9** — Nested/related preserva ownership | REL-001, REL-002, REL-003, REL-004, REL-005 | **MISSING** | **NO CUMPLE como mecanismo** `[C]` | nested y FK no cruzan | **PENDING-B3-CONTRACT** (REL-002/003 stable) |
| **P10** — Transactions preservan aislamiento | TX-001, TX-002, TX-003 | C-X-003 | CUMPLE por construcción; `[ND]` ejecución | aislamiento vigente dentro de transacción | **DRAFT-STABLE** |
| **P11** — Missing/invalid Context falla cerrado | FAIL-001, FAIL-002, FAIL-003, FAIL-004, FAIL-005 | ARCH-003 CTX-004 | CUMPLE a nivel de operación; PARCIAL a nivel de contexto `[C]` | fail-closed demostrado | **DRAFT-STABLE** (FAIL-002/004 pending) |
| **P12** — Cross-Business negative verification | XTENANT-001, XTENANT-002, XTENANT-003 | **MISSING** | **NO CUMPLE**: cero tests `[C]` | verificación negativa existe y pasa | **DRAFT-STABLE** |
| **§7** — Invariante de seguridad | XTENANT-003 + BYPASS-001..004 | C-TEN-001, §7 | PARCIAL: falla en relación (X-08) `[C]` | las 4 vías denegadas | **DRAFT-STABLE** |

**Las 12 propiedades tienen cobertura.** Ninguna quedó sin invariant derivable. P2 y P3 se cubren por referencia a B1/B2 conforme a §18 del encargo: **no se redefinen aquí**.

---

# 9. GAP → INVARIANT MATRIX

| Gap | Invariant | Coverage | Evidence | Future Test |
|---|---|---|---|---|
| **G-B3-01** — 2 modelos con discriminador fuera de la cobertura | XTENANT-002, CRE-004, BYPASS-002 | **Completa.** XTENANT-002 lo convierte en propiedad estructural comprobable sin nombrar modelos ni listas | `[C]` 28 con discriminador, 26 cubiertos; mitigado hoy por llamada previa | cobertura estructural: todo modelo con ownership directo protegido |
| **G-B3-02** — ownership derivado sin mecanismo; 2 ambiguos | REL-004, REL-005 | **Parcial por diseño.** REL-004 enuncia la propiedad; REL-005 aísla el caso ambiguo. **Ambos PENDING-B3-CONTRACT**: la clasificación es trabajo de contrato | `[C]` 12 derivados sin cobertura; `Legajo`/`DocumentoLegajo` ambiguos | modelo derivado no accesible fuera de su cadena |
| **G-B3-03** — autoridad del contexto es el claim; sin Membership | **REFERENCE → B1/B2** + CTX-001, CTX-002 | **Frontera.** B3 exige que el contexto sea autoritativo y del servidor; **no define Membership** | `[C]` el claim no se revalida | (owner: B1/B2) |
| **G-B3-04** — nested writes / connect sin inspección | REL-001, READ-006 | **Completa** como propiedad; PENDING el mecanismo | `[C]` solo `args.data` de nivel superior | nested create no cruza |
| **G-B3-05** — FK del cliente persistida sin validar | **REL-002**, REL-003 | **Completa y estable.** El patrón correcto ya existe en 3 de 4 sitios | `[C]` `crearDevolucion`; docstring afirma validación inexistente | FK de B desde A rechazada |
| **G-B3-06** — `findUnique` por validación post-query | READ-002, READ-003 | **Completa** como propiedad ("cualquiera sea el índice que la resuelva") | `[C]` depende de que el resultado traiga el discriminador; sin explotación actual | unique lookup cross-tenant → no encontrado |
| **G-B3-07** — bypass alcanzable; 46 usos crudos | BYPASS-001, BYPASS-002, BYPASS-003, CRE-004, READ-005 | **Completa**, con la distinción legítimo/bypass explícita en BYPASS-003 | `[C]` inyectable desde cualquier módulo; ninguno cruza hoy | acceso de dominio sin contexto no alcanza otro Business |
| **G-B3-08** — acceso crudo a almacenamiento fuera del mecanismo | FAIL-005 | **Completa.** Preserva el caso correcto como evidencia **sin generalizarlo como garantía** | `[C]` el único uso incluye el discriminador, parametrizado | vía manual sin restricción rechazada |
| **G-B3-09** — cero tests; fixture sin usar | **XTENANT-001** | **Completa.** La ausencia de verificación es incumplimiento, no cumplimiento por defecto | `[C]` único spec es health; segunda Empresa en el seed sin consumo | la verificación negativa existe por clase de operación |
| **G-B3-10** — verificación y mutación no atómicas | MUT-004 | **Completa** como propiedad; PENDING el mecanismo | `[C]` `findFirst` + `update` en 2 queries | pertenencia verificada indivisiblemente |
| **G-B3-11** — únicos globales | READ-004 | **Completa.** Distingue fuga (no hay) de colisión de negocio (sí hay) | `[C]` sin fuga; una clave de A bloquea su reuso en B | clave única de B no observable desde A |
| **G-B3-12** — inventario documental del mecanismo desactualizado | XTENANT-002 | **Completa** por la vía correcta: en vez de exigir corregir un comentario, exige que la correspondencia sea **comprobable** | `[C]` dice 21, hay 26; omite 3 derivados | comprobación estructural automática |
| **G-B3-13** — R4 cumple por ausencia de superficie | CTX-004, **CTX-005** | **Completa y prospectiva.** CTX-004 vale antes y después del switching; CTX-005 cubre el arrastre | `[C]` cero superficie hoy; `[ND]` el futuro | tras cambiar de Business, cero acceso al anterior |
| **R4** (regla) | CTX-002, CTX-004, CTX-005, CRE-002 | **Completa** | `[C]` CUMPLE hoy, trivialmente | Business ID del cliente ignorado |
| **R14** (regla) | BYPASS-001..004, FAIL-005 | **Completa**, con la distinción pre-contexto / Business-scoped | `[C]` no cumple como garantía; cumple de hecho | bypass de dominio denegado |

---

# 10. CROSS-TENANT VECTOR COVERAGE

Los 17 vectores del audit AS-IS, cada uno con su invariant.

| X | Vector | Severidad AS-IS | Invariant que lo gobierna | Clase de contención actual |
|---|---|---|---|---|
| **X-01** | lectura A → recurso B | BAJA | READ-001 | **mecanismo** |
| **X-02** | unique lookup A → B | BAJA | READ-002, READ-003 | **mecanismo** (con reserva) |
| **X-03** | único global `idempotencyKey` | BAJA | READ-004 | mecanismo (vía X-02, no por el índice) |
| **X-04** | únicos globales de identidad | BAJA | READ-005, BYPASS-003 | **legítimo pre-contexto** |
| **X-05** | update A → B | BAJA | MUT-001, MUT-003 | **mecanismo** |
| **X-06** | update con acceso crudo | MEDIA | **MUT-004**, BYPASS-002 | *orden de llamadas* |
| **X-07** | delete A → B | BAJA | MUT-002 | **mecanismo** |
| **X-08** | create con FK de B (`crearDevolucion`) | **ALTA** | **REL-002**, REL-003 | **ABIERTO — único dato cruzado persistible** |
| **X-09** | nested create de B | **ALTA** | **REL-001** | **ABIERTO (mecanismo)** |
| **X-10** | nested update de B | MEDIA | REL-001 | ABIERTO (latente; no existe en el código) |
| **X-11** | padre A / hijo B | ALTA (ese caso) | REL-001, REL-002 | **ABIERTO** |
| **X-12** | hijo A / padre B | BAJA | REL-004 | *disciplina* |
| **X-13** | transacción A/B | BAJA | TX-001, TX-002, CTX-003 | **construcción** |
| **X-14** | `include` no filtrado | MEDIA (condicionado a X-08) | **READ-006** | ABIERTO (dependiente de X-08) |
| **X-15** | lectura en modelo con columna no cubierta | MEDIA | XTENANT-002, BYPASS-002 | *orden de llamadas* |
| **X-16** | derivado consultado sin efecto | MEDIA | REL-004, BYPASS-002 | *chequeo explícito* |
| **X-17** | acceso crudo a almacenamiento | BAJA | **FAIL-005**, BYPASS-002 | *manual, correcto* |

**El patrón que organiza la derivación.** Las tres clases de contención no son equivalentes:

- **por mecanismo** (X-01, X-02, X-05, X-07): sobreviven a un refactor. Sus invariants son `DRAFT-STABLE` y directamente testeables.
- **por orden de llamadas, disciplina o chequeo explícito** (X-06, X-12, X-15, X-16, X-17): correctos hoy; **cada uno se rompe con un cambio local que ninguna herramienta señalaría.** `INV-B3-BYPASS-002` existe exactamente para convertir esta clase en la primera, y es una propiedad observable, no una prescripción de mecanismo.
- **abiertos** (X-08, X-09, X-11, y X-14 condicionado): gobernados por la familia `REL`. El único con dato cruzado efectivamente persistible es **X-08**.

---

# 11. MODEL COVERAGE CLASSIFICATION

Inventario real: 42 modelos, 28 con discriminador directo, 26 cubiertos `[C]`. Clasificación tomada del audit AS-IS §6; re-verifiqué los conteos y el diff de conjuntos por muestreo.

| Clase | Cantidad | Modelos | Invariant aplicable |
|---|---|---|---|
| **DIRECT** (cubiertos) | 26 | Usuario, Invitacion, Familia, Subfamilia, Tipo, Subtipo, ProductoProveedor, Producto, Presentacion, Lote, Cliente, ReglaFidelizacion, CuentaCorriente, Deuda, Venta, Pedido, Pago, Caja, Proveedor, Compra, RecepcionCompra, MovimientoStock, Entrega, Notificacion, AuditLog, Autorizacion | CRE-001/003, READ-001, MUT-001/002/003, FAIL-003 |
| **DIRECT** (sin cubrir) | 2 | **PagoProveedor**, **DevolucionProveedor** | **XTENANT-002**, CRE-004 |
| **DERIVED** | 10 | UsuarioPermiso, VentaItem, PedidoItem, AplicacionPago, AperturaCaja, MovimientoCaja, ArqueoCaja, CierreCaja, CompraItem, DevolucionProveedorItem | **REL-004** |
| **AMBIGUOUS** | 2 | **Legajo**, **DocumentoLegajo** | **REL-005** |
| **GLOBAL** (legítimo) | 2 | Empresa (es el tenant), Permiso (catálogo) | ninguno — fuera del alcance Business-scoped |
| **UNKNOWN** | 0 | — | — |

**Nota de método (§16 del encargo):** **no se asumió que la ausencia de discriminador signifique global.** `Empresa` y `Permiso` son globales legítimos. Los 10 derivados tienen un padre inequívoco y son resolubles por diseño. `Legajo`/`DocumentoLegajo` son los únicos ambiguos: el tenant depende de cuál de dos FK opcionales esté poblada, y por eso quedan señalados para el contrato, **no como bug**. `DevolucionProveedorItem` es DERIVED pero de riesgo ALTO, porque su nested create es el vehículo de X-08.

**`INV-B3-XTENANT-002` no nombra ningún modelo ni lista.** Enuncia que la correspondencia entre modelos Business-scoped y cobertura del mecanismo debe ser **comprobable**. Eso cubre G-B3-01 y G-B3-12 sin convertir una decisión de implementación en invariant (§13 del encargo).

---

# 12. NESTED WRITE INVARIANTS

Sección crítica (§14 del encargo).

**Qué inspecciona el mecanismo hoy `[C]`:** solo el nivel superior de los argumentos de la operación. No recorre la estructura de datos en profundidad. Consecuencias verificadas:
- un nested create **hereda** el discriminador del padre **solo si el modelo hijo lo tiene** — y ninguno de los hijos nested lo tiene;
- una vinculación a un identificador de otro tenant **no se valida**;
- las FK escalares dentro de un nested create **no se validan**.

**Nested writes reales en el código `[C]`:**

| Sitio | FK que acepta | Validación previa | Estado | Invariant |
|---|---|---|---|---|
| `ventas.service.ts:170-183` (`ventaItems`) | `productoId`, `reglaFidelizacionId` | **Sí** — lectura acotada previa que rechaza los ausentes; las reglas no vienen del DTO | **SEGURO** | REL-001, REL-002 (cumplidos) |
| `tienda.service.ts:265-273` (`pedidoItems`) | `productoId`, `reglaFidelizacionId` | **Sí** — igual patrón | **SEGURO** | REL-001, REL-002 (cumplidos) |
| `compras.service.ts:357-367` (`items` de `DevolucionProveedorItem`) | `productoId`, `loteId` | **NO** — del DTO al nested create | **VULNERABLE — X-08** | **REL-001, REL-002 (violados)** |
| `compras.service.ts:371-383` (`movimientoStock.create`) | `productoId`, `loteId` | **NO** — el mecanismo fuerza el discriminador propio pero no valida las FK | **VULNERABLE — X-08** | **REL-002, REL-003 (violados)** |

**El contraste es el dato más útil de esta sección.** Tres de cuatro sitios validan la FK con una lectura acotada previa; `crearDevolucion` es **la omisión, no la norma**. El patrón correcto existe y está aplicado en el resto del código. Eso hace que `INV-B3-REL-002` sea `DRAFT-STABLE`: no exige inventar nada, exige generalizar un patrón que ya está en producción. Y su docstring afirma una validación que el código no hace — el comentario documenta una intención no implementada.

**Invariants derivados (solo para operaciones que existen):**
- `INV-B3-REL-001` — nested create preserva ownership.
- `INV-B3-REL-002` — FK recibida de la entrada solo resuelve dentro del contexto. **Captura explícitamente el caso de `crearDevolucion`** conforme a §14 del encargo, sin determinar cómo implementarlo.
- `INV-B3-REL-003` — la integridad referencial del almacenamiento no es verificación de pertenencia.

**No derivados por no existir en el código:** nested `connect`, nested `delete`. Nested `update` es latente (X-10) y queda cubierto por el enunciado general de `REL-001`. **No se inventaron operaciones.**

---

# 13. TRANSACTION INVARIANTS

Conforme a §15 del encargo.

`INV-B3-TX-001` — **Business isolation must be preserved inside transaction boundaries.**

**Evidencia: `[ND]`.** El audit AS-IS no pudo demostrarlo por lectura. Lo que **sí** hay:

| Clase | Evidencia |
|---|---|
| `[C]` tipos | La lista de exclusión del cliente transaccional excluye únicamente métodos de ciclo de vida, **no** los hooks de query. 3 services derivan su tipo de transacción del cliente extendido, no del base, y compilan. Prisma 5.22.0 verificado |
| `[D]` convergente | Un service documenta haber evitado `upsert` **dentro** de una transacción porque el fail-closed se dispara — el autor observó el mecanismo activo dentro del `tx` |
| `[C]` estructural | 11 transacciones, todas abiertas sobre un cliente acotado a un único tenant; ninguna mezcla dos |

**Por qué sigue `[ND]`:** nada de lo anterior es evidencia de ejecución. Es inferencia de tipos más documentación convergente. **Este invariant debe generar un test de ejecución** y es el de mayor prioridad de toda la derivación.

`INV-B3-TX-002` (una transacción, un Business) y `INV-B3-TX-003` (sin efectos parciales ante fallo de aislamiento) completan la familia. TX-002 es la formalización de un invariante que el AS-IS **ya cumple por construcción** — el tipo de invariant más valioso de capturar, porque protege una propiedad existente de un refactor futuro.

---

# 14. FAIL-CLOSED INVARIANTS

Familia `INV-B3-FAIL-*` (5 invariants). Lo que distingue esta familia: **el AS-IS ya cumple su parte más fuerte.**

`INV-B3-FAIL-003` (operación no soportada no se ejecuta sobre entidades Business-scoped) está **cumplido y verificado `[C]`**: toda operación no enumerada lanza error. Y no es solo código: **cero usos de `upsert` y `groupBy` en todo `src`**, con un comentario que cita el fail-closed como la razón de haberlos evitado. El mecanismo está moldeando el código real. Es la mejor propiedad del AS-IS y **hoy no tiene ningún test** — por eso entra en el slice de verificación.

En tensión:
- `INV-B3-FAIL-001` (contexto ausente → denegación): cumple en forma, por otro medio — el contexto siempre viaja en el token.
- `INV-B3-FAIL-002` (contexto inválido → denegación): **PARCIAL**. Un identificador firmado inexistente no se valida; el efecto esperado es `[ND]`. **PENDING-B3-CONTRACT.**
- `INV-B3-FAIL-004` (denegación explícita y observable): **PENDING**, por la tensión T-1 de §16.
- `INV-B3-FAIL-005` (vía manual con restricción explícita y verificable): preserva el caso correcto del acceso crudo como evidencia **sin generalizarlo como garantía del mecanismo**, conforme al encargo §6.

---

# 15. BYPASS INVARIANTS

Familia `INV-B3-BYPASS-*` (4 invariants). La distinción que el encargo §6/R14 exige — acceso legítimo pre-contexto vs bypass Business-scoped — está **estructurada en los propios invariants**, no relegada a una nota:

- `INV-B3-BYPASS-001` enuncia la obligación para la lógica de dominio.
- `INV-B3-BYPASS-003` **excluye explícitamente** el acceso pre-contexto de su alcance. Sin esta exclusión, BYPASS-001 declararía ilegal el login: los lookups de identidad usan únicos globales porque el tenant es el **resultado** del lookup, no una restricción previa. Usar un cliente acotado ahí es imposible por definición.
- `INV-B3-BYPASS-002` ataca la clase de contención más frágil: cuatro vectores están contenidos solo por el orden de las llamadas.
- `INV-B3-BYPASS-004` es preventivo: hoy **no existe** superficie de ejecución fuera del ciclo de petición (cero jobs, schedulers, colas o event handlers `[C]`), y los scripts offline legítimamente operan sobre varios Business.

**Veredicto AS-IS de R14, que estos invariants formalizan:** no cumple como garantía, cumple como estado de hecho. La diferencia entre "no hay bypass" y "los bypasses que hay están bien escritos" es exactamente lo que R8-ARCH-002 §5 señaló como pendiente.

---

# 16. CROSS-CONTRACT CONSISTENCY

Comparados contra Identity/Tenancy, Authentication/Session/Context, Authorization y Legacy coexistence.

| Contrato | Compatibilidad | Nota |
|---|---|---|
| `C-TEN-001` (Identity/Tenancy §3; Block 1 :111-130) | **COMPATIBLE** | Las obligaciones observables de `C-TEN-001` son el núcleo de READ/MUT/XTENANT. El contrato declara "isolation mechanism" y "exact persistence enforcement implementation" **OPEN** — que es precisamente el hueco que estos invariants delimitan sin llenar |
| R8-ARCH-003 §5 CTX-001..006 | **COMPATIBLE** | CTX-001/003 → `INV-B3-CTX-001/002`. **CTX-006** ("contexto consistente con el scope de persistencia y operaciones anidadas") es la cláusula que **delega explícitamente en B3**: fuente de `INV-B3-CTX-006` y `INV-B3-REL-001` |
| R8-ARCH-003 §9 (switching) | **COMPATIBLE, PROSPECTIVO** | Lo cerrado (el contexto resuelve por Membership; el switch no concede acceso fuera de las Memberships válidas ni anula el aislamiento) es consistente con `CTX-004/005`. El transporte sigue OPEN |
| R8-ARCH-003 §12 | **COMPATIBLE** | Enumera las cinco obligaciones de persistencia que las familias CRE/READ/MUT/REL/TX cubren una a una |
| R8-AUTH-001 | **SIN SOLAPAMIENTO** | B3 no deriva ningún invariant de Role ni Permission. La cadena `Authorization → Tenant Isolation` se respeta por referencia |
| R8-ID-003 / C-COEX-004 | **COMPATIBLE** | C-COEX-004 enumera siete obligaciones de aislamiento **durante la coexistencia** que son un subconjunto de esta derivación. Fuente directa de `INV-B3-CTX-007` |
| R8-ID-003 / C-COEX-006 | **COMPATIBLE** | Sin limpieza destructiva. Ningún invariant de B3 exige eliminar nada (§19) |
| R8-ID-002 §6 | **COMPATIBLE** | Ningún invariant requiere modificar schema, migrar, renombrar el tenant ni borrar el discriminador transicional |
| B2 (doc 24, 34 invariants) | **COMPATIBLE con una herencia** | `INV-CUST-003` de v0.2 delegado a B3 → `INV-B3-XTENANT-005`. Ningún invariant B3 redefine Membership, Role ni Permission |

**Tensiones internas detectadas — se declaran, no se ocultan (§17 del encargo):**

| # | Tensión | Estado |
|---|---|---|
| **T-1** | `INV-B3-READ-003` exige que la denegación sea **indistinguible de la inexistencia** (no filtrar existencia); `INV-B3-FAIL-004` exige que la denegación sea **explícita y observable**. Ambas son correctas en su propio plano — READ-003 habla de la respuesta a un consumidor externo, FAIL-004 de la detectabilidad de un fallo de aislamiento — pero el límite entre ambos planos no está definido por ningún contrato | **PENDING CONTRACT RECONCILIATION** |
| **T-2** | `INV-B3-BYPASS-001` (ningún acceso de dominio sin contexto) vs `INV-B3-BYPASS-003` (pre-contexto legítimo): la frontera entre "pre-contexto" y "Business-scoped" no está definida normativamente. Hoy se resuelve caso por caso en el audit AS-IS | **PENDING CONTRACT RECONCILIATION** |
| **T-3** | `INV-B3-CTX-002` afirma que el contexto es determinado por el servidor. En el AS-IS el contexto viaja en un claim firmado que el cliente **porta**. No es contradicción (el cliente no lo elige), pero la frontera entre "portar" y "determinar" necesita enunciado del contrato | **PENDING CONTRACT RECONCILIATION** |
| **T-4** | `INV-B3-READ-004` trata el efecto residual de un único global como colisión de negocio, no como fuga. Si el contrato decidiera componer esas claves con el discriminador, el invariant sigue válido pero su test cambia | **PENDING CONTRACT RECONCILIATION** |

**Ninguna tensión es un conflicto con una Owner Decision aprobada.** Si el contrato B3 contradice alguno de estos invariants, el marcador `PENDING CONTRACT RECONCILIATION` es el punto de cruce.

---

# 17. B3 CONTRACT DEPENDENCY MATRIX

Estados: `STABLE` (contrato cerrado que lo soporta) · `EXISTING` (contrato existe, cláusula aplicable) · `DRAFT` (contrato v0.1 con el ítem abierto) · `MISSING` (no existe contrato) · `BLOCKED`.

| Invariant | Required Contract | Current Status | Dependency |
|---|---|---|---|
| CTX-001, CTX-003, CTX-006 | ARCH-003 §5 CTX-001/006 | **EXISTING** | Satisfecho a nivel de principio |
| CTX-002 | ARCH-003 CTX-003 | **EXISTING** | Frontera "portar vs determinar": T-3 |
| CTX-004 | ARCH-003 CTX-003 | **EXISTING** | Satisfecho |
| **CTX-005** | ARCH-003 §9 + B3 | **DRAFT** | **PENDING B3 CONTRACT** — mecanismo de switching |
| CTX-007 | C-COEX-004 | **STABLE** | Satisfecho |
| CRE-001, CRE-002, CRE-003 | C-TEN-001 + B3 | **MISSING** (enforcement) | Principio claro; el enforcement es del contrato |
| **CRE-004** | B3 | **MISSING** | **PENDING B3 CONTRACT** — frontera de vías de persistencia |
| READ-001, READ-002, READ-003, READ-004 | C-TEN-001 + B3 | **MISSING** (enforcement) | Principio claro |
| **READ-005** | B3 | **MISSING** | **PENDING B3 CONTRACT** — definición de "pre-contexto": T-2 |
| **READ-006** | ARCH-003 CTX-006 + B3 | **MISSING** | **PENDING B3 CONTRACT** — alcance de relaciones incluidas |
| MUT-001, MUT-002, MUT-003 | C-TEN-001 + B3 | **MISSING** (enforcement) | Principio claro |
| **MUT-004** | B3 | **MISSING** | **PENDING B3 CONTRACT** — atomicidad de verificación |
| **REL-001** | ARCH-003 CTX-006 + B3 | **MISSING** | **PENDING B3 CONTRACT** — mecanismo de nested |
| REL-002, REL-003 | OD §3.9 + B3 | **MISSING** (enforcement) | Principio claro; patrón ya aplicado en 3 sitios |
| **REL-004** | B3 | **MISSING** | **PENDING B3 CONTRACT** — estrategia de ownership derivado |
| **REL-005** | B3 | **MISSING** | **PENDING B3 CONTRACT** — regla para los 2 ambiguos |
| TX-001, TX-002, TX-003 | C-X-003 + B3 | **EXISTING** / MISSING (formalización) | TX-002 formaliza lo que el AS-IS ya cumple |
| FAIL-001, FAIL-003, FAIL-005 | ARCH-003 CTX-004 + OD §3.11 | **EXISTING** | FAIL-003 ya cumplido |
| **FAIL-002** | B3 | **MISSING** | **PENDING B3 CONTRACT** — validez del contexto |
| **FAIL-004** | B3 | **MISSING** | **PENDING B3 CONTRACT** — T-1 |
| **BYPASS-001** | B3 | **MISSING** | **PENDING B3 CONTRACT** — frontera de bypass |
| BYPASS-002, BYPASS-003, BYPASS-004 | OD §7 + B3 | **MISSING** (frontera) | BYPASS-003 depende de T-2 |
| XTENANT-001, XTENANT-002, XTENANT-003 | OD §3.12, §7 | **STABLE** (la obligación está en la decisión) | Derivable sin el contrato |
| **XTENANT-005** | B2 (heredado) + B3 | **DRAFT** | **PENDING** — cadena de alias CUST en reconciliación |

**Resumen:** **11 invariants PENDING B3 CONTRACT**, 26 DRAFT-STABLE, 4 REFERENCE. **Ninguno marcado FAIL** — conforme a §21 del encargo, la ausencia de contrato no es un fallo del invariant.

---

# 18. FUTURE TEST/EVAL CANDIDATES

Solo candidatos (§19 del encargo). **No se crea el suite.** Todos los IDs quedan `NOT YET DEFINED`: el doc 24 determinó que `TE-ID-004..007` colisionan entre catálogos y que **no se reusen números TE** `[D]`.

**Fixture disponible:** el seed ya crea una segunda Empresa con catálogo propio (familia, subfamilia, tipo, subtipo, productos) y **ningún test la consume** `[C]`. La fixture que R8-ARCH-002 §3.12 exige está construida y sin usar.

## Positive

| Candidato | Invariant | Prioridad |
|---|---|---|
| A accede a su propio recurso en cada clase de operación | READ-001, MUT-001, CRE-001 | Alta — baseline de no-regresión |
| Un nested create con FK propia funciona | REL-001, REL-002 | Alta |

## Negative

| Candidato | Invariant | X | Prioridad |
|---|---|---|---|
| A lee recurso de B → vacío | READ-001 | X-01 | **Alta** |
| A actualiza recurso de B → sin efecto | MUT-001 | X-05 | **Alta** |
| A elimina recurso de B → sin efecto | MUT-002 | X-07 | **Alta** |
| Unique lookup de recurso de B desde A → no encontrado | READ-002, READ-003 | X-02 | **Alta** |
| FK de B en nested create desde A → rechazado | **REL-002** | **X-08** | **Máxima** — fija el único defecto con dato cruzado persistible |
| Transacción que intente abarcar dos Business → imposible o falla | TX-002 | X-13 | Media |
| Business ID provisto por el cliente → ignorado | CTX-002, CTX-004 | — | **Alta** |
| Operación no soportada sobre modelo cubierto → error | **FAIL-003** | — | **Alta** — la mejor propiedad del AS-IS, hoy sin test |
| Clave única de B no observable desde A | READ-004 | X-03 | Media |
| `include` no trae entidades de B | READ-006 | X-14 | Media (condicionado a X-08) |

## Structural

| Candidato | Invariant | Prioridad |
|---|---|---|
| **Todo modelo Business-scoped con ownership directo está cubierto por el mecanismo** | **XTENANT-002** | **Máxima** — habría detectado G-B3-01 y G-B3-12 |
| Toda cadena de ownership derivado está contemplada | REL-004 | Pendiente del contrato |
| Ningún modelo queda sin clasificar (DIRECT/DERIVED/GLOBAL/AMBIGUOUS) | REL-004, REL-005 | Pendiente del contrato |

## Fail-closed

| Candidato | Invariant | Prioridad |
|---|---|---|
| Contexto ausente → denegado, nunca acceso sin restricción | FAIL-001 | Alta |
| Contexto inválido → denegado | FAIL-002 | Pendiente del contrato |
| Operación no soportada → error, no ejecución silenciosa | FAIL-003 | **Alta** |

## Execution (requieren `[E]`, no solo `[T]`)

| Candidato | Invariant | Prioridad |
|---|---|---|
| **El aislamiento sigue vigente dentro de una transacción** | **TX-001** | **MÁXIMA** — único camino para cerrar el `[ND]` de §13 |
| Un rechazo por aislamiento no deja efectos parciales | TX-003 | Alta |

**Las cuatro de prioridad máxima/alta que convierten `[C]`-por-lectura en `[T]`/`[E]`:** el `tx` conserva el aislamiento (TX-001); el unique lookup cross-tenant devuelve vacío (READ-002); la operación no soportada falla cerrado (FAIL-003); la FK cruzada es reproducible (REL-002, fijando el defecto antes de contratar la regla).

---

# 19. PRESERVATION / ADAPTATION IMPACT

Conforme a §20 del encargo y a R8-ARCH-002 §5 (mecanismo ADAPTED, ningún componente eliminado). **No se propone ningún reemplazo destructivo.**

| Componente | Invariant Impact | Action |
|---|---|---|
| Mecanismo de inyección de restricción en lecturas/mutaciones | Satisface READ-001, MUT-001/002/003 **por mecanismo** | **PRESERVE** |
| Forzado de ownership en creación | Satisface CRE-001/002/003; defensa en profundidad para CTX-002 | **PRESERVE** |
| **Fail-closed de operaciones no soportadas** | Satisface **FAIL-003**; ya moldea el código real | **PRESERVE + VERIFY** (hoy sin test) |
| Allow-list explícita de modelos | El principio satisface XTENANT-002; el contenido está incompleto | **ADAPT** — la correspondencia debe ser comprobable, no mantenida a mano |
| Validación posterior en lecturas por identificador único | Satisface READ-002/003 en resultado | **ADAPT** — no debería depender de que el resultado traiga el discriminador |
| Ausencia de inspección de operaciones anidadas | REL-001 sin soporte | **NEW** |
| Validación de FK cross-Business | REL-002/003 sin soporte en ninguna capa | **NEW** |
| Factory de cliente acotado | CTX-001/003; **su fundamento de no usar scope por request está documentado y verificado contra servidor real** | **PRESERVE (fundamento) + ADAPT (firma)** — el contexto debería venir de una autoridad, no de un valor que el llamador elige |
| Acceso a persistencia sin scope, exportado | BYPASS-001 sin garantía; BYPASS-003 lo necesita para el login | **WRAP/ADAPT** — no eliminar: es necesario pre-contexto |
| Discriminador de tenant en 28 modelos | CTX-007 lo preserva como límite efectivo | **TRANSITIONAL** — sin limpieza destructiva (C-COEX-006) |
| Descarte de propiedades no declaradas en la entrada | Satisface CRE-002 y CTX-002 en la capa de entrada | **PRESERVE** |
| Acceso crudo a almacenamiento en inventario | Satisface FAIL-005 manualmente | **PRESERVE + VERIFY** — correcto, sin red de contención |
| Lookups de identidad pre-contexto | BYPASS-003, READ-005 los excluyen explícitamente | **LEGITIMATE PRE-CONTEXT** |
| Accesos crudos Business-scoped en legajo/invitaciones | BYPASS-001/002, CRE-004, MUT-004 | **WRAP/ADAPT** |
| Ownership derivado por convención | REL-004 sin mecanismo | **NEW** |
| Pertenencia de los 2 modelos ambiguos | REL-005 no derivable sin regla | **BLOCKED** — no tocar hasta que el contrato la defina |
| **Fixture de segunda Empresa en el seed** | Habilita XTENANT-001 y todos los negativos | **PRESERVE** — ya existe, sin consumo |
| Scripts offline con cliente propio | BYPASS-004 los excluye: deben operar sobre varios Business | **PRESERVE** |
| Tests de aislamiento | XTENANT-001 sin ninguna cobertura | **NEW** |

---

# 20. READINESS GATES

| Gate | Resultado | Fundamento |
|---|---|---|
| **A — Owner Decision Coverage** | **PASS** | Las 12 propiedades de R8-ARCH-002 tienen al menos un invariant trazable (§8). P2 y P3 por referencia a B1/B2, conforme a §18 del encargo. El invariante de seguridad §7 queda cubierto por XTENANT-003 + BYPASS-001..004 |
| **B — Existing Contract Compatibility** | **PASS WITH RECONCILIATION** | Compatibles con `C-TEN-001`, ARCH-003 §5/§9/§12, C-COEX-004/006, ID-002 §6 y el set B2. Cuatro tensiones internas declaradas (T-1..T-4), ninguna en conflicto con una Owner Decision. La colisión documental de CUST se maneja citando el documento |
| **C — B3 Contract Dependency** | **CONDITIONAL** | 11 de 41 invariants son `PENDING B3 CONTRACT` (§17): CTX-005, CRE-004, READ-005, READ-006, MUT-004, REL-001, REL-004, REL-005, FAIL-002, FAIL-004, BYPASS-001, más XTENANT-005 por la cadena de alias. Los 26 estables no dependen del contrato en elaboración |
| **D — Testability** | **PASS WITH RECONCILIATION** | 26 invariants son derivables a test observable hoy. 11 esperan el contrato. 4 son REFERENCE (su test pertenece a B1/B2). Dos no son derivables a test en sentido estricto: REL-005 (hasta que exista la regla) y BYPASS-004 (preventivo, sin superficie actual) |
| **E — AS-IS Traceability** | **PASS** | Los 13 gaps G-B3-01..13 tienen invariant o explicación (§9). Los 17 vectores X-01..17 tienen invariant que los gobierna (§10). Los 42 modelos están classificados sin categoría UNKNOWN (§11) |

---

# 21. FINAL VERDICT

# DRAFT READY FOR B3 CONTRACT RECONCILIATION

**Fundamento:**

- Los 41 invariants están derivados de fuentes normativas cerradas (R8-ARCH-002 §3/§7), contratos existentes y evidencia de código verificada. **Ninguno inventa un requisito ni prescribe un mecanismo** (§13 del encargo respetado: ningún invariant nombra la tecnología de persistencia, la estructura del mecanismo ni la lista de modelos).
- Las 12 propiedades aprobadas tienen cobertura trazable.
- **Ninguna Owner Decision es requerida por esta derivación**, y ninguna se abrió. La ausencia del contrato técnico B3 no es una decisión Owner faltante: R8-ARCH-002 ya decidió el mecanismo y las propiedades, y §6 declaró abierta la especificación técnica downstream.
- 26 invariants son estables y derivables a test con lo que ya existe.
- 11 dependen del contrato en elaboración y quedan marcados `PENDING B3 CONTRACT`, **no FAIL**.
- 4 tensiones internas quedan declaradas como `PENDING CONTRACT RECONCILIATION`, no ocultas.

**Por qué no `READY WITH RECONCILIATION`:** ese veredicto correspondería si las inconsistencias fueran documentales y resolubles sin el contrato. Aquí el factor dominante es la dependencia de un contrato **que está siendo derivado en paralelo** — exactamente el caso que §23 del encargo asigna a `DRAFT READY FOR B3 CONTRACT RECONCILIATION`.

**Por qué no `BLOCKED`:** la derivación **sí** pudo hacerse. Ninguna propiedad quedó sin invariant por falta de una decisión real.

**Estado del resultado: DRAFT / NON-CANONICAL / PENDING B3 CONTRACT RECONCILIATION.** No es canónico hasta cruzarse con B3 Contracts.

---

# 22. RECOMMENDED NEXT STEP

**Cuando llegue B3 Contracts, el cruce tiene tres puntos de contacto concretos:**

1. **Los 11 `PENDING B3 CONTRACT`** (§17). Para cada uno: ¿el contrato lo soporta, lo contradice o lo deja abierto? Si lo contradice, el invariant se ajusta — no el contrato.
2. **Las 4 tensiones T-1..T-4** (§16). Son preguntas que el contrato debe responder: el límite entre no-filtrar-existencia y denegación-observable; la frontera pre-contexto vs Business-scoped; "portar" vs "determinar" el contexto; y el tratamiento de los únicos globales.
3. **Los 6 ítems que el contrato debe clasificar y los invariants no pueden:** los 10 modelos derivados, los 2 ambiguos, la frontera de vías de persistencia, la atomicidad de verificación, el mecanismo de operaciones anidadas, y el alcance de las relaciones incluidas.

**Secuencia propuesta:**

1. **Cruzar este draft con B3 Contracts.** Resolver los 11 pending y las 4 tensiones.
2. **Publicar los invariants canónicos** en `07-DESIGN/INVARIANTS/DERIVED/` con tabla de alias a `INV-TEN-001`, `INV-CONTEXT-001`, `R5 INV-ID-004`, `ARCH-003 CTX-00x` y la cadena CUST — **sin renumerar ningún documento histórico**.
3. **Derivar B3 Tests/Evals** solo para el subconjunto estable, con IDs `NOT YET DEFINED` (no reusar números TE).
4. **En paralelo, sin esperar el contrato:** consumir la fixture ya existente para los cuatro tests de máxima prioridad (TX-001, READ-002, FAIL-003, REL-002). Eso no es implementar B3: es **verificar el AS-IS**, y permitiría que el contrato se escriba sobre comportamiento medido en vez de comportamiento leído.

**Nota operativa de numeración:** existen dos archivos `24-` en `13-AUDIT/` (`24-B2-CONTROLLED-INVARIANT-RECONCILIATION` y `24-B4-IMPLEMENTATION-READINESS-ASSESSMENT`), ambos ya versionados. Este documento es `25-` para no agravar la colisión. Conviene renumerar uno de los dos `24-` en una acción separada y explícita.

**Lo que este documento NO hizo:** no modificó código, schema, migraciones ni datos; no creó commits, push ni deploy; no modificó Owner Decisions, contratos canónicos ni invariants históricos; no declaró B3 Contracts cerrado; no declaró ningún invariant canónico; no ejecutó tests; no emitió `[T]` ni `[E]`; y no implementó nada.

---

# 23. EVIDENCE INDEX

## Código `[C]` — verificado en esta derivación o en el audit AS-IS citado

Rutas relativas a `apps/api/`. Las filas marcadas ✔ las re-verifiqué directamente en esta sesión; el resto provienen del B3 AS-IS Audit (23), cuyas afirmaciones estructurales re-verifiqué por muestreo.

| Hecho | Ubicación | ✔ |
|---|---|---|
| Namespace `INV-B3-*` libre | `grep -rn "INV-B3-"` sobre toda la documentación → cero | ✔ |
| Contrato B3 inexistente | listado de `07-DESIGN/CONTRACTS/DOMAIN/` → 11 archivos | ✔ |
| 42 modelos; 28 con discriminador; 26 cubiertos | `prisma/schema.prisma`; `src/prisma/empresa-scope.extension.ts:32-68` | ✔ |
| Los 2 fuera de cobertura | `PagoProveedor` (`schema.prisma:1061`), `DevolucionProveedor` (`:1082`) | ✔ |
| Inventario documental del mecanismo desactualizado | `src/prisma/empresa-scope.extension.ts:20-30` ("21 modelos"; omite 3 derivados) | ✔ |
| Forzado de ownership en creación | `src/prisma/empresa-scope.extension.ts:118-129` | |
| Inyección de restricción en 9 operaciones | `src/prisma/empresa-scope.extension.ts:82-92, 131-134` | |
| Validación posterior en lectura por único | `src/prisma/empresa-scope.extension.ts:136-159`; dependencia de `'empresaId' in resultado` en `:146` | |
| Fail-closed de operaciones no soportadas | `src/prisma/empresa-scope.extension.ts:161-166` | |
| Cero usos de `upsert`/`groupBy` en `src` | búsqueda exhaustiva | |
| Fail-closed moldea el código llamador | `src/tienda/tienda.service.ts:221-240` (comentario que lo cita) | |
| Solo nivel superior de argumentos inspeccionado | `src/prisma/empresa-scope.extension.ts:113-116` | |
| Factory singleton; fundamento de no usar scope por request | `src/prisma/empresa-scoped-prisma.service.ts:9-41` | ✔ |
| Acceso sin scope exportado e inyectable | `src/prisma/prisma.module.ts:6-8`; 46 usos crudos | |
| FK del DTO persistida sin validar | `src/compras/compras.service.ts:343-398`; docstring en `:323-331` | ✔ |
| Nested writes seguros (patrón correcto) | `src/ventas/ventas.service.ts:170-183`; `src/tienda/tienda.service.ts:265-273` | |
| Lectura en modelos no cubiertos, contenida por llamada previa | `src/compras/compras.service.ts:271, 327` | |
| Derivado consultado sin efecto; contenido por chequeo explícito | `src/autorizaciones/autorizaciones.service.ts:62, 69` | |
| Verificación y mutación en 2 queries | `src/legajo/legajo.controller.ts:108, 123`; `src/legajo/legajo.cliente.controller.ts:123, 135` | |
| Acceso crudo a almacenamiento con discriminador explícito | `src/inventario/inventario.service.ts:252-272` | ✔ |
| Creación con cliente crudo en invitaciones | `src/invitaciones/invitaciones.service.ts:118-131, 227-240` | |
| Lookups de identidad pre-contexto | `src/auth/auth.service.ts:45`; `src/auth/auth.google.service.ts:36, 45`; `src/invitaciones/invitaciones.service.ts:212` | |
| Único global de idempotencia consultado por lectura única acotada | `schema.prisma:663`; `src/ventas/ventas.service.ts:113-120` | ✔ |
| Modelos ambiguos: 2 FK opcionales y únicas | `schema.prisma:520-523` | |
| Cero superficie de tenant provista por el cliente | grep de DTOs, `@Param`, `@Query`, `@Headers`, `businessId` → cero | ✔ |
| Descarte de propiedades no declaradas | `src/main.ts:8` | ✔ |
| Sin ejecución fuera del ciclo de petición | grep `@Cron`/`ScheduleModule`/`@Interval`/`setInterval`/`Bull`/`Queue`/`EventEmitter`/`@OnEvent` → cero | ✔ |
| 11 transacciones, un tenant cada una | 9 interactivas + 2 por array | |
| Tipo de transacción derivado del cliente extendido | `src/inventario/inventario.service.ts:12`; `src/compras/compras.service.ts:16`; `src/tienda/tienda.service.ts:13` | |
| Fail-closed observado dentro de transacción | `src/tienda/tienda.service.ts:230-234` | |
| Prisma 5.22.0 | `package.json:33` | ✔ |
| Único spec del repositorio | `src/health/health.controller.spec.ts` | ✔ |
| Fixture de segunda Empresa sin consumo | `prisma/seed.ts:69, 77, 181, 192-236` (10 referencias) | ✔ |

## Documentos `[D]`

Rutas relativas a `docs/WAPSELL-DOCUMENTATION/`.

| Documento | Secciones usadas |
|---|---|
| `03-DECISIONS/28-R8-ARCH-002-OWNER-DECISION-TENANT-ISOLATION-2026-10-03.md` | §1 ruling, **§3 las 12 propiedades**, §4 scope, §5 ADAPTED, §6 los 10 abiertos, **§7 invariante de seguridad** |
| `03-DECISIONS/30-R8-MASTER-OWNER-DECISION-CLOSURE-2026-10-03.md` | tabla maestra |
| `03-DECISIONS/31-R8-MASTER-DECISION-PROPAGATION-AUDIT-2026-10-03.md` | §7 gate, §9 reconciliación ejecutada |
| `03-DECISIONS/32-R8-ID-002-OWNER-DECISION-PHYSICAL-USER-BUSINESS-MEMBERSHIP-2026-10-03.md` | §1 Option A, §2 propiedades, §3 transición, §6 no-autorización |
| `03-DECISIONS/33-R8-ID-003-OWNER-DECISION-LEGACY-IDENTITY-COEXISTENCE-2026-10-03.md` | dirección de coexistencia |
| `07-DESIGN/CONTRACTS/DOMAIN/01-IDENTITY-AND-TENANCY-CONTRACTS.md` | §3 `C-TEN-001` (:67-80), con mecanismo de aislamiento OPEN |
| `07-DESIGN/CONTRACTS/DOMAIN/06-R8-ID-003-IDENTITY-LEGACY-COEXISTENCE-CONTRACT-v0.1.md` | §4 **C-COEX-004** (7 obligaciones de aislamiento), C-COEX-006, §11 rollback |
| `07-DESIGN/CONTRACTS/DOMAIN/07-R8-AUTH-001-AUTHORIZATION-CONTRACT-v0.1.md` | §7, §9 (referencia; sin solapamiento) |
| `07-DESIGN/CONTRACTS/DOMAIN/08-R8-ARCH-003-AUTH-SESSION-BUSINESS-CONTEXT-CONTRACT-v0.1.md` | §5 **CTX-001..006**, §9 switching, **§12 interacción con aislamiento**, §13 los 14 OPEN |
| `07-DESIGN/CONTRACTS/DOMAIN/07-BLOCK-1-CONTRACTS-BASELINE-v0.1.md` | `C-TEN-001` (:111-130), `C-X-001`, `C-X-003` |
| `07-DESIGN/INVARIANTS/BASELINE/00-R5-INVARIANTS-BASELINE-001-490.md` | `INV-ID-004`, `INV-XDOM-001`, `INV-MIG-001/002/003` |
| `07-DESIGN/INVARIANTS/DERIVED/00-INVARIANTS-v0.1.md` | `INV-TEN-001`, `INV-CONTEXT-001`, `INV-CUST-002/003` (:564-572) |
| `07-DESIGN/INVARIANTS/DERIVED/04-R6-INVARIANTS-CANONICAL-AUDIT-2026-10-03.md` | §4 (no propagar el obsoleto de B2) |
| `07-DESIGN/INVARIANTS/DERIVED/05-BLOCK-1-INVARIANTS-BASELINE-v0.1.md` | `INV-TEN-001`, `INV-MEM-001/002`, `INV-CUST-002` (:203) / `003` (:211) |
| `07-DESIGN/TESTS-EVALS/DERIVED/05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md` | TE-ID-001..011 (:66-76), todos SPECIFIED |
| `13-AUDIT/23-BLOCK-3-TENANT-ISOLATION-ASIS-AUDIT-2026-10-04.md` | §3 reglas R1-R14, §4 modelo de tenant, §5 arquitectura, **§6 clasificación de modelos**, §7 matriz de operaciones, §8 contexto, §9 tenant IDs del cliente, **§10 vectores X-01..17**, §11 nested/FK, §12 transacciones, §13 bypass, §14 gaps G-B3-01..13, §15 preservación, §17 readiness |
| `13-AUDIT/24-B2-CONTROLLED-INVARIANT-RECONCILIATION-2026-10-04.md` | §4 colisiones de ID (**delegación de `INV-CUST-003` a B3**), §7 abiertos técnicos, §8 set canónico de 34, §15 veredicto |
| `13-AUDIT/24-B4-IMPLEMENTATION-READINESS-ASSESSMENT-2026-10-04.md` | §7 Contract Gate BLOCKED, §16 slice candidato, §19 blockers |

## `[ND]` — no determinable

- **Ejecución** de la preservación del aislamiento dentro de una transacción (`INV-B3-TX-001`). Evidencia de tipos `[C]` y documental `[D]` convergente; **sin ejecución**. Test de máxima prioridad.
- Comportamiento real ante un contexto firmado inválido (`INV-B3-FAIL-002`): el efecto esperado es razonamiento sobre el mecanismo, no ejecutado.
- Comportamiento futuro de la selección de Business (`INV-B3-CTX-005`): no existe la superficie.
- Cardinalidad de roles y límite de obsolescencia de revocación: pertenecen a B2 (doc 24 §13).
- Runtime de módulos no leídos línea por línea: `pedidos`, `fidelizacion`, `clientes` completos.

## Clases no emitidas

**`[T]` — ninguna.** No existen tests de aislamiento en el repositorio.
**`[E]` — ninguna.** No se ejecutó API, migraciones, build ni lint.
