#!/bin/bash

# Deploy by copying code to server and building there
set -e

echo "🚀 Deploying to DigitalOcean by copying code..."

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

# Create deployment package
echo "📦 Creating deployment package..."
rm -rf deploy-package
mkdir -p deploy-package

# Copy necessary files (excluding node_modules and other unnecessary files)
cp -r backend deploy-package/
cp -r frontend deploy-package/
cp -r mcp-servers deploy-package/
cp -r infrastructure deploy-package/
cp -r scripts deploy-package/
cp docker-compose.yml deploy-package/
cp docker-compose.prod.yml deploy-package/
cp package*.json deploy-package/ 2>/dev/null || true
cp .dockerignore deploy-package/ 2>/dev/null || true

# Create a deployment info file
echo "Deployment date: $(date)" > deploy-package/DEPLOYMENT_INFO.txt
echo "Deployed from: $(hostname)" >> deploy-package/DEPLOYMENT_INFO.txt

# Create tarball
echo "🗜️ Compressing files..."
tar -czf deploy-package.tar.gz deploy-package/

# Transfer to server
echo "📤 Transferring to server..."
scp -i $DO_SSH_KEY_PATH deploy-package.tar.gz root@$DO_DROPLET_IP:/tmp/

# Deploy on server
echo "🔄 Deploying on server..."
ssh -i $DO_SSH_KEY_PATH root@$DO_DROPLET_IP << 'EOF'
    set -e
    
    echo "📍 Extracting deployment package..."
    cd /opt
    rm -rf etownz-grants-new
    tar -xzf /tmp/deploy-package.tar.gz
    mv deploy-package etownz-grants-new
    
    # Backup existing deployment if it exists
    if [ -d "etownz-grants" ]; then
        echo "📦 Backing up existing deployment..."
        mv etownz-grants etownz-grants-backup-$(date +%Y%m%d-%H%M%S)
    fi
    
    # Move new deployment into place
    mv etownz-grants-new etownz-grants
    cd etownz-grants
    
    # Create necessary directories
    echo "📁 Creating directories..."
    mkdir -p uploads documents templates
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        echo "📝 Creating .env file..."
        cat > .env << 'ENVEOF'
NODE_ENV=production
DATABASE_URL=postgresql://postgres:password@postgres:5432/etownz_grants
REDIS_URL=redis://redis:6379
JWT_SECRET=jwt_secret_$(openssl rand -hex 32)
POSTGRES_PASSWORD=postgres_pass_$(openssl rand -hex 16)
DOMAIN_NAME=grants.etownz.com
OPENAI_API_KEY=your_openai_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key
PINECONE_API_KEY=your_pinecone_api_key
ENVEOF
        echo "⚠️  Please update the .env file with your actual API keys!"
    fi
    
    # Stop existing containers
    echo "🛑 Stopping existing services..."
    docker-compose down 2>/dev/null || true
    
    # Remove old images to save space
    echo "🧹 Cleaning up old images..."
    docker system prune -f
    
    # Build and start services
    echo "🏗️ Building services (this may take a few minutes)..."
    docker-compose up -d --build
    
    # Wait for services to start
    echo "⏳ Waiting for services to start..."
    sleep 15
    
    # Initialize database if needed
    echo "🗄️ Checking database..."
    docker-compose exec -T postgres psql -U postgres -d etownz_grants -c "SELECT 1;" 2>/dev/null || {
        echo "Database not ready, waiting..."
        sleep 10
    }
    
    # Show status
    echo "📊 Service status:"
    docker-compose ps
    
    echo "✅ Deployment complete!"
    echo ""
    echo "🌐 Services should be running on:"
    echo "   - Frontend: http://165.227.149.136:3001"
    echo "   - Backend API: http://165.227.149.136:8000"
    echo "   - MCP Docs: http://165.227.149.136:9000"
    
    # Clean up
    rm -f /tmp/deploy-package.tar.gz
EOF

# Clean up local files
echo "🧹 Cleaning up local files..."
rm -rf deploy-package deploy-package.tar.gz

echo ""
echo "🎉 Deployment completed!"
echo "🌐 Your app should be accessible at:"
echo "   - http://165.227.149.136:3001 (Frontend)"
echo "   - http://165.227.149.136:8000 (Backend API)"
echo ""
echo "📝 To complete setup:"
echo "   1. SSH into the server: ssh -i $DO_SSH_KEY_PATH root@$DO_DROPLET_IP"
echo "   2. Update /opt/etownz-grants/.env with your API keys"
echo "   3. Configure Nginx for grants.etownz.com domain"
echo "   4. Set up SSL with Let's Encrypt"