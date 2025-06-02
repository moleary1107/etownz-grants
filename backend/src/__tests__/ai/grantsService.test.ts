import { GrantsService, GrantProcessingResult, GrantMatchResult, OrganizationProfile } from '../../services/grantsService';
import { GrantsRepository, Grant } from '../../repositories/grantsRepository';
import { OpenAIService } from '../../services/openaiService';
import { VectorDatabaseService } from '../../services/vectorDatabase';
import { db } from '../../services/database';

// Mock dependencies
jest.mock('../../repositories/grantsRepository');
jest.mock('../../services/openaiService');
jest.mock('../../services/vectorDatabase');
jest.mock('../../services/database');

// Mock logger
jest.mock('../../services/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

const MockGrantsRepository = GrantsRepository as jest.MockedClass<typeof GrantsRepository>;
const MockOpenAIService = OpenAIService as jest.MockedClass<typeof OpenAIService>;
const MockVectorDatabaseService = VectorDatabaseService as jest.MockedClass<typeof VectorDatabaseService>;

describe('GrantsService', () => {
  let grantsService: GrantsService;
  let mockGrantsRepo: any;
  let mockOpenAI: any;
  let mockVectorDB: any;
  let mockDb: any;

  const mockGrant: Grant = {
    id: 'grant-123',
    title: 'Technology Innovation Grant',
    description: 'Grant for innovative technology projects',
    summary: 'Innovation funding for tech startups',
    funder: 'Enterprise Ireland',
    amount_min: 10000,
    amount_max: 100000,
    categories: ['technology', 'innovation'],
    eligibility_criteria: { sector: 'technology', stage: 'startup' },
    source: 'test',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockOrganizationProfile: OrganizationProfile = {
    id: 'org-123',
    name: 'Tech Startup Ltd',
    description: 'AI-powered technology startup',
    sector: 'technology',
    size: 'small',
    location: 'ireland',
    capabilities: ['ai', 'machine-learning'],
    previousGrants: ['Previous Tech Grant']
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database queries
    mockDb = {
      query: jest.fn()
    };
    (db as any).query = mockDb.query;

    // Mock repository
    mockGrantsRepo = {
      findById: jest.fn(),
      findGrants: jest.fn()
    };
    MockGrantsRepository.mockImplementation(() => mockGrantsRepo);

    // Mock OpenAI service
    mockOpenAI = {
      storeTextAsVector: jest.fn(),
      enhancedSemanticSearch: jest.fn(),
      semanticSearch: jest.fn(),
      analyzeGrantRelevance: jest.fn(),
      chatCompletion: jest.fn(),
      healthCheck: jest.fn()
    };
    MockOpenAIService.mockImplementation(() => mockOpenAI);

    // Mock vector database
    mockVectorDB = {
      storeVector: jest.fn(),
      searchSimilar: jest.fn()
    };
    MockVectorDatabaseService.mockImplementation(() => mockVectorDB);

    grantsService = new GrantsService();
  });

  describe('processNewGrant', () => {
    beforeEach(() => {
      mockOpenAI.storeTextAsVector.mockResolvedValue({
        vectorId: 'vector_grant-123_12345_abcd',
        usage: { totalTokens: 100, estimatedCost: 5 }
      });

      mockOpenAI.chatCompletion.mockResolvedValue({
        content: JSON.stringify(['technology', 'innovation', 'ai']),
        usage: { totalTokens: 50, estimatedCost: 2 }
      });

      mockDb.query.mockResolvedValue({ rows: [] });
    });

    it('should process a new grant successfully', async () => {
      const result = await grantsService.processNewGrant(mockGrant);

      expect(result.aiProcessed).toBe(true);
      expect(result.vectorId).toBe('vector_grant-123_12345_abcd');
      expect(result.semanticTags).toEqual(['technology', 'innovation', 'ai']);

      expect(mockOpenAI.storeTextAsVector).toHaveBeenCalledWith(
        expect.stringContaining(mockGrant.title),
        expect.objectContaining({
          id: mockGrant.id,
          type: 'grant',
          title: mockGrant.title
        }),
        'grants'
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE grants'),
        expect.arrayContaining([true, 'processed', mockGrant.id])
      );
    });

    it('should handle processing errors gracefully', async () => {
      mockOpenAI.storeTextAsVector.mockRejectedValue(new Error('Vector storage failed'));

      const result = await grantsService.processNewGrant(mockGrant);

      expect(result.aiProcessed).toBe(false);
      expect(result.processingError).toBe('Vector storage failed');
      expect(result.semanticTags).toEqual([]);

      // Should still update the grant record with error status
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE grants'),
        expect.arrayContaining([false, 'error', mockGrant.id])
      );
    });

    it('should generate semantic tags using AI', async () => {
      await grantsService.processNewGrant(mockGrant);

      expect(mockOpenAI.chatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('extract semantic tags')
          })
        ]),
        expect.objectContaining({
          model: 'gpt-4o-mini',
          responseFormat: 'json_object'
        })
      );
    });

    it('should store semantic tags in database', async () => {
      await grantsService.processNewGrant(mockGrant);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO grant_semantic_tags'),
        expect.arrayContaining([mockGrant.id, 'technology', 'innovation', 'ai'])
      );
    });

    it('should log AI interactions', async () => {
      await grantsService.processNewGrant(mockGrant);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_interactions'),
        expect.arrayContaining([
          'grant_processing',
          'text-embedding-3-small',
          expect.any(String),
          undefined,
          100,
          5,
          expect.any(String)
        ])
      );
    });
  });

  describe('findMatchingGrants', () => {
    const mockSemanticResults = [
      {
        id: 'grant-123',
        title: 'Tech Grant',
        content: 'Technology grant',
        similarity: 0.95,
        metadata: { id: 'grant-123', type: 'grant' },
        reasoning: 'Strong tech match'
      },
      {
        id: 'grant-456',
        title: 'Innovation Grant',
        content: 'Innovation grant',
        similarity: 0.87,
        metadata: { id: 'grant-456', type: 'grant' },
        reasoning: 'Good innovation match'
      }
    ];

    const mockAnalysisResult = {
      overallCompatibility: 85,
      eligibilityStatus: 'ELIGIBLE' as const,
      matchingCriteria: [],
      recommendations: ['Apply before deadline'],
      reasoning: 'Good match for tech sector',
      confidence: 90
    };

    beforeEach(() => {
      mockOpenAI.enhancedSemanticSearch.mockResolvedValue(mockSemanticResults);
      
      // Mock findGrantById (which is what the service actually calls)
      mockDb.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('SELECT * FROM grants WHERE id')) {
          const id = params[0];
          if (id === 'grant-123') return Promise.resolve({ rows: [mockGrant] });
          if (id === 'grant-456') return Promise.resolve({ rows: [{ ...mockGrant, id: 'grant-456', title: 'Innovation Grant' }] });
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT * FROM grant_ai_analysis')) {
          return Promise.resolve({ rows: [] }); // No cached analysis
        }
        return Promise.resolve({ rows: [] });
      });
      
      mockOpenAI.analyzeGrantRelevance.mockResolvedValue(mockAnalysisResult);
    });

    it('should find matching grants successfully', async () => {
      const results = await grantsService.findMatchingGrants(mockOrganizationProfile);

      expect(results).toHaveLength(2);
      expect(results[0].grant.id).toBe('grant-123');
      expect(results[0].matchScore).toBe(85);
      expect(results[0].reasoning).toBe('Strong tech match');

      expect(mockOpenAI.enhancedSemanticSearch).toHaveBeenCalledWith(
        expect.stringContaining(mockOrganizationProfile.name),
        expect.stringContaining(mockOrganizationProfile.description),
        expect.objectContaining({
          type: 'grant',
          namespace: 'grants',
          topK: 20
        })
      );
    });

    it('should use cached analysis when available', async () => {
      // Override mock to return cached analysis
      mockDb.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('SELECT * FROM grants WHERE id')) {
          const id = params[0];
          if (id === 'grant-123') return Promise.resolve({ rows: [mockGrant] });
          if (id === 'grant-456') return Promise.resolve({ rows: [{ ...mockGrant, id: 'grant-456', title: 'Innovation Grant' }] });
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT analysis_result')) {
          return Promise.resolve({ rows: [{ analysis_result: mockAnalysisResult }] }); // Cached analysis
        }
        return Promise.resolve({ rows: [] });
      });

      const results = await grantsService.findMatchingGrants(mockOrganizationProfile);

      expect(results).toHaveLength(2);
      expect(mockOpenAI.analyzeGrantRelevance).not.toHaveBeenCalled();
    });

    it('should sort results by match score', async () => {
      const lowScoreAnalysis = { ...mockAnalysisResult, overallCompatibility: 60 };
      mockOpenAI.analyzeGrantRelevance
        .mockResolvedValueOnce(lowScoreAnalysis) // First grant gets low score
        .mockResolvedValueOnce(mockAnalysisResult); // Second grant gets high score

      const results = await grantsService.findMatchingGrants(mockOrganizationProfile);

      expect(results[0].matchScore).toBe(85); // Higher score first
      expect(results[1].matchScore).toBe(60); // Lower score second
    });

    it('should handle analysis errors gracefully', async () => {
      mockOpenAI.analyzeGrantRelevance
        .mockRejectedValueOnce(new Error('Analysis failed'))
        .mockResolvedValueOnce(mockAnalysisResult);

      const results = await grantsService.findMatchingGrants(mockOrganizationProfile);

      expect(results).toHaveLength(1); // Only the successful analysis
      expect(results[0].grant.id).toBe('grant-456');
    });

    it('should cache analysis results', async () => {
      await grantsService.findMatchingGrants(mockOrganizationProfile);

      // Check that the analysis was cached by looking at all database calls
      const insertCalls = mockDb.query.mock.calls.filter(call => 
        call[0].includes('INSERT INTO grant_ai_analysis')
      );
      
      expect(insertCalls.length).toBe(2); // One for each grant
      // Check the SQL query structure includes the correct INSERT statement
      expect(insertCalls[0][0]).toContain('INSERT INTO grant_ai_analysis');
      expect(insertCalls[0][0]).toContain('VALUES ($1, $2, \'compatibility\', $3, $4, \'gpt-4o-mini\')');
      // Check that grantId and orgId are correct
      expect(insertCalls[0][1][0]).toBe('grant-123');
      expect(insertCalls[0][1][1]).toBe(mockOrganizationProfile.id);
    });
  });

  describe('semanticSearchGrants', () => {
    const mockSearchResults = [
      {
        id: 'grant-123',
        title: 'Tech Grant',
        content: 'Technology grant',
        similarity: 0.92,
        metadata: { id: 'grant-123', type: 'grant' }
      }
    ];

    beforeEach(() => {
      mockOpenAI.enhancedSemanticSearch.mockResolvedValue(mockSearchResults);
      mockOpenAI.semanticSearch.mockResolvedValue(mockSearchResults);
      mockDb.query.mockResolvedValue({
        rows: [mockOrganizationProfile]
      });
    });

    it('should perform enhanced search with organization context', async () => {
      const results = await grantsService.semanticSearchGrants(
        'AI technology funding',
        'org-123'
      );

      expect(results).toEqual(mockSearchResults);
      expect(mockOpenAI.enhancedSemanticSearch).toHaveBeenCalledWith(
        'AI technology funding',
        expect.stringContaining(mockOrganizationProfile.name),
        expect.objectContaining({
          type: 'grant',
          organizationId: 'org-123',
          namespace: 'grants',
          topK: 10
        })
      );
    });

    it('should perform standard search without organization context', async () => {
      const results = await grantsService.semanticSearchGrants('technology funding');

      expect(results).toEqual(mockSearchResults);
      expect(mockOpenAI.semanticSearch).toHaveBeenCalledWith(
        'technology funding',
        expect.objectContaining({
          type: 'grant',
          namespace: 'grants',
          topK: 10
        })
      );
    });
  });

  describe('getUnprocessedGrants', () => {
    it('should return unprocessed grants', async () => {
      const unprocessedGrants = [mockGrant];
      mockDb.query.mockResolvedValue({ rows: unprocessedGrants });

      const results = await grantsService.getUnprocessedGrants(50);

      expect(results).toEqual(unprocessedGrants);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ai_processed IS NULL OR ai_processed = false'),
        [50]
      );
    });
  });

  describe('batchProcessGrants', () => {
    beforeEach(() => {
      mockDb.query.mockResolvedValue({ rows: [mockGrant] });
      mockOpenAI.storeTextAsVector.mockResolvedValue({
        vectorId: 'vector_123',
        usage: { totalTokens: 100, estimatedCost: 5 }
      });
      mockOpenAI.chatCompletion.mockResolvedValue({
        content: JSON.stringify(['tech']),
        usage: { totalTokens: 50, estimatedCost: 2 }
      });
    });

    it('should batch process grants successfully', async () => {
      const result = await grantsService.batchProcessGrants(10);

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should handle processing failures in batch', async () => {
      // Reset mocks first
      jest.clearAllMocks();
      
      // Set up batch processing mock to return unprocessed grants
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockGrant] }) // getUnprocessedGrants
        .mockRejectedValue(new Error('Database update failed')); // All subsequent queries fail
      
      // Override mocks to simulate failure - but this won't be reached due to DB failure
      mockOpenAI.storeTextAsVector.mockRejectedValue(new Error('Processing failed'));
      mockOpenAI.chatCompletion.mockRejectedValue(new Error('Chat failed'));

      const result = await grantsService.batchProcessGrants(10);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain('Grant grant-123: Database update failed');
    });
  });

  describe('healthCheck', () => {
    beforeEach(() => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ processed: '150' }] })
        .mockResolvedValueOnce({ rows: [{ stored: '145' }] })
        .mockResolvedValueOnce({ rows: [{ interactions: '25' }] });
      
      mockOpenAI.healthCheck.mockResolvedValue({
        status: 'healthy',
        openaiConnected: true,
        vectorDbConnected: true
      });
    });

    it('should return healthy status when all services are working', async () => {
      const health = await grantsService.healthCheck();

      expect(health).toEqual({
        status: 'healthy',
        grantsProcessed: 150,
        vectorsStored: 145,
        aiInteractions: 25
      });
    });

    it('should return unhealthy status when AI service is down', async () => {
      mockOpenAI.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        openaiConnected: false,
        vectorDbConnected: true,
        error: 'OpenAI connection failed'
      });

      const health = await grantsService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.errors).toContain('AI Service: OpenAI connection failed');
    });

    it('should handle database errors', async () => {
      // Reset all mocks first
      jest.clearAllMocks();
      
      // Re-set up the mock after clearAllMocks
      mockDb = {
        query: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      (db as any).query = mockDb.query;
      
      // Ensure OpenAI health check doesn't interfere
      mockOpenAI.healthCheck.mockResolvedValue({
        status: 'healthy',
        openaiConnected: true,
        vectorDbConnected: true
      });

      const health = await grantsService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.errors).toContain('Database connection failed');
    });
  });

  describe('private helper methods', () => {
    it('should construct grant text correctly', async () => {
      // We can't test private methods directly, but we can verify the behavior
      // through the public methods that use them
      await grantsService.processNewGrant(mockGrant);

      const storeCall = mockOpenAI.storeTextAsVector.mock.calls[0];
      const grantText = storeCall[0];

      expect(grantText).toContain(mockGrant.title);
      expect(grantText).toContain(mockGrant.description);
      expect(grantText).toContain(mockGrant.funder);
      expect(grantText).toContain('technology');
      expect(grantText).toContain('innovation');
    });

    it('should construct organization profile text correctly', async () => {
      mockOpenAI.enhancedSemanticSearch.mockResolvedValue([]);
      mockDb.query.mockResolvedValue({ rows: [mockOrganizationProfile] });

      await grantsService.semanticSearchGrants('test query', 'org-123');

      const searchCall = mockOpenAI.enhancedSemanticSearch.mock.calls[0];
      const orgProfileText = searchCall[1];

      expect(orgProfileText).toContain(mockOrganizationProfile.name);
      expect(orgProfileText).toContain(mockOrganizationProfile.description);
      expect(orgProfileText).toContain(mockOrganizationProfile.sector);
      expect(orgProfileText).toContain('ai');
      expect(orgProfileText).toContain('machine-learning');
    });
  });

  describe('error handling', () => {
    it('should handle OpenAI service errors', async () => {
      mockOpenAI.storeTextAsVector.mockRejectedValue(new Error('OpenAI API error'));

      const result = await grantsService.processNewGrant(mockGrant);

      expect(result.aiProcessed).toBe(false);
      expect(result.processingError).toBe('OpenAI API error');
    });

    it('should handle database errors during processing', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(grantsService.processNewGrant(mockGrant))
        .rejects.toThrow('Database error');
    });

    it('should handle missing organization profile', async () => {
      mockDb.query.mockResolvedValue({ rows: [] }); // No organization found

      await expect(grantsService.semanticSearchGrants('test', 'invalid-org'))
        .rejects.toThrow('Organization not found: invalid-org');
    });
  });
});

// Integration test placeholder
describe('GrantsService Integration Tests', () => {
  it.skip('should perform end-to-end grant processing', async () => {
    // This would test actual integration with database and AI services
    // Requires real database and API keys
  });

  it.skip('should handle large batch processing efficiently', async () => {
    // Test with actual database and multiple grants
  });
});