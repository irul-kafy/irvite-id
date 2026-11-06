FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies needed for native modules
RUN apk add --no-cache python3 make g++ git

# Copy root manifests and lockfile
COPY package*.json ./
COPY turbo.json ./

# Copy workspaces manifests
COPY apps/api-server/package*.json ./apps/api-server/
COPY packages/database/package*.json ./packages/database/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy database schema and source code
COPY packages/database ./packages/database
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

COPY apps/api-server ./apps/api-server

# Build api-server
RUN npm run build --workspace=apps/api-server

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime dependencies
RUN apk add --no-cache openssl

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-server/node_modules ./apps/api-server/node_modules
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/apps/api-server/package*.json ./apps/api-server/
COPY --from=builder /app/apps/api-server/dist ./apps/api-server/dist
COPY --from=builder /app/package*.json ./

# Create storage directory for Baileys sessions with write permissions
RUN mkdir -p /app/storage/wa-sessions && chmod -R 777 /app/storage

EXPOSE 3000

CMD ["npm", "run", "start:prod", "--workspace=apps/api-server"]
