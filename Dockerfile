# Multi-stage Dockerfile for ASEM Server
# Supports both development and production builds

# Base stage - common dependencies
FROM node:18-alpine AS base
WORKDIR /app

# Install dumb-init for proper signal handling and su-exec for privilege dropping
RUN apk add --no-cache dumb-init su-exec

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
ENV NODE_ENV=development

# Install all dependencies (including devDependencies for nodemon)
RUN npm install

# Copy source code
COPY . .

# Expose application port
EXPOSE 5001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start with nodemon for hot-reload
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code and root-level models
COPY src ./src
COPY emailVerification.model.js ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Copy entrypoint script — runs as root to fix bind-mount volume ownership
# then drops to nodejs user via su-exec before starting the app
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Note: no USER directive — entrypoint.sh handles privilege drop at runtime

# Expose application port
EXPOSE 5001

# Use dumb-init for signal handling, then run entrypoint which drops to nodejs
ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/entrypoint.sh"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
