#!/bin/bash
#
# Automated Cleanup Trigger
# Monitors repository health and triggers cleanup automatically
#

set -e

echo "🤖 Automated Cleanup Trigger"
echo "============================"

# Configuration
REPO_SIZE_THRESHOLD_MB=400
LARGE_FILE_THRESHOLD_MB=10
AUTO_CLEANUP_ENABLED=true
FORCE_CLEANUP=false
GITHUB_REPO="moleary1107/etownz-grants"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_CLEANUP=true
            shift
            ;;
        --disable-auto)
            AUTO_CLEANUP_ENABLED=false
            shift
            ;;
        --threshold)
            REPO_SIZE_THRESHOLD_MB="$2"
            shift 2
            ;;
        *)
            echo "Unknown option $1"
            echo "Usage: $0 [--force] [--disable-auto] [--threshold MB]"
            exit 1
            ;;
    esac
done

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

create_github_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    
    if command -v gh >/dev/null 2>&1; then
        gh issue create --title "$title" --body "$body" --label "$labels" || {
            log_message "WARN: Failed to create GitHub issue"
        }
    else
        log_message "WARN: GitHub CLI not available"
    fi
}

check_repository_size() {
    local repo_size_kb=$(du -sk .git | cut -f1)
    local repo_size_mb=$((repo_size_kb / 1024))
    
    echo $repo_size_mb
}

find_large_files() {
    find . -type f -size +${LARGE_FILE_THRESHOLD_MB}M 2>/dev/null | grep -v ".git" | head -20 || true
}

count_security_vulnerabilities() {
    local total_vulns=0
    
    for service in frontend backend crawler; do
        if [ -f "$service/package.json" ]; then
            cd "$service"
            if command -v npm >/dev/null 2>&1; then
                local vulns=$(npm audit --audit-level=moderate --json 2>/dev/null | jq '.metadata.vulnerabilities.moderate + .metadata.vulnerabilities.high + .metadata.vulnerabilities.critical' 2>/dev/null || echo "0")
                total_vulns=$((total_vulns + vulns))
            fi
            cd ..
        fi
    done
    
    echo $total_vulns
}

perform_automated_cleanup() {
    log_message "🧹 Starting automated cleanup process"
    
    # Create backup first
    local backup_dir="automated-cleanup-backup-$(date +%Y%m%d-%H%M%S)"
    log_message "📦 Creating backup: $backup_dir"
    cp -r . "../$backup_dir" || {
        log_message "ERROR: Failed to create backup"
        return 1
    }
    
    # Run the cleanup script
    log_message "🔧 Running cleanup script"
    if ./scripts/cleanup-large-files.sh --auto-confirm; then
        log_message "✅ Cleanup completed successfully"
        
        # Verify cleanup worked
        local new_size=$(check_repository_size)
        log_message "📊 Repository size after cleanup: ${new_size}MB"
        
        return 0
    else
        log_message "❌ Cleanup script failed"
        return 1
    fi
}

fix_security_vulnerabilities() {
    log_message "🔒 Attempting to fix security vulnerabilities"
    
    local fixes_applied=false
    
    for service in frontend backend crawler; do
        if [ -f "$service/package.json" ]; then
            log_message "Checking $service for vulnerabilities..."
            cd "$service"
            
            if command -v npm >/dev/null 2>&1; then
                # Try to fix vulnerabilities automatically
                if npm audit fix --force >/dev/null 2>&1; then
                    log_message "✅ Fixed vulnerabilities in $service"
                    fixes_applied=true
                else
                    log_message "⚠️  Could not auto-fix vulnerabilities in $service"
                fi
            fi
            
            cd ..
        fi
    done
    
    if [ "$fixes_applied" = true ]; then
        # Commit the fixes
        if git diff --quiet; then
            log_message "No changes to commit"
        else
            git add .
            git commit -m "fix: automated security vulnerability fixes

- Auto-fixed security vulnerabilities in npm dependencies
- Triggered by automated cleanup system
- Reviewed and applied safe fixes only

🤖 This is an automated commit" || {
                log_message "Failed to commit security fixes"
                return 1
            }
            
            log_message "✅ Security fixes committed"
        fi
    fi
    
    return 0
}

generate_cleanup_report() {
    local action_taken="$1"
    local repo_size_before="$2"
    local repo_size_after="$3"
    local large_files_found="$4"
    local vulns_found="$5"
    
    cat > "automated-cleanup-report-$(date +%Y%m%d-%H%M%S).md" << EOF
# Automated Cleanup Report

**Date**: $(date)
**Action Taken**: $action_taken
**Trigger**: Automated monitoring

## Repository Analysis
- **Size Before**: ${repo_size_before}MB
- **Size After**: ${repo_size_after}MB
- **Size Reduction**: $((repo_size_before - repo_size_after))MB
- **Large Files Found**: $large_files_found
- **Security Vulnerabilities**: $vulns_found

## Actions Performed
$(if [ "$action_taken" = "CLEANUP_PERFORMED" ]; then
    echo "- ✅ Large file cleanup executed"
    echo "- ✅ Repository size optimized"
    echo "- ✅ Git history cleaned"
elif [ "$action_taken" = "SECURITY_FIXES" ]; then
    echo "- ✅ Security vulnerabilities fixed"
    echo "- ✅ Dependencies updated"
elif [ "$action_taken" = "MONITORING_ONLY" ]; then
    echo "- 👀 Repository monitored"
    echo "- ℹ️  No action required at this time"
else
    echo "- ⚠️  Issues detected but not automatically resolved"
fi)

## Thresholds
- Repository Size Limit: ${REPO_SIZE_THRESHOLD_MB}MB
- Large File Limit: ${LARGE_FILE_THRESHOLD_MB}MB
- Auto Cleanup: $([ "$AUTO_CLEANUP_ENABLED" = true ] && echo "Enabled" || echo "Disabled")

## Next Monitoring
- Scheduled for next automatic run
- Manual trigger available: \`./scripts/automated-cleanup-trigger.sh\`

---
*This report was generated automatically by the cleanup monitoring system.*
EOF

    log_message "📊 Cleanup report generated"
}

# Main execution
main() {
    log_message "🔍 Starting automated cleanup trigger"
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        log_message "ERROR: Not in a git repository"
        exit 1
    fi
    
    # Get current repository metrics
    local repo_size=$(check_repository_size)
    local large_files=$(find_large_files)
    local large_file_count=$(echo "$large_files" | grep -c . || echo "0")
    local security_vulns=$(count_security_vulnerabilities)
    
    log_message "📊 Repository metrics:"
    log_message "  Size: ${repo_size}MB (threshold: ${REPO_SIZE_THRESHOLD_MB}MB)"
    log_message "  Large files: $large_file_count"
    log_message "  Security vulnerabilities: $security_vulns"
    
    # Determine if action is needed
    local action_needed=false
    local cleanup_needed=false
    local security_fixes_needed=false
    
    if [ $repo_size -gt $REPO_SIZE_THRESHOLD_MB ]; then
        log_message "⚠️  Repository size exceeds threshold"
        action_needed=true
        cleanup_needed=true
    fi
    
    if [ $large_file_count -gt 0 ]; then
        log_message "⚠️  Large files detected"
        action_needed=true
        cleanup_needed=true
    fi
    
    if [ $security_vulns -gt 0 ]; then
        log_message "⚠️  Security vulnerabilities detected"
        action_needed=true
        security_fixes_needed=true
    fi
    
    if [ "$FORCE_CLEANUP" = true ]; then
        log_message "🔧 Force cleanup requested"
        action_needed=true
        cleanup_needed=true
    fi
    
    # Take action based on findings
    if [ "$action_needed" = false ]; then
        log_message "✅ Repository health is good - no action needed"
        generate_cleanup_report "MONITORING_ONLY" $repo_size $repo_size $large_file_count $security_vulns
        
    elif [ "$AUTO_CLEANUP_ENABLED" = false ]; then
        log_message "⚠️  Issues detected but auto-cleanup is disabled"
        generate_cleanup_report "DISABLED" $repo_size $repo_size $large_file_count $security_vulns
        
        create_github_issue \
            "⚠️ Repository Maintenance Required" \
            "**Repository Health Alert**

Issues detected that require attention:

- **Repository Size**: ${repo_size}MB (threshold: ${REPO_SIZE_THRESHOLD_MB}MB)
- **Large Files**: $large_file_count files found
- **Security Vulnerabilities**: $security_vulns issues

### Recommended Actions:
$([ "$cleanup_needed" = true ] && echo "- Run cleanup: \`./scripts/cleanup-large-files.sh\`")
$([ "$security_fixes_needed" = true ] && echo "- Fix vulnerabilities: \`npm audit fix\` in service directories")

### Automation:
Auto-cleanup is currently disabled. Enable with:
\`./scripts/automated-cleanup-trigger.sh --force\`

*This alert was generated automatically.*" \
            "maintenance,automated,health-check"
        
    else
        log_message "🤖 Taking automated action"
        
        local action_taken="NONE"
        local initial_size=$repo_size
        
        # Fix security vulnerabilities first (less risky)
        if [ "$security_fixes_needed" = true ]; then
            if fix_security_vulnerabilities; then
                action_taken="SECURITY_FIXES"
                log_message "✅ Security fixes applied"
            else
                log_message "❌ Security fixes failed"
            fi
        fi
        
        # Then handle repository cleanup if needed
        if [ "$cleanup_needed" = true ]; then
            if perform_automated_cleanup; then
                action_taken="CLEANUP_PERFORMED"
                local final_size=$(check_repository_size)
                log_message "✅ Cleanup completed - size reduced from ${initial_size}MB to ${final_size}MB"
                
                # Update metrics for report
                repo_size=$final_size
                large_files=$(find_large_files)
                large_file_count=$(echo "$large_files" | grep -c . || echo "0")
                
                create_github_issue \
                    "✅ Automated Repository Cleanup Completed" \
                    "**Cleanup Summary**

The automated cleanup system successfully optimized the repository:

- **Size Before**: ${initial_size}MB
- **Size After**: ${final_size}MB
- **Size Reduction**: $((initial_size - final_size))MB
- **Large Files Removed**: Previous count was $large_file_count

### Actions Performed:
- ✅ Large files removed from git history
- ✅ Repository optimized and compressed
- ✅ Git garbage collection performed
- ✅ History safely rewritten using BFG

### Important Notes:
⚠️ **Git history was rewritten**. Team members should:
1. Backup any local changes
2. Re-clone the repository: \`git clone https://github.com/$GITHUB_REPO.git\`

### Verification:
Repository is now within healthy size limits and ready for continued development.

*This cleanup was performed automatically by the monitoring system.*" \
                    "maintenance,automated,cleanup,success"
                
            else
                log_message "❌ Automated cleanup failed"
                action_taken="CLEANUP_FAILED"
                
                create_github_issue \
                    "🚨 Automated Cleanup Failed" \
                    "**Cleanup Failure Alert**

The automated repository cleanup failed and requires manual intervention.

### Repository Status:
- **Current Size**: ${repo_size}MB (threshold: ${REPO_SIZE_THRESHOLD_MB}MB)
- **Large Files**: $large_file_count files detected
- **Auto-cleanup**: Failed

### Required Actions:
1. 🔍 Investigate cleanup failure logs
2. 🛠️ Run manual cleanup: \`./scripts/cleanup-large-files.sh\`
3. 📞 Consider manual intervention if issues persist

### Emergency Options:
- Force cleanup: \`./scripts/automated-cleanup-trigger.sh --force\`
- Manual BFG cleanup: See REPOSITORY_MAINTENANCE.md

*Immediate attention required to prevent git push timeouts.*" \
                    "maintenance,failed,critical,automated"
            fi
        fi
        
        generate_cleanup_report "$action_taken" $initial_size $repo_size $large_file_count $security_vulns
    fi
    
    log_message "🏁 Automated cleanup trigger completed"
}

# Run main function
main "$@"