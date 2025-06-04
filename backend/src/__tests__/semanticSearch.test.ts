import request from 'supertest';
import express from 'express';
import semanticSearchRoutes from '../routes/semanticSearch';
import { ragKnowledgeBaseService } from '../services/ragKnowledgeBaseService';
import { embeddingService } from '../services/embeddingService';

// Mock dependencies
jest.mock('../services/ragKnowledgeBaseService');
jest.mock('../services/embeddingService');

describe('Semantic Search Routes', () => {
  let app: express.Application;
  const mockRagService = ragKnowledgeBaseService as jest.Mocked<typeof ragKnowledgeBaseService>;
  const mockEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/semantic-search', semanticSearchRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /query', () => {
    it('should perform semantic search with valid query', async () => {
      const mockQuery = 'federal grant requirements';
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockResults = [
        {
          id: 'chunk-1',
          content: 'Federal grants require specific documentation and eligibility criteria.',
          documentId: 'doc-123',
          documentTitle: 'Grant Requirements Guide',
          similarity: 0.95,
          metadata: { category: 'requirements' }
        },
        {
          id: 'chunk-2',
          content: 'Application deadlines are critical for federal grant success.',
          documentId: 'doc-124',
          documentTitle: 'Application Timeline',
          similarity: 0.87,
          metadata: { category: 'deadlines' }
        }
      ];

      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);
      mockRagService.semanticSearch.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({
          query: mockQuery,
          limit: 10,
          threshold: 0.7
        })
        .expect(200);

      expect(response.body).toHaveProperty('query', mockQuery);
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0]).toHaveProperty('similarity', 0.95);
      expect(response.body).toHaveProperty('totalResults', 2);
      expect(response.body).toHaveProperty('processingTime');

      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(mockQuery);
      expect(mockRagService.semanticSearch).toHaveBeenCalledWith(
        mockEmbedding,
        expect.objectContaining({
          limit: 10,
          threshold: 0.7
        })
      );
    });

    it('should validate required query parameter', async () => {
      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Query is required');
    });

    it('should validate query minimum length', async () => {
      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({ query: 'a' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Query must be at least 2 characters');
    });

    it('should apply default parameters when not provided', async () => {
      const mockQuery = 'test query';
      mockEmbeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockRagService.semanticSearch.mockResolvedValue([]);

      await request(app)
        .post('/api/semantic-search/query')
        .send({ query: mockQuery })
        .expect(200);

      expect(mockRagService.semanticSearch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          limit: 20, // Default limit
          threshold: 0.5 // Default threshold
        })
      );
    });

    it('should handle filters in search', async () => {
      const mockQuery = 'eligibility criteria';
      const filters = { category: 'eligibility', documentType: 'guide' };

      mockEmbeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockRagService.semanticSearch.mockResolvedValue([]);

      await request(app)
        .post('/api/semantic-search/query')
        .send({
          query: mockQuery,
          filters: filters
        })
        .expect(200);

      expect(mockRagService.semanticSearch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          filters: filters
        })
      );
    });

    it('should handle embedding service errors', async () => {
      mockEmbeddingService.generateEmbedding.mockRejectedValue(
        new Error('Embedding service unavailable')
      );

      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({ query: 'test query' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to generate query embedding');
    });

    it('should handle search service errors', async () => {
      mockEmbeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockRagService.semanticSearch.mockRejectedValue(
        new Error('Vector database connection failed')
      );

      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({ query: 'test query' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Search failed');
    });
  });

  describe('POST /hybrid', () => {
    it('should perform hybrid search with semantic and keyword components', async () => {
      const mockQuery = 'federal grant application';
      const mockResults = [
        {
          id: 'chunk-1',
          content: 'Federal grant applications require careful preparation.',
          similarity: 0.92,
          keywordScore: 0.85,
          combinedScore: 0.89
        }
      ];

      mockRagService.hybridSearch.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/semantic-search/hybrid')
        .send({
          query: mockQuery,
          semanticWeight: 0.7,
          keywordWeight: 0.3
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body.results[0]).toHaveProperty('combinedScore');
      expect(mockRagService.hybridSearch).toHaveBeenCalledWith(
        mockQuery,
        expect.objectContaining({
          semanticWeight: 0.7,
          keywordWeight: 0.3
        })
      );
    });

    it('should validate weight parameters', async () => {
      const response = await request(app)
        .post('/api/semantic-search/hybrid')
        .send({
          query: 'test query',
          semanticWeight: 0.8,
          keywordWeight: 0.5 // Weights don't sum to 1
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Weights must sum to 1');
    });

    it('should apply default weights when not provided', async () => {
      const mockQuery = 'test query';
      mockRagService.hybridSearch.mockResolvedValue([]);

      await request(app)
        .post('/api/semantic-search/hybrid')
        .send({ query: mockQuery })
        .expect(200);

      expect(mockRagService.hybridSearch).toHaveBeenCalledWith(
        mockQuery,
        expect.objectContaining({
          semanticWeight: 0.7, // Default
          keywordWeight: 0.3   // Default
        })
      );
    });
  });

  describe('GET /suggestions', () => {
    it('should return search suggestions for partial query', async () => {
      const partialQuery = 'grant app';
      const mockSuggestions = [
        'grant application',
        'grant application process',
        'grant application requirements',
        'grant application deadlines'
      ];

      mockRagService.getSuggestions.mockResolvedValue(mockSuggestions);

      const response = await request(app)
        .get(`/api/semantic-search/suggestions?q=${partialQuery}`)
        .expect(200);

      expect(response.body).toHaveProperty('suggestions');
      expect(response.body.suggestions).toEqual(mockSuggestions);
      expect(response.body).toHaveProperty('query', partialQuery);

      expect(mockRagService.getSuggestions).toHaveBeenCalledWith(partialQuery, 10);
    });

    it('should validate query parameter for suggestions', async () => {
      const response = await request(app)
        .get('/api/semantic-search/suggestions')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Query parameter is required');
    });

    it('should handle custom limit for suggestions', async () => {
      const partialQuery = 'test';
      const limit = 5;
      
      mockRagService.getSuggestions.mockResolvedValue([]);

      await request(app)
        .get(`/api/semantic-search/suggestions?q=${partialQuery}&limit=${limit}`)
        .expect(200);

      expect(mockRagService.getSuggestions).toHaveBeenCalledWith(partialQuery, limit);
    });
  });

  describe('GET /similar/:documentId', () => {
    it('should find similar documents to given document', async () => {
      const documentId = 'doc-123';
      const mockSimilarDocs = [
        {
          id: 'doc-124',
          title: 'Related Grant Guide',
          similarity: 0.89,
          summary: 'A comprehensive guide to federal grants.'
        },
        {
          id: 'doc-125',
          title: 'Application Tips',
          similarity: 0.82,
          summary: 'Tips for successful grant applications.'
        }
      ];

      mockRagService.findSimilarDocuments.mockResolvedValue(mockSimilarDocs);

      const response = await request(app)
        .get(`/api/semantic-search/similar/${documentId}`)
        .expect(200);

      expect(response.body).toHaveProperty('documentId', documentId);
      expect(response.body).toHaveProperty('similarDocuments');
      expect(response.body.similarDocuments).toHaveLength(2);
      expect(response.body.similarDocuments[0]).toHaveProperty('similarity', 0.89);

      expect(mockRagService.findSimilarDocuments).toHaveBeenCalledWith(documentId, 10, 0.5);
    });

    it('should handle custom parameters for similar documents', async () => {
      const documentId = 'doc-123';
      const limit = 5;
      const threshold = 0.8;

      mockRagService.findSimilarDocuments.mockResolvedValue([]);

      await request(app)
        .get(`/api/semantic-search/similar/${documentId}?limit=${limit}&threshold=${threshold}`)
        .expect(200);

      expect(mockRagService.findSimilarDocuments).toHaveBeenCalledWith(
        documentId,
        limit,
        threshold
      );
    });

    it('should handle document not found', async () => {
      const documentId = 'non-existent';
      
      mockRagService.findSimilarDocuments.mockRejectedValue(
        new Error('Document not found')
      );

      const response = await request(app)
        .get(`/api/semantic-search/similar/${documentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Document not found');
    });
  });

  describe('POST /cluster', () => {
    it('should cluster search results by topic', async () => {
      const mockQuery = 'grant funding';
      const mockClusters = [
        {
          topic: 'Application Process',
          documents: [
            { id: 'doc-1', title: 'How to Apply', similarity: 0.95 },
            { id: 'doc-2', title: 'Application Tips', similarity: 0.88 }
          ],
          centroid: [0.5, 0.6, 0.7]
        },
        {
          topic: 'Eligibility Requirements',
          documents: [
            { id: 'doc-3', title: 'Who Can Apply', similarity: 0.91 }
          ],
          centroid: [0.3, 0.8, 0.4]
        }
      ];

      mockRagService.clusterSearchResults.mockResolvedValue(mockClusters);

      const response = await request(app)
        .post('/api/semantic-search/cluster')
        .send({
          query: mockQuery,
          numClusters: 3
        })
        .expect(200);

      expect(response.body).toHaveProperty('clusters');
      expect(response.body.clusters).toHaveLength(2);
      expect(response.body.clusters[0]).toHaveProperty('topic');
      expect(response.body.clusters[0]).toHaveProperty('documents');

      expect(mockRagService.clusterSearchResults).toHaveBeenCalledWith(
        mockQuery,
        expect.objectContaining({ numClusters: 3 })
      );
    });

    it('should apply default clustering parameters', async () => {
      const mockQuery = 'test query';
      mockRagService.clusterSearchResults.mockResolvedValue([]);

      await request(app)
        .post('/api/semantic-search/cluster')
        .send({ query: mockQuery })
        .expect(200);

      expect(mockRagService.clusterSearchResults).toHaveBeenCalledWith(
        mockQuery,
        expect.objectContaining({
          numClusters: 5, // Default
          minClusterSize: 2 // Default
        })
      );
    });
  });

  describe('GET /analytics', () => {
    it('should return search analytics data', async () => {
      const mockAnalytics = {
        totalSearches: 1250,
        popularQueries: [
          { query: 'federal grants', count: 45, avgSimilarity: 0.87 },
          { query: 'eligibility criteria', count: 38, avgSimilarity: 0.82 }
        ],
        avgResponseTime: 245,
        successRate: 0.94,
        topDocuments: [
          { id: 'doc-1', title: 'Grant Guide', accessCount: 125 }
        ]
      };

      mockRagService.getSearchAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/semantic-search/analytics')
        .expect(200);

      expect(response.body).toEqual(mockAnalytics);
    });

    it('should handle date range filters for analytics', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      mockRagService.getSearchAnalytics.mockResolvedValue({
        totalSearches: 100,
        popularQueries: [],
        avgResponseTime: 200,
        successRate: 0.95,
        topDocuments: []
      });

      await request(app)
        .get(`/api/semantic-search/analytics?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(mockRagService.getSearchAnalytics).toHaveBeenCalledWith({
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/semantic-search/query')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle service unavailability', async () => {
      mockEmbeddingService.generateEmbedding.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({ query: 'test query' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Service temporarily unavailable');
    });

    it('should handle rate limiting', async () => {
      mockEmbeddingService.generateEmbedding.mockRejectedValue({
        error: { type: 'rate_limit_exceeded', message: 'Rate limit exceeded' }
      });

      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({ query: 'test query' })
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Rate limit exceeded');
    });
  });

  describe('Input Validation', () => {
    it('should validate numeric parameters', async () => {
      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({
          query: 'test query',
          limit: 'invalid',
          threshold: 'invalid'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('must be a number');
    });

    it('should validate parameter ranges', async () => {
      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({
          query: 'test query',
          limit: -1,
          threshold: 1.5
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should sanitize query input', async () => {
      const maliciousQuery = '<script>alert("xss")</script>';
      mockEmbeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockRagService.semanticSearch.mockResolvedValue([]);

      await request(app)
        .post('/api/semantic-search/query')
        .send({ query: maliciousQuery })
        .expect(200);

      // Verify the query was sanitized before processing
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.not.stringContaining('<script>')
      );
    });
  });
});