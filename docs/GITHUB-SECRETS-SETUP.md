# GitHub Secrets Configuration

Guide to setting up required secrets in GitHub for CI/CD pipelines.

## Overview

The following secrets must be configured in GitHub repository settings under **Settings > Secrets and variables > Actions**.

## Required Secrets

### Docker Registry Credentials

**`DOCKER_USERNAME`**
- **Type**: Repository secret
- **Description**: Docker Hub username
- **Example**: `your-docker-username`
- **Used by**: `build.yml`

**`DOCKER_PASSWORD`**
- **Type**: Repository secret
- **Description**: Docker Hub access token (not password)
- **How to generate**:
  1. Go to https://hub.docker.com/settings/security
  2. Click "New Access Token"
  3. Name it "wapsell-ci"
  4. Copy the token
- **Used by**: `build.yml`

### SSH Credentials (Hetzner VPS)

**`SSH_USER`**
- **Type**: Repository secret
- **Description**: SSH username for Hetzner VPS
- **Example**: `root`
- **Used by**: `deploy-staging.yml`, `deploy-production.yml`, `backup.yml`

**`SSH_PRIVATE_KEY`**
- **Type**: Repository secret
- **Description**: SSH private key for Hetzner VPS (full key with BEGIN/END lines)
- **How to generate** (on local machine):
  ```bash
  ssh-keygen -t ed25519 -f ~/.ssh/id_wapsell -C "wapsell-github-actions"
  cat ~/.ssh/id_wapsell  # Copy this as secret
  ```
- **How to add to VPS**:
  ```bash
  ssh root@<vps-ip>
  mkdir -p ~/.ssh
  cat >> ~/.ssh/authorized_keys << 'EOF'
  ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxxxxxx wapsell-github-actions
  EOF
  chmod 600 ~/.ssh/authorized_keys
  ```
- **Used by**: `deploy-staging.yml`, `deploy-production.yml`, `backup.yml`

**`SSH_PORT`**
- **Type**: Repository secret
- **Description**: SSH port for Hetzner VPS
- **Example**: `22`
- **Used by**: `deploy-staging.yml`, `deploy-production.yml`, `backup.yml`

**`STAGING_HOST`**
- **Type**: Repository secret
- **Description**: IP address or hostname of staging VPS
- **Example**: `192.168.1.100` or `staging-vps.hetzner.com`
- **Used by**: `deploy-staging.yml`

**`PROD_HOST`**
- **Type**: Repository secret
- **Description**: IP address or hostname of production VPS
- **Example**: `192.168.1.101` or `prod-vps.hetzner.com`
- **Used by**: `deploy-production.yml`, `backup.yml`

### Slack Notifications

**`SLACK_WEBHOOK_STAGING`**
- **Type**: Repository secret
- **Description**: Slack webhook URL for staging deployments
- **How to generate**:
  1. Go to Slack Workspace Settings → Manage Apps
  2. Search for "Incoming Webhooks"
  3. Click "Add to Slack"
  4. Choose channel: `#wapsell-staging`
  5. Copy the webhook URL
- **Format**: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`
- **Used by**: `deploy-staging.yml`

**`SLACK_WEBHOOK_PRODUCTION`**
- **Type**: Repository secret
- **Description**: Slack webhook URL for production deployments
- **How to generate**: Same as above, choose channel: `#wapsell-deployments`
- **Used by**: `deploy-production.yml`

**`SLACK_WEBHOOK_OPS`**
- **Type**: Repository secret
- **Description**: Slack webhook URL for ops notifications (backups, alerts)
- **How to generate**: Same as above, choose channel: `#wapsell-ops`
- **Used by**: `backup.yml`

## How to Add Secrets in GitHub

### Via GitHub Web UI

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Enter **Name** (exactly as listed above)
4. Paste **Secret value**
5. Click **Add secret**

### Via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com

# Authenticate with GitHub
gh auth login

# Add secrets (replace OWNER/REPO and values)
gh secret set DOCKER_USERNAME --body "your-docker-username" -R OWNER/REPO
gh secret set DOCKER_PASSWORD --body "your-token" -R OWNER/REPO
gh secret set SSH_USER --body "root" -R OWNER/REPO
gh secret set SSH_PRIVATE_KEY < ~/.ssh/id_wapsell -R OWNER/REPO
gh secret set SSH_PORT --body "22" -R OWNER/REPO
gh secret set STAGING_HOST --body "192.168.1.100" -R OWNER/REPO
gh secret set PROD_HOST --body "192.168.1.101" -R OWNER/REPO
gh secret set SLACK_WEBHOOK_STAGING --body "https://hooks.slack.com/..." -R OWNER/REPO
gh secret set SLACK_WEBHOOK_PRODUCTION --body "https://hooks.slack.com/..." -R OWNER/REPO
gh secret set SLACK_WEBHOOK_OPS --body "https://hooks.slack.com/..." -R OWNER/REPO
```

## Environment Secrets (for Environments)

GitHub also supports **Environment Secrets** for production safety.

### Production Environment Setup

1. Go to **Settings** → **Environments** → **Create new environment**
2. Name: `production`
3. Add required reviewers (team members who must approve prod deployments)
4. Add environment-specific secrets:
   - `PROD_HOST`
   - `SSH_PRIVATE_KEY`
   - `SLACK_WEBHOOK_PRODUCTION`

### Staging Environment Setup

1. Go to **Settings** → **Environments** → **Create new environment**
2. Name: `staging`
3. No required reviewers (auto-deployment)
4. Add environment-specific secrets:
   - `STAGING_HOST`
   - `SSH_PRIVATE_KEY`
   - `SLACK_WEBHOOK_STAGING`

## Security Best Practices

✅ **DO**:
- Use access tokens instead of passwords for Docker
- Rotate SSH keys every 6 months
- Use SSH key passphrases where possible
- Store private keys securely (never commit to repo)
- Review secret access logs regularly
- Use environment-specific secrets for production

❌ **DON'T**:
- Commit `.env` files or secrets to repository
- Share secrets in chat or emails
- Use the same secret across environments
- Log or print secrets in GitHub Actions
- Store passwords instead of access tokens

## Verification

To verify secrets are configured correctly:

```bash
# List configured secrets (without values)
gh secret list -R OWNER/REPO

# Test SSH connectivity
ssh -i ~/.ssh/id_wapsell root@STAGING_HOST "echo 'SSH connection successful'"
ssh -i ~/.ssh/id_wapsell root@PROD_HOST "echo 'SSH connection successful'"

# Test Docker credentials
echo "DOCKER_PASSWORD" | docker login -u "DOCKER_USERNAME" --password-stdin

# Test Slack webhook
curl -X POST SLACK_WEBHOOK_URL \
  -H 'Content-type: application/json' \
  --data '{"text":"Test message from CI/CD"}'
```

## Troubleshooting

### SSH Connection Fails

**Problem**: `Permission denied (publickey)` in deployment logs

**Solution**:
1. Verify public key is in VPS `~/.ssh/authorized_keys`
2. Check VPS file permissions:
   ```bash
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```
3. Verify SSH key is correct in GitHub secrets
4. Test locally: `ssh -v -i key.pem root@HOST`

### Docker Push Fails

**Problem**: `authentication required` in build logs

**Solution**:
1. Verify Docker credentials are correct
2. Use Docker Hub **access token**, not password
3. Test locally: `docker login` with token
4. Check token hasn't expired

### Slack Notifications Fail

**Problem**: Webhook returns 404 or 401

**Solution**:
1. Verify webhook URL is complete and correct
2. Check Slack app still has permissions
3. Verify channel exists and app is invited
4. Test webhook with curl locally

### Secret Not Available in Workflow

**Problem**: `env: MISSING_SECRET` appears in logs

**Solution**:
1. Verify secret name matches exactly (case-sensitive)
2. Check secret exists: `gh secret list -R OWNER/REPO`
3. Re-add secret if recently created (short cache delay)
4. Verify workflow is in public repo or secret is shared

## Related Documentation

- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Hetzner SSH Setup](https://docs.hetzner.cloud/cloud/servers/how-to/add-public-key)
- [Slack Webhooks](https://api.slack.com/messaging/webhooks)
- [Docker Hub Access Tokens](https://docs.docker.com/docker-hub/access-tokens/)
