# RED TEAM — ADVERSARIAL REVIEW
## B3 SLICE: ProductoProveedor → Producto / Proveedor

**Rol:** Red Team independiente (Agent 2). No implementa, no modifica, no commitea, no "arregla" tests.
**Fecha:** 2026-10-04
**Repositorio:** `fmonfasani/otrarondamas`
**Branch:** `chore/build-in-ci`
**HEAD:** `6c5a207` — *"ci(b3): execute ProductoProveedor candidate"*
**Estado del árbol al inicio y al final:** `apps/api/src/prisma/relation-ownership.ts` **modificado sin commitear** (trabajo de Claude 1, no mío)

**Clases de evidencia:** `[C]` código · `[T]` test · `[E]` ejecución · `[D]` documentado · `[ND]` no determinable

> **Este informe SÍ emite `[E]`.** Ejecuté la suite del slice contra la base PostgreSQL real (contenedor `otrarondamas-db-1`, healthy, puerto 5500). Lo declaro explícitamente porque cambia el peso de las conclusiones: no son predicciones estáticas, son resultados medidos.

---

# 1. VERDICT

# FAIL

**La suite del slice no pasa.** Ejecución real, `[E]`:

```
√ PP-01: same-Business Producto + Proveedor reference persists (22 ms)
√ PP-02: cross-Business Producto reference rejects without persistence (25 ms)
√ PP-03: cross-Business Proveedor reference rejects without persistence (10 ms)
√ PP-04: cross-Business references reject inside an interactive transaction (42 ms)
× PP-05: update cannot switch an existing relation to another Business Producto (19 ms)
× PP-06: update cannot switch an existing relation to another Business Proveedor (10 ms)

Tests: 2 failed, 4 passed, 6 total
```

**Causa raíz de los dos fallos — defecto de fixture, no del mecanismo** `[E]`:

```
PrismaClientKnownRequestError:
Invalid `db.productoProveedor.create()` invocation at
  b3-producto-proveedor.integration-spec.ts:226:49
Unique constraint failed on the fields: (`productoId`,`proveedorId`)
```

`ProductoProveedor` declara `@@unique([productoId, proveedorId])` (`schema.prisma`) `[C]`. PP-01 ya persistió el par `(productoA, proveedorA)`. PP-05 y PP-06 intentan **crear el mismo par** como paso previo a su `update`, y mueren en el `create` con **P2002** antes de llegar a la aserción que dicen verificar.

**Consecuencia:** la propiedad "un `update` no puede reapuntar una relación existente a otro Business" —que es exactamente el ataque #5 del encargo— **no está verificada por ninguna evidencia**. El test que pretende cubrirla nunca ejecuta su `update`.

**Dos agravantes que elevan esto de "fixture rota" a FAIL del slice:**

1. **El registro de la relación está SIN COMMITEAR.** En HEAD (`6c5a207`), `RELACIONES_CON_OWNERSHIP` **no contiene** `ProductoProveedor` `[C]`. La entrada existe solo en el árbol de trabajo. El commit se llama *"ci(b3): execute ProductoProveedor candidate"*, pero **el código que da la protección no está en ese commit**.
2. **El workflow de CI ejecuta esta suite como paso gating** (`.github/workflows/b3-tenant-isolation-candidate.yml`, paso *"Run Producto-Proveedor candidate"*) `[C]`. Con 2 tests en rojo, **ese paso falla**. Si alguna evidencia afirma que el candidato pasó en CI, esa afirmación requiere verificación independiente.

**No declaro B3 global VERIFIED. No cierro ningún otro slice.**

---

# 2. CLAIMS VERIFIED

Qué afirma el slice y qué sostiene la evidencia.

| # | Afirmación implícita del slice | Veredicto | Evidencia |
|---|---|---|---|
| C-1 | El FK escalar `productoId` cross-Business es rechazado en `create` | **VERIFICADO** | `[E]` PP-02 pasa; `[C]` la verificación corre antes de la query |
| C-2 | El FK escalar `proveedorId` cross-Business es rechazado en `create` | **VERIFICADO** | `[E]` PP-03 pasa |
| C-3 | El rechazo ocurre **sin persistencia** | **VERIFICADO** | `[E]` PP-02/PP-03 cuentan 0 filas después; `[C]` la verificación es previa a la query, luego no hay escritura que revertir |
| C-4 | El rechazo se mantiene dentro de una transacción interactiva | **VERIFICADO** | `[E]` PP-04 pasa |
| C-5 | La relación same-Business sí persiste (control positivo) | **VERIFICADO** | `[E]` PP-01 pasa |
| C-6 | Un `update` no puede reapuntar `productoId` a otro Business | **NO VERIFICADO** | `[E]` PP-05 falla en el setup; el `update` nunca se ejecuta |
| C-7 | Un `update` no puede reapuntar `proveedorId` a otro Business | **NO VERIFICADO** | `[E]` PP-06 falla igual |
| C-8 | El mecanismo cubre `connect` además del FK escalar | **NO VERIFICADO POR TEST** — cubierto por código | `[C]` `referenciasDeConnect`; ningún test del slice usa `connect` |
| C-9 | El mecanismo cubre `upsert` | **NO APLICABLE / contradictorio** — ver §6 | `[C]` el registry lo contempla, la extensión lo rechaza antes |
| C-10 | El mecanismo cubre `createMany` / `createManyAndReturn` | **NO VERIFICADO POR TEST** | `[C]` contemplado en `recolectarReferenciasRelacionales`; sin test |
| C-11 | El mecanismo cubre `updateMany` | **NO VERIFICADO POR TEST** | `[C]` contemplado; sin test |

**5 de 11 afirmaciones verificadas por ejecución. 2 refutadas. 4 solo por código.**

---

# 3. ATTACKS PERFORMED

Los 13 vectores del encargo, con resultado.

### Ataque 1 — ¿El test usa el mismo Business por accidente?
**NO.** Los fixtures crean dos `Empresa` reales con jerarquía completa y separada (Familia/Subfamilia/Tipo/Subtipo A y B), `Proveedor` A y B, `Producto` A y B. PP-02 usa `productoB.id` con contexto A; PP-03 usa `proveedorB.id` con contexto A `[C]`. **Fixtures correctos en este punto.**

### Ataque 2 — ¿Los fixtures garantizan realmente A/B?
**Parcialmente — hay un defecto real.** La separación A/B es correcta, pero **los fixtures no son idempotentes respecto del `@@unique([productoId, proveedorId])`**: PP-01, PP-05 y PP-06 compiten por el mismo par. Es el defecto que produce el FAIL `[E]`.

### Ataque 3 — ¿El cross-Business test falla por una razón distinta del ownership?
**Verificado que NO para PP-02/PP-03.** Ambos usan `.rejects.toThrow()` **sin matcher de mensaje**, lo que en principio aceptaría cualquier error. Pero descarté las alternativas:
- no es P2002: el par `(productoB, proveedorA)` y `(productoA, proveedorB)` no existen;
- no es violación de FK de base: `productoB` y `proveedorB` **existen** en la base;
- no es `empresaId` inválido: `empresaA.id` es real.
La única causa posible es el `P2025` de `verificarOwnershipRelacional` `[C]`+`[E]`.
**Pero la ausencia de matcher es una debilidad real** — ver §4, FG-02.

### Ataque 4 — ¿El test valida el error pero no demuestra ausencia de persistencia?
**NO — PP-02/PP-03 sí lo demuestran.** Ambos hacen `prisma.productoProveedor.count(...)` con el **cliente sin scope** después del rechazo, lo que evita que el propio scope oculte una fila escrita `[C]`. Es la forma correcta. PP-04 también verifica el conteo total.
**Omisión:** ninguno verifica el estado de la fila de **B** (que nada se escribió del lado de B), solo que no se creó la fila cross en A.

### Ataque 5 — ¿Un FK puede cambiarse por `update` sin ser validado?
**NO DETERMINABLE POR TEST — el test que lo cubriría está roto** `[E]`.
Por código, `recolectarReferenciasRelacionales` incluye `case 'update'` y visita `args.data` `[C]`, y la extensión invoca la verificación antes de la query para **toda** operación `[C]`. **La protección parece existir; no está demostrada.** Este es el hueco central del slice.

### Ataque 6 — ¿`connect` se comporta distinto del FK escalar?
**Por código, ambos caminos convergen** `[C]`: el FK escalar pasa por `referenciaDeFk`, el `connect` por `referenciasDeConnect`, y ambos producen `ReferenciaRelacional` verificadas por el mismo bucle. **Ningún test del slice usa `connect`** — no verificado por `[T]`/`[E]`.
**Hallazgo adicional:** `referenciasDeConnect` **lanza** ante cualquier operación anidada que no sea `connect` sobre una relación registrada (`disconnect`, `set`, `delete`) `[C]`. Fail-closed correcto, no probado.

### Ataque 7 — ¿Un nested write puede escapar el registry?
**Mitigado por diseño, y es la parte más sólida del mecanismo** `[C]`. `visitarRelacionNoRegistrada` recorre `create`, `createMany`, `connectOrCreate`, `update`, `updateMany`, `upsert` de relaciones **no** registradas y desciende a los datos del hijo, de modo que un `ProductoProveedor` creado anidado desde otro modelo **también** se verifica. **Sin test en este slice.**
**Límite real:** el `default: break` del `switch` ignora en silencio cualquier otra operación anidada `[C]`. No enumeré exhaustivamente qué operaciones caen ahí.

### Ataque 8 — ¿La transacción tiene una ruta distinta?
**NO.** PP-04 lo verifica por ejecución `[E]`: ambos rechazos se mantienen dentro de `$transaction`. Coherente con que la extensión se aplica al cliente y el `tx` hereda los hooks.

### Ataque 9 — ¿Una consulta raw puede modificar el estado sin pasar por scope?
**SÍ — y es una brecha estructural, no un defecto de este slice** `[C]`. La extensión engancha únicamente `$allModels.$allOperations`; `$executeRaw`/`$queryRaw` no son operaciones de modelo y **no pueden** ser interceptadas. Un `UPDATE "ProductoProveedor" SET "productoId" = …` por raw SQL **no recibiría ninguna verificación de ownership**.
No existe hoy ningún raw que toque `ProductoProveedor` `[C]`. **Riesgo latente, fuera del alcance del slice, dentro del de ISO-006.**

### Ataque 10 — ¿El test cubre solo una ruta de servicio y no la capacidad real?
**Al revés, y es correcto:** el test ataca el **mecanismo** directamente (`scopedPrisma.forEmpresa(...)`), no un endpoint. Eso es más fuerte que probar un servicio.
**Pero deja un hueco:** ningún test demuestra que las rutas de producción que escriben `ProductoProveedor` usen el cliente scoped. Busqué: **no encontré ningún servicio o controller que escriba `ProductoProveedor`** `[C]` — el modelo no tiene escritura de producción hoy. El slice protege una capacidad aún no usada.

### Ataque 11 — ¿El mecanismo depende de que el modelo esté en `MODELOS_CON_EMPRESA_ID`?
**SÍ, y es una dependencia dura confirmada** `[C]`. `verificarOwnershipRelacional` lanza si el **modelo destino** no está en esa lista:
```
if (!esModeloConEmpresaId(modelo)) throw new Error('…no tiene ownership directo por empresa verificable.')
```
`Producto` y `Proveedor` **sí** están en la lista `[C]`, así que el slice funciona. **Pero el acoplamiento es real:** si un destino saliera de la lista, la relación pasaría de "verificada" a "excepción en runtime", no a "sin verificar" — fail-closed, aceptable.
**Riesgo relacionado:** `PagoProveedor` y `DevolucionProveedor` tienen `empresaId` y **no están** en `MODELOS_CON_EMPRESA_ID` `[C]`. Registrar una relación hacia ellos lanzaría.

### Ataque 12 — ¿La relación fue registrada pero el target equivocado quedó protegido?
**NO.** Verifiqué nombre por nombre contra el DMMF: `ProductoProveedor.producto → Producto` y `ProductoProveedor.proveedor → Proveedor`, ambos `kind: 'object'` con `relationFromFields`/`relationToFields` de longitud 1 `[C]`. El spec unitario `relation-ownership.spec.ts` valida esa invariante estructuralmente para **todas** las entradas del registry `[C]`. Targets correctos.

### Ataque 13 — ¿El test podría pasar aunque la protección estuviera desactivada?
**Intenté la prueba de mutación y fue BLOQUEADA por política de permisos** — correctamente: desactivar un control de seguridad en el árbol de trabajo es precisamente lo que mi mandato read-only prohíbe. No insistí ni busqué rodeos. Verifiqué después, con el tool de lectura, que el archivo quedó **intacto** (`ProductoProveedor: ['producto', 'proveedor']` presente en la línea 27).

**Obtuve la misma conclusión por un camino seguro y estático:**
`Lote` tiene `productoId` + relación `producto → Producto` `[C]`, y **`Lote` no aparece en ningún lugar del registry** `[C]`. Por lo tanto `Lote` puede hoy persistir un `productoId` de otro Business bajo contexto propio. Eso demuestra que **la protección es opt-in por entrada de registry**, y que el verde de PP-02/PP-03 **depende enteramente de la entrada `ProductoProveedor`** — la cual, recordemos, **no está commiteada**.

**Respuesta directa al ataque 13:** si la entrada se quitara, PP-02 y PP-03 **pasarían a rojo** (el `create` tendría éxito y el `count` daría 1), por lo que el test **sí es sensible** a la protección. No es un verde accidental. **Pero esto es inferencia `[C]`, no medición `[E]`** — la mutación habría dado la prueba directa y está pendiente de autorización (§9).

---

# 4. FALSE-GREEN RISKS

| ID | Riesgo | Severidad | Estado |
|---|---|---|---|
| **FG-01** | **El registry no está commiteado.** El verde que Claude 1 pueda reportar localmente proviene de código no versionado. Cualquier ejecución desde HEAD limpio **no tiene la protección** | **CRÍTICA** | `[C]` confirmado: `git show HEAD:…relation-ownership.ts` no contiene `ProductoProveedor` |
| **FG-02** | **`.rejects.toThrow()` sin matcher** en PP-02, PP-03, PP-04, PP-05, PP-06. Acepta cualquier excepción: P2002, P2003, error de conexión, fallo de fixture. **PP-05 y PP-06 son la demostración viva del riesgo** — fallan por P2002 y, si la aserción estuviera antes del `create`, habrían pasado por la razón equivocada | **ALTA** | `[E]` materializado |
| **FG-03** | **PP-04 depende del orden de ejecución.** Su aserción final es `count({ empresaId: empresaA.id })` → `1`, que asume exactamente la fila de PP-01 y ninguna más. Hoy funciona porque PP-05/PP-06 fallan **antes** de crear. **Si PP-05/PP-06 se arreglaran creando pares distintos, PP-04 pasaría a contar 2 o 3 y rompería** | **ALTA** | `[E]` + `[C]` |
| **FG-04** | **Sin `afterEach` ni limpieza entre tests.** El estado se acumula dentro del `describe`; la limpieza es solo `afterAll`. Acopla los tests entre sí | MEDIA | `[C]` |
| **FG-05** | **PP-01 no es un control negativo del mecanismo.** Demuestra que same-Business persiste, pero pasaría igual con la protección desactivada. No discrimina | MEDIA | `[C]` |
| **FG-06** | **Ningún test verifica el código de error.** La propiedad contractual es "falla cerrado"; un `P2025` (no encontrado) y un `P2002` (constraint) son semánticamente distintos y el test no los distingue | MEDIA | `[C]` |
| **FG-07** | **Si la base arrastra filas de corridas previas**, el `@@unique` puede hacer fallar PP-01 también, volviendo toda la suite roja por una razón ajena al aislamiento. El `afterAll` limpia, pero una corrida interrumpida deja residuo | MEDIA | `[C]`; no observado en mi ejecución |

---

# 5. TEST GAPS

| ID | Gap | Severidad |
|---|---|---|
| **TG-01** | **`update` de FK cross-Business sin cobertura efectiva** — PP-05/PP-06 existen pero no llegan a ejecutar su `update` | **CRÍTICA** |
| **TG-02** | **`connect` sin ningún test** — camino distinto del FK escalar en el código, convergente solo por diseño | **ALTA** |
| **TG-03** | **`createMany` / `createManyAndReturn` sin test** — contemplados en el registry, nunca ejercitados | MEDIA |
| **TG-04** | **`updateMany` sin test** | MEDIA |
| **TG-05** | **Nested write hacia `ProductoProveedor` sin test** — la ruta más sutil del mecanismo (`visitarRelacionNoRegistrada`) no se prueba para este modelo | **ALTA** |
| **TG-06** | **Caso "el recurso no existe" sin test** — `verificarOwnershipRelacional` trata "no encontrado" y "de otro Business" con el mismo `P2025` `[C]`; ningún test lo verifica | MEDIA |
| **TG-07** | **Sin test de que el rechazo use `P2025`** | MEDIA |
| **TG-08** | **Sin test de rollback**: que tras el rechazo dentro de `$transaction` las filas de **A** también queden intactas (PP-04 solo cuenta A) | MEDIA |
| **TG-09** | **Sin test del fail-closed de `referenciasDeConnect`** ante `disconnect`/`set`/`delete` anidados | MEDIA |
| **TG-10** | **Sin test de la dirección inversa**: contexto B intentando referenciar recursos de A (toda la suite ataca desde A) | BAJA |
| **TG-11** | **Sin test de `upsert`** — ver la contradicción de §6 | BAJA |

---

# 6. PRODUCTION GAPS

| ID | Gap | Severidad | Evidencia |
|---|---|---|---|
| **PG-01** | **La entrada del registry no está commiteada.** El código de producción en HEAD **no protege** `ProductoProveedor` | **CRÍTICA** | `[C]` |
| **PG-02** | **`ProductoProveedor` no tiene ninguna ruta de escritura en producción.** No encontré servicio ni controller que lo cree o actualice `[C]`. El slice protege una capacidad no usada — lo que reduce el riesgo real pero también significa que **ningún test de ruta de servicio es posible hoy** | INFORMATIVA | `[C]` |
| **PG-03** | **Contradicción `upsert`:** `recolectarReferenciasRelacionales` tiene `case 'upsert'` y visita `args.create`/`args.update` `[C]`, pero la extensión **lanza** ante `upsert` sobre un modelo con `empresaId` antes de que importe `[C]`. El código de ownership para `upsert` es **inalcanzable** para modelos cubiertos. No es un bug de seguridad (falla cerrado) pero es código muerto que sugiere una cobertura que no existe | BAJA | `[C]` |
| **PG-04** | **Raw SQL fuera del mecanismo** (ataque 9). Latente: no hay raw que toque este modelo | MEDIA | `[C]` |
| **PG-05** | **El `default: break` de `visitarRelacionNoRegistrada` ignora en silencio** operaciones anidadas no enumeradas. No verifiqué exhaustivamente qué queda fuera | MEDIA | `[C]` |
| **PG-06** | **`verificarOwnershipRelacional` emite N `findUnique` secuenciales** antes de cada operación `[C]`. Para un `createMany` de muchas filas, es un `findUnique` por referencia distinta (deduplicadas). Costo no medido `[ND]` | BAJA | `[C]` |
| **PG-07** | **La verificación usa `client`, no `tx`.** Dentro de una transacción, `verificarOwnershipRelacional(client, …)` consulta con el cliente **externo** a la transacción `[C]`. Implicación: no ve escrituras no confirmadas de la propia transacción, y existe una ventana TOCTOU entre la verificación y la escritura. Para ownership de empresa —que no cambia— el impacto práctico es bajo, pero **es una diferencia de semántica real y no está documentada** | MEDIA | `[C]` |

**PG-07 es mi hallazgo propio más relevante del mecanismo** y no aparece en la documentación revisada.

---

# 7. DOCUMENTATION GAPS

| ID | Gap | Severidad |
|---|---|---|
| **DG-01** | **Los IDs `T-01-01`, `T-01-02`, `T-01-03`, `T-01-05`, `T-01-07` que el encargo pide comparar NO EXISTEN** en `docs/WAPSELL-DOCUMENTATION/**` `[C]`. Solo existe `T-01` como blocker técnico, cerrado en `28-B3-PERSISTENCE-ISOLATION-CONTRACT-CLOSURE`. **No pude comparar contra ellos porque no hay nada que comparar** | **ALTA** |
| **DG-02** | No existe documento de auditoría específico del slice `ProductoProveedor`, a diferencia de los gates 6.1-6.4 que sí tienen audit + execution verification | MEDIA |
| **DG-03** | El commit `6c5a207` se llama *"ci(b3): execute ProductoProveedor candidate"* pero **no contiene la implementación** que el candidato necesita | **ALTA** |
| **DG-04** | `PG-03` (código `upsert` inalcanzable) y `PG-07` (verificación fuera de la transacción) no están documentados en ningún lado | MEDIA |

---

# 8. CONTRACT COMPARISON (PASO 4)

| ID solicitado | Existe | Comportamiento observado | Veredicto |
|---|---|---|---|
| **T-01-01** | **NO** `[C]` | — | **NO DETERMINABLE** — el ID no existe (DG-01) |
| **T-01-02** | **NO** `[C]` | — | **NO DETERMINABLE** |
| **T-01-03** | **NO** `[C]` | — | **NO DETERMINABLE** |
| **T-01-05** | **NO** `[C]` | — | **NO DETERMINABLE** |
| **T-01-07** | **NO** `[C]` | — | **NO DETERMINABLE** |
| **ISO-001** — un identificador de entidad relacionada recibido de un cliente se resuelve y valida contra el contexto antes de persistirse | SÍ `[D]` | `create` con FK cross-Business rechazado sin persistencia | **CUMPLE para `create`** `[E]` · **NO DEMOSTRADO para `update`** `[E]` |
| **ISO-002** — ninguna entidad Business-scoped queda vinculada a una de otro Business; la integridad referencial no basta | SÍ `[D]` | Vía `create` no se puede crear el vínculo cruzado | **CUMPLE PARCIALMENTE** — la vía `update` queda abierta a demostración; la vía raw SQL queda abierta estructuralmente |
| **ISO-003** — ownership derivado determinado y con obligaciones iguales | SÍ `[D]` | `ProductoProveedor` tiene `empresaId` propio → es **DIRECT**, no derivado | **NO APLICABLE a este slice** |
| **ISO-007** — una operación sin garantía de aislamiento definida es rechazada | SÍ `[D]` | `upsert` lanza; operaciones anidadas no-`connect` sobre relación registrada lanzan | **CUMPLE por código** `[C]`; sin test en este slice |
| **TE-ID-011** — nested/related persistence no puede escapar el Business ownership | SÍ `[D]` | El mecanismo recorre nested writes; **ningún test del slice lo ejercita para este modelo** | **NO VERIFICADO** para `ProductoProveedor` (TG-05) |

---

# 9. EVIDENCE CLASSIFICATION

## `[E]` — verificado por ejecución (lo emito y lo declaro)

| Ref | Hecho | Método |
|---|---|---|
| E-01 | La suite da **2 failed, 4 passed, 6 total** | `npx jest --config ./test/jest-e2e.json --runTestsByPath test/integration/b3-producto-proveedor.integration-spec.ts` desde `apps/api` |
| E-02 | PP-05 y PP-06 fallan con **P2002** `Unique constraint failed on (productoId, proveedorId)` en el `create` de setup | idem |
| E-03 | PP-01, PP-02, PP-03, PP-04 pasan | idem |
| E-04 | Base PostgreSQL real disponible: contenedor `otrarondamas-db-1`, *Up 6 days (healthy)*, `0.0.0.0:5500->5432` | `docker ps` |

## `[C]` — verificado por código

| Ref | Hecho | Ubicación |
|---|---|---|
| C-01 | `ProductoProveedor: ['producto','proveedor']` está en el registry **sin commitear** | `relation-ownership.ts:27` + `git diff` |
| C-02 | En HEAD `6c5a207` el registry **no** contiene `ProductoProveedor` | `git show HEAD:…` |
| C-03 | `@@unique([productoId, proveedorId])` — causa raíz del FAIL | `schema.prisma`, modelo `ProductoProveedor` |
| C-04 | La verificación de ownership corre **antes** de la query, para toda operación | `empresa-scope.extension.ts:155-157` |
| C-05 | `verificarOwnershipRelacional` lanza `P2025` si el destino no existe **o** es de otro Business | `:131-137` |
| C-06 | La verificación exige que el **destino** esté en `MODELOS_CON_EMPRESA_ID`, y lanza si no | `:123-127` |
| C-07 | `Producto` y `Proveedor` están en `MODELOS_CON_EMPRESA_ID` | `empresa-scope.extension.ts` |
| C-08 | La verificación usa `client`, no `tx` → consulta fuera de la transacción (**PG-07**) | `:131` |
| C-09 | FK escalar y `connect` convergen en `ReferenciaRelacional` | `relation-ownership.ts:91-111` |
| C-10 | `referenciasDeConnect` lanza ante operaciones anidadas distintas de `connect` | `:101-106` |
| C-11 | `visitarRelacionNoRegistrada` cubre create/createMany/connectOrCreate/update/updateMany/upsert, con `default: break` (**PG-05**) | `:118-152` |
| C-12 | `recolectarReferenciasRelacionales` cubre create/update/updateMany/createMany/createManyAndReturn/upsert | `:203-218` |
| C-13 | La extensión **lanza** ante `upsert` → el `case 'upsert'` del registry es inalcanzable (**PG-03**) | `empresa-scope.extension.ts:214-217` |
| C-14 | `Lote.producto` es FK a `Producto` y **`Lote` no está en el registry** → la protección es opt-in | `schema.prisma` + `relation-ownership.ts` |
| C-15 | El spec unitario valida estructuralmente todas las entradas del registry contra el DMMF | `relation-ownership.spec.ts` |
| C-16 | CI ejecuta la suite PP como paso gating | `.github/workflows/b3-tenant-isolation-candidate.yml` |
| C-17 | `T-01-01/02/03/05/07` no existen en la documentación (**DG-01**) | `grep` sobre `docs/WAPSELL-DOCUMENTATION/**` |
| C-18 | No hay servicio ni controller que escriba `ProductoProveedor` (**PG-02**) | `grep` sobre `apps/api/src/**` |
| C-19 | `PagoProveedor` y `DevolucionProveedor` tienen `empresaId` y no están en `MODELOS_CON_EMPRESA_ID` | `schema.prisma` + extensión |
| C-20 | El archivo del registry quedó **intacto** tras el intento de mutación bloqueado | lectura directa, línea 27 |

## `[T]` — verificado por test

Ninguna afirmación se sostiene **solo** por `[T]`: donde hay test, lo ejecuté, de modo que la clase efectiva es `[E]`.

## `[D]` — documentado

`ISO-001`, `ISO-002`, `ISO-003`, `ISO-007` (invariants B3); `TE-ID-011` (Block 1); `T-01` cerrado a nivel de contrato.

## `[ND]` — no determinable

| Ref | Ítem | Por qué |
|---|---|---|
| ND-01 | Si PP-02/PP-03 pasarían a rojo al quitar la entrada del registry | La prueba de mutación fue **bloqueada por política**; lo inferí por `[C]` (C-14), no lo medí |
| ND-02 | Si el candidato alguna vez pasó en CI | No consulté ejecuciones de CI |
| ND-03 | Costo de las N `findUnique` de verificación | No medido |
| ND-04 | Qué operaciones anidadas caen en el `default: break` | No enumeradas exhaustivamente |
| ND-05 | Si existe residuo en la base de corridas interrumpidas previas | No inspeccioné el contenido de las tablas |

---

# 10. RECOMMENDATION FOR CLAUDE 1

Recomendaciones, **no cambios**. No modifiqué nada.

## Bloqueantes del slice

1. **Commitear el registry.** La protección está en el árbol de trabajo y no en HEAD. Mientras eso siga así, cualquier verde es irreproducible y CI desde un clon limpio no tiene protección. **Esto primero.**

2. **Arreglar los fixtures de PP-05/PP-06 sin romper PP-04.** El `@@unique([productoId, proveedorId])` impide reutilizar el par de PP-01. Opciones, en orden de robustez:
   - crear pares **propios** por test (`productoA2`, `proveedorA2`), lo que exige **cambiar la aserción de PP-04** de `toBe(1)` a un conteo relativo o a un filtro por par;
   - o aislar cada test con `afterEach` que borre las filas creadas.
   **Cualquiera de las dos obliga a revisar PP-04** (FG-03) — no es un arreglo local.

3. **Añadir matchers de error.** Reemplazar `.rejects.toThrow()` por un matcher que exija `P2025` (o el mensaje de la excepción de ownership). PP-05/PP-06 son la prueba de que sin matcher un test puede fallar —o pasar— por la razón equivocada.

## Huecos a cubrir antes de declarar el slice cerrado

4. **Test de `connect`** cross-Business (TG-02) — camino distinto en el código.
5. **Test de nested write** hacia `ProductoProveedor` desde un padre (TG-05) — ruta más sutil del mecanismo y requisito de `TE-ID-011`.
6. **Test de `createMany` y `updateMany`** (TG-03, TG-04).
7. **Test del caso "el destino no existe"** (TG-06) y del código de error (TG-07).

## Correcciones de documentación

8. **Aclarar los IDs del contrato.** `T-01-01/02/03/05/07` no existen (DG-01). O se crean, o se referencian los IDs reales (`ISO-00x`).
9. **Documentar PG-07** — la verificación consulta con el cliente externo a la transacción. Es una decisión de semántica que merece quedar escrita.
10. **Documentar o eliminar PG-03** — el `case 'upsert'` del registry es inalcanzable para modelos con `empresaId`.

## Lo que pido al humano

11. **Autorización para la prueba de mutación (ND-01).** Intenté desactivar temporalmente la entrada del registry para medir si los tests son realmente sensibles a la protección —el ataque #13, y la única forma de descartar un verde accidental por medición en lugar de inferencia—. La acción fue **correctamente bloqueada** por la política de permisos, porque implica debilitar un control de seguridad en el árbol de trabajo. No busqué rodeos y verifiqué que el archivo quedó intacto.
    Si se considera valioso, la forma segura sería ejecutarla **en un clon desechable fuera del repo**, con autorización explícita. Mientras no se haga, **ND-01 permanece `[ND]`** y mi conclusión sobre el ataque 13 es inferencia `[C]`, no evidencia `[E]`.

---

# 11. RESPUESTA A LA PREGUNTA CENTRAL

> *"¿Los tests y la implementación realmente demuestran aislamiento de ProductoProveedor respecto de Producto y Proveedor, o solamente producen un verde accidental?"*

**Ninguna de las dos. No hay verde: la suite está en rojo** `[E]`.

Descompuesto:

- **No es un verde accidental.** Los 4 tests que pasan lo hacen por la razón correcta: descarté P2002, violación de FK y contexto inválido como causas alternativas de los rechazos, y el mecanismo verifica ownership antes de la query `[C]`+`[E]`. La protección es sensible al registry (C-14), aunque esto lo inferí y no lo medí (ND-01).

- **No demuestra el aislamiento completo.** Demuestra **`create`** (FK escalar, directo y en transacción). **No demuestra `update`** —el test que lo cubriría nunca ejecuta su `update`— ni `connect`, ni nested write, ni `createMany`/`updateMany`. De los seis vectores de escritura que el propio mecanismo contempla, **uno está verificado por ejecución**.

- **Y el hallazgo más serio no es de test sino de versionado:** la protección vive en un archivo sin commitear, mientras el commit de HEAD afirma haber ejecutado el candidato. Desde HEAD limpio, `ProductoProveedor` **no está protegido en absoluto** `[C]`.

**Veredicto: FAIL.** Causa inmediata: fixtures que colisionan con el `@@unique`. Causa de fondo: la implementación no está commiteada y la cobertura de `update` —el vector que el encargo señalaba como ataque #5— no está demostrada.

---

**RED TEAM REVIEW COMPLETA — NO CANÓNICO — NO APROBADO.**

No modifiqué código, tests, schema ni documentación existente. No hice commits, push ni deploy. No arreglé ningún test. No cerré otros slices. **No declaro B3 global VERIFIED.** Ejecuté la suite del slice en modo solo lectura sobre la base ya existente y limpié el único archivo auxiliar que escribí, que vivió siempre en el scratchpad y nunca en el repositorio.
