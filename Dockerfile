# ─────────────────────────────────────────────
# 1) Build React frontend
# ─────────────────────────────────────────────
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files and install
COPY p2p-fileshare-frontend/package*.json ./
RUN npm ci --only=production

# Copy all frontend source and build
COPY p2p-fileshare-frontend/ ./
RUN npm run build

# ─────────────────────────────────────────────
# 2) Build Go backend (with CGO + SQLite)
# ─────────────────────────────────────────────
FROM golang:1.24-alpine AS backend-builder

# Install C toolchain + SQLite dev for go-sqlite3
RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

# Copy Go modules and download deps
COPY go.mod go.sum ./
RUN go mod download

# Copy backend code
COPY p2p-fileshare ./p2p-fileshare

# Copy built frontend into the location expected by Go server
COPY --from=frontend-builder /app/frontend/build ./frontend_build

# Build Go binary with CGO enabled
ENV CGO_ENABLED=1
RUN cd p2p-fileshare && go build -o ../app .

# ─────────────────────────────────────────────
# 3) Final runtime image
# ─────────────────────────────────────────────
FROM alpine:latest

# Install only the runtime SQLite library and curl for health checks
RUN apk add --no-cache sqlite-libs curl

WORKDIR /root/

# Copy compiled Go binary and built static files
COPY --from=backend-builder /app/app .
COPY --from=backend-builder /app/frontend_build ./frontend_build

# Create data directory for persistent storage
RUN mkdir -p /root/data

# Expose port and start
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["./app"]
