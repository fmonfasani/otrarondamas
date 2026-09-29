# AS-IS — Modules
**Evidencia:** VERIFIED BY CODE (lectura de todos los `*.controller.ts`, esta sesión)

17 carpetas de módulo bajo `apps/api/src/`: `auth`, `autorizaciones`, `caja`, `catalogo`, `clientes`,
`compras`, `email`, `fidelizacion`, `inventario`, `invitaciones`, `legajo`, `pagos`, `pedidos`,
`prisma`, `tienda`, `usuarios`, `ventas` — más el controller raíz `app`. 84 handlers de ruta HTTP en
total (cifra de SRC-011, no recontada exhaustivamente en esta sesión pero consistente con el listado
verificado a continuación).

| Módulo | Ruta base | Guard | Endpoints reales |
|---|---|---|---|
| auth | `/auth` | Mixto | `POST /login` (Public), `GET /me`, `GET /google` (Public), `GET /google/callback` (Public) |
| auth (cliente) | `/auth/cliente` | Mixto | `POST /registro` (Public), `POST /login` (Public), `GET /me`, `GET /google`, `GET /google/callback` (Public) |
| catalogo | `/catalogo/productos` | LegajoAprobadoGuard | `GET /` (abierto), `GET /:id` (abierto), `POST /` (`productos.gestionar`), `PATCH /:id` (`productos.gestionar`) — **sin DELETE** |
| catalogo (jerarquía) | `/catalogo/jerarquia` | LegajoAprobadoGuard | `GET /` (abierto) |
| ventas | `/ventas` | LegajoAprobadoGuard | `GET /productos` (abierto), `POST /cotizacion` (`ventas.crear`), `POST /` (`ventas.crear`), `GET /` (`ventas.ver`), `GET /:id` (`ventas.ver`), `GET /:id/comprobante` (`ventas.ver`), `POST /:id/pagos` (`ventas.crear`) |
| pagos | `/ventas/:ventaId/pagos` | LegajoAprobadoGuard | `POST /` (`ventas.crear`), `GET /` (abierto) |
| caja | `/caja` | LegajoAprobadoGuard | `GET /estado` (abierto), `POST /apertura` (abierto), `POST /movimientos` (`caja.gastos`), `GET /movimientos` (abierto), `POST /arqueo` (abierto), `PATCH /arqueo/:id/autorizar` (sin permiso propio, valida credenciales en body), `POST /cierre` (`caja.gastos`) |
| inventario | `/inventario` | LegajoAprobadoGuard | `GET /stock`, `GET /productos/:id/lotes`, `GET /productos/:id/movimientos` (abiertos), `POST /ajustes` (`inventario.ajustes`), `GET /alertas` (abierto) |
| compras | `/` | LegajoAprobadoGuard | `GET/POST/PATCH /proveedores`, `GET/POST /compras`, `POST /compras/:id/emitir`, `POST /compras/:id/recepciones`, `GET/POST /compras/:id/pagos`, `GET/POST /compras/:id/devoluciones` — GET abiertos, POST/PATCH con `compras.gestionar` |
| clientes | `/clientes` | LegajoAprobadoGuard | `GET /`, `GET /:id` (abiertos), `POST /`, `PATCH /:id` (`clientes.gestionar`) |
| fidelizacion | `/reglas-fidelizacion` | LegajoAprobadoGuard | TODO (incluidos GET) requiere `fidelizacion.gestionar` |
| pedidos | `/pedidos` | LegajoAprobadoGuard | TODO (incluidos GET) requiere `pedidos.gestionar` |
| tienda | `/tienda` | Sin guard, todo `@Public()` | `GET /productos`, `GET /jerarquia`, `POST /pedidos`, `GET /pedidos/:id` |
| invitaciones | `/invitaciones` | Mixto | `POST /` (`usuarios.gestionar`), `GET /` (`usuarios.gestionar`), `POST /activar` (Public), `POST /mayorista` (`usuarios.gestionar`), `POST /mayorista/activar` (Public) |
| legajo | `/legajo` | Self-service, sin LegajoAprobadoGuard | `GET/PATCH /mi-legajo`, `POST /mi-legajo/documentos`, `GET /mi-legajo/estado` (sin permiso); `GET /pendientes`, `PATCH /:usuarioId/aprobar`, `GET /documentos/:id/descargar` (`usuarios.gestionar`) |
| legajo (cliente) | `/legajo/cliente` | Checks manuales de `user.type` | Análogo al anterior, para mayoristas |
| autorizaciones | `/autorizaciones` | LegajoAprobadoGuard | `POST /` sin permiso propio (valida credenciales en body) |
| usuarios | `/usuarios` | LegajoAprobadoGuard | `GET /` (abierto, solo lectura — soporte para elegir "usuario entrante" del arqueo) |
| email | — | — | `EmailService`, sin controller propio (wrapper de Resend) |
| prisma | — | — | `PrismaService` + `EmpresaScopedPrismaService`, infraestructura sin controller |
| app (raíz) | `/` | Mixto | `GET /` (Public, health simple), `GET /protegido/caja-gastos` (endpoint de verificación de guard, sin lógica de negocio) |

## Módulos de dominio explícitamente ausentes

No existen como carpeta/módulo en `apps/api/src`, pese a tener modelo de datos en el schema:
**`entregas`** (RF-13, modelo `Entrega` existe) y **`notificaciones`** (modelo `Notificacion`
existe). Tampoco existe ningún módulo `empresas` con operaciones propias de Prisma — `Empresa` solo
se crea vía `seed.ts` (confirmado también por SRC-011: "cero operaciones de Prisma en `src/`" sobre
ese modelo).

No existe, en ningún módulo, concepto de `business`, `tenant`, `membership`, `conversacion`,
`mensaje` ni `asistente` — ver `04-ASIS-IDENTITY.md`.
