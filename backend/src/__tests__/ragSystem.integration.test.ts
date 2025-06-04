import request from 'supertest';
import express from 'express';
import { ragKnowledgeBaseService } from '../services/ragKnowledgeBaseService';
import { embeddingService } from '../services/embeddingService';
import { DatabaseService } from '../services/database';
import knowledgeBaseRoutes from '../routes/knowledgeBase';
import semanticSearchRoutes from '../routes/semanticSearch';

// Mock dependencies
jest.mock('../services/database');
jest.mock('../services/openaiService');
jest.mock('@pinecone-database/pinecone');

describe('RAG System Integration Tests', () => {
  let app: express.Application;
  const mockDb = DatabaseService as jest.Mocked<typeof DatabaseService>;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/knowledge-base', knowledgeBaseRoutes);
    app.use('/api/semantic-search', semanticSearchRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Document Upload and Processing Pipeline', () => {
    it('should process document upload end-to-end', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: 'Test Grant Document',
        content: 'This is a comprehensive guide to federal grant applications. It covers eligibility criteria, application processes, and best practices for success.',
        type: 'guide',
        source: 'federal-grants',
        metadata: {
          author: 'Grant Expert',
          category: 'application-guidance'
        }
      };

      const mockChunks = [
        'This is a comprehensive guide to federal grant applications.',
        'It covers eligibility criteria, application processes.',
        'Best practices for success in grant applications.'
      ];

      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9]
      ];

      // Mock database operations
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'doc-123' }] }) // Insert document
        .mockResolvedValueOnce({ rows: mockChunks.map((chunk, i) => ({ id: `chunk-${i}` })) }); // Insert chunks

      // Mock embedding generation
      jest.spyOn(embeddingService, 'chunkDocument').mockReturnValue(mockChunks);
      jest.spyOn(embeddingService, 'generateBatchEmbeddings').mockResolvedValue(mockEmbeddings);
      jest.spyOn(ragKnowledgeBaseService, 'storeDocument').mockResolvedValue('doc-123');

      const response = await request(app)
        .post('/api/knowledge-base/documents')
        .send(mockDocument)
        .expect(201);

      expect(response.body).toHaveProperty('documentId', 'doc-123');
      expect(response.body).toHaveProperty('chunksCount', 3);
      expect(ragKnowledgeBaseService.storeDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          title: mockDocument.title,
          content: mockDocument.content
        })
      );
    });

    it('should handle document processing errors gracefully', async () => {
      const invalidDocument = {
        title: '', // Missing title
        content: 'Some content'
      };

      const response = await request(app)
        .post('/api/knowledge-base/documents')
        .send(invalidDocument)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Semantic Search Integration', () => {
    it('should perform semantic search across knowledge base', async () => {
      const searchQuery = 'How to apply for federal grants';
      const mockQueryEmbedding = [0.5, 0.5, 0.5];
      const mockSearchResults = [
        {
          id: 'chunk-1',
          content: 'Federal grant applications require careful preparation and attention to detail.',
          documentId: 'doc-123',
          documentTitle: 'Grant Application Guide',
          similarity: 0.95,
          metadata: { category: 'application-guidance' }
        },
        {
          id: 'chunk-2',
          content: 'Eligibility criteria must be thoroughly reviewed before starting your application.',
          documentId: 'doc-124',
          documentTitle: 'Eligibility Requirements',
          similarity: 0.87,
          metadata: { category: 'eligibility' }
        }
      ];

      // Mock search operations
      jest.spyOn(embeddingService, 'generateEmbedding').mockResolvedValue(mockQueryEmbedding);
      jest.spyOn(ragKnowledgeBaseService, 'semanticSearch').mockResolvedValue(mockSearchResults);

      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({
          query: searchQuery,
          limit: 10,
          threshold: 0.7
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0]).toHaveProperty('similarity', 0.95);
      expect(response.body.results[0]).toHaveProperty('content');
      expect(response.body.results[0]).toHaveProperty('documentTitle');
    });

    it('should filter search results by metadata', async () => {
      const searchQuery = 'grant eligibility';
      const filters = { category: 'eligibility' };

      const mockResults = [
        {
          id: 'chunk-2',
          content: 'Eligibility criteria for federal grants.',
          similarity: 0.90,
          metadata: { category: 'eligibility' }
        }
      ];

      jest.spyOn(ragKnowledgeBaseService, 'semanticSearch').mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({
          query: searchQuery,
          filters: filters,
          limit: 5
        })
        .expect(200);

      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].metadata.category).toBe('eligibility');
    });
  });

  describe('Knowledge Base Management', () => {
    it('should retrieve document by ID with chunks', async () => {
      const documentId = 'doc-123';
      const mockDocument = {
        id: documentId,
        title: 'Test Document',
        content: 'Document content',
        chunks: [
          { id: 'chunk-1', content: 'First chunk', position: 0 },
          { id: 'chunk-2', content: 'Second chunk', position: 1 }
        ]
      };

      jest.spyOn(ragKnowledgeBaseService, 'getDocument').mockResolvedValue(mockDocument);

      const response = await request(app)
        .get(`/api/knowledge-base/documents/${documentId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', documentId);
      expect(response.body).toHaveProperty('chunks');
      expect(response.body.chunks).toHaveLength(2);
    });

    it('should list documents with pagination', async () => {
      const mockDocuments = Array.from({ length: 15 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Document ${i}`,
        createdAt: new Date().toISOString(),
        chunksCount: 5
      }));

      jest.spyOn(ragKnowledgeBaseService, 'listDocuments').mockResolvedValue({
        documents: mockDocuments.slice(0, 10),
        total: 15,
        page: 1,
        totalPages: 2
      });

      const response = await request(app)
        .get('/api/knowledge-base/documents?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('documents');
      expect(response.body.documents).toHaveLength(10);
      expect(response.body).toHaveProperty('total', 15);
      expect(response.body).toHaveProperty('totalPages', 2);
    });

    it('should delete document and associated chunks', async () => {
      const documentId = 'doc-123';

      jest.spyOn(ragKnowledgeBaseService, 'deleteDocument').mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/knowledge-base/documents/${documentId}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Document deleted successfully');
      expect(ragKnowledgeBaseService.deleteDocument).toHaveBeenCalledWith(documentId);
    });
  });

  describe('Advanced Search Features', () => {
    it('should perform hybrid search (semantic + keyword)', async () => {
      const query = 'federal grant application requirements';
      const mockResults = [
        {
          id: 'chunk-1',
          content: 'Federal grant applications must meet specific requirements.',
          similarity: 0.92,
          keywordScore: 0.85,
          combinedScore: 0.88
        }
      ];

      jest.spyOn(ragKnowledgeBaseService, 'hybridSearch').mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/semantic-search/hybrid')
        .send({
          query: query,
          semanticWeight: 0.7,
          keywordWeight: 0.3
        })
        .expect(200);

      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]).toHaveProperty('combinedScore');
    });

    it('should provide search suggestions based on query', async () => {
      const partialQuery = 'grant app';
      const mockSuggestions = [
        'grant application',
        'grant application process',
        'grant application requirements',
        'grant application deadlines'
      ];

      jest.spyOn(ragKnowledgeBaseService, 'getSuggestions').mockResolvedValue(mockSuggestions);

      const response = await request(app)
        .get(`/api/semantic-search/suggestions?q=${partialQuery}`)
        .expect(200);

      expect(response.body).toHaveProperty('suggestions');
      expect(response.body.suggestions).toEqual(mockSuggestions);
    });
  });

  describe('Analytics and Monitoring', () => {
    it('should track search queries and results', async () => {
      const searchQuery = 'test query';
      const userId = 'user-123';

      jest.spyOn(ragKnowledgeBaseService, 'trackSearchQuery').mockResolvedValue(undefined);

      await request(app)
        .post('/api/semantic-search/query')
        .set('user-id', userId)
        .send({ query: searchQuery })
        .expect(200);

      expect(ragKnowledgeBaseService.trackSearchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: searchQuery,
          userId: userId
        })
      );
    });

    it('should provide search analytics', async () => {
      const mockAnalytics = {
        totalSearches: 150,
        popularQueries: [
          { query: 'grant application', count: 25 },
          { query: 'eligibility requirements', count: 20 }
        ],
        avgResponseTime: 245,
        successRate: 0.92
      };

      jest.spyOn(ragKnowledgeBaseService, 'getSearchAnalytics').mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/knowledge-base/analytics')
        .expect(200);

      expect(response.body).toEqual(mockAnalytics);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed search queries', async () => {
      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({ query: '' }) // Empty query
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle vector database connection errors', async () => {
      jest.spyOn(ragKnowledgeBaseService, 'semanticSearch').mockRejectedValue(
        new Error('Vector database connection failed')
      );

      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({ query: 'test query' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle embedding service failures gracefully', async () => {
      jest.spyOn(embeddingService, 'generateEmbedding').mockRejectedValue(
        new Error('Embedding service unavailable')
      );

      const response = await request(app)
        .post('/api/semantic-search/query')
        .send({ query: 'test query' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent search requests', async () => {
      const searchPromises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/semantic-search/query')
          .send({ query: `test query ${i}` })
      );

      const responses = await Promise.all(searchPromises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle large document processing', async () => {
      const largeDocument = {
        title: 'Large Document',
        content: 'A'.repeat(100000), // 100KB document
        type: 'guide'
      };

      jest.spyOn(ragKnowledgeBaseService, 'storeDocument').mockResolvedValue('doc-large');

      const response = await request(app)
        .post('/api/knowledge-base/documents')
        .send(largeDocument)
        .expect(201);

      expect(response.body).toHaveProperty('documentId');
    }, 30000); // 30 second timeout for large document processing
  });

  describe('Data Consistency', () => {
    it('should maintain consistency between database and vector store', async () => {
      const documentId = 'doc-consistency-test';
      
      // Mock successful database operations but vector store failure
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: documentId }] });
      jest.spyOn(ragKnowledgeBaseService, 'storeDocument').mockRejectedValue(
        new Error('Vector store error')
      );

      const response = await request(app)
        .post('/api/knowledge-base/documents')
        .send({
          title: 'Test Document',
          content: 'Test content'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      
      // Verify cleanup was attempted
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.arrayContaining([documentId])
      );
    });
  });
});