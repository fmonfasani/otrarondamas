# GitHub Actions CI/CD Pipeline - Documentation Index

## 📋 Table of Contents

### Quick Navigation
- **⚡ Quick Start:** [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) (5 min read)
- **📖 Full Setup:** [SETUP_GUIDE.md](./SETUP_GUIDE.md) (15 min read)
- **ℹ️ Workflow Details:** [README.md](./README.md) (10 min read)
- **✅ Implementation Status:** [CI-CD-IMPLEMENTATION-SUMMARY.md](./CI-CD-IMPLEMENTATION-SUMMARY.md) (5 min read)

---

## 📚 Documentation Map

### For First-Time Setup
1. Start here: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
2. Then follow: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
3. Reference: [CI-CD-IMPLEMENTATION-SUMMARY.md](./CI-CD-IMPLEMENTATION-SUMMARY.md)

### For Daily Operations
1. Reference: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
2. Details: [README.md](./README.md)

### For Troubleshooting
1. Quick fix: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#troubleshooting-checklist)
2. Detailed: [SETUP_GUIDE.md](./SETUP_GUIDE.md#troubleshooting)
3. Logs: Check GitHub Actions workflow logs

### For Team Onboarding
1. Overview: [CI-CD-IMPLEMENTATION-SUMMARY.md](./CI-CD-IMPLEMENTATION-SUMMARY.md)
2. Setup: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
3. Reference: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

---

## 🔧 Workflows

### Production Deployment
- **File:** `deploy.yml`
- **Trigger:** Push to `main` branch
- **Time:** ~20-30 minutes
- **Purpose:** Automatic deployment with tests & verification

### Pull Request Checks
- **File:** `lint.yml`
- **Trigger:** PR to main/develop
- **Time:** ~5 minutes
- **Purpose:** Code quality checks

---

## 📝 Scripts in `scripts/` Directory

### Deployment
- `github-deploy.sh` — Deploy build to Hetzner
- `health-check.sh` — Verify API health after deployment
- `verify-deployment.sh` — Comprehensive post-deployment checks
- `rollback-deployment.sh` — Rollback to previous version

### Configuration Templates
- `ecosystem.config.example.js` — PM2 production config
- `.env.hetzner.example` — Environment variables template

---

## 🎯 Quick Links

### Configuration
- **GitHub Secrets:** Repository Settings → Secrets and variables → Actions
- **SSH Key Setup:** [SETUP_GUIDE.md - Step 1](./SETUP_GUIDE.md#step-1-generate-ssh-key-for-deployment)
- **GitHub Secrets:** [SETUP_GUIDE.md - Step 3](./SETUP_GUIDE.md#step-3-configure-github-secrets)

### Deployment
- **Trigger Manual Deploy:** GitHub → Actions → Deploy to Hetzner → Run workflow
- **Monitor Deploy:** GitHub → Actions → [Workflow] → Watch logs
- **Check Application:** SSH → `pm2 logs wapsell`

### Troubleshooting
- **SSH Issues:** [SETUP_GUIDE.md - Troubleshooting](./SETUP_GUIDE.md#troubleshooting)
- **Build Issues:** [QUICK_REFERENCE.md - Build Failed](./QUICK_REFERENCE.md#build-failed)
- **Deployment Issues:** [QUICK_REFERENCE.md - Health Check Failed](./QUICK_REFERENCE.md#health-check-failed)

---

## 📊 Implementation Status

✅ **Completed:**
- GitHub Actions workflows (deploy.yml, lint.yml)
- Deployment scripts (4 total)
- Configuration examples
- Comprehensive documentation
- Backup & rollback system
- Health checks
- Slack notifications (optional)

⏳ **Pending (Your Action):**
1. Generate SSH key
2. Add SSH key to Hetzner
3. Configure GitHub Secrets
4. Prepare Hetzner VPS
5. Test first deployment

---

## 🔐 Security Checklist

Before deploying to production, verify:

- [ ] SSH key generated and not committed
- [ ] GitHub Secrets configured correctly
- [ ] .env file created on Hetzner
- [ ] Database credentials verified
- [ ] JWT_SECRET generated (openssl rand -base64 32)
- [ ] CORS origins configured
- [ ] SSL certificates planned (Let's Encrypt recommended)
- [ ] Backups tested
- [ ] Rollback procedure tested

---

## 📞 Getting Help

### Documentation
- **Quick answers:** [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **Step-by-step:** [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Details:** [README.md](./README.md)

### Issues
- Check GitHub Actions logs
- SSH to Hetzner: `pm2 logs wapsell`
- Review [SETUP_GUIDE.md - Troubleshooting](./SETUP_GUIDE.md#troubleshooting)

---

## 📈 Performance Tips

1. **Faster deployments:** Code is cached between runs
2. **Less disk usage:** Backups rotate (keep 3 recent)
3. **Better health checks:** Automated verification prevents bad deploys
4. **Easier rollbacks:** One-command rollback to any recent version

---

## 🎓 Learning Path

### For New Developers
1. Read [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) — 5 min
2. Follow [SETUP_GUIDE.md](./SETUP_GUIDE.md) — 30 min
3. Watch first deployment in Actions — 20-30 min
4. Bookmark [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for future reference

### For DevOps
1. Read [CI-CD-IMPLEMENTATION-SUMMARY.md](./CI-CD-IMPLEMENTATION-SUMMARY.md) — 10 min
2. Review all scripts in `scripts/` directory — 15 min
3. Study [SETUP_GUIDE.md](./SETUP_GUIDE.md) — 30 min
4. Customize as needed — varies

---

## 📋 Maintenance Schedule

### Weekly
- [ ] Monitor deployment logs
- [ ] Check disk space on Hetzner
- [ ] Verify backups exist

### Monthly
- [ ] Test rollback procedure
- [ ] Rotate SSH keys
- [ ] Update dependencies: `npm update`
- [ ] Review error logs

### Quarterly
- [ ] Upgrade Node.js version
- [ ] Review and update scripts
- [ ] Audit GitHub secrets
- [ ] Plan SSL certificate renewal

---

## 🚀 Next Steps

1. **First:** [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - 5 min overview
2. **Then:** [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Full setup
3. **Finally:** Test first deployment
4. **Always:** Bookmark [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

---

**Created:** 2026-10-26  
**Last Updated:** 2026-10-26  
**Maintained by:** Claude Haiku 4.5
