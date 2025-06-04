import request from 'supertest';
import express from 'express';
import openaiAssistantsRoutes from '../routes/openaiAssistants';
import { openaiAssistantsService } from '../services/openaiAssistantsService';

// Mock dependencies
jest.mock('../services/openaiAssistantsService');
jest.mock('../middleware/auth', () => ({
  auth: (req: any, res: any, next: any) => {
    req.user = { id: 'user_123', role: 'user' };
    next();
  }
}));

describe('OpenAI Assistants Routes', () => {
  let app: express.Application;
  const mockService = openaiAssistantsService as jest.Mocked<typeof openaiAssistantsService>;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/assistants', openaiAssistantsRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/assistants', () => {
    it('should return list of available assistants', async () => {
      const response = await request(app)
        .get('/api/assistants')
        .expect(200);

      expect(response.body).toHaveProperty('assistants');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body.assistants).toBeInstanceOf(Array);
      expect(response.body.assistants).toHaveLength(5);

      const proposalWriter = response.body.assistants.find(
        (a: any) => a.key === 'proposal_writer'
      );
      expect(proposalWriter).toBeDefined();
      expect(proposalWriter.name).toBe('Grant Proposal Writer');
      expect(proposalWriter.capabilities).toContain('section generation');
    });
  });

  describe('POST /api/assistants/:assistantKey/threads', () => {
    it('should create a new thread with assistant', async () => {
      const mockThread = {
        id: 'thread_123',
        assistantId: 'asst_456',
        userId: 'user_123',
        grantApplicationId: 'grant_789',
        metadata: { projectType: 'research' },
        createdAt: new Date()
      };

      mockService.createThread.mockResolvedValue(mockThread);

      const response = await request(app)
        .post('/api/assistants/proposal_writer/threads')
        .send({
          grantApplicationId: 'grant_789',
          metadata: { projectType: 'research' }
        })
        .expect(201);

      expect(response.body).toHaveProperty('threadId', 'thread_123');
      expect(response.body).toHaveProperty('assistantKey', 'proposal_writer');
      expect(response.body).toHaveProperty('createdAt');

      expect(mockService.createThread).toHaveBeenCalledWith(
        'proposal_writer',
        'user_123',
        'grant_789',
        { projectType: 'research' }
      );
    });

    it('should handle thread creation errors', async () => {
      mockService.createThread.mockRejectedValue(new Error('Assistant not found'));

      const response = await request(app)
        .post('/api/assistants/invalid_assistant/threads')
        .send({})
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to create assistant thread');
    });
  });

  describe('GET /api/assistants/threads', () => {
    it('should return user threads', async () => {
      const mockThreads = [
        {
          id: 'thread_1',
          assistantId: 'asst_1',
          userId: 'user_123',
          grantApplicationId: 'grant_1',
          metadata: { type: 'proposal' },
          createdAt: new Date()
        },
        {
          id: 'thread_2',
          assistantId: 'asst_2',
          userId: 'user_123',
          grantApplicationId: null,
          metadata: { type: 'compliance' },
          createdAt: new Date()
        }
      ];

      mockService.getAssistantThreads.mockResolvedValue(mockThreads);

      const response = await request(app)
        .get('/api/assistants/threads')
        .expect(200);

      expect(response.body).toHaveProperty('threads');
      expect(response.body).toHaveProperty('totalCount', 2);
      expect(response.body.threads).toHaveLength(2);

      expect(mockService.getAssistantThreads).toHaveBeenCalledWith('user_123');
    });

    it('should filter threads by assistant key', async () => {
      const mockAssistant = { id: 'asst_proposal' };
      const mockThreads = [
        {
          id: 'thread_1',
          assistantId: 'asst_proposal',
          userId: 'user_123',
          grantApplicationId: 'grant_1',
          metadata: {},
          createdAt: new Date()
        }
      ];

      mockService.getAssistant.mockResolvedValue(mockAssistant as any);
      mockService.getAssistantThreads.mockResolvedValue(mockThreads);

      const response = await request(app)
        .get('/api/assistants/threads?assistantKey=proposal_writer')
        .expect(200);

      expect(response.body.threads).toHaveLength(1);
      expect(response.body.threads[0].assistantId).toBe('asst_proposal');
    });

    it('should filter threads by grant application', async () => {
      const mockThreads = [
        {
          id: 'thread_1',
          assistantId: 'asst_1',
          userId: 'user_123',
          grantApplicationId: 'grant_specific',
          metadata: {},
          createdAt: new Date()
        }
      ];

      mockService.getAssistantThreads.mockResolvedValue(mockThreads);

      const response = await request(app)
        .get('/api/assistants/threads?grantApplicationId=grant_specific')
        .expect(200);

      expect(response.body.threads).toHaveLength(1);
      expect(response.body.threads[0].grantApplicationId).toBe('grant_specific');
    });
  });

  describe('POST /api/assistants/:assistantKey/generate-section', () => {
    it('should generate proposal section without streaming', async () => {
      const mockResult = {
        text: 'This is a comprehensive executive summary that outlines the project goals and impact.',
        confidence: 0.92,
        suggestions: ['Consider adding more specific metrics'],
        tokensUsed: 150,
        processingTime: 2500,
        threadId: 'thread_123',
        runId: 'run_456'
      };

      mockService.generateProposalSection.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/assistants/proposal_writer/generate-section')
        .send({
          threadId: 'thread_123',
          sectionType: 'executive_summary',
          grantType: 'research',
          fundingBody: 'EU Horizon Europe',
          requirements: ['innovation', 'impact'],
          wordLimit: 500
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('content', mockResult.text);
      expect(response.body).toHaveProperty('confidence', 0.92);
      expect(response.body).toHaveProperty('suggestions');
      expect(response.body.metadata).toHaveProperty('tokensUsed', 150);

      expect(mockService.generateProposalSection).toHaveBeenCalledWith(
        'proposal_writer',
        'thread_123',
        'executive_summary',
        expect.objectContaining({
          grantType: 'research',
          fundingBody: 'EU Horizon Europe',
          requirements: ['innovation', 'impact'],
          wordLimit: 500
        }),
        undefined
      );
    });

    it('should handle streaming response', async () => {
      const mockResult = {
        text: 'Complete response',
        confidence: 0.85,
        suggestions: [],
        tokensUsed: 100,
        processingTime: 1500,
        threadId: 'thread_123',
        runId: 'run_456'
      };

      mockService.generateProposalSection.mockImplementation(
        (assistantKey, threadId, sectionType, context, streamCallback) => {
          if (streamCallback) {
            // Simulate streaming
            setTimeout(() => streamCallback('Complete '), 10);
            setTimeout(() => streamCallback('response'), 20);
          }
          return Promise.resolve(mockResult);
        }
      );

      const response = await request(app)
        .post('/api/assistants/proposal_writer/generate-section')
        .set('Accept', 'text/stream')
        .send({
          threadId: 'thread_123',
          sectionType: 'methodology',
          grantType: 'innovation',
          fundingBody: 'Enterprise Ireland'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/stream');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/assistants/proposal_writer/generate-section')
        .send({
          threadId: 'thread_123',
          // Missing sectionType, grantType, fundingBody
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should handle generation errors', async () => {
      mockService.generateProposalSection.mockRejectedValue(
        new Error('Generation failed')
      );

      const response = await request(app)
        .post('/api/assistants/proposal_writer/generate-section')
        .send({
          threadId: 'thread_123',
          sectionType: 'impact',
          grantType: 'research',
          fundingBody: 'SFI'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to generate section');
    });
  });

  describe('POST /api/assistants/compliance-checker/check', () => {
    it('should perform compliance check', async () => {
      const mockResult = {
        overallScore: 78,
        issues: [
          {
            field: 'budget',
            requirement: 'Budget must be justified',
            severity: 'major' as const,
            suggestion: 'Add detailed budget justification'
          },
          {
            field: 'methodology',
            requirement: 'Methodology must be detailed',
            severity: 'minor' as const,
            suggestion: 'Expand methodology section'
          }
        ],
        suggestions: [
          'Review all mandatory fields',
          'Ensure compliance with funding body requirements'
        ]
      };

      mockService.checkCompliance.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/assistants/compliance-checker/check')
        .send({
          threadId: 'thread_123',
          applicationData: {
            title: 'Research Project',
            budget: 500000,
            methodology: 'Brief methodology'
          },
          grantScheme: 'horizon_europe'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('overallScore', 78);
      expect(response.body).toHaveProperty('issues');
      expect(response.body.issues).toHaveLength(2);
      expect(response.body.issues[0].severity).toBe('major');

      expect(mockService.checkCompliance).toHaveBeenCalledWith(
        'thread_123',
        expect.objectContaining({
          title: 'Research Project',
          budget: 500000
        }),
        'horizon_europe'
      );
    });

    it('should validate compliance check inputs', async () => {
      const response = await request(app)
        .post('/api/assistants/compliance-checker/check')
        .send({
          threadId: 'thread_123'
          // Missing applicationData and grantScheme
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('POST /api/assistants/budget-analyst/optimize', () => {
    it('should optimize budget allocation', async () => {
      const mockResult = {
        optimizedBudget: {
          personnel: 300000,
          equipment: 150000,
          travel: 25000,
          overhead: 75000
        },
        savings: 50000,
        recommendations: [
          'Reduce equipment costs by consolidating purchases',
          'Optimize travel budget through virtual meetings'
        ],
        warnings: [
          'Personnel costs are high relative to project scope'
        ]
      };

      mockService.optimizeBudget.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/assistants/budget-analyst/optimize')
        .send({
          threadId: 'thread_123',
          budgetData: {
            total: 600000,
            categories: {
              personnel: 350000,
              equipment: 200000,
              travel: 50000
            }
          },
          projectScope: {
            duration: 24,
            teamSize: 5,
            objectives: ['research', 'development']
          },
          fundingRules: {
            maxBudget: 1000000,
            overheadRate: 0.15,
            eligibleCosts: ['personnel', 'equipment', 'travel']
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('optimizedBudget');
      expect(response.body).toHaveProperty('savings', 50000);
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body.recommendations).toHaveLength(2);

      expect(mockService.optimizeBudget).toHaveBeenCalledWith(
        'thread_123',
        expect.objectContaining({ total: 600000 }),
        expect.objectContaining({ duration: 24 }),
        expect.objectContaining({ maxBudget: 1000000 })
      );
    });

    it('should validate budget optimization inputs', async () => {
      const response = await request(app)
        .post('/api/assistants/budget-analyst/optimize')
        .send({
          threadId: 'thread_123',
          budgetData: { total: 500000 }
          // Missing projectScope and fundingRules
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('DELETE /api/assistants/threads/:threadId', () => {
    it('should delete assistant thread', async () => {
      mockService.deleteThread.mockResolvedValue();

      const response = await request(app)
        .delete('/api/assistants/threads/thread_123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Thread deleted successfully');

      expect(mockService.deleteThread).toHaveBeenCalledWith('thread_123');
    });

    it('should handle deletion errors', async () => {
      mockService.deleteThread.mockRejectedValue(new Error('Thread not found'));

      const response = await request(app)
        .delete('/api/assistants/threads/nonexistent')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to delete thread');
    });
  });

  describe('GET /api/assistants/analytics', () => {
    it('should return assistant analytics', async () => {
      const response = await request(app)
        .get('/api/assistants/analytics')
        .expect(200);

      expect(response.body).toHaveProperty('usage');
      expect(response.body).toHaveProperty('byAssistant');
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('topSections');
      expect(response.body).toHaveProperty('userSatisfaction');

      expect(response.body.usage).toHaveProperty('totalInteractions');
      expect(response.body.usage).toHaveProperty('totalTokens');
      expect(response.body.usage).toHaveProperty('totalCost');
    });

    it('should handle date range filters', async () => {
      const response = await request(app)
        .get('/api/assistants/analytics?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      expect(response.body).toHaveProperty('usage');
    });
  });

  describe('POST /api/assistants/initialize', () => {
    it('should initialize assistants for admin users', async () => {
      // Mock admin user
      const adminApp = express();
      adminApp.use(express.json());
      adminApp.use((req: any, res: any, next: any) => {
        req.user = { id: 'admin_123', role: 'admin' };
        next();
      });
      adminApp.use('/api/assistants', openaiAssistantsRoutes);

      mockService.initializeAssistants.mockResolvedValue();

      const response = await request(adminApp)
        .post('/api/assistants/initialize')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Assistants initialized successfully');

      expect(mockService.initializeAssistants).toHaveBeenCalled();
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .post('/api/assistants/initialize')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Admin access required');
    });
  });

  describe('POST /api/assistants/threads/:threadId/rate', () => {
    it('should accept valid rating', async () => {
      const response = await request(app)
        .post('/api/assistants/threads/thread_123/rate')
        .send({
          rating: 4,
          feedback: 'Very helpful response'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Rating submitted successfully');
    });

    it('should validate rating range', async () => {
      const response = await request(app)
        .post('/api/assistants/threads/thread_123/rate')
        .send({
          rating: 6, // Invalid rating
          feedback: 'Test feedback'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Rating must be between 1 and 5');
    });

    it('should require rating field', async () => {
      const response = await request(app)
        .post('/api/assistants/threads/thread_123/rate')
        .send({
          feedback: 'Test feedback'
          // Missing rating
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits on AI endpoints', async () => {
      // This test would need to make multiple rapid requests
      // to test the rate limiting middleware
      const promises = Array.from({ length: 25 }, () =>
        request(app)
          .post('/api/assistants/proposal_writer/generate-section')
          .send({
            threadId: 'thread_123',
            sectionType: 'test',
            grantType: 'test',
            fundingBody: 'test'
          })
      );

      const responses = await Promise.allSettled(promises);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as any).value)
        .filter(response => response.status === 429);

      // Expect at least some requests to be rate limited
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/assistants/proposal_writer/generate-section')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle service unavailability', async () => {
      mockService.generateProposalSection.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      const response = await request(app)
        .post('/api/assistants/proposal_writer/generate-section')
        .send({
          threadId: 'thread_123',
          sectionType: 'test',
          grantType: 'test',
          fundingBody: 'test'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});