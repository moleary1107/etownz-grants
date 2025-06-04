import express from 'express';
import { partnerCoordinationService } from '../services/partnerCoordinationService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../services/logger';

const router = express.Router();

/**
 * POST /api/partner-coordination/projects
 * Create a new collaborative project
 */
router.post('/projects', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const projectData = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Validate required fields
    const requiredFields = ['title', 'description', 'budget', 'duration'];
    const missingFields = requiredFields.filter(field => !projectData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields
      });
    }

    // Create project with user ID
    const project = {
      ...projectData,
      id: `proj-${Date.now()}`,
      createdBy: userId
    };

    res.status(201).json({
      success: true,
      project,
      message: 'Collaborative project created successfully'
    });

  } catch (error) {
    logger.error('Error creating collaborative project:', error);
    res.status(500).json({ error: 'Failed to create collaborative project' });
  }
});

/**
 * POST /api/partner-coordination/projects/:projectId/find-partners
 * Find potential partners for a project using AI
 */
router.post('/projects/:projectId/find-partners', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;
    const { project, preferences = {} } = req.body;

    if (!project) {
      return res.status(400).json({ error: 'Project data is required' });
    }

    const potentialPartners = await partnerCoordinationService.findPotentialPartners(
      project,
      preferences
    );

    res.json({
      success: true,
      projectId,
      partners: potentialPartners,
      totalFound: potentialPartners.length,
      searchCriteria: preferences
    });

  } catch (error) {
    logger.error('Error finding potential partners:', error);
    res.status(500).json({ error: 'Failed to find potential partners' });
  }
});

/**
 * POST /api/partner-coordination/projects/:projectId/analyze-partnership
 * Analyze partnership compatibility using AI
 */
router.post('/projects/:projectId/analyze-partnership', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;
    const { project, selectedPartners } = req.body;

    if (!project || !selectedPartners || !Array.isArray(selectedPartners)) {
      return res.status(400).json({ 
        error: 'Project data and selected partners array are required' 
      });
    }

    const analysis = await partnerCoordinationService.analyzePartnership(
      project,
      selectedPartners
    );

    res.json({
      success: true,
      projectId,
      analysis,
      partnerCount: selectedPartners.length
    });

  } catch (error) {
    logger.error('Error analyzing partnership:', error);
    res.status(500).json({ error: 'Failed to analyze partnership' });
  }
});

/**
 * POST /api/partner-coordination/projects/:projectId/generate-work-packages
 * Generate work packages for a collaborative project
 */
router.post('/projects/:projectId/generate-work-packages', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;
    const { project, partners, preferences = {} } = req.body;

    if (!project || !partners || !Array.isArray(partners)) {
      return res.status(400).json({ 
        error: 'Project data and partners array are required' 
      });
    }

    const workPackages = await partnerCoordinationService.generateWorkPackages(
      project,
      partners,
      preferences
    );

    res.json({
      success: true,
      projectId,
      workPackages,
      totalPackages: workPackages.length,
      preferences
    });

  } catch (error) {
    logger.error('Error generating work packages:', error);
    res.status(500).json({ error: 'Failed to generate work packages' });
  }
});

/**
 * POST /api/partner-coordination/projects/:projectId/create-collaboration-plan
 * Create a comprehensive collaboration plan
 */
router.post('/projects/:projectId/create-collaboration-plan', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;
    const { project, partners, workPackages } = req.body;

    if (!project || !partners || !workPackages) {
      return res.status(400).json({ 
        error: 'Project data, partners, and work packages are required' 
      });
    }

    const collaborationPlan = await partnerCoordinationService.createCollaborationPlan(
      project,
      partners,
      workPackages
    );

    // Store the plan in database
    const planId = await partnerCoordinationService.storePartnershipPlan(
      projectId,
      collaborationPlan
    );

    res.json({
      success: true,
      projectId,
      planId,
      collaborationPlan,
      message: 'Collaboration plan created and stored successfully'
    });

  } catch (error) {
    logger.error('Error creating collaboration plan:', error);
    res.status(500).json({ error: 'Failed to create collaboration plan' });
  }
});

/**
 * GET /api/partner-coordination/partners
 * Get list of available partners with filtering
 */
router.get('/partners', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      country,
      type,
      expertise,
      minSuccessRate,
      page = 1,
      limit = 20
    } = req.query;

    // Mock response for now - would implement actual database query
    const partners = [
      {
        id: 'partner-1',
        organizationName: 'Trinity College Dublin',
        type: 'academic',
        country: 'IRL',
        expertiseAreas: ['AI', 'Machine Learning', 'Data Science'],
        capabilities: ['Research', 'Development', 'Training'],
        fundingHistory: {
          totalReceived: 5000000,
          successfulProjects: 25,
          successRate: 85.5
        },
        contactInfo: {
          primaryContact: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@tcd.ie'
        }
      },
      {
        id: 'partner-2',
        organizationName: 'Fraunhofer Institute',
        type: 'academic',
        country: 'DEU',
        expertiseAreas: ['IoT', 'Sensor Networks', 'Industry 4.0'],
        capabilities: ['Research', 'Prototyping', 'Testing'],
        fundingHistory: {
          totalReceived: 12000000,
          successfulProjects: 45,
          successRate: 92.1
        },
        contactInfo: {
          primaryContact: 'Dr. Klaus Weber',
          email: 'klaus.weber@fraunhofer.de'
        }
      }
    ];

    // Apply filters
    let filteredPartners = partners;
    
    if (country) {
      filteredPartners = filteredPartners.filter(p => p.country === country);
    }
    
    if (type) {
      filteredPartners = filteredPartners.filter(p => p.type === type);
    }
    
    if (expertise) {
      filteredPartners = filteredPartners.filter(p => 
        p.expertiseAreas.some(area => 
          area.toLowerCase().includes((expertise as string).toLowerCase())
        )
      );
    }
    
    if (minSuccessRate) {
      const minRate = parseFloat(minSuccessRate as string);
      filteredPartners = filteredPartners.filter(p => 
        p.fundingHistory.successRate >= minRate
      );
    }

    // Pagination
    const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
    const endIndex = startIndex + parseInt(limit as string);
    const paginatedPartners = filteredPartners.slice(startIndex, endIndex);

    res.json({
      success: true,
      partners: paginatedPartners,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: filteredPartners.length,
        totalPages: Math.ceil(filteredPartners.length / parseInt(limit as string))
      },
      filters: { country, type, expertise, minSuccessRate }
    });

  } catch (error) {
    logger.error('Error fetching partners:', error);
    res.status(500).json({ error: 'Failed to fetch partners' });
  }
});

/**
 * GET /api/partner-coordination/partners/:partnerId
 * Get detailed information about a specific partner
 */
router.get('/partners/:partnerId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { partnerId } = req.params;

    // Mock detailed partner data - would fetch from database
    const partner = {
      id: partnerId,
      organizationName: 'Trinity College Dublin',
      type: 'academic',
      country: 'IRL',
      website: 'https://www.tcd.ie',
      description: 'Leading Irish university with strong research capabilities in AI and computer science.',
      establishedYear: 1592,
      employeeCount: 3000,
      expertiseAreas: [
        'Artificial Intelligence',
        'Machine Learning',
        'Data Science',
        'Natural Language Processing',
        'Computer Vision'
      ],
      capabilities: [
        'Research and Development',
        'PhD Training',
        'Industry Collaboration',
        'Technology Transfer',
        'Conference Organization'
      ],
      certifications: [
        'ISO 9001:2015',
        'Horizon Europe Seal of Excellence',
        'Irish Research Council Recognition'
      ],
      languages: ['en', 'ga'],
      fundingHistory: {
        totalReceived: 5000000,
        successfulProjects: 25,
        successRate: 85.5,
        recentProjects: [
          {
            name: 'AI for Climate Action',
            budget: 750000,
            year: 2023,
            success: true
          },
          {
            name: 'Smart Cities Initiative',
            budget: 1200000,
            year: 2022,
            success: true
          }
        ]
      },
      contactInfo: {
        primaryContact: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@tcd.ie',
        phone: '+353 1 896 1000'
      },
      availability: {
        startDate: '2024-03-01',
        capacity: 80
      }
    };

    res.json({
      success: true,
      partner
    });

  } catch (error) {
    logger.error('Error fetching partner details:', error);
    res.status(500).json({ error: 'Failed to fetch partner details' });
  }
});

/**
 * GET /api/partner-coordination/analytics
 * Get analytics about partnerships and collaborations
 */
router.get('/analytics', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { startDate, endDate, country, type } = req.query;

    // Mock analytics data - would calculate from database
    const analytics = {
      overview: {
        totalPartners: 156,
        activeProjects: 23,
        completedProjects: 89,
        totalFundingSecured: 45600000,
        averageSuccessRate: 82.3
      },
      partnerDistribution: {
        byType: {
          academic: 45,
          industry: 38,
          sme: 42,
          nonprofit: 18,
          government: 13
        },
        byCountry: {
          'IRL': 25,
          'DEU': 22,
          'ESP': 18,
          'FRA': 16,
          'NLD': 14,
          'Other': 61
        }
      },
      collaborationTrends: {
        monthlyProjects: [
          { month: '2024-01', projects: 5, success: 4 },
          { month: '2024-02', projects: 7, success: 6 },
          { month: '2024-03', projects: 6, success: 5 },
          { month: '2024-04', projects: 8, success: 7 }
        ],
        popularExpertiseAreas: [
          { area: 'Artificial Intelligence', count: 45 },
          { area: 'Climate Science', count: 38 },
          { area: 'IoT Systems', count: 32 },
          { area: 'Renewable Energy', count: 28 },
          { area: 'Digital Health', count: 25 }
        ]
      },
      successFactors: {
        geographicDiversity: 0.78,
        expertiseComplementarity: 0.85,
        communicationQuality: 0.82,
        projectManagement: 0.89
      }
    };

    res.json({
      success: true,
      analytics,
      filters: { startDate, endDate, country, type }
    });

  } catch (error) {
    logger.error('Error fetching partnership analytics:', error);
    res.status(500).json({ error: 'Failed to fetch partnership analytics' });
  }
});

/**
 * GET /api/partner-coordination/health
 * Health check for partner coordination service
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      status: 'ok',
      service: 'partner-coordination',
      timestamp: new Date().toISOString(),
      features: [
        'partner-matching',
        'collaboration-planning',
        'work-package-generation',
        'partnership-analysis'
      ]
    });
  } catch (error) {
    logger.error('Error checking partner coordination health:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;