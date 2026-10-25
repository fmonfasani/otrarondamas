# Troubleshooting Guide

Solutions for common issues encountered during development and production.

## Table of Contents

1. [API Server Issues](#api-server-issues)
2. [Database Issues](#database-issues)
3. [Authentication & Authorization](#authentication--authorization)
4. [Payment Processing](#payment-processing)
5. [Performance Issues](#performance-issues)
6. [Deployment Issues](#deployment-issues)
7. [WebSocket Issues](#websocket-issues)

## API Server Issues

### Container Won't Start

**Symptom**: `docker logs wapsell-api` shows error on startup

**Diagnosis**:
```bash
# Check container logs
docker logs wapsell-api --tail 50

# Check if port is in use
lsof -i :3000

# Verify image exists
docker images | grep wapsell
```

**Solutions**:

1. **Missing Environment Variables**
   ```bash
   # Check .env file exists
   cat apps/api/.env.local
   
   # Verify DATABASE_URL is set
   echo $DATABASE_URL
   
   # If missing, copy template
   cp apps/api/.env.example apps/api/.env.local
   ```

2. **Port Already in Use**
   ```bash
   # Find process using port 3000
   lsof -i :3000
   
   # Kill process or use different port
   PORT=3001 npm run dev
   ```

3. **Docker Build Failed**
   ```bash
   # Rebuild image
   docker-compose build --no-cache api
   docker-compose up -d api
   
   # Check build logs
   docker build -f apps/api/Dockerfile .
   ```

4. **Memory Issues**
   ```bash
   # Increase Node.js heap
   NODE_OPTIONS="--max-old-space-size=4096" npm run dev
   
   # Check available memory
   free -h
   ```

### High CPU Usage

**Symptom**: API consuming 100% CPU

**Diagnosis**:
```bash
# Monitor CPU usage
docker stats wapsell-api

# Check top processes inside container
docker exec wapsell-api top -b -n 1

# Check if queries are slow
docker logs wapsell-api | grep "slow query"
```

**Solutions**:

1. **Database Query Optimization**
   ```bash
   # Enable query logging
   export LOG_LEVEL=debug
   npm run dev
   
   # Look for N+1 queries in logs
   # Use Prisma include/select to batch queries
   ```

2. **Event Loop Blocking**
   ```bash
   # Profile application
   npm install --save-dev 0x
   npx 0x npm start
   # Open 0x report in browser
   ```

3. **Memory Leak**
   ```bash
   # Check heap usage over time
   docker stats wapsell-api
   
   # Restart container if memory growing
   docker restart wapsell-api
   ```

### API Returns 500 Error

**Symptom**: Random endpoints returning Internal Server Error

**Diagnosis**:
```bash
# Check API logs for error details
docker logs wapsell-api --since 5m

# Check application log files
tail -f logs/app.log

# Monitor in real-time
docker logs wapsell-api -f
```

**Solutions**:

1. **Check Database Connection**
   ```bash
   # Verify database is accessible
   docker-compose exec api npx prisma db execute --stdin <<< "SELECT 1;"
   
   # Check connection pool
   psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
   ```

2. **Review Error Context**
   ```bash
   # Check request ID from response headers
   curl -v https://api.wapsell.com/api/endpoint 2>&1 | grep -i request
   
   # Search logs for request ID
   grep "req-id-123" logs/app.log
   ```

3. **Check External Services**
   ```bash
   # Verify Stripe connection
   curl -u sk_test_xxx: https://api.stripe.com/v1/charges
   
   # Verify SendGrid connection
   curl -X GET "https://api.sendgrid.com/v3/user/account" \
     -H "Authorization: Bearer SG_xxx"
   ```

## Database Issues

### Database Connection Refused

**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Diagnosis**:
```bash
# Check if PostgreSQL is running
docker-compose ps db

# Try to connect directly
docker-compose exec db psql -U user -d otrarondamas -c "SELECT 1;"

# Check logs
docker logs wapsell-db
```

**Solutions**:

1. **Start Database Service**
   ```bash
   # Start database
   docker-compose up -d db
   
   # Wait for health check to pass
   docker-compose exec db pg_isready -U user
   
   # Verify connection
   psql $DATABASE_URL -c "SELECT version();"
   ```

2. **Check Environment Variables**
   ```bash
   # Verify DATABASE_URL format
   echo $DATABASE_URL
   # Should be: postgresql://user:password@localhost:5500/otrarondamas
   
   # Check port mapping
   docker-compose ps db
   # Should show 5500->5432
   ```

3. **Reset Database Connection**
   ```bash
   # Stop all containers
   docker-compose down
   
   # Remove volume to reset database
   docker volume rm otrarondamas_db_data
   
   # Restart
   docker-compose up -d
   
   # Re-run migrations
   npm run db:migrate
   npm run db:seed
   ```

### Migration Errors

**Symptom**: `Error: Migration name already exists in the migration history`

**Diagnosis**:
```bash
# Check migration history
docker-compose exec api npx prisma migrate status

# Check migrations directory
ls apps/api/prisma/migrations/
```

**Solutions**:

1. **For New Migrations**
   ```bash
   # Check if migration was applied
   npx prisma migrate status
   
   # Mark as applied if only schema changed
   npx prisma migrate resolve --applied 20261025_fix_issue
   
   # Or create new migration with different name
   npx prisma migrate dev --name fix_issue_v2
   ```

2. **Recover from Failed Migration**
   ```bash
   # Check what failed
   npx prisma migrate status
   
   # Rollback migration
   npx prisma migrate resolve --rolled-back 20261025_failed_migration
   
   # Fix schema.prisma
   # Then apply again
   npx prisma migrate deploy
   ```

3. **Reset Database (Development Only)**
   ```bash
   # WARNING: This deletes all data!
   npx prisma migrate reset
   
   # Re-apply migrations and seed
   npm run db:seed
   ```

### Slow Queries

**Symptom**: Database queries taking > 1 second

**Diagnosis**:
```bash
# Enable slow query log (PostgreSQL)
docker-compose exec db psql -U user -d otrarondamas -c \
  "ALTER SYSTEM SET log_min_duration_statement = 1000;"

# Restart database to apply
docker-compose restart db

# Check slow logs
docker logs wapsell-db | grep duration
```

**Solutions**:

1. **Add Database Indexes**
   ```sql
   -- Check table sizes
   SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
   FROM pg_tables
   WHERE tablename NOT LIKE 'pg_%'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   
   -- Create index on frequently queried columns
   CREATE INDEX idx_venta_empresa_date ON venta(empresaId, createdAt DESC);
   CREATE INDEX idx_usuario_email ON usuario(email);
   ```

2. **Optimize Queries**
   ```typescript
   // Bad: N+1 query
   const ventas = await prisma.venta.findMany();
   for (const venta of ventas) {
     venta.cliente = await prisma.cliente.findUnique({
       where: { id: venta.clienteId }
     });
   }
   
   // Good: Single query with include
   const ventas = await prisma.venta.findMany({
     include: { cliente: true }
   });
   ```

3. **Use Connection Pooling**
   ```bash
   # Configure in .env
   DATABASE_POOL_SIZE=20
   DATABASE_IDLE_TIMEOUT=30
   ```

## Authentication & Authorization

### JWT Token Expired

**Symptom**: `401 Unauthorized - Token expired`

**Solution**:
```bash
# Token expires after 1 hour
# Get new token from login endpoint
curl -X POST https://api.wapsell.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use refresh endpoint
curl -X POST https://api.wapsell.com/api/auth/refresh \
  -H "Authorization: Bearer <expired-token>"
```

### Invalid or Malformed Token

**Symptom**: `401 Unauthorized - Invalid token`

**Diagnosis**:
```bash
# Verify token format
echo $TOKEN
# Should start with "eyJ"

# Check token payload (don't expose to untrusted parties)
jwt decode $TOKEN
```

**Solutions**:

1. **Clear Cached Credentials**
   ```bash
   # Browser localStorage
   localStorage.removeItem('accessToken');
   
   # Cookies
   document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
   ```

2. **Re-authenticate**
   ```bash
   # Call login endpoint with correct credentials
   curl -X POST https://api.wapsell.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"correct@email.com","password":"correct-password"}'
   ```

### Permission Denied (403)

**Symptom**: `403 Forbidden - Insufficient permissions`

**Diagnosis**:
```bash
# Check user roles
curl -H "Authorization: Bearer $TOKEN" \
  https://api.wapsell.com/api/auth/me

# Expected response includes roles array
# { ..., roles: ["vendedor", "admin"], permissions: [...] }
```

**Solutions**:

1. **Verify User Has Required Role**
   ```bash
   # Admin needs 'admin' or 'gerente' role
   # To check: GET /api/auth/me
   
   # If role missing, contact system admin
   ```

2. **Check Permission Matrix**
   ```bash
   # List required permissions
   # GET /api/authorizations/my-permissions
   
   # Should include endpoints you're trying to access
   ```

## Payment Processing

### Stripe Webhook Not Triggering

**Symptom**: `POST /api/pagos/webhooks/stripe` not receiving events

**Diagnosis**:
```bash
# Check webhook configuration
curl -u sk_test_xxx: https://api.stripe.com/v1/webhook_endpoints

# Verify endpoint is enabled
# Look for event types: charge.succeeded, charge.failed

# Check Stripe dashboard webhook logs
# https://dashboard.stripe.com/webhooks
```

**Solutions**:

1. **Update Webhook URL**
   ```bash
   # Get webhook endpoint ID
   curl -u sk_test_xxx: https://api.stripe.com/v1/webhook_endpoints
   
   # Update endpoint
   curl -u sk_test_xxx: https://api.stripe.com/v1/webhook_endpoints/{id} \
     -d url="https://api.wapsell.com/api/pagos/webhooks/stripe"
   ```

2. **Verify Webhook Signature**
   ```bash
   # Check that Stripe secret is correctly set
   echo $STRIPE_WEBHOOK_SECRET
   
   # Verify in application logs that signature validates
   docker logs wapsell-api | grep "webhook signature"
   ```

### Payment Charge Declined

**Symptom**: `Payment declined - card declined`

**Solutions**:

1. **Use Test Cards**
   ```
   Test Cards (Stripe):
   - Success: 4242 4242 4242 4242
   - Decline: 4000 0000 0000 0002
   - Insufficient Funds: 4000 0000 0000 9995
   ```

2. **Check Stripe API Key**
   ```bash
   # Verify using live key in production
   echo $STRIPE_SECRET_KEY
   # Should start with sk_live_ in production
   
   # In development use sk_test_
   ```

### MercadoPago Integration Failing

**Symptom**: 401 Unauthorized from MercadoPago

**Solutions**:

1. **Verify Access Token**
   ```bash
   # Check token is set
   echo $MERCADOPAGO_ACCESS_TOKEN
   
   # Verify token is valid (not expired)
   # MP tokens expire after certain period
   ```

2. **Check API Endpoint**
   ```bash
   # Use sandbox for testing
   https://api.sandbox.mercadopago.com
   
   # Use production endpoint when live
   https://api.mercadopago.com
   ```

## Performance Issues

### High Memory Usage

**Symptom**: Container using > 1GB RAM, OOMKilled

**Diagnosis**:
```bash
# Monitor memory
docker stats wapsell-api --no-stream

# Check Node.js heap
docker exec wapsell-api node -e "console.log(Math.round(require('v8').getHeapStatistics().total_heap_size / 1024 / 1024) + 'MB')"

# Find memory leaks
npm install --save-dev clinic
clinic doctor -- npm start
```

**Solutions**:

1. **Increase Container Memory Limit**
   ```yaml
   # In docker-compose.yml
   api:
     deploy:
       resources:
         limits:
           memory: 2G
   ```

2. **Enable Garbage Collection**
   ```bash
   # Set Node.js flags
   NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"
   npm run dev
   ```

3. **Optimize Cache Strategy**
   ```typescript
   // Clear cache periodically
   setInterval(() => {
     redis.flushdb();
   }, 1000 * 60 * 60); // Every hour
   ```

### Slow API Responses

**Symptom**: API endpoints taking > 1 second

**Diagnosis**:
```bash
# Measure response time
curl -w "@curl-format.txt" -o /dev/null -s https://api.wapsell.com/api/productos

# Check API logs for slow operations
docker logs wapsell-api | grep duration

# Monitor application metrics
curl https://api.wapsell.com/metrics
```

**Solutions**:

1. **Enable Caching**
   ```typescript
   // Cache product list
   @Get('/productos')
   @Cacheable('productos', 3600) // 1 hour
   async getProducts() {
     return this.prisma.producto.findMany();
   }
   ```

2. **Paginate Large Queries**
   ```bash
   # Instead of: GET /api/produtos (all items)
   # Use: GET /api/produtos?page=1&limit=20
   ```

3. **Add Database Indexes**
   ```bash
   # See Database Issues section above
   ```

## Deployment Issues

### NGINX Returns 502 Bad Gateway

**Symptom**: `502 Bad Gateway` from NGINX

**Diagnosis**:
```bash
# Check if API is running
docker ps | grep api

# Check NGINX logs
docker logs wapsell-nginx

# Try to connect to API directly
curl http://localhost:3000/health
```

**Solutions**:

1. **Restart API Container**
   ```bash
   docker-compose restart api
   docker-compose logs -f api
   ```

2. **Check NGINX Configuration**
   ```bash
   # Validate config
   docker exec wapsell-nginx nginx -t
   
   # Reload with new config
   docker exec wapsell-nginx nginx -s reload
   ```

3. **Increase Timeout**
   ```nginx
   # In nginx.conf
   proxy_connect_timeout 60s;
   proxy_send_timeout 60s;
   proxy_read_timeout 60s;
   ```

### SSL Certificate Expired

**Symptom**: `SSL: CERTIFICATE_VERIFY_FAILED`

**Diagnosis**:
```bash
# Check certificate expiry
certbot certificates

# Check in browser
# https://api.wapsell.com (error about certificate)
```

**Solutions**:

1. **Renew Certificate**
   ```bash
   certbot renew --force-renewal
   
   # Verify renewal
   certbot certificates
   
   # Reload NGINX
   docker exec wapsell-nginx nginx -s reload
   ```

2. **Check Auto-Renewal**
   ```bash
   # Ensure certbot timer is running
   systemctl status certbot.timer
   
   # Manual test
   certbot renew --dry-run
   ```

### Docker Image Pull Fails

**Symptom**: `Error response from daemon: pull access denied`

**Diagnosis**:
```bash
# Check Docker Hub credentials
cat ~/.docker/config.json

# Verify image exists
docker search wapsell-api
```

**Solutions**:

1. **Login to Docker Hub**
   ```bash
   docker login
   # Enter username and password/token
   ```

2. **Build Locally**
   ```bash
   docker-compose build api
   docker-compose up api
   ```

## WebSocket Issues

### WebSocket Connection Fails

**Symptom**: WebSocket connection refused or fails

**Diagnosis**:
```bash
# Check if Socket.io is running
curl https://api.wapsell.com/socket.io/?EIO=4&transport=polling

# Check logs for WebSocket errors
docker logs wapsell-api | grep socket
```

**Solutions**:

1. **Enable WebSocket in NGINX**
   ```nginx
   # Ensure this is in nginx.conf
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   ```

2. **Check CORS Configuration**
   ```bash
   # Verify CORS_ORIGIN includes WebSocket origin
   echo $CORS_ORIGIN
   # Should include: https://wapsell.com
   ```

### WebSocket Messages Not Received

**Symptom**: Events published but clients don't receive

**Diagnosis**:
```bash
# Check if Redis is working
docker-compose exec redis redis-cli ping
# Should return PONG

# Check Socket.io adapter
docker logs wapsell-api | grep adapter
```

**Solutions**:

1. **Verify Redis Connection**
   ```bash
   # Test Redis
   redis-cli ping
   
   # Check configuration
   echo $REDIS_URL
   ```

2. **Check Event Emission**
   ```typescript
   // Verify event is being emitted
   this.io.to('room').emit('event', data);
   
   // Check logs
   console.log('Emitting event', data);
   ```

## General Troubleshooting Steps

1. **Collect Information**
   ```bash
   # Get system info
   uname -a
   docker --version
   docker-compose --version
   
   # Get application state
   docker ps
   docker logs <container-name> --tail 50
   ```

2. **Check Recent Changes**
   ```bash
   git log --oneline -10
   git diff HEAD~1
   ```

3. **Review Logs**
   ```bash
   # Application logs
   docker logs wapsell-api -f
   
   # System logs
   journalctl -u docker -n 50
   ```

4. **Restart Services**
   ```bash
   # Restart specific service
   docker-compose restart api
   
   # Restart everything
   docker-compose down
   docker-compose up -d
   ```

5. **Check Resource Usage**
   ```bash
   docker stats
   df -h
   free -h
   ```

## Getting Help

If issues persist:

1. **Check Documentation**
   - API-REFERENCE.md - API usage
   - ARCHITECTURE.md - System design
   - DEPLOYMENT.md - Production setup

2. **Search Issues**
   - GitHub Issues: https://github.com/fmonfasani/otrarondamas/issues
   - Known bugs and workarounds

3. **Contact Support**
   - Email: support@wapsell.com
   - Include: error message, logs, environment details

4. **Debug Mode**
   ```bash
   # Enable debug logging
   LOG_LEVEL=debug npm run dev
   
   # Increase verbosity
   DEBUG=* npm run dev
   ```
