# Docker Operations Guide — Wapsell Remix

## Quick Start

### Build Image

```bash
cd apps/wapsell-remix
docker build -f Dockerfile -t wapsell-remix:latest --progress=plain .
```

**Expected Time:** 60-90s (cold build) or 5-10s (cache hit)

### Run Container

```bash
docker run \
  --rm \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e VITE_API_URL=http://localhost:8600 \
  -e SESSION_SECRET=$(openssl rand -hex 16) \
  wapsell-remix:latest
```

**Expected Output:**
```
   The Remix App Server
   built with Vite
   http://localhost:3000
```

### Test Health Endpoint

```bash
curl http://localhost:3000/api/health | jq .
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-10-29T15:00:00.000Z"
}
```

---

## Automated Testing

Use the provided test script for comprehensive validation:

```bash
# Run full build + test suite
bash docker-build-test.sh

# Skip build, test existing image
bash docker-build-test.sh --no-build

# Clean up old image before building
bash docker-build-test.sh --clean
```

**Test Coverage:**
- ✓ Docker build succeeds
- ✓ Image size < 500MB
- ✓ Container starts and becomes healthy
- ✓ Health endpoint responds correctly
- ✓ Root endpoint responds
- ✓ Health checks pass for 60+ seconds
- ✓ Graceful shutdown (SIGTERM) works

---

## Environment Variables

### Required

| Variable | Example | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `production` | Disables dev middleware |
| `VITE_API_URL` | `http://api:3000` | Backend API endpoint |
| `SESSION_SECRET` | `<32-byte hex>` | Session signing key |

### Optional

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Server port |
| `DEFAULT_LOCALE` | `es` | Default language |
| `LOG_LEVEL` | `info` | Logging verbosity |

### Generate SESSION_SECRET

```bash
# Linux/Mac
openssl rand -hex 16

# PowerShell
[System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes(16) | ForEach-Object { "{0:x2}" -f $_ } | Join-String
```

---

## Docker Compose

### Single Service (Development)

```yaml
version: '3.9'
services:
  wapsell-remix:
    build:
      context: .
      dockerfile: apps/wapsell-remix/Dockerfile
    container_name: wapsell-remix-dev
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      VITE_API_URL: http://localhost:8600
      SESSION_SECRET: dev-secret-never-use-prod
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
```

**Usage:**
```bash
docker-compose up --build
docker-compose logs -f
docker-compose down
```

### With API Service

```yaml
version: '3.9'

services:
  wapsell-remix:
    build:
      context: .
      dockerfile: apps/wapsell-remix/Dockerfile
    container_name: wapsell-remix
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      VITE_API_URL: http://api:3000  # Use service name (Docker DNS)
      SESSION_SECRET: dev-secret
    depends_on:
      api:
        condition: service_healthy
    networks:
      - wapsell

  api:
    image: wapsell-api:latest
    container_name: wapsell-api
    ports:
      - "3001:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - wapsell

networks:
  wapsell:
    driver: bridge
```

**Usage:**
```bash
docker-compose up -d
docker-compose ps
docker-compose logs -f wapsell-remix
docker-compose down
```

---

## Production Deployment

### Environment File (.env.production)

Create `.env.production` from `.env.production.example`:

```bash
cp .env.production.example .env.production
# Edit .env.production and set real values
```

**CRITICAL:** Never commit `.env.production` to Git!

### Run with Secrets

```bash
# Load from .env.production
docker run \
  --rm \
  --env-file .env.production \
  -p 3000:3000 \
  wapsell-remix:latest
```

### Docker Secrets (Kubernetes)

```bash
# Create secret
echo "my-random-session-secret" | docker secret create session_secret -

# Run container
docker service create \
  --secret session_secret \
  --env SESSION_SECRET_FILE=/run/secrets/session_secret \
  -p 3000:3000 \
  wapsell-remix:latest
```

---

## Troubleshooting

### Image Build Fails

**Error:** `npm ERR! 404 Not Found`
```bash
# Retry with verbose output
docker build --progress=plain -f Dockerfile -t wapsell-remix . 2>&1 | tail -50

# Check npm registry
npm ping

# Try with different registry
docker build --build-arg NPM_REGISTRY=https://registry.npmjs.org/ -f Dockerfile -t wapsell-remix .
```

**Error:** `COPY build/ failed: stat: no such file or directory`
```bash
# Build failed in builder stage
# Check for TypeScript errors
npm run build

# Check generated files
ls -la build/
```

### Container Won't Start

**Check logs:**
```bash
docker logs <container-id>
docker logs <container-id> --tail=50 --follow
```

**Common Issues:**
- Missing `SESSION_SECRET` → set environment variable
- Wrong `VITE_API_URL` → verify backend is running
- Port 3000 in use → map to different port: `-p 8080:3000`

### Health Check Failing

```bash
# Check health status
docker inspect <container-id> --format='{{json .State.Health}}' | jq .

# Check what's wrong
curl -v http://localhost:3000/api/health

# Manually verify
docker exec <container-id> curl -f http://localhost:3000/api/health
```

**Solutions:**
- Ensure app is fully started: `initialDelaySeconds: 15`
- Increase timeout: `HEALTHCHECK --timeout=15s`
- Check endpoint exists: `GET /api/health` or `GET /`

### Graceful Shutdown Not Working

```bash
# Check if dumb-init is used
docker inspect <container-id> | grep -A 20 "Entrypoint"

# Should see: ["dumb-init", "--"]
```

If missing, rebuild image.

### Container Using Too Much Memory

```bash
# Check memory usage
docker stats <container-id>

# Set memory limit
docker run \
  -m 512m \
  -e NODE_OPTIONS="--max-old-space-size=256" \
  wapsell-remix:latest
```

---

## Performance Tuning

### Layer Caching Optimization

To maximize Docker cache hits during development:

```bash
# Avoid invalidating cache with source changes
# 1. Keep package.json stable (don't edit often)
# 2. Only copy source code once (in builder stage)
# 3. Use BuildKit for parallel builds

DOCKER_BUILDKIT=1 docker build -f Dockerfile -t wapsell-remix .
```

### Multi-Platform Build

Build for ARM64 (Apple Silicon) and AMD64:

```bash
# Requires buildx setup
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f Dockerfile \
  -t wapsell-remix:latest \
  --push \
  .
```

---

## Size Analysis

### Image Breakdown

```bash
# Total image size
docker images wapsell-remix:latest --format "{{.Size}}"

# Layer sizes
docker history wapsell-remix:latest --human

# File system scan
docker run --rm wapsell-remix:latest du -sh /app/*
```

**Expected Sizes:**
- Node base image: ~50MB
- Production deps: ~15-20MB
- App bundles: ~400KB
- Total: ~70-100MB (compressed) / ~250-350MB (uncompressed)

### Reduce Size Further

If image needs to be smaller:

```dockerfile
# Remove source maps (smaller but harder to debug)
RUN npm run build -- --no-source-map

# Remove unused packages from package.json
npm prune --production

# Use distroless base (advanced)
FROM node:20-alpine
# vs
FROM gcr.io/distroless/nodejs20-debian11
```

---

## Security Checklist

- ✅ Non-root user (`nodejs:1001`)
- ✅ Alpine base (minimal attack surface)
- ✅ Health check enabled (detect crashes)
- ✅ dumb-init for signals (graceful shutdown)
- ✅ No secrets in `.env` (use mounts/secrets)
- ✅ `.dockerignore` excludes `.git`, `node_modules`, sensitive files
- ✅ Read-only root filesystem (advanced):
  ```dockerfile
  docker run --read-only --tmpfs /tmp wapsell-remix
  ```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Build & Push Docker Image

on:
  push:
    branches: [main, staging]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ secrets.REGISTRY_HOST }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      
      - name: Build & Push
        uses: docker/build-push-action@v4
        with:
          context: .
          file: apps/wapsell-remix/Dockerfile
          push: true
          tags: |
            ${{ secrets.REGISTRY_HOST }}/wapsell-remix:latest
            ${{ secrets.REGISTRY_HOST }}/wapsell-remix:${{ github.sha }}
          cache-from: type=registry,ref=${{ secrets.REGISTRY_HOST }}/wapsell-remix:buildcache
          cache-to: type=registry,ref=${{ secrets.REGISTRY_HOST }}/wapsell-remix:buildcache,mode=max
```

### Local Registry

```bash
# Start local registry
docker run -d -p 5000:5000 registry:latest

# Tag and push
docker tag wapsell-remix:latest localhost:5000/wapsell-remix:latest
docker push localhost:5000/wapsell-remix:latest

# Pull and run
docker run localhost:5000/wapsell-remix:latest
```

---

## Debugging

### Interactive Shell

```bash
# Run container with bash
docker run -it --rm wapsell-remix:latest sh

# Check environment
env | sort

# Test app
npm start
```

### Build with Verbose Output

```bash
# Show all build steps
DOCKER_BUILDKIT=0 docker build --progress=plain -f Dockerfile -t wapsell-remix .

# Keep failed build context (advanced)
docker build --target builder -f Dockerfile -t wapsell-remix-builder .
docker run -it --rm wapsell-remix-builder sh
```

### Inspect Running Container

```bash
# View processes
docker top <container-id>

# Check network
docker inspect <container-id> | grep -A 10 "NetworkSettings"

# Check mounts
docker inspect <container-id> | grep -A 10 "Mounts"
```

---

## References

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Health Checks](https://docs.docker.com/reference/dockerfile/#healthcheck)
- [Docker Security](https://docs.docker.com/engine/security/)

---

## Maintenance

### Prune Unused Images

```bash
docker image prune -a  # Remove all unused images
docker system prune     # Remove all unused resources
```

### Update Base Image

```bash
# Check for updates
docker pull node:20-alpine

# Rebuild
docker build --no-cache -f Dockerfile -t wapsell-remix .
```

### Rotate SESSION_SECRET

```bash
# Monthly rotation (example)
NEW_SECRET=$(openssl rand -hex 16)
docker run \
  -e SESSION_SECRET=$NEW_SECRET \
  wapsell-remix:latest
```

---

## Files

- **Dockerfile** — Multi-stage build with 3 stages
- **.dockerignore** — Exclude files from build context
- **.env.production.example** — Environment template
- **docker-build-test.sh** — Automated test suite
- **DOCKER-OPTIMIZATION.md** — Detailed optimization guide
- **DOCKER-README.md** — This file

---

**Last Updated:** 2026-10-29  
**Maintainer:** Agent M2 — Docker & Bundle Optimization
