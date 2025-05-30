import express from 'express';
import { asyncHandler } from '@/middleware/errorHandler';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Submission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         grantId:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         status:
 *           type: string
 *           enum: [draft, in_progress, submitted, under_review, awarded, rejected]
 *         applicationData:
 *           type: object
 *           description: Form data and answers
 *         generatedContent:
 *           type: object
 *           description: AI-generated content
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         result:
 *           type: string
 *           enum: [pending, awarded, rejected, withdrawn]
 *         resultReason:
 *           type: string
 *         resultReceivedAt:
 *           type: string
 *           format: date-time
 *         feedback:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /submissions:
 *   get:
 *     summary: Get user's grant submissions
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, in_progress, submitted, under_review, awarded, rejected]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Submissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Submission'
 *                 pagination:
 *                   type: object
 */
router.get('/', asyncHandler(async (req, res) => {
  // TODO: Get submissions for authenticated user/org
  res.json({
    submissions: [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        grantId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'AI Innovation Project Application',
        status: 'in_progress',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T15:30:00Z'
      }
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      pages: 1
    }
  });
}));

/**
 * @swagger
 * /submissions:
 *   post:
 *     summary: Create new grant submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grantId
 *               - title
 *             properties:
 *               grantId:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               applicationData:
 *                 type: object
 *     responses:
 *       201:
 *         description: Submission created successfully
 */
router.post('/', asyncHandler(async (req, res) => {
  // TODO: Create new submission
  res.status(201).json({
    message: 'Submission created successfully',
    submission: {
      id: '123e4567-e89b-12d3-a456-426614174001',
      grantId: req.body.grantId,
      title: req.body.title,
      status: 'draft',
      createdAt: new Date().toISOString()
    }
  });
}));

/**
 * @swagger
 * /submissions/{id}:
 *   get:
 *     summary: Get submission by ID
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Submission retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 *       404:
 *         description: Submission not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  // TODO: Get submission by ID
  res.json({
    id: req.params.id,
    grantId: '123e4567-e89b-12d3-a456-426614174000',
    title: 'AI Innovation Project Application',
    status: 'in_progress',
    applicationData: {
      projectTitle: 'AI-Powered Grant Assistant',
      projectDescription: 'An AI system to help organizations find and apply for grants...',
      budget: 75000,
      timeline: '12 months'
    }
  });
}));

/**
 * @swagger
 * /submissions/{id}:
 *   put:
 *     summary: Update submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               title:
 *                 type: string
 *               applicationData:
 *                 type: object
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Submission updated successfully
 */
router.put('/:id', asyncHandler(async (req, res) => {
  // TODO: Update submission
  res.json({
    message: 'Submission updated successfully',
    submission: {
      id: req.params.id,
      ...req.body,
      updatedAt: new Date().toISOString()
    }
  });
}));

/**
 * @swagger
 * /submissions/{id}/generate:
 *   post:
 *     summary: Generate AI-assisted content for submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - field
 *             properties:
 *               field:
 *                 type: string
 *                 description: Field to generate content for
 *               context:
 *                 type: object
 *                 description: Additional context for generation
 *     responses:
 *       200:
 *         description: Content generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 field:
 *                   type: string
 *                 generatedContent:
 *                   type: string
 *                 tokensUsed:
 *                   type: integer
 */
router.post('/:id/generate', asyncHandler(async (req, res) => {
  // TODO: Generate AI content
  res.json({
    field: req.body.field,
    generatedContent: 'This is AI-generated content for your grant application...',
    tokensUsed: 150
  });
}));

export default router;