
# Otra Ronda Más — primer Business de la plataforma Wapsell

Monorepo del ERP/POS comercial de **Otra Ronda Más**, en operación para un negocio real, y base de código sobre la cual se está especificando la plataforma **Wapsell**.

> **Leé esto antes de asumir qué hace el sistema.** Este README describe el estado **real** del código, no la visión de producto. La distinción es deliberada y está gobernada por [`docs/WAPSELL-DOCUMENTATION/`](docs/WAPSELL-DOCUMENTATION/): *una especificación no es prueba de que la funcionalidad esté implementada.*

## Wapsell y Otra Ronda Más

Son dos cosas distintas y conviene no confundirlas:

| | Qué es | Dónde vive |
|---|---|---|
| **Wapsell** | La plataforma: comercio conversacional multi-negocio. Dirección de producto aprobada (DEC-001). | **Documentación únicamente.** No implementada. |
| **Otra Ronda Más** | Un negocio real: ERP/POS + tienda online. Primer Business/Brand de Wapsell. | **Este código.** En operación. |

El código de hoy es un ERP/POS **de un solo negocio**. La plataforma multi-negocio es un objetivo especificado, no una funcionalidad existente. La migración de código **no fue iniciada**.

## Estado de la transformación Wapsell

El repositorio mantiene una separación explícita entre el sistema operativo actual y la plataforma objetivo.

- **AS-IS:** Otra Ronda Más funciona como ERP/POS de un solo Business, con aislamiento por `empresaId`.
- **TO-BE:** Wapsell define `User` global, `Business`, `Membership` N:N, autorización contextual, Brand por Business y Messaging como interfaz comercial central.
- **Transformación:** todavía no se debe interpretar la existencia de la SPEC como implementación. La migración física de identidad, tenancy, autorización y dominios se realiza incrementalmente y debe conservar la operación existente.
- **IA:** forma parte de la dirección de producto de Wapsell, pero los asistentes permanecen inactivos durante el MVP inicial. El MVP inicial no depende de WhatsApp como canal. El alcance funcional concreto de la IA queda para una especificación posterior.

La fuente documental canónica y el estado de cada decisión están en `docs/WAPSELL-DOCUMENTATION/`. Este README resume el estado del repositorio y no sustituye las SPEC ni los registros de decisiones.

## Estado actual

Stack: **NestJS 10 + Prisma 5.22 + PostgreSQL**, dos frontends **React + Vite**, Docker Compose. Auth JWT + Google OAuth.

### Implementado (verificado por código)

- **Catálogo** — jerarquía Familia/Subfamilia/Tipo/Subtipo, SKU compuesto, 4.342 productos en seed.
- **Inventario** — lotes con vencimiento, FIFO, ajustes, alertas de bajo stock.
- **Ventas** — cotización previa, idempotencia, número correlativo, pagos mixtos, comprobante imprimible.
- **Compras** — proveedores, órdenes, recepción parcial, pagos y devoluciones a proveedor.
- **Caja** — apertura, movimientos, arqueo doble, cierre con autorización del dueño ante diferencias.
- **Clientes** — CRUD y niveles de fidelidad con descuento automático (niveles calculados al vuelo, nunca persistidos).
- **Identidad** — login por password y Google OAuth, alta solo por invitación, legajo con aprobación.
- **Autorización** — permisos granulares (`Permiso` + `UsuarioPermiso`) vía `PermissionsGuard` y `@RequierePermiso`. El enum `RolUsuario` **no autoriza por sí solo**: solo determina qué legajo pedir.

### Parcialmente implementado

- **Tienda online** — catálogo público, carrito y checkout **sin pago real**; login obligatorio para acceder.
- **Pedidos** — bandeja y seguimiento; sin fulfillment.
- **Multi-tenancy** — aislamiento de datos por `empresaId` (Prisma Client Extension). Es lo único multi-tenant que existe.

### No existe en el código

Aunque esté especificado o diseñado, nada de esto está implementado:

- Mensajería, conversaciones y asistentes de IA.
- `Membership` (usuario ↔ negocio N:N), onboarding de negocios, gestión de Business como entidad operable.
- Branding configurable por negocio (hoy está hardcodeado).
- Cuenta corriente operativa, entregas, reportes reales, anulación de ventas, Mercado Pago.
- **Cobertura de tests amplia y CD** — hay tests, pero acotados al aislamiento multi-tenant (ver "Verificación"); no hay tests de los flujos de negocio ni despliegue automatizado.

Algunos modelos existen en el schema sin servicios que los usen (`CuentaCorriente`, `Deuda`, `Entrega`): el modelo de datos va por delante de la funcionalidad.

## Limitaciones y riesgos conocidos

No son sorpresas: están registrados con evidencia en código.

- **Red de seguridad parcial.** Los tests automatizados cubren solo el aislamiento por `empresaId` y un health check; el CI no ejecuta `build` ni `lint`, por lo que un error de compilación (`npm run build`) no lo detecta ningún workflow.
- **Brechas de integridad de stock verificadas** — oversell concurrente, devolución a proveedor sin guarda, 0 `CHECK` y 0 `TRIGGER` en 17 migraciones, transacciones en `READ COMMITTED`, `Venta.numero` sin unicidad garantizada. Detalle: [`10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md`](docs/WAPSELL-DOCUMENTATION/10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md).
- **Riesgo de autorización** — tokens de `Cliente` podrían alcanzar endpoints del panel sin type guard (CON-015).
- **El nombre del negocio tiene un typo en el código**: `"Otra Roonda Más"` es la clave `@unique` del `upsert` de `Empresa` en el seed. Los frontends dicen "Otra Ronda Más". Reconciliar sin cuidado rompe el upsert (CON-008).
- **Conflictos documentales** — consultar el registro de conflictos antes de tomar decisiones de arquitectura o modificar contratos.

## Estructura

```
.
├── apps/
│   ├── api/            # NestJS + Prisma (18 módulos de dominio)
│   ├── pos-admin/      # React + Vite — panel interno
│   └── tienda-online/  # React + Vite — tienda pública
├── packages/
│   ├── shared-types/   # Tipos TypeScript compartidos
│   └── ui-kit/         # Esqueleto de componentes UI
├── assets/brand/       # Marca de Otra Ronda Más (el Business)
├── docs/               # Ver "Documentación"
├── infra/nginx/        # Reverse proxy (producción)
├── docker-compose.yml  # Desarrollo local
└── docker-compose.prod.yml
```

`src/components/` y `src/features/` en la raíz están **vacíos y sin trackear** — residuo de un scaffold abandonado antes de consolidar todo en `apps/`. No son código activo.

## Documentación

La fuente documental canónica es **[`docs/WAPSELL-DOCUMENTATION/`](docs/WAPSELL-DOCUMENTATION/)**, organizada por fases:

| Carpeta | Contenido |
|---|---|
| [`00-GOVERNANCE/`](docs/WAPSELL-DOCUMENTATION/00-GOVERNANCE/) | Reglas del proceso: fuente de verdad, política de evidencia, convenciones de ID |
| [`01-SOURCE-INVENTORY/`](docs/WAPSELL-DOCUMENTATION/01-SOURCE-INVENTORY/) | 24 fuentes inventariadas (SRC-001…SRC-024) + originales en `SOURCES/` |
| [`02-CANONICAL-SPEC/`](docs/WAPSELL-DOCUMENTATION/02-CANONICAL-SPEC/) | SPEC canónica de Wapsell — identidad, comercio, operaciones, mensajería, branding |
| [`03-CONFLICTS/`](docs/WAPSELL-DOCUMENTATION/03-CONFLICTS/) | 27 conflictos (CON-001…CON-027) y su mapeo a decisiones |
| [`04-DECISIONS/`](docs/WAPSELL-DOCUMENTATION/04-DECISIONS/) | Registro de decisiones (DEC-001, D-001…D-018) |
| [`05-ASIS/`](docs/WAPSELL-DOCUMENTATION/05-ASIS/) | **Estado real del sistema**, 13 documentos con evidencia clasificada |
| [`06-TRANSFORMATION/`](docs/WAPSELL-DOCUMENTATION/06-TRANSFORMATION/) | Qué debe cambiar para pasar de Otra Ronda Más a Wapsell |
| [`07-TOBE/`](docs/WAPSELL-DOCUMENTATION/07-TOBE/) | Estado objetivo |
| [`08-TRACEABILITY/`](docs/WAPSELL-DOCUMENTATION/08-TRACEABILITY/) | Requirement → Spec → Código → Test → Evidencia |
| [`10-AUDIT/`](docs/WAPSELL-DOCUMENTATION/10-AUDIT/) | Auditorías de evidencia en código |

**Si vas a cambiar algo del sistema, leé primero [`05-ASIS/00-ASIS-OVERVIEW.md`](docs/WAPSELL-DOCUMENTATION/05-ASIS/00-ASIS-OVERVIEW.md) y el registro de conflictos.** El resto de `docs/` (`Design/`, `Research/`, `Funcional Analysis/`, `WapSell docs/`, `pos-admin-files/`) es material fuente e insumo histórico, ya inventariado — ver [`docs/README.md`](docs/README.md).

## Levantar el proyecto en desarrollo

Requiere Docker Desktop corriendo.

```bash
git clone https://github.com/fmonfasani/OtraRondaMas.git
cd OtraRondaMas
npm install

# Base de datos (queda en localhost:5500)
docker compose up -d db

# Variables de entorno de la API
cp apps/api/.env.example apps/api/.env
# DATABASE_URL debe apuntar a:
# postgresql://user:password@localhost:5500/otrarondamas?schema=public

# Migraciones y datos de ejemplo
npm run db:migrate --workspace=apps/api
npm run db:seed --workspace=apps/api
```

Luego, en terminales separadas:

```bash
npm run start:dev --workspace=apps/api        # API      → localhost:3000
npm run dev --workspace=apps/pos-admin        # Panel    → localhost:5173
npm run dev --workspace=apps/tienda-online    # Tienda   → localhost:5174
```

Swagger/OpenAPI en `http://localhost:3000/api/docs`.

Credenciales del seed (**solo desarrollo local**): `owner@otrarondamas.com` y `seller@otrarondamas.com`, ambas con `password123`. Si estas credenciales siguen activas en producción es un punto marcado como `NOT DETERMINABLE` en el AS-IS — verificar antes de desplegar.

## Verificación

```bash
npm run lint    # ESLint en todos los workspaces
```

**Tests unitarios** (sin base de datos para la mayoría; el workflow los corre con Postgres):

```bash
npm test --workspace=@otrarondamas/api -- --runInBand
```

**Tests de integración** (`apps/api/test/integration/`): escriben y borran datos reales. Los specs usan `PrismaService` con el `DATABASE_URL` que haya en el entorno, **no** corras esto contra una base con datos que quieras conservar. Usá una base descartable en el mismo contenedor:

```bash
docker compose up -d db
docker compose exec db psql -U user -d postgres -c "CREATE DATABASE otrarondamas_test"
export DATABASE_URL="postgresql://user:password@localhost:5500/otrarondamas_test?schema=public"

npm run prisma:generate --workspace=@otrarondamas/api
npx prisma db push --schema apps/api/prisma/schema.prisma --skip-generate
npm run test:e2e --workspace=@otrarondamas/api -- --runInBand
```

`npm run lint` ejecuta ESLint con `--fix`: puede modificar archivos. Las afirmaciones de funcionamiento deben distinguirse entre verificación por código, ejecución manual y tests automatizados.

## Despliegue

Producción bajo `otrarondamas.wapsell.com` vía `docker-compose.prod.yml` e [`infra/nginx/`](infra/nginx/) — infraestructura compartida con Wapsell, sin dependencias de código ni de datos entre ambos. Migraciones y despliegues son **manuales** (el único workflow, `b4-verification.yml`, solo ejecuta tests).

## Fecha objetivo de producción

30/11/2026


## Cómo levantar el proyecto en desarrollo

Sigue estos pasos para levantar el proyecto completo en tu entorno de desarrollo local:

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/fmonfasani/OtraRondaMas.git
    cd OtraRondaMas
    ```

2.  **Instalar dependencias del monorepo:**
    ```bash
    npm install
    ```

3.  **Levantar la base de datos PostgreSQL con Docker Compose:**
    Asegúrate de tener Docker Desktop instalado y corriendo.
    ```bash
    docker compose up -d db
    ```
    La base de datos estará disponible en `localhost:5500`.

4.  **Configurar variables de entorno para la API:**
    Copia el archivo `.env.example` a `.env` dentro de `apps/api` y, si es necesario, ajusta las credenciales de la base de datos para que coincidan con las de `docker-compose.yml` (por defecto: `POSTGRES_USER=user`, `POSTGRES_PASSWORD=password`, `POSTGRES_DB=otrarondamas`).
    ```bash
    cp apps/api/.env.example apps/api/.env
    # Asegúrate que DATABASE_URL en apps/api/.env apunte a: postgresql://user:password@localhost:5500/otrarondamas?schema=public
    ```

5.  **Ejecutar migraciones de Prisma y seedear la base de datos:**
    ```bash
    npm run db:migrate --workspace=apps/api
    npm run db:seed --workspace=apps/api
    ```
    Esto creará las tablas y poblará la base con datos de ejemplo (empresa, usuarios, categorías, caja, productos demo).

6.  **Levantar la API (NestJS):**
    ```bash
    npm run start:dev --workspace=apps/api
    ```
    La API estará disponible en `http://localhost:3000`. La documentación de Swagger/OpenAPI estará en `http://localhost:3000/api/docs`.
    *Usuario Dueño:* `owner@otrarondamas.com` / `password123`
    *Usuario Vendedor:* `seller@otrarondamas.com` / `password123`

7.  **Levantar el Frontend POS/Admin (React/Vite):**
    ```bash
    npm run dev --workspace=apps/pos-admin
    ```
    El POS/Admin estará disponible en `http://localhost:5173` (o el puerto que asigne Vite).

8.  **Levantar el Frontend Tienda Online (React/Vite):**
    ```bash
    npm run dev --workspace=apps/tienda-online
    ```
    La Tienda Online estará disponible en `http://localhost:5174` (o el puerto que asigne Vite).

9.  **Ejecutar el linter:**
    ```bash
    npm run lint
    ```
    Esto correrá ESLint en todos los proyectos configurados.

Ahora deberías tener todas las aplicaciones corriendo y conectadas a la base de datos local. Puedes navegar a las interfaces de usuario para verificar el funcionamiento básico.
