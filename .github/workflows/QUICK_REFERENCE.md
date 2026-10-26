# CI/CD Pipeline - Quick Reference

## ⚡ Quick Start (5 minutes)

### 1. Add GitHub Secrets
Go to: **Settings → Secrets and variables → Actions**

```
HETZNER_HOST       = 89.167.96.239
HETZNER_USER       = root
HETZNER_SSH_KEY    = [paste your private SSH key]
HETZNER_SSH_PORT   = 22
SLACK_WEBHOOK      = (optional)
```

### 2. Prepare Hetzner VPS
```bash
ssh root@89.167.96.239

mkdir -p /var/www/wapsell
cd /var/www/wapsell
npm install -g pm2

# Create .env file with your database URL
cat > .env << 'EOF'
DATABASE_URL="postgresql://user:password@localhost:5432/wapsell_prod"
JWT_SECRET="your-secret"
NODE_ENV="production"
EOF

pm2 startup
pm2 save
```

### 3. Make First Commit
```bash
git add .
git commit -m "feat: enable CI/CD pipeline"
git push origin main
```

Done! Watch the deployment at **Actions** tab.

---

## 📊 Pipeline Status

### Current Workflows
- ✅ `deploy.yml` — Main deployment (on every push to main)
- ✅ `lint.yml` — Code quality (on PRs)

### Recent Runs
View at: https://github.com/fmonfasani/wapsell/actions

---

## 🔧 Common Commands

### Manual Deployment
```bash
# From local machine
bash scripts/github-deploy.sh 89.167.96.239 root ~/.ssh/deploy_key 22
```

### Health Check
```bash
bash scripts/health-check.sh 89.167.96.239 ~/.ssh/deploy_key 22
```

### Rollback
```bash
bash scripts/rollback-deployment.sh 89.167.96.239 root ~/.ssh/deploy_key 22 1
```

### View Logs
```bash
ssh root@89.167.96.239
pm2 logs wapsell      # Real-time
pm2 status            # Status
pm2 monit             # Monitor
```

---

## 📋 Pipeline Stages

```
1. Code Quality      (lint, type-check)    ~2 min
2. Build             (npm run build)       ~8 min
3. Tests             (jest, optional)      ~10 min
4. Security Scan     (npm audit)           ~2 min
5. Deploy            (SSH + scripts)       ~5 min
6. Health Checks     (API responds)        ~2 min
7. Verification      (comprehensive)       ~3 min
                                   TOTAL: ~20-30 min
```

---

## 🚀 Deployment Triggers

### Automatic
- Push to `main` branch → auto-deploy

### Manual
1. Go to **Actions**
2. Select **Deploy to Hetzner**
3. Click **Run workflow**
4. Optional: Skip tests

---

## ❌ Troubleshooting Checklist

### SSH Connection Failed
```bash
# Test SSH key
ssh -i ~/.ssh/deploy_key root@89.167.96.239 "echo OK"

# Verify GitHub secret HETZNER_SSH_KEY
# Verify GitHub secret HETZNER_HOST = 89.167.96.239
```

### Build Failed
```bash
# Test locally
npm ci
npm run build --workspace=@otrarondamas/api
npm run lint --workspace=@otrarondamas/api
npx tsc --noEmit
```

### Health Check Failed
```bash
# SSH to Hetzner
ssh root@89.167.96.239

# Check logs
pm2 logs wapsell

# Restart
pm2 restart wapsell

# Check database
psql $DATABASE_URL -c "SELECT 1"
```

### Rollback Needed
```bash
bash scripts/rollback-deployment.sh 89.167.96.239 root ~/.ssh/deploy_key 22 1
```

---

## 📝 Environment Variables

### GitHub Secrets (Required)
```
HETZNER_HOST       IP address of VPS
HETZNER_USER       SSH user (default: root)
HETZNER_SSH_KEY    Private SSH key content
HETZNER_SSH_PORT   SSH port (default: 22)
```

### Hetzner `.env` File (Required)
```
DATABASE_URL        PostgreSQL connection string
JWT_SECRET          Generate: openssl rand -base64 32
JWT_EXPIRATION      Token expiration (e.g., 24h)
NODE_ENV            "production"
PORT                API port (default: 3000)
API_URL             Public API URL
```

---

## 🔐 Security Best Practices

✅ **Do:**
- Rotate SSH keys every 3 months
- Use GitHub Secrets for all credentials
- Monitor deployment logs
- Test rollback monthly
- Use HTTPS for all endpoints

❌ **Don't:**
- Hardcode secrets in code
- Share SSH keys with teammates
- Skip lint/type checks
- Force push to main
- Ignore health check failures

---

## 📞 Support

### GitHub Actions Logs
Go to: **Actions → [Workflow] → [Run]**

### Application Logs
```bash
ssh root@89.167.96.239
pm2 logs wapsell
```

### Documentation
- Full setup: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- Workflows: [README.md](./README.md)
- GitHub Actions: https://docs.github.com/actions

---

## 📞 Contacts

- **Repository:** https://github.com/fmonfasani/wapsell
- **Issues:** Create GitHub issue
- **Discussions:** Use GitHub discussions

---

## 🎯 What This Pipeline Does

1. **Code Quality** — Ensures code meets standards
2. **Build** — Compiles application to production bundle
3. **Tests** — Verifies functionality (optional)
4. **Deploy** — Pushes code to Hetzner VPS
5. **Health Check** — Verifies API responds
6. **Verify** — Comprehensive post-deployment checks
7. **Notify** — Sends Slack message (optional)

---

**Last Updated:** 2026-10-26  
**Version:** 1.0  
**Maintained by:** Claude Haiku 4.5
