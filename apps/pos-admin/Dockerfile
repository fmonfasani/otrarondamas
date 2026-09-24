# Build de producción del pos-admin (Vite/React) servido por nginx.
# Se construye con el contexto en la raíz del monorepo porque depende de
# packages/shared-types. VITE_API_URL se pasa como build arg: Vite
# incrusta las env vars en el bundle al momento de compilar, no en runtime.

FROM node:20-alpine AS builder
WORKDIR /repo

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/pos-admin/package.json apps/pos-admin/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci

COPY packages/shared-types packages/shared-types
COPY apps/pos-admin apps/pos-admin

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --workspace=@otrarondamas/pos-admin

# ---------------------------------------------------------------------------

FROM nginx:alpine AS runner
COPY apps/pos-admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/pos-admin/dist /usr/share/nginx/html

EXPOSE 80
