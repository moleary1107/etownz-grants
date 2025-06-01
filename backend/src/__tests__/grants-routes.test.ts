import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { errorHandler } from '../middleware/errorHandler';
import grantsRoutes from '../routes/grants';

// Create a test app without starting the server
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/grants', grantsRoutes);
  app.use(errorHandler);
  return app;
};

describe('Grants Routes (Unit)', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /grants', () => {
    it('should return grants with pagination', async () => {
      const response = await request(app)
        .get('/grants');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('grants');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.grants)).toBe(true);
    });

    it('should handle search filtering', async () => {
      const response = await request(app)
        .get('/grants?search=innovation');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('grants');
    });
  });

  describe('GET /grants/stats', () => {
    it('should return grant statistics', async () => {
      const response = await request(app)
        .get('/grants/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('active');
      expect(response.body).toHaveProperty('expired');
      expect(response.body).toHaveProperty('recent');
    });
  });

  describe('GET /grants/discovered', () => {
    it('should return discovered grants', async () => {
      const response = await request(app)
        .get('/grants/discovered');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('discovered_grants');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.discovered_grants)).toBe(true);
    });
  });

  describe('GET /grants/:id', () => {
    it('should return 404 for non-existent grant', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/grants/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Grant not found');
    });

    it('should return 500 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/grants/invalid-uuid');

      expect(response.status).toBe(500);
    });
  });
});