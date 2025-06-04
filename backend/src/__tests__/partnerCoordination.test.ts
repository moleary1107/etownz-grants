import { partnerCoordinationService } from '../services/partnerCoordinationService';
import { DatabaseService } from '../services/database';
import { openaiService } from '../services/openaiService';

// Mock dependencies
jest.mock('../services/database');
jest.mock('../services/openaiService');

describe('Partner Coordination Service', () => {
  let mockDb: jest.Mocked<DatabaseService>;
  let mockOpenaiService: jest.Mocked<typeof openaiService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      query: jest.fn().mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      }),
      getInstance: jest.fn()
    } as any;

    mockOpenaiService = {
      createChatCompletion: jest.fn()
    } as any;

    // Mock the static getInstance method
    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDb);
  });

  describe('findPotentialPartners', () => {
    it('should find and score potential partners for a project', async () => {
      const mockProject = {
        id: 'proj-123',
        title: 'AI Climate Research',
        description: 'Research project on AI applications for climate science',
        objectives: ['Develop AI models', 'Analyze climate data'],
        requiredExpertise: ['AI', 'Climate Science'],
        budget: { total: 1000000, currency: 'EUR' as const },
        duration: 36,
        expectedOutcomes: ['Research papers', 'Open source tools'],
        riskFactors: ['Data availability', 'Technical complexity']
      };

      const mockPartners = [
        {
          id: 'partner-1',
          organization_name: 'Trinity College Dublin',
          organization_type: 'academic',
          country: 'IRL',
          expertise_areas: ['AI', 'Machine Learning'],
          capabilities: ['Research', 'Development'],
          languages: ['en'],
          total_funding_received: 5000000,
          successful_projects: 25,
          success_rate: 85.5,
          primary_contact: 'Dr. Sarah Johnson',
          contact_email: 'sarah.johnson@tcd.ie',
          contact_phone: null,
          available_from: new Date(),
          capacity_percentage: 80
        },
        {
          id: 'partner-2',
          organization_name: 'Climate Research Institute',
          organization_type: 'academic',
          country: 'DEU',
          expertise_areas: ['Climate Science', 'Data Analysis'],
          capabilities: ['Research', 'Modeling'],
          languages: ['de', 'en'],
          total_funding_received: 3000000,
          successful_projects: 15,
          success_rate: 78.2,
          primary_contact: 'Prof. Klaus Mueller',
          contact_email: 'klaus.mueller@climate.de',
          contact_phone: null,
          available_from: new Date(),
          capacity_percentage: 90
        }
      ];

      mockDb.query.mockResolvedValue({ 
        rows: mockPartners,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      });

      mockOpenaiService.createChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              { partnerId: 'partner-1', score: 92 },
              { partnerId: 'partner-2', score: 88 }
            ])
          }
        }]
      } as any);

      const preferences = {
        maxPartners: 5,
        geographicDiversity: true,
        minSuccessRate: 75
      };

      const result = await partnerCoordinationService.findPotentialPartners(
        mockProject,
        preferences
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('compatibilityScore');
      expect(result[0].compatibilityScore).toBeGreaterThan(0);
      expect(mockDb.query).toHaveBeenCalled();
      expect(mockOpenaiService.createChatCompletion).toHaveBeenCalled();
    });

    it('should filter partners by minimum success rate', async () => {
      const mockProject = {
        id: 'proj-123',
        title: 'Test Project',
        description: 'Test description',
        objectives: [],
        requiredExpertise: ['AI'],
        budget: { total: 500000, currency: 'EUR' as const },
        duration: 24,
        expectedOutcomes: [],
        riskFactors: []
      };

      const mockPartners = [
        {
          id: 'partner-1',
          organization_name: 'High Success Partner',
          fundingHistory: { successRate: 90 }
        },
        {
          id: 'partner-2', 
          organization_name: 'Low Success Partner',
          fundingHistory: { successRate: 60 }
        }
      ];

      // Mock the service's internal methods
      jest.spyOn(partnerCoordinationService as any, 'scorePartnerCompatibility')
        .mockResolvedValue(mockPartners.map(p => ({ ...p, compatibilityScore: 80 })));

      mockDb.query.mockResolvedValue({ 
        rows: mockPartners,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      });

      const preferences = { minSuccessRate: 75 };
      const result = await partnerCoordinationService.findPotentialPartners(
        mockProject,
        preferences
      );

      // Should only return the partner with success rate >= 75
      expect(result).toHaveLength(1);
      expect(result[0].fundingHistory.successRate).toBeGreaterThanOrEqual(75);
    });
  });

  describe('analyzePartnership', () => {
    it('should analyze partnership compatibility using AI', async () => {
      const mockProject = {
        id: 'proj-123',
        title: 'Collaborative AI Project',
        description: 'Multi-partner AI research initiative',
        objectives: ['Develop AI tools', 'Foster collaboration'],
        requiredExpertise: ['AI', 'Software Development'],
        budget: { total: 2000000, currency: 'EUR' as const },
        duration: 48,
        expectedOutcomes: ['Software platform', 'Research publications'],
        riskFactors: ['Technical complexity', 'Partner coordination']
      };

      const mockPartners = [
        {
          id: 'partner-1',
          organizationName: 'University A',
          type: 'academic' as const,
          country: 'IRL',
          expertiseAreas: ['AI', 'Research'],
          capabilities: ['Development', 'Testing']
        },
        {
          id: 'partner-2',
          organizationName: 'Tech Company B',
          type: 'industry' as const,
          country: 'DEU',
          expertiseAreas: ['Software Development', 'AI'],
          capabilities: ['Development', 'Deployment']
        }
      ];

      const mockAnalysisResponse = {
        compatibilityScore: 87,
        strengths: ['Complementary expertise', 'Strong track records'],
        challenges: ['Geographic distance', 'Different working cultures'],
        roles: {
          'partner-1': 'Research lead',
          'partner-2': 'Technical development lead'
        },
        communication: ['Weekly video calls', 'Shared documentation platform'],
        riskMitigation: ['Clear governance structure', 'Regular milestone reviews']
      };

      mockOpenaiService.createChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAnalysisResponse)
          }
        }]
      } as any);

      const result = await partnerCoordinationService.analyzePartnership(
        mockProject,
        mockPartners
      );

      expect(result).toHaveProperty('compatibilityScore', 87);
      expect(result).toHaveProperty('strengthsAlignment');
      expect(result).toHaveProperty('potentialChallenges');
      expect(result).toHaveProperty('recommendedRoles');
      expect(result).toHaveProperty('communicationStrategy');
      expect(result).toHaveProperty('riskMitigation');

      expect(mockOpenaiService.createChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('partnership analyst')
            })
          ])
        })
      );
    });

    it('should handle AI service errors gracefully', async () => {
      const mockProject = {
        id: 'proj-123',
        title: 'Test Project',
        description: 'Test',
        objectives: [],
        requiredExpertise: [],
        budget: { total: 100000, currency: 'EUR' as const },
        duration: 12,
        expectedOutcomes: [],
        riskFactors: []
      };

      const mockPartners = [
        {
          id: 'partner-1',
          organizationName: 'Test Partner',
          type: 'academic' as const,
          country: 'IRL',
          expertiseAreas: [],
          capabilities: []
        }
      ];

      mockOpenaiService.createChatCompletion.mockRejectedValue(
        new Error('AI service unavailable')
      );

      await expect(
        partnerCoordinationService.analyzePartnership(mockProject, mockPartners)
      ).rejects.toThrow('AI service unavailable');
    });
  });

  describe('generateWorkPackages', () => {
    it('should generate work packages for collaborative project', async () => {
      const mockProject = {
        id: 'proj-123',
        title: 'Multi-Partner Research',
        description: 'Collaborative research project',
        objectives: ['Research', 'Development', 'Dissemination'],
        requiredExpertise: ['AI', 'Software Engineering'],
        budget: { total: 1500000, currency: 'EUR' as const },
        duration: 36,
        expectedOutcomes: ['Software tools', 'Publications'],
        riskFactors: ['Technical risks']
      };

      const mockPartners = [
        {
          id: 'partner-1',
          organizationName: 'Research University',
          type: 'academic' as const,
          country: 'IRL',
          expertiseAreas: ['AI Research'],
          capabilities: ['Research', 'Publications']
        },
        {
          id: 'partner-2',
          organizationName: 'Software Company',
          type: 'industry' as const,
          country: 'DEU',
          expertiseAreas: ['Software Development'],
          capabilities: ['Development', 'Testing']
        }
      ];

      const mockWorkPackages = [
        {
          name: 'Research and Analysis',
          description: 'Fundamental research activities',
          leadPartner: 'partner-1',
          participatingPartners: ['partner-2'],
          budget: 500000,
          duration: 18,
          deliverables: ['Research report', 'Analysis framework'],
          dependencies: [],
          expertiseRequired: ['AI Research'],
          effort: { 'partner-1': 24, 'partner-2': 6 }
        },
        {
          name: 'Software Development',
          description: 'Development of software tools',
          leadPartner: 'partner-2',
          participatingPartners: ['partner-1'],
          budget: 750000,
          duration: 24,
          deliverables: ['Software platform', 'Documentation'],
          dependencies: ['Research and Analysis'],
          expertiseRequired: ['Software Development'],
          effort: { 'partner-1': 6, 'partner-2': 36 }
        },
        {
          name: 'Dissemination',
          description: 'Project dissemination and exploitation',
          leadPartner: 'partner-1',
          participatingPartners: ['partner-2'],
          budget: 250000,
          duration: 12,
          deliverables: ['Publications', 'Workshops'],
          dependencies: ['Software Development'],
          expertiseRequired: ['Research'],
          effort: { 'partner-1': 12, 'partner-2': 3 }
        }
      ];

      mockOpenaiService.createChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockWorkPackages)
          }
        }]
      } as any);

      const preferences = {
        maxWorkPackages: 4,
        balanceWorkload: true,
        minimizeInterdependencies: false
      };

      const result = await partnerCoordinationService.generateWorkPackages(
        mockProject,
        mockPartners,
        preferences
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('leadPartner');
      expect(result[0]).toHaveProperty('budget');
      expect(result[0]).toHaveProperty('deliverables');

      // Check that IDs are properly assigned
      expect(result[0].id).toBe('wp-1');
      expect(result[1].id).toBe('wp-2');
      expect(result[2].id).toBe('wp-3');

      expect(mockOpenaiService.createChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('project manager')
            })
          ])
        })
      );
    });

    it('should handle empty AI response', async () => {
      const mockProject = {
        id: 'proj-123',
        title: 'Test Project',
        description: 'Test',
        objectives: [],
        requiredExpertise: [],
        budget: { total: 100000, currency: 'EUR' as const },
        duration: 12,
        expectedOutcomes: [],
        riskFactors: []
      };

      const mockPartners = [];

      mockOpenaiService.createChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: '[]' // Empty work packages array
          }
        }]
      } as any);

      const result = await partnerCoordinationService.generateWorkPackages(
        mockProject,
        mockPartners
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('createCollaborationPlan', () => {
    it('should create comprehensive collaboration plan', async () => {
      const mockProject = {
        id: 'proj-123',
        title: 'Collaboration Project',
        description: 'Test collaborative project',
        objectives: ['Objective 1'],
        requiredExpertise: ['AI'],
        budget: { total: 1000000, currency: 'EUR' as const },
        duration: 24,
        expectedOutcomes: ['Outcome 1'],
        riskFactors: ['Risk 1']
      };

      const mockPartners = [
        {
          id: 'partner-1',
          organizationName: 'Partner A',
          type: 'academic' as const,
          country: 'IRL',
          expertiseAreas: ['AI'],
          capabilities: ['Research'],
          previousCollaborations: [],
          fundingHistory: {
            totalReceived: 1000000,
            successfulProjects: 10,
            successRate: 85
          },
          contactInfo: {
            primaryContact: 'Dr. A',
            email: 'a@partner.com'
          },
          certifications: [],
          languages: ['en'],
          availability: {
            startDate: new Date(),
            capacity: 100
          }
        }
      ];

      const mockWorkPackages = [
        {
          id: 'wp-1',
          name: 'Research',
          description: 'Research work package',
          leadPartner: 'partner-1',
          participatingPartners: [],
          budget: 500000,
          duration: 12,
          deliverables: ['Report'],
          dependencies: [],
          expertiseRequired: ['AI'],
          effort: { 'partner-1': 12 }
        }
      ];

      const result = await partnerCoordinationService.createCollaborationPlan(
        mockProject,
        mockPartners,
        mockWorkPackages
      );

      expect(result).toHaveProperty('workPackages');
      expect(result).toHaveProperty('budgetAllocation');
      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('governanceStructure');
      expect(result).toHaveProperty('communicationPlan');

      expect(result.workPackages).toEqual(mockWorkPackages);
      expect(result.budgetAllocation).toHaveProperty('partner-1');
      expect(result.timeline).toHaveProperty('milestones');
      expect(result.governanceStructure).toHaveProperty('coordinator');
      expect(result.communicationPlan).toHaveProperty('meetingSchedule');
    });
  });

  describe('storePartnershipPlan', () => {
    it('should store partnership plan in database', async () => {
      const projectId = 'proj-123';
      const mockPlan = {
        workPackages: [],
        budgetAllocation: {},
        timeline: { milestones: [] },
        governanceStructure: { coordinator: 'partner-1', steeringCommittee: [], workingGroups: [] },
        communicationPlan: { meetingSchedule: '', reportingStructure: [], collaborationTools: [] }
      };

      mockDb.query.mockResolvedValue({
        rows: [{ id: 'plan-123' }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await partnerCoordinationService.storePartnershipPlan(
        projectId,
        mockPlan
      );

      expect(result).toBe('plan-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO partnership_plans'),
        expect.arrayContaining([
          expect.stringMatching(/^plan-/),
          projectId,
          JSON.stringify(mockPlan.workPackages),
          JSON.stringify(mockPlan.budgetAllocation),
          JSON.stringify(mockPlan.timeline),
          JSON.stringify(mockPlan.governanceStructure),
          JSON.stringify(mockPlan.communicationPlan)
        ])
      );
    });

    it('should handle database errors when storing plan', async () => {
      const projectId = 'proj-123';
      const mockPlan = {
        workPackages: [],
        budgetAllocation: {},
        timeline: { milestones: [] },
        governanceStructure: { coordinator: 'partner-1', steeringCommittee: [], workingGroups: [] },
        communicationPlan: { meetingSchedule: '', reportingStructure: [], collaborationTools: [] }
      };

      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        partnerCoordinationService.storePartnershipPlan(projectId, mockPlan)
      ).rejects.toThrow('Database connection failed');
    });
  });
});