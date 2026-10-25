# NGINX Quick Reference - Common Commands

**Quick lookup for NGINX operations on Wapsell**

---

## Deployment

### Build and Start

```bash
# Navigate to project root
cd /d/Software\ Development/Porfolio/OtraRondaMas

# Build NGINX container
docker compose -f docker-compose.wapsell.yml build nginx

# Start all services (including NGINX)
docker compose -f docker-compose.wapsell.yml up -d

# Start only NGINX
docker compose -f docker-compose.wapsell.yml up -d nginx

# View startup logs
docker compose -f docker-compose.wapsell.yml logs nginx --tail=50 -f
```

### SSL Certificate Setup

```bash
# Make scripts executable
chmod +x nginx/setup-ssl.sh nginx/validate-config.sh

# Run SSL setup (generates certificates + cron job)
sudo ./nginx/setup-ssl.sh

# Validate configuration before deployment
bash ./nginx/validate-config.sh
```

---

## Testing Connectivity

### HTTP (Port 80)

```bash
# Test HTTP → HTTPS redirect
curl -v http://api.wapsell.com/health

# Should respond with:
# HTTP/1.1 301 Moved Permanently
# Location: https://api.wapsell.com/health
```

### HTTPS (Port 443)

```bash
# Test API endpoint
curl -v https://api.wapsell.com/health

# Test store frontend
curl -v https://wapsell.com/health

# Test admin panel
curl -v https://admin.wapsell.com/health

# With verbose headers
curl -I https://api.wapsell.com/health

# Expected: HTTP/2 200 OK (or HTTP/1.1 if HTTP/2 not available)
```

### Certificate Details

```bash
# View certificate dates
openssl s_client -connect api.wapsell.com:443 -showcerts < /dev/null | \
    openssl x509 -noout -dates

# Check certificate issuer
openssl s_client -connect api.wapsell.com:443 < /dev/null | \
    openssl x509 -noout -issuer

# Full certificate info
openssl s_client -connect api.wapsell.com:443 -showcerts < /dev/null

# View certificate from file
openssl x509 -noout -dates -in /etc/letsencrypt/live/api.wapsell.com/fullchain.pem
```

---

## Monitoring & Logs

### View Logs

```bash
# Real-time API access log
tail -f /var/log/nginx/access_api.log

# Real-time API error log
tail -f /var/log/nginx/error_api.log

# Last 50 lines
tail -50 /var/log/nginx/access.log

# Docker logs
docker compose -f docker-compose.wapsell.yml logs nginx -f

# Docker logs (last 100 lines)
docker logs wapsell-nginx --tail=100 -f
```

### Search Logs

```bash
# Find 429 (rate limit) responses
grep " 429 " /var/log/nginx/access.log

# Count rate limit hits
grep " 429 " /var/log/nginx/access.log | wc -l

# Find 502 (bad gateway) errors
grep " 502 " /var/log/nginx/access.log

# Find errors in error log
grep "error\|warn" /var/log/nginx/error.log

# View by hour
grep "25/Oct/2026:14:" /var/log/nginx/access.log

# Sort by response code
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn
```

### Performance Metrics

```bash
# Count requests per minute
awk '{print $4}' /var/log/nginx/access.log | cut -d: -f1-3 | sort | uniq -c | tail

# Average response size
awk '{sum+=$10; count++} END {print "Average:", sum/count, "bytes"}' /var/log/nginx/access.log

# Response time distribution (if configured)
# Note: Need to enable $upstream_response_time in log format

# Top requested endpoints
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# Top client IPs
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20
```

---

## Configuration Management

### Validate Configuration

```bash
# Quick validation script
bash nginx/validate-config.sh

# Manual validation (inside container)
docker exec wapsell-nginx nginx -t
```

### Reload Configuration

```bash
# Reload NGINX (zero-downtime)
docker exec wapsell-nginx nginx -s reload

# Or systemd (if not in Docker)
sudo systemctl reload nginx

# Verify reload worked
docker exec wapsell-nginx nginx -t
```

### Test Configuration Syntax

```bash
# Test syntax only
docker exec wapsell-nginx nginx -t

# Expected output:
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## Rate Limiting

### Monitor Rate Limiting

```bash
# Count rate limit hits (429 responses)
grep " 429 " /var/log/nginx/access.log | wc -l

# Rate limit hits per IP
grep " 429 " /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn

# Rate limit hits by endpoint
grep " 429 " /var/log/nginx/access.log | awk '{print $7}' | sort | uniq -c | sort -rn

# Real-time rate limit monitoring
tail -f /var/log/nginx/access.log | grep " 429 "
```

### Adjust Rate Limits

```bash
# Edit main configuration
vim nginx/nginx.conf

# Change limit zones:
# limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/s;  # Increase from 100r/s

# Reload NGINX
docker exec wapsell-nginx nginx -s reload

# Verify reload
docker exec wapsell-nginx nginx -t
```

---

## SSL Certificate Management

### View Certificate Status

```bash
# List all certificates
certbot certificates

# View certificate details
certbot certificates -v

# Check certificate expiration dates
certbot certificates | grep "Expiry"
```

### Renew Certificates

```bash
# Manual renewal (will only renew if < 30 days)
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Dry-run (test without making changes)
sudo certbot renew --dry-run

# Test with verbose output
sudo certbot renew --force-renewal -v
```

### View Certificate Details

```bash
# Certificate validity dates
sudo openssl x509 -noout -dates -in /etc/letsencrypt/live/api.wapsell.com/fullchain.pem

# Certificate issuer
sudo openssl x509 -noout -issuer -in /etc/letsencrypt/live/api.wapsell.com/fullchain.pem

# Full certificate info
sudo openssl x509 -text -noout -in /etc/letsencrypt/live/api.wapsell.com/fullchain.pem
```

### Add New Domain

```bash
# 1. Generate certificate
sudo certbot certonly --standalone -d newdomain.wapsell.com

# 2. Create config file
cp nginx/conf.d/api.wapsell.com.conf nginx/conf.d/newdomain.wapsell.com.conf

# 3. Update domain and paths in new config file
vim nginx/conf.d/newdomain.wapsell.com.conf

# 4. Reload NGINX
docker exec wapsell-nginx nginx -s reload

# 5. Verify
curl -v https://newdomain.wapsell.com/health
```

---

## Container Management

### View Container Status

```bash
# List running containers
docker compose -f docker-compose.wapsell.yml ps

# View NGINX container details
docker compose -f docker-compose.wapsell.yml ps nginx

# View container resource usage
docker stats wapsell-nginx

# Check container logs
docker logs wapsell-nginx --tail=20
```

### Container Operations

```bash
# Restart NGINX
docker compose -f docker-compose.wapsell.yml restart nginx

# Stop NGINX
docker compose -f docker-compose.wapsell.yml stop nginx

# Start NGINX
docker compose -f docker-compose.wapsell.yml start nginx

# Rebuild container
docker compose -f docker-compose.wapsell.yml build --no-cache nginx

# Recreate container
docker compose -f docker-compose.wapsell.yml up -d --force-recreate nginx
```

### Execute Commands in Container

```bash
# Get shell inside container
docker exec -it wapsell-nginx sh

# View NGINX processes
docker exec wapsell-nginx ps aux | grep nginx

# View network connections
docker exec wapsell-nginx netstat -an | grep LISTEN

# Test backend connectivity
docker exec wapsell-nginx curl -v http://api:3000/health
```

---

## Security Headers

### Verify Security Headers

```bash
# Check all security headers
curl -I https://api.wapsell.com/health

# Check specific header (HSTS)
curl -I https://api.wapsell.com/health | grep "Strict-Transport-Security"

# Check all headers with formatting
curl -s -I https://api.wapsell.com/health | grep -E "Strict|X-Frame|X-Content|X-XSS|Referrer|Permissions"

# Expected headers:
# strict-transport-security: max-age=31536000; includeSubDomains
# x-frame-options: SAMEORIGIN
# x-content-type-options: nosniff
# x-xss-protection: 1; mode=block
# referrer-policy: strict-origin-when-cross-origin
# permissions-policy: geolocation=(), microphone=(), camera=()
```

---

## Troubleshooting

### NGINX Won't Start

```bash
# Check configuration syntax
docker exec wapsell-nginx nginx -t

# View error logs
docker compose -f docker-compose.wapsell.yml logs nginx --tail=50

# Check if ports are in use
lsof -i :80
lsof -i :443

# Check Docker permissions
docker ps

# Verify file permissions
ls -la nginx/
ls -la nginx/conf.d/
```

### 502 Bad Gateway

```bash
# Check if backends are running
docker compose -f docker-compose.wapsell.yml ps

# Test backend connectivity
docker exec wapsell-nginx curl -v http://api:3000/health

# Check NGINX error log
tail -50 /var/log/nginx/error_api.log

# Check if backend is responding
curl -v http://localhost:3000/health  # (if exposed locally)

# Increase timeout in api.wapsell.com.conf if needed
proxy_connect_timeout 120s;
proxy_read_timeout 120s;
```

### Rate Limit Issues

```bash
# Check current limits
grep "limit_req_zone" nginx/nginx.conf

# Check how many hits we're getting
grep " 429 " /var/log/nginx/access.log | wc -l

# Increase limits if needed
# Edit nginx.conf and reload
docker exec wapsell-nginx nginx -s reload
```

### SSL Certificate Issues

```bash
# Check certificate files exist
ls -la /etc/letsencrypt/live/api.wapsell.com/

# Verify certificate is valid
openssl x509 -noout -in /etc/letsencrypt/live/api.wapsell.com/fullchain.pem

# Check certificate dates
openssl x509 -noout -dates -in /etc/letsencrypt/live/api.wapsell.com/fullchain.pem

# Check renewal history
cat /var/log/letsencrypt/letsencrypt.log | tail -50

# Force renewal if needed
sudo certbot renew --force-renewal --non-interactive
```

---

## Performance Tuning

### Monitor Performance

```bash
# CPU/Memory usage
docker stats wapsell-nginx

# Network connections
docker exec wapsell-nginx ss -an | grep ESTABLISHED | wc -l

# Request rate
tail -f /var/log/nginx/access.log | wc -l

# Average response size
awk '{sum+=$10} END {print "Average:", sum/NR, "bytes"}' /var/log/nginx/access.log
```

### Test Under Load

```bash
# Install Apache Bench (if not already)
apt-get install apache2-utils

# Run load test (1000 requests, 100 concurrent)
ab -n 1000 -c 100 https://api.wapsell.com/health

# Monitor while load testing
watch -n 1 "tail -5 /var/log/nginx/access.log"

# Check rate limit hits during load test
grep " 429 " /var/log/nginx/access.log | wc -l
```

---

## Maintenance

### Backup Certificates

```bash
# Backup Let's Encrypt directory
sudo tar -czf letsencrypt-backup-$(date +%Y%m%d).tar.gz /etc/letsencrypt/

# Backup to external location
sudo cp -r /etc/letsencrypt/ /data/wapsell/letsencrypt-backup/
```

### Rotate Logs

```bash
# Manual log rotation (if logrotate not configured)
gzip /var/log/nginx/access.log*
gzip /var/log/nginx/error.log*

# Delete old logs (> 30 days)
find /var/log/nginx -type f -name "*.gz" -mtime +30 -delete
```

### Update NGINX

```bash
# Check for updates
docker pull nginx:alpine

# Rebuild container
docker compose -f docker-compose.wapsell.yml build --pull nginx

# Deploy with zero downtime
docker compose -f docker-compose.wapsell.yml up -d nginx
```

---

## Common Endpoints

### Health Checks

```bash
# API health
curl https://api.wapsell.com/health

# Store health
curl https://wapsell.com/health

# Admin health
curl https://admin.wapsell.com/health
```

### API Examples

```bash
# Get products (with gzip)
curl -H "Accept-Encoding: gzip" https://api.wapsell.com/api/products | gunzip

# Create order (with auth)
curl -X POST https://api.wapsell.com/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items": []}'

# Upload file
curl -X POST https://api.wapsell.com/api/assets/upload \
  -F "file=@image.jpg"
```

---

## Useful Links

- NGINX Docs: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/
- Certbot: https://certbot.eff.org/
- OWASP Security Headers: https://owasp.org/www-project-secure-headers/

---

**Last Updated**: 2026-10-25  
**Project**: Wapsell Platform
