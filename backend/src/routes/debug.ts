import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { DEMO_USERS } from '../data/demoUsers';

const router = express.Router();

// Debug endpoint to test demo user access
router.get('/demo-users', asyncHandler(async (req, res) => {
  try {
    const demoUserEmails = DEMO_USERS.map(u => u.email);
    res.json({
      message: 'Demo users loaded successfully',
      count: DEMO_USERS.length,
      emails: demoUserEmails
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load demo users',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}));

// Simple test endpoint
router.get('/test', asyncHandler(async (req, res) => {
  res.json({ message: 'Debug endpoint working', timestamp: new Date() });
}));

export default router;