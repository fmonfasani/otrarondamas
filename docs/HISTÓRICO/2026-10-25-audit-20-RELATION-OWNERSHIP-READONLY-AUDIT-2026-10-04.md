# Auditoría de solo lectura — Relaciones Prisma como superficie de aislamiento por tenant

**Fecha:** 2026-10-04
**Rama auditada:** `chore/build-in-ci`
**Estado:** AUDITORÍA — SOLO LECTURA. No implementa, no modifica, no cierra gates, no declara B3 VERIFIED.
**Relacionados:** `10-…PLAN`, `11-…AUDIT`, `12-…`, `18-…GATE-8-EVIDENCE-CLOSURE`

No se modificó código, tests, schema, docs, seeds ni `relation-ownership.ts`; no hubo commits ni cambios de rama. Solo lecturas del código y del DMMF de Prisma.

**No se ejecutó ningún test en esta auditoría.** Toda marca [E] proviene de lo que dicen los docs (`12`, `14`, `18`). El resultado del CI del PR #9 no fue observado.

Leyenda de evidencia: [C] código, [T] test existente, [E] ejecución, [D] documentado, [ND] no determinable.

Leyenda de clasificación: 1 PROTEGIDA, 2 NO PROTEGIDA, 3 NO RELEVANTE, 4 REQUIERE TEST, 5 REQUIERE DECISIÓN, 6 NO DETERMINABLE.

---

## 1. Executive Summary

- **Alcance de la matriz [C]:** el schema tiene 42 modelos, 28 con `empresaId` y 14 sin él. Hay 108 relaciones con FK en el origen:
  - 28 son E→Empresa, es decir el propio `empresaId`.
  - 5 son noE→noE.
  - 75 apuntan a un modelo con `empresaId`: 50 son E→E y 25 son noE→E.
- **Cobertura del registry [C]:** `RELACIONES_CON_OWNERSHIP` (`apps/api/src/prisma/relation-ownership.ts`) cubre 8 de las 75. Las otras 67 no tienen verificación de ownership relacional en la frontera de persistencia.
- **No se demostró explotabilidad:** que una relación no esté registrada no implica por sí mismo un bug. Algunos servicios hacen verificaciones compensatorias en la capa de servicio (citadas abajo [C]). Si esas verificaciones bastan en cada caso es [ND] hasta tener un test. El único gap demostrado por ejecución es el de TE-B3-001, ya mitigado para las relaciones registradas [D][E].
- **Hallazgo principal:** `PagoProveedor` y `DevolucionProveedor` tienen `empresaId` en el schema pero no están en `MODELOS_CON_EMPRESA_ID`. La extensión los deja pasar sin scope: no fuerza `empresaId` en los `create` y no filtra los `where` [C]. Los servicios compensan pasando `empresaId` a mano (`compras.service.ts:300`, `:355`).
- **Otras superficies sin scope:** los 14 modelos sin `empresaId` pasan sin scope por la extensión. `LegajoService`, auth, invitaciones y health usan el `PrismaService` base.
- **Estado de B3 y gates:** el Gate 8 documentado dice "B3 global tenant isolation: NOT VERIFIED". Este informe no declara cerrado ningún gate ni VERIFIED a B3.

## 2. Modelo de Tenant Ownership

**Ownership directo [C]:** columna `empresaId` y un hook `$allModels.$allOperations` en `empresa-scope.extension.ts`:

| Operación | Comportamiento |
|---|---|
| `create` / `createMany` | fuerzan `empresaId` |
| Operaciones con `where` | agregan `empresaId` al `where` |
| `findUnique*` | post-check; devuelve null o P2025 si el registro es de otra empresa |
| Cualquier otra operación (p. ej. `upsert`) sobre un modelo de la lista | `throw` |

El contexto de empresa viene del servidor (`EmpresaScopedPrismaService.forEmpresa(empresaId)`).

**Modelos fuera de la lista [C]** (líneas 157-159): `if (!esModeloConEmpresaId(model)) return query(args)`. Son los 14 sin `empresaId` más `PagoProveedor` y `DevolucionProveedor`. El post-check de `findUnique` también falla abierto para modelos sin campo `empresaId`.

**Ownership relacional [C]:**
- El registry es opt-in y `recolectarReferenciasRelacionales` recorre el payload (FK escalar, `connect`, `set`, y nested create/update/upsert) guiado por el DMMF.
- `verificarOwnershipRelacional` (`empresa-scope.extension.ts:115-137`, invocado en `:152-155`) consulta con el cliente base y lanza P2025 si el destino es de otra empresa o no existe.
- Falla cerrada ante formas no verificables (`create`/`connectOrCreate`/`disconnect` sobre relaciones registradas, FK desconocida) y ante destinos fuera de `MODELOS_CON_EMPRESA_ID`.

**Ownership indirecto (noE):** el mecanismo del schema no lo expresa. Se apoya en que el código llegue siempre por el padre ya filtrado, afirmado en un comentario de la extensión (~líneas 68-72 y 33-37) y no enforzado [C].

**Limitaciones documentadas [D][E]** (doc 12 §7):
- El preflight usa otra conexión y no ve filas no confirmadas de la misma transacción. Falla cerrada.
- TOCTOU es [ND].
- No hay FK compuesta, así que no hay garantía a nivel BD.

## 3. Inventario de modelos con `empresaId`

**28 con `empresaId` [C]:** Usuario, Invitacion, Familia, Subfamilia, Tipo, Subtipo, ProductoProveedor, Producto, Presentacion, Lote, Cliente, ReglaFidelizacion, CuentaCorriente, Deuda, Venta, Pedido, Pago, Caja, Proveedor, Compra, RecepcionCompra, MovimientoStock, Entrega, Notificacion, AuditLog, PagoProveedor, DevolucionProveedor, Autorizacion.

**En la lista de la extensión:** 26. Faltan `PagoProveedor` y `DevolucionProveedor`.

**14 sin `empresaId` [C]:**
- **Empresa:** raíz del tenant.
- **Globales o de seguridad:** Permiso, UsuarioPermiso.
- **Legajo:** Legajo, DocumentoLegajo.
- **Hijos de ítems:** VentaItem, PedidoItem, CompraItem, DevolucionProveedorItem, AplicacionPago.
- **Caja:** AperturaCaja, MovimientoCaja, ArqueoCaja, CierreCaja.

## 4. Matriz de relaciones

**Columnas.** O/D indica si el origen y el destino tienen `empresaId`: E, o noE. Mecanismo: **Reg** es el registry, **Svc** una verificación compensatoria en el servicio, "—" que no se encontró mecanismo. Tests: **T** si hay un test por relación específico, "—" si no. Prioridad: A, M o B. Todas las FK son escalares simples; no hay FK compuestas. El nombre de relación Prisma es el del DMMF (por defecto `OrigenToDestino`).

### 4.A Las 75 relaciones con destino de modelo con `empresaId`

| # | Origen.campo → Destino (FK) | O/D | Mecanismo | Tests | Cls | Pri |
|---|---|---|---|---|---|---|
| 1 | VentaItem.producto → Producto (productoId) | noE/E | **Reg** + Svc `resolverItems` (`ventas.service.ts:136`, `:238`) | T: `b3-tenant-isolation` (TE-B3-001, RI-02…RI-08) | 1 | — |
| 2 | VentaItem.reglaFidelizacion → ReglaFidelizacion (opt) | noE/E | **Reg** | T: en `b3-tenant-isolation` | 1 | — |
| 3 | PedidoItem.producto → Producto | noE/E | **Reg** | T: P-01…P-07 | 1 | — |
| 4 | PedidoItem.reglaFidelizacion → ReglaFidelizacion (opt) | noE/E | **Reg** | T: P-xx | 1 | — |
| 5 | CompraItem.producto → Producto | noE/E | **Reg** | T: describe Compra→CompraItem (hueco de numeración C-03→C-05) | 1 | — |
| 6 | DevolucionProveedorItem.producto → Producto | noE/E | **Reg** | T: `b3-devolucion-proveedor-item` | 1 | — |
| 7 | DevolucionProveedorItem.lote → Lote (opt) | noE/E | **Reg** | T: idem | 1 | — |
| 8 | Producto.familia → Familia | E/E | **Reg** | T: `b3-producto-familia` (commits `da973e9`, `d0ba8d7`) | 1 | — |
| 9 | Producto.subfamilia → Subfamilia | E/E | Svc `verificarJerarquia` (`catalogo.controller.ts:164`) | — | 4 | A |
| 10 | Producto.tipo → Tipo | E/E | Svc idem | — | 4 | A |
| 11 | Producto.subtipo → Subtipo | E/E | Svc idem | — | 4 | A |
| 12 | Subfamilia.familia → Familia | E/E | — (`jerarquia-catalogo.controller.ts:30` usa `forEmpresa`; verificación del padre [ND]) | — | 2 | M |
| 13 | Tipo.subfamilia → Subfamilia | E/E | — | — | 2 | M |
| 14 | Subtipo.tipo → Tipo | E/E | — | — | 2 | M |
| 15 | ReglaFidelizacion.familia → Familia (opt) | E/E | Svc `verificarNivelesCatalogo` (`fidelizacion.service.ts`) | — | 4 | M |
| 16 | ReglaFidelizacion.subfamilia (opt) | E/E | Svc idem | — | 4 | M |
| 17 | ReglaFidelizacion.tipo (opt) | E/E | Svc idem | — | 4 | M |
| 18 | ReglaFidelizacion.subtipo (opt) | E/E | Svc idem | — | 4 | M |
| 19 | ProductoProveedor.producto → Producto | E/E | — | — | 2 | M |
| 20 | ProductoProveedor.proveedor → Proveedor | E/E | — | — | 2 | M |
| 21 | Presentacion.producto → Producto | E/E | — | — | 2 | M |
| 22 | Lote.producto → Producto | E/E | — (inventario; verificación [ND]) | — | 2 | A |
| 23 | MovimientoStock.producto → Producto | E/E | — | — | 2 | A |
| 24 | MovimientoStock.lote → Lote (opt) | E/E | — | — | 2 | A |
| 25 | MovimientoStock.recepcionCompra → RecepcionCompra (opt) | E/E | — | — | 2 | M |
| 26 | MovimientoStock.usuario → Usuario (opt) | E/E | FK derivada del JWT [ND detalle] | — | 5 | B |
| 27 | CuentaCorriente.cliente → Cliente | E/E | — | — | 2 | M |
| 28 | Deuda.cliente → Cliente | E/E | — | — | 2 | A |
| 29 | Deuda.venta → Venta (opt) | E/E | — | — | 2 | A |
| 30 | Deuda.cuentaCorriente → CuentaCorriente (opt) | E/E | — | — | 2 | A |
| 31 | Venta.cliente → Cliente (opt) | E/E | Svc `clientesService.obtener(empresaId, …)` (`ventas.service.ts:131-134`, `:233-236`) | — | 4 | A |
| 32 | Venta.usuario → Usuario | E/E | `usuarioId` viene del contexto autenticado (`ventas.service.ts:113`, `:166`) | — | 5 | B |
| 33 | VentaItem.venta → Venta | noE/E | nested create ata el padre (`ventas.service.ts:174`); escritura directa de `ventaItem` no hallada [C] | — | 4 | M |
| 34 | PedidoItem.pedido → Pedido | noE/E | nested create (`tienda.service.ts:268`) | — | 4 | M |
| 35 | CompraItem.compra → Compra | noE/E | nested create (`compras.service.ts:129`) | — | 4 | M |
| 36 | DevolucionProveedorItem.devolucion → DevolucionProveedor | noE/E | nested create (`compras.service.ts:361`); destino fuera de la lista de la extensión | — | 5 | A |
| 37 | Pedido.cliente → Cliente | E/E | tienda: origen del `clienteId` [ND] | — | 2 | A |
| 38 | Pedido.usuario → Usuario (opt) | E/E | `pedidos.service.ts:79`, `:91`, `:106` (usuarioId del contexto) | — | 5 | B |
| 39 | Pago.venta → Venta (opt) | E/E | `ventas.service.ts:274` (`crearPago`); verificación línea a línea [ND] | — | 2 | A |
| 40 | Pago.pedido → Pedido (opt) | E/E | `pagos.service.ts` [ND detalle] | — | 2 | A |
| 41 | Pago.deuda → CuentaCorriente (opt; el campo se llama `deuda` pero apunta a CuentaCorriente, `schema.prisma:783-784`) | E/E | semántica [ND] | — | 6 | A |
| 42 | Pago.usuario → Usuario (opt) | E/E | contexto | — | 5 | B |
| 43 | AplicacionPago.pago → Pago | noE/E | `pagos.service.ts` [ND detalle] | — | 2 | A |
| 44 | AplicacionPago.deuda → Deuda | noE/E | idem | — | 2 | A |
| 45 | AperturaCaja.caja → Caja | noE/E | Svc `getCajaDeEmpresa` (`caja.service.ts`) | — | 4 | A |
| 46 | AperturaCaja.usuario → Usuario | noE/E | contexto | — | 5 | B |
| 47 | MovimientoCaja.caja → Caja | noE/E | Svc `getCajaDeEmpresa` | — | 4 | A |
| 48 | MovimientoCaja.usuario → Usuario | noE/E | contexto | — | 5 | B |
| 49 | ArqueoCaja.caja → Caja | noE/E | Svc `getCajaDeEmpresa` | — | 4 | A |
| 50 | ArqueoCaja.usuario → Usuario | noE/E | contexto | — | 5 | B |
| 51 | ArqueoCaja.usuarioEntrante → Usuario | noE/E | Svc (`caja.service.ts:214`) | — | 4 | M |
| 52 | ArqueoCaja.autorizacion → Autorizacion (opt) | noE/E | Svc (`caja.service.ts:235`) | — | 4 | M |
| 53 | CierreCaja.usuario → Usuario | noE/E | contexto | — | 5 | B |
| 54 | Compra.proveedor → Proveedor | E/E | Svc `db.proveedor.findUnique` (`compras.service.ts:102`), vía cliente scoped | — | 4 | A |
| 55 | Compra.usuario → Usuario | E/E | contexto | — | 5 | B |
| 56 | RecepcionCompra.compra → Compra | E/E | Svc `getCompra(empresaId, …)` (`compras.service.ts:185`) | — | 4 | M |
| 57 | RecepcionCompra.usuario → Usuario | E/E | contexto | — | 5 | B |
| 58 | Entrega.pedido → Pedido | E/E | — | — | 2 | M |
| 59 | Entrega.preparador → Usuario (opt) | E/E | — | — | 2 | M |
| 60 | Entrega.repartidor → Usuario (opt) | E/E | — | — | 2 | M |
| 61 | Notificacion.pedido → Pedido (opt) | E/E | — | — | 2 | B |
| 62 | AuditLog.usuario → Usuario (opt) | E/E | escritura interna | — | 5 | B |
| 63 | AuditLog.autorizacion → Autorizacion (opt) | E/E | escritura interna | — | 5 | B |
| 64 | AuditLog.venta → Venta (opt) | E/E | escritura interna | — | 5 | B |
| 65 | PagoProveedor.compra → Compra | E/E, **origen fuera de la lista** | Svc `getCompra` (`compras.service.ts:288`) | — | 5 | A |
| 66 | PagoProveedor.proveedor → Proveedor | E/E, idem | `proveedorId: compra.proveedorId` (`:302`) | — | 5 | A |
| 67 | PagoProveedor.usuario → Usuario | E/E, idem | contexto | — | 5 | B |
| 68 | DevolucionProveedor.compra → Compra | E/E, **origen fuera de la lista** | Svc `getCompra` (`:349`) | — | 5 | A |
| 69 | DevolucionProveedor.proveedor → Proveedor | E/E, idem | `compra.proveedorId` (`:357`) | — | 5 | A |
| 70 | DevolucionProveedor.usuario → Usuario | E/E, idem | contexto | — | 5 | B |
| 71 | Autorizacion.autorizador → Usuario | E/E | `autorizaciones.service.ts:68` [ND detalle] | — | 4 | M |
| 72 | Invitacion.invitadoPor → Usuario | E/E | `invitaciones.service.ts` usa `PrismaService` base | — | 5 | B |
| 73 | Legajo.usuario → Usuario (opt) | noE/E | `LegajoService` sobre cliente base | — (TE-B3-009 no ejecutado [D]) | 5 | A |
| 74 | Legajo.cliente → Cliente (opt) | noE/E | idem | — | 5 | A |
| 75 | UsuarioPermiso.usuario → Usuario | noE/E | Permiso es global; los puntos de escritura no fueron auditados | — | 6 | B |

Subtotales de clasificación (lectura de la tabla, no una cifra independiente):

| Cls | Cantidad |
|---|---|
| 1 | 8 |
| 2 | 20 |
| 4 | 17 |
| 5 | 25 |
| 6 | 5 |

### 4.B Las 33 restantes (sin destino con `empresaId`)

- **28 relaciones `X.empresa → Empresa` [C]:** son la columna de scope misma. Clase 3 (NO RELEVANTE) como superficie relacional. La extensión fuerza `empresaId` en los `create` de los modelos de la lista. En `PagoProveedor` y `DevolucionProveedor` el valor lo pone el servicio.
- **5 relaciones noE→noE [C]:**
  - UsuarioPermiso.permiso → Permiso, global: clase 3.
  - DocumentoLegajo.legajo → Legajo: clase 5, ligada a TE-B3-009.
  - MovimientoCaja.aperturaCaja, ArqueoCaja.aperturaCaja y CierreCaja.aperturaCaja → AperturaCaja: ownership indirecto vía `caja → Caja`, clase 4, prioridad M. El mecanismo no garantiza que `aperturaCaja` y `caja` sean de la misma Caja.

## 5. Relaciones actualmente protegidas (clase 1)

Son las 8 filas #1 a #8 de la tabla 4.A:

- **Mecanismo [C]:** registry + recolector + preflight `verificarOwnershipRelacional`.
- **Tests [T]:** `b3-tenant-isolation.integration-spec.ts`, `b3-devolucion-proveedor-item.integration-spec.ts`, `b3-producto-familia.integration-spec.ts`, más los unitarios de `relation-ownership.spec.ts`.
- **Evidencia de ejecución [E] solo vía docs:**
  - VentaItem→Producto: doc 12 §5 (17/17).
  - PedidoItem→Producto: doc 14, B4 run `37217710481` (SUCCESS).
  - Doc 18 afirma cerrados con ejecución los Gates 6.1, 6.2 y 6.3. La capability "demostrada" que lista el doc 18 incluye solo VentaItem→Producto, PedidoItem→Producto, PedidoItem→ReglaFidelizacion y VentaItem→ReglaFidelizacion.
  - Para CompraItem→Producto, DevolucionProveedorItem→Producto/Lote y Producto→Familia, **no se observó ejecución en esta auditoría**. Existen workflows (`b3-tenant-isolation-candidate.yml`) y commits recientes, pero el resultado de CI es [ND].
- **Matiz:** "protegida" significa que el mecanismo rechaza un valor de otra empresa en la forma que el test ejerce. No se afirma independencia de path (TE-B3-008, abierta [D]).

## 6. Relaciones potencialmente no protegidas

Todas las filas de clase 2, 4, 5 y 6 de 4.A (67 relaciones). Destacadas las de prioridad A (FK que puede venir de input del cliente o que cruza dominios sensibles):

- **Pagos y deuda:** #28-#30 (Deuda), #39-#41 (Pago), #43-#44 (AplicacionPago).
- **Stock:** #22-#24.
- **Pedido y venta:** #31 (Venta.cliente), #37 (Pedido.cliente).
- **Caja:** #45, #47, #49. Los tres usan `getCajaDeEmpresa`, pero no hay un test por relación.
- **Catálogo:** #9-#11 (Producto→jerarquía), con `verificarJerarquia` como control.
- **Compras:** #54 (Compra.proveedor), #65-#69 (los dos modelos fuera de lista), #36.
- **Legajo:** #73-#74.

## 7. Superficies de nested writes

**Sitios nested encontrados [C]** (grep `create:` en `src`, excluyendo specs, registry y extensión):

| Archivo:línea | Nested | Relaciones afectadas | Estado |
|---|---|---|---|
| `ventas.service.ts:174` | `ventaItems.create` (variable) | #1, #2, #33 | #1/#2 registradas |
| `tienda.service.ts:268` | items de Pedido | #3, #4, #34 | #3/#4 registradas |
| `compras.service.ts:129` | `compraItems.create` | #5, #35 | #5 registrada |
| `compras.service.ts:361` | items de DevolucionProveedor | #6, #7, #36 | #6/#7 registradas, #36 no |

**No se encontró en `src`:**
- `connect`, `connectOrCreate`, `set`, `disconnect`, `deleteMany` o `updateMany` anidados.
- `upsert` en servicios. `tienda.service.ts:228` documenta que usan `findFirst` + `create`/`update` porque la extensión rechaza `upsert`.
- `catalogo.controller.ts:104` documenta que usa FK escalar en vez de `connect`.

**Superficie directa:** el resto de las FK se escribe como escalar en top-level (por ejemplo `proveedorId: dto.proveedorId`, `clienteId: dto.clienteId`). Esa forma solo se verifica si la relación está en el registry o el servicio compensa.

**Operaciones y fail-closed:**
- Una relación registrada falla cerrada ante `create`, `connectOrCreate` y `disconnect` [C]. Hoy ningún sitio las usa sobre relaciones registradas [C].
- Ampliar el registry por lote exige re-chequear antes que ningún servicio use esas formas.

**Raw SQL:** sin resultados de `$queryRaw`, `$executeRaw` y `Unsafe` en `apps/api/src` [C]. TE-B3-006, que cubre la superficie raw SQL, sigue abierto [D].

## 8. Schema vs `relation-ownership.ts`

| Categoría | Relaciones | Comentario |
|---|---|---|
| Cubiertas | 8 (#1-#8) | sin duplicados en el registry [C] |
| Probablemente faltantes (prioridad A) | #9-#11, #22-#24, #28-#31, #37, #39-#41, #43-#44, #45, #47, #49, #54 | FK escalar de input potencial; falta decidir cuáles requieren registry y cuáles bastan con el control del servicio |
| Cubiertas por control compensatorio (clase 4) | 17 | funcionan por disciplina del call-site; el doc 12 §1 lo califica como no protegiendo la frontera de persistencia |
| No deberían registrarse (3) | 28 `*.empresa` + UsuarioPermiso.permiso | son la columna de scope o relaciones con un modelo global |
| Requieren decisión previa (5) | #26, #32, #36, #38, #42, #46, #48, #50, #53, #55, #57, #62-#64, #65-#70, #72-#74 | FK derivadas del contexto del servidor, modelos fuera de la lista de la extensión, o clientes base |
| No determinables (6) | #41, #75 | semántica de `Pago.deuda → CuentaCorriente`; puntos de escritura de UsuarioPermiso |

La ausencia en el registry no se concluye como bug: el criterio de cada fila es [C]/[ND], no inferido.

**Hallazgo adicional [C]:** el recolector del registry bloquea destinos fuera de `MODELOS_CON_EMPRESA_ID`. Registrar #36, o cualquier relación con destino `DevolucionProveedor` o `PagoProveedor`, fallaría cerrada hasta incorporarlos a la lista. Es una decisión sobre el mecanismo, no un hallazgo de bug.

## 9. Tests existentes relacionados

| Archivo | Cubre [T] |
|---|---|
| `test/integration/b3-tenant-isolation.integration-spec.ts` | TE-B3-001…006 previos y describes de VentaItem→Producto (RI-02…RI-08), PedidoItem (P-01…P-07), CompraItem (C-xx) |
| `test/integration/b3-devolucion-proveedor-item.integration-spec.ts` | DevolucionProveedorItem→Producto y →Lote |
| `test/integration/b3-producto-familia.integration-spec.ts` | Producto→Familia |
| `test/integration/tenant-isolation.integration-spec.ts` | 3 tests de aislamiento directo por `empresaId` |
| `src/prisma/relation-ownership.spec.ts` | unitario del recolector (sin BD) |
| Unit tests de health y el resto | no relacionados con relaciones |

Observaciones:
- **Numeración:** en el describe Compra→CompraItem falta el id C-04 (de C-03 salta a C-05). No se sabe si es un test eliminado o un hueco de numeración [ND].
- **Fixtures:** el spec de DevolucionProveedorItem repite la cadena Familia→Subfamilia→Tipo→Subtipo→Producto sin fixtures compartidos [C].
- **Typecheck:** el test TE-B3-001 tiene un error TS2322 bajo `tsc` completo. No afecta al build desde el PR #9, que excluye `test/` vía `tsconfig.build.json`.

## 10. Tests candidatos faltantes

Candidatos para un ciclo autorizado; no implementados.

1. **Por cada relación de la tabla 4.A de prioridad A:**
   - Positivo A+A y negativo A+B (P2025 y conteo en BD sin cambios).
   - Verificar también la escritura directa y la transacción.
2. **PagoProveedor/DevolucionProveedor:** test que demuestre si el comportamiento sin scope de la extensión permite lecturas cross-tenant a través del cliente scoped. Es [ND] hoy, aunque los servicios compensan con `getCompra` en `listarPagos` (`:268`) y `listarDevoluciones` (`:324`).
3. **Legajo/DocumentoLegajo (TE-B3-009):** ejecución real; hoy abierta [D].
4. **Independencia de path (TE-B3-008)** y **raw SQL (TE-B3-006)**, abiertos [D].
5. **Cajas:** que `aperturaCaja` y `caja` pertenezcan a la misma Caja en `MovimientoCaja`, `ArqueoCaja` y `CierreCaja`.
6. **Pago.deuda:** test que fije la semántica real (CuentaCorriente vs Deuda) antes de decidir ownership.
7. **Control negativo del registry:** que la suite generada falle contra la extensión sin registry.

## 11. Riesgos

| Riesgo | Evidencia | Nivel |
|---|---|---|
| 67 de 75 relaciones sin verificación en la frontera de persistencia; la protección depende de la disciplina de cada servicio | [C] registry de 8; [D] doc 12 §1 | Alto como patrón, no probado como exploit |
| `PagoProveedor` y `DevolucionProveedor` con `empresaId` pero fuera de la lista: sin `empresaId` forzado ni `where` por la extensión | [C] `empresa-scope.extension.ts:39-75` vs schema | Alto |
| Modelos noE pasan sin scope (14) y `findUnique` post-check falla abierto sin campo `empresaId` | [C] `:157-159` | Medio-alto |
| `LegajoService` y auth sobre `PrismaService` base | [C] grep de imports | Medio; TE-B3-009 abierto |
| Comentarios desactualizados de la extensión (cabecera ~33-37; lista ~68-72 afirma que Legajo hereda scope sin enforcement) | [C] | Medio (confusión) |
| Preflight en otra conexión: rechaza (por error) filas creadas en la misma transacción | [E] doc 12 §7 | Bajo-medio: falla cerrada |
| TOCTOU entre preflight y escritura | [ND] | [ND] |
| Sin FK compuesta en BD | [C] schema | Medio: toda garantía es de aplicación |
| Fricción CRLF/LF y `npm run lint` con `--fix` | [C] | Operativo |
| Contradicción documental entre los distintos docs de estado | [D] | Operativo |

## 12. Ambigüedades y [ND]

- Semántica de `Pago.deudaId → CuentaCorriente` (campo `deuda`, `schema.prisma:783-784`).
- Si `pagos.service.ts`, `inventario.service.ts` e `inventario.controller.ts` verifican el ownership de cada FK de input; no se auditó línea a línea.
- Si `jerarquia-catalogo.controller.ts` verifica el ownership del padre (#12-#14).
- Si `tienda.service.ts` verifica ownership del `clienteId` y los items del pedido.
- Quién escribe `UsuarioPermiso` y `Permiso`.
- Comportamiento de los 14 modelos sin `empresaId` a través del cliente scoped en cada servicio.
- Si el test C-04 existió.
- Resultado de CI del PR #9 y de los workflows del candidato B3 para #5-#8 (no observado).
- TOCTOU.
- Si existe un test de CI que detecte un modelo nuevo con `empresaId` olvidado en la lista de la extensión (no se encontró uno).

## 13. Priorización de verificación

1. **Decisión del Owner sobre `PagoProveedor` y `DevolucionProveedor`** y sus relaciones #36 y #65-#70: es la inconsistencia más concreta entre schema y extensión.
2. **Pagos y deuda** (#28-#30, #39-#41, #43-#44): dominio financiero con FK de input.
3. **Stock** (#22-#25): `MovimientoStock` y `Lote`.
4. **Ventas y pedidos con cliente** (#31, #37).
5. **Caja** (#45, #47, #49 y las noE→noE de `aperturaCaja`).
6. **Catálogo** (#9-#18): jerarquía.
7. **Legajo** (#73-#74, DocumentoLegajo, TE-B3-009).
8. El resto de clases 2/4/5 de prioridad M/B.

## 14. Recomendación de próximos candidatos

Candidatos de verificación para que el Owner elija; no son implementaciones ni cierres.

1. **Test de caracterización de `PagoProveedor`/`DevolucionProveedor`** (no un fix): demostrar por ejecución qué hace hoy la extensión con esos modelos. Es el candidato más barato y el de mayor valor informativo.
2. **Lote `Pago`/`Deuda`/`AplicacionPago`** con una tabla de relaciones y un test negativo por relación. Antes hay que resolver la semántica de `Pago.deuda`.
3. **Lote Stock** (`MovimientoStock.producto/lote/recepcionCompra`, `Lote.producto`).
4. **`Venta.cliente`** como arista aislada, siguiendo el patrón de los candidatos existentes.
5. **Spike previo a ampliar el registry:** listar qué servicios usan `set`, `disconnect`, `updateMany` o `connectOrCreate` sobre las relaciones candidatas, porque fallarían cerrados.

Esto es auditoría, no implementación: no cierra ningún gate ni declara VERIFIED a B3.
