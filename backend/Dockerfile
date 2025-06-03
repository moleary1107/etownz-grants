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

WORKDIR /app

# Install production dependencies only
COPY package.json ./
RUN npm install --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy migrations to both locations
COPY src/migrations ./src/migrations
COPY src/migrations ./dist/migrations

# Expose port
EXPOSE 8000

# Start the server
CMD ["node", "dist/index.js"]