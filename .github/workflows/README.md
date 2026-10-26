# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD automation.

## Workflows

### 1. `deploy.yml` — Main Deployment Pipeline

**Trigger:** Push to `main` branch (or manual trigger)

**Stages:**
1. Code Quality checks (ESLint, TypeScript)
2. Build application
3. Run tests (optional, skippable)
4. Security scan (npm audit)
5. Deploy to Hetzner VPS
6. Health checks
7. Slack notifications (optional)
8. Comprehensive deployment verification

**Time:** ~20-30 minutes

**Status Badge:**
```markdown
![Deploy](https://github.com/fmonfasani/wapsell/actions/workflows/deploy.yml/badge.svg)
```

### 2. `lint.yml` — PR Lint Checks

**Trigger:** Pull requests to `main` or `develop` (optional)

**Stages:**
1. ESLint code style check
2. TypeScript type validation
3. Post PR comment with results (if failed)

**Time:** ~5 minutes

**Status Badge:**
```markdown
![Lint](https://github.com/fmonfasani/wapsell/actions/workflows/lint.yml/badge.svg)
```

---

## Quick Start

### Setting Up the Pipeline

1. **Add GitHub Secrets** (see [SETUP_GUIDE.md](./SETUP_GUIDE.md)):
   - `HETZNER_HOST` — VPS IP address
   - `HETZNER_USER` — SSH user
   - `HETZNER_SSH_KEY` — Private SSH key
   - `HETZNER_SSH_PORT` — SSH port
   - `SLACK_WEBHOOK` — (optional) Slack webhook

2. **Prepare Hetzner VPS** (see setup guide)

3. **Make a commit and push** to trigger deployment

### Manual Deployment

To manually trigger deployment:

1. Go to GitHub → Actions
2. Select **Deploy to Hetzner** workflow
3. Click **Run workflow**
4. Confirm and watch progress

---

## Deployment Scripts

Located in `scripts/`:

- `github-deploy.sh` — Main deployment script (called by workflow)
- `health-check.sh` — Post-deployment health verification
- `verify-deployment.sh` — Comprehensive deployment verification
- `rollback-deployment.sh` — Automatic/manual rollback to previous version

### Example Usage

```bash
# Manual deployment from local machine
bash scripts/github-deploy.sh 89.167.96.239 root ~/.ssh/deploy_key 22

# Health check
bash scripts/health-check.sh 89.167.96.239 ~/.ssh/deploy_key 22

# Rollback
bash scripts/rollback-deployment.sh 89.167.96.239 root ~/.ssh/deploy_key 22 1
```

---

## Environment Variables & Secrets

### GitHub Secrets Required

```
HETZNER_HOST           → VPS IP (e.g., 89.167.96.239)
HETZNER_USER           → SSH user (e.g., root)
HETZNER_SSH_KEY        → Private SSH key content
HETZNER_SSH_PORT       → SSH port (default: 22)
SLACK_WEBHOOK          → (Optional) Slack webhook URL
```

### On Hetzner Server (`.env` file)

```
DATABASE_URL           → PostgreSQL connection string
JWT_SECRET             → JWT signing key
JWT_EXPIRATION         → JWT token expiration (e.g., 24h)
NODE_ENV               → "production"
PORT                   → API port (default: 3000)
API_URL                → Public API URL (e.g., https://api.example.com)
```

---

## Monitoring & Logs

### GitHub Actions Logs

View workflow progress and logs:

1. Go to **Actions** tab
2. Click on the workflow run
3. Click on each job to see logs

### Application Logs

SSH into Hetzner and view logs:

```bash
# Real-time logs
pm2 logs wapsell

# Historical logs
tail -f /var/log/wapsell.log

# PM2 status
pm2 status
pm2 monit
```

---

## Troubleshooting

### Common Issues

**1. SSH Connection Failed**
- Check `HETZNER_HOST` and `HETZNER_USER` secrets
- Verify SSH key is added to Hetzner: `cat ~/.ssh/authorized_keys`
- Test locally: `ssh -i ~/.ssh/deploy_key root@89.167.96.239`

**2. Build Failed**
- Check linting: `npm run lint --workspace=@otrarondamas/api`
- Check types: `npx tsc --noEmit`
- Check build: `npm run build --workspace=@otrarondamas/api`

**3. Health Check Failed**
- Check application logs: `pm2 logs wapsell`
- Verify database: `psql -U user -d wapsell_prod -c "SELECT 1"`
- Restart app: `pm2 restart wapsell`

**4. Rollback Needed**
- Automatic rollback on health check failure
- Manual rollback: `bash scripts/rollback-deployment.sh ...`

---

## Best Practices

### ✅ Do's

- ✅ Always test locally before pushing
- ✅ Review PRs before merging to main
- ✅ Monitor deployment logs
- ✅ Keep secrets secure
- ✅ Test rollback periodically
- ✅ Use descriptive commit messages

### ❌ Don'ts

- ❌ Don't ignore lint or type errors
- ❌ Don't disable tests unnecessarily
- ❌ Don't hardcode secrets in code
- ❌ Don't skip health checks
- ❌ Don't force push to main
- ❌ Don't deploy unverified code

---

## Performance Tips

1. **Cache npm packages:** Already configured with `actions/setup-node`
2. **Parallel jobs:** Quality, build, and test run in parallel
3. **Shallow clone:** Checkout uses default depth (optimized)
4. **Artifact cleanup:** Artifacts auto-cleanup after 1 day

---

## Security

### SSH Key Management

- Generate unique key: `ssh-keygen -t ed25519 -C "github-actions"`
- Keep private key in GitHub Secrets only
- Rotate keys periodically
- Never commit SSH keys to repository

### Secret Management

- Use GitHub Secrets for all sensitive data
- Rotate secrets regularly
- Monitor secret access logs
- Never log secrets in workflow output

---

## Customization

### Adding More Checks

Edit `deploy.yml` to add additional checks:

```yaml
- name: Custom Check
  run: npm run custom-check
```

### Slack Notifications

Enable Slack notifications by setting `SLACK_WEBHOOK` secret:

1. Create Slack incoming webhook: https://api.slack.com/messaging/webhooks
2. Add webhook URL as GitHub secret: `SLACK_WEBHOOK`
3. Notifications are automatically sent on success/failure

### Custom Health Check

Edit `health-check.sh` to add custom health checks:

```bash
# Example: Check specific API endpoint
curl -s http://localhost:3000/api/health | jq '.status'
```

---

## Rollback Procedure

If deployment fails:

1. **Automatic:** Health check failures trigger automatic rollback
2. **Manual:** 
   ```bash
   bash scripts/rollback-deployment.sh 89.167.96.239 root ~/.ssh/deploy_key 22 1
   ```

Backups are kept for 3 deployments. Earlier backups are automatically removed.

---

## Documentation

- [Full Setup Guide](./SETUP_GUIDE.md)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Hetzner Cloud Docs](https://docs.hetzner.cloud/)
- [PM2 Docs](https://pm2.keymetrics.io/)

---

## Maintenance

### Weekly

- Check deployment logs
- Verify application health
- Monitor resource usage

### Monthly

- Rotate SSH keys
- Update dependencies
- Test rollback procedure
- Review security logs

### Quarterly

- Upgrade Node.js version
- Review and update scripts
- Audit GitHub secrets

---

## Contacts & Support

**Issues?**
1. Check troubleshooting section
2. Review GitHub Actions logs
3. Check Hetzner VPS logs: `pm2 logs wapsell`
4. Create issue in repository

---

**Created:** 2026-10-26  
**Last Updated:** 2026-10-26  
**Maintained by:** Claude Haiku 4.5
