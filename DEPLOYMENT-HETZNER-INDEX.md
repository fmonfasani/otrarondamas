# Wapsell on Hetzner Cloud - Deployment Index

Complete deployment package para Wapsell en Hetzner Cloud VPS con credenciales personales.

---

## 📋 Documentación

### 1. **HETZNER-QUICK-SETUP.md** ← **EMPEZAR AQUÍ**
**Ubicación**: `docs/HETZNER-QUICK-SETUP.md`

Guía visual paso-a-paso para:
- Crear VPS en Hetzner Console
- Configurar SSH keys
- Obtener IP pública
- Configurar DNS
- Ejecutar deployment
- Verificar deployment

**Duración**: 30-45 minutos (incluyendo espera DNS)

**Cuándo leerlo**: PRIMERO, antes de hacer nada

---

### 2. **README-DEPLOYMENT.md**
**Ubicación**: `scripts/README-DEPLOYMENT.md`

Referencia rápida de scripts con:
- Uso de cada archivo
- Comandos disponibles
- Variables de entorno
- Troubleshooting rápido
- Recursos adicionales

**Cuándo leerlo**: Para entender qué hace cada script

---

### 3. **POST-DEPLOYMENT-CHECKLIST.md**
**Ubicación**: `docs/POST-DEPLOYMENT-CHECKLIST.md`

Checklist exhaustiva con 9 fases:
- Verificaciones inmediatas
- Health checks funcionales
- DNS y SSL
- Base de datos
- Monitoreo y logging
- Performance y recursos
- Seguridad
- Backup y recovery
- Validaciones finales

**Cuándo leerlo**: DESPUÉS de `./deployment-hetzner.sh deploy` completa

---

## 🛠️ Scripts Ejecutables

### 1. **deployment-hetzner.sh** (Automático)
**Ubicación**: `scripts/deployment-hetzner.sh`

Script bash que orquesta todo el deployment.

**Uso**:
```bash
./deployment-hetzner.sh <PROD_HOST> <SSH_KEY> [command]
```

**Comandos**:
- `deploy` - Desplegar (DEFAULT)
- `verify` - Verificar salud
- `rollback` - Deshacer cambios
- `logs` - Ver logs en tiempo real
- `status` - Estado de servicios

**Ejemplo**:
```bash
export PROD_HOST=159.89.123.45
export SSH_KEY=~/.ssh/id_wapsell

./deployment-hetzner.sh $PROD_HOST $SSH_KEY deploy
```

**Duración**: 15-25 minutos

---

### 2. **cloud-init-wapsell.yaml** (Cloud-Init)
**Ubicación**: `scripts/cloud-init-wapsell.yaml`

Script de inicialización que se ejecuta automáticamente en Hetzner.

**Cómo usar**:
1. Crea VPS en Hetzner Console
2. En campo "User data", copia TODO el contenido de este archivo
3. El script se ejecuta automáticamente

**Qué instala**:
- Docker + Docker Compose
- Git
- PostgreSQL, Redis, Elasticsearch (en containers)
- UFW Firewall
- Clona repositorio Wapsell

**Duración**: 3-5 minutos

---

## 📊 Flujo Completo

```
┌─────────────────────────────────────────────────────┐
│ 1. Leer HETZNER-QUICK-SETUP.md                      │
│    (Guía paso-a-paso visual)                        │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. Crear SSH Key                                    │
│    ssh-keygen -t ed25519 -f ~/.ssh/id_wapsell      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. Crear VPS en Hetzner Console                     │
│    - Seleccionar CPX41                              │
│    - Pegar SSH key                                  │
│    - Copiar cloud-init-wapsell.yaml en "User data" │
│    - Click "Create & Buy Now"                       │
│    - ESPERAR 2-3 minutos                            │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. Obtener IP Pública                               │
│    (Desde Hetzner Console)                          │
│    export PROD_HOST=159.89.123.45                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 5. Ejecutar Deployment Script                       │
│    ./deployment-hetzner.sh $PROD_HOST $SSH_KEY      │
│    DURACIÓN: 15-25 minutos                          │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 6. Ejecutar POST-DEPLOYMENT-CHECKLIST.md            │
│    Validar todas las 9 fases                        │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ ✅ PRODUCTION READY                                 │
│    Wapsell está en vivo                             │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (Resumen)

```bash
# 1. SSH Setup
ssh-keygen -t ed25519 -f ~/.ssh/id_wapsell -C "wapsell-prod"

# 2. Create VPS in Hetzner Console
#    - Select CPX41
#    - Add SSH key
#    - Paste cloud-init-wapsell.yaml in User data
#    - Wait 2-3 minutes

# 3. Variables
export PROD_HOST=159.89.123.45    # Replace with your IP
export SSH_KEY=~/.ssh/id_wapsell

# 4. Deploy
./scripts/deployment-hetzner.sh $PROD_HOST $SSH_KEY deploy

# 5. Verify
./scripts/deployment-hetzner.sh $PROD_HOST $SSH_KEY verify

# 6. Check
cat docs/POST-DEPLOYMENT-CHECKLIST.md
```

---

## 📁 File Structure

```
OtraRondaMas/
├── DEPLOYMENT-HETZNER-INDEX.md        ← Este archivo
├── docs/
│   ├── HETZNER-QUICK-SETUP.md         ← Guía paso-a-paso
│   ├── POST-DEPLOYMENT-CHECKLIST.md   ← Validaciones
│   ├── DEPLOYMENT.md                  ← Guía detallada
│   ├── DOCKER-DEPLOY.md               ← Docker Compose
│   ├── TROUBLESHOOTING.md             ← Solución problemas
│   └── ... (otros docs)
│
├── scripts/
│   ├── README-DEPLOYMENT.md           ← Referencia rápida
│   ├── deployment-hetzner.sh          ← Script principal
│   ├── cloud-init-wapsell.yaml        ← Cloud-init
│   └── ... (otros scripts)
│
└── ... (resto del proyecto)
```

---

## ✅ Pre-Requisitos

Antes de empezar necesitas:

- [ ] **Hetzner Cloud Account** (crear en https://www.hetzner.cloud)
- [ ] **SSH Key** (generar con ssh-keygen)
- [ ] **Dominio propio** (para DNS)
- [ ] **Terminal/Shell** (bash, zsh, PowerShell)
- [ ] **Git installed** (en tu máquina local)

---

## ⏱️ Tiempos Estimados

| Paso | Duración | Qué Esperar |
|------|----------|------------|
| SSH Key Setup | 5 min | Generar clave |
| Crear VPS Hetzner | 5 min | Seleccionar opciones |
| VPS Boot + Cloud-Init | 5 min | Esperar iniciación |
| Deployment Script | 20 min | Script ejecutándose |
| DNS Propagación | 15-30 min | Esperar (paralelo) |
| **TOTAL** | **30-45 min** | Deployment + DNS |

---

## 🔧 Comandos Importantes

### Durante Deployment

```bash
# Ver logs en vivo
./scripts/deployment-hetzner.sh $PROD_HOST $SSH_KEY logs

# Ver estado
./scripts/deployment-hetzner.sh $PROD_HOST $SSH_KEY status

# Verificar
./scripts/deployment-hetzner.sh $PROD_HOST $SSH_KEY verify
```

### Conectar al Servidor

```bash
ssh -i ~/.ssh/id_wapsell root@$PROD_HOST

# Una vez dentro:
docker-compose -f /opt/wapsell/docker-compose.wapsell.yml ps
docker-compose -f /opt/wapsell/docker-compose.wapsell.yml logs -f api
```

### Rollback (si es necesario)

```bash
./scripts/deployment-hetzner.sh $PROD_HOST $SSH_KEY rollback
```

---

## 🐛 Troubleshooting Rápido

### "Cannot connect to VPS"
1. Espera 2-3 minutos (cloud-init aún se ejecuta)
2. Verifica IP en Hetzner Console
3. Verifica SSH key: `ls -la ~/.ssh/id_wapsell`

### "DNS not resolving"
1. Espera 15-30 minutos desde que configuraste DNS
2. Limpia caché local: `sudo dscacheutil -flushcache` (macOS)
3. Verifica configuración en tu registrador

### "Docker services not starting"
1. Ver logs: `./scripts/deployment-hetzner.sh $PROD_HOST $SSH_KEY logs`
2. Ver diagnósticos: `ssh -i $SSH_KEY root@$PROD_HOST "docker ps"`
3. Reintentar: `./scripts/deployment-hetzner.sh $PROD_HOST $SSH_KEY deploy`

**Más detalles**: Ver `docs/TROUBLESHOOTING.md`

---

## 📚 Additional Resources

- **Hetzner Docs**: https://docs.hetzner.cloud
- **Docker Compose**: https://docs.docker.com/compose
- **Let's Encrypt (SSL)**: https://letsencrypt.org
- **Nginx**: https://nginx.org/en/docs

---

## 🎯 Success Criteria

Deployment es exitoso cuando:

- [ ] ✅ `./deployment-hetzner.sh verify` muestra todos OK
- [ ] ✅ `curl https://api.wapsell.com/health` retorna `{"status":"ok"}`
- [ ] ✅ Frontends cargan: https://wapsell.com y https://admin.wapsell.com
- [ ] ✅ POST-DEPLOYMENT-CHECKLIST completada
- [ ] ✅ No hay errores CRÍTICOS en logs

---

## 🔒 Security Notes

- SSH key (`~/.ssh/id_wapsell`) es PRIVADA - nunca la compartas
- Firewall UFW está configurado - solo puertos 22, 80, 443 abiertos
- Base de datos usa contraseña fuerte - almacenada en .env (no en repo)
- SSL/TLS habilitado para HTTPS
- Backups configurados automáticamente

---

## 📞 Support & Help

Si algo falla:

1. **Consulta logs**: `./scripts/deployment-hetzner.sh $PROD_HOST $SSH_KEY logs`
2. **Lee guía**: `docs/TROUBLESHOOTING.md`
3. **Ver estado**: `./scripts/deployment-hetzner.sh $PROD_HOST $SSH_KEY status`

---

## 📝 Version Info

- **Package Version**: 1.0.0
- **Created**: 2026-10-25
- **For**: Wapsell v1.0.0
- **Tested On**: Hetzner Cloud, Ubuntu 24.04 LTS

---

## 🎓 Learning Path

Si quieres entender más:

1. **Principiante**: Leer HETZNER-QUICK-SETUP.md
2. **Intermedio**: Leer scripts/README-DEPLOYMENT.md
3. **Avanzado**: Leer docs/DEPLOYMENT.md + docs/DOCKER-DEPLOY.md
4. **Expert**: Revisar scripts y Dockerfiles

---

## 🚦 Status Dashboard

```
Setup SSH Key          ✅ Read this first
Create VPS             ✅ Follow HETZNER-QUICK-SETUP.md
Deploy Script          ✅ Run deployment-hetzner.sh
Verify                 ✅ Check POST-DEPLOYMENT-CHECKLIST.md
Production Ready       ✅ You're done!
```

---

## 💡 Pro Tips

1. **Guarda tu SSH key**: `cp ~/.ssh/id_wapsell ~/Dropbox/backups/` (si usas cloud storage)
2. **Automatiza variables**: Agrega a `~/.bashrc`:
   ```bash
   export PROD_HOST=159.89.123.45
   export SSH_KEY=~/.ssh/id_wapsell
   ```
3. **Crea alias**: 
   ```bash
   alias deploy-wapsell='./scripts/deployment-hetzner.sh $PROD_HOST $SSH_KEY deploy'
   alias verify-wapsell='./scripts/deployment-hetzner.sh $PROD_HOST $SSH_KEY verify'
   ```

---

**¡Listo para empezar?** 🚀

**Paso 1**: Lee `docs/HETZNER-QUICK-SETUP.md`  
**Paso 2**: Sigue las instrucciones paso-a-paso  
**Paso 3**: Ejecuta deployment script  
**Paso 4**: Verifica con checklist  

---

**Última actualización**: 2026-10-25  
**Versión**: 1.0.0  
**Co-Authored-By**: Claude Haiku 4.5 <noreply@anthropic.com>
