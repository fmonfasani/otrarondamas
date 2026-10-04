# B4 — IMPLEMENTATION READINESS ASSESSMENT

**Estado:** EVALUACIÓN DE READINESS READ-ONLY — NO CANÓNICO — NO APROBADO
**Fecha:** 2026-10-04
**Repo evaluado:** `apps/api`, commit base `530b829`
**Autoridad usada (no reinterpretada):** R8-ARCH-001, R8-ARCH-002, R8-ARCH-003, R8-AUTH-001, R8-ID-002, R8-ID-003, y la tabla maestra de 43 filas de `03-DECISIONS/30-R8-MASTER-OWNER-DECISION-CLOSURE-2026-10-03.md`.
**Alcance de la acción:** solo inspección. Sin cambios de código, schema, migraciones, datos, contratos canónicos, invariants ni tests. Sin commits, push ni deploy. No se cerró ninguna Owner Decision. No se ejecutó ningún test ni la API.

**Clases de evidencia:** `[C]` verificado por código (archivo + símbolo + línea) · `[T]` verificado por test · `[E]` verificado por ejecución · `[D]` documentado · `[ND]` no determinable.

> **No se emite ninguna evidencia `[T]` ni `[E]` en este documento.** No existe test ejecutado que cubra B1, B2 o B3. El único spec del repositorio es `apps/api/src/health/health.controller.spec.ts` `[C]`, y `apps/api/test/` no existe aunque `package.json` referencie `test/jest-e2e.json` `[C]`.

**Insumos de los tres bloques:**
- B1 — `13-AUDIT/21-BLOCK-1-AUTH-SESSION-BUSINESS-CONTEXT-ASIS-AUDIT-2026-10-04.md` (437 líneas, borrador no versionado).
- B2 — `13-AUDIT/22-B2-AUTHORIZATION-INVARIANTS-RECONCILIATION-2026-10-04.md` (458 líneas, borrador no versionado).
- B3 — `13-AUDIT/23-BLOCK-3-TENANT-ISOLATION-ASIS-AUDIT-2026-10-04.md` (623 líneas, borrador no versionado).

Los tres son borradores no canónicos. No se tomaron como autoridad: sus afirmaciones estructurales fueron re-verificadas contra el código (sec. 13).

---

# 1. EXECUTIVE SUMMARY

**Veredicto: BLOCKED** — por un único faltante documental estructural, resoluble sin Owner Decision.

Con el audit de B3 ya disponible, los tres bloques tienen auditoría AS-IS completa. El estado es asimétrico:

| Bloque | Decisión Owner | Contrato técnico | Invariants | Tests | Código AS-IS | Clasificación |
|---|---|---|---|---|---|---|
| **B1** Identity / Context / Session | CERRADA `[D]` | v0.1, 14 OPEN `[D]` | baseline Block 1 `[D]` | SPECIFIED, 0 ejecutados | contradice el objetivo `[C]` | **READY FOR TECHNICAL DESIGN** |
| **B2** Authorization | CERRADA `[D]` | cerrado para uso downstream `[D]` | 31 derivados, DRAFT no canónico `[D]` | ~12 TE faltantes | contradice 12 de 31 `[C]` | **READY WITH RECONCILIATION** |
| **B3** Tenant Isolation | CERRADA `[D]` | **NO EXISTE** `[C]` ausencia | solo `INV-TEN-001` genérico `[D]` | TE-ID-008..011 SPECIFIED, 0 ejecutados | mecanismo real con perímetro por disciplina `[C]` | **READY WITH RECONCILIATION** (AS-IS) / **BLOCKED** (contrato) |

**Hallazgo central:** B3 es el único bloque sin contrato técnico. En `07-DESIGN/CONTRACTS/DOMAIN/` (11 archivos) existen contratos para R8-ID-003, R8-AUTH-001 y R8-ARCH-003; **ninguno para R8-ARCH-002** `[C]` ausencia verificada por listado. R8-ARCH-002 §6 enumera 10 ítems que "remain open and must be specified" y ningún documento posterior los especifica. El audit de B3 confirma esa lista contra el código y la cuantifica.

B3 importa porque es donde el límite de seguridad se vuelve ejecutable: B1 y B2 definen quién puede operar; B3 define que la operación no escape del tenant. El primer slice seguro (sec. 16) es un slice de B3.

**Lo sólido:**
- **Cero Owner blockers.** Verificado contra la tabla maestra: ninguna contradicción real con una decisión aprobada en los tres bloques. El audit de B3 llega independientemente a la misma conclusión.
- R8-ID-002 aprobó explícitamente la vía incremental (Option A: adaptar `Empresa`, introducir Membership incrementalmente) `[D]`, habilitando un camino no destructivo.
- El mecanismo de aislamiento AS-IS tiene un **núcleo sólido**: inyección en `where`, forzado de `empresaId` en `create`, y **fail-closed real** ante operaciones no contempladas `[C]`.

**Lo que bloquea:** el contrato B3 (único estructural); tres ítems técnicos que harían inestables los tests; colisiones de ID documentales; y cero baseline de regresión.

**Lo que NO bloquea:** matriz atómica de permisos, MFA, refresh/logout, Business Switch, dispositivos, schema físico, y los defectos AS-IS G-08/G-09/G-10.

**El dato que mejor resume el estado del proyecto:** 1.518 líneas de auditoría AS-IS en tres bloques, 36 contratos, decenas de invariants, 21+ criterios de test — y **cero tests ejecutados**. Además, `prisma/seed.ts` **ya crea** una segunda Empresa (`empresaAislamiento`) con catálogo propio, y **ningún test la consume** `[C]`. La fixture que R8-ARCH-002 §3.12 exige para la verificación negativa está construida y sin usar.

---

# 2. SCOPE

**En alcance:** B1 (Identity / Business Context / Session), B2 (Authorization), B3 (Tenant Isolation); su estado documental, contractual, de invariants y de tests; el código AS-IS correspondiente; y la determinación del primer slice implementable.

**Fuera de alcance:** Commerce, Inventory, Payments, Cash, Messaging, Brand, Fulfillment y Returns (solo por dependencia cruzada). Migración y cutover. Plan de migración completo — este documento busca el *minimum safe controlled implementation slice*, no la transformación entera.

**Límites de inspección propios:** no se ejecutó test, build, lint ni API. No se leyeron línea por línea `ventas`, `pedidos`, `caja` (service), `pagos`, `fidelizacion`. Los 8 documentos que el informe 22 §14 marca `[ND]` no se releyeron; mantengo esa clasificación.

**No implementar:** este documento no implementa el slice de la sec. 16.

---

# 3. SOURCE-OF-TRUTH AND PRECEDENCE

Precedencia aplicada:

`OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > CONTRACTS > INVARIANTS > TESTS/EVALS > AUDIT > HISTORICAL`

No se reabrió ninguna decisión Owner aprobada.

**Nota de precedencia:** `03-DECISIONS/10-OPEN-DECISIONS.md` declara las 18 decisiones del workshop abiertas, con encabezado de reconciliación del 2026-09-28 — anterior a toda la capa R8. Conviven dos capas de decisión sin reconciliar. No lo trato como contradicción con R8: es un artefacto histórico cuya vigencia quedó superada por el cierre R8, pero el repositorio no lo registra. Clasificado como reconciliación documental (sec. 11, D-06).

---

# 4. CURRENT B1 / B2 / B3 STATE

## 4.1 B1 — Identity / Business Context / Session

**CLOSED `[D]`:** dirección JWT-céntrica con contexto de Business controlado por la aplicación (R8-ARCH-003). Cadena canónica completa. 11 cláusulas normativas firmes (AUTH-001..005, CTX-001..006). Lo cerrado de Business Switch (§9): el contexto resuelve por Membership, INACTIVE no es seleccionable, el switch no concede acceso fuera de las Memberships válidas ni anula el aislamiento. Coexistencia legacy acotada (§10). Clasificación de preservación por componente (§14): 10 filas, ninguna REPLACED.

**CLOSED — R8-ID-002 `[D]`:** Option A aprobada. `User → Membership → Empresa/Business`, con `Empresa` como representación física compatible durante la transición. Membership N:N; Role pertenece a Membership; ACTIVE/INACTIVE; múltiples Memberships. `Usuario→Empresa` directo es transicional y debe dejar progresivamente de ser la relación canónica de autorización. §6 **no autoriza**: modificar el schema Prisma, migrar la DB, renombrar `Empresa`, borrar `Usuario.empresaId`, refactor de código, backfill, cutover ni rollback.

**OPEN TECHNICAL `[D]`:** los 14 ítems de ARCH-003 §13. Relevantes para el primer slice: §13.8 (mecanismo de almacenamiento/propagación del contexto) y §13.11 (mecanismo exacto de enforcement). No relevantes: claims, lifetime, refresh, revocación, logout, dispositivos, transporte del switch, MFA, Google, schema físico, contrato de error de API, cutover.

**AS-IS `[C]`:** no existe Membership, Role ni Business. `Usuario` mezcla identidad (`email @unique` global), pertenencia (`empresaId` obligatorio), rol (`rol @default(OWNER)`) y estado operativo (`estadoLegajo`, `activo`). El JWT es la autoridad efectiva: `jwt.strategy.ts:23-35` devuelve el payload mapeado sin una sola llamada a la base. 8 h, sin refresh, sin revocación, sin logout en backend, secreto único para Usuario y Cliente.

## 4.2 B2 — Authorization

**CLOSED FOR DOWNSTREAM USE `[D]`:** R8-AUTH-001. Catálogo de 4 roles MVP (Owner, Admin, Vendedor, Gestor de Stock); Customer, Supplier y Repartidor **no** son Membership Roles; matriz capability-level de 14 dominios × 4 roles (§7); prohibición de capa Profile/Capability/Override (§9); regla de no-conversión silenciosa de `UsuarioPermiso`.

**DOCUMENTADO, DRAFT `[D]`:** 31 invariants `INV-B2-*` — AUT(8), MEM(5), ROLE(4), PRM(4), CTX(4), CUS(5), LEG(6). Trazables a contratos cerrados y a filas de la tabla maestra. **No canónicos:** viven en un informe no versionado, no en `07-DESIGN/INVARIANTS/`.

**Se preserva la clasificación del informe 22: READY WITH RECONCILIATION.** No se convierte en READY. Las tres reconciliaciones que invoca siguen pendientes: colisiones de ID, D-06 `autorizaciones` sin contrato, y tres detalles técnicos abiertos.

**CONTRADICHO POR CÓDIGO `[C]`:** 12 de los 31. Causa única y estructural: el token es la autoridad por 8 h. `permissions.guard.ts:33` → `!user.permisos.includes(...)` contra el array del JWT; `:26-28` → `return true` explícito sin `@RequierePermiso`.

## 4.3 B3 — Tenant Isolation

**CLOSED `[D]`:** R8-ARCH-002. Aislamiento a nivel de aplicación como mecanismo primario. Descartados RLS, database-per-tenant, schema-per-tenant y separación física. 12 propiedades requeridas (§3). Invariant de seguridad (§7): una operación en contexto de A no debe leer, crear, modificar ni borrar datos de B, **independientemente de los valores que envíe el cliente**. `EmpresaScopedPrismaService` / `empresaScopeExtension` son **ADAPTED**, no reemplazados; ningún componente se elimina (§5). `C-TEN-001` CLOSED CONCEPTUALLY, con "physical schema" y "exact persistence enforcement implementation" explícitamente OPEN `[D]`.

**NO EXISTE `[C]` ausencia:** el contrato técnico. Los 10 ítems de ARCH-002 §6 sin especificar.

**AS-IS — lo que funciona `[C]`:** 42 modelos; 28 con `empresaId`; 26 cubiertos. `create`/`createMany` fuerza `empresaId` pisando el body. Las operaciones de lectura/escritura inyectan `empresaId` en el `where`. `findUnique`/`findUniqueOrThrow` validan post-query → `null` o P2025. **Falla cerrada:** `upsert`, `groupBy` y cualquier operación no listada lanzan error. `whitelist:true` en `main.ts:8`; **ningún DTO declara `empresaId` ni `businessId`**; **ningún controller acepta tenant ID por param, query, body ni header** `[C]`. El `$executeRaw` de `inventario.service.ts:266` incluye `empresaId` en el `WHERE`, parametrizado, con justificación documentada en `:258-265`. **No existen background jobs, schedulers, colas ni event handlers** `[C]` ausencia.

**AS-IS — los huecos `[C]`:**

| # | Hueco | Evidencia |
|---|---|---|
| H-1 | 2 modelos con `empresaId` fuera de la allow-list | `PagoProveedor`, `DevolucionProveedor` (verificado por `comm -23`) |
| H-2 | 12-14 modelos sin `empresaId` heredan por disciplina; `Legajo`/`DocumentoLegajo` con tenant **ambiguo** (2 ramas FK opcionales) | `empresa-scope.extension.ts:20-31`, que lo admite como "limitación real, no un TODO decorativo" |
| H-3 | Nested writes, `connect` e `include` no inspeccionados | la extensión solo mira `args.data` de nivel superior y `args.where` |
| H-4 | FKs del DTO no validadas contra el tenant | `compras.service.ts:343-398`: `items.create` desde `dto.items`, cast a `UncheckedCreateInput`, sin lookup de pertenencia |
| H-5 | `PrismaService` crudo inyectable desde cualquier módulo; 46 usos | `prisma.module.ts:6-8`; `auth*`, `invitaciones*`, `legajo*` |

**Síntesis del audit de B3, que suscribo:** no es un sistema sin aislamiento ni un sistema con aislamiento garantizado. Es un aislamiento de aplicación, **opt-in por call site**, con un núcleo sólido y un perímetro que depende de disciplina. De 17 vectores analizados, **uno** persiste datos cruzados (H-4); el resto está contenido, aunque un tercio lo está por orden de llamadas y no por mecanismo.

---

# 5. READINESS MATRIX

| # | Área | Requirement | Decision | Contract | Invariant | Test/Eval | AS-IS Evidence | Technical Open | Impl. Ready | Blocker |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Global User | `[D]` | CLOSED ID-002 | C-IDENT-001 `[D]` | INV-IDENT-001 | TE-ID-001 SPEC | `Usuario.email @unique` global `[C]`; mezcla pertenencia | schema físico | **READY FOR TECHNICAL DESIGN** | T-05 |
| 2 | Business | `[D]` | CLOSED ID-002 | C-TEN-001 `[D]` | INV-TEN-001 | — | `Empresa` compat-preserved `[C]` | renombrado futuro | **CLOSED FOR DOWNSTREAM USE** | — |
| 3 | Membership | `[D]` | CLOSED ID-002 | C-MEM-001 `[D]` | INV-B2-MEM-001 DRAFT | sin TE | **no existe** `[C]` | schema, cardinalidad | **READY FOR TECHNICAL DESIGN** | T-05, T-04 |
| 4 | Membership status | `[D]` | CLOSED #3 | C-MEM-001 `[D]` | INV-MEM-002 | TE-ID-003 SPEC | solo `Usuario.activo`, al login `[C]` | latencia revocación | **OPEN TECHNICAL** | T-03 |
| 5 | Active Business Context | `[D]` | CLOSED ARCH-002/003 | CTX-001..006 `[D]` | INV-B2-CTX-001..003 | TE-ID-004/005/006 SPEC | claim JWT sin revalidar `[C]` | §13.8 propagación | **OPEN TECHNICAL** | T-01, T-05 |
| 6 | Business Switch | `[D]` | CLOSED ARCH-003 §9 | §9 `[D]` | INV-B2-CTX-004 | sin TE | no existe; R4 cumple **por ausencia de superficie** `[C]` | transporte/API | **READY FOR TECHNICAL DESIGN** | E-05 (no bloqueante) |
| 7 | JWT authentication | `[D]` | CLOSED ARCH-003 | AUTH-001..005 `[D]` | INV-B2-AUT-001 | TE-AUTH-001 SPEC | existe; es la autoridad `[C]` | claims, alg, iss/aud | **CLOSED FOR DOWNSTREAM USE** | — |
| 8 | Session continuation | `[D]` | CLOSED (dirección) | §6 mecanismo OPEN | — | sin TE | no existe `[C]` | §13.3 | **OPEN TECHNICAL** | E-02 (no bloqueante) |
| 9 | Revocation | `[D]` | CLOSED #7 | §6 OPEN | INV-B2-AUT-005, MEM-004 | sin TE | no existe `[C]` | latencia | **OPEN TECHNICAL** | T-03 |
| 10 | Role | `[D]` | CLOSED AUTH-001 | §3 catálogo `[D]` | INV-B2-ROLE-001/002 | TE-AUTH-003/006 SPEC | `Usuario.rol`, 4 valores distintos `[C]` | cardinalidad `[ND]` | **READY WITH RECONCILIATION** | T-04, D-01 |
| 11 | Permission catalogue | `[D]` | CLOSED AUTH-001 §4/§7 | §7 matriz `[D]` | INV-B2-PRM-003 | sin TE | `Permiso` global, 11 nombres `[C]` | IDs atómicos | **CLOSED FOR DOWNSTREAM USE** | E-01 (no bloqueante) |
| 12 | Role→Permission | `[D]` | CLOSED AUTH-001 | §9 `[D]` | INV-B2-PRM-001 | TE-AUTH-003 parcial | `UsuarioPermiso` directo `[C]` | filas atómicas, mapeo | **READY WITH RECONCILIATION** | E-01 |
| 13 | Customer/User separation | `[D]` | CLOSED #13/#14 | C-CUST-001/002 `[D]` | INV-B2-CUS-001 | TE-CUST-001 SPEC | `Cliente` con login propio `[C]` | frontera de superficie | **READY WITH RECONCILIATION** | D-02 |
| 14 | Customer token boundary | `[D]` | CLOSED | **sin contrato** | INV-B2-CUS-002 DRAFT | **sin TE** | `type:'cliente'` única barrera; G-01 `[C]` | mecanismo | **BLOCKED** | T-02 |
| 15 | Legacy coexistence | `[D]` | CLOSED ID-003 | C-COEX-001..006 `[D]` | INV-B2-LEG-001..006 DRAFT | **sin TE (familia completa)** | no iniciado `[C]` | ventana, cutover | **READY FOR TECHNICAL DESIGN** | E-04 |
| 16 | empresaId transitional | `[D]` | CLOSED #42/#43 | C-COEX-003 `[D]` | INV-B2-LEG-001 | sin TE | es la autoridad hoy `[C]` | — | **CLOSED FOR DOWNSTREAM USE** | — |
| 17 | Application tenant isolation | `[D]` | CLOSED ARCH-002 | **NO EXISTE** `[C]` | solo INV-TEN-001 | TE-ID-008/009 SPEC | núcleo sólido; perímetro por disciplina `[C]` | 10 ítems §6 | **BLOCKED** | **T-01** |
| 18 | Cross-Business protection | `[D]` | CLOSED ARCH-002 §7 | **NO EXISTE** | INV-TEN-001 | TE-ID-008/009/010 SPEC | CUMPLE en los 26 cubiertos; no en los 2 + derivados `[C]` | enforcement | **BLOCKED** | **T-01** |
| 19 | Nested writes | `[D]` | CLOSED ARCH-002 §3.9 | **NO EXISTE** | sin invariant propio | TE-ID-011 SPEC | no cubierto como mecanismo; H-3, H-4 `[C]` | estrategia de herencia | **BLOCKED** | **T-01** |
| 20 | Transactions | `[D]` | CLOSED ARCH-002 §3.10 | **NO EXISTE** | sin invariant propio | **sin TE** | CUMPLE por construcción: 11 `$transaction`, un solo tenant cada una `[C]`; sin `[T]`/`[E]` | formalizar invariante | **READY WITH RECONCILIATION** | E-07 |
| 21 | Sensitive authorization | `[D]` | CLOSED #17/#28 | AUTH-001 §5 `[D]` | INV-B2-PRM-002 | TE-ORD-002, TE-CASH-005 | parcial: 11 permisos; G-09 `[C]` | default sin permiso | **READY WITH RECONCILIATION** | T-07 |
| 22 | Audit attribution | `[D]` | CLOSED #39 | parcial `[D]` | INV-B2-MEM-005 DRAFT | **sin TE** | `AuditLog` con `empresaId`, cubierto `[C]` | — | **READY FOR TECHNICAL DESIGN** | E-03 |

**Resumen:** 3 CLOSED FOR DOWNSTREAM USE · 5 READY FOR TECHNICAL DESIGN · 6 READY WITH RECONCILIATION · 4 OPEN TECHNICAL · 4 BLOCKED · 0 NOT DETERMINABLE · 0 READY FOR IMPLEMENTATION · 0 OPEN OWNER DECISION.

**Ninguna área alcanza READY FOR IMPLEMENTATION.** Las 4 BLOCKED son el aislamiento de persistencia, la protección cross-Business, los nested writes y el límite de token de Customer.

**Cambio respecto de la evaluación previa:** el área 20 (Transactions) pasó de **NOT DETERMINABLE** a **READY WITH RECONCILIATION** por la evidencia del audit de B3 (sec. 13.3).

---

# 6. CANONICAL GATE (A)

**Resultado: PASS.**

Las decisiones necesarias están cerradas: R8-ARCH-001 (monolito modular, Business tenant, User global, Membership contextual), R8-ARCH-002 (aislamiento de aplicación + 12 propiedades), R8-ARCH-003 (JWT-céntrico + contexto por aplicación), R8-ID-002 (Option A incremental), R8-ID-003 (coexistencia acotada), R8-AUTH-001 (4 roles y matriz capability-level).

Verificado contra la tabla maestra de 43 filas: **ninguna contradicción real con una decisión aprobada** en los tres bloques. `31-R8-MASTER-DECISION-PROPAGATION-AUDIT` cierra en "PASS WITH CONTROLLED RECONCILIATION" tras propagación dirigida `[D]`. El audit de B3 llega independientemente a "NINGUNA Owner Decision requerida".

No se emite `OWNER DECISION CONFLICT — BLOCKED`.

---

# 7. CONTRACT GATE (B)

**Resultado: BLOCKED.**

| Contrato | Estado |
|---|---|
| R8-ARCH-003 Auth / Session / Business Context v0.1 | Existe; 14 OPEN acotados y declarados `[D]` |
| R8-AUTH-001 Authorization v0.1 | Existe; cerrado para uso downstream `[D]` |
| R8-ID-003 Identity Legacy Coexistence v0.1 | Existe; C-COEX-001..006, cutover §10, rollback §11, evidencia §13 `[D]` |
| Block 1 Contracts Baseline | Existe; 36 contratos `C-*` `[D]` |
| **Aislamiento de persistencia (R8-ARCH-002)** | **NO EXISTE** `[C]` |
| Frontera Customer vs superficie interna | **NO EXISTE** `[C]` |

El gate falla por el primero. `C-TEN-001` da la obligación observable pero deja explícitamente abierto el enforcement de persistencia — exactamente lo que un slice de B3 necesita.

---

# 8. INVARIANT GATE (C)

**Resultado: PASS WITH RECONCILIATION.**

Existen y son válidos: INV-IDENT-001/002, INV-TEN-001, INV-MEM-001/002, INV-CONTEXT-001, INV-AUTH-001..004, INV-CUST-001..003, INV-ORD-002, INV-CASH-002, INV-FUL-002, R5 INV-XDOM-001, R5 INV-MIG-001..003 `[D]`. Los 31 `INV-B2-*` están derivados pero no son canónicos.

**Reconciliaciones obligatorias:**
1. `INV-AUTH-002` significa "UI no es autorización" en R5 y "Membership→Role→Permission" en v0.2/B1.
2. `INV-AUTH-004` significa "composición Profile→Roles→Capabilities" en R5 (superseded por R6 §4) y "Messaging no elude" en B1.
3. `INV-CUST-002`/`003` invertidos entre v0.2 y B1.
4. `R5 INV-AUTH-004` debe excluirse formalmente.

**Faltan como familia** los invariants de persistencia. `INV-TEN-001` es correcto pero demasiado grueso para derivar tests de las 12 propiedades de ARCH-002. Se necesitarían al menos: cobertura modelo-por-modelo; ownership derivado (con el caso ambiguo de `Legajo` resuelto); nested writes; integridad referencial de FKs del cliente; transacciones ("un `$transaction` opera bajo exactamente un Business Context"); fallo cerrado de operaciones no soportadas.

---

# 9. TEST / EVAL GATE (D)

**Resultado: BLOCKED.**

**TEST SPECIFIED `[D]`:** TE-ID-001..011, TE-AUTH-001..006, TE-CUST-001..004, TE-ORD-002/003, TE-CASH-005, TE-MSG-004, TE-FUL-003.

**TEST EXECUTED: cero.** `find -name '*.spec.ts'` → únicamente `src/health/health.controller.spec.ts` `[C]`. **No hay forma verificable hoy de demostrar nada.**

**Factor que reduce el costo de cerrarlo:** `prisma/seed.ts:69` crea `empresaAislamiento` vía `upsert`, con Familia, Subfamilia, Tipo, Subtipo y catálogo propio (10 referencias, `:177-236`), y **ningún test la consume** `[C]`. La fixture exigida por ARCH-002 §3.12 ya existe.

**Correcciones de mapeo a arrastrar `[D]`:** TE-ID-005 es "contexto inválido falla cerrado", no "lookup cross-business" (eso es TE-ID-008..011, B3). TE-AUTH-006 es la exclusión del catálogo de roles, no "token de Customer rechazado".

**Sin criterio alguno:** Cliente alcanzando endpoints internos (G-01, CRITICAL); cobertura del scope por modelo; validación de FKs cross-tenant; aislamiento transaccional; la familia `LEG-*` completa.

---

# 10. OPEN TECHNICAL DECISIONS

Todas son **TECHNICAL DELEGATION — NO OWNER DECISION REQUIRED**, salvo donde se indica.

| # | Ítem | Fuente | ¿Bloquea el slice? |
|---|---|---|---|
| 1 | Los 10 ítems de aislamiento de persistencia | ARCH-002 §6 | **SÍ** |
| 2 | Ownership derivado: los 12 modelos sin `empresaId`, incluido el caso ambiguo `Legajo`/`DocumentoLegajo` | ARCH-002 §6; B3 G-B3-02 | Parcialmente — el slice lo excluye, el contrato debe clasificarlos |
| 3 | Mecanismo de almacenamiento/propagación del contexto | ARCH-003 §13.8 | No (el slice no lo introduce) |
| 4 | Mecanismo exacto de enforcement de autorización | ARCH-003 §13.11; B2 §12.5 | No |
| 5 | Default para endpoints Business-scoped sin Permission declarado | B2 §12.4 | No (fuera de alcance) |
| 6 | Latencia de revocación | B2 §12.3 | No |
| 7 | Cardinalidad de roles por Membership | `INV-B2-ROLE-004` `[ND]` | No. *Puede requerir confirmación de producto si implica roles simultáneos.* |
| 8 | IDs atómicos de Permission y filas Role→Permission | AUTH-001 §7 | No |
| 9 | Mapeo `UsuarioPermiso`→Role | AUTH-001 §9 | No. *Requiere aprobación Owner del mapeo cuando se produzca, no decisión nueva sobre la regla.* |
| 10 | Ventana legacy y criterios de cutover | ID-003 §10; C-COEX-001 | No |
| 11 | Ubicación de D-06 `autorizaciones` en la cadena | B2 §12.8 | No. *Requiere Owner solo si se retira o cambia su comportamiento.* |
| 12 | Si `Venta.idempotencyKey` pasa a `@@unique([empresaId, idempotencyKey])` | B3 G-B3-11 | No |
| 13 | Si la validación de `findUnique` deja de depender de que el resultado traiga `empresaId` | B3 G-B3-06 | No |
| 14 | Frontera verificable del bypass: qué puede usar el cliente sin scope | B3 G-B3-07 | No |
| 15 | Claims, lifetime, refresh, logout, dispositivos | ARCH-003 §13.1-6 | No |
| 16 | MFA: tecnología, enrolamiento, recuperación | ARCH-003 §13.9 | No |
| 17 | Transporte/API de Business Switch, y su defensa de R4 | ARCH-003 §13.7; B3 G-B3-13 | No |
| 18 | Schema físico User/Business/Membership | ARCH-003 §13.12; ID-002 §4 | No (el slice lo evita) |
| 19 | Política de `JWT_SECRET` (único para ambos tipos, rotación) | informe 21 §15.11 | No |

---

# 11. DOCUMENTARY RECONCILIATIONS

| # | Reconciliación | Severidad | ¿Antes del primer código? |
|---|---|---|---|
| D-01 | Colisiones `INV-AUTH-00x` (R5 vs v0.2/B1) | Alta | No para el slice propuesto |
| D-02 | `INV-CUST-002`/`003` invertidos | Alta | No |
| D-03 | `R5 INV-AUTH-004` superseded sin marca en el origen | Media | No |
| D-04 | Los 31 `INV-B2-*` en informe no versionado, no en `07-DESIGN/INVARIANTS/` | Media | No |
| D-05 | Etiquetas TE-* incorrectas en la propagación B1 | Baja | No (ya corregidas en el informe 22 §8) |
| D-06 | `10-OPEN-DECISIONS.md` declara 18 decisiones abiertas; R8 cerró 20+ | Media | No |
| D-07 | `07-DESIGN/ARCHITECTURE/04-…` concluye BLOCKED en §8 y CLOSED en §11 | Baja | No |
| D-08 | `empresa-scope.extension.ts:20` dice "21 modelos" (son 26) y su lista de derivados omite `DevolucionProveedorItem`, `PedidoItem`, `UsuarioPermiso` | Baja — **pero es la prueba de que el recuento manual no se sostiene** | **Sí, dentro del slice** |
| D-09 | Docstring de `AuthClienteService.registrar` afirma validar contra `Usuario`; solo consulta `Cliente` | Media — induce a error sobre una frontera de identidad | No |
| D-10 | Docstring de `crearDevolucion` afirma validar la pertenencia del lote; no lo hace | Media — enmascara H-4 | **Sí, dentro del slice** |
| D-11 | `package.json` → `test/jest-e2e.json` inexistente | Media — bloquea E-06 | **Sí, dentro del slice** |

---

# 12. OWNER DECISION DEPENDENCIES

**Owner blockers: NINGUNO.**

Es el hallazgo más importante para la decisión de avanzar. Las tres direcciones arquitectónicas están cerradas, el catálogo de roles está cerrado, la coexistencia está cerrada, y la vía incremental (Option A) está explícitamente aprobada. **Nada de lo que falta requiere una decisión de negocio o arquitectura nueva.** Los tres audits de bloque concluyen lo mismo por separado.

**Dependencias Owner futuras, no bloqueantes del primer slice:**

| Ítem | Naturaleza |
|---|---|
| Aprobación del mapeo `UsuarioPermiso`→Role cuando se produzca | AUTH-001 §9 lo exige explícito y Owner-aprobado |
| Retiro o cambio de comportamiento de D-06 `autorizaciones` | Solo si se decide retirarlo |
| Cardinalidad de roles simultáneos por Membership | Si implica decisión de producto |
| Cambio de comportamiento visible de endpoints hoy accesibles sin permiso | `clientes.controller.ts:14-20` documenta la apertura como decisión deliberada |
| Cutover, retiro de legacy, renombrado de `Empresa` | ID-002 §6; C-COEX-006; ID-003 §10 |

---

# 13. AS-IS IMPLEMENTATION CONSTRAINTS

## 13.1 Verificación independiente

Re-verifiqué cada afirmación estructural contra el código en lugar de heredarla de los informes. Todas coinciden.

| Afirmación | Verificación propia | Resultado |
|---|---|---|
| JWT es autoridad; `validate()` sin DB | `jwt.strategy.ts:23-35`: payload mapeado, sin inyección de Prisma | **CONFIRMADO** `[C]` |
| Fail-open sin `@RequierePermiso` | `permissions.guard.ts:26-28`: `return true` con comentario | **CONFIRMADO** `[C]` |
| Permiso contra el array del token | `permissions.guard.ts:33` | **CONFIRMADO** `[C]` |
| Dos guards globales | `app.module.ts:53-54` | **CONFIRMADO** `[C]` |
| 8 h, sin refresh, secreto único | `auth.module.ts:18-21` | **CONFIRMADO** `[C]` |
| `GET /clientes(/:id)` sin permiso, intencional | `clientes.controller.ts:14-20,29-37` | **CONFIRMADO** `[C]` |
| Registro de Cliente público | `auth.cliente.controller.ts:47-50` | **CONFIRMADO** `[C]` |
| 42 modelos / 28 con `empresaId` / 26 cubiertos | grep + awk + lista de la extensión | **CONFIRMADO** `[C]` |
| Los 2 no cubiertos | `comm -23` → `PagoProveedor`, `DevolucionProveedor` | **CONFIRMADO** `[C]` |
| Comentario "21 modelos" obsoleto | `:20` dice 21; 26 entradas | **CONFIRMADO** `[C]` |
| `crearDevolucion` sin validar FKs | `compras.service.ts:343-398` | **CONFIRMADO** `[C]` |
| `Usuario` mezcla 4 responsabilidades | `schema.prisma` modelo `Usuario` | **CONFIRMADO** `[C]` |
| Sin Membership / Role / Business | `grep '^model'` | **CONFIRMADO** `[C]` ausencia |
| Un único spec de test | `find -name '*.spec.ts'` | **CONFIRMADO** `[C]` |
| Sin contrato ARCH-002 | listado de `CONTRACTS/DOMAIN/` → 11 archivos | **CONFIRMADO** `[C]` ausencia |
| `seed.ts` crea `empresaAislamiento` sin consumo | `prisma/seed.ts:69,77,181,192-236` → 10 referencias; ningún spec la usa | **CONFIRMADO** `[C]` |
| Prisma 5.22.0 | `package.json:33` → `"@prisma/client": "^5.22.0"` | **CONFIRMADO** `[C]` |
| `idempotencyKey` por `findUnique` scoped | `ventas.service.ts:113-120`: `db.venta.findUnique({where:{idempotencyKey}})` sobre el cliente extendido | **CONFIRMADO** `[C]` |

## 13.2 Superficies de bypass inspeccionadas

| Superficie | Resultado |
|---|---|
| Raw SQL | **1 instancia productiva:** `inventario.service.ts:266` `$executeRaw`. **Correctamente aislada**: `empresaId` explícito en el `WHERE`, parametrizada, con justificación en `:258-265`. `health.controller.ts:15` es `SELECT 1`. `prisma/migrate-categoria-a-jerarquia.ts` usa `$queryRawUnsafe` pero es script offline `[C]` |
| Background jobs / cron / colas | **No existen** `[C]` ausencia — elimina la superficie entera |
| DTOs con `empresaId`/`businessId` | **Cero** `[C]` |
| Controllers aceptando tenant ID | **Cero** por param, query, body o header `[C]` |
| `PrismaService` crudo | 46 usos; inyectable desde cualquier módulo (`prisma.module.ts:6-8`) `[C]` |
| `forEmpresa` | 72 ocurrencias en 15 archivos `[C]` |
| `$transaction` | 11 sitios; cada uno sobre un único `empresaId` capturado en el closure `[C]` |

**Lectura:** las dos vías clásicas de forja de tenant (body y parámetro de ruta) están cerradas; el raw SQL está aislado a mano y correctamente; no hay jobs. El riesgo real se concentra en H-2 (ownership derivado), H-3 (nested writes) y H-4 (FKs), más el carácter opt-in del mecanismo (H-5).

## 13.3 Corrección a mi evaluación previa: la propiedad transaccional

En mi evaluación anterior clasifiqué el comportamiento transaccional como `[ND]` abierto y lo traté como blocker técnico (T-06). **El audit de B3 lo cierra sustancialmente y corrijo mi clasificación:**

- **Evidencia de tipos `[C]`:** `$transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => ...)`. Sobre el cliente **extendido**, el `tx` conserva los tipos derivados de la extensión, y `ITXClientDenyList` excluye solo `$connect`/`$disconnect`/`$on`/`$transaction`/`$use`/`$extends` — **no** los hooks de query.
- **Evidencia de comportamiento `[C]`:** `inventario.service.ts:12`, `compras.service.ts:16` y `tienda.service.ts:13` derivan `EmpresaScopedTx` del `$transaction` del cliente extendido, no del base, y el código compila con ese tipo.
- **Evidencia indirecta `[C]`/`[D]`:** `tienda.service.ts:230-234` documenta que **dentro de `tx`** se evitó `upsert` porque la extensión "solo tiene manejo explícito para un set fijo de operaciones — upsert no está en esa lista y falla ruidoso". El autor observó la extensión activa dentro de la transacción.
- Prisma 5.22.0 verificado en `package.json:33` `[C]`.

**Clasificación corregida:** R12 **CUMPLE por construcción**; el `[ND]` se mantiene **solo para evidencia de ejecución**. Deja de ser blocker y pasa a ser evidencia pendiente (E-07). El área 20 de la matriz cambió de NOT DETERMINABLE a READY WITH RECONCILIATION.

## 13.4 Corrección a mi evaluación previa: `Venta.idempotencyKey`

Lo había dejado `[ND]` por no haber leído `ventas.service`. **Resuelto `[C]`:** `ventas.service.ts:113-120` consulta `findUnique({where:{idempotencyKey}})` **sobre el cliente extendido**, de modo que la validación post-query corta la fuga y devuelve `null`. **No hay exposición de datos.** El efecto real es distinto y menor: una clave usada en el Business A impide reusar esa misma clave en el B — una colisión de negocio entre tenants, no una brecha de aislamiento. Severidad MEDIA, no estructural.

## 13.5 Restricciones no negociables

De R8-ID-002 §6, C-COEX-002, C-COEX-006, R8-ARCH-002 §5 y baseline R8 §18-19 `[D]`:
- No modificar el schema Prisma, migrar, renombrar `Empresa` ni borrar `Usuario.empresaId`.
- No eliminar campos, relaciones, tokens ni flujos legacy.
- No reemplazar `EmpresaScopedPrismaService` ni `empresaScopeExtension` (son ADAPTED).
- Clasificar todo componente tocado como PRESERVED / ADAPTED / WRAP / DEPRECATED / NEW / REPLACED—EXPLICITLY APPROVED.
- Ningún cleanup arquitectónico vale como autorización implícita de borrado.
- **Preservar el fundamento de `forEmpresa` como factory singleton:** la decisión de no usar `Scope.REQUEST` está documentada y fue verificada contra servidor real (`empresa-scoped-prisma.service.ts:10-26`) porque Nest resolvía el provider antes de los guards. No volver a ese patrón.

**Nota operativa:** el lint de `apps/api` corre `eslint --fix` y **muta código**. Toda verificación debe correr el lint en un paso separado para no confundir una mutación automática con un cambio deliberado.

---

# 14. PRESERVATION / ADAPTATION / NEW MATRIX

| AS-IS | Acción | Motivo | Riesgo |
|---|---|---|---|
| `empresaScopeExtension` — inyección en `where` (9 ops) | **PRESERVE** | Satisface R6/R7/R8 por mecanismo; base de migración válida | Ninguno |
| `empresaScopeExtension` — forzado de `empresaId` en `create`/`createMany` | **PRESERVE** | Satisface R5 y da defensa en profundidad para R4 | Ninguno |
| `empresaScopeExtension` — **fail-closed** en operaciones no contempladas | **PRESERVE** | Mejor propiedad del AS-IS; ya moldea el código llamador | Ninguno. Hoy **sin test** |
| `empresaScopeExtension` — allow-list de modelos | **ADAPT** | El principio es correcto; el contenido está incompleto (H-1) y debería derivarse del schema, no mantenerse a mano | Cambiar la derivación afecta 26 modelos a la vez |
| `empresaScopeExtension` — validación post-query de `findUnique` | **ADAPT** | Correcta en resultado; depende de que el resultado traiga `empresaId` | Latente si algún `select` lo omitiera (sin uso actual) |
| `empresaScopeExtension` — inspección de nested writes | **NEW** | No existe; R10/R11 lo requieren (H-3) | Requiere estrategia: **BLOCKED hasta el contrato** |
| Validación de FK cross-tenant | **NEW** | No existe en ninguna capa (H-4) | Puede rechazar datos hoy aceptados |
| `EmpresaScopedPrismaService.forEmpresa` | **ADAPT** | Preservar el fundamento del singleton; adaptar la firma para que el contexto venga de un Business Context autoritativo y no de un `string` elegido por el caller | No volver a `Scope.REQUEST` |
| `PrismaService` exportado por `PrismaModule` | **ADAPT** | Necesario para auth/pre-contexto; debe dejar de ser inyectable indistintamente desde cualquier módulo de dominio (H-5) | Restringir de más rompe el login |
| Scope derivado de modelos hijos | **NEW** | Hoy es disciplina; R6-R9 sobre 12-14 modelos lo requieren (H-2) | **BLOCKED hasta el contrato** |
| Tenant de `Legajo` / `DocumentoLegajo` | **NEW** | Ambiguo por diseño (2 ramas FK opcionales) | Requiere definición explícita en el contrato |
| `JwtAuthGuard` global | **PRESERVE** | Patrón vigente; ARCH-003 §14 | Ninguno |
| `@RequierePermiso`/`@Public`/`@CurrentUser` | **PRESERVE** | API de decoradores reutilizable | Ninguno |
| `GoogleStrategy` + ciclo de callback | **PRESERVE** | ARCH-003 AUTH-004: Google continúa | Vinculación por email sin `email_verified` queda OPEN |
| `Usuario.email @unique` global | **PRESERVE** | Ya alineado con "User global" | Ninguno |
| `Permiso` (catálogo global) | **PRESERVE** | Aprovechable; AUTH-001 §8 | Nombres ≠ catálogo TO-BE aprobado |
| `$executeRaw` de `inventario` | **PRESERVE** | Correctamente aislado y justificado | Depende de disciplina; debe quedar inventariado en el contrato |
| `main.ts` `whitelist:true` | **PRESERVE** | Cierra la forja por body | Ninguno |
| Lookups pre-contexto en `auth*` con cliente crudo | **PRESERVE** | Correctos por definición: establecen el contexto, no lo consumen | Ninguno |
| `TIENDA_EMPRESA_ID` | **ADAPT** | Resuelve el fallo explícito y es honesto sobre su límite | Revisar al introducir multi-Business |
| **Fixture `empresaAislamiento` del `seed.ts`** | **PRESERVE** | Segunda Empresa con catálogo completo ya construida; punto de partida listo para la verificación negativa de ARCH-002 §3.12 | Ninguno. **Hoy sin uso** |
| `PermissionsGuard` | **ADAPT** | Cambia el origen de la verdad, no la forma | Invertir el default rompe funcionalidad intencional |
| `JwtStrategy.validate` | **ADAPT** | Debe resolver contexto, no confiar en el payload | Agregar I/O a cada request |
| `Usuario.empresaId` y la columna en 28 modelos | **PRESERVE (transicional)** | C-COEX-003; ID-002 §2; sin limpieza destructiva | No puede volverse autoridad permanente |
| `Usuario.activo` | **ADAPT** | Pasa a estado de Membership | Hoy global y solo al login |
| `UsuarioPermiso` | **ADAPT** | Pasa a Role→Permission | **Prohibida la conversión silenciosa** (AUTH-001 §9) |
| `Invitacion` | **ADAPT** | ID-002 §5: intención de crear/activar Membership | Hoy crea Usuario con rol y empresa |
| `Empresa` | **ADAPT** | ID-002 §3: compat-preserved como Business | No renombrar |
| `PagoProveedor` / `DevolucionProveedor` | **ADAPT** | Incorporar a la cobertura (H-1) | Cambian lecturas hoy sin filtro automático |
| `crearDevolucion` | **ADAPT** | Validar FKs contra el contexto (H-4) | Puede rechazar datos hoy aceptados |
| `Cliente` con login propio | **WRAP** | Customer ≠ Membership; separar superficie sin quitarle la autenticación | G-01 es CRITICAL; cambiar el flujo afecta la tienda |
| `AutorizacionesService` (D-06) | **WRAP** | Único chequeo contra DB y el más alineado al TO-BE | Sin contrato que lo ubique |
| Autoridad del contexto (claim JWT sin revalidar) | **NEW** | R1/R2/R3 requieren Membership + revalidación; no hay nada que adaptar | Depende de B1 |
| Claims `empresaId`/`permisos` como autoridad | **DEPRECATE** | ARCH-003 §7: no aprobados como verdad única | Pueden seguir como compatibilidad, no como autoridad |
| `RolUsuario` `PROVEEDOR`/`REPARTIDOR` | **DEPRECATE** | Fuera del catálogo MVP (#30) | **Sin limpieza destructiva** (C-COEX-006) |
| `LegajoAprobadoGuard` / `Legajo*` | **BLOCKED** | AUTH-001 no define legajo | No tocar |
| Membership / Role / Business / contexto activo | **NEW** | No existen | Depende del schema físico: **no en el primer slice** |
| Refresh / revocación / logout / dispositivos / MFA / Business Switch | **NEW** | No existen | OPEN; fuera del primer slice |
| Infraestructura y tests de aislamiento | **NEW** | No existe ninguno `[C]` | Prerequisito de todo lo demás |

No se propone reemplazo total de nada donde la adaptación alcanza.

---

# 15. CROSS-BLOCK DEPENDENCY GRAPH

```
                 B1 Identity / Context / Session
                 Decisión: CLOSED  ·  Contrato: v0.1 (14 OPEN)
                 Invariants: baseline  ·  Tests: 0 ejecutados
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
   B2 Authorization                  B3 Tenant Isolation
   READY WITH RECONCILIATION         AS-IS: READY WITH RECONCILIATION
                                     CONTRATO: NO EXISTE → BLOCKED
              │                               │
              └───────────────┬───────────────┘
                              ▼
                  B4 Implementation Readiness
                         → BLOCKED
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
   First Controlled Slice            Remaining Blockers
   B3-SLICE-001 (propuesto)          T-02..T-07, D-*, E-*
   Precondición única: T-01
```

| Dependencia | Estado | Nota |
|---|---|---|
| B1 → B2 (contexto habilita la cadena de autorización) | **OPEN** | B2 deriva sus invariants sin esperar el mecanismo; el enforcement sí lo espera |
| B1 → B3 (contexto es upstream del aislamiento) | **OPEN** | ARCH-003 §12. **No bloquea el slice propuesto**, que opera con el `empresaId` transicional ya existente |
| B2 → B3 (autorización precede a la mutación) | **NON-BLOCKING** | `INV-B2-AUT-007`; el slice no cambia autorización |
| B3 → B4 (aislamiento verificable es prerequisito) | **BLOCKED** | **Dependencia crítica y única** |
| B2 → B4 | **NON-BLOCKING** | READY WITH RECONCILIATION; las reconciliaciones no afectan al slice |
| B1 → B4 | **NON-BLOCKING para el slice** | Los OPEN de B1 bloquean Membership, no el endurecimiento del aislamiento |
| B3 → Primer slice | **BLOCKED por T-01** | El contrato es la precondición |
| B1 (Membership) → slices posteriores | **OPEN** | Depende del schema físico |

**Lectura del grafo:** B3 es simultáneamente el bloque sin contrato y el único cuyo slice no depende de los OPEN de B1. Ese es el camino.

---

# 16. FIRST CONTROLLED IMPLEMENTATION SLICE CANDIDATE

**NO SE IMPLEMENTA. Solo se define.**

## 16.1 Candidatos descartados

| Candidato | Por qué no |
|---|---|
| Introducir Membership / Role / Business | Depende del schema físico (ARCH-003 §13.12 OPEN) y del mecanismo de contexto (§13.8 OPEN). ID-002 §6 no autoriza modificar schema. Máximo valor conceptual, mínima autorizabilidad hoy. Falla los criterios 4 y 6. |
| Reparar G-01 (frontera Cliente) | CRITICAL y tentador, pero sin contrato de frontera de identidad la reparación inventaría la política. Cambia comportamiento visible y afecta la tienda. Falla los criterios 2 y 9. |
| Invertir el default del guard | Es T-07. Rompe funcionalidad documentada como intencional (`clientes.controller.ts:14-20`) sin clasificar antes los 37 usos. Falla el criterio 9. |
| Cerrar H-2 (ownership derivado) | Es el gap de mayor severidad de diseño, pero requiere clasificar 12 modelos y resolver el caso ambiguo de `Legajo`. Es trabajo de contrato, no de código. Falla el criterio 4. |
| Cerrar solo H-1 | Correcto pero demasiado pequeño para el aparato de control, y sin tests no se demuestra que no rompió nada. Falla el criterio 10. |

## 16.2 Slice candidato: **B3-SLICE-001 — Verificación negativa y cobertura verificable del aislamiento Business-scoped**

**Objetivo:** convertir el mecanismo de aislamiento existente de "correcto por lectura" en "correcto por evidencia", cerrando las dos brechas de código que no requieren decisión de estrategia, y elevando a `[T]`/`[E]` las propiedades que hoy son `[C]` por lectura.

**Por qué este:** es el único slice que (a) opera dentro de una dirección Owner cerrada y de disposición explícita ADAPTED, (b) no requiere ningún ítem OPEN de B1, (c) no introduce Membership, Role ni Business, (d) no toca el schema, (e) produce la primera evidencia `[T]`/`[E]` del proyecto, y (f) **aprovecha una fixture ya construida y sin usar**, lo que lo hace materialmente más barato que cualquier alternativa.

**Alcance:**
1. Infraestructura de test funcionando (hoy `package.json` apunta a un config inexistente — D-11).
2. Los 5 TE SPECIFIED existentes implementados y ejecutados **contra el mecanismo actual**, usando `empresaAislamiento` del seed: TE-ID-006, 008, 009, 010, 011 — **incluidos los negativos cross-tenant** que ARCH-002 §3.12 exige.
3. Test del fail-closed: `upsert` y `groupBy` fallan ruidoso en modelo cubierto. Es la mejor propiedad del AS-IS y hoy no tiene test.
4. Test del `tx` interactivo: la extensión sigue activa dentro de `$transaction`. Eleva a `[T]`/`[E]` lo que hoy es `[C]` por tipos (sec. 13.3).
5. Test de cobertura por introspección: todo modelo con `empresaId` directo está en la allow-list. Habría detectado H-1 y D-08.
6. Cierre de H-1: `PagoProveedor` y `DevolucionProveedor` incorporados a la cobertura.
7. Validación de pertenencia de las FKs recibidas por DTO en `crearDevolucion` (H-4), con su test negativo, y corrección del docstring (D-10).
8. Corrección del comentario obsoleto de `empresa-scope.extension.ts:20` (D-08).

**Explícitamente fuera de alcance:** Membership, Role, Business, contexto activo, Business Switch; cualquier cambio de schema o migración (incluido `@@unique([empresaId, idempotencyKey])`); invertir el default del guard; reparar G-01/G-08/G-09/G-10; H-2 (ownership derivado y el caso ambiguo de `Legajo`) y H-3 (inspección general de nested writes) — requieren decisión de estrategia, que es parte del contrato faltante; restringir la inyección de `PrismaService` (H-5); eliminar o reemplazar cualquier componente legacy.

**Archivos potencialmente afectados:**

| Archivo | Acción |
|---|---|
| `apps/api/test/**` | NEW — infraestructura y especificaciones |
| `apps/api/package.json` | ADAPT — config de test |
| `apps/api/src/prisma/empresa-scope.extension.ts` | ADAPT — 2 entradas en la allow-list; comentario |
| `apps/api/src/compras/compras.service.ts` | ADAPT — validación de FKs en `crearDevolucion`; docstring |
| `apps/api/prisma/seed.ts` | **sin cambios previstos** (la fixture ya existe; solo se consume) |
| `apps/api/src/prisma/empresa-scoped-prisma.service.ts` | **sin cambios previstos** |
| `apps/api/prisma/schema.prisma` | **PROHIBIDO** |
| `apps/api/prisma/migrations/**` | **PROHIBIDO** |

**Dependencias:** R8-ARCH-002 (propiedades 5,6,7,8,9,10,11,12,13) → `C-TEN-001` → `INV-TEN-001` → TE-ID-006/008/009/010/011. R8-ID-003 C-COEX-004 (el aislamiento se preserva durante la coexistencia).

**Precondición no negociable — T-01.** El contrato de aislamiento debe existir, al menos para este alcance: cobertura modelo-por-modelo, validación de FKs del cliente, comportamiento transaccional, y matriz de verificación con negativos. Sin él, los puntos 6 y 7 son decisiones técnicas inventadas.

**Precondiciones que NO aplican:** T-02..T-07, D-01..D-07. El slice no depende del default del guard, no cita invariants de las familias colisionadas (usa TE-ID-*, cuyo mapeo a `INV-TEN-001` es inequívoco), y no toca revocación, cardinalidad de roles ni la frontera de Customer.

**Tests requeridos:** sec. 17.

**Riesgos:**

| Riesgo | Mitigación |
|---|---|
| La extensión atraviesa 26 modelos: un error es sistémico | Los TE se ejecutan **primero contra el mecanismo actual**, estableciendo baseline antes de cambiar nada |
| Agregar 2 modelos a la cobertura cambia lecturas hoy sin filtro automático | `PagoProveedor`/`DevolucionProveedor` ya reciben `empresaId` a mano y sus lecturas están acotadas por un `getCompra` previo. El filtro automático debería ser redundante — y el test lo demuestra en lugar de suponerlo |
| Validar FKs puede rechazar datos hoy aceptados | Es precisamente el defecto (H-4). Debe quedar registrado como cambio de comportamiento deliberado, no silencioso |
| El test del `tx` puede revelarse **negativo** | Si la extensión no se conserva en `$transaction`, el hallazgo contradice la evidencia de tipos y es de altísimo valor. Debe reportarse, no absorberse |
| `eslint --fix` muta código | Correr el lint en un paso separado y verificable |
| Los tests requieren DB | Usar la DB de desarrollo con el seed, nunca producción. El seed usa `upsert`, es idempotente |

**Rollback:** todos los cambios son aditivos o de validación; no hay migración, cambio de schema ni de datos. El rollback es la reversión del diff. Nada de lo tocado es destructivo respecto de legacy (C-COEX-006 se respeta por construcción). Si el punto 7 rompe un flujo real de devoluciones, se revierte ese commit aislado sin afectar los puntos 1-6.

**Evidencia esperada:** sec. 18.

**Qué desbloquea:** la primera evidencia `[T]`/`[E]` del proyecto; el baseline de regresión que hoy falta; la elevación de 4 propiedades canónicas de `[C]` por lectura a `[T]`; y una base medida sobre la cual B3 CONTRACTS se escriba sobre comportamiento verificado en vez de comportamiento leído.

## 16.3 ¿Existe un slice seguro?

**Sí, pero no está autorizado todavía.** B3-SLICE-001 satisface los 10 criterios del brief — respeta decisiones Owner, contratos e invariants; no depende de decisiones abiertas críticas; es probable; no requiere migración destructiva; preserva la coexistencia; tiene rollback; no rompe funcionalidad existente; y produce evidencia verificable — **con la única excepción del criterio 2**, porque el contrato que debería gobernarlo no existe.

Esa es la distancia exacta entre el estado actual y el primer código autorizable: **un documento.**

---

# 17. REQUIRED TESTS / EVALS

Ninguno destructivo. Ninguno contra producción. Fixture: `empresaAislamiento` del seed (ya existente).

## Antes de implementar — baseline contra el mecanismo actual

| Tipo | Test |
|---|---|
| **Contract** | TE-ID-006: un Business ID provisto por el cliente no altera el contexto efectivo |
| **Invariant** | TE-ID-008: recursos de A no se leen por contexto de B |
| **Invariant** | TE-ID-009: recursos de A no se actualizan ni borran por contexto de B |
| **Invariant** | TE-ID-010: un unique lookup no expone un recurso de otro Business (`findUnique` → `null` / P2025) |
| **Invariant** | TE-ID-011: la persistencia anidada no escapa del ownership |
| **Regression** | Los flujos existentes (venta, compra, caja, catálogo, tienda) siguen funcionando sin cambio observable |

## Después del primer slice

| Tipo | Test |
|---|---|
| **Contract** | Cobertura por introspección: todo modelo con `empresaId` directo está en la allow-list |
| **Security** | `PagoProveedor` / `DevolucionProveedor` cross-tenant rechazado |
| **Security** | Nested write con FK de otro tenant rechazado (`crearDevolucion`) — fija H-4 antes de contratar R11 |
| **Security** | Aislamiento conservado dentro de `$transaction` — eleva sec. 13.3 a `[T]` |
| **Security** | `upsert` / `groupBy` fallan cerrado en modelo cubierto |
| **Regression** | El `$executeRaw` de `inventario` mantiene su aislamiento por `empresaId` |

## Fuera del slice — requeridos para bloques posteriores

| Tipo | Test | Bloqueado por |
|---|---|---|
| **Security** | Token de Customer contra endpoint interno rechazado (G-01) | **sin criterio alguno hoy** |
| **Security** | JWT stale después de revocación | latencia OPEN (T-03) |
| **Security** | Membership revocada / INACTIVE no opera | Membership no existe |
| **Security** | Business Context incorrecto / ausente falla cerrado | mecanismo OPEN (T-05) |
| **Security** | Escalada de privilegio por `Usuario.rol` | Role no existe |
| **Security** | Bypass por `PrismaService` directo | frontera OPEN (H-5) |
| **Security** | Ownership derivado: acceso a modelo hijo sin pasar por el padre | estrategia OPEN (H-2) |
| **Invariant** | Familia `LEG-001..006` completa | sin TE derivado |

---

# 18. EVIDENCE REQUIRED FOR VERIFICATION

Hoy todo el proyecto descansa en `[D]` y `[C]`. La distinción entre los dos estados finales es estricta.

## Para declarar **IMPLEMENTED**

1. `[C]` El código existe y es trazable: cada cambio mapeado a un ítem del alcance de la sec. 16.2.
2. `[E]` La API arranca; las migraciones aplican sin cambio observable en los flujos existentes.
3. `[C]` Registro de preservación: cada componente tocado clasificado PRESERVED / ADAPTED / WRAP / DEPRECATED / NEW (baseline R8 §19).
4. `[C]` Alcance negativo declarado: lo que el slice explícitamente no cubre (H-2, H-3 general, H-5, G-01).

**IMPLEMENTED no es VERIFIED.** Que compile no es funcionalidad. Que exista un guard no es autorización completa. Que un service use `EmpresaScopedPrismaService` **no equivale automáticamente a aislamiento completo** — H-1..H-5 son la prueba: de 17 vectores analizados en el audit de B3, uno persiste datos cruzados y un tercio está contenido por orden de llamadas y no por mecanismo.

## Para declarar **VERIFIED** (adicional)

5. `[T]` Los 5 TE del slice pasan, nombrados y trazados a su invariant.
6. `[T]` **Negativos cross-tenant explícitos**, no solo positivos. ARCH-002 §3.12 lo exige: "cross-Business access must be covered by negative verification". Un test que solo recorra el camino feliz no verifica aislamiento.
7. `[T]` Aislamiento conservado dentro de `$transaction` — convierte la evidencia de tipos en evidencia de ejecución.
8. `[T]` Fail-closed de `upsert`/`groupBy` demostrado, no supuesto.
9. `[T]` Nested write con FK de otro tenant rechazado.
10. `[T]` Cobertura verificada por introspección, no por recuento manual. D-08 es la prueba de que el recuento manual se desactualiza en silencio.
11. `[T]` Regresión: los flujos existentes siguen pasando.

**No aceptable como evidencia:** que el código compile; que el lint pase (además muta código); que la extensión "parezca" cubrir un modelo; ausencia de errores reportados; un test unitario con Prisma mockeado presentado como prueba de aislamiento real.

---

# 19. BLOCKERS AND NON-BLOCKERS

## A. Owner blockers

**NINGUNO.** No falta ninguna decisión de negocio ni de arquitectura que requiera Owner para autorizar el primer slice. Los tres audits de bloque concluyen lo mismo por separado.

## B. Documentary blockers

| ID | Blocker | Resuelve |
|---|---|---|
| D-01 | Colisión `INV-AUTH-00x` | Documentación (técnico) |
| D-02 | `INV-CUST-002`/`003` invertidos | Documentación |
| D-03 | `R5 INV-AUTH-004` superseded sin marca | Documentación |
| D-04 | Los 31 `INV-B2-*` no canónicos | Documentación |
| D-06 | Dos capas de decisión sin reconciliar | Gobernanza |
| D-08, D-10, D-11 | Divergencia código↔schema en el docstring; docstring que afirma una validación inexistente; config de test ausente | **Dentro del slice** |

Ninguno bloquea B3-SLICE-001.

## C. Technical blockers

| ID | Blocker | ¿Bloquea el slice? | Resuelve |
|---|---|---|---|
| **T-01** | **Contrato de aislamiento de persistencia inexistente** | **SÍ — único** | Arquitectura/técnico, sin Owner |
| T-02 | Mecanismo de frontera de token de Customer | No | Técnico (contrato de frontera) |
| T-03 | Latencia de revocación | No | Técnico |
| T-04 | Cardinalidad de roles por Membership | No | Técnico (Owner si implica producto) |
| T-05 | Resolución y propagación del Business Context | No (el slice usa el `empresaId` transicional) | Técnico |
| T-06 | Ownership derivado: 12 modelos + caso ambiguo `Legajo` | No (excluido del slice) | Técnico — **parte de T-01** |
| T-07 | Default de endpoints sin Permission declarado | No (fuera de alcance) | Técnico |

**Baja respecto de la evaluación previa:** el comportamiento transaccional ya **no** es blocker técnico (sec. 13.3). Pasó a evidencia pendiente E-07.

## D. Evidence blockers

| ID | Blocker |
|---|---|
| **E-06** | **Cero tests ejecutados; sin infraestructura de test.** No es normativo, es práctico: modificar el componente que atraviesa 26 modelos sin red de regresión es la clase de cambio cuya omisión no se detecta hasta producción. **Se resuelve dentro del slice.** |
| E-07 | La propiedad transaccional cumple por construcción `[C]` pero carece de `[T]`/`[E]` |
| E-08 | El fail-closed —mejor propiedad del AS-IS— no tiene ningún test |
| E-09 | La fixture `empresaAislamiento` existe y ningún test la consume |

## E. Non-blocking OPEN

Resolubles después sin impedir el primer slice: matriz atómica de Permission (E-01); MFA (E-02); refresh/logout/revocación/dispositivos; Business Switch y su defensa de R4 (E-05); schema físico User/Business/Membership; Google `email_verified`; política de `JWT_SECRET`; ventana legacy y cutover; ubicación de D-06 `autorizaciones`; audit attribution (E-03); familia `LEG-*` de TE (E-04); `Venta.idempotencyKey` como `@@unique` compuesto; endurecimiento de la validación de `findUnique`; frontera verificable del bypass (H-5); migración Empresa→Business.

**Y los defectos AS-IS:** **G-08** (`passwordHash` y `googleId` expuestos en `GET /clientes(/:id)`), **G-09** (aprobación de legajo de mayoristas sin permiso), **G-10** (vinculación Google por email sin verificación).

**Sobre G-08/G-09/G-10:** son deuda de seguridad AS-IS, no diseño TO-BE. No bloquean el slice, pero **no deberían esperar al TO-BE para priorizarse**. Corresponden a un informe de defectos separado (informe 21 §16.6). G-08 en particular — exposición de hashes de contraseña de Clientes a cualquier token válido, incluido el de un Cliente autorregistrado por el endpoint público — merece atención por su cuenta y antes que cualquier trabajo de transformación.

---

# 20. FINAL READINESS VERDICT

# BLOCKED

**Blocker:** no existe el contrato técnico de aislamiento de persistencia Business-scoped. `07-DESIGN/CONTRACTS/DOMAIN/` contiene 11 archivos, con contratos para R8-ID-003, R8-AUTH-001 y R8-ARCH-003; ninguno para R8-ARCH-002 `[C]` ausencia. R8-ARCH-002 §6 enumera 10 ítems que "remain open and must be specified" y ningún documento posterior los especifica.

**Quién debe resolverlo:** **Arquitectura / técnico. NO el Owner.** La dirección ya está aprobada (aislamiento a nivel de aplicación, mecanismo existente ADAPTED). Lo que falta es bajarla a propiedades verificables. Es delegación técnica dentro de una decisión cerrada.

**Gates:**

| Gate | Resultado |
|---|---|
| A — Canonical | **PASS** |
| B — Contract | **BLOCKED** |
| C — Invariant | **PASS WITH RECONCILIATION** |
| D — Test/Eval | **BLOCKED** |

**Condición exacta para autorizar el primer slice:**

> Un contrato de aislamiento de persistencia Business-scoped que resuelva los 10 ítems de R8-ARCH-002 §6, al menos para el alcance de B3-SLICE-001: cobertura modelo-por-modelo, validación de FKs recibidas del cliente, comportamiento transaccional, y matriz de verificación con negativos cross-tenant.

**Por qué BLOCKED y no READY WITH RECONCILIATION:** una reconciliación corrige algo que existe. Aquí falta un contrato entero sobre la materia exacta del slice propuesto. Con T-01 cerrado, el veredicto pasaría a READY FOR CONTROLLED IMPLEMENTATION para ese slice — y solo para ese.

**Por qué BLOCKED y no FAIL:** nada requiere reabrir una Owner Decision. No hay contradicción real con ninguna decisión aprobada. La fase documental hizo su trabajo; el cuello de botella es puntual y está identificado.

**Nota sobre la asimetría del veredicto:** el audit de B3 clasifica el **AS-IS de B3** como READY WITH RECONCILIATION y procede a B3 CONTRACTS. No hay contradicción con este BLOCKED: ese veredicto evalúa si el AS-IS está suficientemente entendido para escribir el contrato (lo está); este evalúa si se puede escribir el primer código (no se puede, porque el contrato todavía no existe). Ambos apuntan a la misma acción siguiente.

**Estado de tareas:** R8-READY-001 sigue **BLOCKED** (su exit criterion es "one slice is bounded enough for task-level implementation authorization"; la sec. 16 propone el slice acotado, pero T-01 no está satisfecho). R8-READY-002 sigue BLOCKED por dependencia. Gate R8: CONTROLLED SPECIFICATION READINESS — PASS WITH LOCAL BLOCKERS, **sin cambio por este documento**.

---

# 21. RECOMMENDED NEXT STEP

**Acción única e inmediata: B3 CONTRACTS** — redactar el contrato de aislamiento de persistencia Business-scoped (cierra T-01). Es delegación técnica, no requiere Owner, y es lo único que separa al proyecto de su primer código autorizable.

**Entradas que B3 CONTRACTS debe resolver, en orden de dependencia:**

1. **Autoridad del Business Context.** CTX-001..006 de R8-ARCH-003 ya define el TO-BE; B3 debe especificar cómo la capa de persistencia lo **consume** en lugar de recibir un `string` que el caller elige.
2. **Ownership: directo vs derivado.** Clasificar los 12-14 modelos sin `empresaId` (GLOBAL / DIRECT / DERIVED / AMBIGUOUS) y resolver explícitamente `Legajo`/`DocumentoLegajo`. Es el bloqueante de R6-R9 sobre un tercio del schema.
3. **Nested writes y FK.** Hay un patrón correcto ya aplicado en 3 de 4 nested writes del código (lectura scoped previa de la FK) — candidato natural a formalizar.
4. **Unique lookups.** Incluye si `Venta.idempotencyKey` pasa a `@@unique([empresaId, idempotencyKey])` y si la validación de `findUnique` debe dejar de depender de que el resultado traiga `empresaId`.
5. **Transacciones.** Formalizar el invariante "un `$transaction` opera bajo exactamente un Business Context", que el AS-IS ya cumple por construcción.
6. **Frontera del bypass.** Qué puede usar el cliente sin scope (auth/pre-contexto, scripts offline) y qué no, de forma verificable y no por disciplina.

**En paralelo, sin bloquear:**

- **Informe de defectos AS-IS separado** (G-08, G-09, G-10). No es diseño TO-BE y no debería esperarlo — **G-08 primero**.
- **Reconciliación de IDs de invariants** (D-01, D-02, D-03) y publicación de `07-DESIGN/INVARIANTS/DERIVED/06-B2-AUTHORIZATION-INVARIANTS-v0.1.md` para dar carácter canónico a los 31 `INV-B2-*` (D-04).

**Después:**
4. Clasificación de los endpoints sin Permission declarado como PUBLIC / AUTHENTICATED-ONLY / BUSINESS-SCOPED (cierra T-07).
5. Latencia de revocación y cardinalidad de roles (cierra T-03, T-04).
6. Contrato de frontera Customer (cierra T-02) y, después, Membership.

**Secuencia global:** `B1/B2/B3 AS-IS (hecho)` → `B3 CONTRACTS` → `B3 INVARIANTS` → `B3 TESTS/EVALS` → `B3-SLICE-001`.

**Lo que este documento NO hizo:** no modificó código, schema, migraciones, datos, contratos canónicos, invariants ni tests; no creó commits, push ni deploy; no cerró Owner Decisions; no convirtió ninguna propuesta en decisión aprobada; no declaró implementación autorizada ni verificada; y no implementó el slice de la sec. 16.

---

# 22. EVIDENCE INDEX

## Código `[C]` — inspeccionado directamente en esta evaluación

Rutas relativas a `apps/api/`.

| Hecho | Archivo : símbolo : línea |
|---|---|
| `validate()` sin consulta a DB | `src/auth/jwt.strategy.ts` : `JwtStrategy.validate` : 23-35 |
| Fail-open sin `@RequierePermiso` | `src/auth/guards/permissions.guard.ts` : `canActivate` : 26-28 |
| Permiso chequeado contra el array del token | `src/auth/guards/permissions.guard.ts` : `canActivate` : 33 |
| Dos guards globales (`APP_GUARD`) | `src/app.module.ts` : 53-54 |
| `expiresIn:'8h'`, sin refresh, secreto único | `src/auth/auth.module.ts` : `JwtModule.register` : 18-21 |
| `GET /clientes(/:id)` sin permiso, intencional y documentado | `src/clientes/clientes.controller.ts` : `listar`/`obtener` : 14-20, 29-37 |
| Registro de Cliente público | `src/auth/auth.cliente.controller.ts` : `registro` : 47-50 |
| Allow-list de 26 modelos; comentario "21" | `src/prisma/empresa-scope.extension.ts` : `MODELOS_CON_EMPRESA_ID` : 18-70 |
| H-2 admitido en el propio código | `src/prisma/empresa-scope.extension.ts` : 20-31 |
| Factory singleton; fundamento de no usar `Scope.REQUEST`, verificado contra servidor real | `src/prisma/empresa-scoped-prisma.service.ts` : `forEmpresa` : 10-41 |
| Nested create de FKs del DTO sin validar pertenencia | `src/compras/compras.service.ts` : `crearDevolucion` : 343-398 |
| `$executeRaw` con `empresaId` explícito, parametrizado y justificado | `src/inventario/inventario.service.ts` : `aplicarAjusteAtomico` : 252-272 |
| `$queryRaw` de health (`SELECT 1`) | `src/health/health.controller.ts` : 15 |
| `$queryRawUnsafe` solo en script offline | `prisma/migrate-categoria-a-jerarquia.ts` : 178, 282 |
| `idempotencyKey` consultado por `findUnique` sobre cliente extendido | `src/ventas/ventas.service.ts` : `create` : 113-120 |
| Fixture de aislamiento creada y sin consumir | `prisma/seed.ts` : `empresaAislamiento` : 69, 77, 181, 192-236 |
| Prisma 5.22.0 | `package.json` : 33 |
| Sin background jobs ni cron | grep `@Cron`/`ScheduleModule`/`Bull`/`setInterval` sobre `src/` → cero |
| Sin DTO con `empresaId`/`businessId` | grep sobre `src/**/dto/*.ts` → cero |
| Sin controller aceptando tenant ID | grep `Param/Query/Body('empresaId')`, header empresa → cero |
| `PrismaService` crudo en 11 archivos | `src/auth/*` (5), `src/invitaciones/*` (2), `src/legajo/*` (3), `src/health/*` (1) |
| `forEmpresa` en 15 archivos | `autorizaciones`, `caja`, `catalogo`, `jerarquia-catalogo`, `clientes`, `compras`, `fidelizacion`, `inventario` (×2), `pagos`, `pedidos`, `tienda`, `usuarios`, `ventas` |
| `whitelist:true`; CORS `credentials:true` | `src/main.ts` : 8, 16-18 |
| 42 modelos; 28 con `empresaId`; 26 cubiertos | `prisma/schema.prisma` (grep `^model`, awk por modelo, `comm -23`) |
| Los 2 no cubiertos | `PagoProveedor`, `DevolucionProveedor` (`comm -23`) |
| `Usuario` mezcla identidad/pertenencia/rol/estado; `rol @default(OWNER)` | `prisma/schema.prisma` : modelo `Usuario` |
| `Empresa` existe como tenant | `prisma/schema.prisma` : modelo `Empresa` |
| Ausencia de Membership / Role / Business | `prisma/schema.prisma` (grep `^model`) → ninguno |
| Único spec de test | `src/health/health.controller.spec.ts` |
| 7 migraciones aplicadas, última `20261003155707` | `prisma/migrations/` |
| Ausencia de contrato ARCH-002 | listado de `docs/.../07-DESIGN/CONTRACTS/DOMAIN/` → 11 archivos, ninguno ARCH-002 |

## Documentos `[D]` — inspeccionados

Rutas relativas a `docs/WAPSELL-DOCUMENTATION/`.

| Documento | Secciones usadas |
|---|---|
| `03-DECISIONS/28-R8-ARCH-002-OWNER-DECISION-TENANT-ISOLATION-2026-10-03.md` | §1 ruling, §3 las 12 propiedades, §4 scope/non-scope, §5 ADAPTED, §6 los 10 ítems abiertos, §7 invariant de seguridad, §9 dependencia, §11 estado |
| `03-DECISIONS/30-R8-MASTER-OWNER-DECISION-CLOSURE-2026-10-03.md` | tabla maestra de 43 filas |
| `03-DECISIONS/31-R8-MASTER-DECISION-PROPAGATION-AUDIT-2026-10-03.md` | §7 gate, §8 clasificación, §9 reconciliación ejecutada |
| `03-DECISIONS/32-R8-ID-002-OWNER-DECISION-PHYSICAL-USER-BUSINESS-MEMBERSHIP-2026-10-03.md` | §1 Option A, §2 propiedades aprobadas, §3 transición física, §4 rol/autorización, §5 invitación, §6 no-aprobación |
| `03-DECISIONS/45-R8-ID-003-CONTRACT-PROPAGATION-READINESS-2026-10-04.md` | :77 R8-READY-001 BLOCKED |
| `03-DECISIONS/46-R8-AUTH-001-CONTRACT-PROPAGATION-READINESS-2026-10-04.md` | §2 abiertos, §3 impacto, §4 slice NOT READY, §6 gate |
| `03-DECISIONS/10-OPEN-DECISIONS.md` | encabezado de reconciliación 2026-09-28 |
| `07-DESIGN/ARCHITECTURE/04-R8-ARCH-002-TENANT-ISOLATION-ASSESSMENT-2026-10-03.md` | §6-§10, §8 gate, §11 adenda de cierre |
| `07-DESIGN/CONTRACTS/DOMAIN/06-R8-ID-003-IDENTITY-LEGACY-COEXISTENCE-CONTRACT-v0.1.md` | §4 C-COEX-001..006, §10 cutover, §11 rollback, §12 preservación, §13 evidencia, §14 dependencias, §15-16 |
| `07-DESIGN/CONTRACTS/DOMAIN/07-R8-AUTH-001-AUTHORIZATION-CONTRACT-v0.1.md` | §7 matriz capability-level, §8 AS-IS→TO-BE, §9 regla de migración, §10 invariants |
| `07-DESIGN/CONTRACTS/DOMAIN/08-R8-ARCH-003-AUTH-SESSION-BUSINESS-CONTEXT-CONTRACT-v0.1.md` | §3 cadena, §4-§5 AUTH/CTX, §6 sesión, §7 JWT, §8 MFA, §9 switch, §10 legacy, §11-12 interacciones, §13 los 14 OPEN, §14 preservación, §15 verificación, §16-17 |
| `07-DESIGN/CONTRACTS/DOMAIN/07-BLOCK-1-CONTRACTS-BASELINE-v0.1.md` | `C-TEN-001` : 111-130; índice de los 36 contratos |
| `07-DESIGN/TESTS-EVALS/DERIVED/05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md` | TE-ID-001..011 : 66-76; TE-AUTH-001..006 : 86-91; TE-CUST-001..004 : 101-104 (todos SPECIFIED) |
| `11-IMPLEMENTATION-READINESS/TASKS/CONTROLLED-BASELINE/00-R8-CONTROLLED-TASKS-BASELINE-v0.1.md` | §17 READY-001/002 : 400-414, §18 exclusiones, §19 regla de preservación, §20-21 gate, §22 reconciliación de estados |
| `11-IMPLEMENTATION-READINESS/TASKS/CONTROLLED-BASELINE/02-R8-TASK-READINESS-REVIEW-2026-10-03.md` | :267-268 READY-001/002 BLOCKED; §14-18 reassessments |
| `13-AUDIT/21-BLOCK-1-…-ASIS-AUDIT-2026-10-04.md` | borrador no versionado; §1-§17, G-01..G-17 |
| `13-AUDIT/22-B2-AUTHORIZATION-INVARIANTS-RECONCILIATION-2026-10-04.md` | borrador no versionado; §1-§15, los 31 `INV-B2-*`, §12 ítems técnicos |
| `13-AUDIT/23-BLOCK-3-TENANT-ISOLATION-ASIS-AUDIT-2026-10-04.md` | borrador no versionado; §6 cobertura, §7 operaciones, §11 nested/FK, §12 transacciones, §13 bypass, §14 gap matrix, §15 preservación, §17 readiness, §18 next step |

**Inventariados por listado, no leídos en detalle** (citados solo por existencia): `03-DECISIONS/00-DECISION-REGISTER.md`, `33`, `35`, `29`; `07-DESIGN/CONTRACTS/DOMAIN/01-IDENTITY-AND-TENANCY-CONTRACTS.md`; `07-DESIGN/INVARIANTS/DERIVED/00-INVARIANTS-v0.1.md`, `05-BLOCK-1-INVARIANTS-BASELINE-v0.1.md`, `04-R6-INVARIANTS-CANONICAL-AUDIT`; `07-DESIGN/ARCHITECTURE/06-BLOCK-1-ARCHITECTURE-SPEC-v0.1.md`; `09-TRANSFORMATION/07-BLOCK-1-TRANSFORMATION-SPEC-v0.1.md`; `11-IMPLEMENTATION-READINESS/PLAN/TRANSFORMATION/01-R7-TRANSFORMATION-PLAN-v0.2.md`. Su contenido llega a este documento a través de los informes 21, 22 y 23, que los citan.

**No existen** (verificado por listado de directorio): contrato B3 de tenant isolation; invariants B3; tests/evals B3; invariants B2 canónicos; tests/evals B2.

## `[ND]` — no determinable

- **Ejecución** de la herencia de la extensión en el `tx` interactivo. Hay evidencia de tipos `[C]` y documental `[D]` convergente (sec. 13.3), pero no se ejecutó nada. Es el test prioritario de la sec. 17.
- Números individuales TC-01..40 (solo rangos por contrato y TC-29/TC-38 son firmes).
- Contenido de los 8 documentos que el informe 22 §14 marca como no releídos.
- Runtime de módulos no leídos línea por línea: `pedidos`, `fidelizacion`, `caja` (service), `pagos`, `clientes` completos.
- `INV-B2-ROLE-004` (cardinalidad de roles): sin fuente documental.

## Clases no emitidas

**`[T]` — ninguna.** No existe test ejecutado que cubra B1, B2 o B3.
**`[E]` — ninguna.** No se ejecutó API, migraciones, build ni lint.

---

## APÉNDICE — CAMBIOS RESPECTO DE LA EVALUACIÓN PRELIMINAR

Esta evaluación incorpora el audit de B3 (`13-AUDIT/23-…`), que no estaba disponible cuando se produjo el análisis preliminar. Los cambios materiales:

| # | Preliminar | Esta versión | Causa |
|---|---|---|---|
| 1 | Comportamiento transaccional: `[ND]` abierto, blocker técnico T-06 | CUMPLE por construcción `[C]`; `[ND]` solo para ejecución; pasa a evidencia E-07 | Evidencia de tipos (`ITXClientDenyList`, Prisma 5.22.0) + documental convergente |
| 2 | `Venta.idempotencyKey`: `[ND]` | Resuelto `[C]`: sin fuga (cortado por validación post-query); el efecto real es colisión de clave entre tenants | `ventas.service.ts:113-120` leído y verificado |
| 3 | Área 20 de la matriz: NOT DETERMINABLE | READY WITH RECONCILIATION | Consecuencia de (1) |
| 4 | Slice: sin fixture identificada | Usa `empresaAislamiento` del seed, ya construida y sin consumir | `seed.ts:69,177,191-236` |
| 5 | H-2 descrito como "14 modelos sin `empresaId`" | 12 derivados + 2 **ambiguos** (`Legajo`/`DocumentoLegajo`, 2 ramas FK opcionales) | Clasificación del audit de B3 §6.C |
| 6 | H-5 descrito como "11 archivos con `PrismaService`" | Además: inyectable desde cualquier módulo (`prisma.module.ts:6-8`), 46 usos; el aislamiento es **opt-in por call site** | Audit de B3 §13 |
| 7 | Alcance del slice: 7 puntos | 8 puntos: se agregan el test de fail-closed y el test del `tx` | Propiedades sin cobertura identificadas en B3 |
| 8 | R4 ("el cliente no sobrescribe el tenant") descrito como CUMPLE | CUMPLE **por ausencia de superficie**; al introducir Business Switch la defensa se crea desde cero | Audit de B3 G-B3-13 |

Ninguno de estos cambios altera el veredicto. El blocker estructural (T-01, contrato de aislamiento inexistente) y la ausencia de Owner blockers se mantienen idénticos, y el audit de B3 los confirma de forma independiente.
