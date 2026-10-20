# syntax=docker/dockerfile:1.7

# ---- build: install deps, run quality gates, produce static assets ----
FROM node:22.12.0-alpine3.21 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run lint && npm run test && npm run build

# ---- runtime: unprivileged nginx serving static files only ----
FROM nginxinc/nginx-unprivileged:1.27.3-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Default custom-tools list baked into the image; docker-compose.yml bind-mounts ./config over it for live edits.
COPY config /usr/share/nginx/html/config
EXPOSE 8080
USER 101
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
