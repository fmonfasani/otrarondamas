# B3 — TENANT ISOLATION AS-IS AUDIT

**Estado:** AUDITORÍA TÉCNICA READ-ONLY — NO CANÓNICO — NO APROBADO
**Fecha:** 2026-10-04
**Repo auditado:** `apps/api`, commit base `530b829`
**Autoridad usada (no reinterpretada):** R8-ARCH-002, R8-MASTER, R8-ID-003, R8-AUTH-001, R8-ARCH-003, B1 contracts
**Alcance de la acción:** sin cambios de código, schema, migraciones, documentos canónicos, commits ni deploys. **No se ejecutó ningún test ni la API.**

**Clases de evidencia:** `[C]` verificado por código (archivo + símbolo + línea). `[T]` verificado por test. `[E]` verificado por ejecución. `[D]` documentado. `[ND]` no determinable.

> **No existe en este informe ninguna evidencia `[T]` ni `[E]`.** No hay tests de aislamiento en el repo (sec. 16) y no se ejecutó nada. Todo lo conductual es `[C]` por lectura o `[ND]`.

**Relación con el audit de B1:** el audit B1 (`13-AUDIT/21-...-2026-10-04.md`, sec. 8) ya cubrió tenant isolation como contexto del eslabón de sesión. Este informe es el audit dedicado de B3: profundiza modelo por modelo y operación por operación, y **cierra dos `[ND]` que B1 dejó abiertos** (uso real de `Venta.idempotencyKey`, herencia de la extensión en `$transaction`). Donde coincide con B1, no lo contradice.

---

# 1. EXECUTIVE SUMMARY

El aislamiento de tenant AS-IS es **application-level**, coherente con R8-ARCH-002, implementado como una **Prisma Client Extension** (`empresaScopeExtension`) instanciada por request vía `EmpresaScopedPrismaService.forEmpresa(empresaId)` `[C]`. El mecanismo es real y no decorativo: fuerza `empresaId` en `create`/`createMany`, lo inyecta en el `where` de 9 operaciones, valida `findUnique` post-query y **falla cerrada** ante cualquier operación no contemplada `[C]`.

Sobre eso, los hallazgos que condicionan B3:

1. **La autoridad del tenant es el claim `empresaId` del JWT, nunca revalidado contra la base** `[C]`. La extensión no es fuente de autoridad: aplica el valor que el caller le pasa. No existe Membership; no hay chequeo de `activo` por request. Esto incumple directamente las reglas canónicas 2 y 3 (sec. 3) — no por un bug, sino por ausencia del modelo.
2. **El cliente no puede influir en el tenant efectivo.** Cero `empresaId` en DTOs, cero en `@Param`/`@Query`/`@Headers`, `whitelist:true` activo `[C]`. La regla canónica 4 se cumple hoy, por ausencia de superficie.
3. **Cobertura de modelos: 26 de 28 con `empresaId` directo.** `PagoProveedor` y `DevolucionProveedor` tienen la columna y **quedan fuera de la lista** de la extensión `[C]`. Los 14 modelos sin `empresaId` no tienen scope automático: heredan por disciplina del código llamador.
4. **La extensión no inspecciona nested writes, `connect` ni `include`** `[C]`. Solo mira `args.data` de nivel superior y `args.where`. Esto deja sin cubrir las reglas canónicas 10 y 11 a nivel de mecanismo.
5. **Se confirma una escritura que acepta FK de otro tenant:** `ComprasService.crearDevolucion` persiste `productoId` y `loteId` del DTO sin validar pertenencia `[C]`. Severidad ALTA. El docstring afirma que valida el lote; el código no lo hace.
6. **Se confirma una lectura cross-tenant por único global:** `Venta.idempotencyKey` es `@unique` sin `empresaId`. B1 lo dejó `[ND]`; este audit leyó `ventas.service.ts:117` y confirma que se consulta por `findUnique({idempotencyKey})` — **la extensión sí lo corta** por la validación post-query (devuelve `null`), así que el resultado es seguro, pero el camino depende enteramente de esa validación, no del índice `[C]`.
7. **`$executeRaw` no pasa por la extensión.** El único uso (`inventario.service.ts:266`) incluye `empresaId` en el `WHERE` a mano y está parametrizado `[C]`. Seguro hoy, sin red de contención.
8. **`PrismaService` crudo (sin scope) se usa en `auth*`, `invitaciones*` y `legajo*`** `[C]`. Cada caso se analizó individualmente (sec. 13): ninguno resulta hoy en un cruce entre tenants, pero el aislamiento ahí es disciplina manual, no mecanismo.
9. **No hay background jobs, schedulers, colas ni event handlers** `[C]`. No existe esa superficie de bypass. El `seed.ts` y el script de migración usan `PrismaClient` crudo, que es correcto y esperado para scripts offline.
10. **Cero cobertura de tests de aislamiento.** El único spec del repo es `health.controller.spec.ts` `[C]`. El `seed.ts` **ya crea una segunda Empresa (`empresaAislamiento`) con catálogo propio** — una fixture de aislamiento completa que ningún test consume `[C]`.

**Veredicto:** `READY WITH RECONCILIATION` (ver sec. 17-18). El mecanismo AS-IS es una base de migración válida y R8-ARCH-002 ya lo clasificó ADAPTED, pero hay dos elementos (G-B3-01 cobertura de `PagoProveedor`/`DevolucionProveedor`, G-B3-05 FK sin validar) que son brechas de código concretas, no decisiones pendientes, y un vacío de diseño real en ownership derivado (G-B3-02) que B3 CONTRACTS debe resolver.

**No se declara B3 implementado. No se abre ninguna Owner Decision nueva** (sec. 17).

---

# 2. SCOPE

**Auditado:**
- `apps/api/src/prisma/*` (completo, línea por línea)
- `apps/api/prisma/schema.prisma` (42 modelos, inventario completo)
- todos los call sites de `forEmpresa` (72 ocurrencias, 15 archivos) y de `this.prisma.<model>` (46 ocurrencias)
- `auth/**`, `legajo/**`, `invitaciones/**`, `autorizaciones/**`, `compras`, `caja`, `ventas`, `tienda`, `inventario`, `pagos`, `usuarios`, `clientes`, `fidelizacion` en lo relativo a scope
- `$transaction`, `$executeRaw`, `$queryRaw`, `upsert`, `groupBy`: búsqueda exhaustiva
- DTOs, decoradores de parámetro, rutas: búsqueda exhaustiva de `empresaId`/`businessId`
- `seed.ts`, `migrate-categoria-a-jerarquia.ts`, `sync-permisos-owner.ts`

**No auditado funcionalmente** (solo en lo que define una frontera de tenant): Commerce, Inventory, Payments, Messaging, Brand como dominios.

**No leído línea por línea:** `pedidos.service.ts`, `fidelizacion.service.ts` y `clientes.service.ts` completos (se verificaron sus llamadas a `forEmpresa` y sus `findUnique`). Frontends: fuera de scope.

**No ejecutado:** nada. Sin DB, sin tests, sin API.

---

# 3. CANONICAL RULES BEING AUDITED

Las 14 reglas del encargo, trazadas a R8-ARCH-002 sec. 3 (propiedades 1-12) y sec. 7 (invariante de seguridad).

| # | Regla canónica | Fuente |
|---|---|---|
| R1 | Business Context existe antes de una operación Business-scoped | ARCH-002 §3.1 |
| R2 | El contexto corresponde a una Membership válida | ARCH-002 §3.2 |
| R3 | Membership INACTIVE no puede operar | ARCH-002 §3.3 |
| R4 | El Business ID del cliente no sobrescribe el contexto autoritativo | ARCH-002 §3.4 |
| R5 | CREATE asigna el Business desde el contexto | ARCH-002 §3.5 |
| R6 | READ restringido al Business Context | ARCH-002 §3.6 |
| R7 | UPDATE no cruza fronteras de Business | ARCH-002 §3.7 |
| R8 | DELETE no cruza fronteras de Business | ARCH-002 §3.7 |
| R9 | findUnique / únicos no exponen datos de otro Business | ARCH-002 §3.8 |
| R10 | Relaciones/nested writes preservan ownership | ARCH-002 §3.9 |
| R11 | FK entre entidades de distintos Business se rechaza | ARCH-002 §3.9 (derivada) |
| R12 | Las transacciones conservan el Business Context | ARCH-002 §3.10 |
| R13 | Contexto ausente/inválido/no autorizado falla cerrado | ARCH-002 §3.11 |
| R14 | No existe bypass directo de Prisma que saltee el scope | ARCH-002 §7 |

---

# 4. CURRENT TENANT MODEL

| Elemento | AS-IS | Evidencia |
|---|---|---|
| Tenant | `Empresa` (`schema.prisma:110`) | `[C]` |
| Discriminador físico | columna `empresaId` en 28 de 42 modelos | `[C]` |
| Pertenencia | `Usuario.empresaId` obligatorio y **único** — un Usuario pertenece a exactamente una Empresa | `schema.prisma:147` `[C]` |
| Membership | **no existe** como entidad | `[C]` |
| Estado de Membership | solo `Usuario.activo` (global, no por Empresa), comprobado en el login y no por request | `[C]` |
| Business Context en runtime | el claim `empresaId` del JWT, leído vía `@CurrentUser()` | `jwt.strategy.ts:23-34` `[C]` |
| Multi-Business / switching | **no existe** | `[C]` |
| Identidad `Cliente` | tabla separada con login y JWT propios (`type:'cliente'`), con `empresaId` | `[C]` |

**Fuentes de `empresaId` que existen en el código** (inventario exhaustivo):

| Fuente | Existe | Evidencia |
|---|---|---|
| Claim JWT | **Sí — fuente única en rutas autenticadas** | `jwt.strategy.ts:28` `[C]` |
| Body / DTO | No. Ningún `*.dto.ts` declara `empresaId`; `whitelist:true` | grep sin coincidencias; `main.ts` `[C]` |
| `@Param` / `@Query` / `@Headers` | No. Ninguna ruta declara `:empresaId` | grep sin coincidencias `[C]` |
| Env var | `TIENDA_EMPRESA_ID` (tienda pública), `GOOGLE_SIGNUP_EMPRESA_ID` (alta Google) | `tienda.service.ts:38-49`, `auth.google.service.ts` `[C]` |
| Token de invitación | `Invitacion.empresaId`, leído del registro que el token identifica | `invitaciones.service.ts:212` `[C]` |
| Sesión servidor | No existe | `[C]` |

**Autoridad efectiva:** el JWT firmado con `JWT_SECRET`. `JwtStrategy.validate()` **devuelve el payload sin consultar la base** `[C]`. Consecuencia para R2/R3: no hay nada que validar contra una Membership, porque la Membership no existe; y `Usuario.activo` no se revalida, así que un usuario desactivado opera hasta que su token expire (8 h).

---

# 5. PRISMA SCOPING ARCHITECTURE

**Composición** `[C]`:

```
PrismaService (extends PrismaClient, singleton)            prisma.service.ts
   └─ EmpresaScopedPrismaService (singleton, NO Scope.REQUEST)
        └─ forEmpresa(empresaId) → this.prisma.$extends(empresaScopeExtension(empresaId))
                                                            empresa-scoped-prisma.service.ts:38-39
```

`PrismaModule` exporta **ambos**: `PrismaService` y `EmpresaScopedPrismaService` `[C]`. Esto es lo que hace que el bypass sea alcanzable por inyección normal, sin nada que lo señale.

**Decisión de diseño documentada y verificada:** el service es singleton, no `Scope.REQUEST`. El comentario de `empresa-scoped-prisma.service.ts:9-20` explica que la versión `Scope.REQUEST` + `@Inject(REQUEST)` se descartó porque Nest resolvía el provider antes de ejecutar los guards (una request sin token construía el service en vez de ser cortada), y afirma haberlo verificado con logs de servidor real. Para este audit eso es `[D]`: el razonamiento es coherente con el comentario espejo en `jwt-auth.guard.ts:6-18`, pero no se reprodujo.

**Implicancia estructural:** al ser singleton y recibir el `empresaId` por parámetro, **el mecanismo no puede garantizar que se lo invoque**. Si un service inyecta `PrismaService` en vez de la factory, o si invoca `forEmpresa` con un `empresaId` equivocado, nada lo detecta — ni en compilación ni en runtime. El aislamiento es *opt-in por call site*. Esta es la limitación central del AS-IS y la que R8-ARCH-002 §5 anticipa al clasificarlo ADAPTED.

**Desactualización documental:** el docstring de `empresa-scope.extension.ts:20` dice "SOLO cubre los 21 modelos"; la lista real tiene 26 entradas `[C]`. Y `:23-30` enumera los modelos derivados no cubiertos (VentaItem, AplicacionPago, AperturaCaja/MovimientoCaja/ArqueoCaja/CierreCaja, CompraItem) **sin mencionar** `DevolucionProveedorItem`, `PedidoItem`, `UsuarioPermiso`. El comentario de `:62-66` sí menciona Legajo/DocumentoLegajo. El inventario del comentario está incompleto respecto del schema.

---

# 6. MODEL COVERAGE MATRIX

42 modelos. Conteo con `awk` sobre `schema.prisma`, contrastado con `MODELOS_CON_EMPRESA_ID` (`empresa-scope.extension.ts:32-68`) `[C]`.

## A. Con `empresaId` directo y CUBIERTOS (26)

Clasificación: **BUSINESS-SCOPED-DIRECT**. Scope automático por la extensión en las operaciones soportadas.

| Modelo | Business se determina por | Cobertura | Riesgo |
|---|---|---|---|
| Usuario | `empresaId` directo | Total (ops soportadas) | Bajo |
| Invitacion | `empresaId` directo | Total | Bajo — pero se lee por `token` con cliente crudo (sec. 13) |
| Familia, Subfamilia, Tipo, Subtipo | `empresaId` directo | Total | Bajo |
| Producto | `empresaId` directo | Total | Bajo |
| ProductoProveedor | `empresaId` directo | Total | Bajo |
| Presentacion | `empresaId` directo | Total | Bajo |
| Lote | `empresaId` directo | Total | Medio — `$executeRaw` lo toca fuera de la extensión (sec. 13) |
| Cliente | `empresaId` directo | Total | Medio — se lee con cliente crudo en `auth.cliente*` (sec. 13) |
| ReglaFidelizacion | `empresaId` directo | Total | Bajo |
| CuentaCorriente, Deuda | `empresaId` directo | Total | Bajo |
| Venta | `empresaId` directo | Total | Medio — `idempotencyKey` único global (sec. 10) |
| Pedido | `empresaId` directo | Total | Bajo |
| Pago | `empresaId` directo | Total | Bajo |
| Caja | `empresaId` directo, `@@unique([empresaId])` | Total | Bajo |
| Proveedor | `empresaId` directo | Total | Bajo |
| Compra | `empresaId` directo | Total | Bajo |
| RecepcionCompra | `empresaId` directo | Total | Bajo |
| MovimientoStock | `empresaId` directo | Total | Medio — se crea con FK sin validar (sec. 11) |
| Entrega | `empresaId` directo | Total | Bajo |
| Notificacion | `empresaId` directo | Total | Bajo |
| AuditLog | `empresaId` directo | Total | Bajo |
| Autorizacion | `empresaId` directo | Total | Bajo |

## B. Con `empresaId` directo y NO CUBIERTOS (2) — **G-B3-01**

| Modelo | Línea | Clasificación correcta | Cobertura actual | Riesgo |
|---|---|---|---|---|
| **PagoProveedor** | `schema.prisma:1061` | BUSINESS-SCOPED-DIRECT | **Ninguna automática.** `create` pasa `empresaId` a mano con cast `as Prisma.PagoProveedorUncheckedCreateInput`; `findMany` filtra solo por `compraId` | **ALTO (estructural) / mitigado en práctica** |
| **DevolucionProveedor** | `schema.prisma:1082` | BUSINESS-SCOPED-DIRECT | Igual | **ALTO (estructural) / mitigado en práctica** |

**Por qué es ALTO estructural:** tienen la columna, deberían estar en la lista y no están. Un `findMany`/`update`/`delete` futuro sobre ellos no recibe ningún filtro. El cast `as ...UncheckedCreateInput` además **suprime el error de tipos** que normalmente delataría un `empresaId` faltante.

**Por qué está mitigado hoy:** las 4 operaciones existentes (`compras.service.ts:271, 298, 327, 353`) están precedidas por `getCompra(empresaId, compraId)`, que sí pasa por la extensión vía `Compra` y lanza 404 si la Compra no es del tenant `[C]`. El aislamiento es correcto por el orden de las llamadas, no por el mecanismo.

## C. Sin `empresaId` directo (14)

| Modelo | Padre / cadena | Clasificación determinada | Cobertura actual | Riesgo |
|---|---|---|---|---|
| **Empresa** | — | **GLOBAL legítimo** (es el tenant) | N/A | Bajo |
| **Permiso** | — | **GLOBAL legítimo** (catálogo de permisos, `seed.ts:123`) | N/A | Bajo |
| **UsuarioPermiso** | Usuario → Empresa | BUSINESS-SCOPED-DERIVED | **Ninguna.** Se consulta con el cliente *scoped* pero sin `empresaId` el filtro no aplica (`autorizaciones.service.ts:69`) | Medio |
| VentaItem | Venta | BUSINESS-SCOPED-DERIVED | Ninguna; solo nested desde Venta | Medio |
| PedidoItem | Pedido | BUSINESS-SCOPED-DERIVED | Ninguna; solo nested desde Pedido | Medio |
| AplicacionPago | Pago, Deuda | BUSINESS-SCOPED-DERIVED | Ninguna | Medio |
| AperturaCaja | Caja | BUSINESS-SCOPED-DERIVED | Ninguna; accedida por `cajaId` ya resuelto | Medio |
| MovimientoCaja | Caja, AperturaCaja | BUSINESS-SCOPED-DERIVED | Ninguna; por `aperturaCajaId` ya resuelto | Medio |
| ArqueoCaja | Caja, AperturaCaja | BUSINESS-SCOPED-DERIVED | Ninguna; `findFirst({id, cajaId})` manual | Medio |
| CierreCaja | AperturaCaja | BUSINESS-SCOPED-DERIVED | Ninguna | Medio |
| CompraItem | Compra | BUSINESS-SCOPED-DERIVED | Ninguna; por `compraId` ya resuelto | Medio |
| **DevolucionProveedorItem** | DevolucionProveedor | BUSINESS-SCOPED-DERIVED | **Ninguna** — y su nested create acepta FK de otro tenant (sec. 11) | **ALTO** |
| **Legajo** | Usuario `@unique` o Cliente `@unique` | **AMBIGUOUS / NEEDS DESIGN** — puede colgar de Usuario *o* de Cliente; el tenant se deriva por una de dos ramas opcionales | Ninguna; cliente crudo | Medio |
| **DocumentoLegajo** | Legajo → (Usuario \| Cliente) | **AMBIGUOUS / NEEDS DESIGN** — derivación de 2 saltos por rama opcional | Ninguna; cliente crudo | Medio |

**Nota de método:** no se asumió que "sin `empresaId`" sea un error. `Empresa` y `Permiso` son globales legítimos y así quedan clasificados. Los 10 derivados tienen un padre inequívoco y son resolubles por diseño. `Legajo`/`DocumentoLegajo` son los únicos **AMBIGUOUS**: el tenant depende de cuál de las dos FK opcionales esté poblada (`schema.prisma:520-523`, ambas `@unique` y opcionales), y por eso quedan señalados para B3 CONTRACTS, no como bug.

**Resumen:** 26 cubiertos / 2 con columna sin cubrir / 12 derivados sin cubrir / 2 globales legítimos.

---

# 7. OPERATION COVERAGE MATRIX

Para los 26 modelos cubiertos. Todo `[C]`, por lectura de `empresa-scope.extension.ts`.

| Operación | Comportamiento | Línea | Regla | Cobertura |
|---|---|---|---|---|
| `create` | `data.empresaId = empresaId` — **pisa** lo que venga del body | 118-124 | R5 | **Completa** |
| `createMany` | mapea todas las filas forzando `empresaId` | 125-129 | R5 | **Completa** |
| `findFirst`, `findFirstOrThrow` | `where.empresaId = empresaId` | 82-92, 131-134 | R6 | **Completa** |
| `findMany` | idem | idem | R6 | **Completa** |
| `count`, `aggregate` | idem | idem | R6 | **Completa** |
| `update` | idem | idem | R7 | **Completa** |
| `updateMany` | idem | idem | R7 | **Completa** |
| `delete` | idem | idem | R8 | **Completa** |
| `deleteMany` | idem | idem | R8 | **Completa** |
| `findUnique`, `findUniqueOrThrow` | **post-query validation**: ejecuta, compara `resultado.empresaId !== empresaId`, devuelve `null` o lanza `P2025` | 136-159 | R9 | **Completa con reserva** (ver abajo) |
| `upsert` | **lanza Error** | 161-166 | R13 | **Fail-closed** |
| `groupBy` | **lanza Error** (no está en ninguna lista) | 161-166 | R13 | **Fail-closed** |
| `aggregateRaw`, `findRaw`, cualquier otra | **lanza Error** | 161-166 | R13 | **Fail-closed** |
| `$queryRaw`, `$executeRaw` | **no pasan por la extensión** (no son operaciones de modelo) | — | R14 | **Sin cobertura** |
| nested `create` / `connect` / `createMany` dentro de `data` | **no inspeccionados** | — | R10, R11 | **Sin cobertura** |
| `include` / `select` de relaciones | **no inspeccionados** | — | R6 | **Sin cobertura** |

## 7.1 El fail-closed es real y verificado

`empresa-scope.extension.ts:164-166` lanza para toda operación no enumerada, sobre modelos cubiertos `[C]`. Esto es la implementación más fuerte del AS-IS y satisface R13 **a nivel de operación**. Confirmado por su efecto en el código llamador: `tienda.service.ts:221-240` usa `findFirst` + `create`/`update` explícitamente **en vez de `upsert`**, y el comentario cita el fail-closed como la razón `[C]`. Búsqueda exhaustiva: **cero usos de `.upsert(` y `.groupBy(` en `apps/api/src`** `[C]`. El mecanismo está moldeando el código real, no solo documentado.

## 7.2 Reserva sobre `findUnique` (R9)

La validación post-query depende de que `resultado` **contenga** la propiedad `empresaId` (`:146`, `'empresaId' in resultado`). Si una query usara un `select` de nivel superior que omita `empresaId`, la condición sería falsa y el registro de otro tenant **se devolvería** `[C]`.

**Verificado:** ningún `findUnique`/`findUniqueOrThrow` del código usa `select` de nivel superior. Los únicos `select` encontrados están dentro de `include` de relaciones (`fidelizacion.service.ts:58-61`, `pedidos.service.ts:43`, `tienda.service.ts:295`) `[C]`. **No hay explotación actual.** Es una condición latente del diseño, no un hallazgo activo.

Dos consecuencias adicionales, inherentes y correctas de señalar:
- La query **se ejecuta** contra la fila del otro tenant antes de descartarse. El dato cruza la frontera del proceso y se descarta en memoria; no cruza la frontera de la respuesta HTTP. Con un mecanismo a nivel de DB (fuera de scope por R8-ARCH-002) no se ejecutaría.
- El resultado es `null`, indistinguible de "no existe" — correcto desde seguridad (no filtra existencia).

**Causa raíz documentada y confirmada:** ningún modelo define `@@unique([id, empresaId])`, así que no se puede inyectar `empresaId` en el `where` de `findUnique` sin romper la query. Los `@@unique` compuestos que existen son de negocio (`[empresaId, nombre]`, `[empresaId, prefijo]`, `[empresaId, codigoInterno]`, `[productoId, numeroLote, empresaId]`, `[empresaId, email]`, `[empresaId, clienteId]`, `[empresaId]` en Caja) `[C]`. El comentario de `:76-81` describe esto con precisión.

---

# 8. BUSINESS CONTEXT HANDLING

Trazado contra las reglas R1-R3 y R13.

| Regla | Estado AS-IS | Evidencia |
|---|---|---|
| **R1** — contexto existe antes de la operación | **Cumple en forma, por otro medio.** `JwtAuthGuard` es `APP_GUARD` global y todo endpoint exige token salvo `@Public()`; `empresaId` siempre viaja en el token. El contexto no se "establece": se asume del claim | `jwt-auth.guard.ts:19-34`, `auth.module.ts` `[C]` |
| **R2** — contexto ↔ Membership válida | **NO CUMPLE.** No existe Membership. `validate()` no consulta la base | `jwt.strategy.ts:23-34` `[C]` |
| **R3** — Membership INACTIVE no opera | **NO CUMPLE.** Solo `Usuario.activo`, verificado en el login, nunca por request. Un usuario desactivado opera hasta la expiración del token (8 h) | `[C]` |
| **R13** — contexto ausente/inválido falla cerrado | **PARCIAL.** Ausente: no se da en rutas autenticadas (el token siempre lo trae); `@Public()` sin `forEmpresa` no toca modelos scoped salvo tienda, que falla explícito si falta la env var (`tienda.service.ts:40-47`). **Inválido** (un `empresaId` firmado que no existe o no corresponde): **no se valida**. Efecto esperado: lecturas a cero filas y violación de FK en `create` — `[ND]`, por razonamiento sobre la extensión, no ejecutado | `[C]` + `[ND]` |

**Observación sobre R13 e `@Public()`:** los endpoints públicos son `tienda/*` (4), `auth/login`, `auth/cliente/*` e `invitaciones/activar*`. Los de tienda derivan el tenant de `TIENDA_EMPRESA_ID` y **fallan explícito** si no está configurada — no muestran "un catálogo de cualquier empresa" `[C]`. Los de invitación derivan el tenant del registro que el token secreto identifica. Ninguno acepta un tenant del cliente.

**Interacción con el contrato B1 (R8-ARCH-003 §5, CTX-001..006):** el AS-IS no implementa un Active Business Context como concepto. Hay un claim fijo. CTX-002 (contexto ligado a Membership ACTIVE) y el business switching de §9 no tienen contraparte en el código. Esto no es contradicción con el contrato: el contrato describe el TO-BE y el AS-IS es su punto de partida, tal como R8-ARCH-002 §5 lo clasifica.

---

# 9. CLIENT-SUPPLIED TENANT IDS

Búsqueda exhaustiva de `empresaId` / `businessId` en DTOs, `@Param`, `@Query`, `@Body`, `@Headers` y rutas.

| Superficie | Resultado | Clasificación | Evidencia |
|---|---|---|---|
| `*.dto.ts` | **0 coincidencias de `empresaId`** en todo el repo | **SAFE** | grep `[C]` |
| `@Body()` | ningún DTO lo declara; `ValidationPipe` con `whitelist:true` descarta propiedades no declaradas | **SAFE** | `main.ts` `[C]` |
| `@Param(':empresaId')` | **0 coincidencias**; ninguna ruta lo declara | **SAFE** | grep `[C]` |
| `@Query('empresaId')` | **0 coincidencias** | **SAFE** | grep `[C]` |
| `@Headers(...)` | **0 usos del decorador en todo el repo** | **SAFE** | grep `[C]` |
| `businessId` | **0 coincidencias** (el concepto no existe en el código) | **SAFE** | grep `[C]` |
| Claim JWT `empresaId` | **el cliente lo porta pero no lo elige**: lo emite el servidor al login y va firmado. Un cliente que lo altere invalida la firma | **SAFE** (dado `JWT_SECRET` íntegro) | `jwt.strategy.ts` `[C]` |
| `TIENDA_EMPRESA_ID` / `GOOGLE_SIGNUP_EMPRESA_ID` | env vars de servidor, no influibles por el cliente | **SAFE** | `[C]` |
| `token` de invitación (`@Public()`) | el cliente envía un secreto de 32 bytes que **selecciona** un registro `Invitacion` y con él un `empresaId`. No elige el tenant: lo prueba con un secreto que el servidor emitió | **TRANSITIONAL** | `invitaciones.service.ts:212, 227` `[C]` |

**Conclusión R4: CUMPLE.** No se encontró ninguna superficie por la que el cliente pueda influir en el tenant efectivo. **Matiz importante:** cumple *por ausencia de superficie multi-tenant*, no por una defensa activa. El sistema es mono-negocio y nunca necesitó aceptar un selector de tenant. Cuando B3 introduzca business switching (R8-ARCH-003 §9), esta superficie se crea desde cero y R4 pasará de "cumple trivialmente" a "requiere defensa explícita". Es el cambio de riesgo más relevante que B3 CONTRACTS debe anticipar.

**`create` con `empresaId` en el body:** aunque un DTO lo declarara, `empresa-scope.extension.ts:118-124` lo **sobrescribe** con el del contexto antes de la query. Hay defensa en profundidad real para R4 en la capa de persistencia `[C]`.

---

# 10. CROSS-TENANT RISK ANALYSIS

Un riesgo por cada vector del encargo. Severidad: ALTA = cruce alcanzable o dato persistido cruzado; MEDIA = contenido solo por orden de llamadas o disciplina; BAJA = contenido por mecanismo.

| ID | Vector | Evidencia | Archivo / símbolo | Impacto | Severidad | Estado |
|---|---|---|---|---|---|---|
| **X-01** | lectura A → recurso B (`findMany`/`findFirst`) | `where.empresaId` inyectado en las 9 ops con where | `empresa-scope.extension.ts:131-134` `[C]` | ninguno en modelos cubiertos | BAJA | **MITIGADO por mecanismo** |
| **X-02** | unique lookup A → recurso B | post-query validation; devuelve `null`/P2025 | `:136-159` `[C]` | ninguno; la fila se lee y se descarta en memoria | BAJA | **MITIGADO por mecanismo** (reserva: `select` que omita `empresaId`, sec. 7.2 — sin uso actual) |
| **X-03** | unique global sin `empresaId` — `Venta.idempotencyKey` | `@unique` sin `empresaId` (`schema.prisma:663`); consultado en `findUnique({idempotencyKey})` | `ventas.service.ts:117-120` `[C]` | **cierra el `[ND]` de B1**: una `Venta` de otra Empresa con la misma clave sería alcanzada por el índice, pero la validación post-query la convierte en `null` y el flujo sigue a crear la venta. Sin fuga | BAJA | **MITIGADO** por X-02, no por el índice |
| **X-04** | unique global sin `empresaId` — `Cliente.googleId`, `Usuario.email`, `Invitacion.token` | `@unique` globales, consultados con cliente **crudo** | `auth.google.service.ts:36,45`; `auth.service.ts:45`; `invitaciones.service.ts:212` `[C]` | **correcto por diseño**: son lookups de identidad **pre-contexto**, donde el tenant es el *resultado*, no una restricción. Cambiarlos rompería el login | BAJA | **ACEPTADO — pre-autenticación** |
| **X-05** | update A → recurso B | `where.empresaId` inyectado | `:131-134` `[C]` | ninguno en modelos cubiertos | BAJA | **MITIGADO por mecanismo** |
| **X-06** | update A → recurso B **con cliente crudo** | `legajo.controller.ts:123` y `legajo.cliente.controller.ts:135` hacen `usuario/cliente.update({where:{id}})` **sin `empresaId`**, precedidos por un `findFirst` **con** `empresaId` (`:108`, `:123`) | `[C]` | seguro en la práctica; **no atómico** (TOCTOU teórico: requeriría que el registro cambie de Empresa entre las dos queries, lo cual el schema no permite) | MEDIA | **MITIGADO por orden de llamadas** |
| **X-07** | delete A → recurso B | `where.empresaId` inyectado; además **no se encontró ningún `.delete()`/`.deleteMany()`** en los services auditados | `[C]` | ninguno | BAJA | **MITIGADO** |
| **X-08** | create con FK de B — **`crearDevolucion`** | `item.productoId` e `item.loteId` llegan del DTO y se persisten **sin validar pertenencia**: en `DevolucionProveedorItem` (nested create, no cubierto) y en `MovimientoStock.create` (cubierto, pero el scope fuerza el `empresaId` propio — **no valida las FK**). Un `productoId` de otra Empresa satisface la FK de Postgres y queda referenciado | `compras.service.ts:343-398` `[C]` | **datos de otra Empresa referenciados y persistidos**; `MovimientoStock` del tenant A apuntando a un `Producto` de B. Contradice el propio docstring, que afirma "valida que el lote pertenezca al producto" | **ALTA** | **ABIERTO — G-B3-05** |
| **X-09** | nested create de B | la extensión **no inspecciona** `data.*.create` | `:113-134` (solo `args.data` top-level) `[C]` | el vector de X-08; aplica a todo nested create | **ALTA** (como mecanismo) | **ABIERTO — G-B3-04** |
| **X-10** | nested update de B | idem; no se encontraron nested updates en el código auditado | `[C]` | sin explotación actual | MEDIA | **ABIERTO (latente)** |
| **X-11** | relación padre A / hijo B | `DevolucionProveedorItem` → `Producto`/`Lote` de otro tenant (X-08). Los demás nested create usan IDs previamente validados contra el tenant | `[C]` | ver X-08 | ALTA (ese caso) / BAJA (resto) | **ABIERTO** |
| **X-12** | relación hijo A / padre B | los hijos se crean siempre nested desde un padre ya resuelto por la extensión, o con `<padre>Id` obtenido de una lectura scoped previa | `[C]` | no se encontró vector | BAJA | **MITIGADO por disciplina** |
| **X-13** | transaction A/B | `$transaction` siempre se abre sobre `db` ya extendido; un solo `empresaId` por closure. **No se encontró ninguna transacción que mezcle dos tenants** | sec. 12 | ninguno | BAJA | **MITIGADO por construcción** |
| **X-14** | `include` de relaciones no filtrado | la extensión no inspecciona `include`; las relaciones se resuelven por FK | `:113` `[C]` | **inocuo dado el schema**: toda relación incluida cuelga del registro padre ya validado, y Postgres garantiza la integridad de la FK. Se convierte en riesgo real solo si una FK cruzada se persiste primero — es decir, **si X-08 ocurre** | MEDIA (condicionado a X-08) | **ABIERTO (dependiente)** |
| **X-15** | lectura sin `empresaId` en modelo con columna no cubierta | `pagoProveedor.findMany({where:{compraId}})` y `devolucionProveedor.findMany({where:{compraId}})` — sin filtro automático | `compras.service.ts:271, 327` `[C]` | contenido porque `getCompra(empresaId, compraId)` corre antes y lanza 404 | MEDIA | **MITIGADO por orden de llamadas — G-B3-01** |
| **X-16** | `UsuarioPermiso` consultado por cliente scoped sin efecto | `db.usuarioPermiso.findFirst(...)` — el modelo no tiene `empresaId`, así que la extensión lo deja pasar sin filtro | `autorizaciones.service.ts:69` `[C]` | contenido por el chequeo **explícito** `autorizador.empresaId !== empresaId` de `:62` | MEDIA | **MITIGADO por chequeo explícito** |
| **X-17** | `$executeRaw` fuera de la extensión | `UPDATE "Lote" ... WHERE "id"=$1 AND "empresaId"=$2 AND ...` | `inventario.service.ts:259-271` `[C]` | ninguno: `empresaId` está en el `WHERE` y la query es parametrizada (sin interpolación de string) | BAJA | **MITIGADO manualmente** |

**Patrón transversal.** De los 17 vectores, los contenidos se agrupan en tres clases muy distintas:
- **por mecanismo** (X-01, X-02, X-05, X-07): la extensión los garantiza. Sobreviven a un refactor.
- **por orden de llamadas o chequeo explícito** (X-06, X-15, X-16, X-17): correctos hoy, y cada uno se rompe con un cambio local que ninguna herramienta señalaría.
- **abiertos** (X-08/X-09/X-11, y X-14 condicionado): el único con dato cruzado efectivamente persistible es **X-08**.

---

# 11. NESTED WRITES / FK ANALYSIS

## 11.1 Qué inspecciona la extensión

`empresa-scope.extension.ts:113-116` desestructura **solo** `args.where` y `args.data` de nivel superior `[C]`. No recorre `data` en profundidad. Por lo tanto, para R10 y R11:

- un nested `create` **hereda** el `empresaId` del padre **solo si el modelo hijo tiene la columna** — y ninguno de los hijos nested la tiene (`VentaItem`, `PedidoItem`, `DevolucionProveedorItem`) `[C]`;
- un `connect` a un ID de otro tenant **no se valida**;
- las FK escalares dentro de un nested create **no se validan**.

## 11.2 Nested writes reales en el código

| Sitio | Nested | FK que acepta | Validación previa | Estado |
|---|---|---|---|---|
| `ventas.service.ts:170-183` | `ventaItems.create[]` | `productoId`, `reglaFidelizacionId` | **Sí.** `resolverItems()` hace `db.producto.findMany({id:{in:...}})` **scoped** y lanza `PRODUCTO_NO_ENCONTRADO` si falta alguno. `reglaFidelizacionId` proviene de `listarReglasActivas(empresaId)`, no del DTO | **SEGURO** `[C]` |
| `tienda.service.ts:265-273` | `pedidoItems.create[]` | `productoId`, `reglaFidelizacionId` | **Sí.** `db.producto.findMany({id:{in:...}, activo:true})` scoped + bucle que rechaza los ausentes (`:158-163`). Reglas desde `listarReglasActivas(empresaId)` | **SEGURO** `[C]` |
| `compras.service.ts:357-367` | `items.create[]` de `DevolucionProveedorItem` | `productoId`, `loteId` | **NO.** Van directo del DTO al nested create | **VULNERABLE — X-08** `[C]` |
| `compras.service.ts:371-383` | `movimientoStock.create` (no nested, dentro del mismo bucle) | `productoId`, `loteId` | **NO.** La extensión fuerza `empresaId` del contexto pero no valida las FK | **VULNERABLE — X-08** `[C]` |

**Contraste que confirma el diagnóstico:** los tres sitios de nested create validan la FK con una lectura *scoped* previa — excepto `crearDevolucion`. El patrón correcto existe y está aplicado en el resto del código; `crearDevolucion` es la omisión, no la norma. Y su propio docstring (`compras.service.ts:323-331`) afirma "Valida que el lote (si se especifica) pertenezca al producto", lo cual el código **no hace**: no hay ninguna comparación entre `loteId` y `productoId` en el método. El comentario documenta una intención no implementada.

## 11.3 R11 (FK cross-Business se rechaza)

**NO CUMPLE a nivel de mecanismo** `[C]`. Nada en la capa de persistencia rechaza una FK cruzada:
- Postgres valida que la FK **exista**, no a qué tenant pertenece;
- no hay FK compuestas que incluyan `empresaId` (serían `@@unique([id, empresaId])` + `references: [id, empresaId]`, inexistentes en el schema);
- la extensión no valida FK.

El cumplimiento de R11 es, hoy, **enteramente responsabilidad de cada call site**, con 3 de 4 sitios cumpliéndolo y 1 incumpliéndolo.

---

# 12. TRANSACTION ANALYSIS

9 transacciones interactivas + 2 por array `[C]`.

| Sitio | Cliente | Un solo tenant | Estado |
|---|---|---|---|
| `caja.service.ts:69, 172, 268` | `db` extendido | Sí | OK |
| `compras.service.ts:207, 297, 352` | `db` extendido | Sí | OK (pero ver X-08 dentro de `:352`) |
| `inventario.service.ts:225` | `db` extendido | Sí | OK |
| `pagos.service.ts:32` | `db` extendido | Sí | OK |
| `pedidos.service.ts:88` | `db` extendido | Sí | OK |
| `tienda.service.ts:221` | `db` extendido, `tx: EmpresaScopedTx` tipado | Sí | OK |
| `ventas.service.ts:153, 309` | `db` extendido | Sí | OK |
| `invitaciones.service.ts:118, 227` | **`this.prisma` crudo** (array form) | Sí — `empresaId` tomado de `invitacion.empresaId` | Ver sec. 13 |

**R12 — las transacciones conservan el Business Context:**

**CUMPLE por construcción, con una reserva de verificación.** Cada `$transaction` se abre sobre el cliente ya extendido con **un único `empresaId`**, capturado en el closure del service. No existe forma de cambiar de tenant dentro de una transacción: `forEmpresa` se invoca fuera y una sola vez. **No se encontró ninguna transacción que mezcle dos tenants** `[C]`.

**Cierre del `[ND]` de B1 sobre herencia de la extensión en `tx`:**
- **Evidencia de tipos:** el cliente generado declara `$transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => ...)` (`node_modules/.prisma/client/index.d.ts:493`). Sobre el cliente **extendido**, el `tx` entregado al callback conserva los tipos derivados de la extensión, y `ITXClientDenyList` solo excluye `$connect`/`$disconnect`/`$on`/`$transaction`/`$use`/`$extends` — **no** los hooks de query `[C]`.
- **Evidencia de comportamiento observable en el código:** `inventario.service.ts:12`, `compras.service.ts:16` y `tienda.service.ts:13` **derivan** su tipo `EmpresaScopedTx` del `$transaction` del cliente extendido, no del base, y el comentario de `inventario.service.ts:9-11` explica que se hace precisamente porque el tipo del `tx` extendido difiere del base. El código compila con ese tipo `[C]`.
- **Evidencia indirecta fuerte:** `tienda.service.ts:230-234` documenta que **dentro de `tx`** se evitó `upsert` porque *"empresaScopeExtension solo tiene manejo explícito para un set fijo de operaciones — upsert no está en esa lista y falla ruidoso"*. Es decir: el autor observó (o asumió sobre base real) que la extensión **sigue activa dentro de la transacción** `[C]`/`[D]`.

**Estado del `[ND]`:** se mantiene `[ND]` **para evidencia de ejecución** — no se corrió nada. Pero deja de ser una incógnita abierta: hay evidencia de tipos `[C]` y evidencia documental convergente `[D]` de que `$extends` se preserva en el `tx` interactivo en Prisma 5.22.0 (`apps/api/package.json:33`, instalado 5.22.0). **Esto es exactamente lo que un test de aislamiento debería confirmar `[T]`** y es la razón por la que ese test es prioritario en sec. 18.

---

# 13. BYPASS ANALYSIS

## 13.1 Superficie de bypass

`PrismaModule` exporta `PrismaService` además de la factory `[C]`. Cualquier módulo que lo importe puede inyectar el cliente sin scope. **29 archivos mencionan `PrismaService`; 15 usan `forEmpresa`.**

**46 llamadas a `this.prisma.<model>.<op>` con el cliente crudo**, concentradas en 3 áreas `[C]`:

| Área | Llamadas | Modelos tocados | Veredicto |
|---|---|---|---|
| `auth/*` (5 archivos) | 12 | Usuario, Cliente | **ACEPTADO — pre-contexto** |
| `invitaciones/*` (2) | 13 | Invitacion, Usuario, Cliente | **ACEPTADO — pre-contexto / con reserva** |
| `legajo/*` (3) | 21 | Legajo, DocumentoLegajo, Usuario, Cliente | **MITIGADO por los controllers** |

## 13.2 Análisis caso por caso

**`auth.service.ts:45`, `auth.controller.ts:48`, `auth.google.service.ts:36,45,51,67`, `auth.cliente.service.ts:36,44,61,92,98,104,110`, `auth.cliente.controller.ts:83`**
Lookups de identidad **antes de que exista un contexto de tenant**. El `empresaId` es el *resultado* del login, no una restricción previa. `Usuario.email` y `Cliente.googleId` son únicos globales por diseño. **Usar el cliente scoped acá es imposible por definición** (no hay `empresaId` todavía).
→ **ACEPTADO — pre-autenticación.** No es un bypass del aislamiento: es la operación que lo establece.

**`invitaciones.service.ts:38` (`usuario.findUnique({email})`), `:212`/`:94` (`invitacion.findUnique({token})`)**
Pre-contexto: el `token` secreto de 32 bytes (`crypto.randomBytes(32)`) **es** la credencial, y el `empresaId` se deriva del registro que identifica. `:43`/`:158`/`:165` sí filtran por `empresaId` a mano (recibido del `@CurrentUser()` del dueño).
→ **ACEPTADO**, con una reserva: `:38` comprueba la existencia del email **globalmente** (`findUnique({email})`), de modo que invitar un email ya usado en **otra** Empresa falla con "Ya existe una cuenta con el email X". Es consecuencia del `@unique` global de `Usuario.email` y es coherente con R8-ID-003 (identidad global), pero **filtra la existencia de una cuenta de otro tenant** a quien pueda crear invitaciones. Impacto: enumeración de emails, no acceso a datos. Severidad BAJA.

**`invitaciones.service.ts:118-131` y `:227-240` — `this.prisma.$transaction([...])` con cliente crudo**
Crean `Usuario`/`Cliente` tomando `empresaId: invitacion.empresaId`, es decir del registro ya identificado por el token. Un solo tenant. Al no pasar por la extensión, **el `empresaId` no se fuerza** — pero el valor usado es el correcto por construcción.
→ **MITIGADO por construcción.** Es, además, el sitio donde un `create` de modelo cubierto (`Usuario`, `Cliente`) ocurre **fuera** de la garantía R5.

**`legajo.service.ts:66-174` (11 llamadas)**
Opera por `usuarioId` / `clienteId` / `legajoId` **sin ningún chequeo de Empresa** `[C]`. `subirDocumento(legajoId, ...)` y `rutaAbsolutaDeDocumento(documentoId)` aceptan un ID arbitrario.
→ **MITIGADO por los controllers**, verificado uno por uno:
- `legajo.controller.ts:45,51,67` y `legajo.cliente.controller.ts:55,62,78` pasan **`user.id` del token** — nunca un ID del cliente. El tenant se deriva de la propia identidad.
- `legajo.controller.ts:145-152` (descarga de documento, el único que acepta un ID arbitrario) **sí valida**: `include: {legajo:{include:{usuario:true}}}` y rechaza con 404 si `documento.legajo.usuario?.empresaId !== user.empresaId` `[C]`.
- `subirDocumento` nunca recibe un `legajoId` del cliente: siempre el de `obtenerOCrearDeUsuario(user.id)` / `obtenerOCrearDeCliente(user.id)`.

**Reserva real:** `rutaAbsolutaDeDocumento` es `public` y no valida nada; su seguridad depende por completo de que **todo** llamador futuro repita el chequeo de `legajo.controller.ts:149`. Hoy hay un solo llamador y lo hace. Severidad MEDIA — fragilidad, no vulnerabilidad.

**`legajo.controller.ts:85` / `:108` / `legajo.cliente.controller.ts:99` / `:123`** — `usuario.findMany`/`findFirst` y `cliente.findMany`/`findFirst` con `empresaId: user.empresaId` **escrito a mano** `[C]`. Correcto, pero sin la red de la extensión.

**`legajo.controller.ts:123` / `legajo.cliente.controller.ts:135`** — ver X-06.

**`health.controller.ts:15`** — `$queryRaw` con `SELECT 1`. Sin modelo, sin datos. **No aplica.**

**`prisma/seed.ts`, `migrate-categoria-a-jerarquia.ts`, `sync-permisos-owner.ts`** — scripts offline con `new PrismaClient()`. **Correcto y esperado**: el seed debe poder crear datos de varias Empresas (de hecho crea dos). Fuera del plano de request. **No es bypass.**

## 13.3 Background jobs

**No existen** `[C]`. Búsqueda de `@Cron`, `ScheduleModule`, `@Interval`, `setInterval`, `setTimeout`, `Bull`, `Queue`, `EventEmitter`, `@OnEvent`: **cero coincidencias** en `apps/api/src`. No hay superficie de ejecución fuera del ciclo de request, y por lo tanto no hay operaciones Business-scoped sin un `@CurrentUser()` que las origine (salvo tienda/invitaciones, ya analizados).

## 13.4 R14 — veredicto

**NO CUMPLE como garantía; CUMPLE como estado de hecho.** Existe un bypass directo **alcanzable** (`PrismaService` exportado e inyectable, 46 usos reales), y ninguno de los 46 produce hoy un cruce entre tenants. La diferencia entre "no hay bypass" y "los bypasses que hay están bien escritos" es exactamente lo que R8-ARCH-002 §5 señala como pendiente de resolver antes de considerar el mecanismo implementation-ready.

---

# 14. AS-IS GAP MATRIX

| ID | Área | AS-IS | Regla / TO-BE | GAP | Severidad | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| **G-B3-01** | Cobertura de modelos | `PagoProveedor` y `DevolucionProveedor` tienen `empresaId` y **no están** en `MODELOS_CON_EMPRESA_ID`; el cast `as ...UncheckedCreateInput` suprime el error de tipos | R6/R7/R8 por mecanismo | 2 modelos con columna sin scope automático | **ALTA** (estructural; mitigada por `getCompra` previo) | `empresa-scope.extension.ts:32-68` vs `schema.prisma:1061,1082`; `compras.service.ts:271,298,327,353` `[C]` | ABIERTO |
| **G-B3-02** | Ownership derivado | 12 modelos sin `empresaId` (10 derivados + 2 AMBIGUOUS) sin scope; "heredan por disciplina" | R6/R7/R8/R9 | sin mecanismo de derivación; `Legajo`/`DocumentoLegajo` sin tenant inequívoco (2 ramas FK opcionales) | **ALTA** (diseño) | sec. 6.C `[C]` | **REQUIERE B3 CONTRACTS** |
| **G-B3-03** | Autoridad del contexto | el claim JWT es la autoridad; nunca se revalida; no existe Membership; `activo` solo al login | R1/R2/R3 | no hay Membership ni revalidación por request | **ALTA** | `jwt.strategy.ts:23-34` `[C]` | **REQUIERE B1/B3 CONTRACTS** (ya identificado en B1) |
| **G-B3-04** | Nested writes | la extensión solo mira `args.data`/`args.where` de nivel superior | R10/R11 | nested create/connect e `include` sin inspección | **ALTA** (mecanismo) | `:113-134` `[C]` | ABIERTO |
| **G-B3-05** | FK cross-tenant persistida | `crearDevolucion` persiste `productoId`/`loteId` del DTO sin validar pertenencia; el docstring afirma lo contrario | R11 | **único punto con dato cruzado efectivamente persistible** | **ALTA** | `compras.service.ts:343-398` `[C]` | ABIERTO |
| **G-B3-06** | `findUnique` | validación **post**-query; depende de que el resultado traiga `empresaId`; sin `@@unique([id, empresaId])` | R9 | la fila del otro tenant se lee antes de descartarse; latente si algún `select` omitiera `empresaId` (sin uso actual) | **MEDIA** | `:136-159` `[C]` | ACEPTADO con reserva |
| **G-B3-07** | Bypass alcanzable | `PrismaModule` exporta `PrismaService`; 46 usos crudos reales | R14 | el aislamiento es opt-in por call site; nada detecta la omisión | **MEDIA** | `prisma.module.ts:6-8`; sec. 13 `[C]` | ABIERTO |
| **G-B3-08** | Raw SQL | `$executeRaw` no pasa por la extensión; el único uso filtra a mano | R14 | sin red de contención para raw futuro | **BAJA** | `inventario.service.ts:259-271` `[C]` | ACEPTADO con reserva |
| **G-B3-09** | Verificación negativa | **0 tests de aislamiento**; `seed.ts` ya crea la segunda Empresa (`empresaAislamiento`, 10 referencias) y **ningún test la usa** | ARCH-002 §3.12 (cross-Business cubierto por verificación negativa) | la propiedad canónica 12 no tiene **ninguna** cobertura | **ALTA** | único spec: `health.controller.spec.ts`; `seed.ts:69,177,191-216` `[C]` | ABIERTO |
| **G-B3-10** | Atomicidad de la verificación | `findFirst`(scoped) → `update`(crudo, por `id`) en 2 queries | R7 | patrón no atómico; correcto hoy porque un registro no cambia de Empresa | **BAJA** | `legajo.controller.ts:108+123`; `legajo.cliente.controller.ts:123+135` `[C]` | ACEPTADO |
| **G-B3-11** | Únicos globales | `Venta.idempotencyKey` y `Cliente.googleId` `@unique` sin `empresaId` | R9 | `idempotencyKey`: **sin fuga** (cortado por post-query validation) pero una clave de A impide reusarla en B — colisión de negocio entre tenants. `googleId`: correcto (identidad global) | **MEDIA** (`idempotencyKey`) / BAJA (`googleId`) | `schema.prisma:663,488`; `ventas.service.ts:117` `[C]` | ABIERTO (`idempotencyKey`) |
| **G-B3-12** | Documentación del mecanismo | el docstring dice "21 modelos" (son 26) y su lista de derivados omite `DevolucionProveedorItem`, `PedidoItem`, `UsuarioPermiso` | trazabilidad | el comentario no refleja el schema | **BAJA** | `empresa-scope.extension.ts:20-30` `[C]` | ABIERTO |
| **G-B3-13** | Superficie futura de R4 | R4 cumple **por ausencia** de selector de tenant; no hay defensa activa porque nunca hizo falta | R4 + ARCH-003 §9 (business switching) | al introducir switching, la superficie se crea desde cero sin defensa preexistente | **MEDIA** (prospectiva) | sec. 9 `[C]` | **REQUIERE B3 CONTRACTS** |

---

# 15. PRESERVATION / ADAPTATION / NEW MATRIX

Conforme a R8-ARCH-002 §5 (el mecanismo actual es **ADAPTED**, no reemplazado; ningún componente se elimina por esa decisión).

| Componente AS-IS | Clasificación | Fundamento |
|---|---|---|
| `empresaScopeExtension` — patrón de inyección en `where` (9 ops) | **PRESERVE** | Satisface R6/R7/R8 por mecanismo. Base de migración válida |
| `empresaScopeExtension` — forzado de `empresaId` en `create`/`createMany` | **PRESERVE** | Satisface R5 y da defensa en profundidad para R4 |
| `empresaScopeExtension` — **fail-closed** en operaciones no contempladas | **PRESERVE** | Mejor propiedad del AS-IS. Satisface R13 a nivel de operación y ya moldea el código llamador |
| `empresaScopeExtension` — lista explícita de modelos | **ADAPT** | El principio (allow-list explícita) es correcto; el contenido está incompleto (G-B3-01) y debe derivarse del schema, no mantenerse a mano |
| `empresaScopeExtension` — validación post-query de `findUnique` | **ADAPT** | Correcta en resultado; debe endurecerse para no depender de que el resultado traiga `empresaId` (G-B3-06) |
| `empresaScopeExtension` — ausencia de inspección de nested writes | **NEW** | No existe. R10/R11 requieren mecanismo nuevo (G-B3-04) |
| Validación de FK cross-tenant | **NEW** | No existe en ninguna capa (G-B3-05, sec. 11.3) |
| `EmpresaScopedPrismaService.forEmpresa(empresaId)` — factory singleton | **ADAPT** | La decisión de no usar `Scope.REQUEST` está fundada y verificada `[D]`; **preservar ese fundamento**. Adaptar la firma: el contexto debe venir de un Business Context autoritativo, no de un `string` que el caller elige (G-B3-03) |
| `PrismaService` exportado por `PrismaModule` | **ADAPT** | Necesario para auth/pre-contexto. Debe dejar de ser inyectable indistintamente desde cualquier módulo de dominio (G-B3-07) |
| Scope derivado de modelos hijos | **NEW** | Hoy es disciplina. R6-R9 sobre los 12 modelos derivados requieren mecanismo (G-B3-02) |
| Tenant de `Legajo` / `DocumentoLegajo` | **NEW** | AMBIGUOUS por diseño (2 ramas FK opcionales). Requiere definición en B3 CONTRACTS |
| `empresaId` como columna en 28 modelos | **PRESERVE (transicional)** | Coherente con R8-ID-003: dato transicional, sin limpieza destructiva ahora |
| Autoridad del contexto (claim JWT sin revalidar) | **NEW** | R1/R2/R3 requieren Membership + revalidación. No hay nada que adaptar (G-B3-03) |
| Lookups pre-contexto en `auth*` con cliente crudo | **PRESERVE** | Correctos por definición: establecen el contexto, no lo consumen |
| `TIENDA_EMPRESA_ID` como tenant de la tienda pública | **ADAPT** | Resuelve R13 con fail-explícito y es honesto sobre su límite (el propio comentario dice que multi-tienda sería un rediseño aparte). Debe revisarse al introducir multi-Business |
| Fixture `empresaAislamiento` del `seed.ts` | **PRESERVE** | Ya existe la segunda Empresa con catálogo completo. Es el punto de partida listo para la verificación negativa de ARCH-002 §3.12 |
| Tests de aislamiento | **NEW** | No existe ninguno (G-B3-09) |

---

# 16. EVIDENCE INDEX

**Clases presentes:** `[C]` y `[D]`. **Ausentes: `[T]` y `[E]`** — no hay tests de aislamiento y no se ejecutó nada.

## `[C]` — verificado por código

| Ref | Archivo | Líneas / símbolo | Qué acredita |
|---|---|---|---|
| C-01 | `apps/api/src/prisma/empresa-scope.extension.ts` | 32-68 `MODELOS_CON_EMPRESA_ID` | 26 modelos en la allow-list |
| C-02 | idem | 82-94 | sets de operaciones soportadas |
| C-03 | idem | 109-111 | modelos fuera de la lista pasan sin filtro |
| C-04 | idem | 113-116 | solo `args.where` / `args.data` top-level |
| C-05 | idem | 118-129 | `create`/`createMany` fuerzan `empresaId` (R5, R4) |
| C-06 | idem | 131-134 | inyección en `where` (R6/R7/R8) |
| C-07 | idem | 136-159 | post-query validation de `findUnique` (R9) |
| C-08 | idem | 164-166 | **fail-closed** (R13) |
| C-09 | idem | 20-30, 62-66 | docstring desactualizado (G-B3-12) |
| C-10 | `empresa-scoped-prisma.service.ts` | 34-41 | factory singleton; `empresaId` por parámetro |
| C-11 | `prisma.module.ts` | 6-8 | `PrismaService` exportado → bypass alcanzable |
| C-12 | `prisma.service.ts` | 4-8 | `PrismaClient` sin extensión |
| C-13 | `apps/api/prisma/schema.prisma` | 42 modelos; 28 con `empresaId` | inventario (sec. 6) |
| C-14 | idem | 1061, 1082 | `PagoProveedor` / `DevolucionProveedor` con `empresaId` |
| C-15 | idem | 663, 488 | `idempotencyKey`, `googleId` únicos globales |
| C-16 | idem | 283-917 | `@@unique` compuestos: ninguno es `[id, empresaId]` |
| C-17 | idem | 1100-1111 | `DevolucionProveedorItem` sin `empresaId`, FK a Producto/Lote |
| C-18 | idem | 520-523 | `Legajo.usuarioId`/`clienteId` ambos `@unique` opcionales → AMBIGUOUS |
| C-19 | `auth/jwt.strategy.ts` | 23-34 | `validate()` no consulta la base (G-B3-03) |
| C-20 | `auth/auth.types.ts` | 17-36 | `empresaId` en el payload |
| C-21 | `auth/guards/jwt-auth.guard.ts` | 19-34 | guard global, `@Public()` como excepción |
| C-22 | `compras.service.ts` | 343-398 `crearDevolucion` | **FK sin validar (G-B3-05 / X-08)**; docstring contradictorio en 323-331 |
| C-23 | idem | 271, 298, 327, 353 | 4 ops sobre modelos no cubiertos, precedidas por `getCompra` |
| C-24 | idem | 16 | `EmpresaScopedTx` derivado del cliente extendido |
| C-25 | `ventas.service.ts` | 117-120 | `findUnique({idempotencyKey})` — **cierra el `[ND]` de B1 (X-03)** |
| C-26 | idem | 170-183 + `resolverItems` | nested create **con** validación scoped previa |
| C-27 | `tienda.service.ts` | 38-49 | tenant por env var; **fail-explícito** si falta |
| C-28 | idem | 221-240 | `findFirst`+`create/update` en vez de `upsert` **por el fail-closed** |
| C-29 | idem | 158-163, 265-273 | nested create con validación previa |
| C-30 | `inventario.service.ts` | 259-271 | `$executeRaw` parametrizado con `empresaId` en el `WHERE` |
| C-31 | `legajo.controller.ts` | 145-152 | descarga valida `empresaId` vía `legajo.usuario` |
| C-32 | idem | 108 + 123 | `findFirst` scoped → `update` crudo (X-06) |
| C-33 | `legajo.cliente.controller.ts` | 123 + 135 | idem |
| C-34 | `legajo.service.ts` | 66-174 | 11 ops crudas sin chequeo de empresa; `rutaAbsolutaDeDocumento` pública sin validación |
| C-35 | `invitaciones.service.ts` | 118-131, 227-240 | `$transaction` con cliente crudo; `empresaId` del registro |
| C-36 | idem | 38 | `usuario.findUnique({email})` global → enumeración entre tenants |
| C-37 | `autorizaciones.service.ts` | 62, 69 | chequeo explícito de empresa; `usuarioPermiso` sin scope efectivo (X-16) |
| C-38 | `caja.service.ts` | 132-136, 214 | FK validada con lectura scoped previa |
| C-39 | `usuarios.controller.ts` | 25-27 | usa `forEmpresa(user.empresaId)` |
| C-40 | grep `*.dto.ts` | 0 coincidencias de `empresaId` | R4 (sec. 9) |
| C-41 | grep `@Param/@Query/@Headers` | 0 coincidencias de `empresaId`; `@Headers` sin uso | R4 |
| C-42 | grep `@Cron`/`Queue`/`setInterval`/`EventEmitter` | 0 coincidencias | sin background jobs (sec. 13.3) |
| C-43 | grep `.upsert(` / `.groupBy(` | 0 usos en `src` | consistente con el fail-closed |
| C-44 | grep `.delete(` / `.deleteMany(` | 0 usos en los services auditados | X-07 |
| C-45 | `find *.spec.ts` | único: `health.controller.spec.ts` | **0 tests de aislamiento (G-B3-09)** |
| C-46 | `prisma/seed.ts` | 69, 177, 191-216 | **segunda Empresa `empresaAislamiento` con catálogo, sin test que la use** |
| C-47 | `node_modules/.prisma/client/index.d.ts` | 493, 4504 | firma de `$transaction`; `ITXClientDenyList` no excluye hooks de query (sec. 12) |
| C-48 | `apps/api/package.json` | 33 | `@prisma/client` ^5.22.0 (instalado: 5.22.0) |

## `[D]` — documentado

| Ref | Fuente | Qué acredita |
|---|---|---|
| D-01 | `03-DECISIONS/28-R8-ARCH-002-...md` §1, §3, §5, §7 | decisión application-level; 12 propiedades; AS-IS = ADAPTED; invariante de seguridad |
| D-02 | `07-DESIGN/ARCHITECTURE/04-R8-ARCH-002-...md` §2-3 | mecanismo AS-IS y sus límites ya documentados |
| D-03 | `07-DESIGN/CONTRACTS/DOMAIN/08-R8-ARCH-003-...v0.1.md` §5, §9, §12 | contrato CTX-001..006; business switching; interacción con tenant isolation |
| D-04 | `13-AUDIT/21-BLOCK-1-...-2026-10-04.md` §7-8 | audit B1; este informe confirma sus hallazgos y cierra 2 `[ND]` |
| D-05 | `empresa-scoped-prisma.service.ts` 9-20 + `jwt-auth.guard.ts` 6-18 | fundamento de descartar `Scope.REQUEST`, verificado contra servidor real según el comentario (no reproducido acá) |
| D-06 | `empresa-scope.extension.ts` 3-31, 76-81 | justificación de Client Extension sobre RLS y de la imposibilidad de inyectar en `findUnique` |

## `[ND]` — no determinable

| Ref | Qué | Por qué |
|---|---|---|
| ND-01 | Que `$extends` siga activo en el `tx` interactivo **en ejecución** | Hay evidencia de tipos `[C]` (C-47) y documental convergente `[D]` (C-28), pero no se ejecutó. Es el test más prioritario (sec. 18) |
| ND-02 | Efecto real de un `empresaId` firmado inexistente | Esperado: lecturas a 0 filas, violación de FK en `create`. No ejecutado |
| ND-03 | Comportamiento de Postgres ante la FK cruzada de X-08 | La FK **se satisface** (el ID existe); lo que no se verificó por ejecución es el estado final persistido |
| ND-04 | Si existen más call sites en `pedidos`/`fidelizacion`/`clientes` no leídos línea por línea | Se verificaron sus `forEmpresa` y `findUnique`; no su cuerpo completo |

---

# 17. READINESS ASSESSMENT

**Contra las 14 reglas canónicas:**

| Regla | Veredicto | Soporte |
|---|---|---|
| R1 — contexto antes de la operación | **PARCIAL** — se asume del claim, no se establece | sec. 8 |
| R2 — contexto ↔ Membership | **NO CUMPLE** — no existe Membership | G-B3-03 |
| R3 — INACTIVE no opera | **NO CUMPLE** — `activo` solo al login | G-B3-03 |
| R4 — el cliente no sobrescribe el tenant | **CUMPLE** (por ausencia de superficie + defensa en `create`) | sec. 9, G-B3-13 |
| R5 — CREATE asigna desde el contexto | **CUMPLE** en los 26 cubiertos; no en los 2 de G-B3-01 ni en los `create` crudos de invitaciones | sec. 7 |
| R6 — READ restringido | **CUMPLE** en los 26; **no** en los 2 + 12 derivados | G-B3-01, G-B3-02 |
| R7 — UPDATE no cruza | **CUMPLE** en los 26; X-06 mitigado por orden | G-B3-01, G-B3-10 |
| R8 — DELETE no cruza | **CUMPLE** (y no hay deletes) | X-07 |
| R9 — únicos no exponen otro Business | **CUMPLE con reserva** — post-query validation; latente si un `select` omitiera `empresaId` | G-B3-06, G-B3-11 |
| R10 — nested writes preservan ownership | **NO CUMPLE como mecanismo** | G-B3-04 |
| R11 — FK cross-Business se rechaza | **NO CUMPLE** — ninguna capa la valida; 1 sitio la persiste | G-B3-05 |
| R12 — transacciones conservan el contexto | **CUMPLE por construcción**, pendiente de `[T]`/`[E]` | sec. 12, ND-01 |
| R13 — falla cerrado | **CUMPLE a nivel de operación** (fail-closed real); **PARCIAL** a nivel de contexto (un `empresaId` inválido no se valida) | sec. 7.1, 8 |
| R14 — sin bypass directo | **NO CUMPLE como garantía** — bypass alcanzable con 46 usos; ninguno cruza tenants hoy | sec. 13 |

**Síntesis.** No es un sistema sin aislamiento, ni un sistema con aislamiento garantizado. Es un aislamiento **de aplicación, opt-in por call site, con un núcleo sólido** (inyección en `where`, forzado en `create`, fail-closed) **y un perímetro que depende de disciplina** (12 modelos derivados, nested writes, FK, 46 usos del cliente crudo). De los 17 vectores analizados, **uno** (X-08 / G-B3-05) persiste datos cruzados; el resto está contenido, aunque un tercio lo está por orden de llamadas y no por mecanismo.

Las reglas incumplidas se reparten en dos clases, y la distinción importa para B3:
- **brechas de código**, resolubles sin decisión de Owner: G-B3-01, G-B3-05, G-B3-12 (y G-B3-09, que es trabajo de test);
- **vacíos de diseño**, que B3 CONTRACTS debe cerrar: G-B3-02 (ownership derivado, incluido el caso AMBIGUOUS de Legajo), G-B3-03 (autoridad del contexto / Membership), G-B3-04 (mecanismo de nested writes), G-B3-13 (defensa de R4 ante business switching).

Ninguna de las dos clases contradice R8-ARCH-002: §5 ya clasificó el mecanismo como ADAPTED y §6 ya enumeró como abiertos exactamente estos puntos (ownership directo/indirecto, nested, unique lookups, transacciones, contexto ausente, migración). **Este audit confirma esa lista contra el código y la cuantifica.**

**Owner Decisions:** **NINGUNA REQUERIDA.** Verificado contra R8-ARCH-002 (mecanismo y 12 propiedades: decidido), R8-MASTER (closure), R8-ID-003 (`empresaId` como dato transicional, coexistencia), R8-AUTH-001 (catálogo de permisos) y B1 contracts (CTX-001..006). **No se encontró ninguna contradicción real** entre el AS-IS y la autoridad vigente: lo que falta está declarado abierto como trabajo de especificación downstream, no como alternativa a decidir. No se abre ninguna decisión nueva.

## VEREDICTO

**READY WITH RECONCILIATION**

Procede a B3 CONTRACTS. La reconciliación requerida antes de cerrar los contratos:

1. **Reconciliar el inventario de modelos** con el schema: G-B3-01 (2 modelos con columna fuera de la allow-list) y G-B3-12 (docstring que dice 21 y omite 3 derivados). Es divergencia código↔schema, no diseño.
2. **Clasificar los 12 modelos sin `empresaId`** según GLOBAL / DIRECT / DERIVED / AMBIGUOUS (sec. 6.C ya propone la clasificación) y resolver explícitamente `Legajo`/`DocumentoLegajo`, el único caso AMBIGUOUS.
3. **Registrar G-B3-05 como defecto de código conocido** antes de contratar R11 — con la nota de que su docstring afirma una validación inexistente.
4. **Tomar nota de que R4 cumple por ausencia de superficie** (G-B3-13), para que el contrato de business switching no herede una falsa sensación de cobertura.

No bloquea porque: el mecanismo AS-IS es una base de migración válida y ya clasificada ADAPTED por decisión cerrada; los gaps están identificados con evidencia de código; no hay ninguna Owner Decision pendiente; y ningún gap contradice la autoridad vigente.

**No se declara B3 implementado.** No se modificó código, schema, migraciones ni documentos canónicos. No se hizo commit ni deploy.

---

# 18. RECOMMENDED NEXT STEP

**Siguiente etapa: B3 CONTRACTS** (sin Owner Decisions intermedias — sec. 17).

Entradas que B3 CONTRACTS debe resolver, en orden de dependencia:

1. **Contrato de autoridad del Business Context** (G-B3-03). Depende de B1: el contrato CTX-001..006 de R8-ARCH-003 ya define el TO-BE; B3 debe especificar cómo la capa de persistencia lo **consume** en lugar de recibir un `string` que el caller elige.
2. **Contrato de ownership: directo vs derivado** (G-B3-02). Debe cubrir los 3 grupos de la sec. 6 y resolver `Legajo`/`DocumentoLegajo`. Es el bloqueante de R6-R9 sobre 14 de 42 modelos.
3. **Contrato de nested writes y FK** (G-B3-04, G-B3-05, R10/R11). Hay un patrón correcto ya aplicado en 3 de 4 nested writes del código (lectura scoped previa de la FK, sec. 11.2) — candidato natural a formalizar.
4. **Contrato de unique lookups** (G-B3-06, G-B3-11). Incluye decidir si `Venta.idempotencyKey` debe pasar a `@@unique([empresaId, idempotencyKey])`, y si la validación de `findUnique` debe dejar de depender de que el resultado traiga `empresaId`.
5. **Contrato de transacciones** (R12). Formalizar el invariante "un `$transaction` opera bajo exactamente un Business Context", que el AS-IS ya cumple por construcción.
6. **Contrato de frontera del bypass** (G-B3-07). Qué puede usar el cliente sin scope (auth/pre-contexto, scripts offline) y qué no, de forma verificable y no por disciplina.

**Antes o en paralelo — la acción de mayor relación valor/costo del AS-IS:**

**Cerrar ND-01 y G-B3-09 con una verificación negativa.** El `seed.ts` **ya crea** la segunda Empresa (`empresaAislamiento`) con Familia/Subfamilia/Tipo/Subtipo y catálogo propio, y **ningún test la consume** `[C]`. La fixture que exige ARCH-002 §3.12 está construida y sin usar. Un conjunto reducido de tests sobre ella convertiría en `[T]`/`[E]` las cuatro propiedades que hoy son `[C]` por lectura o `[ND]`:

- que el `tx` interactivo conserve la extensión (**ND-01**, hoy la única incógnita de mecanismo relevante);
- que `findUnique` cross-tenant devuelva `null` / `P2025` (R9, G-B3-06);
- que `upsert`/`groupBy` fallen cerrado (R13, la mejor propiedad del AS-IS, hoy sin test);
- que X-08 sea reproducible (G-B3-05), fijando el defecto antes de contratar R11.

Esto no es implementación de B3: es verificación del AS-IS, y es lo que permitiría que B3 CONTRACTS se escriba sobre comportamiento medido en vez de comportamiento leído.

**Secuencia:** `B3 AS-IS (este informe)` → `B3 CONTRACTS` → `B3 INVARIANTS` → `B3 TESTS/EVALS`.
