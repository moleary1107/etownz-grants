# eTownz Grants Management Platform

A comprehensive SaaS platform for automating the grant application lifecycle in Ireland.

## 🚀 Features

- **Grant Discovery**: Automated crawling of Irish government and council grant opportunities
- **AI-Powered Applications**: LLM-assisted grant application writing
- **Document Management**: Upload and manage organizational documents
- **Deadline Tracking**: Automated reminders and timeline management
- **Submission Tracking**: Monitor application status and outcomes

## 🏗️ Architecture

- **Frontend**: Next.js with TypeScript
- **Backend**: Node.js/Express API
- **Database**: PostgreSQL + Vector DB (Pinecone)
- **Infrastructure**: Docker containers on DigitalOcean
- **AI**: OpenAI GPT-4 integration
- **Crawling**: FireCrawl API + custom scrapers

## 🔧 Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/etownz_grants.git
cd etownz_grants

# Quick start (recommended)
./scripts/dev-start.sh

# OR manual setup
cp .env.example .env
docker-compose up -d
```

## 📡 Service URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Crawler Service**: http://localhost:8001  
- **AI Pipeline**: http://localhost:8002
- **MCP Documentation**: http://localhost:9000

## 📁 Project Structure

```
├── frontend/           # Next.js application
├── backend/           # Node.js API server
├── crawler/           # Grant discovery service
├── ai-pipeline/       # LLM orchestration
├── mcp-servers/       # MCP automation servers
├── docs/              # API documentation
└── infrastructure/    # Docker & deployment configs
```

## 🌟 Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `design/*` - UI/UX updates
- `hotfix/*` - Critical fixes

## 💰 Pricing (EUR)

**Infrastructure Costs (Monthly)**:
- DigitalOcean: €130-260
- APIs & Services: €170-340
- **Total**: €300-600/month

## 📚 Documentation

- [API Documentation](./docs/api/)
- [Development Guide](./docs/development.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Create feature branch from `develop`
2. Make changes and add tests
3. Create pull request to `develop`
4. Code review and merge

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.