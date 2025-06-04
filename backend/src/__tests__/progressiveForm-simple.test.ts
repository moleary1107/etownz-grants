import request from 'supertest';
import app from '../index';

describe('Progressive Form API Routes', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const userResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'progressivetest@example.com',
        password: 'testpass123',
        first_name: 'Progressive',
        last_name: 'Tester',
        org_name: 'Progressive Test Org'
      });

    if (userResponse.status === 201) {
      testUserId = userResponse.body.user.id;
      authToken = userResponse.body.token;
    } else {
      // Try to login if user already exists
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'progressivetest@example.com',
          password: 'testpass123'
        });
      
      testUserId = loginResponse.body.user.id;
      authToken = loginResponse.body.token;
    }
  });

  describe('POST /progressive-form/session', () => {
    it('should create a new form session with authentication', async () => {
      const response = await request(app)
        .post('/progressive-form/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          grantId: 'test-grant-123',
          sessionType: 'application_form',
          fieldsTotal: 15,
          metadata: { source: 'api_test' }
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Form session created successfully');
      expect(typeof response.body.sessionId).toBe('string');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/progressive-form/session')
        .send({
          grantId: 'test-grant-123',
          sessionType: 'application_form'
        });

      expect(response.status).toBe(401);
    });

    it('should handle invalid token', async () => {
      const response = await request(app)
        .post('/progressive-form/session')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          grantId: 'test-grant-123'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Route availability', () => {
    let sessionId: string;

    beforeAll(async () => {
      // Create a session for testing other routes
      const sessionResponse = await request(app)
        .post('/progressive-form/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          grantId: 'test-grant-availability',
          sessionType: 'application_form',
          fieldsTotal: 10
        });

      sessionId = sessionResponse.body.sessionId;
    });

    it('should have GET /progressive-form/session/:sessionId route', async () => {
      const response = await request(app)
        .get(`/progressive-form/session/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it('should have PATCH /progressive-form/session/:sessionId route', async () => {
      const response = await request(app)
        .patch(`/progressive-form/session/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          completionPercentage: 25
        });

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it('should have POST /progressive-form/analyze route', async () => {
      const response = await request(app)
        .post('/progressive-form/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          formData: { project_title: 'Test Project' }
        });

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it('should have POST /progressive-form/interaction route', async () => {
      const response = await request(app)
        .post('/progressive-form/interaction')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          fieldName: 'project_title',
          fieldType: 'text',
          interactionType: 'focus'
        });

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it('should have GET /progressive-form/recommendations/:sessionId route', async () => {
      const response = await request(app)
        .get(`/progressive-form/recommendations/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Error handling', () => {
    it('should return 400 for analyze route without required data', async () => {
      const response = await request(app)
        .post('/progressive-form/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Session ID and form data are required');
    });

    it('should return 400 for interaction route without required data', async () => {
      const response = await request(app)
        .post('/progressive-form/interaction')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: 'test-session-id'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid recommendation action', async () => {
      const response = await request(app)
        .post('/progressive-form/recommendation/fake-id/action')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'invalid_action'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Valid action required');
    });
  });

  describe('Service Integration', () => {
    it('should handle progressive form service methods', () => {
      // Test service instantiation
      expect(() => {
        const { DatabaseService } = require('../services/database');
        const { OpenAIService } = require('../services/openaiService');
        const { AITransparencyService } = require('../services/aiTransparencyService');
        const { ProgressiveFormService } = require('../services/progressiveFormService');

        const dbService = DatabaseService.getInstance();
        const openaiService = new OpenAIService();
        const aiTransparencyService = new AITransparencyService(dbService.getPool());
        const progressiveFormService = new ProgressiveFormService(
          dbService.getPool(),
          openaiService,
          aiTransparencyService
        );

        // Verify service has expected methods
        expect(typeof progressiveFormService.createFormSession).toBe('function');
        expect(typeof progressiveFormService.analyzeFormProgress).toBe('function');
        expect(typeof progressiveFormService.trackFieldInteraction).toBe('function');
      }).not.toThrow();
    });
  });

  describe('TypeScript Compilation', () => {
    it('should have properly typed progressive form service', () => {
      const { ProgressiveFormService } = require('../services/progressiveFormService');
      
      // These should not throw TypeScript errors
      expect(ProgressiveFormService).toBeDefined();
      expect(typeof ProgressiveFormService).toBe('function');
    });

    it('should have properly typed progressive form routes', () => {
      const progressiveFormRoutes = require('../routes/progressiveForm');
      
      expect(progressiveFormRoutes).toBeDefined();
      expect(typeof progressiveFormRoutes.default).toBe('function');
    });
  });
});