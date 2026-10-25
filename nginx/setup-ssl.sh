#!/bin/bash

# Wapsell NGINX SSL Setup Script
# Configures Let's Encrypt certificates for all domains
#
# Usage:
#   chmod +x nginx/setup-ssl.sh
#   ./nginx/setup-ssl.sh
#
# This script:
#   1. Installs Certbot
#   2. Generates SSL certificates for all domains
#   3. Configures automatic renewal via cron
#   4. Validates NGINX configuration

set -euo pipefail

echo "=================================================="
echo "Wapsell NGINX SSL Setup"
echo "=================================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use 'sudo')"
   exit 1
fi

# Configuration
DOMAINS=("api.wapsell.com" "wapsell.com" "admin.wapsell.com")
EMAIL="${CERTBOT_EMAIL:-admin@wapsell.com}"
CERTBOT_DIR="/etc/letsencrypt"
RENEWAL_HOOK="/etc/cron.d/certbot-renewal"

echo ""
echo "Step 1: Installing certbot..."
apt-get update
apt-get install -y certbot python3-certbot-nginx

echo ""
echo "Step 2: Generating SSL certificates..."
for domain in "${DOMAINS[@]}"; do
    echo "  - Processing domain: $domain"

    if [[ ! -d "$CERTBOT_DIR/live/$domain" ]]; then
        certbot certonly \
            --standalone \
            -d "$domain" \
            --email "$EMAIL" \
            --agree-tos \
            --non-interactive \
            --preferred-challenges http || {
            echo "WARNING: Failed to generate certificate for $domain"
            echo "Make sure port 80 is accessible and DNS is configured"
        }
    else
        echo "    Certificate already exists, skipping..."
    fi
done

echo ""
echo "Step 3: Setting up automatic certificate renewal..."

# Create cron job for automatic renewal
cat > "$RENEWAL_HOOK" <<'EOF'
# Certbot automatic renewal - runs daily at 3:00 AM UTC
0 3 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

chmod 644 "$RENEWAL_HOOK"

echo "  Renewal cron job installed at: $RENEWAL_HOOK"

echo ""
echo "Step 4: Testing NGINX configuration..."
if nginx -t; then
    echo "  NGINX configuration is valid"
else
    echo "  ERROR: NGINX configuration is invalid"
    exit 1
fi

echo ""
echo "Step 5: Reloading NGINX..."
systemctl reload nginx
echo "  NGINX reloaded successfully"

echo ""
echo "=================================================="
echo "SSL Setup Complete!"
echo "=================================================="
echo ""
echo "Certificates installed for:"
for domain in "${DOMAINS[@]}"; do
    cert_file="$CERTBOT_DIR/live/$domain/fullchain.pem"
    if [[ -f "$cert_file" ]]; then
        expiry_date=$(openssl x509 -noout -dates -in "$cert_file" | grep "notAfter" | cut -d= -f2)
        echo "  ✓ $domain (expires: $expiry_date)"
    else
        echo "  ✗ $domain (FAILED)"
    fi
done

echo ""
echo "Next steps:"
echo "1. Verify certificate installation: openssl s_client -connect api.wapsell.com:443"
echo "2. Test renewal dry-run: certbot renew --dry-run"
echo "3. Check cron job: systemctl status cron"
echo "4. Monitor renewal: tail -f /var/log/letsencrypt/letsencrypt.log"
echo ""
