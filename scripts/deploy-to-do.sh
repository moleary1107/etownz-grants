#!/bin/bash

# DigitalOcean Deployment Script for eTownz Grants
set -e

# Parse command line arguments
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
            echo "  --service: Deploy specific service (frontend, backend, etc.)"
            echo "  --env: Environment (production, staging) - default: production"
            echo "  --force-rebuild: Force rebuild of Docker images"
            exit 0
            ;;
        *)
            SERVICE="$1"
            shift
            ;;
    esac
done

echo "🚀 Deploying eTownz Grants to DigitalOcean..."
echo "📋 Environment: $ENVIRONMENT"
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

# Define services to deploy
SERVICES=(frontend backend mcp-docs mcp-fetch mcp-filesystem mcp-document-processor)
if [ -n "$SERVICE" ]; then
    SERVICES=($SERVICE)
fi

# Build and push Docker images with platform targeting
echo "🏗️ Building Docker images for AMD64 architecture..."
for service in "${SERVICES[@]}"; do
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

# Deploy to droplet
echo "🚀 Deploying to droplet ($ENVIRONMENT)..."

# Determine compose file and deployment path
COMPOSE_FILE="docker-compose.prod.yml"
DEPLOY_PATH="/root"
if [ "$ENVIRONMENT" = "staging" ]; then
    COMPOSE_FILE="docker-compose.staging.yml"
    DEPLOY_PATH="/opt/etownz-grants-staging"
fi

ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$DROPLET_IP" << EOF
    set -e
    cd $DEPLOY_PATH
    
    echo "📥 Pulling latest changes..."
    git pull origin main
    
    echo "🐳 Pulling Docker images..."
    docker compose -f $COMPOSE_FILE pull
    
    echo "🔄 Updating services..."
    if [ -n "$SERVICE" ]; then
        echo "🎯 Restarting specific service: $SERVICE"
        docker compose -f $COMPOSE_FILE up -d --force-recreate $SERVICE
    else
        echo "🔄 Restarting all services"
        docker compose -f $COMPOSE_FILE up -d --force-recreate
    fi
    
    echo "🧹 Cleaning up old images..."
    docker system prune -f
    
    echo "📊 Deployment status:"
    docker compose -f $COMPOSE_FILE ps
    
    echo "✅ Deployment complete!"
EOF

# Health check
echo "🏥 Performing health check..."
sleep 10

if [ "$ENVIRONMENT" = "production" ]; then
    HEALTH_URL="https://$DOMAIN_NAME"
else
    HEALTH_URL="http://$DROPLET_IP:3001"
fi

if curl -sf "$HEALTH_URL" > /dev/null; then
    echo "✅ Health check passed!"
else
    echo "⚠️  Health check failed - please verify deployment manually"
fi

echo "🎉 Deployment successful!"
echo "🌐 Your app should be available at: $HEALTH_URL"