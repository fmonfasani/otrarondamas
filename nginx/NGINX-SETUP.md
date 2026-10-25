# Wapsell NGINX Reverse Proxy Setup

Complete documentation for NGINX reverse proxy configuration for the Wapsell SaaS platform.

**Version**: 1.0  
**Last Updated**: 2026-10-25  
**Platform**: Linux (VPS), Docker

---

## Table of Contents

1. [Architecture](#architecture)
2. [Installation](#installation)
3. [Configuration Structure](#configuration-structure)
4. [SSL/TLS Setup](#ssltls-setup)
5. [Performance Tuning](#performance-tuning)
6. [Rate Limiting](#rate-limiting)
7. [Security Headers](#security-headers)
8. [Monitoring & Logs](#monitoring--logs)
9. [Troubleshooting](#troubleshooting)
10. [DDoS Mitigation](#ddos-mitigation)

---

## Architecture

### Domain Routing

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet (Users)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
           ┌──────────────────────────┐
           │  NGINX Reverse Proxy     │
           │  Port 80 → Port 443      │
           │  (HTTP → HTTPS Redirect) │
           └────────┬─────┬──────┬────┘
                    │     │      │
        ┌───────────┘     │      └──────────────┐
        │                 │                     │
        ▼                 ▼                     ▼
   ┌─────────┐    ┌──────────────┐    ┌──────────────┐
   │api.     │    │wapsell.com   │    │admin.wapsell │
   │wapsell  │    │www.wapsell   │    │.com          │
   │.com     │    │.com          │    │(POS Admin)   │
   │(API)    │    │(Store)       │    │              │
   └────┬────┘    └──────┬───────┘    └──────┬───────┘
        │                 │                   │
        ▼                 ▼                   ▼
   ┌──────────┐    ┌──────────┐    ┌──────────────┐
   │NestJS    │    │Tienda    │    │POS Admin     │
   │API       │    │Online    │    │React         │
   │:3000     │    │React     │    │:80           │
   │          │    │:80       │    │              │
   └──────────┘    └──────────┘    └──────────────┘
```

### Communication Flow

1. **HTTP → HTTPS Redirect**: All HTTP (port 80) requests redirect to HTTPS (port 443)
2. **Domain-Based Routing**: 
   - `api.wapsell.com` → NestJS API (port 3000)
   - `wapsell.com`, `www.wapsell.com` → React Frontend - Tienda Online (port 80)
   - `admin.wapsell.com` → React Admin Panel - POS Admin (port 80)
3. **SSL Termination**: NGINX handles all TLS encryption/decryption
4. **Backend Communication**: Internal Docker network (172.25.0.0/16)

---

## Installation

### Prerequisites

- Linux VPS (Ubuntu 20.04+, Debian 11+, or RHEL 8+)
- Docker 20.10+
- Docker Compose 2.0+
- Domain names configured (DNS A records pointing to VPS)
- Port 80 and 443 accessible from the internet

### Step 1: Deploy NGINX Container

Update `docker-compose.wapsell.yml` to include the NGINX service:

```yaml
nginx:
  build:
    context: ./nginx
  container_name: wapsell-nginx
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/conf.d:/etc/nginx/conf.d:ro
    - /data/wapsell/letsencrypt:/etc/letsencrypt
    - /data/wapsell/logs/nginx:/var/log/nginx
  depends_on:
    - api
    - tienda-online
    - pos-admin
  networks:
    - wapsell-network
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### Step 2: Start Services

```bash
# Build and start all containers
docker compose -f docker-compose.wapsell.yml up -d

# Verify NGINX is running
docker compose -f docker-compose.wapsell.yml logs nginx

# Check health
docker exec wapsell-nginx nginx -t
```

### Step 3: Configure SSL Certificates

```bash
# Make setup script executable
chmod +x nginx/setup-ssl.sh

# Run as root (or use sudo)
sudo ./nginx/setup-ssl.sh

# The script will:
# 1. Install certbot
# 2. Generate Let's Encrypt certificates
# 3. Configure auto-renewal via cron
# 4. Validate NGINX configuration
```

### Step 4: Verify Installation

```bash
# Test HTTPS connectivity
curl -v https://api.wapsell.com/health
curl -v https://wapsell.com/health
curl -v https://admin.wapsell.com/health

# Check certificate validity
openssl s_client -connect api.wapsell.com:443 -showcerts

# Verify certificate expiration dates
certbot certificates

# View renewal status
tail -f /var/log/letsencrypt/letsencrypt.log
```

---

## Configuration Structure

### File Organization

```
nginx/
├── nginx.conf                          # Main configuration
├── conf.d/
│   ├── api.wapsell.com.conf           # API domain (NestJS)
│   ├── wapsell.com.conf               # Store domain (React)
│   └── admin.wapsell.com.conf         # Admin domain (React)
├── Dockerfile                         # Container definition
├── setup-ssl.sh                       # SSL certificate setup script
├── NGINX-SETUP.md                     # This file
└── logs/                              # Log directory (created at runtime)
```

### Configuration Components

#### 1. Main Config (`nginx.conf`)

- **Worker Configuration**: Auto-detect CPU cores
- **Performance**: TCP optimization, gzip compression
- **Rate Limiting**: Zones for API, auth, and uploads
- **SSL Caching**: Session resumption optimization
- **Upstream Backends**: Load balancing groups

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=5r/s;

# Upstream backends
upstream api_backend {
    server api:3000;
}

upstream frontend_backend {
    server tienda-online:80;
}

upstream admin_backend {
    server pos-admin:80;
}
```

#### 2. API Configuration (`api.wapsell.com.conf`)

**Features**:
- SSL/TLS with Let's Encrypt
- HSTS header (30-year validity)
- Strict rate limiting on auth endpoints
- Large file upload support (100MB)
- Security headers (XSS, clickjacking, etc.)

**Rate Limits**:
- General API: 100 requests/second, burst 200
- Auth endpoints: 10 requests/second, burst 5
- Upload endpoints: 5 requests/second, burst 10

#### 3. Store Configuration (`wapsell.com.conf`)

**Features**:
- Multi-domain support (www. subdomain)
- Static asset caching (1 year for hashed files)
- SPA routing support (index.html fallback)
- API proxy for client requests

#### 4. Admin Configuration (`admin.wapsell.com.conf`)

**Features**:
- Isolated domain for administrative access
- Same caching and security policies
- API proxy for backend communication

---

## SSL/TLS Setup

### Let's Encrypt Automation

The `setup-ssl.sh` script handles certificate generation and renewal:

```bash
# Automatic one-time setup
sudo ./nginx/setup-ssl.sh

# The script configures:
# 1. Certbot installation
# 2. Certificate generation for 3 domains
# 3. Auto-renewal cron job (daily at 3:00 AM UTC)
# 4. NGINX configuration validation
```

### Manual Certificate Management

#### Generate Certificate (First Time)

```bash
certbot certonly \
  --standalone \
  -d api.wapsell.com \
  --email admin@wapsell.com \
  --agree-tos \
  --non-interactive
```

#### Renew Certificate (Manual)

```bash
certbot renew --force-renewal
```

#### Dry-Run Renewal

```bash
certbot renew --dry-run
```

#### View Certificate Details

```bash
# List all certificates
certbot certificates

# View specific certificate
openssl x509 -noout -dates -in /etc/letsencrypt/live/api.wapsell.com/fullchain.pem

# Check certificate chain
openssl x509 -noout -issuer -in /etc/letsencrypt/live/api.wapsell.com/fullchain.pem
```

### Certificate Auto-Renewal

Cron job configured at `/etc/cron.d/certbot-renewal`:

```bash
# Runs daily at 3:00 AM UTC
0 3 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

**Renewal Process**:
1. Certbot checks certificate expiration (renews if < 30 days)
2. Let's Encrypt validates domain ownership (via ACME challenge)
3. New certificate written to `/etc/letsencrypt/live/`
4. NGINX reloaded with new certificate (zero-downtime)

### Certificate Troubleshooting

#### Check Certificate Expiration

```bash
# Days until expiration
certbot certificates | grep "Expiration Date"

# Detailed check
openssl x509 -noout -dates -in /etc/letsencrypt/live/api.wapsell.com/fullchain.pem
```

#### Force Renewal

```bash
certbot renew --force-renewal --non-interactive
```

#### Verify Auto-Renewal Cron

```bash
# Check if cron job exists
cat /etc/cron.d/certbot-renewal

# Check cron logs (systemd)
journalctl -u cron --since "24 hours ago"

# Manual renewal test
certbot renew --dry-run
```

#### Common Issues

| Issue | Solution |
|-------|----------|
| `ACME challenge failed` | Ensure port 80 is accessible and DNS is configured |
| `Renewal hook failed` | Check if `systemctl reload nginx` succeeds manually |
| `Certificate not found` | Run `certbot certificates` to verify paths |

---

## Performance Tuning

### Worker Configuration

```nginx
worker_processes auto;          # Use all CPU cores
worker_connections 2048;        # Connections per worker
use epoll;                      # Efficient event model (Linux)
```

### Connection Optimization

```nginx
sendfile on;                    # Zero-copy file transmission
tcp_nopush on;                  # Coalesce packets
tcp_nodelay on;                 # Low-latency mode
keepalive_timeout 65;           # Keep-alive duration
```

### Gzip Compression

```nginx
gzip on;                        # Enable compression
gzip_comp_level 6;              # Balance (1-9, 6 is recommended)
gzip_vary on;                   # Add Vary header
gzip_proxied any;               # Compress proxied responses
gzip_types text/plain text/css application/json application/javascript;
```

**Performance Impact**:
- **Bandwidth**: ~70% reduction for text (CSS, JS, JSON)
- **CPU**: ~2-5% overhead per request
- **Tradeoff**: Enabled by default (benefits > cost)

### Proxy Buffering

```nginx
proxy_buffering on;
proxy_buffer_size 128k;         # Initial buffer
proxy_buffers 4 256k;           # Additional buffers (4 × 256KB = 1MB max)
```

### Client Upload Size

```nginx
client_max_body_size 100m;      # Maximum request body
```

---

## Rate Limiting

### Zone Configuration

**Zones** (defined in `nginx.conf`):

1. **API Zone** (`api_limit`)
   - Rate: 100 requests/second per IP
   - Burst: 200 requests
   - Use case: General API endpoints

2. **Auth Zone** (`auth_limit`)
   - Rate: 10 requests/second per IP
   - Burst: 5 requests
   - Use case: Login, signup, password reset

3. **Upload Zone** (`upload_limit`)
   - Rate: 5 requests/second per IP
   - Burst: 10 requests
   - Use case: File uploads

### Usage in Configurations

```nginx
# API endpoint
location /api/ {
    limit_req zone=api_limit burst=200 nodelay;
    proxy_pass http://api_backend;
}

# Auth endpoint (stricter)
location ~ ^/api/auth/login {
    limit_req zone=auth_limit burst=5 nodelay;
    proxy_pass http://api_backend;
}

# Upload endpoint
location ~ ^/api/assets/upload {
    limit_req zone=upload_limit burst=10 nodelay;
    proxy_pass http://api_backend;
}
```

### Rate Limit Response

When limit exceeded:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 1
```

### Adjusting Limits

To increase/decrease limits, edit `nginx.conf`:

```nginx
# Example: Increase API limit to 200 r/s
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/s;

# Then reload NGINX
nginx -s reload
```

---

## Security Headers

### Configured Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000` | Force HTTPS (30 years) |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-XSS-Protection` | `1; mode=block` | Enable XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer info |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Disable unnecessary APIs |

### Verify Headers

```bash
# Check headers on API endpoint
curl -I https://api.wapsell.com/health

# Output:
# HTTP/2 200
# strict-transport-security: max-age=31536000; includeSubDomains
# x-frame-options: SAMEORIGIN
# x-content-type-options: nosniff
# x-xss-protection: 1; mode=block
# referrer-policy: strict-origin-when-cross-origin
```

---

## Monitoring & Logs

### Log Files

**NGINX Access Logs**:
- `/var/log/nginx/access.log` - All requests
- `/var/log/nginx/access_api.log` - API requests
- `/var/log/nginx/access_tienda.log` - Store requests
- `/var/log/nginx/access_admin.log` - Admin requests

**NGINX Error Logs**:
- `/var/log/nginx/error.log` - All errors
- `/var/log/nginx/error_api.log` - API errors
- `/var/log/nginx/error_tienda.log` - Store errors
- `/var/log/nginx/error_admin.log` - Admin errors

### Log Format

```
$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent" "$http_x_forwarded_for"

Example:
203.0.113.42 - - [25/Oct/2026:14:30:45 +0000] "GET /api/products HTTP/2.0" 200 1234 "-" "Mozilla/5.0" "203.0.113.42"
```

### View Logs

```bash
# Real-time API log
tail -f /var/log/nginx/access_api.log

# Last 100 error log entries
tail -100 /var/log/nginx/error.log

# Search for specific status codes
grep " 429 " /var/log/nginx/access.log  # Rate limited
grep " 502 " /var/log/nginx/access.log  # Bad gateway

# Count requests by status
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c
```

### Monitoring Metrics

**Key Metrics to Track**:

1. **Request Rate**: Requests per second
   ```bash
   tail -f /var/log/nginx/access.log | wc -l
   ```

2. **Error Rate**: 5xx responses (backend issues)
   ```bash
   grep " [5][0-9][0-9] " /var/log/nginx/access.log | wc -l
   ```

3. **Rate Limit Hits**: 429 responses
   ```bash
   grep " 429 " /var/log/nginx/access.log | wc -l
   ```

4. **SSL/TLS Errors**: Certificate or protocol issues
   ```bash
   grep -i "ssl\|tls" /var/log/nginx/error.log
   ```

5. **Response Times**: Backend latency
   ```bash
   awk '{print $NF}' /var/log/nginx/access.log | sort -n
   ```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. SSL Certificate Not Loading

**Symptom**: `ERR_SSL_PROTOCOL_ERROR` when accessing HTTPS

**Diagnosis**:
```bash
# Check certificate files exist
ls -la /etc/letsencrypt/live/api.wapsell.com/

# Validate NGINX config
nginx -t

# Check NGINX error log
tail -50 /var/log/nginx/error.log
```

**Solution**:
```bash
# Run SSL setup script
sudo ./nginx/setup-ssl.sh

# Or manually generate certificate
sudo certbot certonly --standalone -d api.wapsell.com

# Reload NGINX
nginx -s reload
```

#### 2. 502 Bad Gateway

**Symptom**: `502 Bad Gateway` responses

**Root Causes**:
- Backend service (API, frontend) is down
- Backend is responding too slowly (timeout)
- Network connectivity issue between NGINX and backend

**Diagnosis**:
```bash
# Check if backend is running
docker compose -f docker-compose.wapsell.yml ps

# Check backend health
curl http://api:3000/health
curl http://tienda-online:80/health

# Check NGINX error log
tail -100 /var/log/nginx/error_api.log | grep upstream

# Test connectivity
docker exec wapsell-nginx curl -v http://api:3000/health
```

**Solution**:
```bash
# Restart backend service
docker compose -f docker-compose.wapsell.yml restart api

# Increase timeout if backend is slow
# Edit nginx/conf.d/api.wapsell.com.conf:
proxy_connect_timeout 120s;  # Increase from 60s
proxy_send_timeout 120s;
proxy_read_timeout 120s;

# Reload NGINX
docker exec wapsell-nginx nginx -s reload
```

#### 3. Rate Limiting Too Strict

**Symptom**: `429 Too Many Requests` under normal load

**Solution**:
```bash
# Edit nginx.conf and increase limits
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/s;  # Increase from 100r/s

# Reload NGINX
nginx -s reload

# Verify
curl -I https://api.wapsell.com/health
```

#### 4. Slow Response Times

**Diagnosis**:
```bash
# Check if gzip is working
curl -H "Accept-Encoding: gzip" -I https://api.wapsell.com/

# Check CPU/memory usage
docker stats wapsell-nginx

# Check backend response time
time curl http://api:3000/api/health
```

**Solution**:
```nginx
# Increase worker processes
worker_processes 4;  # or set specific number

# Increase buffer sizes
proxy_buffer_size 256k;
proxy_buffers 8 512k;

# Reload NGINX
nginx -s reload
```

#### 5. Certificate Renewal Failed

**Diagnosis**:
```bash
# Check if cron job is configured
cat /etc/cron.d/certbot-renewal

# Check if certbot is working
certbot renew --dry-run

# Check renewal logs
tail -f /var/log/letsencrypt/letsencrypt.log
```

**Solution**:
```bash
# Manually trigger renewal
certbot renew --force-renewal

# Reload NGINX
nginx -s reload

# Verify renewal
certbot certificates
```

---

## DDoS Mitigation

### Built-in Protections

1. **Rate Limiting**: Limits requests per IP
2. **Connection Limits**: `worker_connections 2048`
3. **Timeouts**: Prevents slow-client attacks

### Additional Strategies

#### 1. IP Blocking (Firewall)

```bash
# Block specific IPs
sudo ufw deny from 192.0.2.1
sudo ufw allow from 203.0.113.0/24

# View current rules
sudo ufw status
```

#### 2. Geo-Blocking (if needed)

```nginx
# Example: Block non-Americas traffic
geo $geo_country {
    default ZZ;
    # Add MaxMind GeoIP2 data
}

server {
    if ($geo_country = "ZZ") {
        return 444;  # Close connection
    }
}
```

#### 3. Request Size Limits

```nginx
# Already configured in nginx.conf
client_max_body_size 100m;

# Add body timeout
client_body_timeout 10s;
client_header_timeout 10s;
```

#### 4. WAF Integration (Future)

For advanced DDoS protection, consider:
- **ModSecurity**: WAF module for NGINX
- **Fail2Ban**: IP reputation service
- **CloudFlare**: CDN with DDoS protection

---

## Maintenance

### Daily Checks

```bash
# Monitor error log
tail -50 /var/log/nginx/error.log

# Check disk space
df -h /data/wapsell/

# Verify SSL certificates
certbot certificates
```

### Weekly Tasks

```bash
# Rotate logs (manual, if not using logrotate)
gzip /var/log/nginx/access.log.*

# Review rate limiting
grep " 429 " /var/log/nginx/access.log | wc -l

# Check backend health
docker compose -f docker-compose.wapsell.yml ps
```

### Monthly Tasks

```bash
# Test certificate renewal
certbot renew --dry-run

# Review security headers
curl -I https://api.wapsell.com

# Update NGINX (if needed)
docker build -t wapsell-nginx:latest ./nginx
docker compose -f docker-compose.wapsell.yml up -d nginx
```

---

## Support & References

- [NGINX Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Certbot](https://certbot.eff.org/)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [HTTP Response Codes](https://httpwg.org/specs/rfc7231.html#status.codes)

---

**Last Updated**: 2026-10-25  
**Maintained By**: Wapsell Engineering Team
