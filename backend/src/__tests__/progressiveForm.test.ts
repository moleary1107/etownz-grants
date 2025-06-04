import request from 'supertest';
import app from '../index';
import { Pool } from 'pg';
import { DatabaseService } from '../services/database';
import { ProgressiveFormService } from '../services/progressiveFormService';
import { OpenAIService } from '../services/openaiService';
import { AITransparencyService } from '../services/aiTransparencyService';

// Mock the services
jest.mock('../services/openaiService');

describe('Progressive Form System', () => {
  let db: Pool;
  let progressiveFormService: ProgressiveFormService;
  let authToken: string;
  let testUserId: string;
  let testSessionId: string;

  beforeAll(async () => {
    // Initialize test environment
    const dbService = DatabaseService.getInstance();
    db = dbService.getPool();
    
    const openaiService = new OpenAIService();
    const aiTransparencyService = new AITransparencyService(db);
    progressiveFormService = new ProgressiveFormService(db, openaiService, aiTransparencyService);

    // Create test user and get auth token
    const userResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'progressiveform@test.com',
        password: 'testpass123',
        name: 'Progressive Form Tester',
        role: 'applicant'
      });

    testUserId = userResponse.body.user.id;
    authToken = userResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testSessionId) {
      await db.query('DELETE FROM form_sessions WHERE id = $1', [testSessionId]);
    }
    await db.query('DELETE FROM users WHERE email = $1', ['progressiveform@test.com']);
  });

  describe('Database Migration', () => {
    it('should have created all progressive form tables', async () => {
      const tables = [
        'form_sessions',
        'form_field_interactions',
        'form_disclosure_rules',
        'form_field_recommendations',
        'form_optimization_metrics',
        'form_field_visibility'
      ];

      for (const table of tables) {
        const result = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [table]);
        
        expect(result.rows[0].exists).toBe(true);
      }
    });

    it('should have default disclosure rules', async () => {
      const result = await db.query('SELECT COUNT(*) FROM form_disclosure_rules');
      expect(parseInt(result.rows[0].count)).toBeGreaterThan(0);
    });

    it('should have proper indexes', async () => {
      const indexes = [
        'idx_form_sessions_user_id',
        'idx_form_field_interactions_session_id',
        'idx_form_disclosure_rules_grant_scheme'
      ];

      for (const index of indexes) {
        const result = await db.query(`
          SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE indexname = $1
          )
        `, [index]);
        
        expect(result.rows[0].exists).toBe(true);
      }
    });
  });

  describe('Progressive Form Service', () => {
    describe('Form Session Management', () => {
      it('should create a form session', async () => {
        const sessionData = {
          userId: testUserId,
          grantId: 'test-grant-id',
          sessionType: 'application_form',
          fieldsTotal: 10,
          userAgent: 'test-agent',
          metadata: { test: 'data' }
        };

        const sessionId = await progressiveFormService.createFormSession(sessionData);
        testSessionId = sessionId;

        expect(sessionId).toBeDefined();
        expect(typeof sessionId).toBe('string');

        // Verify session was created in database
        const result = await db.query('SELECT * FROM form_sessions WHERE id = $1', [sessionId]);
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].user_id).toBe(testUserId);
      });

      it('should get form session', async () => {
        const session = await progressiveFormService.getFormSession(testSessionId);
        
        expect(session).toBeDefined();
        expect(session!.id).toBe(testSessionId);
        expect(session!.userId).toBe(testUserId);
        expect(session!.sessionType).toBe('application_form');
      });

      it('should update form session', async () => {
        await progressiveFormService.updateFormSession(testSessionId, {
          completionPercentage: 50,
          fieldsCompleted: 5,
          timeSpentSeconds: 300
        });

        const session = await progressiveFormService.getFormSession(testSessionId);
        expect(session!.completionPercentage).toBe(50);
        expect(session!.fieldsCompleted).toBe(5);
        expect(session!.timeSpentSeconds).toBe(300);
      });
    });

    describe('Field Interaction Tracking', () => {
      it('should track field interactions', async () => {
        const interaction = {
          sessionId: testSessionId,
          fieldName: 'project_title',
          fieldType: 'text',
          interactionType: 'focus' as const,
          fieldValue: 'Test Project',
          timeSpentSeconds: 30
        };

        const interactionId = await progressiveFormService.trackFieldInteraction(interaction);
        expect(interactionId).toBeDefined();

        // Verify interaction was stored
        const result = await db.query(
          'SELECT * FROM form_field_interactions WHERE id = $1',
          [interactionId]
        );
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].field_name).toBe('project_title');
      });
    });

    describe('Progressive Disclosure Logic', () => {
      it('should analyze form progress', async () => {
        const formData = {
          project_type: 'research',
          requested_amount: 150000,
          has_partners: true
        };

        const analysis = await progressiveFormService.analyzeFormProgress(
          testSessionId,
          formData,
          'test-grant-scheme'
        );

        expect(analysis).toBeDefined();
        expect(analysis.fieldVisibility).toBeDefined();
        expect(analysis.completionEstimate).toBeGreaterThanOrEqual(0);
        expect(analysis.recommendedFields).toBeInstanceOf(Array);
        expect(analysis.optionalFields).toBeInstanceOf(Array);
      });

      it('should apply disclosure rules correctly', async () => {
        // Test with research project type
        const researchFormData = { project_type: 'research' };
        const researchAnalysis = await progressiveFormService.analyzeFormProgress(
          testSessionId,
          researchFormData
        );

        // Should show research-specific fields
        expect(researchAnalysis.fieldVisibility['methodology']?.isVisible).toBe(true);

        // Test with commercial project type
        const commercialFormData = { project_type: 'commercial' };
        const commercialAnalysis = await progressiveFormService.analyzeFormProgress(
          testSessionId,
          commercialFormData
        );

        // Should show commercial-specific fields
        expect(commercialAnalysis.fieldVisibility['market_analysis']?.isVisible).toBe(true);
      });

      it('should handle large budget rules', async () => {
        const largeBudgetData = { requested_amount: 500000 };
        const analysis = await progressiveFormService.analyzeFormProgress(
          testSessionId,
          largeBudgetData
        );

        // Should show detailed financial fields for large budgets
        expect(analysis.fieldVisibility['detailed_budget']?.isVisible).toBe(true);
        expect(analysis.fieldVisibility['financial_management']?.isVisible).toBe(true);
      });
    });

    describe('AI Recommendations', () => {
      it('should generate field recommendations', async () => {
        // Mock OpenAI response
        const mockOpenAIService = progressiveFormService['openaiService'] as jest.Mocked<OpenAIService>;
        mockOpenAIService.chatCompletion = jest.fn().mockResolvedValue(JSON.stringify({
          recommendations: [
            {
              fieldName: 'project_description',
              type: 'show_next',
              text: 'Consider filling out the project description next',
              confidence: 0.85
            }
          ]
        }));

        const formData = { project_title: 'Test Project' };
        const analysis = await progressiveFormService.analyzeFormProgress(
          testSessionId,
          formData
        );

        expect(analysis.recommendations.length).toBeGreaterThan(0);
        expect(analysis.recommendations[0].fieldName).toBe('project_description');
        expect(analysis.recommendations[0].recommendationType).toBe('show_next');
      });

      it('should store and retrieve recommendations', async () => {
        const recommendations = await progressiveFormService.getSessionRecommendations(testSessionId);
        expect(recommendations).toBeInstanceOf(Array);
      });

      it('should record recommendation actions', async () => {
        const recommendations = await progressiveFormService.getSessionRecommendations(testSessionId);
        if (recommendations.length > 0) {
          await progressiveFormService.recordRecommendationAction(
            recommendations[0].id!,
            'accepted'
          );

          // Verify action was recorded
          const result = await db.query(
            'SELECT user_action FROM form_field_recommendations WHERE id = $1',
            [recommendations[0].id]
          );
          expect(result.rows[0].user_action).toBe('accepted');
        }
      });
    });
  });

  describe('API Routes', () => {
    describe('POST /progressive-form/session', () => {
      it('should create a new form session', async () => {
        const response = await request(app)
          .post('/progressive-form/session')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            grantId: 'test-grant-123',
            sessionType: 'application_form',
            fieldsTotal: 15,
            metadata: { source: 'test' }
          });

        expect(response.status).toBe(201);
        expect(response.body.sessionId).toBeDefined();
        expect(response.body.message).toBe('Form session created successfully');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/progressive-form/session')
          .send({ grantId: 'test' });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /progressive-form/session/:sessionId', () => {
      it('should get form session details', async () => {
        const response = await request(app)
          .get(`/progressive-form/session/${testSessionId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testSessionId);
        expect(response.body.userId).toBe(testUserId);
      });

      it('should deny access to other users sessions', async () => {
        // Create another user
        const otherUserResponse = await request(app)
          .post('/auth/register')
          .send({
            email: 'other@test.com',
            password: 'testpass123',
            name: 'Other User',
            role: 'applicant'
          });

        const otherToken = otherUserResponse.body.token;

        const response = await request(app)
          .get(`/progressive-form/session/${testSessionId}`)
          .set('Authorization', `Bearer ${otherToken}`);

        expect(response.status).toBe(403);
      });
    });

    describe('PATCH /progressive-form/session/:sessionId', () => {
      it('should update form session', async () => {
        const response = await request(app)
          .patch(`/progressive-form/session/${testSessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            completionPercentage: 75,
            fieldsCompleted: 8,
            timeSpentSeconds: 600
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Form session updated successfully');

        // Verify update
        const session = await progressiveFormService.getFormSession(testSessionId);
        expect(session!.completionPercentage).toBe(75);
      });
    });

    describe('POST /progressive-form/analyze', () => {
      it('should analyze form progress', async () => {
        const formData = {
          project_title: 'Test Research Project',
          project_type: 'research',
          requested_amount: 200000,
          project_description: 'A comprehensive research project'
        };

        const response = await request(app)
          .post('/progressive-form/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId: testSessionId,
            formData,
            grantSchemeId: 'research-grant-scheme'
          });

        expect(response.status).toBe(200);
        expect(response.body.analysis).toBeDefined();
        expect(response.body.analysis.fieldVisibility).toBeDefined();
        expect(response.body.analysis.completionEstimate).toBeDefined();
        expect(response.body.sessionProgress).toBeDefined();
      });

      it('should require sessionId and formData', async () => {
        const response = await request(app)
          .post('/progressive-form/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Session ID and form data are required');
      });
    });

    describe('POST /progressive-form/interaction', () => {
      it('should track field interactions', async () => {
        const response = await request(app)
          .post('/progressive-form/interaction')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId: testSessionId,
            fieldName: 'project_title',
            fieldType: 'text',
            interactionType: 'change',
            fieldValue: 'Updated Project Title',
            timeSpentSeconds: 45
          });

        expect(response.status).toBe(201);
        expect(response.body.interactionId).toBeDefined();
        expect(response.body.message).toBe('Field interaction tracked successfully');
      });

      it('should require required fields', async () => {
        const response = await request(app)
          .post('/progressive-form/interaction')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId: testSessionId
            // Missing required fields
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /progressive-form/recommendations/:sessionId', () => {
      it('should get session recommendations', async () => {
        const response = await request(app)
          .get(`/progressive-form/recommendations/${testSessionId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.recommendations).toBeInstanceOf(Array);
      });
    });

    describe('POST /progressive-form/recommendation/:recommendationId/action', () => {
      it('should record recommendation actions', async () => {
        // First get recommendations
        const recommendationsResponse = await request(app)
          .get(`/progressive-form/recommendations/${testSessionId}`)
          .set('Authorization', `Bearer ${authToken}`);

        if (recommendationsResponse.body.recommendations.length > 0) {
          const recommendationId = recommendationsResponse.body.recommendations[0].id;

          const response = await request(app)
            .post(`/progressive-form/recommendation/${recommendationId}/action`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ action: 'accepted' });

          expect(response.status).toBe(200);
          expect(response.body.message).toBe('Recommendation action recorded successfully');
        }
      });

      it('should validate action values', async () => {
        const response = await request(app)
          .post('/progressive-form/recommendation/fake-id/action')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ action: 'invalid_action' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Valid action required');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete form workflow', async () => {
      // 1. Create session
      const sessionResponse = await request(app)
        .post('/progressive-form/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          grantId: 'integration-test-grant',
          sessionType: 'application_form',
          fieldsTotal: 20
        });

      const integrationSessionId = sessionResponse.body.sessionId;

      // 2. Track some interactions
      await request(app)
        .post('/progressive-form/interaction')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: integrationSessionId,
          fieldName: 'project_title',
          fieldType: 'text',
          interactionType: 'focus'
        });

      // 3. Analyze initial form state
      const initialAnalysis = await request(app)
        .post('/progressive-form/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: integrationSessionId,
          formData: { project_title: 'Integration Test Project' }
        });

      expect(initialAnalysis.status).toBe(200);

      // 4. Update form data and analyze again
      const updatedAnalysis = await request(app)
        .post('/progressive-form/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: integrationSessionId,
          formData: {
            project_title: 'Integration Test Project',
            project_type: 'research',
            requested_amount: 300000,
            project_description: 'Detailed description'
          }
        });

      expect(updatedAnalysis.status).toBe(200);
      expect(updatedAnalysis.body.analysis.completionEstimate).toBeGreaterThan(
        initialAnalysis.body.analysis.completionEstimate
      );

      // 5. Complete session
      await request(app)
        .patch(`/progressive-form/session/${integrationSessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ completed: true });

      // Cleanup
      await db.query('DELETE FROM form_sessions WHERE id = $1', [integrationSessionId]);
    });
  });
});