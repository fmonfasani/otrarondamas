# RED TEAM — RELATION OWNERSHIP COVERAGE POLICY
## ¿Cuál debe ser el universo protegido por `RELACIONES_CON_OWNERSHIP`?

**Rol:** Red Team de coverage policy. No modifica código, registry, workflows, contratos ni invariants. **No toma decisiones.**
**Fecha:** 2026-10-04
**Repositorio:** `fmonfasani/otrarondamas` · branch `chore/build-in-ci` · HEAD `72e794d`
**Estado del repo:** no modifiqué ningún archivo trackeado. Los cambios que `git status` muestre provienen del contexto de implementación que trabaja en paralelo.

**Clases de evidencia:** `[C]` código · `[T]` test · `[E]` ejecución · `[D]` documentado · `[ND]` no determinable

> Este informe emite `[E]`: ejecuté un censo del DMMF y un probe de contraejemplos contra PostgreSQL real. Los datos aportados en el encargo **fueron verificados, no asumidos**.

---

# 1. VERIFICACIÓN DE LOS DATOS APORTADOS

Censo derivado del DMMF de Prisma (fuente autoritativa, no del texto del schema) `[E]`.

| Dato aportado | Verificado | Resultado |
|---|---|---|
| 108 relaciones con FK en el origen | ✅ **EXACTO** | 108 |
| 28 apuntan a `Empresa` | ✅ **EXACTO** | 28 |
| 75 apuntan a modelos con `empresaId` | ✅ **EXACTO** | 75 (excluyendo `Empresa`) |
| 5 apuntan a modelos sin `empresaId` | ✅ **EXACTO** | 5 |
| 50 E→E | ✅ **EXACTO** | 50 |
| 25 noE→E | ✅ **EXACTO** | 25 |
| 10 relaciones registradas | ✅ **EXACTO** | 10, en 6 modelos |

**Suma de control:** 28 + 75 + 5 = 108 ✅. Y 50 + 25 + 5 = 80 = 108 − 28 ✅.

## 1.1 Hechos nuevos que el censo agregó

| # | Hecho | Clase |
|---|---|---|
| **V-1** | **Cero relaciones con FK compuesta.** Las 108 tienen `relationFromFields.length === 1` y `relationToFields.length === 1` | `[E]` |
| **V-2** | **E→noE = 0.** Ningún modelo con `empresaId` apunta a un modelo sin `empresaId` | `[E]` |
| **V-3** | **noE→noE = 5**, exactamente las 5 que apuntan a modelos sin `empresaId` | `[E]` |
| **V-4** | 42 modelos; 28 con `empresaId` | `[E]` |
| **V-5** | **`PagoProveedor` y `DevolucionProveedor` YA están en `MODELOS_CON_EMPRESA_ID`** (28 entradas). El gap que auditorías previas reportaban **está cerrado** | `[C]` |

**Implicancia de V-1:** la restricción "FK simple" del mecanismo **no excluye ninguna relación**. La categoría "no registrable" se determina por el **destino**, no por la forma de la FK. Esto invalida una hipótesis razonable de partida.

**Implicancia de V-2:** no existe el caso "padre tenant-owned apuntando a hijo global", lo que simplifica el análisis: los únicos destinos no verificables son los 5 de V-3.

## 1.2 Las 5 relaciones hacia modelos sin `empresaId`

| Relación | Destino | Requerida |
|---|---|---|
| `UsuarioPermiso.permiso` | `Permiso` | sí |
| `DocumentoLegajo.legajo` | `Legajo` | sí |
| `MovimientoCaja.aperturaCaja` | `AperturaCaja` | no |
| `ArqueoCaja.aperturaCaja` | `AperturaCaja` | sí |
| `CierreCaja.aperturaCaja` | `AperturaCaja` | sí |

**Estas 5 NO pueden registrarse con el mecanismo actual** `[C]`: `verificarOwnershipRelacional` lanza si el destino no está en `MODELOS_CON_EMPRESA_ID`:

```
if (!esModeloConEmpresaId(modelo)) throw new Error(
  `…la relación hacia '${modelo}' no tiene ownership directo por empresa verificable.`)
```

Registrarlas convertiría **toda** operación que las use en una excepción de runtime — no en una verificación. Es fail-closed, pero inutilizaría los módulos de caja, permisos y legajo.

## 1.3 Taxonomía de las 75 por naturaleza del destino

Clasificación propia, derivada del destino y verificada contra el código `[E]`+`[C]`:

| Grupo | Nº | Destino | Origen de la FK en producción |
|---|---|---|---|
| **G1 — Catálogo / maestro** | **32** | `Producto`, `Familia`, `Subfamilia`, `Tipo`, `Subtipo`, `Proveedor`, `Cliente`, `Lote`, `ReglaFidelizacion`, `Presentacion` | **típicamente del cliente** (DTO) |
| **G2 — Actor (`Usuario`)** | **20** | `Usuario` | **derivada por el servidor** (`@CurrentUser()`), nunca del cliente |
| **G3 — Padre / transaccional** | **23** | `Venta`, `Pedido`, `Compra`, `Pago`, `Caja`, `Deuda`, `CuentaCorriente`, `RecepcionCompra`, `Autorizacion`, `DevolucionProveedor` | mixto: ruta (`:id`) o **creada en la misma transacción** |

**32 + 20 + 23 = 75** ✅

**Dato decisivo:** **las 10 relaciones registradas pertenecen todas a G1** `[E]`. El registry actual no es arbitrario — es, de hecho, una implementación parcial de la política A.

---

# 2. COBERTURA ACTUAL

| Universo | Tamaño | Registradas | Faltantes | Cobertura |
|---|---|---|---|---|
| Todas las relaciones con FK | 108 | 10 | 98 | 9,3 % |
| Hacia modelo tenant-owned (75) | 75 | 10 | 65 | **13,3 %** |
| G1 catálogo (32) | 32 | 10 | **22** | **31,3 %** |
| G2 actor (20) | 20 | 0 | 20 | 0 % |
| G3 padre/tx (23) | 23 | 0 | 23 | 0 % |

## 2.1 Las 10 registradas

| Origen.relación | → Destino | Grupo |
|---|---|---|
| `ProductoProveedor.producto` | `Producto` | G1 |
| `ProductoProveedor.proveedor` | `Proveedor` | G1 |
| `Producto.familia` | `Familia` | G1 |
| `VentaItem.producto` | `Producto` | G1 |
| `VentaItem.reglaFidelizacion` | `ReglaFidelizacion` | G1 |
| `PedidoItem.producto` | `Producto` | G1 |
| `PedidoItem.reglaFidelizacion` | `ReglaFidelizacion` | G1 |
| `CompraItem.producto` | `Producto` | G1 |
| `DevolucionProveedorItem.producto` | `Producto` | G1 |
| `DevolucionProveedorItem.lote` | `Lote` | G1 |

## 2.2 Las 22 de G1 NO registradas

| Origen.relación | → Destino | Req |
|---|---|---|
| `Subfamilia.familia` | `Familia` | sí |
| `Tipo.subfamilia` | `Subfamilia` | sí |
| `Subtipo.tipo` | `Tipo` | sí |
| `Producto.subfamilia` | `Subfamilia` | sí |
| `Producto.tipo` | `Tipo` | sí |
| `Producto.subtipo` | `Subtipo` | sí |
| `Presentacion.producto` | `Producto` | sí |
| **`Lote.producto`** | `Producto` | sí |
| `Legajo.cliente` | `Cliente` | no |
| `ReglaFidelizacion.familia` | `Familia` | no |
| `ReglaFidelizacion.subfamilia` | `Subfamilia` | no |
| `ReglaFidelizacion.tipo` | `Tipo` | no |
| `ReglaFidelizacion.subtipo` | `Subtipo` | no |
| `CuentaCorriente.cliente` | `Cliente` | sí |
| `Deuda.cliente` | `Cliente` | sí |
| `Venta.cliente` | `Cliente` | no |
| `Pedido.cliente` | `Cliente` | sí |
| `Compra.proveedor` | `Proveedor` | sí |
| **`MovimientoStock.producto`** | `Producto` | sí |
| **`MovimientoStock.lote`** | `Lote` | no |
| `PagoProveedor.proveedor` | `Proveedor` | sí |
| `DevolucionProveedor.proveedor` | `Proveedor` | sí |

**`Producto.subfamilia/tipo/subtipo` es el gap más llamativo:** `Producto.familia` **sí** está registrada, pero las otras tres ramas de la misma jerarquía **no**. Un `Producto` de A puede hoy apuntar a un `Subtipo` de B.

---

# 3. CONTRAEJEMPLOS — el núcleo de este informe

El encargo pide explícitamente no proponer "registrar las 75" y buscar contraejemplos. Encontré **cuatro clases**, y la primera está **probada por ejecución**.

## 3.1 CE-1 — El preflight no ve filas creadas en la misma transacción `[E]`

**Esto es el contraejemplo decisivo y es medido, no teórico.**

`verificarOwnershipRelacional` recibe **`client`**, no `tx` (`empresa-scope.extension.ts:156`) `[C]`. Probé qué implica:

```
--- CE-1: visibility of uncommitted row from outer client ---
  venta created in tx id=18309130-b662-4ae2-83f0-f0ba37b83d6d
  outer-client findUnique -> NOT VISIBLE
  CE-1 VERDICT: outer client sees uncommitted row = NOT VISIBLE
  => if AuditLog.venta were registered, preflight would FALSELY REJECT
     a valid same-tx AuditLog
```

**Consecuencia:** registrar cualquier relación cuyo destino se cree dentro de la misma transacción **rompe una operación válida con un falso rechazo**. No es un riesgo hipotético: es una propiedad del aislamiento Read Committed de PostgreSQL combinada con el uso del cliente externo.

### Relaciones afectadas, verificadas en código real `[C]`

| Relación | Destino creado en la misma tx | Sitio |
|---|---|---|
| **`MovimientoStock.lote`** → `Lote` | **SÍ** — `tx.lote.create` (`:226`) y luego `tx.movimientoStock.create({ loteId: lote.id })` (`:228`) | `compras.service.ts` |
| **`MovimientoStock.recepcionCompra`** → `RecepcionCompra` | **SÍ** — `tx.recepcionCompra.create` (`:214`) y referencia posterior | `compras.service.ts` |
| **`AuditLog.venta`** → `Venta` | **SÍ** — `tx.auditLog.create({ ventaId: venta.id })` (`:190`) tras crear la Venta en la misma tx | `ventas.service.ts` |
| **`CierreCaja.aperturaCaja`** → `AperturaCaja` | parcial — la apertura es preexistente, pero se actualiza en la misma tx | `caja.service.ts:269-276` |
| **`AplicacionPago.pago`** → `Pago` | probable — `tx.pago.create` (`pagos.service.ts:55`) | `[ND]` sin leer el flujo completo |

**`MovimientoStock.lote` es el contraejemplo más claro y está en G1** — es decir, **la política A no es inmune**: incluye al menos una relación de catálogo que no se puede registrar sin romper `recibirCompra`.

> **Nota:** `DevolucionProveedorItem.lote` **sí** está registrada y funciona, porque allí el `Lote` es preexistente (viene del DTO). La misma pareja origen→destino es registrable o no **según la ruta**, no según el par de modelos. El registry es por relación, no por ruta — **limitación estructural del mecanismo**.

## 3.2 CE-2 — El FK del padre es implícito en nested create `[E]`

Probé el colector directamente:

```
refs collected for Venta.create with nested ventaItems:
  [{"modelo":"Producto","where":{"id":"PROD-X"}}]
=> VentaItem.venta NOT collected (no ventaId in child data) = true
```

En `ventas.service.ts:173`, el nested create de `ventaItems` **no incluye `ventaId`** — Prisma lo inyecta. Por lo tanto `visitarDatos` nunca lo ve `[E]`.

**Consecuencia:** registrar `VentaItem.venta`, `PedidoItem.pedido`, `CompraItem.compra` o `DevolucionProveedorItem.devolucion` sería **cobertura ilusoria** en la ruta nested: no se verificaría nada porque el FK no está en el payload. Solo protegería una ruta hipotética que pasara el FK explícito.

**Esto afecta a 4 de las 23 relaciones de G3** y es un argumento fuerte contra la política B aplicada mecánicamente: registraría relaciones que **no pueden fallar ni proteger**.

## 3.3 CE-3 — FKs derivadas por el servidor: 20 relaciones sin superficie de ataque

Las 20 relaciones de **G2** (`→ Usuario`) obtienen su valor de `@CurrentUser()`, no del cliente `[C]`. Verificado: ningún DTO declara `usuarioId`, ninguna ruta lo acepta como parámetro.

**Consecuencia:** registrarlas añade 20 `findUnique` de preflight por operación para proteger contra un vector **que no existe**. Falsos negativos evitados: ~0. Costo: real.

**Matiz honesto:** `ArqueoCaja.usuarioEntrante` **sí** viene del DTO (`dto.usuarioEntranteId`) `[C]` — y ya está validado a mano con una lectura scoped previa (`caja.service.ts:132`). Es la excepción dentro de G2, y está cubierta por disciplina, no por mecanismo.

## 3.4 CE-4 — Las 5 relaciones estructuralmente no registrables

Ya detalladas en §1.2. Registrarlas **lanza excepción** en vez de verificar `[C]`. Bloquean cualquier política que exija "todas".

## 3.5 CE-5 — Relaciones con raw SQL

Única superficie raw de negocio: `inventario.service.ts:266`, un `UPDATE "Lote"` dentro de `$transaction` `[C]`. Toca `Lote`, cuyo `productoId` **no se modifica** en esa sentencia (solo `cantidad` y `updatedAt`). **No hay relación cuyo ownership se altere por raw SQL hoy.**

**Pero:** el raw SQL está estructuralmente fuera del mecanismo (el hook es `$allModels.$allOperations`) `[C]`. Ninguna política de registry puede cubrir esa vía — es dominio de T01-06, no de este registry.

---

# 4. EVALUACIÓN DE LAS CUATRO POLÍTICAS

Las evalúo sin asumir que C o D son correctas.

---

## POLÍTICA A — FK provista por cliente

**1. Definición formal.** Se registra toda relación cuyo identificador de destino pueda provenir, en alguna ruta de escritura, de un payload controlado por el cliente.

**2. Universo exacto.** Subconjunto de G1 + `ArqueoCaja.usuarioEntrante` + las relaciones de G3 que reciben el FK por ruta/DTO. **Cota superior ≈ 33-40**; cota inferior (solo G1 verificado) = **32**. No es determinable con precisión sin auditar cada DTO y controller uno por uno → **`[ND]` parcial**.

**3. Cobertura actual.** 10 de ~32 (31 %). **Las 10 registradas caen todas dentro de esta política** `[E]` — A describe el criterio ya aplicado de facto.

**4. Qué queda fuera.** G2 (20, server-derived), G3 cuyo FK es implícito o interno (≈19), las 5 no registrables. Total fuera ≈ 44.

**5. Riesgos.** (a) El universo depende de un análisis de rutas, no del schema → **no es computable mecánicamente**, y una ruta nueva puede ampliarlo sin que nadie lo note. (b) Si mañana un endpoint acepta `usuarioId` del cliente, la relación entra al universo **sin cambio de schema** → gap silencioso.

**6. Compatibilidad T-01/B3.** **La más alta.** `T01-01` habla de *"client-supplied Business identifiers"* y el cierre contractual etiqueta ISO-001 literalmente como **"Client FK validation"** `[D]`. A es la lectura literal del contrato.

**7. Compatibilidad con el mecanismo.** Alta — pero **no total**: `MovimientoStock.lote` está en G1 y es incompatible (CE-1).

**8. FP/FN.** FP bajos (se registra donde el cliente decide). FN: el riesgo es la **deriva** — una ruta nueva amplía el universo sin señal.

**9. Performance.** Mínimo: ~1-3 `findUnique` extra por operación de escritura.

**10. Mantenimiento.** **Medio-alto.** Requiere re-auditar el universo cada vez que se añade un DTO o endpoint. No hay test que pueda afirmar completitud.

**11. Condición de completitud.** "Toda FK alcanzable desde un payload de cliente está registrada." **No verificable mecánicamente** → requiere auditoría manual recurrente. Débil.

**12. Decisión del Owner.** Aprobar que el criterio normativo es *el origen del dato* (cliente) y aceptar que la completitud se audita, no se computa.

---

## POLÍTICA B — Toda relación hacia modelo tenant-owned

**1. Definición formal.** Se registra toda relación cuyo destino sea un modelo con `empresaId`.

**2. Universo exacto.** **75, computable mecánicamente del DMMF** `[E]`.

**3. Cobertura actual.** 10 de 75 = **13,3 %**.

**4. Qué queda fuera.** Nada de los 75; quedan fuera las 28 a `Empresa` (innecesarias: la extensión ya fuerza `empresaId`) y las 5 a modelos sin `empresaId` (no registrables).

**5. Riesgos — los más graves de las cuatro.**
- **Rompe operaciones válidas:** `MovimientoStock.lote`, `MovimientoStock.recepcionCompra`, `AuditLog.venta` fallarían por CE-1 `[E]`. `recibirCompra` y `VentasService.create` dejarían de funcionar.
- **Cobertura ilusoria:** 4 relaciones de G3 nunca se evaluarían (CE-2) `[E]`.
- **Costo sin beneficio:** 20 relaciones G2 sin vector de ataque (CE-3).

**6. Compatibilidad T-01/B3.** Media. Satisface `T01-03` ("toda relación persistida… validada") de forma literal, pero **viola el espíritu de `T01-05`**: el contexto debe permanecer autoritativo *durante* la transacción, y B lo rompe al verificar desde fuera de ella.

**7. Compatibilidad con el mecanismo.** **BAJA — incompatible sin cambios.** Requeriría, como mínimo: (a) que el preflight use `tx` cuando exista, (b) manejo del FK implícito en nested create. Ninguna de las dos existe hoy.

**8. FP/FN.** **Falsos positivos ALTOS y demostrados** `[E]` — rechaza operaciones válidas. FN mínimos.

**9. Performance.** El peor: hasta 75 relaciones candidatas; en `recibirCompra` (bucle sobre items) serían N×k `findUnique` secuenciales. No medido → `[ND]`, pero el orden de magnitud es claro.

**10. Mantenimiento.** El más bajo **en teoría** (derivable del schema, un test podría exigir completitud) y el más alto **en práctica** (hay que mantener excepciones para los contraejemplos).

**11. Condición de completitud.** Fuerte y **verificable por test**: "para toda relación con destino tenant-owned, existe entrada en el registry". Es la única política con completitud mecánicamente comprobable.

**12. Decisión del Owner.** Aprobar que el criterio es *estructural* (schema), **y** aprobar el cambio de mecanismo que CE-1/CE-2 exigen, **y** aceptar el costo de performance. Son tres decisiones, no una.

---

## POLÍTICA C — Risk-ranked incremental

**1. Definición formal.** Se registran relaciones en orden de riesgo decreciente, slice por slice, con evidencia CI por slice. El universo objetivo no se fija de antemano.

**2. Universo exacto.** **No definido — es el problema central de C.** El universo es "lo que se haya registrado hasta hoy".

**3. Cobertura actual.** 10. Es la política que el proyecto **está ejecutando de facto** (gates 6.1-6.4, Producto-Familia, ProductoProveedor) `[D]`.

**4. Qué queda fuera.** Indeterminado por construcción.

**5. Riesgos.**
- **Sin condición de parada:** nada distingue "terminado" de "abandonado en el slice 7".
- **El ranking de riesgo no está documentado** — no encontré ningún artefacto que lo establezca `[C]` ausencia. Sin ranking explícito, el orden es discrecional.
- **Falsa sensación de progreso:** 10/75 con 6 slices cerrados y evidencia CI puede leerse como "B3 avanzado" cuando la cobertura estructural es 13 %.

**6. Compatibilidad T-01/B3.** Alta como **método de ejecución**; nula como **política de cobertura**. T-01 no exige un universo, pero la propiedad 12 de R8-ARCH-002 exige verificación negativa — que C satisface slice a slice.

**7. Compatibilidad con el mecanismo.** **La más alta.** Cada slice valida su propia compatibilidad antes de registrarse; los contraejemplos se descubren al llegar a ellos.

**8. FP/FN.** FP ~0 (cada slice se verifica). **FN altos y crecientes mientras el universo no se cierre** — hoy 65 relaciones sin protección.

**9. Performance.** Óptima: solo se paga por lo registrado.

**10. Mantenimiento.** Bajo por slice, **pero sin horizonte**. Riesgo de que el trabajo quede a mitad sin que ningún gate lo detecte.

**11. Condición de completitud.** **No tiene.** Es su defecto definitorio.

**12. Decisión del Owner.** Aprobar el ranking de riesgo explícito **y** una condición de parada. Sin ambas, C no es una política sino una descripción del status quo.

---

## POLÍTICA D — Híbrida: nivel 1 obligatorio + nivel 2 bajo demanda

**1. Definición formal.** Nivel 1 (obligatorio, con completitud verificable): un subconjunto definido estructuralmente. Nivel 2 (bajo demanda): el resto, registrado caso por caso con justificación.

**2. Universo exacto.** **Depende enteramente de cómo se defina el nivel 1** — y el encargo no lo fija. Es la variable libre que decide si D es sólida o es C con otro nombre.

Candidatos de nivel 1, con su tamaño verificado:

| Definición de nivel 1 | Tamaño | Contraejemplos incluidos |
|---|---|---|
| **G1 completo** (destino catálogo/maestro) | **32** | `MovimientoStock.lote`, `MovimientoStock.producto` (CE-1 parcial) |
| **G1 menos same-tx** | **≈30** | ninguno |
| Solo destinos del árbol de catálogo (`Producto`/`Familia`/`Subfamilia`/`Tipo`/`Subtipo`/`Lote`/`Presentacion`) | 15 | `MovimientoStock.lote` |
| Solo relaciones de modelos `*Item` | 7 | `*.venta/pedido/compra` (CE-2) si se incluyeran |

**3. Cobertura actual.** 10 de 32 (31 %) si nivel 1 = G1.

**4. Qué queda fuera del nivel 1.** G2 (20), G3 (23), las 5 no registrables → nivel 2 o exclusión explícita.

**5. Riesgos.**
- **El nivel 2 "bajo demanda" puede degenerar en nunca** — mismo defecto de C si no se le pone condición.
- **La frontera nivel 1/nivel 2 debe ser computable**, o reaparece la ambigüedad de A.
- Riesgo de que el nivel 1 se defina *a posteriori* para que las 10 ya registradas lo satisfagan.

**6. Compatibilidad T-01/B3.** **Alta.** Nivel 1 da la obligación verificable que ISO-001/002 necesitan; nivel 2 reconoce que T01-05 y el mecanismo imponen límites reales.

**7. Compatibilidad con el mecanismo.** **Alta si el nivel 1 excluye los contraejemplos.** La definición "G1 menos same-tx" (≈30) es compatible sin cambiar nada del mecanismo.

**8. FP/FN.** FP ~0 si el nivel 1 está bien definido. FN acotados y **cuantificables**: exactamente el nivel 2.

**9. Performance.** Acotada por el nivel 1. Para G1, 1-3 `findUnique` por escritura.

**10. Mantenimiento.** **El mejor equilibrio:** el nivel 1 es derivable del schema (test de completitud posible); el nivel 2 es una lista explícita de excepciones con justificación.

**11. Condición de completitud.** **Verificable para el nivel 1** ("toda relación de G1 no exceptuada está registrada"), con las excepciones enumeradas y justificadas. Es la propiedad que A y C no tienen y que B solo tiene al precio de romper operaciones.

**12. Decisión del Owner.** Aprobar (a) la **definición estructural** del nivel 1, (b) la lista de excepciones con su justificación técnica, (c) si el nivel 2 tiene o no condición de cierre.

---

# 5. COMPARATIVA

| Criterio | A (cliente) | B (todas 75) | C (incremental) | D (híbrida) |
|---|---|---|---|---|
| Universo computable del schema | ❌ `[ND]` | ✅ 75 | ❌ ninguno | ✅ si nivel 1 es estructural |
| Rompe operaciones válidas | parcial (1 caso) | **✅ SÍ, probado** `[E]` | ❌ | ❌ si excluye contraejemplos |
| Cobertura ilusoria | ❌ | ✅ 4 casos `[E]` | ❌ | ❌ |
| Costo sin beneficio | ❌ | ✅ 20 casos | ❌ | ❌ |
| Completitud verificable por test | ❌ | ✅ | ❌ | ✅ (nivel 1) |
| Compatible con mecanismo actual | casi | ❌ | ✅ | ✅ |
| Alineada con T01-01 / ISO-001 | **✅ literal** | parcial | método | ✅ |
| Respeta T01-05 (tx) | ✅ | ❌ | ✅ | ✅ |
| Tiene condición de parada | débil | ✅ | **❌** | ✅ (nivel 1) |
| Performance | buena | **peor** | óptima | acotada |

---

# 6. HECHOS VERIFICADOS

## `[E]` — por ejecución

| Ref | Hecho |
|---|---|
| E-01 | 108 relaciones con FK; 28→`Empresa`; 75→tenant-owned; 5→sin `empresaId`; 50 E→E; 25 noE→E — **los 6 datos aportados son exactos** |
| E-02 | **Cero FKs compuestas** en las 108 |
| E-03 | **E→noE = 0** |
| E-04 | 42 modelos, 28 con `empresaId` |
| E-05 | 10 registradas; **las 10 pertenecen a G1** |
| E-06 | **El cliente externo NO ve filas creadas en una transacción abierta** → registrar relaciones same-tx produce falso rechazo |
| E-07 | El colector **no recoge** el FK del padre en un nested create (`VentaItem.venta` no aparece) |
| E-08 | `AuditLog` no está en el registry; el colector devuelve `[]` para `AuditLog.create` con `ventaId` |
| E-09 | Reparto: G1=32, G2=20, G3=23 |
| E-10 | 22 relaciones de G1 sin registrar |

## `[C]` — por código

| Ref | Hecho |
|---|---|
| C-01 | `verificarOwnershipRelacional` lanza si el destino no está en `MODELOS_CON_EMPRESA_ID` → las 5 de §1.2 no son registrables |
| C-02 | El preflight recibe `client`, no `tx` (`empresa-scope.extension.ts:156`) |
| C-03 | `MODELOS_CON_EMPRESA_ID` tiene 28 entradas e **incluye** `PagoProveedor` y `DevolucionProveedor` |
| C-04 | `compras.service.ts:226` crea `Lote` en tx y `:228` lo referencia desde `MovimientoStock` |
| C-05 | `compras.service.ts:214` crea `RecepcionCompra` en tx y luego la referencia |
| C-06 | `ventas.service.ts:190` crea `AuditLog` con `ventaId` de la Venta creada en la misma tx |
| C-07 | Ningún DTO declara `usuarioId`; las 20 de G2 son server-derived |
| C-08 | `ArqueoCaja.usuarioEntrante` **sí** viene del DTO y se valida a mano (`caja.service.ts:132`) |
| C-09 | Única superficie raw de negocio: `inventario.service.ts:266`, no altera FKs |
| C-10 | El registry es por *relación*, no por *ruta* → `DevolucionProveedorItem.lote` registrable y `MovimientoStock.lote` no, siendo el mismo destino |
| C-11 | No existe artefacto que documente un ranking de riesgo de relaciones |

## `[D]` — documentado

| Ref | Hecho |
|---|---|
| D-01 | `T01-01`: *"Client-supplied Business identifiers cannot select or override the effective Business"* |
| D-02 | `T01-03`: *"Every persisted relation participating in a Business-scoped nested operation must be validated against the same effective Business Context"* |
| D-03 | `T01-05`: *"The effective Business Context remains authoritative for the complete Business-scoped transaction, including all persistence performed through its transaction client"* |
| D-04 | El cierre contractual rotula ISO-001 como **"Client FK validation"** |
| D-05 | *"Client-supplied relation identifiers cannot override that ownership… If ownership cannot be determined unambiguously, the operation must fail closed"* |
| D-06 | Los IDs canónicos son **`T01-0x`**, no `T-01-0x` |

## `[ND]` — no determinable

| Ref | Ítem |
|---|---|
| ND-01 | Universo exacto de la política A: requiere auditar cada DTO/controller |
| ND-02 | Costo real de performance de B |
| ND-03 | Si `AplicacionPago.pago` referencia un `Pago` de la misma tx |
| ND-04 | Si existen rutas de escritura que pasen el FK del padre explícitamente a un `*Item` |
| ND-05 | Si registrar G1 completo degrada alguna operación no inspeccionada |

**Sin evidencia `[T]`:** no existe test que verifique completitud de ninguna política.

---

# 7. OPCIONES

| Opción | Descripción | Universo | Requiere cambio de mecanismo |
|---|---|---|---|
| **O-1** | Política A — FK provista por cliente | ~32 (`[ND]`) | mínimo (excluir `MovimientoStock.lote`) |
| **O-2** | Política B — las 75 | 75 | **SÍ** (preflight con `tx` + FK implícito) |
| **O-3** | Política C — incremental con ranking y parada explícitos | abierto | no |
| **O-4** | Política D con nivel 1 = **G1 menos same-tx** (≈30) | ≈30 + excepciones | no |
| **O-5** | Política D con nivel 1 = **G1 completo** (32) | 32 | sí, parcial (2 casos) |
| **O-6** | Status quo: 10, sin política declarada | 10 | no |

---

# 8. RECOMENDACIÓN TÉCNICA — **NO VINCULANTE**

**Recomiendo O-4: política D con nivel 1 definido como "G1 menos relaciones cuyo destino se crea en la misma transacción" (≈30 relaciones), más una lista explícita de excepciones justificadas.**

Fundamento, en orden de peso:

1. **Es la única opción que combina completitud verificable con compatibilidad probada.** El nivel 1 se deriva del schema (un test puede exigirlo), y al excluir los contraejemplos de CE-1 no rompe ninguna operación — a diferencia de B, cuyo fallo está **demostrado por ejecución**.
2. **Convierte las 10 registradas en una implementación parcial coherente**, no en una selección arbitraria: las 10 están en G1 `[E]`.
3. **Da la condición de parada que C no tiene** (su defecto definitorio) y la computabilidad que A no tiene.
4. **Deja el riesgo residual cuantificado**: G2 (20, sin vector), G3 (23, mayormente same-tx o FK implícito), las 5 no registrables. Es un número, no una incógnita.

**Lo que NO recomiendo, y por qué:**

- **O-2 (las 75):** rompe `recibirCompra` y `VentasService.create` con falsos rechazos `[E]`, añade cobertura ilusoria en 4 casos `[E]` y costo sin beneficio en 20. Es la opción que el encargo advertía no proponer, y la evidencia confirma la advertencia.
- **O-6 (status quo):** 65 relaciones sin protección y sin política declarada.
- **O-3 (C sola):** sin ranking documentado `[C]` ausencia ni condición de parada, no es una política.

**Prioridad dentro del nivel 1, si se adopta O-4** — por riesgo descendente, criterio propio:

1. `Producto.subfamilia/tipo/subtipo` — asimetría flagrante: `Producto.familia` ya está registrada y las otras tres ramas no.
2. `Lote.producto` — FK de catálogo desde el DTO, sin registrar.
3. `MovimientoStock.producto` — `producto` sí es registrable; `lote` es el que no.
4. `Pedido.cliente`, `Venta.cliente`, `CuentaCorriente.cliente`, `Deuda.cliente` — `Cliente` desde payload.
5. `Compra.proveedor`, `PagoProveedor.proveedor`, `DevolucionProveedor.proveedor`.
6. `Subfamilia.familia`, `Tipo.subfamilia`, `Subtipo.tipo` — jerarquía de catálogo.
7. `ReglaFidelizacion.*` (4) — opcionales, superficie menor.
8. `Presentacion.producto`, `Legajo.cliente`.

**No ejecuté esta priorización ni la registré.** Es insumo para la decisión.

---

# 9. DECISIÓN REQUERIDA DEL OWNER

| # | Decisión | Opciones | Impacto |
|---|---|---|---|
| **OD-1** | **¿Cuál es el criterio normativo de cobertura?** | A (origen del dato) · B (estructura del schema) · C (incremental) · **D (híbrida)** | **CRÍTICO** — define el universo y la condición de completitud |
| **OD-2** | **Si D: ¿cómo se define el nivel 1?** | G1 completo (32) · G1 menos same-tx (≈30) · árbol de catálogo (15) · otra | **CRÍTICO** — es la variable que decide si D es sólida o es C renombrada |
| **OD-3** | **¿Se acepta la lista de excepciones como permanente o transitoria?** | permanente con justificación · transitoria con plan de cierre | ALTO — determina si el nivel 2 puede quedar abierto |
| **OD-4** | **¿Se autoriza modificar el mecanismo para que el preflight use `tx`?** | sí · no · solo si se adopta B | **ALTO** — es la precondición de B; sin esto B es inviable. **Es decisión técnica, no de negocio** |
| **OD-5** | **¿Las 5 relaciones hacia modelos sin `empresaId` se declaran fuera de alcance o esperan la resolución de ownership derivado?** | fuera de alcance · esperan ISO-003 | MEDIO — hoy son no registrables por construcción |
| **OD-6** | **¿Se exige un test de completitud del nivel 1 como gate?** | sí · no | MEDIO — es lo que convierte la política en verificable |

**Ninguna de estas decisiones la tomo yo.** Las dejo planteadas con su evidencia.

---

# 10. DECLARACIÓN DE CUMPLIMIENTO

| Restricción | Cumplimiento |
|---|---|
| No modificar código | **Cumplido** — ningún archivo de `apps/api/src` tocado por mí |
| No modificar registry | **Cumplido** — verificado intacto |
| No modificar workflows | **Cumplido** |
| No modificar contratos/invariants | **Cumplido** |
| **No tomar decisiones** | **Cumplido** — §8 es explícitamente no vinculante; §9 deja 6 decisiones abiertas |
| No asumir que C o D son correctas | **Cumplido** — ambas evaluadas críticamente; C se señala sin condición de parada y D se condiciona a OD-2 |
| **No proponer simplemente registrar las 75** | **Cumplido** — B se descarta con contraejemplos probados `[E]` |
| Buscar contraejemplos | **Cumplido** — 5 clases, la principal probada por ejecución |
| No commit / push | **Cumplido** |

**Acciones realizadas:** lectura de código, schema y documentación canónica; censo del DMMF; un probe contra PostgreSQL que creó y **borró** sus propios datos. Todos los scripts auxiliares vivieron en el scratchpad, fuera del repositorio, y fueron eliminados.

**Nota de estado:** `git status` puede mostrar cambios en `apps/api/test/**` y nuevos documentos; provienen del contexto de implementación que trabaja en paralelo, no de este informe.

---

**RED TEAM COVERAGE POLICY — NO CANÓNICO — NO APROBADO — SIN DECISIÓN TOMADA.**
