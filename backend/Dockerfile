# ============================================
# BUILD STAGE - Install dependencies and build
# ============================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies (if needed for native modules)
# RUN apk add --no-cache python3 make g++

# Copy package files for dependency installation
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

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
CMD ["node", "dist/src/main"]
