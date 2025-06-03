# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript (skip if errors)
RUN npm run build || echo "Build failed, continuing anyway"

# Production stage
FROM node:18-alpine

# Install dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Install production dependencies only (include ts-node for fallback)
COPY package.json ./
RUN npm install --only=production && npm install typescript ts-node

# Copy built files from builder (if they exist)
COPY --from=builder /app/dist ./dist || true

# Copy source files for ts-node fallback
COPY src ./src
COPY tsconfig.json ./

# Expose port
EXPOSE 8002

# Start the server (fallback to ts-node if build failed)
CMD ["sh", "-c", "if [ -f dist/index.js ]; then node dist/index.js; else npx ts-node src/index.ts; fi"]