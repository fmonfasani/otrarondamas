# AS-IS — Architecture
**Evidencia:** VERIFIED BY CODE (package.json, docker-compose*, esta sesión) + DOCUMENTED (SRC-004, SRC-011)

## Stack real (VERIFIED BY CODE)

| Capa | Tecnología real |
|---|---|
| Monorepo | npm workspaces (`apps/*`, `packages/*`) — sin lerna/nx/turborepo. Scripts raíz son wrappers de texto simples |
| Backend (`apps/api`) | NestJS 10, Prisma 5.22 + `@prisma/client` 5.22, PostgreSQL (`pg` 8.11.3) |
| Auth backend | `@nestjs/jwt` 12, `@nestjs/passport` 10 + `passport-jwt` + `passport-google-oauth20`, `bcryptjs` |
| Validación backend | `class-validator` / `class-transformer` |
| Otros backend | `multer` (subida de legajos), `resend` 6.28.1 (email), Swagger (`@nestjs/swagger` + `swagger-ui-express`) |
| Frontend pos-admin | React 18.2, React Router 6.30, Vite 4.4, TypeScript 5.1, TailwindCSS 3.3, `lucide-react` |
| Frontend tienda-online | React 18.2, React Router 6.30, Vite 4.4, TypeScript 5.1 — **sin Tailwind ni librería de íconos declarada** |
| Tipos compartidos | `packages/shared-types`, workspace real (confirmado en `"workspaces"` del package.json raíz) |
| Base de datos | PostgreSQL 15 (dev, `docker-compose.yml`) / 16 (prod, `docker-compose.prod.yml`) |

Este stack **coincide** con lo que SRC-003 (prompt de scaffolding) fijó como decisión — no hay
discrepancia entre lo propuesto y lo implementado en este eje. Confirma además que SRC-018 (System
Design v2.0, que propone Kubernetes/GraphQL/2FA/PCI DSS) describe algo que **no existe** en el
código real (ver CON-002 en `03-CONFLICTS`).

## Comunicación entre apps

Ambos frontends son SPAs Vite que hablan HTTP/REST con la API vía variables de entorno de build
(`VITE_API_URL_ADMIN` / `VITE_API_URL_TIENDA` en producción, mismo backend físico). No hay gRPC,
colas de mensajes, WebSocket ni comunicación server-to-server entre las apps — todo pasa por la API
NestJS como único backend. Esto es consistente con, y confirma, la ausencia de infraestructura de
mensajería en tiempo real que requeriría la visión de plataforma conversacional de DEC-001.

## Despliegue real (DOCUMENTED en SRC-004 §26, §34; parcialmente VERIFIED BY CODE en `docker-compose.prod.yml`)

- 3 dominios en producción sobre un VPS compartido (89.167.96.239):
  - `api.otrarondamas.wapsell.com`
  - `admin.otrarondamas.wapsell.com` (pos-admin, puerto 3030)
  - `otrarondamas.wapsell.com` (tienda-online, puerto 3040)
- nginx como reverse proxy en el host, certbot para TLS.
- **Gap operativo documentado explícitamente** (SRC-004 §26): los vhosts de nginx son **copias
  manuales** en `/etc/nginx/sites-available/`, no symlinks al repo. Ya causó al menos un incidente
  real registrado: nginx sirviendo el bundle equivocado en ambos dominios pese a un `git pull`
  exitoso, detectado comparando el hash del bundle JS servido (no solo por un `200 OK`).
- Migraciones y deploy son **manuales** (patrón backup → ensayo sobre copia restaurada → migración
  real → reinicio), sin CI/CD (ver `11-ASIS-QUALITY.md`).

## Relación con la arquitectura de negocio (DEC-001)

Esta arquitectura fue diseñada y construida explícitamente como **aplicación independiente** de
Wapsell (premisa de SRC-001 §7 y SRC-003), con base de datos, dominio y monorepo propios. No hay en
el código ningún mecanismo de resolución de tenant por subdominio/handle, ni ningún acoplamiento
técnico con el repositorio `wapsell` real. Confirma a nivel de infraestructura la misma distancia
que ya señala `03-ASIS-DATA.md` / `04-ASIS-IDENTITY.md` a nivel de modelo de datos: pasar a ser "el
primer Business de Wapsell" (DEC-001) requiere trabajo de arquitectura nuevo, no solo de esquema.
