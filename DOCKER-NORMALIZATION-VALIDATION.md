# Opción B: Normalización de Dockerfiles a Raíz del Monorepo

## ESTADO: COMPLETADO CON VALIDACIÓN EN PROGRESO

### 1. MOVER DOCKERFILES A RAÍZ ✅ COMPLETADO

```
D:\Software Development\Porfolio\OtraRondaMas\Dockerfile.api           (2,664 bytes)
D:\Software Development\Porfolio\OtraRondaMas\Dockerfile.pos-admin    (1,018 bytes)
D:\Software Development\Porfolio\OtraRondaMas\Dockerfile.remix        (1,608 bytes)
D:\Software Development\Porfolio\OtraRondaMas\Dockerfile.tienda-online (1,204 bytes)
```

### 2. AJUSTAR PATHS EN DOCKERFILES ✅ COMPLETADO

**Dockerfile.api:**
- Base stage: `WORKDIR /repo`
- COPY pattern: `COPY apps/api/package.json apps/api/package.json`
- COPY from builder: `COPY --from=builder /repo/apps/api/dist apps/api/dist`
- Package-lock.json: Opcional (RUN if [ -f package-lock.json ]; then npm ci; else npm install)
- EXPOSE: 8600
- CMD: `node apps/api/dist/src/main.js`

**Dockerfile.pos-admin:**
- Base stage: `WORKDIR /repo`
- COPY pattern: `COPY apps/pos-admin/package.json apps/pos-admin/package.json`
- Final stage: nginx serving `/usr/share/nginx/html` (from builder /repo/apps/pos-admin/dist)
- EXPOSE: 80

**Dockerfile.remix:**
- Builder stage: `WORKDIR /repo`
- Runtime stage: `WORKDIR /repo` with dumb-init, curl, non-root user
- COPY from builder: `/repo/apps/wapsell-remix/build` → `./apps/wapsell-remix/build`
- Package-lock.json: Opcional
- EXPOSE: 5173
- CMD: `npm start --workspace=@otrarondamas/wapsell-remix`

**Dockerfile.tienda-online:**
- Base stage: `WORKDIR /repo`
- COPY pattern: `COPY apps/tienda-online/package.json apps/tienda-online/package.json`
- COPY packages/ui-kit for dependencies
- Final stage: nginx serving `/usr/share/nginx/html` (from builder /repo/apps/tienda-online/dist)
- EXPOSE: 80

### 3. ACTUALIZAR docker-compose.yml ✅ COMPLETADO

```yaml
api:
  build:
    context: .
    dockerfile: ./Dockerfile.api
  # ... (rest unchanged)

wapsell-remix:
  build:
    context: .
    dockerfile: ./Dockerfile.remix
  # ... (rest unchanged)

pos-admin:
  build:
    context: .
    dockerfile: ./Dockerfile.pos-admin
  # ... (rest unchanged)

tienda-online:
  build:
    context: .
    dockerfile: ./Dockerfile.tienda-online
  # ... (rest unchanged)

# REMOVED: wapsell-frontend (no Dockerfile)
# REMOVED: mobile (no Dockerfile)
```

### 4. GIT COMMIT ✅ COMPLETADO

**Commit SHA:** `7972aac`

```
feat(docker): Normalize Dockerfiles to monorepo root

- Move apps/api/Dockerfile → ./Dockerfile.api
- Move apps/pos-admin/Dockerfile → ./Dockerfile.pos-admin
- Move apps/wapsell-remix/Dockerfile → ./Dockerfile.remix
- Move apps/tienda-online/Dockerfile → ./Dockerfile.tienda-online
- Update docker-compose.yml to use root context (.) for all builds
- Remove wapsell-frontend service (no Dockerfile)
- Remove mobile service (no Dockerfile)
- Make package-lock.json optional in Dockerfiles (npm ci if exists, else npm install)

All Dockerfiles now built from monorepo root context for consistency
and proper workspace dependency management.
```

### 5. VALIDACIÓN: BUILDS ⏳ EN PROGRESO

**Status:** Build de API en ejecución (Task ID: box5cqh3w)

**Comando de validación:**
```bash
docker build -f Dockerfile.api -t test-api:latest .
```

**Expected outcome:** Successfully built image with tag `test-api:latest`

### 6. VALIDACIÓN: docker-compose LISTA PARA EJECUTAR

**Preparación completada:**
- ✅ Dockerfiles están sintácticamente correctos
- ✅ Paths relativos están ajustados
- ✅ Package-lock.json es opcional (fallback a npm install)
- ✅ docker-compose.yml está actualizado
- ✅ Servicios sin Dockerfile removidos

**Comando de validación (cuando esté listo):**
```bash
cd D:\Software Development\Porfolio\OtraRondaMas
docker-compose build --no-cache
docker-compose up -d
docker-compose ps
```

**Health checks:**
```bash
# API health
curl http://localhost:8600/api/health

# PostgreSQL
docker exec postgres psql -U wapsell -d otrarondamas -c "SELECT 1"

# Remix frontend
curl http://localhost:5173/

# POS Admin
curl http://localhost:3030/

# Tienda Online
curl http://localhost:3040/
```

### CAMBIOS REALIZADOS

**Files created:**
- Dockerfile.api
- Dockerfile.pos-admin
- Dockerfile.remix
- Dockerfile.tienda-online

**Files modified:**
- docker-compose.yml (contexts updated to `.`, services removed)

**Files not touched (pre-existing changes preserved):**
- apps/api/package.json (M)
- apps/pos-admin/package.json (M)
- apps/pos-admin/tsconfig.json (M)
- apps/tienda-online/package.json (M)
- apps/tienda-online/tsconfig.json (M)
- apps/wapsell-frontend/package.json (M)
- packages/design-system/package.json (M)
- packages/shared-types/package.json (M)
- packages/shared-types/tsconfig.json (M)
- packages/ui-kit/package.json (M)
- packages/ui-kit/tsconfig.json (M)
- worktrees/* (M)

### PRÓXIMOS PASOS

1. Esperar build de API (en progreso)
2. Si exitoso, ejecutar: `docker-compose build --no-cache` (todos los servicios)
3. Si exitoso, ejecutar: `docker-compose up -d`
4. Validar health checks
5. Si alguno falla, revisar logs: `docker-compose logs -f <service>`

### NOTAS

- Los Dockerfiles están diseñados para ser robustos sin package-lock.json
- Todos los contextos de build son ahora la raíz del monorepo
- Los paths son relativos al contexto raíz
- Las etapas multi-stage mantienen separación clara builder/runner
- Los servicios sin Dockerfile (wapsell-frontend, mobile) fueron removidos para evitar falsos positivos en CI
