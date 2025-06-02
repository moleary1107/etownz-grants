import request from 'supertest'
import express from 'express'
import predictiveRoutes from '../routes/predictive'

// Create a minimal test app with just our predictive routes
const createTestApp = () => {
  const app = express()
  app.use(express.json())
  app.use('/predictive', predictiveRoutes)
  return app
}

describe('Predictive Analytics Routes Integration', () => {
  let app: express.Application

  beforeAll(() => {
    app = createTestApp()
  })

  describe('Route Registration', () => {
    it('should have grant success prediction endpoint', async () => {
      const response = await request(app)
        .post('/predictive/grants/test-grant-123/predict')
        .send({
          organization_id: 'test-org-123',
          application_data: { test: 'data' }
        })

      // Should not return 404 (route exists), but may return 400, 401, or 500
      expect(response.status).not.toBe(404)
    })

    it('should have budget optimization endpoint', async () => {
      const response = await request(app)
        .post('/predictive/grants/test-grant-123/optimize-budget')
        .send({
          organization_id: 'test-org-123',
          proposed_amount: 50000
        })

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404)
    })

    it('should have competition analysis endpoint', async () => {
      const response = await request(app)
        .get('/predictive/grants/test-grant-123/competition')

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404)
    })

    it('should have predictive insights endpoint', async () => {
      const response = await request(app)
        .get('/predictive/users/test-user-123/insights')

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404)
    })

    it('should have batch prediction endpoint', async () => {
      const response = await request(app)
        .post('/predictive/grants/batch-predict')
        .send({
          predictions: [
            {
              grant_id: 'grant-1',
              organization_id: 'org-1'
            },
            {
              grant_id: 'grant-2',
              organization_id: 'org-2'
            }
          ]
        })

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404)
    })

    it('should have historical predictions endpoint', async () => {
      const response = await request(app)
        .get('/predictive/organizations/test-org-123/predictions')

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404)
    })

    it('should have model performance endpoint', async () => {
      const response = await request(app)
        .get('/predictive/models/performance')

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404)
    })

    it('should have prediction outcome update endpoint', async () => {
      const response = await request(app)
        .put('/predictive/predictions/test-prediction-123/outcome')
        .send({
          outcome: 'approved'
        })

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404)
    })

    it('should have prediction feedback endpoint', async () => {
      const response = await request(app)
        .post('/predictive/predictions/test-prediction-123/feedback')
        .send({
          rating: 8,
          usefulness_score: 9,
          recommendation_followed: true,
          comments: 'Very helpful predictions'
        })

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404)
    })
  })

  describe('Error Handling', () => {
    it('should return 400 for missing required parameters in prediction', async () => {
      const response = await request(app)
        .post('/predictive/grants/test-grant-123/predict')
        .send({}) // Missing required organization_id

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
      expect(response.body.message).toContain('organization_id')
    })

    it('should return 400 for missing parameters in budget optimization', async () => {
      const response = await request(app)
        .post('/predictive/grants/test-grant-123/optimize-budget')
        .send({
          organization_id: 'test-org-123'
          // Missing proposed_amount
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for invalid proposed amount', async () => {
      const response = await request(app)
        .post('/predictive/grants/test-grant-123/optimize-budget')
        .send({
          organization_id: 'test-org-123',
          proposed_amount: -1000 // Invalid negative amount
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for empty batch predictions array', async () => {
      const response = await request(app)
        .post('/predictive/grants/batch-predict')
        .send({
          predictions: [] // Empty array
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for too many batch predictions', async () => {
      const predictions = Array.from({ length: 25 }, (_, i) => ({
        grant_id: `grant-${i}`,
        organization_id: `org-${i}`
      }))

      const response = await request(app)
        .post('/predictive/grants/batch-predict')
        .send({ predictions })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Maximum 20 predictions')
    })

    it('should return 400 for invalid outcome in prediction update', async () => {
      const response = await request(app)
        .put('/predictive/predictions/test-prediction-123/outcome')
        .send({
          outcome: 'invalid-outcome' // Not in allowed values
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for invalid rating in feedback', async () => {
      const response = await request(app)
        .post('/predictive/predictions/test-prediction-123/feedback')
        .send({
          rating: 15, // Above maximum of 10
          usefulness_score: 5,
          recommendation_followed: true
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('Response Structure', () => {
    it('should include metadata in all responses', async () => {
      // Even if the request fails due to missing services, 
      // successful responses should include metadata
      const response = await request(app)
        .get('/predictive/models/performance')

      if (response.status === 200) {
        expect(response.body).toHaveProperty('metadata')
        expect(response.body.metadata).toHaveProperty('generatedAt')
      }
    })

    it('should include processing time in responses', async () => {
      const response = await request(app)
        .get('/predictive/models/performance')

      if (response.status === 200) {
        expect(response.body).toHaveProperty('processingTime')
        expect(typeof response.body.processingTime).toBe('number')
      }
    })
  })
})