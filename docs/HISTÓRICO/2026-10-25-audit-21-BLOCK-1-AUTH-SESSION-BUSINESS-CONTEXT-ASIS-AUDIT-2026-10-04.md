# WAPSELL — BLOQUE 1 — AUDITORÍA AS-IS: AUTHENTICATION / SESSION / ACTIVE BUSINESS CONTEXT

**Estado:** AUDITORÍA TÉCNICA READ-ONLY — NO CANÓNICO — NO APROBADO
**Fecha:** 2026-10-04
**Repo auditado:** `apps/api` (+ grep de `apps/pos-admin` y `apps/tienda-online`), commit base `8862a1c`
**Autoridad usada (no reinterpretada):** R8-ARCH-001, R8-ARCH-002, R8-ARCH-003, R8-AUTH-001, R8-ID-003
**Alcance de la acción:** sin cambios de código, schema, migraciones, documentos canónicos, commits ni deploys. No se ejecutó ningún test ni la API.

**Clases de evidencia:** `[C]` verificado por código (archivo + símbolo + línea). `[D]` documentado. `[ND]` no determinable con la información disponible. No existe evidencia por test (`[T]`) ni por ejecución (`[E]`).

**Límites de cobertura:**
- Leídos completos: `src/auth/**`, `app.module.ts`, `main.ts`, capa Prisma, `legajo*`, `invitaciones.service`, `autorizaciones.service`, `compras.service` (pagos y devoluciones), y partes citadas de `tienda`, `clientes`, `usuarios`, `caja`.
- NO leídos línea por línea: `ventas`, `pedidos`, `caja` (service), `inventario`, `pagos`, `fidelizacion`, `tienda.service` (más allá de la línea 140).
- Frontends: solo por grep. `seed.ts`: solo por grep.

---

# 1. EXECUTIVE SUMMARY

El código real es un ERP mono-negocio. Hoy no existe ningún modelo Business/User/Membership/Role. Hay un único `Empresa`, un `Usuario` con un solo `empresaId` y un `Cliente` con login propio `[C]`. La autoridad efectiva sobre el contexto de negocio y los permisos es el contenido del JWT, que nunca se revalida contra la base `[C]`.

Hallazgos que condicionan el primer slice:

1. **Un Cliente puede operar en endpoints internos.**
   - `POST /auth/cliente/registro` es público y emite un JWT con `type:'cliente'`, `permisos:[]` y el `empresaId` de la tienda `[C]`.
   - Ese token pasa `JwtAuthGuard`, `PermissionsGuard` y `LegajoAprobadoGuard`.
   - Todo endpoint sin `@RequierePermiso` solo exige "token válido" y no comprueba `type`.
   - Ejemplos con `user.empresaId`: `GET /clientes`, `GET /clientes/:id` (fila completa de Cliente, sin `select`), `GET /usuarios`, `GET /caja/estado`.
   - Cualquier visitante anónimo de la tienda llega a datos internos de su misma Empresa. No es cruce entre tenants, pero rompe el límite Customer ≠ Membership.
   - No se ejecutó: se concluye de la lectura de guards y controllers.
2. **Los permisos viajan en el JWT** (8 h, sin refresh, sin revocación, sin logout en backend) y `PermissionsGuard` solo hace `user.permisos.includes(...)` `[C]`. No hay revalidación de Membership, de `activo` ni de permisos. Solo `AutorizacionesService` consulta permisos en la base.
3. **El aislamiento por tenant es una Prisma Client Extension, a nivel de aplicación** (coherente con R8-ARCH-002), con huecos verificados:
   - cubre 26 de 28 modelos con `empresaId` directo; `PagoProveedor` y `DevolucionProveedor` quedan fuera;
   - no cubre los 14 modelos sin `empresaId` directo;
   - no inspecciona nested writes;
   - `PrismaService` sin scope se usa directamente en auth, invitaciones y legajo.
4. **Hay escrituras que aceptan IDs de otro tenant.** En `ComprasService.crearDevolucion` los `productoId` y `loteId` del DTO se persisten sin validar pertenencia.
5. **Cualquier Usuario puede aprobar legajos de Clientes mayoristas.** `PATCH /legajo/cliente/:id/aprobar` y `GET /legajo/cliente/pendientes` solo comprueban `type==='usuario'`, sin `@RequierePermiso` `[C]`.
6. **Google login vincula por email sin chequeo de email verificado.** No hay ninguna referencia a `email_verified` en `src/auth` `[C]`.
7. **No hay tests de auth ni de tenant.** El único spec es `health.controller.spec.ts`. `package.json` referencia `test/jest-e2e.json`, pero `apps/api/test` no existe `[C]`.

**Veredicto del primer slice: BLOCKED** para garantizar el límite de seguridad (sec. 14). No se declara "implementation ready".

---

# 2. AUTHENTICATION AS-IS

| Componente | Archivo | Función actual | Dependencias | Evidencia | Estado |
|---|---|---|---|---|---|
| Login Usuario email+password | `auth/auth.service.ts` `verificarCredenciales` (42–64) | Rechaza usuario inexistente, inactivo o sin password con mensaje uniforme; bcrypt compare | PrismaService, bcryptjs | `[C]` | ADAPTAR |
| Emisión de sesión Usuario | `auth.service.ts` `emitirSesion` (75–103) | Arma `JwtPayload` y firma | JwtService | `[C]` | ADAPTAR |
| Login Cliente | `auth/auth.cliente.service.ts` `login` (60–76) | `findFirst({empresaId,email})` con `empresaId` de `TIENDA_EMPRESA_ID` | env var | `[C]` | TRANSICIONAL |
| Registro público Cliente | `auth.cliente.controller.ts` `registro` (`@Public`); `auth.cliente.service.ts` `registrar` (35–58) | Crea Cliente minorista y emite JWT en el acto | `TIENDA_EMPRESA_ID` | `[C]` | OPEN (ver sec. 12) |
| Invitaciones (alta de Usuario) | `invitaciones/invitaciones.service.ts` `crear`/`activar` (37–142) | Token de 7 días; `activar` crea Usuario con `rol` de la invitación y `estadoLegajo=PENDIENTE` | AuthService, EmailService | `[C]` | ADAPTAR |
| Guard global de autenticación | `auth/guards/jwt-auth.guard.ts`, registrado en `app.module.ts:53` | Exige JWT salvo `@Public` | Passport | `[C]` | PRESERVAR |
| Guard global de permisos | `auth/guards/permissions.guard.ts` (20–38), `app.module.ts:54` | Chequeo contra el array del token | Reflector | `[C]` | ADAPTAR |
| MFA | — | No existe | — | `[C]` ausencia en `src/auth` | NUEVO NECESARIO |
| Rate limiting / lockout | — | No hay Throttler ni equivalente en `app.module.ts`, `main.ts` ni `package.json` | — | `[C]` ausencia | NUEVO NECESARIO |
| Email único global | `schema.prisma:152` (`Usuario.email @unique`) | Un email = una identidad global de Usuario | — | `[C]` | PRESERVAR (alineado con "global User") |

Notas:
- `Cliente` no es global: `@@unique([empresaId,email])` en `schema.prisma:505`; `googleId @unique` es global en la línea 488.
- El comentario de `registrar` afirma que falla si el email existe como `Usuario`. El código solo consulta `Cliente` (36–38). Desajuste doc/código `[C]`.

---

# 3. JWT AS-IS

| Aspecto | AS-IS | Evidencia |
|---|---|---|
| Generación | Solo en `AuthService.emitirSesion` y `AuthClienteService.emitirSesionCliente` | `auth.service.ts:88`, `auth.cliente.service.ts:133+` `[C]` |
| Claims Usuario | `sub, email, nombre, empresaId, permisos[], rol, estadoLegajo, type:'usuario'` | `auth.service.ts:76–86` `[C]` |
| Claims Cliente | Igual, con `permisos:[]`, `rol:'OWNER'` como placeholder, `estadoLegajo` (null → 'APROBADO'), `type:'cliente'` | `auth.cliente.service.ts:144–157` `[C]` |
| Firma | `JwtModule.register({secret: process.env.JWT_SECRET})`; mismo secreto para Usuario y Cliente. Algoritmo: default de `@nestjs/jwt` (no fijado explícitamente) | `auth.module.ts:19`, `auth.types.ts:31` `[C]` |
| Validación | `passport-jwt` con `ignoreExpiration:false`; `validate()` devuelve el payload sin consultar la base; `type` default `'usuario'` para tokens viejos | `jwt.strategy.ts:17–32` `[C]` |
| Consumo | `@CurrentUser()` → `user.empresaId`, `user.id`, `user.rol`, `user.permisos` en controllers | greps `[C]` |
| `empresaId` es autoridad | Sí: único origen del scope en los controllers leídos | `[C]` |
| Roles / permisos son autoridad | `permisos[]` sí (`PermissionsGuard`); `rol` se usa para el legajo, no como autorización | `[C]` |
| Duración | 8 h | `auth.module.ts:20` `[C]` |
| Refresh | No existe (el comentario lo admite) | `auth.module.ts:20` `[C]` |
| Revocación | No existe; `auth.types.ts` documenta que un permiso revocado no se refleja hasta el próximo login | `[C]` |
| Logout (backend) | No existe endpoint | `[C]` ausencia |
| Storage (frontend) | pos-admin: `localStorage` (con "Recordarme") o `sessionStorage`, clave `accessToken`. tienda-online: `localStorage`, clave `orm_cliente_token` | `pos-admin/src/lib/api.ts:75`, `AuthContext.tsx:21,42,64`; `tienda-online/.../AuthContext.tsx:16,40` `[C]` |
| Transporte | Header `Authorization: Bearer` | `pos-admin/src/lib/api.ts:81`, `tienda-online/src/lib/api.ts:37` `[C]` |
| Transporte en Google | Token en query string del redirect (`?token=`) | `auth.controller.ts:108–110` `[C]` |
| Logout (frontend) | Solo borra el storage local; el token sigue válido hasta expirar | `[C]` inferido del código del frontend y de la ausencia de revocación |

Comparación con R8-ARCH-003: el JWT actual autentica **y** autoriza (permisos y empresa embebidos). Eso contradice "JWT alone does not authorize access to a Business". Es una contradicción de diseño, no un bug. Claims, refresh, revocación y logout siguen OPEN en el TO-BE.

---

# 4. SESSION AS-IS

- **Sesión sin estado en el servidor.** No hay tabla de sesiones, dispositivos ni tokens revocables `[C]` (grep del schema y de `src/auth`).
- **"Sesión" frontend.** `/auth/me` devuelve el perfil fresco de la base, pero `permisos` sigue saliendo del JWT. `ProtectedRoute` no revalida el token por navegación `[C]`.
- **Contexto de negocio activo.** No existe selección ni cambio: la Empresa es la del token. No hay Business Switch `[C]`.
- **Multi-dispositivo.** No hay modelo de dispositivo `[C]` ausencia.
- **Expiración en frontend.** El comentario de `pos-admin/.../AuthContext.tsx:53` dice que no se fuerza logout ante token inválido o expirado `[C]`.

Gap contra R8-ARCH-003: login, logout, refresh, revocación y gestión de dispositivos son OPEN en el TO-BE y no existen en AS-IS. No hay nada que preservar salvo el transporte Bearer.

---

# 5. GOOGLE OAUTH AS-IS

**Cadena AS-IS:** Profile de Google → `GoogleStrategy.validate` (`google.strategy.ts`, mapea a `GooglePerfil`) → `AuthGoogleService`:
1. Busca `Usuario` por `googleId` (línea 36).
2. Si no hay, busca por `email` y hace `update` para vincular el `googleId` (45–54).
3. Si no hay, crea el Usuario en `GOOGLE_SIGNUP_EMPRESA_ID` (57–67), sin permisos y con los defaults de DB `rol=OWNER` y `estadoLegajo=APROBADO`.

Luego `emitirSesion` firma el JWT y el callback redirige al frontend con `?token=` (`auth.controller.ts:108–110`). Hay una segunda cadena para Cliente (`auth.cliente.service.ts:86–123`), con `findUnique({where:{googleId}})` global (línea 92). Todo `[C]`.

**Hallazgos:**
- No hay chequeo de `email_verified` en ninguna de las dos cadenas. La vinculación automática por email queda confiada al perfil de Google `[C]` ausencia.
- Un usuario nuevo por Google nace con rol OWNER (default del schema) en la Empresa configurada por env var, sin permisos. Con `@RequierePermiso` es inofensivo; sin permiso, solo queda cubierto por el token válido (ver sec. 6). El propio `auth.google.service.ts` documenta un TODO de seguridad sobre endpoints de caja sin `@RequierePermiso` `[C]`.
- La Empresa del signup es estática por entorno, no por contexto de usuario `[C]`.

**Qué cambia conceptualmente con User + Membership (R8-ARCH-003, R8-ID-003):**
- El perfil de Google debería resolver al User **global**.
- La Empresa/Business dejaría de derivarse de una env var; pasaría a ser un Membership ACTIVE y un contexto activo controlado por la aplicación.
- La asignación de rol no debería surgir de un default de DB.

**Qué sobrevive en coexistencia:** `GoogleStrategy`, el ciclo del callback, el `googleId` global de `Usuario` y la vinculación por email (esta última como tema OPEN de política: verificación). El tratamiento de `Cliente.googleId` global queda sujeto a TE-CUST-003 (el email igual no asocia automáticamente) `[D]`.

---

# 6. AUTHORIZATION AS-IS

**Catálogo, modelo y asignación**
- `Permiso` es global (`nombre @unique`, `schema.prisma:199`) y `UsuarioPermiso` es la tabla de unión (`:209`, `@@unique([usuarioId,permisoId])` en `:218`). Ninguno tiene `empresaId`: catálogo global, asignación por Usuario `[C]`.
- El catálogo se siembra desde `seed.ts` (array `permissions`). El Owner recibe todos. El seller de ejemplo recibe `ventas.crear`, `clientes.gestionar` y `productos.gestionar` con `rol: 'ASISTENTE_LOCAL'` (`seed.ts:150–168`). `sync-permisos-owner.ts` agrega permisos faltantes solo a los dueños conocidos, de forma aditiva `[C]`.
- No hay modelo Role, ni Membership, ni Admin. El enum `RolUsuario` tiene OWNER, ASISTENTE_LOCAL, PROVEEDOR y REPARTIDOR (`schema.prisma:86`). Los usuarios creados por invitación nacen sin permisos (`activar` no los asigna, 118–139) `[C]`.

**Verificación**
- Origen en tiempo de request: JWT. `PermissionsGuard` (`permissions.guard.ts:33`): `!user || !user.permisos.includes(permisoRequerido)` → 403.
- Sin `@RequierePermiso`, el guard devuelve `true` (26–28): solo exige autenticación.
- `LegajoAprobadoGuard` es por controller y solo bloquea `estadoLegajo==='PENDIENTE'` (`legajo-aprobado.guard.ts:30`). Para Cliente minorista el token trae `APROBADO`.
- Único chequeo contra DB: `AutorizacionesService` (`autorizaciones.service.ts:51–85`). Reautentica al autorizador por email+password, exige misma `empresaId` (línea 60) y consulta `usuarioPermiso` por DB (línea 69). Prohíbe la autoautorización `[C]`.

**Cobertura de `@RequierePermiso`** (conteo por regex sobre `*.controller.ts`):

| Controller | Handlers | Con permiso | Observación |
|---|---|---|---|
| ventas | 7 | 6 | `GET ventas/productos` sin permiso |
| compras | 12 | 7 | los GET de proveedores y compras sin permiso |
| clientes | 4 | 2 | `GET` y `GET :id` sin permiso |
| catalogo | 4 | 2 | los GET sin permiso |
| inventario | 5 | 1 | solo `ajustes` con permiso |
| caja | 7 | 3 | `estado`, `apertura`, `arqueo` y `arqueo/:id/autorizar` sin permiso (grep de líneas 41–89) |
| autorizaciones | 1 | 0 | |
| usuarios | 1 | 0 | |
| jerarquia-catalogo | 1 | 0 | |
| legajo.cliente | 6 | 0 | solo chequeo de `type` |

**Comparación con R8-AUTH-001**

| Aspecto | AS-IS VERIFICADO | TO-BE APROBADO | GAP |
|---|---|---|---|
| Cadena | Token válido → `permisos[]` en el JWT | Membership → Role → Permission | No hay Membership ni Role |
| Roles | OWNER, ASISTENTE_LOCAL, PROVEEDOR, REPARTIDOR (enum de `Usuario`) | Owner, Admin, Vendedor, Gestor de Stock | Falta Admin y Gestor de Stock; hay roles fuera de catálogo |
| Customer / Supplier | `Cliente` tiene login y JWT con `type:'cliente'`; `PROVEEDOR` es un rol de Usuario | No son Membership Roles | Violación conceptual en AS-IS |
| Repartidor | `REPARTIDOR` existe en el enum y en el legajo | Fuera del catálogo del MVP | A decidir en transición (R8-ID-003: no limpieza destructiva) |
| JWT no reemplaza la autorización contextual | Sí la reemplaza | No debe | Gap estructural |

---

# 7. BUSINESS / EMPRESA CONTEXT AS-IS

**Fuentes posibles de `empresaId`**

| Fuente | ¿Existe? | Evidencia |
|---|---|---|
| Claim del JWT | Sí, fuente única en rutas autenticadas | `jwt.strategy.ts`, `@CurrentUser()` `[C]` |
| Body | No: `whitelist:true` activo y ningún DTO declara `empresaId` | `main.ts:8`, grep de `*.dto.ts` sin coincidencias `[C]` |
| Header, URL, query | No se encontró uso para `empresaId` en los controllers revisados | `[C]` (alcance: controllers listados) |
| Sesión servidor | No existe | `[C]` |
| Usuario → Empresa | `Usuario.empresaId` único en DB; se copia al token en el login | `[C]` |
| Env var | `TIENDA_EMPRESA_ID` (tienda y registro Cliente) y `GOOGLE_SIGNUP_EMPRESA_ID` | `tienda.service.ts:38–49`, `auth.cliente.controller.ts`, `auth.google.service.ts:57` `[C]` |
| Prisma scoped | `EmpresaScopedPrismaService.forEmpresa(empresaId)` recibe el valor del caller y lo aplica | `empresa-scoped-prisma.service.ts:38–39` `[C]` |

**Autoridad efectiva:** el claim `empresaId` del JWT, firmado con `JWT_SECRET` y nunca revalidado. La extensión es un mecanismo de aplicación, no una fuente de autoridad: usa lo que el service le pasa.

**Comparación con la cadena TO-BE**

| Eslabón TO-BE | AS-IS |
|---|---|
| Authenticated User | Existe, pero con `type` Usuario o Cliente en la misma estrategia |
| Active Business Context | Sin concepto: es la Empresa del token, fija |
| ACTIVE Membership | No existe; solo `Usuario.activo`, comprobado en el login (no en cada request) |
| Role | `Usuario.rol`, no usado como autorización |
| Permission | `permisos[]` del JWT |
| Business-scoped Persistence | Extensión Prisma, con huecos (sec. 8) |

Falla cerrada ante contexto ausente o inválido: el token siempre trae `empresaId`, así que el caso no se presenta en rutas autenticadas. No hay validación del `empresaId` del token contra la base por request. Un `empresaId` inexistente aislaría todo a cero filas o violaría el FK en los `create` `[C]` por razonamiento sobre la extensión, no ejecutado.

---

# 8. TENANT ISOLATION AS-IS

**Cobertura de modelos** (42 modelos en el schema; conteo con awk sobre `schema.prisma`, contrastado con la lista de `empresa-scope.extension.ts:32–68`)

| Grupo | Modelos | Estado |
|---|---|---|
| Con `empresaId` directo y cubiertos (26) | Usuario, Invitacion, Familia, Subfamilia, Tipo, Subtipo, ProductoProveedor, Producto, Presentacion, Lote, Cliente, ReglaFidelizacion, CuentaCorriente, Deuda, Venta, Pedido, Pago, Caja, Proveedor, Compra, RecepcionCompra, MovimientoStock, Entrega, Notificacion, AuditLog, Autorizacion | Cubiertos |
| Con `empresaId` directo y NO cubiertos (2) | **PagoProveedor** (`schema.prisma:1061`), **DevolucionProveedor** (`:1082`) | Sin scope automático |
| Sin `empresaId` directo (14) | Empresa, Permiso, UsuarioPermiso, Legajo, DocumentoLegajo, VentaItem, PedidoItem, AplicacionPago, AperturaCaja, MovimientoCaja, ArqueoCaja, CierreCaja, CompraItem, DevolucionProveedorItem | Sin scope; "hereda" por disciplina |

El comentario de `empresa-scope.extension.ts:20` dice "21 modelos", desactualizado: el código lista 26 `[C]`.

**Operaciones**

| Operación | Comportamiento | Línea |
|---|---|---|
| create / createMany | Fuerza `empresaId` (pisa lo que traiga el body) | 118–129 `[C]` |
| findFirst, findMany, update, updateMany, delete, deleteMany, count, aggregate | Inyecta `empresaId` en el `where` | 82–92, 131–134 `[C]` |
| findUnique / findUniqueOrThrow | Verifica después de ejecutar; el cross-tenant devuelve `null` o P2025 | 136–159 `[C]` |
| upsert u otras | Lanza error (falla cerrada) | 161–166 `[C]` |
| `groupBy`, `$executeRaw`, `$queryRaw` | `groupBy` y cualquier operación no listada lanza error en modelos cubiertos; el raw no pasa por la extensión | `[C]` |

**Nested writes y relaciones.** La extensión solo mira `args.data` de nivel superior y `args.where`. No inspecciona `create` anidados, `connect` ni `include` `[C]`.

**Transacciones.** Los services usan `db.$transaction(async tx => ...)` sobre el cliente extendido (`compras.service.ts:297, 352`). Que el `tx` interactivo conserve la extensión no está verificado por ejecución `[ND]`.

**Unscoped.** `PrismaService` crudo se usa en `auth*`, `invitaciones` y `legajo*`, con consultas escritas a mano:
- Búsquedas globales: `usuario.findUnique({email|googleId})`, `cliente.findUnique({googleId})`, `invitacion.findUnique({token})`. Los dos primeros son únicos globales por diseño; el token de invitación es secreto y único.
- `legajo.controller.ts:123–126` y `legajo.cliente.controller.ts:135–138` hacen `update({where:{id}})` sin `empresaId`, pero precedidos de un `findFirst` con `empresaId`. Seguro en la práctica, no atómico.
- `legajo.service.ts` opera por `usuarioId`/`clienteId`/`legajoId` sin chequeo de empresa. Lo cubren los controllers (`user.id` propio; en la descarga, `legajo.controller.ts:149`, con `usuario?.empresaId !== user.empresaId` → 404).

**Hallazgos de escritura cross-tenant (verificados por lectura):**
- `compras.service.ts:343–398` `crearDevolucion`: `item.productoId` e `item.loteId` vienen del DTO sin validar que pertenezcan a la empresa. Se persisten en `DevolucionProveedorItem` (nested create, no cubierto) y en `MovimientoStock.create` (cubierto, pero el scope solo fuerza el `empresaId` propio, no valida las FK). Un `productoId` de otra empresa satisface la FK y queda referenciado. El docstring dice "valida que el lote pertenezca al producto" y el código no lo hace `[C]`. No ejecutado. `Lote.update` (línea 389) sí queda acotado por el `where` inyectado.
- `PagoProveedor` y `DevolucionProveedor` se crean pasando `empresaId` a mano y con cast `as Prisma.…UncheckedCreateInput`. Sus lecturas (`findMany` con `where: {compraId}`, líneas 271 y 327) no tienen filtro automático de `empresaId`. Quedan acotadas porque `getCompra(empresaId, compraId)` va antes (cubierto, usa `Compra`) `[C]`.
- Únicos globales sin `empresaId`: `Venta.idempotencyKey` (`schema.prisma:663`) y `Cliente.googleId` (`:488`). El efecto de `idempotencyKey` depende de cómo lo usa `ventas.service`, que no se leyó `[ND]`.

**`obtener` de Cliente:** `clientes.service.ts:59–67` devuelve `cliente` completo (`db.cliente.findUnique({where:{id}})` sin `select`), lo que incluye `passwordHash` y `googleId`. Combinado con el hallazgo 1 del resumen, implica exposición de hashes de otros Clientes a cualquier token válido `[C]`. El `findMany` de `listar` tampoco tiene `select`.

**Límite de la extensión:** protege por modelo. Si un service olvida llamar a `forEmpresa`, nada lo detecta. En `tienda` y `usuarios` se usa; en `auth/legajo/invitaciones` no, y ahí el aislamiento es disciplina manual `[C]`.

---

# 9. USER / EMPRESA / MEMBERSHIP GAP

| Concepto TO-BE | AS-IS | Brecha |
|---|---|---|
| User global | `Usuario` con `email @unique` global, pero con `empresaId` obligatorio, `rol` y `estadoLegajo` mezclados | `Usuario` mezcla identidad, pertenencia, rol y estado operativo |
| Business = tenant | `Empresa` (`schema.prisma:110`) | Equivalente conceptual; sin estado propio documentado en lo leído |
| Membership contextual | No existe | Un User no puede pertenecer a más de una Empresa |
| Membership ACTIVE/INACTIVE | Solo `Usuario.activo` (global, no por Empresa), comprobado al login | Desactivar no corta tokens vivos: operan hasta 8 h `[C]` por ausencia de revalidación |
| Role por Membership | `Usuario.rol` único | No hay roles por contexto |
| Permission por Role | `UsuarioPermiso` directo Usuario→Permiso | Falta el nivel Role |
| Customer ≠ Membership Role | `Cliente` tiene login y JWT propios; coexiste con `RolUsuario.PROVEEDOR` | Dos tipos de identidad sobre una estrategia JWT |
| Multi-Business | No | `empresaId` único en el token |

**Compatibilidad R8-ID-003:** `empresaId` en `Usuario` y en 26+2 modelos es dato transicional. Nada de lo leído exige limpieza destructiva ahora. La coexistencia es técnicamente posible porque el flujo actual es cerrado y de un solo tenant. El costo recae en que el token es la autoridad.

---

# 10. GAP MATRIX

| ID | Área | AS-IS | TO-BE aprobado | GAP | Severidad | Evidencia | Acción |
|---|---|---|---|---|---|---|---|
| G-01 | Autorización | Cliente (`type:'cliente'`) cruza guards y llega a endpoints sin `@RequierePermiso`; registro público | Customer no es Membership Role; el JWT no reemplaza la autorización | No hay separación de tipo de identidad en los guards | CRITICAL | `[C]` `auth.cliente.controller` (`@Public registro`), `permissions.guard.ts:26`, `legajo-aprobado.guard.ts:30`, `clientes.controller.ts:29–37` | Documentar la frontera; definir el contrato antes de implementar |
| G-02 | Contexto de negocio | Autoridad = claim `empresaId` sin revalidar | Contexto controlado por la aplicación y respaldado por Membership ACTIVE | No hay Membership ni validación por request | CRITICAL | `[C]` `jwt.strategy.ts:23–32` | Diseñar el mecanismo (OPEN en R8-ARCH-003) |
| G-03 | Autorización | `permisos[]` en JWT es la autoridad; 8 h sin revocación | Membership→Role→Permission; JWT sin autoridad contextual | Permisos desactualizados hasta 8 h; sin Role | CRITICAL | `[C]` `permissions.guard.ts:33`, `auth.types.ts` | Definir origen del permiso |
| G-04 | Membership | Solo `Usuario.activo` | INACTIVE no opera | Desactivar no corta tokens vivos | HIGH | `[C]` `auth.service.ts:42–64` | Parte del contrato de revocación |
| G-05 | Aislamiento | 2 modelos con `empresaId` fuera de la extensión | Create/read/update/delete respetan el contexto | Cobertura incompleta | HIGH | `[C]` `empresa-scope.extension.ts:32–68`, `schema.prisma:1061,1082` | Registrar en el contrato de aislamiento |
| G-06 | Aislamiento | 14 modelos sin `empresaId` dependen de la disciplina de acceso por padre | Persistencia anidada preserva el aislamiento | Sin enforcement | HIGH | `[C]` `empresa-scope.extension.ts:20–31` | Definir estrategia de herencia |
| G-07 | Aislamiento | Nested writes y FKs no validados (`crearDevolucion`) | Nested/related persistence preserva el aislamiento | Referencias cross-tenant posibles | HIGH | `[C]` `compras.service.ts:343–398` | Registrar y cubrir en eval |
| G-08 | Datos | `GET /clientes(/:id)` devuelve filas con `passwordHash` y `googleId` | No exponer secretos | Exposición | HIGH | `[C]` `clientes.service.ts:45–67` | Reportar como defecto AS-IS |
| G-09 | Autorización | `legajo/cliente/pendientes` y `aprobar` sin permiso | Autorización por permiso | Cualquier Usuario aprueba mayoristas | HIGH | `[C]` `legajo.cliente.controller.ts:94–121` | Registrar |
| G-10 | Google OAuth | Vinculación por email sin `email_verified`; default `rol=OWNER` | Google continúa; vinculación controlada (TE-CUST-003) | Riesgo de takeover y rol por default | HIGH | `[C]` `auth.google.service.ts:45–67` | OPEN: política de vinculación |
| G-11 | MFA | No existe | Obligatorio para Owner/Admin | Ausente | HIGH | `[C]` ausencia | OPEN: mecanismo |
| G-12 | Sesión | Sin refresh, logout ni revocación; token en query string y `localStorage` | Sin definir (OPEN) | Superficie de exposición | MEDIUM | `[C]` | OPEN |
| G-13 | Roles | `RolUsuario` ≠ catálogo aprobado (sin Admin ni Gestor de Stock; con Proveedor y Repartidor) | Owner, Admin, Vendedor, Gestor de Stock | Catálogo distinto | MEDIUM | `[C]` `schema.prisma:86` | Mapeo transicional |
| G-14 | Identidad | `Cliente.googleId` y `Venta.idempotencyKey` globales | Aislamiento de lookups únicos | Colisiones o enumeración cross-tenant | MEDIUM | `[C]` `schema.prisma:488,663` | Revisar uso (`idempotencyKey` `[ND]`) |
| G-15 | Operación | Un solo `JWT_SECRET` para ambos tipos; sin rotación | OPEN | Radio de compromiso único | MEDIUM | `[C]` `auth.types.ts:31` | OPEN |
| G-16 | Tests | Sin tests de auth, tenant ni e2e | Criterios en TE-ID/TE-AUTH `[D]` | Sin cobertura | MEDIUM | `[C]` | Sec. 13 |
| G-17 | Calidad doc/código | Comentarios obsoletos (21 modelos, `jwt-auth.guard` vs `auth.module`, registro Cliente, docstring de devolución) | — | Documentación interna engañosa | LOW | `[C]` | Corregir al implementar |

---

# 11. AS-IS → TO-BE TRANSFORMATION MAP

| AS-IS component | Target Wapsell | Disposition | Justificación |
|---|---|---|---|
| `Usuario` (identidad) | User global | ADAPT | El email global ya es único; `empresaId`, `rol` y `estadoLegajo` se separan conceptualmente |
| `Empresa` | Business | ADAPT | Equivalente conceptual de tenant |
| `Usuario.empresaId` / `rol` | Membership + Role | TRANSITION | R8-ID-003: dato transicional durante la coexistencia |
| `Usuario.activo` | Estado del Membership | ADAPT | Hoy es global y por login |
| `Permiso` + `UsuarioPermiso` | Permission + Role→Permission | ADAPT | El catálogo se aprovecha; la unión pasa a Role |
| `RolUsuario` (4 valores) | Catálogo de roles aprobado | TRANSITION | Valores distintos; sin limpieza destructiva |
| `Cliente` con login | Customer sin Membership | ADAPT / OPEN | Customer ≠ Membership Role; su autenticación queda por definir |
| `JwtStrategy.validate` | Validación JWT + resolución de contexto activo | ADAPT | Hoy confía en el payload |
| Claims `empresaId` / `permisos` | Sin autoridad contextual | DEPRECATE CONCEPTUALLY | Pueden seguir como compatibilidad, no como autoridad |
| `AuthService.emitirSesion` / emisión de Cliente | Emisión de sesión | ADAPT | Claims y duración son OPEN |
| `JwtAuthGuard` global | Autenticación global | PRESERVE | Patrón vigente |
| `PermissionsGuard` | Guard contextual (Membership→Role→Permission) | ADAPT | Cambia el origen de la verdad |
| `@RequierePermiso`, `@Public`, `@CurrentUser` | Decoradores equivalentes | PRESERVE | API de decoradores reutilizable |
| `LegajoAprobadoGuard` / `Legajo*` | Fuera del alcance Block 1 | OPEN | R8-AUTH-001 no define legajo |
| `AutorizacionesService` | Autorización de excepciones | PRESERVE / OPEN | Único chequeo contra DB |
| `empresaScopeExtension` + `EmpresaScopedPrismaService` | Business-scoped persistence | ADAPT | Alineado con R8-ARCH-002; faltan cobertura y herencia de scope |
| `PrismaService` directo en auth, invitaciones y legajo | Persistencia con contexto | TRANSITION | Hoy es disciplina manual |
| `GoogleStrategy` + `AuthGoogleService` | Google OAuth | ADAPT | R8-ARCH-003: continúa |
| `TIENDA_EMPRESA_ID` / `GOOGLE_SIGNUP_EMPRESA_ID` | Contexto resuelto por la aplicación | TRANSITION | Configuración mono-negocio |
| `Invitacion` | Alta de Membership | ADAPT / OPEN | Hoy crea Usuario con rol y empresa |
| MFA, refresh, revocación, Business Switch, dispositivos | — | NEW | No existen |

---

# 12. SECURITY RISKS

**Los 10 casos pedidos** (evaluados por lectura de código, no por ejecución).

| # | Caso | Resultado AS-IS | Evidencia |
|---|---|---|---|
| 1 | JWT válido + Empresa válida | Funciona; el `empresaId` del token alimenta el scope | `[C]` |
| 2 | Empresa inexistente | No hay chequeo de existencia por request. Un token con `empresaId` inexistente (solo si el secreto está comprometido) vería cero filas y los `create` fallarían por FK | `[C]` razonamiento; `[ND]` en ejecución |
| 3 | Empresa de otro usuario | No hay canal cliente (body, header o URL) que cambie `empresaId` en los controllers leídos; solo el claim | `[C]` (alcance: controllers revisados) |
| 4 | `empresaId` manipulado | En el body, `whitelist:true` lo elimina; en `create`, la extensión lo pisa. En el token, la integridad depende de `JWT_SECRET`. En `update`, un DTO que declarara `empresaId` lo movería (hoy no hay ninguno) | `main.ts:8`, `empresa-scope.extension.ts:118–129` `[C]` |
| 5 | Usuario sin permiso | 403 solo si el endpoint tiene `@RequierePermiso`; si no, pasa con cualquier token | `permissions.guard.ts:26,33` `[C]` |
| 6 | Permiso equivocado | 403 en endpoints con permiso. Sin revalidación: un permiso retirado sigue vigente hasta 8 h | `[C]` |
| 7 | Múltiples Empresas | No soportado: el modelo y el token admiten una sola | `[C]` |
| 8 | Membership INACTIVE | No existe. `Usuario.activo=false` bloquea el login, no los tokens vivos | `auth.service.ts:42–64` `[C]` |
| 9 | Lookup único cruzando Empresas | `findUnique` en modelos cubiertos: verificado post-fetch (null/P2025). En modelos sin scope o con `PrismaService` directo: sin chequeo automático | `empresa-scope.extension.ts:136–159` `[C]` |
| 10 | Nested write cruzando Empresas | No protegido. `crearDevolucion` lo ejemplifica | `compras.service.ts:343–398` `[C]` |

**Riesgos adicionales:** G-01, G-08, G-09 y G-10 de la sec. 10.

---

# 13. TEST / EVAL COVERAGE

- **Tests ejecutados:** ninguno en esta auditoría. Los criterios existentes son documentales: `07-DESIGN/TESTS-EVALS/DERIVED/05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md`, con estado SPECIFIED `[D]`.
- **Tests en el repo:** solo `src/health/health.controller.spec.ts`. No existe `apps/api/test` `[C]`.

| Caso de seguridad | Criterio existente `[D]` | Automatizable | Estado en código |
|---|---|---|---|
| Valid JWT + Business válido | TE-ID-001 | Sí | Sin test |
| Membership A no autoriza B | TE-ID-002 | Sí (hoy no representable: sin Membership) | Sin test |
| Membership INACTIVE | TE-ID-003 | Sí, tras Membership | Sin test |
| Contexto ausente / inválido | TE-ID-004/005 | Sí | Sin test |
| Business ID del cliente no pisa el contexto | TE-ID-006 | Sí (ya representable) | Sin test |
| Lecturas / escrituras cross-tenant | TE-ID-008/009 | Sí | Sin test |
| Lookup único aislado | TE-ID-010 | Sí | Sin test |
| Nested write | TE-ID-011 | Sí | Sin test |
| Autenticado sin Membership; sin Role/Permission | TE-AUTH-001/002 | Sí | Sin test |
| Customer fuera de roles de Membership | TE-AUTH-006 | Sí (representable hoy: ver G-01) | Sin test |
| Cliente no accede a endpoints internos | **Sin criterio** | Sí | Sin criterio ni test |
| Revocación / expiración de token | **Sin criterio** (OPEN en R8-ARCH-003) | Sí | Sin criterio ni test |
| Mapeo de cobertura de modelos del scope | **Sin criterio** | Sí (introspección) | Sin criterio ni test |

Faltan criterios para el cruce Cliente→endpoints internos, la cobertura del scope por modelo y la validación de FKs cross-tenant (G-07).

---

# 14. FIRST IMPLEMENTATION SLICE READINESS

| Pieza | Estado | Razón |
|---|---|---|
| Identity / Tenancy | **BLOCKED** | No hay Membership ni modelo de contexto activo. Sin contrato de mecanismo de contexto, el slice no tiene dónde apoyarse (G-02) |
| Authentication / Session | **OPEN** | Reutilizable: JWT, Google y guards. Claims, vida, refresh, revocación, MFA y logout siguen OPEN en R8-ARCH-003 |
| Authorization | **BLOCKED** | G-01 y G-03 impiden garantizar el límite de seguridad: el Cliente cruza guards y los permisos son autoridad del token |
| Tenant isolation (aplicación) | **OPEN** | Mecanismo coherente con R8-ARCH-002 y ya existente, pero con huecos (G-05, G-06, G-07) y sin pruebas |

**Veredicto global: BLOCKED.** No se declara "implementation ready". Hay mecanismos reutilizables: son material de partida, no funcionalidad terminada.

---

# 15. OPEN TECHNICAL DECISIONS

Heredadas de R8-ARCH-003 (OPEN) y confirmadas por la auditoría:
1. Claims exactos del JWT y qué claims dejan de ser autoridad.
2. Duración, refresh, revocación y logout.
3. Mecanismo de Business Switch y de resolución del contexto activo.
4. Mecanismo de MFA para Owner/Admin.
5. Gestión de dispositivos y sesiones.

Surgidas de esta auditoría (técnicas; no son decisiones de producto):
6. Cómo se separa el tipo de identidad Cliente de la superficie interna (G-01).
7. Política de vinculación de Google por email y verificación (G-10).
8. Estrategia de herencia de scope para los 14 modelos sin `empresaId` directo y para nested writes (G-06, G-07).
9. Tratamiento de Legajo, `REPARTIDOR` y `PROVEEDOR` durante la coexistencia.
10. Uso real de `Venta.idempotencyKey` y `Cliente.googleId` globales `[ND]`.
11. Política de `JWT_SECRET` (secreto único para ambos tipos, rotación).

---

# 16. RECOMMENDED NEXT DOCUMENTS

Recomendación técnica controlada; sin nuevas decisiones de producto.
1. Contrato de **Business Context + Membership resolution** (cierra G-02, G-04): cómo se establece el contexto activo y se valida contra Membership ACTIVE.
2. Contrato de **Authentication/Session** (claims, vida, refresh, revocación, logout, MFA, dispositivos).
3. Contrato de **frontera de identidad** Cliente/Customer vs. superficie interna (G-01).
4. Contrato de **persistencia aislada**: cobertura de modelos, herencia de scope, nested writes y FKs (G-05 a G-07).
5. **Tests/Evals** adicionales para los casos sin criterio de la sec. 13.
6. Un **informe de defectos AS-IS** separado (G-08, G-09, G-10) para no mezclarlos con el diseño TO-BE.

---

# 17. EVIDENCE INDEX

Rutas relativas a `apps/api/` salvo indicación.

| Hecho | Archivo : símbolo : línea | Clase |
|---|---|---|
| Guards globales | `src/app.module.ts:53–54` | `[C]` |
| ValidationPipe `whitelist:true`; CORS `credentials:true` | `src/main.ts:8,16–18` | `[C]` |
| `expiresIn:'8h'`, secreto único | `src/auth/auth.module.ts:19–20` | `[C]` |
| Validación JWT sin DB; `type` por defecto | `src/auth/jwt.strategy.ts:17–32` | `[C]` |
| Claims Usuario | `src/auth/auth.service.ts:75–103` | `[C]` |
| Credenciales | `src/auth/auth.service.ts:42–64` | `[C]` |
| Claims Cliente | `src/auth/auth.cliente.service.ts:133–157` | `[C]` |
| Registro Cliente público | `src/auth/auth.cliente.controller.ts` (`registro`, `@Public`); `auth.cliente.service.ts:35–58` | `[C]` |
| Google (Usuario) | `src/auth/auth.google.service.ts:36–77` | `[C]` |
| Google (Cliente) | `src/auth/auth.cliente.service.ts:86–123` | `[C]` |
| Token en el redirect | `src/auth/auth.controller.ts:108–110` | `[C]` |
| `PermissionsGuard` | `src/auth/guards/permissions.guard.ts:26,33` | `[C]` |
| `LegajoAprobadoGuard` | `src/legajo/guards/legajo-aprobado.guard.ts:30` | `[C]` |
| Extensión de scope | `src/prisma/empresa-scope.extension.ts:32–68,82–92,118–166` | `[C]` |
| `forEmpresa` | `src/prisma/empresa-scoped-prisma.service.ts:38–39` | `[C]` |
| Schema: Usuario / Permiso / UsuarioPermiso / Cliente | `prisma/schema.prisma:147,152,199,209,467,488,505` | `[C]` |
| Schema: `RolUsuario`, `idempotencyKey`, PagoProveedor, DevolucionProveedor | `prisma/schema.prisma:86,663,1061,1082` | `[C]` |
| Conteo de modelos y de `empresaId` | `prisma/schema.prisma` (awk; 42 modelos, 28 con `empresaId` directo) | `[C]` |
| Devolución a proveedor | `src/compras/compras.service.ts:343–398` | `[C]` |
| `GET /clientes` | `src/clientes/clientes.controller.ts:29–37`; `clientes.service.ts:45–67` | `[C]` |
| `GET /usuarios` | `src/usuarios/usuarios.controller.ts:24–31` | `[C]` |
| Caja sin permiso | `src/caja/caja.controller.ts:41–89` | `[C]` |
| Legajo de Cliente sin permiso | `src/legajo/legajo.cliente.controller.ts:94–140` | `[C]` |
| Legajo Usuario | `src/legajo/legajo.controller.ts:82–155` | `[C]` |
| Invitaciones | `src/invitaciones/invitaciones.service.ts:37–142` | `[C]` |
| Seed y sync de permisos | `prisma/seed.ts:123–186`; `prisma/sync-permisos-owner.ts` | `[C]` (seed solo por grep) |
| Autorizaciones | `src/autorizaciones/autorizaciones.service.ts:51–85` | `[C]` |
| Tienda | `src/tienda/tienda.service.ts:38–49` | `[C]` |
| Storage de token en frontend | `apps/pos-admin/src/lib/api.ts:75,81`; `apps/pos-admin/src/features/auth/AuthContext.tsx:21,42,64`; `apps/tienda-online/src/features/auth/AuthContext.tsx:16,40` | `[C]` (por grep) |
| Tests existentes | `src/health/health.controller.spec.ts` | `[C]` |
| Criterios de test | `docs/WAPSELL-DOCUMENTATION/07-DESIGN/TESTS-EVALS/DERIVED/05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md:66–91` | `[D]` |
| Autoridad aprobada | R8-ARCH-001/002/003, R8-AUTH-001, R8-ID-003 (citados en el prompt de la auditoría) | `[D]` |
| Persistencia del `tx` extendido en `$transaction`; uso de `idempotencyKey`; flujos de `ventas`/`pedidos`/`caja`/`inventario` | — | `[ND]` |
