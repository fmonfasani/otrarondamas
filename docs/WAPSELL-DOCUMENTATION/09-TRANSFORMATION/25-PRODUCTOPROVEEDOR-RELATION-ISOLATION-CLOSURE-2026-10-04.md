# PRODUCTOPROVEEDOR → PRODUCTO / PROVEEDOR — CLOSURE DEL SLICE

**Fecha:** 2026-10-04
**Repositorio / branch:** `fmonfasani/otrarondamas` · `chore/build-in-ci`
**Naturaleza:** registro de cierre de **un** slice de relation isolation. **No canónico.** No modifica contratos, invariantes ni la documentación canónica global de B3.
**Clases de evidencia:** `[C]` código · `[T]` test · `[E]` ejecución · `[D]` documentado · `[ND]` no determinable

## 1. Veredicto y alcance

**ProductoProveedor → Producto / Proveedor: VERIFIED `[E]` para `create` y `update` con FK escalar**, sobre el commit `72e794defb2c59dc1c53f106b14433d9939c2cfa`, con las limitaciones de las secciones 8 y 9.

- **B3 global NO se declara VERIFIED.** Un slice verificado no equivale a B3 verificado.
- **No se declara ninguna política de cobertura del registry como aprobada.** Este documento no decide si el registry protege "superficie existente" o "superficie posible"; esa decisión queda abierta (ver doc 24, OD-2).
- **No se cierra ningún otro slice por extensión.**

## 2. Estado verificado del repositorio (al redactar este documento)

| Verificación | Resultado | Clase |
|---|---|---|
| `git rev-parse HEAD` | `72e794defb2c59dc1c53f106b14433d9939c2cfa` | `[E]` |
| `git rev-parse origin/chore/build-in-ci` | `72e794defb2c59dc1c53f106b14433d9939c2cfa` (HEAD == remoto) | `[E]` |
| Archivos trackeados modificados | ninguno (solo untracked: docs) | `[E]` |
| Run de CI citado, `headSha` | `72e794defb2c59dc1c53f106b14433d9939c2cfa` — coincide con HEAD | `[E]` |

El commit citado **es** el HEAD actual del branch; el run citado se ejecutó sobre ese mismo SHA.

## 3. Cronología de la evidencia de CI (workflow "B3 Tenant Isolation Candidate")

| Run # | Run ID | Commit | Conclusión | Qué contenía |
|---|---|---|---|---|
| **16** | `37227805988` | `6c5a207` | **failure** | spec `PP-01..PP-06` + step de CI; **sin** `ProductoProveedor` en el registro |
| **17** | `37228641927` | `72e794d` | **success** | registro con `ProductoProveedor` + fixtures PP-05/06 corregidos + step `DevolucionProveedorItem` |

- Run #16: `2026-10-04T19:19:04Z`. Run #17: `2026-10-04T19:32:07Z`, job `111513447138`, `success`, los 18 pasos del job en `success`. `[E]`
- El `#16`/`#17` es el *run number* del workflow. El `#9` es el número del PR, no del run (ver contradicción C-1).

## 4. Run #16 (FAIL) — qué falló exactamente

Step "Run Producto-Proveedor candidate" del run `37227805988`, `Tests: 5 failed, 1 passed, 6 total` `[E]`:

| Test | Resultado | Mensaje en el log |
|---|---|---|
| PP-01 | ✓ | — |
| PP-02 | ✕ | `Received promise resolved instead of rejected` |
| PP-03 | ✕ | `Received promise resolved instead of rejected` |
| PP-04 | ✕ | `Expected: 1 / Received: 3` |
| PP-05 | ✕ | `Unique constraint failed on the fields: (productoId, proveedorId)` |
| PP-06 | ✕ | `Unique constraint failed on the fields: (productoId, proveedorId)` |

Eran **dos causas independientes** que producían un solo "rojo". Mezclarlas fue la fuente de la confusión inicial.

## 5. Causas

### 5.1 Causa productiva real — PP-02, PP-03, PP-04

`ProductoProveedor` **no estaba** en `RELACIONES_CON_OWNERSHIP` `[C]`. Sin esa entrada, el preflight de ownership no revisa sus FKs: un `create` desde el contexto de A con un `Producto` o `Proveedor` de B **se persiste** (`promise resolved instead of rejected`), y esas filas filtradas son las que PP-04 contó (3 en lugar de 1). `[E]` run #16 + `[C]`.

### 5.2 Defecto de fixture — PP-05, PP-06

El spec original (`59f2b1c`) creaba la fila base de PP-05 y de PP-06 con el **mismo par** `(productoA, proveedorA)` que ya había creado PP-01. El `@@unique([productoId, proveedorId])` hacía fallar el `create` de **setup** con `P2002` **antes** de llegar al `update` que el test pretendía ejercitar `[E]` run #16 + `[C]` (`git show 59f2b1c`).

Consecuencia: en ese estado, **PP-05/PP-06 no probaban nada sobre `update`**. Su rojo era ruido de fixture, no evidencia del comportamiento productivo.

### 5.3 Qué pasaba realmente con `update` sin el fix

Dado que PP-05/06 nunca llegaban al `update`, el run #16 **no** demuestra por sí solo si `update` estaba abierto. Eso se determinó en una **corrida local** (no CI, no versionada), contra una PostgreSQL descartable, con el spec ya corregido y **sin** la línea del registro: PP-05 y PP-06, ejecutados cada uno aislado, fallan con `Received promise resolved instead of rejected` `[E]` local. Es decir, sin el fix el `update` cross-Business también se resolvía.

> Nota de método: en la corrida completa sin el fix, PP-06 pasaba "por la razón equivocada" (colisión con el unique contra la fila que PP-03 había filtrado). Aislado, falla como corresponde. Esto ilustra por qué la evidencia relevante es la de ejecución con el fix, no la ausencia de fallo sin él.

## 6. Cambios que cerraron el slice — commit `72e794d` (3 archivos, +24/−5)

| Archivo | Cambio |
|---|---|
| `apps/api/src/prisma/relation-ownership.ts` | **Fix productivo (1 línea):** `ProductoProveedor: ['producto', 'proveedor']`. El mecanismo genérico no se modificó. |
| `apps/api/test/integration/b3-producto-proveedor.integration-spec.ts` | **Fix de tests:** `proveedorA5` y `proveedorA6` (ambos de la empresa A) creados en `beforeAll`, usados como fila base de PP-05 y PP-06 respectivamente, y agregados al `deleteMany` del `afterAll`. Las aserciones post-rechazo comprueban que `proveedorId` sigue siendo el de cada test. |
| `.github/workflows/b3-tenant-isolation-candidate.yml` | Nuevo step independiente "Run DevolucionProveedorItem regression". |

No se tocaron schema, migraciones, servicios ni otros slices del registro.

## 7. Run #17 (PASS) — evidencia

Run `37228641927`, job `111513447138`, commit `72e794d`, `success` `[E]`:

| Step | Resultado |
|---|---|
| Unit (`npm test`) | 2 suites, 17 passed |
| `b3-tenant-isolation` | 42 passed |
| Producto-Familia | 5 passed |
| **Producto-Proveedor** | **6 passed** |
| ISO-006 | 6 passed |
| provider payment-return characterization | 6 passed |
| DevolucionProveedorItem | 7 passed |
| **Total** | **89 passed, 0 failed, 0 skipped** |

Tests del slice, nombrados en el log del job `[E]`:

| Test | Resultado | Propiedad |
|---|---|---|
| PP-01 | ✓ | same-Business persiste (control positivo) |
| PP-02 | ✓ | `create` con Producto de B rechaza, sin persistencia |
| PP-03 | ✓ | `create` con Proveedor de B rechaza, sin persistencia |
| PP-04 | ✓ | ambos rechazos dentro de `$transaction` interactiva |
| PP-05 | ✓ | `update` de `productoId` a un Producto de B rechaza; relación original intacta |
| PP-06 | ✓ | `update` de `proveedorId` a un Proveedor de B rechaza; relación original intacta |

La transición failure (#16, sin entrada) → success (#17, con entrada) sobre el mismo spec de aislamiento es la evidencia de que los tests son sensibles a la protección.

## 8. Evidencia de `P2025` (y su procedencia)

**Qué consta en CI:** nada sobre el código de error. Los `rejects.toThrow()` de PP-02..PP-06 **no tienen matcher** `[C]`; el log de CI solo muestra `✓`.

**Qué consta en el Red Team (doc `13-AUDIT/30`):** un probe local, aislado, fuera del repo, capturó el error real de cada rechazo `[D]` (citando `[E]` del Red Team, **no reproducido por mí**):

| Rechazo | Código | Mensaje |
|---|---|---|
| PP-02 (create, Producto de B) | `P2025` | `No Producto found` |
| PP-03 (create, Proveedor de B) | `P2025` | `No Proveedor found` |
| PP-05 (update, Producto de B; fila base creada) | `P2025` | `No Producto found` |
| PP-06 (update, Proveedor de B) | `P2025` | `No Proveedor found` |
| Control: violación forzada del unique | `P2002` | — |

Esto distingue el rechazo por ownership del rechazo por `@@unique`. Coincide con el código de `verificarOwnershipRelacional`, que lanza `P2025` si el destino no existe **o** es de otro Business `[C]`.

**Limitaciones de esta evidencia:**
- Es evidencia local de un probe, **no** de CI, y el probe no está versionado.
- Los tests **no exigen** `P2025`: un cambio futuro que produjera otro error seguiría en verde (Red Team N-02).
- `P2025` es el mismo error para "no existe" y para "es de otro Business"; ningún test los distingue.
- No hay evidencia de `P2025` para PP-04 más allá de que el rechazo ocurre; el probe del Red Team lo reporta como `P2025` `[D]`.

## 9. Limitación PP-04: depende del orden de ejecución

PP-04 termina con `count({ empresaId: A })` → `toBe(1)`, que asume exactamente la fila de PP-01 y ninguna otra.

- **Medido por mí `[E]` local, PostgreSQL descartable:** PP-04 ejecutado **aislado** (`-t "PP-04"`) **falla** con `Expected: 1 / Received: 0`. La suite completa pasa 6/6. PP-02 aislado pasa.
- Hoy es verde en la suite completa porque PP-04 corre después de PP-01 y antes de PP-05/PP-06 (que son los que agregan filas de A).
- Riesgo: reordenar, agregar un test que cree una relación de A antes de PP-04, o ejecutar con orden aleatorio (`--randomize`; **no ejecutado**, `[ND]`) puede dar un falso rojo **sin** que haya un problema de aislamiento.
- **El cierre no depende de esa aserción**: las dos aserciones de rechazo de PP-04 (`rejects.toThrow()` dentro de `$transaction`) son independientes del `count`. Es una fragilidad de test, no una brecha de aislamiento.
- Esta fragilidad fue anticipada por el Red Team (doc 29, FG-03) y confirmada (doc 30, N-01). **No se corrigió** en este cierre (la tarea prohíbe tocar código y tests).

## 10. Cobertura real y no cubierta

### 10.1 Cubierto con ejecución en CI `[E]`

| Vector | Cubierto por |
|---|---|
| `create` directo con FK escalar (`productoId` / `proveedorId`) cross-Business | PP-02, PP-03 |
| `create` con FK escalar cross-Business dentro de `$transaction` interactiva | PP-04 |
| `update` con FK escalar cross-Business (`productoId` y `proveedorId`) | PP-05, PP-06 |
| Caso válido same-Business | PP-01 |
| Ausencia de persistencia tras el rechazo (conteo con cliente sin scope) | PP-02, PP-03 (y PP-04, con la fragilidad de la sección 9) |
| Relación original intacta tras el `update` rechazado | PP-05, PP-06 |

### 10.2 NO cubierto (sin test de ejecución para este modelo)

| Vector | Estado |
|---|---|
| `connect` | Contemplado por código (`referenciasDeConnect`, converge con el FK escalar) `[C]`; **ningún test lo ejercita** |
| Escrituras anidadas hacia `ProductoProveedor` desde un padre | Contempladas por `visitarRelacionNoRegistrada` `[C]`; **sin test** |
| `createMany` / `createManyAndReturn` / `updateMany` | Contemplados en `recolectarReferenciasRelacionales` `[C]`; **sin test** |
| Raw SQL (`$executeRaw` / `$queryRaw`) | **Fuera del mecanismo por diseño** (la extensión solo engancha operaciones de modelo) `[C]`; no se halló raw SQL que toque el modelo |
| Destino inexistente vs. de otro Business | Mismo `P2025`; sin test que los distinga |
| Rollback de filas de A tras un rechazo en transacción | Sin test (PP-04 solo cuenta filas de A, no compara estado previo) |
| Concurrencia / TOCTOU del preflight (usa otra conexión) | `[ND]` |
| Suite legacy `tenant-isolation.integration-spec.ts` | Fuera del workflow B3 (la cubre el workflow B4) |

### 10.3 Superficie de producción

No se encontró en `apps/api/src` ningún servicio ni controller que escriba `ProductoProveedor` `[C]`. El slice protege una capacidad que **hoy no se ejerce desde el código de aplicación**. Este documento no toma posición sobre si eso justificaba priorizar el slice (ver doc 24, OD-2).

## 11. Contradicciones documentales registradas (NO corregidas)

| ID | Documento | Qué dice | Estado real | Tratamiento |
|---|---|---|---|---|
| **C-1** | `13-AUDIT/30` §3 | Run number `fmonfasani/otrarondamas#9` | Run number del workflow = **17**; `#9` es el número del PR | Registrado, no corregido |
| **C-2** | `09-TRANSFORMATION/23` (líneas ~8, 33, 111-112, 170, 240, 264-268) | `ProductoProveedor` "sin commitear", `REQUIRES EXECUTION`; commit base `6c5a207` | Commiteado en `72e794d`; ejecutado con PASS en CI | Superado por este cierre; no editado |
| **C-3** | `09-TRANSFORMATION/24` (líneas ~63-69, 153-154, 169-170, 239, 337, 352, 367-368, 480-483) | `EXECUTED — FAILING`; implementación "sin commitear"; "registry: 2 sin commitear"; propone "commitear, corregir fixtures, volver a ejecutar, cubrir `update`" | Esos pasos se ejecutaron: estado actual = commiteado + PASS | Superado; no editado. La recomendación de ese doc sobre políticas no se toca ni se adopta |
| **C-4** | `13-AUDIT/29` | Suite en rojo, `update` "no demostrado" | Descripción correcta para `6c5a207` / run #16; obsoleta para `72e794d` | Histórico válido; superado por doc 30 y este cierre |
| **C-5** | `13-AUDIT/29` (§ "CI") y `09/24` §337 | El CI previo "afirma haber ejecutado un candidato contra un registry que HEAD no contiene" | Consistente con run #16 `failure` en `6c5a207` | Sin contradicción de hecho; solo cambió el estado |
| **C-6** | `09-TRANSFORMATION/11` (línea 47) | `ProductoProveedor → Producto/Proveedor`: `REQUIRES TEST` | Ahora tiene test y ejecución PASS | Clasificación histórica; no editada |
| **C-7** | `09-TRANSFORMATION/20` (filas 19-20) | Clasificación previa `E/E` sin cobertura | Ahora con registro y ejecución | Histórica; no editada |
| **C-8** | `docs/WAPSELL-DOCUMENTATION/` (varias carpetas) | Numeración duplicada: p. ej. `13-AUDIT` tiene cuatro archivos `25`, dos `26`, tres `27`, dos `28`, dos `29` y dos `30`; hay `25`..`39` también en `03-DECISIONS` | La numeración es **por carpeta y por línea de trabajo**, no global | Registrado; este documento toma el siguiente número libre de `09-TRANSFORMATION` (25) |

Adicionales de estado (informativos):
- Los docs `09/20`, `09/23`, `09/24` y `13-AUDIT/27`, `28`, `29`, `30` (de la línea Red Team / auditoría) están **sin versionar en git**, igual que este.
- `docs/WAPSELL-DOCUMENTATION/13-AUDIT/30-RED-TEAM-...` (no versionado) y `30-B4-VERIFICATION-CLOSURE-...` (versionado) comparten número.

## 12. Condiciones para leer correctamente este cierre

1. Es el cierre de **un slice** (`ProductoProveedor → Producto/Proveedor`).
2. VERIFIED aplica solo a `create` y `update` con FK escalar, medido en CI.
3. La evidencia de `P2025` proviene de un probe local del Red Team, no de CI, y los tests no la exigen.
4. PP-04 es order-dependent; no corregido.
5. 89 tests verdes en CI **no** equivalen a ISO-002 verificada globalmente: raw SQL y otras relaciones sin registrar siguen fuera.
6. No hay política de cobertura aprobada; la elección del siguiente slice no queda definida por este documento.

## 13. Procedencia de este documento

Redactado a partir de: `git rev-parse` y `git status`; `gh run list` / `gh run view` de los runs `37227805988` y `37228641927` (log del step del slice del run #16 y log completo del job `111513447138`); `git show 59f2b1c` (spec original); corridas locales propias contra PostgreSQL descartable (PP-04/PP-02 aislados y suite completa, y PP-05/PP-06 aislados sin el registro); y lectura de los docs `09/11`, `09/20`, `09/23`, `09/24`, `13-AUDIT/29` y `13-AUDIT/30`. No se modificó código de producción, tests, workflows ni documentación canónica.
