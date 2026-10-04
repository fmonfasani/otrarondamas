# WAPSELL — B3 TENANT ISOLATION CONTRACT v0.1

**Estado:** DERIVACIÓN CONTRACTUAL Y RECONCILIACIÓN — DRAFT / NO APROBADO
**Fecha:** 2026-10-04
**Tarea:** B3 — Tenant Isolation Contracts
**Autoridad:** R8-ARCH-002 (CLOSED — OWNER APPROVED), R8-MASTER, R8-ID-003, R8-AUTH-001, R8-ARCH-003
**Input AS-IS:** `13-AUDIT/23-BLOCK-3-TENANT-ISOLATION-ASIS-AUDIT-2026-10-04.md` (veredicto: READY WITH RECONCILIATION)
**Alcance de la acción:** sin cambios de código, schema, migraciones ni datos. Sin commits, sin push, sin deploy. Sin modificar Owner Decisions. **No se derivan todavía los B3 Invariants completos.**

**Clases de evidencia:** `[C]` código · `[T]` test · `[E]` ejecución · `[D]` documentado · `[ND]` no determinable.

> **No existe evidencia `[T]` ni `[E]` en este documento.** No hay tests de aislamiento en el repo y no se ejecutó nada. Las obligaciones aquí derivadas son contractuales (`[D]`) y su estado AS-IS es `[C]` por lectura.

---

# 1. EXECUTIVE SUMMARY

La conclusión central de esta derivación es que **B3 es mayoritariamente EXTEND, no NEW.**

Las 12 propiedades de R8-ARCH-002 §3 ya están propagadas en cuatro lugares canónicos: `08-R8-ARCH-003` §5 (CTX-001..006) y §12 (cinco obligaciones de persistencia), `06-R8-ID-003` §4 (C-COEX-004, con siete obligaciones de aislamiento durante coexistencia), `01-IDENTITY-AND-TENANCY` (C-TEN-001, C-CONTEXT-001 + R8 ARCHITECTURE CLOSURE ADDENDUM) y `06-BLOCK-1-ARCHITECTURE-SPEC` §5.5 (las 12 propiedades literales) `[D]`. La regla de no-duplicación obliga a extender, no a crear una segunda versión paralela.

Lo que **no** existe en ningún contrato canónico, y que el B3 AS-IS obliga a crear, es la **granularidad operacional**: los contratos vigentes dicen "related/nested persistence cannot cross Business" y "preserve ownership in related/nested operations" `[D]`, pero ninguno distingue ownership **directo** de **derivado**, ninguno trata el caso **AMBIGUOUS**, ninguno obliga a validar **foreign keys de entrada**, y ninguno define la frontera legítima de **acceso pre-contexto** frente a **bypass Business-scoped**.

**Resultado de la derivación:** 24 candidatos contractuales (`B3-CON-001..024`), de los cuales:

| Estado | Cantidad | Lectura |
|---|---|---|
| EXISTING | 4 | ya cubierto; solo se traza |
| EXTEND | 11 | la obligación existe pero sin la granularidad que B3 exige |
| ADAPT | 3 | el componente AS-IS se conserva con obligación modificada |
| NEW | 5 | no hay obligación equivalente en ningún contrato |
| OPEN TECHNICAL DETAIL | 1 | obligación diferida a decisión técnica ya declarada OPEN |
| OWNER DECISION REQUIRED | 0 | — |

**Cero Owner Decisions requeridas.** Se verificaron las cinco Owner Decisions y los cuatro contratos canónicos: no se encontró ninguna contradicción real. Los gaps del AS-IS caen dentro de lo que R8-ARCH-002 §6 ya declaró abierto como trabajo de especificación downstream (ownership directo/indirecto, nested, unique lookups, transacciones, contexto ausente, migración) `[D]`. Extender un contrato dentro de un espacio ya declarado abierto no constituye una decisión nueva.

**Los dos hallazgos que condicionan la derivación:**

1. **G-B3-05 (FK sin validar en `crearDevolucion`) no es un vacío contractual sino un incumplimiento de un contrato que ya existe.** C-COEX-004 ya obliga a que "related/nested persistence cannot cross Business" `[D]`. El código lo incumple `[C]`. Por tanto B3 no debe "crear" la obligación — debe hacerla **verificable** y registrar el defecto. La distinción importa: no se arregla escribiendo un contrato nuevo.
2. **Cuatro de cinco nested writes del código ya aplican el patrón correcto** (lectura scoped previa de la FK antes del nested create): `ventas.service.ts:170`, `tienda.service.ts:265`, `compras.service.ts:128` (verificado en esta derivación, no estaba en el AS-IS audit) y, por omisión, solo `compras.service.ts:357` falla `[C]`. El patrón a contratar **ya existe en el repo**: no hay que inventar mecanismo.

**Corrección de alcance respecto del encargo:** el encargo pide obligaciones para `nested connect`, `nested update`, `nested delete` y `connectOrCreate`. Se verificó que **ninguna de esas operaciones existe en `apps/api/src`** `[C]`. Siguiendo la regla "NO inventar operaciones que no existan", se contratan como obligación **condicional prospectiva** (B3-CON-012), no como obligación sobre comportamiento presente.

**Veredicto:** `READY WITH RECONCILIATION` (sec. 24-25). Las reconciliaciones son cuatro, concretas y documentales, no requieren decisión de Owner.

---

# 2. SCOPE

**En alcance:**
- derivación de obligaciones contractuales de Tenant Isolation a partir del B3 AS-IS;
- reconciliación con los cuatro contratos canónicos de dominio y las cinco Owner Decisions;
- clasificación contractual de los 42 modelos del schema;
- mapeo gap → contrato, vector → contrato, OD rule → contrato;
- identificación de candidatos a Invariant y a Test/Eval (solo identificación);
- matriz de preservación/adaptación.

**Fuera de alcance (por la regla 22 del encargo y sec. 23):**
- mecanismo Prisma concreto; implementación de guard/middleware; RLS; migración de schema; aislamiento físico; elección de ORM; deployment; broker de eventos; estrategia de locking.

**No realizado:**
- derivación del set completo de B3 Invariants (sec. 21 identifica candidatos, nada más);
- creación del test suite (sec. 22 identifica candidatos, nada más);
- ejecución de cualquier test o código.

**Verificación de código realizada en esta derivación** (adicional al AS-IS audit, para no inventar operaciones):
- existencia de `connect` / `connectOrCreate` / nested `update` / nested `delete` / `set` / `disconnect`: **cero coincidencias** en `apps/api/src` `[C]`;
- inventario completo de nested `create`: 5 sitios, de los cuales 4 validan FK previamente `[C]`.

---

# 3. CANONICAL AUTHORITY

| Documento | Rol en esta derivación | Lo que aporta |
|---|---|---|
| `03-DECISIONS/28-R8-ARCH-002-...` | **Autoridad primaria** | Application-level isolation APROBADO; 12 propiedades (§3); invariante de seguridad (§7); AS-IS = ADAPTED (§5); lista de cierres pendientes (§6) |
| `03-DECISIONS/30-R8-MASTER-...CLOSURE` | Autoridad de cierre | Confirma application-level como dirección aprobada (§80) |
| `03-DECISIONS/31-R8-MASTER-...PROPAGATION-AUDIT` | Autoridad de propagación | Exige que el aislamiento deje de describirse como detalle indeciso (§115); requiere un invariant de aislamiento application-level (§140) |
| `03-DECISIONS/33-R8-ID-003-...` | Autoridad de coexistencia | `empresaId` legacy = dato transicional; sin limpieza destructiva |
| `03-DECISIONS/35-R8-AUTH-001-...` | Autoridad de autorización | Membership → Role → Permission; catálogo de permisos |
| `07-DESIGN/ARCHITECTURE/04-R8-ARCH-002-ASSESSMENT` | Evidencia AS-IS canónica | Las 6 limitaciones del mecanismo, declaradas "verified implementation characteristics, not assumptions" (§3) |
| `07-DESIGN/ARCHITECTURE/06-BLOCK-1-ARCH-SPEC` §5.4-5.5 | **Especificación arquitectónica** | Las 12 propiedades literales + cadena de aislamiento + disposición ADAPT |
| `07-DESIGN/CONTRACTS/DOMAIN/01-IDENTITY-AND-TENANCY` | Contrato existente | C-TEN-001, C-CONTEXT-001, C-MEM-001, C-AUTH-001; R5-IDENTITY-002; R8 CLOSURE ADDENDUM |
| `.../06-R8-ID-003-...CONTRACT-v0.1` | Contrato existente | **C-COEX-004** (7 obligaciones de aislamiento); §9 Business Context boundary |
| `.../07-R8-AUTH-001-...CONTRACT-v0.1` | Contrato existente | §10 invariants de autorización; §11 test/eval mapping |
| `.../08-R8-ARCH-003-...CONTRACT-v0.1` | Contrato existente | **CTX-001..006**; **§12 Tenant-isolation interaction**; §13 lista OPEN; §15 verification requirements |
| `07-DESIGN/INVARIANTS/DERIVED/00-INVARIANTS-v0.1` | Trazabilidad | INV-TEN-001, INV-MEM-001/002, INV-AUTH-001/002/003; R8 CLOSURE 6 propiedades |
| `07-DESIGN/INVARIANTS/BASELINE/00-R5-...` | Trazabilidad | INV-ID-004 (Business isolation), INV-PUR-003, INV-AUDIT-002 |
| `07-DESIGN/TESTS-EVALS/DERIVED/00-TESTS-EVALS-v0.2` | Cobertura existente | TE-TEN-001, TE-ID-002, TE-INV-001, TE-CASH-001, TE-COM-004; §316 negative tests del boundary R8 |
| `07-DESIGN/TESTS-EVALS/AUDIT/00-R7-...` | Cobertura existente | R7-AUD-001: TE-TEN-001 fue agregado por falta de criterio dedicado |

**Regla aplicada:** ninguna de estas fuentes se reinterpreta. Donde una obligación ya existe, se cita y se extiende. Donde no existe, se declara NEW con su justificación.

---

# 4. B3 AS-IS INPUTS

Inputs tomados del B3 AS-IS Audit, sin re-derivar:

## 4.1 Núcleo existente (a preservar)

| Propiedad AS-IS | Evidencia | Disposición |
|---|---|---|
| fuerza `empresaId` en `create`/`createMany` | `empresa-scope.extension.ts:118-129` `[C]` | PRESERVE |
| inyecta `empresaId` en `where` de 9 operaciones | `:82-92, 131-134` `[C]` | PRESERVE |
| valida `findUnique` post-query | `:136-159` `[C]` | ADAPT |
| **falla cerrada** ante operación no contemplada | `:164-166` `[C]` | PRESERVE |
| cero usos de `upsert` en `src` | grep `[C]` | evidencia de que el fail-closed opera |
| cero usos de `groupBy` en `src` | grep `[C]` | idem |
| `tienda.service.ts:230` documenta evitar `upsert` por el fail-closed | `[C]` | evidencia de que el mecanismo moldea el código |

## 4.2 Gaps de entrada

| Gap | Severidad | Enunciado AS-IS | Tratamiento contractual |
|---|---|---|---|
| **G-B3-01** | ALTA | `PagoProveedor`/`DevolucionProveedor` tienen `empresaId` y quedan fuera de la allow-list. Mitigación indirecta por `getCompra(empresaId, ...)` previo — **no es garantía estructural** | B3-CON-006, B3-CON-016 |
| **G-B3-02** | ALTA | 12 modelos sin `empresaId` y sin mecanismo de derivación explícito | B3-CON-014, B3-CON-015 |
| **G-B3-04** | ALTA | la extensión no inspecciona nested writes ni `include` | B3-CON-011, B3-CON-012, B3-CON-013 |
| **G-B3-05** | ALTA | `ComprasService.crearDevolucion` persiste `productoId`/`loteId` del DTO sin validación de pertenencia; docstring indica validación no implementada. **Hallazgo más importante** | B3-CON-017, B3-CON-018 |
| **G-B3-02/04 AMBIGUOUS** | ALTA | `Legajo`/`DocumentoLegajo`: el tenant depende de cuál de dos FK opcionales esté poblada. **No resolver inventando un modelo** | B3-CON-019 |
| **G-B3-09** | ALTA | no existen tests de aislamiento; `seed.ts` ya crea `empresaAislamiento` con catálogo completo; ningún test la consume | B3-CON-023, B3-CON-024 |
| **R4** | — | cumplimiento **por ausencia de superficie**, no defensa activa. Business Switching exigirá defensa explícita | B3-CON-008, B3-CON-009 |
| **R14** | — | bypass por `PrismaService` alcanzable; `PrismaModule` lo exporta; ~46 usos crudos; los de `auth*` son pre-contexto y correctos por definición; el resto es superficie de bypass potencial | B3-CON-020, B3-CON-021, B3-CON-022 |

## 4.3 Verificación adicional de esta derivación

Para cumplir "NO inventar operaciones que no existan":

| Operación | Presencia en `apps/api/src` | Consecuencia contractual |
|---|---|---|
| nested `create` | **5 sitios** `[C]` | obligación sobre comportamiento presente (B3-CON-011) |
| nested `connect` | **0** `[C]` | obligación condicional prospectiva (B3-CON-012) |
| `connectOrCreate` | **0** `[C]` | idem |
| nested `update` / `delete` / `set` / `disconnect` | **0** `[C]` | idem |

**Corrección al inventario del AS-IS audit:** el AS-IS registró 4 sitios de nested write. Existe un quinto, `compras.service.ts:128` (`crearCompra`), que **sí valida** las FK con `db.producto.findMany` scoped previo y un bucle que rechaza los ausentes (`:107-114`) `[C]`. El balance correcto es **4 seguros / 1 vulnerable**, lo que refuerza la conclusión: el patrón correcto ya existe y `crearDevolucion` es la omisión.

---

# 5. EXISTING CONTRACT INVENTORY

Aplicación de la regla de no-duplicación (sec. 15 del encargo). Inventario de lo que **ya** obliga sobre Tenant Isolation.

| Obligación existente | Fuente | Sección | Cubre | No cubre (lo que B3 debe aportar) |
|---|---|---|---|---|
| Business es el boundary de aislamiento | `01-IDENTITY-AND-TENANCY` | C-TEN-001 | OD-1, invariante §7 | granularidad operacional; mecanismo de derivación |
| Toda operación Business-scoped corre sobre contexto resuelto explícitamente | `01-IDENTITY-AND-TENANCY` | C-CONTEXT-001 | OD-1 | qué pasa con modelos sin `empresaId` |
| Membership contextualiza User↔Business | `01-IDENTITY-AND-TENANCY` | C-MEM-001 | OD-2 | — |
| Membership INACTIVE no puede operar | `01-IDENTITY-AND-TENANCY` | R5-IDENTITY-002 | OD-3 | — |
| Token válido no autoriza por sí mismo | `01-IDENTITY-AND-TENANCY` | C-AUTH-001, R5-IDENTITY-001 | OD-2 | — |
| 7 propiedades R8 (contexto, Membership, client ID, fail-closed, JWT, cross-Business incl. unique y nested) | `01-IDENTITY-AND-TENANCY` | R8 CLOSURE ADDENDUM | OD-1..4, 8, 9, 11 | FK de entrada; ownership derivado; bypass |
| Contexto activo controlado por la aplicación | `08-R8-ARCH-003` | CTX-001 | OD-1 | — |
| Contexto ↔ Membership ACTIVE | `08-R8-ARCH-003` | CTX-002 | OD-2, OD-3 | — |
| Client-supplied Business ID es input no confiable | `08-R8-ARCH-003` | CTX-003 | OD-4 | **superficie concreta ante Business Switching** |
| Contexto ausente/inválido/no autorizado falla cerrado | `08-R8-ARCH-003` | CTX-004 | OD-11 | **distinción ausente vs inválido** |
| Un User puede operar en varios Business vía Memberships | `08-R8-ARCH-003` | CTX-005 | OD-2 | — |
| Contexto consistente con el scope usado por persistencia y nested | `08-R8-ARCH-003` | CTX-006 | OD-9 | **qué significa "consistente" para derivados** |
| **5 obligaciones de persistencia**: ownership desde contexto; constrain r/w/d; proteger unique lookups; preservar ownership en related/nested; preservar aislamiento en transacciones | `08-R8-ARCH-003` | **§12** | OD-5..10 | **FK de entrada; granularidad por operación; verificabilidad** |
| `EmpresaScopedPrismaService`/`empresaScopeExtension` = AS-IS adaptation candidate, no reemplazo automático | `08-R8-ARCH-003` | §12 | OD-§5 | — |
| **7 obligaciones de aislamiento en coexistencia** | `06-R8-ID-003` | **C-COEX-004** | OD-1..7, 9, 11 | **FK; derivados; AMBIGUOUS; bypass** |
| `empresaId` legacy no puede sobrescribir el contexto efectivo | `06-R8-ID-003` | C-COEX-003, §9 | OD-4 | — |
| Business Context: multi-Membership, ACTIVE, client ID no confiable, fail-closed, legacy no sobrescribe | `06-R8-ID-003` | §9 | OD-1..4, 11 | — |
| Sin limpieza destructiva de legacy | `06-R8-ID-003` | C-COEX-006 | — | — |
| Autorización = Membership → Role → Permission | `07-R8-AUTH-001` | §3, §10 | OD-2 | — |
| Verificación negativa requerida (11 escenarios) | `08-R8-ARCH-003` | §15 | OD-12 | **escenarios FK/nested/bypass/derivados** |
| Verificación negativa del boundary R8 | `00-TESTS-EVALS-v0.2` | §316-328 | OD-12 | idem |
| 12 propiedades literales + cadena | `06-BLOCK-1-ARCH-SPEC` | §5.4-5.5 | OD-1..12 | granularidad operacional |

## 5.1 Conclusión del inventario

**Las 12 reglas de R8-ARCH-002 están todas cubiertas al menos una vez a nivel conceptual** `[D]`. Esto es el resultado esperado de la propagación exigida por `31-R8-MASTER-DECISION-PROPAGATION-AUDIT`.

**Los cuatro huecos reales, no cubiertos por ninguna fuente:**

1. **Validación de FK de entrada.** Todas las fuentes dicen que nested/related persistence no puede cruzar Business. Ninguna dice que **un identificador de FK recibido del cliente deba validarse contra el contexto antes de persistirse**. Es precisamente el vector de G-B3-05. → **NEW**
2. **Ownership derivado como categoría contractual.** C-COEX-004 y CTX-006 hablan de "related/nested persistence" sin distinguir una entidad con `empresaId` de una cuyo tenant se determina por relación. Los 12 modelos de G-B3-02 no tienen tratamiento contractual. → **NEW**
3. **El caso AMBIGUOUS.** Ninguna fuente contempla que el tenant de una entidad pueda ser indeterminable sin diseño adicional (`Legajo`/`DocumentoLegajo`). → **NEW**
4. **Frontera pre-contexto vs bypass.** Ninguna fuente distingue el acceso legítimo sin contexto (login, activación por token) del bypass de una operación Business-scoped. R14 queda sin obligación contractual. → **NEW**

Todo lo demás es **EXTEND** (granularidad) o **EXISTING** (solo trazar).

---

# 6. BUSINESS CONTEXT CONTRACT

Cadena contractual, tomada literalmente de `06-BLOCK-1-ARCH-SPEC` §5.5 y `08-R8-ARCH-003` §3 `[D]`:

```
Authenticated User
      ↓
Active Business Context
      ↓
Valid ACTIVE Membership
      ↓
Business-scoped operation
```

Explícitamente **no permitido**:

```
Client businessId
      ↓
direct database scope
```

## Obligaciones

| ID | Obligación | Estado | Cubierto por |
|---|---|---|---|
| **B3-CON-001** | Una operación Business-scoped protegida se ejecuta únicamente bajo un Business Context activo establecido por el servidor | **EXISTING** | CTX-001, C-CONTEXT-001, §5.4 |
| **B3-CON-002** | El Business efectivo corresponde a una Membership ACTIVE del User autenticado | **EXISTING** | CTX-002, C-MEM-001, R5-IDENTITY-002 |
| **B3-CON-003** | Contexto **ausente** y contexto **inválido** son casos distinguibles, y **ambos** fallan cerrado; el fallo no degrada a acceso sin restricción | **EXTEND** de CTX-004 | CTX-004 no distingue los dos casos |
| **B3-CON-004** | La capa de persistencia **consume** el Business Context; no lo recibe como un valor que el llamador elige libremente | **ADAPT** | §12 lo implica; el AS-IS lo contradice `[C]` |
| **B3-CON-005** | Business Switching no puede otorgar un contexto fuera de las Memberships válidas del User, ni sobrescribir el aislamiento | **EXISTING** | `08-R8-ARCH-003` §9 |

### B3-CON-003 — fundamento

El AS-IS cumple el caso **ausente** (el claim siempre viaja) pero **no valida el caso inválido**: un `empresaId` firmado que no corresponde a ninguna Empresa no se verifica contra la base `[C]`; el efecto esperado (lecturas a cero filas, violación de FK en `create`) es `[ND]`, no ejecutado. CTX-004 agrupa "missing, invalid or unauthorized" en una sola cláusula, lo que permite leer el AS-IS como conforme. La extensión separa los casos para que la verificación negativa pueda distinguirlos.

### B3-CON-004 — fundamento y límite

El AS-IS entrega `forEmpresa(empresaId: string)`, donde `empresaId` es un `string` que el call site elige `[C]`. Nada detecta un valor equivocado. §12 de ARCH-003 dice que "Business Context is the upstream context for application-level tenant isolation" `[D]`, lo que implica dirección de flujo, pero ningún contrato lo enuncia como obligación verificable.

**Límite respetado:** esta obligación **no** prescribe cómo se propaga el contexto. El mecanismo de propagación está declarado OPEN en `08-R8-ARCH-003` §13.8 ("context storage/propagation mechanism") `[D]`. B3-CON-004 obliga a la **dirección del flujo**, no al transporte.

---

# 7. DATA ISOLATION CONTRACT

Obligaciones por operación. Fuente de todas: R8-ARCH-002 §3.5-3.8 + §12 de ARCH-003 + C-COEX-004 `[D]`.

| ID | Operación | Obligación | Estado | AS-IS |
|---|---|---|---|---|
| **B3-CON-006** | **CREATE / CREATE MANY** | El Business de una entidad creada se deriva del Business Context, no de un valor del payload del cliente. Aplica a **toda** entidad Business-scoped, con o sin `empresaId` en la allow-list del mecanismo | **EXTEND** de §12 y C-COEX-004 | Cumple en 26 modelos; **no** en `PagoProveedor`/`DevolucionProveedor` (G-B3-01) ni en los `create` crudos de invitaciones `[C]` |
| **B3-CON-007** | **READ** | Toda lectura Business-scoped queda restringida al Business Context, incluidas las lecturas de entidades cuyo tenant es derivado | **EXTEND** | Cumple en 26; sin filtro automático en 2+12 `[C]` |
| **B3-CON-008** | **UPDATE** | Una operación de update no puede modificar una entidad de otro Business. La restricción no puede depender de que una lectura previa no relacionada haya verificado la pertenencia | **EXTEND** | Cumple por mecanismo en 26; X-06 cumple solo por orden de llamadas `[C]` |
| **B3-CON-009** | **DELETE** | Una operación de delete no puede eliminar una entidad de otro Business | **EXISTING** | Cumple por mecanismo; además no hay deletes en el código auditado `[C]` |
| **B3-CON-010** | **FIND UNIQUE** | Ver sec. 13 | **EXTEND** | — |

### B3-CON-006 — por qué EXTEND y no EXISTING

§12 dice "create Business ownership from authoritative context" `[D]`. La extensión necesaria es la frase **"con o sin `empresaId` en la allow-list del mecanismo"**: el AS-IS satisface la obligación solo donde el mecanismo está configurado para hacerlo, y G-B3-01 demuestra que la configuración puede divergir del schema sin que nada lo detecte. La obligación contractual debe ser independiente del estado de una lista mantenida a mano.

### B3-CON-008 — por qué la segunda frase

El vector X-06 (`legajo.controller.ts:108` + `:123`) satisface el resultado pero no por mecanismo: un `findFirst` scoped verifica la pertenencia y después un `update` sobre el cliente crudo opera por `id` sin `empresaId` `[C]`. Es correcto hoy y se rompe con un cambio local. La segunda frase hace que el contrato distinga "aislado" de "aislado por el orden en que están escritas dos queries".

---

# 8. RELATED DATA / FOREIGN KEY CONTRACT

**Punto crítico de B3.** Aquí está el único hueco contractual con dato cruzado efectivamente persistible.

## 8.1 Obligaciones

| ID | Obligación | Estado | Fundamento |
|---|---|---|---|
| **B3-CON-017** | Un identificador de entidad relacionada recibido de un cliente (FK de entrada) debe resolverse y validarse contra el Business Context **antes** de ser persistido como referencia | **NEW** | Ninguna fuente canónica lo obliga; es el vector de G-B3-05 |
| **B3-CON-018** | Una entidad Business-scoped no puede quedar vinculada a una entidad perteneciente a otro Business. La integridad referencial de la base (existencia de la FK) no satisface esta obligación | **NEW** | Postgres valida existencia, no pertenencia `[C]`; no hay FK compuestas con `empresaId` `[C]` |
| **B3-CON-019** | Cuando el Business de una entidad no puede determinarse de forma inequívoca a partir de su modelo de datos, la entidad se declara **AMBIGUOUS** y su tratamiento de aislamiento requiere resolución explícita antes de que exista una obligación verificable | **NEW** | `Legajo`/`DocumentoLegajo`; prohibido resolver inventando un modelo |

### B3-CON-017 — evidencia y precedente en el repo

**Incumplimiento:** `compras.service.ts:343-398` (`crearDevolucion`) toma `item.productoId` e `item.loteId` del DTO y los persiste en `DevolucionProveedorItem` (nested create) y en `MovimientoStock.create` sin validar pertenencia `[C]`. El docstring (`:323-331`) afirma validar el lote; el método no contiene ninguna comparación entre `loteId` y `productoId` `[C]`.

**Precedente correcto, ya en el código** — cuatro sitios aplican el patrón que B3-CON-017 formaliza `[C]`:

| Sitio | Patrón aplicado |
|---|---|
| `ventas.service.ts` `resolverItems()` | `db.producto.findMany({id:{in:...}})` scoped + rechazo de ausentes → `PRODUCTO_NO_ENCONTRADO` |
| `tienda.service.ts:158-163` | `db.producto.findMany({id:{in:...}, activo:true})` scoped + bucle de rechazo |
| `compras.service.ts:107-114` (`crearCompra`) | `db.producto.findMany` scoped + bucle de rechazo por item |
| `caja.service.ts:132-136` | `db.usuario.findUnique` scoped para `usuarioEntranteId` |

El contrato no inventa mecanismo: describe lo que 4 de 5 sitios ya hacen.

### B3-CON-019 — por qué no se resuelve aquí

`Legajo` tiene `usuarioId` y `clienteId`, **ambos `@unique` y ambos opcionales** (`schema.prisma:520-523`) `[C]`. El tenant se deriva por `Usuario.empresaId` o por `Cliente.empresaId` según cuál esté poblada. `DocumentoLegajo` lo deriva a dos saltos. Resolver esto exigiría decidir si `Legajo` debe tener `empresaId` propio, o si una de las dos ramas es canónica, o si son dos entidades distintas — todas decisiones de modelo. El encargo prohíbe inventarlas y `06-R8-ID-003` §5 establece que "no physical mapping, ID strategy or backfill algorithm is authorized by this contract" `[D]`.

**B3-CON-019 no deja el caso sin contrato:** obliga a que una entidad AMBIGUOUS **no reciba tratamiento de aislamiento por defecto ni se presuma global**. Es una obligación de no-presunción, verificable como tal.

## 8.2 Entidades bajo atención especial del encargo

| Entidad | `empresaId` | Ownership | Tratamiento contractual | Obligación |
|---|---|---|---|---|
| `productoId` (como FK de entrada) | n/a | FK a entidad DIRECT | validar contra contexto antes de persistir | B3-CON-017 |
| `loteId` (como FK de entrada) | n/a | FK a entidad DIRECT | idem | B3-CON-017 |
| `PagoProveedor` | **sí** `[C]` | DIRECT | scoped; la obligación no depende de la allow-list | B3-CON-006, B3-CON-016 |
| `DevolucionProveedor` | **sí** `[C]` | DIRECT | idem | B3-CON-006, B3-CON-016 |
| `DevolucionProveedorItem` | no `[C]` | DERIVED (vía `DevolucionProveedor`) + FK a Producto/Lote | derived scope + validación de FK | B3-CON-014, B3-CON-017 |
| `Legajo` | no `[C]` | **AMBIGUOUS** | resolución explícita requerida | B3-CON-019 |
| `DocumentoLegajo` | no `[C]` | **AMBIGUOUS** (derivado de AMBIGUOUS) | idem | B3-CON-019 |

---

# 9. NESTED WRITE CONTRACT

| ID | Obligación | Estado | Alcance |
|---|---|---|---|
| **B3-CON-011** | Una escritura anidada debe preservar el Business ownership del padre, de los hijos y de las entidades relacionadas que cree o referencie | **EXTEND** de §12 / C-COEX-004 | nested `create` — **operación presente en el código** (5 sitios `[C]`) |
| **B3-CON-012** | La obligación de preservar ownership aplica a **cualquier** forma de escritura anidada o vinculación que el sistema llegue a utilizar, incluidas las que hoy no existen en el código | **NEW (condicional prospectiva)** | `connect`, `connectOrCreate`, nested `update`, nested `delete`, `set`, `disconnect` — **cero usos verificados** `[C]` |
| **B3-CON-013** | La lectura de entidades relacionadas no puede exponer datos de otro Business | **EXTEND** de §12 | `include` / `select` de relaciones |

## 9.1 Fundamento de la separación 011 / 012

El encargo pide obligaciones para `nested connect`, `nested update`, `nested delete` y `connectOrCreate`, y simultáneamente prohíbe inventar operaciones que no existan. Se verificó: **ninguna de esas operaciones aparece en `apps/api/src`** `[C]` (la única coincidencia de `connect` es un comentario en `catalogo.controller.ts:104` que explica por qué **no** se usa).

La resolución honesta es separar:
- **B3-CON-011** obliga sobre comportamiento presente y es verificable hoy con los 5 sitios reales;
- **B3-CON-012** obliga de forma condicional — "si el sistema llega a usar X, la obligación aplica" — sin afirmar que X exista.

Esto evita dos errores: declarar un gap sobre una operación inexistente, y dejar la obligación sin cobertura si mañana se introduce.

## 9.2 Estado AS-IS de B3-CON-013

La extensión no inspecciona `include` `[C]`. El AS-IS lo clasificó inocuo **dado el schema actual**, porque toda relación incluida cuelga de un registro padre ya validado y Postgres garantiza la integridad de la FK. **Dependencia explícita:** esa inocuidad se sostiene solo mientras no exista una FK cruzada persistida — es decir, mientras B3-CON-017/018 se cumplan. Si G-B3-05 produce una FK cruzada, un `include` la expone. B3-CON-013 es por tanto una obligación **dependiente** de B3-CON-018, y así debe registrarse en los invariants.

---

# 10. TRANSACTION ISOLATION CONTRACT

| ID | Obligación | Estado | AS-IS |
|---|---|---|---|
| **B3-CON-020** | Una transacción no puede permitir que una operación Business-scoped escape del Business Context bajo el que se abrió | **EXTEND** de §12 | Cumple por construcción: 11 transacciones, todas sobre cliente extendido, un `empresaId` por closure; ninguna mezcla dos tenants `[C]` |
| **B3-CON-021** | Toda operación ejecutada dentro de una transacción está sujeta a las mismas obligaciones de aislamiento que fuera de ella, incluido el SQL crudo | **EXTEND** | `$executeRaw` dentro de `tx` no pasa por la extensión; el único uso incluye `empresaId` en el `WHERE` a mano y está parametrizado `[C]` |

## 10.1 Análisis de los puntos pedidos

| Punto | Estado AS-IS | Evidencia |
|---|---|---|
| Prisma transaction | 9 interactivas + 2 por array `[C]` | sec. 12 del AS-IS |
| transaction client | `tx` derivado del cliente extendido; 3 services tipan `EmpresaScopedTx` desde él | `inventario.service.ts:12`, `compras.service.ts:16`, `tienda.service.ts:13` `[C]` |
| propagación del contexto de tenant | un solo `empresaId` capturado en el closure; `forEmpresa` se invoca fuera y una vez | `[C]` |
| nested transaction | **no existen** | `[C]` |
| Prisma directo dentro de transacción | sí: `invitaciones.service.ts:118, 227` usan `this.prisma.$transaction([...])` crudo | `[C]` |
| raw SQL | `inventario.service.ts:266`, dentro de `tx` | `[C]` |
| background transaction | **no existen** (sin jobs/schedulers/colas) | `[C]` |

**`[ND]` que persiste:** que `$extends` siga activo en el `tx` interactivo **en ejecución**. Hay evidencia de tipos `[C]` (`ITXClientDenyList` no excluye los hooks de query) y documental convergente `[D]` (`tienda.service.ts:230` documenta el fail-closed operando dentro de `tx`), pero no se ejecutó nada. **El contrato no asume esta propiedad como garantizada** — la convierte en el candidato de test de máxima prioridad (sec. 22).

**Límite respetado:** B3-CON-020/021 no definen mecanismo técnico, conforme a la sec. 9 del encargo.

---

# 11. BYPASS RESISTANCE CONTRACT

Aquí el encargo es explícito en no declarar "todo `PrismaService` directo está prohibido" sin evidencia de que la regla sea necesaria. La derivación respeta esa restricción distinguiendo dos categorías.

| ID | Obligación | Estado |
|---|---|---|
| **B3-CON-022** | Una operación **pre-contexto** —cuya función es establecer o resolver la identidad y el Business, y que por definición no puede ejecutarse bajo un contexto que todavía no existe— es acceso legítimo sin Business Context | **NEW** |
| **B3-CON-023** | Una operación **Business-scoped** no puede ejecutarse fuera del aislamiento esperado. Que hoy no produzca cruce no satisface la obligación si el aislamiento depende únicamente del orden de las llamadas o de disciplina del call site | **NEW** |
| **B3-CON-024** | La superficie de acceso no scoped debe ser enumerable y auditable, de modo que la introducción de una nueva operación Business-scoped fuera del aislamiento sea detectable | **NEW** |

## 11.1 Clasificación de la superficie real (~46 usos crudos)

| Clase | Sitios | Clasificación contractual | Fundamento |
|---|---|---|---|
| **Pre-context legitimate access** | `auth.service.ts:45`, `auth.controller.ts:48`, `auth.google.service.ts:36,45,51,67`, `auth.cliente.service.ts:36,44,61,92,98,104,110`, `auth.cliente.controller.ts:83` (12) | **LEGÍTIMO** — B3-CON-022 | El `empresaId` es el *resultado* del login, no una restricción previa. `Usuario.email`/`Cliente.googleId` son únicos globales por diseño. Usar el cliente scoped es imposible por definición `[C]` |
| **Pre-context legitimate access** | `invitaciones.service.ts:38, 94, 212` | **LEGÍTIMO** — B3-CON-022 | El token secreto de 32 bytes es la credencial; el `empresaId` se deriva del registro que identifica `[C]` |
| **Pre-context con reserva** | `invitaciones.service.ts:38` | **LEGÍTIMO con observación** | `findUnique({email})` global permite enumerar la existencia de una cuenta de otro tenant. Impacto: enumeración, no acceso a datos. Coherente con R8-ID-003 (identidad global) `[D]` |
| **Business-scoped fuera del aislamiento** | `invitaciones.service.ts:118-131, 227-240` | **SUJETO a B3-CON-023** | `create` de `Usuario`/`Cliente` (modelos cubiertos) con cliente crudo; `empresaId` correcto por construcción pero **no forzado** `[C]` |
| **Business-scoped fuera del aislamiento** | `legajo.service.ts:66-174` (11), `legajo.controller.ts:85,108,123,145`, `legajo.cliente.controller.ts:99,123,135` | **SUJETO a B3-CON-023** | Opera por `usuarioId`/`clienteId`/`legajoId` sin chequeo de empresa; mitigado por los controllers (`user.id` del token; descarga valida `empresaId` en `:149`) `[C]` |
| **Fuera del plano de request** | `prisma/seed.ts`, `migrate-categoria-a-jerarquia.ts`, `sync-permisos-owner.ts` | **NO APLICA** | Scripts offline; el seed debe poder crear datos de varias Empresas (crea dos) `[C]` |
| **Sin modelo ni datos** | `health.controller.ts:15` (`SELECT 1`) | **NO APLICA** | `[C]` |

## 11.2 Lo que el contrato NO declara

- **No** declara prohibido el uso directo de `PrismaService`: la clase pre-contexto lo requiere y es correcta por definición.
- **No** declara que `PrismaModule` deba dejar de exportar `PrismaService`: eso es mecanismo, y `08-R8-ARCH-003` §13.11 mantiene OPEN el "exact authorization enforcement mechanism" `[D]`.
- **No** declara vulnerables los sitios de `legajo`: se verificó uno por uno que ninguno produce cruce hoy `[C]`. B3-CON-023 los alcanza porque el aislamiento depende de disciplina, que es exactamente lo que la obligación pide distinguir.

---

# 12. CLIENT-SUPPLIED TENANT ID CONTRACT

| ID | Obligación | Estado |
|---|---|---|
| **B3-CON-014** | Ningún `businessId`, `empresaId` o equivalente suministrado por el cliente puede sustituir el Business Context autorizado, en ninguna superficie de entrada | **EXTEND** de CTX-003 |
| **B3-CON-015** | Cuando se introduzca Business Switching, la selección de contexto debe resolverse contra las Memberships válidas del User; la ausencia actual de superficie de selección no constituye defensa | **EXTEND** de `08-R8-ARCH-003` §9 |

## 12.1 Superficies posibles — estado verificado

Sin inventar endpoints: se enumeran las superficies de entrada que el framework admite y se consigna lo encontrado.

| Superficie | Estado AS-IS | Clasificación | Evidencia |
|---|---|---|---|
| body / DTO | 0 coincidencias de `empresaId` en `*.dto.ts`; `whitelist:true` descarta no declaradas | SAFE | grep + `main.ts` `[C]` |
| query | 0 coincidencias | SAFE | grep `[C]` |
| route param | 0 rutas declaran `:empresaId` | SAFE | grep `[C]` |
| header | 0 usos del decorador `@Headers` en el repo | SAFE | grep `[C]` |
| token | el cliente **porta** el claim pero no lo **elige**: lo emite el servidor y va firmado | SAFE (dado `JWT_SECRET` íntegro) | `jwt.strategy.ts` `[C]` |
| session | no existe sesión de servidor | N/A | `[C]` |
| command payload | no existe superficie de comandos/jobs | N/A | sin jobs `[C]` |

## 12.2 La distinción que B3-CON-015 preserva

El AS-IS cumple R4 **por ausencia de superficie**, no por defensa activa. El sistema es mono-negocio y nunca necesitó aceptar un selector de tenant. `08-R8-ARCH-003` §9 ya cierra que el switching debe resolver por Membership `[D]`, pero el AS-IS no aporta ninguna defensa preexistente que ese switching pueda heredar.

**Consecuencia para la verificación:** un test que hoy intente sobrescribir el tenant por body/query/header pasará trivialmente, porque no hay nada que sobrescribir. Ese resultado **no** debe leerse como cobertura de R4. B3-CON-015 existe para que la matriz de tests registre esa diferencia (sec. 22).

---

# 13. UNIQUE LOOKUP / IDEMPOTENCY CONTRACT

| ID | Obligación | Estado |
|---|---|---|
| **B3-CON-010** | Un identificador único o aparentemente único no puede permitir exposición cross-tenant. La obligación recae sobre el resultado observable, no sobre la forma del índice | **EXTEND** de CTX-006 / §12 |
| **B3-CON-016** | Un identificador Business-scoped por semántica de negocio no puede comportarse como identificador global; su unicidad debe evaluarse dentro del Business | **NEW** |

## 13.1 La distinción exigida por el encargo

El encargo pide no confundir **índice único** con **autorización/tenant isolation**. Son dos obligaciones separadas:

- **B3-CON-010** (aislamiento): el resultado de un lookup por identificador único no debe revelar datos de otro Business. El AS-IS **lo cumple**, por validación post-query `[C]`.
- **B3-CON-016** (semántica de unicidad): un identificador que el negocio considera propio de un Business no debe colisionar entre Businesses. El AS-IS **no lo cumple** para `idempotencyKey`.

## 13.2 Análisis de `Venta.idempotencyKey`

**Hechos verificados:**
- `idempotencyKey String? @unique` — único **global**, sin `empresaId` (`schema.prisma:663`) `[C]`;
- se consulta con `db.venta.findUnique({where:{idempotencyKey}})` (`ventas.service.ts:117`) `[C]`;
- la validación post-query de la extensión convierte un resultado de otro tenant en `null` `[C]`.

**Consecuencias, separadas:**

| Dimensión | Resultado | Obligación |
|---|---|---|
| Fuga de datos cross-tenant | **No hay.** El registro de otro Business se lee y se descarta; retorna `null`, indistinguible de "no existe" | B3-CON-010 **satisfecha** |
| Colisión de negocio entre tenants | **Existe.** Una clave usada por Business A **impide** reutilizarla en Business B, porque el índice es global. Dos Businesses comparten un espacio de nombres de idempotencia | B3-CON-016 **no satisfecha** |
| Robustez del aislamiento | El corte depende **enteramente** de la validación post-query, no del índice | B3-CON-010 satisfecha con reserva |

**Lo que el contrato no hace:** no prescribe `@@unique([empresaId, idempotencyKey])`. Eso es schema, explícitamente fuera de alcance (sec. 23). B3-CON-016 enuncia la obligación observable; el mecanismo queda abierto.

## 13.3 Otros identificadores únicos globales

| Identificador | Estado | Clasificación |
|---|---|---|
| `Usuario.email` | único global | **Correcto por diseño.** R5-IDENTITY-004: "a normalized email identifies at most one User" `[D]`. Identidad global, coherente con R8-ID-003 |
| `Cliente.googleId` | único global `[C]` | **Correcto por diseño.** Identificador de identidad externa, pre-contexto |
| `Invitacion.token` | único global `[C]` | **Correcto por diseño.** Secreto de 32 bytes que *selecciona* el Business; es la credencial pre-contexto |
| `Venta.idempotencyKey` | único global `[C]` | **Incorrecto por semántica.** Identificador de negocio, no de identidad → B3-CON-016 |

La distinción operativa: un identificador **de identidad** puede ser legítimamente global (resuelve *a qué* Business pertenece el sujeto); un identificador **de negocio** pertenece al Business y no debe ser global.

---

# 14. BUSINESS-SCOPED MODEL CLASSIFICATION

Clasificación contractual de los 42 modelos. Derivada de la evidencia del AS-IS audit y del schema real `[C]`. **No inventada.**

## 14.1 BUSINESS-SCOPED-DIRECT — tiene `empresaId` (28)

| Modelo | `empresaId` | Ownership | Contract treatment | En allow-list AS-IS |
|---|---|---|---|---|
| Usuario, Invitacion, Familia, Subfamilia, Tipo, Subtipo, ProductoProveedor, Producto, Presentacion, Lote, Cliente, ReglaFidelizacion, CuentaCorriente, Deuda, Venta, Pedido, Pago, Caja, Proveedor, Compra, RecepcionCompra, MovimientoStock, Entrega, Notificacion, AuditLog, Autorizacion (26) | sí | direct | **scoped** | sí `[C]` |
| **PagoProveedor** (`:1061`) | sí | direct | **scoped** | **no** `[C]` → G-B3-01 |
| **DevolucionProveedor** (`:1082`) | sí | direct | **scoped** | **no** `[C]` → G-B3-01 |

## 14.2 BUSINESS-SCOPED-DERIVED — sin `empresaId`, tenant determinable por relación (10)

| Modelo | Cadena de derivación | Contract treatment |
|---|---|---|
| UsuarioPermiso | → Usuario → Empresa | derived scope |
| VentaItem | → Venta | derived scope |
| PedidoItem | → Pedido | derived scope |
| AplicacionPago | → Pago / → Deuda | derived scope |
| AperturaCaja | → Caja | derived scope |
| MovimientoCaja | → Caja / → AperturaCaja | derived scope |
| ArqueoCaja | → Caja / → AperturaCaja | derived scope |
| CierreCaja | → AperturaCaja | derived scope |
| CompraItem | → Compra | derived scope |
| DevolucionProveedorItem | → DevolucionProveedor | derived scope **+ validación de FK** (B3-CON-017) |

## 14.3 GLOBAL legítimo (2)

| Modelo | Fundamento | Contract treatment |
|---|---|---|
| **Empresa** | es el tenant mismo | global |
| **Permiso** | catálogo de permisos del sistema (`seed.ts:123`) `[C]`; coherente con R8-AUTH-001 §5 (dominios de permiso aprobados a nivel de plataforma) `[D]` | global |

## 14.4 AMBIGUOUS (2)

| Modelo | Por qué | Contract treatment |
|---|---|---|
| **Legajo** | `usuarioId` y `clienteId` ambos `@unique` **y opcionales** (`:520-523`) `[C]`; el tenant depende de cuál esté poblada | **needs resolution** — B3-CON-019 |
| **DocumentoLegajo** | deriva de `Legajo`, a dos saltos por rama opcional | **needs resolution** — B3-CON-019 |

## 14.5 Resumen

| Clase | Modelos | Obligación aplicable |
|---|---|---|
| DIRECT | 28 | B3-CON-006..010 |
| DERIVED | 10 | B3-CON-014 (derived scope) + B3-CON-007/011 |
| GLOBAL | 2 | sin obligación de scope |
| AMBIGUOUS | 2 | B3-CON-019 (resolución previa) |
| **Total** | **42** | — |

**Nota de método, conforme al encargo:** no se asumió que "sin `empresaId`" significa global. De los 14 sin columna, solo 2 son globales legítimos; 10 son derivados con padre inequívoco; 2 son ambiguos.

---

# 15. B3 CONTRACT CANDIDATES

24 candidatos. Formato completo por candidato.

---

### B3-CON-001 — Business Context establecido por el servidor

- **Contract statement:** una operación Business-scoped protegida se ejecuta únicamente bajo un Business Context activo establecido por el servidor.
- **Source:** R8-ARCH-002 §3.1; `06-BLOCK-1-ARCH-SPEC` §5.4
- **Rationale:** sin contexto establecido no hay frontera que aplicar.
- **Scope:** toda operación Business-scoped protegida
- **Evidence:** `[D]` CTX-001 · AS-IS: cumple en forma (claim siempre presente) pero el contexto se *asume*, no se *establece* `[C]`
- **Related OD:** R8-ARCH-002 §3.1
- **Related existing contract:** CTX-001; C-CONTEXT-001; R8 CLOSURE ADDENDUM
- **Related B3 gap:** G-B3-03
- **Test candidate:** TC-B3-13 (operación sin contexto)
- **Status:** **EXISTING**

---

### B3-CON-002 — Contexto ↔ Membership ACTIVE

- **Contract statement:** el Business efectivo corresponde a una Membership ACTIVE del User autenticado.
- **Source:** R8-ARCH-002 §3.2-3.3
- **Rationale:** el contexto sin Membership válida no es autoridad.
- **Scope:** resolución de contexto
- **Evidence:** `[D]` CTX-002, R5-IDENTITY-002 · AS-IS: **no cumple** — no existe Membership; `validate()` no consulta la base `[C]`
- **Related OD:** R8-ARCH-002 §3.2, §3.3
- **Related existing contract:** CTX-002; C-MEM-001; R5-IDENTITY-002; C-COEX-003
- **Related B3 gap:** G-B3-03
- **Test candidate:** TC-B3-14, TC-B3-15
- **Status:** **EXISTING**

---

### B3-CON-003 — Fail-closed distinguiendo ausente de inválido

- **Contract statement:** contexto ausente y contexto inválido son casos distinguibles y ambos fallan cerrado; el fallo no degrada a acceso sin restricción.
- **Source:** R8-ARCH-002 §3.11
- **Rationale:** CTX-004 agrupa "missing, invalid or unauthorized", lo que permite leer el AS-IS como conforme aunque el caso *inválido* no se valide.
- **Scope:** resolución de contexto
- **Evidence:** `[D]` CTX-004 · AS-IS: ausente cubierto `[C]`; inválido **no validado**, efecto `[ND]`
- **Related OD:** R8-ARCH-002 §3.11
- **Related existing contract:** CTX-004 (extiende)
- **Related B3 gap:** G-B3-03; R13 parcial
- **Test candidate:** TC-B3-13, TC-B3-16
- **Status:** **EXTEND**

---

### B3-CON-004 — La persistencia consume el contexto

- **Contract statement:** la capa de persistencia consume el Business Context; no lo recibe como un valor que el llamador elige libremente.
- **Source:** R8-ARCH-002 §2 (cadena); `08-R8-ARCH-003` §12
- **Rationale:** el AS-IS entrega `forEmpresa(empresaId: string)`; nada detecta un valor equivocado. El aislamiento es opt-in por call site.
- **Scope:** frontera entre contexto y persistencia
- **Evidence:** `[C]` `empresa-scoped-prisma.service.ts:38-39` · `[D]` §12
- **Related OD:** R8-ARCH-002 §5 (ADAPTED)
- **Related existing contract:** `08-R8-ARCH-003` §12
- **Related B3 gap:** G-B3-03, G-B3-07
- **Test candidate:** TC-B3-11 (bypass)
- **Status:** **ADAPT**
- **Límite:** no prescribe transporte; `08-R8-ARCH-003` §13.8 lo mantiene OPEN.

---

### B3-CON-005 — Business Switching dentro de Memberships válidas

- **Contract statement:** el switching no puede otorgar contexto fuera de las Memberships válidas del User ni sobrescribir el aislamiento.
- **Source:** R8-ARCH-002 §3.2; `08-R8-ARCH-003` §9
- **Rationale:** ya cerrado por contrato.
- **Scope:** selección de contexto activo
- **Evidence:** `[D]` §9 · AS-IS: no existe switching `[C]`
- **Related OD:** R8-ARCH-002 §3.2
- **Related existing contract:** `08-R8-ARCH-003` §9
- **Related B3 gap:** G-B3-13
- **Test candidate:** TC-B3-17, TC-B3-18
- **Status:** **EXISTING**

---

### B3-CON-006 — CREATE deriva ownership del contexto

- **Contract statement:** el Business de una entidad creada se deriva del Business Context, no de un valor del payload del cliente. Aplica a toda entidad Business-scoped, con o sin `empresaId` en la allow-list del mecanismo.
- **Source:** R8-ARCH-002 §3.5
- **Rationale:** el AS-IS cumple solo donde el mecanismo está configurado; G-B3-01 demuestra que la configuración puede divergir del schema sin detección.
- **Scope:** `create`, `createMany`, creación anidada
- **Evidence:** `[C]` cumple en 26 (`:118-129`); no en `PagoProveedor`/`DevolucionProveedor` ni en `invitaciones.service.ts:118,227`
- **Related OD:** R8-ARCH-002 §3.5
- **Related existing contract:** `08-R8-ARCH-003` §12; C-COEX-004 (extiende)
- **Related B3 gap:** G-B3-01
- **Test candidate:** TC-B3-05, TC-B3-19
- **Status:** **EXTEND**

---

### B3-CON-007 — READ restringido al contexto, incluido ownership derivado

- **Contract statement:** toda lectura Business-scoped queda restringida al Business Context, incluidas las lecturas de entidades cuyo tenant es derivado.
- **Source:** R8-ARCH-002 §3.6
- **Rationale:** 12 modelos derivados no reciben filtro; su aislamiento depende del call site.
- **Scope:** toda lectura Business-scoped
- **Evidence:** `[C]` cumple en 26; sin filtro en 2 + 12
- **Related OD:** R8-ARCH-002 §3.6
- **Related existing contract:** `08-R8-ARCH-003` §12; C-COEX-004 (extiende)
- **Related B3 gap:** G-B3-01, G-B3-02
- **Test candidate:** TC-B3-01, TC-B3-20
- **Status:** **EXTEND**

---

### B3-CON-008 — UPDATE no cruza y no depende del orden de llamadas

- **Contract statement:** un update no puede modificar una entidad de otro Business. La restricción no puede depender de que una lectura previa no relacionada haya verificado la pertenencia.
- **Source:** R8-ARCH-002 §3.7
- **Rationale:** X-06 satisface el resultado por orden de dos queries, no por mecanismo.
- **Scope:** `update`, `updateMany`, update anidado
- **Evidence:** `[C]` cumple por mecanismo en 26; `legajo.controller.ts:108+123` y `legajo.cliente.controller.ts:123+135` cumplen solo por orden
- **Related OD:** R8-ARCH-002 §3.7
- **Related existing contract:** `08-R8-ARCH-003` §12 (extiende)
- **Related B3 gap:** G-B3-10, X-06
- **Test candidate:** TC-B3-02
- **Status:** **EXTEND**

---

### B3-CON-009 — DELETE no cruza

- **Contract statement:** un delete no puede eliminar una entidad de otro Business.
- **Source:** R8-ARCH-002 §3.7
- **Rationale:** cubierto por mecanismo.
- **Scope:** `delete`, `deleteMany`, delete anidado
- **Evidence:** `[C]` `:131-134`; además 0 deletes en los services auditados
- **Related OD:** R8-ARCH-002 §3.7
- **Related existing contract:** `08-R8-ARCH-003` §12
- **Related B3 gap:** X-07
- **Test candidate:** TC-B3-03
- **Status:** **EXISTING**

---

### B3-CON-010 — Unique lookup no expone otro Business

- **Contract statement:** un identificador único o aparentemente único no puede permitir exposición cross-tenant. La obligación recae sobre el resultado observable, no sobre la forma del índice.
- **Source:** R8-ARCH-002 §3.8
- **Rationale:** separa aislamiento de forma del índice; el AS-IS cumple por validación post-query, no por índice.
- **Scope:** `findUnique`, `findUniqueOrThrow`, lookups por identificador único
- **Evidence:** `[C]` `:136-159`; reserva: depende de que el resultado traiga `empresaId` (latente si un `select` lo omitiera; sin uso actual)
- **Related OD:** R8-ARCH-002 §3.8
- **Related existing contract:** CTX-006; §12 (extiende)
- **Related B3 gap:** G-B3-06, X-02, X-03
- **Test candidate:** TC-B3-04, TC-B3-21
- **Status:** **EXTEND**

---

### B3-CON-011 — Nested create preserva ownership

- **Contract statement:** una escritura anidada debe preservar el Business ownership del padre, de los hijos y de las entidades relacionadas que cree o referencie.
- **Source:** R8-ARCH-002 §3.9
- **Rationale:** el mecanismo solo inspecciona `data`/`where` de nivel superior; los hijos nested no tienen `empresaId`.
- **Scope:** nested `create` — 5 sitios reales
- **Evidence:** `[C]` `:113-116`; 4 sitios validan FK previamente, 1 no (`compras.service.ts:357`)
- **Related OD:** R8-ARCH-002 §3.9
- **Related existing contract:** §12; C-COEX-004; CTX-006 (extiende)
- **Related B3 gap:** G-B3-04
- **Test candidate:** TC-B3-06
- **Status:** **EXTEND**

---

### B3-CON-012 — Obligación condicional para formas de vinculación no presentes

- **Contract statement:** la obligación de preservar ownership aplica a cualquier forma de escritura anidada o vinculación que el sistema llegue a utilizar, incluidas las que hoy no existen en el código.
- **Source:** R8-ARCH-002 §3.9
- **Rationale:** el encargo pide cubrir `connect`/`connectOrCreate`/nested update/delete; se verificó que **no existen** en `src`. Se contrata condicionalmente para no inventar un gap sobre comportamiento inexistente ni dejar la obligación sin cobertura futura.
- **Scope:** `connect`, `connectOrCreate`, nested `update`/`delete`, `set`, `disconnect` — **condicional**
- **Evidence:** `[C]` **0 usos verificados** en `apps/api/src`
- **Related OD:** R8-ARCH-002 §3.9
- **Related existing contract:** §12; C-COEX-004
- **Related B3 gap:** G-B3-04 (prospectivo)
- **Test candidate:** TC-B3-07, TC-B3-08 — **solo cuando la operación se introduzca**
- **Status:** **NEW** (condicional prospectiva)

---

### B3-CON-013 — Lectura de relaciones no expone otro Business

- **Contract statement:** la lectura de entidades relacionadas no puede exponer datos de otro Business.
- **Source:** R8-ARCH-002 §3.6, §7
- **Rationale:** `include` no se inspecciona. Hoy inocuo **porque** toda relación cuelga de un padre validado y la FK es íntegra; deja de serlo si existe una FK cruzada persistida.
- **Scope:** `include` / `select` de relaciones
- **Evidence:** `[C]` `:113`; inocuidad **dependiente de B3-CON-018**
- **Related OD:** R8-ARCH-002 §3.6
- **Related existing contract:** §12 (extiende)
- **Related B3 gap:** G-B3-04, X-14
- **Test candidate:** TC-B3-22
- **Status:** **EXTEND** — obligación **dependiente**

---

### B3-CON-014 — Ownership derivado como categoría contractual

- **Contract statement:** una entidad cuyo Business no está representado en la propia entidad pero es determinable de forma inequívoca por una relación, está sujeta a las mismas obligaciones de aislamiento que una entidad con ownership directo.
- **Source:** R8-ARCH-002 §6 (ownership directo/indirecto declarado abierto); §3.9
- **Rationale:** ninguna fuente canónica distingue direct de derived. Los 10 modelos derivados no tienen tratamiento contractual; "heredan por disciplina".
- **Scope:** los 10 modelos DERIVED (sec. 14.2)
- **Evidence:** `[C]` sec. 6.C del AS-IS · `[D]` R8-ARCH-002 §6
- **Related OD:** R8-ARCH-002 §3.9, §6
- **Related existing contract:** ninguno cubre la distinción
- **Related B3 gap:** G-B3-02
- **Test candidate:** TC-B3-20
- **Status:** **NEW**

---

### B3-CON-015 — No presunción de globalidad

- **Contract statement:** la ausencia de un identificador de Business en una entidad no permite presumir que la entidad es global. Su clasificación requiere determinación explícita.
- **Source:** R8-ARCH-002 §3.9, §6
- **Rationale:** de los 14 modelos sin `empresaId`, solo 2 son globales legítimos. Presumir globalidad habría dejado 12 entidades sin frontera.
- **Scope:** clasificación de todo modelo sin identificador de Business
- **Evidence:** `[C]` sec. 14
- **Related OD:** R8-ARCH-002 §3.9
- **Related existing contract:** ninguno
- **Related B3 gap:** G-B3-02
- **Test candidate:** no directamente testeable — obligación de clasificación; se verifica por revisión
- **Status:** **NEW**

---

### B3-CON-016 — Identificador de negocio no es global

- **Contract statement:** un identificador Business-scoped por semántica de negocio no puede comportarse como identificador global; su unicidad debe evaluarse dentro del Business.
- **Source:** R8-ARCH-002 §3.8
- **Rationale:** `Venta.idempotencyKey` es único global: no hay fuga (B3-CON-010 lo corta) pero dos Businesses comparten espacio de nombres de idempotencia. Es obligación de semántica de unicidad, distinta del aislamiento.
- **Scope:** idempotency keys, identificadores externos, identificadores de negocio Business-scoped
- **Evidence:** `[C]` `schema.prisma:663`; `ventas.service.ts:117`
- **Related OD:** R8-ARCH-002 §3.8
- **Related existing contract:** ninguno hace la distinción
- **Related B3 gap:** G-B3-11
- **Test candidate:** TC-B3-21
- **Status:** **NEW**
- **Límite:** no prescribe `@@unique([empresaId, idempotencyKey])` — schema fuera de alcance.

---

### B3-CON-017 — FK de entrada se valida contra el contexto

- **Contract statement:** un identificador de entidad relacionada recibido de un cliente debe resolverse y validarse contra el Business Context antes de ser persistido como referencia.
- **Source:** R8-ARCH-002 §3.9, §7
- **Rationale:** **hueco contractual real.** Toda fuente obliga a que nested/related persistence no cruce Business; ninguna obliga a validar una FK de entrada. Es el vector exacto de G-B3-05.
- **Scope:** todo identificador de entidad relacionada proveniente de un payload de cliente
- **Evidence:** `[C]` incumplido en `compras.service.ts:343-398`; patrón correcto ya aplicado en `ventas.service.ts` `resolverItems()`, `tienda.service.ts:158-163`, `compras.service.ts:107-114`, `caja.service.ts:132-136`
- **Related OD:** R8-ARCH-002 §3.9
- **Related existing contract:** §12 y C-COEX-004 lo implican sin obligarlo
- **Related B3 gap:** **G-B3-05**
- **Test candidate:** TC-B3-09, TC-B3-05
- **Status:** **NEW**

---

### B3-CON-018 — Integridad referencial no satisface el aislamiento

- **Contract statement:** una entidad Business-scoped no puede quedar vinculada a una entidad perteneciente a otro Business. La integridad referencial de la base de datos no satisface esta obligación.
- **Source:** R8-ARCH-002 §3.9, §7
- **Rationale:** la base valida que la FK **exista**, no a qué Business pertenece. No hay FK compuestas con `empresaId`. El cumplimiento recae hoy enteramente en cada call site.
- **Scope:** toda relación entre entidades Business-scoped
- **Evidence:** `[C]` sec. 11.3 del AS-IS; ningún `@@unique([id, empresaId])` en el schema
- **Related OD:** R8-ARCH-002 §3.9
- **Related existing contract:** ninguno enuncia la insuficiencia de la FK
- **Related B3 gap:** **G-B3-05**, X-08, X-11
- **Test candidate:** TC-B3-09, TC-B3-10
- **Status:** **NEW**

---

### B3-CON-019 — Entidad AMBIGUOUS requiere resolución explícita

- **Contract statement:** cuando el Business de una entidad no puede determinarse de forma inequívoca a partir de su modelo de datos, la entidad se declara AMBIGUOUS. No recibe tratamiento de aislamiento por defecto ni se presume global; su tratamiento requiere resolución explícita previa.
- **Source:** R8-ARCH-002 §6; `06-R8-ID-003` §5
- **Rationale:** `Legajo` tiene `usuarioId` y `clienteId` ambos `@unique` y opcionales. Resolverlo exigiría decidir modelo, lo que el encargo prohíbe y `06-R8-ID-003` §5 no autoriza.
- **Scope:** `Legajo`, `DocumentoLegajo`
- **Evidence:** `[C]` `schema.prisma:520-523` · `[D]` `06-R8-ID-003` §5
- **Related OD:** R8-ARCH-002 §6
- **Related existing contract:** ninguno contempla el caso
- **Related B3 gap:** G-B3-02 / G-B3-04 (AMBIGUOUS)
- **Test candidate:** no testeable hasta resolución
- **Status:** **OPEN TECHNICAL DETAIL**

---

### B3-CON-020 — La transacción no deja escapar el contexto

- **Contract statement:** una transacción no puede permitir que una operación Business-scoped escape del Business Context bajo el que se abrió.
- **Source:** R8-ARCH-002 §3.10
- **Rationale:** cumple por construcción; la propiedad no está verificada por ejecución.
- **Scope:** toda transacción que contenga operaciones Business-scoped
- **Evidence:** `[C]` 11 transacciones, un `empresaId` por closure, ninguna mezcla tenants · herencia de la extensión en `tx`: `[C]` por tipos + `[D]`, **`[ND]` por ejecución**
- **Related OD:** R8-ARCH-002 §3.10
- **Related existing contract:** §12 (extiende)
- **Related B3 gap:** ND-01
- **Test candidate:** **TC-B3-12 (máxima prioridad)**
- **Status:** **EXTEND**

---

### B3-CON-021 — Igual obligación dentro de la transacción, incluido SQL crudo

- **Contract statement:** toda operación ejecutada dentro de una transacción está sujeta a las mismas obligaciones de aislamiento que fuera de ella, incluido el SQL crudo.
- **Source:** R8-ARCH-002 §3.10, §7
- **Rationale:** el SQL crudo no pasa por el mecanismo; el único uso está correctamente filtrado a mano, sin red de contención.
- **Scope:** SQL crudo y Prisma directo dentro de transacciones
- **Evidence:** `[C]` `inventario.service.ts:259-271` (parametrizado, `empresaId` en el `WHERE`); `invitaciones.service.ts:118,227` (`$transaction` crudo)
- **Related OD:** R8-ARCH-002 §3.10
- **Related existing contract:** §12 (extiende)
- **Related B3 gap:** G-B3-08
- **Test candidate:** TC-B3-11
- **Status:** **EXTEND**

---

### B3-CON-022 — Acceso pre-contexto legítimo

- **Contract statement:** una operación pre-contexto —cuya función es establecer o resolver la identidad y el Business, y que por definición no puede ejecutarse bajo un contexto que todavía no existe— es acceso legítimo sin Business Context.
- **Source:** R8-ARCH-002 §2 (la cadena empieza en Authenticated User); `08-R8-ARCH-003` §4
- **Rationale:** sin esta obligación, R14 llevaría a prohibir el login. El encargo exige distinguir pre-context legitimate access de Business-scoped bypass.
- **Scope:** autenticación, resolución de identidad, activación por token secreto, scripts offline
- **Evidence:** `[C]` 12 sitios en `auth*` + 3 en `invitaciones`; `Usuario.email`/`Cliente.googleId` únicos globales por diseño
- **Related OD:** R8-ARCH-002 §7 (la invariante aplica a operaciones Business-scoped)
- **Related existing contract:** ninguno enuncia la frontera
- **Related B3 gap:** R14, X-04
- **Test candidate:** TC-B3-23 (positivo: el login funciona sin contexto)
- **Status:** **NEW**

---

### B3-CON-023 — Operación Business-scoped no se ejecuta fuera del aislamiento

- **Contract statement:** una operación Business-scoped no puede ejecutarse fuera del aislamiento esperado. Que hoy no produzca cruce no satisface la obligación si el aislamiento depende únicamente del orden de las llamadas o de disciplina del call site.
- **Source:** R8-ARCH-002 §7
- **Rationale:** distingue "no hay bypass" de "los bypasses que hay están bien escritos". Es la diferencia que R8-ARCH-002 §5 señala como pendiente.
- **Scope:** toda operación Business-scoped, independientemente del cliente de persistencia que use
- **Evidence:** `[C]` `invitaciones.service.ts:118,227`; `legajo.service.ts:66-174`; `legajo.controller.ts` y `legajo.cliente.controller.ts` (mitigados por los controllers, no por mecanismo)
- **Related OD:** R8-ARCH-002 §7
- **Related existing contract:** ninguno
- **Related B3 gap:** **G-B3-07**, R14, X-06, X-15, X-16
- **Test candidate:** TC-B3-11
- **Status:** **NEW**
- **Límite:** no declara prohibido `PrismaService` directo (B3-CON-022 lo requiere) ni prescribe cambios a `PrismaModule`.

---

### B3-CON-024 — Superficie no scoped enumerable y auditable

- **Contract statement:** la superficie de acceso no scoped debe ser enumerable y auditable, de modo que la introducción de una nueva operación Business-scoped fuera del aislamiento sea detectable.
- **Source:** R8-ARCH-002 §3.12, §7
- **Rationale:** hoy nada distingue un uso pre-contexto legítimo de un bypass accidental; ambos son la misma inyección. Sin enumerabilidad, B3-CON-023 no es verificable.
- **Scope:** todo punto de acceso a persistencia sin Business Context
- **Evidence:** `[C]` `PrismaModule` exporta ambos clientes; 29 archivos mencionan `PrismaService`, 15 usan `forEmpresa`
- **Related OD:** R8-ARCH-002 §3.12
- **Related existing contract:** ninguno
- **Related B3 gap:** G-B3-07
- **Test candidate:** TC-B3-24 (verificación estructural, no funcional)
- **Status:** **NEW**

---

## 15.1 Resumen de estados

| Estado | IDs | Total |
|---|---|---|
| **EXISTING** | 001, 002, 005, 009 | 4 |
| **EXTEND** | 003, 006, 007, 008, 010, 011, 013, 020, 021 | 9 |
| **ADAPT** | 004 | 1 |
| **NEW** | 012, 014, 015, 016, 017, 018, 022, 023, 024 | 9 |
| **OPEN TECHNICAL DETAIL** | 019 | 1 |
| **OBSOLETE** | — | 0 |
| **OWNER DECISION REQUIRED** | — | 0 |

---

# 16. G-B3 GAP → CONTRACT MATRIX

| Gap | Severity | Contract | Existing/New | Requirement | Future Invariant | Future Test |
|---|---|---|---|---|---|---|
| **G-B3-01** | High | B3-CON-006, B3-CON-016 | EXTEND / NEW | La obligación de scope no puede depender del estado de una allow-list mantenida a mano; `PagoProveedor`/`DevolucionProveedor` son DIRECT y deben tratarse como tales | INV-B3-DATA-001 | TC-B3-19 |
| **G-B3-02** | High | B3-CON-014, B3-CON-015, B3-CON-007 | NEW / NEW / EXTEND | Ownership derivado es categoría contractual; la ausencia de `empresaId` no presume globalidad | INV-B3-OWN-001, INV-B3-OWN-002 | TC-B3-20 |
| **G-B3-04** | High | B3-CON-011, B3-CON-012, B3-CON-013 | EXTEND / NEW / EXTEND | Nested writes preservan ownership; `include` no expone otro Business | INV-B3-NEST-001, INV-B3-NEST-002 | TC-B3-06, TC-B3-22 |
| **G-B3-05** | High | **B3-CON-017, B3-CON-018** | **NEW / NEW** | FK de entrada validada contra contexto; la integridad referencial no basta | **INV-B3-FK-001, INV-B3-FK-002** | **TC-B3-09, TC-B3-10** |
| **G-B3-02/04 AMBIGUOUS** | High | B3-CON-019 | OPEN TECHNICAL DETAIL | Entidad AMBIGUOUS requiere resolución explícita; sin tratamiento por defecto ni presunción de globalidad | diferido hasta resolución | diferido |
| **G-B3-09** | High | B3-CON-023, B3-CON-024 + toda la familia | NEW | Verificación negativa cross-Business debe existir; la fixture `empresaAislamiento` ya existe sin consumidor | todos los INV-B3 | **toda la matriz de sec. 22** |
| **G-B3-03** | High | B3-CON-002, B3-CON-003, B3-CON-004 | EXISTING / EXTEND / ADAPT | Contexto ↔ Membership ACTIVE; fail-closed distinguiendo casos; la persistencia consume el contexto | INV-B3-CTX-001..003 | TC-B3-13..16 |
| **G-B3-06** | Medium | B3-CON-010 | EXTEND | El aislamiento del unique lookup recae en el resultado observable, no en la forma del índice | INV-B3-UNIQ-001 | TC-B3-04 |
| **G-B3-07** | Medium | B3-CON-022, B3-CON-023, B3-CON-024 | NEW | Distinguir pre-contexto legítimo de bypass Business-scoped; superficie enumerable | INV-B3-BYP-001, INV-B3-BYP-002 | TC-B3-11, TC-B3-23, TC-B3-24 |
| **G-B3-08** | Low | B3-CON-021 | EXTEND | SQL crudo sujeto a la misma obligación | INV-B3-TX-002 | TC-B3-11 |
| **G-B3-10** | Low | B3-CON-008 | EXTEND | La restricción de update no puede depender del orden de llamadas | INV-B3-DATA-003 | TC-B3-02 |
| **G-B3-11** | Medium | B3-CON-016 | NEW | Identificador de negocio no es global | INV-B3-UNIQ-002 | TC-B3-21 |
| **G-B3-12** | Low | B3-CON-024 | NEW | La superficie y el inventario deben ser auditables y reflejar el schema | — (reconciliación documental, sec. 24) | TC-B3-24 |
| **G-B3-13** | Medium | B3-CON-015 (switching), B3-CON-005, B3-CON-014 | EXISTING / EXTEND | El cumplimiento por ausencia de superficie no es defensa; el switching requiere resolución por Membership | INV-B3-CTX-004 | TC-B3-17, TC-B3-18 |
| **R4** | — | B3-CON-014 (client IDs), B3-CON-015 | EXTEND | Ningún identificador de Business del cliente sustituye el contexto, en ninguna superficie | INV-B3-CTX-003 | TC-B3-16 |
| **R14** | — | B3-CON-022, B3-CON-023, B3-CON-024 | NEW | Frontera pre-contexto / bypass; enumerabilidad | INV-B3-BYP-001/002 | TC-B3-11, TC-B3-23 |

**Cobertura:** los 13 gaps `G-B3-01..13` + R4 + R14 están mapeados. Ninguno queda sin contrato, con la excepción declarada de la rama AMBIGUOUS, que queda como OPEN TECHNICAL DETAIL por prohibición explícita de inventar modelo.

---

# 17. X-01..X-17 → CONTRACT MATRIX

| Vector | Severidad AS-IS | Estado AS-IS | Contract | Future Test |
|---|---|---|---|---|
| **X-01** lectura A → recurso B | BAJA | mitigado por mecanismo | B3-CON-007 | TC-B3-01 |
| **X-02** unique lookup A → recurso B | BAJA | mitigado por mecanismo (reserva: `select`) | B3-CON-010 | TC-B3-04 |
| **X-03** `Venta.idempotencyKey` único global | BAJA | mitigado por X-02, no por el índice | B3-CON-010, **B3-CON-016** | TC-B3-21 |
| **X-04** `Cliente.googleId`, `Usuario.email`, `Invitacion.token` | BAJA | aceptado — pre-autenticación | **B3-CON-022** | TC-B3-23 |
| **X-05** update A → recurso B | BAJA | mitigado por mecanismo | B3-CON-008 | TC-B3-02 |
| **X-06** update con cliente crudo | MEDIA | mitigado por orden de llamadas | **B3-CON-008**, B3-CON-023 | TC-B3-02 |
| **X-07** delete A → recurso B | BAJA | mitigado | B3-CON-009 | TC-B3-03 |
| **X-08** create con FK de B (`crearDevolucion`) | **ALTA** | **ABIERTO** | **B3-CON-017, B3-CON-018** | **TC-B3-09** |
| **X-09** nested create de B | **ALTA** | ABIERTO (mecanismo) | **B3-CON-011**, B3-CON-017 | TC-B3-06 |
| **X-10** nested update de B | MEDIA | abierto (latente; operación inexistente) | **B3-CON-012** | TC-B3-08 (condicional) |
| **X-11** relación padre A / hijo B | ALTA (ese caso) | ABIERTO | **B3-CON-018** | TC-B3-10 |
| **X-12** relación hijo A / padre B | BAJA | mitigado por disciplina | B3-CON-011, B3-CON-023 | TC-B3-10 |
| **X-13** transaction A/B | BAJA | mitigado por construcción | B3-CON-020 | TC-B3-12 |
| **X-14** `include` no filtrado | MEDIA (condicionado a X-08) | ABIERTO (dependiente) | **B3-CON-013** (dependiente de B3-CON-018) | TC-B3-22 |
| **X-15** lectura en modelo con columna no cubierta | MEDIA | mitigado por orden de llamadas | B3-CON-006, B3-CON-007, B3-CON-023 | TC-B3-19 |
| **X-16** `UsuarioPermiso` scoped sin efecto | MEDIA | mitigado por chequeo explícito | **B3-CON-014** | TC-B3-20 |
| **X-17** `$executeRaw` fuera del mecanismo | BAJA | mitigado manualmente | **B3-CON-021** | TC-B3-11 |

**Cobertura: 17/17.** Cada vector tiene contrato y candidato de test.

**Observación de patrón.** Los vectores mitigados **por mecanismo** (X-01, X-02, X-05, X-07) mapean a contratos EXISTING/EXTEND sin trabajo nuevo. Los mitigados **por orden de llamadas o chequeo explícito** (X-06, X-15, X-16, X-17) son precisamente los que motivan la cláusula añadida en B3-CON-008 y la obligación B3-CON-023: el contrato debe poder distinguir ambos casos, porque el resultado observable hoy es idéntico y la robustez no.

---

# 18. R8-ARCH-002 COVERAGE MATRIX

Cruce explícito de las 12 reglas aprobadas. Cadena: OD Rule → Contract → B3 Gap/Evidence → Future Invariant → Future Test.

| OD Rule | Contract | B3 Gap / Evidence | Future Invariant | Future Test | Cobertura |
|---|---|---|---|---|---|
| **1.** Contexto antes de operación Business-scoped | B3-CON-001 (EXISTING), B3-CON-004 (ADAPT) | G-B3-03 · `[C]` contexto asumido del claim, no establecido | INV-B3-CTX-001 | TC-B3-13 | **CUBIERTA** |
| **2.** Contexto ↔ Membership válida | B3-CON-002 (EXISTING) | G-B3-03 · `[C]` **no existe Membership**; `validate()` no consulta la base | INV-B3-CTX-002 | TC-B3-14 | **CUBIERTA — gap AS-IS** |
| **3.** Membership INACTIVE no opera | B3-CON-002 (EXISTING) | G-B3-03 · `[C]` solo `Usuario.activo`, al login | INV-B3-CTX-002 | TC-B3-15 | **CUBIERTA — gap AS-IS** |
| **4.** Client Business ID no sobrescribe | B3-CON-014, B3-CON-015 (EXTEND) | R4, G-B3-13 · `[C]` cumple **por ausencia de superficie** | INV-B3-CTX-003 | TC-B3-16 | **CUBIERTA** |
| **5.** CREATE asigna Business del contexto | B3-CON-006 (EXTEND) | G-B3-01 · `[C]` cumple en 26, no en 2 ni en creates crudos | INV-B3-DATA-001 | TC-B3-05, TC-B3-19 | **CUBIERTA** |
| **6.** READ restringido al contexto | B3-CON-007 (EXTEND), B3-CON-013, B3-CON-014 | G-B3-01, G-B3-02, G-B3-04 · `[C]` 12 derivados sin filtro | INV-B3-DATA-002, INV-B3-OWN-001 | TC-B3-01, TC-B3-20 | **CUBIERTA** |
| **7.** UPDATE/DELETE no cruzan | B3-CON-008 (EXTEND), B3-CON-009 (EXISTING) | G-B3-10, X-06 · `[C]` cumple en 26; X-06 por orden | INV-B3-DATA-003 | TC-B3-02, TC-B3-03 | **CUBIERTA** |
| **8.** Unique lookups no exponen otro Business | B3-CON-010 (EXTEND), B3-CON-016 (NEW) | G-B3-06, G-B3-11 · `[C]` post-query validation; `idempotencyKey` global | INV-B3-UNIQ-001, INV-B3-UNIQ-002 | TC-B3-04, TC-B3-21 | **CUBIERTA** |
| **9.** Nested/related preserva ownership | B3-CON-011 (EXTEND), B3-CON-012, **B3-CON-017, B3-CON-018** (NEW) | **G-B3-05**, G-B3-04 · `[C]` FK sin validar en 1 de 5 sitios | **INV-B3-FK-001, INV-B3-FK-002**, INV-B3-NEST-001 | **TC-B3-09, TC-B3-10**, TC-B3-06 | **CUBIERTA — el hueco real** |
| **10.** Transacciones preservan aislamiento | B3-CON-020, B3-CON-021 (EXTEND) | ND-01, G-B3-08 · `[C]` por construcción; `[ND]` por ejecución | INV-B3-TX-001, INV-B3-TX-002 | **TC-B3-12** | **CUBIERTA** |
| **11.** Contexto ausente/inválido falla cerrado | B3-CON-003 (EXTEND) | G-B3-03 · `[C]` fail-closed por operación real; caso inválido no validado | INV-B3-CTX-004 | TC-B3-13, TC-B3-16 | **CUBIERTA** |
| **12.** Verificación negativa cross-Business | **B3-CON-023, B3-CON-024** + familia completa | **G-B3-09** · `[C]` **cero tests**; fixture `empresaAislamiento` existe sin consumidor | todos los INV-B3 | **toda la matriz sec. 22** | **CUBIERTA contractualmente — SIN EVIDENCIA** |

## 18.1 Resultado

**12 de 12 reglas tienen cobertura contractual.** Ninguna queda marcada GAP a nivel de contrato.

**Advertencia obligatoria sobre la regla 12.** La cobertura es **contractual, no empírica**. R8-ARCH-002 §3.12 exige que el acceso cross-Business esté cubierto por verificación negativa; hoy existen **cero tests de aislamiento** `[C]`. Conforme a la regla de no declarar aislamiento garantizado con sola evidencia documental, la regla 12 se consigna como **cubierta por contrato y no satisfecha por evidencia**. Esta es la razón principal del veredicto con reconciliación.

**Reglas con gap de AS-IS, no de contrato:** las reglas 2 y 3 están contractualmente cubiertas (CTX-002, R5-IDENTITY-002) y el AS-IS **no las cumple** porque no existe Membership. Esto no es un gap de B3: es la dependencia de B1 que `08-R8-ARCH-003` ya declara OPEN (§13.12, physical User/Business/Membership schema) `[D]`.

---

# 19. CROSS-CONTRACT CONSISTENCY

Comparación de B3 contra Identity/Tenancy, Legacy coexistence, Authentication/Session y Authorization. Clasificación por tema según lo pedido: contradiction / reconciliation / compatible / open technical detail.

| Tema | B3 obligación | Contrato comparado | Resultado | Detalle |
|---|---|---|---|---|
| **Business Context** | B3-CON-001..005 | CTX-001..006; C-CONTEXT-001; §5.4 | **COMPATIBLE** | B3 no redefine el contexto; lo consume. B3-CON-003 añade granularidad dentro de CTX-004 |
| **Membership** | B3-CON-002 | C-MEM-001; R5-IDENTITY-002; C-COEX-003; AUTH-001 §3 | **COMPATIBLE** | B3 no define estados de Membership. ACTIVE/INACTIVE es R5-IDENTITY-002, no se altera |
| **`empresaId`** | B3-CON-004, B3-CON-006, B3-CON-014 | C-COEX-003 (legacy no sobrescribe); `06-R8-ID-003` §5 (transicional) | **RECONCILIATION** | B3 trata `empresaId` como **discriminador físico transicional**, no como autoridad. Coherente con ID-003. **Reconciliación necesaria:** B3-CON-014/015 clasifican modelos por presencia de `empresaId`, lo que podría leerse como consagrarlo canónico. Queda explícito que la clasificación es del AS-IS y transicional |
| **User** | — | C-IDENT-001; R5-IDENTITY-004 | **COMPATIBLE** | B3 no define identidad. B3-CON-022 depende de que `Usuario.email` sea único global, que es R5-IDENTITY-004 |
| **Customer** | B3-CON-019 | C-CUST-001; `06-R8-ID-003` §7 | **OPEN TECHNICAL DETAIL** | `Legajo` puede colgar de `Usuario` **o** de `Cliente` `[C]`. C-CUST-001 mantiene Customer distinto de User. Que una entidad derive su tenant por una u otra rama es exactamente el caso AMBIGUOUS. **No contradicción**: ningún contrato afirma que esa entidad tenga tenant determinable |
| **Authorization** | B3-CON-023 | AUTH-001 §3, §10; C-AUTH-001 | **COMPATIBLE** | B3 no define autorización. Distinción preservada: el aislamiento restringe *a qué datos* alcanza una operación; la autorización decide *si* la operación procede. B3-CON-023 no es un permiso |
| **Legacy identity** | B3-CON-022 | C-COEX-002, C-COEX-005, C-COEX-006 | **COMPATIBLE** | B3-CON-022 preserva los flujos de auth legacy como acceso legítimo, consistente con C-COEX-002. B3 no elimina nada (C-COEX-006) |
| **JWT** | B3-CON-004 | `08-R8-ARCH-003` §7 (claim `empresaId` no es autoridad única) | **RECONCILIATION** | §7 ya establece que el claim no es autoridad de autorización `[D]`. B3-CON-004 añade que tampoco es autoridad de **scope de persistencia**. Es extensión coherente, no contradicción. **Reconciliación:** debe quedar registrado que el AS-IS usa el claim como ambas cosas `[C]` |
| **Session** | — | `08-R8-ARCH-003` §6, §13 | **OPEN TECHNICAL DETAIL** | B3 no define sesión. Revocación/expiración permanecen OPEN (§13.3-13.5) |
| **Direct Prisma** | B3-CON-022, B3-CON-023, B3-CON-024 | `08-R8-ARCH-003` §12 (extensión = adaptation candidate); §13.11 (enforcement OPEN) | **COMPATIBLE** | B3 no prescribe mecanismo de enforcement, que sigue OPEN. B3 solo obliga a distinguir las dos clases de acceso |
| **Mecanismo de aislamiento** | toda la familia | R8-ARCH-002 §1 (application-level APROBADO); §4 (RLS/schema-per-tenant fuera de alcance) | **COMPATIBLE** | Ninguna obligación de B3 requiere RLS ni aislamiento físico. Todas son satisfacibles a nivel de aplicación |
| **Disposición del AS-IS** | sec. 20 | R8-ARCH-002 §5; `08-R8-ARCH-003` §12; `06-BLOCK-1-ARCH-SPEC` §5.5 | **COMPATIBLE** | B3 usa ADAPT/PRESERVE/EXTEND/NEW. **No usa REPLACE** en ningún componente |
| **Invariants existentes** | sec. 21 | INV-TEN-001; INV-MEM-001/002; INV-AUTH-001/002/003; INV-ID-004 | **COMPATIBLE** | Ningún INV-B3 contradice uno existente. Los INV-B3 son refinamientos operacionales de INV-TEN-001 |
| **Tests existentes** | sec. 22 | TE-TEN-001; TE-ID-002; TE-INV-001; TE-CASH-001; TE-COM-004 | **RECONCILIATION** | TE-TEN-001 ya cubre "resource remains associated with its Business context" `[D]`, a granularidad conceptual. Los TC-B3 son refinamientos, **no duplicados**: ninguno de los existentes cubre FK, nested, transacción ni bypass. **Reconciliación:** al derivar los tests, los TC-B3 deben enlazarse a TE-TEN-001 en lugar de crear una familia paralela |

## 19.1 Conclusión

**Cero contradicciones.** Cuatro reconciliaciones (`empresaId` como clasificador; el claim JWT como autoridad doble en el AS-IS; enlace de los TC-B3 a TE-TEN-001; y la del inventario documental, sec. 24). Tres open technical details, todos ya declarados OPEN en contratos vigentes.

**Ninguna Owner Decision requerida.** Verificado contra las cinco Owner Decisions listadas en sec. 3.

---

# 20. PRESERVATION / ADAPTATION MATRIX

Conforme a la sec. 19 del encargo. **No se usa REPLACE en ningún componente**, por ausencia de evidencia obligatoria y porque R8-ARCH-002 §5 establece que ningún componente se elimina por esa decisión `[D]`.

| Infraestructura existente | Clasificación | Fundamento |
|---|---|---|
| `EmpresaScopedPrismaService` — factory | **ADAPT** | Útil y preservable. La firma debe cambiar para que la persistencia **consuma** el contexto (B3-CON-004) en lugar de recibir un `string` que el call site elige `[C]` |
| `EmpresaScopedPrismaService` — decisión de **no** usar `Scope.REQUEST` | **PRESERVE** | El fundamento está documentado y fue verificado contra servidor real según el comentario (`:9-20`) `[D]`. Preservar el fundamento, no solo el código: un rediseño que reintroduzca `Scope.REQUEST` reintroduce el problema ya observado |
| `empresaScopeExtension` — inyección en `where` (9 ops) | **PRESERVE** | Satisface R6/R7/R8 por mecanismo `[C]`. Base de migración válida |
| `empresaScopeExtension` — forzado en `create`/`createMany` | **PRESERVE** | Satisface R5 y da defensa en profundidad para R4 `[C]` |
| `empresaScopeExtension` — **fail-closed** | **PRESERVE** | Mejor propiedad del AS-IS. Satisface R13 por operación y ya moldea el código real (cero `upsert`, cero `groupBy`) `[C]` |
| `empresaScopeExtension` — allow-list explícita de modelos | **ADAPT** | El **principio** (allow-list explícita, no inferencia) es correcto y se preserva. El **contenido** divergió del schema (G-B3-01) `[C]`: debe derivarse del schema, no mantenerse a mano |
| `empresaScopeExtension` — validación post-query de `findUnique` | **ADAPT** | Correcta en resultado `[C]`. Debe endurecerse para no depender de que el resultado traiga `empresaId` (B3-CON-010) |
| `empresaId` como columna (28 modelos) | **PRESERVE (transicional)** | Coherente con R8-ID-003: dato transicional, sin limpieza destructiva `[D]` |
| Lecturas/escrituras scoped existentes (72 usos de `forEmpresa`) | **PRESERVE** | Son la aplicación correcta del mecanismo `[C]` |
| Patrón de validación de FK por lectura scoped previa (4 sitios) | **EXTEND** | **Ya existe en el repo** `[C]`. B3-CON-017 lo formaliza y lo extiende al sitio que lo omite |
| Fixture `empresaAislamiento` del `seed.ts` | **PRESERVE** | Segunda Empresa con catálogo completo, ya construida `[C]`. Punto de partida listo para la verificación negativa de R8-ARCH-002 §3.12 |
| Lookups pre-contexto en `auth*` con cliente crudo | **PRESERVE** | Correctos por definición: establecen el contexto, no lo consumen (B3-CON-022) `[C]` |
| `PrismaService` exportado por `PrismaModule` | **OPEN** | Necesario para el acceso pre-contexto. Si debe dejar de ser inyectable indistintamente es **mecanismo de enforcement**, declarado OPEN en `08-R8-ARCH-003` §13.11 `[D]`. B3 no lo resuelve |
| `$executeRaw` con `empresaId` manual en el `WHERE` | **PRESERVE con obligación** | Correcto y parametrizado `[C]`. Sujeto a B3-CON-021 |
| `TIENDA_EMPRESA_ID` como tenant de la tienda pública | **ADAPT** | Resuelve R13 con fail-explícito y es honesto sobre su límite `[C]`. Debe revisarse ante multi-Business |
| Mecanismo de ownership derivado | **NEW** | No existe. Hoy es disciplina (B3-CON-014) |
| Validación de FK cross-tenant como mecanismo | **NEW** | No existe en ninguna capa (B3-CON-017/018) |
| Inspección de nested writes | **NEW** | No existe (B3-CON-011/012) |
| Tenant de `Legajo`/`DocumentoLegajo` | **OPEN** | AMBIGUOUS; resolución explícita requerida (B3-CON-019) |
| Frontera pre-contexto / bypass enumerable | **NEW** | No existe (B3-CON-022/023/024) |
| Autoridad del contexto (claim JWT sin revalidar) | **NEW** | R1/R2/R3 requieren Membership + revalidación. No hay nada que adaptar — depende de B1 |
| Tests de aislamiento | **NEW** | No existe ninguno (G-B3-09) `[C]` |

**Sin DEPRECATE.** El único candidato conceptual sería "el claim JWT como autoridad de scope de persistencia", pero `06-R8-ID-003` §12 ya lo clasifica como *legacy authorization as final authority: DEPRECATED conceptually* `[D]`. B3 no necesita duplicar esa clasificación.

---

# 21. FUTURE INVARIANT CANDIDATES

**No se deriva el documento completo de B3 Invariants** (prohibido por la sec. 21 del encargo). Solo se indica qué obligaciones contractuales deberán producir invariants, para que B3 — INVARIANTS no vuelva a investigar el AS-IS.

| Contract | → Future Invariant | Enunciado previsto (candidato) |
|---|---|---|
| B3-CON-001, B3-CON-004 | **INV-B3-CTX-001** | Una operación Business-scoped solo se ejecuta bajo un Business Context establecido por el servidor |
| B3-CON-002 | **INV-B3-CTX-002** | El Business Context efectivo corresponde a una Membership ACTIVE del User autenticado |
| B3-CON-014, B3-CON-015 (client IDs) | **INV-B3-CTX-003** | Ningún identificador de Business suministrado por el cliente sustituye el contexto autorizado |
| B3-CON-003, B3-CON-005 | **INV-B3-CTX-004** | Contexto ausente, inválido o no autorizado no resulta en ejecución de una operación Business-scoped protegida |
| B3-CON-006 | **INV-B3-DATA-001** | El Business de una entidad creada proviene del contexto, no del payload |
| B3-CON-007 | **INV-B3-DATA-002** | Ninguna lectura Business-scoped devuelve datos de otro Business |
| B3-CON-008, B3-CON-009 | **INV-B3-DATA-003** | Ninguna modificación o eliminación alcanza entidades de otro Business |
| B3-CON-010 | **INV-B3-UNIQ-001** | Un lookup por identificador único no expone datos de otro Business |
| B3-CON-016 | **INV-B3-UNIQ-002** | Un identificador de negocio Business-scoped no colisiona entre Businesses |
| B3-CON-011 | **INV-B3-NEST-001** | Una escritura anidada no crea ownership cross-Business |
| B3-CON-012, B3-CON-013 | **INV-B3-NEST-002** | Ninguna forma de vinculación o lectura de relaciones expone ni crea ownership cross-Business |
| **B3-CON-017** | **INV-B3-FK-001** | Un identificador de entidad relacionada recibido del cliente se valida contra el contexto antes de persistirse |
| **B3-CON-018** | **INV-B3-FK-002** | Ninguna entidad Business-scoped queda vinculada a una entidad de otro Business |
| B3-CON-014 (derived) | **INV-B3-OWN-001** | Una entidad con ownership derivado está sujeta a las mismas obligaciones que una con ownership directo |
| B3-CON-015 (no presunción) | **INV-B3-OWN-002** | La ausencia de identificador de Business no implica globalidad |
| B3-CON-020 | **INV-B3-TX-001** | Una transacción no deja escapar una operación Business-scoped de su contexto |
| B3-CON-021 | **INV-B3-TX-002** | El SQL crudo y el acceso directo dentro de una transacción están sujetos a la misma obligación |
| B3-CON-022 | **INV-B3-BYP-001** | Una operación pre-contexto es legítima sin Business Context |
| B3-CON-023, B3-CON-024 | **INV-B3-BYP-002** | Ninguna operación Business-scoped se ejecuta fuera del aislamiento esperado |
| B3-CON-019 | *diferido* | No se deriva invariant hasta que la ambigüedad se resuelva explícitamente |

**20 candidatos** (19 derivables + 1 diferido). **Relación con los invariants existentes:** todos son refinamientos operacionales de **INV-TEN-001** (Business is the tenancy boundary) y de las 6 propiedades del R8 ARCHITECTURE CLOSURE de `00-INVARIANTS-v0.1` `[D]`. Deben enlazarse a esos, no reemplazarlos. `31-R8-MASTER-DECISION-PROPAGATION-AUDIT` §140 pide "application-level tenant isolation invariant": esta familia lo satisface.

---

# 22. FUTURE TEST/EVAL CANDIDATES

**No se crea el test suite.** Solo candidatos, conforme a la sec. 20 del encargo. Se incluyen negativos **y positivos**, como exige el encargo.

## 22.1 Negative — cross-business

| ID | Escenario | Contract | Prioridad | Estado esperado hoy |
|---|---|---|---|---|
| TC-B3-01 | read A desde contexto B | B3-CON-007 | Alta | pasa (mecanismo) |
| TC-B3-02 | update A desde contexto B | B3-CON-008 | Alta | pasa (mecanismo) |
| TC-B3-03 | delete A desde contexto B | B3-CON-009 | Media | pasa (mecanismo) |
| TC-B3-04 | unique lookup de A desde contexto B → `null` / P2025 | B3-CON-010 | **Alta** | pasa; **sin test hoy** |
| TC-B3-05 | create con `empresaId` de A en el payload desde contexto B | B3-CON-006 | Alta | pasa (forzado) |
| TC-B3-06 | nested create que referencia entidad de A desde contexto B | B3-CON-011 | **Alta** | **falla esperado** |
| TC-B3-07 | nested `connect` a entidad de A | B3-CON-012 | Condicional | operación inexistente `[C]` |
| TC-B3-08 | nested update/delete sobre entidad de A | B3-CON-012 | Condicional | operación inexistente `[C]` |
| **TC-B3-09** | **FK cross-business: `crearDevolucion` con `productoId`/`loteId` de otro Business** | **B3-CON-017** | **Máxima** | **falla esperado — reproduce G-B3-05** |
| TC-B3-10 | relación padre A / hijo B y viceversa | B3-CON-018 | Alta | falla esperado |
| TC-B3-11 | operación Business-scoped por cliente no scoped / SQL crudo sin filtro | B3-CON-021, B3-CON-023 | Alta | sin cobertura |
| **TC-B3-12** | **la extensión sigue activa dentro de `$transaction` interactiva** | **B3-CON-020** | **Máxima** | **cierra ND-01** |
| TC-B3-13 | operación Business-scoped sin contexto | B3-CON-001, B3-CON-003 | Alta | sin cobertura |
| TC-B3-14 | contexto con Membership inexistente | B3-CON-002 | Alta | **no aplicable hoy** (sin Membership) |
| TC-B3-15 | contexto con Membership INACTIVE | B3-CON-002 | Alta | **no aplicable hoy** |
| TC-B3-16 | client-supplied Business ID por body/query/header/route | B3-CON-014 | Media | **pasa trivialmente** — ver 22.3 |
| TC-B3-17 | Business switch a Membership válida | B3-CON-005 | Media | **no aplicable hoy** |
| TC-B3-18 | Business switch a Membership inválida | B3-CON-005 | Alta | **no aplicable hoy** |
| TC-B3-19 | r/u/d sobre `PagoProveedor`/`DevolucionProveedor` desde contexto ajeno | B3-CON-006 | **Alta** | **falla esperado si se invoca sin `getCompra` previo** |
| TC-B3-20 | r/u/d sobre entidad de ownership derivado desde contexto ajeno | B3-CON-014 | **Alta** | falla esperado |
| TC-B3-21 | reutilizar un `idempotencyKey` de A en B | B3-CON-016 | Media | **falla esperado** (colisión por índice global) |
| TC-B3-22 | `include` de relación que atraviesa un vínculo cross-business | B3-CON-013 | Media | dependiente de TC-B3-09 |
| TC-B3-24 | la superficie de acceso no scoped es enumerable (verificación estructural) | B3-CON-024 | Baja | sin cobertura |

## 22.2 Positive — el aislamiento no rompe la operación legítima

Exigido explícitamente por el encargo ("No diseñar únicamente negative tests").

| ID | Escenario | Contract |
|---|---|---|
| TC-B3-P01 | Business A lee, crea, modifica y elimina sus propios datos correctamente | B3-CON-006..009 |
| TC-B3-P02 | Business A ejecuta un nested create con FK propias y persiste correctamente | B3-CON-011, B3-CON-017 |
| TC-B3-P03 | una transacción de A se confirma completa sobre datos propios | B3-CON-020 |
| TC-B3-P04 | un unique lookup de A sobre su propio registro lo devuelve | B3-CON-010 |
| TC-B3-P05 | una entidad de ownership derivado de A es accesible desde A | B3-CON-014 |
| **TC-B3-23** | **el login y la activación por invitación funcionan sin Business Context** | **B3-CON-022** |

TC-B3-23 es el **guardarraíl** de B3-CON-022: impide que endurecer el aislamiento rompa el acceso pre-contexto. Sin él, una implementación de B3-CON-023 podría romper el login.

## 22.3 Advertencias de interpretación

Tres clases de resultado no deben leerse como cobertura:

1. **"No aplicable hoy"** (TC-B3-14, 15, 17, 18): no existe Membership ni switching. Pasar no es cobertura — depende de B1.
2. **"Pasa trivialmente"** (TC-B3-16): no hay superficie que sobrescriba el tenant, así que no hay nada que atacar. Pasar no verifica R4 (G-B3-13).
3. **Operación inexistente** (TC-B3-07, 08): `connect`/`connectOrCreate`/nested update/delete no existen `[C]`. Los tests se escriben cuando la operación se introduzca.

## 22.4 Reconciliación con los tests existentes

`00-TESTS-EVALS-v0.2` ya define **TE-TEN-001** ("a Business-scoped resource remains associated with its Business context and cannot silently cross into another Business context") y **TE-ID-002**, **TE-INV-001**, **TE-CASH-001**, **TE-COM-004** `[D]`. Son conceptuales y de dominio; ninguno cubre FK, nested, transacción ni bypass. Los TC-B3 deben enlazarse como **refinamientos de TE-TEN-001**, no como familia paralela (regla de no-duplicación).

## 22.5 Fixture

`seed.ts` ya crea `empresaAislamiento` con Familia/Subfamilia/Tipo/Subtipo y catálogo propio `[C]`. **La fixture multi-tenant que R8-ARCH-002 §3.12 exige está construida y sin consumidor.** Los TC-B3 no requieren fixture nueva.

---

# 23. IMPLEMENTATION BOUNDARY

Explícitamente **fuera** de este contrato:

| Fuera de alcance | Estado canónico |
|---|---|
| implementación Prisma exacta | `08-R8-ARCH-003` §12: la extensión es *adaptation candidate* `[D]` |
| implementación de guard/middleware/interceptor | OPEN — §13.11 `[D]` |
| **PostgreSQL RLS** | **Fuera de alcance por decisión** — R8-ARCH-002 §4 `[D]` |
| **schema-per-tenant / database-per-tenant / separación física** | **Fuera de alcance por decisión** — R8-ARCH-002 §4 `[D]` |
| migración de schema | R8-ARCH-002 §4; `06-R8-ID-003` §5 (sin mapping físico autorizado) `[D]` |
| elección de ORM | R8-ARCH-002 §4 `[D]` |
| deployment / Kubernetes | R8-ARCH-002 §4 `[D]` |
| event broker | no mencionado en ninguna autoridad; sin jobs/colas en el código `[C]` |
| estrategia de locking | no cubierta; relevante para el patrón no atómico de X-06 pero no contratable aquí |
| transporte del Business Context | OPEN — §13.8 `[D]` |
| claims del JWT, lifetime, refresh, revocación | OPEN — §13.1-13.5 `[D]` |
| transporte/API del Business Switch | OPEN — §13.7 `[D]` |
| schema físico User/Business/Membership | OPEN — §13.12 `[D]` |
| contrato de error de la API | OPEN — §13.13 `[D]` |

## 23.1 Dirección arquitectónica vs mecanismo de implementación

Distinción exigida por la sec. 22 del encargo:

| **Dirección arquitectónica** (CERRADA, Owner-approved) | **Mecanismo de implementación** (OPEN) |
|---|---|
| Application-level tenant isolation es el mecanismo primario — R8-ARCH-002 §1 | Qué construcción técnica lo aplica |
| La cadena `User → Context → Membership → Operation → Persistence` — §5.5 del arch spec | Cómo se propaga el contexto |
| El AS-IS es ADAPT, no reemplazo — §5 | Qué se adapta y cómo |
| RLS / schema-per-tenant / DB-per-tenant están fuera | — |
| Debe existir verificación negativa cross-Business — §3.12 | Framework, runner y fixtures concretos |

**Lo que este contrato produce** son obligaciones observables. Siguiendo el criterio de la sec. 5 del encargo: *"Una operación Business-scoped sin Business Context válido debe fallar cerrado"* es contrato; *"todas las operaciones deben usar exactamente la Prisma extension X"* es implementación y **no** aparece en ninguno de los 24 candidatos.

---

# 24. READINESS GATES

| Gate | Pregunta | Resultado | Fundamento |
|---|---|---|---|
| **Contract Coverage** | ¿Las 12 reglas de R8-ARCH-002 están cubiertas? | **PASS** | 12/12 con contrato, invariant candidato y test candidato (sec. 18). Advertencia consignada: la regla 12 está cubierta **por contrato y no satisfecha por evidencia** — cero tests `[C]` |
| **AS-IS Coverage** | ¿Los G-B3-01..13 están cubiertos? | **PASS WITH RECONCILIATION** | 13/13 + R4 + R14 mapeados (sec. 16). La rama AMBIGUOUS de G-B3-02/04 queda como OPEN TECHNICAL DETAIL (B3-CON-019) por prohibición explícita de inventar modelo |
| **Cross-Tenant Coverage** | ¿X-01..X-17 están mapeados? | **PASS** | 17/17 con contrato y test candidato (sec. 17) |
| **Cross-Contract Consistency** | ¿Hay contradicciones? | **PASS WITH RECONCILIATION** | Cero contradicciones; 4 reconciliaciones; 3 open technical details ya declarados OPEN (sec. 19) |
| **Owner Decision Stability** | ¿Se mantiene intacta la autoridad de las Owner Decisions? | **PASS** | Ninguna OD modificada ni reinterpretada. Cero OD nuevas. Todo lo extendido cae en el espacio que R8-ARCH-002 §6 ya declaró abierto `[D]` |
| **Invariant Derivation Readiness** | ¿Los contratos son suficientemente estables para derivar los B3 Invariants? | **PASS WITH RECONCILIATION** | 19 de 20 candidatos son derivables ahora. INV para B3-CON-019 queda diferido. Cuatro reconciliaciones documentales deben cerrarse primero |

## 24.1 Las cuatro reconciliaciones a cerrar

Concretas, documentales, sin decisión de Owner:

1. **`empresaId` como clasificador transicional.** B3-CON-014/015 clasifican modelos por presencia de `empresaId`. Debe quedar registrado que la clasificación describe el AS-IS y es transicional, sin consagrar `empresaId` como canónico — coherente con `06-R8-ID-003` §5 y C-COEX-003 `[D]`.
2. **El claim JWT cumple hoy una doble función.** `08-R8-ARCH-003` §7 ya establece que no es autoridad de autorización `[D]`. Debe registrarse que en el AS-IS también opera como autoridad de **scope de persistencia** `[C]`, lo que B3-CON-004 cierra.
3. **Enlace de los TC-B3 a TE-TEN-001.** Al derivar los tests, los candidatos deben enlazarse como refinamientos de TE-TEN-001 y no crear una familia paralela (sec. 22.4).
4. **Reconciliación del inventario documental (G-B3-12).** El docstring del mecanismo dice "21 modelos" cuando la lista tiene 26, y su enumeración de derivados omite tres `[C]`. Divergencia código↔schema, no de diseño. Debe cerrarse para que B3-CON-024 (enumerabilidad) sea verificable.

---

# 25. FINAL VERDICT

## READY WITH RECONCILIATION

Los contratos están derivados, reconciliados y mapeados: 24 candidatos cubren las 12 reglas de R8-ARCH-002, los 13 gaps del AS-IS, R4, R14 y los 17 vectores cross-tenant. Cero contradicciones con los contratos canónicos. Cero Owner Decisions requeridas.

**No es `READY FOR B3 INVARIANTS`** porque existen cuatro reconciliaciones concretas a cerrar antes de derivar los invariants (sec. 24.1), y una de ellas —el enlace a TE-TEN-001— condiciona directamente cómo se enuncian los invariants para no crear una familia paralela a INV-TEN-001.

**No es `BLOCKED`:** no hay dependencia que impida continuar. Las reglas 2 y 3 de R8-ARCH-002 no se cumplen en el AS-IS por ausencia de Membership, pero eso es una dependencia de **B1** ya declarada OPEN en `08-R8-ARCH-003` §13.12 `[D]`, no un bloqueo de B3. Los contratos de B3 se enuncian correctamente sin que Membership exista todavía.

**No es `FAIL`:** no se encontró ninguna contradicción fundamental con la arquitectura ni con las Owner Decisions. El mecanismo AS-IS es consistente con la dirección aprobada (application-level) y su disposición ADAPT se preserva.

**Advertencia que acompaña el veredicto, por regla explícita del encargo:** no se declara el aislamiento garantizado. R8-ARCH-002 §3.12 exige verificación negativa cross-Business y existen **cero tests de aislamiento** en el repositorio `[C]`. Toda la familia de obligaciones aquí derivada tiene evidencia `[D]` como contrato y `[C]` como estado AS-IS; **ninguna tiene evidencia `[T]` ni `[E]`**.

**Reafirmación de alcance:** no se modificó código, schema, migraciones ni datos. Sin commits, sin push, sin deploy. Sin modificar Owner Decisions. No se derivó el set completo de B3 Invariants.

---

# 26. RECOMMENDED NEXT STEP

**Siguiente etapa: B3 — INVARIANTS**, una vez cerradas las cuatro reconciliaciones de sec. 24.1.

Secuencia recomendada:

1. **Cerrar las cuatro reconciliaciones** (sec. 24.1). Son documentales y no requieren decisión de Owner.
2. **Derivar B3 — INVARIANTS** a partir de los 19 candidatos derivables de sec. 21, enlazándolos a INV-TEN-001 y a las 6 propiedades del R8 ARCHITECTURE CLOSURE de `00-INVARIANTS-v0.1` en lugar de crear una familia paralela. Esto satisface además lo que `31-R8-MASTER-DECISION-PROPAGATION-AUDIT` §140 pide `[D]`.
3. **Resolver B3-CON-019** (`Legajo`/`DocumentoLegajo`) como tarea de diseño separada. Es el único OPEN TECHNICAL DETAIL que bloquea un invariant. Requiere decidir modelo, por lo que no corresponde a B3 — INVARIANTS.
4. **B3 — TESTS/EVALS** a partir de sec. 22, priorizando:
   - **TC-B3-12** — cierra ND-01, la única incógnita de mecanismo relevante;
   - **TC-B3-09** — reproduce G-B3-05, el hallazgo más importante del AS-IS;
   - **TC-B3-04** y el fail-closed (`upsert`/`groupBy`) — convierten en `[T]` la mejor propiedad del AS-IS, hoy sin test;
   - **TC-B3-23** — guardarraíl que impide que endurecer el aislamiento rompa el login.

**Observación de secuencia, no una recomendación de implementación:** los tests priorizados en el paso 4 son ejecutables **antes** de cualquier cambio de mecanismo, usando la fixture `empresaAislamiento` que ya existe `[C]`. Eso convertiría en `[T]`/`[E]` cuatro propiedades que hoy son `[C]` por lectura o `[ND]`, y permitiría que B3 — INVARIANTS se cierre sobre comportamiento medido en lugar de comportamiento leído. Sigue siendo verificación del AS-IS, no implementación de B3.

**Secuencia completa:** `B3 AS-IS (hecho)` → `B3 CONTRACTS (este documento)` → `B3 INVARIANTS` → `B3 TESTS/EVALS`.

---

# 27. EVIDENCE INDEX

**Clases presentes:** `[C]` y `[D]`. **Ausentes: `[T]` y `[E]`.**

## 27.1 `[D]` — autoridad canónica

| Ref | Fuente | Sección | Acredita |
|---|---|---|---|
| D-01 | `03-DECISIONS/28-R8-ARCH-002-...` | §1 | Application-level isolation APROBADO |
| D-02 | idem | §3.1-3.12 | Las 12 propiedades requeridas |
| D-03 | idem | §4 | RLS / DB-per-tenant / schema-per-tenant explícitamente fuera |
| D-04 | idem | §5 | AS-IS = **ADAPTED**, ningún componente eliminado |
| D-05 | idem | §6 | Lista de cierres pendientes: ownership directo/indirecto, nested, unique, transacciones, contexto ausente, migración |
| D-06 | idem | §7 | Invariante de seguridad cross-Business |
| D-07 | `03-DECISIONS/30-R8-MASTER-...CLOSURE` | §80 | Confirma application-level como dirección aprobada |
| D-08 | `03-DECISIONS/31-R8-MASTER-...PROPAGATION` | §115, §140 | Exige que el aislamiento no se describa como indeciso; requiere invariant de aislamiento application-level |
| D-09 | `03-DECISIONS/33-R8-ID-003-...` | — | `empresaId` legacy transicional; sin limpieza destructiva |
| D-10 | `03-DECISIONS/35-R8-AUTH-001-...` | — | Membership → Role → Permission |
| D-11 | `07-DESIGN/ARCHITECTURE/04-R8-ARCH-002-ASSESSMENT` | §2 | Mecanismo AS-IS, "VERIFIED BY CODE" |
| D-12 | idem | §3 | Las 6 limitaciones, "verified implementation characteristics, not assumptions" |
| D-13 | idem | §7 | El AS-IS no es automáticamente el TO-BE |
| D-14 | `07-DESIGN/ARCHITECTURE/06-BLOCK-1-ARCH-SPEC` | §5.4 | Contexto activo; client ID no sobrescribe |
| D-15 | idem | §5.5 | 12 propiedades literales + cadena + disposición ADAPT |
| D-16 | `.../CONTRACTS/DOMAIN/01-IDENTITY-AND-TENANCY` | C-TEN-001 | Business = boundary de aislamiento |
| D-17 | idem | C-CONTEXT-001 | Contexto resuelto explícitamente |
| D-18 | idem | C-MEM-001, R5-IDENTITY-002 | Membership; ACTIVE/INACTIVE |
| D-19 | idem | R5-IDENTITY-004 | Un email normalizado identifica a lo sumo un User |
| D-20 | idem | R8 CLOSURE ADDENDUM | 7 propiedades R8 propagadas |
| D-21 | `.../06-R8-ID-003-...CONTRACT` | **C-COEX-004** | **7 obligaciones de aislamiento en coexistencia** |
| D-22 | idem | C-COEX-002, 003, 005, 006 | Preservación legacy; legacy no sobrescribe; sin limpieza |
| D-23 | idem | §5 | Sin mapping físico / ID strategy / backfill autorizado |
| D-24 | idem | §9 | Business Context boundary |
| D-25 | idem | §12 | Clasificación de preservación |
| D-26 | `.../07-R8-AUTH-001-...CONTRACT` | §3, §10, §11 | Cadena de autorización; invariants; test mapping |
| D-27 | `.../08-R8-ARCH-003-...CONTRACT` | **CTX-001..006** | Contrato de Active Business Context |
| D-28 | idem | **§12** | **5 obligaciones de persistencia; extensión = adaptation candidate** |
| D-29 | idem | §7 | El claim `empresaId` no es autoridad única de autorización |
| D-30 | idem | §9 | Business switching cerrado por Membership |
| D-31 | idem | §13 | 14 puntos OPEN (transporte, claims, enforcement, schema Membership, error API) |
| D-32 | idem | §15 | 11 requisitos de verificación negativa |
| D-33 | `INVARIANTS/DERIVED/00-INVARIANTS-v0.1` | INV-TEN-001, INV-MEM-001/002, INV-AUTH-001/002/003 | Invariants existentes |
| D-34 | idem | R8 ARCHITECTURE CLOSURE | 6 propiedades derivadas, incl. aislamiento cross-Business |
| D-35 | `INVARIANTS/BASELINE/00-R5-...` | INV-ID-004, INV-PUR-003, INV-AUDIT-002 | Aislamiento Business en baseline |
| D-36 | `TESTS-EVALS/DERIVED/00-TESTS-EVALS-v0.2` | TE-TEN-001, TE-ID-002, TE-INV-001, TE-CASH-001, TE-COM-004; §316-328 | Cobertura de test existente |
| D-37 | `TESTS-EVALS/AUDIT/00-R7-...` | R7-AUD-001 | TE-TEN-001 agregado por falta de criterio dedicado |
| D-38 | `13-AUDIT/23-BLOCK-3-...-2026-10-04` | completo | Input AS-IS de esta derivación |

## 27.2 `[C]` — código

| Ref | Ubicación | Acredita |
|---|---|---|
| C-01 | `prisma/empresa-scope.extension.ts:32-68` | Allow-list de 26 modelos |
| C-02 | idem `:82-94, 131-134` | Inyección en `where`, 9 operaciones |
| C-03 | idem `:113-116` | Solo `args.data`/`args.where` top-level → nested no inspeccionado |
| C-04 | idem `:118-129` | `create`/`createMany` fuerzan `empresaId` |
| C-05 | idem `:136-159` | Validación post-query de `findUnique`; depende de `'empresaId' in resultado` |
| C-06 | idem `:164-166` | **Fail-closed** |
| C-07 | idem `:20-30` | Docstring desactualizado → G-B3-12 |
| C-08 | `prisma/empresa-scoped-prisma.service.ts:38-39` | `forEmpresa(empresaId: string)` — el call site elige el valor |
| C-09 | idem `:9-20` | Fundamento documentado de no usar `Scope.REQUEST` |
| C-10 | `prisma/prisma.module.ts:6-8` | `PrismaService` exportado → bypass alcanzable |
| C-11 | `prisma/schema.prisma` | 42 modelos; 28 con `empresaId` |
| C-12 | idem `:1061, 1082` | `PagoProveedor`/`DevolucionProveedor` con `empresaId`, fuera de la allow-list |
| C-13 | idem `:520-523` | `Legajo.usuarioId`/`clienteId` ambos `@unique` y opcionales → AMBIGUOUS |
| C-14 | idem `:663` | `Venta.idempotencyKey @unique` global |
| C-15 | idem `:488` | `Cliente.googleId @unique` global |
| C-16 | idem | Ningún `@@unique([id, empresaId])` |
| C-17 | idem `:1100-1111` | `DevolucionProveedorItem` sin `empresaId`, FK a Producto/Lote |
| C-18 | `auth/jwt.strategy.ts:23-34` | `validate()` no consulta la base |
| C-19 | **`compras.service.ts:343-398`** | **`crearDevolucion`: FK del DTO sin validar** |
| C-20 | idem `:323-331` | Docstring afirma validación no implementada |
| C-21 | **`compras.service.ts:107-114`** | **`crearCompra` SÍ valida FK con lectura scoped — quinto nested write, no registrado en el AS-IS** |
| C-22 | idem `:128` | Nested create `items` con FK previamente validadas |
| C-23 | idem `:271, 298, 327, 353` | 4 ops sobre modelos no cubiertos, precedidas por `getCompra` |
| C-24 | idem `:16` | `EmpresaScopedTx` derivado del cliente extendido |
| C-25 | `ventas.service.ts` `resolverItems()` | Nested create **con** validación scoped previa |
| C-26 | idem `:117-120` | `findUnique({idempotencyKey})` |
| C-27 | `tienda.service.ts:158-163, 265-273` | Nested create con validación previa |
| C-28 | idem `:230-240` | `findFirst`+`create/update` en vez de `upsert`, **por el fail-closed, dentro de `tx`** |
| C-29 | idem `:38-49` | Tenant por env var con fail-explícito |
| C-30 | `caja.service.ts:132-136` | FK (`usuarioEntranteId`) validada con lectura scoped |
| C-31 | `inventario.service.ts:259-271` | `$executeRaw` parametrizado con `empresaId` en el `WHERE` |
| C-32 | idem `:12` | `EmpresaScopedTx` derivado del cliente extendido |
| C-33 | `legajo.controller.ts:145-152` | Descarga valida `empresaId` vía `legajo.usuario` |
| C-34 | idem `:108 + :123` | `findFirst` scoped → `update` crudo (X-06) |
| C-35 | `legajo.cliente.controller.ts:123 + :135` | Idem |
| C-36 | `legajo.service.ts:66-174` | 11 ops crudas sin chequeo de empresa |
| C-37 | `invitaciones.service.ts:118-131, 227-240` | `$transaction` crudo creando modelos cubiertos |
| C-38 | idem `:38` | `usuario.findUnique({email})` global → enumeración |
| C-39 | `autorizaciones.service.ts:62, 69` | Chequeo explícito de empresa; `usuarioPermiso` sin scope efectivo |
| C-40 | `prisma/seed.ts:69, 177, 191-216` | **Segunda Empresa `empresaAislamiento` con catálogo, sin consumidor** |
| C-41 | `find *.spec.ts` | Único spec: `health.controller.spec.ts` → cero tests de aislamiento |
| C-42 | grep `*.dto.ts`, `@Param`/`@Query`/`@Headers` | Cero `empresaId`; `@Headers` sin uso |
| C-43 | grep `.upsert(` / `.groupBy(` | Cero usos → el fail-closed opera |
| C-44 | grep `@Cron`/`Queue`/`setInterval`/`EventEmitter` | Cero → sin background jobs |
| C-45 | **grep `connect:`/`connectOrCreate`/`disconnect`/`set:`** | **Cero usos en `src`** → base de B3-CON-012 condicional |
| C-46 | `node_modules/.prisma/client/index.d.ts:493, 4504` | `ITXClientDenyList` no excluye hooks de query |
| C-47 | `apps/api/package.json:33` | `@prisma/client` ^5.22.0 (instalado 5.22.0) |

## 27.3 `[ND]` — no determinable

| Ref | Qué | Por qué |
|---|---|---|
| ND-01 | Que `$extends` siga activo en el `tx` interactivo **en ejecución** | Evidencia de tipos `[C]` (C-46) y documental convergente `[D]` (C-28); no se ejecutó. → TC-B3-12 |
| ND-02 | Efecto real de un `empresaId` firmado inexistente | Esperado: lecturas a cero filas, violación de FK en `create`. No ejecutado. → TC-B3-16 |
| ND-03 | Estado final persistido ante la FK cruzada de G-B3-05 | La FK se satisface (el ID existe); el resultado no se verificó por ejecución. → TC-B3-09 |

---

**B3 — TENANT ISOLATION CONTRACTS: DERIVACIÓN COMPLETA — DRAFT / NO APROBADO.**

Este documento no crea decisiones, schema, invariants, tests ni implementación. No modifica ningún documento canónico.
