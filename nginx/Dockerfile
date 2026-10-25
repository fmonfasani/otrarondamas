FROM nginx:alpine

# Install certbot and additional tools
RUN apk add --no-cache \
    certbot \
    certbot-nginx \
    openssl

# Create log directory
RUN mkdir -p /var/log/nginx

# Copy main NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy domain-specific configurations
COPY conf.d/ /etc/nginx/conf.d/

# Create self-signed certificates for initial start (will be replaced by Let's Encrypt)
RUN mkdir -p /etc/letsencrypt/live/api.wapsell.com \
    && mkdir -p /etc/letsencrypt/live/wapsell.com \
    && mkdir -p /etc/letsencrypt/live/admin.wapsell.com

# Generate placeholder self-signed certs (will be replaced by certbot)
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/letsencrypt/live/api.wapsell.com/privkey.pem \
    -out /etc/letsencrypt/live/api.wapsell.com/fullchain.pem \
    -subj "/CN=api.wapsell.com" 2>/dev/null || true && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/letsencrypt/live/wapsell.com/privkey.pem \
    -out /etc/letsencrypt/live/wapsell.com/fullchain.pem \
    -subj "/CN=wapsell.com" 2>/dev/null || true && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/letsencrypt/live/admin.wapsell.com/privkey.pem \
    -out /etc/letsencrypt/live/admin.wapsell.com/fullchain.pem \
    -subj "/CN=admin.wapsell.com" 2>/dev/null || true

# Copy certificate chain stub (created by certbot)
RUN echo "-----BEGIN CERTIFICATE-----" > /etc/letsencrypt/live/api.wapsell.com/chain.pem && \
    echo "-----END CERTIFICATE-----" >> /etc/letsencrypt/live/api.wapsell.com/chain.pem && \
    cp /etc/letsencrypt/live/api.wapsell.com/chain.pem /etc/letsencrypt/live/wapsell.com/chain.pem && \
    cp /etc/letsencrypt/live/api.wapsell.com/chain.pem /etc/letsencrypt/live/admin.wapsell.com/chain.pem

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Run NGINX in foreground
CMD ["nginx", "-g", "daemon off;"]
