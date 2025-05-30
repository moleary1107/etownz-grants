#!/bin/bash

# Deploy by building on the DigitalOcean server
set -e

echo "🚀 Deploying to DigitalOcean by building on server..."

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

echo "🔄 Connecting to server and deploying..."

ssh -i $DO_SSH_KEY_PATH root@$DO_DROPLET_IP << 'EOF'
    set -e
    
    echo "📍 Setting up project directory..."
    mkdir -p /opt/etownz-grants
    cd /opt/etownz-grants
    
    # Check if repo exists, clone if not
    if [ ! -d ".git" ]; then
        echo "📥 Cloning repository..."
        git clone https://github.com/moleary1107/etownz-grants.git . || {
            echo "⚠️  Public repo not accessible, trying alternative method..."
            # If the repo is private or doesn't exist, we'll copy the code instead
            echo "Repository cloning failed. Please manually upload the code to /opt/etownz-grants"
            exit 1
        }
    fi
    
    # Pull latest changes
    echo "🔄 Pulling latest code..."
    git fetch origin
    git checkout develop
    git pull origin develop
    
    # Create necessary directories
    echo "📁 Creating directories..."
    mkdir -p uploads documents templates
    
    # Create production docker-compose override
    echo "📝 Creating production configuration..."
    cat > docker-compose.override.yml << 'COMPOSE'
services:
  frontend:
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://grants.etownz.com/api
    restart: unless-stopped

  backend:
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  mcp-docs:
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  mcp-fetch:
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  mcp-filesystem:
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  mcp-document-processor:
    environment:
      - NODE_ENV=production
    restart: unless-stopped
COMPOSE

    # Create/update .env file if it doesn't exist
    if [ ! -f .env ]; then
        echo "📝 Creating .env file..."
        cat > .env << 'ENVEOF'
NODE_ENV=production
DATABASE_URL=postgresql://postgres:password@postgres:5432/etownz_grants
REDIS_URL=redis://redis:6379
JWT_SECRET=your_production_jwt_secret_here_$(openssl rand -base64 32)
POSTGRES_PASSWORD=your_secure_postgres_password_$(openssl rand -base64 32)
DOMAIN_NAME=grants.etownz.com
OPENAI_API_KEY=your_openai_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key
PINECONE_API_KEY=your_pinecone_api_key
ENVEOF
        echo "⚠️  Please update the .env file with your actual API keys!"
    fi
    
    # Stop existing containers
    echo "🛑 Stopping existing services..."
    docker-compose down || true
    
    # Build and start services
    echo "🏗️ Building and starting services..."
    docker-compose up -d --build
    
    # Wait for services to start
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    # Show status
    echo "📊 Service status:"
    docker-compose ps
    
    # Show logs from last few lines
    echo "📜 Recent logs:"
    docker-compose logs --tail=20
    
    echo "✅ Deployment complete!"
    echo ""
    echo "🌐 Services running on:"
    echo "   - Frontend: http://$HOSTNAME:3001"
    echo "   - Backend API: http://$HOSTNAME:8000"
    echo "   - MCP Docs: http://$HOSTNAME:9000"
    echo "   - MCP Fetch: http://$HOSTNAME:9001"
    echo "   - MCP Filesystem: http://$HOSTNAME:9002"
    echo "   - MCP Document Processor: http://$HOSTNAME:9003"
EOF

echo ""
echo "🎉 Deployment process completed!"
echo "🌐 Your app should be available at: https://grants.etownz.com"
echo ""
echo "📝 Next steps:"
echo "   1. SSH into the server and update the .env file with your API keys"
echo "   2. Configure Nginx to proxy the services"
echo "   3. Set up SSL certificates with Let's Encrypt"
echo ""
echo "To check the status, run:"
echo "   ssh -i $DO_SSH_KEY_PATH root@$DO_DROPLET_IP 'cd /opt/etownz-grants && docker-compose ps'"