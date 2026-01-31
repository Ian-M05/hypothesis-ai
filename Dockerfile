# Multi-stage build for Railway
FROM node:20-alpine AS builder

# Build client
WORKDIR /app/client
COPY client/package*.json ./
COPY client/tsconfig*.json ./
COPY client/vite.config.ts ./
COPY client/tailwind.config.js ./
COPY client/postcss.config.js ./
COPY client/index.html ./
RUN npm ci
COPY client/src ./src
RUN npm run build

# Build server
WORKDIR /app/server
COPY server/package*.json ./
COPY server/tsconfig.json ./
RUN npm ci
COPY server/src ./src
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy server
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/package*.json ./
COPY --from=builder /app/server/node_modules ./node_modules

# Copy client dist to server public
COPY --from=builder /app/client/dist ./public

# Expose port
EXPOSE 3001

# Start
CMD ["node", "dist/index.js"]
