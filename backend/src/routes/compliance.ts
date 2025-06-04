import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth';
import { createComplianceChecker, ComplianceReport, GrantApplication } from '../services/complianceCheckerService';
import { db } from '../services/database';
import { logger } from '../services/logger';

const router = Router();
const complianceChecker = createComplianceChecker(db.getPool());

// Rate limiting for AI operations
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs for AI operations
  message: {
    error: 'Too many AI requests, please try again later.',
    retryAfter: 15 * 60
  }
});

interface ComplianceCheckRequest {
  grantSchemeId: string;
  sections: {
    [key: string]: {
      content: string;
      metadata?: any;
    };
  };
  budget?: {
    total: number;
    categories: Array<{
      name: string;
      amount: number;
      justification?: string;
    }>;
  };
  organizationProfile?: {
    type: string;
    size: string;
    location: string;
    yearsInOperation: number;
  };
}

interface ComplianceRuleRequest {
  grantSchemeId: string;
  ruleCategory: string;
  ruleDescription: string;
  severity: 'critical' | 'major' | 'minor';
  automatedCheck: boolean;
  checkQuery?: any;
}

// Check compliance for a grant application
router.post('/check/:applicationId', authenticateToken, aiRateLimit, async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const userId = (req as any).user.id;
    
    // Validate application access
    const applicationResult = await db.query(
      'SELECT * FROM grant_applications WHERE id = $1 AND user_id = $2',
      [applicationId, userId]
    );

    if (applicationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found or access denied' });
    }

    const application = applicationResult.rows[0];

    // Get application sections
    const sectionsResult = await db.query(
      'SELECT section_type, content FROM grant_sections WHERE application_id = $1',
      [applicationId]
    );

    const sections = sectionsResult.rows.reduce((acc, row) => {
      acc[row.section_type] = { content: row.content };
      return acc;
    }, {});

    // Build grant application object
    const grantApplication: GrantApplication = {
      id: applicationId,
      grantSchemeId: application.grant_scheme_id,
      sections,
      budget: application.metadata?.budget,
      organizationProfile: application.metadata?.organizationProfile
    };

    logger.info(`Checking compliance for application ${applicationId}`);

    // Perform compliance check
    const complianceReport = await complianceChecker.checkCompliance(
      grantApplication,
      application.grant_scheme_id
    );

    // Track AI usage
    await db.query(
      `INSERT INTO ai_grant_interactions 
       (application_id, interaction_type, model_used, processing_time_ms, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        applicationId,
        'compliance_check',
        'gpt-4-turbo-preview',
        Date.now(), // This should be actual processing time
        new Date()
      ]
    );

    res.json({
      success: true,
      data: complianceReport
    });

  } catch (error) {
    logger.error('Error in compliance check:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Manual compliance check with request body
router.post('/check-manual', authenticateToken, aiRateLimit, async (req: Request, res: Response) => {
  try {
    const requestData = req.body as ComplianceCheckRequest;
    
    if (!requestData.grantSchemeId || !requestData.sections) {
      return res.status(400).json({ error: 'Missing required fields: grantSchemeId and sections' });
    }

    // Build grant application object
    const grantApplication: GrantApplication = {
      id: 'manual-check',
      grantSchemeId: requestData.grantSchemeId,
      sections: requestData.sections,
      budget: requestData.budget,
      organizationProfile: requestData.organizationProfile
    };

    logger.info('Performing manual compliance check');

    // Perform compliance check
    const complianceReport = await complianceChecker.checkCompliance(
      grantApplication,
      requestData.grantSchemeId
    );

    res.json({
      success: true,
      data: complianceReport
    });

  } catch (error) {
    logger.error('Error in manual compliance check:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Get compliance history for an application
router.get('/history/:applicationId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const userId = (req as any).user.id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Validate application access
    const applicationResult = await db.query(
      'SELECT id FROM grant_applications WHERE id = $1 AND user_id = $2',
      [applicationId, userId]
    );

    if (applicationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found or access denied' });
    }

    // Get compliance check history
    const result = await db.query(
      `SELECT cc.*, cr.rule_category, cr.rule_description, cr.severity
       FROM compliance_checks cc
       LEFT JOIN compliance_rules cr ON cc.rule_id = cr.id
       WHERE cc.application_id = $1
       ORDER BY cc.checked_at DESC
       LIMIT $2`,
      [applicationId, limit]
    );

    const checks = result.rows.map(row => ({
      id: row.id,
      status: row.status,
      confidence: row.ai_confidence,
      details: row.details,
      ruleCategory: row.rule_category,
      ruleDescription: row.rule_description,
      severity: row.severity,
      checkedAt: row.checked_at
    }));

    res.json({
      success: true,
      data: checks
    });

  } catch (error) {
    logger.error('Error fetching compliance history:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Get compliance rules for a grant scheme
router.get('/rules/:grantSchemeId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { grantSchemeId } = req.params;
    
    const result = await db.query(
      'SELECT * FROM compliance_rules WHERE grant_scheme_id = $1 ORDER BY severity DESC, rule_category',
      [grantSchemeId]
    );

    const rules = result.rows.map(row => ({
      id: row.id,
      grantSchemeId: row.grant_scheme_id,
      ruleCategory: row.rule_category,
      ruleDescription: row.rule_description,
      severity: row.severity,
      automatedCheck: row.automated_check,
      checkQuery: row.check_query
    }));

    res.json({
      success: true,
      data: rules
    });

  } catch (error) {
    logger.error('Error fetching compliance rules:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Create a new compliance rule (admin only)
router.post('/rules', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Check if user is admin (you might want to implement proper role checking)
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const ruleData = req.body as ComplianceRuleRequest;
    
    if (!ruleData.grantSchemeId || !ruleData.ruleDescription || !ruleData.severity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await db.query(
      `INSERT INTO compliance_rules 
       (grant_scheme_id, rule_category, rule_description, severity, automated_check, check_query)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        ruleData.grantSchemeId,
        ruleData.ruleCategory || 'general',
        ruleData.ruleDescription,
        ruleData.severity,
        ruleData.automatedCheck || true,
        JSON.stringify(ruleData.checkQuery || {})
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.rows[0].id,
        grantSchemeId: result.rows[0].grant_scheme_id,
        ruleCategory: result.rows[0].rule_category,
        ruleDescription: result.rows[0].rule_description,
        severity: result.rows[0].severity,
        automatedCheck: result.rows[0].automated_check,
        checkQuery: result.rows[0].check_query
      }
    });

  } catch (error) {
    logger.error('Error creating compliance rule:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Get compliance statistics for the dashboard
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // Get compliance stats for user's applications
    const result = await db.query(
      `SELECT 
         COUNT(*) as total_checks,
         AVG(CASE WHEN cc.status = 'pass' THEN 100 ELSE 0 END) as average_score,
         COUNT(CASE WHEN cc.status = 'fail' AND cr.severity = 'critical' THEN 1 END) as critical_issues,
         COUNT(CASE WHEN cc.status = 'fail' AND cr.severity = 'major' THEN 1 END) as major_issues,
         COUNT(CASE WHEN cc.status = 'fail' AND cr.severity = 'minor' THEN 1 END) as minor_issues
       FROM compliance_checks cc
       JOIN grant_applications ga ON cc.application_id = ga.id
       LEFT JOIN compliance_rules cr ON cc.rule_id = cr.id
       WHERE ga.user_id = $1
       AND cc.checked_at >= NOW() - INTERVAL '30 days'`,
      [userId]
    );

    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        totalChecks: parseInt(stats.total_checks),
        averageScore: parseFloat(stats.average_score) || 0,
        criticalIssues: parseInt(stats.critical_issues),
        majorIssues: parseInt(stats.major_issues),
        minorIssues: parseInt(stats.minor_issues)
      }
    });

  } catch (error) {
    logger.error('Error fetching compliance stats:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

export default router;