import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { DEMO_GRANTS } from '../data/demoUsers';

const router = express.Router();

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
 *         funderType:
 *           type: string
 *           enum: [government, eu, private, foundation, other]
 *           description: Type of funding organization
 *         amountMin:
 *           type: number
 *           description: Minimum funding amount
 *         amountMax:
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
 *         eligibilityCriteria:
 *           type: object
 *           description: Eligibility requirements
 *         requiredDocuments:
 *           type: array
 *           items:
 *             type: string
 *           description: Required document types
 *         applicationProcess:
 *           type: string
 *           description: Application process details
 *         isActive:
 *           type: boolean
 *           description: Whether grant is currently accepting applications
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /grants:
 *   get:
 *     summary: Get list of grants
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
 *         description: Search query for grant title/description
 *       - in: query
 *         name: funder
 *         schema:
 *           type: string
 *         description: Filter by funder
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Comma-separated list of categories
 *       - in: query
 *         name: amountMin
 *         schema:
 *           type: number
 *         description: Minimum funding amount
 *       - in: query
 *         name: amountMax
 *         schema:
 *           type: number
 *         description: Maximum funding amount
 *       - in: query
 *         name: deadlineFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter grants with deadline after this date
 *       - in: query
 *         name: deadlineTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter grants with deadline before this date
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
  const { page = 1, limit = 20, search, funder, category, provider } = req.query;
  
  let filteredGrants = [...DEMO_GRANTS];

  // Apply search filter
  if (search && typeof search === 'string') {
    const searchLower = search.toLowerCase();
    filteredGrants = filteredGrants.filter(grant =>
      grant.title.toLowerCase().includes(searchLower) ||
      grant.description.toLowerCase().includes(searchLower) ||
      grant.provider.toLowerCase().includes(searchLower)
    );
  }

  // Apply provider filter
  if (provider && typeof provider === 'string' && provider !== 'all') {
    filteredGrants = filteredGrants.filter(grant => grant.providerType === provider);
  }

  // Apply category filter
  if (category && typeof category === 'string' && category !== 'all') {
    filteredGrants = filteredGrants.filter(grant => grant.category === category);
  }

  // Apply funder filter
  if (funder && typeof funder === 'string') {
    filteredGrants = filteredGrants.filter(grant =>
      grant.provider.toLowerCase().includes(funder.toLowerCase())
    );
  }

  // Pagination
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedGrants = filteredGrants.slice(startIndex, endIndex);

  // Transform to frontend format
  const grantsResponse = paginatedGrants.map(grant => ({
    id: grant.id,
    title: grant.title,
    description: grant.description,
    provider: grant.provider,
    providerType: grant.providerType,
    amount: grant.amount,
    deadline: grant.deadline,
    location: grant.location,
    eligibility: grant.eligibility,
    category: grant.category,
    url: grant.url,
    isFavorite: false, // TODO: Implement user favorites
    matchScore: Math.floor(Math.random() * 30) + 70 // Mock match score
  }));

  res.json({
    grants: grantsResponse,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: filteredGrants.length,
      pages: Math.ceil(filteredGrants.length / limitNum)
    }
  });
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
  // TODO: Implement get grant by ID
  const { id } = req.params;
  
  res.json({
    id,
    title: 'Enterprise Ireland Innovation Grant',
    description: 'Funding for innovative technology projects in Ireland...',
    deadline: '2024-12-31T23:59:59Z',
    funder: 'Enterprise Ireland',
    amountMin: 25000,
    amountMax: 500000,
    currency: 'EUR',
    categories: ['technology', 'innovation'],
    isActive: true
  });
}));

/**
 * @swagger
 * /grants/search/similar:
 *   post:
 *     summary: Find grants similar to provided description
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
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 description: Project or organization description
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 10
 *                 description: Number of similar grants to return
 *     responses:
 *       200:
 *         description: Similar grants found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 grants:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Grant'
 *                       - type: object
 *                         properties:
 *                           similarity:
 *                             type: number
 *                             minimum: 0
 *                             maximum: 1
 *                             description: Similarity score
 */
router.post('/search/similar', asyncHandler(async (req, res) => {
  // TODO: Implement vector similarity search
  const { description, limit = 10 } = req.body;
  
  res.json({
    grants: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Enterprise Ireland Innovation Grant',
        similarity: 0.92,
        description: 'Funding for innovative technology projects',
        deadline: '2024-12-31T23:59:59Z',
        funder: 'Enterprise Ireland',
        amountMin: 25000,
        amountMax: 500000,
        currency: 'EUR'
      }
    ]
  });
}));

export default router;