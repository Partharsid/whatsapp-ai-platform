# WhatsApp AI Platform — Production Dockerfile
# Express + Next.js (custom server pattern) + WebSocket
# Optimized for Koyeb free tier

# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm ci --workspaces --include-workspace-root

# ---- Stage 2: Build everything ----
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/ ./packages/
COPY backend/ ./backend/
COPY frontend/ ./frontend/

ENV NODE_ENV=production

# Build shared types
RUN npm run build -w packages/shared

# Generate Prisma client
RUN npx prisma generate --schema=backend/prisma/schema.prisma

# Build backend
RUN npm run build -w backend

# Build frontend (Next.js)
RUN npm run build -w frontend

# ---- Stage 3: Production image ----
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy node_modules (production only)
COPY --from=deps /app/node_modules ./node_modules

# Copy shared package
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# Copy backend
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/package.json ./backend/

# Copy frontend (Next.js build output)
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/node_modules/next ./frontend/node_modules/next 2>/dev/null || true
COPY --from=builder /app/frontend/package.json ./frontend/
COPY --from=builder /app/frontend/next.config.js ./frontend/
COPY --from=builder /app/frontend/public ./frontend/public

# Copy root package.json
COPY --from=builder /app/package.json ./

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

CMD ["node", "backend/dist/index.js"]
