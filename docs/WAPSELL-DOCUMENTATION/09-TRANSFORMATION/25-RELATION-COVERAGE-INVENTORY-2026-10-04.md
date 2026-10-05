# B3 — RELATION COVERAGE INVENTORY
## MATRIZ COMPLETA DE RELACIONES RELEVANTES PARA TENANT ISOLATION — READ-ONLY

**Estado:** INVENTARIO TÉCNICO — READ-ONLY — NO CANÓNICO — NO APROBADO
**Fecha:** 2026-10-04
**Repo:** `fmonfasani/otrarondamas` · **Branch:** `chore/build-in-ci` · **Commit base:** `72e794d` (`fix(b3): enforce ProductoProveedor relation ownership`)
**Fuente del inventario:** `apps/api/prisma/schema.prisma` + `apps/api/src/**` (excluyendo `*.spec.ts`)

**Acción:** sin modificar código, registry, workflows, contratos canónicos ni invariants. Sin commits ni push. **No se toma ninguna decisión.** No se extrapola desde los 10 slices actuales.

**Clases de evidencia:** `[C]` código/schema · `[T]` test escrito · `[E]` ejecución · `[D]` documentado · `[ND]` no determinable.

> **Método:** la matriz se **computó** con un parser del schema y un barrido del código, no se transcribió de ningún documento. Las 20 columnas del encargo se derivan de datos reales. Donde el detector automático tiene un límite conocido, lo declaro en §9 en lugar de presentar su salida como exacta.
>
> **No se declara B3 VERIFIED.** No ejecuté tests ni verifiqué runs en esta auditoría: todo `[E]` es **citado** con su fuente.

---

# 1. RESUMEN DEL UNIVERSO

## 1.1 Descomposición de las 108 relaciones

Computado del schema `[C]`. Se cuenta únicamente el lado que **posee** la FK (campo con `@relation(fields: [...])`); el lado inverso no escribe y no es superficie de persistencia.

```
42  modelos          28 con empresaId      14 sin empresaId
108 relaciones con FK en el origen
 ├── 28  → Empresa                      = la columna de scope misma
 ├── 75  → modelo CON empresaId          ← UNIVERSO BASE de este inventario
 │        ├── 50  E→E   (origen con empresaId)
 │        └── 25  noE→E (origen sin empresaId)
 └──  5  → modelo SIN empresaId          = no registrable con el mecanismo actual
```

**Ninguna FK es compuesta** `[C]` — las 108 son de una sola columna. Es el prerrequisito que el mecanismo exige (`relation-ownership.ts:61-70`).

## 1.2 Las cifras de universo pedidas

| Universo | Valor | Derivación |
|---|---|---|
| **Total** (relaciones con FK en el origen) | **108** | parser del schema |
| **Base** (hacia modelo con `empresaId`) | **75** | 108 − 28 (→Empresa) − 5 (→sin `empresaId`) |
| **Registrable** (destino con `empresaId` + FK simple) | **75** | coincide con la base: las 75 cumplen ambas condiciones |
| **Con write path real** | **49** | existe `create`/`createMany`/`update`/`updateMany` sobre el modelo origen |
| — de esas, con `create` | 47 | |
| — de esas, con `update` | 24 | |
| **Con nested write path** | **8** | corregido a mano; ver §9.1 |
| **Con transaction path** | **37** | el modelo origen se escribe dentro de `tx.*` |
| **Sin ningún write path conocido** | **18** | ni write directo ni nested; ver §9.1 |
| **Con FK provista por el cliente** | **31** | FK declarada como propiedad en alguno de los 37 DTOs |
| **Con riesgo cross-tenant demostrable** | **23** | FK del cliente ∧ (write path ∨ nested) |
| **Actualmente cubierto** (registry) | **10** | `relation-ownership.ts:21-28`, ya commiteado en `72e794d` |
| **Con test escrito** `[T]` | **10** | caso por relación en `test/integration/` |
| **Con step de CI** | **10** | los 6 specs del workflow B3 |
| **Con evidencia `[E]` citada** | **6** | ver §8 |
| **Sin evidencia alguna** | **65** | 75 − 10 |

## 1.3 Lectura

- **Cobertura del universo base: 10 de 75 (13%).**
- **Cobertura del subconjunto de riesgo demostrable: 10 de 23 (43%)** — contando las 10 registradas, 2 de las cuales (`ProductoProveedor`) no tienen write path y por tanto no están en el subconjunto de riesgo. En rigor: **8 de 23 (35%)** del riesgo demostrable está cubierto.
- **13 relaciones tienen riesgo cross-tenant demostrable y NO están registradas** (§6).
- **4 relaciones están registradas sin write path observable** — superficie potencial, no existente (§7).

---

# 2. MATRIZ COMPLETA — LAS 75 RELACIONES

**Columnas.** `srcE`: el origen tiene `empresaId`. `client`: la FK está declarada en un DTO. `write`: existe `create`/`update`/`createMany`/`updateMany` sobre el modelo origen. `cre`/`upd`: cuál de ellos. `nest`: el origen se escribe como relación anidada de un padre. `tx`: se escribe dentro de una transacción. `reg`: está en `RELACIONES_CON_OWNERSHIP`. `T`: test escrito. `E`: evidencia de ejecución citada. `R`: riesgo estimado (§4).

## 2.1 Grupo A — REGISTRADAS (10)

| # | src.campo → dst (fk) | srcE | client | write | cre | upd | nest | tx | reg | T | E | R |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | VentaItem.producto → Producto (`productoId`) | no | **sí** | no* | no | no | **sí** | sí | **SÍ** | sí | **sí** | — |
| 2 | VentaItem.reglaFidelizacion → ReglaFidelizacion (`reglaFidelizacionId`) | no | no | no* | no | no | **sí** | sí | **SÍ** | sí | **sí** | — |
| 3 | PedidoItem.producto → Producto (`productoId`) | no | **sí** | no* | no | no | **sí** | sí | **SÍ** | sí | **sí** | — |
| 4 | PedidoItem.reglaFidelizacion → ReglaFidelizacion (`reglaFidelizacionId`) | no | no | no* | no | no | **sí** | sí | **SÍ** | sí | **sí** | — |
| 5 | CompraItem.producto → Producto (`productoId`) | no | **sí** | sí | no | sí | **sí** | sí | **SÍ** | sí | no | — |
| 6 | DevolucionProveedorItem.producto → Producto (`productoId`) | no | **sí** | no* | no | no | **sí** | sí | **SÍ** | sí | no | — |
| 7 | DevolucionProveedorItem.lote → Lote (`loteId`) | no | **sí** | no* | no | no | **sí** | sí | **SÍ** | sí | no | — |
| 8 | Producto.familia → Familia (`familiaId`) | sí | **sí** | sí | sí | sí | no | no | **SÍ** | sí | no | — |
| 9 | ProductoProveedor.producto → Producto (`productoId`) | sí | **sí** | **no** | no | no | **no** | no | **SÍ** | sí | **sí** | — |
| 10 | ProductoProveedor.proveedor → Proveedor (`proveedorId`) | sí | **sí** | **no** | no | no | **no** | no | **SÍ** | sí | **sí** | — |

`no*` = el modelo no se escribe por su propio delegado, **solo** como nested create desde su padre. Ver §9.1.

## 2.2 Grupo B — NO registradas, con FK del cliente **y** write/nested path → riesgo demostrable (13)

| # | src.campo → dst (fk) | srcE | cre | upd | nest | tx | R | Observación |
|---|---|---|---|---|---|---|---|---|
| 11 | **MovimientoStock.producto → Producto** (`productoId`) | sí | sí | no | no | **sí** | **ALTO** | `productoId` del DTO en `compras.service.ts:231, 374`; la **misma FK** queda verificada para `DevolucionProveedorItem` y sin verificar acá, en la misma transacción |
| 12 | **MovimientoStock.lote → Lote** (`loteId`) | sí | sí | no | no | **sí** | **ALTO** | ídem, `loteId` |
| 13 | **Lote.producto → Producto** (`productoId`) | sí | sí | sí | no | **sí** | **ALTO** | `compras.service.ts:226`; `productoId` proviene de `CompraItem` ya validado, pero sin mecanismo |
| 14 | Producto.subfamilia → Subfamilia (`subfamiliaId`) | sí | sí | sí | no | no | **MEDIO** | compensado por `verificarJerarquia` scoped (`catalogo.controller.ts:95-100, 145-150`). Asimetría: `familia` sí registrada |
| 15 | Producto.tipo → Tipo (`tipoId`) | sí | sí | sí | no | no | **MEDIO** | ídem |
| 16 | Producto.subtipo → Subtipo (`subtipoId`) | sí | sí | sí | no | no | **MEDIO** | ídem |
| 17 | ReglaFidelizacion.familia → Familia (`familiaId`) | sí | sí | sí | no | no | **MEDIO** | compensado por `verificarNivelesCatalogo` `[D]` |
| 18 | ReglaFidelizacion.subfamilia → Subfamilia (`subfamiliaId`) | sí | sí | sí | no | no | **MEDIO** | ídem |
| 19 | ReglaFidelizacion.tipo → Tipo (`tipoId`) | sí | sí | sí | no | no | **MEDIO** | ídem |
| 20 | ReglaFidelizacion.subtipo → Subtipo (`subtipoId`) | sí | sí | sí | no | no | **MEDIO** | ídem |
| 21 | Compra.proveedor → Proveedor (`proveedorId`) | sí | sí | sí | no | **sí** | **MEDIO** | compensado por `db.proveedor.findUnique` scoped (`compras.service.ts:102`) |
| 22 | Pedido.cliente → Cliente (`clienteId`) | sí | sí | sí | no | **sí** | **MEDIO** | origen del `clienteId` en tienda `[ND]` |
| 23 | Venta.cliente → Cliente (`clienteId`) | sí | sí | no | no | **sí** | **MEDIO** | compensado por `clientesService.obtener(empresaId,…)` `[D]` |

## 2.3 Grupo C — NO registradas, con FK del cliente, **sin** write path observable (4)

| # | src.campo → dst (fk) | srcE | R | Observación |
|---|---|---|---|---|
| 24 | CuentaCorriente.cliente → Cliente (`clienteId`) | sí | BAJO | sin write path detectado; dominio financiero |
| 25 | Deuda.cliente → Cliente (`clienteId`) | sí | BAJO | ídem |
| 26 | Presentacion.producto → Producto (`productoId`) | sí | BAJO | sin write path detectado |
| 27 | Subfamilia.familia → Familia (`familiaId`) | sí | BAJO | jerarquía; escritura vía `jerarquia-catalogo.controller` `[ND]` |
| 28 | Tipo.subfamilia → Subfamilia (`subfamiliaId`) | sí | BAJO | ídem |
| 29 | Subtipo.tipo → Tipo (`tipoId`) | sí | BAJO | ídem |
| 30 | ArqueoCaja.usuarioEntrante → Usuario (`usuarioEntranteId`) | no | BAJO | compensado (`caja.service.ts:214`) `[D]`; es un Usuario, no dato de negocio |
| 31 | Legajo.cliente → Cliente (`clienteId`) | no | **MEDIO** | `Legajo` **no tiene `empresaId`** y no está en la allow-list; ownership **ambiguo** (`ISO-AMBIG`) |

*(Las filas 27-29 tienen `create` detectado en el controller de jerarquía; las clasifico aquí porque su FK proviene de la jerarquía ya scoped, no directamente de un DTO de usuario final — `[ND]` en el borde.)*

## 2.4 Grupo D — NO registradas, FK derivada por el servidor, con write path (30)

Riesgo estructuralmente menor: **el cliente no elige el valor**. La FK proviene del contexto autenticado (`usuarioId` del JWT), de una lectura scoped previa, o de un registro padre ya resuelto.

| # | src.campo → dst (fk) | srcE | tx | R | Origen de la FK |
|---|---|---|---|---|---|
| 32 | AuditLog.usuario → Usuario (`usuarioId`) | sí | sí | BAJO | contexto |
| 33 | AuditLog.venta → Venta (`ventaId`) | sí | sí | BAJO | registro recién creado |
| 34 | AuditLog.autorizacion → Autorizacion (`autorizacionId`) | sí | sí | BAJO | registro resuelto |
| 35 | Autorizacion.autorizador → Usuario (`autorizadorId`) | sí | no | BAJO | reautenticación (`autorizaciones.service.ts:68`) |
| 36 | AperturaCaja.caja → Caja (`cajaId`) | no | sí | BAJO | `getCajaDeEmpresa` `[D]` |
| 37 | AperturaCaja.usuario → Usuario (`usuarioId`) | no | sí | BAJO | contexto |
| 38 | ArqueoCaja.caja → Caja (`cajaId`) | no | sí | BAJO | `getCajaDeEmpresa` |
| 39 | ArqueoCaja.usuario → Usuario (`usuarioId`) | no | sí | BAJO | contexto |
| 40 | ArqueoCaja.autorizacion → Autorizacion (`autorizacionId`) | no | sí | BAJO | `caja.service.ts:235` |
| 41 | MovimientoCaja.caja → Caja (`cajaId`) | no | sí | BAJO | `getCajaDeEmpresa` |
| 42 | MovimientoCaja.usuario → Usuario (`usuarioId`) | no | sí | BAJO | contexto |
| 43 | CierreCaja.usuario → Usuario (`usuarioId`) | no | sí | BAJO | contexto |
| 44 | Compra.usuario → Usuario (`usuarioId`) | sí | sí | BAJO | contexto |
| 45 | CompraItem.compra → Compra (`compraId`) | no | sí | BAJO | padre nested |
| 46 | RecepcionCompra.compra → Compra (`compraId`) | sí | sí | BAJO | `getCompra(empresaId,…)` |
| 47 | RecepcionCompra.usuario → Usuario (`usuarioId`) | sí | sí | BAJO | contexto |
| 48 | DevolucionProveedor.compra → Compra (`compraId`) | sí | sí | BAJO | `getCompra` |
| 49 | DevolucionProveedor.proveedor → Proveedor (`proveedorId`) | sí | sí | BAJO | `compra.proveedorId` |
| 50 | DevolucionProveedor.usuario → Usuario (`usuarioId`) | sí | sí | BAJO | contexto |
| 51 | PagoProveedor.compra → Compra (`compraId`) | sí | sí | BAJO | `getCompra` |
| 52 | PagoProveedor.proveedor → Proveedor (`proveedorId`) | sí | sí | BAJO | `compra.proveedorId` |
| 53 | PagoProveedor.usuario → Usuario (`usuarioId`) | sí | sí | BAJO | contexto |
| 54 | MovimientoStock.recepcionCompra → RecepcionCompra (`recepcionCompraId`) | sí | sí | BAJO | registro creado en la misma tx |
| 55 | MovimientoStock.usuario → Usuario (`usuarioId`) | sí | sí | BAJO | contexto |
| 56 | Pago.venta → Venta (`ventaId`) | sí | sí | **MEDIO** | `[ND]` — origen no verificado línea a línea |
| 57 | Pago.pedido → Pedido (`pedidoId`) | sí | sí | **MEDIO** | `[ND]` |
| 58 | Pago.deuda → CuentaCorriente (`deudaId`) | sí | sí | **MEDIO** | **semántica `[ND]`**: campo `deuda`, destino `CuentaCorriente` (`schema.prisma:783-784`) |
| 59 | Pago.usuario → Usuario (`usuarioId`) | sí | sí | BAJO | contexto |
| 60 | Pedido.usuario → Usuario (`usuarioId`) | sí | sí | BAJO | contexto |
| 61 | Venta.usuario → Usuario (`usuarioId`) | sí | sí | BAJO | contexto |
| 62 | Invitacion.invitadoPor → Usuario (`invitadoPorId`) | sí | no | BAJO | contexto; cliente **sin scope** (`invitaciones.service.ts`) |
| 63 | Legajo.usuario → Usuario (`usuarioId`) | no | no | BAJO | `user.id` del token; cliente sin scope |

## 2.5 Grupo E — NO registradas, sin write path ni nested observable (12)

Solo lectura o escritura no localizada. **No es lo mismo que "segura"**: significa que el detector no encontró la escritura (§9.2).

| # | src.campo → dst (fk) | srcE | R | Observación |
|---|---|---|---|---|
| 64 | AplicacionPago.pago → Pago (`pagoId`) | no | **MEDIO** | `[ND]` — dominio financiero; modelo sin `empresaId` |
| 65 | AplicacionPago.deuda → Deuda (`deudaId`) | no | **MEDIO** | `[ND]` |
| 66 | Deuda.venta → Venta (`ventaId`) | sí | BAJO | sin write detectado |
| 67 | Deuda.cuentaCorriente → CuentaCorriente (`cuentaCorrienteId`) | sí | BAJO | ídem |
| 68 | Entrega.pedido → Pedido (`pedidoId`) | sí | BAJO | módulo sin escritura detectada |
| 69 | Entrega.preparador → Usuario (`preparadorId`) | sí | BAJO | ídem |
| 70 | Entrega.repartidor → Usuario (`repartidorId`) | sí | BAJO | ídem |
| 71 | Notificacion.pedido → Pedido (`pedidoId`) | sí | BAJO | ídem |
| 72 | UsuarioPermiso.usuario → Usuario (`usuarioId`) | no | BAJO | seed/script; modelo sin `empresaId` |
| 73 | DevolucionProveedorItem.devolucion → DevolucionProveedor (`devolucionId`) | no | BAJO | padre nested, atado por construcción |
| 74 | PedidoItem.pedido → Pedido (`pedidoId`) | no | BAJO | padre nested |
| 75 | VentaItem.venta → Venta (`ventaId`) | no | BAJO | padre nested |

---

# 3. SEPARACIÓN EXPLÍCITA POR LAS 8 CLASES DEL ENCARGO

| # | Clase | Cantidad | Nota |
|---|---|---|---|
| **1** | **E→E** | **50** | ambos extremos con `empresaId` |
| **2** | **noE→E** | **25** | el origen hereda ownership por relación |
| **3** | **Relaciones a `Empresa`** | **28** | **fuera del universo base.** Son el mecanismo de scope directo, gestionado por `MODELOS_CON_EMPRESA_ID` (28/28, completa). Verificar que `X.empresa` apunte a la empresa del contexto es tautológico: la extensión fuerza ese valor en `create` e inyecta el `where` |
| **4** | **Relaciones a modelos sin `empresaId`** | **5** | **no registrables**: el mecanismo exige destino con `empresaId` directo (extensión `:121-124`). Son: `UsuarioPermiso.permiso → Permiso` (global legítimo); `DocumentoLegajo.legajo → Legajo` (**ambiguo**); `MovimientoCaja/ArqueoCaja/CierreCaja.aperturaCaja → AperturaCaja` (derivadas vía `caja`) |
| **5** | **Derivadas por servidor** | **44** de 75 | FK no declarada en ningún DTO. De esas, **30 con write path** (Grupo D) y 14 sin |
| **6** | **Solo lectura** (sin write ni nested observable) | **12** | Grupo E. **`[ND]` parcial**: ausencia de detección, no prueba de ausencia |
| **7** | **Con escrituras reales** | **55** | 49 con write directo + 8 nested, descontando solapamiento |
| **8** | **Sin ningún write path conocido** | **18** | Grupo E (12) + 6 del Grupo C sin write detectado |

---

# 4. CRITERIO DE RIESGO ESTIMADO

El riesgo de la columna `R` se asigna por regla explícita, no por juicio:

| Riesgo | Regla | Cantidad |
|---|---|---|
| **ALTO** | FK del cliente ∧ write path ∧ **sin** verificación compensatoria identificada | **3** (#11, #12, #13) |
| **MEDIO** | FK del cliente ∧ write path ∧ **con** verificación compensatoria en servicio · **o** semántica/origen `[ND]` en dominio sensible · **o** ownership ambiguo | **17** |
| **BAJO** | FK derivada del contexto/servidor · **o** sin write path observable · **o** padre atado por nested create | **45** |
| **—** | ya registradas (riesgo mitigado por mecanismo, sujeto a su evidencia) | **10** |

**Las 3 de riesgo ALTO son las únicas donde una FK provista por el cliente se persiste sin mecanismo ni compensación identificada** `[C]`.

---

# 5. COMPATIBILIDAD CON EL MECANISMO ACTUAL

| Clase | Compatible | Fundamento |
|---|---|---|
| Las 75 del universo base | **sí** | destino con `empresaId` + FK simple: las dos condiciones que exige el recolector |
| Las 5 hacia destino sin `empresaId` | **no** | el mecanismo lanza (extensión `:121-124`); requerirían estrategia de ownership derivado, inexistente |
| `Legajo.cliente` (#31) | **requiere análisis** | el **origen** no tiene `empresaId`; registrable en forma, pero su ownership es ambiguo (`ISO-AMBIG`) |
| `Pago.deuda` (#58) | **requiere análisis** | semántica del campo sin resolver |
| Relaciones usadas con `set`/`disconnect`/`connectOrCreate` | **requiere análisis** | el recolector **lanza** para esas formas sobre relación registrada. Verificado: **cero usos** de esas formas en `src/` `[C]`, así que hoy no hay conflicto — pero registrar una relación cuyo flujo futuro las use rompería cerrado |

---

# 6. LAS 13 RELACIONES CON RIESGO DEMOSTRABLE NO CUBIERTAS

Subconjunto que la política futura tendrá que resolver primero bajo cualquier criterio. Extraído por regla (FK del cliente ∧ write/nested ∧ no registrada) `[C]`:

| Relación | FK | create | update | tx | Compensación |
|---|---|---|---|---|---|
| **MovimientoStock.producto → Producto** | `productoId` | sí | no | sí | **ninguna** |
| **MovimientoStock.lote → Lote** | `loteId` | sí | no | sí | **ninguna** |
| **Lote.producto → Producto** | `productoId` | sí | sí | sí | **ninguna identificada** |
| Producto.subfamilia → Subfamilia | `subfamiliaId` | sí | sí | no | `verificarJerarquia` |
| Producto.tipo → Tipo | `tipoId` | sí | sí | no | `verificarJerarquia` |
| Producto.subtipo → Subtipo | `subtipoId` | sí | sí | no | `verificarJerarquia` |
| ReglaFidelizacion.familia → Familia | `familiaId` | sí | sí | no | `verificarNivelesCatalogo` |
| ReglaFidelizacion.subfamilia → Subfamilia | `subfamiliaId` | sí | sí | no | ídem |
| ReglaFidelizacion.tipo → Tipo | `tipoId` | sí | sí | no | ídem |
| ReglaFidelizacion.subtipo → Subtipo | `subtipoId` | sí | sí | no | ídem |
| Compra.proveedor → Proveedor | `proveedorId` | sí | sí | sí | `findUnique` scoped |
| Pedido.cliente → Cliente | `clienteId` | sí | sí | sí | `[ND]` |
| Venta.cliente → Cliente | `clienteId` | sí | no | sí | `clientesService.obtener` |

**Las 3 primeras no tienen compensación identificada.** Las 10 restantes dependen de una verificación en el call site, que es correcta hoy y se rompe con un cambio local que nada señalaría.

---

# 7. LAS 4 RELACIONES REGISTRADAS SIN WRITE PATH

Dato relevante para la decisión de política, computado `[C]`:

| Relación | Write path propio | Nested | Observación |
|---|---|---|---|
| `ProductoProveedor.producto` | **no** | **no** | el modelo aparece **solo** en los 2 archivos del mecanismo; cero código de aplicación |
| `ProductoProveedor.proveedor` | **no** | **no** | ídem |
| `DevolucionProveedorItem.producto` | no | **sí** (`compras.service.ts:360`) | se escribe solo como nested |
| `DevolucionProveedorItem.lote` | no | **sí** | ídem |

**`ProductoProveedor` es el único caso de relación registrada cuya superficie es enteramente potencial.** Los otros tres registros sin write directo sí tienen nested write real. Esta distinción es la que la decisión de política debe resolver: ¿el registry protege superficie existente o posible?

---

# 8. EVIDENCIA DE TEST Y EJECUCIÓN

## 8.1 Test escrito `[T]` — 10 de 75

Las 10 registradas, cada una con casos en `test/integration/` `[C]`:

| Spec | Relaciones | Casos |
|---|---|---|
| `b3-tenant-isolation.integration-spec.ts` | #1-#5, #8 | 43 |
| `b3-devolucion-proveedor-item.integration-spec.ts` | #6, #7 | 7 (D-01..D-07) |
| `b3-producto-familia.integration-spec.ts` | #8 | ~5 |
| `b3-producto-proveedor.integration-spec.ts` | #9, #10 | 6 (PP-01..PP-06) |

## 8.2 Step de CI — 10 de 75

El workflow `b3-tenant-isolation-candidate.yml` ejecuta **6 specs** tras `72e794d`, que agregó `b3-devolucion-proveedor-item` como step independiente `[C]`. **Esto cierra el hallazgo de mi auditoría previa** (`09-TRANSFORMATION/23`, CONTRA-05): ya no queda spec de relación fuera de CI.

## 8.3 Evidencia `[E]` citada — 6 de 75

**No observada por mí.** Citada con fuente:

| Relación | Fuente `[D]` | Resultado |
|---|---|---|
| VentaItem.producto | doc 12 §5 (17/17) | PASS |
| VentaItem.reglaFidelizacion | doc 18, Gate 6.3 | PASS |
| PedidoItem.producto | doc 14, run `37217710481` | PASS |
| PedidoItem.reglaFidelizacion | doc 16, Gate 6.2 | PASS |
| ProductoProveedor.producto | doc 30, cierre red team (89 verdes) | **PASS** |
| ProductoProveedor.proveedor | doc 30 | **PASS** |

**Actualización respecto de mi auditoría anterior:** el doc `13-AUDIT/30-RED-TEAM-…CLOSURE-VERIFICATION` reporta **PASS** para `ProductoProveedor` tras `72e794d` (fixtures corregidas, registry commiteado). En mi informe 24 lo clasifiqué como **EXECUTED — FAILING** citando el doc 29; **corrijo: ahora es EXECUTED — PASS**. El doc 30 advierte explícitamente que esto no extiende a otros slices ni declara B3 global VERIFIED.

**Sin evidencia `[E]`:** 4 relaciones registradas (#5, #6, #7, #8) + las 65 no registradas = **69 de 75**.

---

# 9. LÍMITES DEL MÉTODO

Declarados en lugar de presentar la salida automática como exacta.

## 9.1 Corrección manual de la columna `nested`

El detector buscaba `<modelo>s?: { create`, lo que falla cuando la clave anidada **no coincide con el nombre del modelo**. Verifiqué los 4 sitios nested reales `[C]`:

| Sitio | Clave | Modelo hijo real |
|---|---|---|
| `compras.service.ts:128` | `items:` | **CompraItem** |
| `compras.service.ts:360` | `items:` | **DevolucionProveedorItem** |
| `tienda.service.ts:267` | `pedidoItems:` | PedidoItem |
| `ventas.service.ts:173` | `ventaItems:` | VentaItem |

La clave genérica `items:` sirve a **dos modelos distintos**. Corregí a mano: `nested` = 8 relaciones (las de `VentaItem`, `PedidoItem`, `CompraItem`, `DevolucionProveedorItem` × 2 cada uno). La salida cruda del detector decía 6.

**Consecuencia:** `DevolucionProveedorItem.producto/lote` figuran con `write=no` en la salida automática. Es correcto para su **delegado propio** y engañoso sin la columna `nested`. Por eso presento ambas.

## 9.2 "Sin write path" ≠ "segura"

La columna `write` detecta `<cliente>.<modelo>.<op>(` sobre `db`/`tx`/`this.prisma`. **No detecta:** escritura por nested con clave no homónima (corregido en §9.1), escritura por raw SQL, ni escritura en módulos cuyo flujo no leí línea a línea. El Grupo E es **ausencia de detección**, no prueba de ausencia. `[ND]` en el borde.

## 9.3 "FK del cliente" es aproximación

Se determinó por **FK declarada como propiedad en alguno de los 37 DTOs** `[C]`. Las 11 encontradas: `clienteId`, `compraItemId`, `entidadId`, `familiaId`, `loteId`, `productoId`, `proveedorId`, `subfamiliaId`, `subtipoId`, `tipoId`, `usuarioEntranteId`.

**Límites:** un FK puede llegar por un camino no-DTO (parámetro de método tras lectura scoped) y ser seguro; o estar en un DTO de un endpoint sin uso. Y `reglaFidelizacionId` **no** está en ningún DTO pero sí llega como `item.reglaFidelizacionId` en un segundo camino (`ventas.service.ts:182`, `tienda.service.ts:273`) — es **mixta** y por eso #2 y #4 figuran con `client=no` siendo discutible. Columna **indicativa, no normativa**.

## 9.4 No se verificó la compensación de servicio caso por caso

Las compensaciones del Grupo B/D se citan de documentos previos `[D]` o de lectura puntual `[C]`. **No audité línea a línea** que cada una sea suficiente. Eso requiere test, no lectura.

---

# 10. CIERRE

## Cifras finales

| | |
|---|---|
| Universo total | **108** |
| Universo base (hacia modelo tenant-owned) | **75** |
| Universo registrable | **75** |
| Con write path (directo o nested) | **55** |
| Con riesgo cross-tenant demostrable | **23** |
| Actualmente cubierto | **10** |
| Con evidencia `[E]` | **6** |
| Sin evidencia | **69** |

## Lo que este inventario habilita

Es la base cuantificada que faltaba para la decisión de política pendiente (`09-TRANSFORMATION/24`, OD-1). Permite calcular el costo de cada opción sobre datos reales:

| Política | Universo | Faltante |
|---|---|---|
| Write-path-driven estricta | 55 | 45 |
| Client-FK-driven | 31 | 21 |
| **Riesgo demostrable** (client FK ∧ write) | **23** | **13** |
| Ownership-driven (toda E→E / noE→E) | 75 | 65 |

**No elijo ninguna.** La opción "riesgo demostrable" es la de menor cardinalidad con cobertura de todos los casos donde una FK del cliente se persiste sin mecanismo — dato, no recomendación.

## Correcciones a mis auditorías previas

1. `ProductoProveedor`: **EXECUTED — PASS** (doc 30), no FAILING. El registry está commiteado en `72e794d`.
2. **CONTRA-05 cerrado:** `b3-devolucion-proveedor-item` ya es step de CI.
3. La columna `nested` del detector automático subestimaba (6 → 8 tras corrección manual).

## Lo que sigue abierto

- La decisión de política (OD-1..OD-6 del doc 24) — **sin tocar**.
- 13 relaciones con riesgo demostrable no cubiertas (§6), **3 sin compensación alguna**.
- `Pago.deuda`: semántica `[ND]`, bloquea el lote de pagos.
- `Legajo`/`DocumentoLegajo`: ownership ambiguo (`ISO-AMBIG`).
- Las 5 relaciones hacia destino sin `empresaId`: requieren estrategia de ownership derivado.

---

# 11. EVIDENCE INDEX

## `[C]` — computado o verificado en esta auditoría

| Hecho | Método |
|---|---|
| 42 modelos, 28 con `empresaId` | parser de `prisma/schema.prisma` |
| **108 relaciones con FK en el origen; 0 compuestas** | parser: campos con `@relation(fields:[...])` |
| **Descomposición 28 / 75 / 5** | parser, clasificando por destino |
| **50 E→E, 25 noE→E** | parser |
| Las 5 hacia destino sin `empresaId`, enumeradas | parser |
| **31 con FK en DTO**; las 11 FK distintas | barrido de 37 archivos `*/dto/*.ts` |
| 49 con write path; 47 create; 24 update | barrido de `src/**` no-spec por delegado |
| 37 con transaction path | regex `tx.<modelo>.<op>(` |
| **8 nested** (corregido de 6) | verificación manual de los 4 sitios `items:`/`ventaItems:`/`pedidoItems:` |
| Registry = 6 modelos / 10 relaciones, **commiteado** | `git show HEAD:apps/api/src/prisma/relation-ownership.ts` |
| `ProductoProveedor` solo en 2 archivos del mecanismo | `grep -rn` excl. specs → cero código de aplicación |
| CI ejecuta **6** specs tras `72e794d` | `git show --stat 72e794d`; workflow |
| Cero `set`/`disconnect`/`connectOrCreate` en `src/` | grep exhaustivo |
| El mecanismo exige destino con `empresaId` | `empresa-scope.extension.ts:121-124` |
| Validación de forma del recolector | `relation-ownership.ts:61-70` |

## `[D]` — citado con fuente

`09-TRANSFORMATION/12,14,16,18` (Gates y `[E]` por slice) · `09-TRANSFORMATION/20` (matriz previa de 108) · `09-TRANSFORMATION/23` (CONTRA-01..06) · `09-TRANSFORMATION/24` (políticas A/B/C, OD-1..OD-6) · `13-AUDIT/29` (red team, FAIL inicial) · **`13-AUDIT/30`** (cierre red team, **PASS**, 89 verdes) · `03-DECISIONS/28-R8-ARCH-002` (12 propiedades, §6 abierto).

## `[ND]`

| ID | Ítem |
|---|---|
| ND-1 | Semántica de `Pago.deuda` → `CuentaCorriente` |
| ND-2 | Origen del `clienteId` en `Pedido.cliente` |
| ND-3 | Suficiencia de cada compensación de servicio (§9.4) |
| ND-4 | Write paths en módulos no leídos línea a línea (§9.2) |
| ND-5 | Clasificación de `reglaFidelizacionId` como cliente o servidor (§9.3) |
| ND-6 | Ownership de `Legajo`/`DocumentoLegajo` |
| ND-7 | Estado de los runs de CI hoy — no verificados |

## Clases no emitidas

**`[T]` observado = 0** · **`[E]` observado = 0.** No ejecuté tests ni verifiqué runs. Todo `[E]` es citado.

---

**No modifiqué código, registry, workflows, contratos canónicos ni invariants. No hice commits ni push. No tomé ninguna decisión. No extrapolé desde los 10 slices actuales. No declaré B3 VERIFIED.**
