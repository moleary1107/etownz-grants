import { VectorDatabaseService, VectorMetadata, VectorSearchResult } from '../../services/vectorDatabase';
import { Pinecone } from '@pinecone-database/pinecone';

// Mock Pinecone
jest.mock('@pinecone-database/pinecone');
const MockPinecone = Pinecone as jest.MockedClass<typeof Pinecone>;

// Mock logger
jest.mock('../../services/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('VectorDatabaseService', () => {
  let vectorService: VectorDatabaseService;
  let mockPineconeInstance: any;
  let mockIndex: any;
  let mockNamespace: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up environment variable
    process.env.PINECONE_API_KEY = 'test-api-key';

    // Mock Pinecone instance methods
    mockNamespace = {
      upsert: jest.fn(),
      query: jest.fn(),
      fetch: jest.fn(),
      deleteOne: jest.fn(),
      deleteMany: jest.fn()
    };

    mockIndex = {
      namespace: jest.fn().mockReturnValue(mockNamespace),
      describeIndexStats: jest.fn()
    };

    mockPineconeInstance = {
      listIndexes: jest.fn(),
      createIndex: jest.fn(),
      index: jest.fn().mockReturnValue(mockIndex)
    };

    MockPinecone.mockImplementation(() => mockPineconeInstance);

    vectorService = new VectorDatabaseService();
  });

  afterEach(() => {
    delete process.env.PINECONE_API_KEY;
  });

  describe('constructor', () => {
    it('should initialize successfully with API key', () => {
      expect(vectorService).toBeInstanceOf(VectorDatabaseService);
      expect(MockPinecone).toHaveBeenCalledWith({
        apiKey: 'test-api-key'
      });
    });

    it('should throw error if API key is missing', () => {
      delete process.env.PINECONE_API_KEY;
      expect(() => new VectorDatabaseService()).toThrow('PINECONE_API_KEY environment variable is required');
    });
  });

  describe('initializeIndex', () => {
    it('should create index if it does not exist', async () => {
      mockPineconeInstance.listIndexes.mockResolvedValue({ indexes: [] });
      mockPineconeInstance.createIndex.mockResolvedValue({});
      mockIndex.describeIndexStats.mockResolvedValue({ ready: true });

      await vectorService.initializeIndex();

      expect(mockPineconeInstance.createIndex).toHaveBeenCalledWith({
        name: 'etownz-grants',
        dimension: 1536,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
    });

    it('should not create index if it already exists', async () => {
      mockPineconeInstance.listIndexes.mockResolvedValue({
        indexes: [{ name: 'etownz-grants' }]
      });

      await vectorService.initializeIndex();

      expect(mockPineconeInstance.createIndex).not.toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockPineconeInstance.listIndexes.mockRejectedValue(new Error('API Error'));

      await expect(vectorService.initializeIndex()).rejects.toThrow('Failed to initialize vector database: API Error');
    });
  });

  describe('storeVector', () => {
    const testMetadata: VectorMetadata = {
      id: 'test-id',
      type: 'grant',
      title: 'Test Grant',
      content: 'Test content',
      organizationId: 'org-123',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      source: 'test'
    };

    const testEmbedding = new Array(1536).fill(0.1);

    it('should store vector successfully', async () => {
      mockNamespace.upsert.mockResolvedValue({});

      await vectorService.storeVector('test-id', testEmbedding, testMetadata);

      expect(mockIndex.namespace).toHaveBeenCalledWith('default');
      expect(mockNamespace.upsert).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'test-id',
          values: testEmbedding,
          metadata: expect.objectContaining({
            ...testMetadata,
            updatedAt: expect.any(String)
          })
        })
      ]);
    });

    it('should store vector in custom namespace', async () => {
      mockNamespace.upsert.mockResolvedValue({});

      await vectorService.storeVector('test-id', testEmbedding, testMetadata, 'custom-namespace');

      expect(mockIndex.namespace).toHaveBeenCalledWith('custom-namespace');
    });

    it('should throw error for missing parameters', async () => {
      await expect(vectorService.storeVector('', testEmbedding, testMetadata))
        .rejects.toThrow('Missing required parameters: id, embedding, or metadata');
    });

    it('should throw error for invalid embedding dimension', async () => {
      const invalidEmbedding = [0.1, 0.2]; // Wrong dimension

      await expect(vectorService.storeVector('test-id', invalidEmbedding, testMetadata))
        .rejects.toThrow('Invalid embedding dimension: expected 1536, got 2');
    });

    it('should handle storage errors', async () => {
      mockNamespace.upsert.mockRejectedValue(new Error('Storage failed'));

      await expect(vectorService.storeVector('test-id', testEmbedding, testMetadata))
        .rejects.toThrow('Failed to store vector: Storage failed');
    });
  });

  describe('storeBatchVectors', () => {
    const testEmbedding = new Array(1536).fill(0.1);
    const testVectors = [
      {
        id: 'test-1',
        embedding: testEmbedding,
        metadata: {
          id: 'test-1',
          type: 'grant' as const,
          title: 'Test Grant 1',
          content: 'Content 1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          source: 'test'
        }
      },
      {
        id: 'test-2',
        embedding: testEmbedding,
        metadata: {
          id: 'test-2',
          type: 'grant' as const,
          title: 'Test Grant 2',
          content: 'Content 2',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          source: 'test'
        }
      }
    ];

    it('should store batch vectors successfully', async () => {
      mockNamespace.upsert.mockResolvedValue({});

      await vectorService.storeBatchVectors(testVectors);

      expect(mockNamespace.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'test-1' }),
          expect.objectContaining({ id: 'test-2' })
        ])
      );
    });

    it('should handle large batches (>100 vectors)', async () => {
      // Create 150 test vectors
      const largeVectorSet = Array.from({ length: 150 }, (_, i) => ({
        id: `test-${i}`,
        embedding: testEmbedding,
        metadata: {
          id: `test-${i}`,
          type: 'grant' as const,
          title: `Test Grant ${i}`,
          content: `Content ${i}`,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          source: 'test'
        }
      }));

      mockNamespace.upsert.mockResolvedValue({});

      await vectorService.storeBatchVectors(largeVectorSet);

      // Should be called twice (100 + 50)
      expect(mockNamespace.upsert).toHaveBeenCalledTimes(2);
    });

    it('should throw error for empty vector array', async () => {
      await expect(vectorService.storeBatchVectors([]))
        .rejects.toThrow('No vectors provided for batch storage');
    });
  });

  describe('searchSimilar', () => {
    const testEmbedding = new Array(1536).fill(0.1);
    const mockSearchResults = {
      matches: [
        {
          id: 'result-1',
          score: 0.95,
          metadata: {
            type: 'grant',
            title: 'Similar Grant 1',
            content: 'Similar content'
          }
        },
        {
          id: 'result-2',
          score: 0.87,
          metadata: {
            type: 'grant',
            title: 'Similar Grant 2',
            content: 'Another similar content'
          }
        }
      ]
    };

    it('should search similar vectors successfully', async () => {
      mockNamespace.query.mockResolvedValue(mockSearchResults);

      const results = await vectorService.searchSimilar(testEmbedding);

      expect(mockNamespace.query).toHaveBeenCalledWith({
        vector: testEmbedding,
        topK: 10,
        includeMetadata: true,
        includeValues: false
      });

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 'result-1',
        score: 0.95,
        metadata: expect.objectContaining({
          title: 'Similar Grant 1'
        })
      });
    });

    it('should handle search with custom options', async () => {
      mockNamespace.query.mockResolvedValue(mockSearchResults);

      const options = {
        topK: 5,
        namespace: 'grants',
        filter: { type: 'grant' },
        includeValues: true
      };

      await vectorService.searchSimilar(testEmbedding, options);

      expect(mockIndex.namespace).toHaveBeenCalledWith('grants');
      expect(mockNamespace.query).toHaveBeenCalledWith({
        vector: testEmbedding,
        topK: 5,
        includeMetadata: true,
        includeValues: true,
        filter: { type: 'grant' }
      });
    });

    it('should return empty array when no matches found', async () => {
      mockNamespace.query.mockResolvedValue({ matches: null });

      const results = await vectorService.searchSimilar(testEmbedding);

      expect(results).toEqual([]);
    });

    it('should throw error for invalid embedding dimension', async () => {
      const invalidEmbedding = [0.1, 0.2];

      await expect(vectorService.searchSimilar(invalidEmbedding))
        .rejects.toThrow('Invalid query embedding dimension: expected 1536, got 2');
    });
  });

  describe('hybridSearch', () => {
    const testEmbedding = new Array(1536).fill(0.1);

    it('should perform hybrid search with filters', async () => {
      mockNamespace.query.mockResolvedValue({ matches: [] });

      const filters = {
        type: 'grant',
        organizationId: 'org-123',
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31'
        },
        tags: ['technology', 'innovation']
      };

      await vectorService.hybridSearch(testEmbedding, filters);

      expect(mockNamespace.query).toHaveBeenCalledWith({
        vector: testEmbedding,
        topK: 10,
        includeMetadata: true,
        includeValues: false,
        filter: {
          type: { $eq: 'grant' },
          organizationId: { $eq: 'org-123' },
          createdAt: {
            $gte: '2024-01-01',
            $lte: '2024-12-31'
          },
          tags: { $in: ['technology', 'innovation'] }
        }
      });
    });

    it('should perform search without filters when none provided', async () => {
      mockNamespace.query.mockResolvedValue({ matches: [] });

      await vectorService.hybridSearch(testEmbedding, {});

      expect(mockNamespace.query).toHaveBeenCalledWith({
        vector: testEmbedding,
        topK: 10,
        includeMetadata: true,
        includeValues: false
      });
    });
  });

  describe('getVector', () => {
    it('should fetch vector by ID successfully', async () => {
      const mockFetchResponse = {
        records: {
          'test-id': {
            id: 'test-id',
            values: [0.1, 0.2],
            metadata: {
              type: 'grant',
              title: 'Test Grant'
            }
          }
        }
      };

      mockNamespace.fetch.mockResolvedValue(mockFetchResponse);

      const result = await vectorService.getVector('test-id');

      expect(mockNamespace.fetch).toHaveBeenCalledWith(['test-id']);
      expect(result).toEqual({
        id: 'test-id',
        score: 1.0,
        metadata: {
          type: 'grant',
          title: 'Test Grant'
        }
      });
    });

    it('should return null when vector not found', async () => {
      mockNamespace.fetch.mockResolvedValue({ records: {} });

      const result = await vectorService.getVector('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('deleteVector', () => {
    it('should delete vector successfully', async () => {
      mockNamespace.deleteOne.mockResolvedValue({});

      await vectorService.deleteVector('test-id');

      expect(mockNamespace.deleteOne).toHaveBeenCalledWith('test-id');
    });

    it('should delete vector from custom namespace', async () => {
      mockNamespace.deleteOne.mockResolvedValue({});

      await vectorService.deleteVector('test-id', 'custom-namespace');

      expect(mockIndex.namespace).toHaveBeenCalledWith('custom-namespace');
      expect(mockNamespace.deleteOne).toHaveBeenCalledWith('test-id');
    });

    it('should handle deletion errors', async () => {
      mockNamespace.deleteOne.mockRejectedValue(new Error('Deletion failed'));

      await expect(vectorService.deleteVector('test-id'))
        .rejects.toThrow('Failed to delete vector: Deletion failed');
    });
  });

  describe('deleteVectorsByFilter', () => {
    it('should delete vectors by filter successfully', async () => {
      mockNamespace.deleteMany.mockResolvedValue({});

      const filter = { type: 'grant', organizationId: 'org-123' };
      await vectorService.deleteVectorsByFilter(filter);

      expect(mockNamespace.deleteMany).toHaveBeenCalledWith(filter);
    });
  });

  describe('getIndexStats', () => {
    it('should return index statistics', async () => {
      const mockStats = {
        totalVectorCount: 1000,
        namespaces: {
          'default': { vectorCount: 500 },
          'grants': { vectorCount: 300 },
          'applications': { vectorCount: 200 }
        }
      };

      mockIndex.describeIndexStats.mockResolvedValue(mockStats);

      const stats = await vectorService.getIndexStats();

      expect(stats).toEqual(mockStats);
    });
  });

  describe('listNamespaces', () => {
    it('should list all namespaces', async () => {
      const mockStats = {
        namespaces: {
          'default': { vectorCount: 500 },
          'grants': { vectorCount: 300 },
          'applications': { vectorCount: 200 }
        }
      };

      mockIndex.describeIndexStats.mockResolvedValue(mockStats);

      const namespaces = await vectorService.listNamespaces();

      expect(namespaces).toEqual(['default', 'grants', 'applications']);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when index exists', async () => {
      mockPineconeInstance.listIndexes.mockResolvedValue({
        indexes: [{ name: 'etownz-grants' }]
      });
      
      mockIndex.describeIndexStats.mockResolvedValue({
        totalVectorCount: 1000,
        namespaces: {
          'default': { vectorCount: 500 },
          'grants': { vectorCount: 500 }
        }
      });

      const health = await vectorService.healthCheck();

      expect(health).toEqual({
        status: 'healthy',
        indexExists: true,
        vectorCount: 1000,
        namespaces: ['default', 'grants']
      });
    });

    it('should return unhealthy status when index does not exist', async () => {
      mockPineconeInstance.listIndexes.mockResolvedValue({ indexes: [] });

      const health = await vectorService.healthCheck();

      expect(health).toEqual({
        status: 'unhealthy',
        indexExists: false,
        vectorCount: 0,
        namespaces: [],
        error: 'Index does not exist'
      });
    });

    it('should return unhealthy status on error', async () => {
      mockPineconeInstance.listIndexes.mockRejectedValue(new Error('API Error'));

      const health = await vectorService.healthCheck();

      expect(health).toEqual({
        status: 'unhealthy',
        indexExists: false,
        vectorCount: 0,
        namespaces: [],
        error: 'API Error'
      });
    });
  });

  describe('generateVectorId', () => {
    it('should generate ID with entity ID', () => {
      const id = vectorService.generateVectorId('grant', 'grant-123');
      
      expect(id).toMatch(/^grant_grant-123_\d+_[a-f0-9]{8}$/);
    });

    it('should generate ID without entity ID', () => {
      const id = vectorService.generateVectorId('document');
      
      expect(id).toMatch(/^document_\d+_[a-f0-9]{8}$/);
    });

    it('should generate unique IDs', () => {
      const id1 = vectorService.generateVectorId('grant');
      const id2 = vectorService.generateVectorId('grant');
      
      expect(id1).not.toEqual(id2);
    });
  });
});

// Integration tests (require actual Pinecone setup)
describe('VectorDatabaseService Integration Tests', () => {
  // These tests would run against a test Pinecone index
  // Skipped by default, can be enabled with proper test setup
  
  it.skip('should perform end-to-end vector operations', async () => {
    // This would test the actual integration with Pinecone
    // Requires test Pinecone API key and index setup
  });
});