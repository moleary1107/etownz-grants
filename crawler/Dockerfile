# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript (create empty dist if build fails)
RUN npm run build || mkdir -p dist && echo "console.log('Build failed, using ts-node');" > dist/index.js

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

# Install all dependencies (not just production)
COPY package.json ./
RUN npm install

# Copy everything from builder
COPY --from=builder /app .

# Expose port
EXPOSE 8002

# Start the server (use ts-node directly)
CMD ["npx", "ts-node", "src/index.ts"]