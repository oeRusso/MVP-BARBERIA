FROM node:24-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Valores de relleno: el build no se conecta a nada ni los conserva.
ENV DATABASE_URL="mysql://build:build@127.0.0.1:3306/build"
ENV BETTER_AUTH_SECRET="solo-para-el-build"
RUN npx prisma generate && npm run build

# Imagen de un solo uso: aplica migraciones y crea el primer administrador.
FROM build AS tools
ENV DATABASE_URL=""
ENV BETTER_AUTH_SECRET=""
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:24-slim AS app
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
