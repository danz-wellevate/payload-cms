# syntax=docker/dockerfile:1

# ── base ──────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
# build tools needed to compile native modules (better-sqlite3, etc.)
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# ── dev ───────────────────────────────────────────────────────────────────────
# Used by docker-compose for local development.
# Source is bind-mounted at runtime; node_modules comes from this image.
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── runner (production) ───────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Persistent data directories — mount volumes here in production.
RUN mkdir -p media resumes proctoring-snapshots proctoring-recordings

EXPOSE 3000
CMD ["npm", "start"]
