import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { GrantsService, OrganizationProfile } from '../services/grantsService';
import { OpenAIService } from '../services/openaiService';
import { VectorDatabaseService } from '../services/vectorDatabase';
import { UserPreferencesService } from '../services/userPreferencesService';
import { ApplicationAssistanceService } from '../services/applicationAssistanceService';
import { DatabaseService } from '../services/database';
import { logger } from '../services/logger';

const router = express.Router();
const grantsService = new GrantsService();
const openaiService = new OpenAIService();
const vectorService = new VectorDatabaseService();
const dbService = new DatabaseService();
const userPreferencesService = new UserPreferencesService(dbService, vectorService, openaiService);
const applicationAssistanceService = new ApplicationAssistanceService(dbService, openaiService, userPreferencesService);

/**
 * @swagger
 * components:
 *   schemas:
 *     OrganizationProfile:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - description
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Organization ID
 *         name:
 *           type: string
 *           description: Organization name
 *         description:
 *           type: string
 *           description: Organization description
 *         sector:
 *           type: string
 *           description: Business sector
 *         size:
 *           type: string
 *           enum: [startup, small, medium, large, enterprise]
 *           description: Organization size
 *         location:
 *           type: string
 *           description: Geographic location
 *         capabilities:
 *           type: array
 *           items:
 *             type: string
 *           description: Technical capabilities and expertise
 *         previousGrants:
 *           type: array
 *           items:
 *             type: string
 *           description: Previously received grants
 *     
 *     GrantMatchResult:
 *       type: object
 *       properties:
 *         grant:
 *           $ref: '#/components/schemas/Grant'
 *         matchScore:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: AI-calculated match score (0-100)
 *         analysisResult:
 *           type: object
 *           properties:
 *             overallCompatibility:
 *               type: number
 *             eligibilityStatus:
 *               type: string
 *               enum: [ELIGIBLE, PARTIALLY_ELIGIBLE, NOT_ELIGIBLE, UNCLEAR]
 *             matchingCriteria:
 *               type: array
 *               items:
 *                 type: string
 *             recommendations:
 *               type: array
 *               items:
 *                 type: string
 *             reasoning:
 *               type: string
 *             confidence:
 *               type: number
 *         semanticSimilarity:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           description: Vector similarity score
 *         reasoning:
 *           type: string
 *           description: AI-generated reasoning for the match
 *         recommendations:
 *           type: array
 *           items:
 *             type: string
 *           description: AI-generated recommendations
 *     
 *     SemanticSearchResult:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         similarity:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         metadata:
 *           type: object
 *         reasoning:
 *           type: string
 *     
 *     AIHealthStatus:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [healthy, unhealthy]
 *         grantsProcessed:
 *           type: integer
 *         vectorsStored:
 *           type: integer
 *         aiInteractions:
 *           type: integer
 *         errors:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /ai/grants/match:
 *   post:
 *     summary: Find grants matching organization profile using AI
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationProfile
 *             properties:
 *               organizationProfile:
 *                 $ref: '#/components/schemas/OrganizationProfile'
 *               filters:
 *                 type: object
 *                 properties:
 *                   search:
 *                     type: string
 *                   categories:
 *                     type: array
 *                     items:
 *                       type: string
 *                   amountMin:
 *                     type: number
 *                   amountMax:
 *                     type: number
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 10
 *     responses:
 *       200:
 *         description: AI-matched grants found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 matches:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GrantMatchResult'
 *                 processingTime:
 *                   type: number
 *                   description: Processing time in milliseconds
 *                 aiModel:
 *                   type: string
 *                   description: AI model used for analysis
 *       400:
 *         description: Invalid organization profile
 *       500:
 *         description: AI processing error
 */
router.post('/grants/match', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { organizationProfile, filters = {}, limit = 10 } = req.body;

  if (!organizationProfile || !organizationProfile.id || !organizationProfile.name) {
    return res.status(400).json({
      error: 'Invalid organization profile',
      message: 'organizationProfile with id and name is required'
    });
  }

  try {
    logger.info('AI grant matching request', {
      orgId: organizationProfile.id,
      orgName: organizationProfile.name,
      filters,
      limit
    });

    const matchResults = await grantsService.findMatchingGrants(
      organizationProfile,
      filters,
      limit
    );

    const processingTime = Date.now() - startTime;

    logger.info('AI grant matching completed', {
      orgId: organizationProfile.id,
      matchesFound: matchResults.length,
      processingTime
    });

    res.json({
      matches: matchResults,
      processingTime,
      aiModel: 'gpt-4o-mini',
      metadata: {
        totalMatches: matchResults.length,
        averageScore: matchResults.length > 0 
          ? matchResults.reduce((sum, match) => sum + match.matchScore, 0) / matchResults.length 
          : 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('AI grant matching failed', {
      error: error instanceof Error ? error.message : String(error),
      orgId: organizationProfile.id,
      processingTime: Date.now() - startTime
    });
    
    // Provide fallback mock data when AI services are unavailable
    logger.info('Providing fallback mock grant data due to AI service unavailability');
    
    const mockMatches = [
      {
        grant: {
          id: 'mock-grant-1',
          title: 'Enterprise Ireland Innovation Partnership',
          description: 'Funding for collaborative R&D projects between companies and research institutes focusing on breakthrough innovations.',
          funder: 'Enterprise Ireland',
          funder_type: 'government',
          amount_min: 25000,
          amount_max: 200000,
          currency: 'EUR',
          deadline: new Date('2025-06-15'),
          categories: ['Innovation', 'R&D'],
          eligibility_criteria: {
            sector: 'Technology',
            stage: 'Growth',
            location: 'Ireland'
          },
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        matchScore: 92,
        reasoning: 'High match based on technology sector and innovation focus',
        confidence: 0.85
      },
      {
        grant: {
          id: 'mock-grant-2',
          title: 'SFI Discover Programme',
          description: 'Science Foundation Ireland programme supporting public engagement with STEM research and innovation.',
          funder: 'Science Foundation Ireland',
          funder_type: 'government',
          amount_min: 15000,
          amount_max: 50000,
          currency: 'EUR',
          deadline: new Date('2025-07-20'),
          categories: ['Research', 'STEM'],
          eligibility_criteria: {
            sector: 'Research',
            stage: 'Any',
            location: 'Ireland'
          },
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        matchScore: 78,
        reasoning: 'Good match for research and innovation activities',
        confidence: 0.72
      },
      {
        grant: {
          id: 'mock-grant-3',
          title: 'Horizon Europe EIC Accelerator',
          description: 'European Innovation Council support for high-risk, high-impact innovation with significant market potential.',
          funder: 'European Commission',
          funder_type: 'eu',
          amount_min: 500000,
          amount_max: 2500000,
          currency: 'EUR',
          deadline: new Date('2025-08-30'),
          categories: ['Innovation', 'Deep Tech'],
          eligibility_criteria: {
            sector: 'Technology',
            stage: 'Scale-up',
            location: 'EU'
          },
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        matchScore: 85,
        reasoning: 'Excellent match for deep tech innovation and scaling',
        confidence: 0.88
      }
    ];

    const processingTime = Date.now() - startTime;

    res.json({
      matches: mockMatches,
      processingTime,
      aiModel: 'mock-fallback',
      metadata: {
        totalMatches: mockMatches.length,
        averageScore: mockMatches.reduce((sum, match) => sum + match.matchScore, 0) / mockMatches.length,
        timestamp: new Date().toISOString(),
        note: 'Using fallback mock data due to AI service unavailability'
      }
    });
  }
}));

/**
 * @swagger
 * /ai/grants/search/semantic:
 *   post:
 *     summary: Perform semantic search for grants
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language search query
 *               organizationId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional organization ID for enhanced context
 *               filters:
 *                 type: object
 *                 properties:
 *                   categories:
 *                     type: array
 *                     items:
 *                       type: string
 *                   amountRange:
 *                     type: object
 *                     properties:
 *                       min:
 *                         type: number
 *                       max:
 *                         type: number
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 10
 *     responses:
 *       200:
 *         description: Semantic search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SemanticSearchResult'
 *                 query:
 *                   type: string
 *                 processingTime:
 *                   type: number
 *                 totalResults:
 *                   type: integer
 */
router.post('/grants/search/semantic', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { query, organizationId, filters = {}, limit = 10 } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid search query',
      message: 'query string is required and cannot be empty'
    });
  }

  try {
    logger.info('Semantic search request', {
      query: query.substring(0, 100),
      organizationId,
      limit
    });

    const searchResults = await grantsService.semanticSearchGrants(
      query.trim(),
      organizationId,
      filters,
      limit
    );

    const processingTime = Date.now() - startTime;

    logger.info('Semantic search completed', {
      query: query.substring(0, 100),
      resultsFound: searchResults.length,
      processingTime
    });

    res.json({
      results: searchResults,
      query: query.trim(),
      processingTime,
      totalResults: searchResults.length,
      metadata: {
        enhanced: !!organizationId,
        filters,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Semantic search failed', {
      error: error instanceof Error ? error.message : String(error),
      query: query.substring(0, 100),
      processingTime: Date.now() - startTime
    });
    
    res.status(500).json({
      error: 'Semantic search failed',
      message: 'Unable to process search request',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/grants/process:
 *   post:
 *     summary: Process grants with AI analysis and vector storage
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batchSize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 10
 *                 description: Number of grants to process in batch
 *               forceReprocess:
 *                 type: boolean
 *                 default: false
 *                 description: Reprocess already processed grants
 *     responses:
 *       200:
 *         description: Batch processing completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 processed:
 *                   type: integer
 *                 failed:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                 processingTime:
 *                   type: number
 *       500:
 *         description: Batch processing failed
 */
router.post('/grants/process', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { batchSize = 10, forceReprocess = false } = req.body;

  try {
    logger.info('Starting AI grant processing batch', {
      batchSize,
      forceReprocess
    });

    const result = await grantsService.batchProcessGrants(batchSize);
    const processingTime = Date.now() - startTime;

    logger.info('AI grant processing batch completed', {
      ...result,
      processingTime
    });

    res.json({
      ...result,
      processingTime,
      metadata: {
        batchSize,
        successRate: result.processed / (result.processed + result.failed),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('AI grant processing batch failed', {
      error: error instanceof Error ? error.message : String(error),
      batchSize,
      processingTime
    });
    
    res.status(500).json({
      error: 'Batch processing failed',
      message: 'Unable to process grants',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/grants/{grantId}/analyze:
 *   post:
 *     summary: Analyze specific grant for organization compatibility
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationProfile
 *             properties:
 *               organizationProfile:
 *                 $ref: '#/components/schemas/OrganizationProfile'
 *               query:
 *                 type: string
 *                 description: Specific analysis query
 *     responses:
 *       200:
 *         description: Grant analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 grantId:
 *                   type: string
 *                 organizationId:
 *                   type: string
 *                 analysis:
 *                   type: object
 *                   properties:
 *                     overallCompatibility:
 *                       type: number
 *                     eligibilityStatus:
 *                       type: string
 *                     matchingCriteria:
 *                       type: array
 *                       items:
 *                         type: string
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *                     reasoning:
 *                       type: string
 *                     confidence:
 *                       type: number
 *                 processingTime:
 *                   type: number
 *       404:
 *         description: Grant not found
 */
router.post('/grants/:grantId/analyze', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { grantId } = req.params;
  const { organizationProfile, query } = req.body;

  if (!organizationProfile || !organizationProfile.id) {
    return res.status(400).json({
      error: 'Invalid organization profile',
      message: 'organizationProfile with id is required'
    });
  }

  try {
    // Get the specific grant
    const grant = await grantsService['findGrantById'](grantId);
    if (!grant) {
      return res.status(404).json({
        error: 'Grant not found',
        message: `Grant with ID ${grantId} does not exist`
      });
    }

    logger.info('AI grant analysis request', {
      grantId,
      orgId: organizationProfile.id,
      hasQuery: !!query
    });

    // Create organization profile text and grant text for analysis
    const orgProfileText = grantsService['constructOrganizationProfileText'](organizationProfile);
    const grantText = grantsService['constructGrantText'](grant);

    // Perform AI analysis
    const analysis = await openaiService.analyzeGrantRelevance(
      orgProfileText,
      grantText,
      query
    );

    const processingTime = Date.now() - startTime;

    logger.info('AI grant analysis completed', {
      grantId,
      orgId: organizationProfile.id,
      compatibility: analysis.overallCompatibility,
      processingTime
    });

    res.json({
      grantId,
      organizationId: organizationProfile.id,
      analysis,
      processingTime,
      metadata: {
        grantTitle: grant.title,
        analysisFocus: query || 'general_compatibility',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('AI grant analysis failed', {
      error: error instanceof Error ? error.message : String(error),
      grantId,
      orgId: organizationProfile?.id,
      processingTime
    });
    
    res.status(500).json({
      error: 'Grant analysis failed',
      message: 'Unable to analyze grant compatibility',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/health:
 *   get:
 *     summary: Get AI services health status
 *     tags: [AI]
 *     responses:
 *       200:
 *         description: AI services health status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AIHealthStatus'
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const healthStatus = await grantsService.healthCheck();
    
    res.json({
      ...healthStatus,
      timestamp: new Date().toISOString(),
      services: {
        grants: healthStatus.status,
        openai: healthStatus.status === 'healthy' ? 'healthy' : 'unknown',
        vectorDb: healthStatus.status === 'healthy' ? 'healthy' : 'unknown'
      }
    });
  } catch (error) {
    logger.error('AI health check failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * @swagger
 * /ai/stats:
 *   get:
 *     summary: Get AI processing statistics
 *     tags: [AI]
 *     responses:
 *       200:
 *         description: AI processing statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 grantsProcessed:
 *                   type: integer
 *                 vectorsStored:
 *                   type: integer
 *                 aiInteractions24h:
 *                   type: integer
 *                 averageProcessingTime:
 *                   type: number
 *                 successRate:
 *                   type: number
 *                 lastProcessed:
 *                   type: string
 *                   format: date-time
 */
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const healthStatus = await grantsService.healthCheck();
    
    // Additional stats would require specific database queries
    // For now, return basic stats from health check
    res.json({
      grantsProcessed: healthStatus.grantsProcessed,
      vectorsStored: healthStatus.vectorsStored,
      aiInteractions24h: healthStatus.aiInteractions,
      status: healthStatus.status,
      timestamp: new Date().toISOString(),
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    logger.error('AI stats retrieval failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({
      error: 'Stats retrieval failed',
      message: 'Unable to retrieve AI statistics',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/users/{userId}/interactions:
 *   post:
 *     summary: Record user interaction with a grant
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grantId
 *               - interactionType
 *             properties:
 *               grantId:
 *                 type: string
 *                 format: uuid
 *               interactionType:
 *                 type: string
 *                 enum: [view, favorite, apply, share, dismiss]
 *               context:
 *                 type: object
 *                 description: Additional context about the interaction
 *     responses:
 *       200:
 *         description: Interaction recorded successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/users/:userId/interactions', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { grantId, interactionType, context } = req.body;

  if (!grantId || !interactionType) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'grantId and interactionType are required'
    });
  }

  const validInteractionTypes = ['view', 'favorite', 'apply', 'share', 'dismiss'];
  if (!validInteractionTypes.includes(interactionType)) {
    return res.status(400).json({
      error: 'Invalid interaction type',
      message: `interactionType must be one of: ${validInteractionTypes.join(', ')}`
    });
  }

  try {
    await userPreferencesService.recordInteraction({
      user_id: userId,
      grant_id: grantId,
      interaction_type: interactionType,
      context
    });

    logger.info('User interaction recorded', { userId, grantId, interactionType });

    res.json({
      success: true,
      message: 'Interaction recorded successfully',
      data: {
        userId,
        grantId,
        interactionType,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to record interaction', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      grantId,
      interactionType
    });

    res.status(500).json({
      error: 'Failed to record interaction',
      message: 'Unable to process interaction recording',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/users/{userId}/recommendations:
 *   get:
 *     summary: Get personalized grant recommendations for user
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: context
 *         schema:
 *           type: string
 *           enum: [dashboard, search, email, mobile]
 *           default: dashboard
 *       - in: query
 *         name: excludeGrantIds
 *         schema:
 *           type: string
 *           description: Comma-separated list of grant IDs to exclude
 *       - in: query
 *         name: boostCategories
 *         schema:
 *           type: string
 *           description: Comma-separated list of categories to boost
 *     responses:
 *       200:
 *         description: Personalized recommendations generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       grantId:
 *                         type: string
 *                       score:
 *                         type: number
 *                       reasoning:
 *                         type: object
 *                       explanation:
 *                         type: array
 *                         items:
 *                           type: string
 *                 processingTime:
 *                   type: number
 *                 userProfile:
 *                   type: object
 *                   properties:
 *                     totalInteractions:
 *                       type: integer
 *                     topCategories:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/users/:userId/recommendations', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { userId } = req.params;
  const { 
    limit = 10, 
    context = 'dashboard',
    excludeGrantIds,
    boostCategories 
  } = req.query;

  try {
    const request = {
      user_id: userId,
      limit: parseInt(limit as string),
      context: context as any,
      exclude_grant_ids: excludeGrantIds ? (excludeGrantIds as string).split(',') : undefined,
      boost_categories: boostCategories ? (boostCategories as string).split(',') : undefined
    };

    logger.info('Generating personalized recommendations', {
      userId,
      limit: request.limit,
      context: request.context
    });

    const recommendations = await userPreferencesService.getRecommendations(request);
    const userProfile = await userPreferencesService.getUserProfile(userId);
    const processingTime = Date.now() - startTime;

    logger.info('Personalized recommendations generated', {
      userId,
      recommendationsCount: recommendations.length,
      processingTime
    });

    res.json({
      recommendations,
      processingTime,
      userProfile: {
        totalInteractions: userProfile.learning_metrics.total_interactions,
        topCategories: userProfile.learning_metrics.favorite_categories.slice(0, 5),
        preferredFunders: userProfile.learning_metrics.preferred_funders.slice(0, 3),
        avgGrantAmount: userProfile.learning_metrics.avg_grant_amount
      },
      metadata: {
        requestContext: request.context,
        excludedGrants: request.exclude_grant_ids?.length || 0,
        boostedCategories: request.boost_categories?.length || 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Failed to generate recommendations', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      processingTime
    });

    res.status(500).json({
      error: 'Failed to generate recommendations',
      message: 'Unable to process recommendation request',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/users/{userId}/profile:
 *   get:
 *     summary: Get user's learning profile and preferences
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 preferences:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       value:
 *                         type: string
 *                       weight:
 *                         type: number
 *                 learningMetrics:
 *                   type: object
 *                 recentInteractions:
 *                   type: array
 */
router.get('/users/:userId/profile', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    logger.info('Retrieving user profile', { userId });

    const userProfile = await userPreferencesService.getUserProfile(userId);

    res.json({
      userId: userProfile.user_id,
      preferences: userProfile.preferences.map(pref => ({
        type: pref.preference_type,
        value: pref.preference_value,
        weight: pref.weight,
        updatedAt: pref.updated_at
      })),
      learningMetrics: userProfile.learning_metrics,
      recentInteractions: userProfile.interactions.slice(0, 10).map(interaction => ({
        grantId: interaction.grant_id,
        type: interaction.interaction_type,
        timestamp: interaction.timestamp,
        context: interaction.context
      })),
      metadata: {
        profileLastUpdated: new Date().toISOString(),
        dataPoints: userProfile.preferences.length + userProfile.interactions.length
      }
    });
  } catch (error) {
    logger.error('Failed to retrieve user profile', {
      error: error instanceof Error ? error.message : String(error),
      userId
    });

    res.status(500).json({
      error: 'Failed to retrieve user profile',
      message: 'Unable to load user profile data',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/users/{userId}/preferences:
 *   put:
 *     summary: Batch update user preferences
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - preferences
 *             properties:
 *               preferences:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [category, funder_type, amount_range, location, keyword]
 *                     value:
 *                       type: string
 *                     weight:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 1
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       400:
 *         description: Invalid preference data
 */
router.put('/users/:userId/preferences', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { preferences } = req.body;

  if (!Array.isArray(preferences)) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'preferences must be an array'
    });
  }

  try {
    logger.info('Batch updating user preferences', {
      userId,
      preferencesCount: preferences.length
    });

    const formattedPreferences = preferences.map(pref => ({
      preference_type: pref.type as any,
      preference_value: pref.value,
      weight: pref.weight
    }));

    await userPreferencesService.batchUpdatePreferences(userId, formattedPreferences);

    logger.info('User preferences updated successfully', {
      userId,
      updatedCount: preferences.length
    });

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        userId,
        updatedPreferences: preferences.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to update user preferences', {
      error: error instanceof Error ? error.message : String(error),
      userId
    });

    res.status(500).json({
      error: 'Failed to update preferences',
      message: 'Unable to process preference updates',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/recommendations/explain/{userId}/{grantId}:
 *   get:
 *     summary: Explain why a specific grant was recommended to a user
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: grantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Recommendation explanation generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 score:
 *                   type: number
 *                 reasoning:
 *                   type: object
 *                 explanation:
 *                   type: array
 *                   items:
 *                     type: string
 *                 userProfile:
 *                   type: object
 */
router.get('/recommendations/explain/:userId/:grantId', asyncHandler(async (req, res) => {
  const { userId, grantId } = req.params;

  try {
    logger.info('Explaining recommendation', { userId, grantId });

    const explanation = await userPreferencesService.explainRecommendation(userId, grantId);

    res.json({
      userId,
      grantId,
      score: explanation.score,
      reasoning: explanation.reasoning,
      explanation: explanation.explanation,
      userProfile: {
        totalInteractions: explanation.userProfile.learning_metrics.total_interactions,
        topCategories: explanation.userProfile.learning_metrics.favorite_categories,
        topPreferences: explanation.userProfile.preferences
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 5)
          .map(pref => ({
            type: pref.preference_type,
            value: pref.preference_value,
            weight: pref.weight
          }))
      },
      metadata: {
        explanationGenerated: new Date().toISOString(),
        modelVersion: '1.0.0'
      }
    });
  } catch (error) {
    logger.error('Failed to explain recommendation', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      grantId
    });

    res.status(500).json({
      error: 'Failed to explain recommendation',
      message: 'Unable to generate recommendation explanation',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/applications/smart-form:
 *   post:
 *     summary: Create AI-powered smart form with pre-filling and suggestions
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - grantId
 *               - organizationProfile
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               grantId:
 *                 type: string
 *                 format: uuid
 *               organizationProfile:
 *                 type: object
 *               previousApplications:
 *                 type: array
 *                 items:
 *                   type: string
 *               draftId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Smart form created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 template:
 *                   type: object
 *                 preFilledData:
 *                   type: object
 *                 aiSuggestions:
 *                   type: array
 *                 estimatedCompletionTime:
 *                   type: integer
 *                 successProbability:
 *                   type: number
 *                 nextRecommendedSections:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/applications/smart-form', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { userId, grantId, organizationProfile, previousApplications, draftId } = req.body;

  if (!userId || !grantId || !organizationProfile) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'userId, grantId, and organizationProfile are required'
    });
  }

  try {
    logger.info('Creating smart form', { userId, grantId, hasDraft: !!draftId });

    const smartFormResponse = await applicationAssistanceService.createSmartForm({
      user_id: userId,
      grant_id: grantId,
      organization_profile: organizationProfile,
      previous_applications: previousApplications,
      draft_id: draftId
    });

    const processingTime = Date.now() - startTime;

    logger.info('Smart form created successfully', {
      userId,
      grantId,
      processingTime,
      preFilledFields: Object.keys(smartFormResponse.pre_filled_data).length,
      suggestionsCount: smartFormResponse.ai_suggestions.length
    });

    res.json({
      ...smartFormResponse,
      processingTime,
      metadata: {
        aiModel: 'gpt-4o-mini',
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Failed to create smart form', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      grantId,
      processingTime
    });

    res.status(500).json({
      error: 'Smart form creation failed',
      message: 'Unable to generate smart form',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/applications/content/generate:
 *   post:
 *     summary: Generate AI-powered content for application sections
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - grantId
 *               - sectionType
 *               - contextData
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               grantId:
 *                 type: string
 *                 format: uuid
 *               sectionType:
 *                 type: string
 *               userInput:
 *                 type: string
 *               contextData:
 *                 type: object
 *               targetLength:
 *                 type: integer
 *               tone:
 *                 type: string
 *                 enum: [professional, academic, persuasive, technical]
 *     responses:
 *       200:
 *         description: Content generated successfully
 */
router.post('/applications/content/generate', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { userId, grantId, sectionType, userInput, contextData, targetLength, tone } = req.body;

  if (!userId || !grantId || !sectionType || !contextData) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'userId, grantId, sectionType, and contextData are required'
    });
  }

  try {
    logger.info('Generating content', { userId, grantId, sectionType, targetLength, tone });

    const contentResponse = await applicationAssistanceService.generateSectionContent({
      user_id: userId,
      grant_id: grantId,
      section_type: sectionType,
      user_input: userInput,
      context_data: contextData,
      target_length: targetLength,
      tone: tone
    });

    const processingTime = Date.now() - startTime;

    logger.info('Content generated successfully', {
      userId,
      grantId,
      sectionType,
      wordCount: contentResponse.word_count,
      estimatedScore: contentResponse.estimated_score,
      processingTime
    });

    res.json({
      ...contentResponse,
      processingTime,
      metadata: {
        aiModel: 'gpt-4o-mini',
        generatedAt: new Date().toISOString(),
        sectionType,
        tone: tone || 'professional'
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Failed to generate content', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      grantId,
      sectionType,
      processingTime
    });

    res.status(500).json({
      error: 'Content generation failed',
      message: 'Unable to generate section content',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/applications/{draftId}/validate:
 *   post:
 *     summary: Validate application with AI-powered suggestions
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: draftId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Application validated successfully
 */
router.post('/applications/:draftId/validate', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { draftId } = req.params;

  try {
    logger.info('Validating application', { draftId });

    const validationResults = await applicationAssistanceService.validateApplication(draftId);
    const processingTime = Date.now() - startTime;

    logger.info('Application validation completed', {
      draftId,
      overallScore: validationResults.overall_score,
      completionPercentage: validationResults.completion_percentage,
      criticalIssues: validationResults.critical_issues.length,
      processingTime
    });

    res.json({
      ...validationResults,
      processingTime,
      metadata: {
        validatedAt: new Date().toISOString(),
        aiModel: 'gpt-4o-mini'
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Failed to validate application', {
      error: error instanceof Error ? error.message : String(error),
      draftId,
      processingTime
    });

    res.status(500).json({
      error: 'Application validation failed',
      message: 'Unable to validate application',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/applications/{draftId}/auto-complete:
 *   post:
 *     summary: Auto-complete form fields using AI
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: draftId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fieldNames
 *             properties:
 *               fieldNames:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Fields auto-completed successfully
 */
router.post('/applications/:draftId/auto-complete', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { draftId } = req.params;
  const { fieldNames } = req.body;

  if (!fieldNames || !Array.isArray(fieldNames)) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'fieldNames array is required'
    });
  }

  try {
    logger.info('Auto-completing fields', { draftId, fieldCount: fieldNames.length });

    const autoCompletedFields = await applicationAssistanceService.autoCompleteFields(draftId, fieldNames);
    const processingTime = Date.now() - startTime;

    const highConfidenceFields = Object.values(autoCompletedFields).filter(f => f.confidence > 0.7).length;

    logger.info('Auto-completion completed', {
      draftId,
      fieldsProcessed: fieldNames.length,
      fieldsCompleted: Object.keys(autoCompletedFields).length,
      highConfidenceFields,
      processingTime
    });

    res.json({
      autoCompletedFields,
      summary: {
        fieldsProcessed: fieldNames.length,
        fieldsCompleted: Object.keys(autoCompletedFields).length,
        highConfidenceFields,
        averageConfidence: Object.values(autoCompletedFields).reduce((sum, f) => sum + f.confidence, 0) / Object.keys(autoCompletedFields).length
      },
      processingTime,
      metadata: {
        completedAt: new Date().toISOString(),
        aiModel: 'gpt-4o-mini'
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Failed to auto-complete fields', {
      error: error instanceof Error ? error.message : String(error),
      draftId,
      fieldNames,
      processingTime
    });

    res.status(500).json({
      error: 'Auto-completion failed',
      message: 'Unable to auto-complete fields',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

/**
 * @swagger
 * /ai/applications/{draftId}/writing-suggestions:
 *   get:
 *     summary: Get AI-powered writing suggestions for application content
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: draftId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Writing suggestions generated successfully
 */
router.get('/applications/:draftId/writing-suggestions', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { draftId } = req.params;
  const { sectionId } = req.query;

  if (!sectionId) {
    return res.status(400).json({
      error: 'Missing parameter',
      message: 'sectionId query parameter is required'
    });
  }

  try {
    logger.info('Getting writing suggestions', { draftId, sectionId });

    const writingSuggestions = await applicationAssistanceService.getWritingSuggestions(
      draftId,
      sectionId as string
    );

    const processingTime = Date.now() - startTime;

    logger.info('Writing suggestions generated', {
      draftId,
      sectionId,
      suggestionsCount: writingSuggestions.suggestions.length,
      readabilityScore: writingSuggestions.readability.score,
      missingKeywords: writingSuggestions.keyword_optimization.missing_keywords.length,
      processingTime
    });

    res.json({
      ...writingSuggestions,
      processingTime,
      metadata: {
        analyzedAt: new Date().toISOString(),
        sectionId,
        aiModel: 'gpt-4o-mini'
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Failed to get writing suggestions', {
      error: error instanceof Error ? error.message : String(error),
      draftId,
      sectionId,
      processingTime
    });

    res.status(500).json({
      error: 'Writing suggestions failed',
      message: 'Unable to generate writing suggestions',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}));

export default router;