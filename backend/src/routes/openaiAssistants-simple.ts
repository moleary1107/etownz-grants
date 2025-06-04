import express from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../services/logger';

const router = express.Router();

/**
 * GET /api/assistants
 * Get list of available assistants
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const assistants = [
      {
        key: 'proposal_writer',
        name: 'Grant Proposal Writer',
        description: 'Expert at writing compelling grant proposals and sections',
        capabilities: ['section generation', 'content optimization', 'compliance guidance']
      },
      {
        key: 'compliance_checker',
        name: 'Grant Compliance Checker',
        description: 'Validates applications against grant requirements',
        capabilities: ['requirement validation', 'compliance scoring', 'issue identification']
      },
      {
        key: 'budget_analyst',
        name: 'Grant Budget Analyst',
        description: 'Optimizes budget allocation and validates financial planning',
        capabilities: ['budget optimization', 'cost analysis', 'financial compliance']
      },
      {
        key: 'requirements_analyzer',
        name: 'Grant Requirements Analyzer',
        description: 'Extracts and analyzes grant requirements from documentation',
        capabilities: ['requirement extraction', 'document analysis', 'criteria mapping']
      },
      {
        key: 'impact_strategist',
        name: 'Grant Impact Strategist',
        description: 'Develops compelling impact narratives and strategies',
        capabilities: ['impact planning', 'stakeholder analysis', 'sustainability planning']
      }
    ];

    res.json({
      assistants,
      totalCount: assistants.length
    });
  } catch (error) {
    logger.error('Error fetching assistants:', error);
    res.status(500).json({ error: 'Failed to fetch assistants' });
  }
});

/**
 * POST /api/assistants/initialize
 * Initialize all assistants (admin only)
 */
router.post('/initialize', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // For now, just return success - actual initialization would happen here
    res.json({
      success: true,
      message: 'Assistants initialized successfully (placeholder)'
    });
  } catch (error) {
    logger.error('Error initializing assistants:', error);
    res.status(500).json({ error: 'Failed to initialize assistants' });
  }
});

/**
 * GET /api/assistants/health
 * Health check for assistants service
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      status: 'ok',
      service: 'openai-assistants',
      timestamp: new Date().toISOString(),
      available_assistants: 5
    });
  } catch (error) {
    logger.error('Error checking assistants health:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;