#!/bin/bash

# NGINX Configuration Validation Script
# Validates all NGINX configuration files before deployment

set -euo pipefail

echo "=================================================="
echo "NGINX Configuration Validation"
echo "=================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF="$SCRIPT_DIR/nginx.conf"
CONF_D_DIR="$SCRIPT_DIR/conf.d"

# Check if main config exists
if [[ ! -f "$NGINX_CONF" ]]; then
    echo "ERROR: nginx.conf not found at $NGINX_CONF"
    exit 1
fi

echo ""
echo "✓ Main config found: $NGINX_CONF"

# Check if conf.d directory exists
if [[ ! -d "$CONF_D_DIR" ]]; then
    echo "ERROR: conf.d directory not found at $CONF_D_DIR"
    exit 1
fi

echo "✓ Domain configs directory found: $CONF_D_DIR"

# List all domain configs
echo ""
echo "Domain configurations:"
for config in "$CONF_D_DIR"/*.conf; do
    if [[ -f "$config" ]]; then
        domain=$(basename "$config" .conf)
        echo "  - $domain"
    fi
done

# Validate syntax with nginx -t (if nginx is available)
echo ""
if command -v nginx &> /dev/null; then
    echo "Testing NGINX configuration syntax..."
    if nginx -t -c "$NGINX_CONF"; then
        echo "✓ NGINX configuration syntax is valid"
    else
        echo "ERROR: NGINX configuration syntax error"
        exit 1
    fi
else
    echo "⚠ nginx command not found (skipping syntax test)"
    echo "  Configuration will be tested when container starts"
fi

# Validate SSL certificate paths (if they exist)
echo ""
echo "Checking SSL certificate paths..."
CERT_PATHS=(
    "/etc/letsencrypt/live/api.wapsell.com"
    "/etc/letsencrypt/live/wapsell.com"
    "/etc/letsencrypt/live/admin.wapsell.com"
)

for cert_path in "${CERT_PATHS[@]}"; do
    if [[ -d "$cert_path" ]]; then
        echo "  ✓ Certificate directory exists: $cert_path"
    else
        echo "  ⚠ Certificate directory not found: $cert_path"
        echo "    (This is expected if certificates haven't been generated yet)"
    fi
done

# Validate rate limiting zones
echo ""
echo "Checking rate limiting configuration..."
if grep -q "limit_req_zone" "$NGINX_CONF"; then
    echo "✓ Rate limiting zones configured"
    grep "limit_req_zone" "$NGINX_CONF" | while read -r line; do
        echo "  $line"
    done
else
    echo "⚠ No rate limiting zones found"
fi

# Validate upstream backends
echo ""
echo "Checking upstream backend definitions..."
if grep -q "upstream" "$NGINX_CONF"; then
    echo "✓ Upstream backends configured"
    grep -A 2 "^    upstream" "$NGINX_CONF" | while read -r line; do
        echo "  $line"
    done
else
    echo "ERROR: No upstream backends found"
    exit 1
fi

# Validate gzip configuration
echo ""
echo "Checking gzip compression..."
if grep -q "gzip on" "$NGINX_CONF"; then
    echo "✓ Gzip compression enabled"
else
    echo "⚠ Gzip compression may not be configured"
fi

# Validate security headers
echo ""
echo "Checking security headers..."
for config in "$CONF_D_DIR"/*.conf; do
    if [[ -f "$config" ]]; then
        if grep -q "Strict-Transport-Security" "$config"; then
            echo "✓ HSTS header configured in $(basename $config)"
        fi
    fi
done

echo ""
echo "=================================================="
echo "Validation Summary"
echo "=================================================="
echo "✓ Configuration structure is valid"
echo "✓ All required files are present"
echo ""
echo "Next steps:"
echo "1. Configure SSL certificates: sudo ./setup-ssl.sh"
echo "2. Build NGINX container: docker compose build nginx"
echo "3. Start NGINX: docker compose up -d nginx"
echo "4. Test connectivity: curl https://api.wapsell.com/health"
echo ""
