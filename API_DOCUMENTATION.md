# eTownz Grants AI-Powered API Documentation

## Overview

This document provides comprehensive documentation for the eTownz Grants platform API, including the newly integrated AI-powered features for intelligent grant discovery and matching.

## Base URLs

- **Development**: `http://localhost:3001/api` (Frontend) → `http://localhost:8000` (Backend)
- **Production**: `https://grants.etownz.com/api` (Frontend) → `https://api.grants.etownz.com` (Backend)

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

## AI-Powered Grant APIs

### Grant Matching & Discovery

#### POST /api/ai/grants/match
**AI-Powered Grant Matching**

Find grants matching an organization profile using advanced AI analysis and semantic similarity.

**Request Body:**
```json
{
  "organizationProfile": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "sector": "string",
    "size": "startup|small|medium|large|enterprise",
    "location": "string",
    "capabilities": ["string"],
    "previousGrants": ["string"]
  },
  "filters": {
    "search": "string",
    "categories": ["string"],
    "amountMin": "number",
    "amountMax": "number"
  },
  "limit": "number (1-50, default: 10)"
}
```

**Response:**
```json
{
  "matches": [
    {
      "grant": { /* Grant object */ },
      "matchScore": "number (0-100)",
      "analysisResult": {
        "overallCompatibility": "number",
        "eligibilityStatus": "ELIGIBLE|PARTIALLY_ELIGIBLE|NOT_ELIGIBLE|UNCLEAR",
        "matchingCriteria": ["string"],
        "recommendations": ["string"],
        "reasoning": "string",
        "confidence": "number"
      },
      "semanticSimilarity": "number (0-1)",
      "reasoning": "string",
      "recommendations": ["string"]
    }
  ],
  "processingTime": "number (ms)",
  "aiModel": "string",
  "metadata": {
    "totalMatches": "number",
    "averageScore": "number",
    "timestamp": "ISO string"
  }
}
```

#### POST /api/ai/grants/search/semantic
**Semantic Search for Grants**

Perform natural language search using AI embeddings and vector similarity.

**Request Body:**
```json
{
  "query": "string (required)",
  "organizationId": "uuid (optional)",
  "filters": {
    "categories": ["string"],
    "amountRange": {
      "min": "number",
      "max": "number"
    }
  },
  "limit": "number (1-50, default: 10)"
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "similarity": "number (0-1)",
      "metadata": "object",
      "reasoning": "string"
    }
  ],
  "query": "string",
  "processingTime": "number (ms)",
  "totalResults": "number",
  "metadata": {
    "enhanced": "boolean",
    "filters": "object",
    "timestamp": "ISO string"
  }
}
```

#### POST /api/ai/grants/[grantId]/analyze
**Individual Grant Analysis**

Analyze a specific grant's compatibility with an organization profile.

**Request Body:**
```json
{
  "organizationProfile": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "sector": "string",
    "capabilities": ["string"]
  },
  "query": "string (optional specific analysis focus)"
}
```

**Response:**
```json
{
  "grantId": "string",
  "organizationId": "string",
  "analysis": {
    "overallCompatibility": "number",
    "eligibilityStatus": "string",
    "matchingCriteria": ["string"],
    "recommendations": ["string"],
    "reasoning": "string",
    "confidence": "number"
  },
  "processingTime": "number (ms)",
  "metadata": {
    "grantTitle": "string",
    "analysisFocus": "string",
    "timestamp": "ISO string"
  }
}
```

### AI System Management

#### GET /api/ai/health
**AI Services Health Check**

Get the health status of AI services and processing statistics.

**Response:**
```json
{
  "status": "healthy|unhealthy",
  "grantsProcessed": "number",
  "vectorsStored": "number",
  "aiInteractions": "number",
  "errors": ["string"] // present if unhealthy,
  "timestamp": "ISO string",
  "services": {
    "grants": "healthy|unhealthy",
    "openai": "healthy|unhealthy",
    "vectorDb": "healthy|unhealthy"
  }
}
```

#### GET /api/ai/stats
**AI Processing Statistics**

Get detailed AI processing statistics and metrics.

**Response:**
```json
{
  "grantsProcessed": "number",
  "vectorsStored": "number",
  "aiInteractions24h": "number",
  "status": "string",
  "timestamp": "ISO string",
  "metadata": {
    "lastUpdated": "ISO string",
    "version": "string"
  }
}
```

## Traditional Grant APIs

#### GET /api/grants
**List Grants with Filtering**

Get a paginated list of grants with advanced filtering options.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (1-100, default: 20)
- `search`: Search query for title/description/funder
- `funder`: Filter by funder name
- `categories`: Comma-separated list of categories
- `amount_min`: Minimum funding amount
- `amount_max`: Maximum funding amount
- `deadline_from`: Filter grants with deadline after this date
- `deadline_to`: Filter grants with deadline before this date
- `sort_by`: Field to sort by (deadline|amount|created_at|title)
- `sort_order`: Sort order (ASC|DESC)

**Response:**
```json
{
  "grants": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "summary": "string",
      "deadline": "ISO date",
      "funder": "string",
      "amount_min": "number",
      "amount_max": "number",
      "currency": "string",
      "url": "string",
      "categories": ["string"],
      "eligibility_criteria": "object",
      "is_active": "boolean",
      "created_at": "ISO date",
      "updated_at": "ISO date"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "pages": "number"
  }
}
```

#### POST /api/grants/search/ai
**Legacy AI Search Endpoint**

Legacy endpoint for AI-powered grant search (maintained for backwards compatibility).

**Request Body:**
```json
{
  "org_profile": {
    "id": "uuid",
    "name": "string",
    "description": "string"
  },
  "filters": "object",
  "limit": "number"
}
```

## Web Scraping APIs

### Scraping Job Management

#### GET /api/scraping/jobs
**List Scraping Jobs**

Get all web scraping and crawling jobs with their status.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (1-100, default: 20)
- `status`: Filter by status (pending|running|completed|failed|paused)

**Response:**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "source_url": "string",
      "job_type": "full_crawl|targeted_scrape|document_harvest|link_discovery",
      "status": "pending|running|completed|failed|paused",
      "progress": "number (0-100)",
      "stats": {
        "pages_scraped": "number",
        "documents_processed": "number",
        "links_discovered": "number",
        "grants_found": "number",
        "errors_encountered": "number",
        "processing_time_ms": "number"
      },
      "started_at": "ISO date",
      "completed_at": "ISO date",
      "created_at": "ISO date"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "pages": "number"
  }
}
```

#### POST /api/scraping/jobs
**Create New Scraping Job**

Start a new web scraping job.

**Request Body:**
```json
{
  "source_url": "string (required)",
  "job_type": "full_crawl|targeted_scrape|document_harvest|link_discovery",
  "configuration": {
    "max_depth": "number (1-10, default: 3)",
    "include_patterns": ["string"],
    "exclude_patterns": ["string"],
    "process_documents": "boolean (default: true)"
  }
}
```

#### GET /api/scraping/pages
**List Scraped Pages**

Get all scraped web pages.

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by processing status
- `search`: Search in page titles and URLs

#### GET /api/scraping/documents
**List Scraped Documents**

Get all scraped documents (PDFs, DOCs, etc.).

**Query Parameters:**
- `page`, `limit`: Pagination
- `file_type`: Filter by file type (pdf|docx|doc|txt)
- `search`: Search in document titles and content

#### GET /api/scraping/stats
**Scraping Statistics**

Get comprehensive scraping statistics.

**Response:**
```json
{
  "jobs": {
    "total": "number"
  },
  "pages": {
    "total": "number"
  },
  "documents": {
    "total": "number"
  }
}
```

## Error Handling

All APIs follow consistent error response format:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": "Detailed error information (development only)"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

- **Standard endpoints**: 100 requests per minute per IP
- **AI endpoints**: 10 requests per minute per user (due to processing costs)
- **Scraping endpoints**: 5 requests per minute per user

## AI Features Integration

### Key Capabilities

1. **Semantic Search**: Natural language search using OpenAI embeddings
2. **Grant Matching**: AI-powered compatibility analysis between organizations and grants
3. **Intelligent Recommendations**: AI-generated suggestions and reasoning
4. **Vector Database**: Fast similarity search using Pinecone
5. **Real-time Processing**: Live AI analysis with performance metrics

### AI Models Used

- **Text Embeddings**: `text-embedding-3-small` (OpenAI)
- **Analysis & Reasoning**: `gpt-4o-mini` (OpenAI)
- **Vector Storage**: Pinecone vector database

### Performance Considerations

- AI endpoints typically take 1-5 seconds for processing
- Results are cached when possible to improve performance
- Vector similarity search is optimized for sub-second responses
- All AI interactions are logged for monitoring and analytics

## Frontend Integration

### React/Next.js Usage Examples

```typescript
// AI Grant Matching
const matchGrants = async (organizationProfile: OrganizationProfile) => {
  const response = await fetch('/api/ai/grants/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationProfile, limit: 10 })
  });
  return response.json();
};

// Semantic Search
const semanticSearch = async (query: string) => {
  const response = await fetch('/api/ai/grants/search/semantic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: 10 })
  });
  return response.json();
};

// Health Check
const checkAIHealth = async () => {
  const response = await fetch('/api/ai/health');
  return response.json();
};
```

## Monitoring & Analytics

All AI interactions are automatically logged with:
- Processing time metrics
- Model usage statistics
- Cost tracking
- Error rates and types
- User interaction patterns

## Security & Privacy

- All AI processing respects data privacy regulations
- No sensitive data is stored in vector databases
- API keys and credentials are properly secured
- All requests are authenticated and rate-limited
- AI analysis results can be cached but are not shared between organizations