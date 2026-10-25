# B3 — ARCHITECTURE / SPEC / COVERAGE AUDIT
## AGENT 3 — READ-ONLY

**Estado:** AUDITORÍA DE ARQUITECTURA Y COBERTURA — READ-ONLY — NO CANÓNICO
**Fecha:** 2026-10-04
**Repo:** `fmonfasani/otrarondamas`
**Branch:** `chore/build-in-ci`
**Commit base:** `6c5a207` (`ci(b3): execute ProductoProveedor candidate`), con **1 cambio sin commitear** en `relation-ownership.ts`
**Rol:** arquitectura + SPEC + cobertura.

**Acción:** sin implementar código, sin modificar producción, sin commits, sin deploy, sin modificar documentos canónicos, sin crear decisiones.

**Clases de evidencia:** `[C]` código · `[T]` test escrito · `[E]` ejecución real · `[D]` documentado · `[ND]` no determinable.

> **Reglas de lectura aplicadas sin excepción:**
> **"registry entry" ≠ "verified isolation"** · **"test exists" ≠ "test executed successfully"**
>
> **No se declara B3 global VERIFIED.** En esta auditoría no ejecuté ningún test ni verifiqué ningún run de CI: todo `[E]` que aparezca abajo es **`[E]` citado de documentación**, nunca observado por mí.

---

# 1. EXECUTIVE SUMMARY

## 1.1 El estado avanzó respecto de la auditoría anterior

Desde el commit `d0ba8d7` (mi auditoría previa, documento `13-AUDIT/27-B3-PRISMA-PERSISTENCE-OPERATION-AUDIT`) hubo 8 commits. Dos de mis gaps se cerraron `[C]`:

| Gap previo | Estado ahora | Evidencia |
|---|---|---|
| **GAP-05** — `PagoProveedor`/`DevolucionProveedor` fuera de `MODELOS_CON_EMPRESA_ID` | **CERRADO** | commit `48dc336`; allow-list = **28/28**, verificado por diff de conjuntos contra el schema `[C]` |
| `b3-devolucion-proveedor-item` fuera de CI | **sigue abierto** | grep sobre `.github/workflows/` → **cero coincidencias** `[C]` |

El registry pasó de 5 a **6 modelos / 10 relaciones**, con `ProductoProveedor: ['producto','proveedor']` — **y ese último cambio está sin commitear** `[C]`.

## 1.2 Inventario real (verificado contra el schema)

| Dimensión | Valor | Verificación propia |
|---|---|---|
| Modelos | 42 | `grep -c '^model '` `[C]` |
| Con `empresaId` | **28** | `awk` por modelo `[C]` |
| Sin `empresaId` | 14 | ídem `[C]` |
| `MODELOS_CON_EMPRESA_ID` | **28 — completa** | `comm -23` schema vs lista → **vacío** `[C]` |
| Relaciones con FK en el origen | 108 | tomado de `20-RELATION-OWNERSHIP-READONLY-AUDIT` `[D]`; conteos base verificados |
| Relaciones hacia modelo con `empresaId` | 75 | ídem `[D]` |
| **Cubiertas por el registry** | **10 de 75** | `relation-ownership.ts:21-28` `[C]` |

## 1.3 Los tres hallazgos de arquitectura

**1. `ProductoProveedor` entró al registry sin tener ningún call site de escritura.**
`grep -rn "productoProveedor\." src/ --include="*.ts"` excluyendo specs → **cero coincidencias** `[C]`. El modelo tiene `empresaId`, está en la allow-list, y ahora sus dos relaciones se verifican — pero **ninguna ruta de aplicación escribe ese modelo**. El test `b3-producto-proveedor` (6 casos PP-01..PP-06) ejercita el mecanismo a través del **cliente scoped directo**, no a través de un servicio.

Esto no es un defecto, pero sí un cambio de criterio que conviene hacer explícito: los 5 registros anteriores protegían relaciones **con escritura real desde DTO**; éste protege una superficie **potencial**. Si el criterio es "toda relación E→E entra al registry", el objetivo son ~50 relaciones y la priorización por riesgo pierde sentido. Si el criterio es "toda relación alcanzable desde input del cliente", `ProductoProveedor` no calificaba todavía. **El criterio no está escrito en ningún documento** `[ND]`.

**2. Contradicción material entre dos documentos sobre la evidencia de ejecución.**

| Documento | Afirma |
|---|---|
`09-TRANSFORMATION/18-RELATION-ISOLATION-GATE-8-EVIDENCE-CLOSURE` | *"Gates 6.1, 6.2, 6.3 and Gate 7: verified by real CI/PostgreSQL execution"*; `[E]` VERIFIED en 7 filas de su tabla; Run #62 SUCCESS `[D]` |
| `13-AUDIT/32-B3-POST-OWNER-APPROVAL-READINESS-CLOSURE` | *"Current B3 execution evidence remains: **[T] = 0, [E] = 0**"* `[D]` |

Ambos son del 2026-10-04. **No los corrijo** — los reporto (§3, CONTRA-01). La lectura más probable es que hablan de universos distintos (slices cubiertos vs criterios B3 canónicos `ISO-*`/`TE-B3-*`), pero **ninguno de los dos lo dice**, y el lector que tome uno u otro llega a conclusiones opuestas sobre si existe evidencia `[E]`.

**3. El mecanismo es arquitectónicamente coherente; su cobertura es opt-in y su criterio de expansión no está especificado.**
El registry + DMMF traversal + preflight contra la base + fail-closed por forma no verificable es un diseño sólido y consistente con R8-ARCH-002 (aislamiento a nivel de aplicación, mecanismo ADAPTED). Las limitaciones son conocidas y están documentadas en el propio código. Lo que **no** existe es una regla que diga qué relación debe entrar al registry y cuál no (§4, C-03).

## 1.4 Cobertura: 10 de 75, con dos clases de "protegido"

De las 75 relaciones hacia modelos con `empresaId`:

| Clase | Cantidad | Significado |
|---|---|---|
| Registry + test escrito + `[E]` citado | **4** | VentaItem→Producto, PedidoItem→Producto, PedidoItem→ReglaFidelizacion, VentaItem→ReglaFidelizacion (doc 18 §115-121) |
| Registry + test escrito, `[E]` no observado | **6** | CompraItem→Producto, DevolucionProveedorItem→Producto/Lote, Producto→Familia, ProductoProveedor→Producto/Proveedor |
| Verificación compensatoria en servicio, sin test por relación | ~17 | `verificarJerarquia`, `getCajaDeEmpresa`, `getCompra`, etc. |
| Sin mecanismo identificado | ~20 | clase 2 del doc 20 |
| FK derivada del contexto (no input del cliente) | ~25 | `usuarioId` del JWT, etc. — riesgo bajo por construcción |

**Ninguna relación está VERIFIED `[E]` por observación propia en esta auditoría.**

---

# 2. PASO 1 — INVENTARIO REAL

## 2.1 Verificación de la base del inventario

No reconstruí la matriz de 108 relaciones: existe en `09-TRANSFORMATION/20-RELATION-OWNERSHIP-READONLY-AUDIT-2026-10-04.md` §4, derivada del schema `[D]`. **Verifiqué sus cifras de base de forma independiente** `[C]`:

| Afirmación del doc 20 | Verificación propia | Resultado |
|---|---|---|
| 42 modelos | `grep -c '^model '` → 42 | **CONFIRMADO** |
| 28 con `empresaId` | `awk` por modelo → 28, lista completa obtenida | **CONFIRMADO** |
| 14 sin `empresaId` | 42 − 28 | **CONFIRMADO** |
| "En la lista de la extensión: 26. Faltan `PagoProveedor` y `DevolucionProveedor`" | **DESACTUALIZADO**: la lista tiene **28** y no falta ninguno (commit `48dc336`) | **CORREGIDO** — ver §3 CONTRA-02 |
| Registry cubre 8 de 75 | **DESACTUALIZADO**: cubre **10** (entró `ProductoProveedor` ×2) | **CORREGIDO** |
| Todas las FK son escalares simples; no hay FK compuestas | consistente con que ningún modelo define `@@unique([id, empresaId])` `[C]` | **CONFIRMADO** |

## 2.2 Matriz del registry — estado actual

Las 10 relaciones cubiertas, con las columnas que pide el encargo. `relation-ownership.ts:21-28` `[C]`.

| # | Model | Source FK | Target | Src tenant-aware | Tgt tenant-aware | Registry | Tested | Executed | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | VentaItem | `productoId` | Producto | **no** (sin `empresaId`) | **sí** | **sí** | sí (`RI-02..RI-08`, `TE-B3-001`) | **`[E]` citado** (doc 12, 17/17) | **VERIFIED [E] citado** |
| 2 | VentaItem | `reglaFidelizacionId` (opt) | ReglaFidelizacion | no | sí | **sí** | sí (`V-01..V-08`) | **`[E]` citado** (doc 18, Gate 6.3) | **VERIFIED [E] citado** |
| 3 | PedidoItem | `productoId` | Producto | no | sí | **sí** | sí (`P-01..P-07`) | **`[E]` citado** (doc 14, run `37217710481`) | **VERIFIED [E] citado** |
| 4 | PedidoItem | `reglaFidelizacionId` (opt) | ReglaFidelizacion | no | sí | **sí** | sí (`R-01..R-08`) | **`[E]` citado** (doc 16, Gate 6.2) | **VERIFIED [E] citado** |
| 5 | CompraItem | `productoId` | Producto | no | sí | **sí** | sí (`C-01..C-06`) | **no observado** | **REQUIRES EXECUTION** |
| 6 | DevolucionProveedorItem | `productoId` | Producto | no | sí | **sí** | sí (`D-01..D-07`) | **no observado; spec fuera de CI** | **REQUIRES EXECUTION** |
| 7 | DevolucionProveedorItem | `loteId` (opt) | Lote | no | sí | **sí** | sí (`D-03`, `D-05`) | **no observado; spec fuera de CI** | **REQUIRES EXECUTION** |
| 8 | Producto | `familiaId` | Familia | **sí** | sí | **sí** | sí (`b3-producto-familia`) | **no observado** | **REQUIRES EXECUTION** |
| 9 | ProductoProveedor | `productoId` | Producto | **sí** | sí | **sí (sin commitear)** | sí (`PP-01..PP-06`) | **no observado** | **REQUIRES EXECUTION** |
| 10 | ProductoProveedor | `proveedorId` | Proveedor | sí | sí | **sí (sin commitear)** | sí (`PP-03`, `PP-06`) | **no observado** | **REQUIRES EXECUTION** |

**Observación sobre #9-#10:** `grep -rn "productoProveedor\." src/` excluyendo specs → **cero call sites de aplicación** `[C]`. La relación está protegida en el mecanismo y ejercitada en test vía cliente scoped directo, pero no hay ruta de producto que la escriba.

## 2.3 Relaciones NO cubiertas — las de prioridad alta

Tomadas del doc 20 §4.A `[D]`, con el mecanismo compensatorio verificado por mí donde se indica.

| # doc 20 | Relación | O/D | Mecanismo compensatorio | Tested | Status |
|---|---|---|---|---|---|
| 9-11 | Producto.{subfamilia,tipo,subtipo} | E/E | `verificarJerarquia(db, ...)` con cliente scoped, antes de create y update (`catalogo.controller.ts:95-100, 145-150`) `[C]` | — | **CHARACTERIZED** |
| 22-24 | Lote.producto; MovimientoStock.{producto,lote} | E/E | ninguno identificado | — | **REQUIRES TEST** |
| 28-30 | Deuda.{cliente,venta,cuentaCorriente} | E/E | ninguno identificado | — | **REQUIRES TEST** |
| 39-41 | Pago.{venta,pedido,deuda} | E/E | `[ND]` detalle | — | **NOT DETERMINABLE** |
| 43-44 | AplicacionPago.{pago,deuda} | noE/E | `[ND]` detalle | — | **NOT DETERMINABLE** |
| 31 | Venta.cliente | E/E | `clientesService.obtener(empresaId, …)` `[D]` | — | **CHARACTERIZED** |
| 37 | Pedido.cliente | E/E | origen del `clienteId` `[ND]` | — | **NOT DETERMINABLE** |
| 45,47,49 | {Apertura,Movimiento,Arqueo}Caja.caja | noE/E | `getCajaDeEmpresa` `[D]` | — | **CHARACTERIZED** |
| 54 | Compra.proveedor | E/E | `db.proveedor.findUnique` scoped `[D]` | — | **CHARACTERIZED** |
| 65-69 | PagoProveedor/DevolucionProveedor.{compra,proveedor} | E/E | `getCompra(empresaId,…)` + **ahora también el scope directo** (`48dc336`) | sí (`PAY-01..03`, `DEV-01..03`) | **REQUIRES EXECUTION** |
| 73-74 | Legajo.{usuario,cliente} | noE/E | controllers pasan `user.id`; una ruta valida explícitamente `[C]` | — (`TE-B3-009` no ejecutado `[D]`) | **CHARACTERIZED** |
| 36 | DevolucionProveedorItem.devolucion | noE/E | nested create ata el padre | — | **CHARACTERIZED** |

**Las ~25 relaciones cuyo FK proviene del contexto autenticado** (`usuarioId` del JWT, `AuditLog.*`, `Invitacion.invitadoPor`) son **OUT OF SCOPE** como superficie de input del cliente: el valor no es elegible por el cliente. Clasificación del doc 20: clase 5.

---

# 3. PASO 2 — RECONCILIACIÓN SPEC / ARCH / CONTRACTS / CODE / TESTS / EXECUTION

**Reporto, no corrijo.**

## CONTRA-01 — `[E]` contradictorio entre Gate 8 y la closure de B3

| Fuente | Afirmación |
|---|---|
| `09-TRANSFORMATION/18-…GATE-8-EVIDENCE-CLOSURE` | 7 filas `[E]` VERIFIED; *"verified by real CI/PostgreSQL execution"*; veredicto **"VERIFIED FOR EXECUTED/COVERED SLICES [E]"** `[D]` |
| `13-AUDIT/32-B3-POST-OWNER-APPROVAL-READINESS-CLOSURE` | **"[T] = 0, [E] = 0"**; veredicto **"B3 READY FOR TEST EXECUTION — NOT VERIFIED"** `[D]` |

**Clasificación:** contradicción **documental de alcance**, no de hecho. Lectura más probable: el doc 18 habla de *slices de relación ejecutados en CI*; el doc 32 habla de *los criterios canónicos `ISO-*`/`TE-B3-*`*, ninguno de los cuales tiene implementación de test. **Ninguno de los dos documentos declara su universo**, y por eso la contradicción es real para un lector.
**Riesgo:** alto para la gobernanza. Un lector del doc 18 concluye que hay evidencia de ejecución; uno del doc 32, que no hay ninguna.
**No resuelto aquí.**

## CONTRA-02 — El doc 20 describe un estado de código ya superado

`20-RELATION-OWNERSHIP-READONLY-AUDIT` (del mismo día) afirma `[C]`:
- *"En la lista de la extensión: 26. Faltan `PagoProveedor` y `DevolucionProveedor`"* → **hoy la lista tiene 28 y no falta ninguno** (`48dc336`).
- *"`RELACIONES_CON_OWNERSHIP` cubre 8 de las 75"* → **hoy cubre 10**.
- Su §1 llama a esto *"el hallazgo principal"* y su §13 lo pone como prioridad 1 → **ya resuelto**.

**Clasificación:** desactualización por velocidad de los commits, no error de método. **Riesgo:** medio — su §13/§14 de priorización está obsoleta en su primer ítem.

## CONTRA-03 — Comentario del código vs registry real

`empresa-scope.extension.ts:33-37` dice *"las relaciones listadas en RELACIONES_CON_OWNERSHIP (**hoy solo VentaItem -> Producto**)"* `[C]`. El registry tiene **6 modelos y 10 relaciones**. El comentario de `:21` ya fue corregido por `48dc336` ("Cubre los modelos que tienen la columna") pero quedó con una redundancia gramatical (*"de forma directa / directa"*).
**Clasificación:** divergencia doc↔código dentro del propio archivo. **Riesgo:** medio de mantenimiento — el comentario subestima la cobertura real en un factor de 10.

## CONTRA-04 — Cambio de producción sin commitear

`relation-ownership.ts` tiene `ProductoProveedor: ['producto','proveedor']` **en el working tree, no commiteado** `[C]`, mientras el commit `6c5a207` ya se llama *"ci(b3): execute ProductoProveedor candidate"* y el workflow ya lo lista.
**Clasificación:** inconsistencia de estado — CI ejecutaría el candidato contra un registry que en el árbol commiteado **no** incluye la relación. **Riesgo:** alto y concreto: el test `PP-02`/`PP-03` esperaría rechazo y, contra el registry commiteado, la escritura cross-Business **se aceptaría**.

## CONTRA-05 — Spec escrito y fuera de CI

`b3-devolucion-proveedor-item.integration-spec.ts` (355 líneas, 7 casos, incluido uno dentro de transacción) **no aparece en ningún workflow** `[C]`. Era hallazgo de mi auditoría previa y sigue abierto, mientras los otros 5 specs sí se agregaron.
**Clasificación:** gap de configuración. **Riesgo:** medio — dos de las 10 relaciones del registry (#6, #7) dependen exclusivamente de ese spec.

## CONTRA-06 — Criterio de expansión del registry no especificado

Ningún documento define qué relación debe entrar al registry. Los 5 primeros registros corresponden a relaciones con **escritura real desde DTO**; `ProductoProveedor` **no tiene call site** `[C]`. Son dos criterios distintos aplicados sin enunciarlos.
**Clasificación:** `[ND]` de especificación. **Riesgo:** medio — sin criterio, la priorización de los próximos slices es discrecional y el alcance final del registry es indeterminado (¿10? ¿50? ¿75?).

## Consistencias verificadas (sin contradicción)

| Capa | Resultado |
|---|---|
| R8-ARCH-002 (aislamiento a nivel de aplicación; mecanismo ADAPTED) ↔ código | **COHERENTE** — el mecanismo es de aplicación, el componente existente se adaptó, no se reemplazó `[C]`/`[D]` |
| R8-ARCH-002 §3.4 (el cliente no sobrescribe el tenant) ↔ código | **COHERENTE** — `create` fuerza `empresaId`; cero `empresaId` en DTOs/`@Param`/`@Query`/`@Headers`; `whitelist:true` `[C]` |
| R8-ARCH-002 §3.11 (falla cerrado) ↔ código | **COHERENTE** — toda operación no enumerada lanza; cero `upsert`/`groupBy` en `src` `[C]` |
| Contrato T-01 / B3-CON-* ↔ registry | **COHERENTE** — el registry es el mecanismo que el contrato dejó abierto `[D]` |
| `ISO-008` (independencia de path) ↔ código | **CONDITIONAL / NOT VERIFIED `[ND]`**, conforme al doc 21 `[D]` |

---

# 4. PASO 3 + PASO 4 — COBERTURA Y MECANISMO

## 4.1 Clasificación de cobertura

| Clasificación | Cantidad | Relaciones |
|---|---|---|
| **VERIFIED [E]** (por observación propia) | **0** | — no ejecuté nada |
| **VERIFIED [E] citado** (documentación) | 4 | #1-#4 del registry |
| **VERIFIED [T]** (test escrito, ejecución no observada) | 6 | #5-#10 del registry |
| **CHARACTERIZED** | ~17 | con verificación compensatoria en servicio documentada |
| **REQUIRES TEST** | ~20 | clase 2 del doc 20, sin mecanismo identificado |
| **CONDITIONAL** | 1 | `ISO-008` path independence |
| **NOT DETERMINABLE** | ~8 | Pago/AplicacionPago/Pedido.cliente, semántica de `Pago.deuda` |
| **OUT OF SCOPE** | ~25 | FK derivada del contexto autenticado; 28 `X.empresa → Empresa`; `Permiso` global |

## 4.2 Evaluación del mecanismo

### A — Resueltos

| Aspecto | Evidencia |
|---|---|
| **Registry declarativo opt-in** | `relation-ownership.ts:21-28`. Agregar una relación es agregar una entrada; no altera el resto `[C]` |
| **DMMF traversal** | `camposDe` con caché; deriva la FK del schema, no de strings hardcodeados `[C]` |
| **Validación de FK escalar** | `valorFk` + `referenciaDeFk`; soporta la forma `{set: …}` `[C]` |
| **Nested `connect`** | `referenciasDeConnect`; **solo** admite `connect` y lanza para cualquier otra operación anidada sobre relación registrada `[C]` |
| **Semántica de error cross-Business** | P2025, el recurso ajeno se trata como inexistente — **no revela existencia** `[C]` |
| **Fail-closed por forma no verificable** | lanza si la relación no tiene FK simple (`:61-70`), si el valor tiene forma no soportada (`:86-88`), si el destino no tiene `empresaId` directo (extensión `:121-124`) `[C]` |
| **Fail-closed por operación** | toda operación no enumerada lanza (`:209-214`); cero `upsert`/`groupBy` en `src` — el mecanismo moldea el código `[C]` |
| **`MODELOS_CON_EMPRESA_ID` completeness** | **28/28, completa** `[C]` — resuelto por `48dc336` |
| **Dedupe de referencias** | por `modelo:where` (`:220-226`) `[C]` |

### B — Limitaciones conocidas (documentadas en el código)

| Limitación | Dónde |
|---|---|
| El preflight usa **otra conexión**: no ve filas no confirmadas de la transacción en curso → falla cerrado | extensión `:110-114` `[C]` |
| `findUnique` se valida **post-query**: la fila ajena se lee y se descarta en memoria | `:184-207` `[C]` |
| No hay FK compuesta → **sin garantía a nivel de base de datos** | `:83-88` `[C]` |
| Los 14 modelos sin `empresaId` **no reciben scope** | `:157-159` `[C]` |
| Ownership indirecto no se expresa en el mecanismo; depende de llegar por el padre | comentario `:22-31` `[C]` |

### C — Gaps reales

| # | Gap | Severidad |
|---|---|---|
| **G-1** | **`ProductoProveedor` sin commitear** mientras CI y el commit lo dan por hecho (CONTRA-04) | **ALTA** |
| **G-2** | 65 de 75 relaciones sin verificación de ownership en la frontera de persistencia | **MEDIA-ALTA** (no explotabilidad demostrada) |
| **G-3** | `MovimientoStock.{producto,lote}` escribe FK del DTO sin registro; en `crearDevolucion` la **misma** FK queda verificada para un modelo y no para el otro, en la misma transacción | **MEDIA-ALTA** |
| **G-4** | `Producto` registra solo `familia`; los otros 3 niveles dependen de `verificarJerarquia` en el call site | **MEDIA** |
| **G-5** | `b3-devolucion-proveedor-item` fuera de CI (CONTRA-05) | **MEDIA** |
| **G-6** | Criterio de expansión del registry no especificado (CONTRA-06) | **MEDIA** |
| **G-7** | Los 10 modelos de ownership derivado no reciben filtro ni con cliente scoped; 5 están en el registry como **dueños**, lo que protege sus escrituras pero **no** su lectura/mutación directa por `id` | **MEDIA** |

### D — Riesgos teóricos

| # | Riesgo | Por qué es teórico |
|---|---|---|
| **R-1** | **TOCTOU** entre preflight y persistencia | Requiere que un recurso cambie de empresa entre las dos operaciones; el schema no lo permite. `[ND]` |
| **R-2** | `findUnique` con `select` de nivel superior que omita `empresaId` desactivaría la validación post-query | Verificado: **ningún** `findUnique` del código usa `select` de nivel superior `[C]`. Condición latente |
| **R-3** | Un segundo `$executeRaw` sin tenant no sería señalado | Hoy hay **un solo** uso productivo y sí incluye el tenant `[C]` |
| **R-4** | `Venta.idempotencyKey` `@unique` global: colisión de clave entre tenants | Sin fuga (la validación post-query corta); efecto de negocio, no de aislamiento `[C]` |
| **R-5** | Acceso directo vía `PrismaService` (exportado por `PrismaModule`) | Alcanzable; **ninguno de los usos actuales produce cruce** `[C]`. Es `ISO-008`, CONDITIONAL |

---

# 5. PASO 5 — PRIORIZACIÓN DEL PRÓXIMO SLICE

**No implemento ninguno.** El encargo pregunta cuál debería ser el siguiente *después de ProductoProveedor*.

## NEXT SLICE #1 — Consolidar `ProductoProveedor` antes de abrir otro frente

| Campo | Valor |
|---|---|
| **Relación** | `ProductoProveedor.producto`, `ProductoProveedor.proveedor` (ya en el registry, **sin commitear**) |
| **Motivo** | Es el único ítem con **riesgo de inconsistencia activa**: CI ejecuta un candidato contra un registry que el árbol commiteado no contiene. `PP-02`/`PP-03` esperan rechazo y, sin el cambio, la escritura cross-Business se aceptaría. No es trabajo nuevo: es cerrar el que está en vuelo |
| **Tenant risk** | **Bajo en producto** (cero call sites de escritura `[C]`), **alto en gobernanza** (la evidencia de CI sería engañosa) |
| **Dificultad** | Mínima — commitear lo que ya está escrito y observar el run |
| **¿Auditoría existe?** | Parcial: doc 20 lo lista como #19-#20, clase 2, prioridad M. **No hay documento de Gate específico** |
| **¿Candidate test existe?** | **Sí** — `b3-producto-proveedor.integration-spec.ts`, 6 casos (PP-01..PP-06), **ya en el workflow** `[C]` |
| **Prerequisitos** | Ninguno |
| **Riesgo de contaminación de scope** | **Nulo** |

## NEXT SLICE #2 — `MovimientoStock.{producto, lote}`

| Campo | Valor |
|---|---|
| **Relación** | `MovimientoStock.producto → Producto`, `MovimientoStock.lote → Lote` (doc 20 #23-#24, prioridad A) |
| **Motivo** | **La asimetría más concreta del código.** En `crearDevolucion` el mismo `item.productoId` del DTO queda verificado para `DevolucionProveedorItem` (registrado) y **sin verificar** para `MovimientoStock` (no registrado), dentro de la misma transacción `[C]`. Hoy el efecto está contenido por el orden y la atomicidad, no por el mecanismo. Es el gap que mejor justifica una entrada al registry bajo el criterio "FK que llega del cliente" |
| **Tenant risk** | **MEDIO-ALTO** — 4 call sites; dos reciben `productoId` del DTO (`compras.service.ts:231, 374`), dos de lecturas scoped previas |
| **Dificultad** | Baja-media. Modelo con `empresaId` y en la allow-list; destinos con `empresaId`. Cumple la precondición de FK escalar simple |
| **¿Auditoría existe?** | Sí como fila de matriz (doc 20 #23-#24). **No hay Gate dedicado** |
| **¿Candidate test existe?** | **No** — es el candidato #1 de mi lista en `13-AUDIT/27-…§14.1` |
| **Prerequisitos** | Confirmar que los 4 call sites usan FK escalar y no `connect`. Verificado: usan escalar `[C]` |
| **Riesgo de contaminación de scope** | **Bajo**, con una advertencia: `MovimientoStock` se escribe en recepción de compra, ajuste de inventario y devolución. Un registro que falle cerrado afectaría **tres flujos** a la vez. Requiere los positivos de los tres antes de registrar |

## NEXT SLICE #3 — `Producto.{subfamilia, tipo, subtipo}`

| Campo | Valor |
|---|---|
| **Relación** | doc 20 #9-#11, clase 4, prioridad A |
| **Motivo** | Cierra la asimetría **dentro de un modelo ya registrado**: `Producto.familia` se verifica por mecanismo y los otros tres niveles por `verificarJerarquia` en el call site. Completar el modelo es más coherente que dejar 1 de 4 relaciones protegida por mecanismo |
| **Tenant risk** | **MEDIO** — las cuatro FK llegan del DTO (`catalogo.controller.ts:113-116`); mitigadas hoy por `verificarJerarquia` con cliente scoped, invocada antes de create y de update `[C]` |
| **Dificultad** | Baja — los tres destinos tienen `empresaId` y están en la allow-list; FK escalares simples |
| **¿Auditoría existe?** | Sí como filas de matriz. **No hay Gate dedicado** |
| **¿Candidate test existe?** | **No**. Existe `b3-producto-familia` como patrón directo a replicar |
| **Prerequisitos** | Decidir si `verificarJerarquia` se conserva (defensa en profundidad) o se retira (una sola fuente). **Esa decisión no está tomada** `[ND]` |
| **Riesgo de contaminación de scope** | **Medio** — `verificarJerarquia` valida además la **coherencia jerárquica** (que el tipo pertenezca a la subfamilia), que **no** es ownership de tenant. El registry no sustituye esa validación. Registrar sin entenderlo podría inducir a retirar una validación que cumple otra función |

## Lo que NO recomiendo como próximo slice

| Candidato | Por qué no todavía |
|---|---|
| `Pago` / `Deuda` / `AplicacionPago` | Prioridad A en el doc 20, pero la semántica de `Pago.deuda` (campo llamado `deuda` que apunta a `CuentaCorriente`, `schema.prisma:783-784`) es `[ND]`. Registrar sobre semántica no resuelta es inventar una decisión de modelo |
| Los 10 modelos de ownership derivado | Requieren **estrategia de herencia de scope**, que es trabajo de contrato (doc 20 clase 4/5), no de registry |
| `Legajo` / `DocumentoLegajo` | Ownership **ambiguo por diseño** (dos FK opcionales y únicas). Es `ISO-AMBIG` / TECHNICAL OPEN; requiere decisión de modelo |
| Ampliación masiva a las ~50 relaciones E→E | Sin criterio escrito (CONTRA-06), sería expansión sin priorización por riesgo |

---

# 6. PASO 6 — VERDICT

## GLOBAL ARCHITECTURE STATUS

**COHERENTE CON LA ARQUITECTURA APROBADA.**

El mecanismo (registry declarativo + DMMF traversal + preflight contra la base + fail-closed) es consistente con R8-ARCH-002: aislamiento a nivel de aplicación, componente existente **adaptado** y no reemplazado, sin RLS ni separación física. Las cuatro propiedades que el Owner marcó como requeridas y son verificables por lectura —el cliente no sobrescribe el tenant, create asigna desde el contexto, read/update/delete restringidos, falla cerrado— están implementadas `[C]`.

**La limitación arquitectónica es de cobertura, no de diseño:** el registry es opt-in y el criterio de expansión no está especificado.

## RELATION COVERAGE STATUS

**10 de 75 relaciones cubiertas por el mecanismo (13%).**

- 4 con `[E]` citado en documentación.
- 6 con test escrito y ejecución no observada.
- ~17 con verificación compensatoria en servicio, sin test por relación.
- ~20 sin mecanismo identificado.
- ~25 fuera del alcance de input del cliente.

**`MODELOS_CON_EMPRESA_ID`: 28/28 — COMPLETA** `[C]`. Era el hallazgo principal del doc 20 y está cerrado.

## SPEC CONSISTENCY STATUS

**PASS WITH RECONCILIATION — 6 contradicciones reportadas, ninguna corregida.**

La más grave para la gobernanza es **CONTRA-01**: dos documentos del mismo día afirman, uno, `[E]` VERIFIED para slices cubiertos, y el otro, `[T]=0 / [E]=0`. La más grave operativamente es **CONTRA-04**: cambio de producción sin commitear mientras CI ya ejecuta su candidato.

**Cero contradicciones con Owner Decisions.** Nada de lo observado requiere una decisión nueva.

## CURRENT B3 STATUS

**B3: NOT VERIFIED.**

Adopto la formulación del documento más reciente (`13-AUDIT/32`): **READY FOR TEST EXECUTION — NOT VERIFIED — IMPLEMENTATION NOT AUTHORIZED**, con una precisión propia: existe evidencia `[E]` **citada** para 4 slices de relación (doc 18), lo que no equivale a B3 verificado y tampoco equivale a `[E]=0`. Esa es exactamente la contradicción CONTRA-01, y **no la resuelvo**.

**En esta auditoría: `[T]` observados = 0, `[E]` observados = 0.** No ejecuté nada.

## NEXT RECOMMENDED SLICE

**`MovimientoStock.{producto, lote}`** — precedido por el cierre de `ProductoProveedor` (commitear lo pendiente y observar el run).

**Fundamento:** es el único gap donde la **misma FK del mismo DTO** queda verificada en un modelo y sin verificar en otro, dentro de la misma transacción `[C]`. Cumple todas las precondiciones técnicas (modelo con `empresaId` y en la allow-list, destinos con `empresaId`, FK escalares simples), tiene riesgo de tenant medio-alto real, y es el candidato que mejor justifica una entrada al registry bajo el criterio "FK que llega del input del cliente".

**Advertencia de alcance:** afecta tres flujos (recepción de compra, ajuste de inventario, devolución). Los positivos de los tres deberían existir antes de registrar la relación.

---

# 7. EVIDENCE INDEX

## `[C]` — verificado por mí en esta auditoría

| Hecho | Ubicación / método |
|---|---|
| Branch `chore/build-in-ci`, commit `6c5a207` | `git rev-parse`, `git log` |
| **`relation-ownership.ts` con cambio sin commitear** (`ProductoProveedor`) | `git diff apps/api/src/prisma/relation-ownership.ts` |
| Registry: 6 modelos, 10 relaciones | `src/prisma/relation-ownership.ts:21-28` |
| 42 modelos; 28 con `empresaId` | `grep -c '^model '`; `awk` por modelo |
| **`MODELOS_CON_EMPRESA_ID` = 28, completa** | `comm -23` schema vs lista → vacío |
| `PagoProveedor`/`DevolucionProveedor` agregados | `git show 48dc336` |
| **`ProductoProveedor` sin call sites de escritura** | `grep -rn "productoProveedor\." src/ --include="*.ts"` excluyendo specs → cero |
| Comentario `:33-37` dice "hoy solo VentaItem -> Producto" | `src/prisma/empresa-scope.extension.ts:33-37` |
| Fail-closed por forma no verificable | `relation-ownership.ts:61-70, 86-88, 104-106` |
| Preflight en otra conexión; P2025 sin revelar existencia | `empresa-scope.extension.ts:110-137` |
| Fail-closed por operación no enumerada | `:209-214` |
| `findUnique` post-query; depende de `'empresaId' in resultado` | `:184-207`, cond. `:195` |
| Sin FK compuesta; razón documentada | `:83-88` |
| Modelos fuera de la lista pasan sin tocar | `:157-159` |
| `verificarJerarquia` con cliente scoped antes de create y update | `src/catalogo/catalogo.controller.ts:95-100, 145-150` |
| `MovimientoStock.create` con FK del DTO, 4 sitios | `compras.service.ts:228, 374`; `inventario.service.ts:238, 337` |
| 7 specs de integración | `test/integration/` |
| Casos PP-01..PP-06 | `test/integration/b3-producto-proveedor.integration-spec.ts:135-240` |
| Casos PAY-01..03 / DEV-01..03 | `test/integration/b3-provider-payment-return-characterization.integration-spec.ts:160-220` |
| Casos TX-01..03 / RAW-01..03 | `test/integration/b3-iso-006.integration-spec.ts:180-320` |
| CI ejecuta **5** specs | `.github/workflows/b3-tenant-isolation-candidate.yml:66-94` |
| **`b3-devolucion-proveedor-item` en ningún workflow** | `grep -rn "devolucion-proveedor-item" .github/workflows/` → cero |
| 12 casos unitarios del recolector | `src/prisma/relation-ownership.spec.ts` |

## `[D]` — documentación consultada

| Documento | Uso |
|---|---|
| `03-DECISIONS/28-R8-ARCH-002-OWNER-DECISION-TENANT-ISOLATION` | las 12 propiedades, §5 ADAPTED, §7 invariante de seguridad |
| `09-TRANSFORMATION/20-RELATION-OWNERSHIP-READONLY-AUDIT` | **matriz de 108 relaciones** (§4.A, §4.B), clasificación, priorización §13-§14 |
| `09-TRANSFORMATION/18-…GATE-8-EVIDENCE-CLOSURE` | `[E]` de Gates 6.1/6.2/6.3/7; Run #62; CONTRA-01 |
| `09-TRANSFORMATION/21-ISO-008-PATH-INDEPENDENCE-AUDIT` | `ISO-008` CONDITIONAL / NOT VERIFIED |
| `09-TRANSFORMATION/22-PAYMENT-DEVOLUCION-PROVEEDOR-CHARACTERIZATION-AUDIT` | `[C]` gap caracterizado, `[E]` pendiente |
| `09-TRANSFORMATION/12..19` (Gates 4, 6.1-6.4) | `[E]` citado por slice |
| `13-AUDIT/32-B3-POST-OWNER-APPROVAL-READINESS-CLOSURE` | **`[T]=0, [E]=0`**; veredicto B3; CONTRA-01 |
| `13-AUDIT/27-B3-PRISMA-PERSISTENCE-OPERATION-AUDIT` | inventario de operaciones previo; GAP-01..GAP-07 |

## `[ND]` — no determinable

| ID | Ítem |
|---|---|
| ND-1 | Si los ~110 casos de los 7 specs pasan. **No ejecuté nada ni verifiqué ningún run** |
| ND-2 | Resolución de CONTRA-01: qué universo mide cada documento |
| ND-3 | Criterio de expansión del registry (CONTRA-06) |
| ND-4 | Semántica de `Pago.deuda` → `CuentaCorriente` |
| ND-5 | Origen del `clienteId` en `Pedido.cliente` |
| ND-6 | Si `verificarJerarquia` debe conservarse como defensa en profundidad |
| ND-7 | TOCTOU entre preflight y persistencia |
| ND-8 | Por qué `ProductoProveedor` se priorizó sobre relaciones con call site real |

## Clases no emitidas

**`[T]` observado = 0** · **`[E]` observado = 0.** Todo `[E]` de este informe es **citado de documentación**, nunca observado.

---

**No implementé código. No modifiqué producción ni documentos canónicos. No hice commits ni deploy. No creé decisiones. No declaré B3 global VERIFIED. No asumí que una relación deba entrar al registry solo por tener FK.**

**Nota de numeración:** `13-AUDIT/` tiene dos `27-` y dos `28-` (uno de ellos mío, de la auditoría previa). Este documento va en `09-TRANSFORMATION/` como `23-`, continuando esa serie. Conviene reconciliar la numeración duplicada en una acción separada y explícita; no la toqué.
