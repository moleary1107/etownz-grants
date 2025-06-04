import request from 'supertest';
import express from 'express';
import knowledgeBaseRoutes from '../routes/knowledgeBase';
import { ragKnowledgeBaseService } from '../services/ragKnowledgeBaseService';

// Mock dependencies
jest.mock('../services/ragKnowledgeBaseService');

describe('Knowledge Base Routes', () => {
  let app: express.Application;
  const mockRagService = ragKnowledgeBaseService as jest.Mocked<typeof ragKnowledgeBaseService>;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/knowledge-base', knowledgeBaseRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /documents', () => {
    it('should create a new document successfully', async () => {
      const mockDocument = {
        title: 'Federal Grant Application Guide',
        content: 'This comprehensive guide covers all aspects of federal grant applications, including eligibility criteria, application processes, and submission requirements.',
        type: 'guide',
        source: 'government',
        metadata: {
          author: 'Grant Office',
          category: 'application-guidance',
          lastUpdated: '2024-01-15'
        }
      };

      const mockDocumentId = 'doc-12345';
      const mockChunksCount = 8;

      mockRagService.storeDocument.mockResolvedValue(mockDocumentId);
      mockRagService.getDocumentChunksCount.mockResolvedValue(mockChunksCount);

      const response = await request(app)
        .post('/api/knowledge-base/documents')
        .send(mockDocument)
        .expect(201);

      expect(response.body).toHaveProperty('documentId', mockDocumentId);
      expect(response.body).toHaveProperty('chunksCount', mockChunksCount);
      expect(response.body).toHaveProperty('message', 'Document stored successfully');

      expect(mockRagService.storeDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          title: mockDocument.title,
          content: mockDocument.content,
          type: mockDocument.type,
          source: mockDocument.source,
          metadata: mockDocument.metadata
        })
      );
    });

    it('should validate required fields', async () => {
      const invalidDocument = {
        content: 'Content without title'
        // Missing title
      };

      const response = await request(app)
        .post('/api/knowledge-base/documents')
        .send(invalidDocument)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Title is required');
    });

    it('should validate content length', async () => {
      const documentWithShortContent = {
        title: 'Test Document',
        content: 'Too short' // Less than minimum length
      };

      const response = await request(app)
        .post('/api/knowledge-base/documents')
        .send(documentWithShortContent)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Content must be at least 50 characters');
    });

    it('should handle storage service errors', async () => {
      const mockDocument = {
        title: 'Test Document',
        content: 'This is a test document with sufficient content length for processing.'
      };

      mockRagService.storeDocument.mockRejectedValue(
        new Error('Vector database connection failed')
      );

      const response = await request(app)
        .post('/api/knowledge-base/documents')
        .send(mockDocument)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to store document');
    });

    it('should handle duplicate documents', async () => {
      const mockDocument = {
        title: 'Existing Document',
        content: 'This document already exists in the knowledge base with the same content.'
      };

      mockRagService.storeDocument.mockRejectedValue(
        new Error('Document with similar content already exists')
      );

      const response = await request(app)
        .post('/api/knowledge-base/documents')
        .send(mockDocument)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /documents', () => {
    it('should list documents with pagination', async () => {
      const mockDocuments = Array.from({ length: 25 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Document ${i}`,
        type: 'guide',
        source: 'government',
        createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`).toISOString(),
        chunksCount: 5,
        metadata: { category: 'general' }
      }));

      const mockPaginatedResult = {
        documents: mockDocuments.slice(0, 10),
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3
      };

      mockRagService.listDocuments.mockResolvedValue(mockPaginatedResult);

      const response = await request(app)
        .get('/api/knowledge-base/documents?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('documents');
      expect(response.body.documents).toHaveLength(10);
      expect(response.body).toHaveProperty('total', 25);
      expect(response.body).toHaveProperty('totalPages', 3);

      expect(mockRagService.listDocuments).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filters: {}
      });
    });

    it('should apply filters to document listing', async () => {
      const filters = {
        type: 'guide',
        source: 'government',
        category: 'eligibility'
      };

      mockRagService.listDocuments.mockResolvedValue({
        documents: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      });

      await request(app)
        .get('/api/knowledge-base/documents')
        .query(filters)
        .expect(200);

      expect(mockRagService.listDocuments).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        filters: filters
      });
    });

    it('should handle search query in document listing', async () => {
      const searchQuery = 'federal grants';
      
      mockRagService.listDocuments.mockResolvedValue({
        documents: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      });

      await request(app)
        .get(`/api/knowledge-base/documents?search=${searchQuery}`)
        .expect(200);

      expect(mockRagService.listDocuments).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        filters: {},
        search: searchQuery
      });
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/knowledge-base/documents?page=0&limit=-1')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid pagination parameters');
    });
  });

  describe('GET /documents/:id', () => {
    it('should retrieve document by ID with chunks', async () => {
      const documentId = 'doc-12345';
      const mockDocument = {
        id: documentId,
        title: 'Federal Grant Guide',
        content: 'Complete guide content...',
        type: 'guide',
        source: 'government',
        createdAt: '2024-01-15T10:00:00Z',
        metadata: { category: 'application-guidance' },
        chunks: [
          {
            id: 'chunk-1',
            content: 'First chunk of the document...',
            position: 0,
            embedding: null
          },
          {
            id: 'chunk-2',
            content: 'Second chunk of the document...',
            position: 1,
            embedding: null
          }
        ]
      };

      mockRagService.getDocument.mockResolvedValue(mockDocument);

      const response = await request(app)
        .get(`/api/knowledge-base/documents/${documentId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', documentId);
      expect(response.body).toHaveProperty('title', 'Federal Grant Guide');
      expect(response.body).toHaveProperty('chunks');
      expect(response.body.chunks).toHaveLength(2);

      expect(mockRagService.getDocument).toHaveBeenCalledWith(documentId, true);
    });

    it('should retrieve document without chunks when specified', async () => {
      const documentId = 'doc-12345';
      const mockDocument = {
        id: documentId,
        title: 'Federal Grant Guide',
        content: 'Complete guide content...',
        type: 'guide',
        source: 'government',
        createdAt: '2024-01-15T10:00:00Z',
        metadata: { category: 'application-guidance' }
      };

      mockRagService.getDocument.mockResolvedValue(mockDocument);

      const response = await request(app)
        .get(`/api/knowledge-base/documents/${documentId}?includeChunks=false`)
        .expect(200);

      expect(response.body).not.toHaveProperty('chunks');
      expect(mockRagService.getDocument).toHaveBeenCalledWith(documentId, false);
    });

    it('should handle document not found', async () => {
      const documentId = 'non-existent';

      mockRagService.getDocument.mockRejectedValue(
        new Error('Document not found')
      );

      const response = await request(app)
        .get(`/api/knowledge-base/documents/${documentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Document not found');
    });
  });

  describe('PUT /documents/:id', () => {
    it('should update document successfully', async () => {
      const documentId = 'doc-12345';
      const updateData = {
        title: 'Updated Grant Guide',
        content: 'Updated comprehensive guide with new information about federal grant applications.',
        metadata: {
          author: 'Updated Author',
          category: 'updated-guidance'
        }
      };

      const mockUpdatedDocument = {
        id: documentId,
        ...updateData,
        updatedAt: '2024-01-16T10:00:00Z'
      };

      mockRagService.updateDocument.mockResolvedValue(mockUpdatedDocument);

      const response = await request(app)
        .put(`/api/knowledge-base/documents/${documentId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', documentId);
      expect(response.body).toHaveProperty('title', updateData.title);
      expect(response.body).toHaveProperty('updatedAt');

      expect(mockRagService.updateDocument).toHaveBeenCalledWith(documentId, updateData);
    });

    it('should validate update data', async () => {
      const documentId = 'doc-12345';
      const invalidUpdateData = {
        title: '', // Empty title
        content: 'Short' // Too short content
      };

      const response = await request(app)
        .put(`/api/knowledge-base/documents/${documentId}`)
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle update service errors', async () => {
      const documentId = 'doc-12345';
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content with sufficient length for processing and validation.'
      };

      mockRagService.updateDocument.mockRejectedValue(
        new Error('Update failed due to vector store error')
      );

      const response = await request(app)
        .put(`/api/knowledge-base/documents/${documentId}`)
        .send(updateData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to update document');
    });
  });

  describe('DELETE /documents/:id', () => {
    it('should delete document successfully', async () => {
      const documentId = 'doc-12345';

      mockRagService.deleteDocument.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/knowledge-base/documents/${documentId}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Document deleted successfully');
      expect(mockRagService.deleteDocument).toHaveBeenCalledWith(documentId);
    });

    it('should handle document not found during deletion', async () => {
      const documentId = 'non-existent';

      mockRagService.deleteDocument.mockRejectedValue(
        new Error('Document not found')
      );

      const response = await request(app)
        .delete(`/api/knowledge-base/documents/${documentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Document not found');
    });

    it('should handle deletion service errors', async () => {
      const documentId = 'doc-12345';

      mockRagService.deleteDocument.mockRejectedValue(
        new Error('Failed to delete from vector store')
      );

      const response = await request(app)
        .delete(`/api/knowledge-base/documents/${documentId}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to delete document');
    });
  });

  describe('GET /documents/:id/chunks', () => {
    it('should retrieve document chunks with pagination', async () => {
      const documentId = 'doc-12345';
      const mockChunks = Array.from({ length: 15 }, (_, i) => ({
        id: `chunk-${i}`,
        content: `Chunk ${i} content...`,
        position: i,
        embedding: null
      }));

      const mockPaginatedChunks = {
        chunks: mockChunks.slice(0, 10),
        total: 15,
        page: 1,
        limit: 10,
        totalPages: 2
      };

      mockRagService.getDocumentChunks.mockResolvedValue(mockPaginatedChunks);

      const response = await request(app)
        .get(`/api/knowledge-base/documents/${documentId}/chunks?page=1&limit=10`)
        .expect(200);

      expect(response.body).toHaveProperty('chunks');
      expect(response.body.chunks).toHaveLength(10);
      expect(response.body).toHaveProperty('total', 15);

      expect(mockRagService.getDocumentChunks).toHaveBeenCalledWith(documentId, {
        page: 1,
        limit: 10
      });
    });
  });

  describe('POST /upload', () => {
    it('should handle file upload and processing', async () => {
      const mockFileData = {
        filename: 'grant-guide.pdf',
        buffer: Buffer.from('PDF content...'),
        mimetype: 'application/pdf'
      };

      const mockProcessedDocument = {
        documentId: 'doc-uploaded',
        title: 'Grant Guide',
        chunksCount: 12,
        extractedText: 'Extracted text from PDF...'
      };

      mockRagService.processUploadedFile.mockResolvedValue(mockProcessedDocument);

      // Note: This test would need actual file upload middleware in practice
      // For now, we'll test the processing logic
      const response = await request(app)
        .post('/api/knowledge-base/upload')
        .send({
          filename: mockFileData.filename,
          content: mockFileData.buffer.toString('base64'),
          mimetype: mockFileData.mimetype
        })
        .expect(201);

      expect(response.body).toHaveProperty('documentId');
      expect(response.body).toHaveProperty('chunksCount');
    });

    it('should validate file types', async () => {
      const response = await request(app)
        .post('/api/knowledge-base/upload')
        .send({
          filename: 'image.jpg',
          content: 'base64content',
          mimetype: 'image/jpeg'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unsupported file type');
    });
  });

  describe('GET /stats', () => {
    it('should return knowledge base statistics', async () => {
      const mockStats = {
        totalDocuments: 150,
        totalChunks: 2340,
        documentsByType: {
          guide: 85,
          policy: 35,
          form: 30
        },
        documentsBySource: {
          government: 120,
          nonprofit: 20,
          academic: 10
        },
        storageSize: '45.2 MB',
        lastUpdated: '2024-01-15T10:00:00Z',
        avgChunksPerDocument: 15.6
      };

      mockRagService.getKnowledgeBaseStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/knowledge-base/stats')
        .expect(200);

      expect(response.body).toEqual(mockStats);
    });
  });

  describe('GET /analytics', () => {
    it('should return knowledge base analytics', async () => {
      const mockAnalytics = {
        accessPatterns: {
          mostAccessedDocuments: [
            { id: 'doc-1', title: 'Popular Guide', accessCount: 245 }
          ],
          searchTrends: [
            { term: 'eligibility', count: 89, trend: 'up' }
          ]
        },
        performance: {
          avgSearchTime: 145,
          searchSuccessRate: 0.94
        },
        usage: {
          dailySearches: 234,
          weeklySearches: 1567,
          monthlySearches: 6789
        }
      };

      mockRagService.getAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/knowledge-base/analytics')
        .expect(200);

      expect(response.body).toEqual(mockAnalytics);
    });

    it('should handle date range filters for analytics', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      mockRagService.getAnalytics.mockResolvedValue({
        accessPatterns: { mostAccessedDocuments: [], searchTrends: [] },
        performance: { avgSearchTime: 150, searchSuccessRate: 0.95 },
        usage: { dailySearches: 100, weeklySearches: 700, monthlySearches: 3000 }
      });

      await request(app)
        .get(`/api/knowledge-base/analytics?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(mockRagService.getAnalytics).toHaveBeenCalledWith({
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service unavailability gracefully', async () => {
      mockRagService.listDocuments.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      const response = await request(app)
        .get('/api/knowledge-base/documents')
        .expect(503);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Service temporarily unavailable');
    });

    it('should validate UUID format for document IDs', async () => {
      const invalidId = 'invalid-id-format';

      const response = await request(app)
        .get(`/api/knowledge-base/documents/${invalidId}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid document ID format');
    });

    it('should handle concurrent document operations', async () => {
      const documentId = 'doc-concurrent';
      
      mockRagService.getDocument.mockResolvedValue({
        id: documentId,
        title: 'Test Document',
        content: 'Test content'
      });

      // Simulate concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        request(app).get(`/api/knowledge-base/documents/${documentId}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(documentId);
      });
    });
  });
});