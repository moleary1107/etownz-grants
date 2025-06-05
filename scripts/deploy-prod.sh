#!/bin/bash

# Production Deployment Script with Image Management
# This script ensures proper builds and prevents stale image issues

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROD_SERVER="root@165.227.149.136"
PROD_DIR="/root/etownz-grants"
BUILD_TAG=$(date +%Y%m%d-%H%M%S)

echo -e "${GREEN}🚀 Starting Production Deployment${NC}"
echo -e "${YELLOW}Build Tag: ${BUILD_TAG}${NC}"

# 1. Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}Error: Not on main branch. Current branch: $CURRENT_BRANCH${NC}"
    echo "Please switch to main branch before deploying."
    exit 1
fi

# 2. Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}Error: Uncommitted changes detected${NC}"
    echo "Please commit or stash your changes before deploying."
    exit 1
fi

# 3. Pull latest changes
echo -e "${YELLOW}Pulling latest changes...${NC}"
git pull origin main

# 4. Run tests (optional but recommended)
if [ -f "test-all.sh" ]; then
    echo -e "${YELLOW}Running tests...${NC}"
    ./test-all.sh || {
        echo -e "${RED}Tests failed! Aborting deployment.${NC}"
        exit 1
    }
fi

# 5. Push to GitHub
echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push origin main

# 6. Deploy to production server
echo -e "${YELLOW}Deploying to production server...${NC}"

ssh $PROD_SERVER << 'ENDSSH'
set -e
cd /root/etownz-grants

echo "📥 Pulling latest code..."
git pull origin main

echo "🔍 Current Docker images:"
docker images | grep etownz || true

echo "🏗️ Building new images with tag..."
export BUILD_TAG=$(date +%Y%m%d-%H%M%S)
echo "Build tag: $BUILD_TAG"

# Build with specific tags
docker-compose -f docker-compose.prod-local.yml build

echo "🛑 Stopping current containers..."
docker-compose -f docker-compose.prod-local.yml down

echo "🚀 Starting new containers..."
docker-compose -f docker-compose.prod-local.yml up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

echo "🔍 Checking service health..."
docker-compose -f docker-compose.prod-local.yml ps

# Check if frontend is healthy
if curl -f -s http://localhost:3001 > /dev/null; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed"
    docker-compose -f docker-compose.prod-local.yml logs frontend --tail=20
fi

# Check if backend is healthy
if curl -f -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    docker-compose -f docker-compose.prod-local.yml logs backend --tail=20
fi

echo "🧹 Cleaning up old images..."
# Remove old images (keep last 3)
docker images | grep etownz-grants-frontend | tail -n +4 | awk '{print $3}' | xargs -r docker rmi || true
docker images | grep etownz-grants-backend | tail -n +4 | awk '{print $3}' | xargs -r docker rmi || true

echo "📊 Final Docker status:"
docker images | grep etownz
docker ps

ENDSSH

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${YELLOW}🔗 Visit: https://grants.etownz.com${NC}"

# 7. Run post-deployment tests
echo -e "${YELLOW}Running post-deployment tests...${NC}"

# Test frontend
if curl -f -s https://grants.etownz.com > /dev/null; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${RED}❌ Frontend is not accessible${NC}"
fi

# Test backend
if curl -f -s https://grants.etownz.com/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend API is healthy${NC}"
else
    echo -e "${RED}❌ Backend API health check failed${NC}"
fi

# Test knowledge-base page specifically
if curl -f -s https://grants.etownz.com/dashboard/knowledge-base | grep -q "Knowledge Base"; then
    echo -e "${GREEN}✅ Knowledge-base page is working${NC}"
else
    echo -e "${RED}❌ Knowledge-base page check failed${NC}"
fi

echo -e "${GREEN}🎉 Deployment and verification complete!${NC}"