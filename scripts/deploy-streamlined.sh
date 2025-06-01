#!/bin/bash

# Streamlined DigitalOcean Deployment Script (Registry-Optimized)
# Only pushes essential services to registry, MCP servers build locally
set -e

SERVICE=""
ENVIRONMENT="production"
FORCE_REBUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --service|-s)
            SERVICE="$2"
            shift 2
            ;;
        --env|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --force-rebuild|-f)
            FORCE_REBUILD=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--service SERVICE] [--env ENVIRONMENT] [--force-rebuild]"
            echo "  --service: Deploy specific service (frontend, backend, crawler)"
            echo "  --env: Environment (production, staging) - default: production"
            echo "  --force-rebuild: Force rebuild of Docker images"
            echo ""
            echo "Registry Services (pushed to DO registry):"
            echo "  - frontend, backend, crawler"
            echo ""
            echo "Local Services (built on server):"
            echo "  - mcp-docs, mcp-fetch, mcp-filesystem, mcp-document-processor"
            exit 0
            ;;
        *)
            SERVICE="$1"
            shift
            ;;
    esac
done

echo "🚀 Deploying eTownz Grants to DigitalOcean (Streamlined)..."
echo "📋 Environment: $ENVIRONMENT"
echo "📦 Registry Services: frontend, backend, crawler"
echo "🏗️ Local Build Services: MCP servers"

if [ -n "$SERVICE" ]; then
    echo "🎯 Service: $SERVICE"
fi

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Validate required environment variables
DROPLET_IP_VAR="DO_DROPLET_IP"
SSH_KEY_VAR="DO_SSH_KEY_PATH"
if [ "$ENVIRONMENT" = "staging" ]; then
    DROPLET_IP_VAR="DO_STAGING_DROPLET_IP"
    SSH_KEY_VAR="DO_STAGING_SSH_KEY_PATH"
fi

DROPLET_IP="${!DROPLET_IP_VAR}"
SSH_KEY_PATH="${!SSH_KEY_VAR}"

if [ -z "$DROPLET_IP" ]; then
    echo "❌ $DROPLET_IP_VAR not set in .env file"
    exit 1
fi

if [ -z "$SSH_KEY_PATH" ]; then
    echo "❌ $SSH_KEY_VAR not set in .env file"
    exit 1
fi

# Set deployment target architecture
export DOCKER_DEFAULT_PLATFORM=linux/amd64

# Login to DigitalOcean Container Registry
echo "🔐 Logging in to DigitalOcean Container Registry..."
if [ -n "$DO_REGISTRY_TOKEN" ]; then
    echo "$DO_REGISTRY_TOKEN" | docker login registry.digitalocean.com -u DO_REGISTRY_TOKEN --password-stdin
else
    echo "⚠️  DO_REGISTRY_TOKEN not set. Attempting to use doctl for authentication..."
    if command -v doctl &> /dev/null; then
        doctl registry login
    else
        echo "❌ Neither DO_REGISTRY_TOKEN nor doctl is available. Please set up authentication."
        echo "   You can get a registry token from: https://cloud.digitalocean.com/registry"
        exit 1
    fi
fi

# Define only essential services for registry (stay within 5-repo limit)
REGISTRY_SERVICES=(frontend backend crawler)
if [ -n "$SERVICE" ]; then
    if [[ " ${REGISTRY_SERVICES[@]} " =~ " ${SERVICE} " ]]; then
        REGISTRY_SERVICES=($SERVICE)
    else
        echo "ℹ️  Service '$SERVICE' is a local-build service (MCP). Skipping registry push."
        REGISTRY_SERVICES=()
    fi
fi

# Build and push only essential services to registry
if [ ${#REGISTRY_SERVICES[@]} -gt 0 ]; then
    echo "🏗️ Building registry services for AMD64 architecture..."
    for service in "${REGISTRY_SERVICES[@]}"; do
        echo "📦 Building $service..."
        
        build_args=""
        if [ "$FORCE_REBUILD" = true ]; then
            build_args="--no-cache"
        fi
        
        docker build --platform linux/amd64 $build_args \
            -t "registry.digitalocean.com/etownz-grants-container/$service:latest" \
            -f "$service/Dockerfile.dev" \
            "$service/"
        
        echo "🚀 Pushing $service to registry..."
        docker push "registry.digitalocean.com/etownz-grants-container/$service:latest"
    done
else
    echo "ℹ️  No registry services to build/push."
fi

# Deploy to droplet
echo "🚀 Deploying to droplet ($ENVIRONMENT)..."

# Use streamlined compose file
COMPOSE_FILE="docker-compose.prod-streamlined.yml"
DEPLOY_PATH="/opt/etownz-grants"
if [ "$ENVIRONMENT" = "staging" ]; then
    DEPLOY_PATH="/opt/etownz-grants-staging"
fi

ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$DROPLET_IP" << EOF
    set -e
    cd $DEPLOY_PATH
    
    echo "📥 Pulling latest changes..."
    git fetch origin
    git checkout develop
    git pull origin develop
    
    echo "🐳 Pulling registry images..."
    docker compose -f $COMPOSE_FILE pull frontend backend crawler || true
    
    echo "🔄 Updating services..."
    if [ -n "$SERVICE" ]; then
        echo "🎯 Restarting specific service: $SERVICE"
        docker compose -f $COMPOSE_FILE up -d --build --force-recreate $SERVICE
    else
        echo "🔄 Restarting all services (registry images pulled, MCP built locally)"
        docker compose -f $COMPOSE_FILE up -d --build --force-recreate
    fi
    
    echo "🧹 Cleaning up old images..."
    docker system prune -f
    
    echo "📊 Deployment status:"
    docker compose -f $COMPOSE_FILE ps
    
    echo "✅ Deployment complete!"
EOF

# Health check
echo "🏥 Performing health check..."
sleep 15

HEALTH_URL="https://grants.etownz.com"
if [ "$ENVIRONMENT" = "staging" ]; then
    HEALTH_URL="http://$DROPLET_IP:3001"
fi

if curl -sf "$HEALTH_URL/api/health" > /dev/null 2>&1; then
    echo "✅ API health check passed!"
else
    echo "⚠️  API health check failed - checking frontend..."
fi

if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo "✅ Frontend health check passed!"
else
    echo "⚠️  Health check failed - please verify deployment manually"
fi

echo ""
echo "🎉 Deployment successful!"
echo "🌐 Your app should be available at: $HEALTH_URL"
echo ""
echo "📝 Registry Usage:"
echo "   ✅ frontend, backend, crawler (in DO registry)"
echo "   🏗️ MCP servers (built locally on server)"
echo ""
echo "🧪 Test dynamic routes:"
echo "   - $HEALTH_URL/dashboard/applications/1"
echo "   - $HEALTH_URL/dashboard/applications/2"
echo "   - $HEALTH_URL/dashboard/applications/5"