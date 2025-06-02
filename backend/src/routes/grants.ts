import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { GrantsRepository, GrantFilters } from '../repositories/grantsRepository';
import { GrantsService } from '../services/grantsService';
import { logger } from '../services/logger';

const router = express.Router();
const grantsRepo = new GrantsRepository();
const grantsService = new GrantsService();

/**
 * @swagger
 * components:
 *   schemas:
 *     Grant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Grant ID
 *         title:
 *           type: string
 *           description: Grant title
 *         description:
 *           type: string
 *           description: Full grant description
 *         summary:
 *           type: string
 *           description: Brief grant summary
 *         deadline:
 *           type: string
 *           format: date-time
 *           description: Application deadline
 *         funder:
 *           type: string
 *           description: Funding organization
 *         funder_type:
 *           type: string
 *           enum: [government, eu, private, foundation, other]
 *           description: Type of funding organization
 *         amount_min:
 *           type: number
 *           description: Minimum funding amount
 *         amount_max:
 *           type: number
 *           description: Maximum funding amount
 *         currency:
 *           type: string
 *           default: EUR
 *           description: Currency code
 *         url:
 *           type: string
 *           format: uri
 *           description: Grant application URL
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *           description: Grant categories/tags
 *         eligibility_criteria:
 *           type: object
 *           description: Eligibility requirements
 *         required_documents:
 *           type: array
 *           items:
 *             type: string
 *           description: Required document types
 *         application_process:
 *           type: string
 *           description: Application process details
 *         is_active:
 *           type: boolean
 *           description: Whether grant is currently accepting applications
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /grants:
 *   get:
 *     summary: Get list of grants with advanced filtering
 *     tags: [Grants]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of grants per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for grant title/description/funder
 *       - in: query
 *         name: funder
 *         schema:
 *           type: string
 *         description: Filter by funder name
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Comma-separated list of categories
 *       - in: query
 *         name: amount_min
 *         schema:
 *           type: number
 *         description: Minimum funding amount
 *       - in: query
 *         name: amount_max
 *         schema:
 *           type: number
 *         description: Maximum funding amount
 *       - in: query
 *         name: deadline_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter grants with deadline after this date
 *       - in: query
 *         name: deadline_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter grants with deadline before this date
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [deadline, amount, created_at, title]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of grants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 grants:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Grant'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Build filters from query parameters
  const filters: GrantFilters = {
    limit,
    offset,
    sort_by: req.query.sort_by as any || 'created_at',
    sort_order: req.query.sort_order as any || 'DESC'
  };

  if (req.query.search) {
    filters.search = req.query.search as string;
  }

  if (req.query.funder) {
    filters.funder = req.query.funder as string;
  }

  if (req.query.categories) {
    filters.categories = (req.query.categories as string).split(',').map(c => c.trim());
  }

  if (req.query.amount_min) {
    filters.amount_min = Number(req.query.amount_min);
  }

  if (req.query.amount_max) {
    filters.amount_max = Number(req.query.amount_max);
  }

  if (req.query.deadline_from) {
    filters.deadline_from = new Date(req.query.deadline_from as string);
  }

  if (req.query.deadline_to) {
    filters.deadline_to = new Date(req.query.deadline_to as string);
  }

  try {
    const grants = await grantsRepo.findGrants(filters);
    const total = grants.length > 0 ? (grants[0] as any).total_count || 0 : 0;

    // Transform to frontend format
    const grantsResponse = grants.map(grant => ({
      id: grant.id,
      title: grant.title,
      description: grant.description,
      summary: grant.summary,
      deadline: grant.deadline,
      funder: grant.funder,
      funder_type: grant.funder_type,
      amount_min: grant.amount_min,
      amount_max: grant.amount_max,
      currency: grant.currency,
      url: grant.url,
      categories: grant.categories,
      eligibility_criteria: grant.eligibility_criteria,
      required_documents: grant.required_documents,
      application_process: grant.application_process,
      is_active: grant.is_active,
      created_at: grant.created_at,
      updated_at: grant.updated_at
    }));

    res.json({
      grants: grantsResponse,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching grants', { error, filters });
    throw error;
  }
}));

/**
 * @swagger
 * /grants/stats:
 *   get:
 *     summary: Get grant statistics
 *     tags: [Grants]
 *     responses:
 *       200:
 *         description: Grant statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 active:
 *                   type: integer
 *                 expired:
 *                   type: integer
 *                 recent:
 *                   type: integer
 */
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const stats = await grantsRepo.getGrantStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching grant stats', { error });
    throw error;
  }
}));

/**
 * @swagger
 * /grants/discovered:
 *   get:
 *     summary: Get discovered grants from crawler
 *     tags: [Grants]
 *     parameters:
 *       - in: query
 *         name: source_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by grant source
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processed, failed]
 *         description: Filter by processing status
 *     responses:
 *       200:
 *         description: List of discovered grants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/discovered', asyncHandler(async (req, res) => {
  const { source_id, status } = req.query;

  try {
    const discoveredGrants = await grantsRepo.findDiscoveredGrants(
      source_id as string,
      undefined, // job_id
      status as string
    );

    res.json({
      discovered_grants: discoveredGrants,
      count: discoveredGrants.length
    });
  } catch (error) {
    logger.error('Error fetching discovered grants', { error, source_id, status });
    throw error;
  }
}));

/**
 * @swagger
 * /grants/search/ai:
 *   post:
 *     summary: AI-powered grant search based on organization profile
 *     tags: [Grants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - org_profile
 *             properties:
 *               org_profile:
 *                 type: object
 *                 description: Organization profile for matching
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 10
 *                 description: Number of grants to return
 *     responses:
 *       200:
 *         description: AI-matched grants found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 matches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       grant:
 *                         $ref: '#/components/schemas/Grant'
 *                       match_score:
 *                         type: number
 *                       matching_criteria:
 *                         type: object
 *                       ai_analysis:
 *                         type: string
 */
router.post('/search/ai', asyncHandler(async (req, res) => {
  const { org_profile, limit = 10, filters = {} } = req.body;

  if (!org_profile || !org_profile.id || !org_profile.name) {
    return res.status(400).json({
      error: 'Missing organization profile',
      message: 'org_profile with id and name is required for AI matching'
    });
  }

  try {
    logger.info('AI-powered grant search request', {
      orgId: org_profile.id,
      orgName: org_profile.name,
      limit
    });

    // Use the AI-powered grants service for matching
    const matches = await grantsService.findMatchingGrants(
      org_profile,
      filters,
      limit
    );

    // Transform to the expected response format
    const response = matches.map(match => ({
      grant: match.grant,
      match_score: match.matchScore / 100, // Convert to 0-1 scale for backwards compatibility
      matching_criteria: {
        sector_alignment: match.analysisResult.eligibilityStatus === 'ELIGIBLE',
        size_requirements: match.analysisResult.overallCompatibility > 70,
        geographic_eligibility: match.analysisResult.matchingCriteria.length > 0,
        experience_level: match.analysisResult.confidence > 75
      },
      ai_analysis: match.reasoning,
      semantic_similarity: match.semanticSimilarity,
      recommendations: match.recommendations
    }));

    logger.info('AI grant search completed', {
      orgId: org_profile.id,
      matchesFound: response.length,
      avgScore: response.length > 0 
        ? response.reduce((sum, m) => sum + m.match_score, 0) / response.length 
        : 0
    });

    res.json({ 
      matches: response,
      metadata: {
        ai_powered: true,
        processing_time: new Date().toISOString(),
        total_matches: response.length
      }
    });
  } catch (error) {
    logger.error('Error in AI grant search', { error, org_profile });
    throw error;
  }
}));

/**
 * @swagger
 * /grants/{id}:
 *   get:
 *     summary: Get grant by ID
 *     tags: [Grants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Grant ID
 *     responses:
 *       200:
 *         description: Grant retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Grant'
 *       404:
 *         description: Grant not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const grant = await grantsRepo.findGrantById(id);
    
    if (!grant) {
      return res.status(404).json({
        error: 'Grant not found',
        message: `Grant with ID ${id} does not exist`
      });
    }

    res.json(grant);
  } catch (error) {
    logger.error('Error fetching grant by ID', { error, grantId: id });
    throw error;
  }
}));

/**
 * @swagger
 * /grants/{id}/eligibility:
 *   get:
 *     summary: Get eligibility matches for a specific grant
 *     tags: [Grants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Grant ID
 *       - in: query
 *         name: org_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID to check eligibility for
 *     responses:
 *       200:
 *         description: Eligibility match information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 grant_id:
 *                   type: string
 *                 org_id:
 *                   type: string
 *                 match_score:
 *                   type: number
 *                 matching_criteria:
 *                   type: object
 *                 ai_analysis:
 *                   type: string
 *                 recommendation:
 *                   type: string
 */
router.get('/:id/eligibility', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { org_id } = req.query;

  if (!org_id) {
    return res.status(400).json({
      error: 'Missing organization ID',
      message: 'org_id query parameter is required'
    });
  }

  try {
    const grant = await grantsRepo.findGrantById(id);
    if (!grant) {
      return res.status(404).json({
        error: 'Grant not found',
        message: `Grant with ID ${id} does not exist`
      });
    }

    // TODO: Implement AI-based eligibility matching
    // For now, return a mock response
    res.json({
      grant_id: id,
      org_id: org_id as string,
      match_score: 0.85,
      matching_criteria: {
        sector_match: true,
        size_requirements: true,
        location_eligible: true,
        previous_funding: false
      },
      ai_analysis: "This grant appears to be a good match for your organization based on sector alignment and geographic eligibility. Consider highlighting your innovation capabilities in the application.",
      recommendation: "highly_recommended"
    });
  } catch (error) {
    logger.error('Error checking grant eligibility', { error, grantId: id, orgId: org_id });
    throw error;
  }
}));

/**
 * @swagger
 * /grants/discovered/{id}/process:
 *   post:
 *     summary: Process a discovered grant into the main grants table
 *     tags: [Grants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Discovered grant ID
 *     responses:
 *       200:
 *         description: Grant processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Grant'
 */
router.post('/discovered/:id/process', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const processedGrant = await grantsRepo.processDiscoveredGrant(id);
    
    if (!processedGrant) {
      return res.status(404).json({
        error: 'Discovered grant not found',
        message: `Discovered grant with ID ${id} does not exist`
      });
    }

    res.json({
      message: 'Grant processed successfully',
      grant: processedGrant
    });
  } catch (error) {
    logger.error('Error processing discovered grant', { error, discoveredGrantId: id });
    throw error;
  }
}));

export default router;