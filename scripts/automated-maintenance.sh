#!/bin/bash
#
# Automated Maintenance Script
# Runs regular maintenance tasks to prevent repository and deployment issues
#

set -e

echo "🔧 Automated Maintenance"
echo "========================"

# Configuration
MAINTENANCE_LOG="maintenance.log"
MAX_REPO_SIZE_MB=400
CLEANUP_DOCKER_IMAGES=true
CLEANUP_OLD_BRANCHES=true
DAYS_OLD_BRANCHES=30

# Functions
log_action() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$MAINTENANCE_LOG"
}

cleanup_docker() {
    echo ""
    echo "🐳 Docker Cleanup"
    echo "================="
    
    if command -v docker >/dev/null 2>&1; then
        # Remove dangling images
        dangling_count=$(docker images -f "dangling=true" -q | wc -l)
        if [ $dangling_count -gt 0 ]; then
            log_action "Removing $dangling_count dangling Docker images"
            docker image prune -f
        else
            log_action "No dangling Docker images to remove"
        fi
        
        # Remove unused containers
        if [ "$(docker ps -aq -f status=exited | wc -l)" -gt 0 ]; then
            log_action "Removing stopped containers"
            docker container prune -f
        else
            log_action "No stopped containers to remove"
        fi
        
        # Remove unused volumes
        if [ "$(docker volume ls -qf dangling=true | wc -l)" -gt 0 ]; then
            log_action "Removing unused volumes"
            docker volume prune -f
        else
            log_action "No unused volumes to remove"
        fi
        
        # Clean build cache
        log_action "Cleaning Docker build cache"
        docker builder prune -f
        
        echo "✅ Docker cleanup completed"
    else
        log_action "Docker not available - skipping Docker cleanup"
    fi
}

cleanup_git() {
    echo ""
    echo "📚 Git Repository Cleanup"
    echo "========================="
    
    # Git garbage collection
    log_action "Running git garbage collection"
    git gc --auto
    
    # Clean up old branches
    if [ $CLEANUP_OLD_BRANCHES = true ]; then
        echo "Cleaning up old branches..."
        
        # Get remote branches that are older than specified days
        old_branches=$(git for-each-ref --format='%(refname:short) %(committerdate)' refs/remotes/origin | \
                      awk -v cutoff_date="$(date -d "$DAYS_OLD_BRANCHES days ago" +%Y-%m-%d)" \
                      '$2 < cutoff_date && $1 != "origin/main" && $1 != "origin/develop" {print $1}')
        
        if [ -n "$old_branches" ]; then
            echo "Found old branches:"
            echo "$old_branches"
            
            # In production, you might want to be more careful here
            # For now, just log them
            log_action "Found $(echo "$old_branches" | wc -l) old branches to potentially clean up"
        else
            log_action "No old branches found to clean up"
        fi
    fi
    
    # Check repository size
    repo_size_kb=$(du -sk .git | cut -f1)
    repo_size_mb=$((repo_size_kb / 1024))
    
    log_action "Repository size: ${repo_size_mb}MB"
    
    if [ $repo_size_mb -gt $MAX_REPO_SIZE_MB ]; then
        log_action "WARNING: Repository size (${repo_size_mb}MB) exceeds threshold (${MAX_REPO_SIZE_MB}MB)"
        echo "⚠️  Consider running: ./scripts/cleanup-large-files.sh"
    fi
    
    echo "✅ Git cleanup completed"
}

cleanup_node_modules() {
    echo ""
    echo "📦 Node Modules Cleanup"
    echo "======================="
    
    # Find and clean node_modules in subdirectories
    find . -name "node_modules" -type d -not -path "./node_modules" | while read -r dir; do
        parent_dir=$(dirname "$dir")
        if [ -f "$parent_dir/package.json" ]; then
            echo "Cleaning node_modules in $parent_dir"
            rm -rf "$dir"
            
            # Reinstall if package-lock.json exists
            if [ -f "$parent_dir/package-lock.json" ]; then
                (cd "$parent_dir" && npm ci --silent)
                log_action "Reinstalled dependencies in $parent_dir"
            fi
        fi
    done
    
    echo "✅ Node modules cleanup completed"
}

update_dependencies() {
    echo ""
    echo "📡 Dependency Updates Check"
    echo "=========================="
    
    # Check for security vulnerabilities
    check_vulnerabilities() {
        local dir=$1
        local service_name=$2
        
        if [ -f "$dir/package.json" ]; then
            echo "Checking $service_name for vulnerabilities..."
            cd "$dir"
            
            # Check for vulnerabilities
            if npm audit --audit-level=moderate --json >/dev/null 2>&1; then
                vuln_count=$(npm audit --audit-level=moderate --json 2>/dev/null | jq '.metadata.vulnerabilities.moderate + .metadata.vulnerabilities.high + .metadata.vulnerabilities.critical' 2>/dev/null || echo "0")
                
                if [ "$vuln_count" -gt 0 ]; then
                    log_action "WARNING: $service_name has $vuln_count security vulnerabilities"
                    echo "  Run 'npm audit fix' in $dir to fix"
                else
                    log_action "$service_name: No security vulnerabilities found"
                fi
            fi
            
            cd - >/dev/null
        fi
    }
    
    check_vulnerabilities "frontend" "Frontend"
    check_vulnerabilities "backend" "Backend"
    check_vulnerabilities "crawler" "Crawler"
    
    echo "✅ Dependency check completed"
}

generate_maintenance_report() {
    echo ""
    echo "📊 Maintenance Report"
    echo "===================="
    
    # Repository stats
    repo_size_kb=$(du -sk .git | cut -f1)
    repo_size_mb=$((repo_size_kb / 1024))
    object_count=$(git count-objects -v | grep "^count" | cut -d' ' -f2)
    pack_count=$(git count-objects -v | grep "^count-pack" | cut -d' ' -f2)
    
    # Docker stats (if available)
    if command -v docker >/dev/null 2>&1; then
        docker_images_count=$(docker images | wc -l)
        docker_containers_count=$(docker ps -a | wc -l)
    else
        docker_images_count="N/A"
        docker_containers_count="N/A"
    fi
    
    # Generate report
    cat > "maintenance-report-$(date +%Y%m%d-%H%M%S).txt" << EOF
Maintenance Report - $(date)
================================

Repository Health:
- Size: ${repo_size_mb}MB
- Loose objects: $object_count
- Packed objects: $pack_count
- Status: $([ $repo_size_mb -lt $MAX_REPO_SIZE_MB ] && echo "HEALTHY" || echo "NEEDS ATTENTION")

Docker Health:
- Images: $docker_images_count
- Containers: $docker_containers_count

Actions Taken:
$(tail -20 "$MAINTENANCE_LOG" | grep "$(date +%Y-%m-%d)")

Recommendations:
$([ $repo_size_mb -gt $((MAX_REPO_SIZE_MB / 2)) ] && echo "- Monitor repository size growth")
$([ $object_count -gt 10000 ] && echo "- Consider running 'git gc --aggressive'")

Next Maintenance: $(date -d "+1 week")
EOF
    
    log_action "Maintenance report generated"
    echo "✅ Report saved to maintenance-report-$(date +%Y%m%d-%H%M%S).txt"
}

# Main execution
log_action "Starting automated maintenance"

# Check if we're in a git repository
if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Run maintenance tasks
if [ $CLEANUP_DOCKER_IMAGES = true ]; then
    cleanup_docker
fi

cleanup_git
cleanup_node_modules
update_dependencies
generate_maintenance_report

log_action "Automated maintenance completed"

echo ""
echo "✅ Maintenance Complete!"
echo "======================="
echo ""
echo "📋 Summary:"
echo "  • Docker cleanup: $([ $CLEANUP_DOCKER_IMAGES = true ] && echo "✅" || echo "⏭️ ")"
echo "  • Git repository: ✅"
echo "  • Node modules: ✅"
echo "  • Dependencies: ✅"
echo "  • Report generated: ✅"
echo ""
echo "📅 Schedule this script to run weekly:"
echo "  • Add to crontab: 0 2 * * 0 /path/to/automated-maintenance.sh"
echo "  • Or run manually when needed"
echo ""
echo "🔗 Related commands:"
echo "  • Full health check: ./scripts/check-repo-health.sh"
echo "  • Environment validation: ./scripts/validate-environment.sh"
echo "  • Deployment health: ./scripts/deployment-health-check.sh"