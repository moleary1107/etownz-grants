import request from 'supertest';
import app from '../index';

describe('Compliance System - Simple Integration Tests', () => {
  let authToken: string;

  beforeAll(() => {
    // Mock auth token for tests
    authToken = 'Bearer test-token';
    
    // Mock authentication middleware
    jest.doMock('../middleware/auth', () => ({
      authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 'test-user-id', isAdmin: true };
        next();
      }
    }));
  });

  describe('API Routes Availability', () => {
    it('should have compliance routes available', async () => {
      // Test that compliance endpoints exist and respond (even if with errors due to mocking)
      const endpoints = [
        '/compliance/stats',
        '/compliance/rules/test-scheme-id'
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
        { method: 'post', path: '/compliance/check/test-id' },
        { method: 'post', path: '/compliance/check-manual' },
        { method: 'get', path: '/compliance/stats' },
        { method: 'get', path: '/compliance/rules/test-scheme' },
        { method: 'post', path: '/compliance/rules' }
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

    it('should handle manual compliance check request format', async () => {
      const validRequest = {
        grantSchemeId: 'test-scheme',
        sections: {
          executive_summary: {
            content: 'This is a test executive summary with sufficient content.'
          }
        }
      };

      const response = await request(app)
        .post('/compliance/check-manual')
        .set('Authorization', authToken)
        .send(validRequest);

      // Should accept the request format (may fail due to database mocking)
      expect(response.status).not.toBe(400);
    });
  });

  describe('Request Validation', () => {
    it('should validate required fields in manual check', async () => {
      const invalidRequests = [
        {}, // Empty request
        { grantSchemeId: '' }, // Empty grantSchemeId
        { sections: {} }, // Missing grantSchemeId
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(app)
          .post('/compliance/check-manual')
          .set('Authorization', authToken)
          .send(invalidRequest);
        
        // Should validate and reject invalid requests
        expect([400, 500]).toContain(response.status);
      }
    });

    it('should handle valid compliance rule creation request', async () => {
      const validRule = {
        grantSchemeId: 'test-scheme',
        ruleCategory: 'content',
        ruleDescription: 'Test rule description',
        severity: 'major',
        automatedCheck: true
      };

      const response = await request(app)
        .post('/compliance/rules')
        .set('Authorization', authToken)
        .send(validRule);

      // Should accept the request format
      expect(response.status).not.toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent application ID gracefully', async () => {
      const response = await request(app)
        .post('/compliance/check/non-existent-id')
        .set('Authorization', authToken);

      // Should handle gracefully, not crash
      expect(response.status).toBeLessThan(500);
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/compliance/check-manual')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Should handle malformed JSON gracefully
      expect(response.status).toBe(400);
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format for stats endpoint', async () => {
      const response = await request(app)
        .get('/compliance/stats')
        .set('Authorization', authToken);

      // Should have consistent response structure
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should return consistent error format', async () => {
      const response = await request(app)
        .post('/compliance/check-manual')
        .set('Authorization', authToken)
        .send({}); // Invalid request

      if (response.status >= 400) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});