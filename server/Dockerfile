FROM node:20-alpine AS runner

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy server code
COPY server/ ./server/

EXPOSE 8080 3001

# Healthcheck endpoint supporting Cloud Run process.env.PORT (8080) and local 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "server/index.js"]
