# Post-Deployment Verification Checklist

Ejecuta esta checklist DESPUÉS de completar `./deployment-hetzner.sh deploy`.

**Tiempo estimado**: 10-15 minutos  
**Prerequisito**: Deployment completado exitosamente

---

## FASE 1: Verificaciones Inmediatas (Primeros 5 Minutos)

Cuando el deployment termina, ejecuta inmediatamente:

```bash
export PROD_HOST=<tu-ip>
export SSH_KEY=~/.ssh/id_wapsell

./deployment-hetzner.sh $PROD_HOST $SSH_KEY verify
```

### Checklist Fase 1

- [ ] **SSH conecta correctamente**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "echo ✅ OK"
  ```
  - Esperado: `✅ OK`

- [ ] **Docker services corriendo (6/6)**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml ps"
  ```
  - Todos los containers en estado `running` (✓)
  - Ninguno en `exited` (✗)
  - Containers esperados:
    - [ ] postgres (database)
    - [ ] redis (cache)
    - [ ] elasticsearch (search)
    - [ ] api (nestjs)
    - [ ] frontend (react store)
    - [ ] admin (react admin panel)

- [ ] **Sin errores críticos en logs**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "docker logs wapsell-api | grep -i error | head -5"
  ```
  - Esperado: Pocos o ningún error
  - Si hay errores: Toma nota del mensaje

- [ ] **Base de datos conectada**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST \
    "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml \
    exec -T postgres psql -U wapsell_user -d wapsell_prod -c 'SELECT 1'"
  ```
  - Esperado: `1` (número simple)

---

## FASE 2: Health Checks Funcionales (5-15 Minutos)

### Checklist Fase 2

- [ ] **API Health Endpoint**
  ```bash
  curl https://api.wapsell.com/health
  ```
  - Esperado: `{"status":"ok"}` o similar
  - Si falla: Espera 2 minutos y reintentar (DNS puede estar en propagación)

- [ ] **Frontend (Store) Carga**
  ```bash
  curl https://wapsell.com -I
  ```
  - Esperado: `HTTP/2 200` o `HTTP/1.1 200`
  - Checks adicionales:
    - [ ] Página tiene content (no error)
    - [ ] Redirección HTTP → HTTPS funciona

- [ ] **Admin Panel Accesible**
  ```bash
  curl https://admin.wapsell.com -I
  ```
  - Esperado: `HTTP/2 200` o `HTTP/1.1 200`

- [ ] **Base de datos conectada (verificación completa)**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST \
    "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml \
    exec -T postgres psql -U wapsell_user -d wapsell_prod -c '\\dt' | head -10"
  ```
  - Esperado: Lista de tablas (>10 tablas)
  - Ejemplo:
    ```
    public | empresa | table
    public | usuarios | table
    public | productos | table
    ...
    ```

- [ ] **Redis respondiendo**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST \
    "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml \
    exec -T redis redis-cli ping"
  ```
  - Esperado: `PONG`

- [ ] **Elasticsearch activo**
  ```bash
  curl http://$PROD_HOST:9200/_cluster/health
  ```
  - Esperado: JSON con `"status":"yellow"` o `"status":"green"`
  - Ejemplo:
    ```json
    {"cluster_name":"elasticsearch","status":"yellow","...}
    ```

---

## FASE 3: DNS y SSL (15-30 Minutos)

### Checklist Fase 3

- [ ] **DNS resuelve correctamente**
  ```bash
  nslookup api.wapsell.com
  ```
  - Esperado: 
    ```
    Non-authoritative answer:
    Name: api.wapsell.com
    Address: 159.89.123.45  (tu IP)
    ```
  - Si no resuelve: Espera 15-30 minutos desde que configuraste DNS
  - Limpiar caché DNS:
    ```bash
    # macOS
    sudo dscacheutil -flushcache
    
    # Linux
    sudo systemctl restart systemd-resolved
    
    # Windows
    ipconfig /flushdns
    ```

- [ ] **HTTPS válido (certificado SSL)**
  ```bash
  curl -vI https://api.wapsell.com 2>&1 | grep "SSL certificate"
  ```
  - Esperado: Certificado válido (sin advertencias)
  - Ejemplo:
    ```
    * SSL certificate problem: self signed certificate
    ```
  - Si falta certificado: Ver **Troubleshooting** abajo

- [ ] **Certificado no expirado**
  ```bash
  echo | openssl s_client -servername api.wapsell.com -connect api.wapsell.com:443 2>/dev/null | openssl x509 -noout -dates
  ```
  - Esperado:
    ```
    notBefore=Oct 25 12:34:56 2026 GMT
    notAfter=Oct 25 12:34:56 2027 GMT
    ```

- [ ] **HTTP redirige a HTTPS**
  ```bash
  curl -I http://wapsell.com | grep -E "HTTP|Location"
  ```
  - Esperado:
    ```
    HTTP/1.1 301 Moved Permanently
    Location: https://wapsell.com/
    ```

---

## FASE 4: Verificaciones de Base de Datos

### Checklist Fase 4

- [ ] **Migraciones completadas**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST \
    "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml \
    exec -T api npx prisma migrate status"
  ```
  - Esperado: `All migrations have been applied`

- [ ] **Datos de seed existen**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST \
    "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml \
    exec -T postgres psql -U wapsell_user -d wapsell_prod \
    -c 'SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \"public\"'"
  ```
  - Esperado: `table_count` >= 15

- [ ] **Permisos de base de datos correctos**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST \
    "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml \
    exec -T postgres psql -U wapsell_user -d wapsell_prod -c '\\du'"
  ```
  - Esperado: Usuario `wapsell_user` con permisos adecuados

---

## FASE 5: Monitoreo y Logging

### Checklist Fase 5

- [ ] **No hay errores CRÍTICOS en logs (últimas 5 minutos)**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST \
    "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml \
    logs --since 5m api 2>&1 | grep -i 'error\|fatal\|exception' || echo 'No critical errors'"
  ```
  - Esperado: Pocos o ningún error
  - Notas: Warnings son normales, errors pueden ser esperados

- [ ] **Logs son accesibles**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST \
    "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml \
    logs --tail 20 api 2>&1 | head -10"
  ```
  - Esperado: Últimas 20 líneas de logs sin truncar

- [ ] **Estructura de directorios de logs**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "ls -la /data/wapsell/logs/"
  ```
  - Esperado:
    ```
    drwxr-xr-x api/
    ```

---

## FASE 6: Performance y Recursos

### Checklist Fase 6

- [ ] **Espacio en disco adecuado (>50% libre)**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "df -h / | tail -1"
  ```
  - Esperado:
    ```
    /dev/mapper/root  240G   45G  195G  19% /
    ```
  - Mínimo requerido: 50GB libres

- [ ] **Memoria no agotada (>2GB libre)**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "free -h | grep Mem"
  ```
  - Esperado:
    ```
    Mem:        31Gi  6.2Gi  24Gi  20%  ...
    ```

- [ ] **Respuesta de API rápida (<200ms)**
  ```bash
  time curl https://api.wapsell.com/health
  ```
  - Esperado: real time < 200ms
  - Ejemplo:
    ```
    real    0m0.142s
    user    0m0.023s
    sys     0m0.019s
    ```

- [ ] **Frontend carga rápido (<2s)**
  ```bash
  curl -w "Total time: %{time_total}s\n" https://wapsell.com -o /dev/null -s
  ```
  - Esperado: Total time < 2 segundos

---

## FASE 7: Seguridad

### Checklist Fase 7

- [ ] **Firewall UFW habilitado y configurado**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "ufw status"
  ```
  - Esperado:
    ```
    Status: active
    To                         Action      From
    --                         ------      ----
    22/tcp                     ALLOW       Anywhere
    80/tcp                     ALLOW       Anywhere
    443/tcp                    ALLOW       Anywhere
    ```

- [ ] **Solo puertos necesarios abiertos**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "ufw status numbered"
  ```
  - Puertos abiertos: 22 (SSH), 80 (HTTP), 443 (HTTPS)
  - Otros puertos: BLOCKED

- [ ] **SSH password auth deshabilitado**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "grep PasswordAuthentication /etc/ssh/sshd_config"
  ```
  - Esperado: `PasswordAuthentication no`

- [ ] **Root login vía SSH deshabilitado**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "grep PermitRootLogin /etc/ssh/sshd_config"
  ```
  - Esperado: `PermitRootLogin prohibit-password` o `no`

- [ ] **No hay archivos sensibles expuestos**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST \
    "find /opt/wapsell -name '*.env' -o -name '*.key' | head -5"
  ```
  - Esperado: Ningún archivo sensible (.env, .key) en el repo

---

## FASE 8: Backup y Recovery

### Checklist Fase 8

- [ ] **Script de backup existe**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "ls -la /opt/wapsell/scripts/backup.sh"
  ```
  - Esperado: Archivo ejecutable (755)

- [ ] **Directorio de backups existe**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "ls -la /opt/wapsell/backups/ 2>/dev/null || mkdir -p /opt/wapsell/backups && echo 'Created'"
  ```
  - Esperado: Directorio presente y accesible

- [ ] **Ejecutar backup prueba**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "bash /opt/wapsell/scripts/backup.sh --dry-run"
  ```
  - Esperado: Sin errores

- [ ] **Verificar que backup se puede restaurar**
  ```bash
  ssh -i $SSH_KEY root@$PROD_HOST "ls -lh /opt/wapsell/backups/"
  ```
  - Esperado: Archivo backup reciente (últimas 24h)

---

## FASE 9: Validaciones Finales

### Checklist Fase 9

**[ ] TODAS las checklist anteriores PASADAS** ✅

Si no pasó alguna, ve a **Troubleshooting** abajo.

---

## Resumen Final

```
[ ] Fase 1: Verificaciones Inmediatas      ✅
[ ] Fase 2: Health Checks                  ✅
[ ] Fase 3: DNS y SSL                      ✅
[ ] Fase 4: Base de Datos                  ✅
[ ] Fase 5: Monitoreo y Logging            ✅
[ ] Fase 6: Performance y Recursos         ✅
[ ] Fase 7: Seguridad                      ✅
[ ] Fase 8: Backup y Recovery              ✅
```

**Deployment Status**: ✅ **READY FOR PRODUCTION**

---

## Troubleshooting Rápido

### ❌ "DNS not resolving"

```bash
# 1. Verifica que DNS está configurado en tu registrador
# 2. Espera 15-30 minutos desde configuración
# 3. Limpia caché DNS local:
sudo dscacheutil -flushcache  # macOS

# 4. Verifica que Hetzner tiene la IP correcta:
ssh -i $SSH_KEY root@$PROD_HOST "hostname -I"

# 5. Prueba DNS directo al servidor:
dig @8.8.8.8 api.wapsell.com +short
```

### ❌ "SSL certificate missing or invalid"

```bash
# 1. Verificar certificados en el servidor
ssh -i $SSH_KEY root@$PROD_HOST "ls -la /etc/letsencrypt/live/"

# 2. Si no existen, generar con certbot
ssh -i $SSH_KEY root@$PROD_HOST \
  "certbot certonly --standalone -d api.wapsell.com -d wapsell.com -d admin.wapsell.com"

# 3. Configurar renovación automática
ssh -i $SSH_KEY root@$PROD_HOST \
  "systemctl enable certbot-renew.timer && systemctl start certbot-renew.timer"
```

### ❌ "API not responding to health check"

```bash
# 1. Ver logs
./deployment-hetzner.sh $PROD_HOST $SSH_KEY logs

# 2. Esperar a que API inicie (puede tomar 30-60 segundos)
sleep 60
curl https://api.wapsell.com/health

# 3. Si aún falla, reiniciar API
ssh -i $SSH_KEY root@$PROD_HOST \
  "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml restart api"
```

### ❌ "Database migrations failed"

```bash
# 1. Ver logs de migrations
ssh -i $SSH_KEY root@$PROD_HOST \
  "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml logs api | grep -i migrate"

# 2. Reintentar migrations
ssh -i $SSH_KEY root@$PROD_HOST \
  "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml exec -T api npx prisma migrate deploy"

# 3. Si aún falla, ver base de datos directamente
ssh -i $SSH_KEY root@$PROD_HOST \
  "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml exec -T postgres psql -U wapsell_user -d wapsell_prod -c '\\d'"
```

### ❌ "Disk space running out"

```bash
# 1. Ver usage
ssh -i $SSH_KEY root@$PROD_HOST "df -h /"

# 2. Limpiar logs viejos
ssh -i $SSH_KEY root@$PROD_HOST \
  "docker-compose -f /opt/wapsell/docker-compose.wapsell.yml logs --tail 100 >/dev/null"

# 3. Ver si hay imágenes viejas
ssh -i $SSH_KEY root@$PROD_HOST "docker images"

# 4. Limpiar si es necesario
ssh -i $SSH_KEY root@$PROD_HOST "docker system prune -a"  # ⚠️ Cuidado: borra imágenes viejas
```

---

## Información de Contacto

Si necesitas ayuda:

1. **Logs**: Revisa `./deployment-hetzner.sh $PROD_HOST $SSH_KEY logs`
2. **Estado**: Ejecuta `./deployment-hetzner.sh $PROD_HOST $SSH_KEY status`
3. **Documentación**: Lee `docs/TROUBLESHOOTING.md`

---

**Checklist completada por**: _________________  
**Fecha**: _________________  
**Hora de deployment**: _________________  
**Status**: ✅ PRODUCTION READY / ❌ ISSUES FOUND

---

**Última actualización**: 2026-10-25  
**Versión de Wapsell**: v1.0.0
