import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { grantIntelligenceService } from '../services/grantIntelligenceService';
import { logger } from '../services/logger';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();

/**
 * Extract grant requirements from document
 */
router.post(
  '/extract-requirements',
  authenticateToken,
  [
    body('grantId').isUUID().withMessage('Valid grant ID required'),
    body('documentContent').isString().notEmpty().withMessage('Document content required'),
    body('documentType').optional().isIn(['call_document', 'guidelines', 'faq', 'other'])
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { grantId, documentContent, documentType = 'call_document' } = req.body;

      logger.info('Extracting grant requirements', {
        grantId,
        documentType,
        contentLength: documentContent.length,
        userId: req.user?.id
      });

      const requirements = await grantIntelligenceService.extractGrantRequirements(
        grantId,
        documentContent,
        documentType
      );

      res.json({
        success: true,
        data: {
          grantId,
          requirementsCount: requirements.length,
          requirements
        }
      });
    } catch (error) {
      logger.error('Failed to extract grant requirements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to extract grant requirements'
      });
    }
  }
);

/**
 * Assess organization compliance with grant
 */
router.post(
  '/assess-compliance',
  authenticateToken,
  [
    body('grantId').isUUID().withMessage('Valid grant ID required'),
    body('organizationId').isUUID().withMessage('Valid organization ID required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { grantId, organizationId } = req.body;

      logger.info('Assessing grant compliance', {
        grantId,
        organizationId,
        userId: req.user?.id
      });

      const assessment = await grantIntelligenceService.assessGrantCompliance(
        grantId,
        organizationId
      );

      res.json({
        success: true,
        data: assessment
      });
    } catch (error) {
      logger.error('Failed to assess grant compliance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assess grant compliance'
      });
    }
  }
);

/**
 * Extract organization intelligence from website/documents
 */
router.post(
  '/extract-org-intelligence',
  authenticateToken,
  [
    body('organizationId').isUUID().withMessage('Valid organization ID required'),
    body('source').isString().notEmpty().withMessage('Source URL/identifier required'),
    body('content').isString().notEmpty().withMessage('Content required'),
    body('sourceType').optional().isIn(['website', 'document', 'linkedin'])
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { organizationId, source, content, sourceType = 'website' } = req.body;

      logger.info('Extracting organization intelligence', {
        organizationId,
        source,
        sourceType,
        contentLength: content.length,
        userId: req.user?.id
      });

      const intelligence = await grantIntelligenceService.extractOrganizationIntelligence(
        organizationId,
        source,
        content,
        sourceType
      );

      res.json({
        success: true,
        data: {
          organizationId,
          intelligenceCount: intelligence.length,
          intelligence
        }
      });
    } catch (error) {
      logger.error('Failed to extract organization intelligence:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to extract organization intelligence'
      });
    }
  }
);

/**
 * Find grant matches for organization
 */
router.get(
  '/find-matches/:organizationId',
  authenticateToken,
  [
    param('organizationId').isUUID().withMessage('Valid organization ID required'),
    query('minMatchScore').optional().isInt({ min: 0, max: 100 })
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { organizationId } = req.params;
      const minMatchScore = parseInt(req.query.minMatchScore as string) || 60;

      logger.info('Finding grant matches', {
        organizationId,
        minMatchScore,
        userId: req.user?.id
      });

      const matches = await grantIntelligenceService.findGrantMatches(
        organizationId,
        minMatchScore
      );

      res.json({
        success: true,
        data: {
          organizationId,
          matchCount: matches.length,
          matches
        }
      });
    } catch (error) {
      logger.error('Failed to find grant matches:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to find grant matches'
      });
    }
  }
);

/**
 * Queue grant document for analysis
 */
router.post(
  '/queue-document-analysis',
  authenticateToken,
  [
    body('grantId').isUUID().withMessage('Valid grant ID required'),
    body('documentUrl').isURL().withMessage('Valid document URL required'),
    body('documentType').optional().isIn(['call_document', 'guidelines', 'faq', 'other']),
    body('analysisType').optional().isIn(['requirements', 'criteria', 'deadlines', 'all'])
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { 
        grantId, 
        documentUrl, 
        documentType = 'call_document',
        analysisType = 'requirements'
      } = req.body;

      logger.info('Queueing grant document for analysis', {
        grantId,
        documentUrl,
        documentType,
        analysisType,
        userId: req.user?.id
      });

      const queueId = await grantIntelligenceService.queueGrantDocumentAnalysis(
        grantId,
        documentUrl,
        documentType,
        analysisType
      );

      res.json({
        success: true,
        data: {
          queueId,
          message: 'Document queued for analysis'
        }
      });
    } catch (error) {
      logger.error('Failed to queue document analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to queue document analysis'
      });
    }
  }
);

/**
 * Get grant requirements for a specific grant
 */
router.get(
  '/requirements/:grantId',
  authenticateToken,
  [
    param('grantId').isUUID().withMessage('Valid grant ID required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { grantId } = req.params;

      // This would need to be added to the service - for now, just query directly
      const { db } = require('../services/database');
      const result = await db.query(`
        SELECT * FROM grant_requirements 
        WHERE grant_id = $1 
        ORDER BY mandatory DESC, weight DESC
      `, [grantId]);

      res.json({
        success: true,
        data: {
          grantId,
          requirements: result.rows
        }
      });
    } catch (error) {
      logger.error('Failed to get grant requirements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get grant requirements'
      });
    }
  }
);

/**
 * Get organization capabilities
 */
router.get(
  '/capabilities/:organizationId',
  authenticateToken,
  [
    param('organizationId').isUUID().withMessage('Valid organization ID required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { organizationId } = req.params;

      // This would need to be added to the service - for now, just query directly
      const { db } = require('../services/database');
      const result = await db.query(`
        SELECT * FROM organization_capabilities 
        WHERE organization_id = $1 
        ORDER BY capability_type, capability_name
      `, [organizationId]);

      res.json({
        success: true,
        data: {
          organizationId,
          capabilities: result.rows
        }
      });
    } catch (error) {
      logger.error('Failed to get organization capabilities:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get organization capabilities'
      });
    }
  }
);

/**
 * Get compliance assessment history
 */
router.get(
  '/compliance-history/:organizationId',
  authenticateToken,
  [
    param('organizationId').isUUID().withMessage('Valid organization ID required'),
    query('grantId').optional().isUUID()
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { organizationId } = req.params;
      const { grantId } = req.query;

      // This would need to be added to the service - for now, just query directly
      const { db } = require('../services/database');
      
      let query = `
        SELECT gca.*, g.title as grant_title, g.funding_amount_max
        FROM grant_compliance_assessments gca
        JOIN grants g ON gca.grant_id = g.id
        WHERE gca.organization_id = $1
      `;
      const params: any[] = [organizationId];

      if (grantId) {
        query += ' AND gca.grant_id = $2';
        params.push(grantId);
      }

      query += ' ORDER BY gca.created_at DESC';

      const result = await db.query(query, params);

      res.json({
        success: true,
        data: {
          organizationId,
          assessments: result.rows
        }
      });
    } catch (error) {
      logger.error('Failed to get compliance history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get compliance history'
      });
    }
  }
);

/**
 * Scrape organization website and extract intelligence
 */
router.post(
  '/scrape-and-analyze/:orgId',
  authenticateToken,
  [
    param('orgId').isUUID().withMessage('Valid organization ID required'),
    body('websiteUrl').isURL().withMessage('Valid website URL required'),
    body('maxPages').optional().isInt({ min: 1, max: 20 }).withMessage('Max pages must be between 1 and 20'),
    body('includePdfs').optional().isBoolean().withMessage('Include PDFs must be boolean'),
    body('followLinks').optional().isBoolean().withMessage('Follow links must be boolean')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { orgId } = req.params;
      const { websiteUrl, maxPages, includePdfs, followLinks } = req.body;

      logger.info('Organization scraping and analysis requested', {
        organizationId: orgId,
        websiteUrl,
        userId: req.user?.id
      });

      const result = await grantIntelligenceService.scrapeAndAnalyzeOrganization(
        orgId,
        websiteUrl,
        {
          maxPages: maxPages || 5,
          includePdfs: includePdfs !== false,
          followLinks: followLinks !== false
        }
      );

      if (result.success) {
        res.json({
          success: true,
          data: {
            organizationId: orgId,
            websiteUrl,
            pagesScraped: result.pagesScraped,
            intelligenceExtracted: result.intelligenceExtracted,
            capabilitiesIdentified: result.capabilitiesIdentified,
            scrapedPages: result.scrapedPages
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to scrape and analyze organization'
        });
      }

    } catch (error) {
      logger.error('Organization scraping failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to scrape and analyze organization'
      });
    }
  }
);

export default router;