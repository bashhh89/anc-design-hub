# ANC Design Hub — deterministic build for EasyPanel
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM base AS run
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app ./
EXPOSE 3000
# On boot: sync schema, seed only if empty, then serve.
CMD ["sh", "-lc", "npx prisma db push --skip-generate && npx tsx prisma/ensure-seed.ts && node_modules/.bin/next start -p ${PORT:-3000}"]
