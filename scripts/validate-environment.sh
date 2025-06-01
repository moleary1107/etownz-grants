#!/bin/bash
#
# Environment Validation Script
# Validates all required environment variables and API keys before deployment
#

set -e

echo "🔍 Environment Validation"
echo "========================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

validation_errors=0
validation_warnings=0

# Function to check if variable exists and is not empty
check_required_var() {
    local var_name=$1
    local var_value="${!var_name}"
    local description=$2
    local is_secret=${3:-false}
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ $var_name: Missing${NC} - $description"
        validation_errors=$((validation_errors + 1))
        return 1
    else
        if [ "$is_secret" = true ]; then
            # Only show first few characters for secrets
            masked_value="${var_value:0:8}..."
            echo -e "${GREEN}✅ $var_name: Set${NC} ($masked_value) - $description"
        else
            echo -e "${GREEN}✅ $var_name: Set${NC} ($var_value) - $description"
        fi
        return 0
    fi
}

# Function to check API key format
check_api_key_format() {
    local var_name=$1
    local var_value="${!var_name}"
    local expected_prefix=$2
    local description=$3
    
    if [ -n "$var_value" ]; then
        if [[ $var_value == $expected_prefix* ]]; then
            echo -e "${GREEN}✅ $var_name: Valid format${NC} - $description"
            return 0
        else
            echo -e "${RED}❌ $var_name: Invalid format${NC} - Expected to start with '$expected_prefix'"
            validation_errors=$((validation_errors + 1))
            return 1
        fi
    fi
}

# Function to test API connectivity
test_api_connectivity() {
    local service_name=$1
    local test_command=$2
    local description=$3
    
    echo -n "Testing $service_name connectivity... "
    
    if eval "$test_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Connected${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed${NC} - $description"
        validation_warnings=$((validation_warnings + 1))
        return 1
    fi
}

# Load environment files
echo "📁 Loading environment files..."

if [ -f ".env" ]; then
    echo "Loading .env..."
    set -a
    source .env
    set +a
else
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
fi

if [ -f "backend/.env" ]; then
    echo "Loading backend/.env..."
    set -a
    source backend/.env
    set +a
else
    echo -e "${YELLOW}⚠️  backend/.env file not found${NC}"
fi

echo ""
echo "🔑 Core API Keys Validation"
echo "==========================="

# OpenAI API Key
check_required_var "OPENAI_API_KEY" "OpenAI API for AI features" true
check_api_key_format "OPENAI_API_KEY" "sk-" "OpenAI API key"

# Firecrawl API Key
check_required_var "FIRECRAWL_API_KEY" "Web scraping for grant discovery" true
check_api_key_format "FIRECRAWL_API_KEY" "fc-" "Firecrawl API key"

# Pinecone API Key
check_required_var "PINECONE_API_KEY" "Vector database for AI embeddings" true
check_api_key_format "PINECONE_API_KEY" "pcsk_" "Pinecone API key"

echo ""
echo "🗄️  Database Configuration"
echo "=========================="

check_required_var "DATABASE_URL" "Primary database connection" false
check_required_var "POSTGRES_PASSWORD" "Database password" true
check_required_var "REDIS_URL" "Cache database connection" false

echo ""
echo "🔐 Security Configuration"
echo "========================="

check_required_var "JWT_SECRET" "Authentication token security" true

if [ -n "$JWT_SECRET" ]; then
    jwt_length=${#JWT_SECRET}
    if [ $jwt_length -ge 64 ]; then
        echo -e "${GREEN}✅ JWT_SECRET: Sufficient length${NC} ($jwt_length characters)"
    else
        echo -e "${YELLOW}⚠️  JWT_SECRET: Short length${NC} ($jwt_length characters, recommend 64+)"
        validation_warnings=$((validation_warnings + 1))
    fi
fi

echo ""
echo "📧 Email Configuration"
echo "======================"

check_required_var "SENDGRID_API_KEY" "Email service" true
check_required_var "SMTP_HOST" "SMTP server" false
check_required_var "SMTP_PORT" "SMTP port" false

echo ""
echo "💳 Payment Configuration"
echo "========================"

check_required_var "STRIPE_SECRET_KEY" "Payment processing" true
check_api_key_format "STRIPE_SECRET_KEY" "rk_" "Stripe secret key"

echo ""
echo "☁️  Cloud Storage Configuration"
echo "==============================="

check_required_var "DO_SPACES_KEY" "DigitalOcean Spaces access key" true
check_required_var "DO_SPACES_SECRET" "DigitalOcean Spaces secret" true
check_required_var "DO_SPACES_ENDPOINT" "DigitalOcean Spaces endpoint" false
check_required_var "DO_SPACES_BUCKET" "DigitalOcean Spaces bucket" false

echo ""
echo "🚀 Deployment Configuration"
echo "==========================="

check_required_var "DO_DROPLET_IP" "Production server IP" false
check_required_var "DO_REGISTRY_TOKEN" "Container registry token" true
check_required_var "DOMAIN_NAME" "Application domain" false
check_required_var "NEXT_PUBLIC_API_URL" "Frontend API URL" false

echo ""
echo "📊 Monitoring Configuration"
echo "==========================="

check_required_var "SENTRY_DSN" "Error tracking" true

echo ""
echo "🧪 API Connectivity Tests"
echo "========================="

# Test database connection (basic check)
if [ -n "$DATABASE_URL" ]; then
    test_api_connectivity "PostgreSQL" "timeout 5 curl -s '$DATABASE_URL' >/dev/null 2>&1 || true" "Database connectivity"
fi

# Test Redis connection
if [ -n "$REDIS_URL" ]; then
    test_api_connectivity "Redis" "timeout 5 redis-cli -u '$REDIS_URL' ping 2>/dev/null | grep -q PONG" "Redis connectivity"
fi

# Test OpenAI API (if curl is available)
if [ -n "$OPENAI_API_KEY" ] && command -v curl >/dev/null 2>&1; then
    test_api_connectivity "OpenAI API" "curl -s -H 'Authorization: Bearer $OPENAI_API_KEY' 'https://api.openai.com/v1/models' | grep -q 'gpt'" "OpenAI API access"
fi

echo ""
echo "📋 Environment File Security Check"
echo "=================================="

# Check if sensitive files are in git
sensitive_files=(".env" ".env.production" "backend/.env")
for file in "${sensitive_files[@]}"; do
    if [ -f "$file" ]; then
        if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
            echo -e "${RED}❌ $file is tracked by git${NC} - Security risk!"
            validation_errors=$((validation_errors + 1))
        else
            echo -e "${GREEN}✅ $file not tracked by git${NC}"
        fi
    fi
done

echo ""
echo "📊 VALIDATION SUMMARY"
echo "====================="

total_issues=$((validation_errors + validation_warnings))

if [ $validation_errors -eq 0 ] && [ $validation_warnings -eq 0 ]; then
    echo -e "${GREEN}🎉 Environment Status: EXCELLENT${NC}"
    echo "All required variables are properly configured!"
    exit_code=0
elif [ $validation_errors -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Environment Status: GOOD (with warnings)${NC}"
    echo "Warnings: $validation_warnings"
    exit_code=1
else
    echo -e "${RED}❌ Environment Status: FAILED${NC}"
    echo "Errors: $validation_errors, Warnings: $validation_warnings"
    exit_code=2
fi

echo ""
echo "💡 Recommendations:"

if [ $validation_errors -gt 0 ]; then
    echo "  • Fix all missing/invalid environment variables before deploying"
    echo "  • Check .env.example for required variable formats"
fi

if [ $validation_warnings -gt 0 ]; then
    echo "  • Review warnings for potential configuration improvements"
    echo "  • Consider strengthening JWT secret if too short"
fi

echo "  • Never commit .env files to git repositories"
echo "  • Regularly rotate API keys and secrets"
echo "  • Use environment-specific configurations for different deployments"

echo ""
echo "🔗 Next Steps:"
echo "  • Run deployment health check: ./scripts/deployment-health-check.sh"
echo "  • Check repository health: ./scripts/check-repo-health.sh"
echo "  • Deploy when all validations pass: ./scripts/deploy-to-do.sh"

exit $exit_code