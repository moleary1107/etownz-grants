import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { DEMO_APPLICATIONS, DEMO_GRANTS, DEMO_USERS } from '../data/demoUsers';

const router = express.Router();

/**
 * @swagger
 * /applications:
 *   get:
 *     summary: Get user's applications
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, draft, submitted, under_review, approved, rejected]
 *         description: Filter by application status
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
 */
router.get('/', asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  // TODO: Get user ID from JWT token
  // For demo, return all applications
  let applications = [...DEMO_APPLICATIONS];

  // Apply status filter
  if (status && typeof status === 'string' && status !== 'all') {
    applications = applications.filter(app => app.status === status);
  }

  // Transform applications with grant data
  const applicationsResponse = applications.map(app => {
    const grant = DEMO_GRANTS.find(g => g.id === app.grantId);
    const user = DEMO_USERS.find(u => u.id === app.userId);
    
    return {
      id: app.id,
      grantTitle: grant?.title || 'Unknown Grant',
      grantProvider: grant?.provider || 'Unknown Provider',
      amount: app.fundingAmount,
      currency: 'EUR',
      status: app.status,
      deadline: grant?.deadline || new Date(),
      submittedDate: app.submittedDate,
      lastModified: app.lastModified,
      progress: app.progress,
      assignedTo: user?.name || 'Unknown User',
      notes: app.notes
    };
  });

  res.json({
    applications: applicationsResponse,
    total: applicationsResponse.length
  });
}));

/**
 * @swagger
 * /applications/{id}:
 *   get:
 *     summary: Get application by ID
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application retrieved successfully
 *       404:
 *         description: Application not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const application = DEMO_APPLICATIONS.find(app => app.id === id);
  
  if (!application) {
    return res.status(404).json({ message: 'Application not found' });
  }

  const grant = DEMO_GRANTS.find(g => g.id === application.grantId);
  const user = DEMO_USERS.find(u => u.id === application.userId);

  const response = {
    id: application.id,
    grantTitle: grant?.title || 'Unknown Grant',
    grantProvider: grant?.provider || 'Unknown Provider',
    amount: application.fundingAmount,
    currency: 'EUR',
    status: application.status,
    deadline: grant?.deadline || new Date(),
    submittedDate: application.submittedDate,
    lastModified: application.lastModified,
    progress: application.progress,
    assignedTo: user?.name || 'Unknown User',
    notes: application.notes,
    grant: grant ? {
      id: grant.id,
      title: grant.title,
      description: grant.description,
      provider: grant.provider,
      url: grant.url,
      eligibility: grant.eligibility
    } : null
  };

  res.json(response);
}));

/**
 * @swagger
 * /applications:
 *   post:
 *     summary: Create new application
 *     tags: [Applications]
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
 *               - fundingAmount
 *             properties:
 *               grantId:
 *                 type: string
 *               fundingAmount:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Application created successfully
 */
router.post('/', asyncHandler(async (req, res) => {
  const { grantId, fundingAmount, notes } = req.body;
  
  // TODO: Get user ID from JWT token
  const userId = 'user-1'; // Demo user ID
  
  const grant = DEMO_GRANTS.find(g => g.id === grantId);
  if (!grant) {
    return res.status(404).json({ message: 'Grant not found' });
  }

  const newApplication = {
    id: `app-${Date.now()}`,
    userId,
    grantId,
    organizationId: 'org-1', // TODO: Get from user
    status: 'draft' as const,
    lastModified: new Date(),
    progress: 10,
    notes,
    fundingAmount
  };

  // In a real app, this would be saved to database
  DEMO_APPLICATIONS.push(newApplication);

  res.status(201).json({
    message: 'Application created successfully',
    application: {
      id: newApplication.id,
      grantTitle: grant.title,
      grantProvider: grant.provider,
      amount: newApplication.fundingAmount,
      status: newApplication.status,
      progress: newApplication.progress
    }
  });
}));

export default router;