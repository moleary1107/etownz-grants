#!/bin/bash

# Docker Health Check Script
# Monitors and reports on Docker image and container health

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🐳 Docker Health Check Report${NC}"
echo "================================"

# 1. Check Docker daemon
echo -e "\n${YELLOW}1. Docker Daemon Status:${NC}"
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker daemon is running${NC}"
    docker version --format 'Server Version: {{.Server.Version}}'
else
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    exit 1
fi

# 2. Check disk space
echo -e "\n${YELLOW}2. Disk Space:${NC}"
df -h / | grep -E "^/|Filesystem"
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo -e "${RED}⚠️  Warning: Disk usage is above 80%${NC}"
else
    echo -e "${GREEN}✅ Disk space is healthy${NC}"
fi

# 3. Docker system info
echo -e "\n${YELLOW}3. Docker System Info:${NC}"
docker system df

# 4. Check running containers
echo -e "\n${YELLOW}4. Running Containers:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 5. Check etownz images
echo -e "\n${YELLOW}5. eTownz Docker Images:${NC}"
docker images | grep -E "etownz|REPOSITORY" || echo "No etownz images found"

# 6. Check for dangling images
echo -e "\n${YELLOW}6. Dangling Images:${NC}"
DANGLING=$(docker images -f "dangling=true" -q | wc -l)
if [ $DANGLING -gt 0 ]; then
    echo -e "${YELLOW}Found $DANGLING dangling images${NC}"
    echo "Run 'docker image prune' to clean them up"
else
    echo -e "${GREEN}✅ No dangling images${NC}"
fi

# 7. Container health status
echo -e "\n${YELLOW}7. Container Health Status:${NC}"
for container in $(docker ps --format "{{.Names}}"); do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "no health check")
    STATUS=$(docker inspect --format='{{.State.Status}}' $container)
    
    if [ "$HEALTH" = "healthy" ] || ([ "$HEALTH" = "no health check" ] && [ "$STATUS" = "running" ]); then
        echo -e "${GREEN}✅ $container: $STATUS ($HEALTH)${NC}"
    else
        echo -e "${RED}❌ $container: $STATUS ($HEALTH)${NC}"
    fi
done

# 8. Memory and CPU usage
echo -e "\n${YELLOW}8. Resource Usage:${NC}"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# 9. Recent container logs errors
echo -e "\n${YELLOW}9. Recent Errors (last 10 minutes):${NC}"
for container in $(docker ps --format "{{.Names}}" | grep etownz); do
    echo -e "\n${BLUE}Container: $container${NC}"
    docker logs --since 10m $container 2>&1 | grep -iE "error|exception|fatal|panic" | tail -5 || echo "No recent errors"
done

# 10. Recommendations
echo -e "\n${YELLOW}10. Recommendations:${NC}"

# Check if using latest tags
if docker images | grep -q ":latest"; then
    echo -e "${YELLOW}⚠️  Consider using specific version tags instead of :latest${NC}"
fi

# Check for old images
OLD_IMAGES=$(docker images | grep etownz | awk '$4 ~ /weeks|months/ {print $1":"$2}' | wc -l)
if [ $OLD_IMAGES -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $OLD_IMAGES old images. Consider cleaning with: docker image prune -a${NC}"
fi

# Check compose file
if [ -f "docker-compose.prod.yml" ]; then
    if grep -q "image:" docker-compose.prod.yml && ! grep -q "build:" docker-compose.prod.yml; then
        echo -e "${YELLOW}⚠️  docker-compose.prod.yml uses pre-built images. Consider adding build context for local builds.${NC}"
    fi
fi

echo -e "\n${GREEN}✅ Health check complete!${NC}"