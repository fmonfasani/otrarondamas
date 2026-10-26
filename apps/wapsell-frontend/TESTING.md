# Testing Manual - Wapsell Frontend

## Checklist de Pruebas Funcionales

### Sección 1: Autenticación

- [ ] **Login básico**
  - Accede a `/auth/login`
  - Ingresa credenciales válidas
  - Se almacena JWT en localStorage
  - Se redirige a `/dashboard`

- [ ] **Protección de rutas**
  - Sin JWT, intentar acceder a `/dashboard` redirige a `/auth/login`
  - Sin empresaId, intentar acceder a `/dashboard` redirige a `/negocios`
  - Con JWT pero sin empresas, usuario puede acceder a `/negocios`

- [ ] **Logout**
  - Click en usuario menu → Logout
  - JWT se elimina de localStorage
  - Se redirige a `/auth/login`
  - Rutas protegidas se bloquean

### Sección 2: NavBar

- [ ] **Elementos visibles**
  - Logo "Wapsell" visible en top-left
  - Links: Home, Dashboard, Mis Negocios (desktop)
  - BusinessSelector dropdown (si autenticado)
  - User menu con nombre

- [ ] **Navegación**
  - Click en logo → Redirige a `/`
  - Click en "Home" → `/`
  - Click en "Dashboard" → `/dashboard`
  - Click en "Mis Negocios" → `/negocios`

- [ ] **User Menu**
  - Click en user button abre dropdown
  - "Mi Perfil" lleva a `/profile`
  - "Cerrar Sesión" logout + redirige a login

- [ ] **Responsive**
  - Desktop: Todos los links visibles
  - Mobile (< 640px): Links en hamburger menu
  - Click hamburger abre/cierra menu

### Sección 3: Business Selector

- [ ] **Visualización inicial**
  - Muestra empresa actual en botón naranja
  - Icono dropdown (flecha)
  - Texto visible del nombre de empresa

- [ ] **Dropdown abierto**
  - Click abre dropdown con lista
  - Título "Mis Negocios" visible
  - Empresa actual tiene checkmark ✓
  - Otras empresas sin checkmark

- [ ] **Switch empresa**
  - Click en otra empresa
  - POST `/auth/switch-empresa/{id}` se ejecuta
  - JWT se actualiza en localStorage
  - empresaId se actualiza en localStorage
  - Se redirige a `/dashboard`
  - Empresa nueva se refleja en dropdown

- [ ] **Link a gestión**
  - "Administrar negocios" link en footer
  - Lleva a `/negocios`

### Sección 4: Home Page

- [ ] **No autenticado**
  - Hero section visible
  - Botón "Iniciar Sesión" → `/auth/login`
  - Botón "Crear Cuenta" → `/auth/signup`
  - Features section visible (3 cards)
  - Responsive en mobile

- [ ] **Autenticado**
  - Hero section visible
  - Botón "Ir al Dashboard" → `/dashboard`
  - Botón "Mis Negocios" → `/negocios`
  - Current business info card visible
  - Nombre, plan, usuarios activos mostrados

- [ ] **i18n en Home**
  - `/es` → Contenido en español
  - `/en` → Contenido en inglés
  - CTA buttons traducidos

### Sección 5: Dashboard

- [ ] **Acceso y protección**
  - Requiere JWT válido
  - Requiere empresaId en JWT
  - Sin JWT redirige a `/auth/login`
  - Sin empresaId redirige a `/negocios`

- [ ] **Contenido**
  - Título "Dashboard" visible
  - Saludo personalizado: "Bienvenido, {nombre}"
  - 4 cards de overview:
    - Nombre del negocio
    - Plan actual (capitalizado)
    - Usuarios activos (número)
    - Última actividad

- [ ] **Quick Actions**
  - Card Productos → link a `/productos`
  - Card Pedidos → link a `/pedidos`
  - Card Configuración → link a `/negocios/{id}/settings`

- [ ] **Información correcta**
  - Datos reflejan empresa actual
  - Plan se actualiza si switch empresa
  - Nombre correcto para cada empresa

### Sección 6: Negocios - List

- [ ] **Acceso**
  - Requiere JWT
  - No requiere empresaId
  - `/negocios` carga lista

- [ ] **Contenido vacío**
  - Si no hay empresas:
    - Mensaje "No tienes negocios registrados aún"
    - Botón "Crear mi primer negocio" → `/negocios/crear`

- [ ] **Contenido con datos**
  - GET `/tenants/my-empresas` se ejecuta
  - Se muestra card por cada empresa
  - Card contiene:
    - Nombre de empresa
    - Email
    - Plan (con badge color)
    - Usuarios activos
    - Última actividad
    - Botón "Editar" → `/negocios/{id}/settings`
    - Botón "Acceder" → `/dashboard` + empresaId

- [ ] **Header**
  - Título "Mis Negocios"
  - Subtitle descriptivo
  - Botón "+ Crear Negocio" → `/negocios/crear`

- [ ] **Responsividad**
  - Desktop: 3 columnas
  - Tablet: 2 columnas
  - Mobile: 1 columna

### Sección 7: Negocios - Create

- [ ] **Acceso**
  - `/negocios/crear` protegida pero sin empresaId
  - Navegable desde `/negocios`

- [ ] **Formulario**
  - Campos visibles:
    - Nombre (requerido)
    - Email (requerido)
    - Teléfono (opcional)
    - País (requerido, select)
    - Sector (opcional, select)
    - Plan (requerido, radio buttons: básico/pro)
    - Términos (checkbox requerido)

- [ ] **Validaciones**
  - Nombre < 3 chars → error
  - Email inválido → error
  - País vacío → error
  - Términos no aceptados → error
  - Errores mostrados bajo campos
  - Errores se limpian al escribir

- [ ] **Submit**
  - Click "Crear Negocio"
  - POST `/tenants` con todos los datos
  - Si error: mensaje de error visible
  - Si éxito: redirige a `/negocios/{id}/onboarding`

- [ ] **Cancel**
  - Botón "Cancelar"
  - Vuelve a página anterior

- [ ] **Loading state**
  - Botón deshabilitado durante submit
  - Texto cambia a "Guardando..."

### Sección 8: Negocios - Onboarding

- [ ] **Post-creación**
  - Redirige desde `/negocios/crear` después de POST exitoso
  - URL: `/negocios/{id}/onboarding`

- [ ] **Visualización**
  - Checkmark en círculo naranja
  - Título "¡Negocio Creado Exitosamente!"
  - Subtítulo "Te estamos redirigiendo..."
  - 3 puntos animados (loading)

- [ ] **Auto-redirect**
  - Espera 3 segundos
  - Redirige automáticamente a `/dashboard`
  - empresaId actualizado en localStorage
  - Negocio nuevo es seleccionado en BusinessSelector

- [ ] **Manual redirect**
  - Click en "Haz clic aquí" redirige inmediatamente
  - Si no se redirige automáticamente

### Sección 9: Negocios - Settings

- [ ] **Acceso**
  - `/negocios/{id}/settings`
  - Protegida pero sin empresaId requerido
  - Muestra datos de empresa específica

- [ ] **Carga**
  - GET `/tenants/{id}` se ejecuta
  - Formulario se prefill con datos actuales
  - Loading spinner mientras carga

- [ ] **Edición**
  - Campos editables:
    - Nombre
    - Email
    - Teléfono
    - País (select)
    - Sector (select)
    - Plan (select)

- [ ] **Save**
  - Click "Guardar Cambios"
  - PATCH `/tenants/{id}` se ejecuta
  - Mensaje de éxito "Cambios guardados exitosamente"
  - Mensaje desaparece después de 3s

- [ ] **Quick Actions**
  - "Cambiar Contraseña" (placeholder button)
  - "Equipo" → `/negocios/{id}/team`

- [ ] **Danger Zone**
  - Fondo rojo oscuro
  - "Eliminar Negocio" button
  - Click muestra confirmación
    - Mensaje de advertencia
    - Botones: "Sí, Eliminar" y "Cancelar"
  - "Sí, Eliminar" ejecuta DELETE `/tenants/{id}`
  - Redirige a `/negocios` si exitoso

### Sección 10: Internacionalización (i18n)

- [ ] **Español**
  - `/es` y `/es/dashboard` muestran contenido en español
  - Todas las cadenas de texto traducidas
  - Campos de formulario en español
  - Botones en español

- [ ] **Inglés**
  - `/en` y `/en/dashboard` muestran contenido en inglés
  - Todas las cadenas de texto traducidas
  - Campos de formulario en inglés
  - Botones en inglés

- [ ] **Context preserve**
  - Cambiar idioma mantiene la ruta funcional
  - `/es/negocios` ↔ `/en/negocios`

### Sección 11: Responsividad

- [ ] **Mobile (< 640px)**
  - NavBar hamburger visible
  - Links en dropdown
  - Cards en 1 columna
  - Botones apilados
  - Gutters de 16px
  - Touch targets accesibles (44px+)

- [ ] **Tablet (640-1024px)**
  - NavBar con más espacio
  - Grid 2 columnas
  - Mejor aprovechamiento de espacio

- [ ] **Desktop (> 1024px)**
  - NavBar completo con todos los links
  - Grid 3 columnas
  - Mejor visualización

- [ ] **Orientación**
  - Portrait: Layout adapta correctamente
  - Landscape: Mantiene legibilidad

### Sección 12: Visual & UX

- [ ] **Colores**
  - Naranja (#D97757) en buttons primarios
  - Gris en buttons secundarios
  - Azul en info messages
  - Rojo en danger zone
  - Fondo crema (#FAF9F5)

- [ ] **Typography**
  - Títulos: 4xl, bold
  - Subtítulos: 2xl, bold
  - Body: readable size, proper contrast
  - System fonts

- [ ] **Espaciado**
  - Consistencia en padding/margin
  - Cards con buen breathing room
  - Buttons con hit area adecuada

- [ ] **Feedback visual**
  - Hover states en buttons
  - Loading spinners
  - Error messages en rojo
  - Success messages en verde
  - Transiciones suaves

### Sección 13: Performance

- [ ] **Load time**
  - Home page carga rápidamente
  - Dashboard carga < 2s
  - Negocios list carga < 1s

- [ ] **Interactividad**
  - Clicks responden al instante
  - Formularios son responsivos
  - Dropdowns abren sin lag

- [ ] **Network**
  - Requests van a API_URL correcto
  - JWT se envía en Authorization header
  - Respuestas se parsean correctamente

## Casos de Uso Complejos

### Caso 1: New User Signup → Create Business → Dashboard
```
1. Acceso a /en (no autenticado)
2. Click "Sign Up" → /auth/signup
3. Completa signup (backend)
4. Redirige a /negocios/crear (no tiene empresas)
5. Crea business
6. Redirige a /negocios/{id}/onboarding
7. Auto-redirige a /dashboard
8. Verifica: empresa correcta, datos reflejan negocio nuevo
```

### Caso 2: Multi-Business Workflow
```
1. Usuario con 3 empresas
2. En /dashboard viendo Empresa A
3. Click BusinessSelector
4. Selecciona Empresa B
5. Verifica: JWT actualizado, empresaId actualizado, datos de B
6. Click "Mis Negocios"
7. Ve 3 empresas listadas
8. Click "Acceder" en Empresa C
9. Verifica: CurrentBusiness es C
```

### Caso 3: Edit y Switch
```
1. /negocios/{empresa-a-id}/settings
2. Edita nombre, plan
3. Guarda exitosamente
4. Click en logo
5. Click "Mis Negocios"
6. Verifica: cambios visibles en card
7. Click "Acceder" en otra empresa
8. Verifica: datos viejos de empresa A no afectan empresa B
```

## Endpoints API Esperados

```
POST   /auth/login                  # { email, password }
POST   /auth/signup                 # { email, password, ... }
POST   /auth/logout
POST   /auth/switch-empresa/:id

GET    /tenants/my-empresas         # Returns Empresa[]
POST   /tenants                     # { nombre, email, pais, sector, plan }
GET    /tenants/:id                 # Returns Empresa
PATCH  /tenants/:id                 # Partial update
DELETE /tenants/:id
```

## Errores Comunes a Verificar

- [ ] JWT no se envía en request
- [ ] empresaId no se actualiza en localStorage
- [ ] Rutas protegidas no redirigen
- [ ] Formulario valida pero no submit
- [ ] API error no se muestra al usuario
- [ ] Loading state no se limpia
- [ ] Traducciones faltantes
- [ ] Responsive breaks en cierto breakpoint
- [ ] Dropdown businessSelector no actualiza visualmente
- [ ] Navegación circular entre rutas

## Ambiente de Testing

- **Browser**: Chrome/Firefox/Safari (latest)
- **Device**: Desktop, Tablet, Mobile
- **Network**: Slow 3G, Fast 4G, Local
- **API**: staging.wapsell.com
- **Clear cache** antes de cada suite

## Checklist Final Pre-Deploy

- [ ] Todos los tests manuales PASS
- [ ] No hay console errors
- [ ] No hay console warnings
- [ ] Performance acceptable
- [ ] Responsive en todos los devices
- [ ] i18n completamente funcional
- [ ] API endpoints responden correctamente
- [ ] JWT se almacena/actualiza correctamente
- [ ] Rutas protegidas funcionan
- [ ] Styling es consistente
