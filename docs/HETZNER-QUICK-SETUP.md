# Wapsell on Hetzner Cloud - Quick Setup Guide

Complete visual guide para desplegar Wapsell en Hetzner Cloud VPS con credenciales personales.

---

## PASO 1: Crear VPS en Hetzner Console

### 1.1 Acceder a la Consola

1. Ve a [https://console.hetzner.cloud](https://console.hetzner.cloud)
2. Inicia sesión con tu cuenta Hetzner
3. Selecciona tu **Project** (o crea uno nuevo)

### 1.2 Crear un Nuevo Servidor

1. Haz clic en **"CREATE" → "Server"** (botón azul arriba a la derecha)
2. Aparecerá un formulario de creación

### 1.3 Configurar el Servidor

| Campo | Valor | Notas |
|-------|-------|-------|
| **Name** | `wapsell-prod` | Identificador visible en la consola |
| **Type** | **CPX41** | 8 vCPU, 32GB RAM, 240GB NVMe SSD 🔴 **CRÍTICO** |
| **Location** | `Nbg1` (Nuremberg) | EU Central, bajo latency a LatAm |
| **Image** | `Ubuntu 24.04` | LTS, soportado hasta 2036 |
| **SSH Key** | [Tu clave pública] | Ver **1.4** si no tienes |
| **Networking** | Default VPC | Red privada predeterminada |
| **Backups** | ✅ Enable | Recomendado para producción |
| **User Data** | Ver **1.5** | Cloud-init script |

### 1.4 SSH Key (si no tienes una)

En tu terminal local:

```bash
# Generar nueva clave SSH
ssh-keygen -t ed25519 -f ~/.ssh/id_wapsell -C "wapsell-prod"
# Presiona Enter x2 (sin passphrase por simplicidad)

# Ver la clave pública (copiar al portapapeles)
cat ~/.ssh/id_wapsell.pub
# Salida: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... your-email@example.com
```

En Hetzner Console:
1. Ve a **SSH KEYS** (en el menú izquierdo)
2. Haz clic en **"Create Key"**
3. Pega tu clave pública (output de arriba)
4. Nombre: `wapsell-prod`
5. Haz clic en **"Save"**

### 1.5 Cloud-Init Script

En el campo **"User Data"** del formulario de creación del servidor, pega este script (se ejecutará automáticamente):

```yaml
#cloud-config
hostname: wapsell-prod
locale: en_US.UTF-8
timezone: America/Buenos_Aires

packages:
  - curl
  - wget
  - git
  - docker.io
  - docker-compose
  - htop
  - jq
  - certbot
  - python3-certbot-nginx

runcmd:
  - apt-get update && apt-get upgrade -y
  - usermod -aG docker root
  
  # Create directories
  - mkdir -p /opt/wapsell /data/wapsell/{postgres,redis,elasticsearch,logs/api,assets}
  - chmod 755 -R /opt/wapsell /data/wapsell
  
  # UFW Firewall
  - ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable -y
  
  # Clone repo
  - cd /opt/wapsell && git clone https://github.com/wapsell/platform.git . || git pull origin main
  
  # Make scripts executable
  - chmod +x /opt/wapsell/scripts/*.sh
  
  # Docker daemon config
  - mkdir -p /etc/docker
  - echo '{"storage-driver":"overlay2","log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' > /etc/docker/daemon.json
  - systemctl restart docker

final_message: "Wapsell VPS ready - ejecuta: cd /opt/wapsell && ./scripts/deployment-hetzner.sh verify"
```

### 1.6 Crear el Servidor

1. Haz clic en **"CREATE & BUY NOW"** (botón azul abajo)
2. **ESPERA 2-3 minutos** mientras Hetzner provisiona la VPS y ejecuta cloud-init

Sabrás que está listo cuando:
- La consola muestra el servidor con estado **✅ Running**
- El ícono de la VPS es verde
- La sección de **"Status"** muestra: `Running since X minutes ago`

---

## PASO 2: Obtener IP y Conectar

### 2.1 Copiar la IP Pública

En la consola Hetzner, en la sección del servidor:

```
Public IPv4:  159.89.123.45    ← Copia este número
Hostname:     wapsell-prod
```

### 2.2 Probar Conexión SSH

En tu terminal local:

```bash
# Guarda la IP en una variable
export PROD_HOST=159.89.123.45  # Reemplaza con tu IP real
export SSH_KEY=~/.ssh/id_wapsell

# Prueba de conexión (responde "yes" a "Are you sure...")
ssh -i $SSH_KEY root@$PROD_HOST "echo ✅ SSH Connected!"

# Esperado:
# ✅ SSH Connected!
```

### 2.3 Verificar Cloud-Init

```bash
ssh -i $SSH_KEY root@$PROD_HOST "cloud-init status"

# Esperado: Status: done
```

Si ve `Status: running`, **ESPERA 2-3 minutos** más y vuelve a intentar.

---

## PASO 3: Configurar DNS

**IMPORTANCIA**: Sin DNS configurado, nadie puede acceder a tu plataforma.

### 3.1 En tu Registrador (GoDaddy, Namecheap, etc)

Accede al panel de control de tu dominio.

#### A Records (Principal)

| Nombre | Tipo | Valor | TTL |
|--------|------|-------|-----|
| `@` (raíz) | A | `159.89.123.45` | 3600 |

#### CNAME Records (Subdomios)

| Nombre | Tipo | Destino | TTL |
|--------|------|---------|-----|
| `api` | CNAME | `wapsell.com` | 3600 |
| `admin` | CNAME | `wapsell.com` | 3600 |
| `www` | CNAME | `wapsell.com` | 3600 |

### 3.2 Esperar Propagación DNS

```bash
# Verificar propagación (repite cada 5 minutos)
nslookup api.wapsell.com

# Esperado después de 15-30 minutos:
# Non-authoritative answer:
# Name: api.wapsell.com
# Address: 159.89.123.45
```

---

## PASO 4: Ejecutar Deployment

### 4.1 Descargar Script de Deployment

```bash
export PROD_HOST=159.89.123.45
export SSH_KEY=~/.ssh/id_wapsell

# Crear directorio local para scripts
mkdir -p ~/wapsell-deploy && cd ~/wapsell-deploy

# Descargar script
curl -O https://raw.githubusercontent.com/wapsell/platform/main/scripts/deployment-hetzner.sh
chmod +x deployment-hetzner.sh

# Alternativamente, si ya clonaste el repo:
# cp /path/to/OtraRondaMas/scripts/deployment-hetzner.sh ./
```

### 4.2 Ejecutar Deployment

```bash
./deployment-hetzner.sh $PROD_HOST $SSH_KEY deploy

# Este script va a:
# 1. Verificar conectividad SSH
# 2. Esperar a cloud-init
# 3. Deploy Docker Compose stack
# 4. Ejecutar migraciones DB
# 5. Setup SSL con Let's Encrypt
# 6. Health checks

# ⏱️ Duración esperada: 15-25 minutos
```

Verás output como:

```
✅ Step 1/6: Verifying SSH connectivity...
✅ Step 2/6: Waiting for cloud-init completion...
✅ Step 3/6: Deploying Docker Compose stack...
✅ Step 4/6: Running database migrations...
✅ Step 5/6: Setting up SSL certificates...
✅ Step 6/6: Running health checks...
✅ Deployment complete! 🎉
API: https://api.wapsell.com
Store: https://wapsell.com
Admin: https://admin.wapsell.com
```

### 4.3 Si Deployment Falla

**Opción 1: Ver Logs**

```bash
./deployment-hetzner.sh $PROD_HOST $SSH_KEY logs

# Verás últimas 100 líneas de logs del API
```

**Opción 2: Verificar Estado**

```bash
./deployment-hetzner.sh $PROD_HOST $SSH_KEY status

# Muestra servicios, imágenes Docker, logs recientes
```

**Opción 3: Rollback Completo**

```bash
./deployment-hetzner.sh $PROD_HOST $SSH_KEY rollback

# Deshace los cambios y restaura última versión conocida
```

---

## PASO 5: Verificar Deployment

### 5.1 Health Checks Automáticos

```bash
./deployment-hetzner.sh $PROD_HOST $SSH_KEY verify

# Output esperado:
# ✅ SSH connectivity: OK
# ✅ Docker services: 6/6 running
# ✅ Database: Connected
# ✅ Redis: Responding
# ✅ Elasticsearch: Alive
# ✅ API health: OK
# ✅ Frontend: Running
# ✅ NGINX: SSL configured
```

### 5.2 Pruebas Manuales

```bash
# API Health
curl https://api.wapsell.com/health

# Esperado: {"status":"ok"}
```

```bash
# Frontend
curl https://wapsell.com -I | grep HTTP

# Esperado: HTTP/2 200
```

```bash
# Admin Panel
curl https://admin.wapsell.com -I | grep HTTP

# Esperado: HTTP/2 200
```

### 5.3 Ver Logs en Tiempo Real

```bash
ssh -i $SSH_KEY root@$PROD_HOST "docker logs -f wapsell-api --tail 50"

# Presiona Ctrl+C para salir
```

---

## Troubleshooting Rápido

### ❌ "SSH: Connection refused"

```bash
# 1. Verifica que Hetzner muestre "Running"
# 2. Espera 2-3 minutos más (cloud-init aún se ejecuta)
# 3. Verifica la IP correcta:
ssh -i $SSH_KEY root@$PROD_HOST "uptime"
```

### ❌ "DNS not resolving"

```bash
# Espera 15-30 minutos desde que configuraste DNS
# Limpia caché DNS:
sudo dscacheutil -flushcache  # macOS
# o
sudo systemctl restart systemd-resolved  # Linux
# o
ipconfig /flushdns  # Windows
```

### ❌ "Docker services not starting"

```bash
# Ver logs de cloud-init
ssh -i $SSH_KEY root@$PROD_HOST "tail -50 /var/log/cloud-init-output.log"

# Ver logs de docker
ssh -i $SSH_KEY root@$PROD_HOST "docker logs wapsell-api 2>&1 | tail -50"
```

### ❌ "Database migration failed"

```bash
# Ver logs de migrations
ssh -i $SSH_KEY root@$PROD_HOST \
  "docker compose -f /opt/wapsell/docker-compose.wapsell.yml logs api 2>&1 | grep -i migrate"

# Reintentar migrations
ssh -i $SSH_KEY root@$PROD_HOST \
  "cd /opt/wapsell && docker compose -f docker-compose.wapsell.yml exec -T api npx prisma migrate deploy"
```

---

## Resumen de Comandos Útiles

```bash
# Variables de entorno (guarda estas líneas en ~/.bashrc)
export PROD_HOST=159.89.123.45  # Tu IP real
export SSH_KEY=~/.ssh/id_wapsell

# Conectar SSH
ssh -i $SSH_KEY root@$PROD_HOST

# Ver servicios
ssh -i $SSH_KEY root@$PROD_HOST "docker compose -f /opt/wapsell/docker-compose.wapsell.yml ps"

# Ver logs
ssh -i $SSH_KEY root@$PROD_HOST "docker logs wapsell-api -f --tail 50"

# Ejecutar script desde local
./deployment-hetzner.sh $PROD_HOST $SSH_KEY <comando>

# Comandos disponibles:
# - deploy    : Desplegar/actualizar
# - verify    : Verificar estado
# - rollback  : Deshacer cambios
# - logs      : Ver logs en tiempo real
# - status    : Estado de servicios
```

---

## Documentación Adicional

- **Deployment**: `docs/DEPLOYMENT.md`
- **Docker**: `docs/DOCKER-DEPLOY.md` 
- **Troubleshooting**: `docs/TROUBLESHOOTING.md`
- **Post-Deployment Checklist**: `docs/POST-DEPLOYMENT-CHECKLIST.md` ← Ejecuta DESPUÉS de deploy

---

## ¿Necesitas Ayuda?

Si algo falla, consulta:

1. **Logs locales**: `./deployment-hetzner.sh $PROD_HOST $SSH_KEY logs`
2. **Estado del servidor**: `./deployment-hetzner.sh $PROD_HOST $SSH_KEY status`
3. **Documentación completa**: `docs/TROUBLESHOOTING.md`

**Tiempo estimado total**: 30-45 minutos (incluyendo espera DNS)

---

**Última actualización**: 2026-10-25  
**Versión de Wapsell**: v1.0.0  
**Requisitos**: Hetzner CPX41+ VPS, Ubuntu 24.04
