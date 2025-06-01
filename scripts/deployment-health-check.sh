#!/bin/bash
#
# Deployment Health Check & Rollback Script
# Validates deployment success and provides rollback capability
#

set -e

DOMAIN="grants.etownz.com"
API_TIMEOUT=30
FRONTEND_TIMEOUT=15
MAX_RETRIES=3
ROLLBACK_ENABLED=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --rollback)
            ROLLBACK_ENABLED=true
            shift
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --timeout)
            API_TIMEOUT="$2"
            FRONTEND_TIMEOUT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

echo "🔍 Deployment Health Check"
echo "=========================="
echo "Domain: $DOMAIN"
echo "Timeout: ${API_TIMEOUT}s"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

health_checks_passed=0
total_checks=0
failed_checks=()

# Function to check endpoint
check_endpoint() {
    local url=$1
    local expected_status=$2
    local timeout=$3
    local description=$4
    
    total_checks=$((total_checks + 1))
    echo -n "Checking $description... "
    
    for attempt in $(seq 1 $MAX_RETRIES); do
        if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $timeout "$url" 2>/dev/null); then
            if [ "$response" = "$expected_status" ]; then
                echo -e "${GREEN}✅ OK (HTTP $response)${NC}"
                health_checks_passed=$((health_checks_passed + 1))
                return 0
            else
                echo -e "${RED}❌ FAIL (HTTP $response, expected $expected_status)${NC}"
                if [ $attempt -lt $MAX_RETRIES ]; then
                    echo "  Retrying in 5 seconds... (attempt $((attempt + 1))/$MAX_RETRIES)"
                    sleep 5
                fi
            fi
        else
            echo -e "${RED}❌ FAIL (Connection timeout/error)${NC}"
            if [ $attempt -lt $MAX_RETRIES ]; then
                echo "  Retrying in 5 seconds... (attempt $((attempt + 1))/$MAX_RETRIES)"
                sleep 5
            fi
        fi
    done
    
    failed_checks+=("$description")
    return 1
}

# Function to check container health
check_containers() {
    echo ""
    echo "🐳 Container Health Check"
    echo "========================"
    
    if ssh root@165.227.149.136 "command -v docker >/dev/null 2>&1"; then
        echo "Checking container status..."
        
        containers=$(ssh root@165.227.149.136 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'" 2>/dev/null || echo "")
        
        if [ -n "$containers" ]; then
            echo "$containers"
            
            # Check if all expected containers are running
            expected_containers=("frontend" "backend" "postgres" "redis" "crawler")
            running_containers=$(ssh root@165.227.149.136 "docker ps --format '{{.Names}}'" 2>/dev/null || echo "")
            
            for container in "${expected_containers[@]}"; do
                if echo "$running_containers" | grep -q "$container"; then
                    echo -e "✅ $container container is running"
                    health_checks_passed=$((health_checks_passed + 1))
                else
                    echo -e "${RED}❌ $container container is not running${NC}"
                    failed_checks+=("$container container")
                fi
                total_checks=$((total_checks + 1))
            done
        else
            echo -e "${RED}❌ Could not retrieve container status${NC}"
            failed_checks+=("Container status check")
            total_checks=$((total_checks + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  Docker not available on production server${NC}"
    fi
}

# Function to check deployment logs
check_deployment_logs() {
    echo ""
    echo "📋 Recent Deployment Logs"
    echo "========================="
    
    # Check backend logs for errors
    echo "Backend logs (last 10 lines):"
    backend_logs=$(ssh root@165.227.149.136 "docker logs root-backend-1 --tail 10" 2>/dev/null || echo "Could not retrieve backend logs")
    echo "$backend_logs"
    
    # Check for common error patterns
    if echo "$backend_logs" | grep -qi "error\|failed\|crash"; then
        echo -e "${YELLOW}⚠️  Potential issues detected in backend logs${NC}"
    else
        echo -e "${GREEN}✅ Backend logs look healthy${NC}"
    fi
    
    echo ""
    echo "Frontend logs (last 5 lines):"
    frontend_logs=$(ssh root@165.227.149.136 "docker logs root-frontend-1 --tail 5" 2>/dev/null || echo "Could not retrieve frontend logs")
    echo "$frontend_logs"
}

# Function to store deployment state
store_deployment_state() {
    echo ""
    echo "💾 Storing current deployment state..."
    
    ssh root@165.227.149.136 "
        echo '{
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            \"git_commit\": \"$(git rev-parse HEAD)\",
            \"containers\": {' > /root/deployment-state.json
        
        docker ps --format '\"{{.Names}}\": {\"image\": \"{{.Image}}\", \"status\": \"{{.Status}}\"}' | \
        sed 's/$/,/' | sed '\$s/,\$//' >> /root/deployment-state.json
        
        echo '    }
        }' >> /root/deployment-state.json
    "
    
    echo "✅ Deployment state saved"
}

# Function to rollback deployment
rollback_deployment() {
    echo ""
    echo -e "${YELLOW}🔄 Initiating Rollback...${NC}"
    echo "=========================="
    
    if [ -f "/root/deployment-state.json" ]; then
        echo "Previous deployment state found"
        
        # Get previous git commit
        prev_commit=$(ssh root@165.227.149.136 "jq -r '.git_commit' /root/deployment-state.json 2>/dev/null || echo 'unknown'")
        echo "Previous commit: $prev_commit"
        
        # Reset to previous commit
        if [ "$prev_commit" != "unknown" ] && [ "$prev_commit" != "null" ]; then
            ssh root@165.227.149.136 "cd /root && git reset --hard $prev_commit"
            echo "✅ Git reset to previous commit"
        fi
        
        # Restart containers with previous configuration
        ssh root@165.227.149.136 "cd /root && docker-compose -f docker-compose.prod-clean.yml down && docker-compose -f docker-compose.prod-clean.yml up -d"
        echo "✅ Containers restarted with previous configuration"
        
        echo -e "${GREEN}✅ Rollback completed${NC}"
        
        # Re-run health checks
        echo ""
        echo "🔍 Post-rollback health check..."
        sleep 10
        check_endpoint "https://$DOMAIN" "200" $FRONTEND_TIMEOUT "Frontend after rollback"
        check_endpoint "https://$DOMAIN/api/health" "200" $API_TIMEOUT "API after rollback"
        
    else
        echo -e "${RED}❌ No previous deployment state found - manual intervention required${NC}"
    fi
}

# Main health checks
echo "🌐 Frontend Checks"
echo "=================="
check_endpoint "https://$DOMAIN" "200" $FRONTEND_TIMEOUT "Frontend homepage"
check_endpoint "https://$DOMAIN/auth/login" "200" $FRONTEND_TIMEOUT "Login page"
check_endpoint "https://$DOMAIN/dashboard/applications/ai-powered-environmental-monitoring-system" "200" $FRONTEND_TIMEOUT "Slug-based routing"

echo ""
echo "🔌 API Checks"
echo "============="
check_endpoint "https://$DOMAIN/api/health" "200" $API_TIMEOUT "API health endpoint"

# Container checks
check_containers

# Deployment logs
check_deployment_logs

# Calculate health score
if [ $total_checks -gt 0 ]; then
    health_percentage=$(( (health_checks_passed * 100) / total_checks ))
else
    health_percentage=0
fi

echo ""
echo "📊 DEPLOYMENT HEALTH SUMMARY"
echo "============================="
echo "Checks passed: $health_checks_passed/$total_checks"
echo "Health score: $health_percentage%"

if [ $health_percentage -ge 90 ]; then
    echo -e "${GREEN}🎉 Deployment Status: EXCELLENT${NC}"
    store_deployment_state
    exit_code=0
elif [ $health_percentage -ge 75 ]; then
    echo -e "${GREEN}✅ Deployment Status: GOOD${NC}"
    store_deployment_state
    exit_code=0
elif [ $health_percentage -ge 50 ]; then
    echo -e "${YELLOW}⚠️  Deployment Status: DEGRADED${NC}"
    exit_code=1
else
    echo -e "${RED}❌ Deployment Status: FAILED${NC}"
    exit_code=2
fi

if [ ${#failed_checks[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed checks:${NC}"
    for check in "${failed_checks[@]}"; do
        echo "  • $check"
    done
fi

# Offer rollback if enabled and deployment failed
if [ $ROLLBACK_ENABLED = true ] && [ $exit_code -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Deployment issues detected. Rollback is enabled.${NC}"
    read -p "Do you want to rollback to the previous deployment? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rollback_deployment
    else
        echo "Rollback cancelled. Manual intervention may be required."
    fi
fi

echo ""
echo "🔗 Next steps:"
if [ $exit_code -eq 0 ]; then
    echo "  • Deployment is healthy and ready for use"
    echo "  • Monitor application logs for any issues"
else
    echo "  • Investigate failed checks"
    echo "  • Check application logs: ssh root@165.227.149.136 'docker logs <container-name>'"
    echo "  • Consider rollback: $0 --rollback"
fi

echo "  • Run full health check: ./scripts/check-repo-health.sh"

exit $exit_code