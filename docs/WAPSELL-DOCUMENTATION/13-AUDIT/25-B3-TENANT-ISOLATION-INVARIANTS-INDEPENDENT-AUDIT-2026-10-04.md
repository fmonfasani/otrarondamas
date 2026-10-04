# B3 — TENANT ISOLATION INVARIANTS
## PARALLEL CONTEXT 2 — INDEPENDENT AUDIT / CHALLENGE

**Estado:** AUDITORÍA INDEPENDIENTE READ-ONLY — NO CANÓNICO — NO APROBADO
**Fecha:** 2026-10-04
**Repo auditado:** `apps/api`, commit base `ac555d6`
**Rol:** auditoría independiente de la derivación de invariants B3. **No se asume correcto el resultado del otro contexto.**
**Alcance de la acción:** sin cambios de código, schema, migraciones ni datos. Sin commits, sin push, sin deploy. Sin modificar Owner Decisions.

**Clases de evidencia:** `[C]` código · `[T]` test · `[D]` documentado · `[E]` ejecución · `[ND]` no determinable.

> **No se emite ninguna evidencia `[T]` ni `[E]`.** No se ejecutó ningún test ni la API. Toda afirmación conductual es `[C]` por lectura o `[D]`.

---

# 1. EXECUTIVE SUMMARY

## 1.1 Hallazgo estructural: el objeto a auditar no existe como se suponía

El encargo pide auditar "cualquier B3 draft producido por el otro contexto". **Verificado: no existe ningún draft de invariants B3** `[C]` (ausencia verificada por `find` sobre `07-DESIGN/INVARIANTS/**` y por `git diff-tree` de los commits `f99458e` y `ac555d6`). Lo que el otro contexto produjo fue:

| Documento | Commit | Contenido real |
|---|---|---|
| `13-AUDIT/22-B2-AUTHORIZATION-INVARIANTS-RECONCILIATION` | `f99458e` | draft B2 (36 invariants `INV-B2-*`), **no canónico** |
| `13-AUDIT/24-B2-CONTROLLED-INVARIANT-RECONCILIATION` | `ac555d6` | **set canónico B2: 34 IDs** con prefijos `AUT-`/`MEM-`/`ROLE-`/`PRM-`/`CTX-`/`CUS-`/`LEG-` |
| `13-AUDIT/24-B4-IMPLEMENTATION-READINESS-ASSESSMENT` | `ac555d6` | readiness B1/B2/B3 |
| `07-DESIGN/CONTRACTS/DOMAIN/09-R8-ARCH-002-TENANT-ISOLATION-CONTRACT-v0.1` | untracked | contratos B3 (24 candidatos `B3-CON-*`) + **20 candidatos de invariant `INV-B3-*` en su §21** |

El objeto auditable es por tanto la **§21 del documento de contratos B3** — los 20 candidatos `INV-B3-*` — confrontada contra los sets de invariants que **ya son canónicos o cuasi-canónicos** (R5, v0.2, B1, B2).

## 1.2 Defecto principal: duplicación masiva no detectada

**La derivación propuesta en §21 del contrato B3 duplica el set B1 y colisiona con el set canónico B2.** Esto no fue detectado por el contexto que la produjo.

| Hecho verificado | Evidencia |
|---|---|
| **`INV-CONTEXT-001`** (B1) cubre por sí solo las propiedades **1, 2, 3, 4 y 11** de R8-ARCH-002, en cuatro frases | `05-BLOCK-1-INVARIANTS-BASELINE-v0.1.md:108-118` `[C]` |
| **`INV-TEN-001`** (B1) cubre las propiedades **6, 7** y el invariante de seguridad §7 | `:78-86` `[C]` |
| **B2 ya posee `CTX-001..004`, `MEM-002/003`, `AUT-001/004`** como set canónico de 34 IDs | `24-B2-CONTROLLED-...:166-211` `[C]` |
| **B2 marca `MEM-003` explícitamente "CROSS-BLOCK with B3"** | `:183` `[C]` |
| **Ya existen 6 criterios de test** TE-ID-005/006/008/009/010/011 que cubren propiedades 4, 6, 7, 8, 9, 11 | `05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md:70-76` `[C]` |

La familia propuesta **`INV-B3-CTX-001..004`** es un **duplicado cuádruple**: colisiona con `INV-CONTEXT-001` (B1) *y* con `CTX-001..004` (B2), que a su vez ya son alias entre sí. Las familias `INV-B3-DATA-*`, `INV-B3-UNIQ-001`, `INV-B3-NEST-001` son redundantes con `INV-TEN-001` + TE-ID-008..011.

**De los 20 candidatos propuestos, solo 6 sobreviven la auditoría de duplicación.**

## 1.3 Lo que sí es genuinamente nuevo

Seis propiedades de persistencia no están cubiertas por ningún invariant existente, y las tres primeras son las que importan:

| # | Propiedad | Por qué no está cubierta |
|---|---|---|
| 1 | **Una FK recibida del cliente se valida contra el contexto antes de persistirse** | `INV-TEN-001` dice que un recurso de A "no debe ser expuesto u operado" vía B. Persistir una *referencia* a un recurso de B no es exponerlo ni operarlo. Hueco real |
| 2 | **La integridad referencial de la base no satisface el aislamiento** | Ningún invariant distingue "la FK existe" de "la FK pertenece al tenant" |
| 3 | **Ownership derivado está sujeto a las mismas obligaciones que el directo** | `INV-TEN-001` dice "every Business-scoped resource"; no define qué hace Business-scoped a una entidad sin `empresaId` |
| 4 | **Un identificador de negocio Business-scoped no es global** | Propiedad de semántica de unicidad, no de aislamiento. Ningún invariant la cubre |
| 5 | **Una transacción opera bajo exactamente un Business Context** | B4 §142 lo confirma: "sin invariant propio" `[D]` |
| 6 | **Una operación Business-scoped no se ejecuta fuera del aislamiento esperado** | Ningún invariant distingue acceso pre-contexto legítimo de bypass |

## 1.4 Defectos encontrados, por clase

| Clase | Nº | Items |
|---|---|---|
| **DUPLICATE** | 8 | INV-B3-CTX-001/002/003/004, INV-B3-DATA-002, INV-B3-UNIQ-001, INV-B3-NEST-001, INV-B3-BYP-001 |
| **WRONG DOMAIN** | 3 | INV-B3-CTX-002 (es B2 MEM-002), INV-B3-CTX-003 (es B2 CTX-002), INV-B3-BYP-001 (es contrato, no invariant) |
| **OVER-SPECIFIED** | 1 | INV-B3-DATA-003 (fusiona update y delete con una cláusula de mecanismo) |
| **UNDER-SPECIFIED** | 2 | INV-B3-OWN-001 (no dice *cómo* se determina el tenant derivado), INV-B3-NEST-002 (mezcla lectura y escritura) |
| **IMPLEMENTATION LEAK** | 1 | INV-B3-BYP-002 ("fuera del aislamiento esperado" presupone el mecanismo actual) |
| **WRONG EVIDENCE** | 1 | INV-B3-TX-001 propuesto sin marcar que su propiedad clave es `[ND]` por ejecución |
| **MISSING** | 2 | fail-closed **por operación no soportada** (la mejor propiedad del AS-IS, sin invariant); no-presunción de globalidad degradada a regla de proceso |
| **TECHNICAL OPEN** | 1 | INV-B3-OWN-AMBIG (Legajo/DocumentoLegajo) |
| **OWNER CONFLICT** | **0** | — |
| **ACCEPTABLE** | 4 | INV-B3-FK-001, INV-B3-FK-002, INV-B3-UNIQ-002, INV-B3-TX-002 |

## 1.5 Corrección propuesta

**8 invariants B3, no 20** (sec. 15). Con nomenclatura alineada al convenio B2 (prefijo corto sin `INV-B3-`, para no crear una tercera convención):

`ISO-001` FK validada · `ISO-002` integridad referencial insuficiente · `ISO-003` ownership derivado · `ISO-004` no-presunción de globalidad · `ISO-005` identificador de negocio no global · `ISO-006` transacción mono-contexto · `ISO-007` fail-closed por operación no soportada · `ISO-008` operación Business-scoped no escapa del aislamiento.

Más 1 diferido (`ISO-AMBIG`, TECHNICAL OPEN) y 1 regla de proceso (enumerabilidad de la superficie), que **no es un invariant**.

## 1.6 Veredicto

**PASS WITH RECONCILIATION.** La cobertura de R8-ARCH-002 es real (12/12), pero **no por los invariants B3 propuestos**: la mayoría ya está cubierta por B1/B2. La reconciliación obligatoria es reducir el set de 20 a 8 y alinear la nomenclatura antes de escribir el archivo canónico. Cero conflictos con Owner Decisions.

---

# 2. AUDIT SCOPE

**En alcance:**
- auditoría de la derivación de invariants B3 (§21 del contrato B3, 20 candidatos);
- reconciliación contra R5, v0.2, B1 y el set canónico B2;
- verificación de las 12 propiedades de R8-ARCH-002;
- auditoría de ownership (DIRECT/DERIVED/GLOBAL/AMBIGUOUS/UNKNOWN);
- auditoría FK, nested writes, transacciones, bypass, verificación negativa;
- auditoría de evidencia y testabilidad;
- clasificación de defectos.

**Fuera de alcance (regla central del encargo):**
- producir una segunda arquitectura o especificación;
- producir más invariants de los necesarios — **el objetivo es reducir y corregir, no ampliar**;
- crear tests;
- implementación.

**Verificación de código ejecutada en esta auditoría, de forma independiente:**
- `crearDevolucion` (`compras.service.ts:343-398`): confirmado **cero** `findMany`/`findUnique`/`findFirst` sobre `producto` o `lote` en todo el método `[C]`;
- `crearCompra` (`:107-114`): confirmado `db.producto.findMany` scoped + bucle de rechazo `[C]`;
- `connect`/`connectOrCreate`/`disconnect`/`set`/nested update/delete: **cero usos** en `apps/api/src` (única coincidencia: un comentario en `catalogo.controller.ts:104` que explica por qué no se usa) `[C]`;
- `INV-CONTEXT-001`, `INV-TEN-001`, `INV-MEM-001/002` de B1: texto leído literalmente `[C]`;
- set canónico B2 (34 IDs): leído completo `[C]`;
- TE-ID-005..011 de B1: leídos literalmente `[C]`.

**No ejecutado:** nada.

---

# 3. AUTHORITY

Precedencia aplicada, conforme al encargo:

```
OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE >
CONTRACTS > INVARIANTS > AUDIT > HISTORICAL
```

**Fuente principal: R8-ARCH-002.**

| Nivel | Documento | Uso |
|---|---|---|
| OWNER RULING | `28-R8-ARCH-002` | 12 propiedades (§3); invariante §7; AS-IS = ADAPTED (§5); 10 ítems abiertos (§6) |
| OWNER RULING | `29-R8-ARCH-003`, `33-R8-ID-003`, `35-R8-AUTH-001` | contexto, coexistencia, autorización |
| DECISION REGISTER | `30-R8-MASTER-CLOSURE`, `31-R8-MASTER-PROPAGATION` | §140 exige un invariant de aislamiento application-level |
| CANONICAL SPEC | `06-BLOCK-1-ARCHITECTURE-SPEC` §5.4-5.5 | 12 propiedades literales |
| CONTRACTS | `01-IDENTITY-AND-TENANCY`, `06-R8-ID-003`, `07-R8-AUTH-001`, `08-R8-ARCH-003`, `09-R8-ARCH-002` (untracked) | obligaciones existentes |
| INVARIANTS | `00-R5-BASELINE`, `00-INVARIANTS-v0.1`, `05-BLOCK-1-BASELINE`, `24-B2-CONTROLLED` | **sets con los que B3 no debe colisionar** |
| AUDIT | `23-BLOCK-3-ASIS`, `24-B4-READINESS` | evidencia AS-IS |

**Nota de precedencia relevante:** el set B2 de `24-B2-CONTROLLED` se ubica en `13-AUDIT/`, es decir en nivel AUDIT, y su propio veredicto dice "**no procedemos automáticamente a Tests/Evals**" y "escribir el archivo canónico B2" como paso 3 pendiente `[D]`. **Por tanto el set B2 es cuasi-canónico, no canónico.** B3 no debe tratarlo como inmutable, pero tampoco ignorarlo: colisionar con él crearía una tercera numeración. Esta auditoría lo trata como **convenio vigente a respetar**.

---

# 4. EXISTING INVARIANT RECONCILIATION

Inventario de lo que **ya existe** y cubre aislamiento, antes de admitir cualquier invariant B3.

## 4.1 B1 — `05-BLOCK-1-INVARIANTS-BASELINE-v0.1.md`

| ID | Texto (literal, abreviado) | Cubre de R8-ARCH-002 | Evidencia |
|---|---|---|---|
| **`INV-TEN-001`** | "Business is the canonical tenant and isolation boundary. Every Business-scoped resource remains associated with exactly one applicable Business context. A resource belonging to Business A must not be exposed or operated through Business B context." | **6, 7**, §7 | `:78-86` `[C]` |
| **`INV-MEM-001`** | "A Membership for Business A does not authorize access to Business B." | **2** | `:90-98` `[C]` |
| **`INV-MEM-002`** | "An INACTIVE Membership cannot authorize Business-scoped operations." | **3** | `:100-106` `[C]` |
| **`INV-CONTEXT-001`** | "A protected Business-scoped operation has one effective Business context. The effective context must correspond to an ACTIVE Membership. A client-supplied Business identifier cannot override the server-established effective context. **Missing or invalid Business context fails closed.**" | **1, 2, 3, 4, 11** | `:108-118` `[C]` |
| `INV-CUST-002` | "Customer commercial data must not cross Business boundaries." | 6 (dominio Customer) | `:203-209` `[C]` |
| `INV-INV-002` | "Inventory operations must operate only against inventory belonging to the effective Business context." | 6, 7 (dominio Inventory) | `:303-307` `[C]` |
| `INV-AR-001`, `INV-CASH-001`, `INV-MSG-001`, `INV-CART-002` | aislamiento por dominio | 6, 7 | `[C]` |

**Conclusión 4.1:** `INV-CONTEXT-001` es un invariant **de cuatro frases que cubre cinco propiedades**. Cualquier familia `INV-B3-CTX-*` lo duplica.

## 4.2 B2 — set canónico de 34 IDs (`24-B2-CONTROLLED-...`)

| ID B2 | Statement | Solapa con B3 propuesto |
|---|---|---|
| **`CTX-001`** | "Business Context is mandatory" | **= INV-B3-CTX-001** |
| **`CTX-002`** | "The client cannot impose the context" | **= INV-B3-CTX-003** |
| **`CTX-003`** | "One effective context, resolving to an ACTIVE Membership" | **= INV-B3-CTX-002** |
| **`CTX-004`** | "On Business Switch, authority is re-derived from the target Membership" | **= INV-B3-CTX-004** (parcial) |
| **`MEM-002`** | "Only an ACTIVE Membership authorizes; INACTIVE or absent denies" | **= INV-B3-CTX-002** |
| **`MEM-003`** | "A Membership does not authorize another Business" — marcado **"CROSS-BLOCK with B3"** | reconocimiento explícito del límite |
| **`AUT-001`** | "The JWT authenticates, it does not authorize. Claims (`empresaId`, role, permissions) are not the sole authorization truth" | solapa con **B3-CON-004** |
| **`AUT-004`** | "Fail-closed on absent/ambiguous context, membership, role or permission" | **= INV-B3-CTX-004** |
| `LEG-001` | "`empresaId` … transitional" | base de la reconciliación §16.1 |

**Conclusión 4.2:** B2 ya posee la familia `CTX-*` completa. Una familia `INV-B3-CTX-*` sería la **tercera** numeración del mismo contenido (tras `INV-CONTEXT-001` y `CTX-001..004`).

## 4.3 R5 / v0.2

| ID | Cubre | Evidencia |
|---|---|---|
| `INV-ID-004` — Business isolation | §7; "no decide: mecanismo físico" | `00-R5-BASELINE:72-78` `[C]` |
| `INV-PUR-003` — Purchase Business isolation | 6, 7 (dominio Compras) | `:364` `[C]` |
| `INV-AUDIT-002` — Business audit isolation | 6 (dominio Audit) | `:588` `[C]` |
| v0.2 R8 CLOSURE, 6 propiedades | 1, 2, 4, 11, §7, JWT | `00-INVARIANTS-v0.1:658-666` `[C]` |

**Nota:** `INV-PUR-003` es relevante y fue omitido por el contrato B3: existe un invariant de aislamiento **específico de Compras**, que es exactamente el dominio del defecto `crearDevolucion`. Ver §7.4.

## 4.4 Tests/Evals existentes

| TE | Invariant | Criterio | Cubre |
|---|---|---|---|
| `TE-ID-005` | `INV-CONTEXT-001` | "Invalid Business Context fails closed" | **11** |
| `TE-ID-006` | `INV-CONTEXT-001` | "A client-supplied Business identifier cannot override the established Business Context" | **4** |
| `TE-ID-008` | `INV-TEN-001` | "Business A resources cannot be read through Business B context" | **6** |
| `TE-ID-009` | `INV-TEN-001` | "Business A resources cannot be updated or deleted through Business B context" | **7** |
| `TE-ID-010` | `INV-TEN-001` | "Unique lookups cannot expose a resource belonging to another Business" | **8** |
| `TE-ID-011` | `INV-TEN-001` | "Nested/related persistence cannot escape Business ownership" | **9** |
| `TE-TEN-001` | `INV-TEN-001` | "resource remains associated with its Business context" | 6, 7 |

**Conclusión 4.4 — la más importante de la sección:** existen **6 criterios de test ya SPECIFIED** que cubren las propiedades 4, 6, 7, 8, 9 y 11. El contrato B3 §22 propuso TC-B3-01..24 **sin enlazarlos a estos** (solo mencionó TE-TEN-001 en su §22.4, omitiendo TE-ID-005..011). Esto es una omisión material: al derivar tests, TC-B3-01 duplicaría TE-ID-008, TC-B3-02/03 duplicarían TE-ID-009, TC-B3-04 duplicaría TE-ID-010, TC-B3-06 duplicaría TE-ID-011, TC-B3-13 duplicaría TE-ID-005 y TC-B3-16 duplicaría TE-ID-006.

---

# 5. 12-PROPERTY COVERAGE AUDIT

Para cada propiedad de R8-ARCH-002 §3: ¿hay invariant? ¿dominio correcto? ¿duplicado? ¿verificable? ¿depende de algo abierto? ¿se confunde contrato con evidencia?

| # | Propiedad | ¿Invariant? | Dominio correcto | ¿Duplicado? | Verificable | Depende de abierto | Contrato vs evidencia |
|---|---|---|---|---|---|---|---|
| **1** | Context requerido | **SÍ** — `INV-CONTEXT-001` (B1), `CTX-001` (B2) | **B1/B2, no B3** | **SÍ** — INV-B3-CTX-001 es triple duplicado | Sí — TE-ID-005 parcial | Transporte OPEN (ARCH-003 §13.8) | No confundido |
| **2** | Membership válida | **SÍ** — `INV-MEM-001`, `INV-CONTEXT-001`, `CTX-003`, `MEM-003` | **B1/B2** | **SÍ** — INV-B3-CTX-002 | Sí, cuando exista Membership | **Schema Membership OPEN** (§13.12) | No confundido |
| **3** | Membership ACTIVE | **SÍ** — `INV-MEM-002`, `MEM-002` | **B1/B2** | **SÍ** | Sí, cuando exista Membership | Schema Membership OPEN | No confundido |
| **4** | No client override | **SÍ** — `INV-CONTEXT-001`, `CTX-002` + `TE-ID-006` | **B1/B2** | **SÍ** — INV-B3-CTX-003 | **Sí pero trivialmente** (sin superficie) | Switching transport OPEN (§13.7) | **Riesgo:** pasar TE-ID-006 hoy no verifica la propiedad |
| **5** | Create ownership | **PARCIAL** — ningún invariant lo enuncia; implícito en `INV-TEN-001` | **B3 legítimo** | No | Sí | No | No confundido |
| **6** | Read isolation | **SÍ** — `INV-TEN-001` + `TE-ID-008` | **B1** | **SÍ** — INV-B3-DATA-002 | Sí | No | No confundido |
| **7** | Mutation isolation | **SÍ** — `INV-TEN-001` + `TE-ID-009` | **B1** | **SÍ** — INV-B3-DATA-003 | Sí | No | No confundido |
| **8** | Unique lookup isolation | **SÍ** — `INV-TEN-001` + `TE-ID-010` | **B1** | **SÍ** — INV-B3-UNIQ-001 | Sí | No | No confundido |
| **9** | Related/nested ownership | **SÍ a nivel grueso** — `INV-TEN-001` + `TE-ID-011`; **NO** para FK de entrada | **B3 legítimo para FK** | Parcial — INV-B3-NEST-001 duplica; **INV-B3-FK-001/002 NO** | Sí | No | No confundido |
| **10** | Transaction isolation | **NO** — B4 §142: "sin invariant propio" `[D]` | **B3 legítimo** | No | Sí (conductual) | No | **SÍ se confunde** — ver §9 |
| **11** | Fail closed | **SÍ (contexto)** — `INV-CONTEXT-001`, `AUT-004` + `TE-ID-005`. **NO (operación no soportada)** | **B3 legítimo para operación** | Parcial — INV-B3-CTX-004 duplica | Sí | AUT-004 marcado CONDITIONAL en B2 | No confundido |
| **12** | Cross-Business negative verification | **NO ES UN INVARIANT** — es un requisito de verificación | **Ninguno — ver §5.2** | n/a | n/a | n/a | **SÍ se confunde en el contrato B3** |

## 5.1 Resultado

**12/12 propiedades tienen cobertura** — pero la distribución real es:

| Origen de la cobertura | Propiedades |
|---|---|
| **B1 / B2 (ya existente)** | 1, 2, 3, 4, 6, 7, 8, 11(contexto) |
| **B3 legítimo (hueco real)** | 5, 9(FK), 10, 11(operación) |
| **No es invariant** | 12 |

**Solo 4 de 12 propiedades justifican un invariant B3.** La afirmación del contrato B3 de que "12/12 tienen cobertura contractual" es correcta pero se usó para derivar 20 invariants, cuando 8 de las 12 propiedades ya están cubiertas por invariants ajenos a B3.

## 5.2 Defecto de categoría en la propiedad 12 — WRONG DOMAIN

El contrato B3 §18 mapea la propiedad 12 a "B3-CON-023, B3-CON-024 + familia completa" y a "todos los INV-B3". **Esto es un error de categoría.**

La propiedad 12 dice: *"Cross-Business access must be covered by negative verification"* `[D]`. Eso no es una propiedad **del sistema**: es una propiedad **del conjunto de verificación**. Un invariant describe qué debe ser siempre verdadero del sistema; "debe existir un test" no lo es.

**Clasificación correcta:** la propiedad 12 es un **gate de readiness**, no un invariant. Precedente en el propio set B2: `LEG-005` ("legacy retirement is a separate cutover task") está clasificado **"NOT TEST-DERIVABLE / process/gate rule"** `[D]` — exactamente el mismo tratamiento.

---

# 6. OWNERSHIP AUDIT

## 6.1 Clasificación verificada

Reproducida independientemente del schema `[C]`:

| Clase | Nº | Modelos |
|---|---|---|
| **DIRECT** | 28 | 26 en la allow-list + `PagoProveedor` (`:1061`), `DevolucionProveedor` (`:1082`) |
| **DERIVED** | 10 | UsuarioPermiso, VentaItem, PedidoItem, AplicacionPago, AperturaCaja, MovimientoCaja, ArqueoCaja, CierreCaja, CompraItem, DevolucionProveedorItem |
| **GLOBAL** | 2 | Empresa (el tenant), Permiso (catálogo) |
| **AMBIGUOUS** | 2 | Legajo, DocumentoLegajo (`:520-523`, dos FK `@unique` opcionales) |
| **UNKNOWN** | **0** | ninguno quedó sin clasificar |

**La clasificación del contrato B3 es correcta y la confirmo.** No hay modelos UNKNOWN.

## 6.2 Pregunta crítica del encargo

> ¿El invariant realmente protege el ownership o simplemente repite "debe existir empresaId"?

**Respuesta: el invariant propuesto `INV-B3-OWN-001` NO protege el ownership — está UNDER-SPECIFIED.**

Texto propuesto: *"Una entidad con ownership derivado está sujeta a las mismas obligaciones que una con ownership directo."*

El problema: la propiedad enuncia **equivalencia de obligaciones** sin enunciar **cómo se determina el tenant de la entidad derivada**. Un invariant así no es verificable: para testear que `VentaItem` cumple las mismas obligaciones que `Venta`, hay que saber primero que el tenant de `VentaItem` **es** el de su `Venta`. Esa es la propiedad sustantiva y falta.

**Formulación corregida (`ISO-003`, sec. 15):**

> El Business de una entidad sin identificador de Business propio se determina por su relación de pertenencia, y esa determinación es única. La entidad queda sujeta a las mismas obligaciones de aislamiento que una entidad con identificador propio.

La primera frase ("se determina por su relación de pertenencia, y es única") es la que hace el invariant verificable, y **es la que falta en el candidato original**.

**En cuanto a "repite que debe existir empresaId":** ni el candidato original ni la corrección lo hacen, y es correcto que no lo hagan. Exigir `empresaId` en los 10 modelos derivados sería prescribir schema, prohibido por R8-ARCH-002 §4 y por `06-R8-ID-003` §5 `[D]`. **La formulación debe ser agnóstica del mecanismo** — y lo es, porque habla de "relación de pertenencia", no de columna.

## 6.3 Relaciones con más de una ruta de ownership

Atención especial pedida por el encargo. Verificado `[C]`:

| Entidad | Rutas | Único | Veredicto |
|---|---|---|---|
| `AplicacionPago` | → `Pago` (DIRECT) **y** → `Deuda` (DIRECT) | **Sí** — ambas rutas llevan al mismo tenant si `Pago` y `Deuda` son del mismo Business | DERIVED, resoluble. **Pero:** la unicidad depende de que no exista una `AplicacionPago` que cruce un `Pago` de A con una `Deuda` de B — que es precisamente lo que `ISO-002` debe prohibir |
| `MovimientoCaja` | → `Caja` **y** → `AperturaCaja` | Sí, misma cadena | DERIVED |
| `ArqueoCaja` | → `Caja`, → `AperturaCaja`, → `Autorizacion` | Sí | DERIVED |
| `DevolucionProveedorItem` | → `DevolucionProveedor` (DIRECT) + FK a `Producto`/`Lote` | **Sí para el tenant** (vía el padre); las FK son referencias, no rutas de ownership | DERIVED + FK |
| **`Legajo`** | → `Usuario` (opcional) **o** → `Cliente` (opcional) | **NO** — rutas mutuamente excluyentes y ambas opcionales | **AMBIGUOUS** |

**Hallazgo adicional no registrado en el contrato B3:** `AplicacionPago` tiene dos rutas de ownership que **podrían divergir**. El contrato B3 lo clasificó DERIVED sin señalar que su unicidad es *condicional* a que `ISO-002` se cumpla. Es una dependencia circular suave: `ISO-003` (unicidad de la determinación) depende de `ISO-002` (no hay vínculos cruzados). Debe registrarse al derivar los tests, no resolverse aquí.

## 6.4 AMBIGUOUS — clasificación de defecto

`INV-B3-OWN-AMBIG` → **TECHNICAL OPEN**, correctamente diferido por el contrato B3 (B3-CON-019, OPEN TECHNICAL DETAIL). Lo confirmo: resolverlo exigiría decidir modelo, prohibido por `06-R8-ID-003` §5 `[D]`.

**Pero el contrato B3 degradó una propiedad que sí es enunciable.** Su `INV-B3-OWN-002` ("la ausencia de identificador de Business no implica globalidad") fue marcada "no directamente testeable — obligación de clasificación; se verifica por revisión". **Discrepo parcialmente:** la propiedad *es* enunciable como invariant de sistema si se formula sobre el comportamiento y no sobre el proceso de clasificación:

> `ISO-004`: una entidad no clasificada explícitamente como global no recibe tratamiento global.

Esto es observable: dada una entidad sin clasificación, el sistema no debe permitir operarla sin contexto. Es la formulación correcta y es la que falta.

---

# 7. FK VALIDATION AUDIT

## 7.1 Verificación independiente del caso

| Método | FK de entrada | Validación | Evidencia |
|---|---|---|---|
| **`crearDevolucion`** (`compras.service.ts:343-398`) | `item.productoId`, `item.loteId` del DTO | **NINGUNA.** Grep sobre el método completo: cero `findMany`/`findUnique`/`findFirst` sobre `producto` o `lote`. La única operación sobre `lote` es `tx.lote.update` (línea 47 relativa), posterior a la persistencia | `[C]` confirmado independientemente |
| **`crearCompra`** (`:99-135`) | `item.productoId` del DTO | **SÍ.** `db.producto.findMany({where:{id:{in:productoIds}}})` scoped (`:108`) + bucle que lanza `NotFoundException` por item ausente (`:110-114`) | `[C]` confirmado |

**Contraste confirmado.** Ambos métodos están en el **mismo archivo**, pertenecen al **mismo dominio** y fueron escritos para el **mismo tipo de operación** (crear una entidad con items que referencian productos). Uno valida; el otro no.

**Agravante verificado:** el docstring de `crearDevolucion` (`:323-331`) afirma *"Valida que el lote (si se especifica) pertenezca al producto"* y el método no contiene ninguna comparación entre `loteId` y `productoId` `[C]`. La documentación describe una intención no implementada.

## 7.2 ¿Qué invariant falta y cuál ya existe?

| Propiedad | ¿Existe invariant? | Veredicto |
|---|---|---|
| "un recurso de A no debe ser **expuesto u operado** vía contexto B" | **SÍ** — `INV-TEN-001` | Ya existe. **No cubre el caso**: persistir una *referencia* a un `Producto` de B no es exponerlo (no se devuelve al cliente) ni operarlo (no se lee ni se modifica) |
| "nested/related persistence cannot escape Business ownership" | **SÍ** — `TE-ID-011` sobre `INV-TEN-001` | Ya existe a nivel de criterio. **Cubre parcialmente**: el `DevolucionProveedorItem` creado sí pertenece al Business correcto (vía su padre); lo que escapa es la **referencia**, no el ownership del registro |
| "una FK recibida del cliente se valida contra el contexto antes de persistirse" | **NO** | **HUECO REAL** → `ISO-001` |
| "la integridad referencial de la base no satisface el aislamiento" | **NO** | **HUECO REAL** → `ISO-002` |
| aislamiento específico de Compras | **SÍ** — R5 `INV-PUR-003` "Purchase Business isolation" | **Omitido por el contrato B3.** Es el invariant de dominio más cercano al defecto y debe citarse como ancestro de `ISO-001/002` |

## 7.3 ¿Contractual, de invariant, o de implementación?

El encargo pregunta exactamente esto. **Respuesta: las tres cosas, en capas distintas, y el contrato B3 lo resolvió bien.**

| Capa | Estado |
|---|---|
| **Contractual** | **Ya existía** y se incumple. `C-COEX-004` obliga a que "related/nested persistence cannot cross Business" `[D]`. El contrato B3 lo reconoció correctamente (su §1.1: "no es un vacío contractual sino un incumplimiento de un contrato que ya existe"). **Suscribo esta lectura.** |
| **De invariant** | **Falta.** Ningún invariant hace la obligación verificable a nivel de FK de entrada. `INV-TEN-001` no alcanza (§7.2). → `ISO-001`, `ISO-002` |
| **De implementación** | **Es un defecto concreto**, con el patrón correcto ya presente en el mismo archivo (`crearCompra`). No requiere diseño nuevo |

## 7.4 ¿Se está inventando un mecanismo?

**No, y esto es verificable.** La formulación de `ISO-001` ("una FK recibida del cliente se valida contra el contexto antes de persistirse") describe un comportamiento observable, no una técnica. Y el comportamiento **ya existe en 4 de 5 sitios** del repo `[C]`:

| Sitio | Patrón |
|---|---|
| `ventas.service.ts` `resolverItems()` | `db.producto.findMany` scoped + rechazo |
| `tienda.service.ts:158-163` | `db.producto.findMany` scoped + rechazo |
| `compras.service.ts:107-114` | `db.producto.findMany` scoped + rechazo |
| `caja.service.ts:132-136` | `db.usuario.findUnique` scoped |
| `compras.service.ts:357-367` | **ninguno** |

**Un invariant que describe lo que 4 de 5 sitios ya hacen no inventa mecanismo.** Clasificación: `ISO-001` y `ISO-002` → **ACCEPTABLE**.

**Observación de rigor:** el contrato B3 contó 5 nested writes y corrigió al AS-IS audit (que contó 4). Verifiqué: la corrección es correcta, `compras.service.ts:128` existe y valida `[C]`. El contrato B3 hizo bien en registrarlo.

---

# 8. NESTED WRITE AUDIT

## 8.1 Confirmación del AS-IS

Verificado independientemente con grep sobre `apps/api/src`, excluyendo specs `[C]`:

| Operación | Usos | Confirmado |
|---|---|---|
| `connect:` | **0** | ✓ (única coincidencia: comentario en `catalogo.controller.ts:104` explicando por qué **no** se usa) |
| `connectOrCreate` | **0** | ✓ |
| nested `update` | **0** | ✓ |
| nested `delete` / `deleteMany:` | **0** | ✓ |
| `set:` / `disconnect` | **0** | ✓ |
| nested `create` | **5 sitios** | ✓ |

**Conclusión:** correcto no marcarlos como bugs actuales. El encargo lo pide explícitamente y el contrato B3 lo cumplió.

## 8.2 Auditoría del candidato prospectivo

`INV-B3-NEST-002` propuesto: *"Ninguna forma de vinculación o lectura de relaciones expone ni crea ownership cross-Business."*

**Defecto: UNDER-SPECIFIED — mezcla dos propiedades heterogéneas.**

"Expone" (lectura, `include`) y "crea ownership" (escritura, `connect`) son propiedades distintas con verificabilidad distinta:

- la parte de **lectura** es verificable hoy (hay `include` en el código) y es **condicional a `ISO-002`**: el contrato B3 lo reconoció correctamente al llamarla "obligación dependiente";
- la parte de **escritura** es **prospectiva** (operación inexistente).

Fusionarlas produce un invariant que es simultáneamente verificable-hoy y no-verificable-hoy. No es derivable a test como unidad.

**Corrección:** la parte de lectura se absorbe en `ISO-002` (si no hay vínculos cruzados, no hay nada cruzado que un `include` pueda exponer — es consecuencia, no invariant independiente). La parte de escritura **no necesita invariant propio**: `ISO-001` y `ISO-002` están formulados sobre "una FK recibida del cliente" y "un vínculo entre entidades", sin nombrar la operación Prisma. **Cubren `connect` y `connectOrCreate` automáticamente cuando aparezcan.**

**Resultado: no se requiere ningún invariant prospectivo.** `INV-B3-NEST-002` → **UNDER-SPECIFIED, eliminar**. Esto es una simplificación real: el contrato B3 creó B3-CON-012 como "condicional prospectiva", lo cual es correcto **a nivel de contrato** (donde se enumeran operaciones), pero a nivel de invariant la formulación agnóstica ya lo cubre y un invariant condicional separado es innecesario.

## 8.3 `INV-B3-NEST-001`

Propuesto: *"Una escritura anidada no crea ownership cross-Business."*

**Defecto: DUPLICATE.** Es literalmente `TE-ID-011` ("Nested/related persistence cannot escape Business ownership") elevado a invariant, sobre `INV-TEN-001` que ya lo soporta `[C]`. No aporta propiedad nueva. → **eliminar**.

---

# 9. TRANSACTION AUDIT

## 9.1 La propiedad conceptual

Debe existir, conforme al encargo: *"Business isolation se conserva dentro de transaction boundaries."*

**Verificado que NO existe invariant:** B4 §142 lo consigna como "sin invariant propio" `[D]`; ningún ID de R5, v0.2, B1 o B2 la enuncia `[C]`. **Hueco real** → `ISO-006`.

## 9.2 Estado AS-IS

| Hecho | Evidencia |
|---|---|
| 11 transacciones, todas sobre cliente extendido, un `empresaId` por closure; ninguna mezcla tenants | `[C]` |
| 3 services derivan `EmpresaScopedTx` del cliente extendido | `inventario.service.ts:12`, `compras.service.ts:16`, `tienda.service.ts:13` `[C]` |
| `ITXClientDenyList` no excluye los hooks de query | `node_modules/.prisma/client/index.d.ts:493,4504` `[C]` |
| `tienda.service.ts:230` documenta el fail-closed operando **dentro** de `tx` | `[C]`/`[D]` |
| Que `$extends` siga activo en el `tx` **en ejecución** | **`[ND]`** |

## 9.3 Defecto: WRONG EVIDENCE

El encargo es explícito: *"No permitir que un invariant sea marcado como 'verified'."*

**El candidato `INV-B3-TX-001` del contrato B3 no está marcado "verified"** — su §21 no asigna clase de evidencia a ningún candidato. Pero el contrato B3 §24 declaró el gate "Invariant Derivation Readiness: **PASS** WITH RECONCILIATION" con el argumento "19 de 20 candidatos son derivables ahora", **sin excluir `INV-B3-TX-001`**, cuya propiedad central es `[ND]`.

**Clasificación: WRONG EVIDENCE.** La propiedad "la transacción conserva el contexto" es:
- **conductualmente verificable** (se puede escribir un test) → derivable;
- **no verificada** por ejecución → `[ND]`;
- y su cumplimiento AS-IS depende de un comportamiento de Prisma 5.22.0 **no confirmado empíricamente**.

**Corrección:** `ISO-006` debe llevar explícitamente **`[D]` como invariant + `[ND]` para su cumplimiento AS-IS**, y su testabilidad debe marcarse **STABLE FOR TEST DERIVATION** (el test se puede escribir) pero su estado AS-IS **NOT VERIFIED**. La distinción es exactamente la que el encargo pide no perder.

## 9.4 `INV-B3-TX-002`

Propuesto: *"El SQL crudo y el acceso directo dentro de una transacción están sujetos a la misma obligación."*

**Clasificación: ACCEPTABLE**, con una observación. Es una propiedad real (el raw SQL no pasa por el mecanismo `[C]`) y no duplica nada. **Pero** se solapa parcialmente con `ISO-008` (operación Business-scoped no escapa del aislamiento): un `$executeRaw` sin filtro **es** una operación Business-scoped fuera del aislamiento.

**Decisión de auditoría:** mantenerlo como invariant separado es **defendible** porque la transacción añade una dimensión propia (la obligación debe sostenerse *dentro* del boundary transaccional, no solo fuera). Lo conservo como `ISO-006` segunda frase en lugar de ID separado, para no inflar el set. Ver sec. 15.

---

# 10. PRE-CONTEXT / BYPASS AUDIT

## 10.1 La distinción exigida

El encargo es taxativo: **no considerar** login, autenticación Google, inicialización de auth ni bootstrap de sesión como vulnerabilidades automáticas de tenant isolation.

**Verificado que el contrato B3 respeta esto.** Su B3-CON-022 clasifica los 12 sitios de `auth*` + 3 de `invitaciones` como "pre-context legitimate access" y argumenta correctamente: el `empresaId` es el *resultado* del login, no una restricción previa; `Usuario.email` y `Cliente.googleId` son únicos globales por diseño (R5-IDENTITY-004) `[D]`; usar el cliente scoped es imposible por definición `[C]`. **Suscribo.**

## 10.2 Defecto en `INV-B3-BYP-001` — WRONG DOMAIN + DUPLICATE

Propuesto: *"Una operación pre-contexto es legítima sin Business Context."*

**Esto no es un invariant.** Un invariant enuncia lo que debe ser **siempre verdadero**; este enuncia una **excepción al alcance** de otros invariants. Es una cláusula de alcance (*scoping clause*), no una propiedad del sistema.

**Duplicación:** la propiedad ya está en los invariants existentes por construcción. `INV-CONTEXT-001` dice "a **protected** Business-scoped operation has one effective Business context" `[C]` — el adjetivo *protected* **ya excluye** las operaciones pre-contexto. Lo mismo `CTX-001` de B2 y `AUT-001` ("the JWT authenticates, it does not authorize").

**Corrección:** eliminar como invariant. La exclusión pertenece a la **cláusula de alcance** del set B3 (sec. 15.2), igual que `INV-CONTEXT-001` la resuelve con una palabra.

**Precedente a favor:** el contrato B3 propuso `TC-B3-23` ("el login funciona sin contexto") como test positivo-guardarraíl. **Ese test sigue siendo válido y necesario** aunque el invariant desaparezca: verifica que endurecer `ISO-008` no rompa el login. Un test puede existir sin invariant propio cuando protege contra una regresión de alcance.

## 10.3 `INV-B3-BYP-002` — IMPLEMENTATION LEAK

Propuesto: *"Ninguna operación Business-scoped se ejecuta fuera del aislamiento esperado."*

**Defecto: IMPLEMENTATION LEAK en la expresión "el aislamiento esperado".**

"Esperado" no es observable. En el contexto del AS-IS, "el aislamiento esperado" significa de facto "el que aplica `empresaScopeExtension`" — es decir, el invariant presupone el mecanismo actual. Eso viola la regla de formular invariants sin asumir ORM, protocolo o mecanismo (R8-ARCH-002 §4; `08-R8-ARCH-003` §13.11 mantiene el enforcement OPEN) `[D]`.

**Formulación corregida (`ISO-008`):**

> Una operación Business-scoped queda sujeta a las obligaciones de aislamiento con independencia de la vía por la que se ejecute.

Esta versión es observable (se testea ejecutando la misma operación por dos vías y comparando el resultado) y agnóstica del mecanismo.

## 10.4 `INV-B3-BYP-003` / enumerabilidad — PROCESS RULE

El contrato B3 propuso B3-CON-024 ("la superficie no scoped debe ser enumerable y auditable") sin asignarle invariant en su §21 — correcto. **Lo confirmo: es una regla de proceso, no un invariant.** Precedente: `LEG-005` en B2, clasificado "process/gate rule — NOT TEST-DERIVABLE" `[D]`.

## 10.5 R14 — conclusión

| Clase | Sitios | Veredicto |
|---|---|---|
| **PRE-CONTEXT LEGITIMATE ACCESS** | 12 en `auth*`, 3 en `invitaciones` (lookup por token/email), 3 scripts offline, `health` | **NO es vulnerabilidad.** Excluido por la cláusula de alcance |
| **BUSINESS-SCOPED BYPASS** | `invitaciones.service.ts:118-131, 227-240` (`create` de modelos cubiertos con cliente crudo); `legajo.service.ts:66-174`; `legajo.controller.ts`/`legajo.cliente.controller.ts` | **SUJETO a `ISO-008`.** Ninguno produce cruce hoy `[C]`, pero el aislamiento depende de disciplina |

---

# 11. CROSS-BUSINESS AUDIT

Verificación de que la matriz negativa contempla A → B para cada comportamiento, **cuando el comportamiento existe o es prospectivamente relevante**.

| Comportamiento | ¿Existe? | TE existente | Invariant corregido | Cobertura |
|---|---|---|---|---|
| **read** A → B | Sí | **`TE-ID-008`** | `INV-TEN-001` (B1) | **CUBIERTA — no requiere B3** |
| **unique lookup** A → B | Sí | **`TE-ID-010`** | `INV-TEN-001` (B1) | **CUBIERTA — no requiere B3** |
| **update** A → B | Sí | **`TE-ID-009`** | `INV-TEN-001` (B1) | **CUBIERTA — no requiere B3** |
| **delete** A → B | Sí (operación existe en Prisma; **cero usos en services** `[C]`) | **`TE-ID-009`** | `INV-TEN-001` (B1) | **CUBIERTA** |
| **create relation** con FK de B | Sí | **ninguno** | **`ISO-001`, `ISO-002`** | **HUECO → B3** |
| **nested FK** cross-business | Sí (`DevolucionProveedorItem`) | `TE-ID-011` (parcial — cubre ownership del registro, no la referencia) | **`ISO-002`** | **HUECO PARCIAL → B3** |
| **transaction** cross-business | No existe el caso (ninguna transacción mezcla tenants `[C]`) | ninguno | **`ISO-006`** | **HUECO → B3** |
| **idempotency lookup** A → B | Sí (`ventas.service.ts:117`) | `TE-ID-010` cubre la **no-exposición**; nada cubre la **colisión** | **`ISO-005`** | **HUECO PARCIAL → B3** |
| create con `empresaId` de A en payload | Sí | `TE-ID-006` | `INV-CONTEXT-001` (B1) | **CUBIERTA** |
| contexto ausente / inválido | Sí | `TE-ID-005` | `INV-CONTEXT-001` (B1) | **CUBIERTA** |
| Membership ausente / INACTIVE | **No aplicable hoy** (sin Membership `[C]`) | ninguno | `INV-MEM-002`, `MEM-002` (B1/B2) | **CUBIERTA; no verificable aún** |
| Business switch inválido | **No aplicable hoy** | ninguno | `CTX-004` (B2) | **CUBIERTA; no verificable aún** |
| operación no soportada (`upsert`/`groupBy`) | Sí — **falla cerrada** `[C]` | **ninguno** | **`ISO-007`** | **HUECO → B3** |
| derived entity A → B | Sí | ninguno | **`ISO-003`** | **HUECO → B3** |

## 11.1 Hallazgo: un hueco que el contrato B3 no identificó como invariant

**`ISO-007` — fail-closed por operación no soportada.**

Es la **mejor propiedad verificada del AS-IS**: `empresa-scope.extension.ts:164-166` lanza ante cualquier operación no enumerada, y su efecto es observable en el código (`tienda.service.ts:230` documenta haber evitado `upsert` por eso; cero usos de `upsert`/`groupBy` en todo `src`) `[C]`.

El contrato B3 la mencionó repetidamente como propiedad a PRESERVAR y la asignó a B3-CON-003… **pero B3-CON-003 es sobre el contexto** ("contexto ausente vs inválido"), no sobre la operación. En su §21, el mapeo `B3-CON-003 → INV-B3-CTX-004` produce un invariant de **contexto**, dejando el fail-closed **por operación** sin invariant.

**Clasificación: MISSING.** Es la propiedad más sólida del sistema actual y se quedaría sin invariant y sin test. `INV-CONTEXT-001` cubre "missing or invalid **context** fails closed", no "operación no soportada falla cerrada". Son propiedades distintas.

---

# 12. EVIDENCE AUDIT

Regla del encargo: no aceptar "covered by contract" como "verified by implementation"; no aceptar `[T]`/`[E]` sin ejecución explícita.

| Invariant corregido | Clase como invariant | Clase del cumplimiento AS-IS | Confusión detectada |
|---|---|---|---|
| `ISO-001` FK validada | `[D]` derivado de ARCH-002 §3.9 | **`[C]` INCUMPLIDO** en 1 de 5 sitios | No |
| `ISO-002` integridad referencial insuficiente | `[D]` | **`[C]` SIN MECANISMO** en ninguna capa | No |
| `ISO-003` ownership derivado | `[D]` derivado de §3.9 + §6 | `[C]` por disciplina en 10 modelos | No |
| `ISO-004` no-presunción de globalidad | `[D]` | `[C]` 2 de 14 son globales legítimos | No |
| `ISO-005` identificador de negocio no global | `[D]` derivado de §3.8 | **`[C]` INCUMPLIDO** (`idempotencyKey` global) | No |
| `ISO-006` transacción mono-contexto | `[D]` | `[C]` por construcción · **`[ND]` por ejecución** | **SÍ — ver §9.3** |
| `ISO-007` fail-closed por operación | `[D]` derivado de §3.11 | `[C]` CUMPLIDO (mejor propiedad del AS-IS) | No |
| `ISO-008` independencia de la vía | `[D]` derivado de §7 | `[C]` CUMPLIDO de hecho, por disciplina | No |

## 12.1 Confusiones detectadas en la derivación auditada

| # | Confusión | Dónde | Clase |
|---|---|---|---|
| 1 | Gate "Invariant Derivation Readiness: PASS" con 19/20 derivables, sin excluir el candidato cuya propiedad es `[ND]` | contrato B3 §24 | **WRONG EVIDENCE** |
| 2 | Propiedad 12 (verificación negativa) mapeada a invariants, siendo un gate | contrato B3 §18 | **WRONG DOMAIN** |
| 3 | "12/12 propiedades con cobertura contractual" usado para justificar 20 invariants, cuando 8 ya están cubiertas por B1/B2 | contrato B3 §1, §18 | **DUPLICATE** (consecuencia) |

**Confusión que NO se detectó (crédito donde corresponde):** el contrato B3 fue riguroso en no emitir `[T]`/`[E]`, lo declaró en su encabezado, y repitió la advertencia en su veredicto ("no se declara el aislamiento garantizado… cero tests"). En eso la derivación es correcta.

## 12.2 Estado global de evidencia

**Cero `[T]`, cero `[E]` en todo el corpus B1/B2/B3.** Confirmado: único spec del repo es `health.controller.spec.ts`; `apps/api/test/` no existe aunque `package.json` lo referencie `[C]`. Ningún invariant de ningún bloque puede declararse verificado.

---

# 13. TESTABILITY AUDIT

Clasificación por invariant corregido, usando las categorías del encargo.

| Invariant | Clasificación | Fundamento |
|---|---|---|
| **`ISO-001`** FK validada | **STABLE FOR TEST DERIVATION** | Observable directamente: invocar `crearDevolucion` con `productoId` de otro Business y verificar rechazo. Fixture ya existe (`empresaAislamiento`) `[C]` |
| **`ISO-002`** integridad referencial insuficiente | **STABLE FOR TEST DERIVATION** | Observable: verificar que no exista vínculo persistido entre entidades de distintos Business |
| **`ISO-003`** ownership derivado | **STABLE FOR TEST DERIVATION** | Observable por entidad derivada; 10 modelos enumerados. **Condicionado a `ISO-002`** para `AplicacionPago` (§6.3) |
| **`ISO-004`** no-presunción de globalidad | **CONDITIONAL** | Observable solo tras clasificar explícitamente; depende de que la clasificación sea un artefacto del sistema y no solo documental |
| **`ISO-005`** identificador de negocio no global | **STABLE FOR TEST DERIVATION** | Observable: reusar un `idempotencyKey` de A en B. **Falla esperado hoy** `[C]` |
| **`ISO-006`** transacción mono-contexto | **STABLE FOR TEST DERIVATION** (el test es escribible) · **estado AS-IS NOT VERIFIED** `[ND]` | Distinción obligatoria del §9.3. Máxima prioridad: cierra el único `[ND]` de mecanismo |
| **`ISO-007`** fail-closed por operación | **STABLE FOR TEST DERIVATION** | Observable: invocar `upsert`/`groupBy` sobre modelo cubierto y verificar excepción. **Hoy pasaría** `[C]` |
| **`ISO-008`** independencia de la vía | **CONDITIONAL** | Observable comparando dos vías de ejecución; pero "todas las vías" no es enumerable sin la regla de proceso (§10.4), que no es invariant |
| `ISO-AMBIG` (Legajo) | **NOT TESTABLE YET** | TECHNICAL OPEN: el tenant no es determinable sin decisión de modelo `[C]` |
| enumerabilidad de la superficie | **PROCESS RULE** | No es invariant. Precedente: `LEG-005` en B2 `[D]` |

**Resumen:** 6 STABLE · 2 CONDITIONAL · 1 NOT TESTABLE YET · 1 PROCESS RULE.

**Comparación con lo propuesto:** el contrato B3 declaró "19 de 20 derivables ahora". **Corrección: 6 de 8 estables, 2 condicionales.** La diferencia proviene de (a) eliminar 12 duplicados que eran derivables solo porque duplicaban invariants ya derivables, y (b) separar derivabilidad del test de verificación del estado AS-IS en `ISO-006`.

---

# 14. DUPLICATE / MISSING / OVER-SPECIFICATION FINDINGS

## 14.1 Matriz de auditoría

| Invariant propuesto | Contract | R8 Rule | Existing Equivalent | Gap | Evidence | Testability | Issue |
|---|---|---|---|---|---|---|---|
| `INV-B3-CTX-001` | B3-CON-001/004 | 1 | **`INV-CONTEXT-001`** (B1) + **`CTX-001`** (B2) | ninguno | `[D]` | n/a | **DUPLICATE** (triple) |
| `INV-B3-CTX-002` | B3-CON-002 | 2, 3 | **`INV-MEM-002`**, **`INV-CONTEXT-001`** (B1); **`MEM-002`**, **`CTX-003`** (B2) | ninguno | `[D]` | n/a | **DUPLICATE + WRONG DOMAIN** (es B2) |
| `INV-B3-CTX-003` | B3-CON-014/015 | 4 | **`INV-CONTEXT-001`** (B1); **`CTX-002`** (B2); **`TE-ID-006`** | ninguno | `[D]` | n/a | **DUPLICATE + WRONG DOMAIN** |
| `INV-B3-CTX-004` | B3-CON-003/005 | 11 | **`INV-CONTEXT-001`** (B1); **`AUT-004`**, **`CTX-004`** (B2); **`TE-ID-005`** | ninguno | `[D]` | n/a | **DUPLICATE** |
| `INV-B3-DATA-001` | B3-CON-006 | 5 | ninguno enuncia create-ownership | **real, menor** | `[C]` | STABLE | **ACCEPTABLE pero absorbible** — ver 14.3 |
| `INV-B3-DATA-002` | B3-CON-007 | 6 | **`INV-TEN-001`** + **`TE-ID-008`** | ninguno | `[D]` | n/a | **DUPLICATE** |
| `INV-B3-DATA-003` | B3-CON-008/009 | 7 | **`INV-TEN-001`** + **`TE-ID-009`** | ninguno | `[D]` | n/a | **DUPLICATE + OVER-SPECIFIED** (fusiona update/delete + cláusula de mecanismo) |
| `INV-B3-UNIQ-001` | B3-CON-010 | 8 | **`INV-TEN-001`** + **`TE-ID-010`** | ninguno | `[D]` | n/a | **DUPLICATE** |
| `INV-B3-UNIQ-002` | B3-CON-016 | 8 | **ninguno** | **real** | `[C]` incumplido | STABLE | **ACCEPTABLE** → `ISO-005` |
| `INV-B3-NEST-001` | B3-CON-011 | 9 | **`INV-TEN-001`** + **`TE-ID-011`** | ninguno | `[D]` | n/a | **DUPLICATE** |
| `INV-B3-NEST-002` | B3-CON-012/013 | 9 | parcial `TE-ID-011` | mezcla | `[C]` 0 usos | n/a | **UNDER-SPECIFIED** (lectura + escritura) |
| `INV-B3-FK-001` | **B3-CON-017** | 9 | **ninguno** (`INV-TEN-001` no alcanza, §7.2) | **real** | `[C]` incumplido | STABLE | **ACCEPTABLE** → `ISO-001` |
| `INV-B3-FK-002` | **B3-CON-018** | 9 | **ninguno** | **real** | `[C]` sin mecanismo | STABLE | **ACCEPTABLE** → `ISO-002` |
| `INV-B3-OWN-001` | B3-CON-014 | 6, 9 | ninguno | **real** | `[C]` | STABLE | **UNDER-SPECIFIED** (falta la unicidad) → `ISO-003` |
| `INV-B3-OWN-002` | B3-CON-015 | 9 | ninguno | **real** | `[C]` | CONDITIONAL | **UNDER-SPECIFIED** (degradado a proceso) → `ISO-004` |
| `INV-B3-TX-001` | B3-CON-020 | 10 | **ninguno** | **real** | `[C]`+**`[ND]`** | STABLE / AS-IS no verificado | **WRONG EVIDENCE** → `ISO-006` |
| `INV-B3-TX-002` | B3-CON-021 | 10 | ninguno | real, solapa `ISO-008` | `[C]` | STABLE | **ACCEPTABLE, absorbible** → `ISO-006` 2ª frase |
| `INV-B3-BYP-001` | B3-CON-022 | — | implícito en "**protected**" de `INV-CONTEXT-001` | ninguno | `[D]` | n/a | **DUPLICATE + WRONG DOMAIN** (es cláusula de alcance) |
| `INV-B3-BYP-002` | B3-CON-023 | §7 | ninguno | **real** | `[C]` | CONDITIONAL | **IMPLEMENTATION LEAK** ("esperado") → `ISO-008` |
| *(diferido)* | B3-CON-019 | §6 | ninguno | real | `[C]` | NOT TESTABLE YET | **TECHNICAL OPEN** → `ISO-AMBIG` |
| **AUSENTE** | — | **11** | `INV-CONTEXT-001` cubre contexto, **no operación** | **real** | `[C]` cumplido | STABLE | **MISSING** → `ISO-007` |

## 14.2 Conteo

| Clase | Nº |
|---|---|
| DUPLICATE | 8 |
| WRONG DOMAIN | 3 (solapados con DUPLICATE) |
| UNDER-SPECIFIED | 3 |
| OVER-SPECIFIED | 1 |
| IMPLEMENTATION LEAK | 1 |
| WRONG EVIDENCE | 1 |
| MISSING | 1 (`ISO-007`) + 1 degradado (`ISO-004`) |
| TECHNICAL OPEN | 1 |
| ACCEPTABLE | 4 |
| **OWNER CONFLICT** | **0** |

## 14.3 Nota sobre `INV-B3-DATA-001` (create ownership)

Caso límite. Ningún invariant existente enuncia "el Business de una entidad creada proviene del contexto" — `INV-TEN-001` dice que el recurso "remains associated with exactly one applicable Business context", lo cual presupone la asignación sin enunciarla, y `TE-ID-006` cubre el intento de override por el cliente.

**Decisión de auditoría: absorbible, no admitir como ID separado.** Razón: `ISO-001` ("una FK recibida del cliente se valida contra el contexto") y `TE-ID-006` cubren juntos el riesgo observable (que un valor del cliente determine ownership). Admitir un noveno ID para una propiedad que `INV-TEN-001` presupone infla el set sin aumentar la cobertura verificable. **Se registra como observación, no como invariant.** Si al derivar tests resulta que ningún TE cubre "create asigna desde contexto" sobre los 2 modelos fuera de la allow-list, debe reabrirse.

---

# 15. CORRECTED B3 INVARIANT RECOMMENDATIONS

**8 invariants, no 20.**

## 15.1 Nomenclatura

**Prefijo `ISO-`, sin `INV-B3-`.** Fundamento: el set canónico B2 usa prefijos cortos por familia (`AUT-`, `MEM-`, `CTX-`, `PRM-`, `ROLE-`, `CUS-`, `LEG-`) `[D]`. Introducir `INV-B3-*` crearía una **tercera convención** (tras `INV-*` de R5/v0.2/B1 y las familias cortas de B2) y repetiría el problema de colisión de IDs que B2 §4 tuvo que reconciliar explícitamente. `ISO-` es libre: verificado que no colisiona con ningún ID existente `[C]`.

## 15.2 Cláusula de alcance (sustituye a `INV-B3-BYP-001`)

> Este set aplica a **operaciones Business-scoped protegidas**. Una operación cuya función es establecer o resolver la identidad y el Business — autenticación, resolución de identidad, activación por secreto, scripts fuera del plano de request — no está en su alcance. Precedente de formulación: el adjetivo "protected" en `INV-CONTEXT-001` `[C]`.

## 15.3 El set

| ID | Statement normativo | R8 Rule | Fuente | Evidencia (invariant / AS-IS) | Testabilidad |
|---|---|---|---|---|---|
| **`ISO-001`** | Un identificador de entidad relacionada recibido de un cliente se resuelve y valida contra el Business Context antes de persistirse como referencia. | 9 | ARCH-002 §3.9, §7; `C-COEX-004`; R5 `INV-PUR-003` | `[D]` / **`[C]` incumplido** (`compras.service.ts:343-398`) | **STABLE** |
| **`ISO-002`** | Ninguna entidad Business-scoped queda vinculada a una entidad perteneciente a otro Business. La integridad referencial de la base no satisface esta propiedad. | 9 | ARCH-002 §3.9, §7 | `[D]` / **`[C]` sin mecanismo en ninguna capa** | **STABLE** |
| **`ISO-003`** | El Business de una entidad sin identificador de Business propio se determina por su relación de pertenencia, y esa determinación es única. La entidad queda sujeta a las mismas obligaciones de aislamiento que una entidad con identificador propio. | 6, 7, 9 | ARCH-002 §3.9, §6 | `[D]` / `[C]` por disciplina (10 modelos) | **STABLE** (condicionada a `ISO-002` para `AplicacionPago`) |
| **`ISO-004`** | Una entidad no clasificada explícitamente como global no recibe tratamiento global. | 6, 9 | ARCH-002 §3.9, §6 | `[D]` / `[C]` (2 de 14 son globales legítimos) | **CONDITIONAL** |
| **`ISO-005`** | Un identificador cuya unicidad es semánticamente propia de un Business no se comporta como identificador global. | 8 | ARCH-002 §3.8 | `[D]` / **`[C]` incumplido** (`Venta.idempotencyKey`) | **STABLE** |
| **`ISO-006`** | Una transacción opera bajo exactamente un Business Context, y toda operación ejecutada dentro de ella —incluido el SQL crudo— queda sujeta a las mismas obligaciones de aislamiento que fuera de ella. | 10 | ARCH-002 §3.10 | `[D]` / `[C]` por construcción · **`[ND]` por ejecución** | **STABLE** para derivar el test; **estado AS-IS NOT VERIFIED** |
| **`ISO-007`** | Una operación de persistencia para la que no existe una garantía de aislamiento definida es rechazada, en lugar de ejecutarse sin ella. | 11 | ARCH-002 §3.11 | `[D]` / **`[C]` CUMPLIDO** (`:164-166`; cero `upsert`/`groupBy` en `src`) | **STABLE** |
| **`ISO-008`** | Una operación Business-scoped queda sujeta a las obligaciones de aislamiento con independencia de la vía por la que se ejecute. | §7 | ARCH-002 §7 | `[D]` / `[C]` cumplido de hecho, por disciplina | **CONDITIONAL** |

**Diferido:**

| ID | Statement | Estado |
|---|---|---|
| `ISO-AMBIG` | El Business de `Legajo`/`DocumentoLegajo` no es determinable sin resolución explícita de modelo. | **TECHNICAL OPEN** — no se deriva invariant ni test hasta que se resuelva. No crea Owner Decision: `06-R8-ID-003` §5 ya establece que ningún mapping físico está autorizado `[D]` |

**No admitido como invariant:**

| Propuesta | Clasificación |
|---|---|
| enumerabilidad de la superficie no scoped | **PROCESS RULE** (precedente: `LEG-005` en B2) |
| verificación negativa cross-Business (propiedad 12) | **READINESS GATE**, no invariant (§5.2) |
| legitimidad del acceso pre-contexto | **CLÁUSULA DE ALCANCE** (§15.2) |
| create ownership desde contexto | **OBSERVACIÓN** — absorbida por `ISO-001` + `TE-ID-006` (§14.3) |

## 15.4 Enlace obligatorio a lo existente

Para no crear una familia paralela:

| ISO | Ancestro | Relación |
|---|---|---|
| `ISO-001`, `ISO-002` | `INV-TEN-001` (B1); R5 `INV-PUR-003` | refinamiento de persistencia |
| `ISO-003`, `ISO-004` | `INV-TEN-001` | definen qué hace Business-scoped a una entidad derivada |
| `ISO-005` | `INV-TEN-001` | propiedad de unicidad, no de exposición |
| `ISO-006` | `INV-TEN-001`; v0.2 R8 CLOSURE #6 | dimensión transaccional |
| `ISO-007` | `INV-CONTEXT-001` (fail-closed de **contexto**) | fail-closed de **operación**, propiedad hermana |
| `ISO-008` | `INV-TEN-001` §7 | independencia de la vía |
| *todos* | B2 `CTX-001..004`, `MEM-002/003`, `AUT-001/004` | **upstream, no se duplica** |

---

# 16. CROSS-CONTRACT RECONCILIATION

| Tema | Resultado | Detalle |
|---|---|---|
| **Business Context** | **COMPATIBLE** — duplicación eliminada | Las 4 propuestas `INV-B3-CTX-*` se retiran. El contexto es propiedad de B1 (`INV-CONTEXT-001`) y B2 (`CTX-001..004`). B3 lo **consume** |
| **Membership** | **COMPATIBLE** — no absorbido | Ningún `ISO-*` menciona Membership. Correcto: B2 `MEM-002/003` e `INV-MEM-001/002` (B1) son los dueños. Se respeta el "CROSS-BLOCK with B3" que B2 marcó en `MEM-003` |
| **Authorization** | **COMPATIBLE** | Ningún `ISO-*` enuncia autorización. Distinción preservada: la autorización decide *si* la operación procede; el aislamiento, *a qué datos* alcanza |
| **Customer / User** | **COMPATIBLE** | `INV-CUST-002` (B1, "Customer commercial data must not cross Business") es dominio Customer, no B3. `ISO-003` lo toca solo si `Legajo` se resuelve por la rama `Cliente` — de ahí `ISO-AMBIG` |
| **Legacy coexistence** | **RECONCILIATION** | `LEG-001` (B2) establece `empresaId` como transitorio. `ISO-003`/`ISO-004` clasifican modelos por presencia de identificador de Business. **Debe quedar registrado que la clasificación describe el AS-IS y es transitoria** — no consagra `empresaId` como canónico. Reconciliación heredada del contrato B3 §24.1 y confirmada |
| **JWT** | **RECONCILIATION** | `AUT-001` (B2) dice que los claims no son la autoridad **de autorización** única. En el AS-IS el claim `empresaId` opera además como autoridad de **scope de persistencia** `[C]`. Ningún `ISO-*` lo resuelve — es B1/B2 upstream. Se registra, no se duplica |
| **Commerce** | **COMPATIBLE** | `INV-ORD-002`, `INV-CART-002`, `INV-COM-001` son dominio Commerce. `ISO-001` toca `crearDevolucion` (Compras) y `ISO-005` toca `Venta.idempotencyKey` (Ventas), pero como propiedades de persistencia, no de dominio |
| **Tests/Evals** | **RECONCILIATION OBLIGATORIA** | **Hallazgo nuevo de esta auditoría:** existen `TE-ID-005/006/008/009/010/011` que cubren las propiedades 4, 6, 7, 8, 9, 11. El contrato B3 §22 propuso TC-B3-01..24 sin enlazarlos, citando solo `TE-TEN-001`. Al derivar tests, **TC-B3-01/02/03/04/06/13/16 serían duplicados** de TE-ID-008/009/009/010/011/005/006 |
| **R5 `INV-PUR-003`** | **RECONCILIATION** | Existe un invariant de aislamiento **específico de Compras**, el dominio exacto del defecto `crearDevolucion`, omitido por el contrato B3. Debe citarse como ancestro de `ISO-001` |

**Cero contradicciones. Cero Owner Decisions nuevas.** Verificado contra R8-ARCH-002, R8-ARCH-003, R8-ID-003, R8-AUTH-001 y la tabla maestra. El set `ISO-*` cae enteramente dentro de los 10 ítems que R8-ARCH-002 §6 declara abiertos `[D]`.

---

# 17. READINESS GATES

| Gate | Pregunta | Resultado | Fundamento |
|---|---|---|---|
| **A — Cobertura de R8-ARCH-002** | ¿Las 12 propiedades están cubiertas? | **PASS** | 12/12. Distribución: 8 por B1/B2, 4 por B3 (`ISO-001/002` → 9; `ISO-006` → 10; `ISO-007` → 11-operación), 1 reclasificada como gate (prop. 12) |
| **B — No duplicación de B1/B2** | ¿El set B3 duplica? | **FAIL en la propuesta → PASS tras corrección** | 8 DUPLICATE identificados y retirados. El set corregido de 8 no colisiona con ningún ID existente `[C]` |
| **C — No invención de comportamiento** | ¿Se inventa mecanismo o modelo? | **PASS** | `ISO-001` describe lo que 4 de 5 sitios ya hacen `[C]`. Ningún `ISO-*` prescribe ORM, columna ni schema. `ISO-AMBIG` diferido en lugar de inventar modelo. `INV-B3-BYP-002` corregido por IMPLEMENTATION LEAK |
| **D — Contrato ≠ evidencia** | ¿Se confunde? | **PASS WITH RECONCILIATION** | 3 confusiones detectadas (§12.1), todas corregidas. `ISO-006` lleva explícita la separación derivabilidad/verificación |
| **E — Cobertura de gaps reales** | ¿G-B3-01..13, R4, R14? | **PASS WITH RECONCILIATION** | Cubiertos. **Hueco nuevo detectado:** fail-closed por operación (`ISO-007`), que la propuesta omitió |
| **F — DIRECT/DERIVED/AMBIGUOUS** | ¿Se distinguen? | **PASS** | 28/10/2/2, cero UNKNOWN `[C]`. `ISO-003` corregido para incluir la unicidad de la determinación |
| **G — FK ownership protegido** | ¿Hay invariant? | **PASS** | `ISO-001` + `ISO-002`. Confirmado que `INV-TEN-001` no alcanza (§7.2) |
| **H — Pre-contexto vs bypass** | ¿Se distingue? | **PASS** | Cláusula de alcance (§15.2) + `ISO-008`. Login, Google y bootstrap excluidos, conforme al encargo |
| **I — Derivable a Tests/Evals** | ¿Se puede? | **CONDITIONAL** | 6 STABLE, 2 CONDITIONAL, 1 NOT TESTABLE YET, 1 PROCESS RULE. **Condicionado** a enlazar con TE-ID-005..011 para no duplicar |

---

# 18. FINAL VERDICT

## PASS WITH RECONCILIATION

**Por qué PASS:** la cobertura de R8-ARCH-002 es real y completa (12/12), existen huecos genuinos que justifican un set B3, la clasificación de ownership es correcta y exhaustiva, el caso FK está bien diagnosticado, los nested writes inexistentes no se marcaron como bugs, el pre-contexto legítimo se distinguió correctamente del bypass, y **no hay ningún conflicto con Owner Decisions**.

**Por qué WITH RECONCILIATION y no PASS limpio:** la derivación auditada presenta **8 duplicaciones** no detectadas contra B1 y el set canónico B2, incluida una familia completa (`INV-B3-CTX-001..004`) que es triple duplicado de `INV-CONTEXT-001` (B1) y `CTX-001..004` (B2). El set debe reducirse de 20 a 8 antes de escribir cualquier archivo canónico.

**Reconciliaciones obligatorias:**

1. **Retirar los 8 DUPLICATE** y la familia `INV-B3-CTX-*` completa. El contexto es propiedad de B1/B2; B3 lo consume.
2. **Adoptar el prefijo `ISO-`** en lugar de `INV-B3-*`, para no crear una tercera convención de IDs tras el trabajo de reconciliación que B2 §4 ya tuvo que hacer.
3. **Añadir `ISO-007`** (fail-closed por operación no soportada). Es la mejor propiedad verificada del AS-IS y la propuesta la dejó sin invariant.
4. **Corregir `ISO-003`** para que enuncie la unicidad de la determinación del tenant, no solo la equivalencia de obligaciones — sin ella el invariant no es verificable.
5. **Enlazar los tests con TE-ID-005/006/008/009/010/011**, no solo con TE-TEN-001. Siete de los TC-B3 propuestos serían duplicados.
6. **Separar en `ISO-006`** la derivabilidad del test (STABLE) del estado AS-IS (`[ND]`, NOT VERIFIED).
7. **Reclasificar la propiedad 12** como readiness gate, no como invariant.
8. **Registrar** `empresaId` como clasificador transitorio (coherente con `LEG-001` de B2) y citar R5 `INV-PUR-003` como ancestro de `ISO-001`.

**Por qué no BLOCKED:** ninguna dependencia impide continuar. Las propiedades 2 y 3 no se cumplen en el AS-IS por ausencia de Membership, pero eso es dependencia de B1 ya declarada OPEN (`08-R8-ARCH-003` §13.12) `[D]`, y los `ISO-*` se enuncian correctamente sin que Membership exista.

**Por qué no FAIL:** no se encontró ninguna contradicción fundamental con la arquitectura ni con las Owner Decisions. Las duplicaciones son un defecto de derivación corregible, no un conflicto de autoridad.

**No se declara implementation readiness.** Cero `[T]`, cero `[E]` en todo el corpus. R8-ARCH-002 §3.12 exige verificación negativa cross-Business y el repositorio tiene cero tests de aislamiento `[C]`. Ningún invariant de ningún bloque puede declararse verificado.

---

# 19. EVIDENCE INDEX

## 19.1 `[C]` — código y estructura de archivos

| Ref | Ubicación | Acredita |
|---|---|---|
| C-01 | `find 07-DESIGN/INVARIANTS/**`; `git diff-tree f99458e ac555d6` | **No existe draft de invariants B3** |
| C-02 | `05-BLOCK-1-INVARIANTS-BASELINE-v0.1.md:78-86` | `INV-TEN-001` texto literal → props. 6, 7, §7 |
| C-03 | idem `:90-98` | `INV-MEM-001` → prop. 2 |
| C-04 | idem `:100-106` | `INV-MEM-002` → prop. 3 |
| C-05 | **idem `:108-118`** | **`INV-CONTEXT-001` cubre props. 1, 2, 3, 4, 11 en 4 frases** |
| C-06 | idem `:203-209, 295-307, 407, 423, 453, 243` | `INV-CUST-002`, `INV-INV-001/002`, `INV-AR-001`, `INV-CASH-001`, `INV-MSG-001`, `INV-CART-002` |
| C-07 | **`24-B2-CONTROLLED-...:166-211`** | **Set canónico B2: 34 IDs, prefijos cortos** |
| C-08 | idem `:183` | **`MEM-003` marcado "CROSS-BLOCK with B3"** |
| C-09 | idem `:189-192` | `CTX-001..004` |
| C-10 | idem `:172-176` | `AUT-001`, `AUT-004` |
| C-11 | idem `:206` | `LEG-001` — `empresaId` transitorio |
| C-12 | idem `:252-276, 313-333` | Test readiness B2; veredicto; "no procedemos automáticamente a Tests/Evals" |
| C-13 | **`05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md:70-76`** | **`TE-ID-005/006/008/009/010/011` cubren props. 4, 6, 7, 8, 9, 11** |
| C-14 | `00-R5-INVARIANTS-BASELINE:72-78, 364, 588` | `INV-ID-004`, **`INV-PUR-003`**, `INV-AUDIT-002` |
| C-15 | `00-INVARIANTS-v0.1.md:658-666` | R8 CLOSURE, 6 propiedades |
| C-16 | `00-TESTS-EVALS-v0.2.md:57` | `TE-TEN-001` |
| C-17 | **`compras.service.ts:343-398`** | **`crearDevolucion`: cero lookups de `producto`/`lote`; FK del DTO al nested create** |
| C-18 | idem `:323-331` | Docstring afirma validación no implementada |
| C-19 | **idem `:107-114`** | **`crearCompra`: `db.producto.findMany` scoped + bucle de rechazo** |
| C-20 | idem `:128` | Nested create con FK ya validadas (quinto sitio) |
| C-21 | `ventas.service.ts` `resolverItems()`; `tienda.service.ts:158-163`; `caja.service.ts:132-136` | Patrón de validación scoped previa, 3 sitios más |
| C-22 | grep `connect:`/`connectOrCreate`/`disconnect`/`set:`/nested update-delete | **Cero usos en `apps/api/src`** |
| C-23 | `catalogo.controller.ts:104` | Única coincidencia de `connect`: comentario explicando por qué no se usa |
| C-24 | `empresa-scope.extension.ts:164-166` | **Fail-closed por operación no soportada** |
| C-25 | grep `.upsert(`/`.groupBy(` | Cero usos → el fail-closed opera |
| C-26 | `tienda.service.ts:230-240` | `upsert` evitado por el fail-closed, **dentro de `tx`** |
| C-27 | `empresa-scope.extension.ts:32-68` vs `schema.prisma:1061,1082` | 26 en allow-list; `PagoProveedor`/`DevolucionProveedor` fuera |
| C-28 | `schema.prisma:520-523` | `Legajo.usuarioId`/`clienteId` ambos `@unique` y opcionales → AMBIGUOUS |
| C-29 | idem `:663` | `Venta.idempotencyKey @unique` global |
| C-30 | `ventas.service.ts:117` | `findUnique({idempotencyKey})` sobre cliente extendido |
| C-31 | `schema.prisma` modelos `AplicacionPago`, `MovimientoCaja`, `ArqueoCaja` | Múltiples rutas de ownership derivado |
| C-32 | `inventario.service.ts:259-271` | `$executeRaw` parametrizado con `empresaId` en el `WHERE` |
| C-33 | `node_modules/.prisma/client/index.d.ts:493,4504` | `ITXClientDenyList` no excluye hooks de query |
| C-34 | `find *.spec.ts` | Único spec: `health.controller.spec.ts` → cero tests de aislamiento |
| C-35 | `prisma/seed.ts:69,177,191-216` | Fixture `empresaAislamiento` existe, sin consumidor |
| C-36 | `git log`, `git status` | `ac555d6`; contrato B3 untracked |

## 19.2 `[D]` — documentado

| Ref | Fuente | Acredita |
|---|---|---|
| D-01 | `28-R8-ARCH-002` §3 | 12 propiedades |
| D-02 | idem §3.12 | Verificación negativa cross-Business requerida |
| D-03 | idem §4 | RLS / schema-per-tenant / DB-per-tenant fuera de alcance |
| D-04 | idem §5 | AS-IS = ADAPTED; ningún componente eliminado |
| D-05 | idem §6 | 10 ítems abiertos: ownership directo/indirecto, nested, unique, transacciones, contexto |
| D-06 | idem §7 | Invariante de seguridad cross-Business |
| D-07 | `08-R8-ARCH-003` §13.8, §13.11, §13.12 | Transporte, enforcement y schema Membership OPEN |
| D-08 | `06-R8-ID-003` §5 | Ningún mapping físico / ID strategy autorizado |
| D-09 | `06-R8-ID-003` C-COEX-004 | 7 obligaciones de aislamiento en coexistencia |
| D-10 | `31-R8-MASTER-PROPAGATION` §140 | Requiere invariant de aislamiento application-level |
| D-11 | `06-BLOCK-1-ARCH-SPEC` §5.4-5.5 | 12 propiedades literales |
| D-12 | `24-B2-CONTROLLED` §15 | `LEG-005` como process/gate rule — precedente de clasificación |
| D-13 | `24-B4-READINESS` §142 | Transactions: "sin invariant propio" |
| D-14 | idem §195 | "Faltan como familia los invariants de persistencia" |
| D-15 | idem §11 | Cero `[T]`/`[E]` en B1, B2, B3 |
| D-16 | `09-R8-ARCH-002-TENANT-ISOLATION-CONTRACT-v0.1` §21, §22, §24 | **Objeto auditado:** 20 candidatos, matriz de tests, gates |

## 19.3 `[ND]` — no determinable

| Ref | Qué | Por qué |
|---|---|---|
| ND-01 | Que `$extends` siga activo en el `tx` interactivo en ejecución | Evidencia de tipos `[C]` (C-33) y documental (C-26); **no se ejecutó**. Afecta a `ISO-006` |
| ND-02 | Efecto real de un `empresaId` firmado inexistente | No ejecutado |
| ND-03 | Estado final persistido ante la FK cruzada de `crearDevolucion` | La FK se satisface (el ID existe); resultado no verificado por ejecución |
| ND-04 | Si el set B2 será canónico tal como está | Su propio veredicto deja 11 ítems abiertos y el archivo canónico pendiente `[D]` |

---

**B3 — TENANT ISOLATION INVARIANTS / INDEPENDENT AUDIT: COMPLETA — NO CANÓNICO.**

Este documento no crea invariants canónicos, decisiones, schema, tests ni implementación. No modifica ningún documento existente. No declara implementation readiness.
