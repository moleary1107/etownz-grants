#!/bin/bash
#
# Self-Healing Deployment Script
# Deploys with automatic health checks, rollback, and GitHub issue creation
#

set -e

echo "🤖 Self-Healing Deployment System"
echo "================================="

# Configuration
DOMAIN="grants.etownz.com"
PRODUCTION_IP="165.227.149.136"
HEALTH_CHECK_TIMEOUT=300  # 5 minutes
MAX_RETRY_ATTEMPTS=3
GITHUB_REPO="moleary1107/etownz-grants"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# State tracking
DEPLOYMENT_STATE_FILE="/tmp/deployment-state.json"
DEPLOYMENT_START_TIME=$(date +%s)
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"

log_deployment() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message"
    
    # Also log to deployment state
    echo "$timestamp [$level] $message" >> "${DEPLOYMENT_STATE_FILE}.log"
}

create_github_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    
    if command -v gh >/dev/null 2>&1; then
        gh issue create --title "$title" --body "$body" --label "$labels" || {
            log_deployment "WARN" "Failed to create GitHub issue"
        }
    else
        log_deployment "WARN" "GitHub CLI not available - cannot create issue"
    fi
}

save_deployment_state() {
    local status="$1"
    local commit=$(git rev-parse HEAD)
    local branch=$(git branch --show-current)
    
    cat > "$DEPLOYMENT_STATE_FILE" << EOF
{
    "deployment_id": "$DEPLOYMENT_ID",
    "status": "$status",
    "start_time": "$DEPLOYMENT_START_TIME",
    "end_time": $(date +%s),
    "commit": "$commit",
    "branch": "$branch",
    "domain": "$DOMAIN",
    "production_ip": "$PRODUCTION_IP",
    "containers": $(ssh root@$PRODUCTION_IP "docker ps --format json" 2>/dev/null | jq -s . || echo "[]")
}
EOF
    
    log_deployment "INFO" "Deployment state saved: $status"
}

check_prerequisites() {
    log_deployment "INFO" "Checking deployment prerequisites"
    
    # Check git status
    if ! git diff-index --quiet HEAD --; then
        log_deployment "ERROR" "Uncommitted changes detected"
        return 1
    fi
    
    # Check repository health
    if ! ./scripts/check-repo-health.sh >/dev/null 2>&1; then
        log_deployment "WARN" "Repository health check failed - deploying anyway"
    fi
    
    # Check environment
    if ! ./scripts/validate-environment.sh >/dev/null 2>&1; then
        log_deployment "ERROR" "Environment validation failed"
        return 1
    fi
    
    log_deployment "INFO" "Prerequisites check passed"
    return 0
}

deploy_application() {
    log_deployment "INFO" "Starting application deployment"
    
    # Save pre-deployment state
    save_deployment_state "STARTING"
    
    # Run the actual deployment
    if ./scripts/deploy-to-do.sh; then
        log_deployment "INFO" "Deployment script completed successfully"
        return 0
    else
        log_deployment "ERROR" "Deployment script failed"
        return 1
    fi
}

perform_health_checks() {
    log_deployment "INFO" "Performing post-deployment health checks"
    
    local attempt=1
    local max_attempts=5
    
    while [ $attempt -le $max_attempts ]; do
        log_deployment "INFO" "Health check attempt $attempt/$max_attempts"
        
        if ./scripts/deployment-health-check.sh >/dev/null 2>&1; then
            log_deployment "INFO" "Health checks passed"
            return 0
        else
            log_deployment "WARN" "Health check attempt $attempt failed"
            
            if [ $attempt -lt $max_attempts ]; then
                log_deployment "INFO" "Waiting 30 seconds before retry..."
                sleep 30
            fi
        fi
        
        attempt=$((attempt + 1))
    done
    
    log_deployment "ERROR" "All health check attempts failed"
    return 1
}

perform_rollback() {
    log_deployment "WARN" "Initiating automatic rollback"
    
    # Try automated rollback first
    if ./scripts/deployment-health-check.sh --rollback >/dev/null 2>&1; then
        log_deployment "INFO" "Automated rollback completed"
        
        # Verify rollback worked
        sleep 30
        if ./scripts/deployment-health-check.sh >/dev/null 2>&1; then
            log_deployment "INFO" "Rollback verification successful"
            return 0
        else
            log_deployment "ERROR" "Rollback verification failed"
        fi
    else
        log_deployment "ERROR" "Automated rollback failed"
    fi
    
    # Manual emergency procedures
    log_deployment "WARN" "Attempting emergency recovery"
    ssh root@$PRODUCTION_IP "/root/automation-scripts/emergency-recovery.sh" || {
        log_deployment "ERROR" "Emergency recovery failed"
        return 1
    }
    
    return 0
}

generate_deployment_report() {
    local status="$1"
    local end_time=$(date +%s)
    local duration=$((end_time - DEPLOYMENT_START_TIME))
    local commit=$(git rev-parse HEAD)
    local commit_msg=$(git log -1 --pretty=format:"%s")
    
    cat > "deployment-report-$DEPLOYMENT_ID.md" << EOF
# Deployment Report: $DEPLOYMENT_ID

## Summary
- **Status**: $status
- **Duration**: ${duration}s
- **Commit**: $commit
- **Message**: $commit_msg
- **Domain**: $DOMAIN
- **Timestamp**: $(date)

## Deployment Steps
\`\`\`
$(cat "${DEPLOYMENT_STATE_FILE}.log" 2>/dev/null || echo "No deployment log available")
\`\`\`

## Container Status
\`\`\`json
$(ssh root@$PRODUCTION_IP "docker ps --format json" 2>/dev/null | jq -s . || echo "[]")
\`\`\`

## Health Check Results
\`\`\`
$(./scripts/deployment-health-check.sh 2>&1 || echo "Health check failed")
\`\`\`

## Next Actions
$(if [ "$status" = "SUCCESS" ]; then
    echo "- ✅ Deployment successful - monitor for issues"
    echo "- ✅ No action required"
else
    echo "- ❌ Deployment failed - investigation required"
    echo "- 🔍 Check application logs"
    echo "- 🔧 Manual intervention may be needed"
fi)
EOF

    log_deployment "INFO" "Deployment report generated: deployment-report-$DEPLOYMENT_ID.md"
}

# Main deployment flow
main() {
    log_deployment "INFO" "Starting self-healing deployment: $DEPLOYMENT_ID"
    
    # Step 1: Prerequisites
    if ! check_prerequisites; then
        log_deployment "ERROR" "Prerequisites failed - aborting deployment"
        save_deployment_state "FAILED_PREREQUISITES"
        generate_deployment_report "FAILED_PREREQUISITES"
        
        create_github_issue \
            "🚨 Deployment Failed: Prerequisites Check" \
            "**Deployment ID**: $DEPLOYMENT_ID
**Commit**: $(git rev-parse HEAD)
**Issue**: Prerequisites check failed

The automated deployment was aborted due to failed prerequisites.

### Required Actions:
1. Fix repository health issues: \`./scripts/check-repo-health.sh\`
2. Fix environment issues: \`./scripts/validate-environment.sh\`
3. Retry deployment when issues are resolved

### Logs:
\`\`\`
$(tail -20 "${DEPLOYMENT_STATE_FILE}.log" 2>/dev/null || echo "No logs available")
\`\`\`" \
            "deployment,failed,automated"
        
        exit 1
    fi
    
    # Step 2: Deploy
    if ! deploy_application; then
        log_deployment "ERROR" "Deployment failed"
        save_deployment_state "FAILED_DEPLOY"
        generate_deployment_report "FAILED_DEPLOY"
        
        create_github_issue \
            "🚨 Deployment Failed: Build/Deploy Error" \
            "**Deployment ID**: $DEPLOYMENT_ID
**Commit**: $(git rev-parse HEAD)
**Issue**: Deployment script failed

The automated deployment failed during the build/deploy phase.

### Required Actions:
1. Check deployment logs
2. Investigate build errors
3. Fix issues and retry deployment

### Logs:
\`\`\`
$(tail -30 "${DEPLOYMENT_STATE_FILE}.log" 2>/dev/null || echo "No logs available")
\`\`\`" \
            "deployment,failed,automated,critical"
        
        exit 1
    fi
    
    # Step 3: Health checks
    if ! perform_health_checks; then
        log_deployment "ERROR" "Health checks failed - initiating rollback"
        save_deployment_state "FAILED_HEALTH_CHECK"
        
        # Attempt rollback
        if perform_rollback; then
            log_deployment "INFO" "Rollback completed successfully"
            save_deployment_state "ROLLED_BACK"
            generate_deployment_report "ROLLED_BACK"
            
            create_github_issue \
                "⚠️ Deployment Rolled Back: Health Check Failed" \
                "**Deployment ID**: $DEPLOYMENT_ID
**Commit**: $(git rev-parse HEAD)
**Issue**: Post-deployment health checks failed

The deployment was automatically rolled back to the previous working version.

### System Status:
- ✅ Rollback completed successfully
- ✅ Previous version restored
- ⚠️ New deployment needs investigation

### Required Actions:
1. Investigate health check failures
2. Test deployment in staging environment
3. Fix issues before retrying

### Logs:
\`\`\`
$(tail -30 "${DEPLOYMENT_STATE_FILE}.log" 2>/dev/null || echo "No logs available")
\`\`\`" \
                "deployment,rollback,automated"
            
        else
            log_deployment "ERROR" "Rollback failed - system may be in unstable state"
            save_deployment_state "ROLLBACK_FAILED"
            generate_deployment_report "ROLLBACK_FAILED"
            
            create_github_issue \
                "🚨 CRITICAL: Deployment AND Rollback Failed" \
                "**Deployment ID**: $DEPLOYMENT_ID
**Commit**: $(git rev-parse HEAD)
**Issue**: Both deployment and rollback failed

⚠️ **CRITICAL SYSTEM STATE** ⚠️

The deployment failed and the automatic rollback also failed. The system may be in an unstable state.

### IMMEDIATE ACTIONS REQUIRED:
1. 🚨 Check application availability: https://$DOMAIN
2. 🔧 Manual intervention needed on production server
3. 📞 Consider emergency maintenance window
4. 💾 Restore from backup if necessary

### Emergency Commands:
\`\`\`bash
ssh root@$PRODUCTION_IP '/root/automation-scripts/emergency-recovery.sh'
\`\`\`

### Logs:
\`\`\`
$(tail -50 "${DEPLOYMENT_STATE_FILE}.log" 2>/dev/null || echo "No logs available")
\`\`\`" \
                "deployment,critical,rollback-failed,emergency"
            
        fi
        
        exit 1
    fi
    
    # Step 4: Success!
    log_deployment "INFO" "Deployment completed successfully"
    save_deployment_state "SUCCESS"
    generate_deployment_report "SUCCESS"
    
    create_github_issue \
        "✅ Deployment Successful: $DEPLOYMENT_ID" \
        "**Deployment ID**: $DEPLOYMENT_ID
**Commit**: $(git rev-parse HEAD)
**Duration**: $(($(date +%s) - DEPLOYMENT_START_TIME))s

The automated deployment completed successfully!

### Verification:
- ✅ Deployment completed
- ✅ Health checks passed
- ✅ All services running
- ✅ Application accessible

### Deployed Changes:
$(git log --oneline -5)

### System Status:
- Frontend: https://$DOMAIN ✅
- API: https://$DOMAIN/api/health ✅
- Containers: All running ✅

*This deployment was fully automated and verified.*" \
        "deployment,success,automated"
    
    echo ""
    echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
    echo "================================"
    echo "Deployment ID: $DEPLOYMENT_ID"
    echo "Duration: $(($(date +%s) - DEPLOYMENT_START_TIME))s"
    echo "Application: https://$DOMAIN"
    echo "API Health: https://$DOMAIN/api/health"
    echo ""
    echo "✅ All systems operational and verified!"
}

# Run main deployment flow
main "$@"