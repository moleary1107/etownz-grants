import express from 'express';
import { asyncHandler } from '@/middleware/errorHandler';

const router = express.Router();

/**
 * @swagger
 * /usage/current:
 *   get:
 *     summary: Get current month usage statistics
 *     tags: [Usage & Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentPeriod:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                       format: date
 *                     end:
 *                       type: string
 *                       format: date
 *                 plan:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [free, standard, enterprise]
 *                     tokensLimit:
 *                       type: integer
 *                     grantsLimit:
 *                       type: integer
 *                     priceEur:
 *                       type: number
 *                 usage:
 *                   type: object
 *                   properties:
 *                     tokensUsed:
 *                       type: integer
 *                     grantsUsed:
 *                       type: integer
 *                     costEur:
 *                       type: number
 *                 limits:
 *                   type: object
 *                   properties:
 *                     tokensRemaining:
 *                       type: integer
 *                     grantsRemaining:
 *                       type: integer
 */
router.get('/current', asyncHandler(async (req, res) => {
  // TODO: Get current usage from database
  res.json({
    currentPeriod: {
      start: '2024-01-01',
      end: '2024-01-31'
    },
    plan: {
      type: 'standard',
      tokensLimit: 50000,
      grantsLimit: 10,
      priceEur: 29.99
    },
    usage: {
      tokensUsed: 12500,
      grantsUsed: 3,
      costEur: 7.50
    },
    limits: {
      tokensRemaining: 37500,
      grantsRemaining: 7
    }
  });
}));

/**
 * @swagger
 * /usage/history:
 *   get:
 *     summary: Get usage history
 *     tags: [Usage & Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *           default: 6
 *         description: Number of months to retrieve
 *     responses:
 *       200:
 *         description: Usage history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                         format: date
 *                       tokensUsed:
 *                         type: integer
 *                       grantsUsed:
 *                         type: integer
 *                       costEur:
 *                         type: number
 */
router.get('/history', asyncHandler(async (req, res) => {
  // TODO: Get usage history
  res.json({
    history: [
      {
        month: '2024-01',
        tokensUsed: 12500,
        grantsUsed: 3,
        costEur: 7.50
      },
      {
        month: '2023-12',
        tokensUsed: 45000,
        grantsUsed: 8,
        costEur: 29.99
      }
    ]
  });
}));

export default router;