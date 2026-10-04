# B3 — TESTS/EVALS RECONCILIATION + READINESS
## CONTEXT 3 — FINAL CONTROL / NON-CONTAMINATION RULE

**Estado:** CONTROL FINAL — READ-ONLY — NO CANÓNICO — NO APROBADO
**Fecha:** 2026-10-04
**Repo evaluado:** `apps/api`, commit base `7a39794`
**Acción:** solo inspección y reconciliación. Sin cambios de código, schema, migraciones ni datos. Sin commits, push ni deploy. Sin modificar Owner Decisions, contratos ni invariants. **No se ejecutó ningún test.**

**Clases de evidencia:** `[C]` código · `[D]` documentado · `[T]` test ejecutado · `[E]` ejecución · `[ND]` no determinable.

> **No se emite ninguna evidencia `[T]` ni `[E]` en este documento.** No existe test de aislamiento en el repositorio `[C]`. **"Test definido" no significa "test pasado"** — esta distinción es la regla central de este documento y se aplica sin excepción en cada matriz.

**Regla de no contaminación, respetada:**

| Nivel | Contexto | Puede decir | NO puede decir |
|---|---|---|---|
| CONTRACT | 1 | "estos son los contratos" | "estos son los invariants canónicos" |
| NORMATIVE MODEL | 2 | "estos son los invariants que corresponden" | "B3 está listo" |
| **EVIDENCE / READINESS** | **3 — este documento** | **"con estos contratos/invariants/tests, B3 puede o no puede cerrarse"** | **"B3 CLOSED"** — eso lo decide la revisión transversal humana |

**Este documento no cierra B3.** Emite un veredicto de readiness y entrega la matriz transversal para la revisión final.

---

# 1. ENTRADAS REALES RECIBIDAS

Verificadas por listado y lectura, no asumidas.

| Entrada | Documento | Estado | Veredicto propio |
|---|---|---|---|
| **B3 AS-IS** | `13-AUDIT/23-BLOCK-3-TENANT-ISOLATION-ASIS-AUDIT-2026-10-04.md` (623 líneas, commit `f99458e`) | versionado | READY WITH RECONCILIATION |
| **B3 Contract Reconciliation** (Contexto 1) | `07-DESIGN/CONTRACTS/DOMAIN/09-R8-ARCH-002-TENANT-ISOLATION-CONTRACT-v0.1.md` (1336 líneas) | **untracked** `[C]` | READY WITH RECONCILIATION — 24 candidatos `B3-CON-*` |
| **Independent Audit** (Contexto 2) | `13-AUDIT/25-B3-TENANT-ISOLATION-INVARIANTS-INDEPENDENT-AUDIT-2026-10-04.md` (818 líneas, commit `6f35462`) | versionado | PASS WITH RECONCILIATION — set corregido de 8 `ISO-*` |
| **B3 Canonical Invariants** | **NO EXISTE** | — | — |

## 1.1 Hallazgo de entrada: el insumo nominal no existe

El encargo de Contexto 3 asume recibir *"B3 Canonical Invariants"*. **Verificado: no existe ningún archivo de invariants B3, canónico ni borrador, en `07-DESIGN/INVARIANTS/`** `[C]` ausencia (listado del directorio: 7 archivos, ninguno B3).

Lo que existe en su lugar son **tres propuestas de invariants B3 no reconciliadas entre sí**:

| Origen | Set | Namespace | Estado |
|---|---|---|---|
| Contrato B3 §21 (Contexto 1) | 20 candidatos | `INV-B3-*` | DRAFT, dentro del documento de contratos |
| `13-AUDIT/25-…PARALLEL-DERIVATION` | 41 candidatos | `INV-B3-*` | DRAFT / NON-CANONICAL |
| Independent Audit §15 (Contexto 2) | **8 corregidos** | `ISO-*` | recomendación de auditoría |

**Consecuencia para este control:** no puedo reconciliar tests contra "los invariants canónicos", porque no hay ninguno. Reconcilio contra el **set corregido de 8 `ISO-*`**, por tres razones trazables:

1. Es el único set que pasó una auditoría de duplicación explícita `[D]`.
2. Los otros dos fueron auditados y **reprobados por duplicación masiva**: de los 20 del contrato, 8 son DUPLICATE; la familia `INV-B3-CTX-001..004` es triple duplicado de `INV-CONTEXT-001` (B1) y `CTX-001..004` (B2) `[D]`.
3. El set de 41 de la derivación paralela **incurre en el mismo defecto y en mayor grado** — su familia `INV-B3-CTX-*` (7 invariants) amplía la duplicación que Contexto 2 identificó. Lo registro explícitamente abajo.

## 1.2 Verificación independiente de la crítica de Contexto 2

No tomé la auditoría al pie de la letra. Verifiqué sus tres afirmaciones centrales:

| Afirmación de Contexto 2 | Verificación propia | Resultado |
|---|---|---|
| `INV-CONTEXT-001` cubre por sí solo las propiedades 1, 2, 4 y 11 de R8-ARCH-002 en cuatro frases | Texto literal leído (`05-BLOCK-1-INVARIANTS-BASELINE-v0.1.md:108-118`): "A protected Business-scoped operation has one effective Business context" (P1) · "must correspond to an ACTIVE Membership" (P2) · "A client-supplied Business identifier cannot override the server-established effective context" (P4) · "Missing or invalid Business context fails closed" (P11) | **CONFIRMADO** `[C]` |
| `INV-TEN-001` cubre las propiedades 6, 7 y el invariante de seguridad §7 | Texto literal (`:76-86`): "Every Business-scoped resource remains associated with exactly one applicable Business context" · "A resource belonging to Business A must not be exposed or operated through Business B context". Incluye `**Open:** physical isolation mechanism` | **CONFIRMADO** `[C]` |
| Ya existen TE-ID-005/006/008/009/010/011 que cubren P4, P6, P7, P8, P9, P11 | Catálogo leído literalmente (`05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md:66-76`). Los 6 existen, todos SPECIFIED, todos trazados a `INV-CONTEXT-001` o `INV-TEN-001` | **CONFIRMADO** `[C]` |
| El namespace `ISO-` está libre | `grep -rn "ISO-00"` sobre toda la documentación, excluyendo el propio informe → cero | **CONFIRMADO** `[C]` |

**La crítica de Contexto 2 es correcta, y me incluye.** La derivación paralela de 41 invariants que produje antes incurre en la misma duplicación, con una familia `CTX` más amplia. Lo asiento aquí porque este documento es el control, y un control que no registra el defecto de su propio insumo no controla nada.

---

# 2. SCOPE

**En alcance:**
- Reconciliación invariant → test, con la pregunta "¿ya existe?" resuelta documento por documento.
- Separación estricta entre **AS-IS characterization** y **TO-BE compliance**.
- Matriz de cobertura donde "Defined" nunca se lee como "Passed".
- Veredicto de readiness de B3 con fundamento.
- Matriz transversal CONTRACT / INVARIANT / TEST / STATUS para la revisión humana final.

**Fuera de alcance:**
- Escribir tests o archivos de test.
- Canonizar invariants. Eso es Contexto 2 y la revisión humana.
- Cerrar B3. Eso es la revisión transversal humana.
- Implementación, ejecución, migración.
- Reabrir B4.

---

# 3. RECONCILIACIÓN INVARIANT → TEST

Para cada uno de los 8 `ISO-*`: ¿existe ya un criterio de test, o hay que derivarlo?

## 3.1 Método

```
INVARIANT → ¿existe TE que lo cubra?
              ├── sí → REUTILIZAR (y no crear familia paralela)
              └── no → DERIVAR (ID = NOT YET DEFINED)
```

Catálogos consultados: `05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md` (TE-ID-001..011, TE-AUTH, TE-CUST), `00-TESTS-EVALS-v0.2.md` (TE-TEN-001, TE-ID-002, TE-INV-001, TE-CASH-001, TE-COM-004), `00-R6-TESTS-EVALS-BASELINE-001-490.md`.

**Regla de no duplicación aplicada:** los TC-B3 del contrato §22 se enlazan como refinamientos de los TE existentes, no como familia nueva. Contexto 1 (§24.1.3) y Contexto 2 (§16) exigen esto por separado; lo aplico.

## 3.2 Reconciliación por invariant

| Invariant | ¿Existe TE? | TE a reutilizar | Derivación necesaria | ID del nuevo |
|---|---|---|---|---|
| **`ISO-001`** FK del cliente validada contra el contexto | **NO** | TE-ID-011 cubre "nested/related persistence cannot escape Business ownership" — cubre el **efecto estructural**, no la **validación de la referencia recibida** | **SÍ** — un test específico de FK escalar recibida del DTO. Refinamiento de TE-ID-011 | NOT YET DEFINED |
| **`ISO-002`** integridad referencial no satisface el aislamiento | **NO** | — | **SÍ** — negativo: FK que existe en la base pero pertenece a otro Business | NOT YET DEFINED |
| **`ISO-003`** ownership derivado sujeto a las mismas obligaciones | **PARCIAL** | TE-ID-008/009 cubren read y update/delete cross-Business, pero sobre "resources" sin distinguir directo de derivado | **SÍ** — extensión a entidades sin identificador propio | NOT YET DEFINED |
| **`ISO-004`** no-presunción de globalidad | **NO** | — | **SÍ** — estructural: toda entidad clasificada; ninguna sin clasificar recibe trato global | NOT YET DEFINED |
| **`ISO-005`** identificador de negocio no global | **PARCIAL** | TE-ID-010 cubre "unique lookups cannot expose a resource belonging to another Business" — cubre la **exposición**, no la **colisión** | **SÍ** — el efecto real no es fuga sino que una clave de A bloquea su reuso en B | NOT YET DEFINED |
| **`ISO-006`** transacción mono-contexto + aislamiento interno | **NO** | — | **SÍ** — y requiere `[E]`, no solo `[T]` | NOT YET DEFINED |
| **`ISO-007`** fail-closed por operación no soportada | **NO** | TE-ID-004/005 cubren fail-closed de **contexto**, no de **operación** | **SÍ** — propiedad hermana, sin criterio existente | NOT YET DEFINED |
| **`ISO-008`** independencia de la vía | **NO** | — | **SÍ** — incluye el guardarraíl de pre-contexto | NOT YET DEFINED |

**Resultado: 8 de 8 requieren derivación.** Ninguno es cubierto íntegramente por un TE existente. Dos (`ISO-003`, `ISO-005`) son refinamientos parciales de TE existentes y deben enlazarse a ellos.

**Esto confirma, por la vía de los tests, que el set de 8 es genuinamente nuevo.** Si los 8 fueran duplicados de B1/B2, sus tests ya existirían. No existen. Es la validación cruzada más fuerte de la corrección de Contexto 2.

## 3.3 Los TE existentes que B3 reutiliza sin derivar nada

Seis criterios ya cubren propiedades de R8-ARCH-002 y **no deben reescribirse**:

| TE | Invariant | Propiedad R8 | Reutilización en B3 |
|---|---|---|---|
| TE-ID-004 | `INV-CONTEXT-001` | P1, P11 | Contexto ausente falla cerrado — **B1 owns** |
| TE-ID-005 | `INV-CONTEXT-001` | P11 | Contexto inválido falla cerrado — **B1 owns** |
| TE-ID-006 | `INV-CONTEXT-001` | P4 | ID de Business del cliente no sobrescribe — **B1 owns** |
| TE-ID-008 | `INV-TEN-001` | P6 | Read cross-Business — **B1 owns**; `ISO-003` lo extiende |
| TE-ID-009 | `INV-TEN-001` | P7 | Update/delete cross-Business — **B1 owns**; `ISO-003` lo extiende |
| TE-ID-010 | `INV-TEN-001` | P8 | Unique lookup — **B1 owns**; `ISO-005` lo complementa |
| TE-ID-011 | `INV-TEN-001` | P9 | Nested/related ownership — **B1 owns**; `ISO-001`/`ISO-002` lo refinan |

**Siete de los TC-B3 propuestos por el contrato serían duplicados de estos** — exactamente el hallazgo de Contexto 2 §16, que confirmo: TC-B3-01 ≡ TE-ID-008; TC-B3-02/03 ≡ TE-ID-009; TC-B3-04 ≡ TE-ID-010; TC-B3-06 ≡ TE-ID-011; TC-B3-13 ≡ TE-ID-004/005; TC-B3-16 ≡ TE-ID-006.

---

# 4. AS-IS CHARACTERIZATION vs TO-BE COMPLIANCE

La distinción que el encargo marca como crítica, y la razón por la que la fixture existente **no** demuestra conformidad con la arquitectura objetivo.

## 4.1 Por qué importa

`prisma/seed.ts` crea una segunda Empresa (`empresaAislamiento`) con catálogo propio, y ningún test la consume `[C]`. Es una fixture multi-tenant real y es la que R8-ARCH-002 §3.12 exige.

**Pero un test que use esa fixture contra el código actual caracteriza el AS-IS, no demuestra el TO-BE.** El sistema de hoy es mono-negocio: no existe Membership, no existe Business Context como concepto, no existe switching, y el tenant efectivo es un claim de JWT nunca revalidado `[C]`. Un test verde sobre esa base prueba que *el mecanismo actual aísla dos filas de `Empresa`*. No prueba que la cadena `User → Membership → Business Context → persistencia aislada` esté implementada, porque los tres primeros eslabones no existen.

**Confundir las dos cosas sería el error más caro de todo el proyecto**, porque produciría un "B3 verificado" sobre una arquitectura que todavía no se escribió.

## 4.2 Clasificación de cada test candidato

| Test candidato | Invariant | AS-IS characterization | TO-BE compliance | Fundamento |
|---|---|---|---|---|
| FK del cliente validada | `ISO-001` | **Sí** — reproduce el defecto actual | **Parcial** — la propiedad es la misma en TO-BE | La validación de FK no depende de Membership |
| FK existe pero es de otro Business | `ISO-002` | **Sí** | **Parcial** | Idem |
| Entidad derivada cross-Business | `ISO-003` | **Sí** | **Parcial** | La cadena de ownership no depende de Membership |
| Toda entidad clasificada | `ISO-004` | **Sí** — estructural | **Sí** | Propiedad estructural, estable en ambos |
| Clave de negocio no global | `ISO-005` | **Sí** | **Parcial** | Semántica de unicidad, independiente del contexto |
| Transacción mono-contexto | `ISO-006` | **Sí** — cierra el `[ND]` | **Parcial** | El aislamiento transaccional es el mismo; "un contexto" cambia de significado cuando exista switching |
| Operación no soportada rechazada | `ISO-007` | **Sí** — la mejor propiedad actual | **Sí** | Fail-closed de operación, estable |
| Independencia de la vía | `ISO-008` | **Sí** | **Parcial** | La superficie de vías cambiará |
| Contexto ausente falla cerrado | TE-ID-004 | **No aplicable** — el claim siempre lo trae | **Sí** | Solo verificable cuando el contexto se establezca, no se asuma |
| Contexto inválido falla cerrado | TE-ID-005 | **No** — hoy no se valida | **Sí** | Requiere validación del contexto, inexistente |
| ID del cliente no sobrescribe | TE-ID-006 | **Pasa trivialmente** | **Sí** | **No hay superficie que atacar** — pasar no verifica P4 |
| Membership inexistente / INACTIVE | (B2 MEM-002) | **No aplicable** | **Sí** | Membership no existe |
| Business switch válido / inválido | (B1) | **No aplicable** | **Sí** | Switching no existe |

**Lectura:** de los 8 `ISO-*`, **todos son caracterizables en AS-IS** — es su mayor virtud, porque se pueden verificar hoy. Pero solo **2 de 8** (`ISO-004`, `ISO-007`) son propiedades cuyo enunciado no cambia cuando llegue el TO-BE. Los otros 6 son "Parcial": la propiedad sobrevive, su test cambia de alcance.

**Y las cinco propiedades que más dependen del TO-BE (contexto establecido, contexto validado, Membership, switching) no son de B3.** Son de B1/B2 y hoy son **no aplicables**, no "pasadas".

## 4.3 Las tres lecturas prohibidas

Conforme a la advertencia del contrato §22.3, que suscribo y amplío:

| Resultado | Qué NO significa |
|---|---|
| **"No aplicable hoy"** (Membership, switching, contexto establecido) | No es cobertura. Depende de B1. Un test que no se puede escribir no es un test que pasa |
| **"Pasa trivialmente"** (TE-ID-006, ID del cliente) | No verifica P4. Cumple por ausencia de superficie. Cuando exista switching, la superficie se crea desde cero |
| **"Operación inexistente"** (nested connect, nested update/delete) | No es cobertura ni es bug. Son operaciones que el código no usa `[C]`. El test se escribe cuando la operación se introduzca |

---

# 5. MATRIZ DE COBERTURA

**Formato exigido por el encargo. "Defined" ≠ "Passed".**

Leyenda — columna **AS-IS**: ✓ = el test es escribible y significativo contra el código actual · — = no aplicable hoy. Columna **TO-BE**: ✓ = el enunciado no cambia en el objetivo · ~ = la propiedad sobrevive, el alcance del test cambia · — = requiere TO-BE inexistente.

| Invariant | Test | AS-IS | TO-BE | Estado |
|---|---|---|---|---|
| **ISO-001** FK validada contra contexto | NOT YET DEFINED (refina TE-ID-011) | ✓ | ~ | **Defined** |
| **ISO-002** integridad referencial insuficiente | NOT YET DEFINED | ✓ | ~ | **Defined** |
| **ISO-003** ownership derivado | NOT YET DEFINED (extiende TE-ID-008/009) | ✓ | ~ | **Defined** |
| **ISO-004** no-presunción de globalidad | NOT YET DEFINED (estructural) | ✓ | ✓ | **Defined** |
| **ISO-005** identificador de negocio no global | NOT YET DEFINED (complementa TE-ID-010) | ✓ | ~ | **Defined** |
| **ISO-006** transacción mono-contexto | NOT YET DEFINED (requiere `[E]`) | ✓ | ~ | **Defined** |
| **ISO-007** fail-closed por operación | NOT YET DEFINED | ✓ | ✓ | **Defined** |
| **ISO-008** independencia de la vía | NOT YET DEFINED | ✓ | ~ | **Defined** |
| *ISO-AMBIG* (diferido) | — | — | — | **Not derivable** — TECHNICAL OPEN |
| *enumerabilidad de la superficie* | — | — | — | **Process rule** — no es invariant |
| *verificación negativa cross-Business* | — | — | — | **Readiness gate** — no es invariant |

**Estado de los 8: `Defined`. Ninguno `Passed`. Ninguno `Executed`.**

**Cobertura heredada de B1 (no se reescribe):**

| Invariant | Test | AS-IS | TO-BE | Estado |
|---|---|---|---|---|
| INV-CONTEXT-001 (P1, P11) | TE-ID-004 | — | ✓ | **Defined (B1)** — SPECIFIED, no ejecutado |
| INV-CONTEXT-001 (P11) | TE-ID-005 | — | ✓ | **Defined (B1)** |
| INV-CONTEXT-001 (P4) | TE-ID-006 | trivial | ✓ | **Defined (B1)** |
| INV-TEN-001 (P6) | TE-ID-008 | ✓ | ✓ | **Defined (B1)** |
| INV-TEN-001 (P7) | TE-ID-009 | ✓ | ✓ | **Defined (B1)** |
| INV-TEN-001 (P8) | TE-ID-010 | ✓ | ✓ | **Defined (B1)** |
| INV-TEN-001 (P9) | TE-ID-011 | ✓ | ✓ | **Defined (B1)** |

**Total de criterios de test en el perímetro de B3: 15 (8 nuevos + 7 heredados). Ejecutados: 0.**

---

# 6. COBERTURA DE LAS 12 PROPIEDADES, POR CAPA

Cada propiedad de R8-ARCH-002, con quién la cubre y con qué clase de evidencia.

| Prop | Contract | Invariant | Test | Evidencia AS-IS | Estado |
|---|---|---|---|---|---|
| **P1** contexto antes de la operación | B3-CON-001/003 | **B1** `INV-CONTEXT-001` | TE-ID-004 | PARCIAL: se asume del claim `[C]` | **Defined, not executed** |
| **P2** contexto ↔ Membership | B3-CON-002 | **B2** `MEM-002/003` | (B2) | NO CUMPLE: Membership no existe `[C]` | **Dependiente de B1** |
| **P3** Membership INACTIVE no opera | B3-CON-002 | **B2** `MEM-002` | (B2) | NO CUMPLE `[C]` | **Dependiente de B1** |
| **P4** ID del cliente no sobrescribe | B3-CON-014/015 | **B1** `INV-CONTEXT-001` | TE-ID-006 | CUMPLE por ausencia de superficie `[C]` | **Defined; pasa trivialmente** |
| **P5** create asigna desde contexto | B3-CON-006 | **B1** `INV-TEN-001` + `ISO-001` | TE-ID-006 + nuevo | CUMPLE en 26; no en 2 `[C]` | **Defined, not executed** |
| **P6** read restringido | B3-CON-007 | **B1** `INV-TEN-001` + `ISO-003` | TE-ID-008 + nuevo | CUMPLE en 26; no en 2 + 10 derivados `[C]` | **Defined, not executed** |
| **P7** update/delete no cruzan | B3-CON-008/009 | **B1** `INV-TEN-001` + `ISO-003` | TE-ID-009 + nuevo | CUMPLE en 26 `[C]` | **Defined, not executed** |
| **P8** unique lookups no exponen | B3-CON-010/016 | **B1** `INV-TEN-001` + `ISO-005` | TE-ID-010 + nuevo | CUMPLE con reserva `[C]` | **Defined, not executed** |
| **P9** nested/related preserva ownership | B3-CON-011/012/017/018 | **`ISO-001`, `ISO-002`, `ISO-003`** | TE-ID-011 + nuevos | **NO CUMPLE como mecanismo** `[C]` | **Defined, not executed — hueco real de B3** |
| **P10** transacciones preservan aislamiento | B3-CON-020 | **`ISO-006`** | nuevo, requiere `[E]` | CUMPLE por construcción; **`[ND]` por ejecución** | **Defined, NOT VERIFIED** |
| **P11** contexto ausente/inválido falla cerrado | B3-CON-003 | **B1** `INV-CONTEXT-001` + **`ISO-007`** | TE-ID-004/005 + nuevo | Contexto: PARCIAL. Operación: **CUMPLE** `[C]` | **Defined, not executed** |
| **P12** verificación negativa cross-Business | B3-CON-024 | **ninguno — es readiness gate** | todos los negativos | **NO CUMPLE: cero tests** `[C]` | **NOT SATISFIED** |

**12 de 12 tienen contrato. 12 de 12 tienen invariant o referencia. 11 de 12 tienen criterio de test definido. 0 de 12 tienen evidencia de ejecución.**

**P12 es la propiedad decisiva y es la única sin satisfacer.** No es un invariant: es la exigencia de que exista verificación negativa. Contexto 2 la reclasificó correctamente como readiness gate. Y es precisamente la que determina el veredicto de este documento: R8-ARCH-002 §3.12 exige verificación negativa cross-Business, y el repositorio tiene **cero tests de aislamiento** `[C]`.

---

# 7. TESTS/EVALS DERIVADOS — CANDIDATOS

**No se crea el suite.** Candidatos con IDs `NOT YET DEFINED`: el set canónico B2 determinó que los números TE colisionan entre catálogos y que no se reutilicen `[D]`.

## 7.1 Prioridad máxima — convierten `[C]`-por-lectura o `[ND]` en `[T]`/`[E]`

| # | Escenario | Invariant | Clase | Resultado esperado hoy |
|---|---|---|---|---|
| 1 | **El aislamiento sigue vigente dentro de una transacción interactiva** | `ISO-006` | **requiere `[E]`** | Cierra el único `[ND]` de mecanismo relevante. Evidencia de tipos dice que sí; nadie lo ejecutó |
| 2 | **FK de otro Business en `crearDevolucion` → rechazada** | `ISO-001`, `ISO-002` | negativo | **FALLA** — reproduce el único defecto con dato cruzado persistible |
| 3 | **Operación no soportada sobre modelo cubierto → rechazada** | `ISO-007` | negativo | **PASA** — convierte en `[T]` la mejor propiedad del AS-IS, hoy sin test |
| 4 | **Unique lookup cross-Business → no encontrado** | TE-ID-010 (existente) | negativo | PASA — criterio existe, test no |

## 7.2 Prioridad alta

| # | Escenario | Invariant | Clase |
|---|---|---|---|
| 5 | Read cross-Business → vacío | TE-ID-008 | negativo |
| 6 | Update/delete cross-Business → sin efecto | TE-ID-009 | negativo |
| 7 | Entidad de ownership derivado cross-Business | `ISO-003` | negativo |
| 8 | Entidad con identificador propio fuera de la cobertura, invocada sin lectura previa | `ISO-004`, `ISO-008` | negativo |
| 9 | Toda entidad Business-scoped está clasificada y cubierta | `ISO-004` | **estructural** |
| 10 | Clave de negocio de A no reutilizable en B | `ISO-005` | negativo |

## 7.3 Positivos — el aislamiento no rompe la operación legítima

Exigidos por el contrato §22.2 y necesarios como guardarraíl.

| # | Escenario | Invariant |
|---|---|---|
| 11 | A lee, crea, modifica y elimina sus propios datos | TE-ID-008/009 |
| 12 | A ejecuta un nested create con FK propias y persiste | `ISO-001` |
| 13 | Una transacción de A se confirma completa sobre datos propios | `ISO-006` |
| 14 | Un unique lookup de A sobre su propio registro lo devuelve | TE-ID-010 |
| 15 | **El login y la activación por invitación funcionan sin Business Context** | cláusula de alcance + `ISO-008` |

**El 15 es el guardarraíl más importante del conjunto.** Sin él, endurecer `ISO-008` puede romper el login: los lookups de identidad usan únicos globales porque el tenant es el *resultado* del lookup, no una restricción previa `[C]`. Un test que verifique que el pre-contexto sigue funcionando es lo que separa un endurecimiento seguro de una regresión de autenticación.

## 7.4 No derivables hoy

| Escenario | Razón |
|---|---|
| Membership inexistente / INACTIVE | Membership no existe — **B1** |
| Business switch válido / inválido | Switching no existe — **B1** |
| Nested `connect` / nested update / nested delete | **Operaciones inexistentes** `[C]` (cero usos en `src`). Se escriben cuando se introduzcan |
| `Legajo` / `DocumentoLegajo` cross-Business | `ISO-AMBIG` — TECHNICAL OPEN: el tenant no es determinable sin resolución de modelo |

## 7.5 Fixture

No se requiere fixture nueva. `prisma/seed.ts` ya crea la segunda Empresa con catálogo propio `[C]`. **Advertencia de interpretación:** usarla verifica el AS-IS (§4).

---

# 8. EVIDENCIA EXIGIBLE

## Para declarar un invariant `VERIFIED (AS-IS)`

1. `[E]` El entorno de test arranca y el seed aplica sin cambio observable en los flujos existentes.
2. `[T]` El test del invariant pasa, nombrado y trazado al invariant.
3. `[T]` Su **negativo cross-Business** pasa. Un positivo solo no verifica aislamiento.
4. `[C]` El alcance declarado: qué clase de entidades cubre y qué deja fuera.

## Para declarar un invariant `VERIFIED (TO-BE)`

5. Todo lo anterior, **más** que el eslabón del TO-BE del que depende exista: contexto establecido y validado (no asumido de un claim), Membership, y —donde aplique— switching.

**Hoy ningún invariant de ningún bloque puede declararse `VERIFIED` en ninguno de los dos sentidos.** Cero `[T]`, cero `[E]` en todo el corpus `[C]`.

## No aceptable como evidencia

- Que el código compile o el lint pase. El lint de `apps/api` además corre `eslint --fix` y **muta código**.
- Que un service use el cliente acotado. El AS-IS demuestra que eso no equivale a aislamiento: hay entidades con identificador propio fuera de la cobertura, ownership derivado sin mecanismo, y FK sin validar `[C]`.
- Un test con la capa de persistencia simulada, presentado como prueba de aislamiento real.
- Un test verde sobre la fixture actual, presentado como conformidad con el TO-BE (§4).
- Ausencia de incidentes reportados.

---

# 9. READINESS GATES

| Gate | Pregunta | Resultado | Fundamento |
|---|---|---|---|
| **A — Contract** | ¿Los contratos necesarios están definidos? | **PASS WITH RECONCILIATION** | 24 candidatos `B3-CON-*` cubren las 12 propiedades, los 13 gaps, R4, R14 y los 17 vectores. Cuatro reconciliaciones documentales abiertas (contrato §24.1). **El documento está untracked** `[C]` |
| **B — Invariant** | ¿Las propiedades a mantener están definidas? | **BLOCKED** | **No existe archivo de invariants B3.** Hay tres propuestas no reconciliadas (20 / 41 / 8). La de 8 pasó auditoría; las otras dos fueron reprobadas por duplicación masiva. Sin archivo canónico, no hay set normativo contra el cual verificar |
| **C — Test/Eval** | ¿Existe forma verificable de demostrar conformidad? | **CONDITIONAL** | 15 criterios en el perímetro (8 nuevos + 7 heredados), todos derivables. **Cero escritos, cero ejecutados.** La infraestructura de test no existe: `package.json` apunta a un config ausente `[C]` |
| **D — Evidence** | ¿Hay evidencia de que el comportamiento se respeta? | **FAIL** | Cero `[T]`, cero `[E]`. **P12 de R8-ARCH-002 exige verificación negativa cross-Business y no existe ninguna** `[C]`. Único spec del repo: `health.controller.spec.ts` |
| **E — Non-contamination** | ¿Cada capa respetó su nivel? | **PASS** | Contexto 1 produjo contratos sin canonizar invariants. Contexto 2 corrigió invariants sin declarar readiness. Este documento emite readiness sin cerrar B3 |
| **F — AS-IS / TO-BE separation** | ¿Se distingue caracterización de conformidad? | **PASS** | §4: los 8 `ISO-*` son caracterizables en AS-IS; solo 2 tienen enunciado estable en TO-BE; 5 propiedades son "no aplicables hoy" y no cuentan como cobertura |
| **G — Owner Decision stability** | ¿Alguna capa requirió decisión nueva? | **PASS** | Cero Owner Decisions nuevas en las tres capas. Todo cae en los 10 ítems que R8-ARCH-002 §6 declaró abiertos `[D]` |

---

# 10. MATRIZ TRANSVERSAL PARA LA REVISIÓN HUMANA

Formato solicitado. Esta matriz es el entregable principal de este documento.

```
                          CONTRACT   INVARIANT   TEST    EVIDENCE   STATUS
---------------------------------------------------------------------------
FK ownership                 ✓           ✓         ○         ✗      DEFINED
referential integrity        ✓           ✓         ○         ✗      DEFINED
derived ownership            ✓           ✓         ○         ✗      DEFINED
no-global presumption        ✓           ✓         ○         ✗      DEFINED
business-scoped identifier   ✓           ✓         ○         ✗      DEFINED
transaction isolation        ✓           ✓         ○         ✗      CONDITIONAL
unsupported ops (fail-cl.)   ✓           ✓         ○         ✗      DEFINED
path independence            ✓           ✓         ○         ✗      CONDITIONAL
---------------------------------------------------------------------------
cross-Business read          ✓        ✓ (B1)       ◐         ✗      DEFINED
cross-Business write         ✓        ✓ (B1)       ◐         ✗      DEFINED
unique lookup                ✓        ✓ (B1)       ◐         ✗      DEFINED
context fail-closed          ✓        ✓ (B1)       ◐         ✗      DEFINED
client-supplied tenant ID    ✓        ✓ (B1)       ◐      trivial   DEFINED
---------------------------------------------------------------------------
ambiguous ownership          ◐           ✗         ✗         ✗      TECH OPEN
context ↔ Membership         ✓        ✓ (B2)       ✗         ✗      B1 DEPENDENT
INACTIVE Membership          ✓        ✓ (B2)       ✗         ✗      B1 DEPENDENT
business switching           ✓        ✓ (B1)       ✗         ✗      B1 DEPENDENT
---------------------------------------------------------------------------
negative verification (P12)  ✓      gate, not inv  ○         ✗      NOT SATISFIED
---------------------------------------------------------------------------

✓ definido / existente       ◐ parcial o heredado
○ derivable, no escrito      ✗ ausente
```

**Ninguna fila alcanza PASS.** La columna EVIDENCE está vacía en su totalidad: eso es el estado real del proyecto, no un defecto de este control.

**Lo que la matriz muestra y ninguna capa individual podía ver:**

1. **La columna INVARIANT tiene ✓ pero no hay archivo.** Las ocho primeras filas se apoyan en un set que existe solo como recomendación dentro de un informe de auditoría. Es el eslabón más débil de las cuatro capas, y es invisible desde Contexto 1 (que produjo su propio set) y desde Contexto 2 (que recomendó el corregido sin poder publicarlo).
2. **La columna TEST es íntegramente `○` o `◐`.** Hay criterios; no hay tests. Los heredados de B1 llevan SPECIFIED desde su creación y nunca se escribieron.
3. **Tres filas dependen de B1**, no de B3. Marcarlas como pendientes de B3 sería atribuirle un bloqueo que no le corresponde.
4. **`ambiguous ownership` es la única fila sin contrato pleno**, y correctamente: tanto Contexto 1 (B3-CON-019) como Contexto 2 (`ISO-AMBIG`) la difirieron en vez de inventar el modelo. Convergencia independiente, buena señal.

---

# 11. VEREDICTO DE READINESS DE B3

# BLOCKED

**No se declara B3 listo.** Y la pregunta del encargo —*"¿podemos realmente declarar B3 listo?"*— tiene respuesta negativa por dos razones independientes, cualquiera de las cuales bastaría.

## Razón 1 — No existe el modelo normativo (Gate B: BLOCKED)

No hay archivo de invariants B3, canónico ni borrador, en `07-DESIGN/INVARIANTS/` `[C]` ausencia. Hay **tres propuestas incompatibles** (20, 41 y 8 invariants), de las cuales dos fueron auditadas y reprobadas por duplicación masiva contra B1 y el set canónico B2 — incluida una familia completa que es triple duplicado de `INV-CONTEXT-001` y `CTX-001..004` `[D]`.

No se puede declarar listo un bloque cuyo modelo normativo no está escrito. Y no es un detalle formal: mientras las tres propuestas coexistan, cualquier test que se escriba se trazaría a un invariant que otra capa considera duplicado o retirado.

## Razón 2 — La propiedad 12 no está satisfecha (Gate D: FAIL)

R8-ARCH-002 §3.12 exige que el acceso cross-Business esté cubierto por **verificación negativa**. El repositorio tiene **cero tests de aislamiento** `[C]`. El único spec es un health check.

Esta propiedad es distinta de las otras once: las demás son obligaciones sobre el comportamiento del sistema, y ésta es una obligación sobre la **evidencia**. No se puede satisfacer por contrato ni por invariant — solo ejecutando tests. Las tres capas lo reconocen por separado: el contrato la marca "cubierta por contrato y no satisfecha por evidencia", la auditoría la reclasifica como readiness gate, y el AS-IS la reporta como G-B3-09.

**Mientras P12 no se satisfaga, ningún invariant de aislamiento puede declararse verificado, y por lo tanto B3 no puede cerrarse.**

## Por qué BLOCKED y no READY WITH RECONCILIATION

`READY WITH RECONCILIATION` corresponde cuando lo que falta son inconsistencias documentales resolubles sin producir nada nuevo. Aquí faltan **dos artefactos**: el archivo de invariants y los tests. Eso no es reconciliar: es escribir.

Es también la razón por la que mi veredicto es más estricto que el de Contexto 1 (`READY WITH RECONCILIATION`) y el de Contexto 2 (`PASS WITH RECONCILIATION`). **No hay contradicción entre los tres:** cada capa evaluó su propio nivel y acertó. Contexto 1 evaluó si los contratos están suficientemente derivados — lo están. Contexto 2 evaluó si los invariants propuestos son los correctos — lo son, tras reducirlos a 8. Este contexto evalúa si **B3 puede cerrarse**, que es una pregunta sobre las cuatro capas juntas, y la respuesta depende de la capa de evidencia, que está vacía.

## Por qué BLOCKED y no FAIL

`FAIL` implicaría una contradicción con la arquitectura o con una Owner Decision. **No existe ninguna.** Verificado de forma convergente por las tres capas: cero conflictos con R8-ARCH-002, R8-ARCH-003, R8-ID-002, R8-ID-003, R8-AUTH-001 y la tabla maestra. Cero Owner Decisions nuevas requeridas. Todo lo producido cae en el espacio que R8-ARCH-002 §6 declaró abierto.

**El bloqueo es de producción de artefactos, no de autoridad.** Es resoluble sin volver al Owner.

## Qué desbloquearía exactamente

| # | Acción | Cierra | ¿Requiere Owner? |
|---|---|---|---|
| 1 | Publicar el archivo de invariants B3 con el set de 8 `ISO-*`, enlazado a `INV-TEN-001`/`INV-CONTEXT-001` y sin crear familia paralela | **Gate B** | No |
| 2 | Escribir y ejecutar los 4 tests de prioridad máxima (§7.1) sobre la fixture existente | **Gate D (parcial)** → satisface P12 para las clases cubiertas | No |
| 3 | Cerrar las 4 reconciliaciones del contrato (§24.1) y las 8 de la auditoría (§18) | Gate A → PASS | No |
| 4 | Levantar la infraestructura de test (`package.json` apunta a un config ausente) | Gate C → PASS | No |

**Ninguna de las cuatro requiere una Owner Decision.** El único ítem que sí la requeriría — `ISO-AMBIG` / `Legajo` — está correctamente diferido como TECHNICAL OPEN por las dos capas anteriores, y no bloquea el resto.

## Advertencia sobre el orden

El paso 2 **no debe esperar** a los pasos 1 y 3. Los cuatro tests de prioridad máxima son escribibles hoy, contra el código actual, con la fixture que ya existe. Y uno de ellos (`ISO-006`, aislamiento dentro de transacción) es el **único camino** para cerrar un `[ND]` que ninguna capa documental puede resolver: tres capas coincidieron en que la evidencia de tipos apunta a que se preserva, y ninguna pudo demostrarlo.

Ejecutarlos antes de publicar los invariants tiene una ventaja concreta: el archivo canónico se escribiría sobre **comportamiento medido** en lugar de comportamiento leído. Sigue siendo verificación del AS-IS (§4), no implementación de B3.

---

# 12. RECOMMENDED NEXT STEP

**Para la revisión transversal humana — los tres puntos donde las capas no cierran:**

1. **Decidir cuál set de invariants se publica.** Tres propuestas: 20 (contrato §21), 41 (derivación paralela), 8 (auditoría). Mi lectura, verificada: **el de 8**, por ser el único que pasó auditoría de duplicación, y porque la reconciliación de tests lo confirma de forma independiente — los 8 requieren test nuevo, lo que prueba que no duplican nada existente (§3.2).
2. **Decidir el namespace.** `ISO-*` (recomendado por Contexto 2, verificado libre) vs `INV-B3-*` (usado por las otras dos propuestas). El argumento de Contexto 2 es correcto: `INV-B3-*` crearía una tercera convención tras el trabajo de reconciliación de IDs que B2 §4 ya tuvo que hacer.
3. **Decidir si los 4 tests de prioridad máxima se escriben antes o después del archivo de invariants.** Mi recomendación: antes, o en paralelo.

**Secuencia propuesta:**

```
1. Publicar invariants B3 (set de 8, namespace acordado)     → Gate B
2. Tests de prioridad máxima sobre fixture existente         → Gate D, P12
   (en paralelo con 1 — no depende de él)
3. Cerrar reconciliaciones documentales (4 + 8)              → Gate A
4. Infraestructura de test                                   → Gate C
   (prerequisito técnico de 2)
5. Re-evaluar readiness de B3 con la columna EVIDENCE poblada
6. Recién entonces: reabrir B4
```

**Nota de numeración:** `13-AUDIT/` tiene dos archivos `24-` y tres `25-`, todos versionados salvo el contrato B3 (untracked). Este documento es `26-`. Conviene renumerar en una acción separada y explícita; no lo toqué.

**Observación sobre el contrato B3:** está **untracked** `[C]`. Es el insumo normativo de toda esta cadena y no está versionado. Conviene commitearlo antes de construir sobre él.

**Lo que este documento NO hizo:** no modificó código, schema, migraciones ni datos; no creó commits, push ni deploy; no modificó Owner Decisions, contratos ni invariants; no canonizó ningún invariant; no escribió ni ejecutó ningún test; no emitió `[T]` ni `[E]`; y **no declaró B3 cerrado**.

---

# 13. EVIDENCE INDEX

## `[C]` — verificado en este control

| Hecho | Ubicación / método |
|---|---|
| **No existe archivo de invariants B3** | listado de `07-DESIGN/INVARIANTS/DERIVED/` → 7 archivos, ninguno B3 |
| Contrato B3 existe y está **untracked** | `07-DESIGN/CONTRACTS/DOMAIN/09-R8-ARCH-002-TENANT-ISOLATION-CONTRACT-v0.1.md`; `git status` |
| Texto literal de `INV-CONTEXT-001` cubre P1, P2, P4, P11 | `07-DESIGN/INVARIANTS/DERIVED/05-BLOCK-1-INVARIANTS-BASELINE-v0.1.md:108-118` |
| Texto literal de `INV-TEN-001` cubre P6, P7, §7; con "Open: physical isolation mechanism" | `:76-86` |
| TE-ID-004/005/006/008/009/010/011 existen, todos SPECIFIED | `07-DESIGN/TESTS-EVALS/DERIVED/05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md:66-76` |
| Namespace `ISO-` libre | `grep -rn "ISO-00"` sobre la documentación, excluyendo el informe de auditoría → cero |
| Único spec del repositorio | `apps/api/src/health/health.controller.spec.ts` |
| Infraestructura de test ausente | `apps/api/package.json` referencia `test/jest-e2e.json`; el directorio no existe |
| Fixture multi-tenant existente sin consumidor | `apps/api/prisma/seed.ts` (segunda Empresa con catálogo propio) |
| Commits de las capas previas | `f99458e` (AS-IS B3), `ac555d6` (B2 + B4), `6f35462` (auditoría independiente), `7a39794` (merge) |
| Dos archivos `24-`, tres `25-` en `13-AUDIT/` | listado del directorio |

## `[D]` — documentado (insumos de las tres capas)

| Documento | Secciones usadas |
|---|---|
| `03-DECISIONS/28-R8-ARCH-002-OWNER-DECISION-TENANT-ISOLATION-2026-10-03.md` | §3 las 12 propiedades, §3.12 verificación negativa, §5 ADAPTED, §6 los 10 abiertos, §7 invariante de seguridad |
| `07-DESIGN/CONTRACTS/DOMAIN/09-R8-ARCH-002-TENANT-ISOLATION-CONTRACT-v0.1.md` (Contexto 1) | §15 los 24 `B3-CON-*`, §18 cobertura, §21 los 20 candidatos de invariant, §22 los TC-B3, §22.3 advertencias, §22.4 reconciliación con TE existentes, §22.5 fixture, §24 gates, §24.1 las 4 reconciliaciones, §25 veredicto, §26 próximos pasos |
| `13-AUDIT/25-B3-TENANT-ISOLATION-INVARIANTS-INDEPENDENT-AUDIT-2026-10-04.md` (Contexto 2) | §1.1 el objeto no existe, §1.2 duplicación, §1.3 los 6 huecos genuinos, §1.4 defectos por clase, §14 matriz de auditoría, §15 el set corregido de 8, §15.2 cláusula de alcance, §15.4 enlace a lo existente, §16 reconciliación cross-contract, §17 gates, §18 veredicto y las 8 reconciliaciones |
| `13-AUDIT/23-BLOCK-3-TENANT-ISOLATION-ASIS-AUDIT-2026-10-04.md` | §3 reglas R1-R14, §6 clasificación de modelos, §7 matriz de operaciones, §10 vectores X-01..17, §11 nested/FK, §12 transacciones, §13 bypass, §14 gaps G-B3-01..13, §17 readiness |
| `13-AUDIT/24-B2-CONTROLLED-INVARIANT-RECONCILIATION-2026-10-04.md` | §4 colisiones de ID, §8 set canónico de 34, §15 veredicto; convención de prefijos cortos; no reutilizar números TE |
| `07-DESIGN/INVARIANTS/DERIVED/05-BLOCK-1-INVARIANTS-BASELINE-v0.1.md` | `INV-TEN-001`, `INV-CONTEXT-001`, `INV-MEM-001/002` |
| `07-DESIGN/TESTS-EVALS/DERIVED/00-TESTS-EVALS-v0.2.md` | `TE-TEN-001` y familia conceptual |
| `07-DESIGN/CONTRACTS/DOMAIN/08-R8-ARCH-003-…-v0.1.md` | §13.12 dependencia de B1 declarada OPEN |

## `[ND]` — no determinable

- **Ejecución** de la preservación del aislamiento dentro de una transacción interactiva (`ISO-006`). Las tres capas coinciden en que la evidencia de tipos apunta a que se preserva; **ninguna lo ejecutó**. Test de prioridad máxima.
- Comportamiento real ante un contexto firmado inválido: razonamiento sobre el mecanismo, no ejecutado.
- Resolución de `Legajo`/`DocumentoLegajo` (`ISO-AMBIG`): requiere decisión de modelo.
- Resultado de cualquier test: **ninguno existe**.

## Clases no emitidas

**`[T]` — ninguna.** Cero tests de aislamiento en el repositorio.
**`[E]` — ninguna.** No se ejecutó API, migraciones, build, lint ni test en este control.
