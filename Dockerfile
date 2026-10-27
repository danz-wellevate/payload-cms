# syntax=docker/dockerfile:1

# ── base ──────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
# build tools needed to compile native modules
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
# Baked in at build time.
ARG NEXT_PUBLIC_BASE_PATH=/plus_tech_exam
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
# Real secrets are injected at runtime; the build only needs these to exist.
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV PAYLOAD_SECRET=build-placeholder
RUN npm run build

# ── runner (production) ───────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Persistent data directories — mount volumes here in production.
RUN mkdir -p media resumes proctoring-snapshots proctoring-recordings &&     chown -R nextjs:nodejs media resumes proctoring-snapshots proctoring-recordings

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
