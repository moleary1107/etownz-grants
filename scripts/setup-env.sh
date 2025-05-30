#!/bin/bash

# Environment Setup Script for eTownz Grants
set -e

ENVIRONMENT=${1:-production}

echo "🔧 Setting up environment variables for: $ENVIRONMENT"

# Create environment-specific .env file
if [ "$ENVIRONMENT" = "staging" ]; then
    ENV_FILE=".env.staging"
    echo "📝 Creating staging environment file..."
    cat > "$ENV_FILE" << EOF
# Staging Environment Configuration
NODE_ENV=staging

# API Keys
OPENAI_API_KEY=${OPENAI_API_KEY}
FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}
PINECONE_API_KEY=${PINECONE_API_KEY}

# Authentication
JWT_SECRET=${JWT_SECRET}

# Database (Staging)
DATABASE_URL=${STAGING_DATABASE_URL}
REDIS_URL=${STAGING_REDIS_URL}

# External Services
SENDGRID_API_KEY=${SENDGRID_API_KEY}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}

# Digital Ocean
DO_SPACES_KEY=${DO_SPACES_KEY}
DO_SPACES_SECRET=${DO_SPACES_SECRET}
DO_SPACES_ENDPOINT=${DO_SPACES_ENDPOINT}
DO_SPACES_BUCKET=${DO_SPACES_BUCKET}

# Database Password
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Monitoring
SENTRY_DSN=${SENTRY_DSN}

# Deployment
DO_STAGING_DROPLET_IP=${DO_STAGING_DROPLET_IP}
DO_STAGING_SSH_KEY_PATH=${DO_STAGING_SSH_KEY_PATH}
DOMAIN_NAME=staging.grants.etownz.com
EOF

elif [ "$ENVIRONMENT" = "production" ]; then
    ENV_FILE=".env.production"
    echo "📝 Creating production environment file..."
    cat > "$ENV_FILE" << EOF
# Production Environment Configuration
NODE_ENV=production

# API Keys
OPENAI_API_KEY=${OPENAI_API_KEY}
FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}
PINECONE_API_KEY=${PINECONE_API_KEY}

# Authentication
JWT_SECRET=${JWT_SECRET}

# Database (Production)
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}

# External Services
SENDGRID_API_KEY=${SENDGRID_API_KEY}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}

# Digital Ocean
DO_SPACES_KEY=${DO_SPACES_KEY}
DO_SPACES_SECRET=${DO_SPACES_SECRET}
DO_SPACES_ENDPOINT=${DO_SPACES_ENDPOINT}
DO_SPACES_BUCKET=${DO_SPACES_BUCKET}

# Database Password
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Monitoring
SENTRY_DSN=${SENTRY_DSN}

# Deployment
DO_DROPLET_IP=${DO_DROPLET_IP}
DO_SSH_KEY_PATH=${DO_SSH_KEY_PATH}
DOMAIN_NAME=grants.etownz.com
EOF

else
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "   Valid options: staging, production"
    exit 1
fi

echo "✅ Environment file created: $ENV_FILE"

# Validate required environment variables
echo "🔍 Validating required environment variables..."
REQUIRED_VARS=(
    "OPENAI_API_KEY"
    "JWT_SECRET"
    "DATABASE_URL"
    "REDIS_URL"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please set these variables in your environment or .env file"
    exit 1
fi

echo "✅ All required environment variables are set"

# Secure the environment file
chmod 600 "$ENV_FILE"
echo "🔒 Environment file permissions set to 600"

echo "🎉 Environment setup complete for $ENVIRONMENT!"
echo "📁 Environment file: $ENV_FILE"
echo ""
echo "Next steps:"
echo "  1. Source the environment file: source $ENV_FILE"
echo "  2. Deploy using: ./scripts/deploy-to-do.sh --env $ENVIRONMENT"