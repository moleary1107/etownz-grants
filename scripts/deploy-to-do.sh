#!/bin/bash

# DigitalOcean Deployment Script for eTownz Grants
set -e

echo "🚀 Deploying eTownz Grants to DigitalOcean..."

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

if [ -z "$DO_DROPLET_IP" ]; then
    echo "❌ DO_DROPLET_IP not set in .env file"
    exit 1
fi

# Build and push Docker images
echo "🏗️ Building Docker images..."
docker-compose build

# Tag and push to DigitalOcean Container Registry
echo "📦 Pushing to DigitalOcean Container Registry..."
docker tag etownz_grants-frontend registry.digitalocean.com/etownz/frontend:latest
docker tag etownz_grants-backend registry.digitalocean.com/etownz/backend:latest
docker tag etownz_grants-mcp-docs registry.digitalocean.com/etownz/mcp-docs:latest
docker tag etownz_grants-mcp-fetch registry.digitalocean.com/etownz/mcp-fetch:latest
docker tag etownz_grants-mcp-filesystem registry.digitalocean.com/etownz/mcp-filesystem:latest
docker tag etownz_grants-mcp-document-processor registry.digitalocean.com/etownz/mcp-document-processor:latest

docker push registry.digitalocean.com/etownz/frontend:latest
docker push registry.digitalocean.com/etownz/backend:latest
docker push registry.digitalocean.com/etownz/mcp-docs:latest
docker push registry.digitalocean.com/etownz/mcp-fetch:latest
docker push registry.digitalocean.com/etownz/mcp-filesystem:latest
docker push registry.digitalocean.com/etownz/mcp-document-processor:latest

# Deploy to droplet
echo "🚀 Deploying to droplet..."
ssh -i $DO_SSH_KEY_PATH root@$DO_DROPLET_IP << 'EOF'
    cd /opt/etownz-grants
    
    # Pull latest changes
    git pull origin develop
    
    # Pull Docker images
    docker-compose -f docker-compose.prod.yml pull
    
    # Update services
    docker-compose -f docker-compose.prod.yml up -d
    
    # Cleanup old images
    docker system prune -f
    
    echo "✅ Deployment complete!"
EOF

echo "🎉 Deployment successful!"
echo "🌐 Your app should be available at: https://$DOMAIN_NAME"