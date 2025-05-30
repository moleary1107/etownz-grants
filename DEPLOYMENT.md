# eTownz Grants Deployment Guide

## 📋 Prerequisites Checklist

### 1. Environment Variables (Update `.env` file)
```bash
# Required API Keys
OPENAI_API_KEY=sk-...           # Get from OpenAI
FIRECRAWL_API_KEY=fc-...        # Get from FireCrawl.dev
PINECONE_API_KEY=...            # Get from Pinecone.io
SENDGRID_API_KEY=SG....         # Get from SendGrid
STRIPE_SECRET_KEY=sk_live_...   # Get from Stripe

# Database passwords (generate secure ones)
POSTGRES_PASSWORD=your_secure_password
RABBITMQ_USER=etownz
RABBITMQ_PASS=your_secure_password

# DigitalOcean setup
DO_DROPLET_IP=123.45.67.89      # Your droplet IP
DO_SPACES_KEY=...               # DO Spaces access key
DO_SPACES_SECRET=...            # DO Spaces secret
```

### 2. DigitalOcean Setup

#### Create Droplet:
```bash
# 1. Create 4GB+ droplet with Ubuntu 22.04
# 2. Add your SSH key
# 3. Note the IP address
# 4. Update DO_DROPLET_IP in .env
```

#### Create Container Registry:
```bash
# 1. Go to Container Registry in DO dashboard
# 2. Create registry named "etownz"
# 3. Connect Docker: doctl registry login
```

#### Create Spaces (Object Storage):
```bash
# 1. Create Space named "etownz-grants"
# 2. Generate API keys
# 3. Add keys to .env file
```

### 3. Domain Setup
```bash
# 1. Point grants.etownz.com to your droplet IP
# 2. Update DOMAIN_NAME in .env
```

## 🚀 Deployment Steps

### 1. Initial Droplet Setup
```bash
# Setup droplet with Docker, Nginx, SSL
./scripts/setup-droplet.sh
```

### 2. Deploy Application
```bash
# Build and deploy to production
./scripts/deploy-to-do.sh
```

### 3. Verify Deployment
- Frontend: https://grants.etownz.com
- API: https://grants.etownz.com/api/health
- Admin: https://grants.etownz.com/api/docs

## 🤖 MCP Servers

### Documentation Server (Port 9000)
- **Purpose**: Auto-generates API docs and architecture diagrams
- **Features**: 
  - Real-time documentation updates
  - Mermaid diagrams
  - Code analysis
- **Enable**: Set `MCP_DOCS_ENABLED=true`

### Automation Server (Port 9001) 
- **Purpose**: Handles scheduled tasks and workflows
- **Features**:
  - Daily deadline reminders (9 AM)
  - Scheduled crawling (2 AM daily)
  - Monthly usage reports
- **Enable**: Set `MCP_AUTOMATION_ENABLED=true`

## 🕷️ Web Scraping Configuration

### Irish Grant Sources (in `crawler/src/config/scrapeTargets.ts`):

#### Government Sources:
- Enterprise Ireland
- Science Foundation Ireland  
- IDA Ireland
- Department of Enterprise

#### Local Councils:
- Dublin City Council
- Cork City Council
- Galway City Council

#### EU Sources:
- Horizon Europe
- Interreg Europe

#### Foundations:
- The Ireland Funds
- Community Foundation for Ireland

### Crawl Configuration:
- **Government**: Daily crawls
- **Councils**: Every 2 days
- **EU**: Every 3 days  
- **Foundations**: Weekly
- **Rate Limit**: 2 seconds between requests
- **Retry Logic**: 3 attempts with 5-second delay

## 🔐 Security Features

- SSL certificates via Let's Encrypt
- Rate limiting on all endpoints
- JWT authentication
- Environment variable encryption
- Database connection pooling
- Input validation and sanitization

## 📊 Monitoring

- **Health Checks**: All services expose `/health` endpoints
- **Logging**: Centralized logging via Winston
- **Error Tracking**: Sentry integration
- **Metrics**: API usage and performance tracking

## 💰 Estimated Costs (EUR/month)

- **DigitalOcean Droplet (4GB)**: €24
- **DigitalOcean Spaces**: €5
- **Container Registry**: €5
- **OpenAI API**: €50-200 (usage-based)
- **FireCrawl API**: €29-99
- **Pinecone**: €70
- **SendGrid**: €20
- **Domain/SSL**: €15

**Total**: €218-438/month

## 🛠️ Development vs Production

### Development (Local):
```bash
./scripts/dev-start.sh
# Frontend: http://localhost:3001
# Backend: http://localhost:8000
```

### Production (DigitalOcean):
```bash
./scripts/deploy-to-do.sh  
# Frontend: https://grants.etownz.com
# Backend: https://grants.etownz.com/api
```