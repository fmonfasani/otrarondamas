# RED TEAM — PRODUCTO.SUBFAMILIA → SUBFAMILIA
## Revisión adversarial del slice

**Rol:** Red Team independiente. No modifica código ni hace commits.
**Fecha:** 2026-10-05
**Repositorio:** `fmonfasani/otrarondamas` · branch `chore/build-in-ci`
**Commit auditado:** **`a3e062908f39e49299520ae4ce937503c60c070b`** (`a3e0629`) — *"fix(b3): enforce Producto.subfamilia relation ownership"*
**CI:** run **37249161283**, job `b3-tenant-isolation`, `headSha` = `a3e0629`, conclusión **`success`**

**Clases de evidencia:** `[C]` código · `[T]` test · `[E]` ejecución · `[D]` documentado · `[ND]` no determinable

> Este informe emite `[E]`: ejecuté la batería de ataques contra PostgreSQL real, corrí la suite completa, probé cada test en aislamiento y realicé una **prueba de sensibilidad reversible**. Los datos creados fueron eliminados (residuo verificado = 0).

---

# 0. VEREDICTO

# PASS

**`Producto.subfamilia → Subfamilia`: el aislamiento está demostrado y los tests prueban lo que dicen probar.**

Los ocho objetivos del encargo se ejecutaron. Los cinco rechazos cross-Business son **`P2025` del preflight de ownership**, no `P2002` ni `P2003`, y lo verifiqué de tres formas independientes: con una batería de ataques propia, con el control deliberado del propio spec (SP-08), y con una **prueba de sensibilidad** que demuestra que sin la protección 5 de 8 tests caen.

**Es el slice mejor construido de los tres que he auditado.** A diferencia de `ProductoProveedor` —que entregué en FAIL por fixtures colisionando y `update` no demostrado— este spec asserta **códigos de error explícitos**, incluye **control de P2002**, usa `codigoInterno` único por test y **los 8 tests son independientes**.

**Con dos limitaciones acotadas que no invalidan el PASS** (§7): la protección del árbol de catálogo sigue **incompleta** (`tipo` y `subtipo` quedan sin registrar y el GAP es explotable), y `verificarJerarquia` se confirma como **defensa de call site, no garantía equivalente** — aunque en este caso el registry ya cubre la capacidad.

**No declaro B3 VERIFIED globalmente.** Este veredicto cubre exclusivamente `Producto.subfamilia`.

---

# 1. NOTA DE CONCURRENCIA — relevante para interpretar la evidencia

Cuando inicié la auditoría, HEAD era `2e0c3ee` y `Producto` figuraba como `['familia']` **solo** `[C]`. Mi primera batería de ataques se ejecutó contra un árbol de trabajo donde Claude 1 **ya había escrito** `'subfamilia'` sin commitear.

Secuencia verificada:

| Momento | Estado |
|---|---|
| Inicio | HEAD `2e0c3ee`; registry en HEAD = `['familia']`; working tree = `['familia','subfamilia']` **sin commitear** `[C]` |
| Durante mi batería | los ataques rechazaron → estaba midiendo el fix no commiteado |
| Al momento del informe | **commiteado como `a3e0629`**, con registry + spec + paso de CI, y CI `success` `[E]` |

**Por qué lo registro:** en el slice `ProductoProveedor` el defecto principal fue precisamente que la protección vivía sin commitear mientras el commit afirmaba haber ejecutado el candidate. **Aquí ese problema no se materializó** — el commit `a3e0629` incluye los tres artefactos juntos. Pero mi evidencia intermedia proviene de ambos estados, y conviene que quede dicho.

---

# 2. OBJETIVO 1 — BASELINE CROSS-BUSINESS

**El baseline previo al fix está confirmado**, medido en mi informe anterior (31) sobre HEAD `72e794d`, cuando `Producto.subfamilia` no estaba registrada `[E]`:

```
ATTACK 2: Producto.subfamilia/tipo/subtipo cross-Business (NOT registered)
  ACCEPTED -> producto(A) with subfamilia/tipo/subtipo of B  *** GAP CONFIRMED ***
```

**Y la prueba de sensibilidad de §6 lo reconfirma de forma más precisa** sobre el código actual: con el registry en estado HEAD (`['familia']`), SP-02..SP-06 fallan con `Received: "RESOLVED"` — es decir, **la escritura cross-Business tiene éxito** `[E]`.

El GAP era real, era explotable y está cerrado.

---

# 3. OBJETIVO 2 — ¿LLEGA REALMENTE AL PREFLIGHT?

No lo asumí: invoqué el colector directamente `[E]`.

```
registry Producto = ["familia","subfamilia"]
refs collected    = [{"modelo":"Familia","where":{"id":"e182dd4a-…"}},
                     {"modelo":"Subfamilia","where":{"id":"9a4427a2-…"}}]
=> subfamiliaId reaches preflight? true
```

**`subfamiliaId` se recoge como `ReferenciaRelacional` hacia `Subfamilia`** y pasa a `verificarOwnershipRelacional`, que hace `findUnique({where, select:{empresaId:true}})` y lanza `P2025` si no existe **o** si el `empresaId` no coincide `[C]`.

**Confirmado:** la relación no solo está en el registry — el payload efectivamente la alcanza.

---

# 4. OBJETIVO 3 — ¿SE PUEDE ESCONDER `P2025` DETRÁS DE `P2002`?

Este era el riesgo central. `Producto` tiene `@@unique([empresaId, codigoInterno])` `[C]`, de modo que un `create` duplicado produce `P2002` — exactamente el error que hundió PP-05/PP-06 en el slice anterior.

**Intenté el enmascaramiento:** creé un `Producto` y repetí el mismo `codigoInterno` **con `subfamiliaId` de B**, para que ambas violaciones compitieran `[E]`:

```
### OBJ-3: can P2002 HIDE a would-be P2025? ###
  code=P2025 msg="No Subfamilia found"
```

**El ownership gana.** Y es correcto por construcción: el preflight corre **antes** de la query (`empresa-scope.extension.ts:154-157`) `[C]`, así que `P2002` no puede precederlo.

**El spec se defiende de esto por sí mismo**, y es lo que más lo distingue:

| Mecanismo del spec | Efecto |
|---|---|
| `codigoDeRechazo()` devuelve `error.code` y lo compara con `'P2025'` exacto | Un `P2002` **haría fallar** el test, no pasarlo |
| Devuelve `'RESOLVED'` si la operación no lanza | Una operación aceptada **falla** el test en vez de pasar silenciosamente |
| **SP-08** es un control explícito: duplicar `codigoInterno` **debe** dar `P2002` | Demuestra que ambos códigos son distinguibles en la misma suite |
| Cada test usa su propio `codigoInterno` (`B3SP-0x-<timestamp>-<n>`) | Imposible la colisión accidental que rompió PP-05/PP-06 |

**Veredicto del objetivo 3: el enmascaramiento es imposible aquí**, tanto por el orden del mecanismo como por el diseño del spec.

---

# 5. OBJETIVO 4 — CREATE / UPDATE / TRANSACTION AISLADAMENTE

Mi batería propia, sobre el cliente scoped, sin pasar por ningún servicio `[E]`:

| Forma | Resultado | Código |
|---|---|---|
| `create` con `subfamiliaId` de B | **RECHAZADO** | `P2025 No Subfamilia found` |
| `update` cambiando `subfamiliaId` a B | **RECHAZADO** | `P2025 No Subfamilia found` |
| `create` cross-Business **dentro** de `$transaction` | **RECHAZADO** | `P2025 No Subfamilia found` |
| control: `familia` de B (ya registrada) | **RECHAZADO** | `P2025 No Familia found` |
| control: duplicado same-Business | **RECHAZADO** | `P2002` |

**Estado posterior verificado** `[E]`:
```
Producto(A)=1 | of which subfamilia=B -> 0 | Producto(B)=0
B's Subfamilia row untouched? true
```

Cero filas cruzadas persistidas, y la `Subfamilia` de B intacta.

## 5.1 Cobertura del spec, por forma

| Forma | Test | Mi verificación independiente |
|---|---|---|
| `create` same-Business (positivo) | SP-01 | ✅ |
| `create` cross-Business | SP-02 | ✅ `P2025` |
| `update` cross-Business + estado preservado | SP-03 | ✅ `P2025` |
| **rollback**: la fila válida de la misma tx no persiste | SP-04 | ✅ |
| **`createMany` mixto** sin persistencia parcial | SP-05 | ✅ (forma que no probé por mi cuenta) |
| **destino inexistente** falla cerrado | SP-06 | ✅ `P2025` |
| `create` same-Business dentro de tx (positivo) | SP-07 | ✅ |
| control `P2002` | SP-08 | ✅ |

**El spec cubre dos formas que yo no ataqué** (`createMany` mixto y rollback transaccional) y **ambas son relevantes**: `createMany` es una ruta que el colector maneja por separado (`case 'createMany'`), y el rollback es la propiedad que ningún spec previo verificaba.

---

# 6. PRUEBA DE SENSIBILIDAD — ¿el verde depende de la protección?

Este es el punto donde en auditorías anteriores quedé en `[ND]`: la prueba de mutación destructiva estaba —correctamente— bloqueada.

**Aquí la obtuve sin desactivar ningún control y de forma completamente reversible:** la entrada estaba sin commitear, así que usé `git stash push` sobre ese único archivo para dejar el registry en su estado de HEAD (`['familia']`), corrí la suite, y restauré con `git stash pop` inmediatamente.

**Resultado sin la protección** `[E]`:

```
√ SP-01  (positivo, no discrimina)
× SP-02  Expected: "P2025"  Received: "RESOLVED"
× SP-03  Expected: "P2025"  Received: "RESOLVED"
× SP-04  Expected: "P2025"  Received: "RESOLVED"
× SP-05  Expected: "P2025"  Received: "RESOLVED"
× SP-06  Expected: "P2025"  Received: "P2003"
√ SP-07  (positivo)
√ SP-08  (control P2002)

Tests: 5 failed, 3 passed, 8 total
```

**Conclusión: los tests son sensibles a la protección.** Los cinco tests de aislamiento caen, y caen con `"RESOLVED"` — prueba directa de que la escritura cross-Business **se completa** cuando el registry no la cubre. **No hay falso verde.**

**Detalle revelador:** SP-06 (destino inexistente) pasa de `P2025` a **`P2003`** — violación de FK de la base. Sin el preflight, la última línea de defensa es la integridad referencial de PostgreSQL, que detecta "no existe" pero **no** detecta "existe y es de otro Business". Es exactamente la insuficiencia que `ISO-002` enuncia, medida.

**Restauración verificada:** registry de vuelta en `['familia','subfamilia']`; el stash que queda en la lista es preexistente y de otra branch (`main`), no mío.

---

# 7. OBJETIVO 5 — ¿`verificarJerarquia` ES GARANTÍA EQUIVALENTE O DEFENSA DE CALL SITE?

**Respuesta: defensa de call site. NO es garantía equivalente.** Y es el hallazgo conceptual del informe.

## 7.1 Lo que hace mejor que el registry

`verificarJerarquia` (`catalogo.controller.ts:163-183`) `[C]`:
- verifica que los 4 niveles **existan** y pertenezcan a la empresa (cliente scoped);
- verifica el **encadenamiento** `Subtipo→Tipo→Subfamilia→Familia`, que el registry **no** comprueba;
- en `update` se completa con los valores existentes cuando el body es parcial (`:145-150`), de modo que la jerarquía se valida siempre completa;
- guarda **ambos** write paths de `Producto` — verificado: solo existen `:125` (create) y `:153` (update) `[C]`.

## 7.2 Por qué no es garantía equivalente

**Probado en el informe 31** `[E]`: con la relación sin registrar, un `producto.create` con `subfamiliaId` de B **era aceptado** invocando el cliente scoped directamente, sin pasar por el controller. La defensa protegía la **ruta**, no la **capacidad**.

**Esto es exactamente lo que `ISO-008` enuncia** (las obligaciones de aislamiento son independientes de la vía de ejecución) y lo que la coverage policy no resuelve: si una validación compensatoria **exime** del registry o lo **complementa**.

## 7.3 Consecuencia práctica, hoy

Tras `a3e0629`, `Producto.subfamilia` tiene **dos** defensas: `verificarJerarquia` (ruta) + registry (capacidad). **Son complementarias, no redundantes** — el registry cubre lo que la validación de ruta no puede, y la jerarquía cubre el encadenamiento que el registry no verifica.

**Pregunta abierta que no resuelvo:** si `verificarJerarquia` debe conservarse como defensa en profundidad. El documento 24 ya lo registra como `ND-4`. **No tomo esa decisión.**

---

# 8. OBJETIVOS 6 Y 7 — OTRO WRITE PATH Y BYPASS CON CLIENTE SCOPED

## 8.1 Objetivo 6 — otro write path

Enumeración exhaustiva de escrituras de `Producto` en `apps/api/src` `[C]`:

```
catalogo.controller.ts:125   db.producto.create({ data })      ← guardado por verificarJerarquia (:95)
catalogo.controller.ts:153   db.producto.update({ where, data }) ← guardado por verificarJerarquia (:145)
```

**Cero `upsert`, cero `createMany`, cero escrituras desde otro módulo.** `Producto` tiene la superficie de escritura más acotada de los modelos auditados.

**Pero la superficie de *capacidad* es mayor que la de ruta:** el cliente scoped expone `createMany`/`createManyAndReturn`/`upsert` aunque ningún servicio los use. El spec cubre `createMany` (SP-05), que es la forma con manejo propio en el colector. `upsert` **falla cerrado** por `ISO-007` (la extensión lo rechaza) `[C]`.

## 8.2 Objetivo 7 — bypass con cliente scoped

**Intentado y fallido** `[E]`. Toda mi batería usó `prisma.$extends(empresaScopeExtension(eA.id))` directamente — sin controller, sin servicio, sin `verificarJerarquia` — y las cuatro formas fueron rechazadas con `P2025`. **El registry protege la capacidad, no solo la ruta.**

Vía **no cubierta** por ninguna política de registry: el raw SQL. Verificado que la única superficie raw de negocio (`inventario.service.ts:266`) toca `Lote.cantidad`/`updatedAt` y **no** escribe `Producto` ni ningún FK `[C]`. Pertenece a `T01-06`, fuera de este slice.

---

# 9. OBJETIVO 8 — ESTADO POSTERIOR

Verificado en tres niveles `[E]`:

| Verificación | Resultado |
|---|---|
| Filas cruzadas persistidas tras mis ataques | **0** (`Producto(A)` con `subfamilia=B` → 0) |
| `Subfamilia` de B alterada | **No** (`empresaId` sigue siendo B) |
| Aserciones de estado del propio spec | SP-02/05/06 cuentan 0 con cliente **sin scope**; SP-03 relee el `subfamiliaId`; SP-04 cuenta 0 para ambos códigos |
| Residuo en base tras toda la auditoría | **0 filas** (`Producto`/`Empresa` con prefijos de test) |

**El spec verifica la ausencia de persistencia con el cliente sin scope**, lo que evita que el propio scope oculte una fila escrita. Es la forma correcta.

---

# 10. INDEPENDENCIA DE FIXTURES

Ejecuté los 8 tests **uno por uno** en aislamiento `[E]`:

```
SP-01 → 1 passed    SP-05 → 1 passed
SP-02 → 1 passed    SP-06 → 1 passed
SP-03 → 1 passed    SP-07 → 1 passed
SP-04 → 1 passed    SP-08 → 1 passed
```

**Los 8 son independientes.** Es una mejora medible sobre `ProductoProveedor`, donde PP-04 **fallaba** en aislamiento (`Expected: 1, Received: 0`) por depender de PP-01.

Causa estructural de la mejora `[C]`: cada test genera su propio `codigoInterno` y **ninguna aserción usa un conteo global** — las cuentas se filtran por `codigoInterno`, no por `empresaId`. El comentario del spec lo declara explícitamente (*"Cada test pide su propio codigoInterno: ningún test depende de filas de otro"*).

---

# 11. EVIDENCIA DE CI

No acepté el verde automáticamente: extraje las líneas individuales del log `[E]`.

| Campo | Valor |
|---|---|
| Run | **37249161283** |
| Job | `b3-tenant-isolation` |
| `headSha` | **`a3e062908f39e49299520ae4ce937503c60c070b`** — coincide con el commit auditado |
| Conclusión | **`success`** |
| URL | `https://github.com/fmonfasani/otrarondamas/actions/runs/37249161283` |

```
Run Producto-Subfamilia candidate
  ✓ SP-01: same-Business Subfamilia reference persists (7 ms)
  ✓ SP-02: cross-Business Subfamilia create rejects with P2025 and no persistence (3 ms)
  ✓ SP-03: cross-Business Subfamilia update rejects with P2025 and preserves the relation (4 ms)
  ✓ SP-04: rejected cross-Business create rolls back the valid Producto of the same transaction (15 ms)
  ✓ SP-05: mixed createMany rejects with P2025 without partial persistence (8 ms)
  ✓ SP-06: nonexistent Subfamilia fails closed with P2025 and no persistence (3 ms)
  ✓ SP-07: same-Business Subfamilia reference commits inside an interactive transaction (5 ms)
  ✓ SP-08: control — a duplicate codigoInterno is P2002, distinguishable from the ownership rejection (15 ms)
Tests: 8 passed, 8 total
```

**Los 8 aparecen nombrados con tiempo distinto de cero.** No fueron skipped ni filtrados.

## 11.1 Regresiones en el mismo run

| Suite | Tests | Resultado |
|---|---|---|
| Unit | 17 | PASS |
| `b3-tenant-isolation` | 42 | PASS |
| `Producto-Familia` | 5 | PASS |
| `Producto-Proveedor` | 6 | PASS |
| `Lote-Producto` | 8 | PASS |
| **`Producto-Subfamilia`** | **8** | **PASS** |
| `ISO-006` | 6 | PASS |
| `provider payment-return` | 6 | PASS |
| `DevolucionProveedorItem` | 7 | PASS |
| **Total** | **105** | **0 fallos** |

**Ninguna regresión.** Registrar `subfamilia` no afectó a las relaciones previas.

**Observación menor del log:** el `DETAIL: Key ("empresaId","codigoInterno")=… already exists` que aparece al detener los contenedores es el `P2002` **esperado** de SP-08, no un error del run.

---

# 12. LIMITACIONES

| ID | Limitación | Severidad | Clase |
|---|---|---|---|
| **L-01** | **El árbol de catálogo sigue incompleto.** `Producto.tipo` y `Producto.subtipo` **no están registradas**; el GAP cross-Business sobre ellas sigue siendo explotable por el cliente scoped (probado en informe 31 `[E]`). La protección es ahora 2 de 4 ramas | **ALTA** | `[C]`+`[E]` |
| **L-02** | **`verificarJerarquia` es defensa de ruta, no de capacidad** (§7). Mientras `tipo`/`subtipo` no se registren, su única defensa es el controller | **ALTA** | `[E]` |
| **L-03** | `upsert` no se prueba — falla cerrado por `ISO-007`, no por el registry. Correcto, pero sin test en este spec | BAJA | `[C]` |
| **L-04** | `connect` no se prueba. Por código converge con el FK escalar (`referenciasDeConnect`), sin `[T]`/`[E]` | MEDIA | `[C]` |
| **L-05** | Nested write hacia `Producto` desde un padre no se prueba. No existe tal ruta hoy | BAJA | `[C]` |
| **L-06** | El preflight consulta con el cliente **externo** a la transacción (`client`, no `tx`) `[C]`. Inocuo aquí porque `Subfamilia` es siempre preexistente; relevante para relaciones con destino creado en la misma tx | MEDIA (no de este slice) | `[C]`+`[E]` |
| **L-07** | `P2025` conflaciona "no existe" con "es de otro Business". SP-02 y SP-06 esperan el mismo código por causas distintas. Correcto desde seguridad (no filtra existencia), pero ningún test puede distinguirlas | INFORMATIVA | `[E]` |

**Ninguna limitación invalida el PASS:** todas son de alcance (qué queda fuera del slice) o informativas, no defectos del slice auditado.

---

# 13. COMPARATIVA CON LOS SLICES ANTERIORES

Lo incluyo porque muestra una mejora de método medible.

| Criterio | ProductoProveedor (informe 29/30) | **Producto.subfamilia** |
|---|---|---|
| Veredicto inicial | **FAIL** (fixtures colisionando) | **PASS** |
| Aserción de código de error | ❌ `rejects.toThrow()` sin matcher | ✅ `expect(codigo).toBe('P2025')` |
| Control de `P2002` | ❌ ninguno | ✅ **SP-08 explícito** |
| Independencia de tests | ❌ PP-04 falla en aislamiento | ✅ **8/8 independientes** |
| Aserciones de conteo global | ❌ `count({empresaId}) → toBe(1)` | ✅ filtradas por `codigoInterno` |
| Rollback transaccional | ❌ no cubierto | ✅ **SP-04** |
| `createMany` | ❌ no cubierto | ✅ **SP-05** |
| Destino inexistente | ❌ no cubierto | ✅ **SP-06** |
| Registry commiteado con el spec | ❌ sin commitear | ✅ **`a3e0629` los lleva juntos** |
| Sensibilidad medida | `[ND]` (mutación bloqueada) | ✅ **`[E]` vía stash reversible** |

**Los defectos que reporté en el slice anterior fueron corregidos en este.** Los ocho riesgos que listé en el informe 31 §5.2 están todos cubiertos o explícitamente fuera de alcance.

---

# 14. HECHOS VERIFICADOS

## `[E]` — por ejecución

| Ref | Hecho |
|---|---|
| E-01 | `subfamiliaId` **alcanza el preflight**: el colector devuelve `{modelo:'Subfamilia'}` |
| E-02 | `create` cross-Business → **`P2025 No Subfamilia found`** |
| E-03 | `update` cross-Business → **`P2025`**, relación preservada |
| E-04 | `create` cross-Business en `$transaction` → **`P2025`** |
| E-05 | Intento de enmascaramiento (`codigoInterno` duplicado + `subfamilia` de B) → **gana `P2025`** |
| E-06 | Control: duplicado same-Business → **`P2002`**, distinguible |
| E-07 | Control: `familia` (registrada) cross-Business → `P2025 No Familia found` |
| E-08 | Estado posterior: **0** filas cruzadas; `Subfamilia` de B intacta |
| E-09 | Suite completa local: **8/8 PASS** |
| E-10 | **Los 8 tests pasan en aislamiento** individual |
| E-11 | **Sensibilidad: sin la protección, 5 de 8 fallan** con `Received: "RESOLVED"` |
| E-12 | Sin protección, SP-06 degrada a **`P2003`** (FK de la base) |
| E-13 | CI run **37249161283** = `success` sobre SHA `a3e0629`, los 8 SP nombrados individualmente |
| E-14 | **105 tests en CI, 0 fallos** |
| E-15 | Residuo en base tras la auditoría: **0** |

## `[C]` — por código

| Ref | Hecho |
|---|---|
| C-01 | `a3e0629` incluye registry + spec (208 líneas) + paso de CI + doc |
| C-02 | Registry: `Producto: ['familia','subfamilia']`; **`tipo` y `subtipo` ausentes** |
| C-03 | El preflight corre **antes** de la query (`:154-157`) → `P2002` no puede precederlo |
| C-04 | `Producto` tiene `@@unique([empresaId, codigoInterno])` — superficie de `P2002` |
| C-05 | `Subfamilia` tiene `@@unique([familiaId,nombre])` y `([familiaId,prefijo])` — no interfieren |
| C-06 | `codigoDeRechazo()` compara el `code` exacto y devuelve `'RESOLVED'` si no lanza |
| C-07 | Cada test genera su propio `codigoInterno`; ninguna aserción usa conteo global |
| C-08 | **Solo 2 write paths** de `Producto`, ambos guardados por `verificarJerarquia` |
| C-09 | `verificarJerarquia` valida existencia, pertenencia **y encadenamiento**; completa en `update` parcial |
| C-10 | El preflight recibe `client`, no `tx` |
| C-11 | Raw SQL no escribe `Producto` ni FKs |
| C-12 | Antes de `a3e0629`, `'subfamilia'` estaba sin commitear (§1) |

## `[ND]` — no determinable

| Ref | Ítem |
|---|---|
| ND-01 | Si `verificarJerarquia` debe conservarse como defensa en profundidad (doc 24 `ND-4`) |
| ND-02 | Cobertura de `connect` (converge por código, sin test) |
| ND-03 | Si existen rutas no inspeccionadas que escriban `Producto` fuera de `apps/api/src` |
| ND-04 | Cuándo se registrarán `tipo` y `subtipo` |

---

# 15. VEREDICTO FINAL

# PASS

**`Producto.subfamilia → Subfamilia` queda demostrado.** Los ocho objetivos del encargo se ejecutaron:

1. ✅ Baseline cross-Business confirmado (y reconfirmado por la prueba de sensibilidad).
2. ✅ El candidate **llega** al preflight de ownership — verificado invocando el colector.
3. ✅ **Imposible** esconder `P2025` detrás de `P2002` — por orden del mecanismo y por diseño del spec.
4. ✅ `create`, `update` y `transaction` probados aisladamente, más `createMany`, rollback y destino inexistente.
5. ✅ `verificarJerarquia` **NO es garantía equivalente** — es defensa de call site; ahora complementaria al registry.
6. ✅ Solo 2 write paths, ambos guardados; sin otra ruta.
7. ✅ Bypass con cliente scoped **intentado y fallido**.
8. ✅ Estado posterior verificado; cero filas cruzadas; cero residuo.

**No asumí el verde:** lo sometí a una prueba de sensibilidad que demuestra que 5 de 8 tests caen sin la protección, con las escrituras cross-Business completándose. **El verde es real y es sensible.**

**El PASS se emite con las limitaciones de §12**, de las cuales dos merecen seguimiento y **no son defectos de este slice**: el árbol de catálogo está protegido en 2 de 4 ramas (`tipo` y `subtipo` siguen explotables), y la relación entre registry y validación compensatoria sigue sin definirse en la policy.

**No declaro B3 VERIFIED globalmente. No tomo decisiones arquitectónicas.**

---

# 16. DECLARACIÓN DE CUMPLIMIENTO

| Restricción | Cumplimiento |
|---|---|
| No modificar código | **Cumplido** — ningún archivo modificado por mí; el `git stash push`/`pop` de la prueba de sensibilidad es **reversible** y restauró el archivo a su estado exacto, verificado por lectura directa |
| No commit / push | **Cumplido** |
| No asumir PASS automáticamente | **Cumplido** — prueba de sensibilidad, batería propia, aislamiento test por test y extracción del log de CI |
| No modificar nada | **Cumplido** — estado final: registry en `['familia','subfamilia']`, árbol limpio, 0 filas residuales |

**Sobre la prueba de sensibilidad:** usé `git stash` sobre un único archivo y restauré de inmediato en el mismo comando. **No desactivé ningún control de forma persistente** ni dejé el repositorio en estado degradado. El stash que permanece en la lista es preexistente, de la branch `main`, y no es mío.

**Acciones:** lectura de código, schema y spec; batería de ataques contra PostgreSQL con datos propios eliminados; ejecución de la suite completa y test por test; prueba de sensibilidad reversible; consulta de CI vía `gh`. El script auxiliar vivió en el scratchpad, fuera del repositorio, y fue eliminado.

---

**RED TEAM — NO CANÓNICO — SIN DECISIONES ARQUITECTÓNICAS.**
