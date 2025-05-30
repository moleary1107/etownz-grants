#!/bin/bash

# Direct deployment to DigitalOcean without Container Registry
set -e

echo "🚀 Direct deployment to DigitalOcean Droplet..."

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

# Check if SSH key exists
if [ ! -f "$DO_SSH_KEY_PATH" ]; then
    DO_SSH_KEY_PATH="$HOME/.ssh/id_rsa"
fi

echo "📦 Building Docker images locally..."
docker-compose build

echo "🔄 Saving Docker images..."
mkdir -p ./deploy-tmp

docker save etownz_grants-frontend:latest -o ./deploy-tmp/frontend.tar
docker save etownz_grants-backend:latest -o ./deploy-tmp/backend.tar
docker save etownz_grants-mcp-docs:latest -o ./deploy-tmp/mcp-docs.tar
docker save etownz_grants-mcp-fetch:latest -o ./deploy-tmp/mcp-fetch.tar
docker save etownz_grants-mcp-filesystem:latest -o ./deploy-tmp/mcp-filesystem.tar
docker save etownz_grants-mcp-document-processor:latest -o ./deploy-tmp/mcp-document-processor.tar

echo "📤 Transferring images to server..."
scp -i $DO_SSH_KEY_PATH ./deploy-tmp/*.tar root@$DO_DROPLET_IP:/tmp/

echo "🚀 Deploying on server..."
ssh -i $DO_SSH_KEY_PATH root@$DO_DROPLET_IP << 'EOF'
    echo "Loading Docker images..."
    docker load -i /tmp/frontend.tar
    docker load -i /tmp/backend.tar
    docker load -i /tmp/mcp-docs.tar
    docker load -i /tmp/mcp-fetch.tar
    docker load -i /tmp/mcp-filesystem.tar
    docker load -i /tmp/mcp-document-processor.tar
    
    echo "Cleaning up transferred files..."
    rm -f /tmp/*.tar
    
    # Create project directory if it doesn't exist
    mkdir -p /opt/etownz-grants
    cd /opt/etownz-grants
    
    # Check if repo exists, clone if not
    if [ ! -d ".git" ]; then
        git clone https://github.com/moleary1107/etownz-grants.git .
    fi
    
    # Pull latest changes
    git fetch origin
    git checkout develop
    git pull origin develop
    
    # Create necessary directories
    mkdir -p uploads documents templates
    
    # Update images in docker-compose.prod.yml to use local images
    sed -i 's|registry.digitalocean.com/etownz/||g' docker-compose.prod.yml
    sed -i 's|:latest|:latest|g' docker-compose.prod.yml
    
    # Copy environment file if exists
    if [ ! -f .env ]; then
        echo "Creating .env file..."
        cat > .env << 'ENVEOF'
NODE_ENV=production
DATABASE_URL=postgresql://postgres:password@postgres:5432/etownz_grants
REDIS_URL=redis://redis:6379
JWT_SECRET=your_production_jwt_secret_here
POSTGRES_PASSWORD=your_secure_postgres_password
DOMAIN_NAME=grants.etownz.com
ENVEOF
    fi
    
    # Start services
    echo "Starting services..."
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d
    
    # Show status
    docker-compose -f docker-compose.prod.yml ps
    
    echo "✅ Deployment complete!"
EOF

# Cleanup local temp files
echo "🧹 Cleaning up local files..."
rm -rf ./deploy-tmp

echo "🎉 Deployment successful!"
echo "🌐 Your app should be available at: https://grants.etownz.com"
echo ""
echo "📝 Note: Make sure to:"
echo "   1. Update the .env file on the server with your API keys"
echo "   2. Configure Nginx to proxy to the correct ports"
echo "   3. Set up SSL certificates with Let's Encrypt"