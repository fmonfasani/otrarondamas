# Multi-stage build para la API NestJS. Se construye con el contexto en la
# raíz del monorepo (ver docker-compose.prod.yml) porque depende de
# packages/shared-types.
#
# node:20-bookworm-slim (Debian) en vez de -alpine: el query engine nativo
# de Prisma que se genera acá busca libssl vía glibc, y Alpine (musl)
# rompe en runtime con "Error loading shared library libssl.so.1.1: No
# such file or directory" (probado localmente). bookworm-slim tampoco trae
# openssl preinstalado, así que sin instalarlo Prisma no puede autodetectar
# la versión y cae al binario legacy openssl-1.1.x, que tampoco existe acá
# (Debian 12 trae OpenSSL 3) — de ahí el `apt-get install openssl` en las
# dos etapas.

FROM node:20-bookworm-slim AS builder
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Copiamos primero los manifests para aprovechar la cache de capas de Docker:
# si solo cambia código fuente, no se reinstalan dependencias.
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci

COPY packages/shared-types packages/shared-types
COPY apps/api apps/api

# shared-types se consume vía tsconfig paths (código .ts fuente), no hace
# falta compilarlo a JS aparte para que la API lo use.
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace=@otrarondamas/api

# ---------------------------------------------------------------------------

FROM node:20-bookworm-slim AS runner
WORKDIR /repo
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci --omit=dev

COPY --from=builder /repo/apps/api/dist apps/api/dist
COPY --from=builder /repo/apps/api/prisma apps/api/prisma
COPY --from=builder /repo/node_modules/.prisma node_modules/.prisma
COPY --from=builder /repo/packages/shared-types packages/shared-types

# nest build no copia assets no-TS a dist/ (no hay "assets" configurado en
# nest-cli.json). seed.ts busca este JSON con __dirname, que en el
# compilado apunta a dist/prisma/, no a prisma/ — copiarlo ahí también.
RUN cp apps/api/prisma/seed-data-minorista.json apps/api/dist/prisma/seed-data-minorista.json

EXPOSE 3000
CMD ["node", "apps/api/dist/src/main.js"]
