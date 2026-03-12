# ============================================
# DEPENDENCIES STAGE - Install dependencies with Bun
# ============================================
FROM oven/bun:1 AS deps

WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lock ./

# Install all dependencies, including devDependencies required to build
RUN bun install --frozen-lockfile

# ============================================
# BUILD STAGE - Build the application
# ============================================
FROM oven/bun:1 AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN bun run build

# Remove devDependencies after build while keeping runtime modules
RUN rm -rf node_modules && bun install --frozen-lockfile --production

# ============================================
# PRODUCTION STAGE - Minimal runtime image
# ============================================
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/main"]
