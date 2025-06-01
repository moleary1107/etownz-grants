#!/bin/bash
#
# Repository Health Check Script
# Monitors repository size, dependency health, and deployment readiness
#

set -e

echo "🏥 Repository Health Check"
echo "========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Thresholds
MAX_REPO_SIZE_MB=500
MAX_FILE_SIZE_MB=10
MAX_PACKAGE_AGE_DAYS=90

health_score=100
issues=()
warnings=()

echo ""
echo "📊 Repository Size Analysis"
echo "============================"

# Check repository size
repo_size_kb=$(du -sk .git | cut -f1)
repo_size_mb=$((repo_size_kb / 1024))

echo "Repository size: ${repo_size_mb}MB"

if [ $repo_size_mb -gt $MAX_REPO_SIZE_MB ]; then
    issues+=("❌ Repository size (${repo_size_mb}MB) exceeds ${MAX_REPO_SIZE_MB}MB threshold")
    health_score=$((health_score - 20))
elif [ $repo_size_mb -gt $((MAX_REPO_SIZE_MB / 2)) ]; then
    warnings+=("⚠️  Repository size (${repo_size_mb}MB) approaching ${MAX_REPO_SIZE_MB}MB limit")
    health_score=$((health_score - 5))
else
    echo "✅ Repository size is healthy"
fi

# Check for large files
echo ""
echo "📁 Large Files Check"
echo "===================="

large_files=$(find . -type f -size +${MAX_FILE_SIZE_MB}M 2>/dev/null | grep -v ".git" | head -10 || true)

if [ -n "$large_files" ]; then
    echo "❌ Large files found (>${MAX_FILE_SIZE_MB}MB):"
    echo "$large_files" | while read -r file; do
        size=$(du -h "$file" | cut -f1)
        echo "  - $file ($size)"
    done
    issues+=("Large files present in working directory")
    health_score=$((health_score - 15))
else
    echo "✅ No large files in working directory"
fi

# Check git object count and pack efficiency
echo ""
echo "🗂️  Git Object Analysis"
echo "======================="

objects_info=$(git count-objects -v)
object_count=$(echo "$objects_info" | grep "^count" | cut -d' ' -f2)
pack_count=$(echo "$objects_info" | grep "^count-pack" | cut -d' ' -f2)
pack_size_kb=$(echo "$objects_info" | grep "^size-pack" | cut -d' ' -f2)
pack_size_mb=$((pack_size_kb / 1024))

echo "Loose objects: $object_count"
echo "Packed objects: $pack_count"
echo "Pack size: ${pack_size_mb}MB"

if [ $object_count -gt 10000 ]; then
    warnings+=("⚠️  High number of loose objects ($object_count) - consider running 'git gc'")
    health_score=$((health_score - 5))
fi

# Check for uncommitted changes
echo ""
echo "🔄 Git Status Check"
echo "==================="

if ! git diff-index --quiet HEAD --; then
    warnings+=("⚠️  Uncommitted changes detected")
    health_score=$((health_score - 5))
    echo "⚠️  Uncommitted changes present"
else
    echo "✅ Working directory clean"
fi

# Check branch sync status
echo ""
echo "🔗 Branch Sync Status"
echo "====================="

current_branch=$(git branch --show-current)
echo "Current branch: $current_branch"

if git rev-parse --verify origin/$current_branch >/dev/null 2>&1; then
    local_commit=$(git rev-parse HEAD)
    remote_commit=$(git rev-parse origin/$current_branch)
    
    if [ "$local_commit" != "$remote_commit" ]; then
        ahead=$(git rev-list --count origin/$current_branch..HEAD)
        behind=$(git rev-list --count HEAD..origin/$current_branch)
        
        if [ $ahead -gt 0 ]; then
            warnings+=("⚠️  Local branch is $ahead commits ahead of remote")
            echo "⚠️  $ahead commits ahead of remote"
        fi
        
        if [ $behind -gt 0 ]; then
            warnings+=("⚠️  Local branch is $behind commits behind remote")
            echo "⚠️  $behind commits behind remote"
            health_score=$((health_score - 10))
        fi
    else
        echo "✅ Branch in sync with remote"
    fi
else
    warnings+=("⚠️  Remote branch not found")
fi

# Check Docker images size
echo ""
echo "🐳 Docker Images Check"
echo "======================"

if command -v docker >/dev/null 2>&1; then
    # Check for dangling images
    dangling_images=$(docker images -f "dangling=true" -q | wc -l)
    if [ $dangling_images -gt 0 ]; then
        warnings+=("⚠️  $dangling_images dangling Docker images found")
        echo "⚠️  $dangling_images dangling images (run 'docker image prune')"
        health_score=$((health_score - 5))
    else
        echo "✅ No dangling Docker images"
    fi
    
    # Check registry images
    echo ""
    echo "📋 Current project images:"
    docker images | grep -E "(etownz-grants|registry.digitalocean.com)" | head -5 || echo "No project images found locally"
else
    echo "⚠️  Docker not available for image check"
fi

# Check package.json dependencies (if exists)
echo ""
echo "📦 Dependencies Check"
echo "====================="

check_package_json() {
    local dir=$1
    local service_name=$2
    
    if [ -f "$dir/package.json" ]; then
        echo "Checking $service_name dependencies..."
        
        # Check for security vulnerabilities
        if command -v npm >/dev/null 2>&1; then
            cd "$dir"
            vuln_count=$(npm audit --audit-level=moderate --json 2>/dev/null | jq '.metadata.vulnerabilities.moderate + .metadata.vulnerabilities.high + .metadata.vulnerabilities.critical' 2>/dev/null || echo "0")
            cd - >/dev/null
            
            if [ "$vuln_count" -gt 0 ]; then
                issues+=("❌ $service_name has $vuln_count security vulnerabilities")
                health_score=$((health_score - 10))
                echo "❌ $vuln_count security vulnerabilities in $service_name"
            else
                echo "✅ No security vulnerabilities in $service_name"
            fi
        fi
    fi
}

check_package_json "frontend" "Frontend"
check_package_json "backend" "Backend"
check_package_json "crawler" "Crawler"

# Environment files check
echo ""
echo "🔐 Environment Files Check"
echo "=========================="

env_files=(".env" ".env.local" ".env.production" "backend/.env" "frontend/.env.local")
secret_patterns=("sk-" "pk_" "rk_" "secret" "password" "api_key")

for env_file in "${env_files[@]}"; do
    if [ -f "$env_file" ]; then
        echo "Checking $env_file..."
        
        # Check if file is in git (should not be for most env files)
        if git ls-files --error-unmatch "$env_file" >/dev/null 2>&1; then
            issues+=("❌ Environment file $env_file is tracked by git")
            health_score=$((health_score - 15))
            echo "❌ $env_file is tracked by git (security risk)"
        else
            echo "✅ $env_file not tracked by git"
        fi
    fi
done

# Final health report
echo ""
echo "📊 HEALTH REPORT"
echo "================"
echo ""

if [ $health_score -ge 90 ]; then
    echo -e "${GREEN}🎉 Repository Health: EXCELLENT ($health_score/100)${NC}"
elif [ $health_score -ge 75 ]; then
    echo -e "${BLUE}✅ Repository Health: GOOD ($health_score/100)${NC}"
elif [ $health_score -ge 60 ]; then
    echo -e "${YELLOW}⚠️  Repository Health: FAIR ($health_score/100)${NC}"
else
    echo -e "${RED}❌ Repository Health: POOR ($health_score/100)${NC}"
fi

echo ""

if [ ${#issues[@]} -gt 0 ]; then
    echo -e "${RED}🚨 CRITICAL ISSUES:${NC}"
    for issue in "${issues[@]}"; do
        echo "  $issue"
    done
    echo ""
fi

if [ ${#warnings[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNINGS:${NC}"
    for warning in "${warnings[@]}"; do
        echo "  $warning"
    done
    echo ""
fi

# Recommendations
echo -e "${BLUE}💡 RECOMMENDATIONS:${NC}"

if [ $repo_size_mb -gt $((MAX_REPO_SIZE_MB / 2)) ]; then
    echo "  • Run 'git gc --aggressive' to optimize repository"
    echo "  • Consider using './scripts/cleanup-large-files.sh' if size is excessive"
fi

if [ $object_count -gt 10000 ]; then
    echo "  • Run 'git gc' to pack loose objects"
fi

if [ ${#issues[@]} -gt 0 ]; then
    echo "  • Address critical issues before deploying"
fi

echo "  • Run this check regularly: './scripts/check-repo-health.sh'"
echo "  • Set up automated monitoring for production deployments"

echo ""
echo "🔗 Related Tools:"
echo "  • Cleanup large files: ./scripts/cleanup-large-files.sh"
echo "  • Setup prevention: ./scripts/prevent-large-files.sh"
echo "  • Repository maintenance: See REPOSITORY_MAINTENANCE.md"

# Exit with appropriate code
if [ ${#issues[@]} -gt 0 ]; then
    exit 1
elif [ ${#warnings[@]} -gt 0 ]; then
    exit 2
else
    exit 0
fi