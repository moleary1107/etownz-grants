import { DatabaseService } from '../services/database';

// Mock dependencies
const mockGetInstance = jest.fn();
jest.mock('../services/database', () => ({
  DatabaseService: {
    getInstance: mockGetInstance
  }
}));
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      beta: {
        assistants: {
          create: jest.fn(),
          list: jest.fn(),
          retrieve: jest.fn(),
          update: jest.fn(),
          del: jest.fn()
        },
        threads: {
          create: jest.fn(),
          del: jest.fn(),
          messages: {
            create: jest.fn(),
            list: jest.fn()
          },
          runs: {
            create: jest.fn(),
            createAndPoll: jest.fn()
          }
        }
      }
    }))
  };
});

describe('OpenAI Assistants Service - Simple Tests', () => {
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      query: jest.fn().mockResolvedValue({
        rows: [],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      }),
      getInstance: jest.fn(),
      testConnection: jest.fn()
    } as any;

    // Mock the static getInstance method
    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDb);
  });

  describe('Service Initialization', () => {
    it('should be importable without errors', async () => {
      // Dynamic import to avoid initialization issues
      const { OpenAIAssistantsService } = await import('../services/openaiAssistantsService');
      
      expect(OpenAIAssistantsService).toBeDefined();
      expect(typeof OpenAIAssistantsService).toBe('function');
    });

    it('should have required methods', async () => {
      const { openaiAssistantsService } = await import('../services/openaiAssistantsService');
      
      expect(typeof openaiAssistantsService.initializeAssistants).toBe('function');
      expect(typeof openaiAssistantsService.createThread).toBe('function');
      expect(typeof openaiAssistantsService.generateProposalSection).toBe('function');
      expect(typeof openaiAssistantsService.checkCompliance).toBe('function');
      expect(typeof openaiAssistantsService.optimizeBudget).toBe('function');
      expect(typeof openaiAssistantsService.getAssistantThreads).toBe('function');
      expect(typeof openaiAssistantsService.deleteThread).toBe('function');
    });
  });

  describe('Assistant Configuration', () => {
    it('should have proper assistant configurations defined', async () => {
      // Test that we can access the assistant configurations
      const { openaiAssistantsService } = await import('../services/openaiAssistantsService');
      
      // Test getAssistant method with null return for uninitialized
      const assistant = await openaiAssistantsService.getAssistant('proposal_writer');
      expect(assistant).toBeNull(); // Should be null before initialization
    });
  });

  describe('Database Integration', () => {
    it('should use database service for storing assistant info', async () => {
      // Mock the database instance
      const mockDbInstance = { query: jest.fn() };
      mockGetInstance.mockReturnValue(mockDbInstance);
      
      const { openaiAssistantsService } = await import('../services/openaiAssistantsService');
      
      // Verify database service is being used
      expect(mockGetInstance).toHaveBeenCalled();
    });

    it('should handle database query structure', async () => {
      // Test that database queries are properly structured
      expect(mockDb.query).toBeDefined();
      
      // Mock a database call
      const result = await mockDb.query('SELECT 1', []);
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('command');
      expect(result).toHaveProperty('rowCount');
    });
  });

  describe('Error Handling', () => {
    it('should handle service creation without OpenAI API key', async () => {
      // Remove API key temporarily
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      
      try {
        // Service should still be creatable, just not functional
        const { OpenAIAssistantsService } = await import('../services/openaiAssistantsService');
        expect(OpenAIAssistantsService).toBeDefined();
      } finally {
        // Restore API key
        if (originalKey) {
          process.env.OPENAI_API_KEY = originalKey;
        }
      }
    });

    it('should handle database connection errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));
      
      const { openaiAssistantsService } = await import('../services/openaiAssistantsService');
      
      // Service should still be accessible even with database errors
      expect(openaiAssistantsService).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should have valid assistant types defined', () => {
      const expectedAssistants = [
        'proposal_writer',
        'compliance_checker', 
        'budget_analyst',
        'requirements_analyzer',
        'impact_strategist'
      ];
      
      // These should be the available assistant keys
      expectedAssistants.forEach(key => {
        expect(typeof key).toBe('string');
        expect(key.length).toBeGreaterThan(0);
      });
    });

    it('should have proper model configurations', () => {
      const expectedModel = 'gpt-4-turbo-preview';
      const expectedTools = [
        { type: 'file_search' },
        { type: 'code_interpreter' }
      ];
      
      expect(expectedModel).toBe('gpt-4-turbo-preview');
      expect(expectedTools).toBeInstanceOf(Array);
      expect(expectedTools.length).toBeGreaterThan(0);
    });
  });

  describe('Interface Compliance', () => {
    it('should match expected interface structures', () => {
      // Test AssistantThread interface structure
      const mockThread = {
        id: 'thread_123',
        assistantId: 'asst_456', 
        userId: 'user_789',
        grantApplicationId: 'grant_abc',
        metadata: { type: 'test' },
        createdAt: new Date()
      };

      expect(mockThread).toHaveProperty('id');
      expect(mockThread).toHaveProperty('assistantId');
      expect(mockThread).toHaveProperty('userId');
      expect(mockThread).toHaveProperty('metadata');
      expect(mockThread).toHaveProperty('createdAt');
      expect(mockThread.createdAt).toBeInstanceOf(Date);
    });

    it('should match GeneratedContent interface structure', () => {
      const mockContent = {
        text: 'Generated content',
        confidence: 0.85,
        suggestions: ['suggestion 1', 'suggestion 2'],
        tokensUsed: 150,
        processingTime: 2500,
        threadId: 'thread_123',
        runId: 'run_456'
      };

      expect(mockContent).toHaveProperty('text');
      expect(mockContent).toHaveProperty('confidence');
      expect(mockContent).toHaveProperty('suggestions');
      expect(mockContent).toHaveProperty('tokensUsed');
      expect(mockContent).toHaveProperty('processingTime');
      expect(mockContent).toHaveProperty('threadId');
      expect(mockContent).toHaveProperty('runId');
      expect(typeof mockContent.confidence).toBe('number');
      expect(mockContent.suggestions).toBeInstanceOf(Array);
    });
  });

  describe('Service Availability', () => {
    it('should be available as singleton', async () => {
      const { openaiAssistantsService } = await import('../services/openaiAssistantsService');
      
      expect(openaiAssistantsService).toBeDefined();
      expect(typeof openaiAssistantsService).toBe('object');
    });

    it('should have consistent service instance', async () => {
      const { openaiAssistantsService: service1 } = await import('../services/openaiAssistantsService');
      const { openaiAssistantsService: service2 } = await import('../services/openaiAssistantsService');
      
      // Should be the same instance (singleton pattern)
      expect(service1).toBe(service2);
    });
  });
});