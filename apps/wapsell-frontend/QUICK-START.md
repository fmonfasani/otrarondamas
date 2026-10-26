# Quick Start - Wapsell Frontend

## En 5 Minutos

### 1. Instalación
```bash
cd apps/wapsell-frontend
npm install
```

### 2. Variables de Entorno
```bash
cp .env.example .env.local
# Editar NEXT_PUBLIC_API_URL según tu ambiente
```

### 3. Desarrollo
```bash
npm run dev
```

Abre **http://localhost:3000** en el navegador.

---

## Estructura Rápida

```
components/           # Componentes reutilizables
├── AuthContext       # Autenticación global
├── NavBar            # Barra navegación
├── BusinessSelector  # Dropdown de empresas
└── ProtectedRoute    # Protección de rutas

app/[locale]/         # Páginas Next.js
├── page.tsx          # Home
├── dashboard/        # Dashboard
└── negocios/         # Gestión de empresas
    ├── page.tsx      # Listar
    ├── crear/        # Crear
    └── [id]/settings # Editar

lib/api.ts            # Cliente HTTP con JWT
messages/             # Traducciones (es, en)
```

---

## Componentes Principales

### AuthContext - Autenticación Global
```typescript
const { user, empresaId, empresa, switchEmpresa, logout } = useAuth();
```

### ProtectedRoute - Proteger Rutas
```typescript
<ProtectedRoute requireEmpresa={true}>
  <Dashboard />
</ProtectedRoute>
```

### API - Llamadas HTTP
```typescript
const empresas = await empresasApi.getMyEmpresas();
await empresasApi.createEmpresa({ nombre, email, plan, ... });
```

---

## Flujos Principales

### 🔓 Login
1. Usuario ingresa credenciales
2. POST `/auth/login`
3. Backend retorna JWT + empresas[]
4. Frontend almacena en localStorage
5. Redirige a `/dashboard`

### 🏢 Crear Empresa
1. Click "+ Crear Negocio" en `/negocios`
2. Completa formulario (validaciones en cliente)
3. POST `/tenants`
4. Redirige a `/onboarding` (3s)
5. Auto-redirige a `/dashboard`

### 🔄 Cambiar Empresa
1. Click en BusinessSelector (naranja en navbar)
2. Selecciona otra empresa
3. POST `/auth/switch-empresa/{id}`
4. JWT se actualiza en localStorage
5. Redirige a `/dashboard`

---

## Variables de Entorno (`.env.local`)

```env
# URL de tu API
NEXT_PUBLIC_API_URL=https://api.wapsell.com

# URL de la app (para redirects/shares)
NEXT_PUBLIC_APP_URL=https://wapsell.com

# Opcional: Analytics y error tracking
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_SENTRY=false
```

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia servidor en localhost:3000

# Producción
npm run build            # Build optimizado
npm start                # Ejecuta build

# Validación
npm run lint             # ESLint
npm run type-check       # TypeScript

# Otros
npm list                 # Ver dependencias
npm outdated             # Versiones desactualizadas
```

---

## Colores Wapsell

| Uso | Hex |
|-----|-----|
| Primario (buttons, links) | #D97757 |
| Fondo navbar | #1A1815 |
| Fondo página | #FAF9F5 |
| Texto principal | #1A1815 |
| Texto secundario | #666 |

---

## i18n (Idiomas)

```typescript
import { useTranslations } from 'next-intl';

const t = useTranslations();

<h1>{t('dashboard.title')}</h1>
<p>{t('dashboard.welcome', { name: user?.nombre })}</p>
```

**Idiomas**: `/es` (default), `/en`

---

## Endpoints API Requeridos

```
POST   /auth/login                  ← Login
POST   /auth/logout                 ← Logout
POST   /auth/switch-empresa/:id     ← Cambiar empresa

GET    /tenants/my-empresas         ← Listar empresas
POST   /tenants                     ← Crear empresa
GET    /tenants/:id                 ← Obtener empresa
PATCH  /tenants/:id                 ← Actualizar empresa
DELETE /tenants/:id                 ← Eliminar empresa
```

**JWT debe contener**:
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "nombre": "Nombre Usuario",
  "empresaId": "empresa-actual",
  "empresas": [ { "id", "nombre", "plan", ... } ]
}
```

---

## Rutas Principales

| Ruta | Descripción | Requiere |
|------|-------------|----------|
| `/` | Home | - |
| `/dashboard` | Dashboard | JWT + empresaId |
| `/negocios` | Listar empresas | JWT |
| `/negocios/crear` | Crear empresa | JWT |
| `/negocios/{id}/settings` | Editar empresa | JWT |
| `/negocios/{id}/onboarding` | Bienvenida | - |

---

## Validaciones en Formularios

### Crear Negocio
- **Nombre**: Requerido, 3+ caracteres
- **Email**: Requerido, formato válido
- **País**: Requerido
- **Plan**: Requerido (básico/pro)
- **Términos**: Requerido

### Editar Negocio
- **Nombre**: Requerido

---

## Debugging

### Console
```javascript
// Ver JWT decodificado
const jwt = localStorage.getItem('jwt');
console.log(atob(jwt.split('.')[1]));

// Ver estado auth
console.log(useAuth());
```

### Network
- Abre DevTools → Network
- Verifica que Authorization header sea: `Bearer {jwt}`
- Status 401 → JWT inválido/expirado
- Status 404 → Endpoint incorrecto

### Storage
- Abre DevTools → Application → localStorage
- Verifica `jwt` y `empresaId` están almacenados

---

## Problemas Comunes

### ❌ "Cannot read property 'empresaId' of null"
**Causa**: JWT no está en localStorage  
**Solución**: Login primero, verifica API_URL es correcta

### ❌ 401 Unauthorized en API
**Causa**: JWT expirado o no enviado  
**Solución**: Verifica que `Authorization: Bearer {jwt}` está en headers

### ❌ Rutas protegidas redirigen a login
**Causa**: AuthContext no restauró estado  
**Solución**: Verifica JWT en localStorage, intenta logout + login

### ❌ i18n no funciona
**Causa**: Routing incorrecto  
**Solución**: Verifica que URL es `/es/...` o `/en/...`

---

## Testing Manual Rápido

```
1. ✅ Home page carga
2. ✅ Click login redirige a /auth/login
3. ✅ Después de login, navbar muestra empresa
4. ✅ BusinessSelector dropdown abre
5. ✅ /negocios lista empresas
6. ✅ Click "+ Crear" abre formulario
7. ✅ /dashboard muestra información correcta
8. ✅ i18n: /en muestra contenido en inglés
9. ✅ Mobile: hamburger menu funciona
10. ✅ Logout limpia localStorage y redirige
```

---

## Próximos Pasos

1. **Conectar con API**
   - Verifica endpoints `/auth/login`, `/tenants`, etc.
   - JWT debe contener `empresas[]` y `empresaId`

2. **Customización**
   - Colors: edita `tailwind.config.ts`
   - Traducciones: edita `messages/es.json` y `messages/en.json`
   - Logo: reemplaza en `components/NavBar.tsx`

3. **Features Futuras**
   - Toast notifications (Sonner)
   - Dark mode
   - Team management
   - Analytics dashboard

---

## Documentación Completa

- **README.md** - Guía detallada
- **STRUCTURE.md** - Arquitectura completa
- **TESTING.md** - Suite de testing manual

---

## Soporte

Para reportar bugs o sugerencias:
1. Verifica console para errores
2. Revisa Network tab en DevTools
3. Consulta TESTING.md para troubleshooting
4. Verifica API está retornando datos correctos

**Listo para producción** ✅
