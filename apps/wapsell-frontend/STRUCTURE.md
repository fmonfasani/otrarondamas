# Estructura de Proyecto - Wapsell Frontend

## Árbol de Carpetas Completo

```
apps/wapsell-frontend/
│
├── app/                           # Next.js App Router (Rutas)
│   ├── [locale]/                  # Dinámico: /es, /en (i18n routing)
│   │   ├── layout.tsx             # Root layout (AuthProvider, NavBar)
│   │   ├── page.tsx               # Página de inicio (Home)
│   │   ├── globals.css            # Estilos globales
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Dashboard del negocio actual
│   │   │                           # Requiere: auth + empresaId
│   │   │
│   │   ├── negocios/              # Gestión de empresas
│   │   │   ├── page.tsx           # Listar empresas (GET /tenants/my-empresas)
│   │   │   ├── crear/
│   │   │   │   └── page.tsx       # Crear negocio (POST /tenants)
│   │   │   └── [id]/
│   │   │       ├── settings/
│   │   │       │   └── page.tsx   # Editar negocio (PATCH /tenants/:id)
│   │   │       └── onboarding/
│   │   │           └── page.tsx   # Bienvenida post-creación
│   │   │
│   │   ├── productos/             # (Placeholder para futuro)
│   │   │   └── page.tsx           # Requiere: auth + empresaId
│   │   │
│   │   ├── pedidos/               # (Placeholder para futuro)
│   │   │   └── page.tsx           # Requiere: auth + empresaId
│   │   │
│   │   ├── profile/               # (Placeholder para futuro)
│   │   │   └── page.tsx           # Perfil del usuario
│   │   │
│   │   └── auth/                  # (Externalizado: API)
│   │       ├── login/
│   │       └── signup/
│   │
│   └── favicon.ico
│
├── components/                    # Componentes Reutilizables
│   ├── AuthContext.tsx            # Provider + Hook useAuth()
│   │                               # - Estado global de autenticación
│   │                               # - switchEmpresa()
│   │                               # - logout()
│   │
│   ├── NavBar.tsx                 # Barra de navegación
│   │                               # - Logo Wapsell
│   │                               # - Links: Home, Dashboard, Negocios
│   │                               # - BusinessSelector
│   │                               # - User menu
│   │                               # - Responsive (hamburger)
│   │
│   ├── BusinessSelector.tsx       # Dropdown de selección de empresa
│   │                               # - Mostrar empresa actual
│   │                               # - Listar todas las empresas
│   │                               # - Checkmark en seleccionada
│   │                               # - Switch empresa
│   │
│   └── ProtectedRoute.tsx         # HOC para proteger rutas
│                                   # - Requiere autenticación
│                                   # - Opcionalmente requiere empresaId
│                                   # - Redirige a /auth/login si no auth
│
├── lib/                           # Utilidades y Helpers
│   ├── api.ts                     # Cliente API
│   │                               # - apiFetch<T>()
│   │                               # - empresasApi.*
│   │                               # - authApi.*
│   │
│   └── auth.ts                    # (Placeholder para helpers de auth)
│
├── messages/                      # Traducciones (i18n - next-intl)
│   ├── es.json                    # Español
│   └── en.json                    # Inglés
│
├── public/                        # Activos estáticos
│   ├── favicon.ico
│   ├── logo.svg
│   └── ... (imágenes, fuentes)
│
├── .env.example                   # Template de variables de entorno
├── .env.local                     # Variables de entorno (git-ignored)
├── .eslintrc.json                 # ESLint config
├── .gitignore                     # Git ignore rules
├── i18n.config.ts                 # Configuración i18n (locales)
├── next.config.ts                 # Next.js config
├── package.json                   # Dependencies & scripts
├── postcss.config.js              # PostCSS (Tailwind)
├── tailwind.config.ts             # Tailwind CSS config
├── tsconfig.json                  # TypeScript config
│
├── README.md                      # Documentación principal
└── STRUCTURE.md                   # Este archivo
```

## Tipos y Interfaces

### AuthContext (`components/AuthContext.tsx`)

```typescript
interface Empresa {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  pais: string;
  sector?: string;
  plan: 'basico' | 'pro' | 'premium';
  usuariosActivos: number;
  ultimaActividad: string;
  createdAt: string;
}

interface User {
  id: string;
  nombre: string;
  email: string;
  empresas: Empresa[];
}

interface AuthContextType {
  user: User | null;
  empresaId: string | null;
  empresa: Empresa | null;
  empresas: Empresa[];
  isLoading: boolean;
  switchEmpresa: (empresaId: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Hook
function useAuth(): AuthContextType
```

## Flujos Principales

### 1. Login → Dashboard

```
1. Usuario no autenticado
   ↓
2. Click "Iniciar Sesión" → Redirige a /auth/login (API)
   ↓
3. POST /auth/login (credenciales)
   ↓
4. API retorna JWT + empresas[]
   ↓
5. Frontend almacena JWT en localStorage
   ↓
6. AuthContext decodifica JWT + restaura estado
   ↓
7. Selecciona primera empresa como default
   ↓
8. Guarda empresaId en localStorage
   ↓
9. Redirige a /dashboard
```

### 2. Crear Negocio

```
1. Autenticado → Click "+ Crear Negocio"
   ↓
2. Ruta /negocios/crear (ProtectedRoute: no requiere empresaId)
   ↓
3. Completa formulario + valida
   ↓
4. Click "Crear Negocio"
   ↓
5. POST /tenants { nombre, email, pais, plan, ... }
   ↓
6. API retorna { id, nombre, createdAt }
   ↓
7. Redirige a /negocios/{id}/onboarding
   ↓
8. Muestra pantalla de bienvenida por 3s
   ↓
9. Auto-redirige a /dashboard (empresaId actualizado)
```

### 3. Switch Empresa

```
1. Usuario autenticado en empresa A
   ↓
2. Click en BusinessSelector → Abre dropdown
   ↓
3. Lista todas las empresas del usuario
   ↓
4. Click en empresa B
   ↓
5. Llama switchEmpresa(empresaId_B)
   ↓
6. POST /auth/switch-empresa/{empresaId_B}
   ↓
7. API retorna nuevo JWT (empresaId = B)
   ↓
8. Frontend actualiza localStorage { jwt, empresaId }
   ↓
9. AuthContext actualiza estado
   ↓
10. Redirige a /dashboard (ahora muestra empresa B)
```

### 4. Listar Negocios

```
1. Autenticado (sin empresaId requerido)
   ↓
2. Ruta /negocios
   ↓
3. componentDidMount: GET /tenants/my-empresas
   ↓
4. Carga lista de empresas
   ↓
5. Renderiza cards por cada empresa
   ↓
6. Click "Acceder" → Actualiza empresaId + /dashboard
   ↓
7. Click "Editar" → /negocios/{id}/settings
```

## Colores Wapsell Design System

```css
--color-primary: #D97757;   /* Naranja */
--color-dark: #1A1815;      /* Marrón oscuro */
--color-light: #FAF9F5;     /* Crema/Blanco roto */
--color-gray-100: #F3F1ED;
--color-gray-200: #E8E5E0;
--color-gray-500: #999;
--color-gray-700: #666;
```

## Responsividad

```
Mobile    < 640px
Tablet    640px - 1024px
Desktop   > 1024px

Breakpoints en Tailwind:
sm  640px
md  768px
lg  1024px
xl  1280px
2xl 1536px

Guttes: 16px en mobile, 8-16px en gaps
```

## Variables de Entorno

```env
# API
NEXT_PUBLIC_API_URL=https://api.wapsell.com

# App
NEXT_PUBLIC_APP_URL=https://wapsell.com

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_SENTRY=false
```

## Scripts de NPM

```bash
npm run dev          # Desarrollo (localhost:3000)
npm run build        # Build para producción
npm start            # Ejecutar build en producción
npm run lint         # ESLint
npm run type-check   # TypeScript check
```

## Patrones de Codificación

### 1. Componentes Client
```typescript
'use client';  // Usar en todos los componentes interactivos

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const { user, empresaId } = useAuth();
  const t = useTranslations();
  const [state, setState] = useState();

  useEffect(() => {
    // Cargar datos
  }, []);

  return <div>{/* JSX */}</div>;
}
```

### 2. Formularios con Validación
```typescript
const [formData, setFormData] = useState({...});
const [errors, setErrors] = useState<Record<string, string>>({});

const handleChange = (e) => {
  // Actualizar estado
  // Limpiar error del campo
};

const validateForm = () => {
  const newErrors = {...};
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;
  
  try {
    setIsLoading(true);
    await apiCall();
    // Success feedback
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### 3. Proteger Rutas
```typescript
<ProtectedRoute requireEmpresa={true}>
  <MyComponent />
</ProtectedRoute>
```

### 4. Usar i18n
```typescript
const t = useTranslations();

<h1>{t('myNamespace.key')}</h1>
<p>{t('dashboard.welcome', { name: user?.nombre })}</p>
```

## Dependencias Principales

```
next@16.4.3          # Framework
react@19.0.0         # UI Library
typescript@5.3       # Type Safety
tailwindcss@3.4      # CSS Utility
next-intl@3.15       # i18n
eslint@8             # Linting
```

## Seguridad

- ✅ Headers CORS configurados
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection: 1; mode=block
- ✅ JWT en localStorage (considerar httpOnly en futuro)
- ✅ Validación de entrada en cliente
- ✅ Aislamiento de tenant verificado en servidor

## Próximas Fases

### Fase 1: MVP (Current)
- ✅ Auth Context
- ✅ NavBar + BusinessSelector
- ✅ Negocios CRUD
- ✅ Dashboard básico
- ✅ i18n (es/en)
- ✅ Responsive design

### Fase 2: Mejoras UX
- [ ] Toast notifications (Sonner)
- [ ] Modal de confirmación
- [ ] Loading states mejorados
- [ ] Error boundaries
- [ ] Refresh tokens
- [ ] Dark mode

### Fase 3: Features
- [ ] Team management
- [ ] Profile page
- [ ] Productos CRUD
- [ ] Pedidos management
- [ ] Analytics dashboard
- [ ] Export reports

### Fase 4: Optimización
- [ ] Image optimization
- [ ] Code splitting
- [ ] Analytics integration
- [ ] Error tracking (Sentry)
- [ ] PWA capabilities
- [ ] Caching estrategias
