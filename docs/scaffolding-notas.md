# Notas de Scaffolding para Otra Roonda Más

Este documento resume las decisiones técnicas tomadas durante la fase de scaffolding inicial y lista los TODOs pendientes, trazables a las Decisiones Pendientes (D-XX) de la Especificación Funcional (SDD).

## 1. Decisiones técnicas tomadas

### 1.1. Gestor de paquetes del Monorepo

- Se eligió **npm workspaces** por su simplicidad y compatibilidad preexistente en entornos donde ya se usa `npm`. No se optó por `pnpm` para evitar la introducción de una nueva herramienta en el piloto, priorizando la coherencia de herramientas.

### 1.2. Configuración multiempresa (Backend API)

- El aislamiento por empresa (`empresaId` en cada entidad de negocio y relaciones `@relation`) se implementó directamente en el `schema.prisma` desde el inicio. Esto garantiza el aislamiento a nivel de base de datos, no solo de aplicación. Faltaría implementar un interceptor/middleware en NestJS que inyecte el `empresaId` del usuario autenticado en todas las queries, pero la base de datos ya impone la restricción.

### 1.3. Frontend Tienda Online (SSR vs SPA)

- Se decidió usar **React + Vite (SPA)** para la Tienda Online (`apps/tienda-online`) en lugar de SSR (Server-Side Rendering). Esto se debe a que el requisito `RF-06` para el piloto no exige SEO complejo (es un catálogo + carrito + Mercado Pago). Usar Vite mantiene la consistencia con el stack del POS/Admin y simplifica el setup inicial.

### 1.4. Puerto de PostgreSQL en Docker Compose

- Debido a un conflicto con el puerto 5432 en el host, se configuró PostgreSQL en `docker-compose.yml` para exponerse en el puerto **5500** (`5500:5432`). Las variables de entorno (`.env`) en la API se actualizaron para reflejar este cambio.

## 2. Lista de TODOs pendientes (trazables al SDD)

Esta lista incluye los placeholders y lógica pendiente que debe implementarse en fases posteriores, según las decisiones pendientes (D-XX) o los requisitos funcionales del SDD.

- **D-01: Regla de precios mayoristas y asignación de clientes/listas**
  - **Ubicación:** `apps/api/prisma/seed.ts` (precioMayorista en productos demo)
  - **Descripción:** Actualmente, `precioMayorista` se calcula como `precioMinorista * 0.9` en el seed. Se debe implementar la lógica de asignación de precios mayoristas por reglas configurables (tipo de cliente, cantidad mínima, etc.).

- **D-03: Modalidad de integración de Mercado Pago**
  - **Ubicación:** `apps/tienda-online/src/App.tsx` (placeholder de checkout)
  - **Descripción:** La integración con Mercado Pago es un placeholder básico. Se debe implementar el flujo de pago real (Checkout Pro, Checkout API, etc.) y la confirmación verificada en el backend, incluyendo el manejo de comisiones y reembolsos.

- **D-05: Confirmación del umbral de caja: condición estricta y manejo de diferencias menores**
  - **Ubicación:** `apps/api/prisma/schema.prisma` (campo `autorizacionId` en `ArqueoCaja`)
  - **Descripción:** El umbral de $5.000 para diferencias de caja es una referencia inicial. Se debe confirmar la condición exacta ("mayor que", "mayor o igual que") y definir el tratamiento para diferencias menores al umbral.

- **D-06: Mecanismo de autorización del dueño**
  - **Ubicación:** `apps/api/src/auth/guards/permissions.guard.ts` (a implementar)
  - **Descripción:** Se debe definir e implementar el mecanismo de autorización del dueño (PIN, aprobación desde la cuenta, o ambos) para operaciones restringidas. Actualmente, `AuditLog` y `Autorizacion` están modelados, pero la lógica de uso está pendiente.

- **D-08: Presentaciones, unidades y conversiones reales**
  - **Ubicación:** `apps/api/prisma/seed.ts` (productos demo, `unidadBase`)
  - **Descripción:** Las presentaciones y unidades actuales son básicas. Se deben definir y configurar las conversiones reales entre presentaciones para los productos, asegurando que no se calculen por suposición.

- **D-09: Reglas de lotes, vencimientos y bloqueo de productos**
  - **Ubicación:** `apps/api/prisma/schema.prisma` (modelo `Lote`)
  - **Descripción:** El modelo `Lote` está presente, pero la lógica de alertas de vencimiento (7 días de anticipación) y el bloqueo de ventas para lotes vencidos están pendientes de implementación.

- **D-11: Zonas y costo de entrega**
  - **Ubicación:** `apps/api/src/entregas/entregas.service.ts` (a implementar)
  - **Descripción:** Se debe implementar la configuración de zonas de entrega y sus tarifas, y la lógica para calcular el costo de entrega, incluyendo la solicitud de intervención si una dirección no coincide con una zona configurada.

- **D-12: Preparación, asignación y contingencias de entrega**
  - **Ubicación:** `apps/api/src/pedidos/pedidos.service.ts`, `apps/api/src/entregas/entregas.service.ts` (a implementar)
  - **Descripción:** La gestión de estados de entrega, asignación a repartidores, registro de resultados y reprogramaciones está pendiente de implementación. También definir la exigencia de evidencia de entrega (foto, firma).

- **D-13: Canales, eventos y proveedor de notificaciones**
  - **Ubicación:** `apps/api/src/notificaciones/notificaciones.service.ts` (a implementar)
  - **Descripción:** El modelo `Notificacion` existe, pero la implementación de envío real (WhatsApp, email), la configuración de canales, eventos y proveedores, y el manejo de credenciales están pendientes.

- **D-16: Política de pagos parciales, vencimientos y aplicación de cobros**
  - **Ubicación:** `apps/api/prisma/schema.prisma` (campo `fechaVencimiento` en `Deuda`)
  - **Descripción:** Se debe implementar la lógica para pagos parciales, las fechas de vencimiento de deudas y la forma de aplicar cobros a una o más deudas (manual o por reglas definidas).

- **D-18: Método de costos para calcular ganancias estimadas**
  - **Ubicación:** `apps/api/src/reportes/reportes.service.ts` (a implementar)
  - **Descripción:** Antes de calcular ganancias estimadas de forma confiable, se debe definir el método de costeo (promedio, FIFO, último costo, etc.) y asegurar que los costos estén correctamente registrados.

- **D-19: Capacidad real disponible en el VPS Hetzner compartido**
  - **Ubicación:** *N/A (Decisión de infraestructura, no de código)*
  - **Descripción:** Se debe realizar una medición técnica de CPU, RAM, disco y carga en el VPS de Hetzner antes de desplegar el ERP, para confirmar si hay capacidad suficiente. No desplegar sin autorización explícita.

## 3. Comentarios adicionales

- **Docker Compose:** Se decidió no incluir los frontends directamente en `docker-compose.yml` para desarrollo local, priorizando una Developer Experience más simple con `npm run dev` fuera de Docker. Los frontends pueden ser dockerizados para producción en fases posteriores.

## 4. Reparación del entorno (20/09/2026)

Antes de esta fecha, el scaffolding entregado **no compilaba ni arrancaba** — no se había verificado `npm run build` ni el arranque real de la API en ningún momento previo. Esta sección documenta el diagnóstico y la reparación, con evidencia real de cada paso (no supuesta).

### 4.1 Problemas encontrados y corregidos

1. **`node_modules`/`package-lock.json` corruptos**: el lockfile no incluía todas las dependencias transitivas (ej. `braces`, dependencia de `chokidar`), y `@nestjs/cli` estaba instalado sin sus archivos `.js` compilados. Causa raíz: instalación previa incompleta o interrumpida, nunca verificada con un build real. Solución: borrar `node_modules` y `package-lock.json` en todos los workspaces y correr `npm install` limpio desde la raíz.
2. **Prisma Client nunca generado**: `@prisma/client` no exportaba los enums del schema (`UnidadBase`, etc.) porque nadie había corrido `npx prisma generate` tras la instalación. Solución: `npm run prisma:generate --workspace=apps/api`.
3. **Bug de tipos en `apps/api/src/prisma/prisma.service.ts`**: `this.$on('beforeExit', ...)` fallaba con `TS2345` porque el `PrismaClient` no estaba instanciado con la configuración de logging por eventos que ese tipo de callback requiere. Se reemplazó por `process.on('beforeExit', ...)` (evento estándar de Node), que logra el mismo objetivo — cerrar la app de Nest antes de que el proceso termine — sin requerir esa configuración adicional.
4. **Faltaba `apps/api/nest-cli.json`**: el CLI de Nest no tenía configurado `sourceRoot`. Se agregó con la configuración estándar mínima (`sourceRoot: "src"`, `deleteOutDir: true`).
5. **`apps/api/tsconfig.json` heredaba `"noEmit": true` de `tsconfig.base.json`** sin sobreescribirlo. Consecuencia: `nest build` terminaba con exit code 0 y sin errores, pero **nunca generaba los `.js` en `dist/`** — solo el `tsconfig.tsbuildinfo`. Este es el bug más engañoso de los cinco porque el build "parecía" exitoso (sin output de error) mientras no producía nada usable. Se agregó `"noEmit": false` explícito en `apps/api/tsconfig.json`.

### 4.2 Evidencia de verificación (no supuesta — ejecutada y observada)

- `npm install` (raíz): completado, 945 paquetes instalados.
- `npm run prisma:generate --workspace=apps/api`: `✔ Generated Prisma Client (v5.22.0)`.
- `npm run build --workspace=apps/api`: exit 0, con `apps/api/dist/src/main.js` y el resto de los `.js` compilados presentes (verificado con listado de archivos, no solo exit code).
- `npx prisma migrate deploy` (contra Postgres local en `localhost:5500`, contenedor `otrarondamas-db-1` ya corriendo vía Docker): `1 migration found`, `No pending migrations to apply` — la migración inicial ya estaba aplicada.
- `npm run prisma:seed --workspace=apps/api`: corrió sin error, upsert de empresa, usuarios owner/seller, categorías, caja.
- **Arranque real**: `node dist/src/main.js` — log de Nest confirmó `Nest application successfully started`, conexión a `PrismaModule` inicializada, ruta `GET /` mapeada.
- **Requests reales contra el servidor corriendo**: `GET http://localhost:3000/` → `200 "Hello World from API!"`; `GET http://localhost:3000/api/docs` (Swagger) → `200`.
- Servidor detenido explícitamente después de la verificación (no quedó corriendo en background).

### 4.3 Lo que esto NO resuelve

Esta reparación deja el **entorno** instalable y la API **arrancable**, pero el gap funcional descrito en la auditoría contra `docs/prompt-scaffolding-opencode.md` sigue vigente: no hay módulo `auth`, no hay módulos de dominio (`ventas`, `caja`, `inventario`, etc.), no hay aislamiento multiempresa real, y ninguno de los 10 criterios de aceptación de ese prompt fue ejecutado. El próximo incremento funcional planeado es el módulo `auth` (JWT + guard de permisos), por ser prerequisito de todo lo demás.

## 5. Módulo `auth` (20/09/2026)

Primer módulo de dominio real del backend. Cubre autenticación (login con JWT) y autorización por permiso granular — es el prerequisito señalado en la sección 4.3 para todo lo demás (multiempresa, autorización D-06, endpoints de negocio).

### 5.1 Qué se implementó

- **Dependencias agregadas** (`apps/api/package.json`): `@nestjs/jwt`, `@nestjs/passport@10.0.3` (pineado a esa versión porque `@nestjs/passport@latest` exige Nest 11/12 y el proyecto usa Nest 10 — `npm install` sin pin fallaba con `ERESOLVE`), `passport`, `passport-jwt`, y sus `@types` correspondientes.
- **`apps/api/src/auth/`**: módulo completo.
  - `auth.service.ts` — `login(email, password)`: busca el usuario por email, compara `password` contra `passwordHash` con bcrypt, devuelve 401 idéntico tanto si el email no existe como si la password es incorrecta (no revela cuál de los dos falló). Emite JWT con `sub, email, nombre, empresaId, permisos`.
  - `jwt.strategy.ts` — valida el JWT contra `JWT_SECRET` (falla al arrancar si la variable no está seteada, en vez de firmar con secreto vacío).
  - `guards/jwt-auth.guard.ts` — exige token válido.
  - `guards/permissions.guard.ts` + `decorators/requiere-permiso.decorator.ts` — `@RequierePermiso('caja.gastos')` sobre un endpoint exige que `request.user.permisos` (poblado desde el JWT) incluya ese permiso; si no, 403. Debe combinarse siempre con `JwtAuthGuard` primero.
  - `auth.controller.ts` — `POST /auth/login` (público) y `GET /auth/me` (protegido, devuelve el usuario autenticado — útil para que los frontends verifiquen la sesión).
  - `dto/login.dto.ts` — validación de entrada con `class-validator` (`IsEmail`, `IsString`).
- **`apps/api/src/main.ts`**: agregado `ValidationPipe` global (`whitelist: true, transform: true`) — sin esto, los DTOs con `class-validator` no se validan en runtime aunque estén bien escritos.
- **`apps/api/src/app.controller.ts`**: agregado `GET /protegido/caja-gastos`, endpoint mínimo solo para poder verificar el guard de permisos end-to-end sin adelantar el módulo de caja real (que es un incremento aparte).

### 5.2 Limitación conocida, documentada en el código

Los permisos viajan embebidos en el JWT (no se re-consultan en cada request). Si un permiso se revoca en la base, el cambio no se refleja hasta que el usuario vuelva a loguearse — no hay mecanismo de revocación de tokens todavía. Comentado explícitamente en `auth.types.ts`.

### 5.3 Evidencia de verificación (ejecutada contra el build compilado, no en modo watch)

Servidor arrancado con `node dist/src/main.js` contra Postgres local ya seedeado (usuarios `owner@otrarondamas.com` y `seller@otrarondamas.com`, password `password123`):

| Caso | Resultado observado |
|---|---|
| `POST /auth/login` con credenciales de owner correctas | `200`, devuelve `accessToken` + lista de 8 permisos |
| `POST /auth/login` con password incorrecta | `401` |
| `POST /auth/login` con email inexistente | `401` (mismo mensaje que password incorrecta) |
| `POST /auth/login` con email con formato inválido | `400`, `["email must be an email"]` |
| `POST /auth/login` con body vacío | `400`, lista de errores de validación de ambos campos |
| `GET /auth/me` con token de owner | `200`, devuelve id/email/nombre/empresaId/permisos correctos |
| `GET /auth/me` sin token | `401` |
| `GET /protegido/caja-gastos` con token de owner (tiene el permiso) | `200 {"ok":true}` |
| `GET /protegido/caja-gastos` con token de seller (sin el permiso, según seed) | `403 {"message":"Requiere el permiso 'caja.gastos'"}` |
| `GET /protegido/caja-gastos` sin token | `401` |

Estos 10 casos reproducen exactamente el criterio de aceptación #5 de `docs/prompt-scaffolding-opencode.md` ("con el usuario vendedor, intentar un endpoint que requiera un permiso que no tiene y confirmar rechazo") — es el primero de los 10 pasos de esa sección que queda efectivamente verificado con evidencia real, no solo declarado.

- `npm run build --workspace=apps/api`: exit 0, `.js` del módulo auth presentes en `dist/src/auth/`.
- `npm run lint --workspace=apps/api`: sin errores. Nota: `login.dto.ts` necesitó un `/* eslint-disable indent */` puntual — la regla `indent` base de ESLint del proyecto tiene un falso positivo conocido con decoradores de propiedad de clase (`@IsEmail()` seguido de la propiedad en la línea siguiente); no había ningún DTO previo en el proyecto que expusiera este patrón. No se tocó la configuración global de ESLint.
- Servidor detenido explícitamente después de cada corrida de pruebas (no quedó corriendo en background).

### 5.4 Qué NO cubre este incremento (al cierre de la sección 5)

- Aislamiento multiempresa a nivel de query (Prisma Client Extension o RLS) — sigue sin implementar. El JWT ya lleva `empresaId`, pero ningún service lo usa todavía porque no hay services de dominio más allá de `auth`.
- Mecanismo de autorización del dueño (D-06, `Autorizacion`) — el `PermissionsGuard` de este incremento es control de acceso por permiso de un usuario ya autenticado, no el mecanismo de autorización explícita para operaciones restringidas que pide D-06. Son piezas distintas.
- Refresh tokens / revocación de sesión — no implementado (ver 5.2).
- Frontend: cubierto en la sección 6, a continuación.

## 6. Login real en `apps/pos-admin` (20/09/2026)

Conecta el frontend POS/Admin al módulo `auth` del backend con un login funcional de punta a punta — cierra el criterio de aceptación #8 de `docs/prompt-scaffolding-opencode.md` ("levantar pos-admin, loguearse, ver datos reales de la API").

### 6.1 Qué se implementó

- **`packages/shared-types/src/index.ts`**: reescrito. El contenido anterior (`User { id, email, name }`) no coincidía con lo que la API realmente devuelve (`nombre`, no `name`; sin `empresaId` ni `permisos`). Ahora expone `AuthenticatedUser`, `LoginRequest`, `LoginResponse` alineados con `apps/api/src/auth/auth.types.ts` y la respuesta real de `POST /auth/login`.
- **`packages/shared-types/tsconfig.json`**: tenía el mismo bug que `apps/api/tsconfig.json` (heredaba `noEmit: true` del base sin sobreescribirlo) — el paquete nunca se había compilado, por lo que `dist/index.js` no existía y cualquier import desde un frontend habría fallado. Se agregó `"noEmit": false"` y `"composite": true` (esto último lo exige `tsc -b` por el project reference que `apps/pos-admin/tsconfig.json` ya declaraba hacia este paquete).
- **`apps/pos-admin/src/lib/api.ts`** (nuevo): cliente HTTP tipado mínimo (`fetch`, sin librería adicional). Lee `VITE_API_URL` si está seteada, si no apunta a `http://localhost:3000`. Adjunta el `Bearer` token desde `localStorage` automáticamente. Traduce errores de `class-validator` (arrays de mensajes) a un string legible.
- **`apps/pos-admin/src/features/auth/AuthContext.tsx`** (nuevo): contexto de React (sin Redux/Zustand/etc., tal como pide el prompt) que guarda `accessToken` y el usuario en `localStorage`, expone `login()`/`logout()`.
- **`apps/pos-admin/src/features/auth/LoginPage.tsx`** (nuevo): formulario real (email + password) contra `api.login()`. Muestra el mensaje de error tal como lo devuelve la API (ej. "Credenciales inválidas").
- **`apps/pos-admin/src/features/auth/ProtectedRoute.tsx`** (nuevo): redirige a `/login` si no hay usuario en el contexto.
- **`apps/pos-admin/src/features/dashboard/DashboardPage.tsx`** (nuevo): pantalla post-login. Llama a `GET /auth/me` **contra la API real** al montar (no confía solo en el `localStorage`) — si la API rechaza el token (401), cierra la sesión automáticamente. Muestra usuario, empresa y permisos reales devueltos por el backend.
- **`apps/pos-admin/src/App.tsx`**: reescrito para envolver la app en `AuthProvider` y usar `ProtectedRoute` en `/`.
- **`apps/api/src/main.ts`**: **bug encontrado durante la verificación, no antes**: la API no tenía CORS habilitado. Un navegador real en `localhost:5173` habría bloqueado toda llamada a `localhost:3000` (confirmado con un preflight `OPTIONS` real, que devolvía `404 Cannot OPTIONS /auth/login` antes del fix). Se agregó `app.enableCors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true })`, con un TODO explícito para restringir a los orígenes reales antes de cualquier despliegue.

### 6.2 Evidencia de verificación

No hay navegador disponible en este entorno de ejecución, así que la verificación se hizo reproduciendo exactamente las llamadas HTTP (incluyendo preflight CORS) que un navegador real emitiría, contra el build de producción de ambas apps (`vite build` + `nest build`, no modo dev/watch para el chequeo final de build):

- `npm run build --workspace=packages/shared-types`: exit 0, genera `dist/index.js` + `dist/index.d.ts`.
- `npm run build --workspace=apps/pos-admin`: exit 0 (`tsc -b && vite build`), genera `dist/index.html`, `dist/assets/*.js` (167 KB), `dist/assets/*.css`.
- `npm run lint --workspace=apps/pos-admin`: sin errores.
- `npm run lint --workspace=apps/api`: sin errores tras el cambio en `main.ts`.
- **Servidor de desarrollo real** (`npm run dev --workspace=apps/pos-admin`, puerto 5173) + **API real** (`node dist/src/main.js`, puerto 3000, contra Postgres local seedeado):
  - `GET http://localhost:5173/` → `200`, HTML con `<script src="/src/main.tsx">`.
  - `GET http://localhost:5173/src/App.tsx`, `/src/features/auth/AuthContext.tsx`, `/src/lib/api.ts` → todos `200` (si `@otrarondamas/shared-types` no hubiese resuelto, Vite habría devuelto 500).
  - **Antes del fix de CORS**: `OPTIONS http://localhost:3000/auth/login` con `Origin: http://localhost:5173` → `404 Cannot OPTIONS /auth/login` (Nest ni siquiera manejaba el preflight).
  - **Después del fix**: mismo `OPTIONS` → `204`, con `Access-Control-Allow-Origin: http://localhost:5173`.
  - `POST http://localhost:3000/auth/login` con `Origin: http://localhost:5173`, credenciales de owner → `200`, headers `Access-Control-Allow-Origin`/`Access-Control-Allow-Credentials` presentes, `accessToken` + `usuario` en el body.
  - `GET http://localhost:3000/auth/me` con el token recién obtenido y `Origin: http://localhost:5173` → `200`, headers CORS presentes — reproduce exactamente la llamada que `DashboardPage` hace al montar.
- Ambos servidores (API y Vite) detenidos explícitamente después de la verificación.

### 6.3 Qué NO cubre este incremento

- No se verificó en un navegador real (Chrome/Firefox) con DevTools — la verificación fue por réplica exacta de las llamadas HTTP que el navegador haría, incluyendo el preflight CORS, pero sigue siendo una aproximación por línea de comandos, no una prueba visual.
- No hay pantalla de "listado de productos" ni de ningún otro módulo de negocio — no existe el controller correspondiente en el backend todavía; agregar esa pantalla ahora habría sido simular datos, algo que el prompt de scaffolding prohíbe explícitamente.
- `apps/tienda-online` no fue tocado en este incremento.
- El origen CORS está hardcodeado a los puertos de desarrollo local (`5173`/`5174`) — no hay configuración por entorno todavía (correcto para este piloto local, pero es un TODO explícito antes de cualquier despliegue).

## 7. Aislamiento multiempresa real (INV-01) (20/09/2026)

Implementa el mecanismo de aislamiento multiempresa exigido explícitamente por `docs/prompt-scaffolding-opencode.md` ("un middleware que confía en que cada service recuerde agregar el filtro manualmente NO cumple esta exigencia") y cierra el criterio de aceptación #6 del mismo prompt.

### 7.1 Mecanismo elegido: Prisma Client Extension

Entre las dos opciones que planteaba el prompt (Prisma Client Extension vs. Row-Level Security de PostgreSQL), se eligió **Client Extension**. Motivo: RLS exige ejecutar `SET app.current_empresa_id` en cada conexión física antes de cada query, lo cual es frágil de garantizar con el pool de conexiones interno de Prisma (que reutiliza conexiones entre requests sin control manual de asignación). La Client Extension logra la misma garantía — ninguna query a un modelo con `empresaId` puede ejecutarse sin ese filtro — sin depender de estado de sesión de la conexión.

### 7.2 Qué se implementó

- **`apps/api/src/prisma/empresa-scope.extension.ts`** (nuevo): factory `empresaScopeExtension(empresaId)` que intercepta **todas** las operaciones de Prisma sobre los 17 modelos que tienen `empresaId` como columna directa (`Usuario`, `Categoria`, `Producto`, `Presentacion`, `Lote`, `Cliente`, `CuentaCorriente`, `Deuda`, `Venta`, `Pedido`, `Pago`, `Caja`, `Proveedor`, `Compra`, `RecepcionCompra`, `MovimientoStock`, `Entrega`, `Notificacion`, `AuditLog`, `Autorizacion`):
  - `create`/`createMany`: fuerza `empresaId` en `data`, ignorando cualquier valor que venga del body del request (no confía en que el cliente mande el `empresaId` correcto).
  - `findFirst(OrThrow)`, `findMany`, `update(Many)`, `delete(Many)`, `count`, `aggregate`: inyecta `empresaId` en el `where` de nivel superior.
  - `findUnique`/`findUniqueOrThrow`: manejo especial (ver 7.3) porque Prisma no permite agregar `empresaId` a un `where` de `findUnique` sin un `@@unique` compuesto que respalde esa combinación, y ninguno de los modelos de este schema lo define.
  - Cualquier otra operación (ej. `upsert`) **no contemplada explícitamente lanza un error** en vez de dejarla pasar sin scope — para no asumir silenciosamente que una operación nueva es segura.
  - **Limitación documentada, no oculta**: los modelos que heredan el scope a través de una relación (`VentaItem`→`Venta`, `AplicacionPago`→`Pago`/`Deuda`, `AperturaCaja`/`MovimientoCaja`/`ArqueoCaja`/`CierreCaja`→`Caja`, `CompraItem`→`Compra`) **no están cubiertos** por este extension todavía. Queda como decisión pendiente (extension aparte con join implícito, vs. disciplina de siempre consultarlos anidados desde su padre) — no se inventó una solución para no dejarla a medias sin decirlo.
- **`apps/api/src/prisma/empresa-scoped-prisma.service.ts`** (nuevo): `EmpresaScopedPrismaService`, provider singleton normal con un método `forEmpresa(empresaId)` que devuelve el cliente ya extendido para esa empresa.
- **`apps/api/src/catalogo/`** (nuevo, mínimo): `CatalogoController` con `GET /catalogo/productos/:id`. No es el módulo de catálogo completo de RF-03 (eso es un incremento aparte) — existe solo para poder verificar el aislamiento con un endpoint real en vez de con un test unitario aislado del resto del sistema.
- **`apps/api/prisma/seed.ts`**: agregada la segunda empresa de prueba ("Empresa Demo Aislamiento") que el prompt de scaffolding pedía y que no existía (gap detectado en la auditoría inicial de esta sesión) — con su propio usuario dueño (`owner@demo-aislamiento.com`) y un producto propio, exclusivamente para poder probar el aislamiento.

### 7.3 Bug real de NestJS encontrado y resuelto durante la verificación (no documentado a priori)

La primera implementación usaba el patrón estándar de la documentación de Nest para este caso: `EmpresaScopedPrismaService` como `@Injectable({ scope: Scope.REQUEST })`, inyectando `@Inject(REQUEST)` en el constructor para leer `request.user.empresaId` (poblado por `JwtAuthGuard`) automáticamente.

**Al probar contra el servidor real** (no en un test aislado), este patrón falló: una request a `GET /catalogo/productos/:id` con un JWT válido devolvía 403 con el mensaje `"EmpresaScopedPrismaService requiere un usuario autenticado..."`, como si el guard nunca hubiera corrido. Se agregaron logs temporales (`console.log` en el guard y en el constructor del service) y se confirmó: **el provider `Scope.REQUEST` se construye antes de que `JwtAuthGuard.canActivate` se ejecute**, tanto con el guard aplicado por-controller (`@UseGuards`) como registrado como guard global (`APP_GUARD`) — en ambos casos, una request **sin ningún token** llegaba a construir el service, cuando debería haber sido cortada por el guard con 401 antes de eso.

Esto es una limitación real de cómo NestJS resuelve el árbol de dependencias de un controller que tiene un provider request-scoped en su constructor: Nest necesita instanciar ese sub-árbol al recibir la request, en un punto que puede preceder al pipeline de guards.

**Solución aplicada**: se descartó el patrón `Scope.REQUEST` + `@Inject(REQUEST)`. `EmpresaScopedPrismaService` pasó a ser un provider singleton normal con el método `forEmpresa(empresaId)`; el controller lee el `empresaId` explícitamente con `@CurrentUser()` (poblado por el guard, que en este punto —dentro del cuerpo del método, no en un constructor— sí corrió con certeza) y se lo pasa al método. Esto también motivó registrar `JwtAuthGuard` y `PermissionsGuard` como guards **globales** (`APP_GUARD` en `app.module.ts`) en vez de repetir `@UseGuards` por controller, con un decorador `@Public()` para las rutas exceptuadas (`POST /auth/login`, `GET /`) — simplifica el código y evita que alguien reintroduzca el mismo bug aplicando el guard solo localmente en un controller con un provider request-scoped.

### 7.4 Evidencia de verificación (criterio de aceptación #6 del prompt de scaffolding, ejecutado contra el build final)

Seed re-ejecutado con la segunda empresa. Servidor arrancado desde `node dist/src/main.js` contra Postgres local:

| Caso | Resultado observado |
|---|---|
| Owner de "Otra Roonda Más" lee por id un producto de "Empresa Demo Aislamiento" | **`404 {"message":"Producto no encontrado"}`** — nunca devuelve el dato de la otra empresa |
| Owner de "Empresa Demo Aislamiento" lee ese mismo producto (es el suyo) | `200` con los datos completos y correctos |
| Mismo request sin token | `401 Unauthorized` |
| Mismo request con un id que no existe en ninguna empresa | `404` (no `500`) |
| Regresión: `GET /auth/me`, `POST /auth/login`, `GET /`, `GET /protegido/caja-gastos` (owner/seller) | Todos con el mismo resultado que en la sección 5 — el cambio a guards globales no rompió nada existente |
| Regresión: preflight CORS `OPTIONS /auth/login` con `Origin` de Vite | Sigue devolviendo `204` con los headers correctos |

- `npm run build --workspace=apps/api`: exit 0.
- `npm run lint --workspace=apps/api`: sin errores — nota: el primer `--fix` automático rompió la sintaxis de un `throw` multilínea en `empresa-scope.extension.ts` (una llave `{` faltante), detectado porque el lint corrió una segunda vez con `--fix` y falló con `Parsing error`, no porque se haya revisado el diff a simple vista. Se corrigió a mano y se re-verificó build + lint.
- Servidor detenido explícitamente después de cada corrida de pruebas.

### 7.5 Qué NO cubre este incremento

- Los modelos que heredan el scope por relación (ver lista en 7.2) no tienen aislamiento automático todavía.
- Row-Level Security no se implementó (se descartó explícitamente, ver 7.1) — si en algún momento se decide migrar a RLS como capa adicional de defensa en profundidad, es una decisión aparte.
- No hay tests automatizados (unitarios/e2e) para este mecanismo — la verificación de esta sección fue manual, contra el servidor real, no una suite que corra en CI.
- El resto de los módulos de dominio (`ventas`, `caja`, `inventario`, etc.) siguen sin existir — este incremento entrega el mecanismo de aislamiento, no los módulos que lo van a usar.

## 8. Spec detallada de Catálogo de Productos (20/09/2026) — fricciones con lo ya implementado

El dueño aportó `docs/spec-catalogo-productos.md`, un borrador de especificación funcional más granular para RF-03 (ver la referencia agregada en el SDD, sección RF-03). Es un documento propuesto, no aprobado, y no reemplaza el SDD ni cierra RF-03. Esta sección deja registrados los puntos de fricción con el `schema.prisma` actual, para que quien lo implemente no los descubra a mitad de camino ni los resuelva por asunción.

### 8.1 Conceptos que el spec pide separar y hoy están fusionados o ausentes

- **SKU interno vs. `Producto.id`**: el spec exige un SKU interno estable, independiente del id técnico y de cualquier código de proveedor (sección 4.5). Hoy `Producto.codigoInterno` cumple parcialmente ese rol, pero es un campo string libre sin política de generación definida, y no hay separación entre "identificador interno" y "código legible" como el spec sugiere.
- **`Variante`**: no existe como entidad en el schema actual. El spec la pide como nivel intermedio entre `Producto` y `Presentacion` (sección 4.3) — ej. sabor, tamaño, color — antes de llegar al artículo vendible concreto.
- **Código de origen / relación proveedor-producto**: no existe ninguna entidad hoy que registre "este código de este proveedor corresponde a este SKU interno" (spec sección 4.6, 4.8). El modelo actual no tiene concepto de catálogo de proveedor separado del catálogo propio.
- **Importación y conciliación**: no hay ninguna entidad ni endpoint de importación de catálogos, estados de conciliación (nuevo/probable/confirmado/duplicado/rechazado), ni trazabilidad de "de qué archivo/importación vino este registro" (spec secciones 6 y 7). Es funcionalidad completamente nueva, no una extensión de algo existente.
- **Lista de precios con historial**: el schema actual tiene un único `precioMinorista`/`precioMayorista` por producto, sin historial ni concepto de "lista" por proveedor/canal/vigencia (spec sección 4.9 y 10.5). Cambiar un precio hoy sobrescribe el anterior sin dejar rastro — contradice explícitamente el principio del spec ("los precios de listas distintas no deben sobrescribirse entre sí").
- **Código de barras por presentación**: hoy `Producto.codigoBarras` es un único campo opcional a nivel de producto. El spec pide que un código de barras pueda asociarse a una presentación específica y que un SKU pueda tener más de un código de barras (sección 4.7) — el modelo actual no lo permite.

### 8.2 Puntos de compatibilidad (sin fricción)

- `empresaId` en `Producto`/`Categoria`/`Presentacion`: coincide con el aislamiento multiempresa ya implementado (sección 7) — cualquier entidad nueva de este módulo (proveedor-producto, importación, lista de precios) debería seguir el mismo patrón y quedar cubierta por `empresaScopeExtension`.
- El principio de "no inferir conversiones por suposición" (spec sección 9.3) ya está reflejado en el criterio de diseño aprobado D-08 y en el campo `Presentacion.factorConversion` (nullable, sin default).
- El principio de "un código no identificado no debe generar stock" (spec CA-09) es compatible con D-09/D-11 y con el enfoque general del SDD de no asumir datos comerciales no confirmados.

### 8.3 Estado de la decisión

No se implementó nada de este spec en este ciclo — es un documento para revisión, tal como pide su propia sección 15 ("no tratar esta propuesta como aprobada automáticamente"). Antes de empezar cualquier incremento sobre catálogo, falta resolver como mínimo las decisiones pendientes que ya señala el propio documento (su sección 14) más una decisión de alcance: si el MVP del piloto (fecha objetivo 30/11/2026) necesita todo este nivel de detalle (importación multi-proveedor, conciliación, historial de listas) o si es una evolución post-piloto, dado que el SDD general no lo tenía contemplado en el alcance original del MVP (sección 2.1).

## 9. CRUD de productos sobre RF-03 (20/09/2026)

Primer módulo de negocio real con escritura (create/update), no solo lectura. Implementado contra el `schema.prisma` actual (Producto simple) — **no** implementa nada de `docs/spec-catalogo-productos.md` (ver sección 8, sigue sin aprobar).

### 9.1 Qué se implementó

- **`apps/api/src/catalogo/dto/create-producto.dto.ts`** y **`update-producto.dto.ts`** (nuevos): validación con `class-validator`. `UpdateProductoDto` excluye `codigoInterno` — no es editable por este endpoint (cambiarlo podría romper referencias externas como códigos de barras ya impresos).
- **`apps/api/src/catalogo/catalogo.controller.ts`**: extendido de un único `GET /catalogo/productos/:id` a CRUD completo bajo `/catalogo/productos`:
  - `GET /catalogo/productos` — listado, con filtro opcional `?activo=true|false`.
  - `GET /catalogo/productos/:id` — ya existía.
  - `POST /catalogo/productos` — protegido con `@RequierePermiso('productos.gestionar')`. Verifica que `categoriaId` exista **y pertenezca a la misma empresa** antes de crear (`empresaScopeExtension` no puede inferir esa validación desde una FK simple, se hace explícita).
  - `PATCH /catalogo/productos/:id` — mismo permiso. Igual verificación de categoría si se cambia.
  - **Sin `DELETE`**: RF-03 no pide borrado físico, solo desactivar (`activo: false`) vía `PATCH` — mismo criterio que INV-02 aplica a `Venta`.
- **Hallazgo de schema, documentado, no corregido en este ciclo**: `Producto.codigoInterno` tiene `@unique` **global**, no `@@unique([empresaId, codigoInterno])` como pedía explícitamente el prompt de scaffolding original ("dos empresas distintas pueden vender el mismo producto físico con el mismo código de barras real"). Hoy, dos empresas NO pueden usar el mismo `codigoInterno`. Corregirlo requiere una migración de Prisma; se decidió no mezclarlo con este incremento de CRUD — queda como TODO trazable en el propio código del controller.

### 9.2 Problema de tipos de TypeScript encontrado y resuelto (Prisma Client Extension + `Exact<>`)

Al pasar el DTO directo como `data` a `db.producto.create({ data: dto })`, el build fallaba con un error de tipos confuso (`Type 'CreateProductoDto' is not assignable to type 'Exact<...>'`) que no aparece usando el `PrismaClient` base sin el extension (se verificó aparte, aislando la causa antes de "solucionar a ciegas"). La causa: la inferencia de tipos genérica que produce `$allOperations` del Client Extension no preserva la precisión estructural que Prisma necesita para resolver su tipo `Exact<XOR<Checked, Unchecked>>` en el call site. Solución: anotar explícitamente el objeto `data` con el tipo `Prisma.ProductoUncheckedCreateInput` / `Prisma.ProductoUncheckedUpdateInput` antes de pasarlo a `create`/`update`, en vez de pasar el DTO o un objeto inline sin anotar. Documentado en el propio código para que no se repita el mismo desconcierto en el próximo módulo que use este patrón.

### 9.3 Evidencia de verificación (contra el build final, servidor real, Postgres local)

| Caso | Resultado observado |
|---|---|
| `GET /catalogo/productos` con owner (empresa "Otra Roonda Más") | `200`, solo los 5 productos DEMO de esa empresa |
| `GET /catalogo/productos` sin token | `401` |
| `POST /catalogo/productos` con owner (tiene `productos.gestionar`) | `201`, producto creado con los datos correctos |
| `POST /catalogo/productos` con seller (según el seed, **sí** tiene `productos.gestionar`) | `201` — comportamiento correcto, no un fallo del guard (se confirmó aparte que seller sigue recibiendo `403` sobre `/protegido/caja-gastos`, que exige un permiso que no tiene) |
| `PATCH /catalogo/productos/:id` del producto propio (cambiar precio y desactivar) | `200`, cambios aplicados y verificados con una lectura posterior |
| **Test clave**: `PATCH` del mismo producto con el owner de la **otra** empresa (aislamiento) | `404 "Producto no encontrado"` — y se confirmó con una lectura posterior que el precio **no cambió** (no fue un 404 engañoso mientras el update igual corría) |
| `POST` con `categoriaId` inexistente | `404 "Categoría no encontrada"` (no `500`) |
| `POST` con DTO inválido (sin `nombre`) | `400` con los mensajes de `class-validator` |
| Regresión: `GET /auth/me`, `GET /catalogo/productos/:id` (aislamiento de la sección 7) | Sin cambios respecto a antes |

- `npm run build --workspace=apps/api`: exit 0.
- `npm run lint --workspace=apps/api`: sin errores.
- Servidor detenido explícitamente después de la verificación.

### 9.4 Qué NO cubre este incremento

- `Presentacion` y `Lote` no tienen CRUD todavía — solo `Producto`.
- No hay endpoint de categorías (`Categoria` se usa de lectura implícita para validar `categoriaId`, pero no hay `POST /catalogo/categorias`).
- El bug de `codigoInterno` único global (9.1) sigue sin corregir.
- Nada de `docs/spec-catalogo-productos.md` (importación, conciliación, SKU separado, listas de precios) — sigue pendiente de aprobación.

## 10. Importación del catálogo real "Lista minorista" al seed (20/09/2026)

A pedido explícito del dueño: cargar el catálogo consolidado real como datos de demo, con 100 unidades de stock por producto, empezando por la fuente Minorista (las otras dos fuentes del archivo — Coca-Cola y DIPA MAX — quedan para un incremento aparte).

### 10.1 Fuente y reglas seguidas

Fuente: `docs/Catalogos raw/Catalogo_Consolidado_Intermedio_Otra_Roonda_Mas.xlsx`, solapa `Maestro_intermedio`, filtrado a `fuente = 'Lista minorista'`. Antes de tocar el dato se leyó la solapa `LEEME_agente` de ese mismo archivo (el dueño pidió explícitamente seguirla) — resume así: es un archivo intermedio de consulta, no sustituye la SPEC ni el catálogo operativo; no se fusionan productos entre fuentes; los precios no se convierten ni recalculan; **no se inventan códigos de barras**; antes de importar hay que validar obligatorios, duplicados y correspondencia producto-precio.

Se siguieron esas reglas al pie de la letra:

- **Solo la fuente Minorista** (4.357 filas) — es la única con `precio_minorista` y `rubro` completos en el 100% de sus filas. Coca-Cola (151 filas) no trae `precio_minorista`, solo mayorista/sugerido, y la fuente marca "revisar nota sobre posible inconsistencia". DIPA MAX (270 filas) no tiene precio en absoluto en esta tabla consolidada — la fuente misma dice "asociación producto-precio no validada". Ninguna de las dos se importó.
- **15 filas excluidas** por `precio_minorista = 0` (exhibidores y artículos de "regalo" promocional, no productos vendibles reales) → **4.342 productos** importados.
- **`codigoBarras` = `null` para los 4.342** — ninguna fila de la fuente trae uno real, y el LEEME prohíbe inventarlo.
- Se verificó que `codigo_proveedor` es único dentro de Minorista (0 duplicados) antes de usarlo como `Producto.codigoInterno`.

### 10.2 Archivos nuevos/modificados

- **`apps/api/prisma/seed-data-minorista.json`** (nuevo, 4.342 registros, ~620 KB): extracto limpio (`codigoInterno`, `nombre`, `rubro`, `precioMinorista`) del Excel original, generado con un script Python de un solo uso (no versionado) que parseó el formato numérico argentino (`"1.573,614"` → `1573.614`) y excluyó las filas de precio 0.
- **`apps/api/prisma/seed.ts`**: reescrito. Se agregó la importación del catálogo Minorista (categorías por rubro + productos + lotes de stock demo, todo en batches de 500 con `createMany`/`skipDuplicates` para que el script siga siendo re-ejecutable sin duplicar). Se **reemplazaron** los 5 productos `DEMO -` ficticios que tenía el seed original — decisión explícita del dueño, no algo que se infirió.

### 10.3 Placeholders introducidos, documentados explícitamente (no asumidos en silencio)

El schema actual exige campos que esta fuente no provee. En cada caso se documentó la decisión en el propio `seed.ts`, no solo acá:

- **`Producto.costo`** (requerido, sin nullable): la fuente no trae costo, solo precio de venta. Se usó `costo = precioMinorista` como placeholder explícito — **no representa un margen real**. Coherente con D-18 del SDD (no calcular ganancias estimadas como definitivas sin método de costeo definido).
- **`Producto.categoria`**: se usó el `rubro` tal cual viene de la fuente (ej. "GOLOSINAS / CHOCOLATES") como nombre de 187 categorías nuevas, **sin mapearlas** a las 4 categorías base del piloto (Bebidas/Snacks/Almacén/Kiosco) — son taxonomías distintas y mapear una a la otra habría sido una clasificación inventada, no un dato de la fuente. Las 4 categorías base quedaron intactas, sin productos asignados por este seed.
- **`Producto.unidadBase`**: `UNIDAD` para las 4.342 filas — la fuente no permite derivar una unidad base confiable (D-08 prohíbe calcular conversiones por suposición).
- **`Lote.vencimiento`** (requerido, sin nullable en el schema actual): la mayoría de estos productos no son perecederos (papel de fumar, limpieza, bebidas con alcohol). Se usó "hoy + 10 años" como placeholder técnico — el schema no permite crear un `Lote` sin fecha de vencimiento, así que no había forma de omitirlo sin dejar de crear el stock demo que se pidió. No representa una fecha real.
- **`Lote.cantidad` = 100** por producto — dato de demo pedido explícitamente por el dueño, no una existencia real.
- **`Producto.precioMayorista`** y **`Producto.marca`**: `null` — no vienen en esta fuente, no se inventaron (D-01 exige explícitamente no asumir el precio mayorista).

### 10.4 Evidencia de verificación

- Limpieza previa: se borraron los 5 productos `DEMO -` originales y 2 productos de prueba creados manualmente durante la verificación del CRUD (sección 9) — 7 filas en total, confirmado con `DELETE 7`.
- `npm run prisma:seed --workspace=apps/api`: corrió sin error. Log: `Catálogo Minorista: 4342 filas a importar` → `Categorías del catálogo Minorista creadas/existentes: 187` → `Productos ya existentes (se omiten): 0. Nuevos a crear: 4342` → productos y lotes creados en 9 batches de hasta 500.
- **Verificación directa en Postgres** (no solo el log del script): `SELECT COUNT(*) FROM "Producto"` → `4342`. `SELECT COUNT(*), SUM(cantidad) FROM "Lote"` → `4342` lotes, `434200` unidades totales (`4342 × 100`, confirmado). `SELECT COUNT(DISTINCT cantidad) FROM "Lote"` → `1` (todas las cantidades son exactamente 100, sin outliers). `SELECT COUNT(*) FROM "Categoria"` → `191` (187 del catálogo + 4 base).
- **Idempotencia**: se corrió `npm run prisma:seed` una segunda vez. Log: `Productos ya existentes (se omiten): 4342. Nuevos a crear: 0`. Se confirmó en la base que el conteo de productos siguió en `4342` — no duplicó nada.
- **API real contra los datos reales**: build (`nest build`, exit 0) → arranque (`node dist/src/main.js`, `Nest application successfully started`) → `GET /catalogo/productos` con el owner real devolvió `200` con los 4.342 productos en 318ms (sin paginación — funciona, pero un listado de ese tamaño sin paginar no es viable para un frontend real; queda como hallazgo, no se corrigió en este ciclo) → se tomó un producto real del listado (`ACOND.SEDAL LUMINOUS UVx340c.c.`, código `012132`) y se repitió el **test clave de aislamiento multiempresa** de la sección 7 sobre datos reales: el owner de la otra empresa (`owner@demo-aislamiento.com`) intentó leerlo por id → `404`, igual que con los datos de prueba sintéticos.
- `npm run lint --workspace=apps/api`: sin errores.
- Servidor detenido explícitamente después de la verificación.

### 10.5 Qué NO cubre este incremento

- Coca-Cola y DIPA MAX siguen sin importar — les falta precio confiable o la fuente misma los marca como no validados. El dueño indicó explícitamente empezar solo con Minorista y "luego vemos las otras".
- Sin paginación en `GET /catalogo/productos` — funciona hoy (4.342 filas, 318ms), pero no escala a un catálogo mucho mayor ni es el contrato correcto para un listado de UI real.
- Los placeholders de la sección 10.3 (costo=precio, vencimiento+10 años, unidadBase=UNIDAD) siguen siendo placeholders — no se resolvieron datos reales de costo, vencimiento real por producto, ni unidades de medida reales. Quedan trazables para cuando haya esa información.
- Nada de `docs/spec-catalogo-productos.md` (SKU separado, conciliación, listas de precios con historial) se usó para esta importación — se hizo directamente sobre el schema actual, más simple.

## 11. Módulo `ventas` — RF-05, ventas presenciales (20/09/2026)

Primer módulo transaccional del backend: crea una venta con ítems, descuenta stock real y registra el movimiento, todo en una única transacción de Prisma. Usa el catálogo real importado en la sección 10, no datos sintéticos.

### 11.1 Qué se implementó

- **`apps/api/src/ventas/`** (nuevo): `ventas.module.ts`, `ventas.controller.ts`, `ventas.service.ts`, `dto/{create-venta,create-venta-item}.dto.ts`.
- **`POST /ventas`** (protegido con `@RequierePermiso('ventas.crear')`): recibe `canal` (`presencial`/`mayorista`/`online`), `clienteId` opcional (RF-05: "permitir ventas sin identificar al cliente") y una lista de ítems (`productoId` + `cantidad`, `descuentoItem` opcional).
  - **El precio no viene del cliente**: se toma `Producto.precioMinorista` del catálogo en el momento de la venta y se congela en `VentaItem.precioUnitario` — un request no puede mandar un precio arbitrario. Justificación: INV-12 ("los cambios de precio no modifican retrospectivamente ventas anteriores") implica que el precio de una venta se fija en el momento desde el catálogo, no desde lo que declare el cliente.
  - **Total calculado por el servidor**, no recibido del cliente.
  - Valida que cada `productoId` exista **y pertenezca a la empresa del usuario autenticado** — reutiliza el aislamiento multiempresa de la sección 7 (`EmpresaScopedPrismaService`). Si un producto no existe o es de otra empresa, `404` (no distingue los dos casos, mismo criterio que catálogo).
- **Descuento de stock, dentro de la misma transacción que crea la venta** (no una verificación previa separada): por cada ítem, toma stock de los `Lote` del producto en orden FIFO por vencimiento (el que vence antes se consume primero), genera un `MovimientoStock` tipo "Salida" por cada lote afectado con `referenciaId` = id de la venta (INV-03: trazabilidad). Si la suma de stock disponible en todos los lotes no alcanza, lanza `BadRequestException` y **toda la transacción se revierte** — incluyendo ítems anteriores del mismo pedido que sí eran individualmente válidos (INV-06: el stock no puede quedar negativo).
- **Sin `DELETE`**: INV-02 prohíbe eliminar físicamente una venta confirmada. Solo existen `POST`, `GET` (listado) y `GET /:id`.
- **TODO(D-09) explícito, documentado en el código**: el descuento de stock no excluye lotes vencidos todavía — el bloqueo por vencimiento (D-09) no está implementado. No es una omisión silenciosa: está comentado en `descontarStock()`.
- **TODO(D-01) explícito**: todo canal usa `precioMinorista` — no hay lógica de `ReglaPrecio`/precio mayorista todavía (esa entidad no existe en el schema).

### 11.2 Problema de tipos de TypeScript encontrado y resuelto (transacción sobre cliente extendido)

Anotar el parámetro `tx` del callback de `db.$transaction(async (tx) => ...)` con el tipo `Prisma.TransactionClient` estándar rompía el build: ese tipo no es estructuralmente compatible con el cliente que devuelve `EmpresaScopedPrismaService.forEmpresa()` (un cliente ya extendido con `empresaScopeExtension`). Mismo patrón de causa que el problema de `Exact<>` de la sección 9.2 — el tipo dinámico que produce un Prisma Client Extension no es intercambiable con los tipos base de `@prisma/client`. Solución: en vez de importar un tipo de Prisma, se extrajo el tipo real del parámetro `tx` directamente de la firma de `$transaction` del propio cliente extendido (`Parameters<Parameters<EmpresaScopedClient['$transaction']>[0]>[0]`), garantizando que sea exactamente el tipo que Prisma va a pasar en runtime.

### 11.3 Evidencia de verificación (contra servidor real, catálogo real de 4.342 productos, no datos sintéticos)

| Caso | Resultado observado |
|---|---|
| `POST /ventas` con 2 ítems reales (seller, tiene `ventas.crear`) | `201`, total correcto (`1674.746 × 8 = 13397.968`, verificado a mano), precio tomado del catálogo |
| **Verificación directa en Postgres** (no solo la respuesta HTTP): stock de los 2 productos vendidos | Bajó de `100→95` y `100→97` exactamente según lo vendido |
| **Verificación directa en Postgres**: `MovimientoStock` generado | 2 filas, `tipoMovimiento='Salida'`, `motivo='Venta'`, `referenciaId` = id de la venta — trazabilidad real, no solo declarada |
| Venta con cantidad mayor al stock disponible | `400 "Stock insuficiente... disponible 95, requerido 999999"` (no 500, mensaje con los números reales) |
| **Test clave de atomicidad**: venta con ítem 1 válido + ítem 2 imposible | `400`, y se confirmó en la base que el stock del ítem 1 (individualmente válido) **no bajó** — la transacción completa revirtió, no solo el ítem que falló |
| `GET /ventas/:id` con el dueño de la empresa | `200`, datos completos |
| **Test clave de aislamiento**: dueño de la otra empresa intenta leer esa venta por id | `404` |
| **Test clave de aislamiento**: dueño de la otra empresa intenta vender un producto que no es suyo | `404 "Producto ... no encontrado"` — el aislamiento de catálogo se propaga correctamente a ventas |
| `POST /ventas` sin token | `401` |
| DTO inválido: `canal` fuera de los 3 valores permitidos | `400` con el mensaje de `class-validator` |
| DTO inválido: `items` vacío | `400 "items must contain at least 1 elements"` |
| Venta con `productoId` que no existe en absoluto | `404` (no `500`) |
| `GET /ventas` (listado) | `200`, incluye la venta creada con sus ítems |
| `DELETE /ventas/:id` | `404 "Cannot DELETE"` — la ruta no existe, confirma INV-02 |

- `npm run build --workspace=apps/api`: exit 0.
- `npm run lint --workspace=apps/api`: sin errores.
- Servidor detenido explícitamente después de la verificación; se encontró y limpió un proceso Node huérfano de un intento de arranque anterior que había quedado ocupando el puerto 3000 (`EADDRINUSE`) antes de la corrida final de pruebas — diagnosticado por el mensaje de error real, no asumido.

### 11.4 Qué NO cubre este incremento

- No hay `Pago` asociado a la venta todavía (RF-08, incremento aparte) — la venta queda `CONFIRMADA` sin registro de cobro. No se actualiza `Caja` ni `MovimientoCaja`.
- No hay anulación ni devolución de ventas (RF-05 lo exige, INV-11) — solo alta y lectura.
- No hay búsqueda de productos por código/nombre/código de barras dentro del flujo de venta (RF-05 lo pide) — el cliente del POS debe conocer el `productoId` de antemano; no hay endpoint de búsqueda todavía.
- Bloqueo por vencimiento (D-09) no implementado — ver TODO en el código.
- Reglas de precio mayorista (D-01) no implementadas — todo canal usa `precioMinorista`.
- Sin frontend: `apps/pos-admin` no tiene pantalla de venta todavía, solo login y dashboard (sección 6).

## 12. Módulo `pagos` — RF-08, pagos manuales sobre una venta (20/09/2026)

Registra el cobro de una venta ya confirmada. Alcance acotado explícitamente: sin Mercado Pago, sin pagos sobre `Deuda`/cuenta corriente, sin reembolsos, sin actualización de Caja.

### 12.1 Qué se implementó

- **`apps/api/src/pagos/`** (nuevo): módulo, controller, service, DTO.
- **`POST /ventas/:ventaId/pagos`**: registra un pago (`medio` + `monto`) sobre una venta existente. Medios permitidos: `efectivo`, `transferencia`, `QR` — **`Mercado Pago` queda explícitamente fuera del DTO** (D-03 no tiene modalidad de integración definida todavía; el `class-validator` rechaza cualquier otro valor con `400`, no lo acepta silenciosamente).
  - **INV-04** ("el total de pagos aplicados no puede exceder el importe correspondiente"): dentro de una transacción, resuelve la venta con sus pagos `APROBADO` existentes, calcula el saldo pendiente (`total - pagado`), y rechaza con `400` si el nuevo pago lo excede — incluyendo el detalle numérico exacto en el mensaje (total, ya pagado, saldo). Se hace dentro de `$transaction` para que dos pagos concurrentes sobre la misma venta no puedan superar el total entre los dos sin que ninguno vea al otro (mismo criterio de atomicidad que el descuento de stock en `ventas`).
  - Los pagos manuales quedan en estado `APROBADO` directo al crearse — no hay una pasarela externa que confirme de forma asíncrona (eso es justamente lo que distinguiría a Mercado Pago, fuera de alcance).
  - **Reutiliza el permiso `ventas.crear`** en vez de inventar `pagos.crear`: ese permiso no existe en el catálogo del seed, y crear uno nuevo sin que haya una decisión de qué rol lo tiene habría sido una regla de negocio no autorizada. Documentado explícitamente en el código, no una omisión silenciosa.
- **`GET /ventas/:ventaId/pagos`**: lista los pagos de una venta.
- Aislamiento multiempresa heredado automáticamente: `Pago` ya estaba en la lista de modelos cubiertos por `empresaScopeExtension` (sección 7) — no requirió cambios en el extension.

### 12.2 Evidencia de verificación (contra servidor real, catálogo real)

| Caso | Resultado observado |
|---|---|
| Pago parcial ($2000 efectivo) sobre una venta de $3532.542 | `201`, `estado: APROBADO` |
| Segundo pago (transferencia) que completa el saldo exacto restante | `201` — pago mixto (dos medios distintos) funcionando |
| Tercer pago sobre la misma venta, ya saldada | `400 "El pago (1) excede el saldo pendiente de la venta (0). Total: 3532.542, ya pagado: 3532.542."` |
| Pago que excede el total desde el primer intento (venta nueva, sin pagos previos) | `400` con el mismo detalle numérico |
| **Verificación directa en Postgres**: conteo de `Pago` tras los 4 intentos (2 válidos, 2 rechazados) | Exactamente `2` filas — ningún intento rechazado dejó un pago fantasma |
| **Test clave de aislamiento**: dueño de la otra empresa intenta pagar una venta ajena | `404 "Venta no encontrada"` |
| `medio: "Mercado Pago"` | `400`, rechazado por el DTO (`class-validator`) — D-03 respetado, no se inventó la integración |
| `POST` sin token | `401` |
| `POST` sobre un `ventaId` inexistente | `404` (no `500`) |
| `GET /ventas/:ventaId/pagos` | `200`, lista completa y correcta |

- `npm run build --workspace=apps/api`: exit 0 — esta vez sin el problema de tipos de `Prisma.TransactionClient` visto en las secciones 9.2/11.2, porque se reutilizó desde el principio el patrón ya resuelto (extraer el tipo de `tx` de la firma real del cliente extendido).
- `npm run lint --workspace=apps/api`: sin errores.
- Servidor detenido explícitamente después de la verificación.

### 12.3 Qué NO cubre este incremento

- Mercado Pago (D-03) — ni siquiera un stub que intente una llamada saliente, tal como exige el prompt de scaffolding original.
- Pagos sobre `Deuda`/cuenta corriente (RF-10) — el modelo `Pago.deudaId` existe en el schema pero no se usa desde este módulo.
- Reembolsos, anulación de pagos, conciliación.
- `Caja`/`MovimientoCaja` no se actualizan cuando se registra un pago en efectivo — RF-09 ("actualizar caja... según el estado de la operación") queda pendiente para el módulo de caja.
- `Pago.comision` (RF-08 la pide explícitamente) queda en su default `0` — no hay lógica de cálculo de comisión por medio.

## 13. Pantalla de venta en `apps/pos-admin` (20/09/2026)

Primera pantalla del frontend que usa los módulos de negocio reales (`ventas`, `pagos`, búsqueda de `catalogo`), no solo auth. Flujo: buscar producto → armar carrito → confirmar venta → registrar pago.

### 13.1 Cambio de backend necesario, hecho en este mismo ciclo

`GET /catalogo/productos` no tenía forma de buscar — solo listado completo. Con el catálogo real cargado (4.342 productos, sección 10), una pantalla de venta sin búsqueda habría sido inutilizable: no tiene sentido pedirle al vendedor que scrollee 4.342 filas para encontrar un producto. Se agregó el parámetro `?search=` a `catalogo.controller.ts`:

- Busca por `nombre` o `codigoInterno`, case-insensitive (`contains`, `mode: 'insensitive'`).
- **Limita a 50 resultados** cuando se usa `search` — sin este límite, el propio buscador sería lento e inútil con miles de coincidencias posibles. El comportamiento sin `search` (listado completo, sin límite) se mantuvo igual, para no romper otros usos existentes del endpoint (ej. la pantalla de productos que ya lo consumía).
- Es un cambio acotado al alcance de "hacer usable la pantalla de venta", no una implementación completa de búsqueda (no hay full-text search, no hay ranking de relevancia, no busca por `codigoBarras` porque en el catálogo real ese campo es `null` para todos — ver sección 10.1).

### 13.2 Qué se implementó en el frontend

- **`packages/shared-types/src/index.ts`**: agregados los tipos `Producto`, `Venta`, `VentaItem`, `Pago`, y los request/response de los 3 endpoints nuevos que consume esta pantalla. Los campos `Decimal` de Prisma (`costo`, `precioMinorista`, `total`, `monto`, etc.) se tipan como `string` — así es como Prisma los serializa en JSON, no como `number` (evita un bug sutil de redondeo si alguien los tipara mal).
- **`apps/pos-admin/src/lib/api.ts`**: agregados `buscarProductos`, `crearVenta`, `getVenta`, `listarVentas`, `crearPago`, `listarPagos`.
- **`apps/pos-admin/src/features/ventas/useCarrito.ts`** (nuevo): hook de carrito en memoria del cliente (no persiste en `localStorage` ni en el servidor hasta confirmar la venta). El precio que muestra es solo informativo — el backend vuelve a tomar `precioMinorista` del catálogo al confirmar (ver sección 11.1), no confía en lo que mande el cliente.
- **`apps/pos-admin/src/features/ventas/BuscadorProductos.tsx`** (nuevo): input con debounce (300ms) contra `GET /catalogo/productos?search=`.
- **`apps/pos-admin/src/features/ventas/NuevaVentaPage.tsx`** (nuevo): pantalla completa — carrito editable (cantidad, quitar ítem), confirmar venta, y una vez confirmada, formulario de pago (medio + monto) contra la venta recién creada, con saldo pendiente calculado en el cliente a partir de los pagos ya registrados en esa sesión de UI (no vuelve a consultar `GET /ventas/:id/pagos` después de cada pago — ver 13.4).
- **`apps/pos-admin/src/App.tsx`**: nueva ruta `/ventas/nueva`, protegida, con link en la navegación (solo visible si hay sesión).

### 13.3 Problemas de lint encontrados y corregidos (reales, no falsos positivos)

- **`react-hooks/set-state-in-effect`**: la primera versión de `BuscadorProductos` llamaba `setResultados([])` sincrónicamente dentro del cuerpo de un `useEffect` cuando el texto de búsqueda era muy corto. Es una causa real de renders en cascada, no un capricho del linter. Se corrigió derivando `resultadosVisibles` (un booleano `consultaValida` que oculta los resultados de la búsqueda anterior sin volver a llamar `setState` sincrónicamente) en vez de limpiar el estado dentro del efecto.
- **`react/no-unescaped-entities`**: comillas literales `"` dentro de JSX (`Sin resultados para "{query}"`) — se reemplazaron por `&quot;`.

### 13.4 Evidencia de verificación

No hay navegador real disponible en este entorno (misma limitación que en la sección 6) — se verificó reproduciendo exactamente las llamadas HTTP que la UI hace, incluyendo el header `Origin` de Vite, contra los builds de producción de ambas apps:

- `npm run build --workspace=packages/shared-types`, `--workspace=apps/api`, `--workspace=apps/pos-admin`: los 3 con exit 0.
- `npm run lint` en `apps/api` y `apps/pos-admin`: sin errores (tras las correcciones de 13.3).
- **Backend**: `GET /catalogo/productos?search=coca` → `200`, encuentra "GOMA COCA MOGULx500g." (coincidencia parcial e insensible a mayúsculas). `?search=012132` → encuentra el producto por código exacto. `?search=xyzxyznoexiste` → `200 []` (no error, lista vacía).
- **API + Vite dev server corriendo juntos**: se confirmó que los 4 archivos nuevos (`NuevaVentaPage.tsx`, `BuscadorProductos.tsx`, `useCarrito.ts`, `lib/api.ts`) transforman con `200` vía el dev server de Vite (si `@otrarondamas/shared-types` no hubiera resuelto los tipos nuevos, habría sido `500`).
- **Flujo completo simulado con `Origin: http://localhost:5173` en cada request** (reproduciendo exactamente la secuencia que dispara la UI: buscar → confirmar venta → registrar pago):
  1. `GET /catalogo/productos?search=pila` → `200`, 50 resultados (confirma el límite).
  2. `POST /ventas` con el producto encontrado, cantidad 4 → `201`, total `6698.984` (`1674.746 × 4`, verificado a mano).
  3. `POST /ventas/:id/pagos` con `{medio: efectivo, monto: 6698.984}` → `201`.
  4. **Verificado en Postgres**: el stock del producto bajó correctamente tras las ventas de esta prueba.
- Un error de mi propio script de prueba (mezclar `curl -i` con `-o archivo.json`, lo que dejaba headers HTTP mezclados con el JSON) causó un fallo intermedio (`Cannot POST /ventas//pagos`, por un `venta.id` vacío al parsear mal el archivo) — diagnosticado, no era un bug del código, y se corrigió el comando de prueba antes de dar el flujo por verificado.
- Ambos servidores (API y Vite) detenidos explícitamente después de la verificación.

### 13.5 Qué NO cubre este incremento

- No se probó en un navegador real (Chrome/Firefox) con interacción de mouse/teclado — misma limitación documentada en la sección 6.
- `NuevaVentaPage` no vuelve a consultar el saldo real de la venta contra `GET /ventas/:id/pagos` después de cada pago — calcula el saldo pendiente localmente a partir de los pagos que la propia sesión de UI registró. Si otro operador registrara un pago sobre la misma venta desde otra pestaña/dispositivo, esta pantalla no lo reflejaría sin recargar.
- Sin selector de cliente (`clienteId`) en la UI — el campo existe en el backend pero la pantalla siempre vende sin identificar al cliente.
- Sin impresión de ticket ni comprobante (RF-05 lo pide, "emitir comprobante interno e imprimir ticket") — fuera de alcance.
- El límite de 50 resultados en la búsqueda es una decisión pragmática para esta pantalla, no un contrato de API general — si otro consumidor del endpoint necesitara más o paginación real, hay que revisarlo.

## 14. Módulo `caja` — RF-09, caja y arqueos (20/09/2026)

Cierra el ciclo operativo básico: apertura de turno, movimientos (automáticos por venta + manuales), arqueo con doble confirmación, y cierre. Respeta explícitamente que D-05 (umbral) y D-06 (mecanismo de autorización) siguen sin confirmar — no se inventó ninguno de los dos.

### 14.1 Migración de schema: `ArqueoCaja.usuarioEntranteId`

El schema actual solo tenía `usuarioId` en `ArqueoCaja` (un único usuario), pese a que RF-09 exige explícitamente "arqueo confirmado por vendedor saliente y entrante" — el mismo requisito que el prompt de scaffolding original había pedido modelar con dos campos separados y que el schema entregado no cumplía. A diferencia del gap de `codigoInterno` único global (sección 9.1, no corregido por afectar 17 modelos), este era un cambio acotado a un solo modelo, así que se corrigió con una migración real:

- **`apps/api/prisma/schema.prisma`**: agregado `usuarioEntranteId` (requerido) + relación nombrada `"ArqueoUsuarioEntrante"` a `Usuario` (Prisma exige nombrar la relación porque ya existía `usuarioId → Usuario` sin nombre apuntando al mismo modelo). Agregado el lado inverso `arqueosComoEntrante` en `Usuario`.
- **`apps/api/prisma/migrations/20260920220000_arqueo_usuario_entrante/`**: migración generada con `prisma migrate diff` (no `migrate dev`, que sigue siendo interactivo en este entorno — mismo procedimiento ya usado en el primer ciclo) y aplicada con `migrate deploy`. Se verificó que `ArqueoCaja` estaba vacía antes de aplicar (`SELECT COUNT(*)` → `0`) — la columna `NOT NULL` sin default no habría podido aplicarse con datos existentes.
- **Hallazgo adicional en el mismo diff, no relacionado con arqueo**: `Caja.empresaId` tenía `@@unique([empresaId])` declarado en el schema **desde el commit inicial**, pero el índice único **nunca se había aplicado a la base** — la migración inicial no lo incluyó. Confirmado con `\d "Caja"` antes del fix (sin índice único listado). Se corrigió en la misma migración porque `prisma migrate diff` lo detectó como pendiente; se documentó explícitamente en el propio SQL de la migración para que quede claro que no es parte del alcance de "doble confirmación de arqueo".

### 14.2 Conexión `pagos` → `caja` (necesaria para que el arqueo tenga sentido)

Sin este cambio, el arqueo no tendría forma de calcular el efectivo esperado sin inventar un número. Se extendió `pagos.service.ts` (dentro de la misma transacción que crea el `Pago`): cuando el medio es `efectivo` y hay una `AperturaCaja` vigente para la empresa, se crea automáticamente un `MovimientoCaja` tipo `'Venta'` con `referenciaId` apuntando al pago. Si no hay apertura vigente, el pago se registra igual (no bloquea la venta) pero sin movimiento de caja asociado — limitación documentada explícitamente, no un fallo silencioso.

### 14.3 Qué se implementó en `caja`

- **`apps/api/src/caja/`** (nuevo): módulo, controller, service, 3 DTOs.
- **Aislamiento manual, no automático**: `AperturaCaja`/`MovimientoCaja`/`ArqueoCaja`/`CierreCaja` no tienen `empresaId` directo (no cubiertos por `empresaScopeExtension`, ver sección 7.2). El service resuelve siempre primero la `Caja` de la empresa (`Caja.empresaId` sí está cubierto) y filtra todo lo demás a través de esa relación — mismo patrón ya usado para `Categoria` en el módulo catálogo.
- **`GET /caja/estado`**: caja + apertura vigente (o `null`).
- **`POST /caja/apertura`**: abre un turno con `montoInicial`. Rechaza con `409` si ya hay una apertura vigente (no permite abrir dos turnos superpuestos).
- **`POST /caja/movimientos`** (protegido con `@RequierePermiso('caja.gastos')`, reutilizado para los 4 tipos manuales — no se inventó un permiso más granular sin base en el seed): registra `Ingreso`/`Egreso`/`Gasto`/`Retiro` manuales. **`'Venta'` no es un tipo aceptado por este DTO** — ese tipo lo genera únicamente el sistema desde `pagos.service.ts`, nunca a mano.
- **`GET /caja/movimientos`**: lista los movimientos de la apertura vigente.
- **`POST /caja/arqueo`**:
  - Exige `usuarioEntranteId` explícito y **distinto** del usuario que hace el request (rechaza con `400` la autoconfirmación) — mismo principio que D-06 aplica a `Autorizacion` ("ningún agente se autoriza a sí mismo").
  - Calcula `efectivoEsperado` sumando `MovimientoCaja` reales de la apertura vigente: `fondoInicial + ventas(efectivo) + deudaCobro + ingresos - gastos - retiros`. `efectivoDeudasContado` queda siempre en `0` porque no existe módulo de cobro de deudas todavía — comentado como TODO explícito, no inventado.
  - `diferencia = efectivoContado - efectivoEsperado`. Si `|diferencia| > 5000` (D-05, **referencia documentada, no decisión confirmada** — condición `>` estricta, sin resolver qué pasa exactamente en el límite), el arqueo se crea igual pero con `autorizacionId: null` y la respuesta incluye `requiereAutorizacion: true` — **no se genera ninguna autorización automática** (D-06 sigue sin mecanismo implementado).
  - Cambia `Caja.estado` a `EN_ARQUEO`.
- **`POST /caja/cierre`**: exige que exista al menos un arqueo del turno vigente. **INV-08** ("un cierre con diferencia superior al umbral requiere autorización"): si el último arqueo tiene `|diferencia| > 5000` y `autorizacionId` sigue `null`, el cierre se **bloquea** con un mensaje explícito citando que D-06 está pendiente — no se permite cerrar igual ni se inventa una autorización para destrabar el flujo.

### 14.4 Evidencia de verificación (contra servidor real, con la conexión pagos→caja activa)

| Caso | Resultado observado |
|---|---|
| `GET /caja/estado` antes de abrir | `200`, `estado: CERRADA`, `aperturaVigente: null` |
| `POST /caja/apertura` con $25.000 | `201` |
| Segunda apertura mientras la primera sigue vigente | `409 "Ya hay una apertura de caja vigente"` |
| Venta + pago en efectivo | `201`, y **verificado directamente en Postgres**: se generó un `MovimientoCaja` tipo `'Venta'` con `referenciaId` = id del pago |
| Gasto manual con owner (tiene `caja.gastos`) | `201` |
| Gasto manual con seller (sin `caja.gastos`) | `403` |
| **Arqueo con el mismo usuario como saliente y entrante** | `400 "El usuario entrante debe ser distinto del usuario saliente"` |
| **Arqueo real**: fondo $25.000 + venta $1674.746 - gasto $2000 | `efectivoEsperado: "24674.746"` — coincide exactamente con el cálculo manual (`25000 + 1674.746 - 2000`) |
| Efectivo contado exacto | `diferencia: "0"`, `requiereAutorizacion: false` |
| **Test clave de aislamiento**: dueño de la otra empresa consulta `/caja/estado` (esa empresa nunca tuvo una `Caja` en el seed) | `404`, nunca ve la caja de la primera empresa |
| Cierre tras arqueo saldado | `201` |
| Movimiento manual sin apertura vigente (caja ya cerrada) | `400`, mensaje claro |
| **Diferencia grande** (esperado $10.000, contado $1.000 → diferencia -$9.000, supera el umbral) | Arqueo se crea igual, `requiereAutorizacion: true`, `autorizacionId: null` |
| **INV-08**: intentar cerrar con ese arqueo sin autorización | `400`, bloqueado explícitamente citando D-06 pendiente — no se cerró |
| Tipo de movimiento `'Venta'` en el DTO manual | `400`, rechazado (`class-validator`, solo acepta Ingreso/Egreso/Gasto/Retiro) |
| Sin token | `401` |

- `npm run build --workspace=apps/api`: exit 0.
- `npm run lint --workspace=apps/api`: sin errores — mismo falso positivo conocido de la regla `indent` con ternarios que devuelven objetos anidados (secciones 9.2/11.2), corregido con `eslint-disable`/`eslint-enable` envolviendo el bloque completo (un `eslint-disable-next-line` no alcanzaba porque el error estaba en líneas internas del bloque multilínea, no solo en la primera).
- Servidor detenido explícitamente después de la verificación.

### 14.5 Qué NO cubre este incremento

- Mecanismo de autorización del dueño (D-06) — sigue sin implementar. Un arqueo/cierre con diferencia excesiva queda bloqueado permanentemente hasta que exista ese mecanismo; no hay forma de destrabarlo desde la API todavía.
- `efectivoDeudasContado` siempre `0` — no hay módulo de cobro de deudas (RF-10).
- No hay endpoint para crear la `Caja` de una empresa (solo existe la del seed) — si una empresa nueva se diera de alta, no tendría caja hasta cargarla manualmente en la base.
- Sin frontend: `apps/pos-admin` no tiene pantalla de caja todavía.

### 14.6 ⚠️ TODO de seguridad: `caja.controller.ts` sin `@RequierePermiso` en la mayoría de sus endpoints (21/09/2026)

Detectado en auditoría previa a habilitar el login con Google (ver sección 15): `estado`, `apertura`, `listarMovimientos`, `arqueo` y `cierre` en `caja.controller.ts` **no tienen `@RequierePermiso`**, solo exigen JWT válido (el guard global). Únicamente `registrarMovimiento` (`POST /caja/movimientos`) tiene `@RequierePermiso('caja.gastos')` — así lo confirma la tabla de la sección 14.4 (`403` para seller sin ese permiso en un gasto manual), pero nunca se probó abrir/cerrar caja con un usuario sin permisos.

En la práctica, hoy: cualquier usuario autenticado de la empresa —sin importar qué permisos tenga asignados— puede abrir caja, cerrar caja, y ver el estado/movimientos. Antes de esta sección, el único modo de alta de usuarios era manual (alguien con `usuarios.gestionar` creaba la cuenta), así que este gap quedaba mitigado en la práctica por ese filtro humano. Con el login de Google (sección 15), un usuario nuevo se auto-crea sin intervención humana y sin ningún permiso — sigue sin poder registrar movimientos manuales o vender, pero **sí puede abrir/cerrar la caja real de la empresa** el mismo día que entra por primera vez.

No se corrigió en el mismo cambio que agregó Google login para no mezclar un fix de permisos de un módulo ya existente con una feature nueva — pendiente como incremento aparte. Al resolverlo, decidir explícitamente qué permiso exige cada endpoint (no necesariamente `caja.gastos` para todos — abrir/cerrar caja es una operación distinta de registrar un gasto).

## 15. Login con Google (OAuth 2.0) (21/09/2026)

- `GoogleStrategy` (`apps/api/src/auth/google.strategy.ts`) + `AuthGoogleService` (`auth.google.service.ts`), rutas `GET /auth/google` (redirect a Google) y `GET /auth/google/callback` (Google redirige de vuelta, el backend emite el JWT y redirige al frontend con `?token=`).
- `Usuario.passwordHash` pasa a nullable — un usuario que solo entró por Google no tiene contraseña local. `Usuario.googleId` (único) y `Usuario.fotoUrl` nuevos.
- Alta automática: si el `googleId` no existe y tampoco existe un `Usuario` con ese email, se crea uno nuevo **sin ningún permiso asignado** en la empresa fijada por `GOOGLE_SIGNUP_EMPRESA_ID` (sin esa env var, el alta automática falla explícitamente en vez de adivinar una empresa). Si ya existe un `Usuario` con ese email (creado antes por password), se vincula el `googleId` a esa cuenta existente en vez de duplicarla.
- Perfil de Google disponible vía OAuth estándar (`scope: profile email`): solo `id`, `email`, `nombre`, foto de perfil. No hay teléfono, dirección ni fecha de nacimiento — Google no los expone sin scopes adicionales sujetos a verificación manual de la app.
- Pendiente explícito, decisión del dueño (no de este incremento): el modelo de "un usuario general, luego permisos por tipo" (cliente/proveedor/repartidor/vendedor) todavía no existe — el alta automática de hoy asume "usuario interno sin permisos", que debería revisarse cuando ese modelo de roles se defina.
- Ver sección 14.6: el auto-alta agrava un gap de permisos preexistente en `caja.controller.ts`, pendiente de arreglar aparte.
- `Deuda`/`AplicacionPago` (RF-10, cuenta corriente) siguen sin implementar — el arqueo está preparado para sumarlos (`efectivoDeudasContado`) pero no hay fuente real de esos movimientos.
## 16. Módulo de perfil de usuario (21/09/2026)

- `GET /auth/me` deja de devolver solo lo que ya venía en el JWT (nombre/email/empresaId/permisos) y pasa a consultar `Usuario` fresco en Prisma, agregando `empresaNombre`, `fotoUrl`, `metodoLogin` (`'google' | 'password'`, derivado de si `googleId` es no-nulo) y `createdAt`. Nuevo tipo `PerfilUsuario` (`auth.types.ts` / `shared-types`), superset de `AuthenticatedUser`.
- `POST /auth/login` y el callback de Google devuelven el mismo shape completo (antes solo `AuthenticatedUser`) — el frontend no necesita una segunda llamada a `/auth/me` después de loguearse para tener el perfil completo.
- Los campos de perfil NO se embeben en el JWT en sí (`JwtPayload` sigue igual) — son datos que pueden cambiar sin que el usuario vuelva a loguearse, no tiene sentido firmarlos en un token de 8hs.
- `apps/pos-admin/src/features/profile/ProfilePage.tsx`: solo lectura (decisión explícita del dueño, no una limitación técnica — no hay `PATCH /usuarios/me`). Muestra foto (o placeholder si no hay, ej. login por password), nombre, email, empresa, método de login, fecha de alta, y la lista de permisos (con aviso explícito si está vacía, ej. usuario recién auto-creado por Google sin permisos asignados todavía).
- Techo real de "todos los datos posibles" de Google (pedido original): el scope OAuth `profile email` solo expone `id`/`email`/`nombre`/foto. Sin teléfono, dirección ni fecha de nacimiento — no se inventan campos que Google no entrega en este scope.

## 17. Módulo de Inventario, Fase 1 — consulta de stock (21/09/2026)

Primera fase del roadmap de inventario (RF-11), sobre la SPEC especializada de Gestión de Stock e Inventario (borrador). Solo lectura — sin ajustes ni alta de lotes todavía (Fases 2 y 3 del roadmap).

- `apps/api/src/inventario/` nuevo: `InventarioController` + `InventarioService`, 3 endpoints (`GET /inventario/stock`, `GET /inventario/productos/:id/lotes`, `GET /inventario/productos/:id/movimientos`). Implementa `INV-CONS-01/02/03/04` de la SPEC especializada.
- **No implementa un segundo mecanismo de descuento de stock** (INV-DISP-01/INV-INV-04 de la SPEC): `VentasService.descontarStock()` sigue siendo el único que modifica `Lote.cantidad` y genera `MovimientoStock`. Este módulo solo consulta.
- **Decisión técnica**: `stockConsolidado()` no usa Prisma `groupBy` sobre `Lote`. `empresaScopeExtension` (aislamiento multiempresa) solo tiene manejo explícito para un set fijo de operaciones (`findMany`, `update`, etc.) — `groupBy` no está en esa lista y cae en el `throw` final del extension (comportamiento intencional: falla explícito antes que saltarse el filtro en silencio). En vez de ampliar ese archivo compartido (usado por todos los módulos) dentro de esta fase, se calcula el consolidado con un `findMany` de `Lote` (sí soportado) + suma en memoria — a esta escala (miles de productos, pocos lotes cada uno) es liviano. Si el volumen lo justifica más adelante, extender `empresaScopeExtension` con `groupBy` es su propio cambio, con su propia revisión.
- `Producto.stockMinimo` no existe en el schema — `stockConsolidado()` devuelve `stockMinimo: null` y `stockBajo: false` siempre, campos presentes en el shape para no romper el contrato cuando se agregue el umbral real (Fase 4 del roadmap).
- Frontend: `InventarioPage.tsx` nueva (antes el placeholder "Inventario - En desarrollo" vivía inline en `App.tsx`, sin componente propio). Tabla de stock con búsqueda debounced (300ms) y detalle expandible por fila (lotes + movimientos), sin pantallas separadas para esta fase.
- Verificado contra la DB real (no solo build): 4342 productos, stock consolidado ya reflejando el descuento de ventas de prueba anteriores (ej. un producto con 86 unidades en vez de las 100 del seed, con su `MovimientoStock` de venta correspondiente en el historial), búsqueda, 404 en producto inexistente, 401 sin token.

## 18. Módulo de Inventario, Fase 2 — ajustes manuales de stock (21/09/2026)

Segunda fase del roadmap de RF-11 (INV-AJ-01/02/03/04 de la SPEC especializada).

- `POST /inventario/ajustes` — ajuste sobre un lote concreto elegido por el usuario (no resuelto automáticamente como en `VentasService.descontarStock()`: el caso de uso es "conté físicamente y este lote tiene una diferencia", así que el lote es un dato de entrada). Protegido con `@RequierePermiso('inventario.ajustes')` (permiso ya existía en el seed desde antes de esta fase).
- `RegistrarAjusteDto`: `loteId` (UUID), `cantidad` (variación entera, no total resultante — positiva suma, negativa resta, 0 rechazado con `@NotEquals(0)`), `motivo` (texto libre obligatorio, sin enum cerrado — a diferencia de los movimientos de caja, el motivo real de un ajuste de inventario no está catalogado y no corresponde inventar una taxonomía).
- **Concurrencia (INV-AJ-03)**: no se hace read-then-write del stock actual. Se usa un `UPDATE` condicional vía `$executeRaw` parametrizado (`SET cantidad = cantidad + $1 WHERE ... AND cantidad + $1 >= 0`), evaluado atómicamente por Postgres contra el valor real en ese instante. Si afecta 0 filas, la condición no se cumplió y se aborta con 400 explícito — no hay reintento automático ni condición de carrera posible entre el chequeo y la escritura.
- **Nota de aislamiento multiempresa**: `$executeRaw` no pasa por `empresaScopeExtension` (ese extension solo intercepta Prisma Client normal, no SQL crudo) — el filtro `empresaId` se incluye explícitamente en el `WHERE` de esa query, con responsabilidad de esta función, no del extension.
- **Trazabilidad (INV-AJ-02)**: el `UPDATE` del lote y el `MovimientoStock` (tipo `Entrada`/`Salida` según el signo, motivo prefijado `AjusteManual: <texto del usuario>`) se crean en la misma `$transaction` — nunca uno sin el otro.
- Frontend: botón de ajuste por lote (ícono) dentro del detalle ya expandible de `InventarioPage.tsx` (Fase 1), con formulario inline (cantidad + motivo). El frontend no oculta el control según permisos — mismo criterio que `CajaPage` con `caja.gastos`: el backend rechaza con 403 si corresponde, y ese error se muestra tal cual.
- Verificado contra la DB real: ajuste positivo (86→91, exacto), ajuste negativo hasta el límite exacto (91→0, aceptado), ajuste que dejaría negativo (rechazado con 400 y mensaje claro), cantidad 0 (400 por validación del DTO), lote inexistente (404), motivo vacío (400), usuario sin `inventario.ajustes` (403). Datos de prueba restaurados a su valor original al terminar.
