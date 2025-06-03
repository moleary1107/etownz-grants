# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

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

# Install production dependencies only
COPY package.json ./
RUN npm install --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy any required config files
COPY src/config ./src/config

# Expose port
EXPOSE 8002

# Start the server
CMD ["node", "dist/index.js"]