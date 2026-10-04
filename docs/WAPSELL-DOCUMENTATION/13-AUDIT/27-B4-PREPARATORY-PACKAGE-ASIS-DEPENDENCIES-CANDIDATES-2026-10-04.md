# B4 — PREPARATORY PACKAGE
## AS-IS · DEPENDENCIES · PRELIMINARY DOCUMENTARY DERIVATION

**Estado:** PAQUETE PREPARATORIO READ-ONLY — NO CANÓNICO — NO APROBADO — **B4 NO CERRADO**
**Fecha:** 2026-10-04
**Repo inspeccionado:** `apps/api`, `apps/pos-admin`, `apps/tienda-online`, commit base `7a39794`
**Contexto:** trabajo paralelo al cierre de B3, que se realiza en otro contexto
**Alcance de la acción:** solo inspección. Sin cambios de código, schema, migraciones, datos, contratos canónicos, invariants ni tests. Sin commits ni push. Sin crear ni cerrar Owner Decisions. **No se ejecutó ningún test ni la API.**

**Clases de evidencia:** `VERIFICADO POR CÓDIGO [C]` · `VERIFICADO POR TEST [T]` · `VERIFICADO POR EJECUCIÓN [E]` · `DOCUMENTADO [D]` · `NO DETERMINABLE [ND]`

> **No se emite ninguna evidencia `[T]` ni `[E]`.** No se ejecutó nada. Todo hallazgo conductual es `[C]` por lectura o `[D]`.

**Principio aplicado:** no suponer → no inventar → no modificar sin comprender → no declarar éxito sin verificar.

---

# 1. DEFINICIÓN DOCUMENTADA DE QUÉ ES B4

## 1.1 El hallazgo que condiciona todo el paquete

El encargo advierte: *"NO asumas qué significa B4 por el nombre. Determinalo desde la documentación real."* La inspección arroja un resultado que obliga a reencuadrar la tarea.

**B4 no es un bloque de dominio.** No existe en la documentación ninguna definición de B4 como área funcional (al estilo de B1=Identity/Context/Session, B2=Authorization, B3=Tenant Isolation).

**Evidencia de la ausencia** `[C]`:

| Búsqueda | Resultado |
|---|---|
| Archivos con `B4`/`BLOCK-4`/`BLOCK4` en el nombre | **1 solo**: `13-AUDIT/24-B4-IMPLEMENTATION-READINESS-ASSESSMENT-2026-10-04.md` |
| Definición de bloques en `00-GOVERNANCE/` (8 archivos) | **cero coincidencias** de `BLOQUE n` / `BLOCK n` |
| `05-REQUIREMENTS/` con Requirements de B4 | **no existe ninguno** |
| `06-SPECIFICATIONS/` con SPEC de B4 | **no existe ninguna** |
| Architecture de B4 | **no existe** (sí existe `06-BLOCK-1-ARCHITECTURE-SPEC-v0.1.md`) |
| Contracts de B4 | **no existen** en `07-DESIGN/CONTRACTS/DOMAIN/` (13 archivos, ninguno B4) |
| Invariants de B4 | **no existen** en `07-DESIGN/INVARIANTS/DERIVED/` (8 archivos, ninguno B4) |
| Tests/Evals de B4 | **no existen** en `07-DESIGN/TESTS-EVALS/` |
| Plan/Tasks nominalmente de B4 | **no existen** |

## 1.2 Qué es B4 entonces, según el único documento que lo nombra

`13-AUDIT/24-B4-IMPLEMENTATION-READINESS-ASSESSMENT-2026-10-04.md` (794 líneas) declara su propio alcance `[D]`:

> *"**En alcance:** B1 (Identity / Business Context / Session), B2 (Authorization), B3 (Tenant Isolation); su estado documental, contractual, de invariants y de tests; el código AS-IS correspondiente; y **la determinación del primer slice implementable**."*

Es decir: **B4 es la etapa de IMPLEMENTATION READINESS** — la capa que evalúa si los bloques de dominio anteriores están en condiciones de producir código autorizado, y que determina el primer incremento implementable. No añade dominio nuevo; **atraviesa B1/B2/B3**.

## 1.3 Confirmación estructural por la cadena de capas

La cadena documental está declarada en `11-IMPLEMENTATION-READINESS/PLAN/IMPLEMENTATION/01-BLOCK-1-IMPLEMENTATION-PLAN-v0.1.md` §2 `[D]`:

```
REQUIREMENTS → OWNER DECISIONS → CANONICAL SPEC → TO-BE → ARCHITECTURE →
CONTRACTS → INVARIANTS → TESTS/EVALS → TRANSFORMATION SPEC →
IMPLEMENTATION PLAN → TASKS → IMPLEMENTATION → VALIDATION
```

Y la estructura de carpetas reproduce exactamente esa cadena: `05-REQUIREMENTS/`, `06-SPECIFICATIONS/`, `07-DESIGN/{ARCHITECTURE,CONTRACTS,INVARIANTS,TESTS-EVALS}/`, `08-TOBE/`, `09-TRANSFORMATION/`, **`11-IMPLEMENTATION-READINESS/{PLAN,TASKS}/`** `[C]`.

**Conclusión:** B4 ocupa la capa `IMPLEMENTATION PLAN → TASKS`, materializada en `11-IMPLEMENTATION-READINESS/`. Un bloque de dominio (B1, B2, B3) recorre la cadena *horizontalmente* produciendo Architecture→Contracts→Invariants→Tests. B4 es un corte *vertical*: toma los tres bloques y pregunta si se puede implementar.

## 1.4 Definición operativa propuesta

> **B4 — IMPLEMENTATION READINESS & CONTROLLED EXECUTION.** La etapa que (a) evalúa si B1/B2/B3 alcanzaron el estado necesario para autorizar código, (b) define el primer incremento acotado e implementable, (c) establece la infraestructura de verificación que convierte propiedades documentadas en evidencia `[T]`/`[E]`, y (d) gobierna la promoción de tareas a READY.

**Esta definición es una propuesta de este paquete, DRAFT / CANDIDATE / NOT APPROVED.** No la establece ningún documento canónico; se deriva del alcance declarado del único documento B4 existente y de la estructura de carpetas. **Requiere confirmación del Owner** — ver OD-B4-01 (§14).

## 1.5 Riesgo de la lectura alternativa

Existe una lectura alternativa plausible: que "B4" designe el **siguiente bloque de dominio** aún no abierto (Commerce, Inventory, Payments, Messaging o Brand, todos con contratos de dominio ya existentes y con increments I4-I11 en el plan de implementación `[D]`).

**No la adopto, por tres razones verificables:**

1. El único documento que se autodenomina B4 declara explícitamente un alcance B1/B2/B3 transversal, no de dominio `[D]`.
2. El commit `ac555d6` lo agrupa como *"B2 Invariants + Block 4 Implementacition readline"* — "readiness", no un dominio `[C]`.
3. Los increments de dominio del plan de implementación están numerados **I4-I11**, no "B4", y cada uno está **BLOCKED** por cierres técnicos propios `[D]`.

**Pero la ambigüedad es real y debe resolverla el Owner, no la inferencia.** Es OD-B4-01, la decisión de mayor impacto de este paquete: si B4 fuera un bloque de dominio, todo este paquete tendría el alcance equivocado.

---

# 2. DOCUMENTOS RELEVANTES ENCONTRADOS

## 2.1 El único documento B4

| Documento | Líneas | Estado | Veredicto propio |
|---|---|---|---|
| `13-AUDIT/24-B4-IMPLEMENTATION-READINESS-ASSESSMENT-2026-10-04.md` | 794 | versionado (`ac555d6`), NO canónico | **BLOCKED** por un único blocker (T-01) |

## 2.2 Capa de readiness — la carpeta que B4 gobierna

`11-IMPLEMENTATION-READINESS/` — 26 archivos `[C]`:

| Subcarpeta | Archivos clave | Relevancia para B4 |
|---|---|---|
| `PLAN/IMPLEMENTATION/` | `00-IMPLEMENTATION-PLAN-v0.1/v0.2`, **`01-BLOCK-1-IMPLEMENTATION-PLAN-v0.1`**, `01-IMPLEMENTATION-PLAN-AUDIT` | **ALTA** — define increments I0-I12, gates, Definition of Ready/Done, requisitos de evidencia, rollback |
| `PLAN/TRANSFORMATION/` | `00-R7-...BASELINE`, `01-R7-...v0.2`, `02-R7-...AUDIT` | MEDIA — plan de transformación upstream |
| `TASKS/EXECUTION/` | **`01-BLOCK-1-TASK-EXECUTION-SET-v0.1`** | **ALTA** — matriz de tareas, estados, T1-T8, promoción |
| `TASKS/CONTROLLED-BASELINE/` | 14 archivos R8 (baseline, auditorías, assessments, evidence pack, gap matrix) | MEDIA-ALTA — baseline histórico controlado |
| `TASKS/R8/` | `00-R8-TASKS-BASELINE-001-490` | MEDIA — baseline original |

## 2.3 Insumos de los bloques que B4 evalúa

| Bloque | AS-IS | Contrato | Invariants | Tests/Evals | Estado para B4 |
|---|---|---|---|---|---|
| **B1** | `13-AUDIT/21-...` (437 líneas, `f99458e`) | `07-BLOCK-1-CONTRACTS-BASELINE-v0.1` | `05-BLOCK-1-INVARIANTS-BASELINE-v0.1` (48 invariants) | `05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1` | contrato con 14 OPEN `[D]` |
| **B2** | `13-AUDIT/22-...` (458 líneas) | `07-R8-AUTH-001-...-v0.1` | **`24-B2-CONTROLLED-...`** (34 IDs, en `13-AUDIT/`, **no publicado en `INVARIANTS/`**) | — | invariants cuasi-canónicos, sin archivo propio `[C]` |
| **B3** | `13-AUDIT/23-...` (623 líneas, `f99458e`) | **`09-R8-ARCH-002-...-v0.1`** + `27-B3-CONTRACT-RECONCILIATION-ADDENDUM` | **`06-BLOCK-3-TENANT-ISOLATION-INVARIANTS-v0.1`** (8 `ISO-*`) | `03-DECISIONS/48-B3-TESTS-EVALS-OWNER-DECISION-CLOSURE` (25 decisiones, untracked) | **cerrándose en otro contexto** |

## 2.4 Autoridad upstream

`03-DECISIONS/` — 48 archivos. Relevantes para B4: `30-R8-MASTER-OWNER-DECISION-CLOSURE` (tabla maestra de 43 filas), `31-R8-MASTER-DECISION-PROPAGATION-AUDIT`, `27-R8-ARCH-001-OWNER-APPROVAL` (arquitectura del primer slice), `32-R8-ID-002` (vía incremental Option A), y **`48-B3-TESTS-EVALS-OWNER-DECISION-CLOSURE`** (25 decisiones B3-TEST-001..025, **untracked**) `[C]`.

## 2.5 Relación de B4 con B1, B2 y B3

**No es secuencial, es transversal.**

```
        B1 Identity/Context/Session ──┐
        B2 Authorization ─────────────┼──→ B4 evalúa los tres
        B3 Tenant Isolation ──────────┘      y determina el primer slice
                                               │
                                               ↓
                                        I0..I12 (increments)
```

| Relación | Naturaleza | Evidencia |
|---|---|---|
| B4 ← B1 | **consume** el estado documental y el contrato de contexto/sesión | `[D]` §4.1 del doc B4 |
| B4 ← B2 | **consume** el estado de autorización | `[D]` §4.2 |
| B4 ← B3 | **consume** el contrato/invariants/tests de aislamiento; el primer slice propuesto **es de B3** | `[D]` §4.3, §16 |
| B4 → B1/B2/B3 | **devuelve** gates, blockers, clasificación de preservación y promoción de tareas | `[D]` §5-§19 |
| B4 ↔ dominio | **ninguna** — Commerce/Inventory/Payments/Messaging/Brand están fuera de alcance salvo dependencia cruzada | `[D]` §2 |

---

# 3. AS-IS DE B4

B4 es una capa documental y de proceso; su AS-IS son los artefactos de readiness y la **infraestructura real de verificación**, que es donde B4 se vuelve material.

## 3.1 AS-IS documental

| Hallazgo | Clase |
|---|---|
| Existe un assessment B4 de 794 líneas con veredicto **BLOCKED**, 4 gates y 5 familias de blockers | `[D]` |
| Existe un Implementation Plan de Block 1 con 13 increments (I0-I12), grafo de dependencias, Definition of Ready/Done, requisitos de evidencia y política de rollback | `[D]` |
| Existe un Task Execution Set con matriz de tareas, 5 estados y conjunto prioritario T1-T8 | `[D]` |
| Existe baseline controlado R8 con 14 artefactos (evidence pack, gap matrix, traceability audits) | `[D]` |
| **Ningún artefacto de readiness es canónico ni aprobado.** Todos dicen `DRAFT / NOT APPROVED` e `Implementation: NOT AUTHORIZED` | `[D]` |
| El plan declara: *"planning is permitted; general implementation is not authorized"* | `[D]` |

## 3.2 AS-IS de la infraestructura de verificación — el hallazgo central

Esto es lo que B4 realmente tiene que resolver, y es **verificable por código**.

| # | Hallazgo | Clase |
|---|---|---|
| 1 | **Jest está completamente instalado y configurado.** `jest@^29.5.2`, `ts-jest`, `@nestjs/testing`, `supertest`, `@types/jest`, `@types/supertest` en devDependencies | **`[C]`** |
| 2 | **La configuración jest es funcional:** `rootDir: "src"`, `testRegex: ".*(spec\|e2e-spec).ts$"`, transform ts-jest, `testEnvironment: node`, coverage configurado | **`[C]`** |
| 3 | **Existe un único spec en todo el repositorio:** `apps/api/src/health/health.controller.spec.ts` | **`[C]`** |
| 4 | **`apps/api/test/` NO EXISTE** | **`[C]`** ausencia verificada |
| 5 | **`test:e2e` apunta a un archivo inexistente:** `jest --config ./test/jest-e2e.json` → el directorio no existe. **El script falla si se invoca** | **`[C]`** |
| 6 | **`format` referencia un directorio inexistente:** `prettier --write "src/**/*.ts" "test/**/*.ts"` | **`[C]`** |
| 7 | **No existe CI.** `.github/workflows/` no existe; no hay pipeline de ningún proveedor | **`[C]`** ausencia |
| 8 | **Postgres disponible por compose:** `postgres:15-alpine`, puerto `5500:5432`, healthcheck `pg_isready`, volumen persistente | **`[C]`** |
| 9 | **`.env` existe** (619 bytes) junto a `.env.example` (1964 bytes) | **`[C]`** presencia, contenido no inspeccionado |
| 10 | **16 variables de entorno** referenciadas en código, incluidas `JWT_SECRET`, `TIENDA_EMPRESA_ID`, `GOOGLE_SIGNUP_EMPRESA_ID` | **`[C]`** |
| 11 | **El seed crea dos Empresas**, la segunda (`empresaAislamiento`) con jerarquía de catálogo completa | **`[C]`** |
| 12 | **Ningún test consume esa fixture** — se deduce de (3): el único spec es un health check | **`[C]`** |
| 13 | El monorepo tiene 3 apps: `api`, `pos-admin`, `tienda-online`; el script `test` de la raíz delega solo a `api` | **`[C]`** |
| 14 | Si los tests pasan, cuánto tardan, si el seed corre contra una base limpia | **`[ND]`** — no se ejecutó nada |
| 15 | Si existe base de datos de test separada de la de desarrollo | **`[ND]`** — no se inspeccionó el contenido de `.env` |

## 3.3 Scaffolding vs funcionalidad

El encargo advierte: *"No confundas scaffolding con funcionalidad."* Aplicado explícitamente:

| Elemento | Clasificación | Fundamento |
|---|---|---|
| Dependencias de test instaladas | **SCAFFOLDING** | Presentes y utilizables, pero 1 spec en todo el repo `[C]` |
| Configuración jest | **FUNCIONALIDAD latente** | Completa y correcta; `rootDir: src` significa que **un spec nuevo en `src/**` correría sin tocar configuración** `[C]` |
| `test:e2e` | **SCAFFOLDING ROTO** | Apunta a un archivo inexistente `[C]` |
| `format` | **SCAFFOLDING ROTO** (menor) | Glob a directorio inexistente `[C]` |
| Postgres por compose | **FUNCIONALIDAD** | Imagen, puerto, healthcheck y volumen definidos `[C]`; que arranque es `[ND]` |
| Fixture de dos Empresas | **FUNCIONALIDAD sin consumidor** | Construida y completa; cero tests la usan `[C]` |
| Artefactos de readiness | **FUNCIONALIDAD documental** | Increments, gates y matrices reales y utilizables; ninguno aprobado `[D]` |
| CI | **NO EXISTE** | No es scaffolding incompleto: no hay nada `[C]` |

**Lectura que importa para B4:** la distancia entre "cero tests" y "primer test de aislamiento corriendo" es **menor de lo que el veredicto BLOCKED sugiere**. Jest funciona, la base existe, la fixture multi-tenant está construida. Lo que falta es (a) escribir los specs y (b) decidir el aislamiento de la base de test. **Esto es trabajo de B4 y no depende del cierre documental de B3** — ver §8.

---

# 4. HALLAZGOS DE CÓDIGO

Inspección propia, no heredada de los audits previos.

| # | Hallazgo | Ubicación | Clase | Relevancia B4 |
|---|---|---|---|---|
| C-1 | `rootDir: "src"` + `testRegex` incluye `spec` y `e2e-spec` | `apps/api/package.json` (bloque `jest`) | `[C]` | **Un spec nuevo bajo `src/` corre sin cambios de config** |
| C-2 | `test:e2e` referencia `./test/jest-e2e.json`; el directorio no existe | idem + ausencia de `apps/api/test/` | `[C]` | Script roto — corrección trivial, dentro del alcance de B4 |
| C-3 | `format` incluye `"test/**/*.ts"` inexistente | idem | `[C]` | Defecto menor de configuración |
| C-4 | `supertest` y `@nestjs/testing` instalados y sin uso | devDependencies + único spec | `[C]` | La capacidad de test de integración existe sin ejercitarse |
| C-5 | No hay CI | ausencia de `.github/workflows/` | `[C]` | **Ningún test, aun escrito, se ejecutaría automáticamente** |
| C-6 | Postgres 15 en puerto no estándar `5500` | `docker-compose.yml` | `[C]` | Relevante para configurar la base de test |
| C-7 | El seed usa `new PrismaClient()` crudo y crea dos Empresas | `apps/api/prisma/seed.ts` | `[C]` | Correcto para un script offline; es la fixture que B4 necesita |
| C-8 | Tres scripts prisma: `migrate`, `seed`, `sync-permisos` | `apps/api/package.json` | `[C]` | Preparación de base para tests |
| C-9 | `start:prod` apunta a `dist/src/main.js` | idem | `[C]` | Contrato de build; sin verificar por ejecución |
| C-10 | `lint` corre `eslint --fix` (**muta código**) | idem | `[C]` | **Riesgo para CI:** un lint que modifica archivos no debe correr en verificación |
| C-11 | El script `test` de la raíz delega solo a `api`; `pos-admin` y `tienda-online` quedan sin cobertura | `package.json` raíz | `[C]` | Alcance de verificación incompleto a nivel monorepo |

**Nota sobre C-10:** coincide con una preferencia ya registrada del usuario sobre el comportamiento del lint. Se consigna como restricción de diseño de CI, no como defecto a corregir aquí.

---

# 5. HALLAZGOS DE TESTS

| # | Hallazgo | Clase |
|---|---|---|
| T-1 | **Un (1) spec en todo el repositorio:** `health.controller.spec.ts` | `[C]` |
| T-2 | Ese spec mockea `$queryRaw` para éxito y para fallo — es un test de unidad del health check, sin base de datos | `[C]` |
| T-3 | **Cero tests de aislamiento de tenant** | `[C]` ausencia |
| T-4 | **Cero tests de autenticación o autorización** | `[C]` ausencia |
| T-5 | **Cero tests de integración** contra Postgres | `[C]` ausencia |
| T-6 | **Cero tests E2E** y configuración E2E ausente | `[C]` ausencia |
| T-7 | Existen **21+ criterios SPECIFIED** en los catálogos documentales (`TE-ID-001..011`, `TE-AUTH-001..006`, `TE-TEN-001`, familias de dominio) y **ninguno implementado** | `[D]` + `[C]` |
| T-8 | **25 Owner decisions sobre estrategia de tests B3** (`B3-TEST-001..025`) ya aceptadas, incluidas nivel canónico (unit+integración), fuente de datos (seed + fixtures propias), identificación de tenants (crear Businesses dentro de cada suite) y criterio de PASS (resultado esperado **y** estado persistido) | `[D]` **untracked** |
| T-9 | `B3-TEST-022/023` fijan que `[T]` requiere ejecución del test específico y `[E]` requiere ejecución real contra la infraestructura objetivo con evidencia | `[D]` |
| T-10 | Si el único spec existente pasa | **`[ND]`** — no se ejecutó |

**La asimetría que define B4:** ~1.800 líneas de auditoría AS-IS en tres bloques, 13 contratos de dominio, ~90 invariants entre los tres sets, 21+ criterios de test especificados, 25 decisiones de Owner sobre cómo testear — y **un solo test, de un health check**.

---

# 6. GAPS

Gaps **de B4**, no de los bloques de dominio.

| ID | Gap | Severidad | Clase | ¿Depende de B3? |
|---|---|---|---|---|
| **G-B4-01** | **No existe infraestructura de test ejecutable para propiedades Business-scoped.** Jest funciona, pero no hay base de test aislada, ni ciclo de setup/teardown, ni factoría de fixtures por suite (que `B3-TEST-004` exige) | **ALTA** | `[C]` | **NO** |
| **G-B4-02** | **No existe CI.** Ningún test se ejecutaría automáticamente; no hay gate mecánico que impida una regresión | **ALTA** | `[C]` | **NO** |
| **G-B4-03** | **No existe baseline de regresión.** Modificar el componente que atraviesa 26 modelos sin red de regresión | **ALTA** | `[C]` | **NO** para construirla; sí para el contenido de aislamiento |
| **G-B4-04** | **`test:e2e` roto** y `format` con glob inválido | BAJA | `[C]` | **NO** |
| **G-B4-05** | **La fixture multi-tenant existe y no tiene consumidor** | **ALTA** (oportunidad) | `[C]` | **NO** |
| **G-B4-06** | **Ningún artefacto de readiness es canónico.** Plan, tasks y assessment son DRAFT; no hay un documento aprobado que gobierne la promoción a READY | MEDIA | `[D]` | **NO** |
| **G-B4-07** | **Los invariants B2 no están publicados en `INVARIANTS/`.** El set canónico de 34 IDs vive en `13-AUDIT/`; un test de B2 se trazaría a un invariant sin archivo normativo | MEDIA | `[C]` | **NO** |
| **G-B4-08** | **El assessment B4 está desactualizado respecto del repo.** Su blocker único T-01 (contrato de aislamiento inexistente) **ya no se sostiene**: el contrato existe | MEDIA | `[C]` | **sí, resuelto por B3** |
| **G-B4-09** | **No existe Definition of Done verificable por máquina.** La Definition of Done del plan exige "tests ejecutan correctamente"; sin CI no hay forma de constatarlo | MEDIA | `[D]` | **NO** |
| **G-B4-10** | **Dos apps del monorepo sin cobertura ni script de test** | BAJA | `[C]` | **NO** |
| **G-B4-11** | **`lint` muta código** (`eslint --fix`): inadecuado para un gate de verificación | BAJA | `[C]` | **NO** |
| **G-B4-12** | **No existe política de base de datos de test.** Si los tests corren contra la base de desarrollo, el seed puede destruir datos | **ALTA** | `[ND]` / `[C]` | **NO** |

**Observación sobre G-B4-08.** El assessment B4 declaró BLOCKED por T-01 el 2026-10-04 contra el commit `530b829`. Desde entonces aparecieron el contrato de aislamiento, su addendum y los invariants canónicos B3 `[C]`. **T-01 está materialmente resuelto.** Este paquete **no** reclasifica el veredicto de B4 —no le corresponde, y B3 se está cerrando en otro contexto— pero registra que el veredicto debe reevaluarse cuando B3 cierre.

---

# 7. DEPENDENCIAS B1 / B2 / B3

Matriz pedida: `B4 concern → dependencia B3 → B2 → B1 → puede avanzar ahora / debe esperar → motivo`.

| B4 concern | Dep. B3 | Dep. B2 | Dep. B1 | Estado | Motivo |
|---|---|---|---|---|---|
| **Base de datos de test aislada** (G-B4-12) | ninguna | ninguna | ninguna | **PUEDE AHORA** | Decisión de infraestructura. No depende de ninguna propiedad normativa |
| **Ciclo setup/teardown + factoría de fixtures** (G-B4-01) | ninguna para el mecanismo | ninguna | ninguna | **PUEDE AHORA** | `B3-TEST-002/003/004` ya fijan seed + fixtures propias + Businesses creados por suite `[D]`. La mecánica es independiente del contenido |
| **CI** (G-B4-02) | ninguna | ninguna | ninguna | **PUEDE AHORA** | Infraestructura. Su valor crece con los tests, pero no requiere ninguno para existir |
| **Arreglar `test:e2e` y `format`** (G-B4-04) | ninguna | ninguna | ninguna | **PUEDE AHORA** | Defectos de configuración autocontenidos |
| **Política de `lint` en verificación** (G-B4-11) | ninguna | ninguna | ninguna | **PUEDE AHORA** | Decisión de CI |
| **Scripts de test para las otras 2 apps** (G-B4-10) | ninguna | ninguna | ninguna | **PUEDE AHORA** | Independiente |
| **Baseline de regresión del comportamiento AS-IS actual** (G-B4-03) | ninguna | ninguna | ninguna | **PUEDE AHORA** | Un baseline captura lo que el sistema hace **hoy**. No requiere saber qué *debería* hacer |
| **Smoke test de arranque de la app** | ninguna | ninguna | ninguna | **PUEDE AHORA** | Verifica que el módulo compila y levanta |
| **Tests de aislamiento sobre la fixture existente** (G-B4-05) | **sí — set de invariants publicado** | ninguna | ninguna | **PREPARABLE, DEPENDE** | La mecánica y los datos pueden construirse ahora; **la trazabilidad a `ISO-*` requiere que B3 publique el set**. Escribirlos antes arriesga trazarlos a un invariant retirado |
| **Publicar invariants B2 en `INVARIANTS/`** (G-B4-07) | ninguna | **sí — 11 ítems abiertos** | ninguna | **PREPARABLE, DEPENDE** | El set de 34 IDs existe pero su propio veredicto deja 11 ítems abiertos `[D]` |
| **Canonizar los artefactos de readiness** (G-B4-06) | **sí** | **sí** | **sí** | **DEBE ESPERAR** | Un plan canónico que cite invariants no publicados sería inestable |
| **Definition of Done verificable** (G-B4-09) | **sí** | **sí** | **sí** | **PREPARABLE, DEPENDE** | La parte mecánica (CI verde) puede definirse ahora; la parte de contenido (qué tests son obligatorios) requiere los sets cerrados |
| **Reevaluar el veredicto B4** (G-B4-08) | **sí — cierre de B3** | parcial | parcial | **DEBE ESPERAR** | B3 se está cerrando en otro contexto. Reevaluar ahora contaminaría ambos |
| **Autorizar el primer slice de implementación** | **sí — cierre completo** | **sí** | parcial | **DEBE ESPERAR** | Requiere Gate B y D cerrados. Gate D exige tests ejecutados `[D]` |
| **Promoción de tareas a READY** | **sí** | **sí** | **sí** | **DEBE ESPERAR** | La Definition of Ready exige invariants y tests existentes `[D]` |

## 7.1 Clasificación A / B / C

### A — Independiente de B3 (puede ejecutarse ya)

1. Base de datos de test aislada y su política (G-B4-12)
2. Ciclo setup/teardown y factoría de fixtures (G-B4-01)
3. CI con instalación, build, lint no mutante y test (G-B4-02)
4. Corrección de `test:e2e` y `format` (G-B4-04)
5. Baseline de regresión del comportamiento actual (G-B4-03)
6. Smoke test de arranque
7. Scripts de test para `pos-admin` y `tienda-online` (G-B4-10)

**Siete líneas de trabajo sin ninguna dependencia de B3.** El encargo pide no bloquear artificialmente: éstas no deben esperar.

### B — Preparable, depende de B3 para cerrar

8. Tests de aislamiento sobre la fixture existente — construibles ahora, **trazables solo cuando B3 publique el set** (G-B4-05)
9. Publicación de los invariants B2 (G-B4-07)
10. Definition of Done — parte mecánica ahora, parte de contenido después (G-B4-09)

### C — Necesariamente después del cierre de B3

11. Canonización de los artefactos de readiness (G-B4-06)
12. Reevaluación del veredicto B4 y sus gates (G-B4-08)
13. Autorización del primer slice
14. Promoción de tareas a READY

**Lectura:** 7 de 14 líneas pueden avanzar ya; 3 son preparables; solo 4 deben esperar. **El cuello de botella de B4 no es B3 — es la ausencia de infraestructura de verificación, que nadie está bloqueando.**

---

# 8. QUÉ PUEDE AVANZAR EN PARALELO

Detalle de la clase A, con lo que cada ítem produce y por qué no interfiere con B3.

| # | Trabajo | Produce | Por qué no interfiere con B3 |
|---|---|---|---|
| 1 | **Política de base de test** | Decisión documentada: base dedicada, esquema por suite, o contenedor efímero | No toca ninguna propiedad normativa. Es un prerequisito de **cualquier** test, de cualquier bloque |
| 2 | **Arnés de test de integración** | Utilidades de setup/teardown, creación de dos Businesses por suite, limpieza entre tests | `B3-TEST-002/003/004` ya fijaron la estrategia `[D]`. Implementar el arnés no decide nada normativo |
| 3 | **CI** | Pipeline que instala, compila, lint-verifica y corre tests | Hoy no hay nada que pueda romper. Y construirlo con un solo test es más seguro que con cincuenta |
| 4 | **Corrección de scripts** | `test:e2e` operativo o eliminado; `format` con globs válidos | Defectos autocontenidos de configuración |
| 5 | **Baseline de regresión** | Tests que capturan el comportamiento **actual** de endpoints representativos | Un baseline no afirma que el comportamiento sea correcto: afirma que es **el de hoy**. Es exactamente la red que falta para modificar el componente que atraviesa 26 modelos |
| 6 | **Smoke test** | Un test que arranca el módulo y verifica que compila y levanta | Independiente de todo contenido normativo |
| 7 | **Cobertura de las otras apps** | Scripts de test en `pos-admin` y `tienda-online` | Fuera del alcance de B1/B2/B3 |

## 8.1 Recomendación de secuencia para la clase A

**Orden propuesto** (DRAFT / CANDIDATE):

```
1. Política de base de test        (habilita todo lo demás)
2. Arnés de integración + fixtures  (habilita 5 y los tests de B3)
3. Smoke test                       (primer test real que usa el arnés)
4. Corrección de scripts            (barato, elimina ruido)
5. CI                               (con 2 tests pasando, no con cero)
6. Baseline de regresión            (crece incrementalmente)
7. Cobertura de las otras apps      (último, menor valor)
```

**Fundamento del orden:** la política de base (1) es prerequisito del arnés (2), y el arnés es prerequisito de todo test de integración. El smoke test (3) va antes de CI (5) para que el pipeline nazca verificando algo real.

**Importante:** este orden es una recomendación documental. **Ninguno de estos ítems está autorizado a ejecutarse por este paquete.**

---

# 9. QUÉ DEBE ESPERAR B3

| # | Trabajo | Qué espera exactamente | Por qué no puede adelantarse |
|---|---|---|---|
| 1 | **Tests de aislamiento trazados a invariants** | Publicación del set B3 con su namespace acordado | Hay **tres propuestas incompatibles** (20, 41 y 8 invariants) `[D]`. Un test trazado al set equivocado habría que retrazarlo. **La mecánica sí puede construirse** (clase A ítem 2) |
| 2 | **Canonización de plan y tasks** | Cierre de B3 y publicación de invariants B2 | Un plan canónico que cite invariants no publicados sería inestable |
| 3 | **Reevaluación del veredicto B4** | Cierre de B3 en el otro contexto | Dos contextos reevaluando el mismo veredicto en paralelo producirían resultados divergentes |
| 4 | **Autorización del primer slice** | Gate B (contrato) y Gate D (tests ejecutados) | La Definition of Ready exige invariants y tests existentes `[D]` |
| 5 | **Promoción de tareas a READY** | Lo anterior | Idem |
| 6 | **Resolución de ownership ambiguo** (`Legajo`/`DocumentoLegajo`) | Decisión de modelo | `B3-TEST-011` ya decidió mantenerlo **OPEN / NOT TESTABLE** sin inventar regla de tenant `[D]` |

**Lo que NO debe esperar, y conviene afirmarlo explícitamente:** nada de la clase A. En particular, la ausencia de infraestructura de test (G-B4-01, G-B4-02, G-B4-12) no tiene ninguna dependencia de B3 y es hoy el obstáculo práctico más grande de B4.

---

# 10. CANDIDATES DE CONTRACTS

**DRAFT / CANDIDATE / NOT APPROVED.** Obligaciones observables de la capa de readiness, no mecanismos.

| ID | Statement candidato | Fuente | Dependencia | Estado |
|---|---|---|---|---|
| **B4-CON-C01** | Una propiedad solo se declara verificada cuando existe un test ejecutado con resultado verificable; "test definido" no equivale a "test pasado" | `B3-TEST-022/023` `[D]`; `02-EVIDENCE-POLICY` | ninguna | **DRAFT / CANDIDATE** |
| **B4-CON-C02** | Un incremento de implementación no se autoriza sin una red de regresión ejecutable sobre el comportamiento que modifica | Plan §9 Definition of Done `[D]`; G-B4-03 | ninguna | **DRAFT / CANDIDATE** |
| **B4-CON-C03** | La ejecución de tests no altera datos de desarrollo ni de producción | G-B4-12 | ninguna | **DRAFT / CANDIDATE** |
| **B4-CON-C04** | Un gate de verificación no modifica el código que verifica | G-B4-11 (`lint --fix`) `[C]` | ninguna | **DRAFT / CANDIDATE** |
| **B4-CON-C05** | Un test se traza a un invariant publicado en la capa de invariants, no a una propuesta de auditoría | G-B4-07 `[C]` | **B3, B2** | **DRAFT / CANDIDATE** |
| **B4-CON-C06** | Una tarea se promueve a READY solo si ninguna decisión normativa aplicable permanece abierta | Plan §7-§8 `[D]` | B1/B2/B3 | **DRAFT / CANDIDATE — ya existe en el plan**, candidato a elevar a contrato |
| **B4-CON-C07** | La evidencia de un incremento se clasifica explícitamente en las cinco clases y la clase no se infiere | `02-EVIDENCE-POLICY` `[D]`; Plan §10 | ninguna | **DRAFT / CANDIDATE** |
| **B4-CON-C08** | Todo cambio que afecte comportamiento existente define reversión o contención antes de ejecutarse | Plan §11 `[D]` | ninguna | **DRAFT / CANDIDATE — ya en el plan** |

**Nota de no-duplicación:** C06 y C08 **ya existen** como reglas del Implementation Plan `[D]`. Se listan como candidatos a *elevación* a contrato, no como obligaciones nuevas. Si el Owner prefiere mantenerlas solo en el plan, no se pierde nada normativo.

---

# 11. CANDIDATES DE INVARIANTS

**DRAFT / CANDIDATE / NOT APPROVED.**

**Advertencia metodológica, aprendida del trabajo de B3:** la derivación de invariants de B3 produjo tres propuestas incompatibles y duplicación masiva contra B1/B2. Para no repetirlo, aplico aquí la misma regla: **un candidato solo se propone si ninguna capa existente ya lo enuncia.**

| ID | Statement candidato | ¿Ya existe? | Clase | Testabilidad |
|---|---|---|---|---|
| **B4-INV-C01** | Una propiedad no se declara verificada sin un test ejecutado con resultado verificable | **Parcialmente** — `02-EVIDENCE-POLICY` y `B3-TEST-022/023` lo establecen `[D]` | CANDIDATE — posible **REFERENCIA**, no invariant nuevo | observable por revisión |
| **B4-INV-C02** | La ejecución de la suite de verificación no modifica el código verificado ni datos fuera del entorno de test | **No** | CANDIDATE / STABLE | observable |
| **B4-INV-C03** | Un test se traza a un invariant publicado | **No** | CANDIDATE / CONDITIONAL | observable una vez publicados los sets |
| **B4-INV-C04** | Un incremento con tests fallidos no se declara DONE | **Parcialmente** — Plan §9 `[D]` | CANDIDATE — posible **REFERENCIA** | observable con CI |

**Juicio propio, explícito:** de los cuatro, **solo B4-INV-C02 y B4-INV-C03 parecen invariants genuinamente nuevos**. C01 y C04 probablemente deban quedar como **referencias** a la política de evidencia y al Implementation Plan, exactamente como los invariants de B3 referencian a B1/B2 en lugar de duplicarlos.

**Y una duda honesta que no resuelvo por inferencia:** no está claro que B4 deba tener invariants propios. Un invariant enuncia una propiedad del **sistema**; estos enuncian propiedades del **proceso de verificación**. El precedente del repositorio sugiere que tales enunciados se clasifican como *process/gate rule*, no como invariants. **Lo registro como OD-B4-04.**

---

# 12. CANDIDATES DE TESTS/EVALS

**DRAFT / CANDIDATE / NOT APPROVED.** Ninguno escrito; ninguno ejecutado.

## 12.1 Clase A — sin dependencia de B3

| ID | Criterio candidato | Tipo | Depende de |
|---|---|---|---|
| **TE-B4-C01** | El módulo de la aplicación compila y arranca | smoke | nada |
| **TE-B4-C02** | El endpoint de health responde correctamente contra una base real | integración | base de test |
| **TE-B4-C03** | El arnés crea dos Businesses aislados y los limpia entre tests | infraestructura | base de test |
| **TE-B4-C04** | La suite no deja datos residuales tras ejecutarse | infraestructura | arnés |
| **TE-B4-C05** | Endpoints representativos conservan su comportamiento actual (baseline) | regresión | arnés |
| **TE-B4-C06** | El pipeline falla cuando un test falla | CI | CI |
| **TE-B4-C07** | El gate de verificación no produce cambios en el árbol de trabajo | CI | CI |

## 12.2 Clase B — preparable, traza pendiente de B3

| ID | Criterio candidato | Traza a | Estado |
|---|---|---|---|
| **TE-B4-C08** | La fixture de dos Businesses es consumida por al menos un test de aislamiento | set B3 | **mecánica preparable**, traza pendiente |
| **TE-B4-C09** | Los criterios `TE-ID-005/006/008/009/010/011` ya SPECIFIED tienen implementación | B1 `INV-CONTEXT-001`, `INV-TEN-001` | **preparable** — son de B1, ya publicados `[C]` |

**Hallazgo relevante para no bloquearse:** **TE-B4-C09 no depende de B3.** Los seis criterios `TE-ID-*` están especificados contra invariants de **B1**, que ya están publicados `[C]`. Pueden implementarse en paralelo con total seguridad de trazabilidad.

## 12.3 Fuera de alcance de B4

Los criterios de aislamiento trazados a `ISO-*`, los de autorización trazados al set B2 no publicado, y las familias de dominio. Pertenecen a sus bloques.

---

# 13. CANDIDATES DE TASKS

**DRAFT / CANDIDATE / NOT APPROVED.** Estados conforme al Task Execution Set: DONE / READY / BLOCKED / PROPOSED / IN PROGRESS `[D]`.

| ID | Tarea candidata | Estado propuesto | Dependencia | Entregable |
|---|---|---|---|---|
| **TK-B4-C01** | Decidir y documentar la política de base de datos de test | **PROPOSED → READY** | ninguna | Decisión documentada |
| **TK-B4-C02** | Construir el arnés de test de integración y la factoría de fixtures | **PROPOSED** | TK-B4-C01 | Utilidades de test |
| **TK-B4-C03** | Corregir `test:e2e` y `format` | **PROPOSED → READY** | ninguna | Scripts operativos |
| **TK-B4-C04** | Escribir el smoke test | **PROPOSED** | TK-B4-C02 | 1 test |
| **TK-B4-C05** | Definir y construir CI | **PROPOSED** | TK-B4-C04 | Pipeline |
| **TK-B4-C06** | Construir baseline de regresión incremental | **PROPOSED** | TK-B4-C02 | Suite de baseline |
| **TK-B4-C07** | Implementar `TE-ID-005/006/008/009/010/011` (trazados a B1) | **PROPOSED** | TK-B4-C02 | 6 tests |
| **TK-B4-C08** | Publicar los invariants B2 en `INVARIANTS/` | **BLOCKED** | 11 ítems abiertos de B2 | Archivo de invariants |
| **TK-B4-C09** | Implementar tests de aislamiento trazados al set B3 | **BLOCKED** | publicación del set B3 | Suite de aislamiento |
| **TK-B4-C10** | Reevaluar el veredicto y los gates de B4 | **BLOCKED** | cierre de B3 | Assessment actualizado |
| **TK-B4-C11** | Canonizar plan y tasks de readiness | **BLOCKED** | B1/B2/B3 | Artefactos canónicos |
| **TK-B4-C12** | Añadir scripts de test a `pos-admin` y `tienda-online` | **PROPOSED** | ninguna | Scripts |

**Siete tareas sin dependencia bloqueante** (C01-C07, C12). **Cinco BLOCKED** por cierres ajenos.

**Ninguna tarea está autorizada a ejecutarse por este paquete.** El estado "READY" propuesto significa "no tiene dependencia normativa abierta", no "ejecutable ahora".

---

# 14. OWNER DECISIONS PENDIENTES

**IDs provisionales.** El repositorio no establece ninguno; conforme al encargo, **no se asigna ID canónico**. La numeración `OD-B4-nn` es local a este paquete.

---

### OD-B4-01 — ¿Qué es B4?

**Pregunta:** ¿B4 designa la etapa de Implementation Readiness transversal a B1/B2/B3, o el siguiente bloque de dominio aún no abierto?

**Opciones:**
- **A.** Implementation Readiness & Controlled Execution (transversal).
- **B.** El siguiente bloque de dominio (Commerce, Inventory, Payments, Messaging o Brand).
- **C.** Ambos: "B4" como readiness y los dominios como increments I4-I11.

**Recomendación: A**, con registro de que C es compatible. Fundamento verificable: el único documento que se autodenomina B4 declara alcance B1/B2/B3 transversal `[D]`; los increments de dominio están numerados I4-I11, no B4 `[D]`; el commit lo agrupa como "readiness" `[C]`.

**Impacto: CRÍTICO.** Si la respuesta fuera B, **todo este paquete tendría el alcance equivocado**. Es la primera decisión a resolver.

---

### OD-B4-02 — Aislamiento de la base de datos de test

**Pregunta:** ¿Contra qué base ejecutan los tests de integración?

**Opciones:**
- **A.** Base dedicada de test, creada y migrada por el arnés.
- **B.** Esquema separado por suite dentro de la misma instancia.
- **C.** Contenedor efímero por ejecución.
- **D.** La base de desarrollo existente.

**Recomendación: A.** Es la opción más simple compatible con `B3-TEST-001` (unit + integración contra PostgreSQL/Prisma) `[D]` y la única que elimina el riesgo de que el seed destruya datos de desarrollo. C es más limpia pero añade dependencia de Docker en el ciclo de test. **D se descarta explícitamente** por riesgo de pérdida de datos.

**Impacto: ALTO.** Prerequisito de toda la clase A. Es decisión de infraestructura, posiblemente delegable a criterio técnico.

---

### OD-B4-03 — ¿Se construye CI ahora o después del primer slice?

**Pregunta:** ¿La ausencia de CI es blocker del primer incremento o trabajo paralelo?

**Opciones:**
- **A.** CI antes de autorizar cualquier incremento.
- **B.** CI en paralelo, sin bloquear.
- **C.** CI después del primer slice.

**Recomendación: B.** El assessment B4 clasifica la ausencia de red de regresión como blocker de evidencia *resoluble dentro del slice* `[D]`, no como blocker normativo. Construir CI con uno o dos tests es más barato y seguro que con una suite grande.

**Impacto: MEDIO.** Afecta orden de trabajo, no corrección.

---

### OD-B4-04 — ¿Tiene B4 invariants propios?

**Pregunta:** ¿Las propiedades del proceso de verificación se expresan como invariants, o como reglas de proceso y referencias?

**Opciones:**
- **A.** B4 no tiene invariants propios; sus propiedades son reglas de proceso y referencias a la política de evidencia y al plan.
- **B.** B4 tiene un set reducido propio (los candidatos C02 y C03 de §11).
- **C.** B4 tiene un set completo (los cuatro candidatos).

**Recomendación: A o B, con preferencia por A.** Fundamento: un invariant enuncia una propiedad del sistema; éstos enuncian propiedades del proceso. El precedente del repositorio clasifica tales enunciados como *process/gate rule*. C duplicaría la política de evidencia y el plan.

**Impacto: MEDIO.** Evita repetir la duplicación que ya ocurrió en la derivación de invariants de B3.

---

### OD-B4-05 — Alcance de verificación del monorepo

**Pregunta:** ¿La verificación cubre solo `api` o también `pos-admin` y `tienda-online`?

**Opciones:**
- **A.** Solo `api` por ahora.
- **B.** Las tres apps desde el inicio.
- **C.** `api` + smoke de build de las otras dos.

**Recomendación: C.** `api` concentra las propiedades de B1/B2/B3; un smoke de build en las otras dos evita que se rompan silenciosamente a bajo costo.

**Impacto: BAJO.**

---

### OD-B4-06 — Prioridad de los defectos de seguridad AS-IS frente al trabajo de transformación

**Pregunta:** Los tres defectos AS-IS que el assessment B4 registra como deuda de seguridad (exposición de hashes de contraseña en un endpoint, aprobación de legajos sin permiso, vinculación por email sin verificación) — ¿se priorizan antes del trabajo de transformación?

**Opciones:**
- **A.** Sí, antes y como informe de defectos separado.
- **B.** Se integran en los increments correspondientes.
- **C.** Esperan al TO-BE.

**Recomendación: A.** El propio assessment B4 lo recomienda y señala el primero de los tres como merecedor de atención inmediata `[D]`. Son defectos AS-IS, no diseño TO-BE, y **no deberían esperar**.

**Impacto: ALTO en riesgo, BAJO en planificación.** No bloquea B4, pero es la decisión con mayor consecuencia práctica inmediata de este paquete.

**Nota:** esta decisión existe ya como recomendación en el assessment B4 `[D]`. Se replantea aquí porque **no consta que haya sido tomada** — no se encontró informe de defectos ni decisión al respecto `[C]`.

---

**No se resuelve ninguna de las seis por inferencia. No se les asigna ID canónico. No se crea ninguna Owner Decision.**

---

# 15. RIESGOS Y CONTRADICCIONES

## 15.1 Riesgos

| ID | Riesgo | Severidad | Mitigación propuesta |
|---|---|---|---|
| **R-01** | **Este paquete asume la definición equivocada de B4.** Si B4 fuera un bloque de dominio, el alcance entero sería incorrecto | **ALTA** | OD-B4-01 primero. El paquete declara su definición como propuesta, no como hecho |
| **R-02** | **Tests escritos antes de publicar los invariants** quedarían trazados a un invariant retirado | MEDIA | Clase B explícita; `TE-B4-C09` muestra que los criterios de **B1** sí pueden implementarse ya |
| **R-03** | **Tests corriendo contra la base de desarrollo** destruirían datos vía seed | **ALTA** | OD-B4-02; opción D descartada explícitamente |
| **R-04** | **Trabajo duplicado entre contextos paralelos.** Este contexto trabaja B4 mientras otro cierra B3 | MEDIA | §9 declara qué debe esperar; este paquete **no** reclasifica el veredicto de B4 ni toca artefactos de B3 |
| **R-05** | **El assessment B4 está desactualizado** y su veredicto BLOCKED podría citarse como vigente cuando su blocker ya no se sostiene | MEDIA | G-B4-08 lo registra sin reclasificar |
| **R-06** | **CI con `lint --fix`** modificaría código durante la verificación | MEDIA | B4-CON-C04; OD-B4-03 |
| **R-07** | **Parálisis por dependencia percibida:** tratar todo B4 como bloqueado por B3 cuando 7 de 14 líneas no lo están | **ALTA** | §7.1 y §8; el encargo pide explícitamente no bloquear artificialmente |
| **R-08** | **Los defectos de seguridad AS-IS siguen sin informe ni decisión** | **ALTA** | OD-B4-06 |
| **R-09** | **Invariants B2 sin publicar:** un test de autorización se trazaría a un documento de auditoría | MEDIA | TK-B4-C08 (BLOCKED) |

## 15.2 Contradicciones encontradas

| ID | Contradicción | Naturaleza | Resolución propuesta |
|---|---|---|---|
| **X-01** | El assessment B4 declara **BLOCKED** por "no existe contrato de aislamiento"; el contrato **ahora existe** `[C]` | **Desactualización**, no contradicción lógica | Reevaluar cuando B3 cierre (TK-B4-C10). **No reclasificar aquí** |
| **X-02** | El assessment B4 dice que los invariants de B3 son "solo `INV-TEN-001` genérico"; ahora existe un set de 8 `ISO-*` `[C]` | Desactualización | Idem |
| **X-03** | `package.json` declara `test:e2e` apuntando a una config inexistente | **Contradicción real código↔configuración** `[C]` | TK-B4-C03 |
| **X-04** | `format` incluye un directorio inexistente | Contradicción menor `[C]` | TK-B4-C03 |
| **X-05** | El Implementation Plan exige en su Definition of Done que "los tests ejecuten correctamente"; no existe mecanismo para constatarlo | **Contradicción entre norma y capacidad** | G-B4-09; CI |
| **X-06** | El set canónico B2 vive en `13-AUDIT/` pero se usa como normativo | **Contradicción de capa** (AUDIT citado como INVARIANTS) | TK-B4-C08 |
| **X-07** | El plan prohíbe implementación general pero permite planificación; la clase A implica **escribir código de test** | **Contradicción aparente** | Los artefactos de test no son implementación de comportamiento de producto. **Requiere confirmación** — se consigna, no se resuelve |

**X-07 merece énfasis.** La clase A requiere escribir archivos de test, arnés y CI — es código, aunque no sea comportamiento de producto. El plan dice *"planning is permitted; general implementation is not authorized"* `[D]`. **Mi lectura es que la infraestructura de verificación no es "implementación general", pero no es una lectura que yo deba imponer.** Si el Owner la considera implementación, la clase A pasa de "puede ahora" a "requiere autorización" — sin cambiar el análisis de dependencias, solo el permiso.

## 15.3 Lo que este paquete NO verificó

| Ítem | Clase |
|---|---|
| Que el único spec existente pase | `[ND]` |
| Que el compose arranque y la base acepte conexiones | `[ND]` |
| Que el seed corra sin error contra base limpia | `[ND]` |
| Contenido de `.env` (solo presencia) | `[ND]` |
| Que el build compile | `[ND]` |
| `pos-admin` y `tienda-online` más allá de su existencia | `[ND]` |
| Los 8 documentos que un informe previo marca `[ND]` | `[ND]` — se mantiene esa clasificación |

---

# 16. RECOMENDACIÓN DEL SIGUIENTE PASO

## 16.1 Acción inmediata

**Resolver OD-B4-01** — confirmar qué es B4. Es la única decisión cuyo resultado puede invalidar el resto del paquete. No requiere análisis adicional: requiere una respuesta del Owner.

## 16.2 En paralelo, sin esperar nada

**Si OD-B4-01 se confirma como opción A**, iniciar la clase A en el orden de §8.1, decidiendo primero **OD-B4-02** (base de test), que es su prerequisito.

**Y, con prioridad propia: OD-B4-06.** Los tres defectos de seguridad AS-IS no tienen informe ni decisión registrada `[C]`. No bloquean B4 y no deberían esperar al TO-BE. Es la recomendación de mayor consecuencia práctica de este paquete.

## 16.3 Cuando B3 cierre

1. Reevaluar el veredicto y los gates de B4 (TK-B4-C10) — X-01 y X-02 sugieren que el blocker único ya no se sostiene.
2. Implementar los tests de aislamiento trazados al set publicado (TK-B4-C09).
3. Publicar los invariants B2 (TK-B4-C08).
4. Canonizar plan y tasks (TK-B4-C11).
5. Reevaluar la autorización del primer slice.

## 16.4 Secuencia global propuesta

```
OD-B4-01 (qué es B4)
        ↓
OD-B4-02 (base de test) ──→ clase A: arnés → smoke → scripts → CI → baseline
        ↓                              (en paralelo con el cierre de B3)
OD-B4-06 (defectos AS-IS) ──→ informe separado
        ↓
   [cierre de B3 en el otro contexto]
        ↓
TK-B4-C10 reevaluación · TK-B4-C09 tests · TK-B4-C08 invariants B2
        ↓
TK-B4-C11 canonización → reevaluación del primer slice
```

## 16.5 Lo que este paquete entrega y lo que no

**Entrega:** una definición propuesta de B4 con su evidencia y su riesgo; el AS-IS de la capa de readiness y de la infraestructura real de verificación; 12 gaps; una matriz de dependencias que distingue 7 líneas libres de 4 bloqueadas; candidatos de contracts, invariants, tests y tasks, todos etiquetados DRAFT; 6 Owner Decisions con ID provisional; y 9 riesgos con 7 contradicciones.

**No entrega, deliberadamente:** ninguna decisión tomada, ningún ID canónico, ninguna reclasificación del veredicto de B4, ningún artefacto canónico modificado, ninguna autorización de implementación.

---

# 17. DECLARACIÓN DE CUMPLIMIENTO

| Restricción del encargo | Cumplimiento |
|---|---|
| No modificar código | **Cumplido** — `git diff` vacío |
| No modificar schema | **Cumplido** |
| No modificar contratos canónicos ni datos | **Cumplido** — ningún archivo existente modificado |
| No hacer commits ni push | **Cumplido** |
| **No declarar B4 cerrado, aprobado ni listo** | **Cumplido** — el documento declara DRAFT / NO APROBADO / B4 NO CERRADO en su encabezado, y no emite veredicto de readiness |
| No inventar decisiones de Owner | **Cumplido** — 6 decisiones identificadas con ID **provisional**, ninguna resuelta por inferencia, ninguna creada |
| No modificar documentos canónicos existentes | **Cumplido** |
| No confundir scaffolding con funcionalidad | **Cumplido** — §3.3 clasifica cada elemento |
| No bloquear artificialmente B4 | **Cumplido** — §7.1 identifica 7 líneas sin dependencia de B3; R-07 nombra el riesgo opuesto |
| No convertir inferencia técnica en requisito | **Cumplido** — §11 cuestiona sus propios candidatos; X-07 se consigna sin resolverse |
| No declarar tests ejecutados | **Cumplido** — cero `[T]`, cero `[E]` |

---

**B4 — PAQUETE PREPARATORIO: COMPLETO — NO CANÓNICO — NO APROBADO.**

Este documento no cierra B4, no lo declara READY, no crea decisiones, no modifica artefactos existentes y no autoriza implementación. Está destinado a llevarse al contexto principal de WAPSELL para reconciliación y aprobación.
