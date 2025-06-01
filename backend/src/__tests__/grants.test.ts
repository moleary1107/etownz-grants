import request from 'supertest';
import app from '../index';

describe('Grants Endpoints', () => {
  describe('GET /grants', () => {
    it('should return grants with pagination', async () => {
      const response = await request(app)
        .get('/grants');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('grants');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.grants)).toBe(true);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');
    });

    it('should filter grants by search term', async () => {
      const response = await request(app)
        .get('/grants?search=innovation');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('grants');
      expect(Array.isArray(response.body.grants)).toBe(true);
    });

    it('should filter grants by amount range', async () => {
      const response = await request(app)
        .get('/grants?amount_min=1000&amount_max=50000');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('grants');
    });

    it('should sort grants by different fields', async () => {
      const response = await request(app)
        .get('/grants?sort_by=deadline&sort_order=ASC');

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
  });
});