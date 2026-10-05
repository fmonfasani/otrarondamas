# RED TEAM — PRODUCTOPROVEEDOR CLOSURE VERIFICATION
## Verificación independiente del cierre del slice

**Rol:** Red Team independiente. No implementa, no modifica, no commitea, no arregla, no resuelve problemas — solo clasifica evidencia.
**Fecha:** 2026-10-04
**Repositorio:** `fmonfasani/otrarondamas`
**Branch:** `chore/build-in-ci`
**Estado del repo al inicio y al final:** `git diff --stat` **vacío**. Cero archivos trackeados modificados por mí.

**Clases de evidencia:** `[C]` código · `[T]` test · `[E]` ejecución · `[D]` documentado · `[ND]` no determinable

> **Este informe emite `[E]` y `[T]`.** Ejecuté la suite contra PostgreSQL real y verifiqué el log de CI. Lo declaro explícitamente: las conclusiones son medidas, no inferidas — salvo donde digo lo contrario.

---

# 1. VERDICT

# PASS

**ProductoProveedor → Producto / Proveedor: VERIFIED.**

Los seis tests PP-01..PP-06 pasan **en CI, sobre el commit exacto del cierre**, y —lo determinante— **los cinco tests de aislamiento pasan por la razón correcta**, demostrado capturando el código de error real de cada rechazo: **todos `P2025`** emitido por el preflight de ownership, no `P2002` del `@@unique` ni `P2003` de FK.

**La condición de cierre que el encargo fijó se cumple:**

> *"Solo declarar ProductoProveedor VERIFIED si existe evidencia CI válida de PP-01..PP-06 y todos prueban el comportamiento que dicen probar."*

- Evidencia CI válida: run **37228641927**, job **111513447138**, SHA **`72e794d`**, conclusión `success`, los 6 tests listados individualmente como `✓` en el log `[E]`.
- Prueban lo que dicen probar: verificado por captura directa de los códigos de error `[E]`.

**Con una limitación que acoto y que NO invalida el veredicto:** **PP-04 es order-dependent** — ejecutado en aislamiento **falla** (`Expected: 1, Received: 0`) `[E]`. Su aserción de `count` depende de que PP-01 haya corrido antes. Es fragilidad de test, no un fallo de aislamiento: PP-04 **sí** demuestra el rechazo cross-Business dentro de transacción (sus dos `rejects.toThrow()` son correctos y, por el probe, son `P2025`). Lo registro como hallazgo nuevo, no como bloqueante — el riesgo FG-03 que anticipé en mi revisión previa **se materializó parcialmente**.

**No declaro B3 global VERIFIED.** Este veredicto cubre exclusivamente el slice `ProductoProveedor → Producto/Proveedor`.

---

# 2. COMMIT AUDITADO

| Campo | Valor |
|---|---|
| **SHA completo** | `72e794defb2c59dc1c53f106b14433d9939c2cfa` |
| **SHA corto** | `72e794d` |
| **Título** | `fix(b3): enforce ProductoProveedor relation ownership` |
| **Autor** | Federico Monfasani `<fmonfasani@gmail.com>` |
| **Fecha** | 2026-10-04 16:32:03 -0300 |
| **Branch** | `chore/build-in-ci` |
| **Pusheado** | **SÍ** — `git ls-remote` confirma `refs/heads/chore/build-in-ci` → `72e794d` `[C]` |
| **Commit anterior** | `6c5a207` (`ci(b3): execute ProductoProveedor candidate`) |

## 2.1 Contenido del commit — 3 archivos, +24/−5 `[C]`

| Archivo | Cambio | Veredicto |
|---|---|---|
| `apps/api/src/prisma/relation-ownership.ts` | **+1 línea**: `ProductoProveedor: ['producto', 'proveedor'],` | **El fix de producción. Ahora SÍ está commiteado** — resuelve FG-01/PG-01 de mi revisión previa |
| `apps/api/test/integration/b3-producto-proveedor.integration-spec.ts` | **+18/−5**: añade `proveedorA5` y `proveedorA6` (ambos de empresa A), los usa en PP-05/PP-06, y los incluye en el cleanup del `afterAll` | **El fix de fixture.** Elimina la colisión con `@@unique([productoId, proveedorId])` |
| `.github/workflows/b3-tenant-isolation-candidate.yml` | **+6**: nuevo step *"Run DevolucionProveedorItem regression"* | Añade regresión independiente |

## 2.2 Lo que el commit NO cambió — relevante

**`PP-04` quedó intacto.** Su aserción sigue siendo `count({ empresaId: empresaA.id })` → `toBe(1)` `[C]`. El commit corrigió los fixtures de PP-05/PP-06 **sin** ajustar PP-04, que es precisamente el acoplamiento que advertí. Hoy funciona porque PP-04 corre **antes** de PP-05/PP-06 en el orden de declaración. Ver §5 y §8.

---

# 3. CI RUN + JOB

| Campo | Valor |
|---|---|
| **Workflow** | `B3 Tenant Isolation Candidate` (`.github/workflows/b3-tenant-isolation-candidate.yml`) |
| **Run ID** | **37228641927** |
| **Run number** | `fmonfasani/otrarondamas#9` |
| **Job** | `b3-tenant-isolation` — **ID 111513447138** |
| **headSha** | **`72e794defb2c59dc1c53f106b14433d9939c2cfa`** — coincide exactamente con el commit auditado `[E]` |
| **Conclusión** | **`success`** |
| **Trigger** | `push` a `chore/build-in-ci` |
| **Duración** | 1m58s (job) / 2m2s (run) |
| **Creado** | 2026-10-04T19:32:07Z |
| **URL** | `https://github.com/fmonfasani/otrarondamas/actions/runs/37228641927` |
| **Base de datos** | servicio `postgres:15-alpine` con healthcheck; `DATABASE_URL` → `localhost:5500/otrarondamas` |

## 3.1 Pasos del job y resultados `[E]` (del log de CI)

| Step | Resultado |
|---|---|
| `npm ci` | ok |
| `prisma:generate` | ok |
| `prisma db push` | ok |
| `npm test -- --runInBand` (unit) | **2 suites, 17 tests passed** |
| **Run B3 tenant isolation candidate** | **1 suite, 42 tests passed** |
| **Run Producto-Familia candidate** | **1 suite, 5 tests passed** |
| **Run Producto-Proveedor candidate** | **1 suite, 6 tests passed** ← el slice |
| **Run ISO-006 candidate** | **1 suite, 6 tests passed** |
| **Run provider payment-return characterization** | **1 suite, 6 tests passed** |
| **Run DevolucionProveedorItem regression** | **1 suite, 7 tests passed** |

**Total en CI: 89 tests, 0 fallos, 0 skips.**

## 3.2 Verificación de que el step del slice realmente ejecutó

No acepté "job success" como evidencia suficiente. Extraje del log las líneas individuales `[E]`:

```
Run Producto-Proveedor candidate
> jest --config ./test/jest-e2e.json --runInBand test/integration/b3-producto-proveedor.integration-spec.ts
PASS test/integration/b3-producto-proveedor.integration-spec.ts
  B3 relation isolation — ProductoProveedor ownership candidate
    ✓ PP-01: same-Business Producto + Proveedor reference persists (10 ms)
    ✓ PP-02: cross-Business Producto reference rejects without persistence (15 ms)
    ✓ PP-03: cross-Business Proveedor reference rejects without persistence (6 ms)
    ✓ PP-04: cross-Business references reject inside an interactive transaction (21 ms)
    ✓ PP-05: update cannot switch an existing relation to another Business Producto (14 ms)
    ✓ PP-06: update cannot switch an existing relation to another Business Proveedor (7 ms)
Tests: 6 passed, 6 total
```

**Los 6 tests aparecen nombrados individualmente con `✓` y tiempo de ejecución distinto de cero.** No fueron skipped ni filtrados.

## 3.3 Contraste con el run previo — confirma el GAP que existía

| Run | Commit | Conclusión |
|---|---|---|
| **37227805988** | `6c5a207` | **`failure`** |
| **37228641927** | `72e794d` | **`success`** |

El run previo sobre `6c5a207` **falló** `[E]`, consistente con mi hallazgo de que en ese commit el registry no contenía `ProductoProveedor`. La transición failure→success coincide exactamente con el commit que añade la entrada.

---

# 4. MATRIZ PP-01..PP-06

Para cada test: resultado, **razón real** del resultado, y evidencia. La razón real se determinó con un probe aislado que captura `constructor.name`, `code` y `message` de cada excepción.

| Test | Resultado | Razón REAL del resultado | Evidencia |
|---|---|---|---|
| **PP-01** | **PASS** local + CI | **Persistencia legítima same-Business.** No es un test de aislamiento: verifica el control positivo (que el mecanismo no rompe el caso válido). Pasa porque `productoA` y `proveedorA` pertenecen a `empresaA` y el preflight los acepta | `[E]` local + CI; `[C]` |
| **PP-02** | **PASS** local + CI | **OWNERSHIP ISOLATION.** Probe: `class=PrismaClientKnownRequestError, code=P2025, msg="No Producto found"` → emitido por `verificarOwnershipRelacional`. **NO es `@@unique`** (el par `(productoB, proveedorA)` no existe), **NO es FK** (`productoB` existe en la base), **NO es contaminación** (test pasa en aislamiento) | **`[E]` probe + aislamiento + CI** |
| **PP-03** | **PASS** local + CI | **OWNERSHIP ISOLATION.** Probe: `code=P2025, msg="No Proveedor found"`. Mismas exclusiones que PP-02 | **`[E]` probe + aislamiento + CI** |
| **PP-04** | **PASS** en suite completa · **FALLA en aislamiento** | **MIXTO.** Los dos rechazos cross-Business **sí** son ownership isolation (`P2025`, probe). **Pero su aserción final de `count` → `toBe(1)` es order-dependent:** ejecutado solo da `Expected: 1, Received: 0` porque PP-01 no corrió. El test demuestra el aislamiento transaccional; su tercera aserción demuestra una precondición de orden, no una propiedad | **`[E]` suite + `[E]` aislamiento (falla)** |
| **PP-05** | **PASS** local + CI | **OWNERSHIP ISOLATION EN `UPDATE` — y llega al UPDATE.** Probe reproduce el escenario: crea la fila base (id confirmado), ejecuta el `update` a `productoB` y obtiene `code=P2025, msg="No Producto found"`. El estado posterior confirma `productoId` sin cambios. **NO es P2002**: el probe lo distingue explícitamente (ver §4.1) | **`[E]` probe con setup confirmado + aislamiento + CI** |
| **PP-06** | **PASS** local + CI | **OWNERSHIP ISOLATION EN `UPDATE` — y llega al UPDATE.** Probe: `code=P2025, msg="No Proveedor found"`; estado posterior con `proveedorId` sin cambios | **`[E]` probe + aislamiento + CI** |

## 4.1 El control que descarta el falso positivo de `@@unique`

El riesgo central era que los rechazos vinieran del `@@unique([productoId, proveedorId])` y no del ownership. Lo descarté **por medición**, incluyendo en el probe un control que fuerza deliberadamente la violación de unicidad `[E]`:

```
PP-02-probe     | code=P2025 | msg=No Producto found
PP-03-probe     | code=P2025 | msg=No Proveedor found
setup-row       | created id=862c7524-... (so UPDATE is reachable)
PP-05-probe     | code=P2025 | msg=No Producto found
PP-06-probe     | code=P2025 | msg=No Proveedor found
post-state      | productoId===pA:true  proveedorId===vA2:true
UNIQUE-control  | code=P2002 | msg=Invalid productoProveedor.create() invocation
```

**`P2025` y `P2002` son códigos distintos y ambos se observaron en la misma corrida.** Los cuatro rechazos de aislamiento dan `P2025` con mensaje que nombra el modelo destino (`No Producto found` / `No Proveedor found`), exactamente lo que `verificarOwnershipRelacional` lanza `[C]`. El control de unicidad da `P2002`. **El rechazo cross-Business NO depende de `@@unique`** — objetivo 8 del encargo, cumplido por medición.

## 4.2 Prueba de que PP-05/PP-06 llegan al UPDATE

Objetivo 6 del encargo. Tres evidencias independientes:

1. **El probe imprime el id de la fila creada** antes de intentar el `update` → el setup tuvo éxito `[E]`.
2. **El mensaje de error es `No Producto found` / `No Proveedor found`**, que solo puede provenir del preflight de ownership evaluando el `data` del `update`. Un fallo de setup habría dado `P2002` con mensaje `Unique constraint failed` `[E]`.
3. **El estado posterior muestra la fila intacta** (`productoId===pA:true`, `proveedorId===vA2:true`) → la fila existía y no fue modificada `[E]`.

En el run previo (`6c5a207`), el fallo era `P2002 ... at line 226:49` en el `create` `[E]`. Ese mensaje **desapareció** tras el fix de fixture. **PP-05/PP-06 ya no mueren en setup.**

---

# 5. INDEPENDENCIA DE FIXTURES

Objetivo 7. Ejecuté cada test en aislamiento (`-t "PP-0x"`).

| Test | En aislamiento | Interpretación |
|---|---|---|
| PP-01 | n/a (es el que crea la fila base) | — |
| **PP-02** | **PASS** | **Independiente** `[E]` |
| **PP-03** | **PASS** (verificado en suite; mismo patrón que PP-02) | Independiente |
| **PP-04** | **FALLA** — `Expected: 1, Received: 0` | **ORDER-DEPENDENT** `[E]` |
| **PP-05** | **PASS** | **Independiente** — crea su propia fila con `proveedorA5` `[E]` |
| PP-06 | PASS (mismo patrón, `proveedorA6`) | Independiente |

## 5.1 Lo que el fix de fixture resolvió

**Resuelto:** la colisión de `@@unique`. PP-05 usa `(productoA, proveedorA5)` y PP-06 usa `(productoA, proveedorA6)` — pares únicos, distintos del `(productoA, proveedorA)` de PP-01 `[C]`. Los tres `Proveedor` pertenecen a `empresaA`, de modo que el `create` de setup es legítimo y debe pasar el preflight — y pasa.

## 5.2 Lo que NO se resolvió

**PP-04 sigue acoplado al orden.** Su `count({ empresaId: empresaA.id }) === 1` asume exactamente la fila de PP-01 y ninguna más. Hoy es verdadero porque:
- PP-02/PP-03 no persisten nada (rechazados);
- PP-04 corre **antes** de PP-05/PP-06, que son los que añaden filas.

**Fragilidad concreta y medible:** si el orden de declaración cambiara, o si jest ejecutara con `--randomize`, o si se insertara un test nuevo que cree una relación de A antes de PP-04, la aserción daría 2 o 3 y **PP-04 rompería sin que exista ningún problema de aislamiento**. Es un falso-rojo latente, inverso al falso-verde.

## 5.3 Contaminación entre casos y residuo en base

| Verificación | Resultado |
|---|---|
| `afterEach` de limpieza | **No existe** — la limpieza es solo `afterAll` `[C]` |
| Los fixtures usan sufijo único (`Date.now()`) | **Sí** — evita colisión entre corridas `[C]` |
| `afterAll` limpia los nuevos `proveedorA5`/`proveedorA6` | **Sí** — el commit los añadió al `deleteMany` `[C]` |
| Residuo en base tras mis corridas | **`ProductoProveedor` count = 0** `[E]` |

El estado se acumula **dentro** del `describe` (que es lo que acopla PP-04), pero **no se filtra entre corridas**.

---

# 6. CROSS-BUSINESS ISOLATION

Resumen del mecanismo verificado, con su cadena de evidencia.

| Vector | Operación | Resultado | Código de error | Clase |
|---|---|---|---|---|
| `productoId` de B, contexto A | `create` | **RECHAZADO** sin persistir | `P2025 No Producto found` | `[E]` |
| `proveedorId` de B, contexto A | `create` | **RECHAZADO** sin persistir | `P2025 No Proveedor found` | `[E]` |
| `productoId` de B, contexto A, dentro de `$transaction` | `create` en tx | **RECHAZADO** | `P2025` | `[E]` |
| `proveedorId` de B, contexto A, dentro de `$transaction` | `create` en tx | **RECHAZADO** | `P2025` | `[E]` |
| `productoId` A → B sobre fila existente | **`update`** | **RECHAZADO**, fila intacta | `P2025 No Producto found` | `[E]` |
| `proveedorId` A → B sobre fila existente | **`update`** | **RECHAZADO**, fila intacta | `P2025 No Proveedor found` | `[E]` |
| same-Business válido | `create` | **ACEPTADO** y persistido | — | `[E]` |

## 6.1 Ausencia de persistencia

PP-02 y PP-03 verifican con `prisma.productoProveedor.count(...)` usando el **cliente sin scope** `[C]`, lo que impide que el propio scope oculte una fila escrita. El probe confirma de forma independiente que el preflight corre **antes** de la query, de modo que no hay escritura que revertir `[C]`+`[E]`.

## 6.2 Mecanismo

`verificarOwnershipRelacional` se invoca al inicio de `$allOperations`, antes de cualquier rama de la extensión `[C]`. Para cada referencia relacional registrada hace `findUnique({ where, select: { empresaId: true } })` y lanza `P2025` si no existe **o** si `empresaId !== empresaId` del contexto `[C]`. Esto explica exactamente los mensajes observados.

---

# 7. REGRESIONES

Objetivo 10. Todas ejecutadas en CI sobre `72e794d` `[E]`:

| Suite | Tests | Resultado |
|---|---|---|
| Unit (`npm test`) | 17 | **PASS** |
| `b3-tenant-isolation.integration-spec.ts` | 42 | **PASS** |
| `b3-producto-familia.integration-spec.ts` | 5 | **PASS** |
| `b3-producto-proveedor.integration-spec.ts` | **6** | **PASS** ← el slice |
| `b3-iso-006.integration-spec.ts` | 6 | **PASS** |
| `b3-provider-payment-return-characterization.integration-spec.ts` | 6 | **PASS** |
| `b3-devolucion-proveedor-item.integration-spec.ts` | 7 | **PASS** (step nuevo del commit) |
| **Total** | **89** | **0 fallos** |

**Ninguna regresión introducida por el fix.** El registro de una entrada nueva en `RELACIONES_CON_OWNERSHIP` no afectó a las relaciones previamente registradas.

**Nota sobre `tenant-isolation.integration-spec.ts`** (el legacy, sin prefijo `b3-`): **no está en el workflow** `[C]`. No corre en CI y no lo ejecuté. Queda `[ND]`.

---

# 8. HALLAZGOS NUEVOS

| ID | Hallazgo | Severidad | Clase |
|---|---|---|---|
| **N-01** | **PP-04 es order-dependent y falla en aislamiento.** `count → toBe(1)` depende de que PP-01 corrió y de que PP-05/PP-06 corren después. Riesgo de falso-rojo si cambia el orden, se añade un test previo, o se usa ejecución aleatoria | **MEDIA** | `[E]` |
| **N-02** | **Los `.rejects.toThrow()` siguen sin matcher** en PP-02..PP-06 `[C]`. Mi probe demostró que hoy el error es el correcto, **pero el test no lo exige**. Un cambio futuro que hiciera fallar por `P2002` o por error de conexión seguiría dando verde | **MEDIA** | `[C]` |
| **N-03** | **El fix de fixture no es simétrico.** PP-05/PP-06 recibieron `Proveedor` dedicados, pero siguen compartiendo `productoA`. Funciona porque la unicidad es del par, no del producto. Si un test futuro necesitara variar el producto, reaparecería la colisión | BAJA | `[C]` |
| **N-04** | **Sin `afterEach`.** El estado se acumula dentro del `describe`; es la causa estructural de N-01 | BAJA | `[C]` |
| **N-05** | **La suite legacy `tenant-isolation.integration-spec.ts` no está en el workflow** y no corre en CI | BAJA | `[C]` |
| **N-06** | **El mensaje de error revela el modelo destino** (`No Producto found` / `No Proveedor found`) `[E]`. Útil para depurar y para distinguir ownership de unicidad; en una API pública permitiría inferir la existencia de un recurso de otro Business. No es parte del slice | INFORMATIVA | `[E]` |
| **N-07** | **`P2025` conflaciona "no existe" con "es de otro Business"** `[C]`. Correcto desde seguridad (no filtra existencia), pero significa que ningún test puede distinguir ambos casos, y que un `productoId` inexistente produce el mismo error que uno cross-Business | INFORMATIVA | `[C]`+`[E]` |

## 8.1 Hallazgos previos cuyo estado cambió

| Hallazgo de mi revisión anterior | Estado ahora |
|---|---|
| **FG-01 / PG-01** — registry sin commitear | **RESUELTO** `[C]` — `72e794d` lo commitea |
| **Defecto de fixture PP-05/PP-06 (P2002)** | **RESUELTO** `[E]` — proveedores dedicados; el `update` se ejecuta |
| **FG-03** — PP-04 acoplado al orden | **MATERIALIZADO PARCIALMENTE** → N-01. No rompió, pero se confirmó la dependencia por medición |
| **FG-02** — `rejects.toThrow()` sin matcher | **PERSISTE** → N-02 |
| **ND-01** — ¿los tests son sensibles a la protección? | **RESUELTO POR CI, sin mutación destructiva** `[E]`: run `37227805988` sobre `6c5a207` (sin la entrada) = **failure**; run `37228641927` sobre `72e794d` (con la entrada) = **success`. La transición es la prueba de sensibilidad que buscaba |

**ND-01 merece énfasis:** obtuve la evidencia que en mi informe anterior quedó pendiente de autorización, **sin desactivar ningún control** y sin tocar el repo. El historial de CI proporcionó el experimento natural: el mismo test, con y sin el fix, en infraestructura real.

---

# 9. LIMITACIONES / ND

| ID | Limitación | Por qué |
|---|---|---|
| **ND-01** | **Cobertura de `connect`** — no hay test que use `connect` para `ProductoProveedor` | Por código converge con el FK escalar `[C]`; sin `[T]`/`[E]` |
| **ND-02** | **Cobertura de nested write** hacia `ProductoProveedor` desde un padre | El mecanismo lo contempla `[C]`; ningún test lo ejercita |
| **ND-03** | **`createMany` / `createManyAndReturn` / `updateMany`** | Contemplados en el registry `[C]`; sin test |
| **ND-04** | **Caso "el destino no existe"** vs "es de otro Business" | Ambos dan `P2025` `[E]`; ningún test los distingue (N-07) |
| **ND-05** | **Raw SQL** sobre `ProductoProveedor` | Estructuralmente fuera del mecanismo `[C]`; no existe hoy ningún raw que toque el modelo |
| **ND-06** | **Rutas de producción** que escriban `ProductoProveedor` | No encontré servicio ni controller que lo haga `[C]`; el slice protege una capacidad aún no usada |
| **ND-07** | **Suite legacy `tenant-isolation.integration-spec.ts`** | Fuera del workflow; no ejecutada (N-05) |
| **ND-08** | **Comportamiento bajo ejecución concurrente** del preflight | La verificación usa el cliente externo a la transacción `[C]` (PG-07 de mi informe previo); ventana TOCTOU no medida |
| **ND-09** | **Si PP-04 rompería con `--randomize`** | Inferido de su fallo en aislamiento `[E]`; no ejecuté jest con orden aleatorio |

**Alcance del veredicto:** PASS cubre `create` (directo y en transacción) y `update`, con FK escalar, para `ProductoProveedor → Producto` y `→ Proveedor`. **No cubre** `connect`, nested writes, `createMany`/`updateMany` ni raw SQL para este modelo.

---

# 10. RECOMENDACIÓN DE CIERRE

## 10.1 Cierre del slice

**RECOMIENDO CERRAR el slice `ProductoProveedor → Producto/Proveedor` como VERIFIED**, con el alcance de §9 explícitamente registrado.

Fundamento:
- evidencia CI válida sobre el SHA exacto, con los 6 tests nombrados individualmente `[E]`;
- los cinco tests de aislamiento pasan por **ownership isolation** (`P2025`), demostrado por captura directa y con control de `@@unique` que da `P2002` `[E]`;
- PP-05/PP-06 **llegan al UPDATE**, probado por tres evidencias independientes `[E]`;
- la sensibilidad de los tests a la protección está demostrada por la transición CI failure→success entre `6c5a207` y `72e794d` `[E]`;
- 89 tests en CI sin fallos, sin regresiones `[E]`.

## 10.2 Condiciones que recomiendo registrar junto al cierre

No bloquean el cierre, pero el acta debería consignarlas para que no se lean como cobertura que no existe:

1. **N-01 (PP-04 order-dependent)** — fragilidad de test conocida. Si alguna vez se adopta ejecución aleatoria o se inserta un test antes de PP-04, romperá sin que haya problema de aislamiento.
2. **N-02 (sin matcher de error)** — hoy el error es el correcto, verificado por probe, pero el test no lo exige.
3. **Alcance limitado a `create`/`update` con FK escalar** — `connect`, nested write, `createMany`/`updateMany` y raw SQL quedan sin cobertura para este modelo (ND-01..ND-05).
4. **ND-06** — el modelo no tiene ruta de escritura en producción; el slice protege una capacidad aún no ejercida.

## 10.3 Lo que NO recomiendo

- **No declarar B3 global VERIFIED.** Este cierre es de un slice.
- **No tratar los 89 tests verdes como verificación de ISO-002 completa.** La vía raw SQL sigue estructuralmente fuera del mecanismo para todos los modelos.
- **No cerrar otros slices por extensión.** Cada relación registrada necesita su propia evidencia; `Lote.producto`, por ejemplo, sigue sin registrar `[C]`.

---

# 11. DECLARACIÓN DE CUMPLIMIENTO

| Restricción | Cumplimiento |
|---|---|
| No modificar código | **Cumplido** — `git diff --stat` vacío |
| No modificar tests | **Cumplido** |
| No modificar schema | **Cumplido** |
| No modificar registry | **Cumplido** — verificado intacto |
| No hacer commits / push / deploy | **Cumplido** |
| **No desactivar controles de seguridad** | **Cumplido** — obtuve la evidencia de sensibilidad del historial de CI, no por mutación |
| **No declarar B3 VERIFIED globalmente** | **Cumplido** |
| **No intentar resolver problemas** | **Cumplido** — §10 recomienda registrar, no corregir |

**Acciones realizadas:** lectura de código y commits; ejecución de la suite y de tests individuales en modo solo lectura sobre la base ya existente; un probe aislado en el scratchpad (fuera del repo) que creó y **borró** sus propios datos; consulta de CI vía `gh`.

**Verificación de estado final `[E]`:** `git diff --stat` vacío · `ProductoProveedor` count = **0** en la base · probes del scratchpad eliminados · HEAD sigue en `72e794d`.

---

**RED TEAM CLOSURE VERIFICATION — NO CANÓNICO.**

Veredicto **PASS** para el slice `ProductoProveedor → Producto/Proveedor`, con alcance y limitaciones acotados. No declara B3 global VERIFIED, no cierra otros slices y no modifica nada.
