# Wapsell Deployment Scripts

Scripts automatizados para desplegar Wapsell en Hetzner Cloud VPS.

---

## Archivos en este Directorio

### 1. `deployment-hetzner.sh` (Script Principal)

Script bash que orquesta todo el deployment automáticamente.

**Uso**:
```bash
./deployment-hetzner.sh <PROD_HOST> <SSH_KEY_PATH> [command]
```

**Comandos disponibles**:
- `deploy` - Desplegar/actualizar la plataforma (DEFAULT)
- `verify` - Verificar salud del deployment
- `rollback` - Deshacer cambios
- `logs` - Ver logs en tiempo real
- `status` - Estado de servicios

**Ejemplo**:
```bash
export PROD_HOST=159.89.123.45
export SSH_KEY=~/.ssh/id_wapsell

# Deploy
./deployment-hetzner.sh $PROD_HOST $SSH_KEY deploy

# Verificar
./deployment-hetzner.sh $PROD_HOST $SSH_KEY verify

# Ver logs
./deployment-hetzner.sh $PROD_HOST $SSH_KEY logs
```

**Características**:
- Valida conectividad SSH
- Espera a que cloud-init termine
- Deploy Docker Compose automático
- Migraciones de base de datos
- Setup SSL/TLS
- Health checks finales

**Duración**: 15-25 minutos

---

### 2. `cloud-init-wapsell.yaml`

Script de inicialización cloud que se ejecuta automáticamente en el servidor Hetzner.

**Cómo usar**:
1. Ve a Hetzner Console
2. Crea nuevo VPS
3. En el campo "User data", copia todo el contenido de este archivo
4. El script se ejecutará automáticamente

**Qué hace**:
- Instala Docker y Docker Compose
- Clona el repositorio de Wapsell
- Configura firewall UFW
- Crea directorios de datos (/data/wapsell)
- Configura daemon de Docker
- Crea scripts de diagnóstico

**Duración**: 3-5 minutos

---

## Guía Rápida de Deployment

### Paso 1: Preparar SSH

```bash
# Generar clave SSH (si no tienes)
ssh-keygen -t ed25519 -f ~/.ssh/id_wapsell -C "wapsell-prod"

# Copiar clave pública
cat ~/.ssh/id_wapsell.pub
```

### Paso 2: Crear VPS en Hetzner

1. Accede a https://console.hetzner.cloud
2. Crea nuevo servidor:
   - **Name**: wapsell-prod
   - **Type**: CPX41 (8 vCPU, 32GB RAM)
   - **Image**: Ubuntu 24.04
   - **SSH Key**: Pega la clave pública
   - **User Data**: Copia contenido de `cloud-init-wapsell.yaml`
3. Click "Create & Buy Now"
4. Espera 2-3 minutos

### Paso 3: Obtener IP y Conectar

```bash
# Copia la IP pública de Hetzner Console
export PROD_HOST=159.89.123.45  # Reemplaza con tu IP
export SSH_KEY=~/.ssh/id_wapsell

# Prueba conectividad
ssh -i $SSH_KEY root@$PROD_HOST "uptime"
```

### Paso 4: Ejecutar Deployment

```bash
# Deploy
./deployment-hetzner.sh $PROD_HOST $SSH_KEY deploy

# Duración esperada: 15-25 minutos
```

### Paso 5: Verificar

```bash
# Verificar estado
./deployment-hetzner.sh $PROD_HOST $SSH_KEY verify

# Ver logs
./deployment-hetzner.sh $PROD_HOST $SSH_KEY logs
```

---

## Estructura del Proyecto

```
scripts/
├── README-DEPLOYMENT.md           ← Este archivo
├── deployment-hetzner.sh          ← Script principal
├── cloud-init-wapsell.yaml        ← Cloud-init
├── monitoring.sh                  ← Monitoreo
└── analyze-ci-metrics.sh          ← Análisis CI

docs/
├── HETZNER-QUICK-SETUP.md         ← Guía visual paso-a-paso
├── POST-DEPLOYMENT-CHECKLIST.md   ← Validaciones post-deploy
├── DEPLOYMENT.md                  ← Guía detallada
├── DOCKER-DEPLOY.md               ← Docker Compose
└── TROUBLESHOOTING.md             ← Solución de problemas
```

---

## Comandos Útiles para SSH

```bash
# Conectar al servidor
ssh -i $SSH_KEY root@$PROD_HOST

# Ver servicios en ejecución
ssh -i $SSH_KEY root@$PROD_HOST \
  "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml ps"

# Ver logs
ssh -i $SSH_KEY root@$PROD_HOST \
  "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml logs -f api"

# Reiniciar servicios
ssh -i $SSH_KEY root@$PROD_HOST \
  "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml restart"

# Ver espacio en disco
ssh -i $SSH_KEY root@$PROD_HOST "df -h /"

# Ver memoria
ssh -i $SSH_KEY root@$PROD_HOST "free -h"
```

---

## Troubleshooting Rápido

### Error: "Permission denied (publickey)"

```bash
# Verificar permisos SSH
ls -la ~/.ssh/id_wapsell

# Permisos correctos: -rw------- (600)
chmod 600 ~/.ssh/id_wapsell
```

### Error: "Connection refused"

```bash
# VPS aún iniciándose
# 1. Espera 2-3 minutos
# 2. Verifica que es la IP correcta
# 3. Verifica Hetzner Console ("Running")

# Probar después de esperar
ssh -i $SSH_KEY root@$PROD_HOST "echo OK"
```

### Error: "cloud-init still running"

El script espera a que cloud-init complete. Puede tomar hasta 5 minutos. Es normal.

### Docker services no inician

```bash
# Ver logs de cloud-init
ssh -i $SSH_KEY root@$PROD_HOST "tail -50 /var/log/cloud-init-output.log"

# Ver logs de docker
ssh -i $SSH_KEY root@$PROD_HOST "docker logs wapsell-api"

# Reintentar deployment
./deployment-hetzner.sh $PROD_HOST $SSH_KEY deploy
```

---

## Verificar Deployment Manual

Si prefieres verificar manualmente en lugar de usar el script:

```bash
# 1. Conectar
ssh -i $SSH_KEY root@$PROD_HOST

# 2. Ver servicios
docker-compose -f /opt/wapsell/docker-compose.wapsell.yml ps

# 3. Ver logs
docker-compose -f /opt/wapsell/docker-compose.wapsell.yml logs -f api

# 4. Probar API
curl http://localhost:3000/health

# 5. Probar base de datos
docker-compose -f /opt/wapsell/docker-compose.wapsell.yml \
  exec -T postgres psql -U wapsell_user -d wapsell_prod -c "SELECT 1"
```

---

## Comandos de Mantenimiento

### Ver estado general

```bash
./deployment-hetzner.sh $PROD_HOST $SSH_KEY status
```

### Ver logs en tiempo real

```bash
./deployment-hetzner.sh $PROD_HOST $SSH_KEY logs
```

### Actualizar deployment

```bash
./deployment-hetzner.sh $PROD_HOST $SSH_KEY deploy
```

### Deshacer cambios

```bash
./deployment-hetzner.sh $PROD_HOST $SSH_KEY rollback
```

---

## Variables de Entorno Recomendadas

Agrega a tu `~/.bashrc` o `~/.zshrc`:

```bash
# Wapsell Deployment
export PROD_HOST=159.89.123.45    # Tu IP de Hetzner
export SSH_KEY=~/.ssh/id_wapsell
export WAPSELL_HOME=~/wapsell-deploy

# Alias útiles
alias deploy-wapsell='cd $WAPSELL_HOME && ./deployment-hetzner.sh $PROD_HOST $SSH_KEY deploy'
alias verify-wapsell='cd $WAPSELL_HOME && ./deployment-hetzner.sh $PROD_HOST $SSH_KEY verify'
alias logs-wapsell='cd $WAPSELL_HOME && ./deployment-hetzner.sh $PROD_HOST $SSH_KEY logs'
alias status-wapsell='cd $WAPSELL_HOME && ./deployment-hetzner.sh $PROD_HOST $SSH_KEY status'
```

Luego puedes ejecutar:
```bash
verify-wapsell
logs-wapsell
```

---

## Monitoreo Continuo

Para monitoreo en tiempo real:

```bash
# Terminal 1: Ver logs
./deployment-hetzner.sh $PROD_HOST $SSH_KEY logs

# Terminal 2: Ver estado
watch -n 5 "ssh -i $SSH_KEY root@$PROD_HOST \
  'docker-compose -f /opt/wapsell/docker-compose.wapsell.yml ps'"
```

---

## Rollback de Emergencia

Si algo falla después del deployment:

```bash
./deployment-hetzner.sh $PROD_HOST $SSH_KEY rollback

# Esto:
# 1. Detiene servicios
# 2. Restaura código a rama main
# 3. Reinicia servicios
# 4. Verifica salud
```

---

## Post-Deployment

Después de deployment exitoso:

1. **Ejecutar verificaciones**:
   ```bash
   ./deployment-hetzner.sh $PROD_HOST $SSH_KEY verify
   ```

2. **Revisar checklist**:
   ```bash
   # Leer: docs/POST-DEPLOYMENT-CHECKLIST.md
   # Seguir todas las validaciones
   ```

3. **Configurar DNS** (si no lo hiciste):
   - A Record: @ → tu IP
   - CNAME Records: api, admin, www → tu dominio

4. **Configurar SSL** (si falta):
   ```bash
   ssh -i $SSH_KEY root@$PROD_HOST \
     "certbot certonly --standalone -d api.wapsell.com -d wapsell.com"
   ```

---

## Recursos Adicionales

- **Guía Visual**: `docs/HETZNER-QUICK-SETUP.md`
- **Checklist Post-Deploy**: `docs/POST-DEPLOYMENT-CHECKLIST.md`
- **Docker Compose**: `docs/DOCKER-DEPLOY.md`
- **Troubleshooting**: `docs/TROUBLESHOOTING.md`
- **Deployment Completo**: `docs/DEPLOYMENT.md`

---

## Soporte y Debugging

### Si deployment falla

```bash
# 1. Ver logs
./deployment-hetzner.sh $PROD_HOST $SSH_KEY logs

# 2. Ver estado del servidor
ssh -i $SSH_KEY root@$PROD_HOST "uname -a && docker --version && docker-compose --version"

# 3. Ver logs de cloud-init
ssh -i $SSH_KEY root@$PROD_HOST "tail -100 /var/log/cloud-init-output.log"

# 4. Intentar nuevamente (after fixing issue)
./deployment-hetzner.sh $PROD_HOST $SSH_KEY deploy
```

### SSH Troubleshooting

```bash
# Aumentar verbosidad SSH
ssh -v -i $SSH_KEY root@$PROD_HOST "echo OK"

# Test específico de puerto
ssh -vvv -p 22 -i $SSH_KEY root@$PROD_HOST "echo OK"

# Ver si clave es válida
ssh-keygen -l -f ~/.ssh/id_wapsell
```

---

## Configuración Recomendada de VPS

| Recurso | Mínimo | Recomendado | Premium |
|---------|--------|-------------|---------|
| CPU | 2 vCPU | 4 vCPU | 8 vCPU (CPX41) |
| RAM | 4 GB | 8 GB | 32 GB |
| Disco | 50 GB | 100 GB | 240 GB |
| Tipo Hetzner | CPX21 | CPX31 | CPX41 |

**Recomendación**: CPX41 para producción estable

---

**Última actualización**: 2026-10-25  
**Versión de Wapsell**: v1.0.0  
**Mantenedor**: Engineering Team

---

## Quick Reference

```bash
# Setup
export PROD_HOST=159.89.123.45
export SSH_KEY=~/.ssh/id_wapsell

# Deploy
./deployment-hetzner.sh $PROD_HOST $SSH_KEY deploy

# Verify
./deployment-hetzner.sh $PROD_HOST $SSH_KEY verify

# View Logs
./deployment-hetzner.sh $PROD_HOST $SSH_KEY logs

# Status
./deployment-hetzner.sh $PROD_HOST $SSH_KEY status

# Rollback
./deployment-hetzner.sh $PROD_HOST $SSH_KEY rollback
```
