# Multi-stage build for Diving Analytics Platform
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js || exit 1

# Run the application
CMD ["node", "index.js"]
