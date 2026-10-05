# RED TEAM — POLICY ATTACK + LOTE → PRODUCTO
## Fase 1: ataque a la Coverage Policy · Fase 2: auditoría del slice

**Rol:** Red Team independiente. No modifica código, registry, workflows ni documentos canónicos. **No toma decisiones arquitectónicas.**
**Fecha:** 2026-10-04
**Repositorio:** `fmonfasani/otrarondamas` · branch `chore/build-in-ci` · **HEAD `72e794d`**
**Estado del repo:** no modifiqué ningún archivo trackeado. Los cambios que `git status` muestre en `apps/api/test/**` y `.github/workflows/**` provienen del contexto de implementación que trabaja en paralelo.

**Clases de evidencia:** `[C]` código · `[T]` test · `[E]` ejecución · `[D]` documentado · `[ND]` no determinable

> Este informe emite `[E]`: ejecuté cinco ataques contra PostgreSQL real. Los datos creados fueron eliminados.

---

# 0. VEREDICTO

# BLOCKED

**No por un defecto, sino porque el objeto de la Fase 2 no existe todavía.**

Verificado en HEAD `72e794d` `[C]`:

| Artefacto de Lote → Producto | Estado |
|---|---|
| Entrada `Lote` en `RELACIONES_CON_OWNERSHIP` | **NO EXISTE** — el registry tiene 6 modelos / 10 relaciones, ninguna de `Lote` |
| Spec candidate (`b3-lote-producto.integration-spec.ts` o similar) | **NO EXISTE** — 7 specs en `test/integration/`, ninguno de Lote |
| Paso de CI para Lote | **NO EXISTE** — cero coincidencias de "lote" en el workflow B3 |
| Run de CI posterior a `72e794d` | **NO EXISTE** — el último run es `37228641927` sobre `72e794d` (ProductoProveedor) |

**No hay implementación que auditar, no hay candidate que reproducir y no hay CI verde que cuestionar.** Declarar PASS o PASS WITH LIMITATIONS sobre un slice inexistente sería exactamente el falso verde que este rol existe para prevenir.

**La Fase 1 sí se ejecutó completa**, y produjo cuatro contraejemplos medidos. Dos son hallazgos nuevos. Uno de ellos —el **GAP de `Lote.producto` confirmado por ejecución**— es precisamente la justificación del slice que viene, y queda documentado como línea de base previa a la implementación.

**Segundo hallazgo de alcance:** el encargo afirma *"OWNER aprobó Relation Ownership Coverage Policy v0.1"*. **No encontré ningún registro de esa aprobación** `[C]` ausencia: cero coincidencias de `RELATION-OWNERSHIP-COVERAGE` o de "coverage policy" en `03-DECISIONS/` (50 archivos). La aprobación puede haber ocurrido fuera del repositorio; lo reporto porque ataqué la política reconstruyéndola del documento de auditoría 24, no de un acta de decisión.

---

# 1. QUÉ POLÍTICA ATAQUÉ

Al no existir acta, reconstruí la política desde `09-TRANSFORMATION/24-RELATION-OWNERSHIP-COVERAGE-POLICY-AUDIT-2026-10-04.md` `[D]`, que propone la opción híbrida:

> **Nivel 1 — obligatorio:** toda relación hacia modelo tenant-owned **cuyo FK sea provisto por el cliente** → **31** relaciones, con prioridad por riesgo de dominio.
> **Nivel 2 —** el resto, bajo demanda.

Criterio observable de "provisto por el cliente" según ese documento: **FK declarada en algún DTO** (37 DTOs inspeccionados; 11 nombres de FK distintos) `[D]`.

**Advertencia que el propio documento 24 registra y que mi ataque confirma:** *"«declarada en un DTO» es una aproximación… Esta columna es indicativa, no normativa"* `[D]`. Mis contraejemplos 3 y 6 muestran que la aproximación falla en ambas direcciones.

---

# 2. FASE 1 — ATAQUES EJECUTADOS

Cinco ataques, todos contra PostgreSQL real, con datos creados y eliminados `[E]`.

```
=== ATTACK 1: Lote.producto cross-Business (NOT registered today) ===
  ACCEPTED -> lote.empresaId=A productoId=B  *** GAP CONFIRMED ***

=== ATTACK 2: Producto.subfamilia/tipo/subtipo cross-Business (NOT registered) ===
  ACCEPTED -> producto(A) with subfamilia/tipo/subtipo of B  *** GAP CONFIRMED ***

=== ATTACK 3: Producto.familia cross-Business (IS registered) — control ===
  rejected (expected) | code=P2025 | No Familia found

=== ATTACK 4: same-tx destination false-reject ===
  lote created in tx; OUTER client sees it = NO
  movimientoStock referencing same-tx lote: ACCEPTED (today, unregistered)

=== ATTACK 5: raw SQL bypass on Lote ===
  UPDATE "Lote" SET cantidad,updatedAt WHERE id AND empresaId
  => does NOT touch productoId; no ownership alteration via raw today
```

El **ataque 3 es el control que valida el método**: una relación registrada rechaza con `P2025`; las no registradas aceptan. La diferencia no es del azar ni del `@@unique`.

---

# 3. CONTRAEJEMPLOS A LA POLÍTICA

Los ocho tipos que el encargo pide, con resultado.

## 3.1 CE-1 — Relación que DEBERÍA entrar y quedaría afuera ❌ no encontrado en Nivel 1

Busqué una relación con FK de cliente que la política excluyera. **No la encontré:** el criterio "FK en DTO" captura `loteId`, `productoId`, `familiaId`, `subfamiliaId`, `tipoId`, `subtipoId`, `clienteId`, `proveedorId`, `compraItemId`, `usuarioEntranteId`, `entidadId` `[D]`.

**Pero sí encontré el inverso, y es más grave:** relaciones que **ya están en el Nivel 1** y **no están registradas**, con GAP probado:

| Relación | FK en DTO | Registrada | GAP probado |
|---|---|---|---|
| **`Lote.producto`** | `productoId` ✅ | **NO** | **`[E]` ATTACK 1 — ACCEPTED** |
| **`Producto.subfamilia`** | `subfamiliaId` ✅ | **NO** | **`[E]` ATTACK 2 — ACCEPTED** |
| **`Producto.tipo`** | `tipoId` ✅ | **NO** | **`[E]` ATTACK 2 — ACCEPTED** |
| **`Producto.subtipo`** | `subtipoId` ✅ | **NO** | **`[E]` ATTACK 2 — ACCEPTED** |

**ATTACK 2 es un hallazgo nuevo no reportado en ninguna auditoría previa.** `Producto.familia` **está** registrada y rechaza (`P2025`), mientras sus tres hermanas de la **misma jerarquía** aceptan FKs de otro Business. La protección es **asimétrica sobre el mismo árbol de catálogo**.

→ No es un contraejemplo *a* la política: es evidencia de que la política está **incumplida en 4 relaciones de su propio Nivel 1 obligatorio**.

## 3.2 CE-2 — Relación que entraría y rompería una operación válida ✅ **ENCONTRADO**

**`MovimientoStock.lote`** — `loteId` está en un DTO (`crear-devolucion-proveedor.dto.ts:20`) `[C]`, luego entra al Nivel 1 por el criterio. **Pero registrarla rompe `recibirCompra`.**

Cadena verificada `[C]`:
```
compras.service.ts:226   const lote = await tx.lote.create({ data: dataLote });
compras.service.ts:228   await tx.movimientoStock.create({ ... loteId: lote.id ... });
```

Y el preflight consulta con el cliente **externo** a la transacción (`empresa-scope.extension.ts:156` pasa `client`, no `tx`) `[C]`. ATTACK 4 lo mide:

> `lote created in tx; OUTER client sees it = NO`

**Consecuencia:** si `MovimientoStock.lote` se registra, el preflight hará `findUnique` del Lote recién creado, **no lo verá**, y lanzará `P2025` sobre una operación perfectamente válida. `recibirCompra` dejaría de funcionar.

**Matiz que hace esto más difícil de lo que parece:** `DevolucionProveedorItem.lote` **sí está registrada y funciona**, porque ahí el Lote es preexistente (viene del DTO). **El mismo par origen→destino es registrable o no según la ruta**, y el registry es por relación, no por ruta `[C]`. El mecanismo no puede expresar esa distinción.

## 3.3 CE-3 — Relación server-derived que realmente necesita registry ✅ **ENCONTRADO**

**`ArqueoCaja.usuarioEntrante`** `[C]`. Las 20 relaciones `→ Usuario` se clasifican como server-derived y quedan fuera del Nivel 1 por "no provistas por el cliente". **Pero esta sí viene del cliente**: `dto.usuarioEntranteId` está declarado en el DTO `[C]`.

Hoy está protegida por **validación compensatoria** (`caja.service.ts:132`: `db.usuario.findUnique({ id: dto.usuarioEntranteId })` con cliente scoped) `[C]`, no por el registry.

→ **Contraejemplo a la clasificación "destino = Usuario ⇒ server-derived".** La regla por destino falla; el criterio correcto es por origen del dato, uno por uno. El documento 24 ya lo lista en sus 11 FKs de DTO, pero la taxonomía por destino lo oculta.

## 3.4 CE-4 — Compensating validation que parezca suficiente pero no lo sea ✅ **ENCONTRADO, con matiz a favor**

**`verificarJerarquia`** (`catalogo.controller.ts:163-183`) `[C]`.

**Lo que hace bien, y es más de lo que el registry haría:**
- valida que los 4 niveles existan y pertenezcan a la empresa (vía cliente scoped);
- valida el **encadenamiento** `Subtipo→Tipo→Subfamilia→Familia`, que el registry **no** verifica;
- en `update` se completa con los valores existentes cuando el body es parcial (`:145-150`), de modo que la jerarquía **siempre se valida completa, nunca a medias** `[C]`;
- es el **único** write path de `Producto` (`grep` → solo `:125` y `:153`) `[C]`.

**Por qué igualmente NO es suficiente:**

1. **Protege la ruta, no la capacidad.** ATTACK 2 lo prueba: invocando el cliente scoped directamente, un `producto.create` con `subfamiliaId`/`tipoId`/`subtipoId` de B **es aceptado** `[E]`. La defensa vive en el controller; cualquier escritura futura desde un servicio nuevo la evita.
2. **Asimetría inexplicada:** `Producto.familia` tiene *ambas* defensas (registry + jerarquía); las otras tres solo la jerarquía. Nada documenta por qué.
3. **No cubre `Lote.producto`:** `inventario.service.ts:220` hace `db.lote.findUnique` scoped **antes** del ajuste, lo que valida el Lote — pero `Lote.producto` se escribe en `compras.service.ts:222` desde `item.productoId`, cuya seguridad depende de que `CompraItem.producto` **ya esté registrada** (lo está). Es una cadena de dos eslabones donde el segundo depende del primero.

→ **Es el contraejemplo más interesante:** una validación compensatoria *más fuerte* que el registry en su ruta, e *insuficiente* como garantía de capacidad. La política debería decidir si las validaciones compensatorias **sustituyen** o **complementan** el registry. Hoy no lo dice.

## 3.5 CE-5 — Same-transaction destination que provoque falso rechazo ✅ **ENCONTRADO Y MEDIDO**

Ya detallado en CE-2. Afecta, verificado en código `[C]`:

| Relación | Destino creado en la misma tx | Sitio |
|---|---|---|
| `MovimientoStock.lote` | **SÍ** | `compras.service.ts:226→228` |
| `MovimientoStock.recepcionCompra` | **SÍ** | `compras.service.ts:214→` |
| `AuditLog.venta` | **SÍ** | `ventas.service.ts:190` |
| `CierreCaja.aperturaCaja` | parcial (preexistente, se actualiza en la tx) | `caja.service.ts:269-276` |

**`MovimientoStock.lote` es el único de los cuatro que está en el Nivel 1** (su FK está en DTO). Los otros tres caen en Nivel 2, donde el riesgo no se materializa mientras no se registren.

## 3.6 CE-6 — Nested FK que el criterio no detecte ✅ **ENCONTRADO**

El FK del padre **no aparece** en el payload de un nested create — Prisma lo inyecta. Medido en la auditoría previa: para `Venta.create` con `ventaItems: { create: [...] }`, el colector devuelve solo `[{modelo:'Producto'}]`; **`VentaItem.venta` nunca se recoge** `[E]`.

→ Registrar `VentaItem.venta`, `PedidoItem.pedido`, `CompraItem.compra` o `DevolucionProveedorItem.devolucion` sería **cobertura ilusoria** en la ruta nested.

**Estas 4 están en Nivel 2** (su FK no está en DTO), así que la política híbrida **las excluye correctamente** — por la razón equivocada (las excluye por origen, no por indetectabilidad), pero el resultado es el correcto.

## 3.7 CE-7 — DTO classification incorrecta ✅ **ENCONTRADO (2 casos)**

| Caso | Clasificación por DTO | Realidad |
|---|---|---|
| `VentaItem.reglaFidelizacion`, `PedidoItem.reglaFidelizacion` | **fuera** del Nivel 1 (no en DTO) | **registradas**. Doc 24: FK de **doble origen** — derivada del servidor (`ventas.service.ts:95`) y del item (`:182`) `[D]`. La clasificación binaria no las representa |
| `ProductoProveedor.producto/proveedor` | **dentro** del Nivel 1 (`productoId`, `proveedorId` en DTOs) | **cero código de aplicación**: el modelo no se escribe desde ninguna ruta `[D]` doc 24. Formalmente en Nivel 1, materialmente sin superficie |

→ El criterio "FK en DTO" **sobre-incluye** (`ProductoProveedor`) y **sub-incluye** (`reglaFidelizacion`). Dos de las 10 entradas actuales no se explican por él.

## 3.8 CE-8 — Raw SQL bypass ✅ **VERIFICADO, sin impacto hoy**

Única superficie raw de negocio: `inventario.service.ts:266`, `UPDATE "Lote" SET "cantidad", "updatedAt" WHERE "id" AND "empresaId"` `[C]`.

**No toca `productoId`** → no altera ownership relacional. Y el raw SQL está estructuralmente fuera del mecanismo (el hook es `$allModels.$allOperations`) `[C]`.

→ **No es bypass de la política relacional hoy.** Pero ninguna política de registry puede cubrir esa vía: pertenece a `T01-06`, no a este registry. Si alguna vez un raw modificara un FK, el registry sería irrelevante.

---

# 4. RESUMEN FASE 1

| # | Tipo de contraejemplo | Encontrado | Severidad |
|---|---|---|---|
| CE-1 | Debería entrar y queda afuera | ❌ no (pero sí 4 **incumplimientos** del Nivel 1, probados `[E]`) | **ALTA** |
| CE-2 | Entraría y rompe operación válida | ✅ `MovimientoStock.lote` | **ALTA** |
| CE-3 | Server-derived que necesita registry | ✅ `ArqueoCaja.usuarioEntrante` | MEDIA |
| CE-4 | Compensating validation insuficiente | ✅ `verificarJerarquia` | **ALTA** |
| CE-5 | Same-tx → falso rechazo | ✅ 4 relaciones, 1 en Nivel 1 | **ALTA** |
| CE-6 | Nested FK no detectable | ✅ 4 relaciones (todas en Nivel 2) | MEDIA |
| CE-7 | Clasificación DTO incorrecta | ✅ 2 casos en ambas direcciones | MEDIA |
| CE-8 | Raw SQL bypass | ✅ verificado, sin impacto actual | BAJA |

**7 de 8 tipos confirmados.** La política híbrida **no es refutada** —sigue siendo la opción más defendible de las cuatro— pero tiene **tres puntos que su enunciado actual no resuelve**:

1. **No distingue por ruta.** `MovimientoStock.lote` y `DevolucionProveedorItem.lote` son la misma relación conceptual con destinos de ciclo de vida distinto. El registry no puede expresarlo.
2. **No define la relación registry ↔ validación compensatoria.** ¿`verificarJerarquia` exime a `Producto.subfamilia/tipo/subtipo` del Nivel 1, o es defensa en profundidad? Hoy el resultado es que **no están registradas y el GAP es explotable por otra vía** `[E]`.
3. **El criterio "FK en DTO" no es fiable** en los casos límite, y el propio documento 24 lo advierte.

---

# 5. FASE 2 — LOTE → PRODUCTO

## 5.1 Línea de base ANTES de la implementación

Esto es lo que aporto para que el slice pueda verificarse después: **el GAP medido antes del fix** `[E]`.

```
ATTACK 1 — contexto A, Lote.create con productoId de B:
  ACCEPTED -> lote.empresaId=A  productoId=B   *** GAP CONFIRMED ***
```

**Hoy, en HEAD `72e794d`, un `Lote` de la empresa A puede apuntar a un `Producto` de la empresa B.** El registro persiste. No hay validación compensatoria en el único write path de creación (`compras.service.ts:222`) más allá de que `item.productoId` provenga de un `CompraItem` ya validado.

## 5.2 Lo que el slice tendrá que demostrar

Derivado de los defectos reales que encontré en el slice anterior (`ProductoProveedor`), **documentado aquí para que no se repitan**:

| # | Riesgo | Cómo se materializó en ProductoProveedor |
|---|---|---|
| 1 | **Fixtures que colisionan con un `@@unique`** | PP-05/PP-06 murieron con `P2002` en el setup, antes del UPDATE. `Lote` tiene `@@unique([productoId, numeroLote, empresaId])` — **tres campos**: variar `numeroLote` basta para evitarlo |
| 2 | **`P2002` ocultando `P2025`** | Los `rejects.toThrow()` sin matcher aceptaban cualquier error. **Exigir matcher de `P2025`** o del mensaje `No Producto found` |
| 3 | **Order dependency** | PP-04 asertaba `count → toBe(1)` y falla en aislamiento `[E]`. **Evitar aserciones de conteo global** |
| 4 | **Cross-Business update que no llega al UPDATE** | Probarlo con un `create` de setup que **no** pueda colisionar, y verificar el estado posterior |
| 5 | **Transaction visibility** | `Lote` se crea en tx en `compras.service.ts:226`. Registrar `Lote.producto` **no** rompe eso (el destino es `Producto`, preexistente) — pero registrar `MovimientoStock.lote` sí. **No confundir los dos** |
| 6 | **Rollback** | Verificar que tras el rechazo las filas de A y B quedan intactas |
| 7 | **Missing destination** | `productoId` inexistente da el mismo `P2025` que cross-Business `[C]`. Un test debería distinguir o declarar que no se distingue |
| 8 | **Bypass por otro write path** | `Lote` se escribe en `compras.service.ts:226` (create) y `:389` + `inventario.service.ts:332` (update de `cantidad`, no de `productoId`). **El `productoId` solo se fija en el create** `[C]` |

## 5.3 Dato favorable al slice

**Registrar `Lote.producto` NO debería romper ninguna operación válida** `[C]`:
- el destino (`Producto`) es **siempre preexistente** en el único path de creación (`item.productoId` de un `CompraItem` ya persistido);
- no hay creación de `Lote` cuyo `Producto` se cree en la misma transacción;
- los `update` de `Lote` solo tocan `cantidad`/`updatedAt`, no `productoId`.

→ **`Lote.producto` es un candidato limpio**, a diferencia de `MovimientoStock.lote`. Son relaciones adyacentes con riesgo opuesto, y conviene no tratarlas como un bloque.

## 5.4 Sobre el CI verde

El encargo dice: *"Si existe CI verde: NO aceptarlo automáticamente. Reproducir los casos críticos de forma aislada."*

**No existe CI verde de Lote → Producto.** El último run del workflow B3 es `37228641927` sobre `72e794d` (ProductoProveedor) `[E]`. Cuando exista, reproduciré los casos de §5.2 en aislamiento, como hice con ProductoProveedor —donde el aislamiento reveló que PP-04 fallaba solo `[E]`—.

---

# 6. HECHOS VERIFICADOS

## `[E]` — por ejecución

| Ref | Hecho |
|---|---|
| E-01 | **`Lote.producto` cross-Business ACEPTADO** — GAP confirmado antes del fix |
| E-02 | **`Producto.subfamilia`/`tipo`/`subtipo` cross-Business ACEPTADOS** — hallazgo nuevo |
| E-03 | `Producto.familia` cross-Business **RECHAZADO** con `P2025 No Familia found` (control del método) |
| E-04 | El cliente externo **no ve** una fila creada en una transacción abierta |
| E-05 | `movimientoStock.create` referenciando un `Lote` de la misma tx es aceptado hoy (relación no registrada) |

## `[C]` — por código

| Ref | Hecho |
|---|---|
| C-01 | Registry en HEAD `72e794d`: 6 modelos, 10 relaciones. **`Lote` no figura** |
| C-02 | **No existe spec de Lote** en `test/integration/` (7 archivos) |
| C-03 | **No existe paso de CI para Lote** en el workflow B3 |
| C-04 | El preflight recibe `client`, no `tx` (`empresa-scope.extension.ts:156`) |
| C-05 | `compras.service.ts:226→228`: `Lote` creado en tx y referenciado por `MovimientoStock` |
| C-06 | `loteId` declarado en 2 DTOs → `MovimientoStock.lote` cae en Nivel 1 |
| C-07 | `dto.usuarioEntranteId` en DTO y validado a mano en `caja.service.ts:132` |
| C-08 | `verificarJerarquia` valida existencia, pertenencia **y encadenamiento**; es condicional pero completa en `update` |
| C-09 | `Producto` tiene **un solo** write path (`catalogo.controller.ts:125` y `:153`) |
| C-10 | `Lote.productoId` se fija **solo** en el create; los updates tocan `cantidad`/`updatedAt` |
| C-11 | `Lote` tiene `@@unique([productoId, numeroLote, empresaId])` — 3 campos |
| C-12 | Raw SQL de `Lote` no toca `productoId` |
| C-13 | **Cero registros de aprobación de la coverage policy en `03-DECISIONS/`** (50 archivos) |

## `[D]` — documentado

| Ref | Hecho |
|---|---|
| D-01 | Doc 24: Nivel 1 = 31 relaciones con FK en DTO; cobertura 8/31 |
| D-02 | Doc 24: *"«declarada en un DTO» es una aproximación… indicativa, no normativa"* |
| D-03 | Doc 24: `reglaFidelizacionId` tiene **doble origen** |
| D-04 | Doc 24: `ProductoProveedor` tiene **cero código de aplicación** |
| D-05 | Doc 24: *"el universo del registry nunca fue decidido"* |

## `[ND]` — no determinable

| Ref | Ítem |
|---|---|
| ND-01 | Si el Owner aprobó la policy fuera del repositorio |
| ND-02 | Qué versión exacta es "v0.1" y si coincide con la híbrida del doc 24 |
| ND-03 | Si `verificarJerarquia` debe conservarse como defensa en profundidad o retirarse al registrar las 3 relaciones |
| ND-04 | Si existen rutas no inspeccionadas que escriban `Lote.productoId` |
| ND-05 | Si `AplicacionPago.pago` referencia un `Pago` de la misma tx |

**Sin evidencia `[T]`:** no ejecuté ninguna suite en este informe (no hay suite de Lote que ejecutar).

---

# 7. VEREDICTO

# BLOCKED

**Fase 1: COMPLETA.** Siete de ocho tipos de contraejemplo confirmados, cuatro con evidencia de ejecución. Dos hallazgos nuevos:
- **la protección del árbol de catálogo es asimétrica** (`Producto.familia` protegida; `subfamilia`/`tipo`/`subtipo` no, GAP probado);
- **`ArqueoCaja.usuarioEntrante` refuta la clasificación "destino Usuario ⇒ server-derived"**.

**Fase 2: BLOQUEADA — el slice no existe en HEAD `72e794d`.** Sin registry entry, sin spec, sin paso de CI y sin run. No audito lo que no está.

**Qué desbloquea la Fase 2:** un commit que añada la entrada `Lote: ['producto']`, el spec candidate y el paso de CI. Con eso reproduzco los 8 riesgos de §5.2 en aislamiento y emito PASS / PASS WITH LIMITATIONS / FAIL.

**No declaro B3 VERIFIED. No tomo ninguna decisión arquitectónica.** Las tres cuestiones que la política no resuelve (§4) quedan planteadas, no resueltas: distinción por ruta, relación registry ↔ validación compensatoria, y fiabilidad del criterio "FK en DTO".

---

# 8. DECLARACIÓN DE CUMPLIMIENTO

| Restricción | Cumplimiento |
|---|---|
| No modificar código | **Cumplido** — `git diff` de `apps/api/src` vacío |
| No modificar registry | **Cumplido** — verificado intacto (10 relaciones, sin `Lote`) |
| No modificar workflows | **Cumplido** — el diff del workflow es del contexto paralelo |
| No modificar canonical docs | **Cumplido** |
| No commits / push | **Cumplido** |
| **No tomar decisiones arquitectónicas** | **Cumplido** — §4 plantea tres cuestiones abiertas sin resolverlas |
| No aceptar CI verde automáticamente | **Cumplido** — no existe CI de Lote; el de ProductoProveedor ya fue reproducido en el informe 30 |

**Acciones:** lectura de código, schema, DTOs y documentación; un probe de ataque contra PostgreSQL que creó y **eliminó** sus propios datos; consulta de CI vía `gh`. El script auxiliar vivió en el scratchpad, fuera del repositorio, y fue eliminado.

---

**RED TEAM — NO CANÓNICO — NO APROBADO — SIN DECISIÓN TOMADA.**
