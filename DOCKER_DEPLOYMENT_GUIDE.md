# Docker Deployment Guide

This guide ensures reliable Docker deployments and prevents image/build issues.

## Quick Start

```bash
# For production deployment with proper builds:
./scripts/deploy-prod.sh

# To check Docker health:
./scripts/docker-health-check.sh
```

## Problem Prevention

### 1. **Always Use Tagged Images**
Instead of relying on `:latest`, use build tags:
```yaml
image: etownz-grants-frontend:prod-${BUILD_TAG:-latest}
```

### 2. **Local Build Configuration**
We now have `docker-compose.prod-local.yml` that:
- Always builds from source
- Uses proper production Dockerfiles
- Includes health checks
- Tags images with timestamps

### 3. **Health Checks**
All services include health checks:
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### 4. **Automated Build Verification**
GitHub Actions workflow checks:
- Frontend builds successfully
- Backend compiles without errors
- Docker images build correctly
- Routes (like knowledge-base) are included

## Deployment Process

### Safe Deployment Steps

1. **Pre-deployment Checks**
   ```bash
   git status                    # Ensure clean working directory
   git branch --show-current     # Verify on main branch
   ./test-all.sh                # Run tests
   ```

2. **Deploy with Script**
   ```bash
   ./scripts/deploy-prod.sh
   ```
   This script:
   - Validates branch and git status
   - Builds with unique tags
   - Performs health checks
   - Cleans old images
   - Verifies deployment

3. **Manual Deployment** (if needed)
   ```bash
   ssh root@165.227.149.136
   cd /root/etownz-grants
   git pull
   
   # Build with tag
   export BUILD_TAG=$(date +%Y%m%d-%H%M%S)
   docker-compose -f docker-compose.prod-local.yml build
   
   # Deploy
   docker-compose -f docker-compose.prod-local.yml down
   docker-compose -f docker-compose.prod-local.yml up -d
   
   # Verify
   docker-compose -f docker-compose.prod-local.yml ps
   curl http://localhost:3001  # Frontend
   curl http://localhost:3001/health  # Backend
   ```

## Troubleshooting

### Issue: Page showing 404 after deployment

1. **Check if route is in build:**
   ```bash
   docker exec etownz-grants-frontend-1 ls -la .next/server/app/dashboard/
   ```

2. **Verify correct Dockerfile:**
   ```bash
   docker inspect etownz-grants-frontend-1 | grep -E "Cmd|NODE_VERSION"
   ```
   - Should show Node 20 for production
   - Should NOT show "npm run dev"

3. **Force rebuild:**
   ```bash
   docker-compose -f docker-compose.prod-local.yml down
   docker rmi etownz-grants-frontend:prod-latest
   docker-compose -f docker-compose.prod-local.yml build --no-cache frontend
   docker-compose -f docker-compose.prod-local.yml up -d
   ```

### Issue: Old images being used

1. **Check current images:**
   ```bash
   docker images | grep etownz
   ```

2. **Remove old images:**
   ```bash
   # Remove specific old image
   docker rmi IMAGE_ID
   
   # Clean all unused images
   docker image prune -a
   ```

3. **Verify new image is used:**
   ```bash
   docker ps --format "table {{.Names}}\t{{.Image}}\t{{.CreatedAt}}"
   ```

## Best Practices

### 1. **Version Control**
- Tag releases: `git tag -a v1.0.0 -m "Release version 1.0.0"`
- Use semantic versioning

### 2. **Environment Variables**
- Keep `.env` files out of git
- Use `.env.example` as template
- Document all required variables

### 3. **Regular Maintenance**
```bash
# Weekly cleanup
docker system prune -f
docker volume prune -f

# Check disk space
df -h

# Review logs
docker-compose logs --tail=100 | grep -i error
```

### 4. **Monitoring**
Set up monitoring for:
- Container restarts
- Memory/CPU usage
- Disk space
- Response times

## Configuration Files

### docker-compose.prod-local.yml
- Production configuration with local builds
- Includes health checks
- Uses build tags
- Mounts necessary volumes

### docker-compose.prod.yml
- Can be updated to use registry OR local builds
- Currently configured for local builds

### Deploy Script Features
- Git branch validation
- Uncommitted changes check
- Automated testing
- Health verification
- Old image cleanup
- Post-deployment tests

## Emergency Rollback

If deployment fails:

1. **Quick Rollback:**
   ```bash
   cd /root/etownz-grants
   git reset --hard HEAD~1
   docker-compose -f docker-compose.prod-local.yml down
   docker-compose -f docker-compose.prod-local.yml up -d
   ```

2. **Use Previous Image:**
   ```bash
   # List available images
   docker images | grep etownz-grants-frontend
   
   # Tag old image as latest
   docker tag etownz-grants-frontend:prod-20240605-120000 etownz-grants-frontend:prod-latest
   
   # Restart
   docker-compose -f docker-compose.prod-local.yml up -d
   ```

## Continuous Improvement

1. **Monitor Build Times**
   - Track how long builds take
   - Optimize Dockerfile layers
   - Use build cache effectively

2. **Review Logs Regularly**
   ```bash
   # Check for patterns
   docker-compose logs --tail=1000 | grep -i "error\|warning" | sort | uniq -c
   ```

3. **Update Dependencies**
   - Regular security updates
   - Test thoroughly before deploying

Remember: **Always build locally, never rely solely on registry images for production updates!**