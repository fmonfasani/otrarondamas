#!/bin/bash

# Setup SSL/TLS para Wapsell en Hetzner
# Requisitos: DNS records ya creados en Namecheap
# Uso: ./setup-ssl-namecheap.sh

set -e

VPS_IP="89.167.96.239"
DOMAIN_API="api.wapsell.com"
DOMAIN_MAIN="otrarondamas.wapsell.com"
DOMAIN_ADMIN="admin.otrarondamas.wapsell.com"
EMAIL="fmonfasani@gmail.com"
CERT_DIR="/etc/letsencrypt/live"

echo "🔒 Wapsell SSL/TLS Setup"
echo "========================"
echo ""

# 1. Verificar DNS
echo "1️⃣  Verificando DNS propagation..."
for domain in $DOMAIN_API $DOMAIN_MAIN $DOMAIN_ADMIN; do
  echo -n "   $domain ... "
  if dig +short $domain | grep -q $VPS_IP; then
    echo "✅ OK"
  else
    echo "❌ FALLO"
    echo "   ⚠️  Espera 5-10 minutos para DNS propagation"
    echo "   Retry: dig +short $domain"
    exit 1
  fi
done

echo ""
echo "2️⃣  Instalando Certbot..."
apt-get update -qq
apt-get install -y certbot python3-certbot-nginx dnsutils

echo ""
echo "3️⃣  Generando certificados Let's Encrypt..."

# API domain
if [ ! -d "$CERT_DIR/$DOMAIN_API" ]; then
  certbot certonly \
    --nginx \
    -d $DOMAIN_API \
    -d www.$DOMAIN_API \
    --email $EMAIL \
    --agree-tos \
    --non-interactive \
    --preferred-challenges http
  echo "✅ Certificado: $DOMAIN_API"
fi

# Main domain
if [ ! -d "$CERT_DIR/$DOMAIN_MAIN" ]; then
  certbot certonly \
    --nginx \
    -d $DOMAIN_MAIN \
    -d www.$DOMAIN_MAIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive \
    --preferred-challenges http
  echo "✅ Certificado: $DOMAIN_MAIN"
fi

# Admin domain
if [ ! -d "$CERT_DIR/$DOMAIN_ADMIN" ]; then
  certbot certonly \
    --nginx \
    -d $DOMAIN_ADMIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive \
    --preferred-challenges http
  echo "✅ Certificado: $DOMAIN_ADMIN"
fi

echo ""
echo "4️⃣  Configurando NGINX SSL..."
systemctl reload nginx

echo ""
echo "5️⃣  Configurando auto-renew..."
certbot renew --dry-run

echo ""
echo "✅ SSL/TLS Setup Completado!"
echo ""
echo "Dominios activos:"
echo "  https://$DOMAIN_API"
echo "  https://$DOMAIN_MAIN"
echo "  https://$DOMAIN_ADMIN"
echo ""
echo "Auto-renew cada 60 días (certbot)"
