# Wapsell Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Testing](#testing)
- [Building](#building)
- [VPS Deployment](#vps-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Rollback](#rollback)

## Prerequisites

### Local Development
- Node.js 20+
- npm 10+
- Docker (for containerized deployment)
- Docker Compose (for multi-service setup)

### VPS Deployment
- Ubuntu 20.04+ or equivalent Linux distribution
- Node.js 20+ installed on VPS
- PM2 for process management
- Nginx for reverse proxy
- PostgreSQL 15+ (if not containerized)
- Redis (optional, for caching)
- SSL/TLS certificate (for HTTPS)

## Local Development

### Setup
```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Configure database URL (for E2E tests)
export DATABASE_URL="postgresql://user:password@localhost:5432/wapsell_dev"

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Development Scripts
```bash
# Start dev server with hot reload
npm run dev

# Type check
npm run typecheck

# Lint code
npm run lint

# Format code with Prettier
npx prettier --write .

# Build for production
npm run build

# Start production server
npm run start
```

## Testing

### Unit Tests
```bash
# Run unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### E2E Tests
```bash
# Install Playwright browsers (first time)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run E2E tests for specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Test Coverage
```bash
# Generate coverage report
npm test -- --coverage

# View coverage in browser
open coverage/index.html
```

## Building

### Production Build
```bash
# Clean previous build
rm -rf build/

# Build Remix application
npm run build

# Verify build
ls -la build/

# Test production build locally
npm run start
```

### Docker Build
```bash
# Build Docker image
docker build -t wapsell-remix:latest .

# Tag for registry
docker tag wapsell-remix:latest ghcr.io/yourusername/wapsell-remix:latest

# Push to registry
docker push ghcr.io/yourusername/wapsell-remix:latest
```

## VPS Deployment

### Prerequisites on VPS
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx

# Install PostgreSQL (if not using managed service)
sudo apt-get install -y postgresql postgresql-contrib
```

### Initial VPS Setup
```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Create application directory
mkdir -p /opt/wapsell
cd /opt/wapsell

# Clone repository
git clone https://github.com/yourusername/wapsell.git .

# Install dependencies
npm ci --production

# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
VITE_API_URL=https://api.wapsell.com
DATABASE_URL=postgresql://user:password@localhost:5432/wapsell
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key_here
SESSION_SECRET=your_session_secret_here
EOF

# Build application
npm run build

# Start with PM2
pm2 start npm --name wapsell-remix -- run start

# Enable startup on reboot
pm2 startup
pm2 save
```

### Nginx Configuration
Create `/etc/nginx/sites-available/wapsell`:

```nginx
upstream wapsell_remix {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name wapsell.com www.wapsell.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wapsell.com www.wapsell.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/wapsell.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wapsell.com/privkey.pem;

    # SSL security headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy configuration
    location / {
        proxy_pass http://wapsell_remix;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://wapsell_remix/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    gzip_min_length 1000;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/wapsell /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Certificate (Let's Encrypt)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d wapsell.com -d www.wapsell.com
sudo certbot renew --dry-run  # Test renewal
```

## Monitoring

### View Application Logs
```bash
# Real-time logs
pm2 logs wapsell-remix

# View last 100 lines
pm2 logs wapsell-remix --lines 100

# Show logs for all processes
pm2 logs
```

### Monitor Processes
```bash
# Interactive monitor
pm2 monit

# Show process info
pm2 info wapsell-remix

# List all processes
pm2 list
```

### Health Check
```bash
# Check application health
curl https://wapsell.com/api/health

# Expected response:
# {"status":"ok","timestamp":"2024-10-27T12:00:00Z","uptime":12345}
```

### System Monitoring
```bash
# Check server resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Check network connections
netstat -tuln
```

## Troubleshooting

### Application won't start
```bash
# Check PM2 logs
pm2 logs wapsell-remix --err

# Check if port 3000 is in use
lsof -i :3000

# Kill any existing process
pkill -f "node"

# Restart application
pm2 restart wapsell-remix
```

### High memory usage
```bash
# Restart PM2 process
pm2 restart wapsell-remix

# Enable clustering mode (if available)
pm2 delete wapsell-remix
pm2 start npm --name wapsell-remix --instances 4 -- run start
pm2 save
```

### Database connection issues
```bash
# Check database connectivity
psql postgresql://user:password@localhost:5432/wapsell -c "SELECT 1"

# Check environment variables
printenv | grep DATABASE_URL

# Restart application
pm2 restart wapsell-remix
```

### Nginx issues
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

## Rollback

### Quick Rollback
If deployment fails or causes issues:

```bash
cd /opt/wapsell

# Check previous commits
git log --oneline -5

# Checkout previous version
git checkout HEAD~1

# Rebuild and restart
npm run build
pm2 restart wapsell-remix
```

### Full Rollback
```bash
# Stop application
pm2 stop wapsell-remix

# Revert to known-good state
git reset --hard origin/stable

# Clean dependencies
rm -rf node_modules package-lock.json

# Reinstall and rebuild
npm ci --production
npm run build

# Start application
pm2 start wapsell-remix

# Verify
curl https://wapsell.com/api/health
```

### Database Rollback
If database migrations need to be rolled back:

```bash
# List migrations
npm run prisma migrate status

# Rollback last migration
npm run prisma migrate resolve --rolled-back 001_initial

# Restart application
pm2 restart wapsell-remix
```

## Maintenance

### Regular Tasks
```bash
# Update dependencies (monthly)
npm update

# Security audit
npm audit fix

# Check for outdated packages
npm outdated

# Clean cache
npm cache clean --force
```

### Backup
```bash
# Backup database
pg_dump postgresql://user:password@localhost:5432/wapsell > backup_$(date +%Y%m%d).sql

# Backup application directory
tar -czf /backup/wapsell_$(date +%Y%m%d).tar.gz /opt/wapsell

# Backup to cloud (S3, etc)
aws s3 cp backup_$(date +%Y%m%d).sql s3://your-bucket/backups/
```

### Log Rotation
Configure log rotation in `/etc/logrotate.d/wapsell`:

```
/var/log/pm2*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Application port | `3000` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost/db` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | `your_secret_key` |
| `SESSION_SECRET` | Session encryption | `your_session_secret` |
| `VITE_API_URL` | API endpoint | `https://api.wapsell.com` |
| `KAFKA_BROKERS` | Kafka servers | `kafka1:9092,kafka2:9092` |

## Support

For issues or questions:
1. Check the logs: `pm2 logs wapsell-remix`
2. Review this guide's troubleshooting section
3. Check GitHub Issues: https://github.com/yourusername/wapsell/issues
4. Contact the development team
