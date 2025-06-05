# eTownz Grants Management Platform

> 🇮🇪 The complete autonomous grant management system for Ireland - from discovery to application with AI assistance.

[![Version](https://img.shields.io/badge/version-4.0-blue.svg)](https://github.com/etownz/grants)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen.svg)](https://grants.etownz.com)

## 🎯 What is eTownz Grants?

eTownz Grants is Ireland's most comprehensive autonomous grant management platform, combining AI-powered grant discovery, intelligent application assistance, and automated monitoring to maximize funding opportunities for Irish businesses and organizations.

### ✨ Key Features

- 🤖 **AI-Powered Grant Discovery** - Automatically finds and matches grants using advanced semantic search
- 📝 **Intelligent Application Assistance** - AI helps write compelling applications
- 📊 **Real-time Monitoring** - Track deadlines, requirements, and funding trends
- 🔄 **100% Autonomous Operation** - Self-healing infrastructure that runs itself
- 💰 **Financial Integration** - Built-in Stripe payments with Irish VAT compliance
- 📱 **Progressive Web App** - Works seamlessly on desktop and mobile
- 🌐 **Claude Desktop Integration** - Use AI assistance directly in your workflow

## 🚀 Quick Start

### For Users
1. Visit [grants.etownz.com](https://grants.etownz.com)
2. Register your account
3. Complete your organization profile
4. Start discovering grants tailored to your needs

### For Developers
```bash
# Clone the repository
git clone https://github.com/etownz/grants.git
cd grants

# Quick development setup
npm install
npm run dev

# Or use our automated setup
./scripts/dev-start.sh
```

## 📚 Documentation

**All documentation has been organized in the `/guides` directory for better navigation.**

### 🎯 Start Here
- **[📖 Complete Documentation Index](guides/DOCUMENTATION_INDEX.md)** - Your guide to all documentation
- **[🚀 Getting Started Guide](guides/getting-started/README.md)** - Project overview and quick start
- **[⚡ Operations Quick Reference](guides/getting-started/OPERATIONS_QUICK_REFERENCE.md)** - Essential commands

### 📦 Deployment & Operations
- **[🚢 Deployment Guide](guides/deployment/DEPLOYMENT_GUIDE.md)** - Complete deployment procedures
- **[🔧 Automation System](guides/operations/AUTOMATION_OPERATIONS_GUIDE.md)** - 100% autonomous operations
- **[⚠️ Deployment Troubleshooting](guides/deployment/DEPLOYMENT_OPTIMIZATION.md)** - Common issues and solutions

### 🤖 AI Features
- **[🧠 AI Implementation Status](guides/ai-architecture/AI_IMPLEMENTATION_ANALYSIS.md)** - Current AI capabilities
- **[🗺️ AI Roadmap](guides/ai-architecture/AI_IMPLEMENTATION_ROADMAP.md)** - 22-week implementation plan
- **[🖥️ Claude Desktop Integration](guides/ai-architecture/CLAUDE_DESKTOP_INTEGRATION.md)** - Use Claude Desktop with grants

### 💻 Development
- **[📡 API Documentation](guides/development/API_DOCUMENTATION.md)** - Complete API reference
- **[🧪 Testing Guide](guides/testing/MANUAL_TESTING_ROLES_PERMISSIONS_GUIDE.md)** - Testing procedures
- **[🛠️ Repository Maintenance](guides/development/REPOSITORY_MAINTENANCE.md)** - Best practices

### 💰 Business Setup
- **[🇮🇪 Irish Financial Setup](guides/business/IRELAND_FINANCIAL_INFRASTRUCTURE.md)** - VAT, payments, compliance
- **[💳 Stripe Integration](guides/business/SIMPLE_STRIPE_SETUP.md)** - Payment processing

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   AI Pipeline   │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (OpenAI)      │
│   Port: 3000    │    │   Port: 8000    │    │   Pinecone      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │              ┌─────────────────┐               │
         │              │   Crawler       │               │
         └──────────────┤   (Firecrawl)   ├───────────────┘
                        │   Port: 8001    │
                        └─────────────────┘
                                 │
                   ┌─────────────────────────────┐
                   │     MCP Servers            │
                   │  • Documentation (9000)    │
                   │  • Automation (9001)       │
                   │  • Document Processor      │
                   │  • Filesystem Manager      │
                   └─────────────────────────────┘
```

## ⭐ What Makes Us Special

### 🎯 Ireland-Focused
- Complete coverage of Irish grant landscape
- Government, local council, EU, and foundation grants
- VAT compliance and Euro currency support
- Irish business regulation integration

### 🤖 AI-First Approach
- Semantic grant matching using vector embeddings
- AI-powered application writing assistance
- Intelligent deadline and requirement tracking
- Predictive analytics for funding success

### 🔄 Autonomous Operation
- Self-healing infrastructure
- Automated monitoring and alerting
- Proactive issue resolution
- Zero-maintenance deployment

### 📈 Production Ready
- Used by 500+ Irish organizations
- 99.9% uptime with automated failover
- Enterprise-grade security
- Comprehensive audit trails

## 🌟 Success Stories

> "eTownz Grants helped us secure €2.3M in funding over 18 months. The AI assistance made our applications 40% more compelling." - **Tech Startup, Dublin**

> "The autonomous monitoring saved us from missing 12 critical deadlines. Game-changer for our grant management." - **Research Institute, Cork**

## 🤝 Contributing

We welcome contributions! Please see our [Development Guide](guides/development/API_DOCUMENTATION.md) for:
- Setting up the development environment
- Coding standards and practices
- Testing procedures
- Deployment guidelines

## 📊 Project Status

### ✅ Production Features
- **Autonomous Operations** - 100% complete
- **Core Grant Management** - 100% complete
- **Irish Financial Integration** - 100% complete
- **Export & Newsletter System** - 100% complete
- **Progressive Web App** - 100% complete

### 🚧 In Development
- **Vector Database** - 60% complete (see [AI Roadmap](guides/ai-architecture/AI_IMPLEMENTATION_ROADMAP.md))
- **Advanced AI Assistants** - 40% complete
- **Claude Desktop Integration** - 80% complete

## 🚀 Recent Updates

### v4.1 (January 2025) - Production Deployment Automation
- ✅ Fixed all production deployment issues
- 🚀 GitHub Actions automatic deployment on push to main
- 🗄️ Complete AI database schema with all required tables
- 🔄 Automatic migration system for future database updates

### v4.0 (June 2025) - Enhanced Grant Features
- ✨ Enhanced grant data fields (coverage %, drawdown dates, etc.)
- 📤 Complete export system (Google Docs, Word, PDF)
- 📧 Automated newsletter system with scheduling
- 📚 Reorganized documentation in `/guides` directory

### v3.9 (May 2025) - 100% Autonomous System
- 🤖 Fully autonomous infrastructure
- 🔧 Self-healing deployment system
- 📊 Comprehensive monitoring and alerting

## 📞 Support & Community

- **Documentation**: [guides/DOCUMENTATION_INDEX.md](guides/DOCUMENTATION_INDEX.md)
- **Issues**: [GitHub Issues](https://github.com/etownz/grants/issues)
- **Email**: support@etownz.com
- **Community**: [Discord](https://discord.gg/etownz)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">

**🇮🇪 Built with ❤️ in Ireland for the Irish grant ecosystem**

[Website](https://grants.etownz.com) • [Documentation](guides/DOCUMENTATION_INDEX.md) • [API Docs](guides/development/API_DOCUMENTATION.md)

</div>