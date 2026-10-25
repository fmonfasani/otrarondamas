# Wapsell NGINX Reverse Proxy

Professional-grade NGINX reverse proxy configuration for the Wapsell SaaS platform.

**Status**: Production Ready  
**Version**: 1.0  
**Last Updated**: 2026-10-25

---

## Quick Start

### 1. Build and Start NGINX

```bash
# From the project root directory
docker compose -f docker-compose.wapsell.yml up -d nginx

# Verify NGINX is running
docker compose -f docker-compose.wapsell.yml logs nginx

# Check health
curl http://localhost/health
```

### 2. Configure SSL Certificates

```bash
# Make the setup script executable
chmod +x nginx/setup-ssl.sh

# Run the SSL setup script (requires sudo)
sudo ./nginx/setup-ssl.sh

# This will:
# - Install certbot
# - Generate Let's Encrypt certificates for all domains
# - Setup auto-renewal cron job
# - Validate NGINX configuration
```

### 3. Verify Deployment

```bash
# Test HTTPS connectivity
curl -v https://api.wapsell.com/health
curl -v https://wapsell.com/health
curl -v https://admin.wapsell.com/health

# Check certificate status
certbot certificates

# View NGINX status
docker compose -f docker-compose.wapsell.yml ps nginx
```

---

## Directory Structure

```
nginx/
├── nginx.conf                          # Main NGINX configuration
│   - Worker processes & performance tuning
│   - Gzip compression settings
│   - Rate limiting zones
│   - Upstream backend definitions
│   - HTTP → HTTPS redirect
│
├── conf.d/
│   ├── api.wapsell.com.conf           # API domain configuration
│   │   - SSL/TLS with Let's Encrypt
│   │   - Rate limiting (100 r/s general, 10 r/s auth)
│   │   - Large file upload support (100MB)
│   │   - Security headers (HSTS, XSS, etc.)
│   │
│   ├── wapsell.com.conf               # Store frontend configuration
│   │   - Multi-domain support (www subdomain)
│   │   - Static asset caching (1 year)
│   │   - SPA routing support
│   │
│   └── admin.wapsell.com.conf         # Admin panel configuration
│       - Isolated domain for administrators
│       - Same caching & security policies
│
├── Dockerfile                          # Container definition
│   - Based on nginx:alpine
│   - Includes certbot for SSL setup
│   - Self-signed certificate stubs for initial startup
│
├── setup-ssl.sh                        # SSL certificate setup script
│   - Installs certbot
│   - Generates Let's Encrypt certificates
│   - Configures auto-renewal via cron
│   - Validates NGINX configuration
│
├── NGINX-SETUP.md                      # Complete technical documentation
│   - Architecture overview
│   - Performance tuning guide
│   - Security headers explanation
│   - Rate limiting configuration
│   - Troubleshooting guide
│   - Monitoring & logs
│
└── README.md                           # This file
    - Quick start guide
    - Configuration overview
    - Common operations
```

---

## Key Features

### SSL/TLS Security
- ✅ Let's Encrypt integration with automatic renewal
- ✅ TLS 1.2+ only (no deprecated protocols)
- ✅ Modern cipher suite (HIGH:!aNULL:!MD5)
- ✅ HSTS header (30-year validity)
- ✅ Automatic certificate expiration monitoring

### Performance
- ✅ Gzip compression (70% bandwidth reduction)
- ✅ HTTP/2 multiplexing
- ✅ Connection pooling & keep-alive
- ✅ Static asset caching (1 year for hashed files)
- ✅ Proxy buffering & optimization

### Rate Limiting
- ✅ General API: 100 requests/second per IP
- ✅ Auth endpoints: 10 requests/second per IP
- ✅ Upload endpoints: 5 requests/second per IP
- ✅ Configurable burst allowances

### Security Headers
- ✅ X-Frame-Options (SAMEORIGIN)
- ✅ X-Content-Type-Options (nosniff)
- ✅ X-XSS-Protection (enabled)
- ✅ Referrer-Policy (strict-origin-when-cross-origin)
- ✅ Permissions-Policy (geolocation, microphone, camera disabled)
- ✅ CORS headers (configurable)

### Monitoring & Logging
- ✅ Separate access logs per domain
- ✅ Structured error logging
- ✅ JSON log format
- ✅ Rate limit monitoring
- ✅ Health check endpoints

---

## Configuration Reference

### Main Config (`nginx.conf`)

**Worker Settings**:
```nginx
worker_processes auto;          # Auto-detect CPU cores
worker_connections 2048;        # Max connections per worker
use epoll;                      # Linux event model
```

**Performance**:
```nginx
sendfile on;                    # Zero-copy file transmission
tcp_nopush on;                  # Coalesce packets
tcp_nodelay on;                 # Low-latency mode
```

**Gzip Compression**:
```nginx
gzip on;
gzip_comp_level 6;              # Compression level (1-9)
gzip_types text/plain text/css application/json application/javascript;
```

**Rate Limiting**:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=5r/s;
```

### Domain Configurations

Each domain has its own configuration file:

- `api.wapsell.com.conf` → NestJS API on port 3000
- `wapsell.com.conf` → React Store Frontend on port 80
- `admin.wapsell.com.conf` → React Admin Panel on port 80

All domains share:
- SSL/TLS with Let's Encrypt
- Security headers
- Rate limiting
- Logging

---

## Common Operations

### View Logs

```bash
# Real-time API log
tail -f /var/log/nginx/access_api.log

# Error log
tail -50 /var/log/nginx/error.log

# Search for rate-limited requests (429)
grep " 429 " /var/log/nginx/access.log

# Count requests by status code
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c
```

### Monitor Performance

```bash
# Check NGINX process
ps aux | grep nginx

# View worker statistics
docker exec wapsell-nginx ps aux | grep nginx

# Check memory usage
docker stats wapsell-nginx

# View connection count
ss -an | grep ESTABLISHED | wc -l
```

### Update Rate Limits

```bash
# Edit nginx.conf
vim nginx/nginx.conf

# Change rate limit, e.g.:
# limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/s;

# Reload NGINX (zero-downtime)
docker exec wapsell-nginx nginx -s reload

# Verify reload
docker exec wapsell-nginx nginx -t
```

### Renew SSL Certificates

```bash
# Auto-renewal (runs daily via cron)
# Manual renewal
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Check expiration dates
sudo certbot certificates
```

### Add a New Domain

1. Create new config file: `nginx/conf.d/new-domain.conf`
2. Copy template from existing domain config
3. Update server_name, upstreams, and SSL paths
4. Reload NGINX:
   ```bash
   docker exec wapsell-nginx nginx -s reload
   ```
5. Generate SSL certificate:
   ```bash
   sudo certbot certonly --standalone -d new-domain.com
   ```

---

## Troubleshooting

### NGINX won't start

```bash
# Check configuration
docker exec wapsell-nginx nginx -t

# View logs
docker compose -f docker-compose.wapsell.yml logs nginx --tail=50

# Common issues:
# 1. Port 80/443 already in use
# 2. SSL certificate files missing
# 3. YAML syntax error in docker-compose.yml
```

### 502 Bad Gateway

```bash
# Verify backend is running
docker compose -f docker-compose.wapsell.yml ps

# Test backend connectivity
docker exec wapsell-nginx curl -v http://api:3000/health

# Check NGINX error log
tail -50 /var/log/nginx/error.log

# Increase proxy timeout if backend is slow
# Edit nginx/conf.d/api.wapsell.com.conf:
proxy_connect_timeout 120s;
proxy_read_timeout 120s;
nginx -s reload
```

### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -noout -dates -in /etc/letsencrypt/live/api.wapsell.com/fullchain.pem

# Check certificate chain
openssl x509 -noout -issuer -in /etc/letsencrypt/live/api.wapsell.com/fullchain.pem

# Verify certificate file permissions
ls -la /etc/letsencrypt/live/api.wapsell.com/

# Regenerate if needed
sudo certbot certonly --standalone -d api.wapsell.com --force-renewal
```

### Too Many 429 Errors

The 429 status code means rate limit exceeded. If you're seeing too many:

```bash
# Check rate limit logs
grep " 429 " /var/log/nginx/access.log | wc -l

# Increase rate limits in nginx.conf
# Edit limit_req_zone directives to higher values
# Reload: nginx -s reload

# Or implement client-side request throttling
```

---

## Security Considerations

### Network Isolation
- NGINX communicates with backends via Docker internal network (172.25.0.0/16)
- Backends are NOT exposed on public ports
- Only NGINX is exposed to the internet (ports 80, 443)

### File Permissions
- NGINX config files are mounted read-only
- Log files are created with restricted permissions
- SSL certificates are mounted from host filesystem

### Rate Limiting
- Protects against brute-force attacks (auth endpoints)
- Prevents accidental DoS from misbehaving clients
- Configurable per endpoint

### Security Headers
- HSTS forces HTTPS for 30 years
- XSS Protection enabled
- Clickjacking protection (X-Frame-Options)
- MIME-type sniffing prevention

---

## Production Checklist

- [ ] SSL certificates generated via Let's Encrypt
- [ ] Auto-renewal cron job configured
- [ ] Rate limits adjusted for your traffic
- [ ] Domain DNS records pointing to NGINX IP
- [ ] Firewall configured (ports 80, 443 open)
- [ ] Log rotation configured
- [ ] Backup strategy for `/data/wapsell/letsencrypt`
- [ ] Monitoring alerts for certificate expiration
- [ ] Monitoring alerts for 5xx errors
- [ ] Monitoring alerts for rate limit hits (429)

---

## Documentation

For detailed information, see:

- **[NGINX-SETUP.md](./NGINX-SETUP.md)** - Complete technical documentation
  - Architecture overview
  - SSL/TLS setup
  - Performance tuning
  - Troubleshooting
  - DDoS mitigation

---

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review [NGINX-SETUP.md](./NGINX-SETUP.md) for detailed information
3. Check NGINX error logs: `/var/log/nginx/error.log`
4. Check docker logs: `docker compose logs nginx`

---

**Project**: Wapsell Platform  
**Maintained By**: Engineering Team  
**Last Updated**: 2026-10-25
