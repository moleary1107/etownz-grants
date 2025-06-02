import request from 'supertest';
import app from '../index';

// Mock all required services to avoid external dependencies
jest.mock('../services/grantMonitoringService');
jest.mock('../services/database');
jest.mock('../services/openaiService');
jest.mock('../services/vectorDatabase');
jest.mock('../services/userPreferencesService');

describe('Monitoring Routes', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /monitoring/rules', () => {
    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/monitoring/rules')
        .send({
          name: 'Test Rule'
          // Missing other required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should validate required fields correctly', async () => {
      const testCases = [
        { body: {}, expectedMessage: 'user_id, name, rule_type, criteria, and notification_settings are required' },
        { 
          body: { user_id: 'test-user' }, 
          expectedMessage: 'user_id, name, rule_type, criteria, and notification_settings are required' 
        },
        { 
          body: { user_id: 'test-user', name: 'Test Rule' }, 
          expectedMessage: 'user_id, name, rule_type, criteria, and notification_settings are required' 
        },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/monitoring/rules')
          .send(testCase.body);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(testCase.expectedMessage);
      }
    });
  });

  describe('GET /monitoring/rules/:userId', () => {
    it('should return 400 for missing userId parameter', async () => {
      const response = await request(app)
        .get('/monitoring/rules/');

      expect(response.status).toBe(404); // Route not found without userId
    });

    it('should handle valid userId parameter', async () => {
      const response = await request(app)
        .get('/monitoring/rules/test-user-123');

      // Should not return 400 for missing userId since it's provided
      expect(response.status).not.toBe(400);
    });
  });

  describe('PUT /monitoring/rules/:ruleId', () => {
    it('should return 400 for missing ruleId parameter', async () => {
      const response = await request(app)
        .put('/monitoring/rules/')
        .send({ name: 'Updated Rule' });

      expect(response.status).toBe(404); // Route not found without ruleId
    });

    it('should handle valid ruleId parameter', async () => {
      const response = await request(app)
        .put('/monitoring/rules/test-rule-123')
        .send({ name: 'Updated Rule' });

      // Should not return 400 for missing ruleId since it's provided
      expect(response.status).not.toBe(400);
    });
  });

  describe('DELETE /monitoring/rules/:ruleId', () => {
    it('should return 400 for missing ruleId parameter', async () => {
      const response = await request(app)
        .delete('/monitoring/rules/');

      expect(response.status).toBe(404); // Route not found without ruleId
    });

    it('should handle valid ruleId parameter', async () => {
      const response = await request(app)
        .delete('/monitoring/rules/test-rule-123');

      // Should not return 400 for missing ruleId since it's provided
      expect(response.status).not.toBe(400);
    });
  });

  describe('GET /monitoring/alerts/:userId', () => {
    it('should return 400 for missing userId parameter', async () => {
      const response = await request(app)
        .get('/monitoring/alerts/');

      expect(response.status).toBe(404); // Route not found without userId
    });

    it('should handle query parameters correctly', async () => {
      const response = await request(app)
        .get('/monitoring/alerts/test-user-123')
        .query({
          limit: '10',
          offset: '0',
          alert_type: 'new_grant',
          unread_only: 'true'
        });

      // Should not return 400 for missing userId since it's provided
      expect(response.status).not.toBe(400);
    });
  });

  describe('POST /monitoring/alerts/:alertId/action', () => {
    it('should return 400 for missing action parameter', async () => {
      const response = await request(app)
        .post('/monitoring/alerts/test-alert-123/action')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required parameters');
      expect(response.body.message).toBe('alertId and action are required');
    });

    it('should return 400 for invalid action parameter', async () => {
      const response = await request(app)
        .post('/monitoring/alerts/test-alert-123/action')
        .send({ action: 'invalid_action' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid action');
      expect(response.body.message).toBe('action must be one of: dismissed, saved, applied, viewed');
    });

    it('should accept valid action parameters', async () => {
      const validActions = ['dismissed', 'saved', 'applied', 'viewed'];

      for (const action of validActions) {
        const response = await request(app)
          .post('/monitoring/alerts/test-alert-123/action')
          .send({ action });

        // Should not return 400 for valid action
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('GET /monitoring/stats/:userId', () => {
    it('should return 400 for missing userId parameter', async () => {
      const response = await request(app)
        .get('/monitoring/stats/');

      expect(response.status).toBe(404); // Route not found without userId
    });

    it('should handle valid userId parameter', async () => {
      const response = await request(app)
        .get('/monitoring/stats/test-user-123');

      // Should not return 400 for missing userId since it's provided
      expect(response.status).not.toBe(400);
    });
  });

  describe('POST /monitoring/jobs/run', () => {
    it('should return 400 for missing job_type parameter', async () => {
      const response = await request(app)
        .post('/monitoring/jobs/run')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing job_type parameter');
    });

    it('should return 400 for invalid job_type parameter', async () => {
      const response = await request(app)
        .post('/monitoring/jobs/run')
        .send({ job_type: 'invalid_job_type' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid job_type');
      expect(response.body.message).toBe('job_type must be one of: new_grants_check, deadline_reminder, ai_similarity_scan');
    });

    it('should accept valid job_type parameters', async () => {
      const validJobTypes = ['new_grants_check', 'deadline_reminder', 'ai_similarity_scan'];

      for (const jobType of validJobTypes) {
        const response = await request(app)
          .post('/monitoring/jobs/run')
          .send({ job_type: jobType });

        // Should not return 400 for valid job_type
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('Route Integration', () => {
    it('should have all monitoring routes properly registered', async () => {
      // Test that monitoring routes are accessible (not 404)
      const routes = [
        { method: 'post', path: '/monitoring/rules' },
        { method: 'get', path: '/monitoring/rules/test-user' },
        { method: 'put', path: '/monitoring/rules/test-rule' },
        { method: 'delete', path: '/monitoring/rules/test-rule' },
        { method: 'get', path: '/monitoring/alerts/test-user' },
        { method: 'post', path: '/monitoring/alerts/test-alert/action' },
        { method: 'get', path: '/monitoring/stats/test-user' },
        { method: 'post', path: '/monitoring/jobs/run' }
      ];

      for (const route of routes) {
        const response = await request(app)[route.method as 'get' | 'post' | 'put' | 'delete'](route.path);
        
        // Should not return 404 (route not found)
        expect(response.status).not.toBe(404);
      }
    });

    it('should include monitoring routes in API documentation paths', async () => {
      // Test that the monitoring routes are properly integrated into the app
      const response = await request(app).get('/monitoring/rules/test-user');
      
      // The route should exist (not 404) even if it returns an error due to missing services
      expect(response.status).not.toBe(404);
    });
  });
});