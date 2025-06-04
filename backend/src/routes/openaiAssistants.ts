import express from 'express';
import { openaiAssistantsService } from '../services/openaiAssistantsService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { logger } from '../services/logger';

const router = express.Router();

// Rate limiting for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many AI requests, please try again later'
});

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
 * POST /api/assistants/:assistantKey/threads
 * Create a new conversation thread with an assistant
 */
router.post('/:assistantKey/threads', authenticateToken, aiRateLimit, async (req: AuthenticatedRequest, res) => {
  try {
    const { assistantKey } = req.params;
    const { grantApplicationId, metadata } = req.body;
    const userId = req.user!.id;

    const thread = await openaiAssistantsService.createThread(
      assistantKey,
      userId,
      grantApplicationId,
      metadata
    );

    res.status(201).json({
      threadId: thread.id,
      assistantKey,
      createdAt: thread.createdAt,
      metadata: thread.metadata
    });
  } catch (error) {
    logger.error('Error creating assistant thread:', error);
    res.status(500).json({ error: 'Failed to create assistant thread' });
  }
});

/**
 * GET /api/assistants/threads
 * Get user's assistant threads
 */
router.get('/threads', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { assistantKey, grantApplicationId } = req.query;

    let threads = await openaiAssistantsService.getAssistantThreads(userId);

    // Filter by assistant key if provided
    if (assistantKey) {
      const assistant = await openaiAssistantsService.getAssistant(assistantKey as string);
      if (assistant) {
        threads = threads.filter(thread => thread.assistantId === assistant.id);
      }
    }

    // Filter by grant application if provided
    if (grantApplicationId) {
      threads = threads.filter(thread => thread.grantApplicationId === grantApplicationId);
    }

    res.json({
      threads: threads.map(thread => ({
        id: thread.id,
        assistantId: thread.assistantId,
        grantApplicationId: thread.grantApplicationId,
        metadata: thread.metadata,
        createdAt: thread.createdAt
      })),
      totalCount: threads.length
    });
  } catch (error) {
    logger.error('Error fetching assistant threads:', error);
    res.status(500).json({ error: 'Failed to fetch assistant threads' });
  }
});

/**
 * POST /api/assistants/:assistantKey/generate-section
 * Generate a grant proposal section using an assistant
 */
router.post('/:assistantKey/generate-section', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { assistantKey } = req.params;
    const {
      threadId,
      sectionType,
      grantType,
      fundingBody,
      requirements,
      wordLimit,
      previousSections,
      organizationProfile
    } = req.body;

    // Validate required fields
    if (!threadId || !sectionType || !grantType || !fundingBody) {
      return res.status(400).json({
        error: 'Missing required fields: threadId, sectionType, grantType, fundingBody'
      });
    }

    // Set up streaming if client supports it
    const isStreaming = req.headers.accept?.includes('text/stream');
    
    if (isStreaming) {
      res.writeHead(200, {
        'Content-Type': 'text/stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
    }

    const result = await openaiAssistantsService.generateProposalSection(
      assistantKey,
      threadId,
      sectionType,
      {
        grantType,
        fundingBody,
        requirements: requirements || [],
        wordLimit,
        previousSections,
        organizationProfile
      },
      isStreaming ? (chunk: string) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      } : undefined
    );

    if (isStreaming) {
      res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
      res.end();
    } else {
      res.json({
        success: true,
        content: result.text,
        confidence: result.confidence,
        suggestions: result.suggestions,
        metadata: {
          tokensUsed: result.tokensUsed,
          processingTime: result.processingTime,
          threadId: result.threadId,
          runId: result.runId
        }
      });
    }
  } catch (error) {
    logger.error('Error generating section:', error);
    
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Section generation failed' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Failed to generate section' });
    }
  }
});

/**
 * POST /api/assistants/compliance-checker/check
 * Check grant application compliance
 */
router.post('/compliance-checker/check', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { threadId, applicationData, grantScheme } = req.body;

    if (!threadId || !applicationData || !grantScheme) {
      return res.status(400).json({
        error: 'Missing required fields: threadId, applicationData, grantScheme'
      });
    }

    const result = await openaiAssistantsService.checkCompliance(
      threadId,
      applicationData,
      grantScheme
    );

    res.json({
      success: true,
      overallScore: result.overallScore,
      issues: result.issues,
      suggestions: result.suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error checking compliance:', error);
    res.status(500).json({ error: 'Failed to check compliance' });
  }
});

/**
 * POST /api/assistants/budget-analyst/optimize
 * Optimize budget allocation
 */
router.post('/budget-analyst/optimize', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { threadId, budgetData, projectScope, fundingRules } = req.body;

    if (!threadId || !budgetData || !projectScope || !fundingRules) {
      return res.status(400).json({
        error: 'Missing required fields: threadId, budgetData, projectScope, fundingRules'
      });
    }

    const result = await openaiAssistantsService.optimizeBudget(
      threadId,
      budgetData,
      projectScope,
      fundingRules
    );

    res.json({
      success: true,
      optimizedBudget: result.optimizedBudget,
      savings: result.savings,
      recommendations: result.recommendations,
      warnings: result.warnings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error optimizing budget:', error);
    res.status(500).json({ error: 'Failed to optimize budget' });
  }
});

/**
 * DELETE /api/assistants/threads/:threadId
 * Delete an assistant thread
 */
router.delete('/threads/:threadId', authenticateToken, async (req, res) => {
  try {
    const { threadId } = req.params;

    await openaiAssistantsService.deleteThread(threadId);

    res.json({
      success: true,
      message: 'Thread deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting thread:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

/**
 * GET /api/assistants/analytics
 * Get assistant usage analytics
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, assistantKey } = req.query;

    // This would be implemented with database queries
    // For now, return mock data structure
    const analytics = {
      usage: {
        totalInteractions: 0,
        totalTokens: 0,
        totalCost: 0,
        avgConfidence: 0,
        avgProcessingTime: 0
      },
      byAssistant: {},
      trends: {
        daily: [],
        weekly: []
      },
      topSections: [],
      userSatisfaction: {
        avgRating: 0,
        totalRatings: 0
      }
    };

    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
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

    await openaiAssistantsService.initializeAssistants();

    res.json({
      success: true,
      message: 'Assistants initialized successfully'
    });
  } catch (error) {
    logger.error('Error initializing assistants:', error);
    res.status(500).json({ error: 'Failed to initialize assistants' });
  }
});

/**
 * POST /api/assistants/threads/:threadId/rate
 * Rate an assistant interaction
 */
router.post('/threads/:threadId/rate', authenticateToken, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }

    // Store rating in database
    // This would be implemented with the actual rating storage logic

    res.json({
      success: true,
      message: 'Rating submitted successfully'
    });
  } catch (error) {
    logger.error('Error submitting rating:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

export default router;