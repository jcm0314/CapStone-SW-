# Stage 1: Build Environment
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first for efficient Docker layer caching
COPY package.json package-lock.json ./

# Install dependencies deterministically
RUN npm ci

# Copy full application source code
COPY . .

# Run production build
RUN npm run build

# Stage 2: Production Nginx Web Server
FROM nginx:alpine AS runner

# Remove default Nginx configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose ports 8080 and 80 for GCP Cloud Run and K8s compatibility
EXPOSE 8080 80

# Healthcheck for container status monitoring
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
