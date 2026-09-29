# AS-IS — Identity
**Evidencia:** VERIFIED BY CODE (grep exhaustivo + lectura de `apps/api/src/auth/`, esta sesión)

## Hecho central, verificado dos veces de forma independiente

**No existe ningún concepto de "Business", "Tenant" ni "Membership" en el código.** Grep exhaustivo
sobre `apps/api/src`, `apps/pos-admin/src`, `apps/tienda-online/src` y `schema.prisma` no encontró
ninguna coincidencia — confirmado de forma independiente tanto por el agente de exploración de esta
sesión como por SRC-011 (que llega a la misma conclusión por su propia lectura de código, fechada un
día antes). Dos lecturas de código independientes, mismo resultado: ausencia real, no un artefacto
de búsqueda.

## Qué existe en su lugar

El multi-tenant real se llama **`Empresa`** (no Business/Tenant) y es el modelo raíz de aislamiento
de datos (ver `03-ASIS-DATA.md`). **No hay tabla `Membership`**: la relación Usuario↔Empresa es
**1:N directa y fija** (`Usuario.empresaId`, escalar y obligatorio) — un Usuario pertenece a
exactamente una empresa desde su creación, sin posibilidad de pertenecer a varias.

`Usuario.email` es **único globalmente** (no por empresa) — consecuencia práctica: **una misma
persona no puede tener cuenta de `Usuario` en dos empresas distintas** con el mismo email. Esto es
lo opuesto de "User = identidad global reutilizable entre Business" que pide DEC-001.

## Autenticación real

Dos identidades separadas comparten el mismo mecanismo de JWT, discriminadas por un campo `type` en
el payload:

- **`Usuario`** (panel interno, `type: 'usuario'`)
- **`Cliente`** (tienda online, `type: 'cliente'`)

Tokens emitidos antes de RF-17 (sin campo `type`) se tratan como `'usuario'` por retrocompatibilidad
explícita en el código — decisión documentada, no un descuido.

- Login por password (bcrypt) y por Google OAuth 2.0 (Passport) para **ambas** identidades.
- Auto-alta por Google condicionada a variables de entorno obligatorias (`GOOGLE_SIGNUP_EMPRESA_ID`
  para Usuario, `TIENDA_EMPRESA_ID` para Cliente) — el sistema falla explícito si faltan, en vez de
  asumir una empresa por defecto.
- `GET /auth/me` y `GET /auth/cliente/me` consultan la base de datos en cada llamada (no confían
  solo en el JWT), para reflejar cambios que no requieren relogin (foto, nombre de empresa).
- No existe ningún "usuario global" cross-empresa ni rol de superadmin de plataforma en el código
  inspeccionado.

## Búsqueda específica de conceptos de la visión "Wapsell plataforma"

Se buscó explícitamente `Conversacion`, `Mensaje`, `Asistente` en todo el código (backend y ambos
frontends) — **ninguna coincidencia real**. El único match textual de "Asistente" es el string del
enum `RolUsuario.ASISTENTE_LOCAL` ("Asistente de local"), que es un **rol de empleado humano del
comercio** (mostrador/caja/POS), sin ninguna relación con un asistente conversacional o de IA —
confirmado leyendo el contexto de cada aparición (`schema.prisma`, `invitaciones.service.ts`,
`auth.service.ts`, `seed.ts`).

## Distancia con DEC-001 (Wapsell plataforma multi-tenant)

Esta es la evidencia de código más directa de la brecha que ya se anticipaba en Fase 1 (CON-001) y
que SRC-011 detecta también por su cuenta (preguntas D-WAP-001/002 de esa auditoría). Migrar hacia
el modelo `User → Membership → Business` que pide DEC-001 requiere, como mínimo:

1. Separar la identidad de la pertenencia: hoy `Usuario` *es* la identidad y *tiene* una empresa
   fija; el modelo objetivo necesita una identidad (`User`) que *pueda tener* varias pertenencias.
2. Resolver qué pasa con `Usuario.email @unique` global — hoy ya es único globalmente, lo cual es
   compatible con "User = identidad global", pero el resto del modelo (`empresaId` escalar
   obligatorio) no lo es.
3. Decidir qué pasa con la separación actual `Usuario`/`Cliente` (dos tablas con JWT discriminado)
   frente a un "User" único de la visión de plataforma.

Esto no se resuelve en este documento — es exactamente el tipo de decisión derivada que
`04-DECISIONS/02-MULTITENANCY.md` (DEC-001) dejó pendiente para una DEC-002 futura.
