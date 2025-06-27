# ==============================================================================
# Build Stage
# ==============================================================================
FROM node:18-alpine AS builder

# Install dependencies needed for building
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY next.config.js ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./

# Install dependencies with npm ci for faster, reliable, deterministic builds
RUN npm ci --only=production --ignore-scripts

# Install devDependencies for build
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Generate Prisma client (if using Prisma)
# RUN npx prisma generate

# Build the application
RUN npm run build

# ==============================================================================
# Production Stage
# ==============================================================================
FROM node:18-alpine AS runner

# Install security updates and runtime dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    tini \
    dumb-init \
    ca-certificates \
    tzdata \
    wget \
    curl \
    netcat-openbsd \
    bash \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy other necessary files
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh

# Create directory for logs and cache
RUN mkdir -p /app/logs /app/.next/cache && \
    chown -R nextjs:nodejs /app/logs /app/.next/cache

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--", "./docker-entrypoint.sh"]

# Start the application
CMD ["node", "server.js"]