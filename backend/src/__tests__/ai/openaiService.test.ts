import { OpenAIService, GrantAnalysisResult, SemanticSearchResult } from '../../services/openaiService';
import { VectorDatabaseService } from '../../services/vectorDatabase';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

// Mock VectorDatabaseService
jest.mock('../../services/vectorDatabase');
const MockVectorDB = VectorDatabaseService as jest.MockedClass<typeof VectorDatabaseService>;

// Mock logger
jest.mock('../../services/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('OpenAIService', () => {
  let openaiService: OpenAIService;
  let mockOpenAIInstance: any;
  let mockVectorDBInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';

    // Mock OpenAI instance
    mockOpenAIInstance = {
      embeddings: {
        create: jest.fn()
      },
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };

    MockOpenAI.mockImplementation(() => mockOpenAIInstance);

    // Mock VectorDB instance
    mockVectorDBInstance = {
      generateVectorId: jest.fn(),
      storeVector: jest.fn(),
      searchSimilar: jest.fn(),
      healthCheck: jest.fn()
    };

    MockVectorDB.mockImplementation(() => mockVectorDBInstance);

    openaiService = new OpenAIService();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('constructor', () => {
    it('should initialize successfully with API key', () => {
      expect(openaiService).toBeInstanceOf(OpenAIService);
      expect(MockOpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key'
      });
    });

    it('should throw error if API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new OpenAIService()).toThrow('OPENAI_API_KEY environment variable is required');
    });
  });

  describe('generateEmbedding', () => {
    const mockEmbeddingResponse = {
      data: [
        {
          embedding: new Array(1536).fill(0.1)
        }
      ],
      usage: {
        prompt_tokens: 10,
        total_tokens: 10
      }
    };

    it('should generate embedding successfully', async () => {
      mockOpenAIInstance.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      const result = await openaiService.generateEmbedding('test text');

      expect(mockOpenAIInstance.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test text'
      });

      expect(result.embedding).toHaveLength(1536);
      expect(result.usage.totalTokens).toBe(10);
      expect(result.usage.estimatedCost).toBeGreaterThan(0);
    });

    it('should handle custom model and dimensions', async () => {
      mockOpenAIInstance.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      await openaiService.generateEmbedding('test text', {
        model: 'text-embedding-3-large',
        dimensions: 512
      });

      expect(mockOpenAIInstance.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-large',
        input: 'test text',
        dimensions: 512
      });
    });

    it('should limit text length', async () => {
      mockOpenAIInstance.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      const longText = 'a'.repeat(40000);
      await openaiService.generateEmbedding(longText);

      const actualInput = mockOpenAIInstance.embeddings.create.mock.calls[0][0].input;
      expect(actualInput).toHaveLength(32000);
    });

    it('should throw error for empty text', async () => {
      await expect(openaiService.generateEmbedding('')).rejects.toThrow('Text cannot be empty');
      await expect(openaiService.generateEmbedding('   ')).rejects.toThrow('Text cannot be empty');
    });

    it('should handle API errors', async () => {
      mockOpenAIInstance.embeddings.create.mockRejectedValue(new Error('API Error'));

      await expect(openaiService.generateEmbedding('test'))
        .rejects.toThrow('Failed to generate embedding: API Error');
    });
  });

  describe('generateBatchEmbeddings', () => {
    const mockEmbeddingResponse = {
      data: [{ embedding: new Array(1536).fill(0.1) }],
      usage: { prompt_tokens: 10, total_tokens: 10 }
    };

    beforeEach(() => {
      mockOpenAIInstance.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
    });

    it('should generate embeddings for multiple texts', async () => {
      const texts = ['text 1', 'text 2', 'text 3'];
      
      const result = await openaiService.generateBatchEmbeddings(texts);

      expect(result.embeddings).toHaveLength(3);
      expect(result.usage.totalTokens).toBe(30); // 10 * 3
      expect(mockOpenAIInstance.embeddings.create).toHaveBeenCalledTimes(3);
    });

    it('should handle batch processing with custom batch size', async () => {
      const texts = Array.from({ length: 5 }, (_, i) => `text ${i}`);
      
      await openaiService.generateBatchEmbeddings(texts, { batchSize: 2 });

      // Should be called 5 times (since batchSize is 2, but we process each individually)
      expect(mockOpenAIInstance.embeddings.create).toHaveBeenCalledTimes(5);
    });

    it('should throw error for empty texts array', async () => {
      await expect(openaiService.generateBatchEmbeddings([]))
        .rejects.toThrow('Texts array cannot be empty');
    });
  });

  describe('chatCompletion', () => {
    const mockChatResponse = {
      choices: [
        {
          message: {
            content: 'AI response'
          }
        }
      ],
      usage: {
        prompt_tokens: 20,
        completion_tokens: 10,
        total_tokens: 30
      }
    };

    it('should generate chat completion successfully', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockChatResponse);

      const messages = [
        { role: 'user' as const, content: 'Hello' }
      ];

      const result = await openaiService.chatCompletion(messages);

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7
      });

      expect(result.content).toBe('AI response');
      expect(result.usage.totalTokens).toBe(30);
    });

    it('should handle custom options', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockChatResponse);

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const options = {
        model: 'gpt-4-turbo' as const,
        temperature: 0.5,
        maxTokens: 100,
        responseFormat: 'json_object' as const
      };

      await openaiService.chatCompletion(messages, options);

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4-turbo',
        messages,
        temperature: 0.5,
        max_tokens: 100,
        response_format: { type: 'json_object' }
      });
    });

    it('should handle API errors', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      await expect(openaiService.chatCompletion(messages))
        .rejects.toThrow('Failed to generate chat completion: API Error');
    });
  });

  describe('semanticSearch', () => {
    const mockEmbeddingResponse = {
      data: [{ embedding: new Array(1536).fill(0.1) }],
      usage: { prompt_tokens: 10, total_tokens: 10 }
    };

    const mockVectorSearchResults = [
      {
        id: 'grant-1',
        score: 0.95,
        metadata: {
          id: 'grant-1',
          type: 'grant',
          title: 'Technology Grant',
          content: 'Grant for technology companies',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          source: 'test'
        }
      },
      {
        id: 'grant-2',
        score: 0.87,
        metadata: {
          id: 'grant-2',
          type: 'grant',
          title: 'Innovation Grant',
          content: 'Grant for innovative projects',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          source: 'test'
        }
      }
    ];

    beforeEach(() => {
      mockOpenAIInstance.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
      mockVectorDBInstance.searchSimilar.mockResolvedValue(mockVectorSearchResults);
    });

    it('should perform semantic search successfully', async () => {
      const query = 'technology funding';
      
      const results = await openaiService.semanticSearch(query);

      expect(mockOpenAIInstance.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: query
      });

      expect(mockVectorDBInstance.searchSimilar).toHaveBeenCalledWith(
        new Array(1536).fill(0.1),
        {
          topK: 10,
          namespace: 'default',
          filter: undefined,
          includeMetadata: true
        }
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 'grant-1',
        title: 'Technology Grant',
        content: 'Grant for technology companies',
        similarity: 0.95,
        metadata: mockVectorSearchResults[0].metadata
      });
    });

    it('should handle search with filters', async () => {
      const query = 'technology funding';
      const filters = {
        type: 'grant',
        organizationId: 'org-123',
        namespace: 'grants',
        topK: 5
      };

      await openaiService.semanticSearch(query, filters);

      expect(mockVectorDBInstance.searchSimilar).toHaveBeenCalledWith(
        new Array(1536).fill(0.1),
        {
          topK: 5,
          namespace: 'grants',
          filter: {
            type: 'grant',
            organizationId: 'org-123'
          },
          includeMetadata: true
        }
      );
    });
  });

  describe('analyzeGrantRelevance', () => {
    const mockAnalysisResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              overallCompatibility: 85,
              eligibilityStatus: 'ELIGIBLE',
              matchingCriteria: [
                {
                  criterion: 'Technology focus',
                  matches: true,
                  score: 90,
                  explanation: 'Strong alignment with tech sector'
                }
              ],
              recommendations: ['Apply before deadline'],
              reasoning: 'Good match based on sector and size',
              confidence: 90
            })
          }
        }
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
    };

    beforeEach(() => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockAnalysisResponse);
    });

    it('should analyze grant relevance successfully', async () => {
      const orgProfile = 'Tech startup focusing on AI solutions';
      const grantDesc = 'Grant for innovative technology companies';

      const result = await openaiService.analyzeGrantRelevance(orgProfile, grantDesc);

      expect(result.overallCompatibility).toBe(85);
      expect(result.eligibilityStatus).toBe('ELIGIBLE');
      expect(result.matchingCriteria).toHaveLength(1);
      expect(result.recommendations).toContain('Apply before deadline');
    });

    it('should include specific query in analysis', async () => {
      const orgProfile = 'Tech startup';
      const grantDesc = 'Technology grant';
      const specificQuery = 'AI funding';

      await openaiService.analyzeGrantRelevance(orgProfile, grantDesc, specificQuery);

      const callArgs = mockOpenAIInstance.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('Specific Interest: AI funding');
    });

    it('should handle invalid JSON response', async () => {
      const invalidResponse = {
        choices: [{ message: { content: 'invalid json' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(invalidResponse);

      await expect(openaiService.analyzeGrantRelevance('org', 'grant'))
        .rejects.toThrow('Failed to analyze grant relevance');
    });
  });

  describe('storeTextAsVector', () => {
    const mockEmbeddingResponse = {
      data: [{ embedding: new Array(1536).fill(0.1) }],
      usage: { prompt_tokens: 10, total_tokens: 10 }
    };

    beforeEach(() => {
      mockOpenAIInstance.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
      mockVectorDBInstance.generateVectorId.mockReturnValue('grant_123_timestamp_abcd1234');
      mockVectorDBInstance.storeVector.mockResolvedValue(undefined);
    });

    it('should store text as vector successfully', async () => {
      const text = 'Grant description text';
      const metadata = {
        id: 'grant-123',
        type: 'grant' as const,
        title: 'Test Grant',
        content: text,
        source: 'test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = await openaiService.storeTextAsVector(text, metadata, 'grants');

      expect(mockOpenAIInstance.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: text
      });

      expect(mockVectorDBInstance.generateVectorId).toHaveBeenCalledWith('grant', 'grant-123');
      
      expect(mockVectorDBInstance.storeVector).toHaveBeenCalledWith(
        'grant_123_timestamp_abcd1234',
        new Array(1536).fill(0.1),
        expect.objectContaining({
          ...metadata,
          updatedAt: expect.any(String)
        }),
        'grants'
      );

      expect(result.vectorId).toBe('grant_123_timestamp_abcd1234');
      expect(result.usage.totalTokens).toBe(10);
    });
  });

  describe('findSimilarContent', () => {
    beforeEach(() => {
      // Mock the semanticSearch method
      jest.spyOn(openaiService, 'semanticSearch').mockResolvedValue([
        {
          id: 'result-1',
          title: 'Similar Content',
          content: 'Similar content description',
          similarity: 0.9,
          metadata: {
            id: 'result-1',
            type: 'grant',
            title: 'Similar Content',
            content: 'Similar content description',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            source: 'test'
          }
        }
      ]);
    });

    it('should find similar content successfully', async () => {
      const results = await openaiService.findSimilarContent(
        'technology funding',
        'grant',
        'org-123',
        5
      );

      expect(openaiService.semanticSearch).toHaveBeenCalledWith(
        'technology funding',
        {
          type: 'grant',
          organizationId: 'org-123',
          topK: 5,
          namespace: 'grants'
        }
      );

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Similar Content');
    });

    it('should use default namespace for non-grant content', async () => {
      await openaiService.findSimilarContent(
        'document content',
        'document',
        undefined,
        10
      );

      expect(openaiService.semanticSearch).toHaveBeenCalledWith(
        'document content',
        {
          type: 'document',
          topK: 10,
          namespace: 'default'
        }
      );
    });
  });

  describe('healthCheck', () => {
    const mockEmbeddingResponse = {
      data: [{ embedding: new Array(1536).fill(0.1) }],
      usage: { prompt_tokens: 1, total_tokens: 1 }
    };

    it('should return healthy status when all services are working', async () => {
      mockOpenAIInstance.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
      mockVectorDBInstance.healthCheck.mockResolvedValue({
        status: 'healthy',
        indexExists: true,
        vectorCount: 100,
        namespaces: ['default']
      });

      const health = await openaiService.healthCheck();

      expect(health).toEqual({
        status: 'healthy',
        openaiConnected: true,
        vectorDbConnected: true
      });
    });

    it('should return unhealthy status when OpenAI fails', async () => {
      mockOpenAIInstance.embeddings.create.mockRejectedValue(new Error('OpenAI Error'));

      const health = await openaiService.healthCheck();

      expect(health).toEqual({
        status: 'unhealthy',
        openaiConnected: false,
        vectorDbConnected: false,
        error: 'Failed to generate embedding: OpenAI Error'
      });
    });

    it('should return unhealthy status when vector DB fails', async () => {
      mockOpenAIInstance.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
      mockVectorDBInstance.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        indexExists: false,
        vectorCount: 0,
        namespaces: [],
        error: 'Index not found'
      });

      const health = await openaiService.healthCheck();

      expect(health).toEqual({
        status: 'unhealthy',
        openaiConnected: true,
        vectorDbConnected: false,
        error: 'Index not found'
      });
    });
  });

  describe('cost calculation', () => {
    it('should calculate embedding costs correctly', async () => {
      const mockResponse = {
        data: [{ embedding: new Array(1536).fill(0.1) }],
        usage: { prompt_tokens: 1000, total_tokens: 1000 }
      };

      mockOpenAIInstance.embeddings.create.mockResolvedValue(mockResponse);

      const result = await openaiService.generateEmbedding('test');

      // For text-embedding-3-small: $0.02 per 1M tokens
      // 1000 tokens = $0.00002 = 0.002 cents
      expect(result.usage.estimatedCost).toBeCloseTo(0.002, 3);
    });

    it('should calculate chat completion costs correctly', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'response' } }],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500
        }
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await openaiService.chatCompletion([
        { role: 'user', content: 'test' }
      ], { model: 'gpt-4o-mini' });

      // For gpt-4o-mini: $0.15 input + $0.60 output per 1M tokens
      // Input: 1000 * 0.15 / 1M = 0.00015 cents
      // Output: 500 * 0.60 / 1M = 0.0003 cents
      // Total: 0.00045 cents
      expect(result.usage.estimatedCost).toBeCloseTo(0.045, 3);
    });
  });
});

// Integration test placeholder
describe('OpenAIService Integration Tests', () => {
  it.skip('should perform end-to-end AI operations', async () => {
    // This would test actual integration with OpenAI and Pinecone
    // Requires real API keys and should be run separately
  });
});