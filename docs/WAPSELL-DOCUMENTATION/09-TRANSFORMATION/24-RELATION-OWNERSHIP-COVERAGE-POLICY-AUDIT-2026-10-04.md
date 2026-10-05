# B3 — RELATION OWNERSHIP COVERAGE POLICY AUDIT
## DEFINICIÓN DEL PROBLEMA DE COBERTURA — READ-ONLY

**Estado:** AUDITORÍA DE POLÍTICA DE COBERTURA — READ-ONLY — NO CANÓNICO — NO APROBADO
**Fecha:** 2026-10-04
**Repo:** `fmonfasani/otrarondamas` · **Branch:** `chore/build-in-ci` · **Commit base:** `6c5a207`, con 1 cambio sin commitear en `relation-ownership.ts`
**Alcance:** exclusivamente la **política de cobertura** del mecanismo `RELACIONES_CON_OWNERSHIP`.

**Acción:** sin cambios de código, tests, schema, registry ni workflow. Sin commits ni push. Sin modificar documentos canónicos, contratos, invariants ni el estado de B3. **No se autoriza `MovimientoStock`. No se agrega ninguna relación al registry. No se toma ninguna decisión.**

**Clases de evidencia:** `[C]` código/schema · `[T]` test escrito · `[E]` ejecución real · `[D]` documentado · `[ND]` no determinable.

> **No se declara B3 VERIFIED.** En esta auditoría no ejecuté tests ni verifiqué runs de CI. Todo `[E]` que aparezca es **citado**, con su fuente indicada.
>
> **No elijo una política.** Si las fuentes no contienen una decisión aprobada, lo declaro `[ND]` y produzco una **recomendación de decisión**, no una decisión.

---

# 1. EXECUTIVE SUMMARY

## 1.1 El hallazgo que redefine el problema

La ambigüedad planteada (A: cobertura dirigida por write paths · B: cobertura dirigida por riesgo de ownership) asume que el registry sigue **una** de las dos políticas. **Verificado: hoy no sigue ninguna de las dos de forma consistente** `[C]`.

Derivé ambos universos del schema y los cruzé contra el registry:

| | Universo | Registradas de ese universo | Registradas fuera de ese universo |
|---|---|---|---|
| **Política A** — FK provista por el cliente (declarada en un DTO) | **31** de 75 | 8 de 31 (26%) | **2** |
| **Política B** — toda relación hacia modelo tenant-owned | **75** | 10 de 75 (13%) | 0 |

Las **2 relaciones registradas que caen fuera de la política A** son `VentaItem.reglaFidelizacion` y `PedidoItem.reglaFidelizacion` `[C]`. Su FK **no** proviene de un DTO en el camino principal: se deriva del servidor (`ventas.service.ts:95` y `tienda.service.ts:209` la toman de `descuentoFidelizacion?.reglaId`). Sí aparece en un segundo camino (`:182`, `:273`, `:258`) como `item.reglaFidelizacionId`, lo que la hace **mixta**.

**Consecuencia:** el registry actual es el resultado de **selección caso por caso**, no de una política. Esa es la ambigüedad real, y es más profunda que A-vs-B.

## 1.2 El número 75, derivado y no citado

Lo computé con un parser del schema, no lo tomé de ningún documento `[C]`:

```
108  relaciones con FK en el origen  (campos con @relation(fields: [...]))
 ├── 28  → Empresa            = la columna de scope misma
 ├── 75  → modelo CON empresaId (excluyendo Empresa)   ← el 75
 └──  5  → modelo SIN empresaId (excluyendo Empresa)
```

De las 75: **50 son E→E** (origen con `empresaId`) y **25 son noE→E**. **Ninguna FK es compuesta** — todas son de una sola columna `[C]`, lo que es el prerrequisito técnico que el mecanismo exige (`relation-ownership.ts:61-70`).

## 1.3 Las cinco relaciones hacia destino sin `empresaId`

No forman parte del 75 y **no son candidatas** al mecanismo actual, porque `verificarOwnershipRelacional` exige que el destino tenga `empresaId` directo (extensión `:121-124`) `[C]`:

| Relación | Destino | Naturaleza |
|---|---|---|
| `UsuarioPermiso.permiso → Permiso` | global legítimo | fuera de alcance |
| `DocumentoLegajo.legajo → Legajo` | ownership **ambiguo** | `ISO-AMBIG`, TECHNICAL OPEN |
| `MovimientoCaja.aperturaCaja → AperturaCaja` | derivado vía `caja` | requiere estrategia de herencia |
| `ArqueoCaja.aperturaCaja → AperturaCaja` | ídem | ídem |
| `CierreCaja.aperturaCaja → AperturaCaja` | ídem | ídem |

## 1.4 Hecho nuevo que corrige mi auditoría anterior

El documento `13-AUDIT/29-RED-TEAM-PRODUCTOPROVEEDOR-SLICE-ADVERSARIAL-REVIEW` **ejecutó** la suite del slice `ProductoProveedor` y reporta `[E]`:

> *"No hay verde: la suite está en rojo"* · **Veredicto: FAIL** · causa inmediata: colisión de fixtures con el `@@unique`; causa de fondo: la implementación no está commiteada y `update` no está demostrado `[D]`(citando `[E]`).

En mi auditoría previa (`09-TRANSFORMATION/23`) clasifiqué `ProductoProveedor.producto/proveedor` como **REQUIRES EXECUTION** por no haber observado ejecución. **Corrijo:** hay ejecución citada y su resultado es **FAIL**. La clasificación correcta es **EXECUTED — FAILING**, que no es lo mismo que "pendiente".

El red team confirma además, de forma independiente, el hallazgo CONTRA-04 de mi informe: *"Desde HEAD limpio, `ProductoProveedor` no está protegido en absoluto"* `[C]`.

## 1.5 La discrepancia Gate 8 vs B3 Post-Owner: reconciliable por universo, con una reserva

**Sí se reconcilia por diferencia de universo** (§8), y la reserva importa: ninguno de los dos documentos declara su universo, y existe un **tercer** dato — el red team — que arroja `[E]` con resultado **FAIL**, el cual no aparece en ninguno de los dos. La contradicción es documental, no de hecho; pero el conjunto de los tres documentos no es coherente como cuerpo de evidencia.

## 1.6 Lo que falta para decidir

**No existe en la documentación canónica ninguna decisión aprobada sobre el universo del registry** `[C]` ausencia (§6). El mecanismo nació como "implementación mínima" de un Gate y creció por slices, sin que ningún documento enunciara el criterio. Se requiere **una decisión del Owner**; produzco tres opciones de política con su impacto cuantificado (§E).

---

# 2. PASO 1 — INVENTARIO DEL UNIVERSO

## 2.1 Método

Parser del schema (`prisma/schema.prisma`), no grep sobre documentación `[C]`:

1. extraer los 42 bloques `model`;
2. marcar los que tienen la columna `empresaId` → **28**;
3. extraer todo campo de relación que **posee la FK**, es decir con `@relation(fields: [...])` → **108**;
4. clasificar por el modelo destino.

El paso 3 es el que define el universo: un campo de relación sin `fields:[]` es el **lado inverso** y no escribe nada, por lo que no es superficie de persistencia.

## 2.2 Resultado

| Dimensión | Valor | Evidencia |
|---|---|---|
| Modelos | 42 | `[C]` |
| Con `empresaId` | 28 | `[C]` |
| Sin `empresaId` | 14 | `[C]` |
| Relaciones con FK en el origen | **108** | `[C]` |
| → `Empresa` | 28 | `[C]` |
| → modelo con `empresaId` | **75** | `[C]` |
| → modelo sin `empresaId` | 5 | `[C]` |
| FK compuestas | **0** | `[C]` |
| `MODELOS_CON_EMPRESA_ID` | 28/28, completa | `[C]` |
| Registry | 6 modelos, **10** relaciones | `[C]` |

---

# 3. PASO 2 — CLASIFICACIÓN MULTIDIMENSIONAL

Las dimensiones que pide el encargo, cada una derivada por separado.

## 3.1 Por naturaleza de los modelos

| Clase | Cantidad | Nota |
|---|---|---|
| **Tenant-owned → tenant-owned (E→E)** | **50** | ambos extremos con `empresaId` |
| **Sin `empresaId` → tenant-owned (noE→E)** | **25** | el origen hereda ownership por relación |
| **→ `Empresa`** | 28 | la columna de scope; no es superficie relacional |
| **→ modelo global o sin `empresaId`** | 5 | 1 global legítimo, 1 ambiguo, 3 derivados de `AperturaCaja` |

## 3.2 Por write path

Dimensión decisiva para la política A. La determiné por **FK declarada en un DTO**, que es el criterio observable de "provista por el cliente" `[C]`. 37 archivos DTO inspeccionados.

**FK presentes en DTOs (11 nombres distintos):** `clienteId`, `compraItemId`, `entidadId`, `familiaId`, `loteId`, `productoId`, `proveedorId`, `subfamiliaId`, `subtipoId`, `tipoId`, `usuarioEntranteId`.

| Clase | Cantidad |
|---|---|
| **Con FK provista por el cliente** (universo A) | **31** de 75 |
| Sin FK provista por el cliente | 44 de 75 |

De las 44 restantes, la mayoría recibe su FK del **contexto autenticado** (`usuarioId` del JWT) o de una **lectura previa del servidor** — riesgo de tenant estructuralmente menor, no nulo.

**Advertencia de método:** "declarada en un DTO" es una aproximación. Un FK puede llegar por un camino no-DTO (parámetro de método tras una lectura scoped) y seguir siendo seguro; o estar en un DTO de un endpoint que nunca se usa. Esta columna es **indicativa, no normativa** `[ND]` en los casos límite.

## 3.3 Por estado en el mecanismo y la evidencia

Las 10 registradas, con su estado real de evidencia. **Corrige** la tabla de mi informe `23`:

| # | Relación | Registrada | Tested `[T]` | Executed `[E]` | Estado |
|---|---|---|---|---|---|
| 1 | VentaItem.producto → Producto | sí | sí | **sí** (doc 12, 17/17) | **VERIFIED [E] citado** |
| 2 | VentaItem.reglaFidelizacion → ReglaFidelizacion | sí | sí | **sí** (doc 18, Gate 6.3) | **VERIFIED [E] citado** |
| 3 | PedidoItem.producto → Producto | sí | sí | **sí** (doc 14, run `37217710481`) | **VERIFIED [E] citado** |
| 4 | PedidoItem.reglaFidelizacion → ReglaFidelizacion | sí | sí | **sí** (doc 16, Gate 6.2) | **VERIFIED [E] citado** |
| 5 | CompraItem.producto → Producto | sí | sí (`C-01..C-06`) | no observado | **TESTED, NOT EXECUTED** |
| 6 | DevolucionProveedorItem.producto → Producto | sí | sí (`D-01..D-07`) | no observado; **spec fuera de CI** | **TESTED, NOT EXECUTED** |
| 7 | DevolucionProveedorItem.lote → Lote | sí | sí | ídem | **TESTED, NOT EXECUTED** |
| 8 | Producto.familia → Familia | sí | sí | no observado | **TESTED, NOT EXECUTED** |
| 9 | ProductoProveedor.producto → Producto | **sí, sin commitear** | sí (`PP-01..PP-06`) | **sí — FAIL** (doc 29) | **EXECUTED — FAILING** |
| 10 | ProductoProveedor.proveedor → Proveedor | **sí, sin commitear** | sí | **sí — FAIL** (doc 29) | **EXECUTED — FAILING** |

**Regression-covered:** únicamente los specs que CI ejecuta — 5 de 7. `b3-devolucion-proveedor-item` y `tenant-isolation` quedan fuera del workflow B3 `[C]`.

## 3.4 La tabla que define el problema

Cruce de las dos políticas con el registry actual. **Verificado por computación, no por lectura** `[C]`:

| Relación (universo A: FK del cliente) | FK | ¿Registrada? |
|---|---|---|
| CompraItem.producto → Producto | `productoId` | **SÍ** |
| DevolucionProveedorItem.lote → Lote | `loteId` | **SÍ** |
| DevolucionProveedorItem.producto → Producto | `productoId` | **SÍ** |
| PedidoItem.producto → Producto | `productoId` | **SÍ** |
| Producto.familia → Familia | `familiaId` | **SÍ** |
| ProductoProveedor.producto → Producto | `productoId` | **SÍ** (sin commitear) |
| ProductoProveedor.proveedor → Proveedor | `proveedorId` | **SÍ** (sin commitear) |
| VentaItem.producto → Producto | `productoId` | **SÍ** |
| ArqueoCaja.usuarioEntrante → Usuario | `usuarioEntranteId` | no |
| Compra.proveedor → Proveedor | `proveedorId` | no |
| CuentaCorriente.cliente → Cliente | `clienteId` | no |
| Deuda.cliente → Cliente | `clienteId` | no |
| DevolucionProveedor.proveedor → Proveedor | `proveedorId` | no |
| Legajo.cliente → Cliente | `clienteId` | no |
| Lote.producto → Producto | `productoId` | no |
| **MovimientoStock.lote → Lote** | `loteId` | no |
| **MovimientoStock.producto → Producto** | `productoId` | no |
| PagoProveedor.proveedor → Proveedor | `proveedorId` | no |
| Pedido.cliente → Cliente | `clienteId` | no |
| Presentacion.producto → Producto | `productoId` | no |
| Producto.subfamilia → Subfamilia | `subfamiliaId` | no |
| Producto.subtipo → Subtipo | `subtipoId` | no |
| Producto.tipo → Tipo | `tipoId` | no |
| ReglaFidelizacion.familia → Familia | `familiaId` | no |
| ReglaFidelizacion.subfamilia → Subfamilia | `subfamiliaId` | no |
| ReglaFidelizacion.subtipo → Subtipo | `subtipoId` | no |
| ReglaFidelizacion.tipo → Tipo | `tipoId` | no |
| Subfamilia.familia → Familia | `familiaId` | no |
| Subtipo.tipo → Tipo | `tipoId` | no |
| Tipo.subfamilia → Subfamilia | `subfamiliaId` | no |
| Venta.cliente → Cliente | `clienteId` | no |

**8 de 31 cubiertas (26%).** Y las **2 registradas que NO están en esta tabla** — `VentaItem.reglaFidelizacion`, `PedidoItem.reglaFidelizacion` — son la prueba de que la política A no describe el registry actual.

---

# 4. PASO 3 — DE DÓNDE SALE EL 75

Respuesta directa, con la derivación completa.

**El 75 es el número de campos de relación que (a) poseen la FK y (b) apuntan a un modelo que tiene la columna `empresaId`, excluyendo `Empresa`.**

```
Para cada uno de los 42 modelos:
  para cada campo de relación con @relation(fields: [...]):      → 108 campos
    si destino == Empresa                                        →  28   (la columna de scope)
    elif destino ∈ {28 modelos con empresaId}                    →  75   ← ESTE
    else                                                         →   5   (destino sin empresaId)
```

**Por qué 108 y no más:** solo se cuentan los lados que **poseen** la FK. El lado inverso de cada relación (p. ej. `Producto.ventaItems`) no tiene `fields:[]`, no escribe nada y no es superficie de persistencia.

**Por qué se excluye `Empresa`:** esas 28 relaciones **son** el mecanismo de scope directo, gestionado por `MODELOS_CON_EMPRESA_ID` (completa, 28/28). No son candidatas a verificación relacional: verificar que `X.empresa` apunte a la empresa del contexto es tautológico, porque la extensión fuerza ese valor en `create` y lo inyecta en el `where`.

**Por qué el 75 es el techo del universo candidato y no el 108:** porque `verificarOwnershipRelacional` **exige** que el destino tenga `empresaId` directo; si no, lanza (extensión `:121-124`) `[C]`. Las 5 relaciones hacia destinos sin `empresaId` **no son registrables** con el mecanismo actual — requerirían una estrategia de ownership derivado que no existe.

**Coincidencia con el doc 20:** mi cifra coincide con la de `20-RELATION-OWNERSHIP-READONLY-AUDIT` (108 / 28 / 75 / 5, con 50 E→E y 25 noE→E). La derivé de forma independiente antes de leer su §1.

---

# 5. PASO 4 — DEFINICIÓN TÉCNICA DE LOS ESTADOS

Estos términos se usan hoy en la documentación sin definición común, y la confusión entre tres de ellos es la causa de la discrepancia del §8.

| Estado | Definición técnica propuesta | Condición verificable | Hoy |
|---|---|---|---|
| **Registered** | La relación figura en `RELACIONES_CON_OWNERSHIP` **en el árbol commiteado** de la rama evaluada, y su campo pasa la validación de forma del recolector (FK simple, relación de objeto) | entrada presente en HEAD + `relacionesRegistradas()` no lanza | **8** (10 si se cuenta el working tree) |
| **Candidate** | Existe un documento de auditoría que la identifica como superficie de verificación, con riesgo evaluado, **sin** entrada en el registry | documento de auditoría que la nombra | ~20 (doc 20, prioridad A/M) |
| **Tested** | Existe al menos un caso de test que ejercita un rechazo cross-Business **para esa relación**, en el repositorio | archivo + caso identificable | **10** |
| **Executed** | Existe un run real (CI o local documentado) que ejecutó esos casos. **Executed no implica PASS** | id de run o reporte citado | **6** (4 PASS citado + 2 FAIL citado) |
| **Regression-covered** | Los casos están en los `paths`/steps de un workflow que corre en cada push de la rama | entrada en `.github/workflows/` | **8** (los de los 5 specs en CI) |
| **Verified** | Registered ∧ Tested ∧ Executed ∧ **resultado PASS** ∧ Regression-covered, con el test demostrado **sensible** a la protección | las cinco condiciones simultáneas | **`[ND]` — ver abajo** |

**Las dos distinciones que más importan:**

1. **Executed ≠ PASS.** `ProductoProveedor` está Executed y **FAIL** `[D]`(citando `[E]`). Sin esta distinción, "ejecutado" se lee como "verificado".
2. **Verified exige sensibilidad del test.** El red team intentó medir si los tests son sensibles a la protección (desactivar la entrada del registry y comprobar que el test se pone rojo), la acción fue bloqueada por política, y por eso **ND-01 permanece `[ND]`** `[D]`. Sin esa medición, un verde podría ser accidental. **Bajo esta definición, hoy ninguna de las 75 relaciones es Verified en sentido estricto** — ni las 4 con PASS citado, porque su sensibilidad es inferencia y no medición.

---

# 6. PASO 5 + PASO 6 — COMPARACIÓN FORMAL DE LAS POLÍTICAS

## 6.1 Las dos políticas, cuantificadas

| | **A — write-path-driven** | **B — ownership-driven** |
|---|---|---|
| **Regla** | se registra la relación cuyo FK puede llegar del input del cliente | se registra toda relación hacia un modelo tenant-owned |
| **Universo** | **31** | **75** |
| **Cubierto hoy** | 8 (26%) | 10 (13%) |
| **Faltante** | 23 | 65 |
| **Criterio de admisión** | observable pero **inestable**: depende de los DTOs, que cambian con cada endpoint nuevo | **estable**: deriva del schema, invariante ante cambios de API |
| **Enumerabilidad** | requiere inspeccionar 37 DTOs y los caminos no-DTO | computable del schema en una línea |
| **Riesgo de falso negativo** | **alto**: un FK que llegue por un camino no-DTO queda fuera; un endpoint nuevo amplía el universo sin aviso | bajo |
| **Riesgo de sobre-cobertura** | bajo | **alto**: incluye ~25 relaciones cuyo FK viene del contexto autenticado (`usuarioId` del JWT), donde el cliente no elige el valor |
| **Costo de verificación** | 23 slices × (test + CI + evidencia) | 65 slices |
| **Coste operativo del fail-closed** | acotado | **alto**: cada registro hace fallar cerrado formas no soportadas (`set`, `disconnect`, `connectOrCreate`), y puede romper flujos existentes |
| **Alineación con R8-ARCH-002 §3.4** (el cliente no sobrescribe el tenant) | **directa** | indirecta |
| **Alineación con R8-ARCH-002 §3.9** (nested/related preserva ownership) | parcial | **directa** |
| **Compatible con el registry actual** | **no** — 2 registradas quedan fuera | **sí** — las 10 están dentro |

## 6.2 Lo que ninguna de las dos resuelve

| Ítem | Por qué |
|---|---|
| Las 5 relaciones hacia destino sin `empresaId` | el mecanismo las rechaza por diseño; requieren estrategia de ownership derivado |
| `DocumentoLegajo.legajo` | ownership ambiguo (`ISO-AMBIG`); requiere decisión de modelo |
| Relación entre registry y verificación compensatoria en servicio | `verificarJerarquia` valida además **coherencia jerárquica**, que no es ownership de tenant. Registrar no la sustituye |
| Qué hacer con una relación registrada cuyo flujo usa `set`/`disconnect` | fallaría cerrado; el doc 20 §14.5 lo propone como spike previo |

## 6.3 Una tercera lectura que las fuentes permiten

El registry actual no es A ni B: es **C — risk-ranked incremental**. Cada entrada se sumó tras un Gate con auditoría, test y (en 4 casos) ejecución. La secuencia observable `[C]`/`[D]`: VentaItem→Producto (Gate 4) → PedidoItem→Producto (6.1) → PedidoItem→Regla (6.2) → VentaItem→Regla (6.3) → CompraItem→Producto (6.4) → DevolucionProveedorItem → Producto→Familia → ProductoProveedor.

Esa política explica **las 10 entradas sin excepción**, incluidas las 2 que la política A no explica. Lo que no tiene es **regla de admisión escrita ni criterio de completitud**: no dice cuándo termina.

**No afirmo que C sea la política aprobada.** Es la que el comportamiento observado sugiere, y por eso la incluyo como opción en §E.

## 6.4 `ProductoProveedor` como caso de prueba de las políticas

| Política | ¿Califica `ProductoProveedor`? |
|---|---|
| **A** — FK del cliente | **Sí formalmente**: `productoId` y `proveedorId` están en DTOs `[C]`. **No materialmente**: el modelo no se escribe desde ninguna ruta (`grep` → aparece **solo** en los 2 archivos del mecanismo) `[C]` |
| **B** — ownership | **Sí** — es E→E hacia modelos tenant-owned |
| **C** — risk-ranked | **Discutible**: su riesgo material hoy es nulo por ausencia de call site; lo que protege es una superficie futura |

**Esto es lo que la decisión debe resolver:** si el registry protege **superficie existente** o **superficie posible**. Bajo A-material y bajo C, `ProductoProveedor` no era el siguiente slice. Bajo B y A-formal, sí.

---

# 7. PASO 6 — ¿EXISTE DECISIÓN APROBADA?

**No. `[ND]` por ausencia de fuente.**

Búsqueda realizada `[C]`:

| Fuente | Resultado |
|---|---|
| `grep -rln "RELACIONES_CON_OWNERSHIP"` en toda la documentación | 11 archivos: 9 en `09-TRANSFORMATION/` (Gates y auditorías), 2 en `13-AUDIT/`. **Ninguno en `03-DECISIONS/` ni en `07-DESIGN/CONTRACTS/`** |
| `03-DECISIONS/28-R8-ARCH-002` | aprueba el mecanismo (aislamiento de aplicación) y las 12 propiedades; **§6 declara abierta** la propagación de ownership directo/indirecto. No define universo de relaciones |
| `07-DESIGN/CONTRACTS/DOMAIN/09-R8-ARCH-002-TENANT-ISOLATION-CONTRACT-v0.1` | contratos `B3-CON-*` sobre nested writes y FK. No define criterio de admisión al registry |
| `09-TRANSFORMATION/12-…GATE-4-MINIMAL-IMPLEMENTATION` | implementación mínima; **no enuncia criterio de selección** (grep de "criterio/criterion/por qué/selec" → cero coincidencias) |
| `09-TRANSFORMATION/20-…READONLY-AUDIT` §13-§14 | **priorización recomendada**, explícitamente *"candidatos para que el Owner elija; no son implementaciones ni cierres"* — propuesta, no decisión |

**Conclusión:** el universo del registry **nunca fue decidido**. El mecanismo nació como implementación mínima de un Gate y creció por slices, cada uno con su auditoría, sin que ningún documento enunciara la regla de admisión ni el criterio de completitud. **No invento la decisión.**

---

# 8. PASO 8 — LA DISCREPANCIA GATE 8 vs B3 POST-OWNER

## 8.1 Las afirmaciones

| Documento | Afirmación |
|---|---|
| `09-TRANSFORMATION/18-…GATE-8-EVIDENCE-CLOSURE` | 7 filas `[E]` VERIFIED; *"verified by real CI/PostgreSQL execution"*; Run #62 SUCCESS; veredicto **"VERIFIED FOR EXECUTED/COVERED SLICES [E] — GLOBAL CLOSURE PENDING EXPANDED COVERAGE"** `[D]` |
| `13-AUDIT/32-B3-POST-OWNER-APPROVAL-READINESS-CLOSURE` | **"[T] = 0, [E] = 0"**; veredicto **"READY FOR TEST EXECUTION — NOT VERIFIED"** `[D]` |

## 8.2 Veredicto: **RECONCILIABLE POR DIFERENCIA DE UNIVERSO**, con reserva

**Se reconcilia.** Miden universos distintos, y cada uno es correcto en el suyo:

| | Doc 18 (Gate 8) | Doc 32 (B3 closure) |
|---|---|---|
| **Universo** | slices de relación implementados, con IDs de Gate (6.1, 6.2, 6.3, 7) | criterios canónicos `ISO-001..009` / `TE-B3-*` del contrato T-01 |
| **Unidad** | la relación concreta | el criterio normativo |
| **"Verified"** | el slice rechaza cross-Business en la forma que el test ejerce | el criterio canónico tiene implementación de test y ejecución |
| **Afirmación** | 4 relaciones con `[E]` | **ningún `ISO-*` tiene test implementado** |

Ambas pueden ser verdaderas a la vez: existen tests de **relación** ejecutados, y **cero** tests de los **criterios canónicos**. El doc 18 lo dice en su propio veredicto ("FOR EXECUTED/COVERED SLICES", "GLOBAL CLOSURE PENDING").

**La reserva, y es sustantiva:**

1. **Ninguno de los dos declara su universo.** Un lector del 18 concluye que hay evidencia de ejecución; uno del 32, que no hay ninguna. La contradicción es real **para el lector**, aunque no para los hechos.
2. **El doc 32 es posterior y más restrictivo**, pero su `[E] = 0` es falso si se lee sobre el universo de slices. Debería decir *"[E] = 0 para los criterios canónicos ISO-*"*.
3. **Existe un tercer dato que ninguno recoge:** el red team (doc 29) ejecutó `ProductoProveedor` con resultado **FAIL** `[D]`(citando `[E]`). Hay entonces `[E]` con resultado negativo que no aparece ni en el 18 (que lista solo PASS) ni en el 32 (que afirma cero). **El cuerpo de evidencia de los tres documentos no es coherente como conjunto.**

**Clasificación final:** contradicción **documental de alcance**, reconciliable declarando universos, **más** una omisión real de evidencia negativa en ambos. No es contradicción de hecho. **No la corrijo.**

---

# A. FACTS VERIFIED

Todo `[C]` por computación o lectura directa en esta auditoría.

1. 42 modelos; 28 con `empresaId`; 14 sin.
2. **108** relaciones con FK en el origen; **ninguna FK compuesta**.
3. Descomposición: 28 → `Empresa`; **75** → modelo con `empresaId`; 5 → modelo sin `empresaId`.
4. De las 75: **50 E→E**, **25 noE→E**.
5. `MODELOS_CON_EMPRESA_ID` = **28/28, completa** (diff de conjuntos vacío).
6. Registry: 6 modelos, **10** relaciones — de las cuales **2 sin commitear** (`ProductoProveedor`).
7. **Universo de la política A = 31** de 75 (FK declarada en alguno de los 37 DTOs).
8. Universo de la política B = 75.
9. Cobertura actual: **8 de 31** bajo A (26%); **10 de 75** bajo B (13%).
10. **2 relaciones registradas caen fuera del universo A**: `VentaItem.reglaFidelizacion`, `PedidoItem.reglaFidelizacion`.
11. `reglaFidelizacionId` tiene **doble origen**: derivado del servidor (`ventas.service.ts:95`, `tienda.service.ts:209`) y del item (`:182`, `:273`, `:258`).
12. `ProductoProveedor` aparece **solo** en `empresa-scope.extension.ts:50` y `relation-ownership.ts:27` — **cero código de aplicación**.
13. FK en DTOs: 11 nombres distintos en 20 declaraciones.
14. El mecanismo **exige destino con `empresaId` directo**; las 5 relaciones hacia destinos sin él no son registrables (extensión `:121-124`).
15. **Ningún documento en `03-DECISIONS/` ni en `07-DESIGN/CONTRACTS/` menciona `RELACIONES_CON_OWNERSHIP`.**
16. `09-TRANSFORMATION/12-…GATE-4` no enuncia criterio de selección.
17. CI ejecuta 5 de 7 specs; `b3-devolucion-proveedor-item` y `tenant-isolation` quedan fuera del workflow B3.

Citado `[D]` de otros documentos:

18. Doc 29 (red team) **ejecutó** la suite de `ProductoProveedor`: resultado **FAIL / rojo**, por colisión de fixtures y `update` no demostrado.
19. Doc 29 confirma independientemente que desde HEAD limpio `ProductoProveedor` no está protegido.
20. Doc 29 deja `ND-01` (sensibilidad del test medida) en `[ND]`: la prueba de mutación fue bloqueada por política de permisos.
21. Doc 18 afirma `[E]` para Gates 6.1/6.2/6.3/7 y Run #62 SUCCESS.
22. Doc 32 afirma `[T]=0 / [E]=0` y B3 NOT VERIFIED.

# B. INFERENCES

Marcadas como inferencia, no como hecho.

1. **El registry sigue una política implícita "risk-ranked incremental" (C)**, no A ni B. Es la única que explica las 10 entradas, incluidas las 2 que A no explica. Inferencia desde la secuencia de Gates `[C]`+`[D]`.
2. **`ProductoProveedor` marca un cambio de criterio tácito**: de "relación con escritura real" a "relación con superficie posible". Los 5 registros previos tenían call site; éste no.
3. **La política A es inestable como regla permanente**: su universo depende de los DTOs y crece con cada endpoint nuevo, sin señal. La B es estable porque deriva del schema.
4. **La política B tiene un coste operativo probablemente subestimado**: cada registro hace fallar cerrado las formas no soportadas (`set`, `disconnect`, `connectOrCreate`). Con 65 registros más, la superficie de rotura crece de forma no lineal. El doc 20 §14.5 propone el spike que lo mediría.
5. **Las ~25 relaciones con FK del contexto autenticado tienen riesgo materialmente menor**, porque el cliente no elige el valor. Incluirlas en el universo obligatorio diluye la priorización por riesgo.
6. **La discrepancia del §8 es de redacción, no de hechos** — ambos documentos omitieron declarar su universo.

# C. NOT DETERMINABLE

| ID | Ítem | Por qué |
|---|---|---|
| ND-1 | **Cuál es la política aprobada** | ningún documento canónico la enuncia (§7) |
| ND-2 | Por qué se priorizó `ProductoProveedor` sobre relaciones con call site real | no hay documento que lo justifique |
| ND-3 | Si los tests son **sensibles** a la protección | prueba de mutación bloqueada; heredado de doc 29 `ND-01` |
| ND-4 | Si `verificarJerarquia` debe conservarse como defensa en profundidad o retirarse | no decidido |
| ND-5 | Semántica de `Pago.deuda` → `CuentaCorriente` (campo `deuda`, destino `CuentaCorriente`) | `schema.prisma:783-784`; bloquea el lote de pagos |
| ND-6 | Qué flujos usan `set`/`disconnect`/`connectOrCreate` sobre relaciones candidatas | requiere el spike del doc 20 §14.5 |
| ND-7 | Si la columna "FK en DTO" clasifica correctamente los casos límite | aproximación observable, no normativa |
| ND-8 | Estado real de los 5 specs en CI hoy | no ejecuté ni verifiqué runs |

# D. OPEN DECISIONS

Decisiones que **solo el Owner** puede tomar. No tomo ninguna.

| # | Decisión | Por qué requiere Owner |
|---|---|---|
| **OD-1** | **Universo del registry**: A (31), B (75), C (risk-ranked sin techo) o un híbrido | Define alcance, costo y criterio de completitud de B3. No es delegación técnica: fija cuánto trabajo de verificación se compromete |
| **OD-2** | **¿El registry protege superficie existente o posible?** | Es la pregunta de fondo que `ProductoProveedor` expuso |
| **OD-3** | **Criterio de completitud**: ¿cuándo se considera la cobertura relacional suficiente para cerrar B3? | Sin esto, B3 no tiene condición de salida |
| **OD-4** | **Tratamiento de las ~25 relaciones con FK del contexto**: ¿dentro o fuera del universo obligatorio? | Afecta directamente el tamaño de OD-1 |
| **OD-5** | **¿Se autoriza la prueba de mutación** (en clon desechable) para cerrar ND-3? | Implica debilitar temporalmente un control; requiere autorización explícita |
| **OD-6** | **Relación entre registry y verificación compensatoria en servicio**: ¿coexisten o el registry reemplaza? | `verificarJerarquia` valida también coherencia jerárquica, que no es ownership |

**Ninguna de estas requiere reabrir una Owner Decision aprobada.** Todas caen en el espacio que R8-ARCH-002 §6 declaró abierto.

# E. RECOMMENDED POLICY OPTIONS

Opciones con su impacto cuantificado. **Recomendación de decisión, no decisión.**

## Opción 1 — A estricta: write-path-driven

**Regla:** se registra la relación cuyo FK puede llegar del input del cliente en un camino de escritura existente.

| | |
|---|---|
| Universo | **31** (o menos si se exige call site material) |
| Faltan | 23 |
| A favor | alineada con R8-ARCH-002 §3.4; prioriza por riesgo real; costo acotado |
| En contra | **incompatible con el registry actual** (habría que justificar o retirar 2 entradas); universo inestable ante endpoints nuevos; requiere auditar 37 DTOs y los caminos no-DTO |
| Efecto sobre `ProductoProveedor` | queda **sin justificación material** (cero call sites) |

## Opción 2 — B estricta: ownership-driven

**Regla:** toda relación hacia un modelo tenant-owned entra al registry.

| | |
|---|---|
| Universo | **75** |
| Faltan | 65 |
| A favor | criterio **estable y computable del schema**; compatible con las 10 entradas actuales; alineada con §3.9; da condición de salida objetiva |
| En contra | 65 slices de verificación; incluye ~25 relaciones de riesgo bajo; **coste de fail-closed no medido** (inferencia B-4) |
| Efecto sobre `ProductoProveedor` | **justificado** |

## Opción 3 — Híbrida con niveles (la que recomiendo considerar primero)

**Regla en dos niveles:**
- **Nivel 1 — obligatorio:** toda relación hacia modelo tenant-owned **cuyo FK sea provisto por el cliente** → **31**, con prioridad por riesgo de dominio.
- **Nivel 2 — admisible:** el resto de las E→E/noE→E (44) entra **bajo demanda**, cuando se cree un write path que exponga el FK, o cuando una auditoría lo eleve.

| | |
|---|---|
| A favor | explica las 10 entradas actuales (las 2 de `reglaFidelizacion` entran por nivel 2, por su **doble origen** verificado); costo inicial acotado; criterio de completitud para el nivel 1; estable porque el nivel 2 es explícito y no tácito |
| En contra | dos niveles son más complejos de gobernar; requiere regla de promoción escrita |
| Efecto sobre `ProductoProveedor` | **nivel 2** — admisible y ya registrado, con la nota de que su riesgo material es hoy nulo |

**Por qué la señalo primero:** es la única de las tres que es **consistente con el estado actual del registry sin requerir retirar ni rejustificar entradas**, y la única que da condición de salida acotada a B3 sin comprometer 65 slices. No es una decisión: es la opción que menos trabajo de reconciliación documental genera.

**Independiente de la opción elegida**, tres puntos deberían quedar escritos: la regla de admisión, el criterio de completitud, y el tratamiento de las relaciones con FK del contexto autenticado.

# F. IMPACT ON RELATION COVERAGE

| Política | Universo | Cubierto | % | Faltan | Entradas actuales a rejustificar |
|---|---|---|---|---|---|
| **Hoy (sin política)** | indefinido | 10 | — | indefinido | — |
| **A estricta** | 31 | 8 | 26% | 23 | **2** (`reglaFidelizacion` ×2) |
| **B estricta** | 75 | 10 | 13% | 65 | 0 |
| **Híbrida — nivel 1** | 31 | 8 | 26% | 23 | 0 (las 2 pasan a nivel 2) |
| **Híbrida — total** | 75 | 10 | 13% | 65 (23 obligatorios) | 0 |

**Efecto sobre el estado reportado:** ninguna política cambia la evidencia existente. Cambia **el denominador**, y con él el significado de "B3 con cobertura suficiente". Hoy ese denominador no existe, y por eso B3 no tiene condición de salida verificable.

# G. IMPACT ON NEXT SLICE

**No autorizo `MovimientoStock` ni agrego ninguna relación.**

| Política | ¿Califica `MovimientoStock.{producto,lote}`? | Prioridad relativa |
|---|---|---|
| **A estricta** | **Sí** — `productoId` y `loteId` en DTOs; FK del DTO persistida sin verificar | **alta** — está en el universo obligatorio |
| **B estricta** | Sí — E→E | media — una de 65 |
| **Híbrida** | **Sí — nivel 1 obligatorio** | **alta** |

**Las tres políticas lo incluyen.** Eso lo vuelve robusto a OD-1: su justificación no depende de cuál se apruebe.

**Pero el orden cambia por un hecho nuevo, no por política:** el doc 29 reporta `ProductoProveedor` **ejecutado y en rojo** `[D]`(citando `[E]`), con su implementación sin commitear. Mientras eso siga así, abrir un slice nuevo acumula dos frentes abiertos y la evidencia de CI del frente actual es engañosa (afirma haber ejecutado un candidato contra un registry que HEAD no contiene).

**Secuencia que la evidencia sugiere** — no es autorización:
1. Cerrar `ProductoProveedor`: commitear, corregir fixtures, volver a ejecutar, cubrir `update`.
2. **Resolver OD-1** (universo), porque determina si el siguiente slice se elige por riesgo o por completitud de schema.
3. Recién entonces, el siguiente slice. `MovimientoStock` califica bajo las tres opciones.

**Advertencia de alcance sobre `MovimientoStock`**, ya señalada en mi informe 23: se escribe en recepción de compra, ajuste de inventario y devolución. Un registro que falle cerrado afectaría **tres flujos**; los positivos de los tres deberían existir antes.

# H. DOCUMENTS THAT WOULD REQUIRE PROPAGATION IF OWNER APPROVES

Si el Owner aprueba una política, esto habría que propagar. **No lo hago.**

## El documento que falta (el que cerraría la ambigüedad)

**`03-DECISIONS/4x-R8-ARCH-002-B-OWNER-DECISION-RELATION-OWNERSHIP-COVERAGE-POLICY-2026-10-xx.md`**

Debería fijar: la regla de admisión al registry; el universo resultante con su cifra; el criterio de completitud para cerrar la cobertura relacional de B3; el tratamiento de las relaciones con FK del contexto autenticado; y la relación entre registry y verificación compensatoria en servicio.

**Por qué en `03-DECISIONS/` y como decisión Owner:** fija alcance y compromiso de trabajo de verificación, no un mecanismo técnico. El mecanismo ya está aprobado por R8-ARCH-002; lo que falta es **su extensión**, que R8-ARCH-002 §6 dejó explícitamente abierta.

## Propagación

| # | Documento | Cambio |
|---|---|---|
| 1 | `07-DESIGN/CONTRACTS/DOMAIN/09-R8-ARCH-002-TENANT-ISOLATION-CONTRACT-v0.1` | agregar el contrato de **universo de cobertura relacional**; hoy define obligaciones de nested write/FK pero no su alcance |
| 2 | `07-DESIGN/INVARIANTS/` (archivo canónico B3, **aún inexistente**) | `ISO-002`/`ISO-003` deberían enunciar el universo; hoy no hay archivo canónico de invariants B3 |
| 3 | `07-DESIGN/TESTS-EVALS/` (B3, inexistente) | el criterio de completitud define cuántos TE se derivan |
| 4 | `09-TRANSFORMATION/20-…READONLY-AUDIT` | su §1 y §13 están **desactualizados** (dicen 26 modelos / 8 registradas; hoy 28 / 10) |
| 5 | `09-TRANSFORMATION/23-ARCHITECTURE-SPEC-COVERAGE-AUDIT` (mío) | CONTRA-06 quedaría resuelto; `ProductoProveedor` pasa a EXECUTED—FAILING |
| 6 | `09-TRANSFORMATION/18-…GATE-8-EVIDENCE-CLOSURE` | **declarar su universo** ("slices de relación", no criterios canónicos) y recoger la evidencia negativa del doc 29 |
| 7 | `13-AUDIT/32-B3-POST-OWNER-APPROVAL-READINESS-CLOSURE` | precisar `[E]=0` → *"para los criterios canónicos ISO-*"*; hoy es falso leído sobre slices |
| 8 | `11-IMPLEMENTATION-READINESS/TASKS/` | la política determina cuántas tareas de verificación se derivan |
| 9 | `apps/api/src/prisma/relation-ownership.ts` (comentario) | documentar la regla de admisión donde vive el registry |
| 10 | `apps/api/src/prisma/empresa-scope.extension.ts:33-37` | dice *"hoy solo VentaItem -> Producto"*; el registry tiene 10 relaciones |

**Secuencia:** decisión Owner → contrato (1) → invariants (2) → tests/evals (3) → reconciliación de auditorías (4-7) → tareas (8) → comentarios de código (9-10).

---

# EVIDENCE INDEX

## `[C]` — verificado por mí en esta auditoría

| Hecho | Método |
|---|---|
| 42 modelos, 28 con `empresaId` | parser de `prisma/schema.prisma` |
| **108 relaciones con FK en el origen; 0 compuestas** | parser: campos con `@relation(fields:[...])` |
| **Descomposición 28 / 75 / 5** | parser, clasificando por modelo destino |
| 50 E→E, 25 noE→E | parser |
| Las 5 relaciones hacia destino sin `empresaId`, enumeradas | parser |
| `MODELOS_CON_EMPRESA_ID` = 28/28 | `comm -23` schema vs lista |
| Registry = 6 modelos / 10 relaciones | `src/prisma/relation-ownership.ts:21-28` |
| `ProductoProveedor` sin commitear | `git diff` |
| **Universo A = 31**; 8 registradas; 2 registradas fuera de A | cruce computado DTOs × schema × registry |
| 11 FK distintas en 20 declaraciones de DTO | barrido de 37 archivos `*/dto/*.ts` |
| `reglaFidelizacionId` de doble origen | `ventas.service.ts:95,182,258`; `tienda.service.ts:209,273` |
| **`ProductoProveedor` solo en 2 archivos del mecanismo** | `grep -rn "productoProveedor\|ProductoProveedor" src/` excl. specs |
| El mecanismo exige destino con `empresaId` | `empresa-scope.extension.ts:121-124` |
| Validación de forma del recolector | `relation-ownership.ts:61-70` |
| **Ningún doc de `03-DECISIONS/` ni `07-DESIGN/CONTRACTS/` menciona el registry** | `grep -rln "RELACIONES_CON_OWNERSHIP"` → 11 archivos, todos en `09-TRANSFORMATION/` y `13-AUDIT/` |
| Gate 4 sin criterio de selección | grep sobre `12-…GATE-4` → cero |
| CI ejecuta 5 de 7 specs | `.github/workflows/b3-tenant-isolation-candidate.yml` |

## `[D]` — citado (con su fuente)

| Fuente | Qué aporta |
|---|---|
| `13-AUDIT/29-RED-TEAM-PRODUCTOPROVEEDOR-SLICE-ADVERSARIAL-REVIEW` | **`[E]`: suite en rojo, veredicto FAIL**; `update` no demostrado; HEAD limpio sin protección; `ND-01` sensibilidad no medida |
| `09-TRANSFORMATION/18-…GATE-8-EVIDENCE-CLOSURE` | `[E]` Gates 6.1/6.2/6.3/7; Run #62; veredicto por slices |
| `13-AUDIT/32-B3-POST-OWNER-APPROVAL-READINESS-CLOSURE` | `[T]=0 / [E]=0`; B3 NOT VERIFIED |
| `09-TRANSFORMATION/20-…READONLY-AUDIT` | matriz de 108; priorización §13-§14 como propuesta |
| `09-TRANSFORMATION/12..19` (Gates 4, 6.1-6.4) | `[E]` por slice |
| `03-DECISIONS/28-R8-ARCH-002` | las 12 propiedades; **§6 deja abierta** la propagación de ownership |
| `07-DESIGN/CONTRACTS/DOMAIN/09-R8-ARCH-002-…-v0.1` | contratos de nested write/FK sin universo |
| `09-TRANSFORMATION/23-ARCHITECTURE-SPEC-COVERAGE-AUDIT` | CONTRA-01..06; cobertura 10/75 |

## Clases no emitidas

**`[T]` observado = 0** · **`[E]` observado = 0.** No ejecuté tests ni verifiqué runs. Todo `[E]` es citado con fuente.

---

**No modifiqué código, tests, schema, registry ni workflow. No hice commits ni push. No modifiqué documentos canónicos, contratos ni invariants. No cambié el estado de B3. No autoricé `MovimientoStock`. No agregué relaciones al registry. No tomé ninguna decisión.**
