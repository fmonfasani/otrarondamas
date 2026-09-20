# Otra Roonda Más — MVP piloto

Aplicación web SaaS para gestionar la operación comercial de Otra Roonda Más (ventas, pedidos, pagos, caja, clientes, inventario, compras, entregas, reportes y auditoría).

Desplegada como aplicación independiente bajo `otrarondamas.wapsell.com`, con infraestructura compartida con Wapsell pero sin dependencias de código ni datos entre ambos.

## Estado

Borrador funcional v0.1 — pendiente de validación del dueño. El scaffolding inicial está completado.

## Estructura

```
.
├── apps/
│   ├── api/            # NestJS API (Backend)
│   ├── pos-admin/      # React + Vite (Frontend POS/Admin)
│   └── tienda-online/  # React + Vite (Frontend Tienda Online)
├── packages/
│   ├── shared-types/   # Tipos TypeScript compartidos
│   └── ui-kit/         # Esqueleto para componentes UI (vacío por ahora)
├── assets/brand/   # Logo y recursos de marca
├── docker-compose.yml # Configuración Docker para desarrollo local
├── .eslintrc.js    # Configuración ESLint compartida
├── .prettierrc.json # Configuración Prettier compartida
└── tsconfig.base.json # Configuración TypeScript base del monorepo
```

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