#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /root

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Build and push images to registry
echo "🏗️ Building images..."
docker-compose -f docker-compose.prod.yml build

# Push to registry
echo "📤 Pushing to registry..."
docker-compose -f docker-compose.prod.yml push

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose -f docker-compose.prod.yml pull

# Stop and remove old containers
echo "🛑 Stopping old containers..."
docker-compose -f docker-compose.prod.yml down

# Start new containers
echo "▶️ Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
echo "🗄️ Running database migrations..."
docker exec root-backend-1 npm run seed:demo || echo "Migration script not found, skipping..."

# Clean up old images
echo "🧹 Cleaning up..."
docker system prune -f

# Show status
echo "✅ Deployment complete!"
docker-compose -f docker-compose.prod.yml ps