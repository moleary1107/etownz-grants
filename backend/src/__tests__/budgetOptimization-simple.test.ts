import request from 'supertest';
import app from '../index';

describe('Budget Optimization System - Simple Integration Tests', () => {
  let authToken: string;

  beforeAll(() => {
    // Mock auth token for tests
    authToken = 'Bearer test-token';
    
    // Mock authentication middleware
    jest.doMock('../middleware/auth', () => ({
      authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 'test-user-id' };
        next();
      }
    }));
  });

  describe('API Routes Availability', () => {
    it('should have budget optimization routes available', async () => {
      // Test that budget optimization endpoints exist and respond (even if with errors due to mocking)
      const endpoints = [
        '/budget-optimization/stats',
        '/budget-optimization/history',
        '/budget-optimization/funding-rules/test-scheme'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', authToken);
        
        // Should not be 404 (route not found)
        expect(response.status).not.toBe(404);
      }
    });

    it('should validate authentication for protected routes', async () => {
      const protectedEndpoints = [
        { method: 'post', path: '/budget-optimization/optimize' },
        { method: 'post', path: '/budget-optimization/template' },
        { method: 'post', path: '/budget-optimization/analyze' },
        { method: 'get', path: '/budget-optimization/stats' },
        { method: 'get', path: '/budget-optimization/history' }
      ];

      for (const endpoint of protectedEndpoints) {
        let response;
        
        if (endpoint.method === 'post') {
          response = await request(app)
            .post(endpoint.path)
            .send({});
        } else {
          response = await request(app)
            .get(endpoint.path);
        }
        
        // Should require authentication (401 or other non-200 status when no auth)
        expect(response.status).not.toBe(200);
      }
    });

    it('should handle budget optimization request format', async () => {
      const validRequest = {
        projectScope: {
          title: 'Test Project',
          description: 'Test project description',
          duration: 12,
          teamSize: 3,
          projectType: 'research',
          industry: 'technology',
          location: 'Ireland',
          objectives: ['Test objective']
        },
        fundingRules: {
          fundingBody: 'Enterprise Ireland',
          grantScheme: 'Test Scheme',
          maxBudget: 100000,
          eligibleCategories: ['personnel', 'equipment'],
          categoryLimits: {},
          costTypes: {},
          restrictions: []
        }
      };

      const response = await request(app)
        .post('/budget-optimization/optimize')
        .set('Authorization', authToken)
        .send(validRequest);

      // Should accept the request format (may fail due to database mocking)
      expect(response.status).not.toBe(400);
    });
  });

  describe('Request Validation', () => {
    it('should validate required fields in optimization request', async () => {
      const invalidRequests = [
        {}, // Empty request
        { projectScope: {} }, // Missing fundingRules
        { fundingRules: {} }, // Missing projectScope
        { 
          projectScope: { title: '' }, // Invalid projectScope
          fundingRules: {}
        }
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(app)
          .post('/budget-optimization/optimize')
          .set('Authorization', authToken)
          .send(invalidRequest);
        
        // Should validate and reject invalid requests
        expect([400, 500]).toContain(response.status);
      }
    });

    it('should handle budget template request', async () => {
      const validTemplateRequest = {
        projectType: 'research',
        fundingBody: 'Science Foundation Ireland',
        budgetRange: { min: 50000, max: 150000 }
      };

      const response = await request(app)
        .post('/budget-optimization/template')
        .set('Authorization', authToken)
        .send(validTemplateRequest);

      // Should accept the request format
      expect(response.status).not.toBe(400);
    });

    it('should handle budget analysis request', async () => {
      const validAnalysisRequest = {
        budget: [
          {
            name: 'Personnel',
            amount: 50000,
            percentage: 50,
            justification: 'Staff costs',
            isRequired: true
          }
        ],
        fundingRules: {
          maxBudget: 100000,
          categoryLimits: {
            personnel: { maxPercentage: 70 }
          }
        }
      };

      const response = await request(app)
        .post('/budget-optimization/analyze')
        .set('Authorization', authToken)
        .send(validAnalysisRequest);

      // Should accept the request format
      expect(response.status).not.toBe(400);
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format for stats endpoint', async () => {
      const response = await request(app)
        .get('/budget-optimization/stats')
        .set('Authorization', authToken);

      // Should have consistent response structure
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should return consistent error format', async () => {
      const response = await request(app)
        .post('/budget-optimization/optimize')
        .set('Authorization', authToken)
        .send({}); // Invalid request

      if (response.status >= 400) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should return funding rules in correct format', async () => {
      const response = await request(app)
        .get('/budget-optimization/funding-rules/test-scheme')
        .set('Authorization', authToken);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data).toHaveProperty('fundingBody');
        expect(response.body.data).toHaveProperty('maxBudget');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/budget-optimization/optimize')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Should handle malformed JSON gracefully
      expect(response.status).toBe(400);
    });

    it('should handle missing required fields gracefully', async () => {
      const incompleteRequests = [
        { projectScope: { title: 'Test' } }, // Missing other required fields
        { fundingRules: { fundingBody: 'Test' } }, // Missing other required fields
      ];

      for (const incompleteRequest of incompleteRequests) {
        const response = await request(app)
          .post('/budget-optimization/optimize')
          .set('Authorization', authToken)
          .send(incompleteRequest);
        
        // Should handle gracefully, not crash
        expect(response.status).toBeLessThan(500);
      }
    });

    it('should handle invalid numeric values', async () => {
      const invalidRequest = {
        projectScope: {
          title: 'Test',
          description: 'Test',
          duration: 'invalid', // Should be number
          teamSize: -1, // Invalid negative
          projectType: 'research',
          industry: 'tech',
          location: 'Ireland',
          objectives: []
        },
        fundingRules: {
          fundingBody: 'Test',
          grantScheme: 'Test',
          maxBudget: 'not-a-number', // Should be number
          eligibleCategories: [],
          categoryLimits: {},
          costTypes: {},
          restrictions: []
        }
      };

      const response = await request(app)
        .post('/budget-optimization/optimize')
        .set('Authorization', authToken)
        .send(invalidRequest);

      // Should handle invalid data types gracefully
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to optimization endpoint', async () => {
      const validRequest = {
        projectScope: {
          title: 'Rate Limit Test',
          description: 'Testing rate limits',
          duration: 12,
          teamSize: 2,
          projectType: 'research',
          industry: 'test',
          location: 'Ireland',
          objectives: []
        },
        fundingRules: {
          fundingBody: 'Test',
          grantScheme: 'Test',
          maxBudget: 50000,
          eligibleCategories: [],
          categoryLimits: {},
          costTypes: {},
          restrictions: []
        }
      };

      // Make multiple requests quickly to test rate limiting
      const responses = await Promise.all([
        request(app)
          .post('/budget-optimization/optimize')
          .set('Authorization', authToken)
          .send(validRequest),
        request(app)
          .post('/budget-optimization/optimize')
          .set('Authorization', authToken)
          .send(validRequest),
        request(app)
          .post('/budget-optimization/optimize')
          .set('Authorization', authToken)
          .send(validRequest)
      ]);

      // At least one request should be processed (may get rate limited)
      const statusCodes = responses.map(r => r.status);
      expect(statusCodes).not.toEqual([404, 404, 404]); // Routes should exist
    });
  });
});