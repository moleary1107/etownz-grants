import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { errorHandler } from '../middleware/errorHandler';
import applicationsRoutes from '../routes/applications';
import { db } from '../services/database';

// Mock database
jest.mock('../services/database');

const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/applications', applicationsRoutes);
  app.use(errorHandler);
  return app;
};

describe('Extended Applications API', () => {
  let app: express.Application;
  const mockDb = db as jest.Mocked<typeof db>;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /applications - Complex Application Creation', () => {
    const mockComplexApplication = {
      grant_id: 'grant-123',
      project_title: 'AI-Powered Sustainability Platform',
      project_description: 'A comprehensive platform using AI to optimize environmental impact',
      requested_amount: 250000,
      project_duration: 24,
      application_data: {
        team_size: 8,
        technical_approach: 'Machine learning algorithms with IoT integration',
        expected_outcomes: [
          '30% reduction in energy consumption',
          'Real-time sustainability metrics',
          'Automated compliance reporting'
        ],
        budget_breakdown: {
          personnel: 150000,
          equipment: 50000,
          operations: 30000,
          other: 20000
        },
        timeline: [
          {
            phase: 'Planning & Setup',
            duration: 3,
            deliverables: ['Project plan', 'Technical specifications', 'Team onboarding']
          },
          {
            phase: 'Development',
            duration: 12,
            deliverables: ['Core platform', 'AI models', 'API integration']
          },
          {
            phase: 'Testing & Deployment',
            duration: 6,
            deliverables: ['Beta testing', 'Production deployment', 'User training']
          },
          {
            phase: 'Evaluation & Reporting',
            duration: 3,
            deliverables: ['Performance evaluation', 'Final report', 'Knowledge transfer']
          }
        ],
        risk_assessment: [
          {
            risk: 'Technical complexity may exceed initial estimates',
            impact: 'Project delays and cost overruns',
            mitigation: 'Regular technical reviews and agile development methodology'
          },
          {
            risk: 'Key team member unavailability',
            impact: 'Knowledge loss and project delays',
            mitigation: 'Cross-training and comprehensive documentation'
          }
        ],
        success_metrics: [
          'Energy consumption reduction of at least 25%',
          'Platform adoption by 100+ users',
          'Processing time reduction of 50%',
          'Cost savings of €100,000+ annually'
        ],
        sustainability_plan: 'The platform will be maintained through user subscriptions and licensing to other organizations. A dedicated support team will be established with revenue from the first year of operations.'
      }
    };

    it('should create a complex application with all required fields', async () => {
      const mockResult = {
        rows: [{
          id: 'app-123',
          ...mockComplexApplication,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/applications')
        .send(mockComplexApplication)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'app-123',
        project_title: 'AI-Powered Sustainability Platform',
        requested_amount: 250000,
        status: 'draft'
      });

      // Verify database insertion
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO applications'),
        expect.arrayContaining([
          'grant-123',
          'AI-Powered Sustainability Platform',
          'A comprehensive platform using AI to optimize environmental impact',
          250000,
          24,
          expect.stringContaining('team_size')
        ])
      );
    });

    it('should validate budget breakdown totals', async () => {
      const invalidApplication = {
        ...mockComplexApplication,
        requested_amount: 300000, // Different from budget breakdown total (250000)
      };

      const response = await request(app)
        .post('/applications')
        .send(invalidApplication)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('budget breakdown');
    });

    it('should validate timeline duration matches project duration', async () => {
      const invalidApplication = {
        ...mockComplexApplication,
        project_duration: 18, // Different from timeline total (24 months)
      };

      const response = await request(app)
        .post('/applications')
        .send(invalidApplication)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('timeline duration');
    });

    it('should require all essential fields', async () => {
      const incompleteApplication = {
        grant_id: 'grant-123',
        project_title: 'Test Project'
        // Missing required fields
      };

      const response = await request(app)
        .post('/applications')
        .send(incompleteApplication)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });

    it('should validate team size is positive', async () => {
      const invalidApplication = {
        ...mockComplexApplication,
        application_data: {
          ...mockComplexApplication.application_data,
          team_size: 0
        }
      };

      const response = await request(app)
        .post('/applications')
        .send(invalidApplication)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('team size');
    });

    it('should validate budget components are non-negative', async () => {
      const invalidApplication = {
        ...mockComplexApplication,
        application_data: {
          ...mockComplexApplication.application_data,
          budget_breakdown: {
            personnel: -10000,
            equipment: 50000,
            operations: 30000,
            other: 20000
          }
        }
      };

      const response = await request(app)
        .post('/applications')
        .send(invalidApplication)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('budget');
    });
  });

  describe('GET /applications - Enhanced Filtering', () => {
    it('should filter applications by status', async () => {
      const mockApplications = [
        {
          id: 'app-1',
          project_title: 'Project 1',
          status: 'submitted',
          created_at: new Date().toISOString()
        },
        {
          id: 'app-2',
          project_title: 'Project 2',
          status: 'submitted',
          created_at: new Date().toISOString()
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockApplications });

      const response = await request(app)
        .get('/applications?status=submitted')
        .expect(200);

      expect(response.body.applications).toHaveLength(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['submitted'])
      );
    });

    it('should filter applications by grant_id', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/applications?grant_id=grant-123')
        .expect(200);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('grant_id'),
        expect.arrayContaining(['grant-123'])
      );
    });

    it('should search applications by project title', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/applications?search=sustainability')
        .expect(200);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%sustainability%'])
      );
    });

    it('should sort applications by requested amount', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/applications?sort_by=requested_amount&sort_order=DESC')
        .expect(200);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY requested_amount DESC'),
        expect.any(Array)
      );
    });
  });

  describe('PUT /applications/:id - Complex Updates', () => {
    it('should update application with complex data', async () => {
      const applicationId = 'app-123';
      const updateData = {
        project_title: 'Updated AI Platform',
        application_data: {
          team_size: 10,
          technical_approach: 'Updated approach with blockchain integration',
          expected_outcomes: [
            'Enhanced security through blockchain',
            'Improved scalability',
            'Better user experience'
          ],
          budget_breakdown: {
            personnel: 180000,
            equipment: 60000,
            operations: 40000,
            other: 20000
          }
        }
      };

      const mockResult = {
        rows: [{
          id: applicationId,
          ...updateData,
          status: 'draft',
          updated_at: new Date().toISOString()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const response = await request(app)
        .put(`/applications/${applicationId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.project_title).toBe('Updated AI Platform');
      expect(response.body.application_data.team_size).toBe(10);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE applications'),
        expect.arrayContaining([applicationId])
      );
    });

    it('should prevent updates to submitted applications', async () => {
      const applicationId = 'app-123';
      
      // Mock existing application with submitted status
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: applicationId,
          status: 'submitted'
        }]
      });

      const response = await request(app)
        .put(`/applications/${applicationId}`)
        .send({ project_title: 'New Title' })
        .expect(400);

      expect(response.body.error).toBe('Application cannot be modified');
      expect(response.body.message).toContain('submitted');
    });
  });

  describe('POST /applications/:id/submit', () => {
    it('should submit a complete application', async () => {
      const applicationId = 'app-123';

      // Mock application retrieval
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: applicationId,
          status: 'draft',
          grant_id: 'grant-123',
          project_title: 'Test Project',
          project_description: 'Test Description',
          requested_amount: 100000,
          application_data: {
            team_size: 5,
            technical_approach: 'Test approach',
            budget_breakdown: {
              personnel: 60000,
              equipment: 20000,
              operations: 15000,
              other: 5000
            }
          }
        }]
      });

      // Mock submission update
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: applicationId,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        }]
      });

      const response = await request(app)
        .post(`/applications/${applicationId}/submit`)
        .expect(200);

      expect(response.body.status).toBe('submitted');
      expect(response.body).toHaveProperty('submitted_at');
    });

    it('should validate application completeness before submission', async () => {
      const applicationId = 'app-123';

      // Mock incomplete application
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: applicationId,
          status: 'draft',
          project_title: 'Test Project'
          // Missing required fields
        }]
      });

      const response = await request(app)
        .post(`/applications/${applicationId}/submit`)
        .expect(400);

      expect(response.body.error).toBe('Incomplete application');
    });

    it('should prevent re-submission of already submitted applications', async () => {
      const applicationId = 'app-123';

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: applicationId,
          status: 'submitted'
        }]
      });

      const response = await request(app)
        .post(`/applications/${applicationId}/submit`)
        .expect(400);

      expect(response.body.error).toBe('Application already submitted');
    });
  });

  describe('Application Analytics', () => {
    it('should get application statistics', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{
          total: 50,
          draft: 20,
          submitted: 25,
          approved: 3,
          rejected: 2,
          avg_amount: 150000
        }]
      });

      const response = await request(app)
        .get('/applications/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        total: 50,
        draft: 20,
        submitted: 25,
        approved: 3,
        rejected: 2,
        avg_amount: 150000
      });
    });

    it('should get applications by grant', async () => {
      const grantId = 'grant-123';
      
      mockDb.query.mockResolvedValue({
        rows: [
          { id: 'app-1', project_title: 'Project 1', status: 'submitted' },
          { id: 'app-2', project_title: 'Project 2', status: 'draft' }
        ]
      });

      const response = await request(app)
        .get(`/applications/by-grant/${grantId}`)
        .expect(200);

      expect(response.body.applications).toHaveLength(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE grant_id = $1'),
        [grantId]
      );
    });
  });

  describe('Application Validation', () => {
    it('should validate application data structure', async () => {
      const invalidApplication = {
        grant_id: 'grant-123',
        project_title: 'Test Project',
        project_description: 'Test Description',
        requested_amount: 'invalid-amount', // Should be number
        application_data: {
          team_size: 'invalid-size' // Should be number
        }
      };

      const response = await request(app)
        .post('/applications')
        .send(invalidApplication)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate required application_data fields', async () => {
      const incompleteApplication = {
        grant_id: 'grant-123',
        project_title: 'Test Project',
        project_description: 'Test Description',
        requested_amount: 100000,
        application_data: {
          // Missing required fields like team_size, technical_approach
        }
      };

      const response = await request(app)
        .post('/applications')
        .send(incompleteApplication)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/applications')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle application not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/applications/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Application not found');
    });
  });
});