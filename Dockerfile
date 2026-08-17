# ----------------------------------------------------------------------------
# Full Node image to compile TypeScript. The --ignore-scripts flag skips
# lifecycle hooks (prepare, postinstall) during npm ci, which is intentional
# for security: we then build packages explicitly in the order we need them.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first to exploit Docker layer cache. Layers below only
# re-run when package*.json changes, not on every source edit.
COPY package.json package-lock.json* ./
COPY packages/classifier/package.json ./packages/classifier/
RUN npm ci --ignore-scripts

# Copy source now that deps are installed
COPY packages/classifier/ ./packages/classifier/
COPY src/ ./src/
COPY nest-cli.json tsconfig.json tsconfig.build.json drizzle.config.ts ./

# Build in dependency order:
#   1. Shared workspace package: gateway TypeScript compilation depends on it
#   2. NestJS gateway: imports @token-pilot/classifier via workspace symlink
RUN npm run build --workspace=packages/classifier
RUN npx nest build

# ----------------------------------------------------------------------------
# Minimal image: only compiled JS, production deps, and the built classifier.
FROM node:20-alpine

WORKDIR /app

# Install production deps only. --ignore-scripts is safe here because we're
# not building anything; all TypeScript was compiled in the builder stage.
COPY package.json package-lock.json* ./
COPY packages/classifier/package.json ./packages/classifier/
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled gateway output. nest build preserves the src/ subfolder
# in the output (dist/src/...) because no rootDir is set in tsconfig.
COPY --from=builder /app/dist ./dist

# Copy built classifier package: the gateway requires this at runtime via
# the workspace symlink (@token-pilot/classifier -> packages/classifier/dist)
COPY --from=builder /app/packages/classifier/dist ./packages/classifier/dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/src/main"]
