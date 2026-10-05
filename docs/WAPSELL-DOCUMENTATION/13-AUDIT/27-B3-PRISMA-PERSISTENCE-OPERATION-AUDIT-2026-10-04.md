# B3 — PRISMA PERSISTENCE / TENANT ISOLATION OPERATION AUDIT

**Estado:** AUDITORÍA TÉCNICA READ-ONLY — NO CANÓNICO — NO APROBADO
**Fecha:** 2026-10-04
**Repo:** `fmonfasani/otrarondamas`
**Branch:** `chore/build-in-ci`
**Commit base:** `d0ba8d7` (`fix(b3): enforce Producto Familia relation isolation`)
**Rol:** auditor de persistencia / tenant isolation. **Modo: solo lectura.**

**Acción:** sin cambios de código, tests, schema, documentación de diseño, datos ni migraciones. Sin commits, push ni merge. **No se modificó `relation-ownership.ts`. No se registró ninguna relación. No se corrigió código. No se ejecutó ningún test.**

**Clases de evidencia:** `[C]` código · `[T]` test · `[E]` ejecución · `[D]` documentación · `[ND]` no determinable.

> **No se emite ninguna evidencia `[T]` ni `[E]`.** Existen 4 specs de integración en el repositorio `[C]`, pero **no se ejecutaron en esta auditoría** y no se verificó ningún resultado de CI. "Test existente" significa *el archivo y el caso existen*, nunca *el caso pasó*.
>
> **No se declara ningún Gate cerrado. No se declara B3 VERIFIED.**

---

# 1. EXECUTIVE SUMMARY

## 1.1 El estado del mecanismo cambió sustancialmente desde la última auditoría

Esta auditoría encuentra un sistema distinto del que describen los informes `23-BLOCK-3-…ASIS-AUDIT` y `26-B3-TESTS-EVALS-AND-READINESS` (ambos sobre `main`). Sobre `chore/build-in-ci` existen tres piezas nuevas `[C]`:

| Pieza | Estado en informes previos | Estado real en esta branch |
|---|---|---|
| `src/prisma/relation-ownership.ts` (227 líneas) | **no existía** | existe, con registro declarativo opt-in de 5 modelos |
| Verificación de ownership relacional en la extensión | "NO CUMPLE como mecanismo" | **implementada** (`empresa-scope.extension.ts:115-137, 152-155`) |
| `apps/api/test/integration/` | "`apps/api/test` no existe" | 4 specs, 1.511 líneas, ~90 casos |
| CI de aislamiento | no existía | 2 workflows con Postgres 15 |

**Consecuencia directa:** el hallazgo central de los informes anteriores — *"nested writes y FK no validados; único punto con dato cruzado persistible"* — **ya no describe el código de esta branch** para las relaciones registradas. El mecanismo ahora intercepta FK escalares y `connect` en escrituras de nivel superior y anidadas, verifica ownership contra la base antes de persistir, y falla cerrado con P2025 `[C]`.

## 1.2 Arquitectura de clientes: dos clientes, un solo punto de extensión

`PrismaModule` exporta **ambos** clientes `[C]`:

- `PrismaService extends PrismaClient` — sin scope, 15 líneas, sin extensión.
- `EmpresaScopedPrismaService.forEmpresa(empresaId)` — fábrica que devuelve `prisma.$extends(empresaScopeExtension(empresaId))`.

**Solo existen 2 `$extends` en todo el repositorio** `[C]`: el de la fábrica y el interno de la propia extensión. No hay clientes alternativos, ni aliases de cliente fuera de `db`/`tx`, ni servicios que reciban un `PrismaClient` por constructor fuera de `PrismaService`.

## 1.3 Inventario de operaciones

| Superficie | Operaciones | Clasificación dominante |
|---|---|---|
| Cliente **scoped** (`db.*`, `tx.*`) | **119** en 14 archivos | A — correctamente scoped |
| Cliente **sin scope** (`this.prisma.<model>.<op>`) | **45** en 8 archivos | C (pre-context) y D (potencialmente unscoped) |
| `$transaction` | **11** sitios (9 interactivas + 2 por array) | A, salvo las 2 por array |
| `$executeRaw` / `$queryRaw` productivo | **2** (1 con tenant, 1 sin modelo) | A / B |
| `upsert` / `groupBy` en `src/` | **0** | — (fail-closed activo) |

## 1.4 Hallazgos que condicionan B3

1. **`DevolucionProveedorItem` ahora está registrado** (`relation-ownership.ts:25`) con `producto` y `lote`. El código de `crearDevolucion` **no cambió** `[C]` — sigue pasando `productoId`/`loteId` del DTO al nested create — pero la extensión ahora los intercepta. **El defecto se cerró por mecanismo, no por corrección del call site.** Clasificación: **E — requiere test** (existe spec D-01..D-07; no ejecutado en esta auditoría).

2. **El registro es opt-in y cubre 5 modelos de los ~14 que escriben FK hacia modelos scoped** `[C]`. Las relaciones no registradas pasan por `visitarRelacionNoRegistrada`, que **recorre en profundidad pero no recolecta referencias** del modelo padre — solo desciende a hijos. Hay FK escalares escritas desde DTO que ningún mecanismo valida (§15, GAP-01).

3. **`MovimientoStock` escribe `productoId`/`loteId` desde DTO en 4 sitios y NO está registrado** `[C]`. En `compras.service.ts:374` (dentro de `crearDevolucion`) el `productoId` viene del mismo DTO que sí se valida para `DevolucionProveedorItem`. **Asimetría real:** la misma referencia queda verificada en un modelo y sin verificar en el otro, en la misma transacción.

4. **`Producto` está registrado solo para `familia`** (`relation-ownership.ts:26`). `subfamiliaId`, `tipoId` y `subtipoId` se escriben desde DTO (`catalogo.controller.ts:113-116`) y **no están registrados**. Los cubre `verificarJerarquia(db, …)` — una validación de call site con cliente scoped `[C]`, no el mecanismo. Clasificación: **A por disciplina / E**.

5. **Las 2 transacciones por array usan el cliente sin scope** (`invitaciones.service.ts:118, 227`) y crean `Usuario`/`Cliente` — modelos scoped — tomando `empresaId` de `invitacion.empresaId` `[C]`. Correctas por construcción, **fuera de la garantía del mecanismo**. Clasificación: **D**.

6. **`Legajo` y `DocumentoLegajo`: 13 operaciones con cliente sin scope, ninguna con filtro de empresa** `[C]` (`legajo.service.ts`). El aislamiento depende enteramente de que los controllers pasen `user.id` propio. Verificado: lo hacen, y la única ruta que acepta un ID arbitrario valida explícitamente (`legajo.controller.ts:145-152`). Clasificación: **D — mitigado por call site**.

7. **`upsert` y `groupBy`: cero usos en `src/`** `[C]`. El fail-closed de la extensión está moldeando el código: 18 `upsert` existen, **todos en scripts offline** (`seed.ts`, `migrate-categoria-a-jerarquia.ts`), que usan `PrismaClient` propio y están fuera del plano de request. Clasificación: **B / C**.

## 1.5 Lo que esta auditoría no puede afirmar

Existen ~90 casos de test de aislamiento, incluidos negativos cross-Business y casos dentro de transacción interactiva `[C]`. **No los ejecuté.** No verifiqué ningún run de CI. Por lo tanto:

- no se declara que el aislamiento esté verificado;
- no se declara ningún Gate cerrado;
- la columna "test existente" de este informe significa *el caso está escrito*, no *el caso pasa*.

---

# 2. PRISMA CLIENT ARCHITECTURE

## 2.1 Clientes

| Componente | Archivo | Líneas | Rol | Scope |
|---|---|---|---|---|
| `PrismaService` | `src/prisma/prisma.service.ts` | 1-15 | `extends PrismaClient`; `$connect` en `onModuleInit`; shutdown hooks | **ninguno** |
| `EmpresaScopedPrismaService` | `src/prisma/empresa-scoped-prisma.service.ts` | 34-41 | fábrica: `forEmpresa(empresaId)` → `prisma.$extends(...)` | aplica el scope |
| `empresaScopeExtension` | `src/prisma/empresa-scope.extension.ts` | 145-220 | `Prisma.defineExtension` con hook `$allModels.$allOperations` | el mecanismo |
| `relation-ownership` | `src/prisma/relation-ownership.ts` | 1-227 | recolecta referencias relacionales del payload vía DMMF | auxiliar del mecanismo |

`PrismaModule` (`src/prisma/prisma.module.ts:1-9`) declara y **exporta ambos** — `PrismaService` y `EmpresaScopedPrismaService` `[C]`. Esto es lo que hace que el acceso sin scope sea inyectable desde cualquier módulo que importe `PrismaModule`.

## 2.2 Todos los `$extends`

Búsqueda exhaustiva en `src/` y `test/` `[C]`:

| Sitio | Propósito |
|---|---|
| `empresa-scoped-prisma.service.ts:39` | `this.prisma.$extends(empresaScopeExtension(empresaId))` — único punto de instanciación |
| `empresa-scope.extension.ts:147` | `client.$extends({ name: 'empresa-scope', query: {...} })` — definición interna |

**No existe ningún otro `$extends`.** No hay extensiones paralelas ni clientes alternativos.

## 2.3 Aliases de cliente

| Alias | Significado | Scope |
|---|---|---|
| `this.prisma` | `PrismaService` inyectado | **sin scope** |
| `db` | resultado de `forEmpresa(...)` | **scoped** |
| `tx` | parámetro del callback de `db.$transaction` | **scoped** (hereda la extensión) |
| `prisma` (en `prisma/*.ts`) | `new PrismaClient()` en scripts offline | **sin scope**, fuera del plano de request |

Verificado: no existen otros aliases (`client`, `factory` como cliente, etc.) `[C]`. `this.prismaFactory` es la fábrica, no un cliente.

## 2.4 Tipos de transaction client

Tres servicios derivan explícitamente el tipo del `tx` **del cliente extendido**, no del base `[C]`:

| Archivo | Línea | Tipo |
|---|---|---|
| `compras.service.ts` | 16 | `type EmpresaScopedTx = Parameters<Parameters<EmpresaScopedClient['$transaction']>[0]>[0]` |
| `inventario.service.ts` | 12 | idem, con comentario explicativo en `:9-11` |
| `tienda.service.ts` | 13 | idem; además anota el parámetro: `async (tx: EmpresaScopedTx)` |

Esto es evidencia `[C]` de tipos de que el `tx` conserva la extensión. **No es evidencia de ejecución** — ver §16, ND-01.

## 2.5 El mecanismo de scope, operación por operación

`empresa-scope.extension.ts`, hook `$allOperations` `[C]`:

| Paso | Líneas | Comportamiento |
|---|---|---|
| 1. Ownership relacional | 152-155 | `recolectarReferenciasRelacionales(model, operation, args)`; si hay referencias, `verificarOwnershipRelacional` **antes** de la query. Se ejecuta para **todo modelo**, registrado o no en `MODELOS_CON_EMPRESA_ID` |
| 2. Modelo no scoped | 157-159 | `return query(args)` sin tocar nada |
| 3. `create` | 166-171 | `data.empresaId = empresaId` — **pisa** lo que venga del body |
| 4. `createMany` | 173-177 | mapea todas las filas forzando `empresaId` |
| 5. `OPERACIONES_CON_WHERE` | 179-182 | inyecta `where.empresaId`. Set: `findFirst`, `findFirstOrThrow`, `findMany`, `update`, `updateMany`, `delete`, `deleteMany`, `count`, `aggregate` (9 ops, `:89-99`) |
| 6. `findUnique` / `findUniqueOrThrow` | 184-207 | **validación post-query**: ejecuta, compara `resultado.empresaId !== empresaId`, devuelve `null` o lanza P2025 |
| 7. Resto | 209-214 | **lanza Error** — `upsert`, `groupBy`, `createManyAndReturn` y cualquier operación no enumerada |

**`createManyAndReturn` no está en ninguna lista** → cae en el paso 7 y falla cerrado. Verificado: cero usos en `src/` `[C]`.

## 2.6 El mecanismo de ownership relacional

`relation-ownership.ts` `[C]`:

**Registro** (`:21-27`), declarativo y opt-in:

| Modelo dueño | Relaciones verificadas |
|---|---|
| `VentaItem` | `producto`, `reglaFidelizacion` |
| `PedidoItem` | `producto`, `reglaFidelizacion` |
| `CompraItem` | `producto` |
| `DevolucionProveedorItem` | `producto`, `lote` |
| `Producto` | `familia` |

**Qué recolecta** (`recolectarReferenciasRelacionales`, `:194-227`): para `create`, `update`, `updateMany` recorre `args.data`; para `createMany`/`createManyAndReturn` cada fila; para `upsert` ambos payloads. Dedupe por `modelo:where`.

**Cómo recorre** (`visitarDatos`, `:156-186`):
- si la clave es el **FK escalar** de una relación registrada → recolecta referencia (`:170-175`);
- si es una **relación registrada** como objeto → `referenciasDeConnect`, que **solo admite `connect`** y lanza para cualquier otra operación anidada (`:102-107`);
- si es una relación **no registrada** → `visitarRelacionNoRegistrada` (`:119-154`), que desciende a `create`, `createMany`, `connectOrCreate`, `update`, `updateMany`, `upsert` del hijo, **sin recolectar nada del padre**.

**Verificación** (`verificarOwnershipRelacional`, extensión `:115-137`): `findUnique({where, select:{empresaId:true}})` sobre el **cliente base** (`client`, no `tx`); si no existe o `empresaId !== empresaId` efectivo → **P2025**, tratando el recurso ajeno como inexistente para no revelar su existencia.

**Dos propiedades notables del diseño:**
1. Lanza si una relación registrada se usa de forma no verificable (`:67-69`, `:86-88`, `:104-106`). Fail-closed por forma de payload.
2. Exige que el modelo destino tenga `empresaId` directo (extensión `:121-124`); si no, lanza.

---

# 3. COMPLETE PRISMA OPERATION INVENTORY

## 3.1 Resumen cuantitativo

| Cliente | Operaciones de modelo | Archivos |
|---|---|---|
| **scoped** (`db.*` / `tx.*`) | 119 | 14 |
| **sin scope** (`this.prisma.*`) | 45 | 8 |
| **offline** (`prisma.*` en scripts) | ~30 | 3 |
| **Total productivo** | **164** | 22 |

## 3.2 Operaciones scoped, por archivo

Todas clasificación **A — correctamente scoped**, salvo donde se indica en §6.

| Archivo | Ops |
|---|---|
| `src/compras/compras.service.ts` | 24 |
| `src/caja/caja.service.ts` | 16 |
| `src/ventas/ventas.service.ts` | 11 |
| `src/tienda/tienda.service.ts` | 10 |
| `src/inventario/inventario.service.ts` | 10 |
| `src/fidelizacion/fidelizacion.service.ts` | 10 |
| `src/clientes/clientes.service.ts` | 8 |
| `src/pagos/pagos.service.ts` | 7 |
| `src/catalogo/catalogo.controller.ts` | 6 |
| `src/pedidos/pedidos.service.ts` | 5 |
| `src/inventario/inventario.controller.ts` | 4 |
| `src/catalogo/jerarquia-catalogo.controller.ts` | 4 |
| `src/autorizaciones/autorizaciones.service.ts` | 2 |
| `src/usuarios/usuarios.controller.ts` | 1 |

## 3.3 Operaciones con cliente sin scope — inventario completo (45)

Las 20 dimensiones del encargo, condensadas en las columnas que discriminan. Todas `[C]`.

**Grupo `auth/*` — 12 operaciones**

| # | Archivo:línea | Método | Modelo | Op | Scoped | ¿empresaId? | Origen | Context | Clasif. |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `auth.service.ts:45` | `verificarCredenciales` | Usuario | findUnique | no | no | — | **no existe aún** | **C** |
| 2 | `auth.controller.ts:48` | `me` | Usuario | findUnique | no | no | `user.id` del token | sí, no usado | **C** |
| 3 | `auth.google.service.ts:36` | `loginConGoogle` | Usuario | findUnique | no | no | `googleId` | no existe aún | **C** |
| 4 | `auth.google.service.ts:45` | idem | Usuario | findUnique | no | no | `email` | no existe aún | **C** |
| 5 | `auth.google.service.ts:51` | idem | Usuario | update | no | no | `id` resuelto | no existe aún | **C** |
| 6 | `auth.google.service.ts:67` | idem | Usuario | **create** | no | **sí** | `GOOGLE_SIGNUP_EMPRESA_ID` (env) | no existe aún | **C / F** |
| 7 | `auth.cliente.controller.ts:83` | — | Cliente | findUnique | no | no | `user.id` | sí, no usado | **C** |
| 8 | `auth.cliente.service.ts:36` | `registrar` | Cliente | findFirst | no | **sí** | `TIENDA_EMPRESA_ID` | no existe aún | **C** |
| 9 | `auth.cliente.service.ts:44` | `registrar` | Cliente | **create** | no | **sí** | `TIENDA_EMPRESA_ID` | no existe aún | **C / F** |
| 10 | `auth.cliente.service.ts:61` | `login` | Cliente | findFirst | no | **sí** | `TIENDA_EMPRESA_ID` | no existe aún | **C** |
| 11 | `auth.cliente.service.ts:92` | `loginConGoogle` | Cliente | findUnique | no | **no** | `googleId` **global** | no existe aún | **C / F** |
| 12 | `auth.cliente.service.ts:98,104,110` | idem | Cliente | findFirst/update/**create** | no | sí | `TIENDA_EMPRESA_ID` | no existe aún | **C / F** |

**Grupo `invitaciones/*` — 13 operaciones**

| # | Archivo:línea | Modelo | Op | ¿empresaId? | Origen | Clasif. |
|---|---|---|---|---|---|---|
| 13 | `invitaciones.controller.ts:39` | Invitacion | findMany | **a mano** | `user.empresaId` | **D** |
| 14 | `invitaciones.service.ts:38` | Usuario | findUnique | **no** | `email` global | **C / F** |
| 15 | `invitaciones.service.ts:43` | Invitacion | findFirst | a mano | `empresaId` param | **D** |
| 16 | `invitaciones.service.ts:53` | Invitacion | **create** | a mano | `empresaId` param | **D** |
| 17 | `invitaciones.service.ts:94` | Invitacion | findUnique | no | `token` secreto | **C** |
| 18 | `invitaciones.service.ts:119` | Usuario | **create** (en `$transaction` array) | a mano | `invitacion.empresaId` | **D** |
| 19 | `invitaciones.service.ts:135` | Invitacion | update (idem tx) | no | `id` resuelto | **D** |
| 20 | `invitaciones.service.ts:158` | Cliente | findFirst | a mano | `empresaId` param | **D** |
| 21 | `invitaciones.service.ts:165` | Invitacion | findFirst | a mano | `empresaId` param | **D** |
| 22 | `invitaciones.service.ts:177` | Invitacion | **create** | a mano | `empresaId` param | **D** |
| 23 | `invitaciones.service.ts:212` | Invitacion | findUnique | no | `token` secreto | **C** |
| 24 | `invitaciones.service.ts:228` | Cliente | **create** (en `$transaction` array) | a mano | `invitacion.empresaId` | **D** |
| 25 | `invitaciones.service.ts:242` | Invitacion | update (idem tx) | no | `id` resuelto | **D** |

**Grupo `legajo/*` — 20 operaciones**

| # | Archivo:línea | Modelo | Op | ¿empresaId? | Mitigación verificada | Clasif. |
|---|---|---|---|---|---|---|
| 26 | `legajo.controller.ts:85` | Usuario | findMany | **a mano** | `user.empresaId` | **D** |
| 27 | `legajo.controller.ts:108` | Usuario | findFirst | **a mano** | `user.empresaId` | **D** |
| 28 | `legajo.controller.ts:123` | Usuario | update | **no** | precedido por `:108` | **D — no atómico** |
| 29 | `legajo.controller.ts:145` | DocumentoLegajo | findUnique | no | **valida** `usuario?.empresaId !== user.empresaId` → 404 (`:149`) | **A por call site** |
| 30 | `legajo.cliente.controller.ts:99` | Cliente | findMany | a mano | `user.empresaId` | **D** |
| 31 | `legajo.cliente.controller.ts:123` | Cliente | findFirst | a mano | `user.empresaId` | **D** |
| 32 | `legajo.cliente.controller.ts:135` | Cliente | update | **no** | precedido por `:123` | **D — no atómico** |
| 33-45 | `legajo.service.ts:66,71,78,83,91,100,124,141,151,161,174` | Legajo, DocumentoLegajo | findUnique ×4, create ×3, update ×3, findFirst ×1 | **ninguno** | los controllers pasan `user.id` propio | **D — mitigado por call site** |

`legajo.service.ts` opera **íntegramente por `usuarioId`/`clienteId`/`legajoId` sin ningún chequeo de empresa** `[C]`. `Legajo` y `DocumentoLegajo` no tienen `empresaId` y **no están** en `MODELOS_CON_EMPRESA_ID`, así que incluso con cliente scoped la extensión no los filtraría.

---

# 4. CORRECTLY SCOPED OPERATIONS

**Clasificación A.** 119 operaciones vía `db.*`/`tx.*` sobre modelos de `MODELOS_CON_EMPRESA_ID` (26 modelos).

**Garantías por mecanismo** `[C]`:

| Operación | Garantía | Línea |
|---|---|---|
| `create` | `empresaId` forzado desde el contexto, pisa el body | `:166-171` |
| `createMany` | `empresaId` forzado en cada fila | `:173-177` |
| `findFirst(OrThrow)`, `findMany`, `count`, `aggregate` | `where.empresaId` inyectado | `:179-182` |
| `update`, `updateMany`, `delete`, `deleteMany` | `where.empresaId` inyectado | `:179-182` |
| `findUnique(OrThrow)` | validación post-query → `null` / P2025 | `:184-207` |
| cualquier otra | **Error** | `:209-214` |

**Ejemplos verificados:**

| Sitio | Op | Modelo | Nota |
|---|---|---|---|
| `catalogo.controller.ts:125` | create | Producto | pasa `empresaId: user.empresaId` **a mano** además del forzado — redundante, no incorrecto `[C]` |
| `ventas.service.ts:153-190` | create en tx | Venta + VentaItem | nested registrado; FK `productoId`/`reglaFidelizacionId` verificadas por mecanismo |
| `compras.service.ts:128` | create | Compra + CompraItem | `CompraItem.producto` registrado |
| `tienda.service.ts:267` | create en tx | Pedido + PedidoItem | `PedidoItem` registrado para ambas relaciones |
| `caja.service.ts:69,172,268` | tx | Caja y derivados | 3 transacciones, un tenant cada una |

---

# 5. GLOBAL OPERATIONS

**Clasificación B — global por diseño.** No son defectos.

| Modelo | Por qué es global | Evidencia |
|---|---|---|
| `Empresa` | **es** el tenant | no tiene `empresaId`; `[C]` |
| `Permiso` | catálogo global de permisos, sembrado por `seed.ts:123` | `[C]` |

**Identificadores únicos globales, legítimos por diseño de identidad** `[C]`:

| Campo | Uso | Por qué global |
|---|---|---|
| `Usuario.email` | `auth.service.ts:45`, `invitaciones.service.ts:38` | identidad global de User (alineado con R8-ARCH-001) |
| `Usuario.googleId` | `auth.google.service.ts:36` | identidad de cuenta Google |
| `Cliente.googleId` | `auth.cliente.service.ts:92` | **`@unique` global** — ver §16 ND-03 |
| `Invitacion.token` | `invitaciones.service.ts:94, 212` | secreto de 32 bytes; **es** la credencial |

**Scripts offline** (`prisma/seed.ts`, `prisma/migrate-categoria-a-jerarquia.ts`, `prisma/sync-permisos-owner.ts`): usan `new PrismaClient()` propio, sin extensión. **Correcto y esperado** — el seed debe poder crear datos de dos Empresas, y de hecho lo hace `[C]`. Fuera del plano de request. **No es bypass.**

---

# 6. POTENTIALLY UNSCOPED OPERATIONS

**Clasificación D.** Ninguna produce hoy un cruce verificado; en todas el aislamiento depende de algo distinto del mecanismo.

## D-1 — `legajo.service.ts`: 11 operaciones sin ningún filtro de empresa

| Campo | Valor |
|---|---|
| **Archivo / líneas** | `src/legajo/legajo.service.ts:66, 71, 78, 83, 91, 100, 124, 141, 151, 161, 174` |
| **Símbolos** | `obtenerOCrearDeUsuario`, `obtenerOCrearDeCliente`, `actualizarDatos`, `aprobar`, `subirDocumento`, `rutaAbsolutaDeDocumento` |
| **Modelos** | `Legajo`, `DocumentoLegajo` — **sin `empresaId`, no en `MODELOS_CON_EMPRESA_ID`** |
| **Cliente** | `PrismaService` sin scope |
| **Contexto** | el service recibe `usuarioId`/`clienteId`/`legajoId` y no valida empresa |
| **Mitigación** | los controllers pasan `user.id` del token (`legajo.controller.ts:45,51,67`; `legajo.cliente.controller.ts:55,62,78`). La única ruta con ID arbitrario valida en `legajo.controller.ts:149` |
| **Riesgo** | **MEDIO** — fragilidad: `rutaAbsolutaDeDocumento` es `public` y no valida; su seguridad depende de que todo llamador futuro repita el chequeo. Hoy hay un solo llamador y lo hace |
| **Evidencia** | `[C]` |

## D-2 — `invitaciones.service.ts:118, 227`: `$transaction` por array con cliente sin scope

| Campo | Valor |
|---|---|
| **Archivo / líneas** | `src/invitaciones/invitaciones.service.ts:118-141, 227-250` |
| **Símbolos** | `activar`, `activarCliente` |
| **Modelos** | `Usuario`, `Cliente` — **ambos en `MODELOS_CON_EMPRESA_ID`** |
| **Cliente** | `this.prisma.$transaction([...])` — **sin scope** |
| **`empresaId`** | pasado a mano desde `invitacion.empresaId`, resuelto por el token secreto |
| **Riesgo** | **MEDIO** — es el sitio donde un `create` de modelo cubierto ocurre **fuera** de la garantía de forzado del paso 3. Correcto por construcción; sin red |
| **Evidencia** | `[C]` |

## D-3 — Verificación y mutación en dos queries (no atómico)

| Campo | Valor |
|---|---|
| **Sitios** | `legajo.controller.ts:108` (findFirst scoped a mano) + `:123` (update sin `empresaId`); `legajo.cliente.controller.ts:123` + `:135` |
| **Modelos** | `Usuario`, `Cliente` |
| **Riesgo** | **BAJO** — el patrón es TOCTOU teórico; requeriría que un registro cambie de Empresa entre las dos queries, lo que el schema no permite |
| **Evidencia** | `[C]` |

## D-4 — `invitaciones.controller.ts:39` y `invitaciones.service.ts:43,53,158,165,177`

| Campo | Valor |
|---|---|
| **Cliente** | sin scope; `empresaId` escrito **a mano** en el `where`/`data` |
| **Riesgo** | **BAJO** — correcto, pero el filtro es disciplina del autor, no mecanismo. Un `where` omitido no sería detectado |
| **Evidencia** | `[C]` |

## D-5 — `auth.cliente.service.ts:92`: `findUnique({googleId})` global

| Campo | Valor |
|---|---|
| **Modelo** | `Cliente` — **tiene `empresaId`** y está en la allow-list |
| **Cliente** | sin scope → la validación post-query **no aplica** |
| **Contexto** | pre-autenticación; `Cliente.googleId` es `@unique` global por schema |
| **Riesgo** | **MEDIO** — un Cliente de la Empresa X podría resolverse en un login dirigido a la Empresa Y. El flujo posterior usa `TIENDA_EMPRESA_ID`, mono-tienda hoy |
| **Clasificación** | **C / F — requiere decisión**: ¿`Cliente.googleId` debe ser único por Empresa? |
| **Evidencia** | `[C]` |

---

# 7. UNIQUE LOOKUP AUDIT

`findUnique`, `findUniqueOrThrow`, `upsert`.

## 7.1 Con cliente scoped

**Garantía:** validación post-query (`:184-207`) `[C]`. La query se ejecuta, y si el registro es de otra Empresa se devuelve `null` (o P2025 en `OrThrow`).

**Reserva de diseño verificada:** la condición es `'empresaId' in resultado` (`:195`). Si un `findUnique` usara un `select` de nivel superior que omita `empresaId`, la validación **no se aplicaría**. Verificado: ningún `findUnique`/`findUniqueOrThrow` del código usa `select` de nivel superior `[C]`. Condición latente, sin explotación actual.

**Causa raíz documentada** (`:83-88`): ningún modelo define `@@unique([id, empresaId])`, así que no se puede inyectar `empresaId` en el `where` de `findUnique` sin romper la query.

| Sitio | Modelo | Nota |
|---|---|---|
| `ventas.service.ts:117` | Venta | por `idempotencyKey` — **`@unique` global** (`schema.prisma:663`). La validación post-query lo corta: sin fuga. Efecto residual: una clave de A impide reusarla en B `[C]`. Clasificación **F** |

## 7.2 Con cliente sin scope

| Sitio | Modelo | ¿Requiere contexto? | Clasif. |
|---|---|---|---|
| `auth.service.ts:45` | Usuario (`email`) | **no** — identidad global | **C** |
| `auth.google.service.ts:36,45` | Usuario (`googleId`, `email`) | **no** | **C** |
| `auth.controller.ts:48` | Usuario (`id` propio del token) | no | **C** |
| `auth.cliente.controller.ts:83` | Cliente (`id` propio) | no | **C** |
| `auth.cliente.service.ts:92` | Cliente (`googleId`) | **discutible** — ver D-5 | **C / F** |
| `invitaciones.service.ts:38` | Usuario (`email`) | **no**, pero ver §15 GAP-05 | **C / F** |
| `invitaciones.service.ts:94,212` | Invitacion (`token`) | no — el token **es** la credencial | **C** |
| `legajo.service.ts:66,78,124,174` | Legajo, DocumentoLegajo | **sí conceptualmente**; modelos sin `empresaId` | **D** |
| `legajo.controller.ts:145` | DocumentoLegajo | sí — **validado en el call site** (`:149`) | **A** |

## 7.3 `upsert`

**Cero usos en `src/`** `[C]`. La extensión lo rechaza (`:209-214`). Los 18 `upsert` del repo están en scripts offline. Clasificación **B/C**.

Evidencia de que el fail-closed moldea el código: `tienda.service.ts:221-240` usa `findFirst` + `create`/`update` **en vez de** `upsert`, con comentario que cita el fail-closed como razón `[C]`.

---

# 8. CREATE AUDIT

## 8.1 ¿`empresaId` lo inyecta el servidor?

**Sí, para los 26 modelos cubiertos con cliente scoped** `[C]`: `:166-171` sobrescribe `data.empresaId` con el del contexto. El comentario lo declara explícitamente: *"No confiar en un empresaId que venga del body del request"*.

## 8.2 ¿Puede suministrarlo el cliente?

**No, por tres barreras independientes** `[C]`:

| Barrera | Evidencia |
|---|---|
| Ningún DTO declara `empresaId` ni `businessId` | grep sobre `src/**/dto/*.ts` → **cero** |
| `ValidationPipe` con `whitelist: true` descarta propiedades no declaradas | `main.ts:8` |
| La extensión **sobrescribe** en `create` | `:166-171` |

Ninguna ruta acepta tenant por `@Param`, `@Query`, `@Body` ni `@Headers` → **cero coincidencias** `[C]`.

## 8.3 Creates fuera de la garantía

| Sitio | Modelo | `empresaId` | Clasif. |
|---|---|---|---|
| `auth.google.service.ts:67` | Usuario | `GOOGLE_SIGNUP_EMPRESA_ID` (env) | **C / F** |
| `auth.cliente.service.ts:44,110` | Cliente | `TIENDA_EMPRESA_ID` (env) | **C / F** |
| `invitaciones.service.ts:53,177` | Invitacion | param, a mano | **D** |
| `invitaciones.service.ts:119,228` | Usuario, Cliente | `invitacion.empresaId`, en tx sin scope | **D** |
| `legajo.service.ts:71,83,161` | Legajo, DocumentoLegajo | **ninguno** (modelos sin la columna) | **D** |

## 8.4 ¿Pueden escapar las relaciones anidadas?

**Para las 5 relaciones registradas: no** — se verifican antes de persistir `[C]`.
**Para las no registradas: sí** — ver §11 y §15 GAP-01.

---

# 9. UPDATE AUDIT

## 9.1 Con cliente scoped

`update` y `updateMany` reciben `where.empresaId` inyectado (`:179-182`) `[C]`. El `WHERE` queda correctamente limitado **por mecanismo**.

Además, `update` y `updateMany` pasan por la recolección de referencias relacionales (`recolectarReferenciasRelacionales` maneja ambas, `:204-207`), así que un `update` que intente vincular una relación registrada de otra Empresa también se rechaza. Verificado por la existencia de casos de test: `V-06`, `P-06`, `RI-02` (`b3-tenant-isolation.integration-spec.ts:518, 612, 887`) `[C]`.

## 9.2 Con cliente sin scope

| Sitio | Modelo | `WHERE` limitado | Clasif. |
|---|---|---|---|
| `auth.google.service.ts:51` | Usuario | por `id` ya resuelto pre-contexto | **C** |
| `auth.cliente.service.ts:104` | Cliente | por `id` ya resuelto | **C** |
| `invitaciones.service.ts:135,242` | Invitacion | por `id` ya resuelto (en tx) | **D** |
| `legajo.controller.ts:123` | Usuario | **solo `id`** — precedido por findFirst scoped | **D — no atómico** |
| `legajo.cliente.controller.ts:135` | Cliente | **solo `id`** — idem | **D — no atómico** |
| `legajo.service.ts:91,100,151` | Legajo, DocumentoLegajo | por `id`/`legajoId`, sin empresa | **D** |

---

# 10. DELETE AUDIT

**Hallazgo: no existe ningún `delete` ni `deleteMany` en `apps/api/src`** `[C]` (búsqueda exhaustiva).

La extensión los cubre (`:89-99`) y les inyectaría `where.empresaId`, pero **no hay call site que los use**. El riesgo de borrado cross-Business es hoy **inexistente por ausencia de la operación**, no por el mecanismo.

**Consecuencia para los tests:** un test negativo de delete cross-Business verifica el mecanismo, no un flujo real. Sigue siendo valioso como protección ante un `delete` futuro. Existe el caso `TE-ID-009` (`:251`), que cubre update y delete juntos `[C]`.

---

# 11. NESTED WRITE AUDIT

## 11.1 Payloads anidados reales en el código

| Sitio | Padre | Hijo | FK que acepta del DTO | ¿Registrado? | Clasif. |
|---|---|---|---|---|---|
| `ventas.service.ts:173-184` | Venta | VentaItem | `productoId`, `reglaFidelizacionId` | **SÍ** (ambas) | **A por mecanismo** |
| `tienda.service.ts:267-280` | Pedido | PedidoItem | `productoId`, `reglaFidelizacionId` | **SÍ** (ambas) | **A por mecanismo** |
| `compras.service.ts:128-134` | Compra | CompraItem | `productoId` | **SÍ** | **A por mecanismo** |
| `compras.service.ts:360-367` | DevolucionProveedor | DevolucionProveedorItem | `productoId`, `loteId` | **SÍ** (ambas) | **A por mecanismo** |
| `ventas.service.ts:434` | Venta | ventaItems (include) | — lectura | n/a | **A** |

**Los 4 nested writes de escritura están cubiertos por el registro.** Esto es el cambio más importante respecto de las auditorías previas.

## 11.2 `connect` / `connectOrCreate` / nested update / nested delete

**Cero usos en `src/`** `[C]`. Única coincidencia: un comentario en `catalogo.controller.ts:104` que explica por qué se usa la forma *unchecked* (FK escalar) en lugar de `familia: { connect: ... }`.

El mecanismo **sí** maneja `connect` para relaciones registradas (`referenciasDeConnect`, `:95-112`) y **lanza** para cualquier otra operación anidada sobre una relación registrada (`:104-106`). Existe caso de test: `RI-04` "producto.connect to a Business B product is rejected" (`:427`) y `RI-06` "an unverifiable nested form on the relation fails closed" (`:453`) `[C]`.

## 11.3 El caso `crearDevolucion` — reevaluado

| Campo | Valor |
|---|---|
| **Archivo** | `src/compras/compras.service.ts:343-398` |
| **Símbolo** | `ComprasService.crearDevolucion` |
| **Estado del código** | **sin cambios** respecto de auditorías previas: `item.productoId` e `item.loteId` van del DTO al nested create sin validación en el call site `[C]` |
| **Estado del mecanismo** | **`DevolucionProveedorItem: ['producto', 'lote']` está registrado** (`relation-ownership.ts:25`) |
| **Efecto** | la extensión recolecta ambas referencias del nested `items.create` y las verifica contra la base antes de persistir → P2025 si son de otra Empresa |
| **Docstring** | sigue afirmando *"Valida que el lote (si se especifica) pertenezca al producto"*, lo cual **el método no hace** — lo que valida el mecanismo es la pertenencia al **tenant**, no la relación lote↔producto `[C]`. Divergencia doc↔código subsistente |
| **Test existente** | `b3-devolucion-proveedor-item.integration-spec.ts`, casos D-01..D-07 (355 líneas), incluido D-07 dentro de transacción interactiva `[C]` |
| **Clasificación** | **E — requiere test** (escrito, no ejecutado en esta auditoría) |
| **Riesgo residual** | el `MovimientoStock.create` de `:374` usa el **mismo** `item.productoId` y **no está registrado** → ver §15 GAP-01 |

---

# 12. RAW SQL AUDIT

| # | Sitio | Operación | Modelo | Tenant en el `WHERE` | Clasif. | Riesgo |
|---|---|---|---|---|---|---|
| 1 | `inventario.service.ts:266` | `tx.$executeRaw(Prisma.sql\`UPDATE "Lote" SET ... WHERE "id"=$1 AND "empresaId"=$2 AND "cantidad"+$3 >= 0\`)` | Lote | **SÍ, explícito y parametrizado** | **A por disciplina** | **BAJO** |
| 2 | `health.controller.ts:15` | `this.prisma.$queryRaw\`SELECT 1\`` | ninguno | n/a | **C — infraestructura** | **ninguno** |
| 3 | `prisma/migrate-categoria-a-jerarquia.ts:178, 282` | `$queryRawUnsafe` | Producto | script offline | **C — offline** | fuera del plano de request |

**El raw SQL no pasa por la extensión** — no son operaciones de modelo, el hook `$allOperations` no las intercepta `[C]`. El comentario de `:258-265` lo documenta con precisión y asume la responsabilidad en la query.

**Nota sobre el caso 1:** está dentro de un `tx` scoped, pero el aislamiento lo da la query a mano, no el `tx`. Es una vía manual correcta — **no una garantía del mecanismo**. Si alguien agregara un segundo `$executeRaw` sin `empresaId`, nada lo señalaría. Candidato de test estructural: §14.

---

# 13. EXISTING TEST COVERAGE

**Advertencia de lectura: lo que sigue es inventario de archivos y casos `[C]`. No se ejecutó nada. Ningún caso se declara passing.**

## 13.1 Specs presentes

| Archivo | Líneas | Casos |
|---|---|---|
| `test/integration/b3-tenant-isolation.integration-spec.ts` | 941 | 43 |
| `test/integration/b3-devolucion-proveedor-item.integration-spec.ts` | 355 | 7 (D-01..D-07) |
| `test/integration/b3-producto-familia.integration-spec.ts` | 102 | ~5 |
| `test/integration/tenant-isolation.integration-spec.ts` | 113 | ~4 |
| `src/prisma/relation-ownership.spec.ts` | 164 | unitario del recolector |
| `src/health/health.controller.spec.ts` | — | health |

## 13.2 Cobertura por propiedad

| Propiedad | Caso | Archivo:línea |
|---|---|---|
| Contexto del servidor pisa `empresaId` del cliente (TE-ID-006) | `TE-ID-006` | `b3-tenant-isolation:224` |
| Read cross-Business (TE-ID-008) | `TE-ID-008` | `:240` |
| Update cross-Business (TE-ID-009) | `TE-ID-009` | `:251` |
| Nested relation cross-Business | `TE-B3-001` | `:270` |
| **Scope sobrevive transacción interactiva** | `TE-B3-006` | `:302` |
| **Operación no soportada falla cerrado** | `TE-B3-007` | `:335` |
| VentaItem→Producto (directo, nested, connect, tx, mixto) | `RI-02..RI-08` | `:382-568` |
| PedidoItem→Producto | `P-01..P-07` | `:572-636` |
| PedidoItem→ReglaFidelizacion | `R-01..R-08` | `:640-700` |
| CompraItem→Producto | `C-01..C-06` | `:705-800` |
| VentaItem→ReglaFidelizacion | `V-01..V-08` | `:805-937` |
| DevolucionProveedorItem→Producto/Lote | `D-01..D-07` | `b3-devolucion:221-348` |
| Producto→Familia | — | `b3-producto-familia` |

## 13.3 Infraestructura

| Elemento | Estado |
|---|---|
| `test/jest-e2e.json` | existe; `testRegex: test/.*\.(e2e|integration)-spec\.ts$` `[C]` |
| `package.json:25` | `"test:integration": "jest --config ./test/jest-e2e.json"` `[C]` |
| CI `.github/workflows/b3-tenant-isolation-candidate.yml` | Postgres 15-alpine; corre `b3-tenant-isolation` y `b3-producto-familia` `[C]` |
| CI `.github/workflows/b4-verification.yml` | Postgres 15-alpine; corre `tenant-isolation` `[C]` |
| Fixture | `prisma/seed.ts` crea `empresaAislamiento` con catálogo propio `[C]` |

**Los specs de `b3-devolucion-proveedor-item` NO aparecen en los `paths` de ningún workflow** `[C]` — el workflow lista explícitamente `b3-tenant-isolation` y `b3-producto-familia`. Clasificación: **E** (§14).

---

# 14. MISSING TEST CANDIDATES

Candidatos de verificación. **No se convierten en tareas.**

## 14.1 Prioridad máxima — huecos de mecanismo sin cobertura

| # | Candidato | Invariant/propiedad | Clasif. origen |
|---|---|---|---|
| 1 | `MovimientoStock.create` con `productoId`/`loteId` de otra Empresa → ¿rechazado? | ownership de FK no registrada | **GAP-01** |
| 2 | `Producto.create` con `subfamiliaId`/`tipoId`/`subtipoId` de otra Empresa, **invocado sin `verificarJerarquia`** | ownership de FK no registrada | **GAP-02** |
| 3 | `Pago.create` con `ventaId` de otra Empresa | ownership de FK no registrada | **GAP-03** |
| 4 | `Lote.create` con `productoId`/`presentacionId` de otra Empresa | ownership de FK no registrada | **GAP-04** |
| 5 | `b3-devolucion-proveedor-item` incluido en CI | — | §13.3 |

## 14.2 Prioridad alta — propiedades sin caso

| # | Candidato | Nota |
|---|---|---|
| 6 | Entidad de ownership **derivado** (`AplicacionPago`, `MovimientoCaja`, `CompraItem` directo) leída/modificada desde contexto ajeno | los modelos sin `empresaId` no reciben filtro ni con cliente scoped |
| 7 | `PagoProveedor` / `DevolucionProveedor` r/u/d **sin `getCompra` previo** | tienen `empresaId` y **no están** en `MODELOS_CON_EMPRESA_ID` → GAP-05 |
| 8 | `findUnique` con `select` de nivel superior que omita `empresaId` | condición latente de `:195` |
| 9 | `$executeRaw` estructural: toda query raw sobre modelo scoped incluye el tenant | §12 |
| 10 | Reutilizar un `idempotencyKey` de A en B | efecto de colisión, no de fuga |
| 11 | `Cliente.googleId` de la Empresa X resuelto en login de la Empresa Y | D-5 |
| 12 | `legajo.service.rutaAbsolutaDeDocumento` invocado con `documentoId` ajeno | D-1 |

## 14.3 Estructurales

| # | Candidato |
|---|---|
| 13 | Todo modelo con `empresaId` directo está en `MODELOS_CON_EMPRESA_ID` (hoy 28 vs 26) |
| 14 | Todo modelo que escribe FK hacia un modelo scoped está en `RELACIONES_CON_OWNERSHIP`, o tiene validación documentada en el call site |
| 15 | Ningún `delete`/`deleteMany` se introduce sin test negativo |

## 14.4 Guardarraíl (positivos)

| # | Candidato |
|---|---|
| 16 | **Login, Google y activación por invitación funcionan sin Business Context** — impide que endurecer el aislamiento rompa la autenticación |
| 17 | Flujos legítimos de A (venta, compra, caja, catálogo, tienda) siguen pasando |

---

# 15. POTENTIAL ISOLATION GAPS

## GAP-01 — `MovimientoStock` escribe FK del DTO y no está registrado

| Campo | Valor |
|---|---|
| **Sitios** | `compras.service.ts:228-236` (recepción), **`compras.service.ts:374-384`** (devolución), `inventario.service.ts:238-246`, `inventario.service.ts:337-345` |
| **Símbolos** | `recibirCompra`, `crearDevolucion`, `aplicarAjuste`, `descontarStock` |
| **Modelo** | `MovimientoStock` — **tiene `empresaId`, está en la allow-list**, pero **no** en `RELACIONES_CON_OWNERSHIP` |
| **Operación** | `create` vía `tx` scoped |
| **FK aceptadas** | `productoId`, `loteId` |
| **Origen** | `compras:374` → **`item.productoId` del DTO**; `compras:231` → `item.productoId` del DTO; `inventario:241` → `lote.productoId` (leído scoped, seguro); `inventario:340` → `productoId` param |
| **Contexto** | la extensión fuerza `empresaId` del contexto en el `create`, pero **no valida que las FK pertenezcan a ese tenant** |
| **Riesgo** | **MEDIO-ALTO.** En `crearDevolucion` el mismo `item.productoId` queda **verificado** para `DevolucionProveedorItem` y **sin verificar** para `MovimientoStock`, en la misma transacción. Si la verificación del primero rechaza, la transacción aborta y el segundo no persiste — por lo que hoy el efecto está contenido **por el orden y por la atomicidad**, no por el mecanismo. En `recibirCompra` el `item.productoId` proviene de `CompraItem` ya persistido (que sí se validó al crear la Compra) |
| **Evidencia** | `[C]` |
| **Clasificación** | **D / E** |

## GAP-02 — `Producto` registrado solo para `familia`

| Campo | Valor |
|---|---|
| **Sitio** | `catalogo.controller.ts:108-125` (`createProducto`), `:145-152` (`updateProducto`) |
| **Modelo** | `Producto` — registrado **solo** para `familia` (`relation-ownership.ts:26`) |
| **FK no registradas** | `subfamiliaId`, `tipoId`, `subtipoId` (los tres son modelos **con `empresaId`**, en la allow-list) |
| **Mitigación verificada** | `verificarJerarquia(db, {...})` se invoca **antes** del create (`:95-100`) y del update (`:145-150`), con el cliente **scoped** |
| **Riesgo** | **MEDIO.** La asimetría es llamativa: `familia` se verifica por mecanismo y los otros tres niveles por call site. Un `Producto.create` desde otro call site que no llame a `verificarJerarquia` quedaría sin cobertura para 3 de 4 FK |
| **Evidencia** | `[C]` |
| **Clasificación** | **D / E / F** — ¿por qué solo `familia`? Posible resultado del commit `d0ba8d7` ("enforce Producto Familia relation isolation") como primer paso incremental |

## GAP-03 — `Pago.ventaId` no registrado

| Campo | Valor |
|---|---|
| **Sitios** | `pagos.service.ts:55-62`, `ventas.service.ts:316-323` |
| **FK** | `ventaId`, `usuarioId` |
| **Origen de `ventaId`** | en `pagos.service.ts` es parámetro del método; **verificar si proviene de una lectura scoped previa** — `[ND]` sin leer el flujo completo |
| **Riesgo** | **MEDIO** `[ND]` |
| **Clasificación** | **E / G** |

## GAP-04 — `Lote` y otras FK de inventario no registradas

| Campo | Valor |
|---|---|
| **Sitio** | `compras.service.ts:226` (`tx.lote.create({ data: dataLote })`) |
| **FK** | `productoId`, `presentacionId` |
| **Origen** | `dataLote` construido en el método; `productoId` del `CompraItem` ya validado |
| **Riesgo** | **BAJO-MEDIO** |
| **Clasificación** | **E** |

## GAP-05 — `PagoProveedor` y `DevolucionProveedor` siguen fuera de `MODELOS_CON_EMPRESA_ID`

| Campo | Valor |
|---|---|
| **Evidencia** | `schema.prisma:1061, 1082` tienen `empresaId`; la allow-list (`:39-75`) tiene **26 entradas** y no los incluye `[C]` |
| **Sitios** | `compras.service.ts:271, 298, 327, 353` |
| **Mitigación** | `getCompra(empresaId, compraId)` precede a las 4 operaciones y pasa por la extensión vía `Compra` |
| **Riesgo** | **MEDIO-ALTO estructural** — un `findMany`/`update` futuro sobre ellos no recibe filtro. El cast `as Prisma.…UncheckedCreateInput` suprime el error de tipos que delataría un `empresaId` faltante |
| **Clasificación** | **D / E** |

## GAP-06 — Modelos de ownership derivado sin cobertura

| Campo | Valor |
|---|---|
| **Modelos** | `UsuarioPermiso`, `VentaItem`, `PedidoItem`, `AplicacionPago`, `AperturaCaja`, `MovimientoCaja`, `ArqueoCaja`, `CierreCaja`, `CompraItem`, `DevolucionProveedorItem` (10) |
| **Estado** | sin `empresaId`; **no reciben filtro ni con cliente scoped** (`:157-159` devuelve `query(args)` sin tocar) |
| **Matiz importante** | 5 de ellos **sí** están en `RELACIONES_CON_OWNERSHIP` como **modelos dueños**, lo que verifica las FK que escriben — pero **no** restringe su lectura ni su mutación directa por `id` |
| **Riesgo** | **MEDIO** |
| **Clasificación** | **D / F** |

## GAP-07 — Divergencia documental del mecanismo

| Campo | Valor |
|---|---|
| **Sitios** | `empresa-scope.extension.ts:21` dice *"SOLO cubre los 21 modelos"* — la lista tiene **26** `[C]`. `:22-31` enumera derivados y **omite** `DevolucionProveedorItem`, `PedidoItem`, `UsuarioPermiso`. `:34` dice *"hoy solo VentaItem -> Producto"* — el registro tiene **5 modelos y 8 relaciones** |
| **Riesgo** | **BAJO** operativo, **MEDIO** de mantenimiento: el comentario describe un estado anterior y puede inducir a error sobre qué está cubierto |
| **Clasificación** | **D** |

---

# 16. AMBIGUITIES / ND

| ID | Ambigüedad | Por qué es `[ND]` |
|---|---|---|
| **ND-01** | ¿La extensión sigue activa dentro de `$transaction` interactiva? | Evidencia `[C]` de tipos (3 servicios derivan el tipo del cliente extendido y compilan) y `[D]` (comentario de `tienda.service.ts` sobre `upsert` dentro de `tx`). **Existen casos de test** (`TE-B3-006:302`, `D-07`, `RI-08`, `V-08`, `P-07`, `R-08`, `C-06`). **No se ejecutaron.** Resoluble solo por `[E]` |
| **ND-02** | ¿Pasan los ~90 casos de aislamiento? | No se ejecutó ninguno; no se verificó ningún run de CI |
| **ND-03** | ¿`Cliente.googleId` debe ser único global o por Empresa? | `@unique` global en el schema; el flujo actual es mono-tienda. Requiere **decisión** (F), no inspección |
| **ND-04** | ¿`Pago.ventaId` proviene siempre de una lectura scoped? | Requiere leer el flujo completo de `pagos.controller` → `service`; no auditado línea por línea |
| **ND-05** | ¿Por qué `Producto` registra solo `familia`? | El commit `d0ba8d7` sugiere trabajo incremental. Intención no determinable del código |
| **ND-06** | Comportamiento ante un `empresaId` firmado inexistente | No se ejecutó; el efecto esperado (cero filas, violación de FK en create) es razonamiento |
| **ND-07** | Flujos de `pedidos`, `fidelizacion`, `clientes` completos | No leídos línea por línea; solo sus llamadas a `forEmpresa` y sus FK |

---

# 17. RECOMMENDED VERIFICATION ORDER

Orden de **verificación**, no de corrección. Ninguna entrada es una tarea de implementación.

| # | Verificación | Cierra | Por qué en este orden |
|---|---|---|---|
| 1 | **Ejecutar los 4 specs existentes** y registrar el resultado | **ND-01, ND-02** | Es lo más barato y lo único que puede convertir ~90 casos escritos en evidencia `[T]`/`[E]`. Todo lo demás se interpreta mejor con este resultado en mano |
| 2 | **Incluir `b3-devolucion-proveedor-item` en el workflow** | §13.3 | Hay 7 casos escritos que CI no corre. Verificación de configuración, no de código |
| 3 | **Test estructural: modelos con `empresaId` ⊆ allow-list** | GAP-05, GAP-07 | Habría detectado los 2 modelos faltantes y la divergencia del comentario. Barato y de alto rendimiento |
| 4 | **Test estructural: FK hacia modelo scoped ⊆ registro, o validación documentada en el call site** | GAP-01..GAP-04 | Es el que convierte la cobertura del registro de *opt-in por criterio* a *enumerable y verificable* |
| 5 | **`MovimientoStock` con FK de otra Empresa** | **GAP-01** | El hueco más concreto: misma FK verificada en un modelo y no en el otro, en la misma transacción |
| 6 | **`Producto` con `subfamiliaId`/`tipoId`/`subtipoId` ajenos, sin `verificarJerarquia`** | **GAP-02** | Asimetría de 3 FK sobre 4 en el mismo modelo |
| 7 | **`PagoProveedor`/`DevolucionProveedor` sin `getCompra` previo** | GAP-05 | Confirma si la mitigación por orden de llamadas es la única barrera |
| 8 | **Ownership derivado: lectura/mutación directa por `id`** | GAP-06 | 10 modelos; requiere decisión de estrategia antes de ampliar el test |
| 9 | **Guardarraíl: login / Google / activación sin contexto** | §14.4 | Debe existir **antes** de cualquier endurecimiento de `legajo` o del acceso sin scope |
| 10 | **`$executeRaw` estructural** | §12 | Preventivo; hoy hay un solo uso y es correcto |

**Observación sobre el paso 1:** es el único que puede cambiar materialmente la lectura de este informe. Si los ~90 casos pasan, cinco propiedades que hoy son `[C]`-por-lectura pasan a `[T]`, y ND-01 — la única incógnita de mecanismo relevante — se cierra. Si alguno falla, el hallazgo es más valioso todavía.

---

# 18. EVIDENCE INDEX

Rutas relativas a `apps/api/` salvo indicación. Branch `chore/build-in-ci`, commit `d0ba8d7`.

## `[C]` — arquitectura de clientes

| Hecho | Ubicación |
|---|---|
| `PrismaService extends PrismaClient`, sin extensión | `src/prisma/prisma.service.ts:1-15` |
| `PrismaModule` exporta **ambos** clientes | `src/prisma/prisma.module.ts:1-9` |
| Fábrica `forEmpresa`; fundamento de no usar `Scope.REQUEST` | `src/prisma/empresa-scoped-prisma.service.ts:5-41` |
| **Solo 2 `$extends` en el repo** | `empresa-scoped-prisma.service.ts:39`; `empresa-scope.extension.ts:147` |
| Allow-list de **26** modelos | `src/prisma/empresa-scope.extension.ts:39-75` |
| 9 operaciones con `where` inyectado | `:89-99` |
| `create` fuerza `empresaId` pisando el body | `:166-171` |
| `createMany` fuerza en cada fila | `:173-177` |
| `findUnique` validación post-query; depende de `'empresaId' in resultado` | `:184-207`, cond. en `:195` |
| **Fail-closed** de toda operación no enumerada | `:209-214` |
| Verificación de ownership relacional antes de persistir; P2025 | `:115-137`, invocada en `:152-155` |
| Exige que el destino tenga `empresaId` directo | `:121-124` |
| Registro de ownership: **5 modelos, 8 relaciones** | `src/prisma/relation-ownership.ts:21-27` |
| Solo admite `connect` en relación registrada; lanza si no | `:102-107` |
| Lanza si la relación no tiene FK simple | `:61-70` |
| Recorre `create`/`update`/`updateMany`/`createMany`/`upsert` | `:194-227` |
| Relaciones no registradas: desciende sin recolectar del padre | `:119-154` |
| Tipos de `tx` derivados del cliente **extendido** | `compras.service.ts:16`; `inventario.service.ts:12`; `tienda.service.ts:13` |

## `[C]` — inventario de operaciones

| Hecho | Método |
|---|---|
| **119** ops con cliente scoped en 14 archivos | grep `(db|tx).<model>.<op>(` |
| **45** ops con cliente sin scope en 8 archivos | grep `this.prisma.<model>.<op>` |
| **11** `$transaction` (9 interactivas + 2 por array sin scope) | grep `$transaction` |
| **0** `delete`/`deleteMany` en `src/` | grep exhaustivo |
| **0** `upsert`/`groupBy` en `src/`; 18 en scripts offline | grep exhaustivo |
| **0** `connect`/`connectOrCreate`/nested update/delete en `src/` | grep exhaustivo |
| **0** `empresaId`/`businessId` en DTOs, `@Param`, `@Query`, `@Headers` | grep exhaustivo |
| `whitelist: true` | `src/main.ts:8` |
| `$executeRaw` con tenant explícito y parametrizado | `src/inventario/inventario.service.ts:252-272` |
| `$queryRaw` de health, sin modelo | `src/health/health.controller.ts:15` |
| 4 nested writes de escritura, los 4 con modelo registrado | `ventas:173`, `tienda:267`, `compras:128`, `compras:360` |
| `crearDevolucion` sin cambios; docstring divergente | `src/compras/compras.service.ts:323-398` |
| `MovimientoStock.create` con FK del DTO, 4 sitios | `compras:228, 374`; `inventario:238, 337` |
| `verificarJerarquia` con cliente scoped antes de create/update | `src/catalogo/catalogo.controller.ts:95-100, 145-150` |
| `legajo.service` opera sin filtro de empresa, 11 ops | `src/legajo/legajo.service.ts:66-174` |
| Única ruta de legajo con ID arbitrario **valida** empresa | `src/legajo/legajo.controller.ts:145-152` |
| `$transaction` por array con cliente sin scope | `src/invitaciones/invitaciones.service.ts:118, 227` |
| `Venta.idempotencyKey` `@unique` global, consultado scoped | `prisma/schema.prisma:663`; `src/ventas/ventas.service.ts:113-120` |
| `PagoProveedor`/`DevolucionProveedor` con `empresaId`, fuera de la allow-list | `prisma/schema.prisma:1061, 1082` |

## `[C]` — tests e infraestructura (**archivos y casos; no ejecutados**)

| Hecho | Ubicación |
|---|---|
| 4 specs de integración, 1.511 líneas | `test/integration/` |
| 43 casos en el spec principal | `test/integration/b3-tenant-isolation.integration-spec.ts` |
| 7 casos D-01..D-07, incluido tx | `test/integration/b3-devolucion-proveedor-item.integration-spec.ts:221-348` |
| Caso de scope en tx interactiva | `b3-tenant-isolation…:302` |
| Caso de fail-closed de operación no soportada | `:335` |
| Spec unitario del recolector | `src/prisma/relation-ownership.spec.ts` |
| Config de integración | `test/jest-e2e.json`; `package.json:25` |
| CI con Postgres 15 | `.github/workflows/b3-tenant-isolation-candidate.yml`, `b4-verification.yml` |
| **`b3-devolucion` no está en los `paths` de ningún workflow** | ídem |
| Fixture multi-tenant | `prisma/seed.ts` (`empresaAislamiento`) |

## `[D]` — documentación consultada

`docs/WAPSELL-DOCUMENTATION/03-DECISIONS/28-R8-ARCH-002-OWNER-DECISION-TENANT-ISOLATION-2026-10-03.md` (§3 las 12 propiedades, §5 ADAPTED, §7 invariante de seguridad) · `07-DESIGN/CONTRACTS/DOMAIN/09-R8-ARCH-002-TENANT-ISOLATION-CONTRACT-v0.1.md` · `13-AUDIT/23-BLOCK-3-TENANT-ISOLATION-ASIS-AUDIT-2026-10-04.md` · `13-AUDIT/25-B3-TENANT-ISOLATION-INVARIANTS-INDEPENDENT-AUDIT-2026-10-04.md` · `13-AUDIT/26-B3-TESTS-EVALS-AND-READINESS-2026-10-04.md`.

## Clases no emitidas

**`[T]` — ninguna.** Existen specs; no se ejecutaron en esta auditoría.
**`[E]` — ninguna.** No se ejecutó API, migraciones, build, lint ni test. No se verificó ningún run de CI.

---

**No se modificó nada. No se corrigió nada. No se declaró ningún Gate cerrado. No se declaró B3 VERIFIED. Ningún finding se convirtió en tarea.**
