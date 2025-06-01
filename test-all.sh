#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Log functions
log_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

log_info() {
    echo -e "ℹ️  $1"
}

# Check if command exists
check_command() {
    if command -v $1 &> /dev/null; then
        log_success "$1 is installed"
        return 0
    else
        log_error "$1 is not installed"
        return 1
    fi
}

# Main testing script
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          eTownz Grants Comprehensive Test Suite              ║"
echo "║                    $(date +"%Y-%m-%d %H:%M:%S")                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 1. Environment & Dependencies Check
log_header "1. ENVIRONMENT & DEPENDENCIES CHECK"

# Check Node.js version
if check_command node; then
    NODE_VERSION=$(node -v)
    log_info "Node.js version: $NODE_VERSION"
    if [[ "$NODE_VERSION" =~ ^v(1[8-9]|[2-9][0-9]) ]]; then
        log_success "Node.js version is 18+ (required)"
    else
        log_error "Node.js version should be 18+ (found: $NODE_VERSION)"
    fi
fi

# Check npm/yarn
check_command npm
check_command docker
check_command docker-compose

# 2. Project Structure Check
log_header "2. PROJECT STRUCTURE CHECK"

# Check essential directories
DIRS=("frontend" "backend" "infrastructure" "docs" "scripts")
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        log_success "Directory $dir exists"
    else
        log_error "Directory $dir is missing"
    fi
done

# Check essential files
FILES=(".env" "docker-compose.yml" "README.md")
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        log_success "File $file exists"
    else
        if [ "$file" == ".env" ]; then
            log_warning "File $file is missing (check .env.example)"
        else
            log_error "File $file is missing"
        fi
    fi
done

# 3. Frontend Checks
log_header "3. FRONTEND CHECKS"

cd frontend 2>/dev/null || { log_error "Cannot access frontend directory"; exit 1; }

# Check package.json
if [ -f "package.json" ]; then
    log_success "Frontend package.json exists"
    
    # Check for essential dependencies
    DEPS=("next" "react" "react-dom" "tailwindcss")
    for dep in "${DEPS[@]}"; do
        if grep -q "\"$dep\"" package.json; then
            log_success "Dependency $dep found"
        else
            log_error "Dependency $dep not found"
        fi
    done
else
    log_error "Frontend package.json missing"
fi

# Check Tailwind configuration
if [ -f "tailwind.config.js" ] || [ -f "tailwind.config.ts" ]; then
    log_success "Tailwind configuration found"
else
    log_error "Tailwind configuration missing"
fi

# Check PostCSS configuration
if [ -f "postcss.config.js" ] || [ -f "postcss.config.mjs" ]; then
    log_success "PostCSS configuration found"
else
    log_error "PostCSS configuration missing"
fi

# Check CSS files
if [ -f "styles/globals.css" ] || [ -f "app/globals.css" ]; then
    log_success "Global CSS file found"
    
    # Check for Tailwind directives
    if grep -q "@tailwind" styles/globals.css 2>/dev/null || grep -q "@tailwind" app/globals.css 2>/dev/null; then
        log_success "Tailwind directives found in CSS"
    elif grep -q "@import.*tailwindcss" styles/globals.css 2>/dev/null || grep -q "@import.*tailwindcss" app/globals.css 2>/dev/null; then
        log_warning "Using Tailwind 4 syntax (may cause issues in production)"
    else
        log_error "No Tailwind directives found in CSS"
    fi
else
    log_error "Global CSS file missing"
fi

# Check Next.js configuration
if [ -f "next.config.js" ] || [ -f "next.config.ts" ] || [ -f "next.config.mjs" ]; then
    log_success "Next.js configuration found"
else
    log_error "Next.js configuration missing"
fi

# Check for build output
if [ -d ".next" ]; then
    log_info "Next.js build directory exists"
    
    # Check if CSS is generated
    if find .next/static/css -name "*.css" 2>/dev/null | grep -q css; then
        log_success "CSS files generated in build"
    else
        log_warning "No CSS files found in build output"
    fi
fi

cd ..

# 4. Backend Checks
log_header "4. BACKEND CHECKS"

cd backend 2>/dev/null || { log_error "Cannot access backend directory"; exit 1; }

if [ -f "package.json" ]; then
    log_success "Backend package.json exists"
    
    # Check for essential dependencies
    DEPS=("express" "cors" "dotenv")
    for dep in "${DEPS[@]}"; do
        if grep -q "\"$dep\"" package.json; then
            log_success "Dependency $dep found"
        else
            log_error "Dependency $dep not found"
        fi
    done
else
    log_error "Backend package.json missing"
fi

cd ..

# 5. Sanity CMS Checks
log_header "5. SANITY CMS CHECKS"

cd frontend 2>/dev/null

# Check Sanity configuration
if [ -f "sanity.config.ts" ] || [ -f "sanity.config.js" ]; then
    log_success "Sanity configuration found"
    
    # Check for color input plugin
    if grep -q "colorInput" sanity.config.ts 2>/dev/null || grep -q "colorInput" sanity.config.js 2>/dev/null; then
        log_success "Color input plugin configured"
    else
        log_warning "Color input plugin not found in config"
    fi
fi

# Check Sanity CLI configuration
if [ -f "sanity.cli.js" ] || [ -f "sanity.cli.ts" ]; then
    log_success "Sanity CLI configuration found"
else
    log_error "Sanity CLI configuration missing"
fi

# Check for schema files with color type
if [ -d "sanity/schemas" ]; then
    COLOR_SCHEMAS=$(grep -r "type.*:.*['\"]color['\"]" sanity/schemas --include="*.ts" --include="*.js" 2>/dev/null | wc -l)
    if [ $COLOR_SCHEMAS -gt 0 ]; then
        log_warning "Found $COLOR_SCHEMAS schema files using 'color' type (may cause errors)"
    else
        log_success "No problematic color type usage found"
    fi
fi

cd ..

# 6. Docker & Container Checks
log_header "6. DOCKER & CONTAINER CHECKS"

# Check if Docker is running
if docker info &> /dev/null; then
    log_success "Docker daemon is running"
    
    # Check running containers
    RUNNING_CONTAINERS=$(docker ps --format "table {{.Names}}" | grep -E "etownz_grants|frontend|backend" | wc -l)
    if [ $RUNNING_CONTAINERS -gt 0 ]; then
        log_success "Found $RUNNING_CONTAINERS eTownz containers running"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "etownz_grants|frontend|backend"
    else
        log_warning "No eTownz containers are running"
    fi
    
    # Check if frontend container exists
    if docker ps -a | grep -q "etownz_grants-frontend"; then
        log_success "Frontend container exists"
    else
        log_warning "Frontend container not found"
    fi
else
    log_error "Docker daemon is not running"
fi

# 7. Environment Variables Check
log_header "7. ENVIRONMENT VARIABLES CHECK"

if [ -f ".env" ]; then
    log_success ".env file exists"
    
    # Check for essential variables (without exposing values)
    REQUIRED_VARS=(
        "DATABASE_URL"
        "SANITY_PROJECT_ID"
        "NEXT_PUBLIC_SANITY_PROJECT_ID"
        "NODE_ENV"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" .env; then
            log_success "Environment variable $var is set"
        else
            log_error "Environment variable $var is missing"
        fi
    done
else
    log_error ".env file missing"
fi

# 8. Network & API Checks
log_header "8. NETWORK & API CHECKS"

# Check if frontend is accessible
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|304"; then
    log_success "Frontend is accessible at http://localhost:3000"
else
    log_warning "Frontend not accessible at http://localhost:3000"
fi

# Check if backend is accessible
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000 | grep -q "200\|404"; then
    log_success "Backend is accessible at http://localhost:8000"
else
    log_warning "Backend not accessible at http://localhost:8000"
fi

# Check if Sanity Studio is accessible
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3333 | grep -q "200\|304"; then
    log_success "Sanity Studio is accessible at http://localhost:3333"
else
    log_info "Sanity Studio not running at http://localhost:3333"
fi

# 9. Build Tests
log_header "9. BUILD TESTS"

cd frontend 2>/dev/null

# Try to build frontend
log_info "Testing frontend build..."
if npm run build &> build.log; then
    log_success "Frontend build successful"
    rm build.log
else
    log_error "Frontend build failed (check build.log for details)"
    tail -20 build.log
fi

cd ..

# 10. Git & Version Control
log_header "10. GIT & VERSION CONTROL"

if [ -d ".git" ]; then
    log_success "Git repository initialized"
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "You have uncommitted changes"
    else
        log_success "Working directory is clean"
    fi
else
    log_error "Not a git repository"
fi

# Summary
log_header "TEST SUMMARY"

echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All critical tests passed!${NC}"
else
    echo -e "\n${RED}⚠️  Some tests failed. Please address the issues above.${NC}"
fi

# Recommendations
if [ $FAILED_TESTS -gt 0 ] || [ $WARNINGS -gt 0 ]; then
    log_header "RECOMMENDATIONS"
    
    if [ $FAILED_TESTS -gt 0 ]; then
        echo "1. Fix critical errors first (marked with ❌)"
    fi
    
    if [ $WARNINGS -gt 0 ]; then
        echo "2. Address warnings to improve stability (marked with ⚠️)"
    fi
    
    echo "3. Run 'docker-compose logs -f' to check for runtime errors"
    echo "4. Check frontend CSS with: docker exec etownz_grants-frontend-1 ls -la .next/static/css/"
fi

# Optional: Generate detailed report
echo -e "\nGenerating detailed report..."
cat > test-report-$(date +%Y%m%d-%H%M%S).txt << EOF
eTownz Grants Test Report
Generated: $(date)

Test Summary:
- Total Tests: $TOTAL_TESTS
- Passed: $PASSED_TESTS
- Failed: $FAILED_TESTS
- Warnings: $WARNINGS

System Information:
- Node Version: $(node -v 2>/dev/null || echo "Not installed")
- npm Version: $(npm -v 2>/dev/null || echo "Not installed")
- Docker Version: $(docker --version 2>/dev/null || echo "Not installed")
- OS: $(uname -s)

EOF

echo -e "\n📄 Detailed report saved to test-report-*.txt"
