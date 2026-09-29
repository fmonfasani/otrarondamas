# Wapsell — Auditoría de evidencia de código: D-010 y D-014

**Status:** `DERIVED / AUDIT`
**Version:** 0.1
**Date:** 2026-09-28
**Nature:** artefacto de auditoría read-only. **NO normativo.**

---

## 0. Aviso de alcance y límites de este artefacto

> Este documento **no es** una SPEC, ni una decisión, ni un requisito, ni un invariante
> aprobado. Es el registro de lo observado al leer código el 2026-09-28.
>
> **Durante su producción NO se modificó:** código, `schema.prisma`, base de datos,
> migrations, tests, configuración, `04-DECISIONS/00-DECISION-REGISTER.md`,
> `03-CONFLICTS/00-CONFLICT-REGISTER.md`, capa AS-IS, capa TO-BE ni SPECs canónicas.
> No hubo commits, migraciones ni deploy.
>
> **Nada de lo que sigue está propagado.** Cada hallazgo de este documento requiere
> revisión del Owner antes de moverse a cualquier artefacto canónico.
>
> **Toda la sección 12 (recomendaciones) es `PROPOSED / OPEN`.** Ninguna corrección de
> código está aprobada, especificada ni comprometida por este documento.
>
> Los identificadores `AUD-*` son **locales a esta auditoría**. No son IDs de governance
> (`REQ-`, `DEC-`, `CON-`, `INV-`, `TEST-`) y no crean ni reemplazan ninguno.

---

## 1. Clasificación de las dos decisiones

Este es el resultado central de la auditoría. Se lee antes que cualquier detalle.

| Decisión | Estado del requisito | Estado de la implementación |
|---|---|---|
| **D-010** — Integridad transaccional del stock | `APPROVED REQUIREMENT` (Owner, 2026-09-28; v1.0 prevalece) | **`IMPLEMENTATION NON-COMPLIANT / GAP`** |
| **D-014** — Inventario exclusivo por Business | `APPROVED REQUIREMENT` (Owner, 2026-09-28; v1.0 prevalece) | **`VERIFIED BY CODE` — la implementación actual NO provee transferencia de stock inter-Business** |

### 1.1 D-010 — declaration explícita

**D-010 NO se declara implementada.** El requisito está aprobado; la implementación
existente es parcial y presenta brechas verificadas por lectura de código:

- Los controles de concurrencia existen **solo** en el camino de ajuste manual.
- El camino de venta —el de mayor volumen— **no** tiene guarda de concurrencia.
- La devolución a proveedor decrementa existencias **sin** verificar cantidad.
- **No existe** ninguna defensa a nivel de base de datos.
- **No existe** ningún test en el repositorio.

La clasificación `IMPLEMENTATION NON-COMPLIANT / GAP` describe el estado del código
respecto del texto aprobado de D-010. No es un juicio sobre la calidad del diseño, que
en varias dimensiones es thoughtfully designed (sección 4).

### 1.2 D-014 — declaration explícita

D-014 se declara `VERIFIED BY CODE` **en su volet de prohibición**: la implementación
actual no provee transferencia de stock inter-Business. La prohibición se cumple hoy
**por ausencia del feature**, no por un control explícito que lo haga cumplir.

El aislamiento por Business, en cambio, **sí** está verificado y es sólido (secciones 6
y 7). D-014 tiene, por tanto, dos dimensiones con resultados distintos y no deben
confundirse.

---

## 2. Repositorio inspeccionado

| Campo | Valor |
|---|---|
| Ruta | `D:\Software Development\Porfolio\OtraRondaMas` |
| Nombre del paquete | `@otrarondamas/otrarondamas` |
| Versión | `1.0.0` |
| Tipo | Monorepo npm workspaces (`apps/*`, `packages/*`) |
| Remoto | `https://github.com/fmonfasani/otrarondamas.git` |
| Rama | `deploy/otrarondamas-wapsell-com` |
| HEAD | `066bb91` |
| Workspace state | 36 entradas en `git status --porcelain` (preexistentes; no tocadas) |
| Stack API | NestJS + Prisma + PostgreSQL |
| Apps | `api`, `pos-admin`, `tienda-online` |
| `schema.prisma` | 1126 líneas · 46 modelos · 17 migrations |

**Nota de ubicación:** el árbol documental vive **dentro** de este mismo repositorio, en
`docs/WAPSELL-DOCUMENTATION/`. El repositorio auditado y la documentación son el mismo
árbol de trabajo.

**Candidato descartado:** `D:\Software Development\Porfolio\wapsell` (`wapsell` v0.1.0)
contiene un `package.json` pero **ningún** `schema.prisma`; no es el repositorio de la
aplicación auditada.

---

## 3. Archivos inspeccionados

### 3.1 Esquema y migraciones

| Archivo | Alcance leído |
|---|---|
| `apps/api/prisma/schema.prisma` | L370-432 `Producto`; L449-465 `Lote`; L975-1000 `MovimientoStock`; L663 `Venta.idempotencyKey`; bloque de uniques e índices L640-1000 |
| `apps/api/prisma/migrations/**` (17 carpetas) | Búsqueda exhaustiva de `CHECK`, `TRIGGER`, `cantidad >=` |

### 3.2 Módulo Inventario

| Archivo | Alcance leído |
|---|---|
| `apps/api/src/inventario/inventario.service.ts` | Completo (356 L) — `stockConsolidado`, `alertas`, `registrarAjuste`, `aplicarAjusteAtomico`, `descontarStock` |
| `apps/api/src/inventario/inventario.controller.ts` | Completo (103 L) — superficie HTTP |
| `apps/api/src/inventario/dto/registrar-ajuste.dto.ts` | Completo (34 L) |
| `apps/api/src/inventario/inventario.module.ts` | Completo (13 L) |

### 3.3 Aislamiento

| Archivo | Alcance leído |
|---|---|
| `apps/api/src/prisma/empresa-scope.extension.ts` | Completo (172 L) |
| `apps/api/src/prisma/empresa-scoped-prisma.service.ts` | Completo (39 L) |
| `apps/api/src/prisma/prisma.service.ts` | Completo (13 L) |
| `apps/api/src/auth/decorators/current-user.decorator.ts` | Completo |
| `apps/api/src/auth/guards/jwt-auth.guard.ts` | Lectura de integración |
| `apps/api/src/app.module.ts` | Registro de guards globales |

### 3.4 Callers de stock

| Archivo | Alcance leído |
|---|---|
| `apps/api/src/ventas/ventas.service.ts` | L134-229 (transacción de venta); L470-506 (búsqueda POS) |
| `apps/api/src/pedidos/pedidos.service.ts` | L90-105 (segundo caller de `descontarStock`) |
| `apps/api/src/compras/compras.service.ts` | L163-249 (recepción); L350-397 (devolución a proveedor) |
| `apps/api/src/tienda/tienda.service.ts` | Lectura de integración |
| `apps/api/src/caja/caja.service.ts` | Lectura de integración |
| `apps/api/src/fidelizacion/fidelizacion.service.ts` | Lectura de integración |

### 3.5 DTOs de cantidad

`create-venta-item.dto.ts` · `crear-pedido-item.dto.ts` · `recibir-compra-item.dto.ts` ·
`crear-devolucion-proveedor.dto.ts` · `crear-pago-proveedor.dto.ts`

### 3.6 Búsquedas transversales

- Escritores de `Lote.cantidad` y `movimientoStock` en todo `apps/api/src`
- Ocurrencias de `transfer` / `transferencia`
- Uso del `PrismaService` **sin scope** vs `EmpresaScopedPrismaService`
- Operaciones sobre `lote` / `movimientoStock` / `producto`
- `$queryRaw` / `$executeRaw` en todo el API
- `isolationLevel` / `SERIALIZABLE` en todo el API
- Archivos `*.spec.ts` / `*.test.ts` / `*e2e-spec*` en todo el repositorio
- Scripts `test` y devDependencies de test por app

---

## 4. D-010 — requisito aprobado

> **D-010, v1.0 (Owner, 2026-09-28; prevalece sobre v1.1).** Wapsell debe garantizar
> integridad transaccional del stock mediante controles de base de datos y/o
> transacción. Las operaciones de movimiento deben ser atómicas, concurrentemente
> seguras, resistentes a cantidades inválidas y consistentes entre movimientos y
> existencias resultantes. **Los controles de integridad existentes deberán verificarse y
> mantenerse** como requisito obligatorio del dominio de Inventario.

Característica vinculante, exigida explícitamente por el texto aprobado y con
consecuencia directa sobre esta auditoría: **"concurrentemente seguras"**. Es
precisamente la propiedad que falla en el camino de venta (brecha `AUD-D010-G01`).

También queda affirmed, por el ruling del Owner, que **no existe** la excepción que
v1.1 había=["dejado abierta": las cantidades inválidas se rechazan **siempre**, sin
mecanismo de autorización por Business.

Fuente: `04-DECISIONS/00-DECISION-REGISTER.md` §4.3.1 · texto en
`WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md:183-194`.

---

## 5. D-010 — controles verificados por código

Todos los hallazgos de esta sección son **`VERIFIED BY CODE`**.

### AUD-D010-C01 — UPDATE condicional atómico para ajustes manuales

`apps/api/src/inventario/inventario.service.ts:266-270`

```sql
UPDATE "Lote"
SET "cantidad" = "cantidad" + $1, "updatedAt" = now()
WHERE "id" = $2 AND "empresaId" = $3 AND "cantidad" + $1 >= 0
```

Verificado:

- La condición se evalúa **en la base de datos**, contra el valor en ese instante.
- El `empresaId` está explícito en el `WHERE` porque el SQL crudo **no** pasa por
  `empresaScopeExtension` (correctamente documentado en el propio código).
- Es la **única** guarda de no-negatividad de `Lote.cantidad` en todo el repositorio.
- Resuelve simultáneamente el riesgo de negativo y el de lost update.

### AUD-D010-C02 — Ajuste atómico: movimiento y balance en la misma transacción

`apps/api/src/inventario/inventario.service.ts:225-249`

- `db.$transaction` envuelve el UPDATE del lote (L226) y el `movimientoStock.create`
  (L238-248).
- Si el UPDATE condicional afecta 0 filas, se aborta con `BadRequestException` (L233-235).
- No hay caminho en este método donde el balance cambie sin su movimiento explicativo.

### AUD-D010-C03 — Validación de cantidad en el borde (DTO)

| DTO | Regla | Efecto |
|---|---|---|
| `RegistrarAjusteDto.cantidad` (L22-24) | `@IsInt() @NotEquals(0)` | Entero; cero rechazado |
| `VentaItem.cantidad` (L8-10) | `@IsNumber() @IsPositive()` | Negativo y cero rechazados |
| `PedidoItem.cantidad` (L8-10) | `@IsNumber() @IsPositive()` | Ídem |
| `RecibirCompraItem.cantidadRecibida` (L15-17) | `@IsNumber() @IsPositive()` | Ídem |
| `CrearDevolucionProveedorItem.cantidad` (L22-24) | `@IsNumber() @Min(1)` | Ídem |

Verificado: ninguna cantidad de stock **negativa** ni **cero** puede entrar por HTTP.

### AUD-D010-C04 — Atomicidad de la venta

`apps/api/src/ventas/ventas.service.ts:153-228`

- `db.$transaction` (L153) envuelve `venta.create` (L163), `auditLog.create` (L190),
  el bucle de `descontarStock` (L207-221) y por extensión todos los updates de
  `Lote.cantidad` y `movimientoStock.create` correspondientes.
- `descontarStock` recibe `tx`, no un cliente nuevo (L209-217). Confirmado en el segundo
  caller: `pedidos.service.ts:98-99`.
- Verificado: una venta no puede quedar con stock descontado sin su `Venta`, ni
  viceversa. **La atomicidad de la transacción es correcta.**

### AUD-D010-C05 — Stock insuficiente: rechazo duro, sin excepción

`apps/api/src/inventario/inventario.service.ts:315-319`

`stockTotal < cantidadRequerida` lanza `BadRequestException`. Coincide exactamente con
el ruling del Owner: sin mecanismo de excepción ni autorización por Business.

### AUD-D010-C06 — Marca de lote vencido capturada en el momento del movimiento

`apps/api/prisma/schema.prisma:991-997` · `inventario.service.ts:347`

`loteVencidoAlMomento` se calcula una sola vez al emitir el movimiento y no se rederiva
después. Correcto para auditoría: el paso del tiempo no reescribe la historia.

---

## 6. D-010 — brechas verificadas por código

Todos los hallazgos de esta sección son **`VERIFIED BY CODE`**. Cada uno cita la
condición exacta que lo produce.

### AUD-D010-G01 — Oversell concurrente en `descontarStock` · CRÍTICO

`apps/api/src/inventario/inventario.service.ts:300-355`

Secuencia verificada:

| Línea | Operación | Problema |
|---|---|---|
| L309-312 | `tx.lote.findMany({ where: { empresaId, productoId, cantidad: { gt: 0 } } })` | Lee el estado actual |
| L314-319 | `if (stockTotal < cantidadRequerida) throw` | **Decide en memoria de la aplicación**, sobre la lectura anterior |
| L326 | `cantidadDeEsteLote = Math.min(restante, Number(lote.cantidad))` | **Cantidad derivada de una lectura potencialmente vieja** |
| L332-335 | `tx.lote.update({ where: { id }, data: { cantidad: { decrement } } })` | **Decremento incondicional**: sin guarda `gte`, sin condición de versión |

Consecuencia verificada: con nivel de aislamiento `READ COMMITTED` (ver
`AUD-D010-G04`), dos ventas concurrentes sobre un lote con `cantidad = 10`, cada una
necesitando 10 unidades, **ambas** leen 10, **ambas** pasan el chequeo, y **ambas**
ejecutan `decrement: 10` → `Lote.cantidad = -10`.

Punto central: el patrón correcto **ya existe** en el mismo archivo
(`aplicarAjusteAtomico`, C01) y fue aplicado a los ajustes manuales pero **no** al camino
de venta, que es el de mayor volumen y el que maneja dinero.

El comentario del propio código en L277-280 afirma que correr dentro de la transacción
del caller deja *"la concurrencia protegida por la misma atomicidad"*. Eso es
**incorrecto**: la atomicidad de transacción evita escrituras parciales, no lost updates.
Ver `AUD-X02` en la sección 9.

### AUD-D010-G02 — Devolución a proveedor sin guarda de cantidad · CRÍTICO

`apps/api/src/compras/compras.service.ts:388-393`

```ts
if (item.loteId) {
  await tx.lote.update({
    where: { id: item.loteId },
    data: { cantidad: { decrement: item.cantidad } },
  });
}
```

Verificado:

- No hay `gte` en el `where`, ni consulta previa de existencia, ni validación de que el
  lote tenga esa cantidad.
- El DTO solo garantiza `cantidad >= 1` (`crear-devolucion-proveedor.dto.ts:22-24`).
- **No requiere concurrencia**: una sola request que devuelva más de lo que el lote
  contiene produce `Lote.cantidad` negativo de inmediato.

Es la brecha de mayor severidad porque es el camino más corto a stock negativo, y el
más improbable que se detecte en operación normal.

### AUD-D010-G03 — Ledger sin movimiento de balance cuando falta `loteId`

`apps/api/src/compras/compras.service.ts:372-394` + `crear-devolucion-proveedor.dto.ts:18-20`

Verificado:

- `loteId` es **`@IsOptional()`** (DTO L18-20).
- El `movimientoStock.create` con `tipoMovimiento: 'Salida'` (L374-385) se ejecuta
  **siempre**, dentro del bucle, **fuera** del `if (item.loteId)`.
- Si `loteId` viene vacío: se registra una Salida en el ledger y **`Lote.cantidad` nunca
  se modifica**.

Consecuencia: el ledger afirma que salió stock de un lote del cual nunca salió. El
movimiento y la existencia quedan inconsistentes entre sí, que es exactamente la
propiedad que D-010 exige ("consistentes entre movimientos y existencias resultantes").

### AUD-D010-G04 — Ausencia de constraints de base de datos · CRÍTICO

Búsqueda exhaustiva sobre las **17** migraciones y el schema:

| Control | Resultado |
|---|---|
| `CHECK` constraints | **0** |
| `TRIGGERS` | **0** |
| `CHECK (cantidad >= 0)` sobre `Lote` | **0** |
| `@db.Decimal` en `Lote.cantidad` | Ausente (`schema.prisma:457`) |
| `@db.Decimal` en `MovimientoStock.cantidad` | Ausente (`schema.prisma:984`) |
| `@@index` sobre `MovimientoStock` | Ninguno |

Verificado: **no existe ninguna defensa bajo la capa de aplicación.** Un stock negativo
producido por G01, G02 o G03 queda persistido sin objeción de la base de datos. El
requisito aprobado por D-010 —"controles de base de datos **y/o** transacción"— tiene,
en la práctica, solo la mitad transaccional.

### AUD-D010-G05 — Aislamiento de transactions en `READ COMMITTED` por defecto

Búsqueda de `isolationLevel`, `SERIALIZABLE`, `SerializableTransaction` en
`apps/api/src`: **0 coincidencias**.

Consecuencia: todas las transacciones del API corren al nivel por defecto de PostgreSQL,
`READ COMMITTED`. Esto es la condición que hace explotable `AUD-D010-G01`, y también
`AUD-D010-G06` y `AUD-D010-G07`.

### AUD-D010-G06 — Race de sobre-recepción en compras

`apps/api/src/compras/compras.service.ts:185-245`

Verificado:

- El chequeo `cantidadRecibida > pendiente` (L199-203) usa el objeto `compra` leído en
  L185, **fuera** de la transacción.
- La transacción se abre en L207, **después** del chequeo.
- El `cantidadRecibida: { increment }` ocurre dentro, en L242-245.

Consecuencia: dos recepciones concurrentes pueden pasar ambas el chequeo y acumular
`cantidadRecibida > cantidadPedida`, que el comentario L163-166 del propio código
declara que no debe ocurrir.

### AUD-D010-G07 — Numeración de venta sin garantía de unicidad

`apps/api/src/ventas/ventas.service.ts:154-161`

Verificado:

- `SELECT MAX(numero) + 1` (L157-161) sin `isolationLevel` explícito.
- `Venta.numero` **no tiene** constraint `@@unique`. El único unique de `Venta` es
  `idempotencyKey` (`schema.prisma:663`).
- Sin unique que fuerce conflicto, nada detecta dos asignaciones concurrentes del mismo
  número.

Consecuencia: dos ventas concurrentes pueden recibir el mismo `numero`. Afecta
trazabilidad fiscal y numeración de comprobantes.

### AUD-D010-G08 — Ausencia total de tests

| Verificación | Resultado |
|---|---|
| `*.spec.ts` / `*.test.ts` / `*e2e-spec*` en el repo (excluyendo `node_modules` y `dist`) | **0 archivos** |
| `apps/api` script `test` | `jest` (configurado) |
| `apps/api` devDependencies | `jest ^29.5.2`, `supertest ^6.3.3` (instalados) |
| `apps/pos-admin` script `test` | vacío |
| `apps/tienda-online` script `test` | vacío |

Consecuencias:

1. Ningún control bueno (C01-C06) está protegido contra regresión.
2. Ninguna brecha es demostrable por ejecución.
3. La configuración de test existe pero está sin usar.

### AUD-D010-G09 — `tipoMovimiento` es texto libre, no enum

`apps/api/prisma/schema.prisma:983`

El comentario documenta `"Entrada, Salida, Ajuste"`, pero el campo es `String` sin
restricción. Verificado además que **`Ajuste` nunca se escribe**: los ajustes manuales
emiten `Entrada` o `Salida` según el signo (`inventario.service.ts:243`).

Consecuencia: un movimiento queda sin clasificar si hay una errata, y el conjunto real
de valores no está acotado por el esquema.

### AUD-D010-G10 — Consolidación de stock siempre en memoria

`inventario.service.ts:97-101` y `157-161` · `ventas.service.ts:489, 505`

`Producto` **no tiene** columna de stock: la cantidad real vive en `Lote.cantidad`
(`schema.prisma:457`) y `stockMinimo` (L415) es solo umbral de alerta. Todo lector
debe sumar lotes por su cuenta.

Está deliberadamente documentado (L32-47: `groupBy` no está soportado por
`empresaScopeExtension` y se prefiere no ampliar el archivo compartido). Se registra
como **hallazgo de diseño consciente**, no como defecto. Su consecuencia relevante para
D-010: cada consulta de stock es una lectura no atómica de la misma clase que
contribuye a G01, y no hay un único punto donde "el stock" sea un hecho único.

---

## 7. D-014 — aislamiento verificado por código

Todos los hallazgos son **`VERIFIED BY CODE`**. Esta es la parte más sólida del
repositorio auditado.

### AUD-D014-C01 — Extensión de cliente instanciada por request

`apps/api/src/prisma/empresa-scope.extension.ts:102-171`

El aislamiento no es un middleware que confía en que cada service recuerde filtrar: es
una Prisma Client Extension creada por request con el `empresaId` de la sesión. El
propio código documenta por qué se eligió extensión y no Row-Level Security (L10-18):
RLS con pool de conexiones no garantiza `SET app.current_empresa_id` por query.

### AUD-D014-C02 — `empresaId` forzado en escrituras, ignorando el body

`empresa-scope.extension.ts:118-129`

`create` y `createMany` sobrescriben cualquier `empresaId` entrante con el de la sesión.
**Un cliente no puede declarar en qué Business escribe.**

### AUD-D014-C03 — Filtro inyectado en lecturas y mutaciones

`empresa-scope.extension.ts:82-92, 131-134`

`findFirst`, `findFirstOrThrow`, `findMany`, `update`, `updateMany`, `delete`,
`deleteMany`, `count`, `aggregate` reciben `empresaId` inyectado en `where`.

### AUD-D014-C04 — `findUnique` post-filtrado: lectura cross-tenant devuelve "no encontrado"

`empresa-scope.extension.ts:136-159`

`findUnique` no admite `empresaId` en `where` sin un compound unique (razonamiento
documentado en L76-81). En vez de filtrar, la extensión ejecuta la query y **verifica
después**: si la fila pertenece a otra empresa, devuelve `null`, o lanza `P2025` para
`findUniqueOrThrow`.

**El dato de otra empresa nunca se devuelve, ni por accidente.**

### AUD-D014-C05 — Fail-closed

`empresa-scope.extension.ts:161-166`

`upsert` y toda operación no contemplada explícitamente **lanza una excepción** en vez
de pasar sin scope. Un descuido futuro produce un error ruidoso, no una fuga silenciosa.

### AUD-D014-C06 — Los tres modelos de stock están cubiertos

`empresa-scope.extension.ts:38, 45, 56`

`Producto` (L38), `Lote` (L45) y `MovimientoStock` (L56) están en
`MODELOS_CON_EMPRESA_ID`. El dominio Inventario tiene cobertura directa y completa: no
depende de herencia por relación.

### AUD-D014-C07 — Origen del `empresaId` exclusivamente en el JWT

`current-user.decorator.ts` · `inventario.controller.ts:43-54` · `app.module.ts:51-52`

`empresaId` proviene siempre de `request.user` vía `@CurrentUser()`. Nunca de body,
query ni params. `JwtAuthGuard` y `PermissionsGuard` están registrados como
`APP_GUARD` global.

### AUD-D014-C08 — El único SQL crudo incluye `empresaId` explícito

Búsqueda de `$queryRaw` / `$executeRaw` en `apps/api/src`: **1 ocurrencia**, en
`inventario.service.ts:266-270`. Su `WHERE` incluye `"empresaId" = $3`, y el comentario
(L261-265) reconoce correctamente que el SQL crudo no atraviesa la extensión.

### AUD-D014-C09 — SKU y lote únicos por Business

`schema.prisma:431` · `schema.prisma:464`

- `Producto`: `@@unique([empresaId, codigoInterno])`. El comentario L375-381 documenta
  que esto **corrige** un `@unique` global previo que era un bug conocido.
- `Lote`: `@@unique([productoId, numeroLote, empresaId])`.

El identificador de producto no colisiona entre Business.

### AUD-D014-C10 — Superficie HTTP de inventario sin parameterización por empresa

`inventario.controller.ts:43, 58, 74, 95, 105`

Los cinco endpoints (`stock`, `productos/:id/lotes`, `productos/:id/movimientos`,
`ajustes`, `alertas`) toman el Business del usuario autenticado. No existe ningún
parámetro de request que permita elegir el Business objetivo.

---

## 8. D-014 — ausencia de transferencias inter-Business

### AUD-D014-N01 — No existe ninguna capacidad de transferencia de stock · VERIFIED BY CODE

Búsqueda de `transfer` / `transferencia` en `apps/api/src`: **8 ocurrencias, todas
`medioPago`**.

| Ubicación | Contexto |
|---|---|
| `compras/dto/crear-pago-proveedor.dto.ts:10` | `medioPago: string; // Transferencia, Efectivo, Cheque` |
| `pagos/pagos.service.ts:7, 16, 51` | Medio de pago manual (efectivo/transferencia/QR) |
| `pagos/dto/create-pago.dto.ts:3, 8` | `MEDIOS_MANUALES = ['efectivo','transferencia','QR']` |
| `ventas/dto/crear-pago-venta.dto.ts:3, 20` | Medio de pago de una venta |

**Ninguna** es una transferencia de mercadería. Verificado además que:

- No existe entidad, modelo ni enum de transferencia de stock.
- No existe endpoint, service, command, job ni cron que mueva stock entre Business.
- No hay ningún segundo `empresaId` en el dominio de Inventario por el que un stock
  pudiera cambiar de proprietor.

**Resultado: la prohibición aprobada por D-014 no es contradicha por ningún código
auditado.**

### AUD-D014-N02 — Cumplimiento por ausencia, no por control

Calificación honesta de N01: la prohibición se cumple porque **el feature no existe**,
no porque exista un control que lo haga cumplir. Si mañana se implementa una
transferencia, nada en el código actual la impediría salvo que se respete el scope por
`empresaId` ya existente.

Este matiz importa para el §12: la prohibición no necesita un fix hoy, pero sí necesita
quedar registrada como invariante verificable para el día en que el feature se implemente.

### AUD-D014-N03 — Modelos que heredan scope por relación, fuera de la extensión

`empresa-scope.extension.ts:20-30`

Fuera de cobertura: `VentaItem`→`Venta`, `AplicacionPago`→`Pago`,
`AperturaCaja`/`MovimientoCaja`/`ArqueoCaja`/`CierreCaja`→`Caja`, `CompraItem`→`Compra`,
`Legajo`/`DocumentoLegajo`.

Está documentado honestamente en el código como *"una limitación real, no un TODO
decorativo"*. Su aislamiento depende de que el código consulte siempre a través del
padre ya filtrado.

**No afecta a Inventario:** `Lote` y `MovimientoStock` tienen `empresaId` directo y están
cubiertos.

### AUD-D014-G01 — `empresaId` desnormalizado sin consistencia garantizada a nivel DB

`schema.prisma:449-465` (`Lote`) y `975-1000` (`MovimientoStock`)

Verificado:

- `Lote` lleva **dos** claves redundantes: `empresaId` y `productoId`. Nada —ni FK, ni
  `CHECK`, ni trigger— exige `Lote.empresaId == Producto.empresaId`.
- `MovimientoStock` lleva **tres**: `empresaId`, `productoId` y `loteId`, sin verificación
  cruzada entre ellas.

Por API la extensión fuerza la coincidencia (C02) y los callers pasan `empresaId`
explícito, así que **no se explotó ninguna vía en el código auditado**. El riesgo es
latente: SQL directo, scripts, seeds, `migrate-categoria-a-jerarquia.ts` o un service
futuro podrían crear un `Lote` apuntando a un `Producto` de otro Business, y nada en la
base de datos lo impediría.

### AUD-D014-G02 — Frontera sin scope no forzada por tooling

`PrismaService` (sin scope) es inyectado directamente en `auth/*`,
`invitaciones/*` y `legajo/*`. Verificado que **ninguno** toca `Lote`,
`MovimientoStock` ni `Producto` hoy. La frontera no está impuesta por tooling: depende
de la disciplina de cada módulo.

---

## 9. Contradicciones entre documentación del código y comportamiento real

### AUD-X01 — Comentario afirma transacción serializable inexistente

`apps/api/src/ventas/ventas.service.ts:154-156`

> *"Inc-3 (D-VTA-10/A): número correlativo por empresa dentro de la transacción —
> SELECT MAX + 1 con bloqueo implícito de la fila en la transacción serializable de
> Postgres."*

Realidad verificada:

| Afirmación | Realidad |
|---|---|
| "transacción serializable" | **No existe** ningún `isolationLevel` en `apps/api/src` (0 coincidencias) → `READ COMMITTED` |
| "bloqueo implícito de la fila" | Un `aggregate({ _max })` **no bloquea** ninguna fila ni evita phantom |
| (implícito) numeración única | `Venta.numero` **no tiene** constraint único |

Tres afirmaciones incorrectas en un mismo comentario. Consecuencia:
`AUD-D010-G07`.

### AUD-X02 — Atomicidad de transacción等同于 protección de concurrencia

`apps/api/src/inventario/inventario.service.ts:277-280`

> *"Debe correr DENTRO de la transacción del caller ... para que la concurrencia quede
> protegida por la misma atomicidad (INV-03/INV-06)."*

Realidad verificada: la atomicidad garantiza que un grupo de escrituras ocurra todo o
nada. **No** serializa lecturas ni impide que dos transacciones decidan sobre el mismo
estado. La race de `AUD-D010-G01` es consecuencia directa de este malentendido, escrito
en el propio archivo que contiene la solución correcta (`aplicarAjusteAtomico`).

### AUD-X03 — El invariante declarado es cierto, pero su inverso se rompe

`apps/api/src/inventario/inventario.service.ts:212-215`

> *"El MovimientoStock se crea en la MISMA transacción que el UPDATE del lote — nunca uno
> sin el otro. No hay ningún camino que modifique Lote.cantidad sin dejar el movimiento
> que lo explica."*

Verificado: la afirmación es **correcta** para el camino de ajuste.

Pero el **inverso** sí se rompe en `compras.service.ts:388`: existe un camino que crea
el movimiento **sin** modificar `Lote.cantidad` (`AUD-D010-G03`). El invariante está
formulado en una sola dirección y el código lo satisface solo en esa dirección.

### AUD-X04 — Rigor de concurrencia desigual entre dos caminos del mismo módulo

`apps/api/src/inventario/inventario.service.ts:201-215`

El comentario razona con detalle sobre por qué un read-then-write sería vulnerable y por
qué el UPDATE condicional es correcto. Ese mismo razonamiento, aplicado al
`descontarStock` de 25 líneas más abajo en el mismo archivo, mostraría que el patrón
también es necesario ahí.

**El archivo demuestra conocer el patrón correcto y no lo aplica donde más importa.**

### AUD-X05 — Enum documentado que el código nunca escribe

`apps/api/prisma/schema.prisma:983`

El comentario lista `"Entrada, Salida, Ajuste"`. `Ajuste` **nunca** se emite: los
ajustes manuales usan `Entrada`/`Salida` según el signo
(`inventario.service.ts:243`). El conjunto de valores documentado no es el real.

### AUD-X06 — Estado del Conflict Register que la auditoría resuelve

`03-CONFLICTS/00-CONFLICT-REGISTER.md` — conflictos **CON-007** y **CON-019** declaraban
`NOT DETERMINABLE` el estado de los controles de integridad de stock.

Esta auditoría lo resuelve (`AUD-D010-G01` a `AUD-D010-G09`): los controles existen para
ajustes y **están ausentes** en venta, en devolución y a nivel de base de datos.

> **Este artefacto no modifica el Conflict Register.** La anotación queda pendiente de
> aprobación del Owner (ver §13).

---

## 10. Riesgos

| ID | Severidad | Riesgo | Evidencia | Impacto |
|---|---|---|---|---|
| `AUD-R01` | **CRÍTICA** | Stock negativo con una **sola request** vía devolución a proveedor | `AUD-D010-G02` | dato corrupto persistente; sin defensa en DB |
| `AUD-R02` | **CRÍTICA** | Oversell / stock negativo bajo ventas concurrentes | `AUD-D010-G01` + `G05` | path normal del POS; venta de mercadería inexistente |
| `AUD-R03` | **ALTA** | Ausencia total de defensa a nivel base de datos | `AUD-D010-G04` | amplifica R01 y R02; ninguna red underneath |
| `AUD-R04` | **ALTA** | Ningún test en el repositorio | `AUD-D010-G08` | ningún control bueno está protegido; ninguna brecha es reproducible |
| `AUD-R05` | **MEDIA** | Divergencia ledger / balance sin `loteId` | `AUD-D010-G03` | corrompe la traza de auditoría de la que D-010 depende |
| `AUD-R06` | **MEDIA** | `Venta.numero` duplicado | `AUD-D010-G07` + `AUD-X01` | rompe numeración fiscal y trazabilidad |
| `AUD-R07` | **MEDIA** | Sobre-recepción concurrente | `AUD-D010-G06` | `cantidadRecibida > cantidadPedida` |
| `AUD-R08` | **MEDIA** | `empresaId` desnormalizado sin constraint | `AUD-D014-G01` | riesgo cross-tenant latente ante escritura directa |
| `AUD-R09` | **BAJA-MEDIA** | Frontera sin scope sin tooling que la imponga | `AUD-D014-G02` | regresión futura en un módulo no-stock |
| `AUD-R10` | **BAJA** | `tipoMovimiento` texto libre | `AUD-D010-G09` | movimiento inclasificable ante errata |
| `AUD-R11` | **BAJA** | Consolidación de stock en memoria | `AUD-D010-G10` | superficie de lectura amplia; diseñado así, a documentar |

### 10.1 Matriz D-010: requisito aprobado vs. implementation

La cláusula *"controles de base de datos **y/o** transacción"* se evalúa como una sola
cláusula, no como dos verificaciones independientes. La ausencia de `CHECK`/`TRIGGER` en la
base de datos **no se cuenta como incumplimiento independiente**: es la razón por la cual
las otras cláusulas no tienen red debajo, y se cita como evidencia de apoyo, no como brecha
por sí misma.

| Cláusula de D-010 | Estado | Evidencia |
|---|---|---|
| *"operaciones de movimiento ... atómicas"* | **SATISFECHO** | `C04` |
| *"controles de base de datos **y/o** transacción"* | **PARCIALMENTE SATISFECHO** — existen controles transaccionales, pero no cubren todos los caminos de modificación de stock | `C01`, `C02`, `C04` / `G01`, `G02`, `G03` |
| *"verificarse y mantenerse"* | **EJERCIDO** por esta auditoría | — |

**Incumplimientos principales** — estos tres, y no la ausencia de constraints de base de
datos:

| Cláusula de D-010 | Estado | Evidencia |
|---|---|---|
| *"... **concurrentemente seguras**"* | **NO SATISFECHO** | `G01`, `G02`, `G05`, `G06` |
| *"resistentes a cantidades inválidas"* | **NO SATISFECHO** — la validación de borde (`C03`) existe, pero los caminos de movimiento no la replican y no tienen guarda propia | `C03`, `G02`, `G03` / apoyo: `G04` |
| *"consistentes entre movimientos y existencias resultantes"* | **NO SATISFECHO** | `G03` |

`G04` (ausencia de `CHECK`/`TRIGGER`) aparece en las filas anteriores únicamente como
evidencia de apoyo: explica por qué estas brechas producen daño persistente en lugar de
fallar ruidosamente. No constituye por sí mismo un incumplimiento separado de la cláusula
*"y/o"*.

---

## 11. Evidencia faltante

| ID | Falta | Por qué importa | Cómo se cerraría | Naturaleza |
|---|---|---|---|---|
| `AUD-E01` | Tests de concurrencia | `AUD-D010-G01` es hoy razonamiento estático; un test lo convertiría en `VERIFIED BY EXECUTION` | Test con dos ventas concurrentes sobre el mismo lote | Acción de verificación pendiente — su hallazgo ya está en `AUD-D010-G08`, no es un `NOT DETERMINABLE` |
| `AUD-E02` | Lectura de la DB viva | No se sabe si ya existen `Lote.cantidad < 0` reales ni su magnitud | Consulta de solo lectura sobre producción | **`NOT DETERMINABLE`** |
| `AUD-E03` | Versión de Prisma exacta | No se pudo determinar estáticamente si las extensiones se propagan al cliente de `$transaction` | `package-lock.json` / documentación de la versión | **`NOT DETERMINABLE`** |
| `AUD-E04` | Comportamiento de extensiones en `$transaction` | Impacta `AUD-D014-C03/C04` dentro de transacciones | Test de integración (contenido: los paths críticos pasan `empresaId` explícito) | **`NOT DETERMINABLE`** |
| `AUD-E05` | Precisión y escala de `Decimal` | `Lote.cantidad` sin `@db.Decimal`; redondeo en el límite `NUMERIC` no determinable | Inspección del DDL generado | **`NOT DETERMINABLE`** |
| `AUD-E06` | Volumen de lotes por producto | El comentario de diseño (L32-47) condiciona la estrategia de agregación a "miles de productos" | Consulta de solo lectura | **`NOT DETERMINABLE`** |
| `AUD-E07` | Lectura de la Spec de Ventas `Inc-1` original | Base de la contradicción CON-007/CON-019 | `01-SOURCE-INVENTORY/SOURCES/HISTORICAL/spec-modulos_ventas.md` — **el archivo existe en el repositorio y no fue leído por esta auditoría** | Acción de verificación pendiente — no es evidencia faltante ni `NOT DETERMINABLE` |

> **Reconciliación con §12:** de las 7 entradas de esta tabla, **5** son hallazgos
> `NOT DETERMINABLE` y figuran en el inventario de §12.2 (`AUD-E02`, `E03`, `E04`, `E05`,
> `E06`). Las **2** restantes (`AUD-E01`, `AUD-E07`) son *acciones de verificación
> pendientes*, no hechos indeterminables: `E01` porque su contenido ya está registrado como
> `AUD-D010-G08`, y `E07` porque el documento fuente está presente y accesible.
>
> `AUD-E01` sigue siendo la brecha más importante: sin ella, ningún hallazgo puede alcanzar
> `VERIFIED BY TEST` ni `VERIFIED BY EXECUTION`, y el nivel máximo alcanzable en este
> repositorio hoy es `VERIFIED BY CODE`.
---

## 12. Clasificación consolidada de cada hallazgo

### 12.1 Por nivel de evidencia

| Nivel | Cantidad | Hallazgos |
|---|---|---|
| `VERIFIED BY TEST` | **0** | — |
| `VERIFIED BY EXECUTION` | **0** | — |
| `VERIFIED BY CODE` | **30** | `AUD-D010-C01…C06` (6) · `AUD-D010-G01…G10` (10) · `AUD-D014-C01…C10` (10) · `AUD-D014-N01` · `AUD-D014-N02` · `AUD-D014-G01` · `AUD-D014-G02` |
| `DOCUMENTED` | **6** | `AUD-X01…X06` (contradicciones documentadas en el propio código) |
| `NOT DETERMINABLE` | **5** | `AUD-E02`, `AUD-E03`, `AUD-E04`, `AUD-E05`, `AUD-E06` |
| **Total** | **41** | 30 + 6 + 5 — coincide con las 41 filas del inventario de §12.2 |

**Ningún hallazgo alcanzó `VERIFIED BY TEST` ni `VERIFIED BY EXECUTION` porque el
repositorio no contiene tests (`AUD-D010-G08`).**

> Las 41 filas del inventario se obtuvieron por conteo directo sobre la tabla de §12.2, no
> por estimación. Los conteos de esta tabla y las filas de §12.2 deben permanecer
> iguales; si se agrega o quita un hallazgo, se actualizan ambos.

### 12.2 Inventario

| ID | Asunto | Nivel |
|---|---|---|
| `AUD-D010-C01` | UPDATE condicional atómico en ajustes | `VERIFIED BY CODE` |
| `AUD-D010-C02` | Ajuste atómico movimiento+balance | `VERIFIED BY CODE` |
| `AUD-D010-C03` | Validación de cantidad en DTOs | `VERIFIED BY CODE` |
| `AUD-D010-C04` | Atomicidad de la venta | `VERIFIED BY CODE` |
| `AUD-D010-C05` | Stock insuficiente: rechazo sin excepción | `VERIFIED BY CODE` |
| `AUD-D010-C06` | Marca de lote vencido capturada en el momento | `VERIFIED BY CODE` |
| `AUD-D010-G01` | Oversell concurrente en `descontarStock` | `VERIFIED BY CODE` |
| `AUD-D010-G02` | Devolución sin guarda de cantidad | `VERIFIED BY CODE` |
| `AUD-D010-G03` | Ledger sin movimiento de balance | `VERIFIED BY CODE` |
| `AUD-D010-G04` | Ausencia de constraints DB | `VERIFIED BY CODE` |
| `AUD-D010-G05` | `READ COMMITTED` por defecto | `VERIFIED BY CODE` |
| `AUD-D010-G06` | Race de sobre-recepción | `VERIFIED BY CODE` |
| `AUD-D010-G07` | `Venta.numero` sin unicidad | `VERIFIED BY CODE` |
| `AUD-D010-G08` | Ausencia total de tests | `VERIFIED BY CODE` |
| `AUD-D010-G09` | `tipoMovimiento` texto libre | `VERIFIED BY CODE` |
| `AUD-D010-G10` | Consolidación de stock en memoria | `VERIFIED BY CODE` |
| `AUD-D014-C01` | Extensión instanciada por request | `VERIFIED BY CODE` |
| `AUD-D014-C02` | `empresaId` forzado en escrituras | `VERIFIED BY CODE` |
| `AUD-D014-C03` | Filtro inyectado en lecturas/mutaciones | `VERIFIED BY CODE` |
| `AUD-D014-C04` | `findUnique` post-filtrado | `VERIFIED BY CODE` |
| `AUD-D014-C05` | Fail-closed ante operación no contemplada | `VERIFIED BY CODE` |
| `AUD-D014-C06` | Stock y movimiento con cobertura directa | `VERIFIED BY CODE` |
| `AUD-D014-C07` | `empresaId` solo desde JWT | `VERIFIED BY CODE` |
| `AUD-D014-C08` | Único SQL crudo con `empresaId` | `VERIFIED BY CODE` |
| `AUD-D014-C09` | SKU y lote únicos por Business | `VERIFIED BY CODE` |
| `AUD-D014-C10` | Superficie HTTP sin param de empresa | `VERIFIED BY CODE` |
| `AUD-D014-N01` | No existe transferencia inter-Business | `VERIFIED BY CODE` |
| `AUD-D014-N02` | Cumplimiento por ausencia, no por control | `VERIFIED BY CODE` |
| `AUD-D014-G01` | `empresaId` desnormalizado sin constraint | `VERIFIED BY CODE` |
| `AUD-D014-G02` | Frontera sin scope sin tooling | `VERIFIED BY CODE` |
| `AUD-X01` | Comentario "serializable" falso | `DOCUMENTED` |
| `AUD-X02` | Atomicidad ≠ concurrencia | `DOCUMENTED` |
| `AUD-X03` | Invariante unidireccional | `DOCUMENTED` |
| `AUD-X04` | Rigor de concurrencia desigual | `DOCUMENTED` |
| `AUD-X05` | Enum documentado no emitido | `DOCUMENTED` |
| `AUD-X06` | `NOT DETERMINABLE` ya resuelto | `DOCUMENTED` |
| `AUD-E02` | Existencia de lotes con cantidad negativa en producción | `NOT DETERMINABLE` |
| `AUD-E03` | Versión de Prisma | `NOT DETERMINABLE` |
| `AUD-E04` | Extensiones en `$transaction` | `NOT DETERMINABLE` |
| `AUD-E05` | Escala/rounding de `Decimal` | `NOT DETERMINABLE` |
| `AUD-E06` | Volumen de lotes por producto | `NOT DETERMINABLE` |

---

## 13. Recomendaciones — `PROPOSED / OPEN`

> ### ⚠️ Ninguna de las siguientes líneas está aprobada.
> No son requisitos, no son decisiones, no están en el Decision Register y no
> comprometen a ninguna decisión de diseño.
> Son **observaciones técnicas** de la auditoría, escritas para que el Owner pueda
> decidir si deserve discussion. Todas están **`PROPOSED / OPEN`**.
> No debe ejecutarse ninguna sin aprobación explícita y sin su propio
> `DEC-*` cuando corresponda.

### 13.1 Observaciones para discusión

| # | `PROPOSED` | Nota |
|---|---|---|
| P1 | Un `CHECK (cantidad >= 0)` en `Lote` como red de fondo | Would cubrir G01, G02 y G03 de una vez. Requiere migración → no autorizado |
| P2 | Llevar el patrón de `aplicarAjusteAtomico` a `descontarStock` y a la devolución | El patrón ya existe en el repo; sería reutilización, no diseño nuevo |
| P3 | Resolver el caso `loteId` ausente: obligatorio, o movimiento condicionado | Cierra G03 |
| P4 | Mover el chequeo de `pendiente` dentro de la transacción; discutir unicidad de `Venta.numero` | Cierra G06 y G07; la alternativa sería una secuencia de DB |
| P5 | Corregir los comentarios incorrectos (`AUD-X01`, `X02`, `X03`, `X05`) | Cambio de comentarios, sin efecto de runtime |
| P6 | Evaluar `tipoMovimiento` como enum | Cierra G09 |
| P7 | Escribir los primeros tests (oversell, stock negativo, cross-tenant denegado) | Único camino para alcanzar `VERIFIED BY TEST` |
| P8 | Registrar D-014 como invariante verificable para el día en que exista el feature | N02: hoy se cumple por ausencia |

### 13.2 Lo que este artefacto **no** hace

- **No** declara D-010 implementada.
- **No** declara D-014 comoviolada.
- **No** modifica el Decision Register, el Conflict Register, AS-IS, TO-BE ni las SPECs
  canónicas.
- **No** aprueba ninguna corrección de código.
- **No** crea invariantes. `INV-G01…INV-G07` siguen `PROPOSED` y sin relación formal con
  este documento.

---

## 14. Propagación pendiente — requiere aprobación del Owner

Nada de lo siguiente se ha ejecutado. Se lista para que la decisión sea explícita.

| # | Destino | Qué se propagaría | Estado |
|---|---|---|---|
| 1 | `03-CONFLICTS/00-CONFLICT-REGISTER.md` | CON-007 / CON-019 dejan de ser `NOT DETERMINABLE` | **PENDIENTE** |
| 2 | `03-CONFLICTS/10-CONFLICT-RESOLUTION-MAPPING.md` | Brechas D-010 como gaps verificables | **PENDIENTE** |
| 3 | `05-ASIS/*` | Estado real de controles de stock | **PENDIENTE** |
| 4 | `07-TOBE/06-MODULES.md` / `11-NFR.md` | Requisito de concurrencia e integridad | **PENDIENTE** |
| 5 | `08-TRACEABILITY/*` | Trazabilidad hallazgo → requisito | **PENDIENTE** |
| 6 | `INV-*` | Formalización de invariantes | **PENDIENTE** |
| 7 | Commentarios de código | Corrección de `AUD-X01…X05` | **PENDIENTE — requiere autorización de código** |

**Revisión del Owner requerida antes de cualquier movimiento.**

---

*Fin del artefacto. `DERIVED / AUDIT` v0.1 · 2026-09-28 · read-only · sin efecto
normativo.*
