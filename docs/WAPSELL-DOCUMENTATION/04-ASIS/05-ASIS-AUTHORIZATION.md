# AS-IS — Authorization
**Evidencia:** VERIFIED BY CODE (lectura de guards y controllers, esta sesión) + DOCUMENTED (SRC-011 para riesgos no re-verificados)

## Guards reales

- **`JwtAuthGuard`** (global) — exige JWT válido salvo `@Public()`.
- **`PermissionsGuard`** (global) — lee metadata de `@RequierePermiso(permiso)`; el permiso viaja
  granular en una tabla `Permiso`/`UsuarioPermiso`, **independiente** del `RolUsuario` (el rol no
  autoriza nada por sí mismo, solo determina qué legajo pedir en el alta).
- **`LegajoAprobadoGuard`** (no global, aplicado explícitamente por controller) — bloquea con 403
  cualquier endpoint de negocio si `estadoLegajo === 'PENDIENTE'`. Deja pasar `null` (cliente
  minorista, no aplica) y `APROBADO`. Aplicado en: catálogo, ventas, inventario, compras, caja,
  clientes, fidelización, pedidos, autorizaciones, usuarios. **No** aplicado en `/legajo/*`
  (self-service — una cuenta pendiente debe poder completar su propio legajo), `/tienda/*`
  (público), `/auth/*` (público).

## Aislamiento multiempresa (INV-01)

Implementado vía `EmpresaScopedPrismaService` + un Prisma Client Extension
(`empresa-scope.extension.ts`) que inyecta/filtra `empresaId` automáticamente para un set fijo de
modelos (`MODELOS_CON_EMPRESA_ID`). **Limitación documentada explícitamente en el propio código**:
operaciones no estándar (`groupBy`, `upsert`, `$executeRaw`) no pasan por la extension y deben
manejarse a mano — con al menos 2 gaps reales detectados y corregidos durante el desarrollo (5
modelos nuevos de jerarquía sin scope al agregar la categorización de catálogo; un `upsert` sobre
`Cliente` sin manejo, corregido en tienda online).

## Criterio de exposición de GET — inconsistente pero documentado caso por caso

No es un patrón único; cada controller declara su propio criterio, con justificación citada en el
propio código:

| Módulo | GET sin permiso adicional | GET protegido |
|---|---|---|
| Catálogo, Compras (listar), Clientes | Sí — abierto a cualquier logueado con legajo aprobado | — |
| Pedidos, Fidelización (reglas) | — | Sí — TODO el módulo, incluidos los GET (datos de cliente / política de precios tratados como sensibles) |
| Caja | `estado`/`abrir`/`listarMovimientos`/`arquear` abiertos (releído RF-09 explícitamente) | `registrarMovimiento`/`cerrar` exigen `caja.gastos` |

**Gap de seguridad real, ya corregido, documentado con su propia cronología** (no un descuido
oculto): al agregar Google login (auto-alta sin permisos asignados), la mayoría de endpoints de caja
quedaron sin `@RequierePermiso` — detectado en revisión previa a esa integración, resuelto
explícitamente releyendo RF-09 y decidiendo qué proteger.

## Mecanismo de autorización por excepción (D-06)

Implementado vía **login del autorizador** (email + password) en el momento de la operación:
cualquier usuario con el permiso que la operación exige puede autorizar, pero **nunca a sí mismo**
(`autorizador.id !== solicitanteId`, verificado con 403 si coinciden). El mapeo operación→permiso es
una constante cerrada en código (`OPERACION_PERMISO_REQUERIDO`), no declarada por quien llama al
endpoint — evita que un cliente HTTP pida "autorizame para lo que yo diga".

## Riesgos de seguridad reportados por SRC-011, no re-verificados en esta sesión

Estos riesgos fueron reportados por lectura de código en SRC-011 (2026-09-24). Esta sesión **no los
re-verificó línea por línea** — se listan con su clasificación original (DOCUMENTED, heredado):

- **R01**: tokens de `Cliente` de tienda aceptados en el panel sin guard por `type` — alcanzarían
  endpoints sin `@RequierePermiso` (`GET /clientes`, `/proveedores`, `/compras`, `/inventario`,
  `/caja`).
- **R02**: alta automática por Google de cualquier cuenta como `Usuario` OWNER/APROBADO en la
  empresa fijada por `GOOGLE_SIGNUP_EMPRESA_ID`.
- **R03**: `PATCH /legajo/cliente/:id/aprobar` solo exige `type === 'usuario'`, sin permiso
  específico — cualquier Usuario autenticado podría aprobar legajos de mayoristas.
- **R04**: tokens de invitación intercambiables entre el flujo de Usuario y el de mayorista (sin
  discriminador de tipo).
- **R12**: credenciales `password123` para `owner`/`seller` publicadas en el README.
- **R13**: sin rate limiting en login, activación de invitación, ni `POST /autorizaciones`.
- **R14**: JWT sin revocación (8h de vida) y token viajando en la query string del redirect de
  Google OAuth.

**Estado real de estos riesgos hoy no confirmado** — igual que SRC-011 lo marca explícitamente, esta
sesión tampoco determinó si siguen vigentes tal cual, fueron corregidos, o si las credenciales
`password123` siguen activas en producción. Ver `NOT DETERMINABLE` en `00-ASIS-OVERVIEW.md`.
