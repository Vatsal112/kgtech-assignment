# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Dev deps only needed for TypeScript compilation; native modules not required here.
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS production

# dumb-init for signal handling, wget for healthchecks, build tools for bcrypt native binding.
RUN apk add --no-cache dumb-init wget python3 make g++

ENV NODE_ENV=production

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY package*.json ./

# bcrypt requires postinstall scripts to compile its native .node binding for Alpine.
RUN npm ci --omit=dev && \
    npm cache clean --force && \
    apk del python3 make g++

COPY --from=builder /app/dist ./dist

RUN mkdir -p logs && chown -R appuser:nodejs logs

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
