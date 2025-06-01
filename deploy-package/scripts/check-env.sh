#!/bin/bash

# Environment Variables Check Script
echo "🔍 Checking environment variables..."

# Load .env file
if [ -f .env ]; then
    source .env
else
    echo "❌ .env file not found!"
    exit 1
fi

# Check required variables
REQUIRED_VARS=(
    "OPENAI_API_KEY"
    "FIRECRAWL_API_KEY" 
    "PINECONE_API_KEY"
    "DO_DROPLET_IP"
    "POSTGRES_PASSWORD"
    "RABBITMQ_PASS"
    "SENTRY_DSN"
)

OPTIONAL_VARS=(
    "SENDGRID_API_KEY"
    "STRIPE_SECRET_KEY"
    "DO_SPACES_KEY"
    "DO_SPACES_SECRET"
)

echo ""
echo "📋 Required Variables:"
all_required_set=true
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"your_"*"_here" ]]; then
        echo "❌ $var: NOT SET"
        all_required_set=false
    else
        echo "✅ $var: SET (${!var:0:10}...)"
    fi
done

echo ""
echo "📋 Optional Variables:"
for var in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"your_"*"_here" ]]; then
        echo "⚠️  $var: NOT SET"
    else
        echo "✅ $var: SET (${!var:0:10}...)"
    fi
done

echo ""
if [ "$all_required_set" = true ]; then
    echo "✅ All required environment variables are set!"
    echo "🚀 Ready for deployment!"
    
    # Check if droplet is accessible
    if [ "$DO_DROPLET_IP" != "your_droplet_ip_here" ]; then
        echo ""
        echo "🔗 Testing droplet connection..."
        if ping -c 1 "$DO_DROPLET_IP" > /dev/null 2>&1; then
            echo "✅ Droplet is reachable at $DO_DROPLET_IP"
        else
            echo "⚠️  Cannot reach droplet at $DO_DROPLET_IP"
            echo "   Make sure your droplet is running and IP is correct"
        fi
    fi
    
    echo ""
    echo "🎯 Next steps:"
    echo "   1. ./scripts/setup-droplet.sh    (if not done already)"
    echo "   2. ./scripts/deploy-to-do.sh     (deploy application)"
    
else
    echo "❌ Some required variables are missing!"
    echo "   Please update your .env file before deployment."
fi