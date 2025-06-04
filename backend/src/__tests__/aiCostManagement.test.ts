import request from 'supertest';
import express from 'express';
import AICostManagementService from '../services/aiCostManagementService';
import aiCostManagementRoutes from '../routes/aiCostManagement';

// Mock the database service
jest.mock('../services/database', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    testConnection: jest.fn().mockResolvedValue(true)
  }))
}));

// Mock the logger
jest.mock('../services/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock the auth middleware
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', organizationId: 'test-org-id' };
    next();
  }
}));

describe('AI Cost Management', () => {
  let app: express.Application;
  let costManagementService: AICostManagementService;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/ai-cost', aiCostManagementRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AICostManagementService', () => {
    beforeEach(() => {
      // Mock environment variables
      process.env.AI_ENABLE_SMART_CACHING = 'true';
      process.env.AI_ENABLE_MODEL_DOWNGRADING = 'true';
      process.env.AI_MAX_DAILY_COST_PER_USER = '1000';
      process.env.AI_DEFAULT_MODEL = 'gpt-4o-mini';
    });

    it('should record usage metrics', async () => {
      const mockDb = {
        query: jest.fn().mockResolvedValue([]),
        testConnection: jest.fn().mockResolvedValue(true)
      };

      // Mock the DatabaseService constructor
      const { DatabaseService } = require('../services/database');
      DatabaseService.mockImplementation(() => mockDb);

      costManagementService = new AICostManagementService();

      const usage = {
        userId: 'user-123',
        organizationId: 'org-456',
        service: 'openai' as const,
        operation: 'chat_completion',
        model: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        cost: 0.15,
        duration: 1500,
        endpoint: 'openai-chat',
        requestId: 'req-123',
        status: 'success' as const
      };

      await costManagementService.recordUsage(usage);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_usage_metrics'),
        expect.arrayContaining([
          expect.any(String), // id
          'user-123',
          'org-456',
          'openai',
          'chat_completion',
          'gpt-4o-mini',
          100,
          50,
          150,
          0.15,
          1500,
          expect.any(Date), // timestamp
          'openai-chat',
          'req-123',
          'success',
          undefined
        ])
      );
    });

    it('should apply automatic optimizations', async () => {
      const mockDb = {
        query: jest.fn().mockResolvedValue([]),
        testConnection: jest.fn().mockResolvedValue(true)
      };

      const { DatabaseService } = require('../services/database');
      DatabaseService.mockImplementation(() => mockDb);

      costManagementService = new AICostManagementService();

      const prompt = 'Simple question about grants';
      const options = { model: 'gpt-4-turbo' };

      const optimizations = await costManagementService.applyAutomaticOptimizations(
        'simple_question',
        prompt,
        options
      );

      expect(optimizations.optimizedModel).toBe('gpt-4o-mini');
      expect(optimizations.optimizationsApplied).toContain('Model switched to gpt-4o-mini');
    });

    it('should set cost thresholds', async () => {
      const mockDb = {
        query: jest.fn().mockResolvedValue([]),
        testConnection: jest.fn().mockResolvedValue(true)
      };

      const { DatabaseService } = require('../services/database');
      DatabaseService.mockImplementation(() => mockDb);

      costManagementService = new AICostManagementService();

      const threshold = {
        organizationId: 'org-123',
        type: 'daily' as const,
        limit: 1000,
        resetDate: new Date(),
        alertThreshold: 80,
        isActive: true,
        notificationSent: false
      };

      const thresholdId = await costManagementService.setCostThreshold(threshold);

      expect(thresholdId).toMatch(/^threshold_/);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_cost_thresholds'),
        expect.arrayContaining([
          thresholdId,
          'org-123',
          undefined,
          'daily',
          1000,
          expect.any(Date),
          80,
          true
        ])
      );
    });
  });

  describe('API Routes', () => {
    it('should get usage analytics', async () => {
      const response = await request(app)
        .get('/api/ai-cost/usage/analytics')
        .query({
          organizationId: 'test-org-id',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should get optimization suggestions', async () => {
      const response = await request(app)
        .get('/api/ai-cost/optimization/suggestions')
        .query({
          organizationId: 'test-org-id'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data).toHaveProperty('totalPotentialSavings');
    });

    it('should set cost threshold', async () => {
      const threshold = {
        organizationId: 'test-org-id',
        type: 'daily',
        limit: 1000,
        resetDate: new Date().toISOString(),
        alertThreshold: 80,
        isActive: true
      };

      const response = await request(app)
        .post('/api/ai-cost/thresholds')
        .send(threshold);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('thresholdId');
    });

    it('should record usage', async () => {
      const usage = {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        service: 'openai',
        operation: 'chat_completion',
        model: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        cost: 0.15,
        duration: 1500,
        endpoint: 'openai-chat',
        requestId: 'req-123',
        status: 'success'
      };

      const response = await request(app)
        .post('/api/ai-cost/usage/record')
        .send(usage);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should apply optimizations', async () => {
      const request_data = {
        operation: 'simple_question',
        prompt: 'What is the capital of France?',
        options: { model: 'gpt-4-turbo' }
      };

      const response = await request(app)
        .post('/api/ai-cost/optimization/apply')
        .send(request_data);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('optimizedModel');
      expect(response.body.data).toHaveProperty('optimizationsApplied');
    });

    it('should get dashboard data', async () => {
      const response = await request(app)
        .get('/api/ai-cost/dashboard')
        .query({
          organizationId: 'test-org-id'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('currentMonthCost');
      expect(response.body.data).toHaveProperty('todayCost');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data).toHaveProperty('performanceMetrics');
    });

    it('should validate request parameters', async () => {
      const response = await request(app)
        .get('/api/ai-cost/usage/analytics')
        .query({
          // Missing required parameters
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should handle invalid threshold data', async () => {
      const invalidThreshold = {
        organizationId: 'test-org-id',
        type: 'invalid_type', // Invalid type
        limit: 'not_a_number', // Invalid limit
        resetDate: 'invalid_date' // Invalid date
      };

      const response = await request(app)
        .post('/api/ai-cost/thresholds')
        .send(invalidThreshold);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('Cost Optimization Logic', () => {
    beforeEach(() => {
      process.env.AI_ENABLE_MODEL_DOWNGRADING = 'true';
    });

    it('should suggest cheaper model for simple prompts', async () => {
      const mockDb = {
        query: jest.fn().mockResolvedValue([]),
        testConnection: jest.fn().mockResolvedValue(true)
      };

      const { DatabaseService } = require('../services/database');
      DatabaseService.mockImplementation(() => mockDb);

      costManagementService = new AICostManagementService();

      const simplePrompt = 'What is 2+2?';
      const options = { model: 'gpt-4-turbo' };

      const optimizations = await costManagementService.applyAutomaticOptimizations(
        'simple_math',
        simplePrompt,
        options
      );

      expect(optimizations.optimizedModel).toBe('gpt-4o-mini');
    });

    it('should keep expensive model for complex prompts', async () => {
      const mockDb = {
        query: jest.fn().mockResolvedValue([]),
        testConnection: jest.fn().mockResolvedValue(true)
      };

      const { DatabaseService } = require('../services/database');
      DatabaseService.mockImplementation(() => mockDb);

      costManagementService = new AICostManagementService();

      const complexPrompt = `
        Analyze the comprehensive impact of multi-dimensional regulatory frameworks 
        on cross-border grant application processes, considering jurisdictional 
        variations, compliance matrices, and strategic optimization approaches 
        for multinational organizations seeking funding opportunities across 
        diverse geographical and regulatory landscapes.
      `;
      const options = { model: 'gpt-4-turbo' };

      const optimizations = await costManagementService.applyAutomaticOptimizations(
        'complex_analysis',
        complexPrompt,
        options
      );

      expect(optimizations.optimizedModel).toBe('gpt-4-turbo');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const mockDb = {
        query: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        testConnection: jest.fn().mockResolvedValue(true)
      };

      const { DatabaseService } = require('../services/database');
      DatabaseService.mockImplementation(() => mockDb);

      costManagementService = new AICostManagementService();

      const usage = {
        userId: 'user-123',
        service: 'openai' as const,
        operation: 'test',
        model: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        cost: 0.15,
        duration: 1500,
        endpoint: 'test',
        requestId: 'req-123',
        status: 'success' as const
      };

      await expect(costManagementService.recordUsage(usage)).rejects.toThrow();
    });

    it('should handle API errors properly', async () => {
      const response = await request(app)
        .get('/api/ai-cost/usage/analytics')
        .query({
          organizationId: 'test-org-id',
          startDate: 'invalid-date',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});