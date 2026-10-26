# Índice de Documentación - Wapsell Frontend

## 📖 Documentos Principales

### 1. **QUICK-START.md** (⚡ Inicia aquí)
**Para**: Desarrolladores que quieren empezar rápido  
**Contiene**:
- Setup en 5 minutos
- Estructura rápida
- Flujos principales
- Comandos útiles
- Solución de problemas comunes

**Lee esto primero si necesitas empezar YA**

---

### 2. **README.md** (📚 Guía completa)
**Para**: Documentación exhaustiva del proyecto  
**Contiene**:
- Features detalladas
- Componentes explicados
- Páginas documentadas
- API utilities
- Contexto global
- Rutas protegidas
- Estructura de carpetas
- Testing manual
- Próximos pasos

**Lee esto para entender TODO el proyecto**

---

### 3. **STRUCTURE.md** (🏗️ Arquitectura profunda)
**Para**: Entender el diseño técnico  
**Contiene**:
- Árbol de carpetas completo
- Tipos e interfaces
- Flujos principales detallados
- Colores design system
- Responsividad
- Variables de entorno
- Scripts npm
- Patrones de codificación
- Dependencias principales
- Próximas fases

**Lee esto para arquitectura y diseño**

---

### 4. **TESTING.md** (✅ Quality assurance)
**Para**: Testing manual del frontend  
**Contiene**:
- 13 secciones de testing
- 100+ checklist items
- Casos de uso complejos
- Errores comunes
- Setup de testing
- Pre-deploy checklist

**Lee esto ANTES de producción**

---

## 🗂️ Estructura de Archivos

```
apps/wapsell-frontend/

📄 DOCUMENTACIÓN
├── INDEX.md                    ← Estás aquí
├── QUICK-START.md              ← Inicio rápido (5 min)
├── README.md                   ← Guía completa (1500+ líneas)
├── STRUCTURE.md                ← Arquitectura (800+ líneas)
├── TESTING.md                  ← Testing manual (600+ líneas)

📦 CONFIGURACIÓN
├── package.json                ← Dependencias
├── tsconfig.json               ← TypeScript
├── next.config.ts              ← Next.js
├── tailwind.config.ts          ← Tailwind CSS
├── postcss.config.js           ← PostCSS
├── .eslintrc.json              ← ESLint
├── .env.example                ← Variables de entorno
├── .gitignore                  ← Git ignore
└── i18n.config.ts              ← i18n config

📁 CÓDIGO FUENTE

components/                     ← Componentes reutilizables
├── AuthContext.tsx             ← Autenticación global (useAuth hook)
├── NavBar.tsx                  ← Barra de navegación
├── BusinessSelector.tsx        ← Dropdown de empresas
└── ProtectedRoute.tsx          ← Protección de rutas

app/[locale]/                   ← Next.js App Router
├── layout.tsx                  ← Root layout (AuthProvider)
├── page.tsx                    ← Home page
├── globals.css                 ← Estilos globales
├── dashboard/
│   └── page.tsx                ← Dashboard (requiere auth + empresaId)
└── negocios/                   ← Gestión de empresas
    ├── page.tsx                ← Listar empresas
    ├── crear/
    │   └── page.tsx            ← Crear empresa
    └── [id]/
        ├── settings/
        │   └── page.tsx        ← Editar empresa
        └── onboarding/
            └── page.tsx        ← Bienvenida post-creación

lib/
└── api.ts                      ← Cliente HTTP con JWT

messages/                       ← Traducciones i18n
├── es.json                     ← Español (100+ strings)
└── en.json                     ← Inglés (100+ strings)
```

---

## 🚀 Guía por Caso de Uso

### "Quiero empezar en 5 minutos"
1. Lee: **QUICK-START.md**
2. Ejecuta: `npm install && npm run dev`
3. Abre: `http://localhost:3000`

### "Necesito entender la arquitectura"
1. Lee: **STRUCTURE.md**
2. Revisa: Flujos principales
3. Consulta: Tipos e interfaces

### "Voy a desarrollar nuevas features"
1. Lee: **README.md** (Sección Componentes)
2. Lee: **STRUCTURE.md** (Sección Patrones)
3. Consulta: Componentes existentes para ejemplos

### "Debo testear antes de deploy"
1. Lee: **TESTING.md**
2. Sigue: Checklist de 100+ items
3. Verifica: Pre-deploy checklist

### "Tengo un bug"
1. Consulta: TESTING.md → Errores Comunes
2. Revisa: Console errors en DevTools
3. Lee: Network tab para API issues

### "Necesito deployar a producción"
1. Lee: QUICK-START.md → Comandos
2. Ejecuta: `npm run build`
3. Verifica: TESTING.md → Pre-deploy checklist
4. Deploy: Sigue tu proceso

---

## 📋 Checklist por Rol

### Desarrollador Frontend
- [ ] Leo QUICK-START.md
- [ ] Ejecuto `npm install && npm run dev`
- [ ] Entiendo STRUCTURE.md
- [ ] Reviso componentes principales
- [ ] Leo patrones de codificación

### QA / Tester
- [ ] Leo TESTING.md
- [ ] Sigo 13 secciones de testing
- [ ] Completo 100+ checklist items
- [ ] Pruebo en mobile/tablet/desktop
- [ ] Verifica pre-deploy checklist

### DevOps / DevRel
- [ ] Leo QUICK-START.md → Comandos
- [ ] Verifica .env.example
- [ ] Configura CI/CD pipeline
- [ ] Deploy: `npm run build && npm start`
- [ ] Monitorea performance

### Product Manager
- [ ] Leo README.md → Features
- [ ] Entiende flujos principales
- [ ] Verifica Próximas Fases (Fase 2-4)
- [ ] Consulta Roadmap

---

## 🔑 Conceptos Clave

### Autenticación (AuthContext)
- JWT en localStorage
- useAuth() hook para estado global
- switchEmpresa() para cambiar empresa
- logout() para cerrar sesión

### Multi-Tenancy
- Cada usuario puede tener múltiples empresas
- empresaId en localStorage indica empresa actual
- JWT contiene lista de empresas
- BusinessSelector para cambiar

### Componentes Principales
- **AuthContext**: Estado global + métodos
- **NavBar**: Navegación + BusinessSelector
- **ProtectedRoute**: Protección de rutas
- **API**: Cliente HTTP con JWT auto-add

### Páginas
- **Home**: Landing page
- **Dashboard**: Información empresa actual
- **Negocios List**: Listar todas las empresas
- **Negocios Create**: Crear nueva empresa
- **Negocios Settings**: Editar empresa

### i18n
- Soporte español (es) e inglés (en)
- next-intl para routing
- messages/es.json y messages/en.json
- 100+ strings traducidas

---

## 🎨 Estilos

| Elemento | Color | Uso |
|----------|-------|-----|
| Primario | #D97757 | Buttons, links, highlights |
| Oscuro | #1A1815 | NavBar, text principal |
| Luz | #FAF9F5 | Backgrounds |
| Gris | #E8E5E0 | Borders, dividers |

---

## 🔌 APIs Requeridas

Endpoints que espera el frontend:

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

JWT debe contener: `sub`, `email`, `nombre`, `empresaId`, `empresas[]`

---

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| Componentes | 4 (AuthContext, NavBar, BusinessSelector, ProtectedRoute) |
| Páginas | 6 (Home, Dashboard, Negocios×4) |
| Líneas de código | ~2000+ (TypeScript + TSX) |
| Documentación | 5 archivos (3000+ líneas) |
| Traducciones | 100+ strings (es + en) |
| Configuración | 7 archivos (TypeScript, ESLint, Tailwind, etc.) |

---

## 🚦 Próximas Fases

### Fase 2: Mejoras UX
- Toast notifications (Sonner)
- Modal de confirmación
- Refresh tokens
- Dark mode

### Fase 3: Features
- Team management
- Profile page
- Productos CRUD
- Pedidos management
- Analytics dashboard

### Fase 4: Optimización
- Image optimization
- Code splitting
- Sentry error tracking
- PWA capabilities

---

## 🆘 Ayuda Rápida

**Problema**: "Cannot find module"  
**Solución**: `npm install`

**Problema**: "API returns 401"  
**Solución**: Verifica JWT en localStorage, intent logout + login

**Problema**: "Rutas protegidas redirigen a login"  
**Solución**: Verifica AuthContext está en layout, JWT es válido

**Problema**: "i18n no funciona"  
**Solución**: Verifica URL es `/es/...` o `/en/...`

---

## 📞 Contacto / Soporte

Para reportar bugs o sugerencias:
1. Revisa TESTING.md → Errores Comunes
2. Consulta console para errores
3. Verifica Network tab en DevTools
4. Lee README.md → Sección relevante

---

## ✅ Checklist Final

Antes de producción:
- [ ] Leí QUICK-START.md
- [ ] Ejecuté `npm install && npm run dev`
- [ ] Entiendo STRUCTURE.md
- [ ] Completé TESTING.md checklist
- [ ] Configuré variables de entorno
- [ ] Verificé API endpoints
- [ ] Hice build: `npm run build`
- [ ] Testeé en mobile/tablet/desktop
- [ ] Revisar pre-deploy checklist en TESTING.md

---

## 📚 Navegación por Documento

```
INDEX.md (estás aquí)
    ↓
¿Quiero empezar rápido?  → QUICK-START.md
¿Necesito detalle?        → README.md
¿Arquitectura profunda?   → STRUCTURE.md
¿Testing?                 → TESTING.md
```

---

**Status**: ✅ LISTO PARA PRODUCCIÓN

**Última actualización**: 2026-10-26

**Versión**: 1.0.0
