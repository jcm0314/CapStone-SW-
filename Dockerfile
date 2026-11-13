# Stage 1: Build Environment
FROM node:22-alpine AS builder

WORKDIR /app

# Build-time public config (Vite inlines VITE_* at build time; .env files are excluded by .dockerignore)
# 필수: docker build --build-arg VITE_API_GATEWAY_URL=https://<gateway-host> .
# 없으면 프론트가 자기 nginx 의 /api 를 호출해 "Unexpected token '<'" 가 나므로 의존성 설치 전에 바로 실패합니다 (#24, docs/DEPLOY.md)
ARG VITE_API_GATEWAY_URL
RUN if [ -z "$VITE_API_GATEWAY_URL" ]; then \
      echo "❌ VITE_API_GATEWAY_URL build-arg 가 필요합니다. 예: docker build --build-arg VITE_API_GATEWAY_URL=https://<gateway-host> ." >&2; \
      exit 1; \
    fi
ENV VITE_API_GATEWAY_URL=${VITE_API_GATEWAY_URL}
# 선택: Spring 코어 API 주소. 비우면 Spring 연동이 꺼진 빌드가 됩니다.
ARG VITE_SPRING_API_URL=
ENV VITE_SPRING_API_URL=${VITE_SPRING_API_URL}

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
