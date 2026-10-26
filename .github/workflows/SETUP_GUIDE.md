# CI/CD Pipeline Setup Guide

## Overview

This guide explains how to set up the GitHub Actions CI/CD pipeline for automatic deployment to Hetzner VPS.

**Tech Stack:**
- GitHub Actions for CI/CD orchestration
- Node.js 20.x
- Next.js / NestJS API
- Hetzner VPS for hosting
- PM2 for process management

---

## Prerequisites

Before setting up the pipeline, ensure you have:

1. **Hetzner VPS Instance**
   - IP address: `89.167.96.239` (or your custom IP)
   - SSH access as root
   - Node.js 20+ installed
   - PM2 installed for process management

2. **GitHub Repository**
   - SSH key generated and added to Hetzner
   - Repository secrets configured

3. **Local Setup**
   - Deployment scripts executable: `chmod +x scripts/*.sh`

---

## Step 1: Generate SSH Key for Deployment

Generate a dedicated SSH key for GitHub Actions (keep this secure):

```bash
# Generate a new key (no passphrase - GitHub Actions can't prompt for it)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key -N ""

# Alternative (if ed25519 not supported):
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key -N ""

# Display the public key
cat ~/.ssh/github_deploy_key.pub
```

---

## Step 2: Add SSH Key to Hetzner

Add the public key to Hetzner authorized keys:

```bash
# SSH into your Hetzner VPS
ssh root@89.167.96.239

# Add the public key to authorized_keys
echo "your_public_key_content" >> ~/.ssh/authorized_keys

# Verify permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Test the key works (from your local machine):
ssh -i ~/.ssh/github_deploy_key root@89.167.96.239 "echo 'SSH OK'"
```

---

## Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Create the following secrets:

### Required Secrets

| Secret Name | Value | Description |
|------------|-------|-------------|
| `HETZNER_HOST` | `89.167.96.239` | IP address of your Hetzner VPS |
| `HETZNER_USER` | `root` | SSH user (typically root) |
| `HETZNER_SSH_KEY` | [private key content] | Content of your private SSH key |
| `HETZNER_SSH_PORT` | `22` | SSH port (default: 22) |

### Optional Secrets

| Secret Name | Value | Description |
|------------|-------|-------------|
| `SLACK_WEBHOOK` | `https://hooks.slack.com/...` | Slack webhook for notifications |

### How to Add Secrets

1. Navigate to: **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Enter the secret name and value
4. Click **Add secret**

#### Adding the SSH Key Secret

Get your private key content:

```bash
cat ~/.ssh/github_deploy_key
```

Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`) and paste it as the `HETZNER_SSH_KEY` secret.

---

## Step 4: Prepare Deployment Directory on Hetzner

SSH into your Hetzner VPS and prepare the deployment directory:

```bash
ssh root@89.167.96.239

# Create deployment directory
mkdir -p /var/www/wapsell
cd /var/www/wapsell

# Initialize npm project (if not already done)
npm init -y

# Create .env file with database credentials
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/wapsell_prod"

# JWT
JWT_SECRET="your-secret-key-here"
JWT_EXPIRATION="24h"

# Node environment
NODE_ENV="production"

# Application
PORT=3000
API_URL="http://localhost:3000"
EOF

# Create .pm2 config (optional)
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'wapsell',
      script: './dist/src/main.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/wapsell.err.log',
      out_file: '/var/log/wapsell.out.log',
      log_file: '/var/log/wapsell.log',
      time: true
    }
  ]
};
EOF

# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start ecosystem.config.js

# Enable PM2 auto-start on reboot
pm2 startup
pm2 save
```

---

## Step 5: Test the Pipeline

### Option A: Manual Trigger

1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. Select **Deploy to Hetzner** workflow
4. Click **Run workflow**
5. Select branch (main) and click **Run workflow**

### Option B: Automatic Trigger

Push code to the `main` branch:

```bash
git add .
git commit -m "feat: enable CI/CD pipeline"
git push origin main
```

The pipeline will automatically start.

---

## Step 6: Monitor the Deployment

### GitHub Actions

1. Go to **Actions** tab in your repository
2. Click on the workflow run
3. Monitor each job:
   - ✅ Quality checks (lint, type-check)
   - ✅ Build
   - ✅ Tests (optional)
   - ✅ Deploy
   - ✅ Health checks
   - ✅ Verification

### Application Logs

SSH into Hetzner and monitor logs:

```bash
# Real-time logs
pm2 logs wapsell

# Or view file
tail -f /var/log/wapsell.log

# Check PM2 status
pm2 status
pm2 monit
```

---

## Pipeline Stages Explained

```
Trigger (push to main)
    ↓
[Parallel]
├─→ Code Quality (lint, type-check) ─→
├─→ Build (npm run build)         ─→
└─→ Tests (jest)                  ─→
    ↓
Deploy to Hetzner (SSH + deploy script)
    ↓
Health Checks (API responds)
    ↓
Slack Notification (optional)
    ↓
Verify Deployment (comprehensive checks)
```

### 1. Code Quality (Quality Job)
- Runs ESLint
- Runs TypeScript type-check
- **Fails if:** lint or type errors found

### 2. Build (Build Job)
- Installs dependencies (`npm ci`)
- Generates Prisma Client
- Builds application (`npm run build`)
- Uploads artifacts for deployment

### 3. Tests (Test Job)
- Optional - skippable via workflow input
- Runs Jest tests
- Continues on error (won't block deployment)

### 4. Security Scan (Security Job)
- Runs `npm audit`
- Continues on error (advisory only)

### 5. Deploy (Deploy Job)
- Downloads build artifacts
- Sets up SSH connection
- Runs deployment script on Hetzner:
  - Backs up current build
  - Deploys new build
  - Installs dependencies
  - Runs database migrations
  - Restarts application with PM2

### 6. Health Checks
- Verifies API responds
- Checks database connection
- Checks system resources

### 7. Slack Notification (Optional)
- Sends success/failure message to Slack

### 8. Verify Deployment
- Comprehensive post-deployment checks
- System status
- Application logs
- Database status
- API endpoints

---

## Rollback Strategy

If deployment fails, you can rollback to a previous version:

```bash
# SSH into Hetzner
ssh root@89.167.96.239

# List available backups
ls -la /var/www/wapsell/.backups/

# Rollback to latest backup
bash /var/www/wapsell/../scripts/rollback-deployment.sh \
  89.167.96.239 \
  root \
  ~/.ssh/deploy_key \
  22 \
  1
```

Backups are automatically kept (3 most recent):
- `dist_YYYYMMDD_HHMMSS/` — Previous successful builds
- `dist_BROKEN_YYYYMMDD_HHMMSS/` — Failed deployments (if rollback was used)

---

## Troubleshooting

### Pipeline Fails at "Quality" Stage

**Problem:** ESLint or TypeScript errors

**Solution:**
```bash
# Fix linting locally
npm run lint --workspace=@otrarondamas/api

# Run type check
npx tsc --noEmit
```

### Pipeline Fails at "Build" Stage

**Problem:** Build fails to complete

**Solution:**
```bash
# Test build locally
npm ci
npm run build --workspace=@otrarondamas/api

# Check for missing dependencies
npm ls
```

### Pipeline Fails at "Deploy" Stage

**Problem:** SSH connection fails

**Solution:**
1. Verify `HETZNER_HOST` secret is correct
2. Verify SSH key is correctly added to Hetzner
3. Check Hetzner SSH port: `echo $HETZNER_SSH_PORT`

```bash
# Test SSH locally
ssh -i ~/.ssh/github_deploy_key -p 22 root@89.167.96.239 "echo OK"
```

### Health Checks Fail

**Problem:** API doesn't respond after deployment

**Solution:**
1. Check application logs on Hetzner:
   ```bash
   pm2 logs wapsell
   ```

2. Check database migrations:
   ```bash
   cd /var/www/wapsell
   npx prisma migrate status
   ```

3. Restart manually:
   ```bash
   pm2 restart wapsell
   ```

### Rollback Needed

If deployment is broken, rollback is automatic if health check fails. Manual rollback:

```bash
bash scripts/rollback-deployment.sh \
  89.167.96.239 \
  root \
  ~/.ssh/deploy_key \
  22 \
  1  # Use backup #1 (latest)
```

---

## Security Best Practices

### ✅ Do's

- ✅ Rotate SSH keys periodically
- ✅ Use environment variables for secrets
- ✅ Keep `.env` files out of git
- ✅ Monitor deployment logs
- ✅ Use HTTPS for all endpoints
- ✅ Backup database regularly
- ✅ Restrict SSH access by IP (if possible)

### ❌ Don'ts

- ❌ Don't hardcode secrets in workflow files
- ❌ Don't store private keys in the repository
- ❌ Don't share SSH keys with team members
- ❌ Don't disable type checking or linting
- ❌ Don't deploy unverified code to production
- ❌ Don't ignore health check failures

---

## Skipping Tests on Emergency Deployments

If you need to deploy without running tests (use sparingly):

1. Go to **Actions** → **Deploy to Hetzner**
2. Click **Run workflow**
3. Toggle **Skip tests** to `true`
4. Click **Run workflow**

---

## Environment Variables

### On Hetzner (`.env` file)

Required environment variables in `/var/www/wapsell/.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Authentication
JWT_SECRET="generate-with: openssl rand -base64 32"
JWT_EXPIRATION="24h"

# Application
NODE_ENV="production"
PORT=3000
API_URL="https://api.yourdomain.com"

# Optional: Services
SENDGRID_API_KEY="your-key"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
```

---

## Monitoring & Maintenance

### Daily Tasks

```bash
# Check application status
pm2 status
pm2 monit

# Check disk space
df -h /var/www

# Check memory usage
free -h
```

### Weekly Tasks

- Review application logs
- Run `npm audit` for security vulnerabilities
- Check backup directory size

### Monthly Tasks

- Test rollback procedure
- Rotate SSH keys
- Update dependencies: `npm update --save`

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Hetzner Cloud Documentation](https://docs.hetzner.cloud/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [NestJS Deployment Guide](https://docs.nestjs.com/deployment)

---

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review GitHub Actions logs
3. Check Hetzner VPS logs: `pm2 logs wapsell`
4. Create an issue in the repository

---

**Last Updated:** 2026-10-26
**Maintainer:** Claude Haiku 4.5
