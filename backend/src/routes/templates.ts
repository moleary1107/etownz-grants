import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { templateService, GrantTemplate, SectionTemplate, CreateGrantTemplate } from '../services/templateService';
import { logger } from '../services/logger';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();

/**
 * Initialize template service
 */
router.use(async (req, res, next) => {
  try {
    await templateService.initialize();
    next();
  } catch (error) {
    logger.error('Failed to initialize template service:', error);
    res.status(500).json({
      success: false,
      error: 'Template service initialization failed'
    });
  }
});

/**
 * Get available template categories and types
 */
router.get(
  '/categories',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const categories = await templateService.getTemplateCategories();
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Failed to get template categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get template categories'
      });
    }
  }
);

/**
 * List all templates with filtering
 */
router.get(
  '/',
  authenticateToken,
  [
    query('category').optional().isString(),
    query('grant_type').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { category, grant_type, limit, offset } = req.query;

      const result = await templateService.listTemplates({
        category: category as string,
        grant_type: grant_type as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to list templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list templates'
      });
    }
  }
);

/**
 * Get specific template by ID
 */
router.get(
  '/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Valid template ID required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const template = await templateService.getTemplate(id);

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Failed to get template:', error);
      if (error instanceof Error && error.message === 'Template not found') {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get template'
        });
      }
    }
  }
);

/**
 * Create new template
 */
router.post(
  '/',
  authenticateToken,
  [
    body('name').isString().isLength({ min: 1, max: 255 }).withMessage('Template name required (1-255 characters)'),
    body('description').optional().isString(),
    body('category').isString().isLength({ min: 1, max: 100 }).withMessage('Category required'),
    body('grant_type').isString().isLength({ min: 1, max: 100 }).withMessage('Grant type required'),
    body('section_templates').isArray().withMessage('Section templates must be an array'),
    body('section_templates.*.section_name').isString().withMessage('Section name required'),
    body('section_templates.*.section_type').isIn([
      'executive_summary', 'project_description', 'methodology', 'budget', 
      'timeline', 'team', 'impact', 'sustainability', 'evaluation', 
      'references', 'appendix', 'custom'
    ]).withMessage('Valid section type required'),
    body('section_templates.*.content_template').isString().withMessage('Content template required'),
    body('section_templates.*.prompts').isObject().withMessage('Prompts must be an object'),
    body('section_templates.*.variables').isArray().withMessage('Variables must be an array'),
    body('section_templates.*.word_count_range').isObject().withMessage('Word count range required'),
    body('section_templates.*.required').isBoolean().withMessage('Required field must be boolean'),
    body('section_templates.*.order_index').isInt({ min: 0 }).withMessage('Order index must be non-negative integer')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const templateData: CreateGrantTemplate = req.body;
      const template = await templateService.createTemplate(templateData);

      logger.info('Template created', {
        templateId: template.id,
        name: template.name,
        userId: req.user?.id
      });

      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Failed to create template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create template'
      });
    }
  }
);

/**
 * Generate content for a specific section
 */
router.post(
  '/sections/:sectionId/generate',
  authenticateToken,
  [
    param('sectionId').isUUID().withMessage('Valid section ID required'),
    body('variables').isObject().withMessage('Variables must be an object'),
    body('organizationId').optional().isUUID().withMessage('Valid organization ID required'),
    body('grantId').optional().isUUID().withMessage('Valid grant ID required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sectionId } = req.params;
      const { variables, organizationId, grantId } = req.body;

      logger.info('Generating section content', {
        sectionId,
        organizationId,
        grantId,
        userId: req.user?.id
      });

      const generatedSection = await templateService.generateSectionContent(
        sectionId,
        variables || {},
        organizationId,
        grantId
      );

      res.json({
        success: true,
        data: generatedSection
      });
    } catch (error) {
      logger.error('Failed to generate section content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate section content',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * Generate complete grant application using template
 */
router.post(
  '/:id/generate',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Valid template ID required'),
    body('variables').isObject().withMessage('Variables must be an object'),
    body('organizationId').optional().isUUID().withMessage('Valid organization ID required'),
    body('grantId').optional().isUUID().withMessage('Valid grant ID required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { variables, organizationId, grantId } = req.body;

      logger.info('Generating complete application', {
        templateId: id,
        organizationId,
        grantId,
        userId: req.user?.id
      });

      const result = await templateService.generateApplication(
        id,
        variables || {},
        organizationId,
        grantId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to generate application:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate application',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * Get default templates (creates them if they don't exist)
 */
router.post(
  '/seed-defaults',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await seedDefaultTemplates();
      
      res.json({
        success: true,
        message: 'Default templates seeded successfully'
      });
    } catch (error) {
      logger.error('Failed to seed default templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to seed default templates'
      });
    }
  }
);

/**
 * Seed default templates
 */
async function seedDefaultTemplates(): Promise<void> {
  const defaultTemplates: CreateGrantTemplate[] = [
    {
      name: 'Research Grant Application',
      description: 'Comprehensive template for academic and research grant applications',
      category: 'research',
      grant_type: 'research',
      section_templates: [
        {
          section_name: 'Executive Summary',
          section_type: 'executive_summary' as const,
          content_template: `
# Executive Summary

## Project Overview
[Brief description of the research project and its significance]

## Objectives
[Key research objectives and expected outcomes]

## Methodology
[High-level approach and methods]

## Impact
[Expected impact and benefits]

## Funding Request
[Total funding amount and duration]
          `,
          prompts: {
            generation_prompt: 'Generate a compelling executive summary for a research grant application. Focus on clearly articulating the research problem, objectives, methodology, and expected impact. Make it engaging and persuasive for grant reviewers.',
            improvement_prompt: 'Improve this executive summary by enhancing clarity, impact, and persuasiveness.',
            validation_prompt: 'Validate this executive summary for completeness and adherence to grant writing best practices.'
          },
          variables: [
            { name: 'project_title', type: 'text', description: 'Main project title', required: true },
            { name: 'funding_amount', type: 'number', description: 'Total funding requested', required: true },
            { name: 'project_duration', type: 'text', description: 'Project duration (e.g., 3 years)', required: true },
            { name: 'primary_investigator', type: 'text', description: 'Lead researcher name', required: true }
          ],
          word_count_range: { min: 200, max: 400 },
          required: true,
          order_index: 1
        },
        {
          section_name: 'Project Description',
          section_type: 'project_description' as const,
          content_template: `
# Project Description

## Background and Significance
[Research background and why this project is important]

## Research Question/Hypothesis
[Clear statement of research question or hypothesis]

## Literature Review
[Brief review of relevant literature and research gaps]

## Innovation
[What makes this research innovative or unique]

## Feasibility
[Why this project is feasible and likely to succeed]
          `,
          prompts: {
            generation_prompt: 'Generate a detailed project description for a research grant. Include background, research questions, literature context, innovation aspects, and feasibility. Make it scientifically rigorous and compelling.',
            improvement_prompt: 'Enhance this project description by strengthening the scientific rationale and clarity.',
            validation_prompt: 'Review this project description for scientific accuracy and grant compliance.'
          },
          variables: [
            { name: 'research_field', type: 'text', description: 'Primary research field/discipline', required: true },
            { name: 'research_gaps', type: 'list', description: 'Key research gaps being addressed', required: false },
            { name: 'innovative_aspects', type: 'list', description: 'What makes this research innovative', required: false }
          ],
          word_count_range: { min: 800, max: 1200 },
          required: true,
          order_index: 2
        },
        {
          section_name: 'Methodology',
          section_type: 'methodology' as const,
          content_template: `
# Research Methodology

## Research Design
[Overall research design and approach]

## Methods and Procedures
[Detailed methods, tools, and procedures]

## Data Collection
[How data will be collected and from what sources]

## Data Analysis
[Analysis methods and statistical approaches]

## Quality Assurance
[How research quality and validity will be ensured]

## Timeline
[Research phases and timeline]
          `,
          prompts: {
            generation_prompt: 'Generate a comprehensive methodology section for a research grant. Include research design, methods, data collection, analysis approaches, and quality assurance measures. Be specific and methodologically sound.',
            improvement_prompt: 'Improve this methodology by adding more detail and ensuring methodological rigor.',
            validation_prompt: 'Validate this methodology for scientific soundness and feasibility.'
          },
          variables: [
            { name: 'research_methods', type: 'list', description: 'Primary research methods to be used', required: true },
            { name: 'data_sources', type: 'list', description: 'Data sources and collection methods', required: false },
            { name: 'analysis_tools', type: 'list', description: 'Analysis tools and software', required: false }
          ],
          word_count_range: { min: 600, max: 1000 },
          required: true,
          order_index: 3
        },
        {
          section_name: 'Team and Capabilities',
          section_type: 'team' as const,
          content_template: `
# Research Team and Institutional Capabilities

## Principal Investigator
[PI qualifications, experience, and relevant expertise]

## Research Team
[Key team members, their roles, and qualifications]

## Institutional Resources
[Available facilities, equipment, and institutional support]

## Collaborations
[External collaborations and partnerships]

## Track Record
[Relevant previous work and publications]
          `,
          prompts: {
            generation_prompt: 'Generate a compelling team and capabilities section highlighting the research team\'s qualifications, institutional resources, and track record. Demonstrate why this team can successfully execute the proposed research.',
            improvement_prompt: 'Strengthen this section by better highlighting team strengths and capabilities.',
            validation_prompt: 'Review this section for completeness and persuasiveness regarding team capabilities.'
          },
          variables: [
            { name: 'team_size', type: 'number', description: 'Number of team members', required: false },
            { name: 'key_expertise', type: 'list', description: 'Key areas of team expertise', required: false },
            { name: 'institutional_facilities', type: 'list', description: 'Available facilities and equipment', required: false }
          ],
          word_count_range: { min: 400, max: 800 },
          required: true,
          order_index: 4
        },
        {
          section_name: 'Budget Justification',
          section_type: 'budget' as const,
          content_template: `
# Budget and Justification

## Personnel Costs
[Staff salaries, benefits, and time allocation]

## Equipment and Supplies
[Research equipment, materials, and supplies]

## Travel and Dissemination
[Conference travel, fieldwork, and dissemination costs]

## Indirect Costs
[Institutional overhead and administrative costs]

## Cost Justification
[Detailed justification for major budget items]

## Cost-Effectiveness
[How the budget represents good value for money]
          `,
          prompts: {
            generation_prompt: 'Generate a detailed budget justification section explaining personnel costs, equipment, travel, and other expenses. Justify why each cost is necessary for successful project completion.',
            improvement_prompt: 'Improve this budget justification by providing clearer rationale for costs.',
            validation_prompt: 'Review this budget justification for completeness and reasonableness.'
          },
          variables: [
            { name: 'total_budget', type: 'number', description: 'Total project budget', required: true },
            { name: 'personnel_percentage', type: 'number', description: 'Percentage of budget for personnel', required: false },
            { name: 'equipment_costs', type: 'number', description: 'Equipment and supplies budget', required: false }
          ],
          word_count_range: { min: 300, max: 600 },
          required: true,
          order_index: 5
        },
        {
          section_name: 'Impact and Dissemination',
          section_type: 'impact' as const,
          content_template: `
# Expected Impact and Dissemination

## Scientific Impact
[How the research will advance scientific knowledge]

## Societal Benefits
[Broader societal and economic benefits]

## Knowledge Transfer
[How results will be transferred to practice]

## Dissemination Plan
[Publications, conferences, and communication strategy]

## Long-term Vision
[Future research directions and sustainability]
          `,
          prompts: {
            generation_prompt: 'Generate an impact and dissemination section highlighting the expected scientific and societal benefits of the research, along with a clear plan for sharing results and knowledge transfer.',
            improvement_prompt: 'Enhance this section by strengthening the impact case and dissemination strategy.',
            validation_prompt: 'Review this section for realistic and compelling impact claims.'
          },
          variables: [
            { name: 'target_publications', type: 'number', description: 'Expected number of publications', required: false },
            { name: 'target_audience', type: 'list', description: 'Key audiences for research results', required: false },
            { name: 'dissemination_channels', type: 'list', description: 'Planned dissemination channels', required: false }
          ],
          word_count_range: { min: 400, max: 700 },
          required: true,
          order_index: 6
        }
      ]
    },
    {
      name: 'Business Innovation Grant',
      description: 'Template for business innovation and commercialization grants',
      category: 'business',
      grant_type: 'innovation',
      section_templates: [
        {
          section_name: 'Executive Summary',
          section_type: 'executive_summary' as const,
          content_template: `
# Executive Summary

## Business Opportunity
[Description of the market opportunity and business case]

## Innovation
[What makes your solution innovative and competitive]

## Market Potential
[Size and characteristics of target market]

## Funding Request
[Amount requested and intended use of funds]

## Expected Returns
[Projected financial and economic returns]
          `,
          prompts: {
            generation_prompt: 'Generate a compelling executive summary for a business innovation grant application. Focus on the market opportunity, innovation, competitive advantage, and expected returns.',
            improvement_prompt: 'Improve this executive summary by strengthening the business case and market opportunity.',
            validation_prompt: 'Validate this executive summary for business viability and grant requirements.'
          },
          variables: [
            { name: 'company_name', type: 'text', description: 'Company or organization name', required: true },
            { name: 'innovation_type', type: 'text', description: 'Type of innovation (product, service, process)', required: true },
            { name: 'market_size', type: 'text', description: 'Target market size and value', required: false }
          ],
          word_count_range: { min: 200, max: 400 },
          required: true,
          order_index: 1
        },
        {
          section_name: 'Innovation Description',
          section_type: 'project_description' as const,
          content_template: `
# Innovation Description

## The Innovation
[Detailed description of your innovation]

## Problem Statement
[What problem does this innovation solve]

## Solution Approach
[How your innovation addresses the problem]

## Competitive Advantage
[What makes your solution better than alternatives]

## Intellectual Property
[IP status and protection strategy]
          `,
          prompts: {
            generation_prompt: 'Generate a detailed innovation description highlighting the problem being solved, the innovative solution, competitive advantages, and intellectual property aspects.',
            improvement_prompt: 'Enhance this innovation description by clarifying the value proposition and competitive differentiation.',
            validation_prompt: 'Review this innovation description for clarity and commercial viability.'
          },
          variables: [
            { name: 'problem_description', type: 'text', description: 'Core problem being addressed', required: true },
            { name: 'solution_features', type: 'list', description: 'Key features of the solution', required: false },
            { name: 'ip_status', type: 'text', description: 'Intellectual property status', required: false }
          ],
          word_count_range: { min: 600, max: 1000 },
          required: true,
          order_index: 2
        }
      ]
    }
  ];

  // Check if templates already exist
  const existingTemplates = await templateService.listTemplates();
  
  if (existingTemplates.templates.length === 0) {
    // Create default templates
    for (const template of defaultTemplates) {
      try {
        await templateService.createTemplate(template);
        logger.info('Default template created', { name: template.name });
      } catch (error) {
        logger.error('Failed to create default template', { name: template.name, error });
      }
    }
  }
}

export default router;