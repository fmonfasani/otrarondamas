# Production Deployment Guide

Complete step-by-step guide for deploying Wapsell to production on Hetzner Cloud VPS.

## Prerequisites

- Hetzner Cloud account with API access
- Domain names configured (api.wapsell.com, wapsell.com, etc.)
- Docker Hub account for image registry
- GitHub repository with read access
- SSL certificate provider (Let's Encrypt via certbot)
- Email account for notifications (SendGrid, Gmail, etc.)
- Payment processor accounts (Stripe, MercadoPago)

## Architecture Overview

```
┌─────────────────────────────────────────┐
│      Hetzner Cloud Infrastructure      │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  NGINX (Reverse Proxy + SSL)    │  │
│  │  Port: 443 (HTTPS), 80 (HTTP)   │  │
│  └────────────┬─────────────────────┘  │
│               │                        │
│  ┌────────────▼────────────────────┐  │
│  │  NestJS API Container           │  │
│  │  Port: 3000 (internal)          │  │
│  └────────────┬─────────────────────┘  │
│               │                        │
│  ┌────────────▼──┬──────────┬────────┐ │
│  │               │          │        │ │
│  ▼               ▼          ▼        ▼ │
│ PostgreSQL    Redis      Elasticsearch│
│ (Port 5432)  (Port 6379) (Port 9200) │
│               │                        │
│  ┌────────────▼──────────────────────┐│
│  │  Volumes (persistent storage)     ││
│  │  - db_data (PostgreSQL)           ││
│  │  - redis_data (Redis)             ││
│  │  - es_data (Elasticsearch)        ││
│  └──────────────────────────────────┘│
│                                       │
└───────────────────────────────────────┘
           │
    External Services:
    - Stripe (payments)
    - MercadoPago (payments)
    - SendGrid (email)
    - S3/CDN (assets)
```

## Step 1: VPS Provisioning

### 1.1 Create Hetzner VPS

Using Hetzner Cloud Console:
1. Go to https://console.hetzner.cloud
2. Create new server
3. Select **Image**: Ubuntu 24.04
4. Select **Type**: cx31 (8GB RAM, 2vCPU, 80GB SSD) - minimum for production
5. Select **Location**: Your closest region
6. Add SSH key
7. Create server

Or using `hcloud` CLI:

```bash
hcloud server create \
  --name wapsell-prod \
  --type cx31 \
  --image ubuntu-24.04 \
  --ssh-key "$(hcloud ssh-key list -o format=ID)"
```

### 1.2 Note VPS IP Address

```bash
# Get VPS details
hcloud server describe wapsell-prod
# Record the IP address (e.g., 95.217.xxx.xxx)
```

### 1.3 SSH Configuration

Add to `~/.ssh/config`:
```
Host wapsell-prod
  HostName 95.217.xxx.xxx
  User root
  IdentityFile ~/.ssh/id_rsa
  StrictHostKeyChecking accept-new
```

Test connection:
```bash
ssh wapsell-prod
```

## Step 2: VPS Initial Setup

### 2.1 Update System

```bash
apt-get update
apt-get upgrade -y
apt-get install -y curl wget git gnupg2 lsb-release apt-transport-https ca-certificates
```

### 2.2 Install Docker & Docker Compose

```bash
# Add Docker repository
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
docker-compose --version

# Start Docker
systemctl start docker
systemctl enable docker
systemctl status docker
```

### 2.3 Configure Firewall

```bash
# Enable UFW firewall
ufw enable

# Allow SSH (CRITICAL - do this first!)
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow SSH from Hetzner (if using Hetzner access)
# ufw allow from 88.198.160.0/19

# Check status
ufw status
```

### 2.4 Configure Hostname & Timezone

```bash
# Set hostname
hostnamectl set-hostname wapsell-prod

# Set timezone to UTC
timedatectl set-timezone UTC
timedatectl status

# Add to /etc/hosts
echo "95.217.xxx.xxx wapsell-prod api.wapsell.com" >> /etc/hosts
```

## Step 3: Clone Repository & Setup

### 3.1 Clone Repository

```bash
cd /opt
git clone --depth 1 https://github.com/fmonfasani/otrarondamas.git wapsell
cd wapsell
```

### 3.2 Create Production Environment File

```bash
cp apps/api/.env.example apps/api/.env.production
nano apps/api/.env.production
```

Configure with production values:

```bash
# Database
DATABASE_URL="postgresql://wapsell_user:SecurePassword123!@localhost:5432/wapsell_prod"

# JWT
JWT_SECRET="generate-long-random-string-here"
JWT_EXPIRES_IN=3600

# Redis
REDIS_URL="redis://localhost:6379"

# Elasticsearch
ELASTICSEARCH_URL="http://localhost:9200"

# Email (SendGrid)
SENDGRID_API_KEY="SG.xxx"
SENDGRID_FROM_EMAIL="noreply@wapsell.com"

# SMS (Twilio or similar)
TWILIO_ACCOUNT_SID="ACxxx"
TWILIO_AUTH_TOKEN="xxx"
TWILIO_PHONE_NUMBER="+1234567890"

# Stripe
STRIPE_SECRET_KEY="sk_live_xxx"
STRIPE_PUBLIC_KEY="pk_live_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN="APP_USR-xxx"
MERCADOPAGO_PUBLIC_KEY="APP_USR_xxx"

# AWS/S3 for CDN assets
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="xxx"
AWS_SECRET_ACCESS_KEY="xxx"
AWS_S3_BUCKET="wapsell-production"
AWS_S3_ENDPOINT="https://s3.amazonaws.com"

# Application
NODE_ENV="production"
LOG_LEVEL="info"
CORS_ORIGIN="https://wapsell.com,https://api.wapsell.com"

# Monitoring
SENTRY_DSN="https://xxx@sentry.io/xxx"
```

### 3.3 Create Docker Compose Override

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    environment:
      POSTGRES_USER: wapsell_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wapsell_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: wapsell-api:latest
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://wapsell_user:${DB_PASSWORD}@db:5432/wapsell_prod
      REDIS_URL: redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:latest
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./static:/usr/share/nginx/html:ro
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  pg_data:
  redis_data:
  es_data:
```

## Step 4: SSL/TLS Certificates

### 4.1 Install Certbot

```bash
apt-get install -y certbot python3-certbot-nginx
```

### 4.2 Obtain Certificates

```bash
# Obtain certificates for domains
certbot certonly --standalone \
  -d api.wapsell.com \
  -d wapsell.com \
  --email admin@wapsell.com \
  --agree-tos \
  --non-interactive

# Verify certificates
ls -la /etc/letsencrypt/live/api.wapsell.com/

# Copy to accessible location
mkdir -p /opt/wapsell/ssl
cp /etc/letsencrypt/live/api.wapsell.com/fullchain.pem /opt/wapsell/ssl/
cp /etc/letsencrypt/live/api.wapsell.com/privkey.pem /opt/wapsell/ssl/
chmod 644 /opt/wapsell/ssl/*
```

### 4.3 Setup Auto-Renewal

```bash
# Test renewal
certbot renew --dry-run

# Create systemd timer for auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer
systemctl status certbot.timer
```

## Step 5: Docker Compose Configuration

### 5.1 Create NGINX Configuration

File: `/opt/wapsell/nginx.conf`

```nginx
upstream api {
  server api:3000;
}

server {
  listen 80;
  server_name api.wapsell.com wapsell.com;
  
  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.wapsell.com;

  ssl_certificate /etc/nginx/ssl/fullchain.pem;
  ssl_certificate_key /etc/nginx/ssl/privkey.pem;
  
  # SSL Configuration
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;

  # Security Headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-XSS-Protection "1; mode=block" always;

  # Logging
  access_log /var/log/nginx/api_access.log;
  error_log /var/log/nginx/api_error.log;

  # Health check endpoint
  location /health {
    access_log off;
    proxy_pass http://api;
  }

  # API routes
  location / {
    proxy_pass http://api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }
}

server {
  listen 443 ssl http2;
  server_name wapsell.com;

  ssl_certificate /etc/nginx/ssl/fullchain.pem;
  ssl_certificate_key /etc/nginx/ssl/privkey.pem;

  # Frontend serving
  root /usr/share/nginx/html;
  index index.html;

  # React routing: all non-file requests go to index.html
  location / {
    try_files $uri /index.html;
  }

  # Caching for static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
  }
}
```

### 5.2 Start Services

```bash
cd /opt/wapsell

# Build Docker images (if needed)
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

## Step 6: Database Initialization

### 6.1 Run Migrations

```bash
# Wait for database to be ready
docker-compose -f docker-compose.prod.yml exec -it api npx prisma db push

# Run initial migrations
docker-compose -f docker-compose.prod.yml exec -it api npm run prisma:migrate

# Seed initial data (optional)
docker-compose -f docker-compose.prod.yml exec -it api npm run db:seed
```

### 6.2 Verify Database

```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec db psql -U wapsell_user -d wapsell_prod

# Check tables
\dt

# Exit
\q
```

## Step 7: Verify Deployment

### 7.1 Health Checks

```bash
# Check API health
curl -k https://api.wapsell.com/health

# Check frontend
curl -k https://wapsell.com/

# Check Docker containers
docker ps

# Check logs
docker logs wapsell-api
docker logs wapsell-nginx
```

### 7.2 Database Connectivity

```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec api npx prisma studio

# Or run a simple query
docker-compose -f docker-compose.prod.yml exec db psql -U wapsell_user -d wapsell_prod -c "SELECT 1 AS health_check;"
```

## Step 8: Backup & Disaster Recovery

### 8.1 Setup Automated Backups

Create `/opt/wapsell/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
POSTGRES_CONTAINER="wapsell-db-1"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec $POSTGRES_CONTAINER pg_dump -U wapsell_user wapsell_prod | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup volumes (if using external storage)
tar -czf $BACKUP_DIR/volumes_$DATE.tar.gz /var/lib/docker/volumes/

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://wapsell-backups/prod/

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

Make executable and setup cron:

```bash
chmod +x /opt/wapsell/backup.sh

# Add to crontab (daily at 2 AM UTC)
echo "0 2 * * * /opt/wapsell/backup.sh >> /var/log/wapsell-backup.log 2>&1" | crontab -
```

### 8.2 Restore from Backup

```bash
# List available backups
ls -la /backups/

# Restore database
gzip -d < /backups/db_20261025_020000.sql.gz | \
  docker exec -i wapsell-db-1 psql -U wapsell_user wapsell_prod

# Verify restoration
docker-compose -f docker-compose.prod.yml exec db psql -U wapsell_user -d wapsell_prod -c "SELECT COUNT(*) FROM venta;"
```

## Step 9: CI/CD Pipeline Setup

### 9.1 GitHub Secrets

Add to GitHub repository settings:

```
SSH_PRIVATE_KEY = <private-key-content>
SSH_HOST = 95.217.xxx.xxx
SSH_USER = root
DOCKER_USERNAME = <hub-username>
DOCKER_PASSWORD = <hub-token>
PRODUCTION_ENV = <.env.production-content>
```

### 9.2 GitHub Actions Workflow

File: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: |
          docker build -t wapsell-api:latest -f apps/api/Dockerfile .
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push wapsell-api:latest
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/wapsell
            echo "${{ secrets.PRODUCTION_ENV }}" > apps/api/.env.production
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d
            docker-compose -f docker-compose.prod.yml exec -T api npm run db:migrate
            docker-compose -f docker-compose.prod.yml logs -f --tail=20
```

## Step 10: Monitoring & Logging

### 10.1 Setup Log Rotation

File: `/etc/logrotate.d/wapsell`

```
/var/log/wapsell-*.log {
  daily
  rotate 14
  compress
  delaycompress
  notifempty
  create 0640 root root
  sharedscripts
  postrotate
    systemctl reload docker > /dev/null 2>&1 || true
  endscript
}
```

### 10.2 Monitor Containers

```bash
# Watch container stats
watch docker stats

# View logs in real-time
docker-compose -f docker-compose.prod.yml logs -f

# Check disk usage
df -h
docker system df
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs wapsell-api

# Check resource limits
docker stats

# Restart service
docker-compose -f docker-compose.prod.yml restart api
```

### Database Connection Failed

```bash
# Verify PostgreSQL is running
docker-compose -f docker-compose.prod.yml ps db

# Test connection
docker-compose -f docker-compose.prod.yml exec db psql -U wapsell_user -c "SELECT 1;"

# Check logs
docker logs wapsell-db-1
```

### SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Renew manually
certbot renew --force-renewal

# Verify NGINX configuration
docker exec wapsell-nginx-1 nginx -t

# Reload NGINX
docker exec wapsell-nginx-1 nginx -s reload
```

## Rollback Procedure

If deployment fails:

```bash
cd /opt/wapsell

# Stop current containers
docker-compose -f docker-compose.prod.yml down

# Checkout previous version
git checkout <previous-commit>

# Start with old version
docker-compose -f docker-compose.prod.yml up -d

# Verify
curl https://api.wapsell.com/health
```

## Post-Deployment Checklist

- [ ] Verify API responds at api.wapsell.com
- [ ] Check database health and migration status
- [ ] Test user login workflow
- [ ] Verify payment processor integration
- [ ] Test email notification
- [ ] Check file uploads to CDN
- [ ] Run smoke tests
- [ ] Monitor error rates and performance
- [ ] Verify backups are running
- [ ] Test disaster recovery procedure

## Performance Tuning

### Database Connection Pooling

Configure in `.env.production`:

```
DATABASE_POOL_SIZE=20
DATABASE_IDLE_TIMEOUT=30
```

### Node.js Heap Size

In docker-compose.prod.yml:

```yaml
api:
  environment:
    NODE_OPTIONS: "--max-old-space-size=4096"
```

### Redis Memory Limit

In docker-compose.prod.yml:

```yaml
redis:
  command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru
```

## Support & Documentation

- Technical Issues: Check TROUBLESHOOTING.md
- Operations: See RUNBOOKS.md
- API Questions: Read API-REFERENCE.md
- Architecture Details: Review ARCHITECTURE.md
