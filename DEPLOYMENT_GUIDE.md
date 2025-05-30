# eTownz Grants - Deployment Guide

This guide covers the complete deployment process for the eTownz Grants application, including both manual and automated CI/CD deployments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Manual Deployment](#manual-deployment)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Architecture-Specific Builds](#architecture-specific-builds)
6. [PWA Deployment](#pwa-deployment)
7. [Troubleshooting](#troubleshooting)
8. [Monitoring](#monitoring)

## Prerequisites

### Required Tools
- Docker Desktop
- Git
- SSH key for DigitalOcean droplet
- DigitalOcean account with Container Registry access

### Required Environment Variables
```bash
# API Keys
OPENAI_API_KEY=your_openai_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key
PINECONE_API_KEY=your_pinecone_api_key

# Database & Cache
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379

# Authentication
JWT_SECRET=your_jwt_secret

# External Services
SENDGRID_API_KEY=your_sendgrid_key
STRIPE_SECRET_KEY=your_stripe_key

# Digital Ocean
DO_SPACES_KEY=your_do_spaces_key
DO_SPACES_SECRET=your_do_spaces_secret
DO_SPACES_ENDPOINT=fra1.digitaloceanspaces.com
DO_SPACES_BUCKET=etownz-grants
DO_REGISTRY_TOKEN=your_registry_token
DO_DROPLET_IP=165.227.149.136
DO_SSH_KEY_PATH=~/.ssh/etownz_grants

# Monitoring
SENTRY_DSN=your_sentry_dsn

# Domain
DOMAIN_NAME=grants.etownz.com
```

## Environment Setup

### 1. Create Environment Files

Use the setup script to create environment-specific configurations:

```bash
# For production
./scripts/setup-env.sh production

# For staging
./scripts/setup-env.sh staging
```

### 2. Load Environment Variables

```bash
# Load production environment
source .env.production

# Or load staging environment
source .env.staging
```

## Manual Deployment

### Quick Deployment

Deploy all services to production:
```bash
./scripts/deploy-to-do.sh
```

### Service-Specific Deployment

Deploy only the frontend:
```bash
./scripts/deploy-to-do.sh --service frontend
```

Deploy to staging environment:
```bash
./scripts/deploy-to-do.sh --env staging
```

Force rebuild (ignore cache):
```bash
./scripts/deploy-to-do.sh --force-rebuild
```

### Deployment Script Options

| Option | Description | Example |
|--------|-------------|---------|
| `--service` | Deploy specific service | `--service frontend` |
| `--env` | Target environment | `--env staging` |
| `--force-rebuild` | Force rebuild without cache | `--force-rebuild` |
| `--help` | Show help information | `--help` |

## CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline automatically:
1. Runs tests for frontend and backend
2. Performs security scanning
3. Builds Docker images for AMD64 architecture
4. Pushes images to DigitalOcean Container Registry
5. Deploys to staging (develop branch) or production (main branch)
6. Updates API documentation

### Required GitHub Secrets

Set these secrets in your GitHub repository settings:

```bash
# DigitalOcean
DO_REGISTRY_TOKEN=dop_v1_xxx
DO_DROPLET_IP=165.227.149.136
DO_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----

# Staging (optional)
DO_STAGING_DROPLET_IP=your_staging_ip
DO_STAGING_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
STAGING_DATABASE_URL=postgresql://...
STAGING_REDIS_URL=redis://...

# API Keys (same as environment variables above)
OPENAI_API_KEY=sk-proj-xxx
JWT_SECRET=your_jwt_secret
# ... (all other environment variables)
```

### Triggering Deployments

- **Staging**: Push to `develop` branch
- **Production**: Push to `main` branch
- **Pull Requests**: Runs tests and security scans only

## Architecture-Specific Builds

### Problem
Docker images built on Apple Silicon (ARM64) won't run on DigitalOcean droplets (AMD64).

### Solution
The deployment scripts now explicitly target `linux/amd64` platform:

```bash
# In deployment script
export DOCKER_DEFAULT_PLATFORM=linux/amd64

# In Docker build commands
docker build --platform linux/amd64 ...
```

### CI/CD Platform Targeting
```yaml
# In .github/workflows/ci.yml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    platforms: linux/amd64
```

## PWA Deployment

### Current Status
PWA features are temporarily disabled in production due to service worker conflicts.

### Re-enabling PWA

1. **Use PWA-enabled configuration:**
   ```bash
   cp frontend/next.config.prod.ts frontend/next.config.ts
   ```

2. **Update globals.css for Tailwind v4:**
   ```css
   @import "tailwindcss";
   ```

3. **Test deployment:**
   ```bash
   ./scripts/deploy-to-do.sh --service frontend --force-rebuild
   ```

### PWA Features
- Offline support
- App installation prompts
- Background sync
- Push notifications (configured but not implemented)
- Optimized caching strategies

## Troubleshooting

### Common Issues

#### 1. Architecture Mismatch
**Error**: `exec format error`
**Solution**: Ensure `--platform linux/amd64` is used in Docker builds

#### 2. CSS Parsing Errors
**Error**: `Module parse failed: Unexpected character '@'`
**Solution**: Use Tailwind v3 syntax:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### 3. Service Worker Conflicts
**Error**: GenerateSW warnings, 500 errors
**Solution**: Temporarily disable PWA or use production PWA config

#### 4. Environment Variables Missing
**Error**: Docker compose warnings about unset variables
**Solution**: Ensure `.env` file exists on droplet with all required variables

#### 5. Registry Authentication
**Error**: `unauthorized` when pushing to registry
**Solution**: Check `DO_REGISTRY_TOKEN` and run `doctl registry login`

### Debug Commands

Check container status:
```bash
ssh root@$DO_DROPLET_IP "docker compose -f docker-compose.prod.yml ps"
```

View container logs:
```bash
ssh root@$DO_DROPLET_IP "docker logs root-frontend-1 --tail 20"
```

Check disk space:
```bash
ssh root@$DO_DROPLET_IP "df -h && docker system df"
```

## Monitoring

### Health Checks
The deployment script automatically performs health checks:
- Production: `https://grants.etownz.com`
- Staging: `http://staging_ip:3001`

### Container Monitoring
```bash
# Check all containers
docker compose -f docker-compose.prod.yml ps

# View resource usage
docker stats

# Check logs
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Application Monitoring
- **Sentry**: Error tracking and performance monitoring
- **Logs**: Application logs via Docker
- **Uptime**: External monitoring service recommended

## Performance Optimizations

### Docker Optimizations
- Multi-stage builds for smaller images
- Layer caching in CI/CD
- Regular cleanup of unused images

### Application Optimizations
- Next.js build optimizations
- Image optimization
- PWA caching strategies
- CDN for static assets (DigitalOcean Spaces)

## Security Considerations

### Secrets Management
- Use GitHub Secrets for CI/CD
- Environment files with restricted permissions (600)
- Regular rotation of API keys

### Network Security
- HTTPS enforcement
- Security headers in Next.js config
- Rate limiting on API endpoints
- Database connection over SSL

### Container Security
- Regular base image updates
- Vulnerability scanning with Trivy
- Non-root user in containers (where possible)
- Resource limits in docker-compose

## Backup and Recovery

### Database Backups
Configure automated backups for PostgreSQL database on DigitalOcean.

### Application Data
- Document uploads: Stored in DigitalOcean Spaces
- Templates: Version controlled in Git
- Configuration: Environment variables in secure storage

### Disaster Recovery
1. Restore from database backup
2. Redeploy latest application version
3. Restore uploaded files from Spaces backup
4. Update DNS if necessary

## Support

For deployment issues:
1. Check this guide's troubleshooting section
2. Review GitHub Actions logs
3. Check container logs on droplet
4. Verify environment variables
5. Contact DevOps team if issues persist

---

Last updated: $(date)
Version: 2.0