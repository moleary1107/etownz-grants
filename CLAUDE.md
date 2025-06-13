# eTownz Grants Platform - Claude Code Reference

## Project Overview
A comprehensive grants management platform for Ireland with AI-powered features, built as a monorepo with TypeScript/Node.js backend, Next.js frontend, and Docker containerization.

## Architecture
- **Monorepo Structure**: Root + Frontend + Backend + Crawler + AI Pipeline + MCP Servers
- **Tech Stack**: TypeScript, Node.js, Express, Next.js, PostgreSQL, Redis, Pinecone
- **Infrastructure**: Docker, DigitalOcean, Nginx
- **AI Integration**: OpenAI, RAG system, vector embeddings

## Frequently Used Commands

### Development
```bash
# Start full development environment
npm run dev

# Start individual services
cd backend && npm run dev          # Backend on port 3001
cd frontend && npm run dev         # Frontend on port 3001
cd crawler && npm run dev          # Crawler service

# Build all workspaces
npm run build

# Run tests across all workspaces
npm test

# Lint all workspaces
npm run lint
```

### Backend Specific
```bash
cd backend

# Development with hot reload
npm run dev

# Run specific test suites
npm run test:ai              # AI-related tests
npm run test:vector          # Vector database tests
npm run test:openai          # OpenAI service tests

# Database operations
npm run migrate              # Run database migrations (legacy)
npm run migrate:enhanced     # Enhanced migration runner with rollback
npm run migrate:validate     # Validate migration dependencies
npm run migrate:test         # Run migration tests
npm run seed:demo            # Seed demo users

# Code quality
npm run lint                 # ESLint check
npm run lint:fix             # Auto-fix linting issues

# Documentation
npm run docs                 # Generate Swagger docs
```

### Frontend Specific
```bash
cd frontend

# Development (runs on port 3001)
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint
```

### Docker Operations
```bash
# Start all services
docker-compose up -d

# Clean environment
npm run clean

# Health checks
./scripts/docker-health-check.sh
```

### Database & Migrations
```bash
# Run migrations manually
node backend/src/scripts/run-migrations.js

# Check database schema
node backend/src/scripts/check-database-schema.js

# Seed demo data
cd backend && npm run seed:demo
```

## Code Style & Conventions

### TypeScript Standards
- **Strict mode enabled** - Full type safety
- **Interface over type** - Use interfaces for object shapes
- **Explicit return types** - Always specify function return types
- **No any types** - Use proper typing or unknown

### Naming Conventions
- **Files**: kebab-case (`grant-service.ts`)
- **Directories**: kebab-case (`ai-pipeline/`)
- **Variables/Functions**: camelCase (`getUserGrants`)
- **Classes**: PascalCase (`GrantService`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Interfaces**: PascalCase with 'I' prefix (`IGrantData`)

### File Organization
```
src/
├── routes/           # Express route handlers
├── services/         # Business logic layer
├── repositories/     # Data access layer
├── middleware/       # Express middleware
├── migrations/       # Database migrations
└── __tests__/        # Test files (mirror src structure)
```

### Import Conventions
- **Relative imports** for local files: `./services/grantService`
- **Absolute imports** for external packages: `import express from 'express'`
- **Grouped imports**: External → Internal → Relative

## Testing Strategy

### Current Test Structure
- **Unit Tests**: Individual service/function testing
- **Integration Tests**: API endpoint testing with supertest
- **AI Tests**: Specific AI service validation
- **E2E Tests**: Full workflow testing

### Test Coverage Focus Areas
- Authentication & authorization
- Grant matching algorithms
- AI service integrations
- Database operations
- API endpoint validation

### Running Tests
```bash
# All tests
npm test

# Specific test patterns
npm test -- --testPathPattern=ai
npm test -- --testPathPattern=grants
npm test -- --testPathPattern=integration
```

## API Documentation

### Core API Endpoints

#### Authentication & Users
- **POST** `/api/auth/register` - User registration
- **POST** `/api/auth/login` - User authentication  
- **GET** `/api/auth/profile` - Get user profile
- **PUT** `/api/auth/profile` - Update user profile

#### Grants Management
- **GET** `/api/grants` - List grants with filters
- **GET** `/api/grants/:id` - Get grant details
- **POST** `/api/grants/search` - Advanced grant search
- **GET** `/api/grants/sources` - Available grant sources

#### Applications
- **GET** `/api/applications` - List user applications
- **POST** `/api/applications` - Create new application
- **GET** `/api/applications/:id` - Get application details
- **PUT** `/api/applications/:id` - Update application
- **DELETE** `/api/applications/:id` - Delete application

#### AI-Powered Features
- **POST** `/api/ai/grants/match` - AI grant matching
- **POST** `/api/ai/grants/search/semantic` - Semantic search
- **GET** `/api/ai/stats` - AI usage statistics
- **GET** `/api/ai/health` - AI services health check

#### Grant Intelligence
- **POST** `/api/grant-intelligence/analyze` - Analyze grants
- **GET** `/api/grant-intelligence/insights` - Get insights
- **POST** `/api/grant-intelligence/recommendations` - Get recommendations

#### Organization Management
- **GET** `/api/organizations` - List organizations
- **POST** `/api/organizations` - Create organization
- **PUT** `/api/organizations/:id` - Update organization
- **GET** `/api/organizations/:id/analysis` - Organization analysis

#### Document Management
- **POST** `/api/documents/upload` - Upload documents
- **GET** `/api/documents` - List documents
- **DELETE** `/api/documents/:id` - Delete document
- **POST** `/api/documents/analyze` - AI document analysis

#### Budget & Compliance
- **POST** `/api/budget-optimization/analyze` - Budget analysis
- **GET** `/api/budget-optimization/suggestions` - Budget suggestions
- **POST** `/api/compliance/check` - Compliance checking
- **GET** `/api/compliance/rules` - Get compliance rules

#### Monitoring & Analytics
- **GET** `/api/monitoring/health` - System health
- **GET** `/api/monitoring/metrics` - System metrics
- **GET** `/api/predictive/analytics` - Predictive analytics
- **POST** `/api/predictive/forecast` - Generate forecasts

#### Knowledge Base & Search
- **POST** `/api/knowledge-base/query` - Query knowledge base
- **POST** `/api/semantic-search` - Semantic search
- **GET** `/api/semantic-search/status` - Search status

#### AI Cost & Transparency
- **GET** `/api/ai-cost-management/usage` - AI cost tracking
- **GET** `/api/ai-transparency/log` - AI decision transparency
- **POST** `/api/ai-transparency/explain` - Explain AI decision

### Authentication
- **JWT-based authentication** with Bearer token
- **Role-based access control**: admin, user, partner, organization_admin
- **Session management** with refresh tokens
- **Rate limiting** on sensitive endpoints

### API Response Format
```typescript
// Success Response
{
  success: true,
  data: any,
  message?: string
}

// Error Response  
{
  success: false,
  error: string,
  details?: any
}
```

### Swagger Documentation
Available at `/api-docs` in development mode
Generated from JSDoc comments in route files

## Environment Configuration

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# AI Services
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...

# External Services
FIRECRAWL_API_KEY=...
STRIPE_SECRET_KEY=...
SENDGRID_API_KEY=...

# App Configuration
JWT_SECRET=...
NODE_ENV=development|production
PORT=3001
```

## Deployment

### Production Commands
```bash
# Build for production
npm run build

# Deploy to production
./scripts/deploy-prod.sh

# Health check after deployment
./scripts/deployment-health-check.sh
```

### Docker Configuration
- **Development**: `docker-compose.yml`
- **Production**: `docker-compose.prod.yml`
- **Individual Dockerfiles** for each service

## Common Debugging

### Database Issues
```bash
# Check database connection
node backend/src/scripts/test-database-sync.js

# Verify table structure
node backend/src/scripts/verify-ai-editor-tables.js
```

### Service Health
```bash
# Check all MCP servers
./scripts/check-mcp-health.sh

# Individual service logs
docker-compose logs backend
docker-compose logs frontend
```

## Key Architectural Patterns

### Service Layer Pattern
- Routes handle HTTP concerns
- Services contain business logic
- Repositories manage data access
- Clear separation of concerns

### AI Integration Pattern
- Centralized AI service management
- Vector database for embeddings
- RAG (Retrieval Augmented Generation) system
- Cost tracking and monitoring

### Error Handling
- Global error middleware
- Structured error responses
- Comprehensive logging with Winston
- Sentry integration for production

### Security
- Helmet for security headers
- Rate limiting
- Input validation with Joi
- SQL injection prevention
- XSS protection

## Performance Optimization

### Database
- Connection pooling
- Query optimization
- Proper indexing
- Redis caching

### API
- Response compression
- Pagination for large datasets
- Async/await patterns
- Request/response validation

### Frontend
- Next.js optimization
- Code splitting
- Image optimization
- PWA configuration

## Identified Refactoring Opportunities

### High Priority
1. **Database Migration Issues** - Several tests failing due to missing tables
   - Fix: Run complete migration suite: `npm run migrate`
   - Location: `backend/src/migrations/`

2. **API Key Validation** - Non-ASCII character warnings in OpenAI service
   - Fix: Validate and sanitize API keys on initialization
   - Location: `backend/src/services/openaiService.ts:390`

3. **Test Database Setup** - Many integration tests failing due to missing schema
   - Fix: Ensure test database has all required tables
   - Location: `backend/src/__tests__/`

### Medium Priority
1. **Mock Service Dependencies** - Tests not properly mocking DatabaseService
   - Fix: Improve test mocking patterns
   - Files: `openaiAssistants-simple.test.ts:94`, `partnerCoordination-simple.test.ts:53`

2. **Error Handling Consistency** - Inconsistent error response formats
   - Fix: Standardize error middleware usage
   - Location: `backend/src/middleware/errorHandler.ts`

3. **Code Duplication** - Repeated patterns in route handlers
   - Fix: Extract common validation and response patterns
   - Location: Various route files

### Low Priority
1. **TypeScript Strict Mode** - Some files not fully type-safe
   - Fix: Gradually improve typing, starting with critical services
   
2. **Documentation Coverage** - Some complex AI services need better JSDoc
   - Focus: Vector database operations, RAG system logic

## Test Coverage Analysis

### Current Status
- **Authentication**: ✅ Good coverage (6/6 tests passing)
- **Database**: ✅ Good coverage (10/10 tests passing) 
- **AI Services**: ⚠️ Partial coverage (some failures due to dependencies)
- **Route Integration**: ❌ Many failures due to missing database tables

### Key Gaps Identified
1. **Missing Tables**: `ai_cost_thresholds`, `ai_usage_metrics`, progressive form tables
2. **Service Mocking**: Need better isolation of unit tests from external dependencies
3. **Integration Tests**: Database schema misalignment between test and production

### Recommended Fixes
1. Run database migrations before test suite
2. Create proper test fixtures and mock data
3. Separate unit tests from integration tests
4. Add comprehensive error scenario testing

## Recent Important Changes
- Added comprehensive AI cost management system
- Implemented RAG knowledge base
- Enhanced grant intelligence features
- Improved Docker configuration for development
- Added extensive test coverage for AI services
- Created comprehensive development documentation (CLAUDE.md)

Last Updated: January 2025