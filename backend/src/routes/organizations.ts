import express from 'express';
import { asyncHandler } from '@/middleware/errorHandler';

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

export default router;