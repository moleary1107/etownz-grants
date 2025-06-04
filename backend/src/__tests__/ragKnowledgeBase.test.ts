import { ragKnowledgeBaseService } from '../services/ragKnowledgeBaseService';
import { embeddingService } from '../services/embeddingService';
import { DatabaseService } from '../services/database';

// Mock dependencies
jest.mock('../services/database');
jest.mock('../services/openaiService');
jest.mock('@pinecone-database/pinecone');

describe('RAG Knowledge Base Service', () => {
  const mockDatabaseQuery = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (DatabaseService.query as jest.Mock) = mockDatabaseQuery;
  });

  describe('addDocumentToKnowledgeBase', () => {
    it('should add a document to the knowledge base successfully', async () => {
      const mockDocumentId = 'test-doc-id';
      mockDatabaseQuery.mockResolvedValueOnce({
        rows: [{ id: mockDocumentId }]
      });

      const title = 'Test Grant Document';
      const content = 'This is a test grant document content.';
      const type = 'grant';
      const source = 'test-source';
      const category = 'Research & Development';
      const tags = ['test', 'grant'];

      const result = await ragKnowledgeBaseService.addDocumentToKnowledgeBase(
        title, content, type, source, category, tags
      );

      expect(result).toBeDefined();
      expect(mockDatabaseQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO knowledge_base'),
        expect.arrayContaining([
          expect.any(String), // id
          title,
          content,
          type,
          source,
          category,
          JSON.stringify(tags),
          'pending'
        ])
      );
    });

    it('should handle database errors when adding a document', async () => {
      mockDatabaseQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(ragKnowledgeBaseService.addDocumentToKnowledgeBase(
        'Test Title', 'Test Content', 'grant', 'test-source'
      )).rejects.toThrow('Database error');
    });
  });

  describe('semanticSearch', () => {
    beforeEach(() => {
      // Mock Pinecone index methods
      const mockPineconeIndex = {
        query: jest.fn().mockResolvedValue({
          matches: [
            {
              id: 'chunk_1',
              score: 0.85,
              metadata: {
                documentId: 'doc-1',
                documentType: 'grant',
                source: 'test-source',
                chunkIndex: 0,
                totalChunks: 1,
                title: 'Test Grant',
                category: 'Research',
                tags: 'test,grant',
                content: 'Test content',
                createdAt: '2024-01-01T00:00:00Z',
                lastUpdated: '2024-01-01T00:00:00Z'
              }
            }
          ]
        })
      };

      // Mock the Pinecone service
      const mockPinecone = {
        index: jest.fn().mockReturnValue(mockPineconeIndex)
      };

      (ragKnowledgeBaseService as any).pinecone = mockPinecone;
    });

    it('should perform semantic search successfully', async () => {
      // Mock embedding generation
      jest.spyOn(ragKnowledgeBaseService as any, 'generateEmbedding')
        .mockResolvedValue([0.1, 0.2, 0.3]);

      const query = 'research grant funding';
      const results = await ragKnowledgeBaseService.semanticSearch(query);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'chunk_1',
        score: 0.85,
        metadata: expect.objectContaining({
          documentId: 'doc-1',
          documentType: 'grant',
          title: 'Test Grant'
        })
      });
    });

    it('should filter results by minimum score', async () => {
      // Mock Pinecone with low score result
      const mockPineconeIndex = {
        query: jest.fn().mockResolvedValue({
          matches: [
            {
              id: 'chunk_1',
              score: 0.5,
              metadata: {
                documentId: 'doc-1',
                content: 'Test content'
              }
            }
          ]
        })
      };

      (ragKnowledgeBaseService as any).pinecone = {
        index: jest.fn().mockReturnValue(mockPineconeIndex)
      };

      jest.spyOn(ragKnowledgeBaseService as any, 'generateEmbedding')
        .mockResolvedValue([0.1, 0.2, 0.3]);

      const query = 'test query';
      const results = await ragKnowledgeBaseService.semanticSearch(query, {
        minScore: 0.7
      });

      expect(results).toHaveLength(0);
    });

    it('should handle search errors gracefully', async () => {
      jest.spyOn(ragKnowledgeBaseService as any, 'generateEmbedding')
        .mockRejectedValue(new Error('OpenAI API error'));

      const query = 'test query';

      await expect(ragKnowledgeBaseService.semanticSearch(query))
        .rejects.toThrow('OpenAI API error');
    });
  });

  describe('getRelevantContext', () => {
    it('should return relevant context within token limit', async () => {
      const mockSearchResults = [
        {
          id: 'chunk_1',
          content: 'This is relevant content about grants.',
          metadata: {
            title: 'Grant Guide',
            source: 'test-source',
            documentId: 'doc-1',
            documentType: 'grant' as const,
            chunkIndex: 0,
            totalChunks: 1,
            category: 'Research',
            tags: ['grant'],
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          score: 0.85
        }
      ];

      jest.spyOn(ragKnowledgeBaseService, 'semanticSearch')
        .mockResolvedValue(mockSearchResults);

      const query = 'grant information';
      const context = await ragKnowledgeBaseService.getRelevantContext(query, 'grant', 1000);

      expect(context).toContain('Grant Guide');
      expect(context).toContain('This is relevant content about grants.');
    });

    it('should respect token limits when building context', async () => {
      const longContent = 'A'.repeat(2000); // Very long content
      const mockSearchResults = [
        {
          id: 'chunk_1',
          content: longContent,
          metadata: {
            title: 'Long Document',
            source: 'test-source',
            documentId: 'doc-1',
            documentType: 'grant' as const,
            chunkIndex: 0,
            totalChunks: 1,
            category: 'Research',
            tags: ['grant'],
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          score: 0.85
        }
      ];

      jest.spyOn(ragKnowledgeBaseService, 'semanticSearch')
        .mockResolvedValue(mockSearchResults);

      const query = 'test query';
      const context = await ragKnowledgeBaseService.getRelevantContext(query, undefined, 100);

      // Context should be limited and not include the full long content
      expect(context.length).toBeLessThan(500); // Rough token limit estimation
    });
  });

  describe('updateDocument', () => {
    it('should update document successfully', async () => {
      const documentId = 'test-doc-id';
      const updates = {
        title: 'Updated Title',
        content: 'Updated content'
      };

      mockDatabaseQuery.mockResolvedValueOnce({ rows: [] });

      await ragKnowledgeBaseService.updateDocument(documentId, updates);

      expect(mockDatabaseQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE knowledge_base'),
        expect.arrayContaining([
          updates.title,
          updates.content,
          'pending', // embedding_status should be reset
          documentId
        ])
      );
    });

    it('should reprocess embeddings when content is updated', async () => {
      const documentId = 'test-doc-id';
      const updates = { content: 'New content' };

      // Mock database calls
      mockDatabaseQuery
        .mockResolvedValueOnce({ rows: [] }) // UPDATE query
        .mockResolvedValueOnce({ // SELECT query for reprocessing
          rows: [{
            id: documentId,
            title: 'Test Doc',
            content: 'New content',
            type: 'grant',
            source: 'test-source',
            category: 'Research',
            tags: '["test"]'
          }]
        });

      // Mock deleteDocumentEmbeddings
      jest.spyOn(ragKnowledgeBaseService as any, 'deleteDocumentEmbeddings')
        .mockResolvedValue(undefined);

      await ragKnowledgeBaseService.updateDocument(documentId, updates);

      expect(mockDatabaseQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE knowledge_base'),
        expect.any(Array)
      );

      expect(mockDatabaseQuery).toHaveBeenCalledWith(
        'SELECT * FROM knowledge_base WHERE id = $1',
        [documentId]
      );
    });
  });

  describe('deleteDocument', () => {
    it('should delete document and its embeddings', async () => {
      const documentId = 'test-doc-id';

      mockDatabaseQuery.mockResolvedValueOnce({ rows: [] });
      
      // Mock deleteDocumentEmbeddings
      jest.spyOn(ragKnowledgeBaseService as any, 'deleteDocumentEmbeddings')
        .mockResolvedValue(undefined);

      await ragKnowledgeBaseService.deleteDocument(documentId);

      expect(mockDatabaseQuery).toHaveBeenCalledWith(
        'DELETE FROM knowledge_base WHERE id = $1',
        [documentId]
      );
    });
  });

  describe('getKnowledgeBaseStats', () => {
    it('should return comprehensive statistics', async () => {
      // Mock database queries for stats
      mockDatabaseQuery
        .mockResolvedValueOnce({ // Documents by type
          rows: [
            { type: 'grant', count: '5' },
            { type: 'policy', count: '3' }
          ]
        })
        .mockResolvedValueOnce({ // Embedding status
          rows: [
            { embedding_status: 'completed', count: '6' },
            { embedding_status: 'pending', count: '2' }
          ]
        });

      // Mock Pinecone stats
      const mockPineconeIndex = {
        describeIndexStats: jest.fn().mockResolvedValue({
          totalVectorCount: 15
        })
      };

      (ragKnowledgeBaseService as any).pinecone = {
        index: jest.fn().mockReturnValue(mockPineconeIndex)
      };

      const stats = await ragKnowledgeBaseService.getKnowledgeBaseStats();

      expect(stats).toEqual({
        totalDocuments: 8,
        totalEmbeddings: 15,
        documentsByType: {
          grant: 5,
          policy: 3
        },
        embeddingStatus: {
          completed: 6,
          pending: 2
        }
      });
    });
  });

  describe('searchKnowledgeBase', () => {
    it('should search documents with pagination', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          title: 'Test Document',
          content: 'Test content',
          type: 'grant',
          tags: '["test", "grant"]'
        }
      ];

      mockDatabaseQuery
        .mockResolvedValueOnce({ rows: mockDocuments }) // Documents query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }); // Count query

      const result = await ragKnowledgeBaseService.searchKnowledgeBase(
        'test',
        { type: 'grant' },
        { page: 1, limit: 20 }
      );

      expect(result).toEqual({
        documents: expect.arrayContaining([
          expect.objectContaining({
            id: 'doc-1',
            title: 'Test Document',
            tags: ['test', 'grant']
          })
        ]),
        total: 1,
        page: 1,
        totalPages: 1
      });
    });

    it('should handle search filters correctly', async () => {
      mockDatabaseQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const filters = {
        type: 'grant' as const,
        category: 'Research',
        tags: ['test', 'grant']
      };

      await ragKnowledgeBaseService.searchKnowledgeBase(
        'search term',
        filters,
        { page: 1, limit: 10 }
      );

      // Verify the query was built with proper WHERE conditions
      const queryCall = mockDatabaseQuery.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE');
      expect(queryCall[0]).toContain('ILIKE');
      expect(queryCall[0]).toContain('type =');
      expect(queryCall[0]).toContain('category =');
      expect(queryCall[1]).toEqual([
        '%search term%',
        'grant',
        'Research',
        ['test', 'grant'],
        10,
        0
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle Pinecone connection errors', async () => {
      const mockPinecone = {
        index: jest.fn().mockImplementation(() => {
          throw new Error('Pinecone connection failed');
        })
      };

      (ragKnowledgeBaseService as any).pinecone = mockPinecone;

      await expect(ragKnowledgeBaseService.semanticSearch('test query'))
        .rejects.toThrow('Pinecone connection failed');
    });

    it('should handle database connection errors', async () => {
      mockDatabaseQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(ragKnowledgeBaseService.addDocumentToKnowledgeBase(
        'Test', 'Content', 'grant', 'source'
      )).rejects.toThrow('Database connection failed');
    });

    it('should handle OpenAI API errors during embedding generation', async () => {
      jest.spyOn(ragKnowledgeBaseService as any, 'generateEmbedding')
        .mockRejectedValue(new Error('OpenAI API rate limit exceeded'));

      await expect(ragKnowledgeBaseService.semanticSearch('test query'))
        .rejects.toThrow('OpenAI API rate limit exceeded');
    });
  });

  describe('Document Chunking', () => {
    it('should chunk documents properly during processing', async () => {
      const longContent = 'This is a very long document. '.repeat(100);
      
      // Mock successful database insertion
      mockDatabaseQuery.mockResolvedValueOnce({
        rows: [{ id: 'test-doc-id' }]
      });

      // Spy on chunkDocument method
      const chunkSpy = jest.spyOn(ragKnowledgeBaseService as any, 'chunkDocument')
        .mockReturnValue(['chunk1', 'chunk2', 'chunk3']);

      await ragKnowledgeBaseService.addDocumentToKnowledgeBase(
        'Long Document',
        longContent,
        'grant',
        'test-source'
      );

      expect(chunkSpy).toHaveBeenCalledWith(longContent, 'Long Document');
    });

    it('should handle empty content gracefully', async () => {
      mockDatabaseQuery.mockResolvedValueOnce({
        rows: [{ id: 'test-doc-id' }]
      });

      const result = await ragKnowledgeBaseService.addDocumentToKnowledgeBase(
        'Empty Document',
        '',
        'grant',
        'test-source'
      );

      expect(result).toBeDefined();
    });
  });
});