import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { db } from '../services/database';
import { logger } from '../services/logger';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Organization:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         website:
 *           type: string
 *           format: uri
 *         contactEmail:
 *           type: string
 *           format: email
 *         contactPhone:
 *           type: string
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             county:
 *               type: string
 *             country:
 *               type: string
 *               default: Ireland
 *             eircode:
 *               type: string
 *         profileData:
 *           type: object
 *           description: Organization profile and capabilities
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /organizations/profile:
 *   get:
 *     summary: Get current organization profile
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Organization'
 */
router.get('/profile', asyncHandler(async (req, res) => {
  // TODO: Get organization from authenticated user
  res.json({
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Sample Tech Startup',
    description: 'A technology startup focused on AI solutions',
    website: 'https://sampletech.ie',
    contactEmail: 'contact@sampletech.ie',
    address: {
      street: '123 Tech Street',
      city: 'Dublin',
      county: 'Dublin',
      country: 'Ireland',
      eircode: 'D02 XY12'
    }
  });
}));

/**
 * @swagger
 * /organizations/profile:
 *   put:
 *     summary: Update organization profile
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               website:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *               address:
 *                 type: object
 *               profileData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/profile', asyncHandler(async (req, res) => {
  // TODO: Update organization profile
  res.json({
    message: 'Profile updated successfully',
    organization: req.body
  });
}));

/**
 * @swagger
 * /organizations:
 *   get:
 *     summary: List organizations
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organizations retrieved successfully
 */
router.get('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, description, website, contact_email, organization_type, created_at
      FROM organizations 
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      organizations: result.rows
    });
  } catch (error) {
    logger.error('Failed to list organizations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list organizations'
    });
  }
}));

/**
 * @swagger
 * /organizations:
 *   post:
 *     summary: Create new organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               website:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Organization created successfully
 */
router.post('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, website, type } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required'
      });
    }

    // Validate and format website URL
    let validatedWebsite = null;
    if (website && website.trim() !== '') {
      const websiteResult = await db.query(
        'SELECT validate_organization_url($1) as validated_url',
        [website.trim()]
      );
      validatedWebsite = websiteResult.rows[0].validated_url;
    }

    const organizationId = uuidv4();
    
    const result = await db.query(`
      INSERT INTO organizations (
        id, name, description, website, organization_type, contact_email, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [
      organizationId,
      name.trim(),
      description || null,
      validatedWebsite,
      type || 'research',
      req.user?.email || null
    ]);

    logger.info('Organization created', {
      organizationId,
      name,
      website: validatedWebsite,
      createdBy: req.user?.id
    });

    res.status(201).json({
      success: true,
      organization: result.rows[0],
      message: validatedWebsite && validatedWebsite !== website ? 
        'Organization created. Website URL was automatically formatted with https://' : 
        'Organization created successfully'
    });
  } catch (error) {
    logger.error('Failed to create organization:', error);
    
    // Check if it's a database constraint error
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(409).json({
        success: false,
        error: 'An organization with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create organization'
    });
  }
}));

/**
 * @swagger
 * /organizations/{id}:
 *   get:
 *     summary: Get organization details
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization details retrieved
 */
router.get('/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT * FROM organizations WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    res.json({
      success: true,
      organization: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to get organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get organization'
    });
  }
}));

/**
 * @swagger
 * /organizations/{id}/intelligence:
 *   get:
 *     summary: Get organization intelligence data
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization intelligence retrieved
 */
router.get('/:id/intelligence', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT * FROM organization_intelligence 
      WHERE organization_id = $1 
      ORDER BY confidence_score DESC, created_at DESC
    `, [id]);

    res.json({
      success: true,
      intelligence: result.rows
    });
  } catch (error) {
    logger.error('Failed to get organization intelligence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get organization intelligence'
    });
  }
}));

export default router;