# Build de producción de la tienda online (Vite/React) servido por nginx.
# Mismo patrón que apps/pos-admin/Dockerfile — contexto en la raíz del
# monorepo porque depende de packages/shared-types. VITE_API_URL se pasa
# como build arg: Vite incrusta las env vars en el bundle al momento de
# compilar, no en runtime.

FROM node:20-alpine AS builder
WORKDIR /repo

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/tienda-online/package.json apps/tienda-online/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci

COPY packages/shared-types packages/shared-types
COPY apps/tienda-online apps/tienda-online

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --workspace=@otrarondamas/tienda-online

# ---------------------------------------------------------------------------

FROM nginx:alpine AS runner
COPY apps/tienda-online/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/tienda-online/dist /usr/share/nginx/html

EXPOSE 80
