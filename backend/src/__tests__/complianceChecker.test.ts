import request from 'supertest';
import { Pool } from 'pg';
import app from '../index';
import { createComplianceChecker } from '../services/complianceCheckerService';
import { openaiService } from '../services/openaiService';

// Mock dependencies
jest.mock('../services/openaiService');
jest.mock('../services/database');

// Create a mock pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
} as unknown as Pool;

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe('Compliance Checker System', () => {
  let complianceChecker: any;
  let authToken: string;

  beforeAll(() => {
    // Setup auth token for tests
    authToken = 'Bearer test-token';
    complianceChecker = createComplianceChecker(mockPool);
    
    // Mock authentication middleware
    jest.doMock('../middleware/auth', () => ({
      authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 'test-user-id', isAdmin: true };
        next();
      }
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [] });
  });

  describe('ComplianceCheckerService', () => {
    describe('checkCompliance', () => {
      it('should perform comprehensive compliance check', async () => {
        // Mock compliance rules
        const mockRules = [
          {
            id: 'rule-1',
            grant_scheme_id: 'scheme-1',
            rule_category: 'content',
            rule_description: 'Executive summary must be between 200-500 words',
            severity: 'major',
            automated_check: true,
            check_query: { section: 'executive_summary', min_words: 200, max_words: 500 }
          }
        ];

        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({ rows: mockRules }) // compliance rules query
          .mockResolvedValueOnce({ rows: [] }); // store results query

        // Mock OpenAI response
        const mockOpenAIResponse = {
          choices: [{
            message: {
              tool_calls: [{
                function: {
                  name: 'report_compliance_issues',
                  arguments: JSON.stringify({
                    issues: [
                      {
                        field: 'executive_summary',
                        requirement: 'Minimum 200 words required',
                        severity: 'major',
                        suggestion: 'Please expand the executive summary to meet the minimum word count'
                      }
                    ]
                  })
                }
              }]
            }
          }]
        };

        (openaiService.createChatCompletion as jest.Mock).mockResolvedValue(mockOpenAIResponse);
        (mockClient.query as jest.Mock).mockResolvedValue({ rows: [] });

        const testApplication = {
          id: 'app-1',
          grantSchemeId: 'scheme-1',
          sections: {
            executive_summary: {
              content: 'This is a short summary.' // Only 5 words
            },
            methodology: {
              content: 'Detailed methodology section with sufficient content to meet requirements.'
            }
          },
          budget: {
            total: 50000,
            categories: [
              { name: 'Personnel', amount: 30000, justification: 'Staff costs' },
              { name: 'Equipment', amount: 20000, justification: 'Lab equipment' }
            ]
          }
        };

        const result = await complianceChecker.checkCompliance(testApplication, 'scheme-1');

        expect(result).toBeDefined();
        expect(result.applicationId).toBe('app-1');
        expect(result.overallScore).toBeLessThan(100);
        expect(result.issues).toHaveLength(2); // One from AI, one from rule-based check
        expect(result.criticalIssuesCount).toBeGreaterThanOrEqual(0);
        expect(result.majorIssuesCount).toBeGreaterThan(0);
        expect(result.suggestions).toBeInstanceOf(Array);
      });

      it('should handle missing required sections', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const incompleteApplication = {
          id: 'app-2',
          grantSchemeId: 'scheme-1',
          sections: {
            executive_summary: {
              content: 'This is a complete executive summary with sufficient content to meet the minimum word count requirements for this section.'
            }
            // Missing methodology, budget_justification, impact sections
          }
        };

        const result = await complianceChecker.checkCompliance(incompleteApplication, 'scheme-1');

        const criticalIssues = result.issues.filter(issue => issue.severity === 'critical');
        expect(criticalIssues.length).toBeGreaterThan(0);
        expect(result.overallScore).toBeLessThan(50);
      });

      it('should validate budget limits', async () => {
        const budgetRule = {
          id: 'budget-rule-1',
          grant_scheme_id: 'scheme-1',
          rule_category: 'budget',
          rule_description: 'Budget must not exceed €100,000',
          severity: 'critical',
          automated_check: true,
          check_query: { maxBudget: 100000 }
        };

        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [budgetRule] });

        const testApplication = {
          id: 'app-3',
          grantSchemeId: 'scheme-1',
          sections: {
            executive_summary: { content: 'Complete executive summary section with adequate word count for testing purposes and meeting minimum requirements.' },
            methodology: { content: 'Comprehensive methodology section detailing the research approach, data collection methods, analysis techniques, and expected outcomes for this grant project.' },
            budget_justification: { content: 'Detailed budget justification explaining all cost categories and their necessity.' },
            impact: { content: 'Significant impact expected from this project including benefits to society, advancement of knowledge, and potential applications.' }
          },
          budget: {
            total: 150000, // Exceeds limit
            categories: [
              { name: 'Personnel', amount: 100000, justification: 'Staff costs' },
              { name: 'Equipment', amount: 50000, justification: 'Lab equipment' }
            ]
          }
        };

        const result = await complianceChecker.checkCompliance(testApplication, 'scheme-1');

        const budgetIssues = result.issues.filter(issue => issue.field === 'budget');
        expect(budgetIssues.length).toBeGreaterThan(0);
        expect(budgetIssues[0].severity).toBe('critical');
      });

      it('should calculate correct compliance scores', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        // Test perfect application
        const perfectApplication = {
          id: 'perfect-app',
          grantSchemeId: 'scheme-1',
          sections: {
            executive_summary: { 
              content: 'This is a comprehensive executive summary that provides detailed overview of the project objectives, methodology, expected outcomes, and significance. It contains sufficient detail to meet all word count requirements and clearly communicates the project value proposition.'
            },
            methodology: { 
              content: 'Detailed methodology section explaining the research approach, data collection strategies, analysis methods, validation procedures, and quality assurance measures. This section provides comprehensive coverage of all technical aspects of the project implementation and demonstrates feasibility.'
            },
            budget_justification: { 
              content: 'Comprehensive budget justification detailing all cost categories, explaining the necessity of each expense, and demonstrating value for money.'
            },
            impact: { 
              content: 'Significant impact expected including societal benefits, knowledge advancement, economic value, and potential for future applications and scaling opportunities.'
            }
          },
          budget: {
            total: 75000,
            categories: [
              { name: 'Personnel', amount: 45000, justification: 'Research staff costs' },
              { name: 'Equipment', amount: 20000, justification: 'Essential equipment' },
              { name: 'Travel', amount: 10000, justification: 'Conference attendance' }
            ]
          }
        };

        const result = await complianceChecker.checkCompliance(perfectApplication, 'scheme-1');
        expect(result.overallScore).toBeGreaterThan(80);
        expect(result.criticalIssuesCount).toBe(0);
      });
    });

    describe('Rule-based validation', () => {
      it('should check word count requirements', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const testCases = [
          {
            section: 'executive_summary',
            content: 'Short.',
            expectedIssue: true,
            description: 'Too short'
          },
          {
            section: 'executive_summary',
            content: 'This is a proper executive summary with adequate length that meets the minimum word count requirements for this section and provides sufficient detail.',
            expectedIssue: false,
            description: 'Adequate length'
          }
        ];

        for (const testCase of testCases) {
          const application = {
            id: 'test-app',
            grantSchemeId: 'scheme-1',
            sections: {
              [testCase.section]: { content: testCase.content },
              methodology: { content: 'Adequate methodology section with sufficient detail and comprehensive coverage of research approach.' },
              budget_justification: { content: 'Detailed budget justification.' },
              impact: { content: 'Significant impact expected from this project.' }
            }
          };

          const result = await complianceChecker.checkCompliance(application, 'scheme-1');
          
          if (testCase.expectedIssue) {
            const wordCountIssues = result.issues.filter(issue => 
              issue.field === testCase.section && issue.requirement.includes('words')
            );
            expect(wordCountIssues.length).toBeGreaterThan(0);
          }
        }
      });
    });
  });

  describe('API Routes', () => {
    describe('POST /compliance/check/:applicationId', () => {
      it('should check compliance for existing application', async () => {
        // Mock application data
        const mockApplication = {
          id: 'app-1',
          user_id: 'test-user-id',
          grant_scheme_id: 'scheme-1',
          metadata: {
            budget: { total: 50000 }
          }
        };

        const mockSections = [
          { section_type: 'executive_summary', content: 'Test summary content' },
          { section_type: 'methodology', content: 'Test methodology content' }
        ];

        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [mockApplication] }) // application query
          .mockResolvedValueOnce({ rows: mockSections }) // sections query
          .mockResolvedValueOnce({ rows: [] }) // compliance rules
          .mockResolvedValueOnce({ rows: [] }); // AI interaction logging

        const response = await request(app)
          .post('/compliance/check/app-1')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.applicationId).toBe('app-1');
      });

      it('should return 404 for non-existent application', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const response = await request(app)
          .post('/compliance/check/non-existent')
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.error).toBe('Application not found or access denied');
      });
    });

    describe('POST /compliance/check-manual', () => {
      it('should perform manual compliance check', async () => {
        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const requestData = {
          grantSchemeId: 'scheme-1',
          sections: {
            executive_summary: {
              content: 'Comprehensive executive summary with adequate detail and word count.'
            },
            methodology: {
              content: 'Detailed methodology section explaining research approach and methods.'
            }
          },
          budget: {
            total: 50000,
            categories: [
              { name: 'Personnel', amount: 30000, justification: 'Staff costs' }
            ]
          }
        };

        const response = await request(app)
          .post('/compliance/check-manual')
          .set('Authorization', authToken)
          .send(requestData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.overallScore).toBeDefined();
        expect(response.body.data.issues).toBeInstanceOf(Array);
      });

      it('should validate required fields', async () => {
        const invalidRequest = {
          sections: {} // Missing grantSchemeId
        };

        const response = await request(app)
          .post('/compliance/check-manual')
          .set('Authorization', authToken)
          .send(invalidRequest)
          .expect(400);

        expect(response.body.error).toContain('Missing required fields');
      });
    });

    describe('GET /compliance/rules/:grantSchemeId', () => {
      it('should fetch compliance rules for grant scheme', async () => {
        const mockRules = [
          {
            id: 'rule-1',
            grant_scheme_id: 'scheme-1',
            rule_category: 'content',
            rule_description: 'Test rule',
            severity: 'major',
            automated_check: true,
            check_query: {}
          }
        ];

        (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockRules });

        const response = await request(app)
          .get('/compliance/rules/scheme-1')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].id).toBe('rule-1');
      });
    });

    describe('POST /compliance/rules', () => {
      it('should create new compliance rule (admin only)', async () => {
        const newRule = {
          grantSchemeId: 'scheme-1',
          ruleCategory: 'budget',
          ruleDescription: 'Budget must not exceed €100,000',
          severity: 'critical' as const,
          automatedCheck: true,
          checkQuery: { maxBudget: 100000 }
        };

        const mockCreatedRule = {
          id: 'new-rule-id',
          grant_scheme_id: 'scheme-1',
          rule_category: 'budget',
          rule_description: 'Budget must not exceed €100,000',
          severity: 'critical',
          automated_check: true,
          check_query: { maxBudget: 100000 }
        };

        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockCreatedRule] });

        const response = await request(app)
          .post('/compliance/rules')
          .set('Authorization', authToken)
          .send(newRule)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('new-rule-id');
      });

      it('should reject non-admin users', async () => {
        // Mock non-admin user
        jest.doMock('../middleware/auth', () => ({
          authenticateToken: (req: any, res: any, next: any) => {
            req.user = { id: 'test-user-id', isAdmin: false };
            next();
          }
        }));

        const newRule = {
          grantSchemeId: 'scheme-1',
          ruleDescription: 'Test rule',
          severity: 'major' as const
        };

        const response = await request(app)
          .post('/compliance/rules')
          .set('Authorization', authToken)
          .send(newRule)
          .expect(403);

        expect(response.body.error).toBe('Admin access required');
      });
    });

    describe('GET /compliance/stats', () => {
      it('should return compliance statistics', async () => {
        const mockStats = {
          total_checks: '10',
          average_score: '85.5',
          critical_issues: '2',
          major_issues: '5',
          minor_issues: '8'
        };

        (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockStats] });

        const response = await request(app)
          .get('/compliance/stats')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalChecks).toBe(10);
        expect(response.body.data.averageScore).toBe(85.5);
        expect(response.body.data.criticalIssues).toBe(2);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });
      (openaiService.createChatCompletion as jest.Mock).mockRejectedValue(
        new Error('OpenAI API Error')
      );

      const testApplication = {
        id: 'app-error',
        grantSchemeId: 'scheme-1',
        sections: {
          executive_summary: { content: 'Test content' }
        }
      };

      const result = await complianceChecker.checkCompliance(testApplication, 'scheme-1');
      
      // Should still return results from rule-based checks
      expect(result).toBeDefined();
      expect(result.applicationId).toBe('app-error');
    });

    it('should handle database connection errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Database connection error'));

      const response = await request(app)
        .get('/compliance/rules/scheme-1')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });

    it('should validate input data thoroughly', async () => {
      const invalidRequests = [
        { sections: null }, // Invalid sections
        { grantSchemeId: '', sections: {} }, // Empty grantSchemeId
        { grantSchemeId: 'valid', sections: 'invalid' } // Invalid sections type
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(app)
          .post('/compliance/check-manual')
          .set('Authorization', authToken)
          .send(invalidRequest);
        
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });
});