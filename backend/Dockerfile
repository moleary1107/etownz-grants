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

# Install PostgreSQL client and netcat for migrations
RUN apk add --no-cache postgresql-client netcat-openbsd

# Install production dependencies only
COPY package.json ./
RUN npm install --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy migrations and scripts
COPY src/migrations ./src/migrations
COPY src/migrations ./dist/migrations
COPY src/scripts ./src/scripts

# Make startup script executable
RUN chmod +x /app/src/scripts/start-with-migrations.sh

# Expose port
EXPOSE 3001

# Start with migrations
CMD ["/app/src/scripts/start-with-migrations.sh"]