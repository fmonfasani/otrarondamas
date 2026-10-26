# Wapsell Frontend

Frontend multi-business para la plataforma Wapsell construido con Next.js 16.4.3, React, TypeScript y Tailwind CSS.

## Características

### 1. Autenticación y Multi-Tenancy
- **AuthContext**: Gestión centralizada de autenticación y contexto de usuario
- **JWT**: Tokens JWT con soporte para múltiples empresas
- **Business Selector**: Dropdown para cambiar entre empresas
- **Protected Routes**: Rutas protegidas con validación de autenticación

### 2. Componentes Principales

#### NavBar (`components/NavBar.tsx`)
- Logo Wapsell
- Links de navegación (Home, Dashboard, Mis Negocios)
- Business Selector dropdown
- User menu (Perfil, Logout)
- Responsive (hamburger menu en mobile)

#### BusinessSelector (`components/BusinessSelector.tsx`)
- Mostrar empresa actual
- Dropdown con lista de empresas
- Checkmark en empresa seleccionada
- Switch empresa con POST `/auth/switch-empresa/:id`
- Link a `/negocios` para gestionar empresas

#### AuthContext (`components/AuthContext.tsx`)
- Hook `useAuth()` para acceso global
- Estado: user, empresaId, empresa, empresas, isLoading
- Métodos: switchEmpresa(), logout()
- Inicialización desde JWT + localStorage

#### ProtectedRoute (`components/ProtectedRoute.tsx`)
- HOC para proteger rutas
- Requiere autenticación
- Opcionalmente requiere empresaId seleccionada
- Redirige a `/auth/login` si no está autenticado

### 3. Páginas

#### Home (`app/[locale]/page.tsx`)
- Hero section con CTA
- Features (Multi-tenant, Analytics, Security)
- Información del negocio actual si está autenticado
- i18n completo (es/en)

#### Dashboard (`app/[locale]/dashboard/page.tsx`)
- Protegida: requiere autenticación + empresaId
- Overview del negocio (nombre, plan, usuarios, actividad)
- Quick actions (Productos, Pedidos, Configuración)

#### Negocios - List (`app/[locale]/negocios/page.tsx`)
- Lista de todas las empresas del usuario
- Cards con información (nombre, plan, usuarios, actividad)
- Botones: "Editar", "Acceder"
- Botón flotante "+ Crear Negocio"
- GET `/tenants/my-empresas` para llenar lista
- Estado: loading, error, empty

#### Negocios - Create (`app/[locale]/negocios/crear/page.tsx`)
- Formulario: nombre, email, teléfono, país, sector, plan
- Validaciones: nombre (3+ chars), email válido, país requerido
- Términos y condiciones
- POST `/tenants` para crear
- Redirige a `/negocios/{id}/onboarding` después de crear
- Manejo de errores y feedback

#### Negocios - Settings (`app/[locale]/negocios/[id]/settings/page.tsx`)
- Edición de información del negocio
- Nombre, email, teléfono, país, sector, plan
- PATCH `/tenants/:id` para guardar cambios
- Botones: "Cambiar Contraseña", "Equipo"
- Danger Zone: Eliminar negocio
- Estados: loading, saving, success, error

#### Negocios - Onboarding (`app/[locale]/negocios/[id]/onboarding/page.tsx`)
- Página de bienvenida post-creación
- Mensaje de éxito
- Auto-redirige a `/dashboard` después de 3 segundos
- Opción manual de click para ir a dashboard

### 4. API Utilities (`lib/api.ts`)

```typescript
apiFetch<T>(endpoint, options)  // Fetch genérico con JWT auto-added

empresasApi.getMyEmpresas()     // GET /tenants/my-empresas
empresasApi.createEmpresa()     // POST /tenants
empresasApi.getEmpresa(id)      // GET /tenants/:id
empresasApi.updateEmpresa()     // PATCH /tenants/:id
empresasApi.deleteEmpresa()     // DELETE /tenants/:id

authApi.switchEmpresa(id)       // POST /auth/switch-empresa/:id
authApi.logout()                // POST /auth/logout
```

### 5. i18n (next-intl)

- **Idiomas soportados**: Español (es) e Inglés (en)
- **Defecto**: Español (es)
- **Archivos de traducción**: `messages/es.json`, `messages/en.json`
- **Uso**: `const t = useTranslations()` en componentes

### 6. Estilos

- **Tailwind CSS**: Utility-first CSS framework
- **Colores Wapsell**:
  - Primario: `#D97757` (naranja)
  - Oscuro: `#1A1815` (marrón oscuro)
  - Luz: `#FAF9F5` (crema)
  - Grises: varias tonalidades
- **Responsive**: Mobile-first design
- **Tipografía**: System fonts con escalas claras

## Requisitos

- Node.js 18+
- npm/pnpm/yarn

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

## Build

```bash
npm run build
npm start
```

## Configuración de Variables de Entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Edita las variables según tu entorno:

```
NEXT_PUBLIC_API_URL=https://api.wapsell.com
NEXT_PUBLIC_APP_URL=https://wapsell.com
```

## Estructura de Carpetas

```
apps/wapsell-frontend/
├── app/                    # Rutas Next.js App Router
│   ├── [locale]/          # Soporte i18n
│   │   ├── page.tsx       # Home
│   │   ├── dashboard/     # Dashboard
│   │   ├── negocios/      # Business management
│   │   └── layout.tsx     # Root layout con AuthProvider
│   └── globals.css        # Estilos globales
├── components/            # Componentes reutilizables
│   ├── AuthContext.tsx    # Auth context + provider
│   ├── NavBar.tsx         # Navigation bar
│   ├── BusinessSelector.tsx
│   └── ProtectedRoute.tsx # Route protection HOC
├── lib/                   # Utilidades
│   └── api.ts             # API client utilities
├── messages/              # Traducciones i18n
│   ├── es.json            # Español
│   └── en.json            # Inglés
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── next.config.ts         # Next.js config
├── tailwind.config.ts     # Tailwind config
└── postcss.config.js      # PostCSS config
```

## Testing Manual

### 1. Autenticación
- [ ] Login redirige a `/auth/login`
- [ ] JWT almacenado en localStorage
- [ ] Usuarios no autenticados no pueden acceder a rutas protegidas

### 2. NavBar
- [ ] Logo visible y funcional
- [ ] Links de navegación presentes
- [ ] Business selector muestra empresa actual
- [ ] Dropdown de usuario funciona

### 3. Business Selector
- [ ] Click en dropdown lista todas las empresas
- [ ] Checkmark en empresa actual
- [ ] Click en otra empresa → switch exitoso
- [ ] JWT actualizado después de switch
- [ ] Redirige a `/dashboard`

### 4. Negocios - List
- [ ] GET `/tenants/my-empresas` carga lista
- [ ] Cards muestran información correcta
- [ ] Botón "Crear Negocio" → `/negocios/crear`
- [ ] Botón "Acceder" → `/dashboard` + actualiza empresaId
- [ ] Empty state si no hay empresas

### 5. Negocios - Create
- [ ] Validaciones de formulario funcionan
- [ ] POST `/tenants` crea empresa
- [ ] Redirige a `/negocios/{id}/onboarding`
- [ ] Toast de éxito aparece
- [ ] Cancelar vuelve atrás

### 6. Dashboard
- [ ] Requiere autenticación + empresaId
- [ ] Muestra información del negocio actual
- [ ] Links a Productos, Pedidos, Configuración funcionan
- [ ] Saludo personalizado con nombre del usuario

### 7. i18n
- [ ] URL `/es` muestra contenido en español
- [ ] URL `/en` muestra contenido en inglés
- [ ] Selector de idioma (si disponible)
- [ ] Todas las cadenas de texto están traducidas

### 8. Responsive
- [ ] NavBar adapta a mobile (hamburger)
- [ ] Grid layouts responden correctamente
- [ ] Botones y inputs son accesibles en touch
- [ ] Guiones de 16px en mobile

## API Contract

### Authentication
- Token: JWT en `Authorization: Bearer <token>`
- Payload: `{ sub, email, nombre, empresas: [...] }`
- Empresas en JWT: Array de `Empresa` objects

### Endpoints Requeridos

```
POST   /auth/login                    # Login
POST   /auth/logout                   # Logout
POST   /auth/switch-empresa/:id       # Switch empresa

GET    /tenants/my-empresas           # Listar empresas del usuario
POST   /tenants                       # Crear empresa
GET    /tenants/:id                   # Obtener empresa
PATCH  /tenants/:id                   # Actualizar empresa
DELETE /tenants/:id                   # Eliminar empresa
```

## Performance Optimizations

- Server Components para rutas sin interactividad
- Lazy loading de componentes no-críticos
- Image optimization (Next.js Image)
- CSS minification con Tailwind
- SWC para compilación rápida

## Security

- Headers de seguridad (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- CSRF protection en Next.js nativo
- JWT almacenado en localStorage (con refresh token en próxima versión)
- Input validation en cliente y servidor
- Tenant isolation verificado en servidor

## Próximos Pasos

1. Implementar refresh tokens
2. Agregar toast notifications (Sonner)
3. Modal de confirmación para acciones peligrosas
4. Analytics integration
5. Dark mode support
6. PWA capabilities
7. Sentry error tracking
8. Team management (`/negocios/:id/team`)
9. Change password modal
10. Profile page
