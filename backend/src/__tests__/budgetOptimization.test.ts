import request from 'supertest';
import { Pool } from 'pg';
import app from '../index';
import { createBudgetOptimizer } from '../services/budgetOptimizationService';
import { OpenAIService } from '../services/openaiService';

// Mock dependencies
jest.mock('../services/openaiService');
jest.mock('../services/vectorDatabase');
jest.mock('../services/database');

// Create a mock pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
} as unknown as Pool;

describe('Budget Optimization System', () => {
  let budgetOptimizer: any;
  let authToken: string;

  beforeAll(() => {
    // Setup auth token for tests
    authToken = 'Bearer test-token';
    budgetOptimizer = createBudgetOptimizer(mockPool);
    
    // Mock authentication middleware
    jest.doMock('../middleware/auth', () => ({
      authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 'test-user-id' };
        next();
      }
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });
  });

  describe('BudgetOptimizationService', () => {
    describe('optimizeBudget', () => {
      it('should perform comprehensive budget optimization', async () => {
        // Mock OpenAI response
        const mockOpenAIResponse = {
          content: JSON.stringify({
            categories: [
              {
                name: 'Personnel',
                amount: 60000,
                percentage: 60,
                justification: 'Research team and project management',
                isRequired: true
              },
              {
                name: 'Equipment',
                amount: 25000,
                percentage: 25,
                justification: 'Research equipment and software',
                isRequired: true
              },
              {
                name: 'Travel',
                amount: 10000,
                percentage: 10,
                justification: 'Conference attendance',
                isRequired: false
              },
              {
                name: 'Materials',
                amount: 5000,
                percentage: 5,
                justification: 'Research materials',
                isRequired: false
              }
            ]
          }),
          usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 }
        };

        const mockVectorSearch = {
          search: jest.fn().mockResolvedValue([
            {
              id: 'grant-1',
              title: 'Similar Grant Project',
              similarity: 0.85,
              metadata: {
                grantData: JSON.stringify({
                  title: 'AI Research Grant',
                  totalBudget: 100000,
                  categories: [
                    { name: 'Personnel', percentage: 65 },
                    { name: 'Equipment', percentage: 25 },
                    { name: 'Travel', percentage: 10 }
                  ],
                  evaluationScore: 88.5
                })
              }
            }
          ])
        };

        // Mock the OpenAI service
        const mockOpenAIService = {
          chatCompletion: jest.fn().mockResolvedValue(mockOpenAIResponse)
        };

        // Replace the service instance
        (budgetOptimizer as any).openaiService = mockOpenAIService;
        (budgetOptimizer as any).vectorService = mockVectorSearch;

        const testRequest = {
          projectScope: {
            title: 'AI-Powered Medical Diagnostics',
            description: 'Research project on medical AI',
            duration: 24,
            teamSize: 4,
            projectType: 'research' as const,
            industry: 'healthcare',
            location: 'Ireland',
            objectives: ['Develop AI model', 'Validate with clinical data']
          },
          fundingRules: {
            fundingBody: 'Science Foundation Ireland',
            grantScheme: 'Investigator Programme',
            maxBudget: 100000,
            eligibleCategories: ['personnel', 'equipment', 'travel', 'materials'],
            categoryLimits: {
              personnel: { maxPercentage: 70 },
              equipment: { maxPercentage: 30 }
            },
            costTypes: {
              personnel: { maxPercentage: 70, includesOverheads: true },
              equipment: { maxPercentage: 30 },
              travel: { maxPercentage: 15 },
              materials: { maxPercentage: 20 },
              overhead: { percentage: 25, calculationMethod: 'direct_costs' },
              subcontracting: { maxPercentage: 25 }
            },
            restrictions: []
          },
          currentBudget: [
            {
              name: 'Personnel',
              amount: 80000,
              percentage: 80,
              justification: 'Large research team',
              isRequired: true
            },
            {
              name: 'Equipment',
              amount: 20000,
              percentage: 20,
              justification: 'Basic equipment',
              isRequired: true
            }
          ]
        };

        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const result = await budgetOptimizer.optimizeBudget(testRequest);

        expect(result).toBeDefined();
        expect(result.categories).toHaveLength(4);
        expect(result.totalAmount).toBe(100000);
        expect(result.confidenceScore).toBeGreaterThan(0);
        expect(result.recommendations).toBeInstanceOf(Array);
        expect(result.warnings).toBeInstanceOf(Array);
        expect(result.optimization.savedAmount).toBeDefined();
        
        // Verify AI service was called
        expect(mockOpenAIService.chatCompletion).toHaveBeenCalled();
        expect(mockVectorSearch.search).toHaveBeenCalled();
      });

      it('should validate budget against funding rules', async () => {
        const testRequest = {
          projectScope: {
            title: 'Test Project',
            description: 'Test description',
            duration: 12,
            teamSize: 2,
            projectType: 'research' as const,
            industry: 'technology',
            location: 'Ireland',
            objectives: ['Test objective']
          },
          fundingRules: {
            fundingBody: 'Enterprise Ireland',
            grantScheme: 'Test Scheme',
            maxBudget: 50000, // Small budget
            eligibleCategories: ['personnel'],
            categoryLimits: {
              personnel: { maxPercentage: 60 } // Strict limit
            },
            costTypes: {},
            restrictions: []
          },
          currentBudget: [
            {
              name: 'Personnel',
              amount: 40000, // 80% of budget - exceeds limit
              percentage: 80,
              justification: 'Staff costs',
              isRequired: true
            },
            {
              name: 'Equipment',
              amount: 10000,
              percentage: 20,
              justification: 'Equipment costs',
              isRequired: false
            }
          ]
        };

        // Mock services
        (budgetOptimizer as any).openaiService = {
          chatCompletion: jest.fn().mockResolvedValue({
            content: JSON.stringify({
              categories: [
                { name: 'Personnel', amount: 30000, percentage: 60, justification: 'Optimized staff costs', isRequired: true },
                { name: 'Equipment', amount: 20000, percentage: 40, justification: 'Essential equipment', isRequired: true }
              ]
            })
          })
        };

        (budgetOptimizer as any).vectorService = {
          search: jest.fn().mockResolvedValue([])
        };

        const result = await budgetOptimizer.optimizeBudget(testRequest);

        // Should have adjusted personnel to meet limits
        const personnelCategory = result.categories.find(c => c.name === 'Personnel');
        expect(personnelCategory?.percentage).toBeLessThanOrEqual(60);
        expect(result.totalAmount).toBeLessThanOrEqual(testRequest.fundingRules.maxBudget);
      });

      it('should generate appropriate warnings for budget issues', async () => {
        const testRequest = {
          projectScope: {
            title: 'High Risk Project',
            description: 'Project with budget issues',
            duration: 6,
            teamSize: 1,
            projectType: 'research' as const,
            industry: 'other',
            location: 'Ireland',
            objectives: []
          },
          fundingRules: {
            fundingBody: 'Test Body',
            grantScheme: 'Test Scheme',
            maxBudget: 10000,
            eligibleCategories: ['personnel'],
            categoryLimits: {
              personnel: { maxPercentage: 50 }
            },
            costTypes: {},
            restrictions: []
          }
        };

        // Mock services to return problematic budget
        (budgetOptimizer as any).openaiService = {
          chatCompletion: jest.fn().mockResolvedValue({
            content: JSON.stringify({
              categories: [
                { name: 'Personnel', amount: 8000, percentage: 80, justification: 'High personnel costs', isRequired: true }
              ]
            })
          })
        };

        (budgetOptimizer as any).vectorService = {
          search: jest.fn().mockResolvedValue([])
        };

        const result = await budgetOptimizer.optimizeBudget(testRequest);

        expect(result.warnings).toBeDefined();
        expect(result.warnings.length).toBeGreaterThan(0);
        
        // Should have warnings about exceeding limits
        const personnelWarning = result.warnings.find(w => w.category === 'Personnel');
        expect(personnelWarning).toBeDefined();
        expect(personnelWarning?.severity).toBe('major');
      });
    });

    describe('getBudgetTemplate', () => {
      it('should return appropriate template for project type', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const template = await budgetOptimizer.getBudgetTemplate(
          'research',
          'Science Foundation Ireland',
          { min: 50000, max: 150000 }
        );

        expect(template).toBeInstanceOf(Array);
        expect(template.length).toBeGreaterThan(0);
        
        // Should have typical research budget categories
        const categoryNames = template.map((cat: any) => cat.name.toLowerCase());
        expect(categoryNames).toContain('personnel');
        expect(categoryNames).toContain('equipment');
        
        // Personnel should be the largest category for research
        const personnel = template.find((cat: any) => cat.name.toLowerCase().includes('personnel'));
        expect(personnel?.percentage).toBeGreaterThan(50);
      });

      it('should return different templates for different project types', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const researchTemplate = await budgetOptimizer.getBudgetTemplate(
          'research',
          'SFI',
          { min: 100000, max: 200000 }
        );

        const developmentTemplate = await budgetOptimizer.getBudgetTemplate(
          'development',
          'Enterprise Ireland',
          { min: 100000, max: 200000 }
        );

        // Templates should be different
        expect(researchTemplate).not.toEqual(developmentTemplate);
        
        // Research should have higher personnel percentage
        const researchPersonnel = researchTemplate.find((cat: any) => cat.name.toLowerCase().includes('personnel'));
        const devPersonnel = developmentTemplate.find((cat: any) => cat.name.toLowerCase().includes('personnel'));
        
        expect(researchPersonnel?.percentage).toBeGreaterThan(devPersonnel?.percentage);
      });
    });
  });

  describe('API Routes', () => {
    describe('POST /budget-optimization/optimize', () => {
      it('should optimize budget successfully', async () => {
        const requestData = {
          projectScope: {
            title: 'Test AI Project',
            description: 'AI research project',
            duration: 18,
            teamSize: 3,
            projectType: 'research',
            industry: 'technology',
            location: 'Ireland',
            objectives: ['Develop AI model']
          },
          fundingRules: {
            fundingBody: 'Science Foundation Ireland',
            grantScheme: 'Investigator Programme',
            maxBudget: 200000,
            eligibleCategories: ['personnel', 'equipment'],
            categoryLimits: {},
            costTypes: {},
            restrictions: []
          },
          currentBudget: [
            {
              name: 'Personnel',
              amount: 120000,
              percentage: 60,
              justification: 'Research team',
              isRequired: true
            }
          ]
        };

        // Mock database calls
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const response = await request(app)
          .post('/budget-optimization/optimize')
          .set('Authorization', authToken)
          .send(requestData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.categories).toBeInstanceOf(Array);
        expect(response.body.data.totalAmount).toBeDefined();
        expect(response.body.data.confidenceScore).toBeDefined();
      });

      it('should validate required fields', async () => {
        const invalidRequests = [
          {}, // Empty request
          { projectScope: {} }, // Missing fundingRules
          { fundingRules: {} }, // Missing projectScope
          { 
            projectScope: { title: '' }, // Invalid projectScope
            fundingRules: { fundingBody: 'Test' }
          }
        ];

        for (const invalidRequest of invalidRequests) {
          const response = await request(app)
            .post('/budget-optimization/optimize')
            .set('Authorization', authToken)
            .send(invalidRequest);
          
          expect(response.status).toBe(400);
          expect(response.body.error).toBeDefined();
        }
      });
    });

    describe('POST /budget-optimization/template', () => {
      it('should return budget template', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const requestData = {
          projectType: 'research',
          fundingBody: 'Science Foundation Ireland',
          budgetRange: { min: 50000, max: 150000 }
        };

        const response = await request(app)
          .post('/budget-optimization/template')
          .set('Authorization', authToken)
          .send(requestData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.template).toBeInstanceOf(Array);
        expect(response.body.data.template.length).toBeGreaterThan(0);
        expect(response.body.data.projectType).toBe('research');
      });
    });

    describe('GET /budget-optimization/history', () => {
      it('should return optimization history', async () => {
        const mockHistory = [
          {
            id: 'opt-1',
            project_scope: JSON.stringify({ title: 'Test Project' }),
            funding_rules: JSON.stringify({ fundingBody: 'SFI' }),
            optimized_budget: JSON.stringify([]),
            analysis_results: JSON.stringify({ confidenceScore: 0.85 }),
            created_at: new Date().toISOString()
          }
        ];

        (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockHistory });

        const response = await request(app)
          .get('/budget-optimization/history?limit=10')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].id).toBe('opt-1');
      });
    });

    describe('POST /budget-optimization/analyze', () => {
      it('should analyze budget for compliance', async () => {
        const requestData = {
          budget: [
            {
              name: 'Personnel',
              amount: 80000,
              percentage: 80,
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
          .send(requestData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.analysis).toBeDefined();
        expect(response.body.data.totalBudget).toBe(80000);
        expect(response.body.data.complianceScore).toBeDefined();
        
        // Should identify compliance issue with personnel percentage
        expect(response.body.data.analysis.complianceIssues.length).toBeGreaterThan(0);
        const personnelIssue = response.body.data.analysis.complianceIssues.find(
          (issue: any) => issue.category === 'Personnel'
        );
        expect(personnelIssue).toBeDefined();
      });
    });

    describe('GET /budget-optimization/stats', () => {
      it('should return budget optimization statistics', async () => {
        const mockStats = {
          total_optimizations: '5',
          avg_confidence: '0.82',
          optimizations_with_savings: '3',
          avg_savings: '8500.00'
        };

        const mockProjectTypes = [
          { project_type: 'research', count: '3' },
          { project_type: 'development', count: '2' }
        ];

        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [mockStats] })
          .mockResolvedValueOnce({ rows: mockProjectTypes });

        const response = await request(app)
          .get('/budget-optimization/stats')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalOptimizations).toBe(5);
        expect(response.body.data.averageConfidence).toBe(0.82);
        expect(response.body.data.commonProjectTypes).toHaveLength(2);
      });
    });

    describe('GET /budget-optimization/funding-rules/:grantScheme', () => {
      it('should return funding rules for grant scheme', async () => {
        const mockFundingRules = {
          funding_rules: {
            fundingBody: 'Enterprise Ireland',
            maxBudget: 150000,
            categoryLimits: { personnel: { maxPercentage: 70 } }
          }
        };

        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockFundingRules] });

        const response = await request(app)
          .get('/budget-optimization/funding-rules/innovation-partnership')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.fundingBody).toBe('Enterprise Ireland');
        expect(response.body.data.maxBudget).toBe(150000);
      });

      it('should return default rules if scheme not found', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const response = await request(app)
          .get('/budget-optimization/funding-rules/unknown-scheme')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.fundingBody).toBe('Generic');
        expect(response.body.data.maxBudget).toBe(100000);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      const testRequest = {
        projectScope: {
          title: 'Test Project',
          description: 'Test',
          duration: 12,
          teamSize: 2,
          projectType: 'research' as const,
          industry: 'tech',
          location: 'Ireland',
          objectives: []
        },
        fundingRules: {
          fundingBody: 'Test',
          grantScheme: 'Test',
          maxBudget: 100000,
          eligibleCategories: [],
          categoryLimits: {},
          costTypes: {},
          restrictions: []
        }
      };

      // Mock OpenAI to throw error
      (budgetOptimizer as any).openaiService = {
        chatCompletion: jest.fn().mockRejectedValue(new Error('OpenAI API Error'))
      };

      (budgetOptimizer as any).vectorService = {
        search: jest.fn().mockResolvedValue([])
      };

      const result = await budgetOptimizer.optimizeBudget(testRequest);
      
      // Should fall back to default budget
      expect(result).toBeDefined();
      expect(result.categories).toBeInstanceOf(Array);
      expect(result.categories.length).toBeGreaterThan(0);
    });

    it('should handle database connection errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Database connection error'));

      const response = await request(app)
        .get('/budget-optimization/stats')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });

    it('should validate budget amounts and percentages', async () => {
      const requestData = {
        budget: [
          {
            name: 'Personnel',
            amount: -1000, // Invalid negative amount
            percentage: 150, // Invalid percentage over 100
            justification: '',
            isRequired: true
          }
        ],
        fundingRules: {
          maxBudget: 100000,
          categoryLimits: {}
        }
      };

      const response = await request(app)
        .post('/budget-optimization/analyze')
        .set('Authorization', authToken)
        .send(requestData);

      // Should handle gracefully or return validation errors
      expect(response.status).toBeLessThan(500);
    });
  });
});